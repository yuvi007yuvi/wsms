"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.deleteWeighmentSlip = exports.getWeighmentSlips = exports.createWeighmentSlip = void 0;
const prisma_1 = __importDefault(require("../utils/prisma"));
// Helper to generate unique slip number
const generateSlipNumber = async () => {
    const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const count = await prisma_1.default.weighmentSlip.count({
        where: {
            date: {
                gte: new Date(new Date().setHours(0, 0, 0, 0)),
                lte: new Date(new Date().setHours(23, 59, 59, 999))
            }
        }
    });
    const seq = String(count + 1).padStart(6, '0');
    const randomStr = Math.random().toString(36).substring(2, 5).toUpperCase();
    return `WS-${dateStr}-${seq}-${randomStr}`;
};
const createWeighmentSlip = async (req, res) => {
    try {
        const { vehicleId, materialId, sourceId, destinationId, grossWeight, remarks } = req.body;
        // Fetch vehicle for Tare Weight
        const vehicle = await prisma_1.default.vehicle.findUnique({
            where: { id: vehicleId },
            include: { vehicleType: true }
        });
        if (!vehicle) {
            res.status(400).json({ error: 'Vehicle not found' });
            return;
        }
        const tareWeight = vehicle.tareWeight || vehicle.vehicleType?.tareWeight || 0;
        const netWeight = grossWeight - tareWeight;
        if (netWeight < 0) {
            res.status(400).json({ error: 'Gross weight cannot be less than tare weight' });
            return;
        }
        const slipNumber = await generateSlipNumber();
        // @ts-ignore
        const slip = await prisma_1.default.weighmentSlip.create({
            data: {
                slipNumber,
                vehicleId,
                materialId,
                sourceId,
                destinationId,
                grossWeight,
                tareWeight,
                netWeight,
                // @ts-ignore
                operatorId: req.user.id, // from auth middleware
                remarks,
                // @ts-ignore
                projectId: req.user.projectId || null
            },
            include: {
                vehicle: true,
                material: true,
                source: true,
                destination: true,
                operator: true
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
        const slips = await prisma_1.default.weighmentSlip.findMany({
            include: {
                vehicle: true,
                material: true,
                source: true,
                destination: true,
                operator: true
            },
            orderBy: { createdAt: 'desc' }
        });
        res.json(slips);
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
