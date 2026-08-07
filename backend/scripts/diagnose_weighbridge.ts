import { SerialPort } from 'serialport';

async function runDiagnostic() {
  console.log('--- WEIGHBRIDGE DIAGNOSTIC TOOL ---');
  console.log('Scanning for available COM ports...');

  try {
    const ports = await SerialPort.list();
    if (ports.length === 0) {
      console.log('❌ NO COM PORTS FOUND. This is likely a hardware or driver issue.');
      console.log('Please check the USB/RS232 connection and ensure drivers are installed.');
      process.exit(1);
    }

    console.log(`✅ Found ${ports.length} port(s):`);
    ports.forEach(p => console.log(`   - ${p.path} (${p.manufacturer || 'Unknown Manufacturer'})`));

    // For diagnostics, we'll connect to the first available port.
    // Modify this if a specific port needs to be hardcoded for testing.
    const portPath = ports[0].path;
    console.log(`\nAttempting to connect to ${portPath} at 9600 baud rate...`);

    const port = new SerialPort({
      path: portPath,
      baudRate: 9600,
      autoOpen: false
    });

    port.open((err) => {
      if (err) {
        console.error(`❌ Failed to open port ${portPath}:`, err.message);
        console.log('Please ensure the port is not being used by another application (like the main backend server).');
        process.exit(1);
      }
      console.log(`✅ Successfully connected to ${portPath}. Listening for raw data...`);
      console.log('(Press Ctrl+C to stop)\n');
      console.log('--- RAW DATA STREAM ---');
    });

    // Listen for data
    port.on('data', (data) => {
      // Print raw hex buffer for deep debugging
      console.log(`[RAW HEX]:`, data);
      // Print string representation
      console.log(`[STRING]:  ${data.toString()}`);
    });

    port.on('error', (err) => {
      console.error('\n❌ Serial port error:', err.message);
    });

    port.on('close', () => {
      console.log(`\n⚠️ Connection to ${portPath} closed.`);
    });

  } catch (error) {
    console.error('❌ Fatal error during diagnostic:', error);
  }
}

runDiagnostic();
