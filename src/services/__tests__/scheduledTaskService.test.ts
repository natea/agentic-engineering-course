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
