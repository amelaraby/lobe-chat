import { ChatStreamPayload } from '@lobechat/types';

export const chainSummaryGenerationTitle = (
  prompts: string[],
  modal: 'image' | 'video',
  locale: string,
): Partial<ChatStreamPayload> => {
  // Format multiple prompts for better readability
  const formattedPrompts = prompts.map((prompt, index) => `${index + 1}. ${prompt}`).join('\n');

  return {
    messages: [
      {
        content: `You are an experienced AI art creator and language expert. Based on the user's AI ${modal} prompt, summarize a title that succinctly describes the core of the creation. The title will be used to label and manage this series. Keep it within 10 characters, without punctuation. Output language: ${locale}.`,
        role: 'system',
      },
      {
        content: `Prompts:\n${formattedPrompts}`,
        role: 'user',
      },
    ],
  };
};
