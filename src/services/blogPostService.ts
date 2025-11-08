import { PrismaClient, BlogPost, PostStatus } from '@prisma/client';
import { BlogPostContent } from '../types/blog';

const prisma = new PrismaClient();

interface ThreadData {
  messageIds: number[];
  startTime: Date;
  endTime: Date;
  messageCount: number;
}

class BlogPostService {
  async createDraftPost(
    threadData: ThreadData,
    aiContent: BlogPostContent
  ): Promise<BlogPost> {
    const post = await prisma.blogPost.create({
      data: {
        title: aiContent.title,
        content: aiContent.content,
        status: PostStatus.DRAFT,
        threadStartTime: threadData.startTime,
        threadEndTime: threadData.endTime,
        messageCount: threadData.messageCount,
        messages: {
          create: threadData.messageIds.map(messageId => ({
            messageId,
          })),
        },
      },
    });

    // Mark messages as processed
    await prisma.message.updateMany({
      where: { id: { in: threadData.messageIds } },
      data: { processedForPost: true },
    });

    return post;
  }

  async updatePost(id: number, updates: { title?: string; content?: string }): Promise<BlogPost> {
    const post = await prisma.blogPost.findUnique({ where: { id } });

    if (!post) {
      throw new Error('Post not found');
    }

    if (post.status !== PostStatus.DRAFT) {
      throw new Error('Can only edit draft posts');
    }

    return prisma.blogPost.update({
      where: { id },
      data: updates,
    });
  }

  async publishPost(id: number): Promise<BlogPost> {
    const post = await prisma.blogPost.findUnique({ where: { id } });

    if (!post) {
      throw new Error('Post not found');
    }

    if (post.status !== PostStatus.DRAFT) {
      throw new Error('Can only publish draft posts');
    }

    return prisma.blogPost.update({
      where: { id },
      data: {
        status: PostStatus.PUBLISHED,
        publishedAt: new Date(),
      },
    });
  }

  async deletePost(id: number): Promise<void> {
    const post = await prisma.blogPost.findUnique({ where: { id } });

    if (!post) {
      throw new Error('Post not found');
    }

    if (post.status === PostStatus.PUBLISHED) {
      throw new Error('Cannot delete published posts. Archive them instead.');
    }

    await prisma.blogPost.delete({ where: { id } });
  }

  async archivePost(id: number): Promise<BlogPost> {
    return prisma.blogPost.update({
      where: { id },
      data: { status: PostStatus.ARCHIVED },
    });
  }

  async listPosts(filters?: {
    status?: PostStatus;
    limit?: number;
    offset?: number;
  }): Promise<BlogPost[]> {
    return prisma.blogPost.findMany({
      where: filters?.status ? { status: filters.status } : undefined,
      take: filters?.limit || 50,
      skip: filters?.offset || 0,
      orderBy: { createdAt: 'desc' },
    });
  }

  async getPostWithMessages(id: number) {
    return prisma.blogPost.findUnique({
      where: { id },
      include: {
        messages: {
          include: { message: true },
        },
      },
    });
  }
}

export const blogPostService = new BlogPostService();
