import Anthropic from '@anthropic-ai/sdk';
import { BlogPostContent, MessageForSummary } from '../types/blog';

class AISummaryService {
  private client: Anthropic | null = null;

  // For testing: reset the client
  resetClient(): void {
    this.client = null;
  }

  private getClient(): Anthropic {
    if (!this.client) {
      const apiKey = process.env.ANTHROPIC_API_KEY;
      if (!apiKey) {
        throw new Error('ANTHROPIC_API_KEY is required');
      }
      this.client = new Anthropic({ apiKey });
    }
    return this.client;
  }

  async generateBlogPost(messages: MessageForSummary[]): Promise<BlogPostContent> {
    try {
      const prompt = this.buildPrompt(messages);
      const client = this.getClient();

      const response = await client.messages.create({
        model: 'claude-sonnet-4-5-20250929',
        max_tokens: 2048,
        messages: [{
          role: 'user',
          content: prompt,
        }],
      });

      const textContent = response.content[0];
      if (textContent.type === 'text') {
        // Remove markdown code fences if present
        let jsonText = textContent.text.trim();
        if (jsonText.startsWith('```')) {
          // Remove opening fence (```json or ```)
          jsonText = jsonText.replace(/^```(?:json)?\n?/, '');
          // Remove closing fence
          jsonText = jsonText.replace(/\n?```$/, '');
        }

        const parsed = JSON.parse(jsonText);
        return {
          title: parsed.title,
          content: parsed.content,
        };
      }

      return this.generateFallbackPost(messages);
    } catch (error) {
      console.error('AI generation failed:', error);
      return this.generateFallbackPost(messages);
    }
  }

  private buildPrompt(messages: MessageForSummary[]): string {
    const participants = [...new Set(messages.map(m => m.senderName).filter(Boolean))];
    const startTime = messages[0]?.sentAt;
    const endTime = messages[messages.length - 1]?.sentAt;

    const transcript = messages
      .map(m => `[${m.sentAt.toLocaleString()}] ${m.senderName}: ${m.text}`)
      .join('\n');

    return `You are summarizing a personal iMessage conversation into a blog post.

Conversation participants: ${participants.join(', ')}
Time period: ${startTime?.toLocaleString()} to ${endTime?.toLocaleString()}
Message count: ${messages.length}

Messages:
${transcript}

Create an engaging blog post that:
1. Captures the main topics and key points discussed
2. Maintains a natural narrative flow
3. Respects the conversational tone
4. Creates a SPECIFIC and DESCRIPTIVE title that reflects the actual content and topics discussed
   - The title should be unique and meaningful, not generic
   - It should tell readers what the conversation is actually about
   - Examples: "Planning Sarah's Birthday Surprise Party", "Debugging the Production Database Issue", "Weekend Hiking Trip to Mount Rainier"
   - AVOID generic titles like "A Conversation" or "Chat with Friends"

Return ONLY valid JSON in this exact format (no markdown code fences):
{"title": "Blog Post Title", "content": "Blog post content here..."}`;
  }

  private generateFallbackPost(messages: MessageForSummary[]): BlogPostContent {
    const startTime = messages[0]?.sentAt;
    const endTime = messages[messages.length - 1]?.sentAt;

    const transcript = messages
      .map(m => `**${m.senderName}** (${m.sentAt.toLocaleTimeString()}): ${m.text}`)
      .join('\n\n');

    return {
      title: `Conversation from ${startTime?.toLocaleDateString()}`,
      content: `# Conversation Transcript\n\n${transcript}`,
      fallback: true,
    };
  }
}

export const aiSummaryService = new AISummaryService();
