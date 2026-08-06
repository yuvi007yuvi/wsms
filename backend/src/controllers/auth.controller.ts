import { Request, Response } from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import prisma from '../utils/prisma';

const JWT_SECRET = process.env.JWT_SECRET || 'fallback-secret';

export const login = async (req: Request, res: Response): Promise<void> => {
  try {
    const { username, password } = req.body;
    
    // First run initialization logic (creates an admin if no users exist)
    const userCount = await prisma.user.count();
    if (userCount === 0) {
      const hashedPassword = await bcrypt.hash('admin123', 10);
      await prisma.user.create({
        data: {
          username: 'admin',
          password: hashedPassword,
          role: 'admin',
          fullName: 'System Admin',
          designation: 'Administrator'
        }
      });
      console.log('Created default admin user (admin / admin123)');
    }

    const user = await prisma.user.findUnique({ 
      where: { username },
      include: { project: true }
    });
    
    if (!user || !user.isActive) {
      res.status(401).json({ error: 'Invalid credentials or inactive account' });
      return;
    }

    if (user.project) {
      const now = new Date();
      if (user.project.subscriptionExpiry && now > new Date(user.project.subscriptionExpiry)) {
        if (user.project.isActive) {
          // Auto-disable if expired
          await prisma.project.update({
            where: { id: user.project.id },
            data: { isActive: false, disableReason: 'Your subscription has expired. Please contact support.' }
          });
        }
        res.status(403).json({ success: false, message: 'Subscription Expired' });
        return;
      }
      
      if (!user.project.isActive) {
        // Just general disabled (e.g. by superadmin, not naturally expired just now)
        const reason = user.project.disableReason || 'Subscription Expired';
        res.status(403).json({ success: false, message: reason });
        return;
      }
    }

    const isValidPassword = await bcrypt.compare(password, user.password);
    if (!isValidPassword) {
      res.status(401).json({ error: 'Invalid credentials' });
      return;
    }

    const token = jwt.sign(
      { id: user.id, username: user.username, role: user.role, projectId: user.projectId },
      JWT_SECRET,
      { expiresIn: '12h' }
    );

    // Audit log
    await prisma.auditLog.create({
      data: {
        action: 'LOGIN',
        userId: user.id,
      }
    });

    res.json({ token, user: { id: user.id, username: user.username, role: user.role, fullName: user.fullName, designation: user.designation, projectName: user.project?.name, subscriptionExpiry: user.project?.subscriptionExpiry } });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};
