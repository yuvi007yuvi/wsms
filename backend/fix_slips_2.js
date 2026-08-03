const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function fix() {
  const queue = await prisma.syncQueue.findMany({ where: { tableName: 'WeighmentSlip' } });
  
  for (let i = 0; i < queue.length; i++) {
    const item = queue[i];
    const payload = JSON.parse(item.payload);
    
    if (payload.vehicleId === 'd655d6e3-c1e6-4d36-b233-e1cf75abf1b1') {
      console.log('Fixing vehicleId for slip', payload.slipNumber);
      payload.vehicleId = 'f4503932-c0b4-4ed4-8b45-5684eca2908d';
      
      await prisma.weighmentSlip.update({
        where: { id: payload.id },
        data: { vehicleId: payload.vehicleId }
      }).catch(e => console.log('Local slip already fixed or deleted'));
      
      await prisma.syncQueue.update({
        where: { id: item.id },
        data: { payload: JSON.stringify(payload) }
      });
    }
  }
  console.log('Fixed stuck slips vehicleIds in queue.');
}

fix()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
