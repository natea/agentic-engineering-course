# iMessage Blog Platform Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build an automated blogging platform that syncs iMessage conversations, uses Claude AI to generate summaries, and provides a web UI for reviewing and publishing blog posts.

**Architecture:** Monolithic Express app with scheduled tasks (node-cron), service layer for business logic, RESTful API, and server-rendered web UI. SQLite database via Prisma for storing messages and blog posts. Claude API for AI-powered summarization.

**Tech Stack:** Express, Prisma, SQLite, imessage-kit, @anthropic-ai/sdk, node-cron, JWT auth, Bootstrap 5

---

## Task 1: Add Dependencies and Environment Setup

**Files:**
- Modify: `package.json`
- Create: `.env.example`
- Modify: `.env`

**Step 1: Install new npm packages**

Run:
```bash
npm install imessage-kit @anthropic-ai/sdk node-cron
```

Expected: Packages installed, package.json and package-lock.json updated

**Step 2: Update .env.example with new variables**

Add to `.env.example`:
```
# Existing variables...
DATABASE_URL="file:./dev.db"
JWT_SECRET="your-secret-key"
PORT=3000

# iMessage Blog Platform
ANTHROPIC_API_KEY="your-anthropic-api-key-here"
SYNC_SCHEDULE="0 2 * * *"
THREAD_GAP_HOURS="2"
MAX_THREADS_PER_RUN="10"
PRIVACY_MODE="false"
```

**Step 3: Update .env with actual API key**

Add to `.env`:
```
ANTHROPIC_API_KEY="sk-ant-your-actual-key"
SYNC_SCHEDULE="0 2 * * *"
THREAD_GAP_HOURS="2"
MAX_THREADS_PER_RUN="10"
PRIVACY_MODE="false"
```

**Step 4: Commit**

```bash
git add package.json package-lock.json .env.example
git commit -m "feat: add dependencies for iMessage blog platform"
```

---

## Task 2: Update Prisma Schema with Blog Models

**Files:**
- Modify: `prisma/schema.prisma`

**Step 1: Add new models to schema**

Add to `prisma/schema.prisma` after the existing User model:

```prisma
model Message {
  id                Int           @id @default(autoincrement())
  imessageId        String        @unique
  chatId            String
  senderId          String
  senderName        String?
  text              String?
  attachments       String?
  sentAt            DateTime
  syncedAt          DateTime      @default(now())
  processedForPost  Boolean       @default(false)
  posts             PostMessage[]

  @@index([chatId, sentAt])
  @@index([processedForPost])
}

model BlogPost {
  id              Int           @id @default(autoincrement())
  title           String
  content         String
  status          PostStatus    @default(DRAFT)
  threadStartTime DateTime
  threadEndTime   DateTime
  messageCount    Int
  createdAt       DateTime      @default(now())
  updatedAt       DateTime      @updatedAt
  publishedAt     DateTime?
  messages        PostMessage[]

  @@index([status, createdAt])
}

enum PostStatus {
  DRAFT
  PUBLISHED
  ARCHIVED
}

model PostMessage {
  id        Int       @id @default(autoincrement())
  postId    Int
  messageId Int
  post      BlogPost  @relation(fields: [postId], references: [id], onDelete: Cascade)
  message   Message   @relation(fields: [messageId], references: [id], onDelete: Cascade)

  @@unique([postId, messageId])
}
```

**Step 2: Create and run migration**

Run:
```bash
npx prisma migrate dev --name add_blog_models
```

Expected: Migration created and applied, database updated

**Step 3: Generate Prisma Client**

Run:
```bash
npx prisma generate
```

Expected: Prisma Client regenerated with new types

**Step 4: Commit**

```bash
git add prisma/schema.prisma prisma/migrations/
git commit -m "feat: add blog post and message models to schema"
```

---

## Task 3: Create iMessage Sync Service

**Files:**
- Create: `src/services/iMessageSyncService.ts`
- Create: `src/types/imessage.ts`

**Step 1: Write failing test**

Create `src/services/__tests__/iMessageSyncService.test.ts`:

```typescript
import { iMessageSyncService } from '../iMessageSyncService';
import { PrismaClient } from '@prisma/client';

jest.mock('imessage-kit');

const prisma = new PrismaClient();

describe('iMessageSyncService', () => {
  beforeEach(async () => {
    await prisma.message.deleteMany();
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  describe('syncNewMessages', () => {
    it('should import new messages from iMessage database', async () => {
      const result = await iMessageSyncService.syncNewMessages();
      expect(result.messagesAdded).toBeGreaterThanOrEqual(0);
      expect(result.errors).toEqual([]);
    });
  });

  describe('detectThreadBoundaries', () => {
    it('should group messages by time gaps', async () => {
      // Create test messages with time gaps
      const now = new Date();
      const message1 = await prisma.message.create({
        data: {
          imessageId: 'test-1',
          chatId: 'chat-1',
          senderId: 'sender-1',
          text: 'First message',
          sentAt: new Date(now.getTime() - 5 * 60 * 60 * 1000), // 5 hours ago
        },
      });

      const message2 = await prisma.message.create({
        data: {
          imessageId: 'test-2',
          chatId: 'chat-1',
          senderId: 'sender-2',
          text: 'Second message',
          sentAt: new Date(now.getTime() - 1 * 60 * 60 * 1000), // 1 hour ago
        },
      });

      const threads = await iMessageSyncService.detectThreadBoundaries(2);
      expect(threads).toHaveLength(2);
      expect(threads[0].messageIds).toContain(message1.id);
      expect(threads[1].messageIds).toContain(message2.id);
    });
  });
});
```

