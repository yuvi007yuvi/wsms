"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_middleware_1 = require("../middleware/auth.middleware");
const checkSubscription_1 = require("../middleware/checkSubscription");
const weighment_controller_1 = require("../controllers/weighment.controller");
const router = (0, express_1.Router)();
// Allow offline sync endpoint
router.post('/sync-offline', weighment_controller_1.syncOfflineSlip);
router.use(auth_middleware_1.authenticateToken, checkSubscription_1.checkSubscription);
router.post('/', weighment_controller_1.createWeighmentSlip);
router.get('/summary', weighment_controller_1.getWeighmentSummary);
router.get('/vehicle-latest/:vehicleId', weighment_controller_1.getVehicleLatestSlip);
router.get('/', weighment_controller_1.getWeighmentSlips);
router.delete('/:id', weighment_controller_1.deleteWeighmentSlip);
exports.default = router;
