import { Request, Response } from 'express';
import prisma from '../utils/prisma';

export const getSettings = async (req: Request, res: Response) => {
  try {
    let setting = await prisma.setting.findFirst();
    
    // Create default setting if it doesn't exist
    if (!setting) {
      setting = await prisma.setting.create({
        data: {
          companyName: 'Default Company Ltd',
          address: '123 Main Street',
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
    const { companyName, address, logoUrl, printerConfig, slipFormat, theme, mockMode } = req.body;
    
    const setting = await prisma.setting.update({
      where: { id: id as string },
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
  } catch (error) {
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
