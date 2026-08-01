import { useState, useEffect } from 'react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { Plus, Trash2, Search, Download, Filter, RefreshCw } from 'lucide-react';
import api from '@/lib/api';

export default function Users() {
  const [users, setUsers] = useState<any[]>([]);
  const [open, setOpen] = useState(false);
  const { toast } = useToast();

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [designation, setDesignation] = useState('');
  const [role, setRole] = useState('operator');

  const fetchUsers = async () => {
    try {
      const res = await api.get('/users');
      setUsers(res.data);
    } catch (error) {
      console.error(error);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.post('/users', { username, password, role, fullName, designation });
      toast({ title: 'User saved successfully' });
      setOpen(false);
      setUsername('');
      setPassword('');
      setFullName('');
      setDesignation('');
      setRole('operator');
      fetchUsers();
    } catch (error) {
      toast({ title: 'Error saving user', variant: 'destructive' });
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await api.delete(`/users/${id}`);
      toast({ title: 'User deleted' });
      fetchUsers();
    } catch (error: any) {
      toast({ 
        title: 'Error deleting user', 
        description: error.response?.data?.error || 'Unknown error',
        variant: 'destructive' 
      });
    }
  };

  return (
    <div className="flex flex-col h-full space-y-4">
      <div className="flex justify-between items-end">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-slate-900">User Management</h2>
          <p className="text-sm text-slate-500">Manage system access, roles, and user accounts.</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button size="sm" className="h-8 text-xs font-bold uppercase tracking-wider bg-blue-600 hover:bg-blue-700 rounded-sm">
              <Plus className="mr-2 h-4 w-4" /> Add User
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add New User</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSave} className="grid grid-cols-2 gap-4 mt-4">
              <div className="space-y-2">
                <Label>Username</Label>
                <Input value={username} onChange={e => setUsername(e.target.value)} required />
              </div>
              <div className="space-y-2">
                <Label>Password</Label>
                <Input type="password" value={password} onChange={e => setPassword(e.target.value)} required />
              </div>
              <div className="space-y-2">
                <Label>Full Name</Label>
                <Input value={fullName} onChange={e => setFullName(e.target.value)} required />
              </div>
              <div className="space-y-2">
                <Label>Designation</Label>
                <Input value={designation} onChange={e => setDesignation(e.target.value)} required />
              </div>
              <div className="space-y-2">
                <Label>Role</Label>
                <Select value={role} onValueChange={setRole}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="admin">Admin</SelectItem>
                    <SelectItem value="manager">Manager</SelectItem>
                    <SelectItem value="supervisor">Supervisor</SelectItem>
                    <SelectItem value="operator">Operator</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Button type="submit" className="w-full col-span-2 h-10 mt-2 font-bold uppercase tracking-widest bg-blue-600 hover:bg-blue-700 rounded-sm">Save User</Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="flex flex-col flex-1 bg-white border border-slate-300 rounded-sm shadow-sm overflow-hidden">
        <div className="flex justify-between items-center p-2 border-b border-slate-300 bg-slate-50">
          <div className="flex items-center gap-2">
            <div className="relative">
              <Search className="absolute left-2.5 top-2 h-4 w-4 text-slate-500" />
              <Input placeholder="Search users..." className="h-8 w-64 pl-8 text-xs bg-white rounded-sm border-slate-300 focus-visible:ring-blue-500" />
            </div>
            <Button variant="outline" size="sm" className="h-8 text-xs rounded-sm border-slate-300">
              <Filter className="h-3.5 w-3.5 mr-1" /> Filter
            </Button>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" className="h-8 text-xs rounded-sm border-slate-300" onClick={fetchUsers}>
              <RefreshCw className="h-3.5 w-3.5 mr-1" /> Refresh
            </Button>
            <Button variant="outline" size="sm" className="h-8 text-xs rounded-sm border-slate-300">
              <Download className="h-3.5 w-3.5 mr-1" /> Export
            </Button>
          </div>
        </div>

        <div className="flex-1 overflow-auto">
          <Table>
            <TableHeader className="bg-slate-100 sticky top-0 z-10 shadow-[0_1px_0_0_#CBD5E1]">
              <TableRow className="hover:bg-transparent">
                <TableHead className="h-8 py-1 px-3 text-xs font-semibold text-slate-700">Username</TableHead>
                <TableHead className="h-8 py-1 px-3 text-xs font-semibold text-slate-700">Name</TableHead>
                <TableHead className="h-8 py-1 px-3 text-xs font-semibold text-slate-700">Designation</TableHead>
                <TableHead className="h-8 py-1 px-3 text-xs font-semibold text-slate-700">Role</TableHead>
                <TableHead className="h-8 py-1 px-3 text-xs font-semibold text-slate-700">Status</TableHead>
                <TableHead className="h-8 py-1 px-3 text-xs font-semibold text-slate-700 text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {users.map((u) => (
                <TableRow key={u.id} className="border-b border-slate-200 hover:bg-blue-50/50 transition-colors">
                  <TableCell className="py-1.5 px-3 text-xs font-medium text-slate-900">{u.username}</TableCell>
                  <TableCell className="py-1.5 px-3 text-xs text-slate-600">{u.fullName || '-'}</TableCell>
                  <TableCell className="py-1.5 px-3 text-xs text-slate-600">{u.designation || '-'}</TableCell>
                  <TableCell className="py-1.5 px-3 text-xs text-slate-600 capitalize">{u.role}</TableCell>
                  <TableCell className="py-1.5 px-3">
                    <span className={`px-2 py-0.5 rounded-sm text-[10px] font-bold uppercase tracking-wider ${u.isActive ? 'bg-green-100 text-green-700 border border-green-200' : 'bg-red-100 text-red-700 border border-red-200'}`}>
                      {u.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </TableCell>
                  <TableCell className="py-1.5 px-3 text-right">
                    <Button variant="ghost" size="icon" className="h-6 w-6 text-red-500 hover:bg-red-100 rounded-sm" onClick={() => handleDelete(u.id)} disabled={u.username === 'admin'}>
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
              {users.length === 0 && (
                <TableRow>
                  <TableCell colSpan={4} className="text-center py-6 text-muted-foreground">
                    No users found.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>

        <div className="flex items-center justify-between p-2 border-t border-slate-300 bg-slate-50 text-xs text-slate-500">
          <span>Showing {users.length} records</span>
          <div className="flex gap-1">
            <Button variant="outline" size="sm" className="h-6 px-2 text-[10px] rounded-sm border-slate-300" disabled>Previous</Button>
            <Button variant="outline" size="sm" className="h-6 px-2 text-[10px] rounded-sm border-slate-300" disabled>Next</Button>
          </div>
        </div>
      </div>
    </div>
  );
}
