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
router.get('/download-agent', (req, res) => {
    const path = require('path');
    const agentPath = path.join(__dirname, '../../scripts/weighbridge_agent.js');
    res.download(agentPath, 'weighbridge_agent.js');
});
router.get('/download-agent-bat', (req, res) => {
    const path = require('path');
    const batPath = path.join(__dirname, '../../scripts/start_agent.bat');
    res.download(batPath, 'start_agent.bat');
});
router.get('/download-desktop-launcher', (req, res) => {
    const path = require('path');
    const launcherPath = path.join(__dirname, '../../../LAUNCH_WINDOWS_APP.bat');
    res.download(launcherPath, 'LAUNCH_WINDOWS_APP.bat');
});
router.get('/download-offline-package', (req, res) => {
    const path = require('path');
    const fs = require('fs');
    const zipPath = path.join(__dirname, '../../public/WSMS_Offline_Package.zip');
    if (fs.existsSync(zipPath)) {
        res.download(zipPath, 'WSMS_Offline_Package.zip');
    }
    else {
        const launcherPath = path.join(__dirname, '../../../START_OFFLINE_WSMS.bat');
        res.download(launcherPath, 'START_OFFLINE_WSMS.bat');
    }
});
router.get('/sync-status', auth_middleware_1.authenticateToken, checkSubscription_1.checkSubscription, system_controller_1.getSyncStatusInfo);
router.post('/sync-force', auth_middleware_1.authenticateToken, checkSubscription_1.checkSubscription, system_controller_1.forceSync);
exports.default = router;