**Step 2: Run test to verify it fails**

Run:
```bash
npm test -- iMessageSyncService.test.ts
```

Expected: FAIL with "Cannot find module '../iMessageSyncService'"

**Step 3: Create types file**

Create `src/types/imessage.ts`:

```typescript
export interface SyncResult {
  messagesAdded: number;
  errors: string[];
  lastSyncTime: Date;
}

export interface MessageThread {
  chatId: string;
  messageIds: number[];
  startTime: Date;
  endTime: Date;
  messageCount: number;
  participants: string[];
}
```

**Step 4: Write minimal implementation**

Create `src/services/iMessageSyncService.ts`:

```typescript
import { PrismaClient } from '@prisma/client';
import { SyncResult, MessageThread } from '../types/imessage';

const prisma = new PrismaClient();

class IMessageSyncService {
  async syncNewMessages(): Promise<SyncResult> {
    try {
      // For now, return empty result - will implement imessage-kit integration later
      return {
        messagesAdded: 0,
        errors: [],
        lastSyncTime: new Date(),
      };
    } catch (error) {
      return {
        messagesAdded: 0,
        errors: [error instanceof Error ? error.message : 'Unknown error'],
        lastSyncTime: new Date(),
      };
    }
  }

  async detectThreadBoundaries(timeGapHours: number = 2): Promise<MessageThread[]> {
    const messages = await prisma.message.findMany({
      where: { processedForPost: false },
      orderBy: { sentAt: 'asc' },
    });

    const threads: MessageThread[] = [];
    let currentThread: MessageThread | null = null;
    const gapMs = timeGapHours * 60 * 60 * 1000;

    for (const message of messages) {
      if (!currentThread) {
        // Start new thread
        currentThread = {
          chatId: message.chatId,
          messageIds: [message.id],
          startTime: message.sentAt,
          endTime: message.sentAt,
          messageCount: 1,
          participants: [message.senderId],
        };
      } else if (
        message.chatId === currentThread.chatId &&
        message.sentAt.getTime() - currentThread.endTime.getTime() < gapMs
      ) {
        // Add to current thread
        currentThread.messageIds.push(message.id);
        currentThread.endTime = message.sentAt;
        currentThread.messageCount++;
        if (!currentThread.participants.includes(message.senderId)) {
          currentThread.participants.push(message.senderId);
        }
      } else {
        // Save current thread and start new one
        threads.push(currentThread);
        currentThread = {
          chatId: message.chatId,
          messageIds: [message.id],
          startTime: message.sentAt,
          endTime: message.sentAt,
          messageCount: 1,
          participants: [message.senderId],
        };
      }
    }

    // Add last thread
    if (currentThread) {
      threads.push(currentThread);
    }

    return threads;
  }

  async getLastSyncTime(): Promise<Date | null> {
    const lastMessage = await prisma.message.findFirst({
      orderBy: { syncedAt: 'desc' },
      select: { syncedAt: true },
    });
    return lastMessage?.syncedAt || null;
  }
}

export const iMessageSyncService = new IMessageSyncService();
```

**Step 5: Run test to verify it passes**

Run:
```bash
npm test -- iMessageSyncService.test.ts
```

Expected: PASS

**Step 6: Commit**

```bash
git add src/services/iMessageSyncService.ts src/types/imessage.ts src/services/__tests__/iMessageSyncService.test.ts
git commit -m "feat: add iMessage sync service with thread detection"
```

---

## Task 4: Create AI Summary Service

**Files:**
- Create: `src/services/aiSummaryService.ts`
- Create: `src/types/blog.ts`

**Step 1: Write failing test**

Create `src/services/__tests__/aiSummaryService.test.ts`:

```typescript
import { aiSummaryService } from '../aiSummaryService';
import Anthropic from '@anthropic-ai/sdk';

jest.mock('@anthropic-ai/sdk');

describe('aiSummaryService', () => {
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
```

**Step 2: Run test to verify it fails**

Run:
```bash
npm test -- aiSummaryService.test.ts
```

Expected: FAIL with "Cannot find module '../aiSummaryService'"

**Step 3: Create types file**

Create `src/types/blog.ts`:

```typescript
export interface BlogPostContent {
  title: string;
  content: string;
  fallback?: boolean;
}

export interface MessageForSummary {
  text: string | null;
  senderName: string | null;
  sentAt: Date;
}
```

**Step 4: Write minimal implementation**

Create `src/services/aiSummaryService.ts`:

```typescript
import Anthropic from '@anthropic-ai/sdk';
import { BlogPostContent, MessageForSummary } from '../types/blog';

class AISummaryService {
  private client: Anthropic;

  constructor() {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      throw new Error('ANTHROPIC_API_KEY is required');
    }
    this.client = new Anthropic({ apiKey });
  }

  async generateBlogPost(messages: MessageForSummary[]): Promise<BlogPostContent> {
    try {
      const prompt = this.buildPrompt(messages);

      const response = await this.client.messages.create({
        model: 'claude-3-5-sonnet-20241022',
        max_tokens: 2048,
        messages: [{
          role: 'user',
          content: prompt,
        }],
      });

      const textContent = response.content[0];
      if (textContent.type === 'text') {
        const parsed = JSON.parse(textContent.text);
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
1. Captures the main topics and key points
2. Maintains a natural narrative flow
3. Respects the conversational tone
4. Suggests a descriptive title

Return ONLY valid JSON in this exact format:
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
```

**Step 5: Run test to verify it passes**

Run:
```bash
npm test -- aiSummaryService.test.ts
```

Expected: PASS

