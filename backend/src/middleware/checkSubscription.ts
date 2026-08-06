import { Response, NextFunction } from 'express';
import { AuthRequest } from './auth.middleware';
import prisma from '../utils/prisma';

export const checkSubscription = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  if (!req.user) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }

  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      include: { project: true }
    });

    if (!user || !user.isActive) {
      res.status(401).json({ error: 'User no longer exists or is inactive' });
      return;
    }

    if (user.project) {
      const now = new Date();
      let projectActive = user.project.isActive;

      console.log('checkSubscription for user:', user.username, 'project:', user.project.name, 'isActive:', projectActive);

      // Check expiry
      if (user.project.subscriptionExpiry && now > new Date(user.project.subscriptionExpiry)) {
        console.log('Project expired naturally.');
        if (projectActive) {
          // Auto-disable if expired
          await prisma.project.update({
            where: { id: user.project.id },
            data: { isActive: false, disableReason: 'Your subscription has expired. Please contact support.' }
          });
        }
        res.status(403).json({ success: false, message: 'Subscription Expired' });
        return;
      }

      if (!projectActive) {
        console.log('Project is disabled, returning 403');
        const reason = user.project.disableReason || 'Subscription Expired';
        res.status(403).json({ success: false, message: reason });
        return;
      }
    }

    next();
  } catch (error) {
    console.error('Subscription check error:', error);
    res.status(500).json({ error: 'Internal server error during subscription check' });
  }
};
