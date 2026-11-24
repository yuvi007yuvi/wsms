"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const prisma_1 = __importDefault(require("../utils/prisma"));
const auth_middleware_1 = require("../middleware/auth.middleware");
const checkSubscription_1 = require("../middleware/checkSubscription");
const master_controller_1 = require("../controllers/master.controller");
const router = (0, express_1.Router)();
// Apply auth middleware to all master routes
router.use(auth_middleware_1.authenticateToken, checkSubscription_1.checkSubscription);
router.get('/vehicles/deleted', async (req, res) => {
    console.log('GET /vehicles/deleted hit by user:', req.user);
    try {
        const data = await prisma_1.default.vehicle.findMany({
            where: { isActive: false },
            include: { vehicleType: { select: { id: true, name: true, tareWeight: true } } }
        });
        console.log('Found deleted vehicles:', data.length);
        res.json({ data, total: data.length });
    }
    catch (err) {
        console.error('Error in /vehicles/deleted:', err);
        res.status(500).json({ error: 'Failed to fetch deleted vehicles' });
    }
});
router.delete('/vehicles/:id/permanent', async (req, res) => {
    try {
        await prisma_1.default.vehicle.delete({ where: { id: req.params.id } });
        res.json({ success: true });
    }
    catch (err) {
        console.error('Error in permanent delete:', err);
        res.status(500).json({ error: 'Failed to permanently delete vehicle' });
    }
});
const setupRoutes = (path, controller) => {
    router.get(path, controller.getAll);
    router.get(`${path}/:id`, controller.getById);
    router.post(`${path}/bulk`, controller.createBulk);
    router.post(path, controller.create);
    router.put(`${path}/:id`, controller.update);
    router.delete(`${path}/:id`, controller.delete);
};
setupRoutes('/vehicles', master_controller_1.vehicleController);
setupRoutes('/vehicle-types', master_controller_1.vehicleTypeController);
setupRoutes('/materials', master_controller_1.materialController);
setupRoutes('/sources', master_controller_1.sourceController);
setupRoutes('/destinations', master_controller_1.destinationController);
exports.default = router;
