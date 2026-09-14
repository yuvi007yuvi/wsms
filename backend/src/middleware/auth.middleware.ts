import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import prisma from '../utils/prisma';


const JWT_SECRET = process.env.JWT_SECRET || 'fallback-secret';

export interface AuthRequest extends Request {
  user?: {
    id: string;
    username: string;
    role: string;
    projectId?: string;
    isServiceAccount?: boolean;
  };
  dbUser?: any; // Cached DB user to avoid re-fetching in subscription check
}

export const authenticateToken = (req: AuthRequest, res: Response, next: NextFunction): void => {
  // 1. Check for API Key first (Machine-to-Machine integration for Green Assist)
  const apiKey = req.headers['x-api-key'];
  const configuredApiKey = process.env.GREEN_ASSIST_API_KEY || 'ga_live_wsms_sec_99a8b7c6d5e4';

  if (apiKey) {
    if (apiKey === configuredApiKey) {
      req.user = {
        id: 'service-green-assist',
        username: 'green_assist_service',
        role: 'operator',
        isServiceAccount: true
      };
      return next();
    } else {
      res.status(403).json({ error: 'Invalid API Key' });
      return;
    }
  }

  // 2. Otherwise check for Bearer JWT token
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    res.status(401).json({ error: 'Access token or x-api-key required' });
    return;
  }

  try {
    const user = jwt.verify(token, JWT_SECRET) as AuthRequest['user'];
    if (!user) {
      res.status(403).json({ error: 'Invalid or expired token' });
      return;
    }
    req.user = user;
    next();
  } catch (err) {
    res.status(403).json({ error: 'Invalid or expired token' });
  }
};
