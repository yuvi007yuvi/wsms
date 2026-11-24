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
                // @ts-ignore
                const authUser = req.user;
                const whereClause = { isActive: true };
                // For Source (Ward) and Destination (Work), isolate by project
                // Operators/admins of a project see their project's records OR legacy/Nature Green records (projectId: null)
                if (modelName === 'source' || modelName === 'destination') {
                    if (authUser?.role !== 'superadmin' && authUser?.projectId) {
                        whereClause.OR = [
                            { projectId: authUser.projectId },
                            { projectId: null }
                        ];
                    }
                    else if (req.query.projectId && req.query.projectId !== 'all') {
                        whereClause.projectId = req.query.projectId;
                    }
                }
                const [data, total] = await Promise.all([
                    // @ts-ignore
                    prisma_1.default[modelName].findMany({
                        where: whereClause,
                        skip,
                        take: limit,
                        orderBy: { createdAt: 'desc' }
                    }),
                    // @ts-ignore
                    prisma_1.default[modelName].count({ where: whereClause })
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
                // @ts-ignore
                const authUser = req.user;
                if (modelName === 'vehicle' || modelName === 'source' || modelName === 'destination') {
                    payload.projectId = authUser?.projectId || req.body.projectId || null;
                }
                // @ts-ignore
                const data = await prisma_1.default[modelName].create({
                    data: payload
                });
                res.status(201).json(data);
            }
            catch (error) {
                console.error(error);
                if (error.code === 'P2002') {
                    return res.status(400).json({ error: `This ${modelName} already exists or a unique constraint was violated.` });
                }
                res.status(400).json({ error: `Failed to create ${modelName}` });
            }
        },
        update: async (req, res) => {
            try {
                const payload = { ...req.body };
                // @ts-ignore
                const authUser = req.user;
                if (modelName === 'vehicle' || modelName === 'source' || modelName === 'destination') {
                    if (authUser?.role !== 'superadmin' && authUser?.projectId) {
                        payload.projectId = authUser.projectId;
                    }
                }
                // @ts-ignore
                const data = await prisma_1.default[modelName].update({
                    where: { id: req.params.id },
                    data: payload
                });
                res.json(data);
            }
            catch (error) {
                console.error(error);
                if (error.code === 'P2002') {
                    return res.status(400).json({ error: `This ${modelName} already exists or a unique constraint was violated.` });
                }
                res.status(400).json({ error: `Failed to update ${modelName}` });
            }
        },
        delete: async (req, res) => {
            try {
                // @ts-ignore
                await prisma_1.default[modelName].update({
                    where: { id: req.params.id },
                    data: { isActive: false }
                });
                res.json({ success: true });
            }
            catch (error) {
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
    create: async (req, res) => {
        try {
            const payload = { ...req.body };
            // @ts-ignore
            const authUser = req.user;
            // Allow passing explicit projectId if superadmin; otherwise default to logged in user's projectId
            if (authUser?.role === 'superadmin' && payload.projectId) {
                // keep provided payload.projectId
            }
            else {
                payload.projectId = authUser?.projectId || null;
            }
            const existing = await prisma_1.default.vehicle.findUnique({
                where: { vehicleNumber: payload.vehicleNumber }
            });
            if (existing) {
                if (!existing.isActive) {
                    const data = await prisma_1.default.vehicle.update({
                        where: { id: existing.id },
                        data: { ...payload, isActive: true },
                        include: {
                            project: { select: { id: true, name: true } },
                            vehicleType: { select: { id: true, name: true, tareWeight: true } }
                        }
                    });
                    return res.status(201).json(data);
                }
                else {
                    return res.status(400).json({ error: `Vehicle number ${payload.vehicleNumber} already exists.` });
                }
            }
            const data = await prisma_1.default.vehicle.create({
                data: payload,
                include: {
                    project: { select: { id: true, name: true } },
                    vehicleType: { select: { id: true, name: true, tareWeight: true } }
                }
            });
            res.status(201).json(data);
        }
        catch (error) {
            console.error(error);
            if (error.code === 'P2002') {
                return res.status(400).json({ error: `Vehicle number ${req.body.vehicleNumber} already exists or a unique constraint was violated.` });
            }
            res.status(400).json({ error: 'Failed to create vehicle' });
        }
    },
    update: async (req, res) => {
        try {
            const payload = { ...req.body };
            // @ts-ignore
            const authUser = req.user;
            if (authUser?.role !== 'superadmin' && authUser?.projectId) {
                payload.projectId = authUser.projectId;
            }
            const data = await prisma_1.default.vehicle.update({
                where: { id: req.params.id },
                data: payload,
                include: {
                    project: { select: { id: true, name: true } },
                    vehicleType: { select: { id: true, name: true, tareWeight: true } }
                }
            });
            res.json(data);
        }
        catch (error) {
            console.error(error);
            if (error.code === 'P2002') {
                return res.status(400).json({ error: `Vehicle number ${req.body.vehicleNumber} already exists in the system (it may be inactive/deleted).` });
            }
            res.status(400).json({ error: 'Failed to update vehicle' });
        }
    },
    getAll: async (req, res) => {
        try {
            const page = parseInt(req.query.page) || 1;
            const limit = parseInt(req.query.limit) || 10;
            const search = req.query.search;
            const projectIdQuery = req.query.projectId;
            // @ts-ignore
            const authUser = req.user;
            const skip = (page - 1) * limit;
            const isActiveParam = req.query.isActive;
            const isActiveFilter = String(isActiveParam) === 'false' ? false : true;
            const whereClause = { isActive: isActiveFilter };
            // Apply project isolation
            // Vehicles belonging to the user's project OR global vehicles (projectId: null)
            if (authUser?.role !== 'superadmin' && authUser?.projectId) {
                if (projectIdQuery === 'unassigned') {
                    whereClause.projectId = null;
                }
                else {
                    whereClause.OR = [
                        { projectId: authUser.projectId },
                        { projectId: null }
                    ];
                }
            }
            else if (projectIdQuery && projectIdQuery !== 'all') {
                if (projectIdQuery === 'unassigned' || projectIdQuery === 'null') {
                    whereClause.projectId = null;
                }
                else {
                    whereClause.projectId = projectIdQuery;
                }
            }
            if (search) {
                const searchCondition = [
                    { vehicleNumber: { contains: search } },
                    { driverName: { contains: search } },
                    { owner: { contains: search } }
                ];
                if (whereClause.OR) {
                    whereClause.AND = [
                        { OR: whereClause.OR },
                        { OR: searchCondition }
                    ];
                    delete whereClause.OR;
                }
                else {
                    whereClause.OR = searchCondition;
                }
            }
            const [data, total] = await Promise.all([
                prisma_1.default.vehicle.findMany({
                    where: whereClause,
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
                        projectId: true,
                        project: { select: { id: true, name: true } },
                        createdAt: true,
                        vehicleType: { select: { id: true, name: true, tareWeight: true } }
                    }
                }),
                prisma_1.default.vehicle.count({ where: whereClause })
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
            // @ts-ignore
            const authUser = req.user;
            const targetProjectId = authUser?.projectId || req.body.projectId || null;
            if (req.body.isDefault) {
                // @ts-ignore
                await prisma_1.default.destination.updateMany({
                    // @ts-ignore
                    where: (targetProjectId ? { projectId: targetProjectId } : {}),
                    data: { isDefault: false }
                });
            }
            // @ts-ignore
            const data = await prisma_1.default.destination.create({
                data: {
                    ...req.body,
                    projectId: targetProjectId
                }
            });
            res.status(201).json(data);
        }
        catch (error) {
            console.error(error);
            res.status(400).json({ error: 'Failed to create destination' });
        }
    },
    update: async (req, res) => {
        try {
            // @ts-ignore
            const authUser = req.user;
            const targetProjectId = authUser?.projectId || req.body.projectId || null;
            if (req.body.isDefault) {
                // @ts-ignore
                await prisma_1.default.destination.updateMany({
                    // @ts-ignore
                    where: (targetProjectId ? { projectId: targetProjectId } : {}),
                    data: { isDefault: false }
                });
            }
            // @ts-ignore
            const data = await prisma_1.default.destination.update({
                where: { id: req.params.id },
                data: {
                    ...req.body,
                    ...(targetProjectId && authUser?.role !== 'superadmin' ? { projectId: targetProjectId } : {})
                }
            });
            res.json(data);
        }
        catch (error) {
            console.error(error);
            res.status(400).json({ error: 'Failed to update destination' });
        }
    }
};
