import { describe, expect, it } from 'vitest';

import { chainSummaryAgentName } from '../summaryAgentName';

describe('chainSummaryAgentName', () => {
  it('should create a payload with system and user messages including the provided content and current language', () => {
    // Arrange
    const content = '这是一段测试文本';
    const currentLanguage = 'en-US';

    // Act
    const result = chainSummaryAgentName(content, currentLanguage);

    // Assert
    expect(result).toEqual({
      messages: [
        {
          content: `You are a master namer with literary sensibility. Create a role name within 10 characters based on the user's description, emphasizing concision and evocative meaning, and translate it into the target language. Format:\nInput: {text as a JSON-quoted string} [locale]\nOutput: {role name}`,
          role: 'system',
        },
        {
          content: `Input: {You are a master copywriter. Help me name some design/art works. The names should be literary, concise, and evocative, expressing the mood and scenes of the works, making them simple yet poetic.} [zh-CN]`,
          role: 'user',
        },
        {
          content: `Input: {You are a UX writer, adept at transforming plain descriptions into refined expressions. The user will input a text; rewrite it into a more polished form within 40 characters.} [ru-RU]`,
          role: 'user',
        },
        { content: 'Creative UX editor', role: 'assistant' },
        {
          content: `Input: {You are a frontend code expert. Please convert the following code to TS without changing the implementation. If there are global variables not defined in the original JS, add type declarations using declare.} [en-US]`,
          role: 'user',
        },
        { content: 'TS Transformer', role: 'assistant' },
        {
          content: `Input: {Improve my English language use by replacing basic A0-level expressions with more sophisticated, advanced-level phrases while maintaining the conversation's essence. Your responses should focus solely on corrections and enhancements, avoiding additional explanations.} [zh-CN]`,
          role: 'user',
        },
        { content: 'Email optimization assistant', role: 'assistant' },
        { content: `Input: {${content}} [${currentLanguage}]`, role: 'user' },
      ],
    });
  });
});