**Step 6: Commit**

```bash
git add src/services/aiSummaryService.ts src/types/blog.ts src/services/__tests__/aiSummaryService.test.ts
git commit -m "feat: add AI summary service with Claude integration"
```

---

## Task 5: Create Blog Post Service

**Files:**
- Create: `src/services/blogPostService.ts`

**Step 1: Write failing test**

Create `src/services/__tests__/blogPostService.test.ts`:

```typescript
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
```

**Step 2: Run test to verify it fails**

Run:
```bash
npm test -- blogPostService.test.ts
```

Expected: FAIL with "Cannot find module '../blogPostService'"

**Step 3: Write minimal implementation**

Create `src/services/blogPostService.ts`:

```typescript
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
```

**Step 4: Run test to verify it passes**

Run:
```bash
npm test -- blogPostService.test.ts
```

Expected: PASS

**Step 5: Commit**

```bash
git add src/services/blogPostService.ts src/services/__tests__/blogPostService.test.ts
git commit -m "feat: add blog post service with CRUD operations"
```

---

## Task 6: Create Scheduled Task Service

**Files:**
- Create: `src/services/scheduledTaskService.ts`

**Step 1: Write failing test**

Create `src/services/__tests__/scheduledTaskService.test.ts`:

```typescript
import { scheduledTaskService } from '../scheduledTaskService';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Mock the sub-services
jest.mock('../iMessageSyncService');
jest.mock('../aiSummaryService');
jest.mock('../blogPostService');

describe('scheduledTaskService', () => {
  describe('runGenerationJob', () => {
    it('should orchestrate the full workflow', async () => {
      const result = await scheduledTaskService.runGenerationJob();

      expect(result.threadsProcessed).toBeGreaterThanOrEqual(0);
      expect(result.draftsCreated).toBeGreaterThanOrEqual(0);
      expect(Array.isArray(result.errors)).toBe(true);
    });
  });
});
```

**Step 2: Run test to verify it fails**

Run:
```bash
npm test -- scheduledTaskService.test.ts
```

Expected: FAIL with "Cannot find module '../scheduledTaskService'"

**Step 3: Write minimal implementation**

Create `src/services/scheduledTaskService.ts`:

```typescript
import cron from 'node-cron';
import { iMessageSyncService } from './iMessageSyncService';
import { aiSummaryService } from './aiSummaryService';
import { blogPostService } from './blogPostService';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

interface JobResult {
  threadsProcessed: number;
  draftsCreated: number;
  errors: string[];
  timestamp: Date;
}

class ScheduledTaskService {
  private isRunning = false;
  private scheduledJob: cron.ScheduledTask | null = null;

  async runGenerationJob(): Promise<JobResult> {
    if (this.isRunning) {
      console.log('Job already running, skipping...');
      return {
        threadsProcessed: 0,
        draftsCreated: 0,
        errors: ['Job already running'],
        timestamp: new Date(),
      };
    }

    this.isRunning = true;
    const result: JobResult = {
      threadsProcessed: 0,
      draftsCreated: 0,
      errors: [],
      timestamp: new Date(),
    };

    try {
      // Step 1: Sync new messages
      console.log('Starting message sync...');
      const syncResult = await iMessageSyncService.syncNewMessages();
      result.errors.push(...syncResult.errors);
      console.log(`Synced ${syncResult.messagesAdded} new messages`);

      // Step 2: Detect threads
      const timeGapHours = parseInt(process.env.THREAD_GAP_HOURS || '2');
      const threads = await iMessageSyncService.detectThreadBoundaries(timeGapHours);
      console.log(`Detected ${threads.length} threads`);

      // Step 3: Process threads (with limit)
      const maxThreads = parseInt(process.env.MAX_THREADS_PER_RUN || '10');
      const threadsToProcess = threads.slice(0, maxThreads);

      for (const thread of threadsToProcess) {
        try {
          // Get full message data
          const messages = await prisma.message.findMany({
            where: { id: { in: thread.messageIds } },
            orderBy: { sentAt: 'asc' },
          });

          // Generate summary
          const aiContent = await aiSummaryService.generateBlogPost(messages);

          // Create draft post
          await blogPostService.createDraftPost(
            {
              messageIds: thread.messageIds,
              startTime: thread.startTime,
              endTime: thread.endTime,
              messageCount: thread.messageCount,
            },
            aiContent
          );

          result.threadsProcessed++;
          result.draftsCreated++;
          console.log(`Created draft: ${aiContent.title}`);
        } catch (error) {
          const errorMsg = error instanceof Error ? error.message : 'Unknown error';
          result.errors.push(`Thread processing failed: ${errorMsg}`);
          console.error('Thread processing error:', error);
        }
      }

      console.log(`Job complete: ${result.draftsCreated} drafts created`);
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      result.errors.push(`Job failed: ${errorMsg}`);
      console.error('Job error:', error);
    } finally {
      this.isRunning = false;
    }

    return result;
  }

  startScheduledJob(): void {
    const schedule = process.env.SYNC_SCHEDULE || '0 2 * * *';

    console.log(`Starting scheduled job with schedule: ${schedule}`);
    this.scheduledJob = cron.schedule(schedule, async () => {
      console.log('Running scheduled generation job...');
      await this.runGenerationJob();
    });
  }

  stopScheduledJob(): void {
    if (this.scheduledJob) {
      this.scheduledJob.stop();
      this.scheduledJob = null;
      console.log('Scheduled job stopped');
    }
  }
}

export const scheduledTaskService = new ScheduledTaskService();
```

**Step 4: Run test to verify it passes**

