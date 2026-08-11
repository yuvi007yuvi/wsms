import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { TableSkeleton } from '@/components/ui/LoadingSkeletons';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Plus, Trash2, Edit2, Star } from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { ImportExportButtons } from '@/components/ui/ImportExportButtons';
import api from '@/lib/api';

export default function Destinations() {
  const [destinations, setDestinations] = useState<any[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize] = useState(10);
  const [totalRecords, setTotalRecords] = useState(0);
  const { toast } = useToast();

  const [name, setName] = useState('');
  const [location, setLocation] = useState('');
  const [isDefault, setIsDefault] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const fetchDestinations = async () => {
    setLoading(true);
    try {
      const res = await api.get('/master/destinations', {
        params: { page: currentPage, limit: pageSize }
      });
      if (res.data && res.data.data) {
        setDestinations(res.data.data);
        setTotalRecords(res.data.total);
      } else {
        setDestinations(res.data);
        setTotalRecords(res.data.length);
      }
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDestinations();
  }, [currentPage, pageSize]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingId) {
        await api.put(`/master/destinations/${editingId}`, { name, location, isDefault });
        toast({ title: 'Destination updated successfully' });
      } else {
        await api.post('/master/destinations', { name, location, isDefault });
        toast({ title: 'Destination saved successfully' });
      }
      setOpen(false);
      resetForm();
      fetchDestinations();
    } catch (error) {
      toast({ title: 'Error saving destination', variant: 'destructive' });
    }
  };

  const handleEdit = (destination: any) => {
    setEditingId(destination.id);
    setName(destination.name);
    setLocation(destination.location || '');
    setIsDefault(destination.isDefault || false);
    setOpen(true);
  };

  const resetForm = () => {
    setEditingId(null);
    setName('');
    setLocation('');
    setIsDefault(false);
  };

  const handleOpenChange = (newOpen: boolean) => {
    setOpen(newOpen);
    if (!newOpen) resetForm();
  };

  const handleDelete = async (id: string) => {
    try {
      await api.delete(`/master/destinations/${id}`);
      toast({ title: 'Destination deleted' });
      fetchDestinations();
    } catch (error: any) {
      toast({
        title: 'Error deleting destination',
        description: error.response?.data?.error || 'Unknown error occurred',
        variant: 'destructive'
      });
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-3xl font-bold tracking-tight">Destination Master</h2>
        <div className="flex gap-2">
          <ImportExportButtons
            data={destinations}
            exportFilename="destinations_master"
            importEndpoint="/master/destinations/bulk"
            onImportSuccess={fetchDestinations}
          />
          <Dialog open={open} onOpenChange={handleOpenChange}>
            <DialogTrigger asChild>
              <Button onClick={resetForm}><Plus className="mr-2 h-4 w-4" /> Add Destination</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{editingId ? 'Edit Destination' : 'Add New Destination'}</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSave} className="space-y-4">
                <div className="space-y-2">
                  <Label>Destination Name</Label>
                  <Input value={name} onChange={e => setName(e.target.value)} required placeholder="e.g., Plant 1" />
                </div>
                <div className="space-y-2">
                  <Label>Location</Label>
                  <Input value={location} onChange={e => setLocation(e.target.value)} placeholder="e.g., Industrial Area" />
                </div>
                <div className="flex items-center space-x-2 pt-2">
                  <Switch id="is-default" checked={isDefault} onCheckedChange={setIsDefault} />
                  <Label htmlFor="is-default" className="cursor-pointer">Set as Default Destination</Label>
                </div>
                <Button type="submit" className="w-full">{editingId ? 'Update Destination' : 'Save Destination'}</Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Registered Destinations</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader className="bg-slate-100/80 sticky top-0 z-10">
              <TableRow className="hover:bg-transparent">
                <TableHead className="h-10 px-4 text-xs font-bold text-slate-600 uppercase tracking-wider w-16">Sr. No.</TableHead>
                <TableHead className="h-10 px-4 text-xs font-bold text-slate-600 uppercase tracking-wider">Destination Name</TableHead>
                <TableHead className="h-10 px-4 text-xs font-bold text-slate-600 uppercase tracking-wider">Location</TableHead>
                <TableHead className="h-10 px-4 text-xs font-bold text-slate-600 uppercase tracking-wider text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={4} className="p-4">
                    <TableSkeleton rows={4} />
                  </TableCell>
                </TableRow>
              ) : destinations.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="text-center py-6 text-muted-foreground">
                    No destinations found. Add one to get started.
                  </TableCell>
                </TableRow>
              ) : (
                destinations.map((d, index) => (
                  <TableRow key={d.id} className="border-b border-slate-200 hover:bg-slate-50 transition-colors">
                    <TableCell className="py-3 px-4 text-sm text-slate-600">{index + 1}</TableCell>
                    <TableCell className="py-3 px-4 text-sm font-medium text-slate-900">
                      <div className="flex items-center gap-2">
                        {d.name}
                        {d.isDefault && <Badge variant="secondary" className="bg-yellow-100 text-yellow-800 hover:bg-yellow-100"><Star className="w-3 h-3 mr-1 fill-yellow-500 text-yellow-500" /> Default</Badge>}
                      </div>
                    </TableCell>
                    <TableCell className="py-3 px-4 text-sm text-slate-600">{d.location || '-'}</TableCell>
                    <TableCell className="py-3 px-4 text-right">
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-blue-500 hover:text-blue-700 hover:bg-blue-50 rounded-md mr-1" onClick={() => handleEdit(d)}>
                        <Edit2 className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-red-500 hover:text-red-700 hover:bg-red-50 rounded-md" onClick={() => handleDelete(d.id)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
        <div className="flex items-center justify-between p-2 border-t border-slate-200 bg-slate-50 text-xs text-slate-500 rounded-b-lg">
          <span>Showing {totalRecords > 0 ? ((currentPage - 1) * pageSize) + 1 : 0}-{Math.min(currentPage * pageSize, totalRecords)} of {totalRecords} records</span>
          <div className="flex gap-1">
            <Button variant="outline" size="sm" className="h-6 px-2 text-[10px] rounded-sm border-slate-300" 
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))} 
              disabled={currentPage <= 1}>
              Previous
            </Button>
            <Button variant="outline" size="sm" className="h-6 px-2 text-[10px] rounded-sm border-slate-300" 
              onClick={() => setCurrentPage(p => p + 1)} 
              disabled={currentPage * pageSize >= totalRecords}>
              Next
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
}
