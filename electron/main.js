const { app, BrowserWindow } = require('electron');
const path = require('path');
const { fork } = require('child_process');

let mainWindow = null;
let serverProcess = null;

const PORT = 5000;
const SERVER_URL = `http://localhost:${PORT}`;

function startBackendServer() {
  const fs = require('fs');
  // Support both repository layout (../backend/dist/index.js) and extracted package layout (../dist/index.js)
  const candidateEntries = [
    path.join(__dirname, '../dist/index.js'),
    path.join(__dirname, '../backend/dist/index.js')
  ];
  const backendEntry = candidateEntries.find(p => fs.existsSync(p)) || candidateEntries[0];
  const backendCwd = path.dirname(path.dirname(backendEntry));

  const env = {
    ...process.env,
    PORT: String(PORT),
    NODE_ENV: 'production',
    IS_OFFLINE_NODE: 'true',
    DATABASE_URL: 'file:./dev.db',
    CLOUD_SERVER_URL: 'https://wsms-1.onrender.com/api'
  };

  serverProcess = fork(backendEntry, [], {
    cwd: backendCwd,
    env,
    silent: true
  });

  serverProcess.stdout?.on('data', (data) => {
    console.log(`[BACKEND]: ${data}`);
  });

  serverProcess.stderr?.on('data', (data) => {
    console.error(`[BACKEND ERR]: ${data}`);
  });

  serverProcess.on('exit', (code) => {
    console.log(`[BACKEND EXITED] with code: ${code}`);
  });
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1366,
    height: 768,
    minWidth: 1024,
    minHeight: 700,
    title: 'WeightT360Pro - Weighbridge Management System',
    autoHideMenuBar: true,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true
    }
  });

  // Load backend server once ready
  const checkAndLoad = async () => {
    try {
      const res = await fetch(`${SERVER_URL}/api/health`).catch(() => null);
      if (res && res.ok) {
        mainWindow.loadURL(SERVER_URL);
      } else {
        setTimeout(checkAndLoad, 500);
      }
    } catch {
      setTimeout(checkAndLoad, 500);
    }
  };

  // Show a temporary splash or attempt connection
  checkAndLoad();

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

app.whenReady().then(() => {
  startBackendServer();
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (serverProcess) {
    serverProcess.kill();
  }
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
