import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  // Revert admin back to admin
  const adminUser = await prisma.user.findFirst({
    where: { username: 'admin' },
  });

  if (adminUser && adminUser.role === 'superadmin') {
    await prisma.user.update({
      where: { id: adminUser.id },
      data: { role: 'admin' },
    });
    console.log('Reverted admin role back to admin');
  }

  // Create superadmin if it doesn't exist
  const superAdminCount = await prisma.user.count({
    where: { username: 'superadmin' }
  });

  if (superAdminCount === 0) {
    const hashedSuperAdminPassword = await bcrypt.hash('superadmin123', 10);
    await prisma.user.create({
      data: {
        username: 'superadmin',
        password: hashedSuperAdminPassword,
        role: 'superadmin',
        fullName: 'Master Superadmin',
        designation: 'Platform Owner'
      }
    });
    console.log('Created missing superadmin account');
  } else {
    console.log('superadmin account already exists');
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
