import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const adminUser = await prisma.user.findFirst({
    where: { username: 'admin' },
  });

  if (adminUser) {
    await prisma.user.update({
      where: { id: adminUser.id },
      data: { role: 'superadmin' },
    });
    console.log('Upgraded admin to superadmin');
  } else {
    console.log('Admin user not found');
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
