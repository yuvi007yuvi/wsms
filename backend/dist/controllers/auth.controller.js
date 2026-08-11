"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.login = void 0;
const bcrypt_1 = __importDefault(require("bcrypt"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const prisma_1 = __importDefault(require("../utils/prisma"));
const JWT_SECRET = process.env.JWT_SECRET || 'fallback-secret';
const login = async (req, res) => {
    try {
        const { username, password } = req.body;
        // First run initialization logic (creates an admin if no users exist)
        const userCount = await prisma_1.default.user.count();
        if (userCount === 0) {
            const hashedPassword = await bcrypt_1.default.hash('admin123', 10);
            await prisma_1.default.user.create({
                data: {
                    username: 'admin',
                    password: hashedPassword,
                    role: 'admin',
                    fullName: 'System Admin',
                    designation: 'Administrator'
                }
            });
            console.log('Created default admin user (admin / admin123)');
        }
        const user = await prisma_1.default.user.findUnique({
            where: { username },
            include: { project: true }
        });
        if (!user || !user.isActive) {
            res.status(401).json({ error: 'Invalid credentials or inactive account' });
            return;
        }
        if (user.project) {
            const now = new Date();
            if (user.project.subscriptionExpiry && now > new Date(user.project.subscriptionExpiry)) {
                if (user.project.isActive) {
                    // Auto-disable if expired
                    await prisma_1.default.project.update({
                        where: { id: user.project.id },
                        data: { isActive: false, disableReason: 'Your subscription has expired. Please contact support.' }
                    });
                }
                res.status(403).json({ success: false, message: 'Subscription Expired' });
                return;
            }
            if (!user.project.isActive) {
                // Just general disabled (e.g. by superadmin, not naturally expired just now)
                const reason = user.project.disableReason || 'Subscription Expired';
                res.status(403).json({ success: false, message: reason });
                return;
            }
        }
        const isValidPassword = await bcrypt_1.default.compare(password, user.password);
        if (!isValidPassword) {
            res.status(401).json({ error: 'Invalid credentials' });
            return;
        }
        const token = jsonwebtoken_1.default.sign({ id: user.id, username: user.username, role: user.role, projectId: user.projectId }, JWT_SECRET, { expiresIn: '12h' });
        // Audit log
        await prisma_1.default.auditLog.create({
            data: {
                action: 'LOGIN',
                userId: user.id,
            }
        });
        res.json({ token, user: { id: user.id, username: user.username, role: user.role, fullName: user.fullName, designation: user.designation, projectName: user.project?.name, subscriptionExpiry: user.project?.subscriptionExpiry } });
    }
    catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};
exports.login = login;
