import { Router } from 'express';
import { getUsers, createUser, deleteUser } from '../controllers/user.controller';
import { authenticateToken } from '../middleware/auth.middleware';

const router = Router();

router.use(authenticateToken); // Protect all user routes

router.get('/', getUsers);
router.post('/', createUser);
router.delete('/:id', deleteUser);

export default router;
