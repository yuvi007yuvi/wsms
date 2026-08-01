import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import http from 'http';
import { Server } from 'socket.io';

dotenv.config();

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: '*',
  },
});

app.use(cors({
  origin: process.env.FRONTEND_URL || '*',
}));
app.use(express.json());

import authRoutes from './routes/auth.routes';
import masterRoutes from './routes/master.routes';
import weighmentRoutes from './routes/weighment.routes';
import userRoutes from './routes/user.routes';
import settingRoutes from './routes/setting.routes';
import systemRoutes from './routes/system.routes';

// Routes will be added here
app.use('/api/auth', authRoutes);
app.use('/api/master', masterRoutes);
app.use('/api/weighment', weighmentRoutes);
app.use('/api/users', userRoutes);
app.use('/api/settings', settingRoutes);
app.use('/api/system', systemRoutes);

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

// Hardware weighbridge integration will be implemented here
// to read from the COM port and emit 'weight-update' events.

const PORT = process.env.PORT || 5000;

server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
