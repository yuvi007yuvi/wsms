import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Save } from 'lucide-react';
import api from '@/lib/api';

export default function Settings() {
  const [settingId, setSettingId] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [address, setAddress] = useState('');
  const { toast } = useToast();

  const fetchSettings = async () => {
    try {
      const res = await api.get('/settings');
      if (res.data) {
        setSettingId(res.data.id);
        setCompanyName(res.data.companyName);
        setAddress(res.data.address);
      }
    } catch (error) {
      console.error(error);
    }
  };

  useEffect(() => {
    fetchSettings();
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (settingId) {
        await api.put(`/settings/${settingId}`, { companyName, address });
        toast({ title: 'Settings updated successfully' });
      }
    } catch (error) {
      toast({ title: 'Error updating settings', variant: 'destructive' });
    }
  };

  return (
    <div className="space-y-6 max-w-2xl">
      <div className="flex justify-between items-center">
        <h2 className="text-3xl font-bold tracking-tight">System Settings</h2>
      </div>

      <form onSubmit={handleSave}>
        <Card>
          <CardHeader>
            <CardTitle>General Information</CardTitle>
            <CardDescription>Update your company details and global settings.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Company Name</Label>
              <Input 
                value={companyName} 
                onChange={e => setCompanyName(e.target.value)} 
                required 
              />
            </div>
            <div className="space-y-2">
              <Label>Company Address</Label>
              <Input 
                value={address} 
                onChange={e => setAddress(e.target.value)} 
                required 
              />
            </div>
          </CardContent>
          <CardFooter className="border-t px-6 py-4">
            <Button type="submit">
              <Save className="mr-2 h-4 w-4" /> Save Changes
            </Button>
          </CardFooter>
        </Card>
      </form>
    </div>
  );
}
