import { useState, useEffect, useRef } from 'react';
import { SearchableSelect } from '@/components/ui/SearchableSelect';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Plus, Trash2, Search, Download, Filter, RefreshCw, Upload } from 'lucide-react';
import api from '@/lib/api';

export default function Vehicles() {
  const [vehicles, setVehicles] = useState<any[]>([]);
  const [open, setOpen] = useState(false);
  const { toast } = useToast();

  // Form
  const [vehicleNumber, setVehicleNumber] = useState('');
  const [vehicleTypeId, setVehicleTypeId] = useState('');
  const [vehicleTypes, setVehicleTypes] = useState<any[]>([]);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [importing, setImporting] = useState(false);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setImporting(true);
    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const text = event.target?.result as string;
        const rows = text.split('\n').map(row => row.trim()).filter(row => row);
        
        let startIndex = 0;
        if (rows.length > 0 && rows[0].toLowerCase().includes('vehicle')) {
          startIndex = 1; // Skip header
        }

        const vehiclesToImport = [];
        for (let i = startIndex; i < rows.length; i++) {
          const cols = rows[i].split(',').map(c => c.trim().replace(/^"|"$/g, ''));
          if (cols.length >= 2) {
            vehiclesToImport.push({
              vehicleNumber: cols[0],
              type: cols[1] || 'Unknown',
              predefinedTareWeight: parseFloat(cols[2]) || 0
            });
          }
        }

        if (vehiclesToImport.length === 0) {
          toast({ title: 'No valid data found in CSV', variant: 'destructive' });
          return;
        }

        const res = await api.post('/master/vehicles/bulk', { vehicles: vehiclesToImport });
        toast({ title: `Successfully imported ${res.data.count} vehicles` });
        fetchVehicles();
      } catch (error) {
        console.error(error);
        toast({ title: 'Error importing vehicles', variant: 'destructive' });
      } finally {
        setImporting(false);
        if (fileInputRef.current) fileInputRef.current.value = '';
      }
    };
    reader.readAsText(file);
  };

  const fetchVehicles = async () => {
    try {
      const res = await api.get('/master/vehicles');
      setVehicles(res.data);
    } catch (error) {
      console.error(error);
    }
  };

  const fetchVehicleTypes = async () => {
    try {
      const res = await api.get('/master/vehicle-types');
      setVehicleTypes(res.data);
    } catch (error) {
      console.error(error);
    }
  };

  useEffect(() => {
    fetchVehicles();
    fetchVehicleTypes();
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.post('/master/vehicles', {
        vehicleNumber,
        vehicleTypeId,
      });
      toast({ title: 'Vehicle saved successfully' });
      setOpen(false);
      fetchVehicles();
    } catch (error) {
      toast({ title: 'Error saving vehicle', variant: 'destructive' });
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
          <input 
            type="file" 
            accept=".csv" 
            ref={fileInputRef} 
            onChange={handleFileUpload} 
            className="hidden" 
          />
          <Button 
            variant="outline" 
            size="sm" 
            className="h-8 text-xs font-bold uppercase tracking-wider rounded-sm border-emerald-600 text-emerald-700 hover:bg-emerald-50 hover:text-emerald-800 transition-colors"
            onClick={() => fileInputRef.current?.click()}
            disabled={importing}
          >
            <Upload className="mr-2 h-4 w-4" /> {importing ? 'Importing...' : 'Bulk Import CSV'}
          </Button>
          <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button size="sm" className="h-8 text-xs font-bold uppercase tracking-wider bg-blue-600 hover:bg-blue-700 rounded-sm">
              <Plus className="mr-2 h-4 w-4" /> Add Vehicle
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add New Vehicle</DialogTitle>
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
              <Button type="submit" className="w-full h-10 mt-2 font-bold uppercase tracking-widest bg-blue-600 hover:bg-blue-700 rounded-sm" disabled={!vehicleNumber || !vehicleTypeId}>Save Vehicle</Button>
            </form>
          </DialogContent>
        </Dialog>
        </div>
      </div>

      <div className="flex flex-col flex-1 bg-white border border-slate-300 rounded-sm shadow-sm overflow-hidden">
        {/* Table Toolbar */}
        <div className="flex justify-between items-center p-2 border-b border-slate-300 bg-slate-50">
          <div className="flex items-center gap-2">
            <div className="relative">
              <Search className="absolute left-2.5 top-2 h-4 w-4 text-slate-500" />
              <Input placeholder="Search vehicles..." className="h-8 w-64 pl-8 text-xs bg-white rounded-sm border-slate-300 focus-visible:ring-blue-500" />
            </div>
            <Button variant="outline" size="sm" className="h-8 text-xs rounded-sm border-slate-300">
              <Filter className="h-3.5 w-3.5 mr-1" /> Filter
            </Button>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" className="h-8 text-xs rounded-sm border-slate-300" onClick={fetchVehicles}>
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
                <TableHead className="h-8 py-1 px-3 text-xs font-semibold text-slate-700">Vehicle Number</TableHead>
                <TableHead className="h-8 py-1 px-3 text-xs font-semibold text-slate-700">Type</TableHead>
                <TableHead className="h-8 py-1 px-3 text-xs font-semibold text-slate-700">Tare Weight (kg)</TableHead>
                <TableHead className="h-8 py-1 px-3 text-xs font-semibold text-slate-700 text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {vehicles.map((v) => (
                <TableRow key={v.id} className="border-b border-slate-200 hover:bg-blue-50/50 transition-colors">
                  <TableCell className="py-1.5 px-3 text-xs font-medium text-slate-900">{v.vehicleNumber}</TableCell>
                  <TableCell className="py-1.5 px-3 text-xs text-slate-600">{v.vehicleType?.name || '-'}</TableCell>
                  <TableCell className="py-1.5 px-3 text-xs text-slate-900 font-bold">{v.vehicleType?.tareWeight || 0}</TableCell>
                  <TableCell className="py-1.5 px-3 text-right">
                    <Button variant="ghost" size="icon" className="h-6 w-6 text-red-500 hover:bg-red-100 rounded-sm" onClick={() => handleDelete(v.id)}>
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
              {vehicles.length === 0 && (
                <TableRow>
                  <TableCell colSpan={4} className="text-center py-6 text-muted-foreground">
                    No vehicles found. Add one to get started.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
        
        <div className="flex items-center justify-between p-2 border-t border-slate-300 bg-slate-50 text-xs text-slate-500">
          <span>Showing {vehicles.length} records</span>
          <div className="flex gap-1">
            <Button variant="outline" size="sm" className="h-6 px-2 text-[10px] rounded-sm border-slate-300" disabled>Previous</Button>
            <Button variant="outline" size="sm" className="h-6 px-2 text-[10px] rounded-sm border-slate-300" disabled>Next</Button>
          </div>
        </div>
      </div>
    </div>
  );
}
