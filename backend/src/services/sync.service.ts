import prisma from '../utils/prisma';

let PgClient: any = null;
try {
  // @ts-ignore
  PgClient = require('@prisma/client-postgres').PrismaClient;
} catch (e) {
  // @prisma/client-postgres not generated or not available
}

const pg = PgClient ? new PgClient() : null;

let isSyncing = false;
export let isOnline = true;
export let lastSyncTime: Date | null = new Date();

export const getSyncStatus = async () => {
  try {
    const pendingCount = await prisma.syncQueue.count();
    return {
      isOnline,
      lastSyncTime,
      pendingCount
    };
  } catch (e) {
    return { isOnline: false, lastSyncTime, pendingCount: 0 };
  }
};

export const pullMasterData = async () => {
  if (!pg) {
    console.log('Sync Service: Cloud postgres client not configured. Skipping master data pull.');
    return;
  }
  try {
    console.log('Sync Service: Pulling master data from cloud...');
    
    // 1. VehicleTypes
    const cloudTypes = await pg.vehicleType.findMany();
    for (const t of cloudTypes) {
      await prisma.vehicleType.upsert({ where: { id: t.id }, update: t, create: t });
    }
    
    // 2. Vehicles
    const cloudVeh = await pg.vehicle.findMany();
    for (const v of cloudVeh) {
      await prisma.vehicle.upsert({ where: { id: v.id }, update: v, create: v });
    }
    
    // 3. Materials
    const cloudMat = await pg.material.findMany();
    for (const m of cloudMat) {
      await prisma.material.upsert({ where: { id: m.id }, update: m, create: m });
    }
    
    // 4. Sources
    const cloudSrc = await pg.source.findMany();
    for (const s of cloudSrc) {
      await prisma.source.upsert({ where: { id: s.id }, update: s, create: s });
    }
    
    // 5. Destinations
    const cloudDest = await pg.destination.findMany();
    for (const d of cloudDest) {
      await prisma.destination.upsert({ where: { id: d.id }, update: d, create: d });
    }
    
    // 6. Users
    const cloudUsers = await pg.user.findMany();
    for (const u of cloudUsers) {
      await prisma.user.upsert({ where: { id: u.id }, update: u, create: u });
    }

    console.log('Sync Service: Master data pull complete.');
  } catch (err) {
    console.error('Sync Service: Error pulling master data:', err);
  }
};

export const processSyncQueue = async () => {
  if (isSyncing) return;
  if (!pg) {
    isOnline = false;
    return;
  }
  isSyncing = true;

  try {
    const queueItems = await prisma.syncQueue.findMany({
      orderBy: { createdAt: 'asc' },
      take: 50 // Batch size
    });

    if (queueItems.length === 0) {
      isSyncing = false;
      // If queue is empty, we consider it "synced" up to now
      // Let's verify we are online quickly though
      try {
        await pg.$queryRaw`SELECT 1`;
        isOnline = true;
        lastSyncTime = new Date();
      } catch (e) {
        isOnline = false;
      }
      return;
    }

    try {
      await pg.$queryRaw`SELECT 1`;
      isOnline = true;
    } catch (e) {
      console.log('Sync Service: Cloud database unreachable. Retrying later.');
      isOnline = false;
      isSyncing = false;
      return;
    }

    console.log(`Sync Service: Processing ${queueItems.length} items...`);

    for (const item of queueItems) {
      try {
        const payload = item.payload ? JSON.parse(item.payload) : {};
        
        // Remove nested relational objects from payload to prevent Prisma errors
        for (const key in payload) {
          if (typeof payload[key] === 'object' && payload[key] !== null && !(payload[key] instanceof Date)) {
            delete payload[key];
          }
        }

        // Use any to bypass TS for dynamic model access
        const pgModel = (pg as any)[item.tableName.charAt(0).toLowerCase() + item.tableName.slice(1)];

        if (!pgModel) {
          console.error(`Sync Service: Unknown table ${item.tableName}`);
          await prisma.syncQueue.delete({ where: { id: item.id } });
          continue;
        }

        if (item.action === 'CREATE') {
          // Check if exists first to avoid unique constraint errors on retry
          const existing = await pgModel.findUnique({ where: { id: item.recordId } });
          if (!existing) {
            await pgModel.create({ data: payload });
          } else {
            await pgModel.update({ where: { id: item.recordId }, data: payload });
          }
        } else if (item.action === 'UPDATE') {
          await pgModel.update({
            where: { id: item.recordId },
            data: payload
          });
        } else if (item.action === 'DELETE') {
          try {
            await pgModel.delete({
              where: { id: item.recordId }
            });
          } catch (delErr) {
            // Might already be deleted
          }
        }

        // Successfully synced, remove from queue
        await prisma.syncQueue.delete({ where: { id: item.id } });

      } catch (err: any) {
        console.error(`Sync Service: Failed to process item ${item.id} (${item.action} ${item.tableName})`, err);
        // If an AuditLog fails (e.g. foreign key for a local-only user), delete it to prevent queue blocking and log spam
        if (item.tableName === 'AuditLog') {
          console.warn(`Sync Service: Deleting failed AuditLog from queue to prevent blocking.`);
          await prisma.syncQueue.delete({ where: { id: item.id } });
        }
      }
    }

  } catch (error) {
    console.error('Sync Service: Error reading queue', error);
  } finally {
    isSyncing = false;
    if (isOnline) {
       lastSyncTime = new Date();
    }
  }
};

export const startSyncService = () => {
  console.log('Sync Service: Started background worker');
  // Run every 10 seconds
  setInterval(processSyncQueue, 10000);
};
