import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Save, Shield } from 'lucide-react';
import api from '@/lib/api';

const MODULES = [
  'Dashboard',
  'Weighment',
  'Vehicles',
  'Vehicle Types',
  'Materials',
  'Sources',
  'Destinations',
  'Slip History',
  'Users',
  'Settings'
];

const ROLES = ['operator', 'supervisor', 'manager'];

export default function Settings() {
  const [activeTab, setActiveTab] = useState<'general' | 'roles'>('general');
  const [settingId, setSettingId] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [address, setAddress] = useState('');
  const [mockMode, setMockMode] = useState(false);
  
  // Role Permissions state: { [role]: string[] }
  const [rolePermissions, setRolePermissions] = useState<Record<string, string[]>>({});

  const { toast } = useToast();
  const userRole = localStorage.getItem('role');

  const fetchSettings = async () => {
    try {
      const res = await api.get('/settings');
      if (res.data) {
        setSettingId(res.data.id);
        setCompanyName(res.data.companyName);
        setAddress(res.data.address);
        setMockMode(res.data.mockMode || false);
      }
    } catch (error) {
      console.error(error);
    }
  };

  const fetchRolePermissions = async () => {
    try {
      const res = await api.get('/settings/role-permissions');
      const perms: Record<string, string[]> = {};
      res.data.forEach((p: any) => {
        try {
          perms[p.role] = JSON.parse(p.allowedModules);
        } catch(e) {
          perms[p.role] = [];
        }
      });
      
      // Initialize defaults for missing roles
      ROLES.forEach(r => {
        if (!perms[r]) {
          perms[r] = MODULES.filter(m => m !== 'Users' && m !== 'Settings'); // default non-admin
        }
      });
      setRolePermissions(perms);
    } catch (error) {
      console.error('Error fetching role permissions', error);
    }
  };

  useEffect(() => {
    fetchSettings();
    if (userRole === 'admin') {
      fetchRolePermissions();
    }
  }, [userRole]);

  const handleSaveGeneral = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (settingId) {
        await api.put(`/settings/${settingId}`, { companyName, address, mockMode });
        toast({ title: 'Settings updated successfully' });
      }
    } catch (error) {
      toast({ title: 'Error updating settings', variant: 'destructive' });
    }
  };

  const handleToggleModule = (role: string, moduleName: string) => {
    setRolePermissions(prev => {
      const current = prev[role] || [];
      const updated = current.includes(moduleName)
        ? current.filter(m => m !== moduleName)
        : [...current, moduleName];
      return { ...prev, [role]: updated };
    });
  };

  const handleSaveRole = async (role: string) => {
    try {
      await api.post('/settings/role-permissions', {
        role,
        allowedModules: JSON.stringify(rolePermissions[role] || [])
      });
      toast({ title: `Permissions saved for ${role}` });
    } catch (error) {
      toast({ title: `Error saving permissions for ${role}`, variant: 'destructive' });
    }
  };

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="flex justify-between items-center">
        <h2 className="text-3xl font-bold tracking-tight">System Settings</h2>
      </div>

      {userRole === 'admin' && (
        <div className="flex space-x-2 border-b border-slate-200 pb-2">
          <button 
            className={`px-4 py-2 text-sm font-semibold rounded-t-md ${activeTab === 'general' ? 'bg-slate-100 text-slate-900 border-b-2 border-slate-900' : 'text-slate-500 hover:text-slate-700'}`}
            onClick={() => setActiveTab('general')}
          >
            General Settings
          </button>
          <button 
            className={`px-4 py-2 text-sm font-semibold rounded-t-md ${activeTab === 'roles' ? 'bg-slate-100 text-slate-900 border-b-2 border-slate-900' : 'text-slate-500 hover:text-slate-700'}`}
            onClick={() => setActiveTab('roles')}
          >
            Role Permissions
          </button>
        </div>
      )}

      {activeTab === 'general' && (
        <form onSubmit={handleSaveGeneral}>
          <Card>
            <CardHeader>
              <CardTitle>General Information</CardTitle>
              <CardDescription>Update your company details and global settings.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Company Name</Label>
                <Input 
                  value={companyName} 
                  onChange={e => setCompanyName(e.target.value)} 
                  required 
                />
              </div>
              <div className="space-y-2">
                <Label>Company Address</Label>
                <Input 
                  value={address} 
                  onChange={e => setAddress(e.target.value)} 
                  required 
                />
              </div>
              
              {userRole === 'admin' && (
                <div className="flex items-center space-x-2 pt-4 border-t border-slate-100">
                  <input 
                    type="checkbox" 
                    id="mock-mode-toggle"
                    className="rounded border-slate-300 text-green-600 focus:ring-green-500 w-4 h-4 cursor-pointer"
                    checked={mockMode}
                    onChange={(e) => setMockMode(e.target.checked)}
                  />
                  <Label htmlFor="mock-mode-toggle" className="font-semibold cursor-pointer">
                    Enable Weighbridge Mock Mode (Testing)
                  </Label>
                </div>
              )}
            </CardContent>
            <CardFooter className="border-t px-6 py-4">
              <Button type="submit">
                <Save className="mr-2 h-4 w-4" /> Save Changes
              </Button>
            </CardFooter>
          </Card>
        </form>
      )}

      {activeTab === 'roles' && userRole === 'admin' && (
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="w-5 h-5 text-indigo-600" />
                Manage Role Access
              </CardTitle>
              <CardDescription>Configure which modules are visible to each role in the sidebar.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-8">
                {ROLES.map(role => (
                  <div key={role} className="border border-slate-200 rounded-md p-4 bg-slate-50">
                    <div className="flex justify-between items-center mb-4 pb-2 border-b border-slate-200">
                      <h3 className="text-lg font-bold capitalize text-slate-800">{role}</h3>
                      <Button size="sm" onClick={() => handleSaveRole(role)}>
                        <Save className="mr-2 h-3.5 w-3.5" /> Save {role}
                      </Button>
                    </div>
                    
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                      {MODULES.map(mod => {
                        const isChecked = rolePermissions[role]?.includes(mod) || false;
                        return (
                          <div key={mod} className="flex items-center space-x-2 bg-white p-2 rounded-sm border border-slate-200 shadow-sm">
                            <input
                              type="checkbox"
                              id={`role-${role}-${mod}`}
                              className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 w-4 h-4 cursor-pointer"
                              checked={isChecked}
                              onChange={() => handleToggleModule(role, mod)}
                            />
                            <Label htmlFor={`role-${role}-${mod}`} className="cursor-pointer text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                              {mod}
                            </Label>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
