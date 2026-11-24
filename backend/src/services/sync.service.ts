import cron from 'node-cron';
import prisma from '../utils/prisma';

/**
 * Background Sync Service (Pure Native Fetch - Zero Extra Dependencies)
 * Runs when offline mode is enabled on the local cabin PC.
 * Monitors connectivity to the cloud server (Render/PostgreSQL).
 * When online, uploads pending offline slips and downloads fresh master data.
 */

const CLOUD_URL = process.env.CLOUD_SERVER_URL || 'https://wsms-1.onrender.com/api';
let isSyncing = false;

export async function checkCloudHealth(): Promise<boolean> {
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 4000);
    const res = await fetch(`${CLOUD_URL}/health`, { signal: controller.signal });
    clearTimeout(timer);
    return res.ok;
  } catch {
    return false;
  }
}

export async function syncPendingSlips() {
  if (isSyncing) return;
  isSyncing = true;

  try {
    const isOnline = await checkCloudHealth();
    if (!isOnline) {
      isSyncing = false;
      return;
    }

    // Find unsynced local slips
    const pendingSlips = await (prisma as any).weighmentSlip.findMany({
      where: {
        OR: [
          { remarks: { contains: '[OFFLINE_PENDING]' } },
        ]
      },
      take: 20,
      include: {
        vehicle: true,
        material: true,
        source: true,
        destination: true,
        project: true
      }
    });

    if (pendingSlips.length > 0) {
      console.log(`[SYNC] Found ${pendingSlips.length} pending offline slip(s) to sync to cloud...`);

      for (const slip of pendingSlips) {
        try {
          // Prepare clean payload for cloud API
          const payload = {
            slipNumber: slip.slipNumber,
            vehicleNumber: slip.vehicle?.vehicleNumber,
            materialName: slip.material?.name,
            sourceName: slip.source?.name,
            destinationName: slip.destination?.name,
            grossWeight: slip.grossWeight,
            tareWeight: slip.tareWeight,
            netWeight: slip.netWeight,
            driverName: slip.driverName,
            date: slip.date,
            remarks: slip.remarks ? slip.remarks.replace('[OFFLINE_PENDING]', '').trim() : ''
          };

          const uploadRes = await fetch(`${CLOUD_URL}/weighment/sync-offline`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
          }).catch(() => null);

          if (uploadRes && uploadRes.ok) {
            // Update local status as synced
            await (prisma as any).weighmentSlip.update({
              where: { id: slip.id },
              data: {
                remarks: payload.remarks ? `${payload.remarks} [SYNCED]` : '[SYNCED]'
              }
            });
            console.log(`[SYNC] Slip ${slip.slipNumber} synced successfully to cloud.`);
          }
        } catch (itemErr) {
          console.error(`[SYNC] Error uploading slip ${slip.slipNumber}:`, itemErr);
        }
      }
    }
  } catch (err: any) {
    console.error('[SYNC] Background sync cycle error:', err?.message || err);
  } finally {
    isSyncing = false;
  }
}

// Start auto-sync worker every 30 seconds
export function startOfflineSyncWorker() {
  console.log('[SYNC] Starting background Offline-to-Cloud sync scheduler (every 30s)...');
  cron.schedule('*/30 * * * * *', async () => {
    await syncPendingSlips();
  });
}
