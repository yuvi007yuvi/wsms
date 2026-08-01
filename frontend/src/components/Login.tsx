import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Lock, Eye, EyeOff, ShieldCheck } from 'lucide-react';
import api from '@/lib/api';
import Cookies from 'js-cookie';

export default function Login() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const response = await api.post('/auth/login', { username, password });
      Cookies.set('token', response.data.token, { expires: 1 });
      localStorage.setItem('role', response.data.user.role);
      localStorage.setItem('username', response.data.user.username || '');
      localStorage.setItem('fullName', response.data.user.fullName || '');
      localStorage.setItem('designation', response.data.user.designation || '');
      toast({
        title: 'Login Successful',
        description: 'Welcome to WSMS Portal',
      });
      navigate('/dashboard');
    } catch (error) {
      toast({
        title: 'Login Failed',
        description: 'Invalid credentials or inactive account',
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
            <h2 className="text-xl font-medium text-emerald-200/80 tracking-wide uppercase">Weighment Slip Management System</h2>
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
