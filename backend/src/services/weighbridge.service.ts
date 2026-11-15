import { SerialPort } from 'serialport';

// Shared weighbridge state
let isConnected = false;
let lastWeight = 0;
let lastStatus: 'Disconnected' | 'Connected' | 'Reading' | 'Stable' = 'Disconnected';
let recentSamples: string[] = [];
let activePort: SerialPort | null = null;
let portPath: string | null = null;

// State reported by the local agent (weighbridge_agent.js) running on the cabin PC.
// The cloud server has no COM ports of its own, so this is what Diagnostics must use.
export interface AgentState {
  version?: string;
  totalBytes?: number;
  firstDataAt?: string | null;
  startedAt?: string | null;
  pollCommand?: string | null;
  hostname?: string;
  comPorts?: { path: string; manufacturer?: string | null; vendorId?: string | null }[];
  activePort?: string | null;
  baudRate?: number | null;
  portOpen?: boolean;
  lastWeight?: number | null;
  lastDataAt?: string | null;
  lastError?: string | null;
  recentSamples?: string[];
}
let agentState: AgentState | null = null;
let agentLastSeen = 0;
const AGENT_TIMEOUT_MS = 15000;

export function updateAgentStatus(state: AgentState) {
  agentState = { ...state, recentSamples: (state.recentSamples || []).slice(-20).map(String) };
  agentLastSeen = Date.now();
}

export function markAgentSeen(weight?: number) {
  agentLastSeen = Date.now();
  if (agentState && typeof weight === 'number') agentState.lastWeight = weight;
}

export function getAgentState() {
  const online = agentState !== null && Date.now() - agentLastSeen < AGENT_TIMEOUT_MS;
  return { online, lastSeen: agentLastSeen ? new Date(agentLastSeen).toISOString() : null, ...(agentState || {}) };
}

export function getWeighbridgeState() {
  return {
    isConnected,
    lastWeight,
    lastStatus,
    recentSamples: [...recentSamples],
    portPath,
  };
}

export async function setupWeighbridge(io: any) {
  try {
    const ports = await SerialPort.list();
    if (ports.length === 0) {
      console.log('No COM ports detected for weighbridge.');
      return;
    }

    portPath = ports[0].path;
    console.log(`Connecting to weighbridge on ${portPath}...`);

    activePort = new SerialPort({
      path: portPath,
      baudRate: 9600,
      autoOpen: true
    });

    activePort.on('open', () => {
      console.log(`Successfully opened ${portPath}`);
      isConnected = true;
      lastStatus = 'Connected';
    });

    let buffer = '';
    activePort.on('data', (data) => {
      buffer += data.toString();
      const rawStr = data.toString().trim();
      if (rawStr) {
        // Keep last 50 samples for diagnostics
        recentSamples.push(rawStr);
        if (recentSamples.length > 50) recentSamples.shift();
      }

      const match = buffer.match(/(\d+)/);
      if (match) {
        const weight = parseInt(match[0], 10);
        lastWeight = weight;
        lastStatus = 'Stable';
        io.emit('weight-update', { weight, status: 'Stable' });
        buffer = '';
      }
      if (buffer.length > 100) buffer = '';
    });

    activePort.on('error', (err) => {
      console.error('Serial port error:', err.message);
      isConnected = false;
      lastStatus = 'Disconnected';
      io.emit('weight-update', { weight: 0, status: 'Disconnected' });
    });

    activePort.on('close', () => {
      console.log(`Serial port ${portPath} closed`);
      isConnected = false;
      lastStatus = 'Disconnected';
      io.emit('weight-update', { weight: 0, status: 'Disconnected' });
    });

  } catch (err) {
    console.error('Error setting up weighbridge:', err);
  }
}

/**
 * Run a diagnostic check. If the main connection is already active,
 * reports its state. If not, temporarily opens the port for testing.
 */
