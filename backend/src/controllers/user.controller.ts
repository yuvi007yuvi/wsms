import { Request, Response } from 'express';
import bcrypt from 'bcrypt';
import prisma from '../utils/prisma';

export const getUsers = async (req: Request, res: Response) => {
  try {
    const users = await prisma.user.findMany({
      select: {
        id: true,
        username: true,
        fullName: true,
        designation: true,
        role: true,
        isActive: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'desc' }
    });
    res.json(users);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch users' });
  }
};

export const createUser = async (req: Request, res: Response) => {
  try {
    const { username, password, role, fullName, designation } = req.body;
    
    const existing = await prisma.user.findUnique({ where: { username } });
    if (existing) {
      res.status(400).json({ error: 'Username already exists' });
      return;
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const user = await prisma.user.create({
      data: {
        username,
        password: hashedPassword,
        fullName,
        designation,
        role: role || 'operator'
      },
      select: { id: true, username: true, role: true, isActive: true, fullName: true, designation: true }
    });
    
    res.status(201).json(user);
  } catch (error) {
    console.error(error);
    res.status(400).json({ error: 'Failed to create user' });
  }
};

export const deleteUser = async (req: Request, res: Response) => {
  try {
    // Prevent deleting the main admin
    const id = req.params.id as string;
    const user = await prisma.user.findUnique({ where: { id } });
    if (user?.username === 'admin') {
      res.status(400).json({ error: 'Cannot delete the primary admin account' });
      return;
    }

    await prisma.user.delete({
      where: { id }
    });
    res.json({ success: true });
  } catch (error) {
    res.status(400).json({ error: 'Failed to delete user' });
  }
};
