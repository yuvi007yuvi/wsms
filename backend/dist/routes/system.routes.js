"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const system_controller_1 = require("../controllers/system.controller");
const router = (0, express_1.Router)();
// Public route for health check
router.get('/health', system_controller_1.getSystemHealth);
exports.default = router;
