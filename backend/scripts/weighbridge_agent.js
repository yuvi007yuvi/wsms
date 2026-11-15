/**
 * WSMS Local Weighbridge Machine Agent
 *
 * Runs on the cabin Windows PC connected to the weighbridge indicator.
 * Reads the COM port and streams live weight to the cloud server, and reports
 * its own status (COM ports seen, port in use, raw samples) so the
 * Diagnostics page in the web app can show what is happening on the cabin PC.
 *
 * Usage:
 *   node weighbridge_agent.js          -> normal run (streams weight)
 *   node weighbridge_agent.js --scan   -> try every COM port x baud rate, print
 *                                          which one is sending data, then exit
 */

const { SerialPort } = require('serialport');
const { io } = require('socket.io-client');
const fs = require('fs');
const os = require('os');
const path = require('path');

// ---------------------------------------------------------------------------
// Configuration
// ---------------------------------------------------------------------------
const CONFIG_FILE = path.join(__dirname, 'agent_config.json');

const defaultConfig = {
  cloudServerUrl: 'https://wsms-1.onrender.com', // Your deployed backend (no /api)
  comPort: 'AUTO',          // "COM1", "COM3", ... or "AUTO" to detect automatically
  baudRate: 9600,           // Used when comPort is fixed. AUTO also tries scanBaudRates.
  dataBits: 8,
  parity: 'none',           // "none" | "even" | "odd"
  stopBits: 1,
  scanBaudRates: [9600, 2400, 4800, 1200, 19200],
  noDataTimeoutMs: 10000,   // In AUTO mode, move to the next port/baud if silent this long
  reverseDigits: false,     // Some indicators send the digits backwards (e.g. "=0021000")
  setDtrRts: true,          // Raise DTR/RTS after opening. USB CDC indicators/cables often send nothing without it.
  pollCommand: '',          // For indicators in demand/print mode: text sent to request a reading, e.g. "P" or "R\r\n"
  pollIntervalMs: 500,
  lines: null,              // Filled in automatically if a specific DTR/RTS state is needed, e.g. { "dtr": false, "rts": false }
  reconnectIntervalMs: 3000,
  lastDetected: null        // Filled in automatically: { comPort, baudRate }
};

let config = { ...defaultConfig };
if (fs.existsSync(CONFIG_FILE)) {
  try {
    config = { ...defaultConfig, ...JSON.parse(fs.readFileSync(CONFIG_FILE, 'utf8')) };
  } catch (e) {
    console.error('Could not parse agent_config.json, using defaults. Fix or delete the file.');
  }
} else {
  saveConfig();
}

function saveConfig() {
  try {
    fs.writeFileSync(CONFIG_FILE, JSON.stringify(config, null, 2));
  } catch (e) {
    console.error('Could not write agent_config.json:', e.message);
  }
}

const SCAN_ONLY = process.argv.includes('--scan');
const AUTO = !config.comPort || String(config.comPort).toUpperCase() === 'AUTO';

console.log('========================================================');
console.log('       WSMS LOCAL WEIGHBRIDGE AGENT  v2.5              ');
console.log('========================================================');
console.log(`Cloud Server : ${config.cloudServerUrl}`);
console.log(`Target Port  : ${config.comPort}`);
console.log(`Serial       : ${config.baudRate} baud, ${config.dataBits}-${config.parity[0].toUpperCase()}-${config.stopBits}`);
console.log(`Mode         : ${SCAN_ONLY ? 'SCAN ONLY' : 'STREAM'}`);
console.log('--------------------------------------------------------\n');

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

// USB-serial adapters commonly used with weighbridge indicators.
const USB_SERIAL_VENDORS = {
  '1a86': 'CH340/CH341 (WCH)',
  '0403': 'FTDI',
  '067b': 'Prolific PL2303',
  '10c4': 'Silicon Labs CP210x'
};

