import { blogPostService } from '../blogPostService';
import { PrismaClient, PostStatus } from '@prisma/client';

const prisma = new PrismaClient();

describe('blogPostService', () => {
  beforeEach(async () => {
    await prisma.postMessage.deleteMany();
    await prisma.blogPost.deleteMany();
    await prisma.message.deleteMany();
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  describe('createDraftPost', () => {
    it('should create a draft blog post', async () => {
      const message = await prisma.message.create({
        data: {
          imessageId: 'test-1',
          chatId: 'chat-1',
          senderId: 'sender-1',
          text: 'Test message',
          sentAt: new Date(),
        },
      });

      const post = await blogPostService.createDraftPost(
        {
          messageIds: [message.id],
          startTime: new Date(),
          endTime: new Date(),
          messageCount: 1,
        },
        {
          title: 'Test Post',
          content: 'Test content',
        }
      );

      expect(post.title).toBe('Test Post');
      expect(post.status).toBe(PostStatus.DRAFT);
      expect(post.messageCount).toBe(1);
    });
  });

  describe('publishPost', () => {
    it('should publish a draft post', async () => {
      const post = await prisma.blogPost.create({
        data: {
          title: 'Draft Post',
          content: 'Content',
          status: PostStatus.DRAFT,
          threadStartTime: new Date(),
          threadEndTime: new Date(),
          messageCount: 1,
        },
      });

      const published = await blogPostService.publishPost(post.id);

      expect(published.status).toBe(PostStatus.PUBLISHED);
      expect(published.publishedAt).toBeTruthy();
    });

    it('should throw error if post is not draft', async () => {
      const post = await prisma.blogPost.create({
        data: {
          title: 'Published Post',
          content: 'Content',
          status: PostStatus.PUBLISHED,
          threadStartTime: new Date(),
          threadEndTime: new Date(),
          messageCount: 1,
          publishedAt: new Date(),
        },
      });

      await expect(blogPostService.publishPost(post.id)).rejects.toThrow();
    });
  });
});
