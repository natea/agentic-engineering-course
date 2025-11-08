import { Router } from 'express';
import { blogPostService } from '../services/blogPostService';
import { PostStatus } from '@prisma/client';
import rateLimit from 'express-rate-limit';

const router = Router();

// Rate limiters
const generalLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 100,
  message: 'Too many requests, please try again later',
});

const aiLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 10,
  message: 'AI generation rate limit exceeded',
});

// GET /api/blog/posts - List posts
router.get('/posts', generalLimiter, async (req, res) => {
  try {
    const status = req.query.status as PostStatus | undefined;
    const limit = req.query.limit ? parseInt(req.query.limit as string) : undefined;
    const offset = req.query.offset ? parseInt(req.query.offset as string) : undefined;

    const posts = await blogPostService.listPosts({
      status,
      limit,
      offset,
    });

    res.json({ posts });
  } catch (error) {
    console.error('Error listing posts:', error);
    res.status(500).json({ error: 'Failed to list posts' });
  }
});

// GET /api/blog/posts/:id - Get single post with messages
router.get('/posts/:id', generalLimiter, async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const post = await blogPostService.getPostWithMessages(id);

    if (!post) {
      return res.status(404).json({ error: 'Post not found' });
    }

    res.json({ post });
  } catch (error) {
    console.error('Error getting post:', error);
    res.status(500).json({ error: 'Failed to get post' });
  }
});

// PUT /api/blog/posts/:id - Update draft post
router.put('/posts/:id', generalLimiter, async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const { title, content } = req.body;

    if (!title && !content) {
      return res.status(400).json({ error: 'Title or content required' });
    }

    const post = await blogPostService.updatePost(id, { title, content });
    res.json({ post });
  } catch (error) {
    console.error('Error updating post:', error);
    const message = error instanceof Error ? error.message : 'Failed to update post';
    res.status(400).json({ error: message });
  }
});

// POST /api/blog/posts/:id/publish - Publish draft
router.post('/posts/:id/publish', generalLimiter, async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const post = await blogPostService.publishPost(id);
    res.json({ post });
  } catch (error) {
    console.error('Error publishing post:', error);
    const message = error instanceof Error ? error.message : 'Failed to publish post';
    res.status(400).json({ error: message });
  }
});

// DELETE /api/blog/posts/:id - Delete draft
router.delete('/posts/:id', generalLimiter, async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    await blogPostService.deletePost(id);
    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting post:', error);
    const message = error instanceof Error ? error.message : 'Failed to delete post';
    res.status(400).json({ error: message });
  }
});

// POST /api/blog/posts/:id/archive - Archive published post
router.post('/posts/:id/archive', generalLimiter, async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const post = await blogPostService.archivePost(id);
    res.json({ post });
  } catch (error) {
    console.error('Error archiving post:', error);
    res.status(500).json({ error: 'Failed to archive post' });
  }
});

export { router as blogRouter };
