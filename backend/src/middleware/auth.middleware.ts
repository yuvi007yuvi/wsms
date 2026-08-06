import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import prisma from '../utils/prisma';


const JWT_SECRET = process.env.JWT_SECRET || 'fallback-secret';

export interface AuthRequest extends Request {
  user?: {
    id: string;
    username: string;
    role: string;
  };
}

export const authenticateToken = (req: AuthRequest, res: Response, next: NextFunction): void => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    res.status(401).json({ error: 'Access token required' });
    return;
  }

  jwt.verify(token, JWT_SECRET, async (err, user) => {
    if (err || !user) {
      res.status(403).json({ error: 'Invalid or expired token' });
      return;
    }
    
    const decodedUser = user as AuthRequest['user'];
    
    if (decodedUser) {
      // Verify user actually exists in the database and is active
      const dbUser = await prisma.user.findUnique({ 
        where: { id: decodedUser.id },
        include: { project: true }
      });
      
      if (!dbUser || !dbUser.isActive) {
        res.status(401).json({ error: 'User no longer exists or is inactive' });
        return;
      }
      
      // Enforce project expiry and status
      if (dbUser.project) {
        if (!dbUser.project.isActive) {
          const reason = (dbUser.project as any).disableReason || 'Your subscription is disabled by the administrator.';
          res.status(401).json({ error: reason });
          return;
        }
        if (dbUser.project.subscriptionExpiry && new Date() > new Date(dbUser.project.subscriptionExpiry)) {
          res.status(401).json({ error: 'Your subscription has expired. Please contact support.' });
          return;
        }
      }
    }
    
    req.user = decodedUser;
    next();
  });
};