function isBluetooth(p) {
  return /BTHENUM|BLUETOOTH/i.test(p.pnpId || '');
}

function describePort(p) {
  const vid = (p.vendorId || '').toLowerCase();
  const chip = USB_SERIAL_VENDORS[vid];
  let tag = '';
  if (chip) tag = `  [USB adapter: ${chip}]`;
  else if (isBluetooth(p)) tag = '  [BLUETOOTH virtual port - NOT the weighbridge cable]';
  else if (/^USB\\/i.test(p.pnpId || '')) tag = `  [USB device VID ${p.vendorId || '?'} PID ${p.productId || '?'}]`;
  else if (/^ACPI\\/i.test(p.pnpId || '')) tag = '  [Built-in motherboard serial port]';
  return `${p.path}  ${p.manufacturer || 'Standard Serial Device'}${tag}${p.pnpId ? `\n        pnpId: ${p.pnpId}` : ''}`;
}

function warnIfNoCable(ports) {
  const real = ports.filter((p) => !isBluetooth(p));
  if (ports.length > 0 && real.length === 0) {
    console.log('\n⚠️  Only Bluetooth COM ports were found. The weighbridge cable is NOT detected by Windows.');
    console.log('   Plug in the USB-serial cable and install its driver (CH340 / FTDI / Prolific / CP210x). See guide step 2.\n');
  }
}

// Order ports so the most likely weighbridge port is tried first:
// 1) last port that worked, 2) USB-serial adapters, 3) everything else.
function rankPorts(ports) {
  const score = (p) => {
    if (config.lastDetected && p.path === config.lastDetected.comPort) return 0;
    const vid = (p.vendorId || '').toLowerCase();
    const man = (p.manufacturer || '').toLowerCase();
    if (USB_SERIAL_VENDORS[vid] || /ch34|ftdi|prolific|silicon|usb/.test(man)) return 1;
    if (isBluetooth(p)) return 3;
    return 2;
  };
  return [...ports].sort((a, b) => score(a) - score(b));
}

function explainOpenError(portPath, err) {
  const msg = String(err && err.message || err);
  if (/access denied|resource busy|EBUSY|EACCES/i.test(msg)) {
    return `${portPath} is in use by another program. Close any other weighbridge software, HyperTerminal, PuTTY, or a second copy of this agent, then retry.`;
  }
  if (/file not found|cannot find|ENOENT|no such file/i.test(msg)) {
    return `${portPath} does not exist on this PC. Check Device Manager > Ports (COM & LPT) for the correct number and set "comPort" in agent_config.json (or use "AUTO").`;
  }
  return msg;
}

/**
 * Turns a raw indicator frame into a weight in kg, or null if the frame has no weight.
 * Handles common formats: "+001234", "ST,GS,  1234 kg", "   1234\r", "=0021000" (reversed).
 */
function parseWeight(frame) {
  // eslint-disable-next-line no-control-regex
  let s = frame.replace(/[\x00-\x1f]/g, ' ').trim();
  if (!s) return null;
  if (config.reverseDigits) {
    const m = s.match(/\d+(\.\d+)?/);
    if (!m) return null;
    const n = parseFloat(m[0].split('').reverse().join(''));
    return isNaN(n) ? null : n;
  }
  const m = s.match(/([-+])?\s*(\d+(?:\.\d+)?)/);
  if (!m) return null;
  const n = parseFloat(m[2]);
  if (isNaN(n)) return null;
  return m[1] === '-' ? -n : n;
}

// Indicators end each reading with CR, LF, ETX (0x03) or start it with STX (0x02).
const FRAME_SPLIT = /[\r\n\x02\x03]+/;

// Request commands used by common weighbridge indicators in demand mode.
const POLL_CANDIDATES = ['P', 'R', 'W', 'S', 'Q', '\x05', 'P\r\n', 'R\r\n', 'W\r\n', 'S\r\n', 'SI\r\n', 'READ\r\n', '$', '\x02'];

