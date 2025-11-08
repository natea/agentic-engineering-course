import express from 'express';
import dotenv from 'dotenv';
import path from 'path';
import authRoutes from './routes/auth';
import { blogRouter } from './routes/blog';
import { syncRouter } from './routes/sync';
import { scheduledTaskService } from './services/scheduledTaskService';

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(express.json());

// Serve static files
const publicPath = path.join(process.cwd(), 'public');
console.log('Serving static files from:', publicPath);
app.use(express.static(publicPath));

// Routes
app.use('/auth', authRoutes);
app.use('/api/blog', blogRouter);
app.use('/api/sync', syncRouter);

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

// Test route
app.get('/test', (req, res) => {
  console.log('Test route hit');
  res.send('Test works!');
});

// Serve index.html for root path
app.get('/', (req, res) => {
  console.log('Root path requested');
  const indexPath = path.join(publicPath, 'index.html');
  console.log('Sending file:', indexPath);
  res.sendFile(indexPath, (err) => {
    if (err) {
      console.error('Error sending file:', err);
      res.status(500).send('Error loading page');
    }
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);

  // Start scheduled job
  scheduledTaskService.startScheduledJob();
  console.log('Scheduled job initialized');
});

export default app;