export async function runDiagnostic(): Promise<{
  dataReceived: boolean;
  message: string;
  samples: string[];
  parsedWeights: number[];
}> {
  // Cloud deployment: the weighbridge is read by the local agent on the cabin PC.
  const agent = getAgentState();
  if (agent.online) {
    const samples = agent.recentSamples || [];
    const parsedWeights: number[] = [];
    for (const s of samples) {
      const m = s.match(/(\d+)/);
      if (m) parsedWeights.push(parseInt(m[0], 10));
    }
    if (!agent.portOpen) {
      return {
        dataReceived: false,
        message: `Agent on ${agent.hostname || 'cabin PC'} is online but no COM port is open. ${agent.lastError || ''} Ports seen: ${(agent.comPorts || []).map(p => p.path).join(', ') || 'none'}.`,
        samples: [], parsedWeights: [],
      };
    }
    if (samples.length === 0) {
      return {
        dataReceived: false,
        message: `Agent ${agent.version ? 'v' + agent.version : '(OLD version - download the new weighbridge_agent.js)'} on ${agent.hostname || 'cabin PC'} opened ${agent.activePort} @ ${agent.baudRate} baud${agent.pollCommand ? `, sending request ${JSON.stringify(agent.pollCommand)}` : ''}, but no data received. Total bytes from the indicator since the agent started${agent.startedAt ? ` (${new Date(agent.startedAt).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })})` : ''}: ${agent.totalBytes ?? 'unknown'}. ${agent.lastError || 'Check indicator serial output and cable wiring.'}`,
        samples: [], parsedWeights: [],
      };
    }
    return {
      dataReceived: true,
      message: `Agent on ${agent.hostname || 'cabin PC'} reading ${agent.activePort} @ ${agent.baudRate} baud.`,
      samples,
      parsedWeights: [...new Set(parsedWeights)].slice(0, 20),
    };
  }

  // If the main connection is already active and receiving data, report that
  if (isConnected && recentSamples.length > 0) {
    const parsedWeights: number[] = [];
    for (const s of recentSamples) {
      const match = s.match(/(\d+)/);
      if (match) {
        const w = parseInt(match[0], 10);
        if (!isNaN(w) && w > 0) parsedWeights.push(w);
      }
    }
    return {
      dataReceived: true,
      message: `Main connection active on ${portPath}. ${recentSamples.length} sample(s) in buffer.`,
      samples: recentSamples.slice(-20),
      parsedWeights: [...new Set(parsedWeights)].slice(0, 20),
    };
  }

  // If connected but no samples yet
  if (isConnected && recentSamples.length === 0) {
    return {
      dataReceived: false,
      message: `Port ${portPath} is open but no data received yet. The indicator may not be sending data.`,
      samples: [],
      parsedWeights: [],
    };
  }

  // Not connected — try to open temporarily for 8 seconds
  const LISTEN_DURATION = 8000;
  try {
    const ports = await SerialPort.list();
    if (ports.length === 0) {
      return {
        dataReceived: false,
        message: 'No weighbridge agent connected and this server has no COM ports. Run start_agent.bat on the weighbridge cabin PC.',
        samples: [],
        parsedWeights: [],
      };
    }

    const testPortPath = ports[0].path;
    const samples: string[] = [];
    const parsedWeights: number[] = [];

    const testPort = new SerialPort({
      path: testPortPath,
      baudRate: 9600,
      autoOpen: false
    });

    await new Promise<void>((resolve, reject) => {
      testPort.open((err) => {
        if (err) reject(err);
        else resolve();
      });
    });

    testPort.on('data', (data: Buffer) => {
      const str = data.toString().trim();
      if (str) {
        samples.push(str);
        const match = str.match(/(\d+)/);
        if (match) {
          const weight = parseInt(match[0], 10);
          if (!isNaN(weight) && weight > 0) parsedWeights.push(weight);
        }
      }
    });

    await new Promise<void>((resolve) => {
      setTimeout(() => {
        testPort.close((err) => {
          if (err) console.error('Error closing diagnostic port:', err);
          resolve();
        });
      }, LISTEN_DURATION);
    });

    return {
      dataReceived: samples.length > 0,
      message: samples.length > 0
        ? `Received ${samples.length} data sample(s) from ${testPortPath} in ${LISTEN_DURATION / 1000}s.`
        : `No data received from ${testPortPath} after ${LISTEN_DURATION / 1000}s. The indicator may not be sending data.`,
      samples: samples.slice(0, 50),
      parsedWeights: [...new Set(parsedWeights)].slice(0, 20),
    };

  } catch (error: any) {
    return {
      dataReceived: false,
      message: `Diagnostic failed: ${error.message}. The port may be in use.`,
      samples: [],
      parsedWeights: [],
    };
  }
}