// Raise DTR/RTS and start polling (if configured). Returns a stop function.
function defaultLines() {
  if (config.lines && typeof config.lines === 'object') return config.lines;
  return config.setDtrRts ? { dtr: true, rts: true } : { dtr: false, rts: false };
}

function linesLabel(l) {
  return `DTR ${l.dtr ? 'on' : 'off'}, RTS ${l.rts ? 'on' : 'off'}`;
}

function prepareLine(port, pollCommand = config.pollCommand, lines = defaultLines()) {
  port.set({ dtr: !!lines.dtr, rts: !!lines.rts }, (err) => {
    if (err) console.error(`⚠️ [HARDWARE] Could not set DTR/RTS: ${err.message}`);
  });
  if (!pollCommand) return () => {};
  const cmd = String(pollCommand).replace(/\\r/g, '\r').replace(/\\n/g, '\n');
  const t = setInterval(() => { if (port.isOpen) port.write(cmd); }, config.pollIntervalMs);
  return () => clearInterval(t);
}

// ---------------------------------------------------------------------------
// Scan mode: try every port x baud, report which one sends data
// ---------------------------------------------------------------------------
function listenOnce(portPath, baudRate, ms, pollCommand) {
  return new Promise((resolve) => {
    const result = { portPath, baudRate, bytes: 0, raw: '', weights: [], error: null };
    const port = new SerialPort({
      path: portPath, baudRate,
      dataBits: config.dataBits, parity: config.parity, stopBits: config.stopBits,
      autoOpen: false
    });
    port.open((err) => {
      if (err) { result.error = explainOpenError(portPath, err); return resolve(result); }
      const stopPoll = prepareLine(port, pollCommand);
      let buf = '';
      port.on('data', (chunk) => {
        result.bytes += chunk.length;
        if (result.raw.length < 200) result.raw += chunk.toString('latin1');
        buf += chunk.toString('latin1');
        const parts = buf.split(FRAME_SPLIT);
        buf = parts.pop();
        for (const f of parts) {
          const w = parseWeight(f);
          if (w !== null) result.weights.push(w);
        }
      });
      setTimeout(() => { stopPoll(); port.close(() => resolve(result)); }, ms);
    });
  });
}

