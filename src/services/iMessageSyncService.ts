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
