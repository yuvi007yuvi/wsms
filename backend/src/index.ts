import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import http from 'http';
import { Server } from 'socket.io';
import cron from 'node-cron';
import prisma from './utils/prisma';
import { setupWeighbridge } from './services/weighbridge.service';

dotenv.config();

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: '*',
  },
});

app.use(cors({
  origin: '*'
}));
app.use(express.json());

import authRoutes from './routes/auth.routes';
import masterRoutes from './routes/master.routes';
import weighmentRoutes from './routes/weighment.routes';
import userRoutes from './routes/user.routes';
import settingRoutes from './routes/setting.routes';
import systemRoutes from './routes/system.routes';
import superadminRoutes from './routes/superadmin.routes';
import dashboardRoutes from './routes/dashboard.routes';
import externalRoutes from './routes/external.routes';

// Routes will be added here
app.use('/api/auth', authRoutes);
app.use('/api/master', masterRoutes);
app.use('/api/weighment', weighmentRoutes);
app.use('/api/users', userRoutes);
app.use('/api/settings', settingRoutes);
app.use('/api/system', systemRoutes);
app.use('/api/superadmin', superadminRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/external', externalRoutes);

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date() });
});

// Root route for ping services like cron-job.org
app.get('/', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date(), message: 'WSMS API is running' });
});

// Socket.io for Real-time Weight Updates
io.on('connection', (socket) => {
  console.log('Client connected to weight stream');
  socket.on('disconnect', () => {
    console.log('Client disconnected');
  });
});

// Hardware weighbridge integration (via shared service)
setupWeighbridge(io);

// Run initial data migrations/backfills on startup
(async () => {
  try {
    // Find Nature Green project to associate legacy records with
    const natureGreenProject = await prisma.project.findFirst({
      where: {
        OR: [
          { name: { contains: 'Nature', mode: 'insensitive' } },
          { name: { contains: 'Green', mode: 'insensitive' } }
        ]
      }
    });

    if (natureGreenProject) {
      // 1. Backfill legacy Sources (Wards) without a projectId to Nature Green
      const updatedSources = await prisma.source.updateMany({
        where: { projectId: null },
        data: { projectId: natureGreenProject.id }
      });
      if (updatedSources.count > 0) {
        console.log(`Backfilled ${updatedSources.count} legacy sources (wards) to Nature Green (${natureGreenProject.name})`);
      }

      // 2. Backfill legacy Destinations (Works) without a projectId to Nature Green
      const updatedDestinations = await prisma.destination.updateMany({
        where: { projectId: null },
        data: { projectId: natureGreenProject.id }
      });
      if (updatedDestinations.count > 0) {
        console.log(`Backfilled ${updatedDestinations.count} legacy destinations (works) to Nature Green (${natureGreenProject.name})`);
      }
    }
  } catch (migErr) {
    console.error('Error during startup project separation backfill:', migErr);
  }
})();

const PORT = process.env.PORT || 5000;

server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

// Scheduled cron job to check subscription expirations every hour
cron.schedule('0 * * * *', async () => {
  console.log('Running subscription expiry check cron job...');
  try {
    const now = new Date();
    // Single updateMany instead of find + loop
    const result = await prisma.project.updateMany({
      where: {
        isActive: true,
        subscriptionExpiry: {
          lte: now
        }
      },
      data: { isActive: false, disableReason: 'Your subscription has expired. Please contact support.' }
    });

    if (result.count > 0) {
      console.log(`Disabled ${result.count} expired projects.`);
    }
  } catch (error) {
    console.error('Error in subscription expiry cron job:', error);
  }
});

export default app;
