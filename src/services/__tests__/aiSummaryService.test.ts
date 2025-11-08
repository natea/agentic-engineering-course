import { aiSummaryService } from '../aiSummaryService';
import Anthropic from '@anthropic-ai/sdk';

jest.mock('@anthropic-ai/sdk');

describe('aiSummaryService', () => {
  beforeEach(() => {
    // Set environment variable for tests
    process.env.ANTHROPIC_API_KEY = 'test-key';
    // Reset client to ensure fresh mocks
    aiSummaryService.resetClient();
  });

  describe('generateBlogPost', () => {
    it('should generate title and content from messages', async () => {
      const mockCreate = jest.fn().mockResolvedValue({
        content: [{
          type: 'text',
          text: JSON.stringify({
            title: 'Great Conversation',
            content: 'This is a summary of the conversation.',
          }),
        }],
      });

      (Anthropic as jest.MockedClass<typeof Anthropic>).mockImplementation(() => ({
        messages: { create: mockCreate },
      } as any));

      const messages = [
        { text: 'Hello', senderName: 'Alice', sentAt: new Date() },
        { text: 'Hi there', senderName: 'Bob', sentAt: new Date() },
      ];

      const result = await aiSummaryService.generateBlogPost(messages);

      expect(result.title).toBe('Great Conversation');
      expect(result.content).toBe('This is a summary of the conversation.');
      expect(mockCreate).toHaveBeenCalled();
    });

    it('should handle API errors gracefully', async () => {
      const mockCreate = jest.fn().mockRejectedValue(new Error('API Error'));

      (Anthropic as jest.MockedClass<typeof Anthropic>).mockImplementation(() => ({
        messages: { create: mockCreate },
      } as any));

      const messages = [
        { text: 'Hello', senderName: 'Alice', sentAt: new Date() },
      ];

      const result = await aiSummaryService.generateBlogPost(messages);

      expect(result.title).toContain('Conversation');
      expect(result.content).toContain('Hello');
      expect(result.fallback).toBe(true);
    });
  });
});