async function scanAll() {
  const ports = rankPorts(await SerialPort.list());
  if (ports.length === 0) {
    console.log('❌ No COM ports on this PC. See guide step 2 (cable + USB driver).');
    return null;
  }
  console.log('🔍 COM ports found:');
  ports.forEach((p) => console.log('   - ' + describePort(p)));
  warnIfNoCable(ports);
  console.log('\nListening on each port at each baud rate for 3 seconds. Keep a load (or a person) on the weighbridge if possible...\n');

  let best = null;
  const silentPorts = [];
  for (const p of ports) {
    let total = 0, failed = false;
    for (const baud of config.scanBaudRates) {
      const r = await listenOnce(p.path, baud, 3000);
      if (r.error) { console.log(`   ${p.path} @ ${baud}: ❌ ${r.error}`); failed = true; break; }
      total += r.bytes;
      const printable = r.raw.replace(/[^\x20-\x7e]/g, '.').slice(0, 60);
      console.log(`   ${p.path} @ ${baud}: ${r.bytes} bytes, ${r.weights.length} readings  ${printable ? `"${printable}"` : ''}`);
      // Correct baud gives clean printable digits; wrong baud gives garbage with few parsable numbers.
      if (r.weights.length > 0 && (!best || r.weights.length > best.weights.length)) best = r;
    }
    if (!failed && total === 0 && !isBluetooth(p)) silentPorts.push(p.path);
  }

  // Indicators in demand/print mode stay silent until asked. Try common request commands.
  if (!best && silentPorts.length > 0) {
    console.log('\nNo data at all. Trying common "send weight" request commands (demand mode)...\n');
    for (const portPath of silentPorts) {
      for (const cmd of POLL_CANDIDATES) {
        const baud = config.lastDetected && config.lastDetected.comPort === portPath ? config.lastDetected.baudRate : config.baudRate;
        const r = await listenOnce(portPath, baud, 2000, cmd);
        if (r.error) break;
        const printable = r.raw.replace(/[^\x20-\x7e]/g, '.').slice(0, 60);
        console.log(`   ${portPath} @ ${baud} send ${JSON.stringify(cmd)}: ${r.bytes} bytes, ${r.weights.length} readings  ${printable ? `"${printable}"` : ''}`);
        if (r.weights.length > 0) {
          best = r;
          config.pollCommand = cmd;
          console.log(`\n✅ Indicator answers to ${JSON.stringify(cmd)}. Saved as "pollCommand" in agent_config.json.`);
          break;
        }
        if (r.bytes > 0) console.log('      ^ the indicator replied, but no weight was found in the reply. Send this line to support.');
      }
      if (best) break;
    }
  }
  console.log('');
  if (best) {
    console.log(`✅ Weighbridge found on ${best.portPath} at ${best.baudRate} baud. Sample weights: ${best.weights.slice(-5).join(', ')}`);
    config.lastDetected = { comPort: best.portPath, baudRate: best.baudRate };
    saveConfig();
    console.log('   Saved to agent_config.json (lastDetected). AUTO mode will use it first.');
  } else {
    console.log('❌ No port sent readable weight data. See guide steps 3-5 (indicator output, cable wiring, baud rate).');
    console.log('   If every line above says "0 bytes": the indicator is not transmitting on this port.');
    console.log('   In the indicator setup menu set the serial/COM output to CONTINUOUS and the output port to USB (or PC),');
    console.log('   or find its request command in the manual and put it in "pollCommand" in agent_config.json.');
  }
  return best;
}

// ---------------------------------------------------------------------------
// Cloud connection
// ---------------------------------------------------------------------------
let socket = null;
const AGENT_VERSION = '2.5';

// Every byte the indicator sends is written here with the settings in use,
// so data that arrives when nobody is watching (e.g. a truck at night) is never missed.
const RAW_LOG = path.join(__dirname, 'weighbridge_raw_log.txt');
const RAW_LOG_MAX = 5 * 1024 * 1024;
function logRaw(portPath, baudRate, lineState, pollCmd, chunk) {
  try {
    if (fs.existsSync(RAW_LOG) && fs.statSync(RAW_LOG).size > RAW_LOG_MAX) fs.renameSync(RAW_LOG, RAW_LOG + '.old');
    const printable = chunk.toString('latin1').replace(/[^\x20-\x7e]/g, '.');
    fs.appendFileSync(RAW_LOG, `${new Date().toISOString()} ${portPath} @${baudRate} ${linesLabel(lineState)}${pollCmd ? ` req=${JSON.stringify(pollCmd)}` : ''} | ${chunk.toString('hex')} | ${printable}\n`);
  } catch (e) { /* logging must never stop the agent */ }
}
const agentState = {
  version: AGENT_VERSION,
  pollCommand: null,
  hostname: os.hostname(),
  comPorts: [],
  activePort: null,
  baudRate: null,
  portOpen: false,
  lastWeight: null,
  lastDataAt: null,
  lastError: null,
  recentSamples: [],
  totalBytes: 0,           // all bytes received since the agent started
  firstDataAt: null,
  startedAt: new Date().toISOString()
};

function pushStatus() {
  if (socket && socket.connected) socket.emit('agent-status', agentState);
}

