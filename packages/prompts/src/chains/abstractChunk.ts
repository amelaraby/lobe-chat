import { ChatStreamPayload } from '@lobechat/types';

export const chainAbstractChunkText = (text: string): Partial<ChatStreamPayload> => {
  return {
    messages: [
      {
        content:
          'You are an assistant skilled at extracting summaries from chunks. Summarize the user conversation into 1–2 sentences, and output in the same language as the chunk.',
        role: 'system',
      },
      {
        content: `chunk: ${text}`,
        role: 'user',
      },
    ],
  };
};
