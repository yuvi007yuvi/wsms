import { Router } from 'express';
import prisma from '../utils/prisma';
import { authenticateToken } from '../middleware/auth.middleware';
import { checkSubscription } from '../middleware/checkSubscription';
import {
  vehicleController,
  vehicleTypeController,
  materialController,
  sourceController,
  destinationController
} from '../controllers/master.controller';

const router = Router();

// Apply auth middleware to all master routes
router.use(authenticateToken, checkSubscription);

router.get('/vehicles/deleted', async (req, res) => {
  console.log('GET /vehicles/deleted hit by user:', (req as any).user);
  try {
    const data = await prisma.vehicle.findMany({ 
      where: { isActive: false },
      include: { vehicleType: { select: { id: true, name: true, tareWeight: true } } }
    });
    console.log('Found deleted vehicles:', data.length);
    res.json({ data, total: data.length });
  } catch (err) {
    console.error('Error in /vehicles/deleted:', err);
    res.status(500).json({ error: 'Failed to fetch deleted vehicles' });
  }
});

router.delete('/vehicles/:id/permanent', async (req, res) => {
  try {
    await prisma.vehicle.delete({ where: { id: req.params.id } });
    res.json({ success: true });
  } catch (err) {
    console.error('Error in permanent delete:', err);
    res.status(500).json({ error: 'Failed to permanently delete vehicle' });
  }
});

const setupRoutes = (path: string, controller: any) => {
  router.get(path, controller.getAll);
  router.get(`${path}/:id`, controller.getById);
  router.post(`${path}/bulk`, controller.createBulk);
  router.post(path, controller.create);
  router.put(`${path}/:id`, controller.update);
  router.delete(`${path}/:id`, controller.delete);
};


setupRoutes('/vehicles', vehicleController);
setupRoutes('/vehicle-types', vehicleTypeController);
setupRoutes('/materials', materialController);
setupRoutes('/sources', sourceController);
setupRoutes('/destinations', destinationController);

export default router;
