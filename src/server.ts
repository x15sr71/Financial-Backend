// src/index.ts
import express from 'express';
import cors from 'cors';
import { PrismaClient } from '@prisma/client';
import authRoutes from '../src/routes/auth';
import financialDataRoutes from '../src/routes/financialdata';
import historicalDataRoutes from '../src/routes/historicalData';
import financialDecisionRoutes from '../src/routes/financialDecisions';
import scenarioRoutes from '../src/routes/scenarios';
import authenticateUser from '../src/routes/auth';

export const prisma = new PrismaClient();
const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/financial-data', authenticateUser, financialDataRoutes);
app.use('/api/historical-data', authenticateUser, historicalDataRoutes);
app.use('/api/financial-decisions', authenticateUser, financialDecisionRoutes);
app.use('/api/scenarios', authenticateUser, scenarioRoutes);

// Global error handler
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error(err.stack);
  res.status(500).json({
    message: 'Internal server error',
    error: process.env.NODE_ENV === 'development' ? err.message : undefined
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

// Handle graceful shutdown
process.on('SIGTERM', async () => {
  console.log('SIGTERM received, shutting down gracefully');
  await prisma.$disconnect();
  process.exit(0);
});