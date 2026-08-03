const { PrismaClient } = require('@prisma/client');
const { PrismaClient: PgClient } = require('./node_modules/@prisma/client-postgres');

const localPrisma = new PrismaClient();
const pgPrisma = new PgClient();

async function syncDown() {
  console.log("Fetching vehicles from Supabase...");
  const cloudVehicles = await pgPrisma.vehicle.findMany();
  console.log(`Found ${cloudVehicles.length} vehicles in Supabase.`);
  
  if (cloudVehicles.length > 0) {
    for (const v of cloudVehicles) {
      await localPrisma.vehicle.upsert({
        where: { vehicleNumber: v.vehicleNumber },
        update: { ...v },
        create: { ...v },
      });
    }
    console.log("Vehicles synced to local DB!");
  } else {
    console.log("No vehicles found in Supabase.");
  }
}

syncDown()
  .catch(console.error)
  .finally(async () => {
    await localPrisma.$disconnect();
    await pgPrisma.$disconnect();
  });
