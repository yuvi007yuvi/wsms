import { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useTranslation } from 'react-i18next';
import api from '@/lib/api';

type DiagnosticStep = {
  id: string;
  label: string;
  status: 'pending' | 'running' | 'pass' | 'fail' | 'warn';
  message?: string;
  detail?: string;
};



export default function Diagnostics() {
  const { t } = useTranslation();
  const [isRunning, setIsRunning] = useState(false);
  const [steps, setSteps] = useState<DiagnosticStep[]>([]);
  const [rawDataLog, setRawDataLog] = useState<string[]>([]);
  const [overallVerdict, setOverallVerdict] = useState<'idle' | 'hardware' | 'software' | 'healthy' | 'running'>('idle');
  const logEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    logEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [rawDataLog]);

  const runDiagnostic = async () => {
    setIsRunning(true);
    setOverallVerdict('running');
    setRawDataLog([]);

    const initialSteps: DiagnosticStep[] = [
      { id: 'backend', label: t('Backend Server'), status: 'pending' },
      { id: 'database', label: t('Database'), status: 'pending' },
      { id: 'ports', label: t('COM Port Detection'), status: 'pending' },
      { id: 'hardware', label: t('Hardware Data Stream'), status: 'pending' },
      { id: 'socket', label: t('WebSocket Relay'), status: 'pending' },
    ];
    setSteps(initialSteps);

    const updateStep = (id: string, update: Partial<DiagnosticStep>) => {
      setSteps(prev => prev.map(s => s.id === id ? { ...s, ...update } : s));
    };

    // Step 1: Backend Server
    updateStep('backend', { status: 'running' });
    try {
      const healthRes = await api.get('/system/health');
      if (healthRes.data) {
        updateStep('backend', { status: 'pass', message: `Node ${healthRes.data.components?.system?.nodeVersion || 'OK'}` });

        // Step 2: Local Database
        updateStep('database', { status: 'running' });
        const dbStatus = healthRes.data.components?.database?.status;
        if (dbStatus === 'connected') {
          updateStep('database', { status: 'pass', message: healthRes.data.components.database.message });
        } else {
          updateStep('database', { status: 'fail', message: healthRes.data.components.database.message || 'Disconnected' });
        }


        // Step 4: COM Port Detection
        updateStep('ports', { status: 'running' });
        const hwStatus = healthRes.data.components?.hardware;
        if (hwStatus?.status === 'connected' && hwStatus.ports?.length > 0) {
          updateStep('ports', { status: 'pass', message: `${hwStatus.ports.length} port(s): ${hwStatus.ports.join(', ')}` });
        } else {
          updateStep('ports', { status: 'fail', message: 'No COM ports detected. Check USB/RS232 cable and drivers.' });
          updateStep('hardware', { status: 'fail', message: 'Skipped — no ports available' });
          updateStep('socket', { status: 'fail', message: 'Skipped — no hardware connection' });
          setOverallVerdict('hardware');
          setIsRunning(false);
          return;
        }

      } else {
        throw new Error('Empty response');
      }
    } catch (err: any) {
      updateStep('backend', { status: 'fail', message: `Cannot reach backend: ${err.message}` });
      updateStep('database', { status: 'fail', message: 'Skipped' });
      updateStep('ports', { status: 'fail', message: 'Skipped' });
      updateStep('hardware', { status: 'fail', message: 'Skipped' });
      updateStep('socket', { status: 'fail', message: 'Skipped' });
      setOverallVerdict('software');
      setIsRunning(false);
      return;
    }

    // Step 5: Hardware Data Stream Test
    updateStep('hardware', { status: 'running', message: 'Testing data stream from COM port...' });
    try {
      const diagRes = await api.get('/system/diagnose-weighbridge', { timeout: 12000 });
      const diagData = diagRes.data;

      if (diagData.dataReceived && diagData.samples?.length > 0) {
        updateStep('hardware', { 
          status: 'pass', 
          message: `Receiving data! ${diagData.samples.length} sample(s) captured.`,
          detail: diagData.samples.map((s: string) => s).join('\n')
        });
        setRawDataLog(diagData.samples || []);

        // Step 6: WebSocket Relay
        updateStep('socket', { status: 'running' });
        if (diagData.parsedWeights && diagData.parsedWeights.length > 0) {
          updateStep('socket', { 
            status: 'pass', 
            message: `Parsed ${diagData.parsedWeights.length} weight value(s): ${diagData.parsedWeights.join(', ')} kg` 
          });
          setOverallVerdict('healthy');
        } else {
          updateStep('socket', { 
            status: 'warn', 
            message: 'Data received but no numeric weights could be parsed. Format may need adjustment.' 
          });
          setOverallVerdict('software');
        }
      } else {
        updateStep('hardware', { 
          status: 'fail', 
          message: diagData.message || 'No data received from weighbridge in 8 seconds.' 
        });
        updateStep('socket', { status: 'fail', message: 'Skipped — no data from hardware' });
        setOverallVerdict('hardware');
      }
    } catch (err: any) {
      updateStep('hardware', { status: 'fail', message: `Diagnostic request failed: ${err.message}` });
      updateStep('socket', { status: 'fail', message: 'Skipped' });
      setOverallVerdict('hardware');
    }

    setIsRunning(false);
  };

  const getStatusIcon = (status: DiagnosticStep['status']) => {
    switch (status) {
      case 'pass': return '✅';
      case 'fail': return '❌';
      case 'warn': return '⚠️';
      case 'running': return '⏳';
      default: return '⬜';
    }
  };

  const getStatusColor = (status: DiagnosticStep['status']) => {
    switch (status) {
      case 'pass': return 'text-green-700 bg-green-50 border-green-200';
      case 'fail': return 'text-red-700 bg-red-50 border-red-200';
      case 'warn': return 'text-amber-700 bg-amber-50 border-amber-200';
      case 'running': return 'text-blue-700 bg-blue-50 border-blue-200 animate-pulse';
      default: return 'text-slate-400 bg-slate-50 border-slate-200';
    }
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">{t('Weighbridge Diagnostics')}</h1>
          <p className="text-sm text-slate-500 mt-1">{t('Test hardware and software connectivity to identify issues')}</p>
        </div>
        <Button
          onClick={runDiagnostic}
          disabled={isRunning}
          size="lg"
          className="bg-[#1E3A8A] hover:bg-[#1E3A8A]/90 text-white font-bold uppercase tracking-wider text-sm px-8"
        >
          {isRunning ? (
            <span className="flex items-center gap-2">
              <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg>
              {t('Running...')}
            </span>
          ) : t('Run Diagnostic')}
        </Button>
      </div>

      {/* Verdict Banner */}
      {overallVerdict !== 'idle' && overallVerdict !== 'running' && (
        <Card className={`border-2 ${
          overallVerdict === 'healthy' ? 'border-green-500 bg-green-50' :
          overallVerdict === 'hardware' ? 'border-red-500 bg-red-50' :
          'border-amber-500 bg-amber-50'
        }`}>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <span className="text-3xl">
                {overallVerdict === 'healthy' ? '✅' : overallVerdict === 'hardware' ? '🔌' : '💻'}
              </span>
              <div>
                <h3 className={`font-bold text-lg ${
                  overallVerdict === 'healthy' ? 'text-green-800' :
                  overallVerdict === 'hardware' ? 'text-red-800' :
                  'text-amber-800'
                }`}>
                  {overallVerdict === 'healthy' ? t('All Systems Operational') :
                   overallVerdict === 'hardware' ? t('Hardware Issue Detected') :
                   t('Software Issue Detected')}
                </h3>
                <p className={`text-sm ${
                  overallVerdict === 'healthy' ? 'text-green-700' :
                  overallVerdict === 'hardware' ? 'text-red-700' :
                  'text-amber-700'
                }`}>
                  {overallVerdict === 'healthy' ? t('Weighbridge hardware is connected and sending data correctly.') :
                   overallVerdict === 'hardware' ? t('The issue is with the physical hardware connection. Check cables, indicator settings, and baud rate.') :
                   t('The software is not correctly processing the data. The parsing logic may need adjustment.')}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Steps Grid */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm uppercase tracking-wider text-slate-500">{t('Diagnostic Steps')}</CardTitle>
        </CardHeader>
        <CardContent>
          {steps.length === 0 ? (
            <div className="text-center py-12 text-slate-400">
              <div className="text-5xl mb-4">🔍</div>
              <p className="font-medium">{t('Click "Run Diagnostic" to begin testing')}</p>
            </div>
          ) : (
            <div className="space-y-2">
              {steps.map((step) => (
                <div
                  key={step.id}
                  className={`flex items-start gap-3 p-3 rounded-lg border transition-all ${getStatusColor(step.status)}`}
                >
                  <span className="text-lg mt-0.5 shrink-0">{getStatusIcon(step.status)}</span>
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold text-sm">{step.label}</div>
                    {step.message && (
                      <div className="text-xs mt-0.5 opacity-80">{step.message}</div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Raw Data Log */}
      {rawDataLog.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm uppercase tracking-wider text-slate-500">{t('Raw Data from Weighbridge')}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="bg-slate-900 text-green-400 p-4 rounded-lg font-mono text-xs max-h-48 overflow-auto">
              {rawDataLog.map((line, i) => (
                <div key={i} className="py-0.5">
                  <span className="text-slate-500 mr-2">[{String(i + 1).padStart(2, '0')}]</span>
                  {line}
                </div>
              ))}
              <div ref={logEndRef} />
            </div>
          </CardContent>
        </Card>
      )}

      {/* Troubleshooting Guide & Direct Fixes */}
      <Card className="border-slate-300 shadow-sm">
        <CardHeader className="bg-slate-50 border-b border-slate-200 py-3">
          <CardTitle className="text-sm font-bold uppercase tracking-wider text-slate-800 flex items-center justify-between">
            <span className="flex items-center gap-2">🛠️ {t('Weighbridge Hardware Setup & Driver Fixes Guide')}</span>
            <span className="text-[11px] font-semibold px-2 py-0.5 bg-blue-100 text-blue-800 rounded">Step-by-Step Fixes</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 pt-4 text-sm text-slate-700">
          
          {/* Fix 1: Drivers */}
          <div className="border border-slate-200 rounded-lg p-3 bg-white">
            <div className="flex items-center gap-2 font-bold text-slate-900 mb-1">
              <span className="w-6 h-6 rounded-full bg-blue-600 text-white flex items-center justify-center text-xs">1</span>
              <span>Install USB-to-Serial Cable Driver (Yellow Exclamation Mark ⚠️ Fix)</span>
            </div>
            <p className="text-xs text-slate-600 mb-2">
              If Windows shows an unknown device or yellow triangle in Device Manager, install the appropriate USB-to-Serial chip driver below:
            </p>
            <div className="flex flex-wrap gap-3">
              <a 
                href="https://www.wch-ic.com/downloads/CH341SER_EXE.html" 
                target="_blank" 
                rel="noreferrer" 
                className="inline-flex items-center text-xs font-semibold px-3 py-1.5 bg-blue-50 text-blue-700 border border-blue-200 rounded hover:bg-blue-100 transition-colors"
              >
                📥 Download CH340 / CH341 Driver (CH341SER.EXE)
              </a>
              <a 
                href="https://ftdichip.com/drivers/vcp-drivers/" 
                target="_blank" 
                rel="noreferrer" 
                className="inline-flex items-center text-xs font-semibold px-3 py-1.5 bg-slate-100 text-slate-700 border border-slate-300 rounded hover:bg-slate-200 transition-colors"
              >
                📥 Download FTDI VCP Driver Setup
              </a>
              <a 
                href="https://www.prolific.com.tw/US/ShowProduct.aspx?p_id=225&pcid=41" 
                target="_blank" 
                rel="noreferrer" 
                className="inline-flex items-center text-xs font-semibold px-3 py-1.5 bg-slate-100 text-slate-700 border border-slate-300 rounded hover:bg-slate-200 transition-colors"
              >
                📥 Download Prolific PL2303 Driver
              </a>
            </div>
          </div>

          {/* Fix 2: Indicator Continuous Mode */}
          <div className="border border-slate-200 rounded-lg p-3 bg-white">
            <div className="flex items-center gap-2 font-bold text-slate-900 mb-1">
              <span className="w-6 h-6 rounded-full bg-blue-600 text-white flex items-center justify-center text-xs">2</span>
              <span>Set Weighbridge Indicator to "Continuous Output"</span>
            </div>
            <p className="text-xs text-slate-600">
              In your weighbridge indicator's setup menu (RS232/Communication mode), change the output mode to <strong>"CONT" / "Continuous Stream"</strong>. Do <em>not</em> use "On-Demand" or "Print on Key Press", or data will only send when physical buttons are pressed.
            </p>
          </div>

          {/* Fix 3: Baud Rate Configuration */}
          <div className="border border-slate-200 rounded-lg p-3 bg-white">
            <div className="flex items-center gap-2 font-bold text-slate-900 mb-1">
              <span className="w-6 h-6 rounded-full bg-blue-600 text-white flex items-center justify-center text-xs">3</span>
              <span>Match Baud Rate (Default: 9600)</span>
            </div>
            <p className="text-xs text-slate-600">
              Ensure the indicator's baud rate matches <strong>9600</strong> (standard 8-N-1). If your indicator operates on <strong>2400</strong>, <strong>4800</strong>, or <strong>19200</strong>, edit the baud rate in <code>backend/scripts/agent_config.json</code>.
            </p>
          </div>

          {/* Fix 4: Cable & COM Port */}
          <div className="border border-slate-200 rounded-lg p-3 bg-white">
            <div className="flex items-center gap-2 font-bold text-slate-900 mb-1">
              <span className="w-6 h-6 rounded-full bg-blue-600 text-white flex items-center justify-center text-xs">4</span>
              <span>Check Physical USB / RS232 Connection & Port</span>
            </div>
            <p className="text-xs text-slate-600">
              Plug the USB cable directly into the computer's motherboard USB ports (back of desktop) rather than an unpowered USB hub. Ensure the 9-pin DB9 thumbscrews are firmly fastened. If no data arrives despite a working port, TX and RX pins may need a null-modem (crossover) adapter.
            </p>
          </div>

          {/* Fix 5: Start Local Agent */}
          <div className="border border-blue-200 rounded-lg p-3 bg-blue-50/50">
            <div className="flex items-center gap-2 font-bold text-blue-950 mb-1">
              <span className="w-6 h-6 rounded-full bg-blue-600 text-white flex items-center justify-center text-xs">5</span>
              <span>Run Local Agent to Stream to Cloud</span>
            </div>
            <p className="text-xs text-slate-700">
              Once the driver is installed and COM port is recognized, double-click:
              <br />
              <code className="inline-block mt-1 font-mono text-[11px] bg-slate-900 text-green-400 px-2.5 py-1 rounded">
                backend\scripts\start_agent.bat
              </code>
              <br />
              The agent will automatically stream the continuous live weight from your indicator directly to this web application!
            </p>
          </div>

        </CardContent>
      </Card>

      {overallVerdict === 'software' && (
        <Card className="border-amber-200">
          <CardHeader>
            <CardTitle className="text-sm uppercase tracking-wider text-amber-600">💡 {t('Software Fix Required')}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-slate-700">
            <p>{t('The hardware is sending data, but the software cannot parse it into weight values. Share the raw data samples shown above with the developer to adjust the parsing logic.')}</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
