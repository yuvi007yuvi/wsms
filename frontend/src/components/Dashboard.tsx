import { useState, useEffect, useMemo } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Line, PieChart, Pie, Cell, Legend, AreaChart, Area } from 'recharts';
import { Scale, Truck, FileText, Box, RefreshCw, TrendingUp, MapPin, Anchor, Weight, Clock, ArrowUpRight, ArrowDownRight, Filter, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useTranslation } from 'react-i18next';
import api from '@/lib/api';

export default function Dashboard() {
  const { t } = useTranslation();
  const [slips, setSlips] = useState<any[]>([]);
  const [materialsCount, setMaterialsCount] = useState(0);
  const [vehiclesCount, setVehiclesCount] = useState(0);
  const [materialsList, setMaterialsList] = useState<any[]>([]);
  const [vehiclesList, setVehiclesList] = useState<any[]>([]);
  const [sourcesList, setSourcesList] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [filterVehicleType, setFilterVehicleType] = useState('all');
  const [filterMaterial, setFilterMaterial] = useState('all');
  const [filterSource, setFilterSource] = useState('all');

  const fetchData = async () => {
    setLoading(true);
    try {
      const [slipsRes, materialsRes, vehiclesRes, sourcesRes] = await Promise.all([
        api.get('/weighment'),
        api.get('/master/materials'),
        api.get('/master/vehicles'),
        api.get('/master/sources'),
      ]);
      setSlips(slipsRes.data);
      setMaterialsList(materialsRes.data);
      setMaterialsCount(materialsRes.data.length);
      setVehiclesList(vehiclesRes.data);
      setVehiclesCount(vehiclesRes.data.length);
      setSourcesList(sourcesRes.data);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Apply filters
  const filteredSlips = useMemo(() => {
    let results = slips;

    if (dateFrom) {
      const from = new Date(dateFrom);
      from.setHours(0, 0, 0, 0);
      results = results.filter(s => new Date(s.date) >= from);
    }
    if (dateTo) {
      const to = new Date(dateTo);
      to.setHours(23, 59, 59, 999);
      results = results.filter(s => new Date(s.date) <= to);
    }
    if (filterVehicleType !== 'all') {
      results = results.filter(s => (s.vehicle?.type || '') === filterVehicleType);
    }
    if (filterMaterial !== 'all') {
      results = results.filter(s => s.materialId === filterMaterial);
    }
    if (filterSource !== 'all') {
      results = results.filter(s => s.sourceId === filterSource);
    }
    return results;
  }, [slips, dateFrom, dateTo, filterVehicleType, filterMaterial, filterSource]);

  const hasFilters = dateFrom || dateTo || filterVehicleType !== 'all' || filterMaterial !== 'all' || filterSource !== 'all';

  // Unique vehicle types for filter dropdown
  const vehicleTypes_list = useMemo(() => {
    const types = new Set(vehiclesList.map(v => v.type));
    return Array.from(types);
  }, [vehiclesList]);

  const setQuickDateRange = (range: 'today' | 'week' | 'month' | 'all') => {
    const now = new Date();
    const toStr = now.toISOString().slice(0, 10);
    switch (range) {
      case 'today': setDateFrom(toStr); setDateTo(toStr); break;
      case 'week': { const w = new Date(); w.setDate(w.getDate() - 7); setDateFrom(w.toISOString().slice(0, 10)); setDateTo(toStr); break; }
      case 'month': { const m = new Date(); m.setDate(m.getDate() - 30); setDateFrom(m.toISOString().slice(0, 10)); setDateTo(toStr); break; }
      case 'all': setDateFrom(''); setDateTo(''); break;
    }
  };

  const clearAllFilters = () => {
    setDateFrom(''); setDateTo('');
    setFilterVehicleType('all'); setFilterMaterial('all'); setFilterSource('all');
  };

  const stats = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    // When filters are active, use filtered slips. Otherwise, default to today's slips.
    const baseSlips = hasFilters ? filteredSlips : slips.filter(s => new Date(s.date) >= today);
    const todaySlips = baseSlips;
    const yesterdaySlips = slips.filter(s => {
      const d = new Date(s.date);
      return d >= yesterday && d < today;
    });

    const totalSlipsToday = todaySlips.length;
    const totalSlipsYesterday = yesterdaySlips.length;
    const totalNetWeight = todaySlips.reduce((sum, s) => sum + (s.netWeight || 0), 0);
    const totalNetWeightYesterday = yesterdaySlips.reduce((sum, s) => sum + (s.netWeight || 0), 0);
    const totalGrossWeight = todaySlips.reduce((sum, s) => sum + (s.grossWeight || 0), 0);
    const totalTareWeight = todaySlips.reduce((sum, s) => sum + (s.tareWeight || 0), 0);
    const vehicleVisits = todaySlips.length;
    const vehicleVisitsYesterday = yesterdaySlips.length;
    const uniqueVehiclesToday = new Set(todaySlips.map(s => s.vehicleId)).size;
    const avgNetWeight = totalSlipsToday > 0 ? Math.round(totalNetWeight / totalSlipsToday) : 0;

    // Percentage changes
    const slipChange = totalSlipsYesterday > 0 ? Math.round(((totalSlipsToday - totalSlipsYesterday) / totalSlipsYesterday) * 100) : totalSlipsToday > 0 ? 100 : 0;
    const weightChange = totalNetWeightYesterday > 0 ? Math.round(((totalNetWeight - totalNetWeightYesterday) / totalNetWeightYesterday) * 100) : totalNetWeight > 0 ? 100 : 0;
    const visitChange = vehicleVisitsYesterday > 0 ? Math.round(((vehicleVisits - vehicleVisitsYesterday) / vehicleVisitsYesterday) * 100) : vehicleVisits > 0 ? 100 : 0;

    // Daily Trend (Last 7 Days) - with slip count + weight
    const dailyTrend = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const start = new Date(d.setHours(0, 0, 0, 0));
      const end = new Date(d.setHours(23, 59, 59, 999));
      
      const daySlips = slips.filter(s => {
        const date = new Date(s.date);
        return date >= start && date <= end;
      });
      
      dailyTrend.push({
        name: d.toLocaleDateString('en-US', { weekday: 'short' }),
        date: d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        netWeight: daySlips.reduce((sum, s) => sum + (s.netWeight || 0), 0),
        grossWeight: daySlips.reduce((sum, s) => sum + (s.grossWeight || 0), 0),
        slips: daySlips.length
      });
    }

    // Hourly Trend (Today)
    const hourly = [];
    for (let i = 6; i < 20; i += 2) {
      const hourSlips = todaySlips.filter(s => {
        const h = new Date(s.date).getHours();
        return h >= i && h < i + 2;
      });
      hourly.push({
        name: `${i > 12 ? i - 12 : i}${i >= 12 ? 'pm' : 'am'}`,
        slips: hourSlips.length,
        weight: hourSlips.reduce((sum, s) => sum + (s.netWeight || 0), 0)
      });
    }

    // Vehicle Type Breakdown (Today)
    const vehicleTypeMap = new Map();
    todaySlips.forEach(s => {
      const vType = s.vehicle?.type || 'Unknown';
      if (!vehicleTypeMap.has(vType)) {
        vehicleTypeMap.set(vType, { name: vType, count: 0, weight: 0 });
      }
      const data = vehicleTypeMap.get(vType);
      data.count += 1;
      data.weight += (s.netWeight || 0);
    });
    const vehicleTypes = Array.from(vehicleTypeMap.values());

    // Material Breakdown (Today)
    const materialMap = new Map();
    todaySlips.forEach(s => {
      const mName = s.material?.name || 'Unknown';
      if (!materialMap.has(mName)) {
        materialMap.set(mName, { name: mName, count: 0, weight: 0 });
      }
      const data = materialMap.get(mName);
      data.count += 1;
      data.weight += (s.netWeight || 0);
    });
    const materialBreakdown = Array.from(materialMap.values());

    // Source Breakdown (Today)
    const sourceMap = new Map();
    todaySlips.forEach(s => {
      const sName = s.source?.name || 'Unknown';
      if (!sourceMap.has(sName)) {
        sourceMap.set(sName, { name: sName, count: 0, weight: 0 });
      }
      const data = sourceMap.get(sName);
      data.count += 1;
      data.weight += (s.netWeight || 0);
    });
    const sourceBreakdown = Array.from(sourceMap.values());

    // Destination Breakdown (Today)
    const destMap = new Map();
    todaySlips.forEach(s => {
      const dName = s.destination?.name || 'Unknown';
      if (!destMap.has(dName)) {
        destMap.set(dName, { name: dName, count: 0, weight: 0 });
      }
      const data = destMap.get(dName);
      data.count += 1;
      data.weight += (s.netWeight || 0);
    });
    const destBreakdown = Array.from(destMap.values());

    // Recent Slips (last 5)
    const recentSlips = todaySlips.slice(0, 5);

    // Peak Hour
    const peakHour = hourly.reduce((max, h) => h.slips > max.slips ? h : max, { name: '-', slips: 0, weight: 0 });

    return {
      totalSlipsToday, totalNetWeight, totalGrossWeight, totalTareWeight, vehicleVisits,
      uniqueVehiclesToday, avgNetWeight, slipChange, weightChange, visitChange,
      dailyTrend, hourly, vehicleTypes, materialBreakdown, sourceBreakdown, destBreakdown,
      recentSlips, peakHour
    };
  }, [slips, filteredSlips, hasFilters]);

  const COLORS = ['#10b981', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4', '#84cc16'];

  const ChangeIndicator = ({ value }: { value: number }) => (
    <span className={`flex items-center gap-0.5 text-[10px] font-bold ${value >= 0 ? 'text-green-600' : 'text-red-500'}`}>
      {value >= 0 ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
      {Math.abs(value)}% {t('vs yesterday')}
    </span>
  );

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-end">
        <div>
          <h2 className="text-3xl font-bold tracking-tight text-slate-900">{t('Overview')}</h2>
          <p className="text-sm text-slate-500">{hasFilters ? t('Showing filtered results') : t('Live operational metrics and weighment statistics.')}</p>
        </div>
        <Button variant="outline" size="sm" onClick={fetchData} disabled={loading} className="h-8 text-xs rounded-sm border-slate-300">
          <RefreshCw className={`h-3.5 w-3.5 mr-1 ${loading ? 'animate-spin' : ''}`} /> {t('Refresh')}
        </Button>
      </div>

      {/* Filter Bar */}
      <div className="bg-white border border-slate-300 rounded-sm shadow-sm p-3">
        <div className="flex items-center gap-2 mb-2">
          <Filter className="h-4 w-4 text-slate-400" />
          <span className="text-xs font-bold text-slate-600 uppercase tracking-wider">{t('Filters')}</span>
          {hasFilters && (
            <Button variant="ghost" size="sm" className="h-6 px-2 text-[10px] rounded-sm text-red-500 hover:text-red-600 ml-auto" onClick={clearAllFilters}>
              <X className="h-3 w-3 mr-1" /> {t('Clear All')}
            </Button>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-3">
          {/* Date Range */}
          <div className="flex items-center gap-1.5">
            <span className="text-[10px] text-slate-500 font-semibold uppercase">{t('From')}:</span>
            <Input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} className="h-7 w-36 text-xs rounded-sm border-slate-300" />
            <span className="text-[10px] text-slate-400">{t('to')}</span>
            <Input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} className="h-7 w-36 text-xs rounded-sm border-slate-300" />
          </div>

          <div className="h-5 border-l border-slate-200" />

          {/* Quick Presets */}
          <div className="flex items-center gap-1">
            <Button variant="outline" size="sm" className={`h-7 px-2 text-[10px] rounded-sm ${!dateFrom && !dateTo ? 'bg-green-50 border-green-300 text-green-700' : 'border-slate-300'}`} onClick={() => setQuickDateRange('all')}>{t('All Time')}</Button>
            <Button variant="outline" size="sm" className="h-7 px-2 text-[10px] rounded-sm border-slate-300" onClick={() => setQuickDateRange('today')}>{t('Today')}</Button>
            <Button variant="outline" size="sm" className="h-7 px-2 text-[10px] rounded-sm border-slate-300" onClick={() => setQuickDateRange('week')}>{t('7 Days')}</Button>
            <Button variant="outline" size="sm" className="h-7 px-2 text-[10px] rounded-sm border-slate-300" onClick={() => setQuickDateRange('month')}>{t('30 Days')}</Button>
          </div>

          <div className="h-5 border-l border-slate-200" />

          {/* Vehicle Type */}
          <Select value={filterVehicleType} onValueChange={setFilterVehicleType}>
            <SelectTrigger className="h-7 w-40 text-xs rounded-sm border-slate-300">
              <SelectValue placeholder={t('Vehicle Type')} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t('All Vehicle Types')}</SelectItem>
              {vehicleTypes_list.map(vt => (
                <SelectItem key={vt} value={vt}>{vt}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Material */}
          <Select value={filterMaterial} onValueChange={setFilterMaterial}>
            <SelectTrigger className="h-7 w-40 text-xs rounded-sm border-slate-300">
              <SelectValue placeholder={t('Material')} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t('All Materials')}</SelectItem>
              {materialsList.map(m => (
                <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Source */}
          <Select value={filterSource} onValueChange={setFilterSource}>
            <SelectTrigger className="h-7 w-40 text-xs rounded-sm border-slate-300">
              <SelectValue placeholder={t('Source')} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t('All Sources')}</SelectItem>
              {sourcesList.map(s => (
                <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Row 1: Key Stats (6 cards) */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        <div className="bg-white border border-slate-300 rounded-sm p-4 shadow-sm">
          <div className="flex items-center justify-between pb-2">
            <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider">{t('Slips Today')}</h3>
            <FileText className="h-4 w-4 text-slate-400" />
          </div>
          <div className="text-2xl font-bold text-slate-900">{stats.totalSlipsToday}</div>
          <ChangeIndicator value={stats.slipChange} />
        </div>

        <div className="bg-white border border-slate-300 rounded-sm p-4 shadow-sm">
          <div className="flex items-center justify-between pb-2">
            <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider">{t('Net Weight')}</h3>
            <Scale className="h-4 w-4 text-slate-400" />
          </div>
          <div className="text-2xl font-bold text-slate-900">{stats.totalNetWeight.toLocaleString()} <span className="text-sm text-slate-500">KG</span></div>
          <ChangeIndicator value={stats.weightChange} />
        </div>

        <div className="bg-white border border-slate-300 rounded-sm p-4 shadow-sm">
          <div className="flex items-center justify-between pb-2">
            <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider">{t('Gross Weight')}</h3>
            <Weight className="h-4 w-4 text-slate-400" />
          </div>
          <div className="text-2xl font-bold text-slate-900">{stats.totalGrossWeight.toLocaleString()} <span className="text-sm text-slate-500">KG</span></div>
          <p className="text-[10px] text-slate-400 font-medium">{t('Tare')}: {stats.totalTareWeight.toLocaleString()} KG</p>
        </div>

        <div className="bg-white border border-slate-300 rounded-sm p-4 shadow-sm">
          <div className="flex items-center justify-between pb-2">
            <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider">{t('Vehicle Visits')}</h3>
            <Truck className="h-4 w-4 text-slate-400" />
          </div>
          <div className="text-2xl font-bold text-slate-900">{stats.vehicleVisits}</div>
          <p className="text-[10px] text-slate-400 font-medium">{stats.uniqueVehiclesToday} {t('unique vehicles')}</p>
        </div>

        <div className="bg-white border border-slate-300 rounded-sm p-4 shadow-sm">
          <div className="flex items-center justify-between pb-2">
            <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider">{t('Avg Net Wt')}</h3>
            <TrendingUp className="h-4 w-4 text-slate-400" />
          </div>
          <div className="text-2xl font-bold text-slate-900">{stats.avgNetWeight.toLocaleString()} <span className="text-sm text-slate-500">KG</span></div>
          <p className="text-[10px] text-slate-400 font-medium">{t('Per slip average')}</p>
        </div>

        <div className="bg-white border border-slate-300 rounded-sm p-4 shadow-sm">
          <div className="flex items-center justify-between pb-2">
            <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider">{t('Peak Hour')}</h3>
            <Clock className="h-4 w-4 text-slate-400" />
          </div>
          <div className="text-2xl font-bold text-slate-900">{stats.peakHour.name}</div>
          <p className="text-[10px] text-slate-400 font-medium">{stats.peakHour.slips} {t('slips generated')}</p>
        </div>
      </div>

      {/* Row 2: Charts */}
      <div className="grid gap-4 md:grid-cols-2">
        {/* Daily Trend - Area Chart with dual Y */}
        <div className="bg-white border border-slate-300 rounded-sm shadow-sm flex flex-col">
          <div className="p-4 border-b border-slate-100">
            <h3 className="text-sm font-semibold text-slate-800">{t('Daily Collection Trend (7 Days)')}</h3>
            <p className="text-[10px] text-slate-400 mt-0.5">{t('Net & Gross weight with slip count')}</p>
          </div>
          <div className="p-4 h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={stats.dailyTrend}>
                <defs>
                  <linearGradient id="gradNet" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="gradGross" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.2}/>
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#64748b' }} />
                <YAxis axisLine={false} tickLine={false} tickFormatter={(val) => `${(val/1000).toFixed(1)}k`} tick={{ fontSize: 11, fill: '#64748b' }} />
                <Tooltip contentStyle={{ borderRadius: '4px', fontSize: '11px', border: '1px solid #e5e7eb' }} />
                <Area type="monotone" dataKey="grossWeight" name={t("Gross (KG)")} stroke="#3b82f6" strokeWidth={2} fill="url(#gradGross)" />
                <Area type="monotone" dataKey="netWeight" name={t("Net (KG)")} stroke="#10b981" strokeWidth={2} fill="url(#gradNet)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
        
        {/* Hourly Trend - Combined Bar + Line */}
        <div className="bg-white border border-slate-300 rounded-sm shadow-sm flex flex-col">
          <div className="p-4 border-b border-slate-100">
            <h3 className="text-sm font-semibold text-slate-800">{t('Hourly Activity (Today)')}</h3>
            <p className="text-[10px] text-slate-400 mt-0.5">{t('Slips generated and weight per 2-hour block')}</p>
          </div>
          <div className="p-4 h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={stats.hourly}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#64748b' }} />
                <YAxis yAxisId="left" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#64748b' }} />
                <YAxis yAxisId="right" orientation="right" axisLine={false} tickLine={false} tickFormatter={(val) => `${(val/1000).toFixed(1)}k`} tick={{ fontSize: 11, fill: '#64748b' }} />
                <Tooltip contentStyle={{ borderRadius: '4px', fontSize: '11px', border: '1px solid #e5e7eb' }} />
                <Bar yAxisId="left" dataKey="slips" name={t("Slips")} fill="#10b981" radius={[4, 4, 0, 0]} />
                <Line yAxisId="right" type="monotone" dataKey="weight" name={t("Weight (KG)")} stroke="#f59e0b" strokeWidth={2} dot={{ r: 3 }} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Row 3: Vehicle Type Pie + Material Breakdown */}
      <div className="grid gap-4 md:grid-cols-2">
        {/* Vehicle Type Pie */}
        <div className="bg-white border border-slate-300 rounded-sm shadow-sm flex flex-col">
          <div className="p-4 border-b border-slate-100 flex items-center gap-2">
            <Truck className="h-4 w-4 text-slate-400" />
            <h3 className="text-sm font-semibold text-slate-800">{t('Vehicle Type Breakdown (Today)')}</h3>
          </div>
          <div className="p-4 h-[300px] flex items-center justify-center">
            {stats.vehicleTypes.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={stats.vehicleTypes} cx="50%" cy="45%" innerRadius={55} outerRadius={85} paddingAngle={2} dataKey="weight" nameKey="name">
                    {stats.vehicleTypes.map((_entry: any, index: number) => (
                      <Cell key={`cell-vt-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value) => `${Number(value).toLocaleString()} KG`} contentStyle={{ borderRadius: '4px', fontSize: '11px' }} />
                  <Legend verticalAlign="bottom" height={36} iconType="circle" wrapperStyle={{ fontSize: '11px' }} />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="text-sm text-slate-400 text-center">{t('No data available')}</div>
            )}
          </div>
        </div>

        {/* Material Breakdown Pie */}
        <div className="bg-white border border-slate-300 rounded-sm shadow-sm flex flex-col">
          <div className="p-4 border-b border-slate-100 flex items-center gap-2">
            <Box className="h-4 w-4 text-slate-400" />
            <h3 className="text-sm font-semibold text-slate-800">{t('Material Breakdown (Today)')}</h3>
          </div>
          <div className="p-4 h-[300px] flex items-center justify-center">
            {stats.materialBreakdown.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={stats.materialBreakdown} cx="50%" cy="45%" innerRadius={55} outerRadius={85} paddingAngle={2} dataKey="weight" nameKey="name">
                    {stats.materialBreakdown.map((_entry: any, index: number) => (
                      <Cell key={`cell-mat-${index}`} fill={COLORS[(index + 2) % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value) => `${Number(value).toLocaleString()} KG`} contentStyle={{ borderRadius: '4px', fontSize: '11px' }} />
                  <Legend verticalAlign="bottom" height={36} iconType="circle" wrapperStyle={{ fontSize: '11px' }} />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="text-sm text-slate-400 text-center">{t('No data available')}</div>
            )}
          </div>
        </div>
      </div>

      {/* Row 4: Source & Destination Tables */}
      <div className="grid gap-4 md:grid-cols-2">
        {/* Source Breakdown Table */}
        <div className="bg-white border border-slate-300 rounded-sm shadow-sm flex flex-col">
          <div className="p-4 border-b border-slate-100 flex items-center gap-2">
            <MapPin className="h-4 w-4 text-slate-400" />
            <h3 className="text-sm font-semibold text-slate-800">{t('Source-wise Collection (Today)')}</h3>
          </div>
          <div className="p-0">
            {stats.sourceBreakdown.length > 0 ? (
              <table className="w-full text-xs">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="text-left px-4 py-2 font-semibold text-slate-600">{t('Source')}</th>
                    <th className="text-right px-4 py-2 font-semibold text-slate-600">{t('Trips')}</th>
                    <th className="text-right px-4 py-2 font-semibold text-slate-600">{t('Net Weight (KG)')}</th>
                    <th className="text-right px-4 py-2 font-semibold text-slate-600">{t('Share')}</th>
                  </tr>
                </thead>
                <tbody>
                  {stats.sourceBreakdown.map((s: any, i: number) => (
                    <tr key={i} className="border-t border-slate-100 hover:bg-slate-50 transition-colors">
                      <td className="px-4 py-2 font-medium text-slate-800">{s.name}</td>
                      <td className="px-4 py-2 text-right text-slate-600">{s.count}</td>
                      <td className="px-4 py-2 text-right font-bold text-slate-900">{s.weight.toLocaleString()}</td>
                      <td className="px-4 py-2 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <div className="w-16 bg-slate-100 rounded-full h-1.5">
                            <div className="bg-green-500 h-1.5 rounded-full" style={{ width: `${stats.totalNetWeight > 0 ? (s.weight / stats.totalNetWeight) * 100 : 0}%` }} />
                          </div>
                          <span className="text-slate-500 w-10 text-right">{stats.totalNetWeight > 0 ? Math.round((s.weight / stats.totalNetWeight) * 100) : 0}%</span>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <div className="p-6 text-sm text-slate-400 text-center">{t('No data available')}</div>
            )}
          </div>
        </div>

        {/* Destination Breakdown Table */}
        <div className="bg-white border border-slate-300 rounded-sm shadow-sm flex flex-col">
          <div className="p-4 border-b border-slate-100 flex items-center gap-2">
            <Anchor className="h-4 w-4 text-slate-400" />
            <h3 className="text-sm font-semibold text-slate-800">{t('Destination-wise Dispatch (Today)')}</h3>
          </div>
          <div className="p-0">
            {stats.destBreakdown.length > 0 ? (
              <table className="w-full text-xs">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="text-left px-4 py-2 font-semibold text-slate-600">{t('Destination')}</th>
                    <th className="text-right px-4 py-2 font-semibold text-slate-600">{t('Trips')}</th>
                    <th className="text-right px-4 py-2 font-semibold text-slate-600">{t('Net Weight (KG)')}</th>
                    <th className="text-right px-4 py-2 font-semibold text-slate-600">{t('Share')}</th>
                  </tr>
                </thead>
                <tbody>
                  {stats.destBreakdown.map((d: any, i: number) => (
                    <tr key={i} className="border-t border-slate-100 hover:bg-slate-50 transition-colors">
                      <td className="px-4 py-2 font-medium text-slate-800">{d.name}</td>
                      <td className="px-4 py-2 text-right text-slate-600">{d.count}</td>
                      <td className="px-4 py-2 text-right font-bold text-slate-900">{d.weight.toLocaleString()}</td>
                      <td className="px-4 py-2 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <div className="w-16 bg-slate-100 rounded-full h-1.5">
                            <div className="bg-blue-500 h-1.5 rounded-full" style={{ width: `${stats.totalNetWeight > 0 ? (d.weight / stats.totalNetWeight) * 100 : 0}%` }} />
                          </div>
                          <span className="text-slate-500 w-10 text-right">{stats.totalNetWeight > 0 ? Math.round((d.weight / stats.totalNetWeight) * 100) : 0}%</span>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <div className="p-6 text-sm text-slate-400 text-center">{t('No data available')}</div>
            )}
          </div>
        </div>
      </div>

      {/* Row 5: Recent Activity + Quick Stats */}
      <div className="grid gap-4 md:grid-cols-3">
        {/* Recent Slips */}
        <div className="md:col-span-2 bg-white border border-slate-300 rounded-sm shadow-sm flex flex-col">
          <div className="p-4 border-b border-slate-100">
            <h3 className="text-sm font-semibold text-slate-800">{t('Recent Activity (Today)')}</h3>
          </div>
          <div className="p-0">
            {stats.recentSlips.length > 0 ? (
              <table className="w-full text-xs">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="text-left px-4 py-2 font-semibold text-slate-600">{t('Time')}</th>
                    <th className="text-left px-4 py-2 font-semibold text-slate-600">{t('Slip No')}</th>
                    <th className="text-left px-4 py-2 font-semibold text-slate-600">{t('Vehicle')}</th>
                    <th className="text-left px-4 py-2 font-semibold text-slate-600">{t('Material')}</th>
                    <th className="text-right px-4 py-2 font-semibold text-slate-600">{t('Net Wt')}</th>
                  </tr>
                </thead>
                <tbody>
                  {stats.recentSlips.map((s: any) => (
                    <tr key={s.id} className="border-t border-slate-100 hover:bg-slate-50 transition-colors">
                      <td className="px-4 py-2 text-slate-500">{new Date(s.date).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })}</td>
                      <td className="px-4 py-2 font-medium text-slate-800">{s.slipNumber}</td>
                      <td className="px-4 py-2 font-bold text-slate-700">{s.vehicle?.vehicleNumber || '-'}</td>
                      <td className="px-4 py-2 text-slate-600">{s.material?.name || '-'}</td>
                      <td className="px-4 py-2 text-right font-bold text-green-700">{s.netWeight?.toLocaleString()} KG</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <div className="p-6 text-sm text-slate-400 text-center">{t('No activity yet today')}</div>
            )}
          </div>
        </div>

        {/* Quick Stats Card */}
        <div className="bg-white border border-slate-300 rounded-sm shadow-sm flex flex-col">
          <div className="p-4 border-b border-slate-100">
            <h3 className="text-sm font-semibold text-slate-800">{t('System Summary')}</h3>
          </div>
          <div className="p-4 space-y-4 flex-1">
            <div className="flex justify-between items-center">
              <span className="text-xs text-slate-500">{t('Total Registered Vehicles')}</span>
              <span className="text-sm font-bold text-slate-900">{vehiclesCount}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-xs text-slate-500">{t('Materials Tracked')}</span>
              <span className="text-sm font-bold text-slate-900">{materialsCount}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-xs text-slate-500">{t('Avg Net Weight / Slip')}</span>
              <span className="text-sm font-bold text-slate-900">{stats.avgNetWeight.toLocaleString()} KG</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-xs text-slate-500">{t('Unique Vehicles Today')}</span>
              <span className="text-sm font-bold text-slate-900">{stats.uniqueVehiclesToday}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-xs text-slate-500">{t('Peak Hour')}</span>
              <span className="text-sm font-bold text-emerald-700">{stats.peakHour.name}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-xs text-slate-500">{t('All-time Slips')}</span>
              <span className="text-sm font-bold text-slate-900">{slips.length}</span>
            </div>
            <div className="border-t border-slate-100 pt-3">
              <div className="flex justify-between items-center">
                <span className="text-xs font-bold text-slate-600 uppercase tracking-wider">{t('Total Collection Today')}</span>
                <span className="text-lg font-extrabold text-green-700">{stats.totalNetWeight.toLocaleString()} KG</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
