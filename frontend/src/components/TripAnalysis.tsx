import { useState, useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Search, RefreshCw, ChevronDown, ChevronRight, Truck } from 'lucide-react';
import api from '@/lib/api';
import { TableSkeleton } from '@/components/ui/LoadingSkeletons';

export default function TripAnalysis() {
  const { t } = useTranslation();
  const [slips, setSlips] = useState<any[]>([]);
  const [searchInput, setSearchInput] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  
  // Date Range Filter
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  const [loading, setLoading] = useState(false);
  const [expandedVehicles, setExpandedVehicles] = useState<Set<string>>(new Set());

  const fetchAllSlips = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        limit: '100000', // Fetch basically all slips for the period to do group analysis
      });
      if (searchQuery) params.append('search', searchQuery);
      if (dateFrom) params.append('dateFrom', dateFrom);
      if (dateTo) params.append('dateTo', dateTo);

      const res = await api.get(`/weighment?${params.toString()}`);
      if (res.data && res.data.data) {
        setSlips(res.data.data);
      } else if (Array.isArray(res.data)) {
        setSlips(res.data);
      }
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAllSlips();
  }, [searchQuery, dateFrom, dateTo]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setSearchQuery(searchInput);
  };

  const toggleVehicle = (vehicleNo: string) => {
    const newSet = new Set(expandedVehicles);
    if (newSet.has(vehicleNo)) {
      newSet.delete(vehicleNo);
    } else {
      newSet.add(vehicleNo);
    }
    setExpandedVehicles(newSet);
  };

  // Group by vehicle
  const vehicleStats = useMemo(() => {
    const map = new Map<string, {
      vehicleNo: string;
      trips: any[];
      totalGross: number;
      totalTare: number;
      totalNet: number;
    }>();

    slips.forEach(slip => {
      const vNo = slip.vehicle?.vehicleNumber || slip.vehicleNumber || 'Unknown Vehicle';
      if (!map.has(vNo)) {
        map.set(vNo, {
          vehicleNo: vNo,
          trips: [],
          totalGross: 0,
          totalTare: 0,
          totalNet: 0
        });
      }
      const data = map.get(vNo)!;
      data.trips.push(slip);
      data.totalGross += (slip.grossWeight || 0);
      data.totalTare += (slip.tareWeight || 0);
      data.totalNet += (slip.netWeight || 0);
    });

    // Sort trips inside each vehicle by time (oldest first)
    map.forEach(data => {
      data.trips.sort((a, b) => new Date(a.inTime || a.createdAt).getTime() - new Date(b.inTime || b.createdAt).getTime());
    });

    // Convert map to array and sort by total Net Weight desc
    return Array.from(map.values()).sort((a, b) => b.totalNet - a.totalNet);
  }, [slips]);

  const expandAll = () => {
    const allVehicles = new Set(vehicleStats.map(v => v.vehicleNo));
    setExpandedVehicles(allVehicles);
  };

  const collapseAll = () => {
    setExpandedVehicles(new Set());
  };

  return (
    <div className="space-y-6 flex flex-col h-[calc(100vh-6rem)]">
      <div className="flex justify-between items-end flex-shrink-0">
        <div>
          <h2 className="text-3xl font-bold tracking-tight text-slate-900">{t('Trip Analysis')}</h2>
          <p className="text-sm text-slate-500">{t('Vehicle-wise tracking of trips, timings, and weights.')}</p>
        </div>
        <Button variant="outline" size="sm" onClick={fetchAllSlips} disabled={loading} className="h-8 text-xs rounded-sm border-slate-300">
          <RefreshCw className={`h-3.5 w-3.5 mr-1 ${loading ? 'animate-spin' : ''}`} /> {t('Refresh')}
        </Button>
      </div>

      <div className="bg-white border border-slate-300 rounded-sm shadow-sm flex flex-col flex-1 min-h-0">
        {/* Toolbar */}
        <div className="p-3 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3 bg-slate-50 flex-shrink-0">
          <form onSubmit={handleSearch} className="flex gap-2 w-full md:w-auto">
            <div className="relative w-full md:w-64">
              <Search className="absolute left-2.5 top-2 h-4 w-4 text-slate-400" />
              <Input
                placeholder={t('Search vehicle...')}
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                className="pl-8 h-8 text-xs rounded-sm border-slate-300 w-full"
              />
            </div>
            <Button type="submit" size="sm" className="h-8 text-xs rounded-sm bg-slate-800 hover:bg-slate-700 text-white px-4">
              {t('Search')}
            </Button>
          </form>

          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] text-slate-500 font-semibold uppercase">{t('Date Range')}:</span>
              <Input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} className="h-8 w-36 text-xs rounded-sm border-slate-300" />
              <span className="text-[10px] text-slate-400">{t('to')}</span>
              <Input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} className="h-8 w-36 text-xs rounded-sm border-slate-300" />
            </div>
          </div>
        </div>

        {/* Header Stats */}
        <div className="flex items-center gap-6 px-4 py-2 border-b border-slate-200 bg-slate-100 text-xs flex-shrink-0 justify-between">
          <div className="flex gap-6">
            <span className="text-slate-600 font-medium">{t('Total Vehicles')}: <span className="font-bold text-slate-800">{vehicleStats.length}</span></span>
            <span className="text-slate-300">|</span>
            <span className="text-slate-600 font-medium">{t('Total Trips')}: <span className="font-bold text-slate-800">{slips.length}</span></span>
            <span className="text-slate-300">|</span>
            <span className="text-slate-600 font-medium">{t('Total Net Wt')}: <span className="font-bold text-green-700">{vehicleStats.reduce((a, b) => a + b.totalNet, 0).toLocaleString()} KG</span></span>
          </div>
          <div className="flex gap-2">
            <Button variant="ghost" size="sm" onClick={expandAll} className="h-6 text-[10px] px-2 text-slate-600">Expand All</Button>
            <Button variant="ghost" size="sm" onClick={collapseAll} className="h-6 text-[10px] px-2 text-slate-600">Collapse All</Button>
          </div>
        </div>

        {/* Table Area */}
        <div className="flex-1 overflow-auto bg-slate-50 p-4">
          {loading ? (
            <TableSkeleton />
          ) : vehicleStats.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-slate-400">
              <Truck className="h-12 w-12 mb-2 opacity-20" />
              <p>{t('No trips found for the selected criteria')}</p>
            </div>
          ) : (
            <div className="space-y-3">
              {vehicleStats.map((stat) => {
                const isExpanded = expandedVehicles.has(stat.vehicleNo);
                return (
                  <div key={stat.vehicleNo} className="bg-white border border-slate-200 rounded-md shadow-sm overflow-hidden">
                    {/* Vehicle Header */}
                    <div 
                      className={`flex items-center justify-between p-3 cursor-pointer hover:bg-slate-50 transition-colors ${isExpanded ? 'border-b border-slate-100 bg-slate-50/50' : ''}`}
                      onClick={() => toggleVehicle(stat.vehicleNo)}
                    >
                      <div className="flex items-center gap-3">
                        <div className="p-1 bg-slate-100 rounded text-slate-500">
                          {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                        </div>
                        <h3 className="font-bold text-slate-800">{stat.vehicleNo}</h3>
                        <span className="px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 text-[10px] font-bold">
                          {stat.trips.length} {stat.trips.length === 1 ? 'Trip' : 'Trips'}
                        </span>
                      </div>
                      <div className="flex items-center gap-6 text-xs mr-2">
                        <div className="text-right">
                          <p className="text-[10px] text-slate-400 font-semibold uppercase">{t('Gross Wt')}</p>
                          <p className="font-bold text-slate-700">{stat.totalGross.toLocaleString()} <span className="text-[9px] font-normal">KG</span></p>
                        </div>
                        <div className="text-right">
                          <p className="text-[10px] text-slate-400 font-semibold uppercase">{t('Tare Wt')}</p>
                          <p className="font-bold text-slate-700">{stat.totalTare.toLocaleString()} <span className="text-[9px] font-normal">KG</span></p>
                        </div>
                        <div className="text-right">
                          <p className="text-[10px] text-green-600/80 font-semibold uppercase">{t('Net Wt')}</p>
                          <p className="font-bold text-green-700 text-sm">{stat.totalNet.toLocaleString()} <span className="text-[9px] font-normal text-green-600">KG</span></p>
                        </div>
                      </div>
                    </div>

                    {/* Expanded Trips Table */}
                    {isExpanded && (
                      <div className="p-0 bg-slate-50/50">
                        <Table>
                          <TableHeader>
                            <TableRow className="bg-slate-100/50 border-b-slate-200">
                              <TableHead className="w-12 text-center text-[10px] uppercase font-bold text-slate-500 h-8 p-2">#</TableHead>
                              <TableHead className="text-[10px] uppercase font-bold text-slate-500 h-8 p-2">{t('Slip No')}</TableHead>
                              <TableHead className="text-[10px] uppercase font-bold text-slate-500 h-8 p-2">{t('Date & Time')}</TableHead>
                              <TableHead className="text-[10px] uppercase font-bold text-slate-500 h-8 p-2">{t('Material')}</TableHead>
                              <TableHead className="text-right text-[10px] uppercase font-bold text-slate-500 h-8 p-2">{t('Gross Wt')}</TableHead>
                              <TableHead className="text-right text-[10px] uppercase font-bold text-slate-500 h-8 p-2">{t('Tare Wt')}</TableHead>
                              <TableHead className="text-right text-[10px] uppercase font-bold text-slate-500 h-8 p-2">{t('Net Wt')}</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {stat.trips.map((trip, idx) => (
                              <TableRow key={trip.id} className="border-b-slate-100 hover:bg-slate-100/50 transition-colors">
                                <TableCell className="text-center text-xs text-slate-400 font-medium p-2">{idx + 1}</TableCell>
                                <TableCell className="font-medium text-xs text-slate-700 p-2">{trip.slipNumber}</TableCell>
                                <TableCell className="text-xs text-slate-600 p-2">
                                  {new Date(trip.inTime || trip.createdAt).toLocaleString('en-IN', {
                                    day: '2-digit', month: 'short', year: 'numeric',
                                    hour: '2-digit', minute: '2-digit'
                                  })}
                                </TableCell>
                                <TableCell className="text-xs text-slate-600 p-2">{trip.material?.name || '-'}</TableCell>
                                <TableCell className="text-right text-xs font-medium text-slate-700 p-2">{trip.grossWeight?.toLocaleString()} KG</TableCell>
                                <TableCell className="text-right text-xs font-medium text-slate-700 p-2">{trip.tareWeight?.toLocaleString()} KG</TableCell>
                                <TableCell className="text-right text-xs font-bold text-green-700 p-2">{trip.netWeight?.toLocaleString()} KG</TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
