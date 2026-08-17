const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const vehicleTypes = [
  "Secondary - Refuse Compactor (RC)",
  "Secondary - Tractor Trolley",
  "Secondary - Hook Loader",
  "Secondary - Road Sweeping Machine",
  "Secondary - Tractor Loader",
  "Secondary - HYVA",
  "Secondary - Dumper",
  "Secondary - Bolero",
  "Secondary - Dustbin Placer Vehicle",
  "Secondary - JCB 2DX",
  "Secondary - JCB 3DX",
  "Primary - Auto Tipper",
  "Primary - Manual Rickshaw",
  "Primary - Wheel Barrow",
  "Primary - AUTO TIPPER 3 WHEELER",
  "Primary - AUTO TIPPER EV",
  "Primary - Auto Tipper Commercial"
];

async function main() {
  for (const name of vehicleTypes) {
    try {
      await prisma.vehicleType.upsert({
        where: { name },
        update: {},
        create: { name }
      });
      console.log(`Upserted: ${name}`);
    } catch (e) {
      console.error(`Error inserting ${name}:`, e.message);
    }
  }
}

main()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
