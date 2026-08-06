import { Router } from 'express';
import { getUsers, createUser, updateUser, deleteUser } from '../controllers/user.controller';
import { authenticateToken } from '../middleware/auth.middleware';
import { checkSubscription } from '../middleware/checkSubscription';

const router = Router();

router.use(authenticateToken, checkSubscription); // Protect all user routes

router.get('/', getUsers);
router.post('/', createUser);
router.put('/:id', updateUser);
router.delete('/:id', deleteUser);

export default router;
