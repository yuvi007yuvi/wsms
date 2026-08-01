import { Router } from 'express';
import { getSystemHealth } from '../controllers/system.controller';

const router = Router();

// Public route for health check
router.get('/health', getSystemHealth);

export default router;
