import { Router } from 'express';
import { getSystemHealth, getSyncStatusInfo, forceSync, installTools, diagnoseWeighbridge } from '../controllers/system.controller';
import { authenticateToken } from '../middleware/auth.middleware';
import { checkSubscription } from '../middleware/checkSubscription';

const router = Router();

// Public route for health check
router.get('/health', getSystemHealth);
router.post('/install-tools', installTools);
router.get('/diagnose-weighbridge', diagnoseWeighbridge);
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
router.get('/download-offline-launcher', (req, res) => {
  const path = require('path');
  const launcherPath = path.join(__dirname, '../../../START_OFFLINE_WSMS.bat');
  res.download(launcherPath, 'START_OFFLINE_WSMS.bat');
});
router.get('/download-offline-package', (req, res) => {
  const path = require('path');
  const fs = require('fs');
  // Send the launcher script with quick instructions
  const launcherPath = path.join(__dirname, '../../../START_OFFLINE_WSMS.bat');
  res.download(launcherPath, 'START_OFFLINE_WSMS.bat');
});
router.get('/sync-status', authenticateToken, checkSubscription, getSyncStatusInfo);
router.post('/sync-force', authenticateToken, checkSubscription, forceSync);

export default router;
