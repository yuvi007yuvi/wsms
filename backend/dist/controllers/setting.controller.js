"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.upsertRolePermission = exports.getRolePermissions = exports.updateSettings = exports.getSettings = void 0;
const prisma_1 = __importDefault(require("../utils/prisma"));
const getSettings = async (req, res) => {
    try {
        let setting = await prisma_1.default.setting.findFirst();
        // Create default setting if it doesn't exist
        if (!setting) {
            setting = await prisma_1.default.setting.create({
                data: {
                    companyName: 'Default Company Ltd',
                    address: '123 Main Street',
                }
            });
        }
        res.json(setting);
    }
    catch (error) {
        res.status(500).json({ error: 'Failed to fetch settings' });
    }
};
exports.getSettings = getSettings;
const updateSettings = async (req, res) => {
    try {
        const { id } = req.params;
        const { companyName, address, logoUrl, printerConfig, slipFormat, theme, mockMode } = req.body;
        const setting = await prisma_1.default.setting.update({
            where: { id: id },
            data: {
                companyName,
                address,
                logoUrl,
                printerConfig,
                slipFormat,
                theme,
                mockMode: mockMode === true
            }
        });
        res.json(setting);
    }
    catch (error) {
        res.status(400).json({ error: 'Failed to update settings' });
    }
};
exports.updateSettings = updateSettings;
const getRolePermissions = async (req, res) => {
    try {
        const permissions = await prisma_1.default.rolePermission.findMany();
        res.json(permissions);
    }
    catch (error) {
        res.status(500).json({ error: 'Failed to fetch role permissions' });
    }
};
exports.getRolePermissions = getRolePermissions;
const upsertRolePermission = async (req, res) => {
    try {
        const { role, allowedModules } = req.body;
        // allowedModules should be a stringified JSON array
        const permission = await prisma_1.default.rolePermission.upsert({
            where: { role },
            update: { allowedModules },
            create: { role, allowedModules }
        });
        res.json(permission);
    }
    catch (error) {
        res.status(400).json({ error: 'Failed to update role permissions' });
    }
};
exports.upsertRolePermission = upsertRolePermission;
