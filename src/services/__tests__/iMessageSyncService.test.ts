import { iMessageSyncService } from '../iMessageSyncService';
import { PrismaClient } from '@prisma/client';

jest.mock('@photon-ai/imessage-kit');

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
