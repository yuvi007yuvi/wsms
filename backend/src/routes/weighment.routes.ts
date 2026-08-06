import { Router } from 'express';
import { authenticateToken } from '../middleware/auth.middleware';
import { checkSubscription } from '../middleware/checkSubscription';
import { createWeighmentSlip, getWeighmentSlips, deleteWeighmentSlip } from '../controllers/weighment.controller';

const router = Router();

router.use(authenticateToken, checkSubscription);

router.post('/', createWeighmentSlip);
router.get('/', getWeighmentSlips);
router.delete('/:id', deleteWeighmentSlip);

export default router;
