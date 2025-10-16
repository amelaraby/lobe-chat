import { ChatMessage } from '@/types/message/chat';
import { ChatStreamPayload, OpenAIChatMessage } from '@/types/openai/chat';

export const chainSummaryTitle = (
  messages: (ChatMessage | OpenAIChatMessage)[],
  locale: string,
): Partial<ChatStreamPayload> => {
  return {
    messages: [
      {
        content:
          'You are a conversation-savvy assistant. Summarize the conversation into a title within 5 words.',
        role: 'system',
      },
      {
        content: `${messages.map((message) => `${message.role}: ${message.content}`).join('\n')}

Please summarize the above conversation into a title within 5 words, without punctuation. Output language locale: ${locale}`,
        role: 'user',
      },
    ],
  };
};
