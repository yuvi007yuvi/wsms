import { Request, Response } from 'express';
import prisma from '../utils/prisma';

// Helper to generate unique slip number scoped per project
const generateSlipNumber = async (projectId?: string | null) => {
  const now = new Date();
  // Shift by +5:30 to get IST time for extracting YYYY, MM, DD
  const istTime = new Date(now.getTime() + (5.5 * 60 * 60 * 1000));
  const yyyy = istTime.getUTCFullYear();
  const mm = String(istTime.getUTCMonth() + 1).padStart(2, '0');
  const dd = String(istTime.getUTCDate()).padStart(2, '0');
  const dateStr = `${yyyy}${mm}${dd}`;
  const shortDate = dateStr.slice(2); // YYMMDD

  // Determine prefix based on project
  // Default prefix for Nature Green, global or unassigned projects is pure 'WS'
  let projectPrefix = 'WS'; 
  let isAligarhSimpleSeq = false;
  if (projectId) {
    const project = await prisma.project.findUnique({
      where: { id: projectId },
      select: { name: true }
    });

    if (project?.name) {
      const lower = project.name.toLowerCase();
      if (lower.includes('aligarh') || lower.includes('urban') || lower.includes('ecostan')) {
        isAligarhSimpleSeq = true;
      } else if (lower.includes('nature') || lower.includes('green')) {
        // Original Nature Green project keeps pure WS{YYMMDD}-XXXX
        projectPrefix = 'WS';
      } else {
        // Derive clean 2-4 uppercase acronym from new project name
        const cleanName = project.name.replace(/[^a-zA-Z0-9\s]/g, '').trim();
        const parts = cleanName.split(/\s+/).filter(Boolean);
        if (parts.length > 1) {
          projectPrefix = parts.map(p => p[0].toUpperCase()).slice(0, 4).join('');
        } else if (cleanName.length >= 2) {
          projectPrefix = cleanName.slice(0, 3).toUpperCase();
        }
      }
    }
  }

  // For Aligarh project: simple sequential serial number starting from 1 (1, 2, 3...)
  if (isAligarhSimpleSeq && projectId) {
    const existingSlips = await prisma.weighmentSlip.findMany({
      where: { projectId },
      select: { slipNumber: true }
    });
    let maxNum = 0;
    for (const s of existingSlips) {
      if (/^\d+$/.test(s.slipNumber)) {
        const n = parseInt(s.slipNumber, 10);
        if (n > maxNum) maxNum = n;
      }
    }
    let nextNum = maxNum + 1;
    let candidate = String(nextNum);
    while (await prisma.weighmentSlip.findUnique({ where: { slipNumber: candidate }, select: { id: true } })) {
      nextNum++;
      candidate = String(nextNum);
    }
    return candidate;
  }

  // Find the last slip for THIS specific project & date prefix
  const searchPrefix = `${projectPrefix}${shortDate}-`;
  const lastSlip = await prisma.weighmentSlip.findFirst({
    where: {
      slipNumber: {
        startsWith: searchPrefix
      },
      ...(projectId ? { projectId } : {})
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

  // Safety check: ensure unique slip number if any collision
  let seq = String(seqNum).padStart(4, '0');
  let candidateSlipNumber = `${projectPrefix}${shortDate}-${seq}`;

  // If candidate already exists in database, keep incrementing
  while (await prisma.weighmentSlip.findUnique({ where: { slipNumber: candidateSlipNumber }, select: { id: true } })) {
    seqNum++;
    seq = String(seqNum).padStart(4, '0');
    candidateSlipNumber = `${projectPrefix}${shortDate}-${seq}`;
  }

  return candidateSlipNumber;
};

export const createWeighmentSlip = async (req: Request, res: Response) => {
  try {
    const { vehicleId, vehicleTypeId, materialId, sourceId, destinationId, grossWeight, remarks, driverName, manualTareWeight } = req.body;
    // @ts-ignore
    const userProjectId = req.user?.projectId || null;
    
    // Run slip number generation with projectId and vehicle fetch IN PARALLEL
    const [slipNumber, vehicle] = await Promise.all([
      generateSlipNumber(userProjectId),
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
        remarks: process.env.IS_OFFLINE_NODE === 'true' 
          ? (remarks ? `${remarks} [OFFLINE_PENDING]` : '[OFFLINE_PENDING]') 
          : remarks,
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
        operator: { select: { id: true, username: true } },
        project: { select: { id: true, name: true, address: true } }
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
    const limit = Math.max(1, Math.min(1000000, parseInt(req.query.limit as string) || 10));
    const skip = (page - 1) * limit;
    
    const { search, dateFrom, dateTo, reportType, categoryKey } = req.query;
    // @ts-ignore
    const authUser = req.user;
    
    let where: any = {};

    // Filter slips by project if user belongs to a specific project
    if (authUser?.role !== 'superadmin' && authUser?.projectId) {
      where.projectId = authUser.projectId;
    }
    
    if (dateFrom || dateTo) {
      where.date = {};
      if (dateFrom) where.date.gte = new Date(`${dateFrom as string}T00:00:00+05:30`);
      if (dateTo) where.date.lte = new Date(`${dateTo as string}T23:59:59.999+05:30`);
    }

    // Filter by specific summary category drill-down if provided
    if (reportType && categoryKey) {
      const catKey = String(categoryKey);
      switch (reportType) {
        case 'daily': {
          where.date = {
            gte: new Date(`${catKey}T00:00:00+05:30`),
            lte: new Date(`${catKey}T23:59:59.999+05:30`)
          };
          break;
        }
        case 'source':
        case 'ward': {
          where.source = { name: catKey };
          break;
        }
        case 'work':
        case 'destination': {
          where.destination = { name: catKey };
          break;
        }
        case 'vehicleType': {
          where.OR = [
            { vehicleType: { name: catKey } },
            { vehicle: { vehicleType: { name: catKey } } }
          ];
          break;
        }
      }
    }
    
    if (search) {
      const q = String(search).toLowerCase();
      where.OR = [
        { slipNumber: { contains: q } },
        { remarks: { contains: q } },
        { vehicle: { vehicleNumber: { contains: q } } },
        { material: { name: { contains: q } } },
        { operator: { username: { contains: q } } }
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
          operator: { select: { username: true } },
          project: { select: { id: true, name: true, address: true } }
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
    // @ts-ignore
    const authUser = req.user;
    
    let where: any = {};

    // Isolate by project if user is assigned to a project
    if (authUser?.role !== 'superadmin' && authUser?.projectId) {
      where.projectId = authUser.projectId;
    }
    
    if (dateFrom || dateTo) {
      where.date = {};
      if (dateFrom) where.date.gte = new Date(`${dateFrom as string}T00:00:00+05:30`);
      if (dateTo) where.date.lte = new Date(`${dateTo as string}T23:59:59.999+05:30`);
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
          const d = new Date(new Date(slip.date).getTime() + (5.5 * 60 * 60 * 1000));
          key = `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}-${String(d.getUTCDate()).padStart(2, '0')}`;
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
      data.sort((a, b) => a.key.localeCompare(b.key, undefined, { numeric: true, sensitivity: 'base' })); // Alphabetical ascending
    }

    res.json({ data });
  } catch (error) {
    console.error('Error fetching weighment summary:', error);
    res.status(500).json({ error: 'Failed to fetch summary reports' });
  }
};

export const getVehicleLatestSlip = async (req: Request, res: Response) => {
  try {
    const { vehicleId } = req.params;
    // @ts-ignore
    const userProjectId = req.user?.projectId || null;

    let where: any = { vehicleId };
    if (userProjectId) {
      where.projectId = userProjectId;
    }

    const latestSlip = await prisma.weighmentSlip.findFirst({
      where,
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        slipNumber: true,
        grossWeight: true,
        tareWeight: true,
        netWeight: true,
        createdAt: true,
        materialId: true,
        sourceId: true,
        destinationId: true,
        driverName: true
      }
    });

    res.json({ slip: latestSlip });
  } catch (error) {
    console.error('Error fetching vehicle latest slip:', error);
    res.status(500).json({ error: 'Failed to fetch vehicle latest slip' });
  }
};

export const syncOfflineSlip = async (req: Request, res: Response) => {
  try {
    const {
      slipNumber,
      vehicleNumber,
      materialName,
      sourceName,
      destinationName,
      grossWeight,
      tareWeight,
      netWeight,
      driverName,
      date,
      remarks
    } = req.body;

    if (!slipNumber || !vehicleNumber) {
      res.status(400).json({ error: 'Missing slipNumber or vehicleNumber' });
      return;
    }

    // Check if slip already exists to prevent duplicate
    const existing = await prisma.weighmentSlip.findUnique({
      where: { slipNumber }
    });

    if (existing) {
      res.json({ message: 'Slip already synced', slip: existing });
      return;
    }

    // Find or connect vehicle
    let vehicle = await prisma.vehicle.findUnique({ where: { vehicleNumber } });
    if (!vehicle) {
      const defaultType = await prisma.vehicleType.findFirst() || await prisma.vehicleType.create({ data: { name: 'TRUCK', tareWeight: 0 } });
      vehicle = await prisma.vehicle.create({
        data: {
          vehicleNumber,
          vehicleTypeId: defaultType.id,
          driverName: driverName || '-'
        }
      });
    }

    // Find or connect material
    let material = await prisma.material.findFirst({ where: { name: materialName || 'SOLID WASTE' } });
    if (!material) {
      material = await prisma.material.create({ data: { name: materialName || 'SOLID WASTE' } });
    }

    // Find or connect source (customer/ward)
    let source = await prisma.source.findFirst({ where: { name: sourceName || 'CUSTOMER' } });
    if (!source) {
      source = await prisma.source.create({ data: { name: sourceName || 'CUSTOMER' } });
    }

    // Find or connect destination
    let destination = await prisma.destination.findFirst({ where: { name: destinationName || 'PROCESSING PLANT' } });
    if (!destination) {
      destination = await prisma.destination.create({ data: { name: destinationName || 'PROCESSING PLANT', isDefault: true } });
    }

    // Operator
    const adminUser = await prisma.user.findFirst({ where: { role: 'admin' } }) || await prisma.user.findFirst();

    const newSlip = await prisma.weighmentSlip.create({
      data: {
        slipNumber,
        vehicleId: vehicle.id,
        materialId: material.id,
        sourceId: source.id,
        destinationId: destination.id,
        grossWeight: Number(grossWeight) || 0,
        tareWeight: Number(tareWeight) || 0,
        netWeight: Number(netWeight) || 0,
        driverName: driverName || vehicle.driverName,
        date: date ? new Date(date) : new Date(),
        operatorId: adminUser?.id || '',
        remarks: remarks || '[OFFLINE_SYNCED]'
      }
    });

    res.status(201).json({ message: 'Slip synced to cloud', slip: newSlip });
  } catch (error) {
    console.error('Error syncing offline slip to cloud:', error);
    res.status(500).json({ error: 'Failed to sync offline slip' });
  }
};
