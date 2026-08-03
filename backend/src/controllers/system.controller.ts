import { Request, Response } from 'express';
import prisma from '../utils/prisma';
import { SerialPort } from 'serialport';
import { exec } from 'child_process';
import util from 'util';

const execPromise = util.promisify(exec);


import { getSyncStatus } from '../services/sync.service';

export const getSyncStatusInfo = async (req: Request, res: Response): Promise<void> => {
  try {
    const status = await getSyncStatus();
    res.json(status);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch sync status' });
  }
};

export const forceSync = async (req: Request, res: Response): Promise<void> => {
  try {
    // Import dynamically to avoid circular dependencies if any
    const { processSyncQueue } = require('../services/sync.service');
    // Do not await, let it run in background so frontend can poll
    processSyncQueue().catch(console.error);
    res.json({ message: 'Sync triggered successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to trigger sync' });
  }
};

export const getSystemHealth = async (req: Request, res: Response): Promise<void> => {
  try {
    // 1. Check Database Connection
    let dbStatus = 'disconnected';
    try {
      await prisma.$queryRaw`SELECT 1`;
      dbStatus = 'connected';
    } catch (dbError) {
      dbStatus = 'error';
    }

    // 2. Check Hardware (Serial Ports)
    let hardwareStatus = 'disconnected';
    let availablePorts: any[] = [];
    try {
      const ports = await SerialPort.list();
      availablePorts = ports;
      if (ports.length > 0) {
        hardwareStatus = 'connected';
      }
    } catch (hwError) {
      hardwareStatus = 'error';
    }

    // 3. System Stats
    const memoryUsage = process.memoryUsage();
    const memoryMb = Math.round((memoryUsage.heapUsed / 1024 / 1024) * 100) / 100;
    const uptime = process.uptime();

    // 4. External Dependencies Check
    const checkCommand = async (cmd: string): Promise<string | null> => {
      try {
        const { stdout } = await execPromise(cmd);
        return stdout.trim();
      } catch (e) {
        return null;
      }
    };

    const [npmVersion, pm2Version, gitVersion] = await Promise.all([
      checkCommand('npm -v'),
      checkCommand('pm2 -v'),
      checkCommand('git --version')
    ]);

    res.json({
      status: dbStatus === 'connected' ? 'healthy' : 'degraded',
      timestamp: new Date().toISOString(),
      components: {
        database: {
          status: dbStatus,
          message: dbStatus === 'connected' ? 'Database is online and responsive' : 'Failed to connect to database',
        },
        hardware: {
          status: hardwareStatus,
          message: hardwareStatus === 'connected' ? `${availablePorts.length} COM port(s) detected` : 'No serial weighbridge connections found (Mock Mode Only)',
          ports: availablePorts.map(p => p.path)
        },
        system: {
          nodeVersion: process.version,
          npmVersion: npmVersion || 'Not Installed',
          pm2Version: pm2Version || 'Not Installed',
          gitVersion: gitVersion || 'Not Installed',
          memoryUsageMb: memoryMb,
          uptimeSeconds: Math.floor(uptime)
        }
      }
    });
  } catch (error) {
    console.error('Health check error:', error);
    res.status(500).json({ error: 'Internal Server Error during health check' });
  }
};