function connectCloud() {
  socket = io(config.cloudServerUrl, {
    reconnection: true,
    reconnectionDelay: config.reconnectIntervalMs,
    timeout: 60000 // Render free tier can take ~50s to wake up
  });
  socket.on('connect', () => {
    console.log('\n🟢 [CLOUD] Connected to WSMS Cloud Server');
    pushStatus();
  });
  socket.on('disconnect', (reason) => console.log(`\n🔴 [CLOUD] Disconnected (${reason}). Reconnecting...`));
  socket.on('connect_error', (err) => {
    console.error(`\n⚠️ [CLOUD] Cannot reach ${config.cloudServerUrl}: ${err.message}`);
    console.error('   Check internet, the cloudServerUrl in agent_config.json, or wait ~1 min if the server is waking up.');
  });
  setInterval(pushStatus, 5000);
}

// ---------------------------------------------------------------------------
// Serial streaming
// ---------------------------------------------------------------------------
let activePort = null;
let retryTimer = null;
let silenceTimer = null;
let candidates = [];      // [{ path, baudRate }] for AUTO mode
let candidateIdx = 0;
let lastEmitted = { weight: null, at: 0 };
let rx = { bytes: 0, hex: '' }; // bytes received on the current port attempt
const lastReadings = [];

function scheduleRetry(delay = config.reconnectIntervalMs) {
  if (retryTimer) return; // only one pending retry at a time
  clearTimeout(silenceTimer);
  const old = activePort;
  activePort = null;
  agentState.portOpen = false;
  pushStatus();
  if (old && old.isOpen) old.close(() => {});
  console.log(`Retrying hardware connection in ${delay / 1000}s...`);
  retryTimer = setTimeout(() => { retryTimer = null; startSerialConnection(); }, delay);
}

async function buildCandidates() {
  let ports = [];
  try {
    ports = rankPorts(await SerialPort.list());
  } catch (e) {
    console.error('⚠️ [HARDWARE] Could not list COM ports:', e.message);
  }
  agentState.comPorts = ports.map((p) => ({ path: p.path, manufacturer: p.manufacturer || null, vendorId: p.vendorId || null, pnpId: p.pnpId || null, bluetooth: isBluetooth(p) }));
  if (ports.length > 0) {
    console.log('🔍 [HARDWARE] Available COM ports:');
    ports.forEach((p) => console.log('   - ' + describePort(p)));
    warnIfNoCable(ports);
  }

  // A port set by hand is always tried, even if it is not in the list.
  if (!AUTO) return [{ path: config.comPort, baudRate: config.baudRate }];
  if (ports.length === 0) return [];

  const list = [];
  const bauds = [config.baudRate, ...config.scanBaudRates.filter((b) => b !== config.baudRate)];
  if (config.lastDetected) list.push({ path: config.lastDetected.comPort, baudRate: config.lastDetected.baudRate });
  for (const p of ports) for (const b of bauds) {
    if (!list.some((c) => c.path === p.path && c.baudRate === b)) list.push({ path: p.path, baudRate: b });
  }
  const result = list.filter((c) => ports.some((p) => p.path === c.path));
  // If no request command is configured, also try common ones: some indicators only send when asked.
  if (!config.pollCommand) {
    for (const p of ports.filter((x) => !isBluetooth(x))) {
      for (const cmd of POLL_CANDIDATES) result.push({ path: p.path, baudRate: config.baudRate, poll: cmd });
    }
  }
  // Some devices only send with particular DTR/RTS control-line states (old software may have used these).
  if (!config.lines) {
    const combos = [{ dtr: false, rts: false }, { dtr: true, rts: false }, { dtr: false, rts: true }];
    for (const p of ports.filter((x) => !isBluetooth(x))) {
      for (const l of combos) result.push({ path: p.path, baudRate: config.baudRate, lines: l });
    }
  }
  return result;
}

