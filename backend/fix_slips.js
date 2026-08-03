const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function fix() {
  const queue = await prisma.syncQueue.findMany({ where: { tableName: 'WeighmentSlip' } });
  
  for (let i = 0; i < queue.length; i++) {
    const item = queue[i];
    const payload = JSON.parse(item.payload);
    
    // Check if slipNumber lacks a random code (length <= 20 like WS-20260803-000001)
    if (payload.slipNumber.length <= 20) {
      const suffix = Math.random().toString(36).substring(2, 5).toUpperCase();
      const newSlipNumber = payload.slipNumber + '-' + suffix;
      
      console.log(`Fixing ${payload.slipNumber} -> ${newSlipNumber}`);
      
      // Update local WeighmentSlip
      try {
        await prisma.weighmentSlip.update({
          where: { id: payload.id },
          data: { slipNumber: newSlipNumber }
        });
      } catch (e) {
        console.error('Local slip not found or already updated');
      }
      
      // Update payload
      payload.slipNumber = newSlipNumber;
      await prisma.syncQueue.update({
        where: { id: item.id },
        data: { payload: JSON.stringify(payload) }
      });
    }
  }
  console.log('Fixed stuck slips in queue.');
}

fix()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
