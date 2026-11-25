import fs from 'fs';
import path from 'path';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const csvPath = path.join(__dirname, 'aligarh_vehicles.csv');
  const raw = fs.readFileSync(csvPath, 'utf8');
  const lines = raw.split(/\r?\n/).filter((l) => l.trim().length > 0);

  // Skip header
  const rows = lines.slice(1).map((line) => {
    const parts = line.split(',');
    const vehicleNumber = (parts[1] || '').trim();
    const vehicleTypeName = (parts.slice(2).join(',') || '').trim();
    return { vehicleNumber, vehicleTypeName };
  }).filter((r) => r.vehicleNumber && r.vehicleTypeName);

  console.log(`Parsed ${rows.length} vehicle rows from CSV.`);

  // Find or create ALIGARH project
  let aligarh = await prisma.project.findFirst({
    where: {
      OR: [
        { name: { contains: 'ALIGARH' } },
        { name: { contains: 'Aligarh' } },
        { name: { contains: 'aligarh' } },
      ],
    },
  });

  if (!aligarh) {
    aligarh = await prisma.project.create({
      data: { name: 'ALIGARH', address: 'Ecostan Infra Aligarh', isActive: true },
    });
  }
  console.log(`Target Project: ${aligarh.name} (${aligarh.id})`);

  // Upsert unique vehicle types
  const uniqueTypes = Array.from(new Set(rows.map((r) => r.vehicleTypeName)));
  const typeMap = new Map<string, string>();
  for (const typeName of uniqueTypes) {
    const vt = await prisma.vehicleType.upsert({
      where: { name: typeName },
      update: { isActive: true },
      create: { name: typeName, tareWeight: 0, isActive: true },
    });
    typeMap.set(typeName, vt.id);
  }
  console.log(`Synced ${typeMap.size} unique vehicle types.`);

  // Upsert vehicles for ALIGARH
  const validNumbers = new Set<string>();
  let createdCount = 0;
  let updatedCount = 0;

  for (const row of rows) {
    const vehicleTypeId = typeMap.get(row.vehicleTypeName)!;
    validNumbers.add(row.vehicleNumber);

    const existing = await prisma.vehicle.findUnique({
      where: { vehicleNumber: row.vehicleNumber },
    });

    if (existing) {
      await prisma.vehicle.update({
        where: { id: existing.id },
        data: {
          vehicleTypeId,
          projectId: aligarh.id,
          isActive: true,
        },
      });
      updatedCount++;
    } else {
      await prisma.vehicle.create({
        data: {
          vehicleNumber: row.vehicleNumber,
          vehicleTypeId,
          projectId: aligarh.id,
          tareWeight: 0,
          isActive: true,
        },
      });
      createdCount++;
    }
  }

  // Deactivate any other vehicles in ALIGARH not in this list
  const deactivated = await prisma.vehicle.updateMany({
    where: {
      projectId: aligarh.id,
      vehicleNumber: { notIn: Array.from(validNumbers) },
      isActive: true,
    },
    data: { isActive: false },
  });

  console.log(`Done! Created: ${createdCount}, Updated: ${updatedCount}, Deactivated old ALIGARH vehicles: ${deactivated.count}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
