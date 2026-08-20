import { Response, NextFunction } from 'express';
import { AuthRequest } from './auth.middleware';
import prisma from '../utils/prisma';

// In-memory cache for user+project data to avoid hitting DB on every single request
const userCache = new Map<string, { data: any; expiry: number }>();
const CACHE_TTL_MS = 30_000; // 30 seconds

export const checkSubscription = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  if (!req.user) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }

  try {
    const userId = req.user.id;
    const now = Date.now();

    // Check cache first
    const cached = userCache.get(userId);
    let user: any;

    if (cached && cached.expiry > now) {
      user = cached.data;
    } else {
      user = await prisma.user.findUnique({
        where: { id: userId },
        select: {
          id: true,
          isActive: true,
          project: {
            select: {
              id: true,
              name: true,
              isActive: true,
              subscriptionExpiry: true,
              disableReason: true
            }
          }
        }
      });
      // Cache the result
      if (user) {
        userCache.set(userId, { data: user, expiry: now + CACHE_TTL_MS });
      }
    }

    if (!user || !user.isActive) {
      userCache.delete(userId);
      res.status(401).json({ error: 'User no longer exists or is inactive' });
      return;
    }

    if (user.project) {
      const currentDate = new Date();

      // Check expiry
      if (user.project.subscriptionExpiry && currentDate > new Date(user.project.subscriptionExpiry)) {
        if (user.project.isActive) {
          // Auto-disable if expired (fire-and-forget, don't await)
          prisma.project.update({
            where: { id: user.project.id },
            data: { isActive: false, disableReason: 'Your subscription has expired. Please contact support.' }
          }).catch(err => console.error('Failed to auto-disable project:', err));
          userCache.delete(userId);
        }
        res.status(403).json({ success: false, message: 'Subscription Expired' });
        return;
      }

      if (!user.project.isActive) {
        const reason = user.project.disableReason || 'Subscription Expired';
        res.status(403).json({ success: false, message: reason });
        return;
      }
    }

    // Store DB user on request so controllers can reuse it
    req.dbUser = user;
    next();
  } catch (error) {
    console.error('Subscription check error:', error);
    res.status(500).json({ error: 'Internal server error during subscription check' });
  }
};

// Export for clearing cache when user/project is updated
export const clearUserCache = (userId?: string) => {
  if (userId) {
    userCache.delete(userId);
  } else {
    userCache.clear();
  }
};
