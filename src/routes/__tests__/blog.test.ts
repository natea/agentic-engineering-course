import request from 'supertest';
import express from 'express';
import { blogRouter } from '../blog';
import { PrismaClient, PostStatus } from '@prisma/client';

const prisma = new PrismaClient();
const app = express();
app.use(express.json());
app.use('/api/blog', blogRouter);

describe('Blog API Routes', () => {
  beforeEach(async () => {
    await prisma.postMessage.deleteMany();
    await prisma.blogPost.deleteMany();
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  describe('GET /api/blog/posts', () => {
    it('should return list of posts', async () => {
      await prisma.blogPost.create({
        data: {
          title: 'Test Post',
          content: 'Content',
          status: PostStatus.DRAFT,
          threadStartTime: new Date(),
          threadEndTime: new Date(),
          messageCount: 1,
        },
      });

      const response = await request(app).get('/api/blog/posts');

      expect(response.status).toBe(200);
      expect(response.body.posts).toHaveLength(1);
      expect(response.body.posts[0].title).toBe('Test Post');
    });

    it('should filter by status', async () => {
      await prisma.blogPost.create({
        data: {
          title: 'Draft',
          content: 'Content',
          status: PostStatus.DRAFT,
          threadStartTime: new Date(),
          threadEndTime: new Date(),
          messageCount: 1,
        },
      });

      await prisma.blogPost.create({
        data: {
          title: 'Published',
          content: 'Content',
          status: PostStatus.PUBLISHED,
          threadStartTime: new Date(),
          threadEndTime: new Date(),
          messageCount: 1,
          publishedAt: new Date(),
        },
      });

      const response = await request(app).get('/api/blog/posts?status=DRAFT');

      expect(response.status).toBe(200);
      expect(response.body.posts).toHaveLength(1);
      expect(response.body.posts[0].title).toBe('Draft');
    });
  });

  describe('POST /api/blog/posts/:id/publish', () => {
    it('should publish a draft post', async () => {
      const post = await prisma.blogPost.create({
        data: {
          title: 'Draft',
          content: 'Content',
          status: PostStatus.DRAFT,
          threadStartTime: new Date(),
          threadEndTime: new Date(),
          messageCount: 1,
        },
      });

      const response = await request(app).post(`/api/blog/posts/${post.id}/publish`);

      expect(response.status).toBe(200);
      expect(response.body.post.status).toBe(PostStatus.PUBLISHED);
    });
  });
});
