import { useState, useEffect } from 'react';
import { useDebounce } from '@/hooks/use-debounce';
import { SearchableSelect } from '@/components/ui/SearchableSelect';
import { TableSkeleton } from '@/components/ui/LoadingSkeletons';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Plus, Trash2, Search, Filter, RefreshCw, Edit2, RotateCcw, ArchiveRestore } from 'lucide-react';
import { ImportExportButtons } from '@/components/ui/ImportExportButtons';
import api from '@/lib/api';

export default function Vehicles() {
  const [vehicles, setVehicles] = useState<any[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize] = useState(10);
  const [totalRecords, setTotalRecords] = useState(0);
  const [searchQuery, setSearchQuery] = useState('');
  const debouncedSearchQuery = useDebounce(searchQuery, 300);
  const { toast } = useToast();

  const [showDeletedModal, setShowDeletedModal] = useState(false);
  const [deletedVehicles, setDeletedVehicles] = useState<any[]>([]);
  const [deletedLoading, setDeletedLoading] = useState(false);

  // Form
  const [vehicleNumber, setVehicleNumber] = useState('');
  const [vehicleTypeId, setVehicleTypeId] = useState('');
  const [tareWeight, setTareWeight] = useState('');
  const [vehicleTypes, setVehicleTypes] = useState<any[]>([]);
  


  const [editingId, setEditingId] = useState<string | null>(null);

  const fetchVehicles = async () => {
    setLoading(true);
    try {
      const res = await api.get('/master/vehicles', {
        params: { page: currentPage, limit: pageSize, search: debouncedSearchQuery }
      });
      if (res.data && res.data.data) {
        setVehicles(res.data.data);
        setTotalRecords(res.data.total);
      } else {
        setVehicles(res.data);
        setTotalRecords(res.data.length);
      }
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const fetchVehicleTypes = async () => {
    try {
      const res = await api.get('/master/vehicle-types', { params: { limit: 1000 } });
      setVehicleTypes(Array.isArray(res.data?.data) ? res.data.data : (Array.isArray(res.data) ? res.data : []));
    } catch (error) {
      console.error(error);
    }
  };

  useEffect(() => {
    setCurrentPage(1);
  }, [debouncedSearchQuery]);

  useEffect(() => {
    fetchVehicles();
  }, [currentPage, pageSize, debouncedSearchQuery]);

  useEffect(() => {
    fetchVehicleTypes();
  }, []);

  const fetchDeletedVehicles = async () => {
    setDeletedLoading(true);
    try {
      const res = await api.get('/master/vehicles', {
        params: { page: 1, limit: 1000, isActive: 'false' }
      });
      if (res.data && res.data.data) {
        setDeletedVehicles(res.data.data);
      } else {
        setDeletedVehicles(res.data);
      }
    } catch (error) {
      console.error(error);
    } finally {
      setDeletedLoading(false);
    }
  };

  useEffect(() => {
    if (showDeletedModal) {
      fetchDeletedVehicles();
    }
  }, [showDeletedModal]);

  const handleRestore = async (id: string) => {
    try {
      await api.put(`/master/vehicles/${id}`, { isActive: true });
      toast({ title: 'Vehicle restored successfully' });
      fetchDeletedVehicles();
      fetchVehicles();
    } catch (error: any) {
      toast({ 
        title: 'Error restoring vehicle', 
        description: error.response?.data?.error || 'Unknown error occurred',
        variant: 'destructive' 
      });
    }
  };

  const handleEdit = (v: any) => {
    setVehicleNumber(v.vehicleNumber);
    setVehicleTypeId(v.vehicleTypeId || '');
    setTareWeight(v.tareWeight ? v.tareWeight.toString() : '');
    setEditingId(v.id);
    setOpen(true);
  };

  const handleOpenChange = (newOpen: boolean) => {
    setOpen(newOpen);
    if (!newOpen) {
      // Reset form on close
      setVehicleNumber('');
      setVehicleTypeId('');
      setTareWeight('');
      setEditingId(null);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingId) {
        await api.put(`/master/vehicles/${editingId}`, {
          vehicleNumber,
          vehicleTypeId,
          tareWeight: parseFloat(tareWeight) || 0
        });
        toast({ title: 'Vehicle updated successfully' });
      } else {
        await api.post('/master/vehicles', {
          vehicleNumber,
          vehicleTypeId,
          tareWeight: parseFloat(tareWeight) || 0
        });
        toast({ title: 'Vehicle saved successfully' });
      }
      handleOpenChange(false);
      fetchVehicles();
    } catch (error: any) {
      toast({ 
        title: 'Error saving vehicle', 
        description: error.response?.data?.error || 'Unknown error occurred',
        variant: 'destructive' 
      });
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await api.delete(`/master/vehicles/${id}`);
      toast({ title: 'Vehicle deleted' });
      fetchVehicles();
    } catch (error: any) {
      toast({ 
        title: 'Error deleting vehicle', 
        description: error.response?.data?.error || 'Unknown error occurred',
        variant: 'destructive' 
      });
    }
  };

  return (
    <div className="flex flex-col h-full space-y-4">
      <div className="flex justify-between items-end">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-slate-900">Vehicle Master</h2>
          <p className="text-sm text-slate-500">Manage registered fleet vehicles and tare weights.</p>
        </div>
        <div className="flex gap-2">
          <ImportExportButtons 
            data={vehicles} 
            exportFilename="vehicles_master" 
            importEndpoint="/master/vehicles/bulk" 
            exportEndpoint="/master/vehicles"
            onImportSuccess={fetchVehicles} 
          />
          <Button onClick={() => setShowDeletedModal(true)} size="sm" variant="outline" className="h-8 text-xs font-bold uppercase tracking-wider border-slate-300">
            <ArchiveRestore className="mr-2 h-4 w-4" /> Deleted
          </Button>
          <Dialog open={open} onOpenChange={handleOpenChange}>
          <DialogTrigger asChild>
            <Button onClick={() => handleOpenChange(true)} size="sm" className="h-8 text-xs font-bold uppercase tracking-wider bg-blue-600 hover:bg-blue-700 rounded-sm">
              <Plus className="mr-2 h-4 w-4" /> Add Vehicle
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editingId ? 'Edit Vehicle' : 'Add New Vehicle'}</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSave} className="grid grid-cols-1 gap-4 mt-4">
              <div className="space-y-2">
                <Label>Vehicle Number</Label>
                <Input value={vehicleNumber} onChange={e => setVehicleNumber(e.target.value)} required />
              </div>
              <div className="space-y-2">
                <Label>Vehicle Type</Label>
                <SearchableSelect
                  options={vehicleTypes.map(t => ({ value: t.id, label: t.name }))}
                  value={vehicleTypeId}
                  onValueChange={setVehicleTypeId}
                  placeholder="Select Vehicle Type..."
                />
              </div>
              <div className="space-y-2">
                <Label>Tare Weight (kg)</Label>
                <Input type="number" value={tareWeight} onChange={e => setTareWeight(e.target.value)} placeholder="0" />
              </div>
              <Button type="submit" className="w-full h-10 mt-2 font-bold uppercase tracking-widest bg-blue-600 hover:bg-blue-700 rounded-sm" disabled={!vehicleNumber || !vehicleTypeId}>
                {editingId ? 'Update Vehicle' : 'Save Vehicle'}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
        </div>
      </div>

      <Dialog open={showDeletedModal} onOpenChange={setShowDeletedModal}>
        <DialogContent className="max-w-4xl max-h-[80vh] flex flex-col">
          <DialogHeader>
            <DialogTitle>Deleted / Disabled Vehicles</DialogTitle>
          </DialogHeader>
          <div className="flex-1 overflow-auto mt-4">
            <Table>
              <TableHeader className="bg-slate-100/80 sticky top-0 z-10">
                <TableRow>
                  <TableHead className="text-xs font-bold uppercase tracking-wider">Sr. No.</TableHead>
                  <TableHead className="text-xs font-bold uppercase tracking-wider">Vehicle Number</TableHead>
                  <TableHead className="text-xs font-bold uppercase tracking-wider">Type</TableHead>
                  <TableHead className="text-xs font-bold uppercase tracking-wider text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {deletedLoading ? (
                  <TableRow>
                    <TableCell colSpan={4} className="p-4">
                      <TableSkeleton rows={3} />
                    </TableCell>
                  </TableRow>
                ) : deletedVehicles.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center py-6 text-muted-foreground">
                      No deleted vehicles found.
                    </TableCell>
                  </TableRow>
                ) : (
                  deletedVehicles.map((v, index) => (
                    <TableRow key={v.id}>
                      <TableCell className="py-2 text-sm">{index + 1}</TableCell>
                      <TableCell className="py-2 text-sm font-medium">{v.vehicleNumber}</TableCell>
                      <TableCell className="py-2 text-sm">{v.vehicleType?.name || '-'}</TableCell>
                      <TableCell className="py-2 text-right">
                        <Button variant="outline" size="sm" className="h-7 text-xs" onClick={() => handleRestore(v.id)}>
                          <RotateCcw className="h-3 w-3 mr-1" /> Restore
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </DialogContent>
      </Dialog>

      <div className="flex flex-col flex-1 bg-white border border-slate-300 rounded-sm shadow-sm overflow-hidden">
        {/* Table Toolbar */}
        <div className="flex justify-between items-center p-2 border-b border-slate-300 bg-slate-50">
          <div className="flex items-center gap-2">
            <div className="relative">
              <Search className="absolute left-2.5 top-2 h-4 w-4 text-slate-500" />
              <Input 
                placeholder="Search vehicles..." 
                className="h-8 w-64 pl-8 text-xs bg-white rounded-sm border-slate-300 focus-visible:ring-blue-500"
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                }}
              />
            </div>
            <Button variant="outline" size="sm" className="h-8 text-xs rounded-sm border-slate-300">
              <Filter className="h-3.5 w-3.5 mr-1" /> Filter
            </Button>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" className="h-8 text-xs rounded-sm border-slate-300" onClick={fetchVehicles}>
              <RefreshCw className="h-3.5 w-3.5 mr-1" /> Refresh
            </Button>
          </div>
        </div>

        <div className="flex-1 overflow-auto">
          <Table>
            <TableHeader className="bg-slate-100/80 sticky top-0 z-10">
              <TableRow className="hover:bg-transparent">
                <TableHead className="h-10 px-4 text-xs font-bold text-slate-600 uppercase tracking-wider w-16">Sr. No.</TableHead>
                <TableHead className="h-10 px-4 text-xs font-bold text-slate-600 uppercase tracking-wider">Vehicle Number</TableHead>
                <TableHead className="h-10 px-4 text-xs font-bold text-slate-600 uppercase tracking-wider">Type</TableHead>
                <TableHead className="h-10 px-4 text-xs font-bold text-slate-600 uppercase tracking-wider text-right">Tare Weight (kg)</TableHead>
                <TableHead className="h-10 px-4 text-xs font-bold text-slate-600 uppercase tracking-wider text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={5} className="p-4">
                    <TableSkeleton rows={5} />
                  </TableCell>
                </TableRow>
              ) : vehicles.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-6 text-muted-foreground">
                    No vehicles found. Add one to get started.
                  </TableCell>
                </TableRow>
              ) : (
                vehicles.map((v, index) => (
                  <TableRow key={v.id} className="border-b border-slate-200 hover:bg-slate-50 transition-colors">
                    <TableCell className="py-3 px-4 text-sm text-slate-600">{index + 1}</TableCell>
                    <TableCell className="py-3 px-4 text-sm font-medium text-slate-900">{v.vehicleNumber}</TableCell>
                    <TableCell className="py-3 px-4 text-sm text-slate-600">{v.vehicleType?.name || '-'}</TableCell>
                    <TableCell className="py-3 px-4 text-sm text-slate-900 font-bold text-right">{v.tareWeight || 0}</TableCell>
                    <TableCell className="py-3 px-4 text-right">
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-blue-500 hover:text-blue-700 hover:bg-blue-50 rounded-md mr-1" onClick={() => handleEdit(v)}>
                        <Edit2 className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-red-500 hover:text-red-700 hover:bg-red-50 rounded-md" onClick={() => handleDelete(v.id)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
        
        <div className="flex items-center justify-between p-2 border-t border-slate-300 bg-slate-50 text-xs text-slate-500">
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
      </div>
    </div>
  );
}
