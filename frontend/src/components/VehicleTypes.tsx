import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { TableSkeleton } from '@/components/ui/LoadingSkeletons';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Plus, Trash2 } from 'lucide-react';
import { ImportExportButtons } from '@/components/ui/ImportExportButtons';
import api from '@/lib/api';

export default function VehicleTypes() {
  const [vehicleTypes, setVehicleTypes] = useState<any[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize] = useState(10);
  const [totalRecords, setTotalRecords] = useState(0);
  const { toast } = useToast();

  const [name, setName] = useState('');
  const [tareWeight, setTareWeight] = useState('');
  const fetchVehicleTypes = async () => {
    setLoading(true);
    try {
      const res = await api.get('/master/vehicle-types', {
        params: { page: currentPage, limit: pageSize }
      });
      if (res.data && res.data.data) {
        setVehicleTypes(res.data.data);
        setTotalRecords(res.data.total);
      } else {
        setVehicleTypes(res.data);
        setTotalRecords(res.data.length);
      }
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchVehicleTypes();
  }, [currentPage, pageSize]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.post('/master/vehicle-types', { name, tareWeight: parseFloat(tareWeight) || 0 });
      toast({ title: 'Vehicle Type saved successfully' });
      setOpen(false);
      setName('');
      setTareWeight('');

      fetchVehicleTypes();
    } catch (error) {
      toast({ title: 'Error saving vehicle type', variant: 'destructive' });
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await api.delete(`/master/vehicle-types/${id}`);
      toast({ title: 'Vehicle Type deleted' });
      fetchVehicleTypes();
    } catch (error: any) {
      toast({ 
        title: 'Error deleting vehicle type', 
        description: error.response?.data?.error || 'Unknown error occurred',
        variant: 'destructive' 
      });
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-3xl font-bold tracking-tight">Vehicle Type Master</h2>
        <div className="flex gap-2">
          <ImportExportButtons 
            data={vehicleTypes} 
            exportFilename="vehicle_types_master" 
            importEndpoint="/master/vehicle-types/bulk"
            exportEndpoint="/master/vehicle-types" 
            onImportSuccess={fetchVehicleTypes} 
          />
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button><Plus className="mr-2 h-4 w-4" /> Add Vehicle Type</Button>
            </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add New Vehicle Type</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSave} className="space-y-4">
              <div className="space-y-2">
                <Label>Vehicle Type Name</Label>
                <Input value={name} onChange={e => setName(e.target.value)} required placeholder="e.g. Dumper" />
              </div>
              <div className="space-y-2">
                <Label>Default Tare Weight (KG)</Label>
                <Input type="number" value={tareWeight} onChange={e => setTareWeight(e.target.value)} placeholder="0" />
              </div>

              <Button type="submit" className="w-full">Save Vehicle Type</Button>
            </form>
          </DialogContent>
        </Dialog>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Registered Vehicle Types</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader className="bg-slate-100/80 sticky top-0 z-10">
              <TableRow className="hover:bg-transparent">
                <TableHead className="h-10 px-4 text-xs font-bold text-slate-600 uppercase tracking-wider w-16">Sr. No.</TableHead>
                <TableHead className="h-10 px-4 text-xs font-bold text-slate-600 uppercase tracking-wider">Type Name</TableHead>
                <TableHead className="h-10 px-4 text-xs font-bold text-slate-600 uppercase tracking-wider">Default Tare</TableHead>
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
              ) : vehicleTypes.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="text-center py-6 text-muted-foreground">
                    No vehicle types found. Add one to get started.
                  </TableCell>
                </TableRow>
              ) : (
                vehicleTypes.map((vt, index) => (
                  <TableRow key={vt.id} className="border-b border-slate-200 hover:bg-slate-50 transition-colors">
                    <TableCell className="py-3 px-4 text-sm text-slate-600">{((currentPage - 1) * pageSize) + index + 1}</TableCell>
                    <TableCell className="py-3 px-4 text-sm font-medium text-slate-900">{vt.name}</TableCell>
                    <TableCell className="py-3 px-4 text-sm text-slate-600">{vt.tareWeight || 0} kg</TableCell>

                    <TableCell className="py-3 px-4 text-right">
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-red-500 hover:text-red-700 hover:bg-red-50 rounded-md" onClick={() => handleDelete(vt.id)}>
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
