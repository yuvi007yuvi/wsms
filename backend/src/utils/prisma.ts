import { PrismaClient } from '@prisma/client';

// Use a global singleton to prevent multiple Prisma instances during hot-reload
const globalForPrisma = globalThis as unknown as { prisma: PrismaClient };

const prisma = globalForPrisma.prisma || new PrismaClient({
  log: process.env.NODE_ENV === 'development' ? ['warn', 'error'] : ['error'],
});

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;

// Eagerly connect to DB on startup instead of waiting for first query
prisma.$connect().catch((err) => {
  console.error('Failed to connect to database:', err);
});

export default prisma;
