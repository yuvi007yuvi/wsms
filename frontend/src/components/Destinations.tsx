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

export default function Destinations() {
  const [destinations, setDestinations] = useState<any[]>([]);
  const [open, setOpen] = useState(false);
  const { toast } = useToast();

  const [name, setName] = useState('');
  const [location, setLocation] = useState('');

  const fetchDestinations = async () => {
    try {
      const res = await api.get('/master/destinations');
      setDestinations(res.data);
    } catch (error) {
      console.error(error);
    }
  };

  useEffect(() => {
    fetchDestinations();
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.post('/master/destinations', { name, location });
      toast({ title: 'Destination saved successfully' });
      setOpen(false);
      setName('');
      setLocation('');
      fetchDestinations();
    } catch (error) {
      toast({ title: 'Error saving destination', variant: 'destructive' });
    }
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
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button><Plus className="mr-2 h-4 w-4" /> Add Destination</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add New Destination</DialogTitle>
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
              <Button type="submit" className="w-full">Save Destination</Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Registered Destinations</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Destination Name</TableHead>
                <TableHead>Location</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {destinations.map((d) => (
                <TableRow key={d.id}>
                  <TableCell className="font-medium">{d.name}</TableCell>
                  <TableCell>{d.location}</TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="icon" onClick={() => handleDelete(d.id)}>
                      <Trash2 className="h-4 w-4 text-red-500" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
              {destinations.length === 0 && (
                <TableRow>
                  <TableCell colSpan={3} className="text-center py-6 text-muted-foreground">
                    No destinations found. Add one to get started.
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
