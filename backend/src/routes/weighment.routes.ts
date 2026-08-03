import { Router } from 'express';
import { authenticateToken } from '../middleware/auth.middleware';
import { createWeighmentSlip, getWeighmentSlips, deleteWeighmentSlip } from '../controllers/weighment.controller';

const router = Router();

router.use(authenticateToken);

router.post('/', createWeighmentSlip);
router.get('/', getWeighmentSlips);
router.delete('/:id', deleteWeighmentSlip);

export default router;
