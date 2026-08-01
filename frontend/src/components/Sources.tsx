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

export default function Sources() {
  const [sources, setSources] = useState<any[]>([]);
  const [open, setOpen] = useState(false);
  const { toast } = useToast();

  const [name, setName] = useState('');
  const [location, setLocation] = useState('');

  const fetchSources = async () => {
    try {
      const res = await api.get('/master/sources');
      setSources(res.data);
    } catch (error) {
      console.error(error);
    }
  };

  useEffect(() => {
    fetchSources();
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.post('/master/sources', { name, location });
      toast({ title: 'Source saved successfully' });
      setOpen(false);
      setName('');
      setLocation('');
      fetchSources();
    } catch (error) {
      toast({ title: 'Error saving source', variant: 'destructive' });
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await api.delete(`/master/sources/${id}`);
      toast({ title: 'Source deleted' });
      fetchSources();
    } catch (error: any) {
      toast({ 
        title: 'Error deleting source', 
        description: error.response?.data?.error || 'Unknown error occurred',
        variant: 'destructive' 
      });
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-3xl font-bold tracking-tight">Source Master</h2>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button><Plus className="mr-2 h-4 w-4" /> Add Source</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add New Source</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSave} className="space-y-4">
              <div className="space-y-2">
                <Label>Source Name</Label>
                <Input value={name} onChange={e => setName(e.target.value)} required placeholder="e.g., Zone 1" />
              </div>
              <div className="space-y-2">
                <Label>Location</Label>
                <Input value={location} onChange={e => setLocation(e.target.value)} placeholder="e.g., North District" />
              </div>
              <Button type="submit" className="w-full">Save Source</Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Registered Sources</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Source Name</TableHead>
                <TableHead>Location</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sources.map((s) => (
                <TableRow key={s.id}>
                  <TableCell className="font-medium">{s.name}</TableCell>
                  <TableCell>{s.location}</TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="icon" onClick={() => handleDelete(s.id)}>
                      <Trash2 className="h-4 w-4 text-red-500" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
              {sources.length === 0 && (
                <TableRow>
                  <TableCell colSpan={3} className="text-center py-6 text-muted-foreground">
                    No sources found. Add one to get started.
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
