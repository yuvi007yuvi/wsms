const { PrismaClient } = require('./node_modules/@prisma/client-postgres');
const prisma = new PrismaClient();

async function run() {
  const defaultTypeId = 'daa5b497-427b-456d-854f-fbde38b6ac02';

  const vehiclesToCreate = [
    {
      id: "f4503932-c0b4-4ed4-8b45-5684eca2908d",
      vehicleNumber: "0888",
      vehicleTypeId: defaultTypeId,
      driverName: null,
      mobile: null,
      owner: null,
      tareWeight: 1100,
      isActive: true,
      createdAt: new Date("2026-08-03T09:26:04.141Z"),
      updatedAt: new Date("2026-08-03T09:26:04.141Z")
    },
    {
      id: "d655d6e3-c1e6-4d36-b233-e1cf75abf1b1",
      vehicleNumber: "0888",
      vehicleTypeId: defaultTypeId,
      driverName: null,
      mobile: null,
      owner: null,
      tareWeight: 1100,
      isActive: true,
      createdAt: new Date("2026-08-03T10:23:12.325Z"),
      updatedAt: new Date("2026-08-03T10:23:12.325Z")
    }
  ];

  for (const v of vehiclesToCreate) {
    try {
      const existing = await prisma.vehicle.findUnique({ where: { id: v.id } });
      if (!existing) {
        await prisma.vehicle.create({ data: v });
        console.log(`Created vehicle ${v.id}`);
      } else {
        console.log(`Vehicle ${v.id} already exists`);
      }
    } catch (err) {
      console.error(err);
    }
  }
}

run()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
