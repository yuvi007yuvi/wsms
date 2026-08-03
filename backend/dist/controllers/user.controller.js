"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.deleteUser = exports.createUser = exports.getUsers = void 0;
const bcrypt_1 = __importDefault(require("bcrypt"));
const prisma_1 = __importDefault(require("../utils/prisma"));
const getUsers = async (req, res) => {
    try {
        const users = await prisma_1.default.user.findMany({
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
        });
        res.json(users);
    }
    catch (error) {
        res.status(500).json({ error: 'Failed to fetch users' });
    }
};
exports.getUsers = getUsers;
const createUser = async (req, res) => {
    try {
        const { username, password, role, fullName, designation } = req.body;
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
            },
            select: { id: true, username: true, role: true, isActive: true, fullName: true, designation: true }
        });
        res.status(201).json(user);
    }
    catch (error) {
        console.error(error);
        res.status(400).json({ error: 'Failed to create user' });
    }
};
exports.createUser = createUser;
const deleteUser = async (req, res) => {
    try {
        // Prevent deleting the main admin
        const id = req.params.id;
        const user = await prisma_1.default.user.findUnique({ where: { id } });
        if (user?.username === 'admin') {
            res.status(400).json({ error: 'Cannot delete the primary admin account' });
            return;
        }
        await prisma_1.default.user.delete({
            where: { id }
        });
        res.json({ success: true });
    }
    catch (error) {
        res.status(400).json({ error: 'Failed to delete user' });
    }
};
exports.deleteUser = deleteUser;
