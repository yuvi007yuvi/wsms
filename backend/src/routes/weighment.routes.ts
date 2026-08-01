import { Router } from 'express';
import { authenticateToken } from '../middleware/auth.middleware';
import { createWeighmentSlip, getWeighmentSlips } from '../controllers/weighment.controller';

const router = Router();

router.use(authenticateToken);

router.post('/', createWeighmentSlip);
router.get('/', getWeighmentSlips);

export default router;
