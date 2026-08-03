const { PrismaClient: PgClient } = require('./node_modules/@prisma/client-postgres');
const { PrismaClient: LocalClient } = require('@prisma/client');
const pg = new PgClient();
const local = new LocalClient();

async function fix() {
  console.log('Fixing Postgres DB...');
  const localDefault = await local.vehicleType.findFirst({ where: { name: 'Default' } });
  if (!localDefault) {
    console.log('Local default not found');
    return;
  }
  
  const pgDefault = await pg.vehicleType.findFirst({ where: { name: 'Default' } });
  if (!pgDefault) {
    console.log('Creating Default type in Postgres...', localDefault);
    await pg.vehicleType.create({ data: localDefault });
  }

  console.log('Updating all vehicles in Postgres to Default type...');
  await pg.vehicle.updateMany({ data: { vehicleTypeId: localDefault.id } });

  console.log('Deleting other vehicle types in Postgres...');
  await pg.vehicleType.deleteMany({ where: { id: { not: localDefault.id } } });

  console.log('Postgres DB fixed.');
}

fix()
  .catch(console.error)
  .finally(async () => {
    await pg.$disconnect();
    await local.$disconnect();
  });