async function startSerialConnection() {
  try {
    if (candidates.length === 0 || candidateIdx >= candidates.length) {
      if (AUTO && candidates.length > 0 && candidateIdx >= candidates.length) {
        console.log('\n========================================================');
        console.log('❌ Tried every port, baud rate and request command: the indicator sent NOTHING.');
        console.log('   The PC side is fine. Change the INDICATOR setup menu:');
        console.log('   - serial / COM output mode = CONTINUOUS (not Print / Demand)');
        console.log('   - output port = USB (or PC / COM1) if the indicator has that option');
        console.log('   Or read weight from the indicator\'s 9-pin TABLE TOP / REMOTE port with a USB-RS232 adapter.');
        console.log('   Starting the search again...');
        console.log('========================================================');
      }
      candidates = await buildCandidates();
      candidateIdx = 0;
    }
    if (candidates.length === 0) {
      agentState.lastError = 'No COM ports found on this PC';
      console.log('❌ [HARDWARE] No COM ports found on this PC. Check cable and USB driver. Re-checking in 5s...');
      pushStatus();
      return scheduleRetry(5000);
    }

    const { path: portPath, baudRate, poll, lines } = candidates[candidateIdx];
    const pollCmd = poll !== undefined ? poll : config.pollCommand;
    const lineState = lines || defaultLines();
    console.log(`\n🔌 [HARDWARE] Opening ${portPath} at ${baudRate} baud...`);

    const port = new SerialPort({
      path: portPath, baudRate,
      dataBits: config.dataBits, parity: config.parity, stopBits: config.stopBits,
      autoOpen: false
    });
    activePort = port;

    port.open((err) => {
      if (err) {
        agentState.lastError = explainOpenError(portPath, err);
        console.error(`❌ [HARDWARE] ${agentState.lastError}`);
        candidateIdx++;
        return scheduleRetry(AUTO ? 500 : config.reconnectIntervalMs);
      }
      agentState.activePort = portPath;
      agentState.baudRate = baudRate;
      agentState.pollCommand = pollCmd || null;
      agentState.portOpen = true;
      agentState.lastError = null;
      pushStatus();
      console.log(`✅ [HARDWARE] Opened ${portPath} (${linesLabel(lineState)})${pollCmd ? ` (sending request ${JSON.stringify(pollCmd)})` : ''}. Waiting for weight data...`);
      const stopPoll = prepareLine(port, pollCmd, lineState);
      port.once('close', stopPoll);
      armSilenceTimer(portPath, baudRate, poll !== undefined ? 3000 : lines ? 6000 : config.noDataTimeoutMs);
    });

    let buffer = '';
    let gotWeight = false;
    rx = { bytes: 0, hex: '' };
    port.on('data', (chunk) => {
      rx.bytes += chunk.length;
      if (agentState.totalBytes === 0) {
        agentState.firstDataAt = new Date().toISOString();
        console.log(`\n📥 FIRST DATA from the indicator on ${portPath} @ ${baudRate} baud (${linesLabel(lineState)}${pollCmd ? `, request ${JSON.stringify(pollCmd)}` : ''}). Logged to weighbridge_raw_log.txt`);
      }
      agentState.totalBytes += chunk.length;
      logRaw(portPath, baudRate, lineState, pollCmd, chunk);
      if (rx.hex.length < 90) rx.hex += chunk.toString('hex').replace(/(..)/g, '$1 ');
      const text = chunk.toString('latin1');
      agentState.lastDataAt = new Date().toISOString();
      buffer += text;
      const frames = buffer.split(FRAME_SPLIT);
      buffer = frames.pop(); // keep the incomplete tail for the next chunk
      if (buffer.length > 200) { frames.push(buffer); buffer = ''; } // indicator without delimiters

      for (const f of frames) {
        // Keep complete raw readings for the Diagnostics page
        const printable = f.replace(/[^\x20-\x7e]/g, '.').trim();
        if (printable) {
          agentState.recentSamples.push(printable);
          if (agentState.recentSamples.length > 20) agentState.recentSamples.shift();
        }
        const weight = parseWeight(f);
        if (weight === null) continue;
        if (!gotWeight) {
          gotWeight = true;
          clearTimeout(silenceTimer);
          if (lines) {
            config.lines = lines;
            saveConfig();
            console.log(`\n💾 Indicator sends with ${linesLabel(lines)} (saved as "lines" in agent_config.json).`);
          }
          if (poll !== undefined && config.pollCommand !== poll) {
            config.pollCommand = poll;
            saveConfig();
            console.log(`\n💾 Indicator answers to request ${JSON.stringify(poll)} (saved as "pollCommand" in agent_config.json).`);
          }
          if (AUTO && (!config.lastDetected || config.lastDetected.comPort !== portPath || config.lastDetected.baudRate !== baudRate)) {
            config.lastDetected = { comPort: portPath, baudRate };
            saveConfig();
            console.log(`\n💾 Detected weighbridge on ${portPath} @ ${baudRate} baud (saved to agent_config.json).`);
          }
        }
        handleWeight(weight);
      }
    });

    port.on('error', (err) => {
      if (activePort !== port) return; // e.g. a pending request write aborted because we closed the port on purpose
      agentState.lastError = explainOpenError(portPath, err);
      console.error(`\n❌ [HARDWARE] Serial error on ${portPath}: ${agentState.lastError}`);
      scheduleRetry();
    });

    port.on('close', () => {
      if (activePort !== port) return; // closed on purpose while switching ports
      console.log(`\n⚠️ [HARDWARE] Port ${portPath} was closed (cable unplugged?).`);
      candidates = []; // re-list ports, the COM number may change after re-plugging
      scheduleRetry();
    });
  } catch (err) {
    agentState.lastError = err.message;
    console.error('❌ [HARDWARE] Error starting serial connection:', err.message);
    scheduleRetry();
  }
}

