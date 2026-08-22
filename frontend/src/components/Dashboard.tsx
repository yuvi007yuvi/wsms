import { useState, useEffect, useMemo } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Line, PieChart, Pie, Cell, Legend, AreaChart, Area } from 'recharts';
import { Scale, Truck, FileText, Box, RefreshCw, TrendingUp, Anchor, Weight, Clock, ArrowUpRight, ArrowDownRight, Filter, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useTranslation } from 'react-i18next';
import api from '@/lib/api';
import { CardGridSkeleton } from '@/components/ui/LoadingSkeletons';
import VehicleCategoryStats from '@/components/VehicleCategoryStats';

export default function Dashboard() {
  const { t } = useTranslation();
  const [stats, setStats] = useState<any>(null);
  const [vehiclesCount, setVehiclesCount] = useState(0);
  const [materialsList, setMaterialsList] = useState<any[]>([]);
  const [vehiclesList, setVehiclesList] = useState<any[]>([]);
  const [sourcesList, setSourcesList] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const getTodayStr = () => new Date().toISOString().slice(0, 10);

  // Filters
  const [dateFrom, setDateFrom] = useState(getTodayStr());
  const [dateTo, setDateTo] = useState(getTodayStr());
  const [filterVehicleType, setFilterVehicleType] = useState('all');
  const [filterMaterial, setFilterMaterial] = useState('all');
  const [filterSource, setFilterSource] = useState('all');

  const fetchData = async () => {
    setLoading(true);
    try {
      const query = new URLSearchParams();
      if (dateFrom) query.append('dateFrom', dateFrom);
      if (dateTo) query.append('dateTo', dateTo);
      if (filterVehicleType !== 'all') query.append('vehicleType', filterVehicleType);
      if (filterMaterial !== 'all') query.append('materialId', filterMaterial);
      if (filterSource !== 'all') query.append('sourceId', filterSource);

      const [statsRes, materialsRes, vehiclesRes, sourcesRes, vehicleTypesRes] = await Promise.all([
        api.get(`/dashboard/stats?${query.toString()}`),
        api.get('/master/materials?limit=1000'),
        api.get('/master/vehicles?limit=1'), // only need total count
        api.get('/master/sources?limit=1000'),
        api.get('/master/vehicle-types?limit=1000')
      ]);
      const extractData = (res: any) => Array.isArray(res.data?.data) ? res.data.data : (Array.isArray(res.data) ? res.data : []);
      
      setStats(statsRes.data?.data || null);
      
      const materialsData = extractData(materialsRes);
      const sourcesData = extractData(sourcesRes);
      const vehicleTypesData = extractData(vehicleTypesRes);

      setMaterialsList(materialsData);
      setVehiclesList(vehicleTypesData); // Temporarily reusing vehiclesList state for vehicle types
      setVehiclesCount(vehiclesRes.data?.total || 0);
      setSourcesList(sourcesData);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const hasFilters = dateFrom || dateTo || filterVehicleType !== 'all' || filterMaterial !== 'all' || filterSource !== 'all';

  useEffect(() => {
    fetchData();
  }, [dateFrom, dateTo, filterVehicleType, filterMaterial, filterSource]);

  // Unique vehicle types for filter dropdown
  const vehicleTypes_list = useMemo(() => {
    // We now have vehicle types directly
    const types = new Set(vehiclesList.map(vt => vt.name).filter(Boolean));
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

  const COLORS = ['#10b981', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4', '#84cc16'];

  const ChangeIndicator = ({ value, invert = false }: { value: number, invert?: boolean }) => (
    <span className={`flex items-center gap-0.5 text-[11px] font-bold mt-2 ${invert ? 'text-white/90' : (value >= 0 ? 'text-green-600' : 'text-red-500')} ${invert && 'bg-white/20 inline-flex px-2 py-0.5 rounded-full backdrop-blur-sm'}`}>
      {value >= 0 ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
      {Math.abs(value)}% {t('vs yesterday')}
    </span>
  );

  const formatTon = (kg: number) => (kg / 1000).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });

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

      {loading || !stats ? (
        <div className="pt-4">
          <CardGridSkeleton />
        </div>
      ) : (
        <>
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

      {/* New Top Card Row for Vehicle Categories */}
      <div className="grid gap-4 grid-cols-1">
        <VehicleCategoryStats />
      </div>

      {/* Row 1: Key Stats (6 cards) */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        <div className="bg-gradient-to-br from-violet-500 to-purple-600 rounded-xl p-5 shadow-lg shadow-purple-500/20 text-white relative overflow-hidden group">
          <div className="absolute top-[-20px] right-[-20px] w-24 h-24 bg-white/10 rounded-full blur-xl group-hover:scale-150 transition-transform duration-500"></div>
          <div className="flex items-center justify-between pb-3 relative z-10">
            <h3 className="text-xs font-bold text-white/80 uppercase tracking-wider">{t('Slips Today')}</h3>
            <div className="bg-white/20 p-1.5 rounded-lg backdrop-blur-sm"><FileText className="h-4 w-4 text-white" /></div>
          </div>
          <div className="text-3xl font-black relative z-10">{stats.totalSlipsToday}</div>
          <div className="relative z-10"><ChangeIndicator value={stats.slipChange} invert /></div>
        </div>

        <div className="bg-gradient-to-br from-emerald-500 to-teal-600 rounded-xl p-5 shadow-lg shadow-emerald-500/20 text-white relative overflow-hidden group">
          <div className="absolute top-[-20px] right-[-20px] w-24 h-24 bg-white/10 rounded-full blur-xl group-hover:scale-150 transition-transform duration-500"></div>
          <div className="flex items-center justify-between pb-3 relative z-10">
            <h3 className="text-xs font-bold text-white/80 uppercase tracking-wider">{t('Net Weight')}</h3>
            <div className="bg-white/20 p-1.5 rounded-lg backdrop-blur-sm"><Scale className="h-4 w-4 text-white" /></div>
          </div>
          <div className="text-3xl font-black relative z-10">{formatTon(stats.totalNetWeight)} <span className="text-sm font-medium text-white/70">TONS</span></div>
          <div className="relative z-10"><ChangeIndicator value={stats.weightChange} invert /></div>
        </div>

        <div className="bg-gradient-to-br from-blue-500 to-cyan-600 rounded-xl p-5 shadow-lg shadow-blue-500/20 text-white relative overflow-hidden group">
          <div className="absolute top-[-20px] right-[-20px] w-24 h-24 bg-white/10 rounded-full blur-xl group-hover:scale-150 transition-transform duration-500"></div>
          <div className="flex items-center justify-between pb-3 relative z-10">
            <h3 className="text-xs font-bold text-white/80 uppercase tracking-wider">{t('Gross Weight')}</h3>
            <div className="bg-white/20 p-1.5 rounded-lg backdrop-blur-sm"><Weight className="h-4 w-4 text-white" /></div>
          </div>
          <div className="text-3xl font-black relative z-10">{formatTon(stats.totalGrossWeight)} <span className="text-sm font-medium text-white/70">TONS</span></div>
          <p className="text-xs text-white/80 font-semibold mt-2 bg-white/20 inline-flex px-2 py-0.5 rounded-full relative z-10">{t('Tare')}: {formatTon(stats.totalTareWeight)} TONS</p>
        </div>

        <div className="bg-gradient-to-br from-amber-500 to-orange-600 rounded-xl p-5 shadow-lg shadow-orange-500/20 text-white relative overflow-hidden group">
          <div className="absolute top-[-20px] right-[-20px] w-24 h-24 bg-white/10 rounded-full blur-xl group-hover:scale-150 transition-transform duration-500"></div>
          <div className="flex items-center justify-between pb-3 relative z-10">
            <h3 className="text-xs font-bold text-white/80 uppercase tracking-wider">{t('Vehicle Visits')}</h3>
            <div className="bg-white/20 p-1.5 rounded-lg backdrop-blur-sm"><Truck className="h-4 w-4 text-white" /></div>
          </div>
          <div className="text-3xl font-black relative z-10">{stats.vehicleVisits}</div>
          <p className="text-xs text-white/80 font-semibold mt-2 bg-white/20 inline-flex px-2 py-0.5 rounded-full relative z-10">{stats.uniqueVehiclesToday} {t('unique vehicles')}</p>
        </div>

        <div className="bg-gradient-to-br from-pink-500 to-rose-600 rounded-xl p-5 shadow-lg shadow-pink-500/20 text-white relative overflow-hidden group">
          <div className="absolute top-[-20px] right-[-20px] w-24 h-24 bg-white/10 rounded-full blur-xl group-hover:scale-150 transition-transform duration-500"></div>
          <div className="flex items-center justify-between pb-3 relative z-10">
            <h3 className="text-xs font-bold text-white/80 uppercase tracking-wider">{t('Avg Net Wt')}</h3>
            <div className="bg-white/20 p-1.5 rounded-lg backdrop-blur-sm"><TrendingUp className="h-4 w-4 text-white" /></div>
          </div>
          <div className="text-3xl font-black relative z-10">{formatTon(stats.avgNetWeight)} <span className="text-sm font-medium text-white/70">TONS</span></div>
          <p className="text-xs text-white/80 font-semibold mt-2 bg-white/20 inline-flex px-2 py-0.5 rounded-full relative z-10">{t('Per slip average')}</p>
        </div>

        <div className="bg-gradient-to-br from-indigo-500 to-blue-700 rounded-xl p-5 shadow-lg shadow-indigo-500/20 text-white relative overflow-hidden group">
          <div className="absolute top-[-20px] right-[-20px] w-24 h-24 bg-white/10 rounded-full blur-xl group-hover:scale-150 transition-transform duration-500"></div>
          <div className="flex items-center justify-between pb-3 relative z-10">
            <h3 className="text-xs font-bold text-white/80 uppercase tracking-wider">{t('Peak Hour')}</h3>
            <div className="bg-white/20 p-1.5 rounded-lg backdrop-blur-sm"><Clock className="h-4 w-4 text-white" /></div>
          </div>
          <div className="text-3xl font-black relative z-10">{stats.peakHour.name}</div>
          <p className="text-xs text-white/80 font-semibold mt-2 bg-white/20 inline-flex px-2 py-0.5 rounded-full relative z-10">{stats.peakHour.slips} {t('slips generated')}</p>
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
                <YAxis axisLine={false} tickLine={false} tickFormatter={(val) => `${formatTon(val)}T`} tick={{ fontSize: 11, fill: '#64748b' }} />
                <Tooltip formatter={(value: number, name: string) => [`${formatTon(value)} TONS`, name]} contentStyle={{ borderRadius: '4px', fontSize: '11px', border: '1px solid #e5e7eb' }} />
                <Area type="monotone" dataKey="grossWeight" name={t("Gross")} stroke="#3b82f6" strokeWidth={2} fill="url(#gradGross)" />
                <Area type="monotone" dataKey="netWeight" name={t("Net")} stroke="#10b981" strokeWidth={2} fill="url(#gradNet)" />
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
                <YAxis yAxisId="right" orientation="right" axisLine={false} tickLine={false} tickFormatter={(val) => `${formatTon(val)}T`} tick={{ fontSize: 11, fill: '#64748b' }} />
                <Tooltip formatter={(value: number, name: string) => [name.includes('Weight') ? `${formatTon(value)} TONS` : value, name]} contentStyle={{ borderRadius: '4px', fontSize: '11px', border: '1px solid #e5e7eb' }} />
                <Bar yAxisId="left" dataKey="slips" name={t("Slips")} fill="#10b981" radius={[4, 4, 0, 0]} />
                <Line yAxisId="right" type="monotone" dataKey="weight" name={t("Weight")} stroke="#f59e0b" strokeWidth={2} dot={{ r: 3 }} />
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
                  <Tooltip formatter={(value) => `${formatTon(Number(value))} TONS`} contentStyle={{ borderRadius: '4px', fontSize: '11px' }} />
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
                  <Tooltip formatter={(value) => `${formatTon(Number(value))} TONS`} contentStyle={{ borderRadius: '4px', fontSize: '11px' }} />
                  <Legend verticalAlign="bottom" height={36} iconType="circle" wrapperStyle={{ fontSize: '11px' }} />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="text-sm text-slate-400 text-center">{t('No data available')}</div>
            )}
          </div>
        </div>
      </div>

      {/* Row 4: Destination Table */}
      <div className="grid gap-4 md:grid-cols-1">
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
                    <th className="text-right px-4 py-2 font-semibold text-slate-600">{t('Net Weight (TONS)')}</th>
                    <th className="text-right px-4 py-2 font-semibold text-slate-600">{t('Share')}</th>
                  </tr>
                </thead>
                <tbody>
                  {stats.destBreakdown.map((d: any, i: number) => (
                    <tr key={i} className="border-t border-slate-100 hover:bg-slate-50 transition-colors">
                      <td className="px-4 py-2 font-medium text-slate-800">{d.name}</td>
                      <td className="px-4 py-2 text-right text-slate-600">{d.count}</td>
                      <td className="px-4 py-2 text-right font-bold text-slate-900">{formatTon(d.weight)}</td>
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
        {/* Lowest 10 Slips */}
        <div className="md:col-span-2 bg-white border border-slate-300 rounded-sm shadow-sm flex flex-col">
          <div className="p-4 border-b border-slate-100 flex justify-between items-center">
            <h3 className="text-sm font-semibold text-slate-800">{t('Lowest 10 Slips (Today)')}</h3>
            <span className="text-[10px] bg-red-100 text-red-700 px-2 py-0.5 rounded-full font-bold">By Net Weight</span>
          </div>
          <div className="p-0 overflow-y-auto max-h-[300px]">
            {stats.lowestSlips && stats.lowestSlips.length > 0 ? (
              <table className="w-full text-xs">
                <thead className="bg-slate-50 sticky top-0">
                  <tr>
                    <th className="text-left px-4 py-2 font-semibold text-slate-600">{t('Time')}</th>
                    <th className="text-left px-4 py-2 font-semibold text-slate-600">{t('Slip No')}</th>
                    <th className="text-left px-4 py-2 font-semibold text-slate-600">{t('Vehicle')}</th>
                    <th className="text-left px-4 py-2 font-semibold text-slate-600">{t('Material')}</th>
                    <th className="text-right px-4 py-2 font-semibold text-slate-600">{t('Net Wt (TONS)')}</th>
                  </tr>
                </thead>
                <tbody>
                  {stats.lowestSlips.map((s: any) => (
                    <tr key={s.id} className="border-t border-slate-100 hover:bg-slate-50 transition-colors">
                      <td className="px-4 py-2 text-slate-500">{new Date(s.date).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })}</td>
                      <td className="px-4 py-2 font-medium text-slate-800">{s.slipNumber}</td>
                      <td className="px-4 py-2 font-bold text-slate-700">{s.vehicle?.vehicleNumber || '-'}</td>
                      <td className="px-4 py-2 text-slate-600">{s.material?.name || '-'}</td>
                      <td className="px-4 py-2 text-right font-bold text-red-600">{formatTon(s.netWeight)} TONS</td>
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
              <span className="text-xs text-slate-500">{t('Materials Tracked (Today)')}</span>
              <span className="text-sm font-bold text-slate-900">{stats.materialBreakdown.length}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-xs text-slate-500">{t('Avg Net Weight / Slip')}</span>
              <span className="text-sm font-bold text-slate-900">{formatTon(stats.avgNetWeight)} TONS</span>
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
              <span className="text-sm font-bold text-slate-900">{stats.totalSlipsAllTime}</span>
            </div>
            <div className="border-t border-slate-100 pt-3">
              <div className="flex justify-between items-center">
                <span className="text-xs font-bold text-slate-600 uppercase tracking-wider">{t('Total Collection Today')}</span>
                <span className="text-lg font-extrabold text-green-700">{formatTon(stats.totalNetWeight)} TONS</span>
              </div>
            </div>
          </div>
        </div>
      </div>
        </>
      )}
    </div>
  );
}
