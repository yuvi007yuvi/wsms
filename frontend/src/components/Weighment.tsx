import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { SearchableSelect } from '@/components/ui/SearchableSelect';
import { useToast } from '@/hooks/use-toast';
import { Printer, Save, RefreshCw, Activity } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import api from '@/lib/api';
import PrintSlip from './PrintSlip';

export default function Weighment() {
  const { t } = useTranslation();
  const [liveWeight, _setLiveWeight] = useState<number>(0);
  const [weightStatus, _setWeightStatus] = useState<'Disconnected' | 'Connected' | 'Reading' | 'Stable'>('Disconnected');
  const { toast } = useToast();
  
  // Master Data Lists
  const [vehicles, setVehicles] = useState<any[]>([]);
  const [materials, setMaterials] = useState<any[]>([]);
  const [sources, setSources] = useState<any[]>([]);
  const [destinations, setDestinations] = useState<any[]>([]);

  // Form State
  const [vehicleId, setVehicleId] = useState('');
  const [materialId, setMaterialId] = useState('');
  const [sourceId, setSourceId] = useState('');
  const [destinationId, setDestinationId] = useState('');
  const [remarks, setRemarks] = useState('');

  // Mock State
  const [isMockMode, setIsMockMode] = useState(false);
  const [showManualWeight, setShowManualWeight] = useState(() => {
    return localStorage.getItem('showManualWeight') === 'true';
  });

  useEffect(() => {
    localStorage.setItem('showManualWeight', String(showManualWeight));
  }, [showManualWeight]);

  // Print State
  const [lastGeneratedSlip, setLastGeneratedSlip] = useState<any>(null);

  // Derived State
  const selectedVehicle = vehicles.find(v => v.id === vehicleId);
  const tareWeight = selectedVehicle?.tareWeight || 0;
  const netWeight = Math.max(0, liveWeight - tareWeight);

  // Fetch Master Data
  useEffect(() => {
    const fetchMasterData = async () => {
      try {
        const [vehRes, matRes, srcRes, destRes, settingsRes] = await Promise.all([
          api.get('/master/vehicles'),
          api.get('/master/materials'),
          api.get('/master/sources'),
          api.get('/master/destinations'),
          api.get('/settings'),
        ]);
        const dests = destRes.data;
        setVehicles(vehRes.data);
        setMaterials(matRes.data);
        setSources(srcRes.data);
        setDestinations(dests);
        
        if (settingsRes.data && settingsRes.data.mockMode) {
          setIsMockMode(true);
        }
        
        const defaultDest = dests.find((d: any) => d.isDefault);
        if (defaultDest) {
          setDestinationId(defaultDest.id);
        }
      } catch (error) {
        console.error('Failed to load master data', error);
      }
    };
    fetchMasterData();
  }, []);

  // Socket.io Connection (Disabled until hardware is plugged in)
  /*
  useEffect(() => {
    const socket = io('http://localhost:5000');
    
    socket.on('connect', () => setWeightStatus('Reading'));
    socket.on('disconnect', () => setWeightStatus('Disconnected'));
    
    socket.on('weight-update', (data: { weight: number, status: string }) => {
      setLiveWeight(data.weight);
      setWeightStatus(data.status as any);
    });

    return () => {
      socket.disconnect();
    };
  }, []);
  */

  // Mock Mode Simulation
  useEffect(() => {
    let interval: ReturnType<typeof setInterval>;
    
    if (isMockMode) {
      _setWeightStatus('Connected');
      let currentWeight = 0;
      let targetWeight = Math.floor(Math.random() * 40000) + 10000;
      
      interval = setInterval(() => {
        _setWeightStatus('Reading');
        
        if (Math.abs(targetWeight - currentWeight) < 50) {
          currentWeight = targetWeight;
          _setWeightStatus('Stable');
          
          if (Math.random() > 0.95) { // rarely change target when stable
             targetWeight = Math.floor(Math.random() * 40000) + 10000;
          }
        } else {
          currentWeight += (targetWeight - currentWeight) * 0.15;
          currentWeight += (Math.random() * 40 - 20); // Add jitter
        }
        
        _setLiveWeight(Math.max(0, Math.round(currentWeight)));
      }, 300);
    } else {
      _setWeightStatus('Disconnected');
      _setLiveWeight(0);
    }

    return () => clearInterval(interval);
  }, [isMockMode]);

  const generateSlip = async () => {
    if (!vehicleId || !materialId || !sourceId || !destinationId) {
      toast({
        title: 'Validation Error',
        description: 'Please select all mandatory fields.',
        variant: 'destructive',
      });
      return;
    }
    if (!tareWeight || tareWeight <= 0) {
      toast({
        title: 'Missing Tare Weight',
        description: 'This vehicle has no tare weight set. Please update it in the Vehicles section before weighing.',
        variant: 'destructive',
      });
      return;
    }
    
    if (netWeight <= 0) {
      toast({
        title: 'Invalid Weight',
        description: 'Net weight cannot be zero or negative.',
        variant: 'destructive',
      });
      return;
    }

    try {
      const res = await api.post('/weighment', {
        vehicleId,
        materialId,
        sourceId,
        destinationId,
        grossWeight: liveWeight,
        remarks
      });
      
      setLastGeneratedSlip(res.data);

      toast({
        title: 'Slip Generated',
        description: 'Weighment slip has been saved successfully. Preparing to print...',
      });
      
      setTimeout(() => {
        window.print();
      }, 500);

      // Reset form
      setVehicleId('');
      setMaterialId('');
      setSourceId('');
      
      const defaultDest = destinations.find((d: any) => d.isDefault);
      setDestinationId(defaultDest ? defaultDest.id : '');
      
      setRemarks('');
      
    } catch (error) {
      toast({
        title: 'Error generating slip',
        description: 'Failed to save to database.',
        variant: 'destructive'
      });
    }
  };

  const handlePrint = () => {
    if (!lastGeneratedSlip) {
      toast({
        title: 'No slip to print',
        description: 'Please generate a slip first.',
        variant: 'destructive'
      });
      return;
    }
    window.print();
  };

  return (
    <>
      <PrintSlip slip={lastGeneratedSlip} />
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 no-print">
      
      {/* Left Side: Inputs */}
      <Card>
        <CardHeader>
          <CardTitle>{t('Weighment Entry')}</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-2 gap-4">
          <div className="space-y-1">
            <Label className="text-xs uppercase text-slate-500 font-bold tracking-wider">{t('Vehicle')}</Label>
            <SearchableSelect 
              value={vehicleId} 
              onValueChange={setVehicleId} 
              options={vehicles.map(v => ({ label: `${v.vehicleNumber} (${v.vehicleType?.name || 'Unknown'})`, value: v.id }))} 
              placeholder={t('Search Vehicle...')} 
            />
          </div>
          <div className="space-y-1">
            <Label className="text-xs uppercase text-slate-500 font-bold tracking-wider">{t('Material')}</Label>
            <Select onValueChange={setMaterialId} value={materialId}>
              <SelectTrigger><SelectValue placeholder={t('Select Material')} /></SelectTrigger>
              <SelectContent>
                {materials.map(m => (
                  <SelectItem key={m.id} value={m.id}>
                    {m.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label className="text-xs uppercase text-slate-500 font-bold tracking-wider">{t('Source')}</Label>
            <Select onValueChange={setSourceId} value={sourceId}>
              <SelectTrigger><SelectValue placeholder={t('Select Source')} /></SelectTrigger>
              <SelectContent>
                {sources.map(s => (
                  <SelectItem key={s.id} value={s.id}>
                    {s.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label className="text-xs uppercase text-slate-500 font-bold tracking-wider">{t('Destination')}</Label>
            <Select onValueChange={setDestinationId} value={destinationId}>
              <SelectTrigger><SelectValue placeholder={t('Select Destination')} /></SelectTrigger>
              <SelectContent>
                {destinations.map(d => (
                  <SelectItem key={d.id} value={d.id}>
                    {d.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          
          {showManualWeight && weightStatus === 'Disconnected' && (
            <div className="space-y-1 col-span-2">
              <Label className="text-xs uppercase text-slate-500 font-bold tracking-wider">{t('Manual Gross Weight (KG)')}</Label>
              <Input 
                type="number"
                placeholder={t("Enter manual gross weight...")} 
                value={liveWeight || ''} 
                onChange={(e) => _setLiveWeight(parseInt(e.target.value) || 0)} 
              />
            </div>
          )}

          <div className="space-y-1 col-span-2">
            <Label className="text-xs uppercase text-slate-500 font-bold tracking-wider">{t('Remarks')}</Label>
            <Input 
              placeholder={t("Optional remarks...")} 
              value={remarks} 
              onChange={(e) => setRemarks(e.target.value)} 
            />
          </div>
        </CardContent>
      </Card>

      {/* Right Side: Displays & Actions */}
      <div className="space-y-6">
        
        {/* Live Weight Display */}
        <Card className="bg-transparent border-4 border-slate-200 rounded-none shadow-none overflow-hidden">
          <CardContent className="p-6">
            <div className="flex justify-between items-center mb-4 border-b border-green-900/50 pb-2">
              <div className="flex items-center gap-3">
                <span className="text-slate-600 font-bold uppercase tracking-widest text-xs">{t('Live Weight Indicator')}</span>

                {weightStatus === 'Disconnected' && (
                  <div className="flex items-center space-x-2 ml-4" title={t('Enable Manual Entry')}>
                    <input 
                      type="checkbox" 
                      id="manual-weight-toggle"
                      className="rounded border-green-900/50 bg-[#020e06] text-emerald-500 focus:ring-emerald-500 w-4 h-4 cursor-pointer"
                      checked={showManualWeight}
                      onChange={(e) => setShowManualWeight(e.target.checked)}
                    />
                  </div>
                )}
              </div>
              <div className="flex gap-4 text-xs font-bold uppercase tracking-wider">
                <span className={`flex items-center gap-1 ${weightStatus === 'Connected' ? 'text-emerald-500' : 'text-green-900/50'}`}><div className={`w-2 h-2 rounded-full ${weightStatus === 'Connected' ? 'bg-emerald-500' : 'bg-green-900/50'}`}></div>{t('Conn')}</span>
                <span className={`flex items-center gap-1 ${weightStatus === 'Reading' ? 'text-emerald-400' : 'text-green-900/50'}`}><div className={`w-2 h-2 rounded-full ${weightStatus === 'Reading' ? 'bg-emerald-400' : 'bg-green-900/50'}`}></div>{t('Read')}</span>
                <span className={`flex items-center gap-1 ${weightStatus === 'Stable' ? 'text-emerald-300' : 'text-green-900/50'}`}><div className={`w-2 h-2 rounded-full ${weightStatus === 'Stable' ? 'bg-emerald-300' : 'bg-green-900/50'}`}></div>{t('Stab')}</span>
                <span className={`flex items-center gap-1 ${weightStatus === 'Disconnected' ? 'text-red-500' : 'text-green-900/50'}`}><div className={`w-2 h-2 rounded-full ${weightStatus === 'Disconnected' ? 'bg-red-500' : 'bg-green-900/50'}`}></div>{t('Disc')}</span>
              </div>
            </div>
            
            <div className="flex items-end justify-center gap-4 bg-transparent p-4 rounded-sm border-0">
              <div className={`text-7xl font-mono tracking-widest tabular-nums ${weightStatus === 'Stable' ? 'text-emerald-400 drop-shadow-[0_0_15px_rgba(52,211,153,0.6)]' : weightStatus === 'Reading' ? 'text-emerald-500 drop-shadow-[0_0_10px_rgba(16,185,129,0.4)]' : weightStatus === 'Disconnected' ? 'text-red-600 drop-shadow-[0_0_10px_rgba(220,38,38,0.5)]' : 'text-emerald-600'}`}>
                {String(liveWeight).padStart(5, '0')}
              </div>
              <div className="text-3xl text-slate-600 font-bold mb-1">KG</div>
            </div>
          </CardContent>
        </Card>

        {/* Details Summary */}
        <div className="grid grid-cols-2 gap-4">
          <Card>
            <CardHeader className="py-3"><CardTitle className="text-sm text-muted-foreground">{t('Vehicle Info')}</CardTitle></CardHeader>
            <CardContent className="space-y-1.5 text-sm">
              <div className="flex justify-between"><span className="text-muted-foreground">{t('Number')}</span> <span className="font-medium text-right">{selectedVehicle?.vehicleNumber || '-'}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">{t('Type')}</span> <span className="font-medium text-right">{selectedVehicle?.vehicleType?.name || '-'}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">{t('Driver')}</span> <span className="font-medium text-right">{selectedVehicle?.driverName || '-'}</span></div>

              <div className="flex justify-between"><span className="text-muted-foreground">{t('Tare Weight')}</span> <span className="font-medium text-right">{tareWeight > 0 ? `${tareWeight} kg` : '-'}</span></div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="py-3"><CardTitle className="text-sm text-muted-foreground">{t('Weight Summary')}</CardTitle></CardHeader>
            <CardContent className="space-y-1">
              <div className="flex justify-between"><span className="text-muted-foreground">{t('Gross:')}</span> <span className="font-mono font-medium">{liveWeight} kg</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">{t('Tare:')}</span> <span className="font-mono font-medium text-red-500">- {tareWeight} kg</span></div>
              <div className="flex justify-between border-t pt-1 mt-1"><span className="font-semibold">{t('Net:')}</span> <span className="font-mono font-bold text-green-600">{netWeight} kg</span></div>
            </CardContent>
          </Card>
        </div>

        {/* Action Buttons */}
        <div className="grid grid-cols-3 gap-4 border-t pt-4">
          <Button size="lg" className="col-span-2 h-12 text-sm uppercase tracking-widest font-bold bg-[#1E3A8A] hover:bg-[#1E3A8A]/90 rounded-sm" onClick={generateSlip}>
            <Save className="mr-2 h-4 w-4" /> {t('Generate Slip')}
          </Button>
          <Button size="lg" variant="outline" className="h-12 rounded-sm text-sm uppercase tracking-widest font-bold border-slate-300" onClick={handlePrint}>
            <Printer className="mr-2 h-4 w-4" /> {t('Print Last')}
          </Button>
        </div>
        <Button variant="ghost" className="w-full text-muted-foreground" onClick={() => {
          setVehicleId(''); setMaterialId(''); setSourceId(''); 
          const defaultDest = destinations.find((d: any) => d.isDefault);
          setDestinationId(defaultDest ? defaultDest.id : '');
          setRemarks('');
        }}>
          <RefreshCw className="mr-2 h-4 w-4" /> {t('Reset Form')}
        </Button>
      </div>

      </div>
    </>
  );
}
