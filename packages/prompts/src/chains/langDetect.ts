import { ChatStreamPayload } from '@lobechat/types';

export const chainLangDetect = (content: string): Partial<ChatStreamPayload> => ({
  messages: [
    {
      content:
        'You are a linguistics expert proficient in world languages. Identify the language of the user input and output the result as an international standard locale.',
      role: 'system',
    },
    {
      content: '{你好}',
      role: 'user',
    },
    {
      content: 'zh-CN',
      role: 'assistant',
    },
    {
      content: '{hello}',
      role: 'user',
    },
    {
      content: 'en-US',
      role: 'assistant',
    },
    {
      content: `{${content}}`,
      role: 'user',
    },
  ],
});
