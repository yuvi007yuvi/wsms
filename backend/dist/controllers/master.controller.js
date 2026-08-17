"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.destinationController = exports.sourceController = exports.materialController = exports.vehicleTypeController = exports.vehicleController = void 0;
const prisma_1 = __importDefault(require("../utils/prisma"));
// Helper for generating CRUD handlers
const createCrudHandlers = (modelName) => {
    return {
        getAll: async (req, res) => {
            try {
                const page = parseInt(req.query.page) || 1;
                const limit = parseInt(req.query.limit) || 10;
                const skip = (page - 1) * limit;
                const [data, total] = await Promise.all([
                    // @ts-ignore
                    prisma_1.default[modelName].findMany({
                        skip,
                        take: limit,
                        orderBy: { createdAt: 'desc' }
                    }),
                    // @ts-ignore
                    prisma_1.default[modelName].count()
                ]);
                res.json({ data, total });
            }
            catch (error) {
                res.status(500).json({ error: `Failed to fetch ${modelName}s` });
            }
        },
        getById: async (req, res) => {
            try {
                // @ts-ignore
                const data = await prisma_1.default[modelName].findUnique({
                    where: { id: req.params.id }
                });
                if (data)
                    res.json(data);
                else
                    res.status(404).json({ error: 'Not found' });
            }
            catch (error) {
                res.status(500).json({ error: 'Server error' });
            }
        },
        create: async (req, res) => {
            try {
                const payload = { ...req.body };
                if (modelName === 'vehicle') {
                    // @ts-ignore
                    payload.projectId = req.user?.projectId || null;
                }
                // @ts-ignore
                const data = await prisma_1.default[modelName].create({
                    data: payload
                });
                res.status(201).json(data);
            }
            catch (error) {
                console.error(error);
                res.status(400).json({ error: `Failed to create ${modelName}` });
            }
        },
        update: async (req, res) => {
            try {
                const payload = { ...req.body };
                if (modelName === 'vehicle') {
                    // @ts-ignore
                    payload.projectId = req.user?.projectId || null;
                }
                // @ts-ignore
                const data = await prisma_1.default[modelName].update({
                    where: { id: req.params.id },
                    data: payload
                });
                res.json(data);
            }
            catch (error) {
                res.status(400).json({ error: `Failed to update ${modelName}` });
            }
        },
        delete: async (req, res) => {
            try {
                // @ts-ignore
                await prisma_1.default[modelName].delete({
                    where: { id: req.params.id }
                });
                res.json({ success: true });
            }
            catch (error) {
                if (error.code === 'P2003') {
                    return res.status(400).json({ error: `Cannot delete: This ${modelName} is already used in weighment slips.` });
                }
                res.status(400).json({ error: `Failed to delete ${modelName}` });
            }
        },
        createBulk: async (req, res) => {
            try {
                if (!req.body.items || !Array.isArray(req.body.items)) {
                    return res.status(400).json({ error: 'Invalid data format. Expected { items: [] }' });
                }
                // @ts-ignore
                const result = await prisma_1.default[modelName].createMany({
                    data: req.body.items,
                    skipDuplicates: true,
                });
                res.status(201).json({ success: true, count: result.count });
            }
            catch (error) {
                console.error(`Bulk import error for ${modelName}:`, error);
                res.status(400).json({ error: `Failed to bulk import ${modelName}s` });
            }
        }
    };
};
exports.vehicleController = {
    ...createCrudHandlers('vehicle'),
    getAll: async (req, res) => {
        try {
            const page = parseInt(req.query.page) || 1;
            const limit = parseInt(req.query.limit) || 10;
            const skip = (page - 1) * limit;
            const [data, total] = await Promise.all([
                prisma_1.default.vehicle.findMany({
                    skip,
                    take: limit,
                    orderBy: { createdAt: 'desc' },
                    select: {
                        id: true,
                        vehicleNumber: true,
                        driverName: true,
                        mobile: true,
                        owner: true,
                        tareWeight: true,
                        isActive: true,
                        createdAt: true,
                        vehicleType: { select: { id: true, name: true, tareWeight: true } }
                    }
                }),
                prisma_1.default.vehicle.count()
            ]);
            res.json({ data, total });
        }
        catch (error) {
            res.status(500).json({ error: 'Failed to fetch vehicles' });
        }
    },
    createBulk: async (req, res) => {
        try {
            if (!req.body.vehicles || !Array.isArray(req.body.vehicles)) {
                return res.status(400).json({ error: 'Invalid data format. Expected { vehicles: [] }' });
            }
            const result = await prisma_1.default.vehicle.createMany({
                data: req.body.vehicles,
                skipDuplicates: true
            });
            res.status(201).json({ success: true, count: result.count });
        }
        catch (error) {
            console.error('Bulk import error:', error);
            res.status(400).json({ error: 'Failed to bulk import vehicles' });
        }
    }
};
exports.vehicleTypeController = createCrudHandlers('vehicleType');
exports.materialController = createCrudHandlers('material');
exports.sourceController = createCrudHandlers('source');
exports.destinationController = {
    ...createCrudHandlers('destination'),
    create: async (req, res) => {
        try {
            if (req.body.isDefault) {
                // @ts-ignore
                await prisma_1.default.destination.updateMany({ data: { isDefault: false } });
            }
            // @ts-ignore
            const data = await prisma_1.default.destination.create({ data: req.body });
            res.status(201).json(data);
        }
        catch (error) {
            console.error(error);
            res.status(400).json({ error: 'Failed to create destination' });
        }
    },
    update: async (req, res) => {
        try {
            if (req.body.isDefault) {
                // @ts-ignore
                await prisma_1.default.destination.updateMany({ data: { isDefault: false } });
            }
            // @ts-ignore
            const data = await prisma_1.default.destination.update({
                where: { id: req.params.id },
                data: req.body
            });
            res.json(data);
        }
        catch (error) {
            console.error(error);
            res.status(400).json({ error: 'Failed to update destination' });
        }
    }
};
