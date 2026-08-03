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
dotenv_1.default.config();
const app = (0, express_1.default)();
const server = http_1.default.createServer(app);
const io = new socket_io_1.Server(server, {
    cors: {
        origin: '*',
    },
});
app.use((0, cors_1.default)({
    origin: process.env.FRONTEND_URL || '*',
}));
app.use(express_1.default.json());
const auth_routes_1 = __importDefault(require("./routes/auth.routes"));
const master_routes_1 = __importDefault(require("./routes/master.routes"));
const weighment_routes_1 = __importDefault(require("./routes/weighment.routes"));
const user_routes_1 = __importDefault(require("./routes/user.routes"));
const setting_routes_1 = __importDefault(require("./routes/setting.routes"));
const system_routes_1 = __importDefault(require("./routes/system.routes"));
// Routes will be added here
app.use('/api/auth', auth_routes_1.default);
app.use('/api/master', master_routes_1.default);
app.use('/api/weighment', weighment_routes_1.default);
app.use('/api/users', user_routes_1.default);
app.use('/api/settings', setting_routes_1.default);
app.use('/api/system', system_routes_1.default);
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
// Hardware weighbridge integration will be implemented here
// to read from the COM port and emit 'weight-update' events.
const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