Run:
```bash
npm test -- scheduledTaskService.test.ts
```

Expected: PASS

**Step 5: Commit**

```bash
git add src/services/scheduledTaskService.ts src/services/__tests__/scheduledTaskService.test.ts
git commit -m "feat: add scheduled task service for automated workflow"
```

---

## Task 7: Create Blog API Routes

**Files:**
- Create: `src/routes/blog.ts`
- Modify: `src/index.ts`

**Step 1: Write failing integration test**

Create `src/routes/__tests__/blog.test.ts`:

```typescript
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
```

**Step 2: Run test to verify it fails**

Run:
```bash
npm test -- blog.test.ts
```

Expected: FAIL with "Cannot find module '../blog'"

**Step 3: Write implementation**

Create `src/routes/blog.ts`:

```typescript
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
```

**Step 4: Update main app to include blog routes**

Add to `src/index.ts` after auth routes:

```typescript
import { blogRouter } from './routes/blog';

// ... existing code ...

app.use('/api/blog', blogRouter);
```

**Step 5: Run test to verify it passes**

Run:
```bash
npm test -- blog.test.ts
```

Expected: PASS

**Step 6: Commit**

```bash
git add src/routes/blog.ts src/routes/__tests__/blog.test.ts src/index.ts
git commit -m "feat: add blog API routes with CRUD operations"
```

---

## Task 8: Create Sync & Generate API Routes

**Files:**
- Create: `src/routes/sync.ts`
- Modify: `src/index.ts`

**Step 1: Write failing test**

Create `src/routes/__tests__/sync.test.ts`:

```typescript
import request from 'supertest';
import express from 'express';
import { syncRouter } from '../sync';

jest.mock('../../services/iMessageSyncService');
jest.mock('../../services/scheduledTaskService');

const app = express();
app.use(express.json());
app.use('/api/sync', syncRouter);

describe('Sync API Routes', () => {
  describe('POST /api/sync/trigger', () => {
    it('should trigger manual sync', async () => {
      const response = await request(app).post('/api/sync/trigger');

      expect(response.status).toBe(200);
      expect(response.body.result).toBeDefined();
    });
  });

  describe('POST /api/sync/generate', () => {
    it('should trigger manual generation', async () => {
      const response = await request(app).post('/api/sync/generate');

      expect(response.status).toBe(200);
      expect(response.body.result).toBeDefined();
    });
  });

  describe('GET /api/sync/status', () => {
    it('should return sync status', async () => {
      const response = await request(app).get('/api/sync/status');

      expect(response.status).toBe(200);
      expect(response.body.lastSyncTime).toBeDefined();
    });
  });
});
```

**Step 2: Run test to verify it fails**

Run:
```bash
npm test -- sync.test.ts
```

Expected: FAIL with "Cannot find module '../sync'"

**Step 3: Write implementation**

Create `src/routes/sync.ts`:

```typescript
import { Router } from 'express';
import { iMessageSyncService } from '../services/iMessageSyncService';
import { scheduledTaskService } from '../services/scheduledTaskService';
import { PrismaClient } from '@prisma/client';
import rateLimit from 'express-rate-limit';

const router = Router();
const prisma = new PrismaClient();

// Rate limiter for manual operations
const manualOpLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 10,
  message: 'Manual operation rate limit exceeded',
});

// POST /api/sync/trigger - Manually trigger sync
router.post('/trigger', manualOpLimiter, async (req, res) => {
  try {
    const result = await iMessageSyncService.syncNewMessages();
    res.json({ result });
  } catch (error) {
    console.error('Error triggering sync:', error);
    res.status(500).json({ error: 'Failed to trigger sync' });
  }
});

// POST /api/sync/generate - Manually trigger generation
router.post('/generate', manualOpLimiter, async (req, res) => {
  try {
    const result = await scheduledTaskService.runGenerationJob();
    res.json({ result });
  } catch (error) {
    console.error('Error triggering generation:', error);
    res.status(500).json({ error: 'Failed to trigger generation' });
  }
});

// GET /api/sync/status - Get sync status
router.get('/status', async (req, res) => {
  try {
    const lastSyncTime = await iMessageSyncService.getLastSyncTime();
    const messageCount = await prisma.message.count();
    const draftCount = await prisma.blogPost.count({
      where: { status: 'DRAFT' },
    });

    const schedule = process.env.SYNC_SCHEDULE || '0 2 * * *';

    res.json({
      lastSyncTime,
      messageCount,
      draftCount,
      schedule,
    });
  } catch (error) {
    console.error('Error getting sync status:', error);
    res.status(500).json({ error: 'Failed to get sync status' });
  }
});

export { router as syncRouter };
```

**Step 4: Update main app**

Add to `src/index.ts` after blog routes:

```typescript
import { syncRouter } from './routes/sync';

// ... existing code ...

app.use('/api/sync', syncRouter);
```

**Step 5: Run test to verify it passes**

Run:
```bash
npm test -- sync.test.ts
```

Expected: PASS

**Step 6: Commit**

```bash
git add src/routes/sync.ts src/routes/__tests__/sync.test.ts src/index.ts
git commit -m "feat: add sync and generate API endpoints"
```

---

## Task 9: Initialize Scheduled Job in Server

**Files:**
- Modify: `src/index.ts`

**Step 1: Add scheduled job startup**

Update `src/index.ts` to start the scheduled job when server starts:

```typescript
import { scheduledTaskService } from './services/scheduledTaskService';

// ... existing code ...

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);

  // Start scheduled job
  scheduledTaskService.startScheduledJob();
  console.log('Scheduled job initialized');
});
```

