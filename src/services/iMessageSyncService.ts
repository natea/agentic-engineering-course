import { PrismaClient } from '@prisma/client';
import { SyncResult, MessageThread } from '../types/imessage';
import { IMessageSDK } from '@photon-ai/imessage-kit';
import path from 'path';
import Database from 'better-sqlite3';
import { extractTextFromAttributedBody } from '../utils/attributedBodyParser';

const prisma = new PrismaClient();

// Use local chat.db copy if it exists, otherwise use default location
const databasePath = process.env.IMESSAGE_DB_PATH || path.join(process.cwd(), 'chat.db');
console.log('[iMessageSyncService] Using iMessage database at:', databasePath);

const iMessageSDK = new IMessageSDK({
  debug: false,
  databasePath
});

class IMessageSyncService {
  private imessageDb: Database.Database | null = null;

  private getIMessageDatabase(): Database.Database {
    if (!this.imessageDb) {
      this.imessageDb = new Database(databasePath, { readonly: true });
    }
    return this.imessageDb;
  }

  /**
   * Enriches message text by extracting from attributedBody if text field is empty
   */
  private enrichMessageText(msg: any): string {
    // If we already have text, return it
    if (msg.text && msg.text.trim().length > 0) {
      return msg.text;
    }

    // Try to get the full message with attributedBody from the database
    try {
      const db = this.getIMessageDatabase();
      const row = db.prepare(`
        SELECT text, attributedBody
        FROM message
        WHERE ROWID = ?
      `).get(msg.id) as { text: string | null, attributedBody: Buffer | null } | undefined;

      if (!row) {
        return msg.text || '';
      }

      // First try the text field
      if (row.text && row.text.trim().length > 0) {
        return row.text;
      }

      // If text is empty, try to extract from attributedBody
      if (row.attributedBody) {
        const extracted = extractTextFromAttributedBody(row.attributedBody);
        if (extracted && extracted.trim().length > 0) {
          return extracted;
        }
      }

      return msg.text || '';
    } catch (error) {
      console.error('[iMessageSyncService] Error enriching message text:', error);
      return msg.text || '';
    }
  }

  async syncNewMessages(): Promise<SyncResult> {
    console.log('[iMessageSyncService] Starting sync operation');
    const startTime = Date.now();
    const errors: string[] = [];
    let messagesAdded = 0;

    try {
      // Get last sync time to only fetch new messages
      const lastSyncTime = await this.getLastSyncTime();
      console.log('[iMessageSyncService] Last sync time:', lastSyncTime || 'Never synced before');

      // Fetch messages from iMessage database
      console.log('[iMessageSyncService] Fetching messages from iMessage database...');
      const result = await iMessageSDK.getMessages({
        since: lastSyncTime || undefined,
        excludeOwnMessages: false, // Include our own messages for full context
      });

      console.log(`[iMessageSyncService] Found ${result.messages.length} messages to sync (${result.total} total, ${result.unreadCount} unread)`);

      // Store messages in our database
      for (const msg of result.messages) {
        try {
          // Debug: Log message details
          if (!msg.text || msg.text.trim().length === 0) {
            console.log(`[iMessageSyncService] Empty message found:`, {
              id: msg.id,
              chatId: msg.chatId,
              hasText: !!msg.text,
              textLength: msg.text?.length || 0,
              messageType: typeof msg,
              keys: Object.keys(msg)
            });
          }

          // Check if message already exists
          const existing = await prisma.message.findUnique({
            where: { imessageId: msg.id },
          });

          if (!existing) {
            // Enrich the message text from attributedBody if needed
            const enrichedText = this.enrichMessageText(msg);

            await prisma.message.create({
              data: {
                imessageId: msg.id,
                chatId: msg.chatId,
                senderId: msg.sender,
                isFromMe: msg.isFromMe || false,
                text: enrichedText,
                sentAt: msg.date,
                syncedAt: new Date(),
                processedForPost: false,
              },
            });
            messagesAdded++;
          }
        } catch (error) {
          const errMsg = `Failed to store message ${msg.id}: ${error instanceof Error ? error.message : 'Unknown error'}`;
          console.error('[iMessageSyncService]', errMsg);
          errors.push(errMsg);
        }
      }

      const duration = Date.now() - startTime;
      console.log('[iMessageSyncService] Sync operation completed:', {
        messagesAdded,
        errors: errors.length > 0 ? errors : [],
        duration: `${duration}ms`
      });

      return {
        messagesAdded,
        errors,
        lastSyncTime: new Date(),
      };
    } catch (error) {
      const duration = Date.now() - startTime;
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';

      console.error('[iMessageSyncService] Sync operation failed:', {
        error: errorMessage,
        duration: `${duration}ms`
      });

      return {
        messagesAdded,
        errors: [errorMessage],
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

    // Return threads in reverse chronological order (newest first)
    return threads.reverse();
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
