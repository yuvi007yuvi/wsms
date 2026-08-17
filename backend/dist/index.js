"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const dotenv_1 = __importDefault(require("dotenv"));
const http_1 = __importDefault(require("http"));
const socket_io_1 = require("socket.io");
const node_cron_1 = __importDefault(require("node-cron"));
const prisma_1 = __importDefault(require("./utils/prisma"));
const weighbridge_service_1 = require("./services/weighbridge.service");
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
const auth_routes_1 = __importDefault(require("./routes/auth.routes"));
const master_routes_1 = __importDefault(require("./routes/master.routes"));
const weighment_routes_1 = __importDefault(require("./routes/weighment.routes"));
const user_routes_1 = __importDefault(require("./routes/user.routes"));
const setting_routes_1 = __importDefault(require("./routes/setting.routes"));
const system_routes_1 = __importDefault(require("./routes/system.routes"));
const superadmin_routes_1 = __importDefault(require("./routes/superadmin.routes"));
// Routes will be added here
app.use('/api/auth', auth_routes_1.default);
app.use('/api/master', master_routes_1.default);
app.use('/api/weighment', weighment_routes_1.default);
app.use('/api/users', user_routes_1.default);
app.use('/api/settings', setting_routes_1.default);
app.use('/api/system', system_routes_1.default);
app.use('/api/superadmin', superadmin_routes_1.default);
app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date() });
});
// Socket.io for Real-time Weight Updates
io.on('connection', (socket) => {
    console.log('Client connected to weight stream');
    socket.on('disconnect', () => {
        console.log('Client disconnected');
    });
});
// Hardware weighbridge integration (via shared service)
(0, weighbridge_service_1.setupWeighbridge)(io);
const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
// Scheduled cron job to check subscription expirations every hour
node_cron_1.default.schedule('0 * * * *', async () => {
    console.log('Running subscription expiry check cron job...');
    try {
        const now = new Date();
        // Use raw query or updateMany if supported, but here we just find and update
        const expiredProjects = await prisma_1.default.project.findMany({
            where: {
                isActive: true,
                subscriptionExpiry: {
                    lte: now
                }
            }
        });
        if (expiredProjects.length > 0) {
            console.log(`Found ${expiredProjects.length} expired projects. Disabling them...`);
            for (const project of expiredProjects) {
                // Disable locally and in cloud (since it's online now)
                await prisma_1.default.project.update({
                    where: { id: project.id },
                    data: { isActive: false, disableReason: 'Your subscription has expired. Please contact support.' }
                });
                console.log(`Disabled project: ${project.name}`);
            }
        }
    }
    catch (error) {
        console.error('Error in subscription expiry cron job:', error);
    }
});
exports.default = app;
