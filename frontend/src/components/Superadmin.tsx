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
import { format } from 'date-fns';

export default function Superadmin() {
  const [projects, setProjects] = useState<any[]>([]);
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  const [expiry, setExpiry] = useState('');
  
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
      await api.post('/superadmin/projects', { 
        name, 
        subscriptionExpiry: expiry || null 
      });
      toast({ title: 'Project created successfully' });
      setOpen(false);
      setName('');
      setExpiry('');
      fetchProjects();
    } catch (error) {
      toast({ title: 'Error creating project', variant: 'destructive' });
    }
  };

  const toggleStatus = async (project: any) => {
    try {
      await api.put(`/superadmin/projects/${project.id}`, {
        isActive: !project.isActive
      });
      toast({ title: 'Project status updated' });
      fetchProjects();
    } catch (error) {
      toast({ title: 'Error updating project', variant: 'destructive' });
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
            <Button><Plus className="mr-2 h-4 w-4" /> Add Project</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add New Project (Client)</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSave} className="space-y-4">
              <div className="space-y-2">
                <Label>Project Name</Label>
                <Input value={name} onChange={e => setName(e.target.value)} required placeholder="e.g. Acme Corp" />
              </div>
              <div className="space-y-2">
                <Label>Subscription Expiry</Label>
                <Input type="date" value={expiry} onChange={e => setExpiry(e.target.value)} />
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
                <TableHead>Users</TableHead>
                <TableHead>Vehicles</TableHead>
                <TableHead>Slips</TableHead>
                <TableHead>Expiry</TableHead>
                <TableHead>Active</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {projects.map((p) => (
                <TableRow key={p.id}>
                  <TableCell className="font-medium">{p.name}</TableCell>
                  <TableCell>{p._count?.users || 0}</TableCell>
                  <TableCell>{p._count?.vehicles || 0}</TableCell>
                  <TableCell>{p._count?.weighmentSlips || 0}</TableCell>
                  <TableCell>{p.subscriptionExpiry ? format(new Date(p.subscriptionExpiry), 'dd MMM yyyy') : 'Lifetime'}</TableCell>
                  <TableCell>
                    <Switch checked={p.isActive} onCheckedChange={() => toggleStatus(p)} />
                  </TableCell>
                  <TableCell>
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
    </div>
  );
}
