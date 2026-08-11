"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const superadmin_controller_1 = require("../controllers/superadmin.controller");
const auth_middleware_1 = require("../middleware/auth.middleware");
const router = (0, express_1.Router)();
const authorizeRole = (roles) => {
    return (req, res, next) => {
        if (!req.user || !roles.includes(req.user.role)) {
            res.status(403).json({ error: 'Access denied: insufficient permissions' });
            return;
        }
        next();
    };
};
// Only superadmins can access these routes
router.use(auth_middleware_1.authenticateToken);
router.use(authorizeRole(['superadmin']));
router.get('/stats', superadmin_controller_1.superadminController.getStats);
router.get('/projects', superadmin_controller_1.superadminController.getAllProjects);
router.post('/projects', superadmin_controller_1.superadminController.createProject);
router.put('/projects/:id', superadmin_controller_1.superadminController.updateProject);
router.get('/users', superadmin_controller_1.superadminController.getUsers);
router.put('/projects/:projectId/assign-user', superadmin_controller_1.superadminController.assignUser);
router.get('/invoices', superadmin_controller_1.superadminController.getInvoices);
router.post('/invoices', superadmin_controller_1.superadminController.createInvoice);
router.delete('/invoices/:id', superadmin_controller_1.superadminController.deleteInvoice);
exports.default = router;
