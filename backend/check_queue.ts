import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const queue = await prisma.syncQueue.findMany();
  console.log(JSON.stringify(queue, null, 2));
}

main().catch(console.error).finally(() => prisma.$disconnect());
