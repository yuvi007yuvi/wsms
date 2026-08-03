const fs = require('fs');
const path = require('path');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function importCSV() {
  const csvPath = path.resolve('../total vehicles.csv');
  const csvContent = fs.readFileSync(csvPath, 'utf-8');
  const lines = csvContent.split('\n').map(line => line.trim()).filter(line => line);
  
  // Use the first available vehicle type
  const defaultType = await prisma.vehicleType.findFirst();
  if (!defaultType) {
    console.error("No vehicle types found! Please create one first.");
    return;
  }

  const vehicles = [];
  // Skip header, assuming row 1 is header: SR NO.,VEH NO.
  for (let i = 1; i < lines.length; i++) {
    const values = lines[i].split(',');
    if (values.length >= 2) {
      const vehicleNumber = values[1].trim();
      if (vehicleNumber) {
        vehicles.push(vehicleNumber);
      }
    }
  }

  console.log(`Found ${vehicles.length} vehicles in CSV. Importing...`);

  let added = 0;
  for (const vNum of vehicles) {
    try {
      await prisma.vehicle.upsert({
        where: { vehicleNumber: vNum },
        update: {},
        create: {
          vehicleNumber: vNum,
          vehicleTypeId: defaultType.id,
          tareWeight: 0,
        },
      });
      
      // Also add to sync queue so it pushes to Supabase!
      const vehicle = await prisma.vehicle.findUnique({ where: { vehicleNumber: vNum } });
      await prisma.syncQueue.create({
        data: {
          action: 'CREATE',
          tableName: 'Vehicle',
          recordId: vehicle.id,
          payload: JSON.stringify(vehicle)
        }
      });
      added++;
    } catch (e) {
      console.error(`Failed to import ${vNum}:`, e.message);
    }
  }

  console.log(`Successfully imported ${added} vehicles! The background sync will push them to Supabase shortly.`);
}

importCSV()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
