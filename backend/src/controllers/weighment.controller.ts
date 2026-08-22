import { Request, Response } from 'express';
import prisma from '../utils/prisma';

// Helper to generate unique slip number
const generateSlipNumber = async () => {
  const now = new Date();
  const dateStr = now.toISOString().slice(0, 10).replace(/-/g, '');
  const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const endOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);

  const lastSlip = await prisma.weighmentSlip.findFirst({
    where: {
      date: {
        gte: startOfDay,
        lte: endOfDay
      }
    },
    orderBy: {
      slipNumber: 'desc'
    }
  });

  let seqNum = 1;
  if (lastSlip && lastSlip.slipNumber.includes('-')) {
    const lastSeq = parseInt(lastSlip.slipNumber.split('-')[1], 10);
    if (!isNaN(lastSeq)) {
      seqNum = lastSeq + 1;
    }
  }

  const seq = String(seqNum).padStart(4, '0');
  const shortDate = dateStr.slice(2); // YYMMDD
  return `WS${shortDate}-${seq}`;
};

export const createWeighmentSlip = async (req: Request, res: Response) => {
  try {
    const { vehicleId, vehicleTypeId, materialId, sourceId, destinationId, grossWeight, remarks, driverName, manualTareWeight } = req.body;
    
    // Run slip number generation and vehicle fetch IN PARALLEL
    const [slipNumber, vehicle] = await Promise.all([
      generateSlipNumber(),
      prisma.vehicle.findUnique({ 
        where: { id: vehicleId },
        select: { 
          id: true, 
          tareWeight: true, 
          vehicleType: { select: { tareWeight: true } } 
        }
      })
    ]);

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

    // @ts-ignore
    const slip = await prisma.weighmentSlip.create({
      data: {
        slipNumber,
        vehicle: { connect: { id: vehicleId } },
        material: { connect: { id: materialId } },
        source: { connect: { id: sourceId } },
        destination: { connect: { id: destinationId } },
        grossWeight,
        tareWeight,
        netWeight,
        // @ts-ignore
        operator: { connect: { id: req.user.id } },
        remarks,
        driverName,
        // @ts-ignore
        ...(req.user.projectId ? { project: { connect: { id: req.user.projectId } } } : {})
      },
      select: {
        id: true,
        slipNumber: true,
        date: true,
        grossWeight: true,
        tareWeight: true,
        netWeight: true,
        remarks: true,
        driverName: true,
        createdAt: true,
        vehicle: { select: { id: true, vehicleNumber: true, vehicleType: { select: { name: true } } } },
        material: { select: { id: true, name: true } },
        source: { select: { id: true, name: true } },
        destination: { select: { id: true, name: true } },
        operator: { select: { id: true, username: true } }
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
    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const limit = Math.max(1, Math.min(1000, parseInt(req.query.limit as string) || 10));
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
        select: {
          id: true,
          slipNumber: true,
          date: true,
          grossWeight: true,
          tareWeight: true,
          netWeight: true,
          remarks: true,
          driverName: true,
          createdAt: true,
          vehicle: {
            select: { vehicleNumber: true, driverName: true, vehicleType: { select: { name: true } } }
          },
          material: { select: { name: true } },
          source: { select: { name: true } },
          destination: { select: { name: true } },
          operator: { select: { username: true } }
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

export const getWeighmentSummary = async (req: Request, res: Response) => {
  try {
    const { dateFrom, dateTo, reportType } = req.query;
    
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

    // Fetch required fields to group in JS
    const slips = await prisma.weighmentSlip.findMany({
      where,
      select: {
        date: true,
        grossWeight: true,
        tareWeight: true,
        netWeight: true,
        vehicle: {
          select: { vehicleType: { select: { name: true } } }
        },
        vehicleType: { select: { name: true } },
        source: { select: { name: true } },
        destination: { select: { name: true } }
      },
      // Limit to prevent memory issues on very large datasets
      take: 100000
    });

    const summaryMap = new Map<string, any>();

    for (const slip of slips) {
      let key = 'Unknown';
      
      switch (reportType) {
        case 'daily': {
          const d = new Date(slip.date);
          key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
          break;
        }
        case 'vehicleType':
          key = slip.vehicleType?.name || slip.vehicle?.vehicleType?.name || 'Unknown';
          break;
        case 'ward':
        case 'source':
          key = slip.source?.name || 'Unknown';
          break;
        case 'work':
        case 'destination':
          key = slip.destination?.name || 'Unknown';
          break;
        default:
          key = 'All';
      }

      if (!summaryMap.has(key)) {
        summaryMap.set(key, {
          key,
          count: 0,
          grossWeight: 0,
          tareWeight: 0,
          netWeight: 0
        });
      }

      const current = summaryMap.get(key);
      current.count += 1;
      current.grossWeight += slip.grossWeight || 0;
      current.tareWeight += slip.tareWeight || 0;
      current.netWeight += slip.netWeight || 0;
    }

    const data = Array.from(summaryMap.values());
    
    // Sort logic
    if (reportType === 'daily') {
      data.sort((a, b) => b.key.localeCompare(a.key)); // Newest first
    } else {
      data.sort((a, b) => b.netWeight - a.netWeight); // Highest weight first
    }

    res.json({ data });
  } catch (error) {
    console.error('Error fetching weighment summary:', error);
    res.status(500).json({ error: 'Failed to fetch summary reports' });
  }
};
