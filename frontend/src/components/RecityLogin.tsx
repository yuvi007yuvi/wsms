import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Lock, Eye, EyeOff, ShieldCheck, AlertTriangle, ServerCrash, WifiOff } from 'lucide-react';
import api from '@/lib/api';
import Cookies from 'js-cookie';
import { getPreciseApiError } from '@/lib/utils';
import NetworkBackground from './NetworkBackground';

export default function RecityLogin() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const [loginError, setLoginError] = useState<string | null>(null);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setLoginError(null);
    try {
      const response = await api.post('/auth/login', { username, password });
      Cookies.set('token', response.data.token);
      localStorage.setItem('role', response.data.user.role);
      localStorage.setItem('username', response.data.user.username || '');
      localStorage.setItem('fullName', response.data.user.fullName || '');
      localStorage.setItem('designation', response.data.user.designation || '');
      localStorage.setItem('projectName', response.data.user.projectName || '');
      localStorage.setItem('subscriptionExpiry', response.data.user.subscriptionExpiry || '');
      
      toast({
        title: 'Login Successful',
        description: 'Welcome to Recity Portal',
      });
      navigate('/reports');
    } catch (error: any) {
      const errInfo = getPreciseApiError(error, 'Invalid credentials or inactive account', 'Login Failed');
      setLoginError(errInfo.description);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full flex bg-slate-50">
      {/* Left Panel - Branding */}
      <div className="hidden lg:flex w-1/2 bg-gradient-to-br from-blue-950 via-sky-950 to-blue-950 flex-col justify-between p-12 text-blue-50 relative overflow-hidden">
        {/* Decorative Glowing Orbs */}
        <div className="absolute top-[-20%] left-[-10%] w-[500px] h-[500px] bg-sky-600/20 rounded-full blur-[120px] pointer-events-none animate-blob"></div>
        <div className="absolute bottom-[-10%] right-[-20%] w-[400px] h-[400px] bg-blue-600/20 rounded-full blur-[100px] pointer-events-none animate-blob" style={{ animationDelay: '2s' }}></div>
        
        {/* Neuron Network Animation */}
        <NetworkBackground />
        
        <div className="space-y-8 mt-12 relative z-10">
          <div className="inline-block bg-white p-4 rounded-2xl drop-shadow-2xl">
            <img src="/recity-logo.jpg" alt="Recity" className="h-32 object-contain" />
          </div>
          <div className="relative z-10">
            <h1 className="text-5xl font-black tracking-tight text-white mb-2 uppercase drop-shadow-sm">Recity</h1>
            <h2 className="text-sm font-bold text-sky-400 tracking-[0.3em] uppercase">Partner Portal</h2>
          </div>
          <div className="w-20 h-1.5 bg-gradient-to-r from-sky-500 to-blue-500 rounded-full mt-6 shadow-lg"></div>
          
          <p className="max-w-md text-sky-100/80 leading-relaxed mt-6 text-lg font-medium">
            Dedicated portal for Recity administrative operations and summary reporting.
            <span className="block mt-2 text-sky-400/80 text-sm font-semibold">Authorized personnel only.</span>
          </p>
        </div>
        
        <div className="flex items-center gap-2 text-sm text-sky-400/80 font-semibold relative z-10">
          <ShieldCheck className="h-5 w-5" />
          Secure Partner Access
        </div>
      </div>

      {/* Right Panel - Login Form */}
      <div className="w-full lg:w-1/2 flex flex-col justify-center px-8 sm:px-16 md:px-24 xl:px-32 relative overflow-hidden bg-white">
        <div className="max-w-md w-full mx-auto space-y-8 relative z-10 bg-white/60 p-8 rounded-2xl shadow-[0_0_40px_rgba(0,0,0,0.05)] backdrop-blur-sm border border-slate-100">
          
          {/* Mobile Header (Hidden on Desktop) */}
          <div className="lg:hidden flex flex-col items-center text-center space-y-4 mb-8">
            <div className="bg-white p-3 rounded-xl shadow-sm border border-slate-100 mb-3 relative overflow-hidden group">
              <img src="/recity-logo.jpg" alt="Recity" className="h-16 object-contain relative z-10 drop-shadow-sm" />
            </div>
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight uppercase">Recity</h1>
            <p className="text-sm font-medium text-slate-500 uppercase">Partner Portal</p>
          </div>

          <div>
            <h2 className="text-2xl font-bold text-slate-900 tracking-tight">Partner Login</h2>
            <p className="text-sm text-slate-500 mt-1">Enter your Recity credentials to continue.</p>
          </div>
          
          {loginError && (
            <div className="flex items-start gap-3 p-4 rounded-md bg-red-50 border border-red-200 shadow-sm animate-in fade-in zoom-in duration-300">
              {loginError.toLowerCase().includes('server') ? (
                <ServerCrash className="w-6 h-6 text-red-600 shrink-0 mt-0.5" />
              ) : loginError.toLowerCase().includes('connectivity') ? (
                <WifiOff className="w-6 h-6 text-red-600 shrink-0 mt-0.5" />
              ) : (
                <AlertTriangle className="w-6 h-6 text-red-600 shrink-0 mt-0.5" />
              )}
              <div className="flex flex-col">
                <span className="text-sm font-bold text-red-900 leading-tight">Authentication Error</span>
                <span className="text-xs text-red-700 mt-1">{loginError}</span>
              </div>
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-6 mt-4">
            <div className="space-y-2">
              <Label htmlFor="username" className="text-xs uppercase tracking-wider font-bold text-slate-700">Username</Label>
              <Input
                id="username"
                type="text"
                placeholder="recity-admin"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
                className="h-12 rounded-lg border-slate-200 shadow-sm focus-visible:ring-blue-500 focus-visible:border-blue-500 bg-slate-50/50 focus:bg-white transition-all font-medium"
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
                  className="h-12 pr-10 rounded-lg border-slate-200 shadow-sm focus-visible:ring-blue-500 focus-visible:border-blue-500 bg-slate-50/50 focus:bg-white transition-all font-medium"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-blue-600 transition-colors"
                >
                  {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                </button>
              </div>
            </div>

            <Button type="submit" className="w-full h-12 text-sm uppercase tracking-widest font-bold bg-gradient-to-r from-blue-600 to-sky-600 hover:from-blue-700 hover:to-sky-700 shadow-lg hover:shadow-xl text-white rounded-lg transition-all" disabled={loading}>
              {loading ? 'Authenticating...' : <><Lock className="w-4 h-4 mr-2" /> Secure Sign In</>}
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}
