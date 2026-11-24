import { Router } from 'express';
import { authenticateToken } from '../middleware/auth.middleware';
import { checkSubscription } from '../middleware/checkSubscription';
import { createWeighmentSlip, getWeighmentSlips, deleteWeighmentSlip, getWeighmentSummary, getVehicleLatestSlip, syncOfflineSlip } from '../controllers/weighment.controller';

const router = Router();

// Allow offline sync endpoint
router.post('/sync-offline', syncOfflineSlip);

router.use(authenticateToken, checkSubscription);

router.post('/', createWeighmentSlip);
router.get('/summary', getWeighmentSummary);
router.get('/vehicle-latest/:vehicleId', getVehicleLatestSlip);
router.get('/', getWeighmentSlips);
router.delete('/:id', deleteWeighmentSlip);

export default router;
