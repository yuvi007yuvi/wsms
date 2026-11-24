import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Download, Laptop, WifiOff, HardDrive, CheckCircle2, ArrowRight, AppWindow } from 'lucide-react';

export default function OfflineApp() {
  const handleDownload = () => {
    const apiUrl = import.meta.env.VITE_API_URL || 'https://wsms-1.onrender.com/api';
    window.location.href = `${apiUrl}/system/download-offline-package`;
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Top Banner */}
      <div className="bg-gradient-to-r from-emerald-800 to-teal-900 rounded-xl p-6 text-white shadow-md">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-200 text-xs font-semibold uppercase tracking-wider mb-2 border border-emerald-400/30">
              <WifiOff className="w-3.5 h-3.5" /> 100% Offline Capable
            </div>
            <h1 className="text-2xl font-black tracking-tight">WSMS Offline Windows Application</h1>
            <p className="text-emerald-100/90 text-sm max-w-xl">
              Operate your weighbridge smoothly without any internet connection. Captures live COM port weights directly from indicators, prints slips on dot-matrix printers, and automatically syncs to cloud when online.
            </p>
          </div>
          <div className="flex flex-col sm:flex-row gap-2 shrink-0">
            <Button
              size="lg"
              onClick={handleDownload}
              className="bg-white hover:bg-emerald-50 text-emerald-950 font-bold px-6 h-12 shadow-lg shrink-0 gap-2 text-sm uppercase tracking-wider"
            >
              <Download className="w-4 h-4 text-emerald-700" />
              Download Offline Package
            </Button>
            <Button
              size="lg"
              variant="outline"
              onClick={() => {
                const apiUrl = import.meta.env.VITE_API_URL || 'https://wsms-1.onrender.com/api';
                window.location.href = `${apiUrl}/system/download-desktop-launcher`;
              }}
              className="border-emerald-300 text-white hover:bg-emerald-800/50 font-bold px-4 h-12 gap-2 text-xs uppercase tracking-wider"
            >
              <AppWindow className="w-4 h-4 text-emerald-300" />
              Download Launcher (.bat)
            </Button>
          </div>
        </div>
      </div>

      {/* Two Ways to Run Offline */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card className="border-emerald-200 bg-emerald-50/30 shadow-sm relative overflow-hidden">
          <div className="absolute top-0 right-0 bg-emerald-600 text-white text-[10px] font-bold px-2 py-0.5 rounded-bl">RECOMMENDED</div>
          <CardHeader className="p-4 pb-2">
            <div className="w-9 h-9 rounded-lg bg-emerald-100 text-emerald-800 flex items-center justify-center mb-1">
              <AppWindow className="w-5 h-5" />
            </div>
            <CardTitle className="text-sm font-bold text-slate-800">Option 1: Windows Desktop App</CardTitle>
            <CardDescription className="text-xs text-slate-500">Standalone native window without browser address bars</CardDescription>
          </CardHeader>
          <CardContent className="p-4 pt-1 text-xs text-slate-600 space-y-2">
            <p>
              Runs inside its own dedicated desktop window just like a regular software. No command prompt windows stay open and no browser URL is visible.
            </p>
            <div className="p-2 rounded bg-white border border-emerald-200 font-mono text-[11px] text-emerald-900 font-semibold">
              Double-click: LAUNCH_WINDOWS_APP.bat
            </div>
          </CardContent>
        </Card>

        <Card className="border-slate-200 shadow-sm">
          <CardHeader className="p-4 pb-2">
            <div className="w-9 h-9 rounded-lg bg-blue-50 text-blue-700 flex items-center justify-center mb-1">
              <Laptop className="w-5 h-5" />
            </div>
            <CardTitle className="text-sm font-bold text-slate-800">Option 2: Browser Localhost</CardTitle>
            <CardDescription className="text-xs text-slate-500">Runs local Node.js server on port 5000 in Chrome / Edge</CardDescription>
          </CardHeader>
          <CardContent className="p-4 pt-1 text-xs text-slate-600 space-y-2">
            <p>
              Runs the local SQLite database and opens the web interface in your default browser at <code>http://localhost:5000</code>.
            </p>
            <div className="p-2 rounded bg-slate-50 border border-slate-200 font-mono text-[11px] text-slate-800 font-semibold">
              Double-click: START_OFFLINE_WSMS.bat
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Feature Highlights Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="border-slate-200 shadow-sm">
          <CardHeader className="p-4 pb-2">
            <div className="w-9 h-9 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center mb-2">
              <WifiOff className="w-5 h-5" />
            </div>
            <CardTitle className="text-sm font-bold text-slate-800">No Internet Required</CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-0 text-xs text-slate-600 leading-relaxed">
            All vehicle data, customer lists, and weighing transactions are saved directly to a local, ultra-fast SQLite database on your cabin PC.
          </CardContent>
        </Card>

        <Card className="border-slate-200 shadow-sm">
          <CardHeader className="p-4 pb-2">
            <div className="w-9 h-9 rounded-lg bg-blue-50 text-blue-700 flex items-center justify-center mb-2">
              <HardDrive className="w-5 h-5" />
            </div>
            <CardTitle className="text-sm font-bold text-slate-800">Direct COM Port Connection</CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-0 text-xs text-slate-600 leading-relaxed">
            Connects straight to your RS232 / USB COM port (COM3, COM5, etc.) on the computer with automatic reconnection and live meter streaming.
          </CardContent>
        </Card>

        <Card className="border-slate-200 shadow-sm">
          <CardHeader className="p-4 pb-2">
            <div className="w-9 h-9 rounded-lg bg-purple-50 text-purple-700 flex items-center justify-center mb-2">
              <CheckCircle2 className="w-5 h-5" />
            </div>
            <CardTitle className="text-sm font-bold text-slate-800">Auto Cloud Sync</CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-0 text-xs text-slate-600 leading-relaxed">
            Every 30 seconds, the background worker checks for internet. Whenever network is available, it transparently pushes all offline slips to the cloud.
          </CardContent>
        </Card>
      </div>

      {/* Setup Instructions */}
      <Card className="border-slate-200 shadow-sm">
        <CardHeader className="border-b bg-slate-50/50 py-3 px-5">
          <CardTitle className="text-sm font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2">
            <Laptop className="w-4 h-4 text-emerald-600" />
            Quick Setup on Weighbridge PC
          </CardTitle>
          <CardDescription className="text-xs text-slate-500">
            Follow these simple steps on the cabin computer.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-5 space-y-4">
          <div className="flex items-start gap-3">
            <div className="w-6 h-6 rounded-full bg-emerald-600 text-white font-bold text-xs flex items-center justify-center shrink-0 mt-0.5">
              1
            </div>
            <div className="space-y-1">
              <h4 className="text-sm font-bold text-slate-900">Download & Extract</h4>
              <p className="text-xs text-slate-600">
                Click <strong>Download Offline Package</strong> above to get <code>WSMS_Offline_Package.zip</code>. Extract it to any folder on the computer (e.g. <code>C:\WSMS</code> or Desktop).
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <div className="w-6 h-6 rounded-full bg-emerald-600 text-white font-bold text-xs flex items-center justify-center shrink-0 mt-0.5">
              2
            </div>
            <div className="space-y-1">
              <h4 className="text-sm font-bold text-slate-900">Double-Click to Launch Windows App</h4>
              <p className="text-xs text-slate-600">
                Double-click <code>LAUNCH_WINDOWS_APP.bat</code>. It starts the local offline database, connects directly to your weighbridge scale indicator, and displays the native desktop application.
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <div className="w-6 h-6 rounded-full bg-emerald-600 text-white font-bold text-xs flex items-center justify-center shrink-0 mt-0.5">
              3
            </div>
            <div className="space-y-1">
              <h4 className="text-sm font-bold text-slate-900">Weigh & Print Instantly</h4>
              <p className="text-xs text-slate-600">
                Perform single or 2-step gross/tare weighments, print dot-matrix slips, and manage vehicles. When internet comes back online, it will automatically sync to your cloud server!
              </p>
            </div>
          </div>

          <div className="mt-4 p-4 rounded-lg bg-slate-900 text-slate-100 text-xs font-mono flex items-center justify-between">
            <div>
              <span className="text-emerald-400 font-bold">Local URL:</span> http://localhost:5000
            </div>
            <a
              href="http://localhost:5000"
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1 text-emerald-300 hover:text-emerald-200 font-semibold"
            >
              Open Local Instance <ArrowRight className="w-3.5 h-3.5" />
            </a>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

