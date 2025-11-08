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
