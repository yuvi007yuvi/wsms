import { Request, Response } from 'express';
import prisma from '../utils/prisma';

// Helper to generate unique slip number
const generateSlipNumber = async () => {
  const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  const count = await prisma.weighmentSlip.count({
    where: {
      date: {
        gte: new Date(new Date().setHours(0,0,0,0)),
        lte: new Date(new Date().setHours(23,59,59,999))
      }
    }
  });
  const seq = String(count + 1).padStart(6, '0');
  const randomStr = Math.random().toString(36).substring(2, 5).toUpperCase();
  return `WS-${dateStr}-${seq}-${randomStr}`;
};

export const createWeighmentSlip = async (req: Request, res: Response) => {
  try {
    const { vehicleId, materialId, sourceId, destinationId, grossWeight, remarks, driverName, manualTareWeight } = req.body;
    
    // Fetch vehicle for Tare Weight
    const vehicle = await prisma.vehicle.findUnique({ 
      where: { id: vehicleId },
      include: { vehicleType: true }
    });
    if (!vehicle) {
      res.status(400).json({ error: 'Vehicle not found' });
      return;
    }

    let tareWeight = vehicle.tareWeight || vehicle.vehicleType?.tareWeight || 0;
    if (manualTareWeight !== undefined && manualTareWeight !== null && manualTareWeight !== '') {
      tareWeight = Number(manualTareWeight);
    }
    const netWeight = grossWeight - tareWeight;

    if (netWeight < 0) {
      res.status(400).json({ error: 'Gross weight cannot be less than tare weight' });
      return;
    }

    const slipNumber = await generateSlipNumber();

    // @ts-ignore
    const slip = await prisma.weighmentSlip.create({
      data: {
        slipNumber,
        vehicleId,
        materialId,
        sourceId,
        destinationId,
        grossWeight,
        tareWeight,
        netWeight,
        // @ts-ignore
        operatorId: req.user.id, // from auth middleware
        remarks,
        driverName,
        // @ts-ignore
        projectId: req.user.projectId || null
      },
      include: {
        vehicle: true,
        material: true,
        source: true,
        destination: true,
        operator: true
      }
    });

    res.status(201).json(slip);
  } catch (error) {
    console.error('Error creating weighment slip:', error);
    res.status(500).json({ error: 'Failed to create slip' });
  }
};

export const getWeighmentSlips = async (req: Request, res: Response) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const skip = (page - 1) * limit;
    
    const { search, dateFrom, dateTo } = req.query;
    
    let where: any = {};
    
    if (dateFrom || dateTo) {
      where.date = {};
      if (dateFrom) where.date.gte = new Date(dateFrom as string);
      if (dateTo) {
        const to = new Date(dateTo as string);
        to.setHours(23, 59, 59, 999);
        where.date.lte = to;
      }
    }
    
    if (search) {
      const q = String(search).toLowerCase();
      where.OR = [
        { slipNumber: { contains: q, mode: 'insensitive' } },
        { remarks: { contains: q, mode: 'insensitive' } },
        { vehicle: { vehicleNumber: { contains: q, mode: 'insensitive' } } },
        { material: { name: { contains: q, mode: 'insensitive' } } },
        { operator: { username: { contains: q, mode: 'insensitive' } } }
      ];
    }

    const [slips, total] = await Promise.all([
      prisma.weighmentSlip.findMany({
        where,
        skip,
        take: limit,
        include: {
          vehicle: true,
          material: true,
          source: true,
          destination: true,
          operator: true
        },
        orderBy: { createdAt: 'desc' }
      }),
      prisma.weighmentSlip.count({ where })
    ]);

    res.json({ data: slips, total });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch slips' });
  }
};

export const deleteWeighmentSlip = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    
    // @ts-ignore
    if (req.user?.role !== 'admin') {
      res.status(403).json({ error: 'Only admins can delete slips' });
      return;
    }

    await prisma.weighmentSlip.delete({
      where: { id: id as string }
    });
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete slip' });
  }
};
