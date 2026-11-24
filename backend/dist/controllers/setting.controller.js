"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.upsertRolePermission = exports.getRolePermissions = exports.updateSettings = exports.getSettings = void 0;
const prisma_1 = __importDefault(require("../utils/prisma"));
const getSettings = async (req, res) => {
    try {
        // @ts-ignore
        const user = req.user;
        const userProjectHeader = req.headers['x-project-name'];
        // Resolve project identifier
        let projectKey = user?.projectId ? `proj_${user.projectId}` : null;
        if (!projectKey && userProjectHeader) {
            const clean = userProjectHeader.trim().toLowerCase().replace(/[^a-z0-9]/g, '_');
            projectKey = `proj_${clean}`;
        }
        let setting = null;
        if (projectKey) {
            setting = await prisma_1.default.setting.findFirst({
                where: { id: projectKey }
            });
        }
        if (!setting) {
            setting = await prisma_1.default.setting.findFirst({
                where: { id: { not: { startsWith: 'proj_' } } }
            });
        }
        // Create default setting if it doesn't exist
        if (!setting) {
            setting = await prisma_1.default.setting.create({
                data: {
                    id: projectKey || undefined,
                    companyName: '',
                    address: '',
                    allowManualWeight: false
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
        // @ts-ignore
        const user = req.user;
        const userProjectHeader = req.headers['x-project-name'];
        const { companyName, address, logoUrl, printerConfig, slipFormat, theme, mockMode, allowManualWeight } = req.body;
        // Resolve project identifier
        let targetId = user?.projectId ? `proj_${user.projectId}` : null;
        if (!targetId && userProjectHeader) {
            const clean = userProjectHeader.trim().toLowerCase().replace(/[^a-z0-9]/g, '_');
            targetId = `proj_${clean}`;
        }
        if (!targetId) {
            targetId = String(id || 'default_setting');
        }
        const setting = await prisma_1.default.setting.upsert({
            where: { id: targetId },
            update: {
                companyName: companyName !== undefined ? companyName : '',
                address: address !== undefined ? address : '',
                logoUrl,
                printerConfig,
                slipFormat,
                theme,
                mockMode: mockMode === true,
                allowManualWeight: allowManualWeight !== undefined ? allowManualWeight === true : undefined
            },
            create: {
                id: targetId,
                companyName: companyName !== undefined ? companyName : '',
                address: address !== undefined ? address : '',
                logoUrl,
                printerConfig,
                slipFormat,
                theme,
                mockMode: mockMode === true,
                allowManualWeight: allowManualWeight !== undefined ? allowManualWeight === true : undefined
            }
        });
        res.json(setting);
    }
    catch (error) {
        console.error('Error updating settings:', error);
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
