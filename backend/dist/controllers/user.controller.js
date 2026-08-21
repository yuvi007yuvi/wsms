"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.deleteUser = exports.updateUser = exports.createUser = exports.getUsers = void 0;
const bcrypt_1 = __importDefault(require("bcrypt"));
const prisma_1 = __importDefault(require("../utils/prisma"));
const getUsers = async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const skip = (page - 1) * limit;
        const [users, total] = await Promise.all([
            prisma_1.default.user.findMany({
                skip,
                take: limit,
                where: {
                    role: { not: 'superadmin' },
                    isActive: true
                },
                select: {
                    id: true,
                    username: true,
                    fullName: true,
                    designation: true,
                    role: true,
                    isActive: true,
                    createdAt: true,
                },
                orderBy: { createdAt: 'desc' }
            }),
            prisma_1.default.user.count({
                where: {
                    role: { not: 'superadmin' },
                    isActive: true
                }
            })
        ]);
        res.json({ data: users, total });
    }
    catch (error) {
        res.status(500).json({ error: 'Failed to fetch users' });
    }
};
exports.getUsers = getUsers;
const createUser = async (req, res) => {
    try {
        const { username, password, role, fullName, designation } = req.body;
        if (role === 'superadmin') {
            res.status(403).json({ error: 'Cannot create superadmin from this endpoint' });
            return;
        }
        const existing = await prisma_1.default.user.findUnique({ where: { username } });
        if (existing) {
            res.status(400).json({ error: 'Username already exists' });
            return;
        }
        const hashedPassword = await bcrypt_1.default.hash(password, 10);
        const user = await prisma_1.default.user.create({
            data: {
                username,
                password: hashedPassword,
                fullName,
                designation,
                role: role || 'operator'
            }
        });
        // Remove password before returning
        const { password: _, ...userWithoutPassword } = user;
        res.status(201).json(userWithoutPassword);
    }
    catch (error) {
        console.error(error);
        res.status(400).json({ error: 'Failed to create user' });
    }
};
exports.createUser = createUser;
const updateUser = async (req, res) => {
    try {
        const id = req.params.id;
        const { username, password, role, fullName, designation, projectId } = req.body;
        const authUser = req.user;
        const existing = await prisma_1.default.user.findUnique({ where: { id } });
        if (!existing) {
            res.status(404).json({ error: 'User not found' });
            return;
        }
        if (existing.role === 'superadmin' && authUser?.role !== 'superadmin') {
            res.status(403).json({ error: 'Cannot modify superadmin account' });
            return;
        }
        let hashedPassword = existing.password;
        if (password && password.trim() !== '') {
            hashedPassword = await bcrypt_1.default.hash(password, 10);
        }
        const dataToUpdate = {
            username,
            password: hashedPassword,
            fullName,
            designation,
            role
        };
        if (authUser?.role === 'superadmin' && projectId !== undefined) {
            dataToUpdate.projectId = projectId || null;
        }
        const user = await prisma_1.default.user.update({
            where: { id },
            data: dataToUpdate
        });
        const { password: _, ...userWithoutPassword } = user;
        res.json(userWithoutPassword);
    }
    catch (error) {
        console.error(error);
        res.status(400).json({ error: 'Failed to update user' });
    }
};
exports.updateUser = updateUser;
const deleteUser = async (req, res) => {
    try {
        // Prevent deleting the main admin
        const id = req.params.id;
        const user = await prisma_1.default.user.findUnique({ where: { id } });
        if (user?.username === 'admin') {
            res.status(400).json({ error: 'Cannot delete the primary admin account' });
            return;
        }
        if (user?.role === 'superadmin') {
            res.status(403).json({ error: 'Cannot delete superadmin accounts' });
            return;
        }
        await prisma_1.default.user.update({
            where: { id },
            data: { isActive: false }
        });
        res.json({ success: true });
    }
    catch (error) {
        res.status(400).json({ error: 'Failed to delete user' });
    }
};
exports.deleteUser = deleteUser;
