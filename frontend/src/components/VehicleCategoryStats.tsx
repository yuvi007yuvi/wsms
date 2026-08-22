import { useState, useEffect } from 'react';
import { Truck } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useTranslation } from 'react-i18next';
import api from '@/lib/api';

export default function VehicleCategoryStats() {
  const { t } = useTranslation();
  const [dateRange, setDateRange] = useState('today');
  const [loading, setLoading] = useState(true);
  
  const [primary, setPrimary] = useState({ total: 0, items: [] as any[] });
  const [secondary, setSecondary] = useState({ total: 0, items: [] as any[] });
  const [others, setOthers] = useState({ total: 0, items: [] as any[] });

  const formatTon = (kg: number) => (kg / 1000).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  useEffect(() => {
    const fetchCategoryStats = async () => {
      setLoading(true);
      try {
        const query = new URLSearchParams();
        
        const now = new Date();
        const toStr = now.toISOString().slice(0, 10);
        let fromStr = '';
        
        switch (dateRange) {
          case 'today': 
            fromStr = toStr; 
            break;
          case 'week': { 
            const w = new Date(); w.setDate(w.getDate() - 7); 
            fromStr = w.toISOString().slice(0, 10); 
            break; 
          }
          case 'month': { 
            const m = new Date(); m.setDate(m.getDate() - 30); 
            fromStr = m.toISOString().slice(0, 10); 
            break; 
          }
          case 'all': 
            fromStr = ''; 
            break;
        }

        if (fromStr) query.append('dateFrom', fromStr);
        if (dateRange !== 'all') query.append('dateTo', toStr);

        const res = await api.get(`/dashboard/stats?${query.toString()}`);
        const vehicleTypes = res.data?.data?.vehicleTypes || [];

        const p = { total: 0, items: [] as any[] };
        const s = { total: 0, items: [] as any[] };
        const o = { total: 0, items: [] as any[] };

        vehicleTypes.forEach((vt: any) => {
          const name = (vt.name || '').toLowerCase();
          const weight = vt.weight || 0;
          if (name.includes('primary')) {
            p.total += weight;
            p.items.push(vt);
          } else if (name.includes('secondary')) {
            s.total += weight;
            s.items.push(vt);
          } else {
            o.total += weight;
            o.items.push(vt);
          }
        });

        setPrimary(p);
        setSecondary(s);
        setOthers(o);
      } catch (error) {
        console.error('Failed to fetch vehicle category stats', error);
      } finally {
        setLoading(false);
      }
    };

    fetchCategoryStats();
  }, [dateRange]);

  return (
    <div className="bg-white border border-slate-300 rounded-sm shadow-sm flex flex-col h-full">
      <div className="p-4 border-b border-slate-100 flex justify-between items-center">
        <div className="flex items-center gap-2">
          <Truck className="h-4 w-4 text-slate-400" />
          <h3 className="text-sm font-semibold text-slate-800">{t('Collection by Category')}</h3>
        </div>
        
        <Select value={dateRange} onValueChange={setDateRange}>
          <SelectTrigger className="h-7 w-28 text-[10px] rounded-sm border-slate-300 font-medium bg-slate-50">
            <SelectValue placeholder="Date Filter" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="today">{t('Today')}</SelectItem>
            <SelectItem value="week">{t('Last 7 Days')}</SelectItem>
            <SelectItem value="month">{t('Last 30 Days')}</SelectItem>
            <SelectItem value="all">{t('All Time')}</SelectItem>
          </SelectContent>
        </Select>
      </div>
      
      <div className="p-4 flex-1 grid grid-cols-1 md:grid-cols-3 gap-6 relative min-h-[100px]">
        {loading && (
          <div className="absolute inset-0 bg-white/50 backdrop-blur-sm z-10 flex items-center justify-center rounded-b-sm">
            <div className="h-5 w-5 border-2 border-slate-300 border-t-slate-600 rounded-full animate-spin" />
          </div>
        )}
        
        {/* Primary Group */}
        <div className="flex flex-col bg-white rounded-sm border border-slate-200 overflow-hidden shadow-sm">
          <div className="p-4 bg-gradient-to-br from-indigo-500 to-indigo-600 flex flex-col items-center justify-center">
            <span className="text-xs font-bold text-indigo-100 uppercase tracking-wider">{t('Primary Total')}</span>
            <span className="text-2xl font-black text-white mt-1">{formatTon(primary.total)} <span className="text-[10px] font-bold text-indigo-200">TONS</span></span>
          </div>
          <div className="p-3 flex flex-col gap-2">
            {primary.items.length === 0 && <div className="text-[10px] text-slate-400 text-center py-2">No primary vehicles</div>}
            {primary.items.map((vt, i) => (
              <div key={i} className="flex justify-between items-center text-xs border-b border-slate-50 pb-1 last:border-0 last:pb-0">
                <span className="text-slate-600 font-medium truncate pr-2">{vt.name}</span>
                <span className="font-bold text-slate-800">{formatTon(vt.weight)}</span>
              </div>
            ))}
          </div>
        </div>
        
        {/* Secondary Group */}
        <div className="flex flex-col bg-white rounded-sm border border-slate-200 overflow-hidden shadow-sm">
          <div className="p-4 bg-gradient-to-br from-emerald-500 to-emerald-600 flex flex-col items-center justify-center">
            <span className="text-xs font-bold text-emerald-100 uppercase tracking-wider">{t('Secondary Total')}</span>
            <span className="text-2xl font-black text-white mt-1">{formatTon(secondary.total)} <span className="text-[10px] font-bold text-emerald-200">TONS</span></span>
          </div>
          <div className="p-3 flex flex-col gap-2">
            {secondary.items.length === 0 && <div className="text-[10px] text-slate-400 text-center py-2">No secondary vehicles</div>}
            {secondary.items.map((vt, i) => (
              <div key={i} className="flex justify-between items-center text-xs border-b border-slate-50 pb-1 last:border-0 last:pb-0">
                <span className="text-slate-600 font-medium truncate pr-2">{vt.name}</span>
                <span className="font-bold text-slate-800">{formatTon(vt.weight)}</span>
              </div>
            ))}
          </div>
        </div>
        
        {/* Others Group */}
        <div className="flex flex-col bg-white rounded-sm border border-slate-200 overflow-hidden shadow-sm">
          <div className="p-4 bg-gradient-to-br from-slate-600 to-slate-700 flex flex-col items-center justify-center">
            <span className="text-xs font-bold text-slate-300 uppercase tracking-wider">{t('Others')}</span>
            <span className="text-2xl font-black text-white mt-1">{formatTon(others.total)} <span className="text-[10px] font-bold text-slate-400">TONS</span></span>
          </div>
          <div className="p-3 flex flex-col gap-2">
            {others.items.length === 0 && <div className="text-[10px] text-slate-400 text-center py-2">No other vehicles</div>}
            {others.items.map((vt, i) => (
              <div key={i} className="flex justify-between items-center text-xs border-b border-slate-50 pb-1 last:border-0 last:pb-0">
                <span className="text-slate-600 font-medium truncate pr-2">{vt.name}</span>
                <span className="font-bold text-slate-800">{formatTon(vt.weight)}</span>
              </div>
            ))}
          </div>
        </div>

      </div>
    </div>
  );
}
