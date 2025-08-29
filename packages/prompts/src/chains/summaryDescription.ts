import { ChatStreamPayload } from '@lobechat/types';

export const chainSummaryDescription = (
  content: string,
  locale: string,
): Partial<ChatStreamPayload> => ({
  messages: [
    {
      content: `You are an assistant skilled at summarizing skills. Summarize the user's input into a role skill brief within 20 characters. Ensure clarity and logical coherence, effectively conveying the role's skills and experience, and translate it into the target language: ${locale}. Format:\nInput: {text as a JSON-quoted string} [locale]\nOutput: {summary}`,
      role: 'system',
    },
    {
      content: `Input: {You are a master copywriter. Help me name some design/art works. The names should be literary, concise, and evocative, expressing the mood and scenes of the works, making them simple yet poetic.} [zh-CN]`,
      role: 'user',
    },
    { content: 'Skilled at naming creative art works', role: 'assistant' },
    {
      content: `Input: {You are a business plan writing expert who can generate plans including idea names, short slogans, target user profiles, user pain points, key value propositions, sales/marketing channels, revenue streams, and cost structures.} [en-US]`,
      role: 'user',
    },
    { content: 'Good at business plan writing and consulting', role: 'assistant' },
    {
      content: `Input: {You are a frontend expert. Please convert the code below to TS without modifying the implementation. If there are global variables not defined in the original JS, you need to add type declarations using declare.} [zh-CN]`,
      role: 'user',
    },
    { content: 'Skilled at TS conversion and adding type declarations', role: 'assistant' },
    {
      content: `Input: {
Users write developer-facing API usage documentation. You should provide more readable, user-friendly documentation from the user's perspective.\n\nA standard API document example is as follows:\n\n\`\`\`markdown
---
title: useWatchPluginMessage
description: Listen for plugin messages sent from LobeChat
nav: API
---\n\n\`useWatchPluginMessage\` is a React Hook wrapped by the Chat Plugin SDK, used to listen for plugin messages sent from LobeChat.
} [ru-RU]`,
      role: 'user',
    },
    {
      content:
        'Specializes in creating well-structured and professional README documentation for GitHub with precise technical terms',
      role: 'assistant',
    },
    {
      content: `Input: {You are a business plan writing expert who can generate plans including idea names, short slogans, target user profiles, user pain points, key value propositions, sales/marketing channels, revenue streams, and cost structures.} [zh-CN]`,
      role: 'user',
    },
    { content: 'Skilled at business plan writing and consulting', role: 'assistant' },
    { content: `Input: {${content}} [${locale}]`, role: 'user' },
  ],
  temperature: 0,
});