function armSilenceTimer(portPath, baudRate, timeoutMs = config.noDataTimeoutMs) {
  clearTimeout(silenceTimer);
  silenceTimer = setTimeout(() => {
    const msg = rx.bytes === 0
      ? `0 bytes received from ${portPath} @ ${baudRate} baud in ${timeoutMs / 1000}s (nothing is sending on this port: wrong port, cable not connected to the indicator, or indicator serial output OFF).`
      : `${rx.bytes} bytes received from ${portPath} @ ${baudRate} baud but no readable weight (likely wrong baud/parity). First bytes (hex): ${rx.hex.trim()}`;
    agentState.lastError = msg;
    if (AUTO && candidates.length > 1) {
      console.log(`\n⏭️  ${msg} Trying next port/baud...`);
      candidateIdx++;
      scheduleRetry(300);
    } else {
      console.log(`\n⚠️  ${msg} Check indicator output setting, cable wiring and baud rate (see guide). Still listening...`);
      pushStatus();
    }
  }, timeoutMs);
}

function handleWeight(weight) {
  lastReadings.push(weight);
  if (lastReadings.length > 3) lastReadings.shift();
  const status = lastReadings.length === 3 && lastReadings.every((w) => w === weight) ? 'Stable' : 'Reading';
  agentState.lastWeight = weight;

  process.stdout.write(`\r⚖️  Live Machine Weight: ${weight} KG  [${status}] [${socket && socket.connected ? 'Streaming to Cloud' : 'CLOUD OFFLINE'}]     `);

  // Send on change, or at least once a second, so we do not flood the server.
  const now = Date.now();
  if (weight !== lastEmitted.weight || now - lastEmitted.at > 1000) {
    if (socket && socket.connected) socket.emit('agent-weight-feed', { weight, status });
    lastEmitted = { weight, at: now };
  }
}

// ---------------------------------------------------------------------------
// Start
// ---------------------------------------------------------------------------
process.on('uncaughtException', (err) => {
  console.error('\n❌ [FATAL ERROR]:', err.message);
  scheduleRetry();
});

if (SCAN_ONLY) {
  scanAll().then(() => process.exit(0)).catch((e) => { console.error(e.message); process.exit(1); });
} else {
  connectCloud();
  startSerialConnection();
}
