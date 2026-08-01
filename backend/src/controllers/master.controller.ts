import { Request, Response } from 'express';
import prisma from '../utils/prisma';

// Helper for generating CRUD handlers
const createCrudHandlers = (modelName: 'vehicleType' | 'vehicle' | 'material' | 'source' | 'destination') => {
  return {
    getAll: async (req: Request, res: Response) => {
      try {
        // @ts-ignore
        const data = await prisma[modelName].findMany({
          orderBy: { createdAt: 'desc' }
        });
        res.json(data);
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
        // @ts-ignore
        const data = await prisma[modelName].create({
          data: req.body
        });
        res.status(201).json(data);
      } catch (error) {
        console.error(error);
        res.status(400).json({ error: `Failed to create ${modelName}` });
      }
    },
    update: async (req: Request, res: Response) => {
      try {
        // @ts-ignore
        const data = await prisma[modelName].update({
          where: { id: req.params.id },
          data: req.body
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
    }
  };
};

export const vehicleController = {
  ...createCrudHandlers('vehicle'),
  getAll: async (req: Request, res: Response) => {
    try {
      const data = await prisma.vehicle.findMany({
        orderBy: { createdAt: 'desc' },
        include: { vehicleType: true }
      });
      res.json(data);
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch vehicles' });
    }
  },
  createBulk: async (req: Request, res: Response) => {
    try {
      if (!req.body.vehicles || !Array.isArray(req.body.vehicles)) {
        return res.status(400).json({ error: 'Invalid data format. Expected { vehicles: [] }' });
      }
      let count = 0;
      for (const vehicle of req.body.vehicles) {
        try {
          await prisma.vehicle.create({ data: vehicle });
          count++;
        } catch (e: any) {
          // Ignore unique constraint violations (duplicates)
          if (e.code !== 'P2002') throw e;
        }
      }
      res.status(201).json({ success: true, count });
    } catch (error) {
      console.error('Bulk import error:', error);
      res.status(400).json({ error: 'Failed to bulk import vehicles' });
    }
  }
};
export const vehicleTypeController = createCrudHandlers('vehicleType');
export const materialController = createCrudHandlers('material');
export const sourceController = createCrudHandlers('source');
export const destinationController = createCrudHandlers('destination');
