import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const result = await prisma.vehicle.deleteMany({
    where: {
      createdAt: {
        gte: new Date("2026-08-01T06:30:00.000Z")
      }
    }
  });
  
  console.log(`Successfully deleted ${result.count} vehicles that were imported recently.`);
}

main().catch(console.error).finally(() => prisma.$disconnect());
