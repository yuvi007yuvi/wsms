import { Router } from 'express';
import { superadminController } from '../controllers/superadmin.controller';
import { authenticateToken, AuthRequest } from '../middleware/auth.middleware';
import { NextFunction, Response } from 'express';

const router = Router();

const authorizeRole = (roles: string[]) => {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.user || !roles.includes(req.user.role)) {
      res.status(403).json({ error: 'Access denied: insufficient permissions' });
      return;
    }
    next();
  };
};

// Only superadmins can access these routes
router.use(authenticateToken);
router.use(authorizeRole(['superadmin']));

router.get('/stats', superadminController.getStats);
router.get('/projects', superadminController.getAllProjects);
router.post('/projects', superadminController.createProject);
router.put('/projects/:id', superadminController.updateProject);
router.get('/users', superadminController.getUsers);
router.put('/projects/:projectId/assign-user', superadminController.assignUser);

router.get('/invoices', superadminController.getInvoices);
router.post('/invoices', superadminController.createInvoice);
router.delete('/invoices/:id', superadminController.deleteInvoice);

export default router;
