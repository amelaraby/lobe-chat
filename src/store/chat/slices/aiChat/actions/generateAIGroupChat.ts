/* eslint-disable sort-keys-fix/sort-keys-fix, typescript-sort-keys/interface */
// Disable the auto sort key eslint rule to make the code more logic and readable
import { produce } from 'immer';
import { StateCreator } from 'zustand/vanilla';

import { LOADING_FLAT } from '@/const/message';
import {
  GroupMemberInfo,
  buildGroupChatSystemPrompt,
  filterMessagesForAgent,
} from '@/prompts/groupChat';
import { ChatStore } from '@/store/chat/store';
import { messageMapKey } from '@/store/chat/utils/messageMapKey';
import { chatGroupSelectors } from '@/store/chatGroup/selectors';
import { useChatGroupStore } from '@/store/chatGroup/store';
import { useSessionStore } from '@/store/session';
import { sessionSelectors } from '@/store/session/selectors';
import { userProfileSelectors } from '@/store/user/selectors';
import { getUserStoreState } from '@/store/user/store';
import { ChatErrorType } from '@/types/fetch';
import { ChatMessage, CreateMessageParams, SendGroupMessageParams } from '@/types/message';
import { setNamespace } from '@/utils/storeDebug';

import type { ChatStoreState } from '../../../initialState';
import { toggleBooleanList } from '../../../utils';
import {
  GroupChatSupervisor,
  SupervisorContext,
  SupervisorDecisionList,
} from '../../message/supervisor';

const n = setNamespace('aiGroupChat');

const supervisor = new GroupChatSupervisor();

const getDebounceThreshold = (responseSpeed?: 'slow' | 'medium' | 'fast'): number => {
  switch (responseSpeed) {
    case 'fast': {
      return 3000;
    }
    case 'medium': {
      return 5000;
    }
    case 'slow': {
      return 8000;
    }
    default: {
      return 5000;
    }
  }
};

/**
 * Check if a message is a tool calling message that requires a follow-up
 */
const isToolCallMessage = (message: ChatMessage): boolean => {
  return message.role === 'assistant' && !!message.tools && message.tools.length > 0;
};

/**
 * Check if we should avoid supervisor decisions based on recent messages
 * Returns true if the conversation flow should continue without supervisor intervention
 */
const shouldAvoidSupervisorDecision = (messages: ChatMessage[]): boolean => {
  if (messages.length === 0) return true;
  
  const lastMessage = messages.at(-1);
  if (!lastMessage) return true;
  
  // Don't make decisions if the last message is a tool calling message
  // (it needs a follow-up assistant message)
  if (isToolCallMessage(lastMessage)) {
    return true;
  }
  
  // Don't make decisions if the last message is a tool response
  // (the conversation might still be in a tool calling sequence)
  if (lastMessage.role === 'tool') {
    return true;
  }
  
  return false;
};

export interface AIGroupChatAction {
  /**
   * Sends a new message to a group chat and triggers agent responses
   */
  sendGroupMessage: (params: SendGroupMessageParams) => Promise<void>;

  // =========  ↓ Internal Group Chat Methods ↓  ========== //

  /**
   * Triggers supervisor decision for group chat
   */
  internal_triggerSupervisorDecision: (groupId: string) => Promise<void>;

  /**
   * Triggers supervisor decision with debounce logic (dynamic threshold based on group responseSpeed setting)
   * Fast: 1s, Medium: 2s, Slow: 5s, Default: 3s
   * Cancels previous pending decisions and schedules a new one
   */
  internal_triggerSupervisorDecisionDebounced: (groupId: string) => void;

  /**
   * Cancels pending supervisor decision for a group
   */
  internal_cancelSupervisorDecision: (groupId: string) => void;

  /**
   * Cancels all pending supervisor decisions (cleanup method)
   */
  internal_cancelAllSupervisorDecisions: () => void;

