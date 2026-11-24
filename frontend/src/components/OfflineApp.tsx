import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Download, Laptop, WifiOff, HardDrive, CheckCircle2, ArrowRight } from 'lucide-react';

export default function OfflineApp() {
  const handleDownload = () => {
    const apiUrl = import.meta.env.VITE_API_URL || 'https://wsms-1.onrender.com/api';
    window.location.href = `${apiUrl}/system/download-offline-launcher`;
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
            <h1 className="text-2xl font-black tracking-tight">WSMS Offline Cabin Edition</h1>
            <p className="text-emerald-100/90 text-sm max-w-xl">
              Operate your weighbridge smoothly even during zero internet connectivity. Captures COM port live weights, prints slips immediately, and automatically syncs to cloud when online.
            </p>
          </div>
          <Button
            size="lg"
            onClick={handleDownload}
            className="bg-white hover:bg-emerald-50 text-emerald-950 font-bold px-6 h-12 shadow-lg shrink-0 gap-2 text-sm uppercase tracking-wider"
          >
            <Download className="w-4 h-4 text-emerald-700" />
            Download Offline App
          </Button>
        </div>
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
            Connects straight to your RS232 / USB COM port (COM5, COM3, etc.) on the computer with zero delay and instant live meter streaming.
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
            3-Step Quick Setup on Weighbridge PC
          </CardTitle>
          <CardDescription className="text-xs text-slate-500">
            Follow these simple steps once on the cabin computer.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-5 space-y-4">
          <div className="flex items-start gap-3">
            <div className="w-6 h-6 rounded-full bg-emerald-600 text-white font-bold text-xs flex items-center justify-center shrink-0 mt-0.5">
              1
            </div>
            <div className="space-y-1">
              <h4 className="text-sm font-bold text-slate-900">Download the Launcher</h4>
              <p className="text-xs text-slate-600">
                Click the <strong>Download Offline App</strong> button above to download <code>START_OFFLINE_WSMS.bat</code>. Place it in your WSMS system folder on the computer.
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <div className="w-6 h-6 rounded-full bg-emerald-600 text-white font-bold text-xs flex items-center justify-center shrink-0 mt-0.5">
              2
            </div>
            <div className="space-y-1">
              <h4 className="text-sm font-bold text-slate-900">Double-Click to Launch</h4>
              <p className="text-xs text-slate-600">
                Double-click <code>START_OFFLINE_WSMS.bat</code>. It starts the local offline server, connects directly to your weighbridge scale, and opens Chrome automatically at <code>http://localhost:5000</code>.
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
                You can now perform full weighments, 2-step weighments, and print slips. Even with your internet disconnected, operations run normally!
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
