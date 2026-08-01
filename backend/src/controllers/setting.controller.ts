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
    const { companyName, address, logoUrl, printerConfig, slipFormat, theme } = req.body;
    
    const setting = await prisma.setting.update({
      where: { id: id as string },
      data: {
        companyName,
        address,
        logoUrl,
        printerConfig,
        slipFormat,
        theme
      }
    });
    
    res.json(setting);
  } catch (error) {
    res.status(400).json({ error: 'Failed to update settings' });
  }
};
