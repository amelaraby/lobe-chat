import { ChatStreamPayload } from '@lobechat/types';

export const chainTranslate = (
  content: string,
  targetLang: string,
): Partial<ChatStreamPayload> => ({
  messages: [
    {
      content:
        'You are a skilled translation assistant. Translate the input language into the target language.',
      role: 'system',
    },
    {
      content: `Please translate the following content to ${targetLang}: ${content}`,
      role: 'user',
    },
  ],
});
