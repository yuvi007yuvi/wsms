import { Router } from 'express';
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
