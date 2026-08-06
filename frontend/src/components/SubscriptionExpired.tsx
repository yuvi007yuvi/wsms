import { ShieldAlert, Mail, LogOut, Info } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useSearchParams } from 'react-router-dom';
import Cookies from 'js-cookie';

export default function SubscriptionExpired() {
  const [searchParams] = useSearchParams();
  const reason = searchParams.get('reason') || 'Your project subscription has expired.';

  const handleLogout = () => {
    Cookies.remove('token');
    localStorage.clear();
    window.location.href = '/login';
  };

  const handleContactAdmin = () => {
    window.location.href = 'mailto:admin@company.com?subject=Subscription%20Renewal%20Request';
  };

  return (
    <div className="min-h-screen bg-slate-900 flex flex-col justify-center py-12 sm:px-6 lg:px-8 relative overflow-hidden">
      {/* Texture and Vector Background Elements */}
      <div className="absolute inset-0 z-0">
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAiIGhlaWdodD0iMjAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGNpcmNsZSBjeD0iMiIgY3k9IjIiIHI9IjIiIGZpbGw9IiNmZmZmZmYiIGZpbGwtb3BhY2l0eT0iMC4wNSIvPjwvc3ZnPg==')] opacity-50" />
        <div className="absolute top-0 right-0 -mr-20 -mt-20 w-96 h-96 rounded-full bg-red-600/10 blur-3xl" />
        <div className="absolute bottom-0 left-0 -ml-20 -mb-20 w-96 h-96 rounded-full bg-orange-600/10 blur-3xl" />
      </div>

      <div className="sm:mx-auto sm:w-full sm:max-w-xl relative z-10">
        <div className="flex justify-center mb-8">
          <div className="relative">
            <div className="absolute inset-0 rounded-full bg-red-500/20 blur-xl animate-pulse" />
            <div className="h-28 w-28 rounded-full bg-gradient-to-br from-red-500 to-red-700 shadow-xl shadow-red-500/30 flex items-center justify-center relative border-4 border-slate-900">
              <ShieldAlert className="h-14 w-14 text-white" strokeWidth={1.5} />
            </div>
          </div>
        </div>
        
        <h2 className="text-center text-4xl sm:text-5xl font-extrabold text-white tracking-tight px-4 leading-tight mb-4 drop-shadow-md">
          {reason}
        </h2>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md relative z-10">
        <div className="bg-slate-800/80 backdrop-blur-xl border border-slate-700 py-10 px-6 shadow-2xl sm:rounded-2xl sm:px-10 text-center relative overflow-hidden">
          {/* Subtle overlay accent */}
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-red-500 via-orange-500 to-red-500" />
          
          <div className="bg-slate-700/50 rounded-lg p-4 flex items-start gap-3 text-left mb-8 border border-slate-600">
            <Info className="h-5 w-5 text-slate-300 mt-0.5 shrink-0" />
            <p className="text-slate-300 text-sm leading-relaxed">
              Your access to this workspace has been securely suspended. Please contact your system administrator or account owner to resolve this issue and restore access.
            </p>
          </div>
          
          <div className="space-y-4">
            <Button 
              onClick={handleContactAdmin}
              className="w-full bg-gradient-to-r from-slate-200 to-white text-slate-900 hover:from-white hover:to-white shadow-lg font-semibold text-base py-6 transition-all transform hover:scale-[1.02]"
            >
              <Mail className="mr-2 h-5 w-5" />
              Contact Administrator
            </Button>

            <Button 
              onClick={handleLogout}
              variant="outline"
              className="w-full bg-transparent border-slate-600 text-slate-300 hover:bg-slate-700 hover:text-white py-6 text-base transition-colors"
            >
              <LogOut className="mr-2 h-4 w-4" />
              Sign Out Securely
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