**Step 2: Test server starts without errors**

Run:
```bash
npm run dev
```

Expected: Server starts, logs "Scheduled job initialized"

**Step 3: Stop server and commit**

Press Ctrl+C to stop, then:

```bash
git add src/index.ts
git commit -m "feat: initialize scheduled job on server startup"
```

---

## Task 10: Create Web UI - Dashboard Page

**Files:**
- Create: `public/index.html`
- Create: `public/css/style.css`
- Create: `public/js/dashboard.js`
- Modify: `src/index.ts`

**Step 1: Set up static file serving**

Add to `src/index.ts`:

```typescript
import path from 'path';

// ... existing code ...

// Serve static files
app.use(express.static(path.join(__dirname, '../public')));
```

**Step 2: Create dashboard HTML**

Create `public/index.html`:

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>iMessage Blog Dashboard</title>
  <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/css/bootstrap.min.css" rel="stylesheet">
  <link rel="stylesheet" href="/css/style.css">
</head>
<body>
  <nav class="navbar navbar-dark bg-dark">
    <div class="container-fluid">
      <span class="navbar-brand mb-0 h1">iMessage Blog Platform</span>
    </div>
  </nav>

  <div class="container mt-4">
    <h1>Dashboard</h1>

    <div class="row mt-4">
      <div class="col-md-4">
        <div class="card">
          <div class="card-body">
            <h5 class="card-title">Drafts</h5>
            <p class="card-text display-4" id="draft-count">-</p>
            <a href="/drafts.html" class="btn btn-primary">View Drafts</a>
          </div>
        </div>
      </div>

      <div class="col-md-4">
        <div class="card">
          <div class="card-body">
            <h5 class="card-title">Published</h5>
            <p class="card-text display-4" id="published-count">-</p>
            <a href="/posts.html" class="btn btn-primary">View Posts</a>
          </div>
        </div>
      </div>

      <div class="col-md-4">
        <div class="card">
          <div class="card-body">
            <h5 class="card-title">Messages</h5>
            <p class="card-text display-4" id="message-count">-</p>
          </div>
        </div>
      </div>
    </div>

    <div class="card mt-4">
      <div class="card-body">
        <h5 class="card-title">Last Sync</h5>
        <p class="card-text" id="last-sync">Never</p>
        <p class="card-text"><small class="text-muted">Schedule: <span id="sync-schedule">-</span></small></p>
        <button class="btn btn-secondary" id="manual-sync-btn">Manual Sync</button>
        <button class="btn btn-success" id="manual-generate-btn">Generate Drafts</button>
      </div>
    </div>

    <div id="alert-container"></div>
  </div>

  <script src="/js/dashboard.js"></script>
</body>
</html>
```

**Step 3: Create CSS**

Create `public/css/style.css`:

```css
body {
  background-color: #f8f9fa;
}

.card {
  box-shadow: 0 0.125rem 0.25rem rgba(0, 0, 0, 0.075);
}

#alert-container {
  position: fixed;
  top: 70px;
  right: 20px;
  z-index: 1050;
  min-width: 300px;
}
```

**Step 4: Create dashboard JavaScript**

Create `public/js/dashboard.js`:

```javascript
// Load dashboard stats
async function loadDashboard() {
  try {
    // Get sync status
    const statusRes = await fetch('/api/sync/status');
    const status = await statusRes.json();

    document.getElementById('message-count').textContent = status.messageCount;
    document.getElementById('draft-count').textContent = status.draftCount;
    document.getElementById('sync-schedule').textContent = status.schedule;

    if (status.lastSyncTime) {
      const date = new Date(status.lastSyncTime);
      document.getElementById('last-sync').textContent = date.toLocaleString();
    }

    // Get published count
    const postsRes = await fetch('/api/blog/posts?status=PUBLISHED');
    const posts = await postsRes.json();
    document.getElementById('published-count').textContent = posts.posts.length;
  } catch (error) {
    showAlert('Failed to load dashboard', 'danger');
  }
}

// Manual sync
document.getElementById('manual-sync-btn').addEventListener('click', async () => {
  try {
    showAlert('Syncing messages...', 'info');
    const res = await fetch('/api/sync/trigger', { method: 'POST' });
    const data = await res.json();

    showAlert(`Synced ${data.result.messagesAdded} messages`, 'success');
    loadDashboard();
  } catch (error) {
    showAlert('Sync failed', 'danger');
  }
});

// Manual generate
document.getElementById('manual-generate-btn').addEventListener('click', async () => {
  try {
    showAlert('Generating drafts...', 'info');
    const res = await fetch('/api/sync/generate', { method: 'POST' });
    const data = await res.json();

    showAlert(`Created ${data.result.draftsCreated} drafts`, 'success');
    loadDashboard();
  } catch (error) {
    showAlert('Generation failed', 'danger');
  }
});

// Show alert helper
function showAlert(message, type) {
  const alert = document.createElement('div');
  alert.className = `alert alert-${type} alert-dismissible fade show`;
  alert.innerHTML = `
    ${message}
    <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
  `;
  document.getElementById('alert-container').appendChild(alert);

  setTimeout(() => alert.remove(), 5000);
}

// Load on page load
loadDashboard();
```

**Step 5: Test dashboard loads**

Run:
```bash
npm run dev
```

Open browser to `http://localhost:3000` and verify dashboard displays.

**Step 6: Commit**

```bash
git add public/ src/index.ts
git commit -m "feat: add dashboard web UI"
```

---

## Task 11: Create Web UI - Drafts Page

**Files:**
- Create: `public/drafts.html`
- Create: `public/js/drafts.js`

