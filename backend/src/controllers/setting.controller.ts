import { Request, Response } from 'express';
import prisma from '../utils/prisma';

export const getSettings = async (req: Request, res: Response) => {
  try {
    // @ts-ignore
    const user = req.user;
    const userProjectHeader = req.headers['x-project-name'] as string;
    
    // Resolve project identifier
    let projectKey = user?.projectId ? `proj_${user.projectId}` : null;
    if (!projectKey && userProjectHeader) {
      const clean = userProjectHeader.trim().toLowerCase().replace(/[^a-z0-9]/g, '_');
      projectKey = `proj_${clean}`;
    }

    let setting: any = null;

    if (projectKey) {
      setting = await prisma.setting.findFirst({
        where: { id: projectKey }
      });
    }

    if (!setting) {
      setting = await prisma.setting.findFirst({
        where: { id: { not: { startsWith: 'proj_' } } }
      });
    }
    
    // Create default setting if it doesn't exist
    if (!setting) {
      setting = await prisma.setting.create({
        data: {
          id: projectKey || undefined,
          companyName: '',
          address: '',
          allowManualWeight: false
        }
      });
    }
    
    res.json(setting);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch settings' });
  }
};

export const updateSettings = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    // @ts-ignore
    const user = req.user;
    const userProjectHeader = req.headers['x-project-name'] as string;
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

    const setting = await prisma.setting.upsert({
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
  } catch (error) {
    console.error('Error updating settings:', error);
    res.status(400).json({ error: 'Failed to update settings' });
  }
};

export const getRolePermissions = async (req: Request, res: Response) => {
  try {
    const permissions = await prisma.rolePermission.findMany();
    res.json(permissions);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch role permissions' });
  }
};

export const upsertRolePermission = async (req: Request, res: Response) => {
  try {
    const { role, allowedModules } = req.body;
    
    // allowedModules should be a stringified JSON array
    const permission = await prisma.rolePermission.upsert({
      where: { role },
      update: { allowedModules },
      create: { role, allowedModules }
    });
    
    res.json(permission);
  } catch (error) {
    res.status(400).json({ error: 'Failed to update role permissions' });
  }
};
