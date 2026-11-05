import { Router, Request, Response } from 'express';
import prisma from '../utils/prisma';
import { authenticateToken } from '../middleware/auth.middleware';

const router = Router();

// 1. Get available projects for selection in GUI or filters
router.get('/projects', authenticateToken, async (req: Request, res: Response) => {
  try {
    const authUser = (req as any).user;
    let where: any = { isActive: true };

    if (authUser?.role !== 'superadmin' && authUser?.projectId) {
      where = { id: authUser.projectId, isActive: true };
    }

    const projects = await prisma.project.findMany({
      where,
      select: {
        id: true,
        name: true,
        address: true,
        createdAt: true,
        _count: {
          select: {
            vehicles: true,
            weighmentSlips: true,
            users: true
          }
        }
      },
      orderBy: { name: 'asc' }
    });

    res.json(projects);
  } catch (error) {
    console.error('Failed to fetch projects list:', error);
    res.status(500).json({ error: 'Failed to fetch projects' });
  }
});

// 2. Data Sharing Endpoint: Project Weighment Slips Feed
// Can be queried using either API Key header (x-api-key) or Bearer Token
router.get('/projects/:projectId/slips', authenticateToken, async (req: Request, res: Response) => {
  try {
    const { projectId } = req.params;
    const { dateFrom, dateTo, search } = req.query;
    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const limit = Math.max(1, Math.min(500, parseInt(req.query.limit as string) || 50));
    const skip = (page - 1) * limit;

    const where: any = {
      projectId: projectId === 'all' ? undefined : projectId
    };

    if (dateFrom || dateTo) {
      where.date = {};
      if (dateFrom) where.date.gte = new Date(`${dateFrom as string}T00:00:00+05:30`);
      if (dateTo) where.date.lte = new Date(`${dateTo as string}T23:59:59.999+05:30`);
    }

    if (search) {
      const q = String(search);
      where.OR = [
        { slipNumber: { contains: q, mode: 'insensitive' } },
        { vehicle: { vehicleNumber: { contains: q, mode: 'insensitive' } } },
        { material: { name: { contains: q, mode: 'insensitive' } } }
      ];
    }

    const [slips, total, aggregates] = await Promise.all([
      prisma.weighmentSlip.findMany({
        where,
        skip,
        take: limit,
        orderBy: { date: 'desc' },
        select: {
          id: true,
          slipNumber: true,
          date: true,
          grossWeight: true,
          tareWeight: true,
          netWeight: true,
          remarks: true,
          driverName: true,
          vehicle: { select: { id: true, vehicleNumber: true, vehicleType: { select: { name: true } } } },
          material: { select: { id: true, name: true } },
          source: { select: { id: true, name: true } },
          destination: { select: { id: true, name: true } },
          operator: { select: { username: true, fullName: true } },
          project: { select: { id: true, name: true } }
        }
      }),
      prisma.weighmentSlip.count({ where }),
      prisma.weighmentSlip.aggregate({
        where,
        _sum: {
          grossWeight: true,
          tareWeight: true,
          netWeight: true
        }
      })
    ]);

    res.json({
      success: true,
      projectId,
      meta: {
        page,
        limit,
        totalRecords: total,
        totalPages: Math.ceil(total / limit),
        totalNetWeightKg: aggregates._sum.netWeight || 0,
        totalNetWeightTons: ((aggregates._sum.netWeight || 0) / 1000).toFixed(3)
      },
      data: slips
    });
  } catch (error) {
    console.error('Data sharing slips error:', error);
    res.status(500).json({ error: 'Failed to retrieve project weighment slips' });
  }
});

// 3. Data Sharing Endpoint: Project Vehicles List
router.get('/projects/:projectId/vehicles', authenticateToken, async (req: Request, res: Response) => {
  try {
    const { projectId } = req.params;
    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const limit = Math.max(1, Math.min(500, parseInt(req.query.limit as string) || 100));
    const skip = (page - 1) * limit;

    const where: any = {
      isActive: true,
      projectId: projectId === 'all' ? undefined : projectId
    };

    const [vehicles, total] = await Promise.all([
      prisma.vehicle.findMany({
        where,
        skip,
        take: limit,
        orderBy: { vehicleNumber: 'asc' },
        select: {
          id: true,
          vehicleNumber: true,
          driverName: true,
          mobile: true,
          owner: true,
          tareWeight: true,
          vehicleType: { select: { id: true, name: true, tareWeight: true } },
          project: { select: { id: true, name: true } },
          createdAt: true
        }
      }),
      prisma.vehicle.count({ where })
    ]);

    res.json({
      success: true,
      projectId,
      meta: {
        page,
        limit,
        totalRecords: total
      },
      data: vehicles
    });
  } catch (error) {
    console.error('Data sharing vehicles error:', error);
    res.status(500).json({ error: 'Failed to retrieve project vehicles' });
  }
});

// 4. Data Sharing Endpoint: Project Summary / Tonnage Aggregates
router.get('/projects/:projectId/summary', authenticateToken, async (req: Request, res: Response) => {
  try {
    const { projectId } = req.params;
    const { dateFrom, dateTo } = req.query;

    const pId = String(projectId);
    const where: any = {
      projectId: pId === 'all' ? undefined : pId
    };

    if (dateFrom || dateTo) {
      where.date = {};
      if (dateFrom) where.date.gte = new Date(`${dateFrom as string}T00:00:00+05:30`);
      if (dateTo) where.date.lte = new Date(`${dateTo as string}T23:59:59.999+05:30`);
    }

    const [aggregates, totalTrips, vehicleCount, materialsBreakdown] = await Promise.all([
      prisma.weighmentSlip.aggregate({
        where,
        _sum: {
          grossWeight: true,
          tareWeight: true,
          netWeight: true
        },
        _avg: {
          netWeight: true
        }
      }),
      prisma.weighmentSlip.count({ where }),
      prisma.vehicle.count({
        where: { isActive: true, projectId: pId === 'all' ? undefined : pId }
      }),
      prisma.weighmentSlip.groupBy({
        by: ['materialId'],
        where,
        _count: { id: true },
        _sum: { netWeight: true }
      })
    ]);

    // Fetch material names
    const materialIds = materialsBreakdown.map(m => m.materialId);
    const materials = await prisma.material.findMany({
      where: { id: { in: materialIds } },
      select: { id: true, name: true }
    });

    const materialMap = new Map(materials.map(m => [m.id, m.name]));

    const summaryByMaterial = materialsBreakdown.map(m => ({
      materialId: m.materialId,
      materialName: materialMap.get(m.materialId) || 'Unknown',
      tripCount: m._count.id,
      totalNetWeightKg: m._sum.netWeight || 0,
      totalNetWeightTons: ((m._sum.netWeight || 0) / 1000).toFixed(3)
    }));

    res.json({
      success: true,
      projectId,
      summary: {
        totalTrips,
        activeVehicles: vehicleCount,
        totalGrossWeightKg: aggregates._sum.grossWeight || 0,
        totalTareWeightKg: aggregates._sum.tareWeight || 0,
        totalNetWeightKg: aggregates._sum.netWeight || 0,
        totalNetWeightTons: ((aggregates._sum.netWeight || 0) / 1000).toFixed(3),
        averageNetWeightKg: Math.round(aggregates._avg.netWeight || 0),
        materials: summaryByMaterial
      }
    });
  } catch (error) {
    console.error('Data sharing summary error:', error);
    res.status(500).json({ error: 'Failed to retrieve project summary' });
  }
});

export default router;
