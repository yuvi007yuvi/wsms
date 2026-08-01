import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const recentVehicles = await prisma.vehicle.findMany({
    orderBy: { createdAt: 'desc' },
    take: 50
  });
  
  console.log(JSON.stringify(recentVehicles, null, 2));
}

main().catch(console.error).finally(() => prisma.$disconnect());
