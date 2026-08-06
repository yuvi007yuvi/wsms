import { Request, Response } from 'express';
import prisma from '../utils/prisma';

let PgClient: any = null;
try {
  PgClient = require('@prisma/client-postgres').PrismaClient;
} catch (e) {}
const pg = PgClient ? new PgClient() : null;

export const superadminController = {
  getAllProjects: async (req: Request, res: Response) => {
    try {
      if (!pg) return res.status(500).json({ error: 'Cloud database not configured' });
      
      const projects = await pg.project.findMany({
        include: {
          _count: {
            select: { users: true, vehicles: true, weighmentSlips: true }
          }
        },
        orderBy: { createdAt: 'desc' }
      });
      res.json(projects);
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Failed to fetch projects' });
    }
  },

  createProject: async (req: Request, res: Response) => {
    try {
      if (!pg) return res.status(500).json({ error: 'Cloud database not configured' });
      
      const { name, subscriptionExpiry, isActive } = req.body;
      const project = await pg.project.create({
        data: {
          name,
          subscriptionExpiry: subscriptionExpiry ? new Date(subscriptionExpiry) : null,
          isActive: isActive !== undefined ? isActive : true
        }
      });
      res.status(201).json(project);
    } catch (error) {
      console.error(error);
      res.status(400).json({ error: 'Failed to create project' });
    }
  },

  updateProject: async (req: Request, res: Response) => {
    try {
      if (!pg) return res.status(500).json({ error: 'Cloud database not configured' });
      
      const { name, subscriptionExpiry, isActive } = req.body;
      const project = await pg.project.update({
        where: { id: req.params.id },
        data: {
          name,
          subscriptionExpiry: subscriptionExpiry ? new Date(subscriptionExpiry) : null,
          isActive
        }
      });
      res.json(project);
    } catch (error) {
      console.error(error);
      res.status(400).json({ error: 'Failed to update project' });
    }
  },

  createProjectAdmin: async (req: Request, res: Response) => {
    try {
      if (!pg) return res.status(500).json({ error: 'Cloud database not configured' });
      const { projectId } = req.params;
      const { username, password, fullName, designation } = req.body;

      const existing = await pg.user.findUnique({ where: { username } });
      if (existing) {
        return res.status(400).json({ error: 'Username already exists globally' });
      }

      const bcrypt = require('bcrypt');
      const hashedPassword = await bcrypt.hash(password, 10);

      const user = await pg.user.create({
        data: {
          username,
          password: hashedPassword,
          fullName,
          designation,
          role: 'admin',
          projectId
        }
      });
      
      res.status(201).json({ id: user.id, username: user.username, role: user.role });
    } catch (error) {
      console.error(error);
      res.status(400).json({ error: 'Failed to create project admin' });
    }
  },

  getUsers: async (req: Request, res: Response) => {
    try {
      if (!pg) return res.status(500).json({ error: 'Cloud database not configured' });
      const users = await pg.user.findMany({
        where: { role: { not: 'superadmin' } },
        select: { id: true, username: true, fullName: true, role: true, projectId: true },
        orderBy: { username: 'asc' }
      });
      res.json(users);
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Failed to fetch users' });
    }
  },

  assignUser: async (req: Request, res: Response) => {
    try {
      if (!pg) return res.status(500).json({ error: 'Cloud database not configured' });
      const { projectId } = req.params;
      const { userId } = req.body;
      
      const user = await pg.user.update({
        where: { id: userId },
        data: { projectId }
      });
      res.json({ success: true, user });
    } catch (error) {
      console.error(error);
      res.status(400).json({ error: 'Failed to assign user' });
    }
  }
};
