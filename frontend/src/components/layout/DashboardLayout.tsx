import { useState, useEffect } from 'react';
import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import { Truck, Scale, FileText, Settings, Users, Box, MapPin, Anchor, LogOut, ChevronLeft, CreditCard, Shield } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { cn } from '@/lib/utils';
import api from '@/lib/api';
import { format, formatDistanceToNow } from 'date-fns';

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
  { name: 'Billing', path: '/billing', icon: FileText },
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
  const projectName = localStorage.getItem('projectName');
  const [subscriptionExpiry, setSubscriptionExpiry] = useState(localStorage.getItem('subscriptionExpiry'));
  
  const [allowedModules, setAllowedModules] = useState<string[] | null>(null);
  
  const [syncStatus, setSyncStatus] = useState({ isOnline: true, lastSyncTime: new Date().toISOString(), pendingCount: 0 });

  useEffect(() => {
    const fetchSyncStatus = async () => {
      try {
        const res = await api.get('/system/sync-status');
        setSyncStatus(res.data);
        if (res.data.subscriptionExpiry) {
          setSubscriptionExpiry(res.data.subscriptionExpiry);
          localStorage.setItem('subscriptionExpiry', res.data.subscriptionExpiry);
        }
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
    if (item.name === 'Superadmin' || item.name === 'Billing') return userRole === 'superadmin';
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
          
          {/* Project Badge moved here */}
          {!isCollapsed && projectName && (
            <div className="mt-3 flex flex-col items-center bg-blue-50/80 rounded border border-blue-100 shadow-sm overflow-hidden w-full">
              <span className="font-bold text-blue-700 px-2 py-1 text-xs uppercase text-center w-full truncate" title={projectName}>
                {projectName}
              </span>
              {subscriptionExpiry && (
                <span className="bg-blue-100 text-blue-800 text-[10px] font-semibold px-2 py-1 border-t border-blue-200 w-full text-center">
                  {new Date(subscriptionExpiry) > new Date() 
                    ? `${formatDistanceToNow(new Date(subscriptionExpiry))} left` 
                    : 'Expired'}
                </span>
              )}
            </div>
          )}
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

        {/* Sidebar Footer Controls */}
        <div className="p-2 mt-auto flex flex-col gap-2 border-t border-green-200/80 bg-white/40">
          <button 
            onClick={toggleLanguage} 
            className={cn(
              "flex items-center justify-center text-xs font-bold bg-slate-100 hover:bg-slate-200 border border-slate-300 py-1.5 rounded-sm transition-colors w-full",
              isCollapsed ? "px-0" : "px-2"
            )}
            title={isCollapsed ? (i18n.language === 'en' ? 'हिन्दी' : 'English') : undefined}
          >
            {!isCollapsed && <span className="mr-1.5">Language:</span>}
            {i18n.language === 'en' ? 'हिन्दी' : 'English'}
          </button>
          
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
          
          {/* Developer Credit */}
          {!isCollapsed && (
            <div className="mt-2 text-[10px] text-center text-green-800 font-bold flex flex-col items-center gap-1 group cursor-default">
               <span className="opacity-70 group-hover:opacity-100 transition-opacity uppercase tracking-widest">{t('Designed & Developed by')}</span>
               <span className="font-extrabold text-xs bg-gradient-to-r from-emerald-600 to-green-700 bg-clip-text text-transparent transform group-hover:scale-105 transition-all duration-300">
                 YUVRAJ SINGH TOMAR
               </span>
            </div>
          )}
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex flex-col flex-1 overflow-hidden print:overflow-visible relative pb-6"> {/* pb-6 to make space for bottom bar */}
        
        {/* Clean Header */}
        <header className="flex h-12 items-center gap-4 border-b bg-white px-4 shadow-sm z-10 lg:px-6 justify-between no-print shrink-0">
          {/* Left: Breadcrumbs Only */}
          <div className="flex items-center gap-2 text-sm">
             <span className="font-semibold text-slate-800 hidden md:inline-block">{t('WeighT360Pro')}</span>
             <span className="text-slate-300 hidden md:inline-block">/</span>
             <span className="font-bold text-slate-600 uppercase tracking-wider text-xs">{t(currentNavItem.name)}</span>
          </div>
          
          {/* Right: User Profile Only */}
          <div className="flex items-center gap-3">
             <div className="hidden md:flex flex-col items-end text-xs">
               <span className="font-bold text-slate-800">{displayName}</span>
               <span className="text-slate-500 uppercase tracking-widest text-[10px]">{designation || userRole}</span>
             </div>
             <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-primary font-bold shadow-sm">
               {displayName[0].toUpperCase()}
             </div>
          </div>
        </header>

        {/* Scrollable Content */}
        <main className="flex-1 overflow-auto p-4 md:p-6 print:p-0 print:overflow-visible">
          <Outlet />
        </main>
        
        {/* Fixed Bottom Status Bar */}
        <div className="absolute bottom-0 left-0 right-0 h-6 border-t bg-white shadow-[0_-1px_3px_rgba(0,0,0,0.05)] flex items-center justify-between px-4 z-10 no-print text-[10px]">
          {/* Left Status: Cloud Sync */}
          <div className="flex items-center">
            {syncStatus.isOnline ? (
              <div className="flex items-center gap-1.5 text-green-700 font-medium">
                <span className="relative flex h-1.5 w-1.5">
                  <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.8)]"></span>
                </span>
                <span>
                  Cloud Online (Synced {syncStatus.lastSyncTime ? format(new Date(syncStatus.lastSyncTime), 'hh:mm:ss a') : 'just now'})
                </span>
              </div>
            ) : (
              <div className="flex items-center gap-1.5 text-amber-700 font-medium">
                <span className="relative flex h-1.5 w-1.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-amber-500"></span>
                </span>
                <span>
                  Cloud Offline ({syncStatus.pendingCount} pending items)
                </span>
              </div>
            )}
          </div>

          {/* Right Status: Weighbridge */}
          <div className="flex items-center gap-1.5 text-red-600 font-medium">
            <span className="relative flex h-1.5 w-1.5">
              <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.8)]"></span>
            </span>
            {t('Weighbridge Disconnected')}
          </div>
        </div>
      </div>
    </div>
  );
}
