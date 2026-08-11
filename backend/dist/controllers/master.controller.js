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
                // @ts-ignore
                const data = await prisma_1.default[modelName].findMany({
                    orderBy: { createdAt: 'desc' }
                });
                res.json(data);
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
                let count = 0;
                for (const item of req.body.items) {
                    try {
                        // @ts-ignore
                        await prisma_1.default[modelName].create({ data: item });
                        count++;
                    }
                    catch (e) {
                        // Ignore unique constraint violations (duplicates)
                        if (e.code !== 'P2002')
                            throw e;
                    }
                }
                res.status(201).json({ success: true, count });
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
            const data = await prisma_1.default.vehicle.findMany({
                orderBy: { createdAt: 'desc' },
                include: { vehicleType: true }
            });
            res.json(data);
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
            let count = 0;
            for (const vehicle of req.body.vehicles) {
                try {
                    await prisma_1.default.vehicle.create({ data: vehicle });
                    count++;
                }
                catch (e) {
                    // Ignore unique constraint violations (duplicates)
                    if (e.code !== 'P2002')
                        throw e;
                }
            }
            res.status(201).json({ success: true, count });
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
