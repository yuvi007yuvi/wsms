import { Router } from 'express';
import { getSettings, updateSettings, getRolePermissions, upsertRolePermission } from '../controllers/setting.controller';
import { authenticateToken } from '../middleware/auth.middleware';
import { checkSubscription } from '../middleware/checkSubscription';

const router = Router();

router.use(authenticateToken, checkSubscription);

router.get('/', getSettings);
router.put('/:id', updateSettings);

router.get('/role-permissions', getRolePermissions);
router.post('/role-permissions', upsertRolePermission);

export default router;
