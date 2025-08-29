import { ChatStreamPayload } from '@lobechat/types';
import { describe, expect, it } from 'vitest';

import { chainPickEmoji } from '../pickEmoji';

// 描述测试块
describe('chainPickEmoji', () => {
  // Validate function returns the correct structure
  it('should return a payload with the correct structure and embedded user content', () => {
    // 用户输入的内容
    const userContent = '你是一名星际探索者';

    // 预期的返回值结构
    const expectedPayload: Partial<ChatStreamPayload> = {
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
        { content: `Input: {${userContent}}`, role: 'user' },
      ],
    };

    // 执行函数并获取结果
    const result = chainPickEmoji(userContent);

    // 断言结果是否符合预期
    expect(result).toEqual(expectedPayload);
  });
});
