import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';

import authRoutes from './routes/auth.js';
import rfpRoutes from './routes/rfp.js';
import collaborationRoutes from './routes/collaboration.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 4000;

// Middleware
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true,
}));
app.use(express.json());

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/rfps', rfpRoutes);
app.use('/api/collaboration', collaborationRoutes);

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Not found' });
});

// Error handler
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

// Start server
app.listen(PORT, () => {
  console.log(`
🚀 Server running on http://localhost:${PORT}

📡 API Endpoints:
   POST /api/auth/register
   POST /api/auth/login
   GET  /api/auth/me

   GET  /api/rfps
   POST /api/rfps
   GET  /api/rfps/:rfpId
   DELETE /api/rfps/:rfpId

   POST /api/collaboration/token
   GET  /api/collaboration/status

📝 Test credentials:
   Email: john@example.com
   Password: password123
  `);
});