  /**
   * Executes agent responses for group chat based on supervisor decisions
   */
  internal_executeAgentResponses: (
    groupId: string,
    decisions: SupervisorDecisionList,
  ) => Promise<void>;

  /**
   * Processes a single agent message in group chat
   */
  internal_processAgentMessage: (
    groupId: string,
    agentId: string,
    targetId?: string,
  ) => Promise<void>;

  /**
   * Sets the active group
   */
  internal_setActiveGroup: (groupId: string) => void;

  /**
   * Toggles supervisor loading state for group chat
   */
  internal_toggleSupervisorLoading: (loading: boolean, groupId?: string) => void;
}

export const generateAIGroupChat: StateCreator<
  ChatStore,
  [['zustand/devtools', never]],
  [],
  AIGroupChatAction
> = (set, get) => ({
  sendGroupMessage: async ({ groupId, message, files, onlyAddUserMessage, targetMemberId }) => {
    const {
      internal_createMessage,
      internal_triggerSupervisorDecisionDebounced,
      internal_setActiveGroup,
      activeTopicId,
    } = get();

    if (!message.trim() && (!files || files.length === 0)) return;

    internal_setActiveGroup(groupId);

    set({ isCreatingMessage: true }, false, n('creatingGroupMessage/start'));

    try {
      const userMessage: CreateMessageParams = {
        content: message,
        files: files?.map((f) => f.id),
        role: 'user',
        groupId,
        sessionId: useSessionStore.getState().activeId,
        topicId: activeTopicId,
        targetId: targetMemberId,
      };

      const messageId = await internal_createMessage(userMessage);

      // if only add user message, then stop
      if (onlyAddUserMessage) {
        set({ isCreatingMessage: false }, false, n('creatingGroupMessage/onlyUser'));
        return;
      }

      if (messageId) {
        internal_triggerSupervisorDecisionDebounced(groupId);
      }
    } catch (error) {
      console.error('Failed to send group message:', error);
    } finally {
      set({ isCreatingMessage: false }, false, n('creatingGroupMessage/end'));
    }
  },

  // ========= ↓ Group Chat Internal Methods ↓ ========== //

  internal_triggerSupervisorDecision: async (groupId: string) => {
    const { messagesMap, internal_toggleSupervisorLoading, activeTopicId } = get();

    const messages = messagesMap[messageMapKey(groupId, activeTopicId)] || [];
    const agents = sessionSelectors.currentGroupAgents(useSessionStore.getState());

    if (messages.length === 0) return;

    // Skip supervisor decision if we're in the middle of tool calling sequence
    if (shouldAvoidSupervisorDecision(messages)) {
      console.log('Skipping supervisor decision - waiting for tool calling sequence to complete');
      return;
    }

    // Create AbortController for this supervisor decision
    const abortController = new AbortController();
    
    // Store the AbortController in state
    set(
      produce((state: ChatStoreState) => {
        state.supervisorDecisionAbortControllers[groupId] = abortController;
      }),
      false,
      n(`setSupervisorAbortController/${groupId}`),
    );

    internal_toggleSupervisorLoading(true, groupId);

    const groupConfig = chatGroupSelectors.currentGroupConfig(useChatGroupStore.getState());

    // Get real user name from user store
    const userStoreState = getUserStoreState();
    const realUserName = userProfileSelectors.nickName(userStoreState) || 'User';

    try {
      const context: SupervisorContext = {
        availableAgents: agents!,
        groupId,
        messages,
        model: groupConfig.orchestratorModel || 'gemini-2.5-flash',
        provider: groupConfig.orchestratorProvider || 'google',
        userName: realUserName,
        systemPrompt: groupConfig.systemPrompt,
        abortController,
      };

      const decisions: SupervisorDecisionList = await supervisor.makeDecision(context);

      console.log('Supervisor decisions:', decisions);

      if (decisions.length > 0) {
        await get().internal_executeAgentResponses(groupId, decisions);
      }
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        console.log('Supervisor decision was aborted for group:', groupId);
      } else {
        console.error('Supervisor decision failed:', error);
      }
    } finally {
      internal_toggleSupervisorLoading(false, groupId);
      
      // Clean up AbortController from state
      set(
        produce((state: ChatStoreState) => {
          delete state.supervisorDecisionAbortControllers[groupId];
        }),
        false,
        n(`cleanupSupervisorAbortController/${groupId}`),
      );
    }
  },

  internal_executeAgentResponses: async (groupId: string, decisions: SupervisorDecisionList) => {
    const { internal_processAgentMessage, internal_triggerSupervisorDecisionDebounced } = get();

    const responsePromises = decisions.map((decision) =>
      internal_processAgentMessage(groupId, decision.id, decision.target),
    );

    try {
      await Promise.all(responsePromises);

      // Only trigger next supervisor decision after ALL agents have completed their responses
      // This prevents rapid-fire agent responses and gives time for conversation to settle
      if (decisions.length > 0) {
        internal_triggerSupervisorDecisionDebounced(groupId);
      }
    } catch (error) {
      console.error('Failed to execute agent responses:', error);
    }
  },

  // For group member responsing
  internal_processAgentMessage: async (groupId: string, agentId: string, targetId?: string) => {
    const {
      messagesMap,
      internal_createMessage,
      internal_fetchAIChatMessage,
      refreshMessages,
      activeTopicId,
      internal_dispatchMessage,
      internal_toggleChatLoading,
      triggerToolCalls,
      internal_triggerSupervisorDecisionDebounced,
    } = get();

    try {
      const allMessages = messagesMap[messageMapKey(groupId, activeTopicId)] || [];
      if (allMessages.length === 0) return;

      // Filter messages for this specific agent based on DM targeting rules
      const messages = filterMessagesForAgent(allMessages, agentId);

      // Get group agents and find the specific agent
      const agents = sessionSelectors.currentGroupAgents(useSessionStore.getState());
      const agentData = agents?.find((agent) => agent.id === agentId);

      if (!agentData) {
        console.error(`Agent ${agentId} not found in group members`);
        return;
      }

      const agentProvider = agentData.provider || undefined;
      const agentModel = agentData.model || undefined;

      console.log('DEBUG: Group chat agent data:', agentData);

      if (!agentProvider || !agentModel) {
        console.error(`No provider or model configured for agent ${agentId}`);
        return;
      }

      // Get the individual agent's full configuration including temperature, top_p, etc.
      // const agentStoreState = getAgentStoreState();
      // const agentConfig = agentSelectors.getAgentConfigById(agentId)(agentStoreState);

      // Get real user name from user store
      const userStoreState = getUserStoreState();
      const realUserName = userProfileSelectors.nickName(userStoreState) || 'User';

      const agentTitleMap: GroupMemberInfo[] = [
        { id: 'user', title: realUserName },
        ...(agents || []).map((agent) => ({ id: agent.id || '', title: agent.title || '' })),
      ];

      const baseSystemRole = agentData.systemRole || '';
      const members: GroupMemberInfo[] = agentTitleMap as GroupMemberInfo[];
      const groupChatSystemPrompt = buildGroupChatSystemPrompt({
        groupMembers: members,
        baseSystemRole,
        agentId,
        messages,
      });

      // Create agent message using real agent config
      const agentMessage: CreateMessageParams = {
        role: 'assistant',
        fromModel: agentModel,
        groupId,
        content: LOADING_FLAT,
        fromProvider: agentProvider,
        agentId,
        sessionId: useSessionStore.getState().activeId,
        topicId: activeTopicId,
        targetId: targetId, // Use targetId when provided for DM messages
      };

      const assistantId = await internal_createMessage(agentMessage);

      const systemMessage: ChatMessage = {
        id: 'group-system',
        role: 'system',
        content: groupChatSystemPrompt,
        createdAt: Date.now(),
        updatedAt: Date.now(),
        meta: {},
      };

      const userMessage: ChatMessage = {
        id: 'group-user',
        role: 'user',
        content: `Now it's your turn to respond. Based on supervisor decision, your message will be sent to ${targetId ? targetId : 'the group publicly'}. Please respond as this agent would, considering the full conversation history provided above. Directly return the message content, no other text. You do not need add author name or anything else.`,
        createdAt: Date.now(),
        updatedAt: Date.now(),
        meta: {},
      };

      // Add author names to messages for better context
      const messagesWithAuthors = messages.map((msg) => {
        const authorInfo = agentTitleMap.find((member) =>
          msg.role === 'user' ? member.id === 'user' : member.id === msg.agentId,
        );
        const authorName = authorInfo?.title || (msg.role === 'user' ? realUserName : 'Unknown');

        return {
          ...msg,
          content: `<author_name_do_not_include_in_your_response>${authorName}</author_name_do_not_include_in_your_response>${msg.content}`,
        };
      });

      const messagesForAPI = [systemMessage, ...messagesWithAuthors, userMessage];

      if (assistantId) {
        const { isFunctionCall } = await internal_fetchAIChatMessage({
          messages: messagesForAPI,
          messageId: assistantId,
          model: agentModel,
          provider: agentProvider,
          params: {
            traceId: `group-${groupId}-agent-${agentId}`,
            agentConfig: agentData,
          },
        });

        // Handle tool calling in group chat like single chat
        if (isFunctionCall) {
          get().internal_toggleMessageInToolsCalling(true, assistantId);
          await refreshMessages();
          await triggerToolCalls(assistantId, {
            threadId: undefined,
            inPortalThread: false,
          });
          // After tool calls complete, trigger supervisor decision to continue conversation
          internal_triggerSupervisorDecisionDebounced(groupId);
          return;
        }
      }

      await refreshMessages();

      // Don't trigger supervisor decision after individual agent responses
      // This prevents infinite loops of agent responses
      // Supervisor decisions should only be triggered after user messages or when all agents complete
    } catch (error) {
      console.error(`Failed to process message for agent ${agentId}:`, error);

      // Update error state if we have an assistant message
      const currentMessages = get().messagesMap[groupId] || [];
      const errorMessage = currentMessages.find(
        (m) => m.role === 'assistant' && m.groupId === groupId && m.content === LOADING_FLAT,
      );

      if (errorMessage) {
        internal_dispatchMessage({
          id: errorMessage.id,
          type: 'updateMessage',
          value: {
            content: `Error: Failed to generate response. ${error instanceof Error ? error.message : 'Unknown error'}`,
            error: {
              type: ChatErrorType.CreateMessageError,
              message: error instanceof Error ? error.message : 'Unknown error',
            },
          },
        });
      }
    } finally {
      internal_toggleChatLoading(false, undefined, n('processAgentMessage(end)'));
    }
  },

  internal_setActiveGroup: () => {
    // Update the active session type to 'group' when setting an active group
    get().internal_updateActiveSessionType('group');
  },

  internal_toggleSupervisorLoading: (loading: boolean, groupId?: string) => {
    set(
      {
        supervisorDecisionLoading: groupId
          ? toggleBooleanList(get().supervisorDecisionLoading, groupId, loading)
          : loading
            ? get().supervisorDecisionLoading
            : [],
      },
      false,
      n(`toggleSupervisorLoading/${loading ? 'start' : 'end'}`),
    );
  },

  internal_triggerSupervisorDecisionDebounced: (groupId: string) => {
    const { internal_cancelSupervisorDecision, internal_triggerSupervisorDecision } = get();

    console.log('Supervisor decision debounced triggered for group', groupId);

    internal_cancelSupervisorDecision(groupId);

    const groupConfig = chatGroupSelectors.currentGroupConfig(useChatGroupStore.getState());
    const responseSpeed = groupConfig?.responseSpeed;
    const debounceThreshold = getDebounceThreshold(responseSpeed);

    console.log(
      `Using debounce threshold: ${debounceThreshold}ms for responseSpeed: ${responseSpeed}`,
    );

    // Set a new timer with dynamic debounce based on group settings
    const timerId = setTimeout(async () => {
      console.log(`Debounced supervisor decision triggered for group ${groupId}`);

      // Clean up the timer from state before executing
      set(
        produce((state: ChatStoreState) => {
          delete state.supervisorDebounceTimers[groupId];
        }),
        false,
        n(`cleanupSupervisorTimer/${groupId}`),
      );

      try {
        await internal_triggerSupervisorDecision(groupId);
      } catch (error) {
        console.error(`Failed to execute supervisor decision for group ${groupId}:`, error);
      }
    }, debounceThreshold);

    // Store the timer in state
    set(
      produce((state: ChatStoreState) => {
        state.supervisorDebounceTimers[groupId] = timerId as any;
      }),
      false,
      n(`setSupervisorTimer/${groupId}`),
    );
  },

  internal_cancelSupervisorDecision: (groupId: string) => {
    const { supervisorDebounceTimers, supervisorDecisionAbortControllers, internal_toggleSupervisorLoading } = get();
    const existingTimer = supervisorDebounceTimers[groupId];
    const existingAbortController = supervisorDecisionAbortControllers[groupId];

    console.log(`Attempting to cancel supervisor decision for group ${groupId}`, {
      existingTimer: !!existingTimer,
      existingAbortController: !!existingAbortController,
      allTimers: Object.keys(supervisorDebounceTimers),
      allAbortControllers: Object.keys(supervisorDecisionAbortControllers)
    });

    // Cancel pending debounced timer
    if (existingTimer) {
      clearTimeout(existingTimer);
      console.log(`Cancelled pending supervisor decision timer for group ${groupId}`);

      // Remove timer from state
      set(
        produce((state: ChatStoreState) => {
          delete state.supervisorDebounceTimers[groupId];
        }),
        false,
        n(`cancelSupervisorTimer/${groupId}`),
      );
    }

    // Abort ongoing supervisor decision request
    if (existingAbortController) {
      existingAbortController.abort('User cancelled supervisor decision');
      console.log(`Aborted ongoing supervisor decision request for group ${groupId}`);

      // Remove abort controller from state  
      set(
        produce((state: ChatStoreState) => {
          delete state.supervisorDecisionAbortControllers[groupId];
        }),
        false,
        n(`cancelSupervisorAbortController/${groupId}`),
      );
    }

    // Stop the loading state
    internal_toggleSupervisorLoading(false, groupId);
    console.log(`Stopped supervisor loading state for group ${groupId}`);
  },

  internal_cancelAllSupervisorDecisions: () => {
    const { supervisorDebounceTimers, supervisorDecisionAbortControllers } = get();
    const timerGroupIds = Object.keys(supervisorDebounceTimers);
    const abortControllerGroupIds = Object.keys(supervisorDecisionAbortControllers);

    if (timerGroupIds.length > 0 || abortControllerGroupIds.length > 0) {
      console.log('Cancelling all pending supervisor decisions for session change/cleanup');

      // Cancel all timers
      timerGroupIds.forEach((groupId) => {
        const timer = supervisorDebounceTimers[groupId];
        if (timer) {
          clearTimeout(timer);
        }
      });

      // Abort all ongoing requests
      abortControllerGroupIds.forEach((groupId) => {
        const abortController = supervisorDecisionAbortControllers[groupId];
        if (abortController) {
          abortController.abort('Session cleanup');
        }
      });

      // Clear all timers and abort controllers from state
      set(
        { 
          supervisorDebounceTimers: {},
          supervisorDecisionAbortControllers: {}
        }, 
        false, 
        n('cancelAllSupervisorDecisions')
      );
    }
  },
});
