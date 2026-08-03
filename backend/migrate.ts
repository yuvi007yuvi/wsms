import { PrismaClient as PgClient } from '@prisma/client';
// @ts-ignore
import { PrismaClient as SqliteClient } from './node_modules/@prisma/client-sqlite';

const pg = new PgClient();
const sqlite = new SqliteClient();

async function migrate() {
  try {
    console.log('Connecting to databases...');
    await pg.$connect();
    await sqlite.$connect();
    
    // Clear postgres before migrating
    console.log('Clearing Postgres DB...');
    await pg.auditLog.deleteMany();
    await pg.weighmentSlip.deleteMany();
    await pg.vehicle.deleteMany();
    await pg.vehicleType.deleteMany();
    await pg.material.deleteMany();
    await pg.source.deleteMany();
    await pg.destination.deleteMany();
    await pg.rolePermission.deleteMany();
    await pg.setting.deleteMany();
    await pg.user.deleteMany();

    const users = await sqlite.user.findMany();
    console.log(`Migrating ${users.length} Users...`);
    if (users.length) await pg.user.createMany({ data: users });

    const vTypes = await sqlite.vehicleType.findMany();
    console.log(`Migrating ${vTypes.length} Vehicle Types...`);
    if (vTypes.length) await pg.vehicleType.createMany({ data: vTypes });

    const vehicles = await sqlite.vehicle.findMany();
    console.log(`Migrating ${vehicles.length} Vehicles...`);
    if (vehicles.length) await pg.vehicle.createMany({ data: vehicles });

    const materials = await sqlite.material.findMany();
    console.log(`Migrating ${materials.length} Materials...`);
    if (materials.length) await pg.material.createMany({ data: materials });

    const sources = await sqlite.source.findMany();
    console.log(`Migrating ${sources.length} Sources...`);
    if (sources.length) await pg.source.createMany({ data: sources });

    const destinations = await sqlite.destination.findMany();
    console.log(`Migrating ${destinations.length} Destinations...`);
    if (destinations.length) await pg.destination.createMany({ data: destinations });

    const slips = await sqlite.weighmentSlip.findMany();
    console.log(`Migrating ${slips.length} Weighment Slips...`);
    if (slips.length) await pg.weighmentSlip.createMany({ data: slips });

    const settings = await sqlite.setting.findMany();
    console.log(`Migrating ${settings.length} Settings...`);
    if (settings.length) await pg.setting.createMany({ data: settings });

    const audits = await sqlite.auditLog.findMany();
    console.log(`Migrating ${audits.length} Audit Logs...`);
    if (audits.length) await pg.auditLog.createMany({ data: audits });

    // RolePermissions might be empty in SQLite but we'll try just in case
    try {
      const rp = await sqlite.rolePermission.findMany();
      if (rp && rp.length > 0) {
        await pg.rolePermission.createMany({ data: rp });
      }
    } catch(e) {}

    console.log('Migration completed successfully!');
  } catch (error) {
    console.error('Migration failed:', error);
  } finally {
    await pg.$disconnect();
    await sqlite.$disconnect();
  }
}

migrate();
