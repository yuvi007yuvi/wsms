"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.diagnoseWeighbridge = exports.installTools = exports.getSystemHealth = exports.forceSync = exports.getSyncStatusInfo = void 0;
const prisma_1 = __importDefault(require("../utils/prisma"));
const serialport_1 = require("serialport");
const child_process_1 = require("child_process");
const util_1 = __importDefault(require("util"));
const execPromise = util_1.default.promisify(child_process_1.exec);
const getSyncStatusInfo = async (req, res) => {
    try {
        const status = { isOnline: true, lastSyncTime: new Date(), pendingCount: 0 };
        // Also include project subscription status so frontend updates its timer dynamically
        let subscriptionExpiry = null;
        let isActive = true;
        if (req.user && req.user.id) {
            const user = await prisma_1.default.user.findUnique({
                where: { id: req.user.id },
                include: { project: true }
            });
            if (user?.project) {
                subscriptionExpiry = user.project.subscriptionExpiry;
                isActive = user.project.isActive;
            }
        }
        res.json({ ...status, subscriptionExpiry, isActive });
    }
    catch (error) {
        res.status(500).json({ error: 'Failed to fetch sync status' });
    }
};
exports.getSyncStatusInfo = getSyncStatusInfo;
const forceSync = async (req, res) => {
    try {
        // No-op for online-only mode
        res.json({ message: 'Sync triggered successfully' });
    }
    catch (error) {
        res.status(500).json({ error: 'Failed to trigger sync' });
    }
};
exports.forceSync = forceSync;
const getSystemHealth = async (req, res) => {
    try {
        // 1. Check Database Connections
        let dbStatus = 'disconnected';
        let cloudDbStatus = 'disconnected';
        try {
            await prisma_1.default.$queryRaw `SELECT 1`;
            dbStatus = 'connected';
        }
        catch (dbError) {
            dbStatus = 'error';
        }
        cloudDbStatus = dbStatus;
        // 2. Check Hardware (Serial Ports)
        let hardwareStatus = 'disconnected';
        let availablePorts = [];
        try {
            const ports = await serialport_1.SerialPort.list();
            availablePorts = ports;
            if (ports.length > 0) {
                hardwareStatus = 'connected';
            }
        }
        catch (hwError) {
            hardwareStatus = 'error';
        }
        // 3. System Stats
        const memoryUsage = process.memoryUsage();
        const memoryMb = Math.round((memoryUsage.heapUsed / 1024 / 1024) * 100) / 100;
        const uptime = process.uptime();
        // 4. External Dependencies Check
        const checkCommand = async (cmd) => {
            try {
                const { stdout } = await execPromise(cmd);
                return stdout.trim();
            }
            catch (e) {
                return null;
            }
        };
        const [npmVersion, pm2Version, gitVersion] = await Promise.all([
            checkCommand('npm -v'),
            checkCommand('pm2 -v'),
            checkCommand('git --version')
        ]);
        res.json({
            status: dbStatus === 'connected' ? 'healthy' : 'degraded',
            timestamp: new Date().toISOString(),
            components: {
                database: {
                    status: dbStatus,
                    message: dbStatus === 'connected' ? 'Database is online and responsive' : 'Failed to connect to database',
                },
                cloudDatabase: {
                    status: cloudDbStatus,
                    message: cloudDbStatus === 'connected' ? 'Cloud database is connected' : 'Cloud database unreachable',
                },
                hardware: {
                    status: hardwareStatus,
                    message: hardwareStatus === 'connected' ? `${availablePorts.length} COM port(s) detected` : 'No serial weighbridge connections found (Mock Mode Only)',
                    ports: availablePorts.map(p => p.path)
                },
                system: {
                    nodeVersion: process.version,
                    npmVersion: npmVersion || 'Not Installed',
                    pm2Version: pm2Version || 'Not Installed',
                    gitVersion: gitVersion || 'Not Installed',
                    memoryUsageMb: memoryMb,
                    uptimeSeconds: Math.floor(uptime)
                }
            }
        });
    }
    catch (error) {
        console.error('Health check error:', error);
        res.status(500).json({ error: 'Internal Server Error during health check' });
    }
};
exports.getSystemHealth = getSystemHealth;
const installTools = async (req, res) => {
    try {
        const checkCommand = async (cmd) => {
            try {
                await execPromise(cmd);
                return true;
            }
            catch (e) {
                return false;
            }
        };
        let installed = [];
        // Check and install PM2 if missing
        const hasPm2 = await checkCommand('pm2 -v');
        if (!hasPm2) {
            try {
                await execPromise('npm install -g pm2');
                installed.push('pm2');
            }
            catch (e) {
                console.error('Failed to install PM2', e);
            }
        }
        res.json({ message: 'Installation process completed', installed });
    }
    catch (error) {
        console.error('Install tools error:', error);
        res.status(500).json({ error: 'Failed to install tools' });
    }
};
exports.installTools = installTools;
const diagnoseWeighbridge = async (req, res) => {
    try {
        const { runDiagnostic, getWeighbridgeState } = require('../services/weighbridge.service');
        const state = getWeighbridgeState();
        const result = await runDiagnostic();
        // Also include port info from health check
        let ports = [];
        try {
            const portList = await serialport_1.SerialPort.list();
            ports = portList.map((p) => ({ path: p.path, manufacturer: p.manufacturer }));
        }
        catch (e) { }
        res.json({
            ...result,
            ports,
            connectionState: {
                isConnected: state.isConnected,
                lastWeight: state.lastWeight,
                lastStatus: state.lastStatus,
                portPath: state.portPath,
            }
        });
    }
    catch (error) {
        console.error('Diagnose weighbridge error:', error);
        res.status(500).json({
            dataReceived: false,
            message: `Diagnostic failed: ${error.message}`,
            samples: [],
            parsedWeights: [],
        });
    }
};
exports.diagnoseWeighbridge = diagnoseWeighbridge;
