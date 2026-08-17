const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  try {
    const v = await prisma.vehicle.findFirst();
    const m = await prisma.material.findFirst();
    const s = await prisma.source.findFirst();
    const d = await prisma.destination.findFirst();
    const u = await prisma.user.findFirst();

    console.log({v:v?.id, m:m?.id, s:s?.id, d:d?.id, u:u?.id});

    const slip = await prisma.weighmentSlip.create({
      data: {
        slipNumber: 'TEST-1235',
        vehicleId: v.id,
        materialId: m.id,
        sourceId: s.id,
        destinationId: d.id,
        grossWeight: 1600,
        tareWeight: 1100,
        netWeight: 500,
        operatorId: u.id,
        remarks: '',
        driverName: 'TESTING',
        projectId: u.projectId || null
      }
    });
    console.log('Success!', slip.id);
    await prisma.weighmentSlip.delete({where:{id:slip.id}});
  } catch (e) {
    console.error('ERROR:', e.message);
  } finally {
    await prisma.$disconnect();
  }
}

main();
