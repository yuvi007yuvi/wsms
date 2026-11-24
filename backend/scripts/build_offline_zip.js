const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

function buildZip() {
  const rootDir = path.resolve(__dirname, '../..');
  const publicDir = path.join(rootDir, 'backend/public');
  const zipPath = path.join(publicDir, 'WSMS_Offline_Package.zip');
  const tempDir = path.join(rootDir, 'temp_offline_build');

  console.log('[BUILD-ZIP] Packaging WSMS Offline Bundle on build server...');

  if (fs.existsSync(tempDir)) fs.rmSync(tempDir, { recursive: true, force: true });
  fs.mkdirSync(tempDir, { recursive: true });

  // Copy backend dist
  fs.cpSync(path.join(rootDir, 'backend/dist'), path.join(tempDir, 'dist'), { recursive: true });
  // Copy backend prisma
  fs.cpSync(path.join(rootDir, 'backend/prisma'), path.join(tempDir, 'prisma'), { recursive: true });
  // Copy electron folder
  if (fs.existsSync(path.join(rootDir, 'electron'))) {
    fs.cpSync(path.join(rootDir, 'electron'), path.join(tempDir, 'electron'), { recursive: true });
  }
  // Copy frontend dist if exists
  const fDist = path.join(rootDir, 'frontend/dist');
  if (fs.existsSync(fDist)) {
    fs.mkdirSync(path.join(tempDir, 'public'), { recursive: true });
    fs.cpSync(fDist, path.join(tempDir, 'public/frontend_dist'), { recursive: true });
  }
  // Copy launchers
  fs.copyFileSync(path.join(rootDir, 'START_OFFLINE_WSMS.bat'), path.join(tempDir, 'START_OFFLINE_WSMS.bat'));
  if (fs.existsSync(path.join(rootDir, 'LAUNCH_WINDOWS_APP.bat'))) {
    fs.copyFileSync(path.join(rootDir, 'LAUNCH_WINDOWS_APP.bat'), path.join(tempDir, 'LAUNCH_WINDOWS_APP.bat'));
  }
  fs.copyFileSync(path.join(rootDir, 'backend/package.json'), path.join(tempDir, 'package.json'));

  // Ensure public directory exists
  if (!fs.existsSync(publicDir)) fs.mkdirSync(publicDir, { recursive: true });

  try {
    // Try zip command (Linux / Render) or tar or powershell
    if (process.platform === 'win32') {
      execSync(`powershell -Command "Compress-Archive -Path '${tempDir}/*' -DestinationPath '${zipPath}' -Force"`);
    } else {
      execSync(`cd "${tempDir}" && zip -r "${zipPath}" ./*`);
    }
    console.log(`[BUILD-ZIP] Successfully created ${zipPath}`);
  } catch (err) {
    console.warn('[BUILD-ZIP] Could not compress archive via shell:', err.message);
  } finally {
    if (fs.existsSync(tempDir)) fs.rmSync(tempDir, { recursive: true, force: true });
  }
}

buildZip();
