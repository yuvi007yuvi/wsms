"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.deleteWeighmentSlip = exports.getWeighmentSlips = exports.createWeighmentSlip = void 0;
const prisma_1 = __importDefault(require("../utils/prisma"));
// Helper to generate unique slip number
const generateSlipNumber = async () => {
    const now = new Date();
    const dateStr = now.toISOString().slice(0, 10).replace(/-/g, '');
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const endOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
    const count = await prisma_1.default.weighmentSlip.count({
        where: {
            date: {
                gte: startOfDay,
                lte: endOfDay
            }
        }
    });
    const seq = String(count + 1).padStart(4, '0');
    const shortDate = dateStr.slice(2); // YYMMDD
    return `WS${shortDate}-${seq}`;
};
const createWeighmentSlip = async (req, res) => {
    try {
        const { vehicleId, vehicleTypeId, materialId, sourceId, destinationId, grossWeight, remarks, driverName, manualTareWeight } = req.body;
        // Run slip number generation and vehicle fetch IN PARALLEL
        const [slipNumber, vehicle] = await Promise.all([
            generateSlipNumber(),
            prisma_1.default.vehicle.findUnique({
                where: { id: vehicleId },
                select: {
                    id: true,
                    tareWeight: true,
                    vehicleType: { select: { tareWeight: true } }
                }
            })
        ]);
        if (!vehicle) {
            res.status(400).json({ error: 'Vehicle not found' });
            return;
        }
        let tareWeight = vehicle.tareWeight || vehicle.vehicleType?.tareWeight || 0;
        if (manualTareWeight !== undefined && manualTareWeight !== null && manualTareWeight !== '') {
            tareWeight = Number(manualTareWeight);
        }
        const netWeight = grossWeight - tareWeight;
        if (netWeight < 0) {
            res.status(400).json({ error: 'Gross weight cannot be less than tare weight' });
            return;
        }
        // @ts-ignore
        const slip = await prisma_1.default.weighmentSlip.create({
            data: {
                slipNumber,
                vehicleId,
                vehicleTypeId: vehicleTypeId && vehicleTypeId !== 'all' ? vehicleTypeId : null,
                materialId,
                sourceId,
                destinationId,
                grossWeight,
                tareWeight,
                netWeight,
                // @ts-ignore
                operatorId: req.user.id,
                remarks,
                driverName,
                // @ts-ignore
                projectId: req.user.projectId || null
            },
            select: {
                id: true,
                slipNumber: true,
                date: true,
                grossWeight: true,
                tareWeight: true,
                netWeight: true,
                remarks: true,
                driverName: true,
                createdAt: true,
                vehicle: { select: { id: true, vehicleNumber: true } },
                vehicleType: { select: { id: true, name: true } },
                material: { select: { id: true, name: true } },
                source: { select: { id: true, name: true } },
                destination: { select: { id: true, name: true } },
                operator: { select: { id: true, username: true } }
            }
        });
        res.status(201).json(slip);
    }
    catch (error) {
        console.error('Error creating weighment slip:', error);
        res.status(500).json({ error: 'Failed to create slip' });
    }
};
exports.createWeighmentSlip = createWeighmentSlip;
const getWeighmentSlips = async (req, res) => {
    try {
        const page = Math.max(1, parseInt(req.query.page) || 1);
        const limit = Math.max(1, Math.min(1000, parseInt(req.query.limit) || 10));
        const skip = (page - 1) * limit;
        const { search, dateFrom, dateTo } = req.query;
        let where = {};
        if (dateFrom || dateTo) {
            where.date = {};
            if (dateFrom)
                where.date.gte = new Date(dateFrom);
            if (dateTo) {
                const to = new Date(dateTo);
                to.setHours(23, 59, 59, 999);
                where.date.lte = to;
            }
        }
        if (search) {
            const q = String(search).toLowerCase();
            where.OR = [
                { slipNumber: { contains: q, mode: 'insensitive' } },
                { remarks: { contains: q, mode: 'insensitive' } },
                { vehicle: { vehicleNumber: { contains: q, mode: 'insensitive' } } },
                { material: { name: { contains: q, mode: 'insensitive' } } },
                { operator: { username: { contains: q, mode: 'insensitive' } } }
            ];
        }
        const [slips, total] = await Promise.all([
            prisma_1.default.weighmentSlip.findMany({
                where,
                skip,
                take: limit,
                select: {
                    id: true,
                    slipNumber: true,
                    date: true,
                    grossWeight: true,
                    tareWeight: true,
                    netWeight: true,
                    remarks: true,
                    driverName: true,
                    createdAt: true,
                    vehicleTypeId: true,
                    vehicleType: { select: { name: true } },
                    vehicle: {
                        select: { vehicleNumber: true, driverName: true, vehicleType: { select: { name: true } } }
                    },
                    material: { select: { name: true } },
                    source: { select: { name: true } },
                    destination: { select: { name: true } },
                    operator: { select: { username: true } }
                },
                orderBy: { createdAt: 'desc' }
            }),
            prisma_1.default.weighmentSlip.count({ where })
        ]);
        res.json({ data: slips, total });
    }
    catch (error) {
        res.status(500).json({ error: 'Failed to fetch slips' });
    }
};
exports.getWeighmentSlips = getWeighmentSlips;
const deleteWeighmentSlip = async (req, res) => {
    try {
        const { id } = req.params;
        // @ts-ignore
        if (req.user?.role !== 'admin') {
            res.status(403).json({ error: 'Only admins can delete slips' });
            return;
        }
        await prisma_1.default.weighmentSlip.delete({
            where: { id: id }
        });
        res.json({ success: true });
    }
    catch (error) {
        res.status(500).json({ error: 'Failed to delete slip' });
    }
};
exports.deleteWeighmentSlip = deleteWeighmentSlip;
