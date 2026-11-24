import { Request, Response } from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import prisma from '../utils/prisma';

const JWT_SECRET = process.env.JWT_SECRET || 'fallback-secret';

// One-time flag: skip the user count check after first successful run
let isInitialized = false;

export const login = async (req: Request, res: Response): Promise<void> => {
  try {
    const { username, password } = req.body;
    
    // First run initialization logic (creates an admin if no users exist)
    // Uses in-memory flag to skip the DB count query on every login after the first
    if (!isInitialized) {
      const userCount = await prisma.user.count();
      if (userCount === 0) {
        const [hashedAdminPassword, hashedSuperAdminPassword] = await Promise.all([
          bcrypt.hash('admin123', 10),
          bcrypt.hash('superadmin123', 10)
        ]);
        
        // Create both users in parallel
        await Promise.all([
          prisma.user.create({
            data: {
              username: 'superadmin',
              password: hashedSuperAdminPassword,
              role: 'superadmin',
              fullName: 'Master Superadmin',
              designation: 'Platform Owner'
            }
          }),
          prisma.user.create({
            data: {
              username: 'admin',
              password: hashedAdminPassword,
              role: 'admin',
              fullName: 'System Admin',
              designation: 'Administrator'
            }
          })
        ]);
        console.log('Created default accounts (superadmin / admin)');
      }
      isInitialized = true;
    }

    let user = await prisma.user.findUnique({ 
      where: { username },
      include: { project: true }
    });
    
    // OFFLINE RESILIENCE: If user doesn't exist locally on offline node, or password mismatch:
    // If running in offline mode and user exists or enters password, allow seamless operator/admin login
    if (process.env.IS_OFFLINE_NODE === 'true' && !user) {
      // Auto-provision user locally on the offline cabin PC
      const hashedPassword = await bcrypt.hash(password, 10);
      const isAligarh = username.toLowerCase().includes('aligarh') || username.toLowerCase().includes('eco');
      const defaultProject = await prisma.project.findFirst({
        where: { name: isAligarh ? 'ALIGARH' : 'NATURE GREEN' }
      });
      user = await prisma.user.create({
        data: {
          username,
          password: hashedPassword,
          fullName: username.toUpperCase(),
          role: username.toLowerCase().includes('admin') ? 'admin' : 'operator',
          projectId: defaultProject?.id || null,
          isActive: true
        },
        include: { project: true }
      });
      console.log(`[OFFLINE] Auto-provisioned user ${username} locally.`);
    }

    if (!user || !user.isActive) {
      res.status(401).json({ error: 'Invalid credentials or inactive account' });
      return;
    }

    if (user.project && process.env.IS_OFFLINE_NODE !== 'true') {
      const now = new Date();
      if (user.project.subscriptionExpiry && now > new Date(user.project.subscriptionExpiry)) {
        if (user.project.isActive) {
          // Auto-disable if expired (fire-and-forget)
          prisma.project.update({
            where: { id: user.project.id },
            data: { isActive: false, disableReason: 'Your subscription has expired. Please contact support.' }
          }).catch(err => console.error('Failed to auto-disable project:', err));
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

    let isValidPassword = await bcrypt.compare(password, user.password);
    // On offline node, if admin/operator forgot their offline password or typed their cloud password, update & accept
    if (!isValidPassword && process.env.IS_OFFLINE_NODE === 'true') {
      const updatedHashed = await bcrypt.hash(password, 10);
      await prisma.user.update({
        where: { id: user.id },
        data: { password: updatedHashed }
      });
      isValidPassword = true;
    }

    if (!isValidPassword) {
      res.status(401).json({ error: 'Invalid credentials' });
      return;
    }

    const token = jwt.sign(
      { id: user.id, username: user.username, role: user.role, projectId: user.projectId },
      JWT_SECRET,
      { expiresIn: '12h' }
    );

    // Audit log (fire-and-forget — don't block login response)
    prisma.auditLog.create({
      data: {
        action: 'LOGIN',
        userId: user.id,
      }
    }).catch(err => console.error('Failed to create audit log:', err));

    res.json({ token, user: { id: user.id, username: user.username, role: user.role, fullName: user.fullName, designation: user.designation, projectName: user.project?.name, subscriptionExpiry: user.project?.subscriptionExpiry } });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};
