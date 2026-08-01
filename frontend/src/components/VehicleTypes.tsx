import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Plus, Trash2 } from 'lucide-react';
import api from '@/lib/api';

export default function VehicleTypes() {
  const [vehicleTypes, setVehicleTypes] = useState<any[]>([]);
  const [open, setOpen] = useState(false);
  const { toast } = useToast();

  const [name, setName] = useState('');
  const [tareWeight, setTareWeight] = useState('');

  const fetchVehicleTypes = async () => {
    try {
      const res = await api.get('/master/vehicle-types');
      setVehicleTypes(res.data);
    } catch (error) {
      console.error(error);
    }
  };

  useEffect(() => {
    fetchVehicleTypes();
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.post('/master/vehicle-types', { name, tareWeight: parseFloat(tareWeight) });
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
                <Label>Tare Weight (kg)</Label>
                <Input type="number" value={tareWeight} onChange={e => setTareWeight(e.target.value)} required placeholder="0" />
              </div>
              <Button type="submit" className="w-full">Save Vehicle Type</Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Registered Vehicle Types</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Type Name</TableHead>
                <TableHead>Tare Weight (kg)</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {vehicleTypes.map((vt) => (
                <TableRow key={vt.id}>
                  <TableCell className="font-medium">{vt.name}</TableCell>
                  <TableCell>{vt.tareWeight}</TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="icon" onClick={() => handleDelete(vt.id)}>
                      <Trash2 className="h-4 w-4 text-red-500" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
              {vehicleTypes.length === 0 && (
                <TableRow>
                  <TableCell colSpan={3} className="text-center py-6 text-muted-foreground">
                    No vehicle types found. Add one to get started.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
