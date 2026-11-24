"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const dotenv_1 = __importDefault(require("dotenv"));
const http_1 = __importDefault(require("http"));
const path_1 = __importDefault(require("path"));
const socket_io_1 = require("socket.io");
const node_cron_1 = __importDefault(require("node-cron"));
const prisma_1 = __importDefault(require("./utils/prisma"));
const weighbridge_service_1 = require("./services/weighbridge.service");
const sync_service_1 = require("./services/sync.service");
dotenv_1.default.config();
const app = (0, express_1.default)();
const server = http_1.default.createServer(app);
const io = new socket_io_1.Server(server, {
    cors: {
        origin: '*',
    },
});
app.use((0, cors_1.default)({
    origin: '*'
}));
app.use(express_1.default.json());
// Serve built frontend assets if running offline on local machine
const fs_1 = __importDefault(require("fs"));
const candidateFrontendPaths = [
    path_1.default.join(__dirname, '../../frontend/dist'),
    path_1.default.join(__dirname, '../public/frontend_dist'),
    path_1.default.join(__dirname, 'public/frontend_dist')
];
const frontendDist = candidateFrontendPaths.find(p => fs_1.default.existsSync(p)) || candidateFrontendPaths[0];
app.use(express_1.default.static(frontendDist));
const auth_routes_1 = __importDefault(require("./routes/auth.routes"));
const master_routes_1 = __importDefault(require("./routes/master.routes"));
const weighment_routes_1 = __importDefault(require("./routes/weighment.routes"));
const user_routes_1 = __importDefault(require("./routes/user.routes"));
const setting_routes_1 = __importDefault(require("./routes/setting.routes"));
const system_routes_1 = __importDefault(require("./routes/system.routes"));
const superadmin_routes_1 = __importDefault(require("./routes/superadmin.routes"));
const dashboard_routes_1 = __importDefault(require("./routes/dashboard.routes"));
const external_routes_1 = __importDefault(require("./routes/external.routes"));
// Routes will be added here
app.use('/api/auth', auth_routes_1.default);
app.use('/api/master', master_routes_1.default);
app.use('/api/weighment', weighment_routes_1.default);
app.use('/api/users', user_routes_1.default);
app.use('/api/settings', setting_routes_1.default);
app.use('/api/system', system_routes_1.default);
app.use('/api/superadmin', superadmin_routes_1.default);
app.use('/api/dashboard', dashboard_routes_1.default);
app.use('/api/external', external_routes_1.default);
app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date() });
});
// Root route for ping services like cron-job.org
app.get('/', (req, res, next) => {
    const indexPath = path_1.default.join(frontendDist, 'index.html');
    res.sendFile(indexPath, (err) => {
        if (err) {
            res.json({ status: 'ok', timestamp: new Date(), message: 'WSMS API is running' });
        }
    });
});
// Socket.io for Real-time Weight Updates
io.on('connection', (socket) => {
    console.log('Client connected to weight stream');
    // Allow local agent running on physical machine PC to ingest weight
    socket.on('agent-weight-feed', (data) => {
        if (typeof data?.weight === 'number') {
            (0, weighbridge_service_1.markAgentSeen)(data.weight);
            io.emit('weight-update', {
                weight: data.weight,
                status: data.status || 'Stable'
            });
        }
    });
    // Agent heartbeat: COM ports, open port, raw samples (used by Diagnostics)
    socket.on('agent-status', (state) => {
        if (state && typeof state === 'object')
            (0, weighbridge_service_1.updateAgentStatus)(state);
    });
    socket.on('disconnect', () => {
        console.log('Client disconnected');
    });
});
// Hardware weighbridge integration (via shared service)
(0, weighbridge_service_1.setupWeighbridge)(io);
// Run initial data migrations/backfills on startup
(async () => {
    try {
        // Find Nature Green project to associate legacy records with
        const natureGreenProject = await prisma_1.default.project.findFirst({
            where: {
                OR: [
                    { name: { contains: 'Nature', mode: 'insensitive' } },
                    { name: { contains: 'Green', mode: 'insensitive' } }
                ]
            }
        });
        if (natureGreenProject) {
            // 1. Backfill legacy Sources (Wards) without a projectId to Nature Green
            const updatedSources = await prisma_1.default.source.updateMany({
                where: { projectId: null },
                data: { projectId: natureGreenProject.id }
            });
            if (updatedSources.count > 0) {
                console.log(`Backfilled ${updatedSources.count} legacy sources (wards) to Nature Green (${natureGreenProject.name})`);
            }
            // 2. Backfill legacy Destinations (Works) without a projectId to Nature Green
            const updatedDestinations = await prisma_1.default.destination.updateMany({
                where: { projectId: null },
                data: { projectId: natureGreenProject.id }
            });
            if (updatedDestinations.count > 0) {
                console.log(`Backfilled ${updatedDestinations.count} legacy destinations (works) to Nature Green (${natureGreenProject.name})`);
            }
        }
    }
    catch (migErr) {
        console.error('Error during startup project separation backfill:', migErr);
    }
})();
const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
    if (process.env.IS_OFFLINE_NODE === 'true') {
        (0, sync_service_1.startOfflineSyncWorker)();
    }
});
// Scheduled cron job to check subscription expirations every hour
node_cron_1.default.schedule('0 * * * *', async () => {
    console.log('Running subscription expiry check cron job...');
    try {
        const now = new Date();
        // Single updateMany instead of find + loop
        const result = await prisma_1.default.project.updateMany({
            where: {
                isActive: true,
                subscriptionExpiry: {
                    lte: now
                }
            },
            data: { isActive: false, disableReason: 'Your subscription has expired. Please contact support.' }
        });
        if (result.count > 0) {
            console.log(`Disabled ${result.count} expired projects.`);
        }
    }
    catch (error) {
        console.error('Error in subscription expiry cron job:', error);
    }
});
exports.default = app;
