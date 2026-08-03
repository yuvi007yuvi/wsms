import { Router } from 'express';
import { getSystemHealth, getSyncStatusInfo, forceSync } from '../controllers/system.controller';

const router = Router();

// Public route for health check
router.get('/health', getSystemHealth);
router.get('/sync-status', getSyncStatusInfo);
router.post('/sync-force', forceSync);

export default router;
