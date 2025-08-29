import { OpenAIChatMessage } from '@lobechat/types';
import { describe, expect, it, vi } from 'vitest';

import { chainSummaryTitle } from '../summaryTitle';

describe('chainSummaryTitle', () => {
  it('should use the default model if the token count is below the GPT-3.5 limit', async () => {
    // Arrange
    const messages: OpenAIChatMessage[] = [
      { content: 'Hello, how can I assist you?', role: 'assistant' },
      { content: 'I need help with my account.', role: 'user' },
    ];
    const currentLanguage = 'en-US';
    const tokenCount = 10000; // Arbitrary token count below the GPT-3.5 limit

    // Act
    const result = await chainSummaryTitle(messages, currentLanguage);

    // Assert
    expect(result).toEqual({
      messages: [
        {
          content:
            'You are a conversation-savvy assistant. Summarize the conversation into a title within 5 words.',
          role: 'system',
        },
        {
          content: `assistant: Hello, how can I assist you?\nuser: I need help with my account.

Please summarize the above conversation into a title within 5 words, without punctuation. Output language locale: ${currentLanguage}`,
          role: 'user',
        },
      ],
    });
  });
});
