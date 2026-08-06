import { Request, Response } from 'express';
import bcrypt from 'bcrypt';
import prisma from '../utils/prisma';

let PgClient: any = null;
try {
  PgClient = require('@prisma/client-postgres').PrismaClient;
} catch (e) {}
const pg = PgClient ? new PgClient() : null;

export const getUsers = async (req: Request, res: Response) => {
  try {
    const users = await prisma.user.findMany({
      where: {
        role: { not: 'superadmin' }
      },
      select: {
        id: true,
        username: true,
        fullName: true,
        designation: true,
        role: true,
        isActive: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'desc' }
    });
    res.json(users);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch users' });
  }
};

export const createUser = async (req: Request, res: Response) => {
  try {
    const { username, password, role, fullName, designation } = req.body;
    
    if (role === 'superadmin') {
      res.status(403).json({ error: 'Cannot create superadmin from this endpoint' });
      return;
    }
    
    const existing = await prisma.user.findUnique({ where: { username } });
    if (existing) {
      res.status(400).json({ error: 'Username already exists' });
      return;
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const user = await prisma.user.create({
      data: {
        username,
        password: hashedPassword,
        fullName,
        designation,
        role: role || 'operator'
      }
    });
    
    // Also update in cloud DB if configured
    if (pg) {
      await pg.user.create({
        data: {
          id: user.id,
          username,
          password: hashedPassword,
          fullName,
          designation,
          role: role || 'operator'
        }
      }).catch(console.error);
    }
    
    // Remove password before returning
    const { password: _, ...userWithoutPassword } = user;
    res.status(201).json(userWithoutPassword);
  } catch (error) {
    console.error(error);
    res.status(400).json({ error: 'Failed to create user' });
  }
};

export const updateUser = async (req: Request, res: Response) => {
  try {
    const id = req.params.id as string;
    const { username, password, role, fullName, designation, projectId } = req.body;
    const authUser = (req as any).user;

    const existing = await prisma.user.findUnique({ where: { id } });
    if (!existing) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    if (existing.role === 'superadmin' && authUser?.role !== 'superadmin') {
      res.status(403).json({ error: 'Cannot modify superadmin account' });
      return;
    }

    let hashedPassword = existing.password;
    if (password && password.trim() !== '') {
      hashedPassword = await bcrypt.hash(password, 10);
    }

    const dataToUpdate: any = {
      username,
      password: hashedPassword,
      fullName,
      designation,
      role
    };

    if (authUser?.role === 'superadmin' && projectId !== undefined) {
      dataToUpdate.projectId = projectId || null;
      
      // If assigning a project, ensure it exists in the local SQLite DB to satisfy foreign key constraints
      if (projectId && pg) {
        const pgProject = await pg.project.findUnique({ where: { id: projectId } });
        if (pgProject) {
          await prisma.project.upsert({
            where: { id: projectId },
            create: pgProject,
            update: pgProject
          });
        }
      }
    }

    const user = await prisma.user.update({
      where: { id },
      data: dataToUpdate
    });
    
    // Also update in cloud DB if configured
    if (pg) {
      await pg.user.update({
        where: { id },
        data: dataToUpdate,
      }).catch(console.error);
    }

    const { password: _, ...userWithoutPassword } = user;
    res.json(userWithoutPassword);
  } catch (error) {
    console.error(error);
    res.status(400).json({ error: 'Failed to update user' });
  }
};

export const deleteUser = async (req: Request, res: Response) => {
  try {
    // Prevent deleting the main admin
    const id = req.params.id as string;
    const user = await prisma.user.findUnique({ where: { id } });
    if (user?.username === 'admin') {
      res.status(400).json({ error: 'Cannot delete the primary admin account' });
      return;
    }
    
    if (user?.role === 'superadmin') {
      res.status(403).json({ error: 'Cannot delete superadmin accounts' });
      return;
    }

    await prisma.user.delete({
      where: { id }
    });
    res.json({ success: true });
  } catch (error) {
    res.status(400).json({ error: 'Failed to delete user' });
  }
};
