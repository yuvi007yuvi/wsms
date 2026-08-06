import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Lock, Eye, EyeOff, ShieldCheck } from 'lucide-react';
import api from '@/lib/api';
import Cookies from 'js-cookie';
import { getPreciseApiError } from '@/lib/utils';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Activity, Cpu, Database, Cable, Cloud, CheckCircle2, XCircle } from 'lucide-react';

export default function Login() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const [healthData, setHealthData] = useState<any>(null);
  const [healthLoading, setHealthLoading] = useState(false);
  const [installingTools, setInstallingTools] = useState(false);

  const checkSystemHealth = async (silent = false) => {
    if (!silent) setHealthLoading(true);
    try {
      const response = await api.get('/system/health');
      setHealthData(response.data);
    } catch (error: any) {
      if (!silent) {
        console.error('Health check failed', error);
        const errInfo = getPreciseApiError(error, 'Unable to reach the backend server.', 'Diagnostics Failed');
        toast({
          title: errInfo.title,
          description: errInfo.description,
          variant: 'destructive',
        });
      }
    } finally {
      if (!silent) setHealthLoading(false);
    }
  };

  const handleInstallTools = async () => {
    setInstallingTools(true);
    try {
      await api.post('/system/install-tools');
      toast({
        title: 'Installation Complete',
        description: 'Missing tools have been successfully installed.',
      });
      // Refresh health check
      checkSystemHealth(true);
    } catch (error: any) {
      toast({
        title: 'Installation Failed',
        description: 'Failed to auto-install some tools. You may need to install them manually.',
        variant: 'destructive',
      });
    } finally {
      setInstallingTools(false);
    }
  };

  useEffect(() => {
    checkSystemHealth(true);
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const response = await api.post('/auth/login', { username, password });
      Cookies.set('token', response.data.token);
      localStorage.setItem('role', response.data.user.role);
      localStorage.setItem('username', response.data.user.username || '');
      localStorage.setItem('fullName', response.data.user.fullName || '');
      localStorage.setItem('designation', response.data.user.designation || '');
      toast({
        title: 'Login Successful',
        description: 'Welcome to WeighT360Pro Portal',
      });
      navigate('/dashboard');
    } catch (error: any) {
      const errInfo = getPreciseApiError(error, 'Invalid credentials or inactive account', 'Login Failed');
      toast({
        title: errInfo.title,
        description: errInfo.description,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full flex bg-white">
      {/* Left Panel - Branding */}
      <div className="hidden lg:flex w-1/2 bg-[#022c22] flex-col justify-between p-12 text-emerald-50">
        <div className="space-y-6 mt-12">
          <div className="bg-white p-3 inline-block rounded-sm shadow-md">
            <img src="/images.jpg" alt="Nature Green" className="h-20 w-20 object-contain" />
          </div>
          <div>
            <h1 className="text-4xl font-extrabold tracking-tight text-white mb-2 uppercase">Nature Green</h1>
            <h2 className="text-xl font-medium text-emerald-200/80 tracking-wide uppercase">WeighT360Pro</h2>
          </div>
          <div className="w-16 h-1 bg-emerald-500 mt-6"></div>
          
          <p className="max-w-md text-emerald-200/60 leading-relaxed mt-6">
            Enterprise-grade industrial weighing operations and logistics tracking portal. 
            Authorized personnel only.
          </p>
        </div>
        
        <div className="flex items-center gap-2 text-sm text-emerald-400/50 font-medium">
          <ShieldCheck className="h-5 w-5" />
          Secure Operator Terminal
        </div>

        {/* System Diagnostics Button */}
        <div className="absolute top-12 right-12 hidden lg:block z-50">
          <Dialog onOpenChange={(open) => { if (open) checkSystemHealth(false); }}>
            <DialogTrigger asChild>
              <Button 
                variant="outline" 
                size="sm" 
                className="bg-white border-slate-200 text-slate-700 hover:bg-slate-50 hover:text-emerald-700 shadow-sm relative flex items-center pr-3 pl-2.5"
              >
                <div className="relative flex h-2 w-2 mr-2">
                  {healthData?.status === 'healthy' ? (
                    <>
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                    </>
                  ) : healthData?.status === 'degraded' ? (
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500"></span>
                  ) : (
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-slate-300"></span>
                  )}
                </div>
                <Activity className="w-3.5 h-3.5 mr-1.5 text-slate-400" /> 
                System Check
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2"><Activity className="w-5 h-5 text-emerald-600" /> System Diagnostics</DialogTitle>
                <DialogDescription>
                  Real-time status of required system components.
                </DialogDescription>
              </DialogHeader>
              
              <div className="space-y-4 py-4">
                {healthLoading ? (
                  <div className="text-center py-8 text-slate-500 animate-pulse">Running diagnostics...</div>
                ) : healthData ? (
                  <div className="space-y-4">
                    {/* Database (Local) */}
                    <div className="flex items-start gap-3 p-3 rounded-md bg-slate-50 border border-slate-100">
                      <Database className={`w-5 h-5 mt-0.5 ${healthData.components.database.status === 'connected' ? 'text-emerald-500' : 'text-red-500'}`} />
                      <div className="flex-1">
                        <div className="flex justify-between items-center">
                          <p className="text-sm font-semibold text-slate-900">Local Cache Database</p>
                          {healthData.components.database.status === 'connected' ? <CheckCircle2 className="w-4 h-4 text-emerald-500" /> : <XCircle className="w-4 h-4 text-red-500" />}
                        </div>
                        <p className="text-xs text-slate-500">{healthData.components.database.message}</p>
                      </div>
                    </div>
                    
                    {/* Cloud Database */}
                    <div className="flex items-start gap-3 p-3 rounded-md bg-slate-50 border border-slate-100">
                      <Cloud className={`w-5 h-5 mt-0.5 ${healthData.components.cloudDatabase?.status === 'connected' ? 'text-blue-500' : 'text-slate-400'}`} />
                      <div className="flex-1">
                        <div className="flex justify-between items-center">
                          <p className="text-sm font-semibold text-slate-900">Cloud Master Database</p>
                          {healthData.components.cloudDatabase?.status === 'connected' ? <CheckCircle2 className="w-4 h-4 text-emerald-500" /> : <XCircle className="w-4 h-4 text-red-500" />}
                        </div>
                        <p className="text-xs text-slate-500">{healthData.components.cloudDatabase?.message || 'Checking cloud connection...'}</p>
                      </div>
                    </div>

                    {/* Hardware */}
                    <div className="flex items-start gap-3 p-3 rounded-md bg-slate-50 border border-slate-100">
                      <Cable className={`w-5 h-5 mt-0.5 ${healthData.components.hardware.status === 'connected' ? 'text-emerald-500' : 'text-amber-500'}`} />
                      <div className="flex-1">
                        <div className="flex justify-between items-center">
                          <p className="text-sm font-semibold text-slate-900">Weighbridge Hardware</p>
                          {healthData.components.hardware.status === 'connected' ? <CheckCircle2 className="w-4 h-4 text-emerald-500" /> : <XCircle className="w-4 h-4 text-amber-500" />}
                        </div>
                        <p className="text-xs text-slate-500">{healthData.components.hardware.message}</p>
                        {healthData.components.hardware.ports?.length > 0 && (
                          <div className="mt-1 flex gap-1 flex-wrap">
                            {healthData.components.hardware.ports.map((p: string) => (
                              <span key={p} className="px-1.5 py-0.5 bg-slate-200 text-[10px] rounded-sm text-slate-600 font-mono">{p}</span>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* System Requirements */}
                    <div className="flex items-start gap-3 p-3 rounded-md bg-slate-50 border border-slate-100">
                      <Cpu className="w-5 h-5 mt-0.5 text-slate-700" />
                      <div className="w-full">
                        <p className="text-sm font-semibold text-slate-900 mb-2">Required Software Environment</p>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-2 text-xs text-slate-600">
                          <div className="flex justify-between items-center border-b border-slate-200 pb-1">
                            <span className="flex items-center gap-1 shrink-0">Node.js:</span>
                            <div className="flex items-center gap-2 min-w-0">
                              <span className="font-mono text-emerald-600 truncate">{healthData.components.system.nodeVersion}</span>
                              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                            </div>
                          </div>
                          <div className="flex justify-between items-center border-b border-slate-200 pb-1">
                            <span className="flex items-center gap-1 shrink-0">NPM:</span>
                            <div className="flex items-center gap-2 min-w-0">
                              <span className={`font-mono truncate ${healthData.components.system.npmVersion === 'Not Installed' ? 'text-red-500' : 'text-emerald-600'}`}>{healthData.components.system.npmVersion}</span>
                              {healthData.components.system.npmVersion !== 'Not Installed' ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" /> : <XCircle className="w-3.5 h-3.5 text-red-500 shrink-0" />}
                            </div>
                          </div>
                          <div className="flex justify-between items-center border-b border-slate-200 pb-1">
                            <span className="flex items-center gap-1 shrink-0">PM2:</span>
                            <div className="flex items-center gap-2 min-w-0">
                              <span className={`font-mono truncate ${healthData.components.system.pm2Version === 'Not Installed' ? 'text-amber-500' : 'text-emerald-600'}`}>{healthData.components.system.pm2Version}</span>
                              {healthData.components.system.pm2Version !== 'Not Installed' ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" /> : <XCircle className="w-3.5 h-3.5 text-amber-500 shrink-0" />}
                            </div>
                          </div>
                          <div className="flex justify-between items-center border-b border-slate-200 pb-1">
                            <span className="flex items-center gap-1 shrink-0">Git:</span>
                            <div className="flex items-center gap-2 min-w-0">
                              <span className={`font-mono truncate ${healthData.components.system.gitVersion === 'Not Installed' ? 'text-red-500' : 'text-emerald-600'}`}>
                                {healthData.components.system.gitVersion?.replace('git version ', '')}
                              </span>
                              {healthData.components.system.gitVersion !== 'Not Installed' ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" /> : <XCircle className="w-3.5 h-3.5 text-red-500 shrink-0" />}
                            </div>
                          </div>
                        </div>
                        <p className="text-[10px] text-slate-400 mt-3 text-right">
                          Memory: {healthData.components.system.memoryUsageMb} MB | Uptime: {Math.floor(healthData.components.system.uptimeSeconds / 60)}m
                        </p>
                      </div>
                    </div>
                    
                    {/* Auto Install Button */}
                    {(healthData.components.system.pm2Version === 'Not Installed' || 
                      healthData.components.system.npmVersion === 'Not Installed') && (
                      <div className="pt-2">
                        <Button 
                          onClick={handleInstallTools} 
                          disabled={installingTools}
                          className="w-full bg-slate-900 hover:bg-slate-800 text-white shadow-sm"
                        >
                          {installingTools ? (
                            <><Activity className="w-4 h-4 mr-2 animate-spin" /> Installing Tools...</>
                          ) : (
                            <><Database className="w-4 h-4 mr-2" /> Auto-Install Missing Dependencies</>
                          )}
                        </Button>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="text-center py-8 text-red-500">Failed to load diagnostics.</div>
                )}
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Right Panel - Login Form */}
      <div className="w-full lg:w-1/2 flex flex-col justify-center px-8 sm:px-16 md:px-24 xl:px-32 relative">
        <div className="max-w-md w-full mx-auto space-y-8">
          
          {/* Mobile Header (Hidden on Desktop) */}
          <div className="lg:hidden flex flex-col items-center text-center space-y-4 mb-8">
            <div className="bg-white p-2 inline-block rounded-sm shadow border border-slate-100">
              <img src="/images.jpg" alt="Nature Green" className="h-16 w-16 object-contain" />
            </div>
            <h1 className="text-2xl font-bold text-slate-900 uppercase">Nature Green</h1>
            <p className="text-sm font-medium text-slate-500 uppercase">Weighment Portal</p>
          </div>

          <div>
            <h2 className="text-2xl font-bold text-slate-900 tracking-tight">Operator Login</h2>
            <p className="text-sm text-slate-500 mt-1">Enter your assigned credentials to continue.</p>
          </div>

          <form onSubmit={handleLogin} className="space-y-6 mt-8">
            <div className="space-y-2">
              <Label htmlFor="username" className="text-xs uppercase tracking-wider font-bold text-slate-700">Username</Label>
              <Input
                id="username"
                type="text"
                placeholder="operator01"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
                className="h-12 rounded-sm border-slate-300 focus-visible:ring-emerald-600 focus-visible:border-emerald-600 bg-slate-50 focus:bg-white transition-colors"
              />
            </div>
            
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="password" className="text-xs uppercase tracking-wider font-bold text-slate-700">Password</Label>
              </div>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="h-12 pr-10 rounded-sm border-slate-300 focus-visible:ring-emerald-600 focus-visible:border-emerald-600 bg-slate-50 focus:bg-white transition-colors"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-emerald-600 transition-colors"
                >
                  {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                </button>
              </div>
            </div>

            <Button type="submit" className="w-full h-12 text-sm uppercase tracking-widest font-bold bg-[#064e3b] hover:bg-[#022c22] text-white rounded-sm transition-all" disabled={loading}>
              {loading ? 'Authenticating...' : <><Lock className="w-4 h-4 mr-2" /> Secure Sign In</>}
            </Button>
          </form>

          {/* Installation Guide Link */}
          <div className="mt-6 text-center">
            <Dialog>
              <DialogTrigger asChild>
                <button type="button" className="text-xs text-slate-500 hover:text-emerald-600 font-medium underline underline-offset-2 transition-colors">
                  Installation Guide & System Requirements
                </button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-2xl max-h-[80vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle className="text-xl text-emerald-800">WeighT360Pro Installation Guide</DialogTitle>
                  <DialogDescription>
                    Requirements and step-by-step instructions for deploying the WeighT360Pro.
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-6 py-4 text-sm text-slate-700">
                  <div>
                    <h3 className="font-bold text-lg text-slate-900 mb-2">System Requirements</h3>
                    <ul className="list-disc pl-5 space-y-1">
                      <li><strong>OS:</strong> Windows 10/11 (64-bit) or Windows Server 2016+</li>
                      <li><strong>Node.js:</strong> v18.x or v20.x (LTS recommended)</li>
                      <li><strong>Database:</strong> PostgreSQL (Cloud or Local) and SQLite (Local sync cache)</li>
                      <li><strong>Hardware:</strong> Serial Port (RS232/USB) for Weighbridge indicator integration</li>
                      <li><strong>Memory & CPU:</strong> Minimum 4GB RAM, dual-core processor</li>
                    </ul>
                  </div>

                  <div>
                    <h3 className="font-bold text-lg text-slate-900 mb-2">Installation Steps</h3>
                    <div className="space-y-4">
                      <p><strong>1. Environment Setup</strong><br/>
                      Install Node.js and Git. Extract or clone the project folder to your local drive.</p>
                      
                      <p><strong>2. Backend Configuration</strong><br/>
                      Navigate to the <code>backend</code> directory. Create a <code>.env</code> file based on your environment and configure the <code>DATABASE_URL</code> (PostgreSQL) and <code>PORT</code>.</p>
                      
                      <p><strong>3. Database Initialization</strong><br/>
                      Open a terminal in the <code>backend</code> directory and run:<br/>
                      <code className="bg-slate-100 px-1.5 py-0.5 rounded text-emerald-700 block mt-1 font-mono text-xs">npm install</code>
                      <code className="bg-slate-100 px-1.5 py-0.5 rounded text-emerald-700 block mt-1 font-mono text-xs">npx prisma generate</code>
                      <code className="bg-slate-100 px-1.5 py-0.5 rounded text-emerald-700 block mt-1 font-mono text-xs">npx prisma generate --schema=prisma/schema.postgres.prisma</code>
                      <code className="bg-slate-100 px-1.5 py-0.5 rounded text-emerald-700 block mt-1 font-mono text-xs">npx prisma migrate deploy</code>
                      </p>

                      <p><strong>4. Frontend Setup</strong><br/>
                      Open a terminal in the <code>frontend</code> directory and run:<br/>
                      <code className="bg-slate-100 px-1.5 py-0.5 rounded text-emerald-700 block mt-1 font-mono text-xs">npm install</code>
                      <code className="bg-slate-100 px-1.5 py-0.5 rounded text-emerald-700 block mt-1 font-mono text-xs">npm run build</code>
                      </p>

                      <p><strong>5. Running the Application</strong><br/>
                      Use the <code>start.bat</code> script located in the root directory. This will automatically launch both the backend server and frontend development server in separate console windows.</p>
                    </div>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {/* Footer Credit */}
        <div className="absolute bottom-8 left-0 right-0 text-center">
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
            Designed & Developed by <span className="text-emerald-700">Yuvraj Singh Tomar</span>
          </p>
        </div>
      </div>
    </div>
  );
}
