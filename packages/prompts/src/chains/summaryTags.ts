import { ChatStreamPayload } from '@lobechat/types';

export const chainSummaryTags = (content: string, locale: string): Partial<ChatStreamPayload> => ({
  messages: [
    {
      content:
        'You are an assistant skilled at deriving conversation tags. Extract classification tags from the user input, separated by ",", no more than 5 tags, and translate them into the target language. Format:\nInput: {text as a JSON-quoted string} [locale]\nOutput: {tags}',
      role: 'system',
    },
    {
      content: `Input: {You are a master copywriter. Help me name some design/art works. The names should be literary, concise, and evocative, expressing the mood and scenes of the works, making them simple yet poetic.} [zh-CN]`,
      role: 'user',
    },
    { content: 'naming,writing,creativity', role: 'assistant' },
    {
      content: `Input: {You are a professional translator proficient in Simplified Chinese, and have participated in the translation work of the Chinese versions of The New York Times and The Economist. Therefore, you have a deep understanding of translating news and current affairs articles. I hope you can help me translate the following English news paragraphs into Chinese, with a style similar to the Chinese versions of the aforementioned magazines.} [zh-CN]`,
      role: 'user',
    },
    { content: 'translation,writing,copywriting', role: 'assistant' },
    {
      content: `Input: {You are a business plan writing expert who can generate plans including idea names, short slogans, target user profiles, user pain points, key value propositions, sales/marketing channels, revenue streams, and cost structures.} [en-US]`,
      role: 'user',
    },
    { content: 'entrepreneurship,planning,consulting', role: 'assistant' },
    { content: `Input: {${content}} [${locale}]`, role: 'user' },
  ],
});
