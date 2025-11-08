import express from 'express';
import dotenv from 'dotenv';
import authRoutes from './routes/auth';
import { blogRouter } from './routes/blog';
import { syncRouter } from './routes/sync';

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(express.json());

// Routes
app.use('/auth', authRoutes);
app.use('/api/blog', blogRouter);
app.use('/api/sync', syncRouter);

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

// Start server
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});

export default app;
