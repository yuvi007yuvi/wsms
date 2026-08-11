"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.superadminController = void 0;
const prisma_1 = __importDefault(require("../utils/prisma"));
exports.superadminController = {
    getStats: async (req, res) => {
        try {
            const projectsCount = await prisma_1.default.project.count();
            const vehiclesCount = await prisma_1.default.vehicle.count();
            const slipsCount = await prisma_1.default.weighmentSlip.count();
            res.json({ projects: projectsCount, vehicles: vehiclesCount, slips: slipsCount });
        }
        catch (error) {
            console.error(error);
            res.status(500).json({ error: 'Failed to fetch stats' });
        }
    },
    getAllProjects: async (req, res) => {
        try {
            const projects = await prisma_1.default.project.findMany({
                include: {
                    _count: {
                        select: { vehicles: true, weighmentSlips: true }
                    },
                    users: {
                        select: { id: true, username: true, fullName: true }
                    }
                },
                orderBy: { createdAt: 'desc' }
            });
            res.json(projects);
        }
        catch (error) {
            console.error(error);
            res.status(500).json({ error: 'Failed to fetch projects' });
        }
    },
    createProject: async (req, res) => {
        try {
            const { name, subscriptionExpiry, isActive, address } = req.body;
            const project = await prisma_1.default.project.create({
                data: {
                    name,
                    address,
                    subscriptionExpiry: subscriptionExpiry ? new Date(subscriptionExpiry) : null,
                    isActive: isActive !== undefined ? isActive : true
                }
            });
            res.status(201).json(project);
        }
        catch (error) {
            console.error(error);
            res.status(400).json({ error: 'Failed to create project' });
        }
    },
    updateProject: async (req, res) => {
        try {
            const { name, subscriptionExpiry, isActive, disableReason, address } = req.body;
            const project = await prisma_1.default.project.update({
                where: { id: req.params.id },
                data: {
                    name,
                    address: address,
                    subscriptionExpiry: subscriptionExpiry ? new Date(subscriptionExpiry) : null,
                    isActive,
                    disableReason: isActive === false ? disableReason : null
                }
            });
            res.json(project);
        }
        catch (error) {
            console.error(error);
            res.status(400).json({ error: 'Failed to update project' });
        }
    },
    createProjectAdmin: async (req, res) => {
        try {
            const { projectId } = req.params;
            const { username, password, fullName, designation } = req.body;
            const existing = await prisma_1.default.user.findUnique({ where: { username } });
            if (existing) {
                return res.status(400).json({ error: 'Username already exists globally' });
            }
            const bcrypt = require('bcrypt');
            const hashedPassword = await bcrypt.hash(password, 10);
            const user = await prisma_1.default.user.create({
                data: {
                    username,
                    password: hashedPassword,
                    fullName,
                    designation: designation,
                    role: 'admin',
                    projectId: projectId
                }
            });
            res.status(201).json({ id: user.id, username: user.username, role: user.role });
        }
        catch (error) {
            console.error(error);
            res.status(400).json({ error: 'Failed to create project admin' });
        }
    },
    getUsers: async (req, res) => {
        try {
            const users = await prisma_1.default.user.findMany({
                where: { role: { not: 'superadmin' } },
                select: { id: true, username: true, fullName: true, role: true, projectId: true },
                orderBy: { username: 'asc' }
            });
            res.json(users);
        }
        catch (error) {
            console.error(error);
            res.status(500).json({ error: 'Failed to fetch users' });
        }
    },
    assignUser: async (req, res) => {
        try {
            const { projectId } = req.params;
            const { userId } = req.body;
            const user = await prisma_1.default.user.update({
                where: { id: userId },
                data: { projectId: projectId }
            });
            res.json({ success: true, user });
        }
        catch (error) {
            console.error(error);
            res.status(400).json({ error: 'Failed to assign user' });
        }
    },
    getInvoices: async (req, res) => {
        try {
            const invoices = await prisma_1.default.invoice.findMany({
                include: { items: true, project: { select: { name: true } } },
                orderBy: { createdAt: 'desc' }
            });
            res.json(invoices);
        }
        catch (error) {
            console.error(error);
            res.status(500).json({ error: 'Failed to fetch invoices' });
        }
    },
    createInvoice: async (req, res) => {
        try {
            const { invoiceNumber, date, projectId, clientName, clientAddress, clientPhone, subtotal, taxRate, total, items } = req.body;
            const invoice = await prisma_1.default.invoice.create({
                data: {
                    invoiceNumber,
                    date: new Date(date),
                    projectId: projectId || null,
                    clientName,
                    clientAddress,
                    clientPhone,
                    subtotal,
                    taxRate,
                    total,
                    items: {
                        create: items.map((item) => ({
                            description: item.description,
                            quantity: item.quantity,
                            price: item.price
                        }))
                    }
                },
                include: { items: true }
            });
            res.status(201).json(invoice);
        }
        catch (error) {
            console.error(error);
            res.status(400).json({ error: 'Failed to create invoice' });
        }
    },
    deleteInvoice: async (req, res) => {
        try {
            const { id } = req.params;
            // Need to delete items first since cascade delete might not be set up
            await prisma_1.default.invoiceItem.deleteMany({
                where: { invoiceId: id }
            });
            await prisma_1.default.invoice.delete({
                where: { id: id }
            });
            res.json({ success: true });
        }
        catch (error) {
            console.error(error);
            res.status(500).json({ error: 'Failed to delete invoice' });
        }
    }
};
