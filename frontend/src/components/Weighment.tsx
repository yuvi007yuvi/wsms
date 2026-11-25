import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { ArrowDownCircle, ArrowUpCircle, Clock, Trash2, CheckCircle2, AlertTriangle } from 'lucide-react';
import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { SearchableSelect } from '@/components/ui/SearchableSelect';
import { useToast } from '@/hooks/use-toast';
import { Printer, Save, RefreshCw } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { io } from 'socket.io-client';
import api from '@/lib/api';
import PrintSlip from './PrintSlip';
import { useQuery } from '@tanstack/react-query';

export default function Weighment() {
  const { t } = useTranslation();
  const [liveWeight, _setLiveWeight] = useState<number>(0);
  const [weightStatus, _setWeightStatus] = useState<'Disconnected' | 'Connected' | 'Reading' | 'Stable'>('Disconnected');
  const { toast } = useToast();

  // Fetch Master Data
  const { data: masterData } = useQuery({
    queryKey: ['masterData'],
    queryFn: async () => {
      const [vehRes, matRes, srcRes, destRes, settingsRes, vehicleTypeRes] = await Promise.all([
        api.get('/master/vehicles', { params: { limit: 1000 } }),
        api.get('/master/materials', { params: { limit: 1000 } }),
        api.get('/master/sources', { params: { limit: 1000 } }),
        api.get('/master/destinations', { params: { limit: 1000 } }),
        api.get('/settings'),
        api.get('/master/vehicle-types', { params: { limit: 1000 } }),
      ]);
      const extractData = (res: any) => res.data?.data ? res.data.data : res.data;
      return {
        vehicles: extractData(vehRes),
        materials: extractData(matRes),
        sources: extractData(srcRes),
        destinations: extractData(destRes),
        vehicleTypes: extractData(vehicleTypeRes),
        settings: settingsRes.data
      };
    }
  });

  const vehicles = Array.isArray(masterData?.vehicles) ? masterData.vehicles : [];
  const materials = Array.isArray(masterData?.materials) ? masterData.materials : [];
  const sources = Array.isArray(masterData?.sources) ? masterData.sources : [];
  const destinations = Array.isArray(masterData?.destinations) ? masterData.destinations : [];
  const vehicleTypes = Array.isArray(masterData?.vehicleTypes) ? masterData.vehicleTypes : [];

  // Form State
  const [vehicleId, setVehicleId] = useState('');
  const [vehicleTypeId, setVehicleTypeId] = useState('all');
  const [materialId, setMaterialId] = useState('');
  const [sourceId, setSourceId] = useState('');
  const [destinationId, setDestinationId] = useState('');
  const [remarks, setRemarks] = useState('');
  const [driverName, setDriverName] = useState('');
  const [manualTareWeight, setManualTareWeight] = useState<number | ''>('');

  // Mock State
  const [isMockMode, setIsMockMode] = useState(false);
  const [showManualWeight, setShowManualWeight] = useState(() => {
    return localStorage.getItem('showManualWeight') === 'true';
  });

  // Settings configuration
  const allowManualWeightSetting = masterData?.settings?.allowManualWeight !== false;
  const isEffectiveManualWeight = allowManualWeightSetting && showManualWeight;

  useEffect(() => {
    localStorage.setItem('showManualWeight', String(showManualWeight));
  }, [showManualWeight]);

  // Print State
  const [lastGeneratedSlip, setLastGeneratedSlip] = useState<any>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Derived State
  const selectedVehicle = vehicles.find((v: any) => v.id === vehicleId);

  const projectName = localStorage.getItem('projectName') || '';
  const isUrbanEnviro = projectName.toLowerCase().includes('urban') || projectName.toLowerCase().includes('aligarh') || projectName.toLowerCase().includes('ecostan');

  // Urban 2-step weighment states
  const [showStepDialog, setShowStepDialog] = useState(false);
  const [weighStep, setWeighStep] = useState<'gross' | 'tare'>('gross');
  const [lastSlipTare, setLastSlipTare] = useState<number | null>(null);

  // Pending Urban vehicles waiting for tare weight
  const [pendingTareVehicles, setPendingTareVehicles] = useState<any[]>(() => {
    try {
      const saved = localStorage.getItem('urban_pending_tare_vehicles');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const savePendingTareVehicles = (list: any[]) => {
    setPendingTareVehicles(list);
    localStorage.setItem('urban_pending_tare_vehicles', JSON.stringify(list));
  };

  // Auto-fill driver name and vehicle type for selected vehicle
  useEffect(() => {
    if (selectedVehicle?.driverName) {
      setDriverName(selectedVehicle.driverName);
    } else {
      setDriverName('');
    }

    if (selectedVehicle?.vehicleTypeId) {
      setVehicleTypeId(selectedVehicle.vehicleTypeId);
    } else if (selectedVehicle?.vehicleType?.id) {
      setVehicleTypeId(selectedVehicle.vehicleType.id);
    }

    if (isUrbanEnviro && vehicleId) {
      setShowStepDialog(true);
      // In Urban Enviro, tare is NOT fetched from vehicle list or master.
      // Reset manual tare weight so it must be captured live or entered cleanly.
      setLastSlipTare(null);
      setManualTareWeight('');
    }
  }, [selectedVehicle, isUrbanEnviro, vehicleId]);

  const derivedTareWeight = isUrbanEnviro ? 0 : (selectedVehicle?.tareWeight || selectedVehicle?.vehicleType?.tareWeight || 0);
  const tareWeight = manualTareWeight !== '' ? Number(manualTareWeight) : derivedTareWeight;
  const netWeight = Math.max(0, liveWeight - tareWeight);



  useEffect(() => {
    if (masterData?.settings?.mockMode) setIsMockMode(true);
    const defaultDest = masterData?.destinations?.find((d: any) => d.isDefault);
    if (defaultDest && !destinationId) setDestinationId(defaultDest.id);
  }, [masterData]);

  useEffect(() => {
    // Connect to WebSocket using configured API host or current window origin
    const apiUrl = import.meta.env.VITE_API_URL || 'https://wsms-1.onrender.com/api';
    const backendUrl = apiUrl.replace(/\/api\/?$/, '');
    const socket = io(backendUrl, {
      transports: ['websocket', 'polling']
    });

    socket.on('connect', () => _setWeightStatus('Reading'));
    socket.on('disconnect', () => _setWeightStatus('Disconnected'));

    socket.on('weight-update', (data: { weight: number, status: string }) => {
      // Only block socket update if manual entry is currently checked
      const isManual = localStorage.getItem('showManualWeight') === 'true';
      if (!isManual) {
        _setLiveWeight(data.weight);
      }
      _setWeightStatus(data.status as any);
    });

    return () => {
      socket.disconnect();
    };
  }, []);

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

    setIsSubmitting(true);
    try {
      const res = await api.post('/weighment', {
        vehicleId,
        materialId,
        sourceId,
        destinationId,
        grossWeight: liveWeight,
        remarks,
        driverName,
        manualTareWeight: manualTareWeight !== '' ? manualTareWeight : undefined
      });

      setLastGeneratedSlip(res.data);

      // If this vehicle was in the Urban pending tare list, remove it
      if (isUrbanEnviro) {
        savePendingTareVehicles(pendingTareVehicles.filter(p => p.vehicleId !== vehicleId));
      }

      toast({
        title: 'Slip Generated',
        description: 'Weighment slip has been saved successfully. Preparing to print...',
      });

      setTimeout(() => {
        window.print();
      }, 50);

      // Reset form
      setVehicleTypeId('all');
      setVehicleId('');
      setMaterialId('');
      setSourceId('');

      const defaultDest = destinations.find((d: any) => d.isDefault);
      setDestinationId(defaultDest ? defaultDest.id : '');

      setRemarks('');
      setDriverName('');
      setManualTareWeight('');

    } catch (error: any) {
      toast({
        title: 'Error generating slip',
        description: error.response?.data?.error || 'Failed to save to database.',
        variant: 'destructive'
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleHoldGrossWeight = () => {
    if (!vehicleId) {
      toast({
        title: 'Select Vehicle',
        description: 'Please select a vehicle first.',
        variant: 'destructive',
      });
      return;
    }
    if (liveWeight <= 0) {
      toast({
        title: 'Invalid Weight',
        description: 'Live weight must be greater than 0 to record Gross Weight.',
        variant: 'destructive',
      });
      return;
    }

    const newPending = {
      id: Date.now().toString(),
      vehicleId,
      vehicleNumber: selectedVehicle?.vehicleNumber,
      driverName,
      materialId,
      materialName: materials.find(m => m.id === materialId)?.name || 'SOLID WASTE',
      sourceId,
      sourceName: sources.find(s => s.id === sourceId)?.name || 'Customer',
      destinationId,
      grossWeight: liveWeight,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      date: new Date().toISOString()
    };

    // Filter out if same vehicle already exists, replace with new
    const updated = [newPending, ...pendingTareVehicles.filter(p => p.vehicleId !== vehicleId)];
    savePendingTareVehicles(updated);

    toast({
      title: 'Vehicle Added to Pending Tare',
      description: `${selectedVehicle?.vehicleNumber} held with Gross Weight ${liveWeight} kg. Awaiting Tare weighment.`,
    });

    // Reset inputs
    setVehicleTypeId('all');
    setVehicleId('');
    setMaterialId('');
    setSourceId('');
    const defaultDest = destinations.find((d: any) => d.isDefault);
    setDestinationId(defaultDest ? defaultDest.id : '');
    setRemarks('');
    setDriverName('');
    setManualTareWeight('');
  };

  const handleRemovePending = (vehicleIdToRemove: string) => {
    const updated = pendingTareVehicles.filter(p => p.vehicleId !== vehicleIdToRemove);
    savePendingTareVehicles(updated);
    toast({ title: 'Removed from pending list' });
  };

  const handleDirectSaveFromPending = async (item: any) => {
    if (liveWeight <= 0) {
      toast({
        title: 'Empty Weighbridge',
        description: 'Weighbridge currently reads 0 KG. Please ensure empty vehicle is on the platform to capture Tare Weight.',
        variant: 'destructive',
      });
      return;
    }

    if (item.grossWeight <= liveWeight) {
      toast({
        title: 'Invalid Tare Weight',
        description: `Gross weight (${item.grossWeight} kg) must be greater than tare weight (${liveWeight} kg).`,
        variant: 'destructive',
      });
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await api.post('/weighment', {
        vehicleId: item.vehicleId,
        materialId: item.materialId,
        sourceId: item.sourceId,
        destinationId: item.destinationId || destinations.find((d: any) => d.isDefault)?.id,
        grossWeight: item.grossWeight,
        manualTareWeight: liveWeight,
        driverName: item.driverName,
        remarks: 'Direct 2-step weighment'
      });

      // Attach Step 1 gross weight timestamp so slip shows both distinct entry and exit date-times
      const slipWithTimestamps = {
        ...res.data,
        grossTime: item.date || item.createdAt || new Date(Date.now() - 600000).toISOString(),
        tareTime: new Date().toISOString()
      };

      setLastGeneratedSlip(slipWithTimestamps);
      savePendingTareVehicles(pendingTareVehicles.filter(p => p.vehicleId !== item.vehicleId));

      toast({
        title: 'Slip Generated Directly',
        description: `${item.vehicleNumber} tare captured as ${liveWeight} kg. Final slip is printing...`,
      });

      setTimeout(() => {
        window.print();
      }, 50);

    } catch (error: any) {
      toast({
        title: 'Error generating slip',
        description: error.response?.data?.error || 'Failed to save slip.',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
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
      <div className={`grid grid-cols-1 ${isUrbanEnviro ? 'lg:grid-cols-12' : 'lg:grid-cols-2'} gap-4 no-print items-start`}>

        {/* Left Column: Form Inputs */}
        <Card className={isUrbanEnviro ? 'lg:col-span-5' : ''}>
          <CardHeader className="py-3 px-4">
            <CardTitle className="text-base">{t('Weighment Entry')}</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-2 gap-3 p-4 pt-0">
            {isUrbanEnviro ? (
              <>
                <div className="space-y-1">
                  <Label className="text-xs uppercase text-slate-500 font-bold tracking-wider">{t('Vehicle')}</Label>
                  <SearchableSelect
                    value={vehicleId}
                    onValueChange={setVehicleId}
                    options={vehicles.map((v: any) => ({ label: `${v.vehicleNumber} (${v.vehicleType?.name || 'Unknown'})`, value: v.id }))}
                    placeholder={t('Search Vehicle...')}
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs uppercase text-slate-500 font-bold tracking-wider">{t('Vehicle Type')}</Label>
                  <Input
                    value={
                      selectedVehicle?.vehicleType?.name ||
                      vehicleTypes.find((vt: any) => vt.id === vehicleTypeId)?.name ||
                      ''
                    }
                    placeholder={t('Auto-filled from Vehicle')}
                    readOnly
                    disabled
                    className="bg-slate-100 text-slate-700 font-medium cursor-not-allowed"
                  />
                </div>
              </>
            ) : (
              <>
                <div className="space-y-1">
                  <Label className="text-xs uppercase text-slate-500 font-bold tracking-wider">{t('Vehicle Type')}</Label>
                  <SearchableSelect
                    value={vehicleTypeId}
                    onValueChange={(val) => { setVehicleTypeId(val); setVehicleId(''); }}
                    options={[
                      { label: t('All Types'), value: 'all' },
                      ...vehicleTypes.map((vt: any) => ({ label: vt.name, value: vt.id }))
                    ]}
                    placeholder={t('Search Vehicle Type...')}
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs uppercase text-slate-500 font-bold tracking-wider">{t('Vehicle')}</Label>
                  <SearchableSelect
                    value={vehicleId}
                    onValueChange={setVehicleId}
                    options={vehicles.map((v: any) => ({ label: `${v.vehicleNumber} (${v.vehicleType?.name || 'Unknown'})`, value: v.id }))}
                    placeholder={t('Search Vehicle...')}
                  />
                </div>
              </>
            )}
            <div className="space-y-1">
              <Label className="text-xs uppercase text-slate-500 font-bold tracking-wider">{t('Driver Name')}</Label>
              <Input
                placeholder={t("Enter Driver Name...")}
                value={driverName}
                onChange={(e) => setDriverName(e.target.value)}
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs uppercase text-slate-500 font-bold tracking-wider">{t('Material')}</Label>
              <Select onValueChange={setMaterialId} value={materialId}>
                <SelectTrigger><SelectValue placeholder={t('Select Material')} /></SelectTrigger>
                <SelectContent>
                  {materials.map((m: any) => (
                    <SelectItem key={m.id} value={m.id}>
                      {m.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="text-xs uppercase text-slate-500 font-bold tracking-wider">
                {isUrbanEnviro ? t('Customer Name') : t('Source')}
              </Label>
              <SearchableSelect
                value={sourceId}
                onValueChange={setSourceId}
                options={sources.map((s: any) => ({ label: s.name, value: s.id }))}
                placeholder={isUrbanEnviro ? t('Search Customer Name...') : t('Search Source...')}
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs uppercase text-slate-500 font-bold tracking-wider">{t('Destination')}</Label>
              <Select onValueChange={setDestinationId} value={destinationId}>
                <SelectTrigger><SelectValue placeholder={t('Select Destination')} /></SelectTrigger>
                <SelectContent>
                  {destinations.map((d: any) => (
                    <SelectItem key={d.id} value={d.id}>
                      {d.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Tare Weight Editor for Urban */}
            {isUrbanEnviro && !isEffectiveManualWeight && (
              <div className="space-y-1 col-span-2 p-2.5 bg-slate-50 border border-slate-200 rounded-md">
                <div className="flex justify-between items-center mb-1">
                  <Label className="text-[11px] uppercase text-slate-700 font-bold tracking-wider">
                    Tare Weight (KG)
                  </Label>
                  {lastSlipTare !== null && (
                    <span className="text-[10px] text-blue-600 font-medium">
                      Auto-fetched from last slip ({lastSlipTare} kg)
                    </span>
                  )}
                </div>
                <div className="flex gap-2">
                  <Input
                    type="number"
                    placeholder="Enter or capture tare..."
                    value={manualTareWeight}
                    onChange={(e) => setManualTareWeight(e.target.value === '' ? '' : parseInt(e.target.value) || 0)}
                    className="bg-white font-medium h-9 text-sm"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    className="whitespace-nowrap border-emerald-600 text-emerald-700 hover:bg-emerald-50 font-bold text-xs h-9 px-3 shrink-0"
                    onClick={() => {
                      if (liveWeight > 0) {
                        setManualTareWeight(liveWeight);
                        toast({
                          title: 'Tare Captured',
                          description: `Captured ${liveWeight} kg from weighbridge as Tare Weight.`,
                        });
                      } else if (liveWeight < 0) {
                        toast({
                          title: 'Negative Weight Alert',
                          description: `Weighbridge is showing negative weight (${liveWeight} kg). Please press ZERO on indicator before capturing.`,
                          variant: 'destructive',
                        });
                      } else {
                        toast({
                          title: 'No Weight on Bridge',
                          description: 'Weighbridge currently reads 0 KG. Please ensure vehicle is on the platform.',
                          variant: 'destructive',
                        });
                      }
                    }}
                    title="Capture current live weight on the weighbridge as Tare Weight"
                  >
                    Capture Tare ({liveWeight > 0 ? `${liveWeight} kg` : '0 kg'})
                  </Button>
                </div>
              </div>
            )}

            {isEffectiveManualWeight && (
              <>
                <div className="space-y-1 col-span-2">
                  <Label className="text-xs uppercase text-slate-500 font-bold tracking-wider">{t('Manual Gross Weight (KG)')}</Label>
                  <Input
                    type="number"
                    placeholder={t("Enter manual gross weight...")}
                    value={liveWeight || ''}
                    onChange={(e) => _setLiveWeight(parseInt(e.target.value) || 0)}
                  />
                </div>

                <div className="space-y-1 col-span-2">
                  <Label className="text-xs uppercase text-slate-500 font-bold tracking-wider">{t('Manual Tare Weight (KG)')}</Label>
                  <Input
                    type="number"
                    placeholder={t("Enter manual tare weight (overrides vehicle default)...")}
                    value={manualTareWeight}
                    onChange={(e) => setManualTareWeight(e.target.value === '' ? '' : parseInt(e.target.value) || 0)}
                  />
                </div>
              </>
            )}


          </CardContent>
        </Card>

        {/* Middle Column: Displays & Actions */}
        <div className={`space-y-4 ${isUrbanEnviro ? 'lg:col-span-4' : ''}`}>

          {/* Live Weight Display */}
          <Card className="bg-transparent border-2 border-slate-200 rounded-sm shadow-none overflow-hidden">
            <CardContent className="p-4">
              <div className="flex justify-between items-center mb-2 border-b border-green-900/40 pb-2">
                <div className="flex items-center gap-2">
                  <span className="text-slate-700 font-bold uppercase tracking-wider text-[11px]">{t('Live Weight Indicator')}</span>

                  {allowManualWeightSetting && (
                    <div className="flex items-center space-x-1.5 ml-2" title={t('Enable Manual Entry')}>
                      <input
                        type="checkbox"
                        id="manual-weight-toggle"
                        className="rounded border-green-900/50 bg-[#020e06] text-emerald-500 focus:ring-emerald-500 w-3.5 h-3.5 cursor-pointer"
                        checked={showManualWeight}
                        onChange={(e) => setShowManualWeight(e.target.checked)}
                      />
                      <label htmlFor="manual-weight-toggle" className="text-[10px] font-semibold text-slate-500 cursor-pointer">
                        {t('Manual')}
                      </label>
                    </div>
                  )}
                </div>
                <div className="flex gap-2.5 text-[11px] font-bold uppercase tracking-wider">
                  <span className={`flex items-center gap-1 ${weightStatus === 'Connected' ? 'text-emerald-500' : 'text-slate-400'}`}><div className={`w-1.5 h-1.5 rounded-full ${weightStatus === 'Connected' ? 'bg-emerald-500' : 'bg-slate-300'}`}></div>{t('Conn')}</span>
                  <span className={`flex items-center gap-1 ${weightStatus === 'Reading' ? 'text-emerald-400' : 'text-slate-400'}`}><div className={`w-1.5 h-1.5 rounded-full ${weightStatus === 'Reading' ? 'bg-emerald-400' : 'bg-slate-300'}`}></div>{t('Read')}</span>
                  <span className={`flex items-center gap-1 ${weightStatus === 'Stable' ? 'text-emerald-500' : 'text-slate-400'}`}><div className={`w-1.5 h-1.5 rounded-full ${weightStatus === 'Stable' ? 'bg-emerald-500' : 'bg-slate-300'}`}></div>{t('Stab')}</span>
                  <span className={`flex items-center gap-1 ${weightStatus === 'Disconnected' ? 'text-red-500' : 'text-slate-400'}`}><div className={`w-1.5 h-1.5 rounded-full ${weightStatus === 'Disconnected' ? 'bg-red-500' : 'bg-slate-300'}`}></div>{t('Disc')}</span>
                </div>
              </div>

              <div className="flex flex-col items-center justify-center py-2">
                {liveWeight < 0 ? (
                  <div className="flex flex-col items-center justify-center text-red-600 bg-red-50/80 border border-red-200 rounded-md p-3 w-full animate-pulse">
                    <div className="flex items-center gap-1.5 font-bold text-sm uppercase tracking-wide">
                      <AlertTriangle className="w-4 h-4 text-red-600 shrink-0" />
                      Scale Under-Zero / Negative Weight!
                    </div>
                    <div className="text-xs text-red-500 font-medium mt-0.5">
                      Indicator reads ({liveWeight} KG). Please zero / re-tare the weighbridge indicator.
                    </div>
                  </div>
                ) : (
                  <div className="flex items-end justify-center gap-3 bg-transparent rounded-sm border-0">
                    <div className={`text-6xl tracking-widest tabular-nums font-bold ${weightStatus === 'Stable' ? 'text-emerald-500 drop-shadow-[0_0_12px_rgba(52,211,153,0.5)]' : weightStatus === 'Reading' ? 'text-emerald-600' : weightStatus === 'Disconnected' ? 'text-red-500' : 'text-emerald-600'}`}>
                      {String(Math.max(0, liveWeight)).padStart(5, '0')}
                    </div>
                    <div className="text-2xl text-slate-600 font-bold mb-1">KG</div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Details Summary */}
          <div className="grid grid-cols-2 gap-3">
            <Card>
              <CardHeader className="py-2 px-3">
                <CardTitle className="text-xs font-bold text-slate-700">{t('Vehicle Info')}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-1.5 text-xs p-3 pt-0">
                <div className="flex justify-between items-center"><span className="text-slate-600 font-medium">Number:</span> <span className="font-semibold text-slate-900 text-right truncate max-w-[90px]">{selectedVehicle?.vehicleNumber || '-'}</span></div>
                <div className="flex justify-between items-center"><span className="text-slate-600 font-medium">Type:</span> <span className="font-semibold text-slate-900 text-right truncate max-w-[90px]">{selectedVehicle?.vehicleType?.name || '-'}</span></div>
                <div className="flex justify-between items-center"><span className="text-slate-600 font-medium">Driver:</span> <span className="font-semibold text-slate-900 text-right truncate max-w-[90px]">{selectedVehicle?.driverName || '-'}</span></div>
                <div className="flex justify-between items-center"><span className="text-slate-600 font-medium">Tare:</span> <span className="font-semibold text-slate-900 text-right">{tareWeight > 0 ? `${tareWeight} kg` : '-'}</span></div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="py-2 px-3">
                <CardTitle className="text-xs font-bold text-slate-700">{t('Weight Summary')}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-1.5 text-xs p-3 pt-0">
                <div className="flex justify-between items-center"><span className="text-slate-600 font-medium">Gross:</span> <span className="font-bold text-slate-900">{liveWeight > 0 ? `${liveWeight} kg` : liveWeight < 0 ? <span className="text-red-500 font-semibold text-[11px] uppercase">Under Zero ({liveWeight})</span> : '0 kg'}</span></div>
                <div className="flex justify-between items-center"><span className="text-slate-600 font-medium">Tare:</span> <span className="font-bold text-red-600">{tareWeight > 0 ? `-${tareWeight} kg` : '0 kg'}</span></div>
                <div className="flex justify-between items-center border-t border-slate-200 pt-1 mt-0.5"><span className="font-bold text-slate-900">Net:</span> <span className="font-black text-green-600 text-sm">{Math.max(0, netWeight)} kg</span></div>
              </CardContent>
            </Card>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col gap-2 border-t pt-3">
            {isUrbanEnviro ? (
              <div className="grid grid-cols-2 gap-2">
                <Button
                  size="sm"
                  className="h-10 text-xs uppercase tracking-wider font-bold bg-amber-600 hover:bg-amber-700 text-white rounded-sm px-2 truncate"
                  onClick={handleHoldGrossWeight}
                  disabled={isSubmitting}
                  title="Save Step 1 (Hold Gross Weight in Pending List)"
                >
                  <Clock className="mr-1 h-3.5 w-3.5 shrink-0" />
                  <span className="truncate">Step 1: Gross</span>
                </Button>
                <Button
                  size="sm"
                  className="h-10 text-xs uppercase tracking-wider font-bold bg-[#1E3A8A] hover:bg-[#1E3A8A]/90 text-white rounded-sm px-2 truncate"
                  onClick={generateSlip}
                  disabled={isSubmitting}
                  title="Generate and Print Final Slip (Step 2)"
                >
                  <Save className="mr-1 h-3.5 w-3.5 shrink-0" />
                  <span className="truncate">{isSubmitting ? 'Saving...' : 'Final Slip (Step 2)'}</span>
                </Button>
              </div>
            ) : (
              <Button
                size="lg"
                className="w-full h-11 text-sm uppercase tracking-widest font-bold bg-[#1E3A8A] hover:bg-[#1E3A8A]/90 rounded-sm"
                onClick={generateSlip}
                disabled={isSubmitting}
              >
                <Save className="mr-2 h-4 w-4" /> {isSubmitting ? t('Saving...') : t('Generate Slip')}
              </Button>
            )}

            <div className="grid grid-cols-2 gap-2">
              <Button size="sm" variant="outline" className="h-9 rounded-sm text-xs uppercase tracking-wider font-bold border-slate-300" onClick={handlePrint}>
                <Printer className="mr-1.5 h-3.5 w-3.5" /> {t('Print Last')}
              </Button>
              <Button size="sm" variant="ghost" className="h-9 text-xs text-muted-foreground" onClick={() => {
                setVehicleTypeId('all'); setVehicleId(''); setMaterialId(''); setSourceId('');
                const defaultDest = destinations.find((d: any) => d.isDefault);
                setDestinationId(defaultDest ? defaultDest.id : '');
                setRemarks('');
                setManualTareWeight('');
              }}>
                <RefreshCw className="mr-1.5 h-3.5 w-3.5" /> {t('Reset Form')}
              </Button>
            </div>
          </div>
        </div>

        {/* Right Column: Urban Pending Tare Weight Side Section */}
        {isUrbanEnviro && (
          <Card className="lg:col-span-3 border-amber-200 bg-gradient-to-b from-amber-50/40 to-white flex flex-col h-full shadow-sm">
            <CardHeader className="py-3 px-4 border-b border-amber-200/60 bg-amber-100/40">
              <div className="flex justify-between items-center">
                <CardTitle className="text-sm font-bold text-amber-950 flex items-center gap-2">
                  <Clock className="w-4 h-4 text-amber-600" />
                  Pending Tare Vehicles
                </CardTitle>
                <span className="bg-amber-200 text-amber-900 text-xs px-2 py-0.5 rounded-full font-bold">
                  {pendingTareVehicles.length}
                </span>
              </div>
            </CardHeader>
            <CardContent className="p-3 flex-1 overflow-auto max-h-[560px] space-y-2.5">
              {pendingTareVehicles.length === 0 ? (
                <div className="text-center py-10 text-xs text-slate-400">
                  <Clock className="w-8 h-8 mx-auto mb-2 opacity-30 text-amber-600" />
                  No vehicles pending for tare weighment.
                  <p className="text-[11px] text-slate-400 mt-1">
                    Save a loaded vehicle with "Save Step 1 (Gross)" to hold it here until it unloads.
                  </p>
                </div>
              ) : (
                pendingTareVehicles.map((item) => (
                  <div
                    key={item.id}
                    className="p-3 rounded-md border border-amber-200 bg-white hover:border-amber-400 transition-all shadow-sm space-y-1.5"
                  >
                    <div className="flex justify-between items-start">
                      <div>
                        <span className="font-bold text-slate-900 text-sm">
                          {item.vehicleNumber}
                        </span>
                        {item.time && (
                          <span className="text-[10px] text-slate-500 ml-2">({item.time})</span>
                        )}
                      </div>
                      <button
                        onClick={() => handleRemovePending(item.vehicleId)}
                        className="text-slate-400 hover:text-red-600 transition-colors p-0.5"
                        title="Remove from pending"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    <div className="grid grid-cols-2 text-xs text-slate-600">
                      <div>Gross: <span className="font-semibold text-slate-900">{item.grossWeight} kg</span></div>
                      <div className="truncate">Cust: <span className="font-semibold text-slate-900 truncate">{item.sourceName}</span></div>
                    </div>

                    <Button
                      size="sm"
                      className="w-full h-8 text-xs font-bold bg-[#1E3A8A] hover:bg-[#1E3A8A]/90 text-white mt-1 shadow-sm"
                      onClick={() => handleDirectSaveFromPending(item)}
                      disabled={isSubmitting}
                      title="Directly capture live weighbridge tare and print slip without opening any forms"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5 mr-1" />
                      Save Tare ({liveWeight} kg) & Print
                    </Button>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        )}

      </div>

      {/* Urban 2-Step Weighment Selection Popup */}
      {isUrbanEnviro && (
        <Dialog open={showStepDialog} onOpenChange={setShowStepDialog}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle className="text-lg font-bold flex items-center gap-2 text-slate-800">
                Urban Weighment Step Selection
              </DialogTitle>
              <DialogDescription className="text-sm text-slate-600">
                Vehicle: <span className="font-semibold text-slate-900">{selectedVehicle?.vehicleNumber}</span>
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-2">
              <p className="text-xs text-slate-500">
                Please select the current weighing stage for this vehicle:
              </p>

              <div className="grid grid-cols-1 gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setWeighStep('gross');
                    setShowStepDialog(false);
                  }}
                  className={`flex items-start gap-3 p-3.5 rounded-lg border-2 text-left transition-all ${weighStep === 'gross'
                    ? 'border-blue-600 bg-blue-50/70'
                    : 'border-slate-200 hover:border-slate-300 bg-white'
                    }`}
                >
                  <ArrowDownCircle className="w-6 h-6 text-blue-600 shrink-0 mt-0.5" />
                  <div>
                    <div className="font-bold text-slate-900 text-sm">Step 1: Loaded Vehicle (Gross Weight)</div>
                    <div className="text-xs text-slate-500 mt-0.5">
                      Vehicle entered fully loaded. Weighs gross on bridge; tare weight will be fetched from last slip ({manualTareWeight ? `${manualTareWeight} kg` : 'Default'} - editable).
                    </div>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setWeighStep('tare');
                    if (liveWeight > 0) {
                      setManualTareWeight(liveWeight);
                      toast({
                        title: 'Tare Captured from Weighbridge',
                        description: `Set tare weight to live machine weight: ${liveWeight} kg.`,
                      });
                    }
                    setShowStepDialog(false);
                  }}
                  className={`flex items-start gap-3 p-3.5 rounded-lg border-2 text-left transition-all ${weighStep === 'tare'
                    ? 'border-emerald-600 bg-emerald-50/70'
                    : 'border-slate-200 hover:border-slate-300 bg-white'
                    }`}
                >
                  <ArrowUpCircle className="w-6 h-6 text-emerald-600 shrink-0 mt-0.5" />
                  <div>
                    <div className="font-bold text-slate-900 text-sm">Step 2: Empty Vehicle (Get Tare from Weighbridge)</div>
                    <div className="text-xs text-slate-500 mt-0.5">
                      Vehicle is on the bridge empty. Captures live weighbridge weight ({liveWeight} kg) directly as Tare Weight.
                    </div>
                  </div>
                </button>
              </div>

              {lastSlipTare !== null && (
                <div className="bg-slate-50 p-2.5 rounded border border-slate-200 text-xs text-slate-600 flex justify-between">
                  <span>Previous Trip Tare:</span>
                  <span className="font-mono font-bold text-blue-700">{lastSlipTare} KG</span>
                </div>
              )}

              <Button
                className="w-full bg-[#1E3A8A] hover:bg-[#1E3A8A]/90"
                onClick={() => setShowStepDialog(false)}
              >
                Proceed with Selected Step
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </>
  );
}
