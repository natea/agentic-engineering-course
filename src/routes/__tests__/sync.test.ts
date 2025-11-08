import request from 'supertest';
import express from 'express';
import { syncRouter } from '../sync';
import { iMessageSyncService } from '../../services/iMessageSyncService';
import { scheduledTaskService } from '../../services/scheduledTaskService';
import { PrismaClient } from '@prisma/client';

jest.mock('../../services/iMessageSyncService');
jest.mock('../../services/scheduledTaskService');

const app = express();
app.use(express.json());
app.use('/api/sync', syncRouter);

const prisma = new PrismaClient();

describe('Sync API Routes', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  describe('POST /api/sync/trigger', () => {
    it('should trigger manual sync', async () => {
      const mockResult = {
        messagesAdded: 5,
        errors: [],
        lastSyncTime: new Date(),
      };

      (iMessageSyncService.syncNewMessages as jest.Mock).mockResolvedValue(mockResult);

      const response = await request(app).post('/api/sync/trigger');

      expect(response.status).toBe(200);
      expect(response.body.result).toBeDefined();
      expect(response.body.result.messagesAdded).toBe(5);
    });
  });

  describe('POST /api/sync/generate', () => {
    it('should trigger manual generation', async () => {
      const mockResult = {
        threadsProcessed: 2,
        draftsCreated: 2,
        errors: [],
        timestamp: new Date(),
      };

      (scheduledTaskService.runGenerationJob as jest.Mock).mockResolvedValue(mockResult);

      const response = await request(app).post('/api/sync/generate');

      expect(response.status).toBe(200);
      expect(response.body.result).toBeDefined();
      expect(response.body.result.draftsCreated).toBe(2);
    });
  });

  describe('GET /api/sync/status', () => {
    it('should return sync status', async () => {
      (iMessageSyncService.getLastSyncTime as jest.Mock).mockResolvedValue(new Date());

      const response = await request(app).get('/api/sync/status');

      expect(response.status).toBe(200);
      expect(response.body.lastSyncTime).toBeDefined();
      expect(response.body.messageCount).toBeGreaterThanOrEqual(0);
      expect(response.body.draftCount).toBeGreaterThanOrEqual(0);
      expect(response.body.schedule).toBeDefined();
    });
  });
});
