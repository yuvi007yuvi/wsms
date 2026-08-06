import { useState, useEffect } from 'react';
import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import { Truck, Scale, FileText, Settings, Users, Box, MapPin, Anchor, LogOut, ChevronLeft, CreditCard, Shield } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { cn } from '@/lib/utils';
import api from '@/lib/api';
import { format } from 'date-fns';

const navItems = [
  { name: 'Dashboard', path: '/dashboard', icon: FileText },
  { name: 'Weighment', path: '/weighment', icon: Scale },
  { name: 'Vehicles', path: '/vehicles', icon: Truck },
  { name: 'Vehicle Types', path: '/vehicle-types', icon: Settings },
  { name: 'Materials', path: '/materials', icon: Box },
  { name: 'Sources', path: '/sources', icon: MapPin },
  { name: 'Destinations', path: '/destinations', icon: Anchor },
  { name: 'Slip History', path: '/reports', icon: FileText },
  { name: 'Pricing Plans', path: '/pricing', icon: CreditCard },
  { name: 'Users', path: '/users', icon: Users },
  { name: 'Settings', path: '/settings', icon: Settings },
  { name: 'Superadmin', path: '/superadmin', icon: Shield },
];

export default function DashboardLayout() {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const { t, i18n } = useTranslation();
  
  const userRole = localStorage.getItem('role') || 'operator';
  const userName = localStorage.getItem('username') || '';
  const fullName = localStorage.getItem('fullName');
  const designation = localStorage.getItem('designation');
  const displayName = fullName || userName || 'User';
  
  const [allowedModules, setAllowedModules] = useState<string[] | null>(null);
  
  const [syncStatus, setSyncStatus] = useState({ isOnline: true, lastSyncTime: new Date().toISOString(), pendingCount: 0 });

  useEffect(() => {
    const fetchSyncStatus = async () => {
      try {
        const res = await api.get('/system/sync-status');
        setSyncStatus(res.data);
      } catch (error) {
        setSyncStatus(prev => ({ ...prev, isOnline: false }));
      }
    };
    
    fetchSyncStatus();
    const interval = setInterval(fetchSyncStatus, 10000); // Check every 10s
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (userRole === 'admin') return; // Admin sees everything
    
    const fetchPermissions = async () => {
      try {
        const res = await api.get('/settings/role-permissions');
        const roleData = res.data.find((p: any) => p.role === userRole);
        if (roleData) {
          setAllowedModules(JSON.parse(roleData.allowedModules));
        } else {
          // Default fallback if no permissions configured
          setAllowedModules(navItems.map(i => i.name).filter(m => m !== 'Users' && m !== 'Settings'));
        }
      } catch (error) {
        console.error('Failed to fetch role permissions', error);
        // Default fallback on error
        setAllowedModules(navItems.map(i => i.name).filter(m => m !== 'Users' && m !== 'Settings'));
      }
    };
    fetchPermissions();
  }, [userRole]);
  
  const filteredNavItems = navItems.filter(item => {
    if (item.name === 'Superadmin') return userRole === 'superadmin';
    if (userRole === 'superadmin' || userRole === 'admin') return true;
    if (allowedModules === null) return false; // Still loading permissions
    return allowedModules.includes(item.name);
  });

  const currentNavItem = navItems.find(item => location.pathname.startsWith(item.path)) || { name: 'Overview' };

  const toggleLanguage = () => {
    const newLang = i18n.language === 'en' ? 'hi' : 'en';
    i18n.changeLanguage(newLang);
  };

  const handleLogout = () => {
    localStorage.removeItem('token'); // assuming token is stored in local storage
    navigate('/login');
  };

  return (
    <div className="flex h-screen w-full bg-slate-50">
      {/* Sidebar */}
      <aside className={cn(
        "flex-col bg-gradient-to-b from-green-50 to-green-100/80 text-slate-900 border-r border-green-200 hidden md:flex no-print shadow-xl z-20 transition-all duration-300 relative",
        isCollapsed ? "w-20" : "w-64"
      )}>
        <button 
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="absolute -right-3 top-16 bg-white border border-green-200 rounded-full p-1 shadow-sm text-green-700 hover:text-green-900 z-50 hover:bg-green-50 transition-colors"
        >
          <ChevronLeft className={cn("w-4 h-4 transition-transform", isCollapsed && "rotate-180")} />
        </button>

        <div className="flex flex-col items-center justify-center p-3 border-b border-green-200/60 bg-white/40">
          <Link to="/" className="flex flex-col items-center gap-1">
            <img src="/images.jpg" alt="WeighT360Pro" className={cn("object-contain rounded shadow-sm bg-white p-1 transition-all", isCollapsed ? "h-8 w-8" : "h-12 w-12")} />
            {!isCollapsed && <span className="font-bold tracking-wider text-green-950 text-sm mt-1 text-center">{t('WeighT360Pro')}</span>}
          </Link>
        </div>
        <div className="flex-1 overflow-auto py-2 overflow-x-hidden">
          <nav className="grid items-start px-2 text-sm font-medium gap-0.5">
            {filteredNavItems.map((item) => {
              const isActive = location.pathname.startsWith(item.path);
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  className={cn(
                    "flex items-center gap-2.5 rounded-md px-2.5 py-1.5 transition-colors font-semibold",
                    isActive
                      ? "bg-green-600 text-white shadow-sm"
                      : "text-green-800 hover:text-green-950 hover:bg-white/60",
                    isCollapsed && "justify-center px-0"
                  )}
                  title={isCollapsed ? t(item.name) : undefined}
                >
                  <item.icon className="h-4 w-4 shrink-0" />
                  {!isCollapsed && <span className="truncate">{t(item.name)}</span>}
                </Link>
              );
            })}
          </nav>
        </div>

        {/* Logout Button */}
        <div className="p-2 mt-auto">
          <button 
            onClick={handleLogout} 
            className={cn(
              "flex items-center justify-center text-xs font-bold bg-red-50 text-red-600 hover:bg-red-100 border border-red-200 py-1.5 rounded-sm transition-colors w-full",
              isCollapsed ? "px-0" : "px-2"
            )}
            title={isCollapsed ? t('Logout') : undefined}
          >
            <LogOut className={cn("w-4 h-4", !isCollapsed && "mr-1.5")} />
            {!isCollapsed && t('Logout')}
          </button>
        </div>

        {/* Developer Credit */}
        {!isCollapsed && (
          <div className="mt-auto border-t border-green-200/80 p-4 bg-white/40">
            <div className="text-[10px] text-center text-green-800 font-bold flex flex-col items-center gap-1 group cursor-default">
               <span className="opacity-70 group-hover:opacity-100 transition-opacity uppercase tracking-widest">{t('Designed & Developed by')}</span>
               <span className="font-extrabold text-sm bg-gradient-to-r from-emerald-600 to-green-700 bg-clip-text text-transparent transform group-hover:scale-105 transition-all duration-300">
                 YUVRAJ SINGH TOMAR
               </span>
            </div>
          </div>
        )}
      </aside>

      {/* Main Content */}
      <div className="flex flex-col flex-1 overflow-hidden print:overflow-visible">
        <header className="flex h-12 items-center gap-4 border-b bg-white px-4 shadow-sm z-10 lg:px-6 justify-between no-print">
          <div className="flex items-center gap-2 text-sm">
             <span className="font-semibold text-slate-800 hidden md:inline-block">{t('WeighT360Pro')}</span>
             <span className="text-slate-300 hidden md:inline-block">/</span>
             <span className="font-bold text-slate-600 uppercase tracking-wider text-xs">{t(currentNavItem.name)}</span>
          </div>
          <div className="flex items-center gap-4">
             <div className="flex items-center gap-2 text-sm font-medium">
                {syncStatus.isOnline ? (
                  <div className="flex items-center gap-2 text-green-600 bg-green-50 px-2 py-1 rounded-sm border border-green-200">
                    <span className="relative flex h-2 w-2">
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.8)]"></span>
                    </span>
                    <span className="text-xs">
                      Cloud Online (Synced {syncStatus.lastSyncTime ? format(new Date(syncStatus.lastSyncTime), 'hh:mm:ss a') : 'just now'})
                    </span>
                  </div>
                ) : (
                  <div className="flex items-center gap-2 text-amber-600 bg-amber-50 px-2 py-1 rounded-sm border border-amber-200">
                    <span className="relative flex h-2 w-2">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500"></span>
                    </span>
                    <span className="text-xs">
                      Cloud Offline ({syncStatus.pendingCount} pending)
                    </span>
                  </div>
                )}
             </div>
             
             <div className="flex items-center gap-2 text-sm text-red-600 font-medium">
                <span className="relative flex h-3 w-3">
                  <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.8)]"></span>
                </span>
                {t('Weighbridge Disconnected')}
             </div>
             
             <button onClick={toggleLanguage} className="text-xs font-bold bg-slate-100 hover:bg-slate-200 border border-slate-300 px-2 py-1 rounded-sm">
               {i18n.language === 'en' ? 'हिन्दी' : 'English'}
             </button>
             
             <div className="flex items-center gap-3">
               <div className="hidden md:flex flex-col items-end text-xs">
                 <span className="font-bold text-slate-800">{displayName}</span>
                 <span className="text-slate-500 uppercase tracking-widest text-[10px]">{designation || userRole}</span>
               </div>
               <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-primary font-bold shadow-sm">
                 {displayName[0].toUpperCase()}
               </div>
             </div>
          </div>
        </header>
        <main className="flex-1 overflow-auto p-4 md:p-6 print:p-0 print:overflow-visible">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
