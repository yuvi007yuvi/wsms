import { Router } from 'express';
import { getSettings, updateSettings } from '../controllers/setting.controller';
import { authenticateToken } from '../middleware/auth.middleware';

const router = Router();

router.use(authenticateToken);

router.get('/', getSettings);
router.put('/:id', updateSettings);

export default router;
