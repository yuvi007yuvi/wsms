import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Plus } from 'lucide-react';
import api from '@/lib/api';
import { format, formatDistanceToNow } from 'date-fns';
import { Pencil } from 'lucide-react';

export default function Superadmin() {
  const [projects, setProjects] = useState<any[]>([]);
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  const [expiry, setExpiry] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  
  const [adminOpen, setAdminOpen] = useState(false);
  const [selectedProjectId, setSelectedProjectId] = useState('');
  const [users, setUsers] = useState<any[]>([]);
  const [selectedUserId, setSelectedUserId] = useState('');
  
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

  useEffect(() => {
    fetchProjects();
    fetchUsers();
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingId) {
        await api.put(`/superadmin/projects/${editingId}`, { 
          name, 
          subscriptionExpiry: expiry || null 
        });
        toast({ title: 'Project updated successfully' });
      } else {
        await api.post('/superadmin/projects', { 
          name, 
          subscriptionExpiry: expiry || null 
        });
        toast({ title: 'Project created successfully' });
      }
      setOpen(false);
      setName('');
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
    setExpiry('');
    setOpen(true);
  };

  const openEdit = (project: any) => {
    setEditingId(project.id);
    setName(project.name);
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
                <Label>Subscription Expiry</Label>
                <Input type="datetime-local" value={expiry} onChange={e => setExpiry(e.target.value)} />
              </div>
              <Button type="submit" className="w-full">Create Project</Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>All Projects</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Project Name</TableHead>
                <TableHead>Assigned To</TableHead>
                <TableHead>Users</TableHead>
                <TableHead>Vehicles</TableHead>
                <TableHead>Slips</TableHead>
                <TableHead>Expiry</TableHead>
                <TableHead>Duration</TableHead>
                <TableHead>Active</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {projects.map((p) => (
                <TableRow key={p.id}>
                  <TableCell className="font-medium">{p.name}</TableCell>
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
                  <TableCell>{p.users?.length || 0}</TableCell>
                  <TableCell>{p._count?.vehicles || 0}</TableCell>
                  <TableCell>{p._count?.weighmentSlips || 0}</TableCell>
                  <TableCell>{p.subscriptionExpiry ? format(new Date(p.subscriptionExpiry), 'dd MMM yyyy, hh:mm a') : 'Lifetime'}</TableCell>
                  <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                    {p.subscriptionExpiry ? (
                      new Date(p.subscriptionExpiry) > new Date() 
                        ? `${formatDistanceToNow(new Date(p.subscriptionExpiry))} left`
                        : `Expired ${formatDistanceToNow(new Date(p.subscriptionExpiry))} ago`
                    ) : '-'}
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
                  <TableCell colSpan={6} className="text-center py-6 text-muted-foreground">
                    No projects found.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
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
