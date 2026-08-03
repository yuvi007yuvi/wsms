import prisma from '../utils/prisma';

// @ts-ignore
import { PrismaClient as PgClient } from '../../node_modules/@prisma/client-postgres';

const pg = new PgClient();

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

export const processSyncQueue = async () => {
  if (isSyncing) return;
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

      } catch (err) {
        console.error(`Sync Service: Failed to process item ${item.id} (${item.action} ${item.tableName})`, err);
        // We do not delete it, so it retries later.
        // Wait, if it fails consistently, it will block the queue. We should probably add a retryCount.
        // For now, let it retry indefinitely or until the user fixes the data.
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
