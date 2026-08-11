"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_middleware_1 = require("../middleware/auth.middleware");
const checkSubscription_1 = require("../middleware/checkSubscription");
const master_controller_1 = require("../controllers/master.controller");
const router = (0, express_1.Router)();
// Apply auth middleware to all master routes
router.use(auth_middleware_1.authenticateToken, checkSubscription_1.checkSubscription);
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
