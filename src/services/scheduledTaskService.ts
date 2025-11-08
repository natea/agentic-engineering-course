import * as cron from 'node-cron';
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
