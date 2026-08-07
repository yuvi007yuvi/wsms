import { Router } from 'express';
import { getSystemHealth, getSyncStatusInfo, forceSync, installTools, diagnoseWeighbridge } from '../controllers/system.controller';
import { authenticateToken } from '../middleware/auth.middleware';
import { checkSubscription } from '../middleware/checkSubscription';

const router = Router();

// Public route for health check
router.get('/health', getSystemHealth);
router.post('/install-tools', installTools);
router.get('/diagnose-weighbridge', diagnoseWeighbridge);
router.get('/sync-status', authenticateToken, checkSubscription, getSyncStatusInfo);
router.post('/sync-force', authenticateToken, checkSubscription, forceSync);

export default router;
