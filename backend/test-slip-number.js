const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const generateSlipNumber = async () => {
    const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const count = await prisma.weighmentSlip.count({
        where: {
            date: {
                gte: new Date(new Date().setHours(0, 0, 0, 0)),
                lte: new Date(new Date().setHours(23, 59, 59, 999))
            }
        }
    });
    const seq = String(count + 1).padStart(6, '0');
    const randomStr = Math.random().toString(36).substring(2, 5).toUpperCase();
    return `WS-${dateStr}-${seq}-${randomStr}`;
};

async function main() {
  try {
    const slipNum = await generateSlipNumber();
    console.log('Generated Slip Number:', slipNum);
  } catch (e) {
    console.error('ERROR:', e.message);
  } finally {
    await prisma.$disconnect();
  }
}

main();