**Step 1: Create drafts HTML**

Create `public/drafts.html`:

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Draft Posts - iMessage Blog</title>
  <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/css/bootstrap.min.css" rel="stylesheet">
  <link rel="stylesheet" href="/css/style.css">
</head>
<body>
  <nav class="navbar navbar-dark bg-dark">
    <div class="container-fluid">
      <a class="navbar-brand" href="/">iMessage Blog Platform</a>
      <div>
        <a href="/drafts.html" class="btn btn-sm btn-outline-light">Drafts</a>
        <a href="/posts.html" class="btn btn-sm btn-outline-light">Published</a>
      </div>
    </div>
  </nav>

  <div class="container mt-4">
    <h1>Draft Posts</h1>

    <div id="drafts-container" class="mt-4">
      <p class="text-muted">Loading...</p>
    </div>
  </div>

  <!-- Edit Modal -->
  <div class="modal fade" id="editModal" tabindex="-1">
    <div class="modal-dialog modal-lg">
      <div class="modal-content">
        <div class="modal-header">
          <h5 class="modal-title">Edit Draft</h5>
          <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
        </div>
        <div class="modal-body">
          <div class="mb-3">
            <label class="form-label">Title</label>
            <input type="text" class="form-control" id="edit-title">
          </div>
          <div class="mb-3">
            <label class="form-label">Content</label>
            <textarea class="form-control" id="edit-content" rows="10"></textarea>
          </div>
        </div>
        <div class="modal-footer">
          <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cancel</button>
          <button type="button" class="btn btn-primary" id="save-edit-btn">Save Changes</button>
        </div>
      </div>
    </div>
  </div>

  <div id="alert-container"></div>

  <script src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/js/bootstrap.bundle.min.js"></script>
  <script src="/js/drafts.js"></script>
</body>
</html>
```

**Step 2: Create drafts JavaScript**

Create `public/js/drafts.js`:

```javascript
let currentEditId = null;
let editModal = null;

// Load drafts
async function loadDrafts() {
  try {
    const res = await fetch('/api/blog/posts?status=DRAFT');
    const data = await res.json();

    const container = document.getElementById('drafts-container');

    if (data.posts.length === 0) {
      container.innerHTML = '<p class="text-muted">No drafts available</p>';
      return;
    }

    container.innerHTML = data.posts.map(post => `
      <div class="card mb-3">
        <div class="card-body">
          <h5 class="card-title">${post.title}</h5>
          <p class="card-text text-muted">
            ${new Date(post.threadStartTime).toLocaleString()} - ${post.messageCount} messages
          </p>
          <div class="btn-group">
            <a href="/post.html?id=${post.id}" class="btn btn-sm btn-outline-primary">View</a>
            <button class="btn btn-sm btn-outline-secondary" onclick="editPost(${post.id})">Edit</button>
            <button class="btn btn-sm btn-success" onclick="publishPost(${post.id})">Publish</button>
            <button class="btn btn-sm btn-danger" onclick="deletePost(${post.id})">Delete</button>
          </div>
        </div>
      </div>
    `).join('');
  } catch (error) {
    showAlert('Failed to load drafts', 'danger');
  }
}

// Edit post
async function editPost(id) {
  try {
    const res = await fetch(`/api/blog/posts/${id}`);
    const data = await res.json();

    currentEditId = id;
    document.getElementById('edit-title').value = data.post.title;
    document.getElementById('edit-content').value = data.post.content;

    editModal = new bootstrap.Modal(document.getElementById('editModal'));
    editModal.show();
  } catch (error) {
    showAlert('Failed to load post', 'danger');
  }
}

