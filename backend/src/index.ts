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

// Routes will be added here
app.use('/api/auth', authRoutes);
app.use('/api/master', masterRoutes);
app.use('/api/weighment', weighmentRoutes);
app.use('/api/users', userRoutes);
app.use('/api/settings', settingRoutes);
app.use('/api/system', systemRoutes);
app.use('/api/superadmin', superadminRoutes);

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date() });
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

const PORT = process.env.PORT || 5000;

server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

// Scheduled cron job to check subscription expirations every hour
cron.schedule('0 * * * *', async () => {
  console.log('Running subscription expiry check cron job...');
  try {
    const now = new Date();
    // Use raw query or updateMany if supported, but here we just find and update
    const expiredProjects = await prisma.project.findMany({
      where: {
        isActive: true,
        subscriptionExpiry: {
          lte: now
        }
      }
    });

    if (expiredProjects.length > 0) {
      console.log(`Found ${expiredProjects.length} expired projects. Disabling them...`);
      for (const project of expiredProjects) {
        // Disable locally and in cloud (since it's online now)
        await prisma.project.update({
          where: { id: project.id },
          data: { isActive: false, disableReason: 'Your subscription has expired. Please contact support.' }
        });
        
        console.log(`Disabled project: ${project.name}`);
      }
    }
  } catch (error) {
    console.error('Error in subscription expiry cron job:', error);
  }
});

export default app;
