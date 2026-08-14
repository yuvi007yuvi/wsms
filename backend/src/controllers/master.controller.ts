import { Request, Response } from 'express';
import prisma from '../utils/prisma';

// Helper for generating CRUD handlers
const createCrudHandlers = (modelName: 'vehicleType' | 'vehicle' | 'material' | 'source' | 'destination') => {
  return {
    getAll: async (req: Request, res: Response) => {
      try {
        const page = parseInt(req.query.page as string) || 1;
        const limit = parseInt(req.query.limit as string) || 10;
        const skip = (page - 1) * limit;

        const [data, total] = await Promise.all([
          // @ts-ignore
          prisma[modelName].findMany({
            skip,
            take: limit,
            orderBy: { createdAt: 'desc' }
          }),
          // @ts-ignore
          prisma[modelName].count()
        ]);
        res.json({ data, total });
      } catch (error) {
        res.status(500).json({ error: `Failed to fetch ${modelName}s` });
      }
    },
    getById: async (req: Request, res: Response) => {
      try {
        // @ts-ignore
        const data = await prisma[modelName].findUnique({
          where: { id: req.params.id }
        });
        if (data) res.json(data);
        else res.status(404).json({ error: 'Not found' });
      } catch (error) {
        res.status(500).json({ error: 'Server error' });
      }
    },
    create: async (req: Request, res: Response) => {
      try {
        const payload = { ...req.body };
        if (modelName === 'vehicle') {
          // @ts-ignore
          payload.projectId = req.user?.projectId || null;
        }

        // @ts-ignore
        const data = await prisma[modelName].create({
          data: payload
        });
        res.status(201).json(data);
      } catch (error) {
        console.error(error);
        res.status(400).json({ error: `Failed to create ${modelName}` });
      }
    },
    update: async (req: Request, res: Response) => {
      try {
        const payload = { ...req.body };
        if (modelName === 'vehicle') {
          // @ts-ignore
          payload.projectId = req.user?.projectId || null;
        }

        // @ts-ignore
        const data = await prisma[modelName].update({
          where: { id: req.params.id },
          data: payload
        });
        res.json(data);
      } catch (error) {
        res.status(400).json({ error: `Failed to update ${modelName}` });
      }
    },
    delete: async (req: Request, res: Response) => {
      try {
        // @ts-ignore
        await prisma[modelName].delete({
          where: { id: req.params.id }
        });
        res.json({ success: true });
      } catch (error: any) {
        if (error.code === 'P2003') {
          return res.status(400).json({ error: `Cannot delete: This ${modelName} is already used in weighment slips.` });
        }
        res.status(400).json({ error: `Failed to delete ${modelName}` });
      }
    },
    createBulk: async (req: Request, res: Response) => {
      try {
        if (!req.body.items || !Array.isArray(req.body.items)) {
          return res.status(400).json({ error: 'Invalid data format. Expected { items: [] }' });
        }
        
        // @ts-ignore
        const result = await prisma[modelName].createMany({
          data: req.body.items,
          skipDuplicates: true,
        });

        res.status(201).json({ success: true, count: result.count });
      } catch (error) {
        console.error(`Bulk import error for ${modelName}:`, error);
        res.status(400).json({ error: `Failed to bulk import ${modelName}s` });
      }
    }
  };
};

export const vehicleController = {
  ...createCrudHandlers('vehicle'),
  getAll: async (req: Request, res: Response) => {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 10;
      const skip = (page - 1) * limit;

      const [data, total] = await Promise.all([
        prisma.vehicle.findMany({
          skip,
          take: limit,
          orderBy: { createdAt: 'desc' },
          select: {
            id: true,
            vehicleNumber: true,
            driverName: true,
            mobile: true,
            owner: true,
            tareWeight: true,
            isActive: true,
            createdAt: true,
            vehicleType: { select: { id: true, name: true, tareWeight: true } }
          }
        }),
        prisma.vehicle.count()
      ]);
      res.json({ data, total });
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch vehicles' });
    }
  },
  createBulk: async (req: Request, res: Response) => {
    try {
      if (!req.body.vehicles || !Array.isArray(req.body.vehicles)) {
        return res.status(400).json({ error: 'Invalid data format. Expected { vehicles: [] }' });
      }
      const result = await prisma.vehicle.createMany({
        data: req.body.vehicles,
        skipDuplicates: true
      });
      res.status(201).json({ success: true, count: result.count });
    } catch (error) {
      console.error('Bulk import error:', error);
      res.status(400).json({ error: 'Failed to bulk import vehicles' });
    }
  }
};
export const vehicleTypeController = createCrudHandlers('vehicleType');
export const materialController = createCrudHandlers('material');
export const sourceController = createCrudHandlers('source');
export const destinationController = {
  ...createCrudHandlers('destination'),
  create: async (req: Request, res: Response) => {
    try {
      if (req.body.isDefault) {
        // @ts-ignore
        await prisma.destination.updateMany({ data: { isDefault: false } });
      }
      // @ts-ignore
      const data = await prisma.destination.create({ data: req.body });
      res.status(201).json(data);
    } catch (error) {
      console.error(error);
      res.status(400).json({ error: 'Failed to create destination' });
    }
  },
  update: async (req: Request, res: Response) => {
    try {
      if (req.body.isDefault) {
        // @ts-ignore
        await prisma.destination.updateMany({ data: { isDefault: false } });
      }
      // @ts-ignore
      const data = await prisma.destination.update({
        where: { id: req.params.id as string },
        data: req.body
      });
      res.json(data);
    } catch (error) {
      console.error(error);
      res.status(400).json({ error: 'Failed to update destination' });
    }
  }
};
