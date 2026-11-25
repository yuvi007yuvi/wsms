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
  // Initial sync pull right on startup
  setTimeout(() => {
    pullCloudData().catch(err => console.error('[SYNC] Initial pull error:', err));
  }, 3000);

  cron.schedule('*/30 * * * * *', async () => {
    await syncPendingSlips();
  });
}

/**
 * Downloads existing vehicles, materials, sources, destinations and slips from cloud
 * to the local SQLite database so offline cabin PC has all historical data.
 */
export async function pullCloudData() {
  try {
    const isOnline = await checkCloudHealth();
    if (!isOnline) {
      console.log('[SYNC] Cloud server offline. Skipping data pull.');
      return;
    }

    console.log('[SYNC] Cloud is reachable. Fetching remote master data & slips...');
    // Login to cloud to obtain temporary token for pulling data
    const authRes = await fetch(`${CLOUD_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: 'superadmin', password: 'superadmin123' })
    }).catch(() => null);

    let token = '';
    if (authRes && authRes.ok) {
      const authData = await authRes.json();
      token = authData?.token || '';
    }

    if (!token) {
      // Try admin
      const adminRes = await fetch(`${CLOUD_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: 'admin', password: 'admin123' })
      }).catch(() => null);
      if (adminRes && adminRes.ok) {
        const adminData = await adminRes.json();
        token = adminData?.token || '';
      }
    }

    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (token) headers['Authorization'] = `Bearer ${token}`;

    // 1. Fetch Materials
    const matRes = await fetch(`${CLOUD_URL}/master/materials?limit=1000`, { headers }).catch(() => null);
    if (matRes && matRes.ok) {
      const mData = await matRes.json();
      const list = mData?.data || mData || [];
      if (Array.isArray(list)) {
        for (const m of list) {
          await (prisma as any).material.upsert({
            where: { name: m.name },
            update: { description: m.description, isActive: m.isActive },
            create: { name: m.name, description: m.description, isActive: m.isActive ?? true }
          }).catch(() => {});
        }
      }
    }

    // 2. Fetch Vehicle Types
    const vtRes = await fetch(`${CLOUD_URL}/master/vehicle-types?limit=1000`, { headers }).catch(() => null);
    let defaultVehicleType = await (prisma as any).vehicleType.findFirst();
    if (vtRes && vtRes.ok) {
      const vtData = await vtRes.json();
      const list = vtData?.data || vtData || [];
      if (Array.isArray(list)) {
        for (const vt of list) {
          const savedVt = await (prisma as any).vehicleType.upsert({
            where: { name: vt.name },
            update: { tareWeight: vt.tareWeight || 0 },
            create: { id: vt.id, name: vt.name, tareWeight: vt.tareWeight || 0 }
          }).catch(() => null);
          if (savedVt && !defaultVehicleType) defaultVehicleType = savedVt;
        }
      }
    }

    if (!defaultVehicleType) {
      defaultVehicleType = await (prisma as any).vehicleType.upsert({
        where: { name: 'General / Truck' },
        update: {},
        create: { name: 'General / Truck', tareWeight: 0 }
      });
    }

    // 3. Fetch Vehicles
    const vRes = await fetch(`${CLOUD_URL}/master/vehicles?limit=5000`, { headers }).catch(() => null);
    if (vRes && vRes.ok) {
      const vData = await vRes.json();
      const list = vData?.data || vData || [];
      if (Array.isArray(list)) {
        // Pre-fetch local projects and vehicle types to avoid foreign key violations
        const localProjects = await (prisma as any).project.findMany({ select: { id: true } });
        const localProjectIds = new Set(localProjects.map((p: any) => p.id));
        const localVTypes = await (prisma as any).vehicleType.findMany({ select: { id: true, name: true } });
        const localVTypeIds = new Set(localVTypes.map((vt: any) => vt.id));

        for (const v of list) {
          // Resolve a valid local vehicleTypeId
          let vTypeId = v.vehicleTypeId || v.vehicleType?.id;
          if (!vTypeId || !localVTypeIds.has(vTypeId)) {
            if (v.vehicleType?.name) {
              const foundType = localVTypes.find((vt: any) => vt.name === v.vehicleType.name);
              vTypeId = foundType?.id;
            }
          }
          if (!vTypeId || !localVTypeIds.has(vTypeId)) {
            vTypeId = defaultVehicleType.id;
          }

          // Resolve a valid local projectId
          const validProjectId = (v.projectId && localProjectIds.has(v.projectId)) ? v.projectId : null;

          // Check if vehicle exists either by vehicleNumber or by id
          const existingVeh = await (prisma as any).vehicle.findFirst({
            where: {
              OR: [
                { vehicleNumber: v.vehicleNumber },
                ...(v.id ? [{ id: v.id }] : [])
              ]
            }
          });

          if (existingVeh) {
            await (prisma as any).vehicle.update({
              where: { id: existingVeh.id },
              data: {
                vehicleNumber: v.vehicleNumber,
                driverName: v.driverName,
                tareWeight: v.tareWeight || 0,
                isActive: v.isActive ?? true,
                vehicleTypeId: vTypeId,
                projectId: validProjectId ?? existingVeh.projectId
              }
            }).catch(() => {});
          } else {
            await (prisma as any).vehicle.create({
              data: {
                ...(v.id ? { id: v.id } : {}),
                vehicleNumber: v.vehicleNumber,
                vehicleTypeId: vTypeId,
                driverName: v.driverName,
                tareWeight: v.tareWeight || 0,
                isActive: v.isActive ?? true,
                projectId: validProjectId
              }
            }).catch((err: any) => console.error(`[SYNC] Failed to create vehicle ${v.vehicleNumber}:`, err.message));
          }
        }
      }
    }

    // Ensure ALIGARH and NATURE GREEN projects exist locally
    const aligarhProj = await (prisma as any).project.upsert({
      where: { name: 'ALIGARH' },
      update: {},
      create: { name: 'ALIGARH', address: 'Ecostan Infra Aligarh' }
    });

    // 4. Fetch Slips (Last 300 slips)
    const sRes = await fetch(`${CLOUD_URL}/weighment?limit=300`, { headers }).catch(() => null);
    if (sRes && sRes.ok) {
      const sData = await sRes.json();
      const list = sData?.data || sData || [];
      if (Array.isArray(list)) {
        console.log(`[SYNC] Downloading ${list.length} existing slip(s) into local offline database...`);
        for (const s of list) {
          if (!s.slipNumber) continue;
          const exists = await (prisma as any).weighmentSlip.findUnique({
            where: { slipNumber: s.slipNumber }
          });
          if (!exists) {
            // Find or associate local records
            const veh = s.vehicle?.vehicleNumber ? await (prisma as any).vehicle.findUnique({ where: { vehicleNumber: s.vehicle.vehicleNumber } }) : null;
            const mat = s.material?.name ? await (prisma as any).material.findUnique({ where: { name: s.material.name } }) : null;
            const op = await (prisma as any).user.findFirst();

            if (veh && mat && op) {
              const slipProjectId = s.project?.id || (s.slipNumber.startsWith('UE') ? aligarhProj.id : null);
              
              let src = await (prisma as any).source.findFirst({ where: { name: s.source?.name || 'Default Source' } });
              if (!src) {
                src = await (prisma as any).source.create({ 
                  data: { 
                    name: s.source?.name || 'Default Source',
                    projectId: slipProjectId
                  } 
                });
              }
              let dest = await (prisma as any).destination.findFirst({ where: { name: s.destination?.name || 'Default Destination' } });
              if (!dest) {
                dest = await (prisma as any).destination.create({ 
                  data: { 
                    name: s.destination?.name || 'Default Destination',
                    projectId: slipProjectId
                  } 
                });
              }

              await (prisma as any).weighmentSlip.create({
                data: {
                  slipNumber: s.slipNumber,
                  date: new Date(s.date || s.createdAt),
                  grossWeight: s.grossWeight || 0,
                  tareWeight: s.tareWeight || 0,
                  netWeight: s.netWeight || 0,
                  driverName: s.driverName || '',
                  remarks: (s.remarks || '') + ' [CLOUD_SYNCED]',
                  vehicleId: veh.id,
                  materialId: mat.id,
                  sourceId: src.id,
                  destinationId: dest.id,
                  operatorId: op.id,
                  projectId: slipProjectId
                }
              }).catch(() => {});
            }
          }
        }
      }
    }
    console.log('[SYNC] Completed pulling cloud masters & slips.');
  } catch (err: any) {
    console.error('[SYNC] Failed to pull cloud data:', err.message);
  }
}
