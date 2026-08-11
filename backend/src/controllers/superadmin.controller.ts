import { Request, Response } from 'express';
import prisma from '../utils/prisma';



export const superadminController = {
  getStats: async (req: Request, res: Response) => {
    try {
      
      const projectsCount = await prisma.project.count();
      const vehiclesCount = await prisma.vehicle.count();
      const slipsCount = await prisma.weighmentSlip.count();
      res.json({ projects: projectsCount, vehicles: vehiclesCount, slips: slipsCount });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Failed to fetch stats' });
    }
  },

  getAllProjects: async (req: Request, res: Response) => {
    try {
      
      
      const projects = await prisma.project.findMany({
        include: {
          _count: {
            select: { vehicles: true, weighmentSlips: true }
          },
          users: {
            select: { id: true, username: true, fullName: true }
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
      
      
      const { name, subscriptionExpiry, isActive, address } = req.body;
      const project = await prisma.project.create({
        data: {
          name,
          address,
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
      
      
      const { name, subscriptionExpiry, isActive, disableReason, address } = req.body;
      const project = await prisma.project.update({
        where: { id: req.params.id as string },
        data: {
          name,
          address: address as string | undefined,
          subscriptionExpiry: subscriptionExpiry ? new Date(subscriptionExpiry as string) : null,
          isActive,
          disableReason: isActive === false ? (disableReason as string) : null
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
      const { projectId } = req.params;
      const { username, password, fullName, designation } = req.body;

      const existing = await prisma.user.findUnique({ where: { username } });
      if (existing) {
        return res.status(400).json({ error: 'Username already exists globally' });
      }

      const bcrypt = require('bcrypt');
      const hashedPassword = await bcrypt.hash(password, 10);

      const user = await prisma.user.create({
        data: {
          username,
          password: hashedPassword,
          fullName,
          designation: designation as string | undefined,
          role: 'admin',
          projectId: projectId as string
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
      
      const users = await prisma.user.findMany({
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
      const { projectId } = req.params;
      const { userId } = req.body;
      
      const user = await prisma.user.update({
        where: { id: userId as string },
        data: { projectId: projectId as string }
      });
      res.json({ success: true, user });
    } catch (error) {
      console.error(error);
      res.status(400).json({ error: 'Failed to assign user' });
    }
  },

  getInvoices: async (req: Request, res: Response) => {
    try {
      
      const invoices = await prisma.invoice.findMany({
        include: { items: true, project: { select: { name: true } } },
        orderBy: { createdAt: 'desc' }
      });
      res.json(invoices);
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Failed to fetch invoices' });
    }
  },

  createInvoice: async (req: Request, res: Response) => {
    try {
      
      const { invoiceNumber, date, projectId, clientName, clientAddress, clientPhone, subtotal, taxRate, total, items } = req.body;

      const invoice = await prisma.invoice.create({
        data: {
          invoiceNumber,
          date: new Date(date),
          projectId: projectId || null,
          clientName,
          clientAddress,
          clientPhone,
          subtotal,
          taxRate,
          total,
          items: {
            create: items.map((item: any) => ({
              description: item.description,
              quantity: item.quantity,
              price: item.price
            }))
          }
        },
        include: { items: true }
      });
      res.status(201).json(invoice);
    } catch (error) {
      console.error(error);
      res.status(400).json({ error: 'Failed to create invoice' });
    }
  },

  deleteInvoice: async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      
      // Need to delete items first since cascade delete might not be set up
      await prisma.invoiceItem.deleteMany({
        where: { invoiceId: id as string }
      });
      
      await prisma.invoice.delete({
        where: { id: id as string }
      });
      
      res.json({ success: true });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Failed to delete invoice' });
    }
  }
};
