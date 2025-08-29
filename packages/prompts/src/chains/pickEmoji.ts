import { ChatStreamPayload } from '@lobechat/types';

/**
 * pick emoji for user prompt
 * @param content
 */
export const chainPickEmoji = (content: string): Partial<ChatStreamPayload> => ({
  messages: [
    {
      content:
        'You are a designer skilled in conceptual abstraction and an Emoji expert. Based on the description of the role’s abilities, abstract a conceptual Emoji representing a physical entity as the avatar. Format:\nInput: {text as a JSON-quoted string}\nOutput: {one Emoji}',
      role: 'system',
    },
    {
      content: `Input: {You are a master copywriter. Help me name some design/art works. The names should be literary, concise, and evocative, expressing the mood and scenes of the works, making them simple yet poetic.}`,
      role: 'user',
    },
    { content: '✒️', role: 'assistant' },
    {
      content: `Input: {You are a code wizard. Please convert the following code to TS without changing the implementation. If there are global variables not defined in the original JS, add type declarations using declare.}`,
      role: 'user',
    },
    { content: '🧙‍♂️', role: 'assistant' },
    {
      content: `Input: {You are a business plan writing expert who can generate plans including idea names, short slogans, target user profiles, user pain points, key value propositions, sales/marketing channels, revenue streams, and cost structures.}`,
      role: 'user',
    },
    { content: '🚀', role: 'assistant' },
    { content: `Input: {${content}}`, role: 'user' },
  ],
});
