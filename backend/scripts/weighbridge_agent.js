/**
 * WSMS Local Weighbridge Machine Agent
 * 
 * Runs on the cabin Windows PC connected to the weighbridge indicator.
 * Reads the COM port and streams live weight directly to the cloud / web application.
 */

const { SerialPort } = require('serialport');
const { io } = require('socket.io-client');
const fs = require('fs');
const path = require('path');

// Configuration
const CONFIG_FILE = path.join(__dirname, 'agent_config.json');

const defaultConfig = {
  cloudServerUrl: 'https://wsms-1.onrender.com', // Your deployed backend
  baudRate: 9600,
  comPort: 'AUTO', // e.g. "COM1", "COM3", or "AUTO" to detect automatically
  reconnectIntervalMs: 3000
};

// Load or create config
let config = defaultConfig;
if (fs.existsSync(CONFIG_FILE)) {
  try {
    config = { ...defaultConfig, ...JSON.parse(fs.readFileSync(CONFIG_FILE, 'utf8')) };
  } catch (e) {
    console.error('Could not parse agent_config.json, using defaults.');
  }
} else {
  fs.writeFileSync(CONFIG_FILE, JSON.stringify(defaultConfig, null, 2));
}

console.log('========================================================');
console.log('       WSMS LOCAL WEIGHBRIDGE AGENT                    ');
console.log('========================================================');
console.log(`Cloud Server : ${config.cloudServerUrl}`);
console.log(`Baud Rate    : ${config.baudRate}`);
console.log(`Target Port  : ${config.comPort}`);
console.log('--------------------------------------------------------\n');

// Connect to Cloud Socket.IO
const socket = io(config.cloudServerUrl, {
  reconnection: true,
  reconnectionDelay: config.reconnectIntervalMs
});

socket.on('connect', () => {
  console.log('🟢 [CLOUD] Connected to WSMS Cloud Server');
});

socket.on('disconnect', () => {
  console.log('🔴 [CLOUD] Disconnected from WSMS Cloud Server');
});

socket.on('connect_error', (err) => {
  console.error('⚠️ [CLOUD] Connection error:', err.message);
});

// Catch uncaught exceptions to prevent silent crashes
process.on('uncaughtException', (err) => {
  console.error('\n❌ [FATAL ERROR]:', err.message);
  console.log('\nTroubleshooting tips:');
  console.log('1. Check if another program is already using the COM port.');
  console.log('2. Check if the USB cable is firmly plugged in.');
  console.log('3. Press any key in the window to see details.\n');
});

// Setup Serial Port Connection
let activePort = null;

async function startSerialConnection() {
  try {
    const ports = await SerialPort.list();
    if (ports.length === 0) {
      console.log('❌ [HARDWARE] No COM ports found on this PC. Re-checking in 5s...');
      setTimeout(startSerialConnection, 5000);
      return;
    }

    console.log(`🔍 [HARDWARE] Available COM ports:`);
    ports.forEach(p => console.log(`   - ${p.path} (${p.manufacturer || 'Standard Serial Device'})`));

    let chosenPort = config.comPort;
    if (chosenPort === 'AUTO' || !chosenPort) {
      chosenPort = ports[0].path;
    }

    console.log(`\n🔌 [HARDWARE] Opening ${chosenPort} at ${config.baudRate} baud...`);

    activePort = new SerialPort({
      path: chosenPort,
      baudRate: config.baudRate,
      autoOpen: true
    });

    activePort.on('open', () => {
      console.log(`✅ [HARDWARE] Successfully opened ${chosenPort}! Reading live weight stream...`);
    });

    let buffer = '';
    activePort.on('data', (chunk) => {
      buffer += chunk.toString();

      // Extract numeric weight sequence from buffer
      const match = buffer.match(/(\d+)/);
      if (match) {
        const weight = parseInt(match[0], 10);
        
        // Print to console
        process.stdout.write(`\r⚖️ Live Machine Weight: ${weight} KG  [Streaming to Cloud] `);

        // Feed to cloud server socket
        if (socket.connected) {
          socket.emit('agent-weight-feed', { weight, status: 'Stable' });
        }
        buffer = '';
      }

      if (buffer.length > 200) buffer = '';
    });

    activePort.on('error', (err) => {
      console.error(`\n❌ [HARDWARE] Serial error on ${chosenPort}:`, err.message);
      retryConnection();
    });

    activePort.on('close', () => {
      console.log(`\n⚠️ [HARDWARE] Port ${chosenPort} was closed.`);
      retryConnection();
    });

  } catch (err) {
    console.error('❌ [HARDWARE] Error starting serial connection:', err);
    retryConnection();
  }
}

function retryConnection() {
  if (activePort && activePort.isOpen) {
    activePort.close();
  }
  activePort = null;
  console.log(`Retrying hardware connection in ${config.reconnectIntervalMs / 1000} seconds...`);
  setTimeout(startSerialConnection, config.reconnectIntervalMs);
}

// Start
startSerialConnection();
