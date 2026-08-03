import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Plus, Trash2 } from 'lucide-react';
import { ImportExportButtons } from '@/components/ui/ImportExportButtons';
import api from '@/lib/api';

export default function Materials() {
  const [materials, setMaterials] = useState<any[]>([]);
  const [open, setOpen] = useState(false);
  const { toast } = useToast();

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');

  const fetchMaterials = async () => {
    try {
      const res = await api.get('/master/materials');
      setMaterials(res.data);
    } catch (error) {
      console.error(error);
    }
  };

  useEffect(() => {
    fetchMaterials();
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.post('/master/materials', { name, description });
      toast({ title: 'Material saved successfully' });
      setOpen(false);
      fetchMaterials();
    } catch (error) {
      toast({ title: 'Error saving material', variant: 'destructive' });
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await api.delete(`/master/materials/${id}`);
      toast({ title: 'Material deleted' });
      fetchMaterials();
    } catch (error: any) {
      toast({ 
        title: 'Error deleting material', 
        description: error.response?.data?.error || 'Unknown error occurred',
        variant: 'destructive' 
      });
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-3xl font-bold tracking-tight">Material Master</h2>
        <div className="flex gap-2">
          <ImportExportButtons 
            data={materials} 
            exportFilename="materials_master" 
            importEndpoint="/master/materials/bulk" 
            onImportSuccess={fetchMaterials} 
          />
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button><Plus className="mr-2 h-4 w-4" /> Add Material</Button>
            </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add New Material</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSave} className="space-y-4">
              <div className="space-y-2">
                <Label>Material Name</Label>
                <Input value={name} onChange={e => setName(e.target.value)} required />
              </div>
              <div className="space-y-2">
                <Label>Description</Label>
                <Input value={description} onChange={e => setDescription(e.target.value)} />
              </div>
              <Button type="submit" className="w-full">Save Material</Button>
            </form>
          </DialogContent>
        </Dialog>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Registered Materials</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader className="bg-slate-100/80 sticky top-0 z-10">
              <TableRow className="hover:bg-transparent">
                <TableHead className="h-10 px-4 text-xs font-bold text-slate-600 uppercase tracking-wider w-16">Sr. No.</TableHead>
                <TableHead className="h-10 px-4 text-xs font-bold text-slate-600 uppercase tracking-wider">Material Name</TableHead>
                <TableHead className="h-10 px-4 text-xs font-bold text-slate-600 uppercase tracking-wider">Description</TableHead>
                <TableHead className="h-10 px-4 text-xs font-bold text-slate-600 uppercase tracking-wider text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {materials.map((m, index) => (
                <TableRow key={m.id} className="border-b border-slate-200 hover:bg-slate-50 transition-colors">
                  <TableCell className="py-3 px-4 text-sm text-slate-600">{index + 1}</TableCell>
                  <TableCell className="py-3 px-4 text-sm font-medium text-slate-900">{m.name}</TableCell>
                  <TableCell className="py-3 px-4 text-sm text-slate-600">{m.description || '-'}</TableCell>
                  <TableCell className="py-3 px-4 text-right">
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-red-500 hover:text-red-700 hover:bg-red-50 rounded-md" onClick={() => handleDelete(m.id)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
              {materials.length === 0 && (
                <TableRow>
                  <TableCell colSpan={4} className="text-center py-6 text-muted-foreground">
                    No materials found. Add one to get started.
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
