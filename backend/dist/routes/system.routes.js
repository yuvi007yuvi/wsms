"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const system_controller_1 = require("../controllers/system.controller");
const auth_middleware_1 = require("../middleware/auth.middleware");
const checkSubscription_1 = require("../middleware/checkSubscription");
const router = (0, express_1.Router)();
// Public route for health check
router.get('/health', system_controller_1.getSystemHealth);
router.post('/install-tools', system_controller_1.installTools);
router.get('/diagnose-weighbridge', system_controller_1.diagnoseWeighbridge);
router.get('/sync-status', auth_middleware_1.authenticateToken, checkSubscription_1.checkSubscription, system_controller_1.getSyncStatusInfo);
router.post('/sync-force', auth_middleware_1.authenticateToken, checkSubscription_1.checkSubscription, system_controller_1.forceSync);
exports.default = router;
