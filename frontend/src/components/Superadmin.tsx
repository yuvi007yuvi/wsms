import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, TableFooter } from '@/components/ui/table';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { format, formatDistanceToNow } from 'date-fns';
import { Pencil, MapPin, Calendar, Clock, Plus } from 'lucide-react';

export default function Superadmin() {
  const [projects, setProjects] = useState<any[]>([]);
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  const [address, setAddress] = useState('');
  const [expiry, setExpiry] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  
  const [adminOpen, setAdminOpen] = useState(false);
  const [selectedProjectId, setSelectedProjectId] = useState('');
  const [users, setUsers] = useState<any[]>([]);
  const [selectedUserId, setSelectedUserId] = useState('');
  
  const [stats, setStats] = useState({ projects: 0, vehicles: 0, slips: 0 });
  
  const { toast } = useToast();

  const fetchProjects = async () => {
    try {
      const res = await api.get('/superadmin/projects');
      setProjects(res.data);
    } catch (error) {
      console.error(error);
    }
  };

  const fetchUsers = async () => {
    try {
      const res = await api.get('/superadmin/users');
      setUsers(res.data);
    } catch (error) {
      console.error('Failed to fetch users', error);
    }
  };

  const fetchStats = async () => {
    try {
      const res = await api.get('/superadmin/stats');
      setStats(res.data);
    } catch (error) {
      console.error('Failed to fetch stats', error);
    }
  };

  useEffect(() => {
    fetchProjects();
    fetchUsers();
    fetchStats();
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingId) {
        await api.put(`/superadmin/projects/${editingId}`, { 
          name, 
          address,
          subscriptionExpiry: expiry || null 
        });
        toast({ title: 'Project updated successfully' });
      } else {
        await api.post('/superadmin/projects', { 
          name, 
          address,
          subscriptionExpiry: expiry || null 
        });
        toast({ title: 'Project created successfully' });
      }
      setOpen(false);
      setName('');
      setAddress('');
      setExpiry('');
      setEditingId(null);
      fetchProjects();
    } catch (error: any) {
      toast({ title: error.response?.data?.error || 'Failed to save project', variant: 'destructive' });
    }
  };

  const openAdd = () => {
    setEditingId(null);
    setName('');
    setAddress('');
    setExpiry('');
    setOpen(true);
  };

  const openEdit = (project: any) => {
    setEditingId(project.id);
    setName(project.name);
    setAddress(project.address || '');
    if (project.subscriptionExpiry) {
      // Convert to local datetime-local string format
      const date = new Date(project.subscriptionExpiry);
      const localString = new Date(date.getTime() - (date.getTimezoneOffset() * 60000)).toISOString().slice(0, 16);
      setExpiry(localString);
    } else {
      setExpiry('');
    }
    setOpen(true);
  };

  const [disableDialogOpen, setDisableDialogOpen] = useState(false);
  const [projectToDisable, setProjectToDisable] = useState<any>(null);
  const [disableReason, setDisableReason] = useState('');

  const toggleStatus = async (project: any) => {
    if (project.isActive) {
      // Disabling project, ask for reason
      setProjectToDisable(project);
      setDisableReason('Database is full');
      setDisableDialogOpen(true);
    } else {
      // Enabling project, no reason needed
      try {
        await api.put(`/superadmin/projects/${project.id}`, {
          isActive: false // Wait, if it was false, we want to enable it, so isActive: true
        });
      } catch(e) {}
      
      try {
        await api.put(`/superadmin/projects/${project.id}`, {
          isActive: true
        });
        toast({ title: 'Project activated' });
        fetchProjects();
      } catch (error) {
        toast({ title: 'Error activating project', variant: 'destructive' });
      }
    }
  };

  const confirmDisable = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!projectToDisable) return;
    try {
      await api.put(`/superadmin/projects/${projectToDisable.id}`, {
        isActive: false,
        disableReason: disableReason
      });
      toast({ title: 'Project disabled successfully' });
      setDisableDialogOpen(false);
      setProjectToDisable(null);
      fetchProjects();
    } catch (error) {
      toast({ title: 'Error disabling project', variant: 'destructive' });
    }
  };

  const handleAssignUser = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.put(`/superadmin/projects/${selectedProjectId}/assign-user`, {
        userId: selectedUserId
      });
      toast({ title: 'User assigned to project successfully!' });
      setAdminOpen(false);
      setSelectedUserId('');
      fetchProjects();
      fetchUsers(); // Refresh to see updated assignment
    } catch (error: any) {
      toast({ title: error.response?.data?.error || 'Error assigning user', variant: 'destructive' });
    }
  };

  return (
    <div className="space-y-6 p-6">
      <div className="flex justify-between items-center">
        <h2 className="text-3xl font-bold tracking-tight">Superadmin Dashboard</h2>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button onClick={openAdd}><Plus className="mr-2 h-4 w-4" /> Add Project</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editingId ? 'Edit Project' : 'Add New Project (Client)'}</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSave} className="space-y-4">
              <div className="space-y-2">
                <Label>Project Name</Label>
                <Input value={name} onChange={e => setName(e.target.value)} required placeholder="e.g. Acme Corp" />
              </div>
              <div className="space-y-2">
                <Label>Address</Label>
                <Input value={address} onChange={e => setAddress(e.target.value)} placeholder="Project Address" />
              </div>
              <div className="space-y-2">
                <Label>Subscription Expiry</Label>
                <Input type="datetime-local" value={expiry} onChange={e => setExpiry(e.target.value)} />
              </div>
              <Button type="submit" className="w-full">Create Project</Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Projects</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.projects}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Vehicles</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.vehicles}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Slips</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.slips}</div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>All Projects</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Project Details</TableHead>
                <TableHead>Assigned To</TableHead>
                <TableHead>Users</TableHead>
                <TableHead>Vehicles</TableHead>
                <TableHead>Slips</TableHead>
                <TableHead>Subscription</TableHead>
                <TableHead>Active</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {projects.map((p) => (
                <TableRow key={p.id}>
                  <TableCell>
                    <div className="flex flex-col gap-1.5 max-w-[300px]">
                      <span className="font-bold text-sm text-slate-800">{p.name}</span>
                      {p.address && (
                        <div className="flex items-start gap-1 text-xs text-slate-500">
                          <MapPin className="h-3 w-3 mt-0.5 shrink-0" />
                          <span className="line-clamp-2">{p.address}</span>
                        </div>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    {p.users && p.users.length > 0 ? (
                      <div className="flex flex-col gap-1">
                        {p.users.map((u: any) => (
                          <span key={u.id} className="text-xs bg-slate-100 px-2 py-0.5 rounded-full border border-slate-200 inline-block w-max">
                            {u.username} {u.fullName ? `(${u.fullName})` : ''}
                          </span>
                        ))}
                      </div>
                    ) : (
                      <span className="text-xs text-slate-400 italic">None</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <span className="bg-blue-50 text-blue-700 font-semibold px-2.5 py-1 rounded-md text-xs">{p.users?.length || 0}</span>
                  </TableCell>
                  <TableCell>
                    <span className="bg-amber-50 text-amber-700 font-semibold px-2.5 py-1 rounded-md text-xs">{p._count?.vehicles || 0}</span>
                  </TableCell>
                  <TableCell>
                    <span className="bg-emerald-50 text-emerald-700 font-semibold px-2.5 py-1 rounded-md text-xs">{p._count?.weighmentSlips || 0}</span>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-col gap-1">
                      <div className="flex items-center gap-1.5 text-sm font-medium text-slate-700">
                        <Calendar className="h-3.5 w-3.5 text-slate-400" />
                        {p.subscriptionExpiry ? format(new Date(p.subscriptionExpiry), 'dd MMM yyyy') : 'Lifetime'}
                      </div>
                      <div className="flex items-center gap-1.5 text-xs text-slate-500">
                        <Clock className="h-3 w-3" />
                        {p.subscriptionExpiry ? (
                          new Date(p.subscriptionExpiry) > new Date() 
                            ? `${formatDistanceToNow(new Date(p.subscriptionExpiry))} left`
                            : <span className="text-red-500 font-semibold">Expired {formatDistanceToNow(new Date(p.subscriptionExpiry))} ago</span>
                        ) : 'No Expiry'}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Switch checked={p.isActive} onCheckedChange={() => toggleStatus(p)} />
                  </TableCell>
                  <TableCell className="flex gap-2">
                    <Button variant="outline" size="icon" title="Edit Project" onClick={() => openEdit(p)}>
                      <Pencil className="h-4 w-4 text-slate-600" />
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => {
                      setSelectedProjectId(p.id);
                      setAdminOpen(true);
                    }}>
                      Assign User
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
              {projects.length === 0 && (
                <TableRow>
                  <TableCell colSpan={9} className="text-center py-6 text-muted-foreground">
                    No projects found.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
            <TableFooter>
              <TableRow className="font-bold bg-muted/50">
                <TableCell colSpan={2} className="text-right">Total (All Projects):</TableCell>
                <TableCell><span className="bg-blue-100 text-blue-800 font-bold px-2 py-1 rounded-md text-sm">{projects.reduce((sum, p) => sum + (p.users?.length || 0), 0)}</span></TableCell>
                <TableCell><span className="bg-amber-100 text-amber-800 font-bold px-2 py-1 rounded-md text-sm">{stats.vehicles}</span></TableCell>
                <TableCell><span className="bg-emerald-100 text-emerald-800 font-bold px-2 py-1 rounded-md text-sm">{stats.slips}</span></TableCell>
                <TableCell colSpan={3}></TableCell>
              </TableRow>
            </TableFooter>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={adminOpen} onOpenChange={setAdminOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Assign User to Project</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleAssignUser} className="space-y-4">
            <div className="space-y-2">
              <Label>Select Existing User</Label>
              <select 
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                value={selectedUserId} 
                onChange={e => setSelectedUserId(e.target.value)} 
                required
              >
                <option value="" disabled>-- Select a User --</option>
                {users.map(u => (
                  <option key={u.id} value={u.id}>
                    {u.username} {u.fullName ? `(${u.fullName})` : ''} - {u.projectId ? 'Already Assigned' : 'Unassigned'}
                  </option>
                ))}
              </select>
            </div>
            <Button type="submit" className="w-full">Assign User</Button>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={disableDialogOpen} onOpenChange={setDisableDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Disable Project</DialogTitle>
          </DialogHeader>
          <form onSubmit={confirmDisable} className="space-y-4">
            <div className="space-y-2">
              <Label>Select Error Message to Show User</Label>
              <select 
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                value={disableReason} 
                onChange={e => setDisableReason(e.target.value)} 
                required
              >
                <option value="Database is full">Database is full</option>
                <option value="Connectivity error">Connectivity error</option>
                <option value="Server overflow">Server overflow</option>
                <option value="Database is inbalanced">Database is inbalanced</option>
                <option value="Your subscription is disabled by the administrator.">Generic (Disabled by admin)</option>
              </select>
            </div>
            <Button type="submit" variant="destructive" className="w-full">Disable Project</Button>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