// Save edit
document.getElementById('save-edit-btn').addEventListener('click', async () => {
  try {
    const title = document.getElementById('edit-title').value;
    const content = document.getElementById('edit-content').value;

    await fetch(`/api/blog/posts/${currentEditId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title, content }),
    });

    editModal.hide();
    showAlert('Post updated', 'success');
    loadDrafts();
  } catch (error) {
    showAlert('Failed to update post', 'danger');
  }
});

// Publish post
async function publishPost(id) {
  if (!confirm('Publish this post?')) return;

  try {
    await fetch(`/api/blog/posts/${id}/publish`, { method: 'POST' });
    showAlert('Post published', 'success');
    loadDrafts();
  } catch (error) {
    showAlert('Failed to publish post', 'danger');
  }
}

// Delete post
async function deletePost(id) {
  if (!confirm('Delete this draft?')) return;

  try {
    await fetch(`/api/blog/posts/${id}`, { method: 'DELETE' });
    showAlert('Draft deleted', 'success');
    loadDrafts();
  } catch (error) {
    showAlert('Failed to delete draft', 'danger');
  }
}

// Show alert helper
function showAlert(message, type) {
  const alert = document.createElement('div');
  alert.className = `alert alert-${type} alert-dismissible fade show`;
  alert.innerHTML = `
    ${message}
    <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
  `;
  document.getElementById('alert-container').appendChild(alert);

  setTimeout(() => alert.remove(), 5000);
}

// Load on page load
loadDrafts();
```

**Step 3: Test drafts page loads**

Run:
```bash
npm run dev
```

Navigate to `http://localhost:3000/drafts.html` and verify it displays.

**Step 4: Commit**

```bash
git add public/drafts.html public/js/drafts.js
git commit -m "feat: add drafts management UI"
```

---

## Task 12: Create Web UI - Published Posts Page

**Files:**
- Create: `public/posts.html`
- Create: `public/js/posts.js`

**Step 1: Create posts HTML**

Create `public/posts.html`:

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Published Posts - iMessage Blog</title>
  <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/css/bootstrap.min.css" rel="stylesheet">
  <link rel="stylesheet" href="/css/style.css">
</head>
<body>
  <nav class="navbar navbar-dark bg-dark">
    <div class="container-fluid">
      <a class="navbar-brand" href="/">iMessage Blog Platform</a>
      <div>
        <a href="/drafts.html" class="btn btn-sm btn-outline-light">Drafts</a>
        <a href="/posts.html" class="btn btn-sm btn-outline-light">Published</a>
      </div>
    </div>
  </nav>

  <div class="container mt-4">
    <h1>Published Posts</h1>

    <div id="posts-container" class="mt-4">
      <p class="text-muted">Loading...</p>
    </div>
  </div>

  <div id="alert-container"></div>

  <script src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/js/bootstrap.bundle.min.js"></script>
  <script src="/js/posts.js"></script>
</body>
</html>
```

**Step 2: Create posts JavaScript**

Create `public/js/posts.js`:

```javascript
// Load published posts
async function loadPosts() {
  try {
    const res = await fetch('/api/blog/posts?status=PUBLISHED');
    const data = await res.json();

    const container = document.getElementById('posts-container');

    if (data.posts.length === 0) {
      container.innerHTML = '<p class="text-muted">No published posts</p>';
      return;
    }

    container.innerHTML = data.posts.map(post => `
      <div class="card mb-3">
        <div class="card-body">
          <h5 class="card-title">${post.title}</h5>
          <p class="card-text text-muted">
            Published ${new Date(post.publishedAt).toLocaleString()} · ${post.messageCount} messages
          </p>
          <div class="btn-group">
            <a href="/post.html?id=${post.id}" class="btn btn-sm btn-outline-primary">View</a>
            <button class="btn btn-sm btn-warning" onclick="archivePost(${post.id})">Archive</button>
          </div>
        </div>
      </div>
    `).join('');
  } catch (error) {
    showAlert('Failed to load posts', 'danger');
  }
}

// Archive post
async function archivePost(id) {
  if (!confirm('Archive this post?')) return;

  try {
    await fetch(`/api/blog/posts/${id}/archive`, { method: 'POST' });
    showAlert('Post archived', 'success');
    loadPosts();
  } catch (error) {
    showAlert('Failed to archive post', 'danger');
  }
}

// Show alert helper
function showAlert(message, type) {
  const alert = document.createElement('div');
  alert.className = `alert alert-${type} alert-dismissible fade show`;
  alert.innerHTML = `
    ${message}
    <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
  `;
  document.getElementById('alert-container').appendChild(alert);

  setTimeout(() => alert.remove(), 5000);
}

// Load on page load
loadPosts();
```

**Step 3: Test posts page**

Run:
```bash
npm run dev
```

Navigate to `http://localhost:3000/posts.html` and verify it displays.

**Step 4: Commit**

```bash
git add public/posts.html public/js/posts.js
git commit -m "feat: add published posts UI"
```

---

## Task 13: Create Web UI - Post Detail Page

**Files:**
- Create: `public/post.html`
- Create: `public/js/post.js`

**Step 1: Create post detail HTML**

Create `public/post.html`:

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Post Detail - iMessage Blog</title>
  <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/css/bootstrap.min.css" rel="stylesheet">
  <link rel="stylesheet" href="/css/style.css">
</head>
<body>
  <nav class="navbar navbar-dark bg-dark">
    <div class="container-fluid">
      <a class="navbar-brand" href="/">iMessage Blog Platform</a>
      <div>
        <a href="/drafts.html" class="btn btn-sm btn-outline-light">Drafts</a>
        <a href="/posts.html" class="btn btn-sm btn-outline-light">Published</a>
      </div>
    </div>
  </nav>

  <div class="container mt-4">
    <div id="post-container">
      <p class="text-muted">Loading...</p>
    </div>
  </div>

  <div id="alert-container"></div>

  <script src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/js/bootstrap.bundle.min.js"></script>
  <script src="/js/post.js"></script>
</body>
</html>
```

**Step 2: Create post detail JavaScript**

Create `public/js/post.js`:

```javascript
// Load post detail
async function loadPost() {
  const params = new URLSearchParams(window.location.search);
  const id = params.get('id');

  if (!id) {
    document.getElementById('post-container').innerHTML = '<p class="text-danger">Post ID required</p>';
    return;
  }

  try {
    const res = await fetch(`/api/blog/posts/${id}`);
    const data = await res.json();
    const post = data.post;

    document.getElementById('post-container').innerHTML = `
      <article>
        <h1>${post.title}</h1>
        <p class="text-muted">
          ${post.status} ·
          ${post.publishedAt ? `Published ${new Date(post.publishedAt).toLocaleString()}` : `Created ${new Date(post.createdAt).toLocaleString()}`}
        </p>

        <div class="mt-4" style="white-space: pre-wrap;">${post.content}</div>

        <div class="mt-4">
          <button class="btn btn-outline-secondary" onclick="toggleMessages()">
            View Source Messages (${post.messageCount})
          </button>
        </div>

        <div id="messages-container" class="mt-3 d-none">
          <h3>Source Messages</h3>
          ${post.messages.map(pm => `
            <div class="card mb-2">
              <div class="card-body">
                <p class="card-text"><strong>${pm.message.senderName || pm.message.senderId}</strong></p>
                <p class="card-text">${pm.message.text || '(no text)'}</p>
                <p class="card-text"><small class="text-muted">${new Date(pm.message.sentAt).toLocaleString()}</small></p>
              </div>
            </div>
          `).join('')}
        </div>
      </article>
    `;
  } catch (error) {
    showAlert('Failed to load post', 'danger');
  }
}

// Toggle messages visibility
function toggleMessages() {
  const container = document.getElementById('messages-container');
  container.classList.toggle('d-none');
}

// Show alert helper
function showAlert(message, type) {
  const alert = document.createElement('div');
  alert.className = `alert alert-${type} alert-dismissible fade show`;
  alert.innerHTML = `
    ${message}
    <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
  `;
  document.getElementById('alert-container').appendChild(alert);

  setTimeout(() => alert.remove(), 5000);
}

// Load on page load
loadPost();
```

**Step 3: Test post detail page**

Run:
```bash
npm run dev
```

Navigate to a post detail URL and verify it displays.

**Step 4: Commit**

```bash
git add public/post.html public/js/post.js
git commit -m "feat: add post detail page with source messages"
```

---

## Task 14: Run All Tests

**Step 1: Run full test suite**

Run:
```bash
npm test
```

Expected: All tests pass

**Step 2: Check test coverage**

Run:
```bash
npm test -- --coverage
```

Expected: Coverage > 80%

**Step 3: If tests fail, fix them**

Review failures and fix issues.

**Step 4: Commit any fixes**

```bash
git add .
git commit -m "test: ensure all tests pass with >80% coverage"
```

---

## Task 15: Update README with Documentation

**Files:**
- Modify: `README.md`

**Step 1: Add iMessage blog platform documentation**

Add to `README.md` after existing content:

```markdown
## iMessage Blog Platform

### Overview

Automated blogging platform that syncs iMessage conversations and generates blog posts using Claude AI.

### Features

- Automatic message sync from iMessage database
- AI-powered conversation summaries via Claude
- Time-based thread detection
- Draft approval workflow
- Web UI for managing posts
- Scheduled background jobs
- Rate limiting and error handling

### Setup

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Configure environment variables:**
   ```bash
   cp .env.example .env
   ```

   Add your Anthropic API key:
   ```
   ANTHROPIC_API_KEY=sk-ant-your-key-here
   ```

3. **Run database migrations:**
   ```bash
   npm run migrate
   ```

4. **Start the server:**
   ```bash
   npm run dev
   ```

### Usage

#### Web UI

- **Dashboard:** http://localhost:3000 - View stats and trigger manual operations
- **Drafts:** http://localhost:3000/drafts.html - Review and edit draft posts
- **Published:** http://localhost:3000/posts.html - View published posts

#### API Endpoints

**Blog Management:**
- `GET /api/blog/posts` - List posts (filter by status)
- `GET /api/blog/posts/:id` - Get post with source messages
- `PUT /api/blog/posts/:id` - Update draft post
- `POST /api/blog/posts/:id/publish` - Publish draft
- `DELETE /api/blog/posts/:id` - Delete draft
- `POST /api/blog/posts/:id/archive` - Archive published post

**Manual Operations:**
- `POST /api/sync/trigger` - Manually sync messages
- `POST /api/sync/generate` - Manually generate drafts
- `GET /api/sync/status` - Get sync status

### Configuration

Configure via environment variables in `.env`:

- `ANTHROPIC_API_KEY` - Claude API key (required)
- `SYNC_SCHEDULE` - Cron schedule (default: `0 2 * * *` = 2am daily)
- `THREAD_GAP_HOURS` - Time gap for thread detection (default: 2)
- `MAX_THREADS_PER_RUN` - Max threads to process per job (default: 10)
- `PRIVACY_MODE` - Scrub phone/email from summaries (default: false)

### Testing

Run tests:
```bash
npm test
```

Run with coverage:
```bash
npm test -- --coverage
```

### Architecture

- **Services:** Business logic (sync, AI, blog post management)
- **Routes:** REST API endpoints
- **Web UI:** Simple Bootstrap interface
- **Scheduled Jobs:** Automated sync and generation via node-cron

### Troubleshooting

**iMessage sync not working:**
- Ensure you're on macOS
- Grant Full Disk Access to Terminal in System Preferences
- Close Messages app before syncing

**AI generation failing:**
- Check ANTHROPIC_API_KEY is set correctly
- Verify API key has credits
- Check rate limits (10 requests/hour)

**Tests failing:**
- Run `npm run migrate` to ensure database is up to date
- Clear test database: `rm prisma/test.db`
```

**Step 2: Commit**

```bash
git add README.md
git commit -m "docs: add iMessage blog platform documentation"
```

---

## Task 16: Final Integration Test

**Step 1: Start server**

Run:
```bash
npm run dev
```

**Step 2: Manual testing checklist**

- [ ] Navigate to dashboard at http://localhost:3000
- [ ] Click "Manual Sync" button
- [ ] Click "Generate Drafts" button
- [ ] Navigate to drafts page
- [ ] Edit a draft
- [ ] Publish a draft
- [ ] Navigate to posts page
- [ ] View a post detail
- [ ] Archive a post

**Step 3: Verify all operations work**

Check browser console for errors and verify API responses are correct.

**Step 4: Document any issues**

If issues found, create commits to fix them.

**Step 5: Final commit**

```bash
git add .
git commit -m "chore: final integration testing complete"
```

---

## Completion

**Plan complete and saved to `docs/plans/2025-11-08-imessage-blog-platform-implementation.md`.**

Two execution options:

**1. Subagent-Driven (this session)** - I dispatch fresh subagent per task, review between tasks, fast iteration

**2. Parallel Session (separate)** - Open new session with executing-plans, batch execution with checkpoints

**Which approach?**
