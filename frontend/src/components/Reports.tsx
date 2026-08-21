import { useState, useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Printer, Search, Download, RefreshCw, FileText, Calendar, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, Trash2 } from 'lucide-react';
import api from '@/lib/api';
import PrintSlip from './PrintSlip';
import { useToast } from '@/hooks/use-toast';
import { TableSkeleton } from '@/components/ui/LoadingSkeletons';

export default function Reports() {
  const { t } = useTranslation();
  const [slips, setSlips] = useState<any[]>([]);
  const [searchInput, setSearchInput] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSlipToPrint, setSelectedSlipToPrint] = useState<any>(null);
  const [isGreenAssistFormat, setIsGreenAssistFormat] = useState(false);

  // Date Range Filter
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  // Pagination & Server Data
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [totalRecords, setTotalRecords] = useState(0);
  const { toast } = useToast();
  const userRole = localStorage.getItem('role') || 'operator';
  const [loading, setLoading] = useState(true);

  const fetchSlips = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: currentPage.toString(),
        limit: pageSize.toString(),
      });
      if (searchQuery) params.append('search', searchQuery);
      if (dateFrom) params.append('dateFrom', dateFrom);
      if (dateTo) params.append('dateTo', dateTo);

      const res = await api.get(`/weighment?${params.toString()}`);
      if (res.data && res.data.data) {
        setSlips(res.data.data);
        setTotalRecords(res.data.total || 0);
      } else if (Array.isArray(res.data)) {
        // Fallback for older API without pagination
        setSlips(res.data);
        setTotalRecords(res.data.length);
      }
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const handler = setTimeout(() => {
      setSearchQuery(searchInput);
    }, 500);
    return () => clearTimeout(handler);
  }, [searchInput]);

  useEffect(() => {
    fetchSlips();
  }, [currentPage, pageSize, searchQuery, dateFrom, dateTo]);

  // Filtered Data is now provided directly by the backend (slips)
  const paginatedSlips = slips;

  // Pagination Logic
  const totalPages = Math.max(1, Math.ceil(totalRecords / pageSize));
  const safeCurrentPage = Math.min(currentPage, totalPages);

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, dateFrom, dateTo, pageSize]);

  // Summary Stats
  const summaryStats = useMemo(() => {
    const totalNet = paginatedSlips.reduce((sum, s) => sum + (s.netWeight || 0), 0);
    const totalGross = paginatedSlips.reduce((sum, s) => sum + (s.grossWeight || 0), 0);
    // Since we only have current page data, these stats are only for the current page
    return { totalNet, totalGross, count: totalRecords };
  }, [paginatedSlips, totalRecords]);

  const [syncState, setSyncState] = useState<{ isSyncing: boolean, initialCount: number, currentCount: number }>({ isSyncing: false, initialCount: 0, currentCount: 0 });

  const handleForceSync = async () => {
    try {
      // 1. Get initial count
      const statusRes = await api.get('/system/sync-status');
      const initialCount = statusRes.data.pendingCount || 0;
      
      if (initialCount === 0) {
        toast({ title: 'Sync Data', description: 'All data is already synced.' });
        return;
      }

      setSyncState({ isSyncing: true, initialCount, currentCount: initialCount });
      
      // 2. Trigger sync
      await api.post('/system/sync-force');
      
      toast({
        title: 'Sync Triggered',
        description: `Starting sync of ${initialCount} records...`,
      });

      // 3. Poll for progress
      const interval = setInterval(async () => {
        try {
          const res = await api.get('/system/sync-status');
          const currentPending = res.data.pendingCount || 0;
          
          setSyncState(prev => ({ ...prev, currentCount: currentPending }));

          if (currentPending === 0) {
            clearInterval(interval);
            setSyncState({ isSyncing: false, initialCount: 0, currentCount: 0 });
            toast({
              title: 'Sync Complete',
              description: 'All records have been synced successfully.',
              className: 'bg-green-500 text-white border-none'
            });
          }
        } catch (e) {
          // Ignore polling errors, just wait for next tick
        }
      }, 2500);

    } catch (error) {
      toast({
        title: 'Sync Failed',
        description: 'Could not trigger sync process.',
        variant: 'destructive',
      });
      setSyncState({ isSyncing: false, initialCount: 0, currentCount: 0 });
    }
  };

  const handleExportCSV = async () => {
    if (totalRecords === 0) return;
    try {
      // Fetch all records for export (temporarily ignoring pagination, but respecting filters)
      const params = new URLSearchParams({ page: '1', limit: '1000000' });
      if (searchQuery) params.append('search', searchQuery);
      if (dateFrom) params.append('dateFrom', dateFrom);
      if (dateTo) params.append('dateTo', dateTo);
      const res = await api.get(`/weighment?${params.toString()}`);
      const exportSlips = res.data?.data || res.data || [];

      const standardHeaders = ['S.NO.', 'RECEIPT NO.', 'DATE', 'VEHICLE', 'WARD', 'VEHICLE TYPE', 'GROSS WEIGHT', 'TARE WEIGHT', 'NET WEIGHT', 'OPERATOR', 'TIME'];
      const greenAssistHeaders = ['S.No.', 'Zone Name', 'Ward Name', 'Vehicle Number', 'Gross Weight (Kg)', 'Tare Weight (Kg)', 'Net Weight (Kg)', 'Content Type', 'Date Of Weighment', 'Receipt Number', 'Vehicle Type', 'Weighbridge Party Name', 'Date of Entry', 'Time of Entry', 'Driver Name', 'Driver Mobile Number', 'Supervisor Name', 'Supervisor Display ID', 'Supervisor Contact Number', 'Zone In-Charge Name', 'In Date', 'In Time', 'Out Date', 'Out Time'];
      
      const headers = isGreenAssistFormat ? greenAssistHeaders : standardHeaders;
      
      const csvContent = [
        headers.join(','),
        ...exportSlips.map((s: any, index: number) => {
          const d = new Date(s.date);
          const dateStr = d.toLocaleDateString('en-IN');
          const timeStr = d.toLocaleTimeString('en-IN');
          const wardName = `"${(s.source?.name || '').replace(/"/g, '""')}"`;
          const vehicleNumber = s.vehicle?.vehicleNumber || '';
          const vehicleType = `"${(s.vehicleType?.name || s.vehicle?.vehicleType?.name || '').replace(/"/g, '""')}"`;
          
          if (isGreenAssistFormat) {
            return [
              index + 1,
              '', // Zone Name
              wardName, // Ward Name
              vehicleNumber,
              s.grossWeight,
              s.tareWeight,
              s.netWeight,
              `"${(s.material?.name || '').replace(/"/g, '""')}"`, // Content Type
              dateStr, // Date of Weighment
              s.slipNumber,
              vehicleType,
              '', // Weighbridge Party Name
              dateStr, // Date of Entry
              timeStr, // Time of Entry
              `"${(s.driverName || '').replace(/"/g, '""')}"`, // Driver Name
              s.vehicle?.mobile || '', // Driver Mobile Number
              `"${(s.operator?.username || '').replace(/"/g, '""')}"`, // Supervisor Name (Operator)
              '', // Supervisor Display ID
              '', // Supervisor Contact Number
              '', // Zone In-Charge Name
              dateStr, // In Date
              timeStr, // In Time
              dateStr, // Out Date
              timeStr // Out Time
            ].join(',');
          }

          return [
            index + 1,
            s.slipNumber,
            dateStr,
            vehicleNumber,
            wardName,
            vehicleType,
            s.grossWeight,
            s.tareWeight,
            s.netWeight,
            `"${(s.operator?.username || '').replace(/"/g, '""')}"`, // Operator
            timeStr
          ].join(',');
        })
    ].join('\n');
    
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `slips_${new Date().toISOString().slice(0, 10)}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    } catch (e) {
      console.error(e);
      toast({ title: 'Export Failed', variant: 'destructive' });
    }
  };

  const handlePrint = (slip: any) => {
    setSelectedSlipToPrint(slip);
    setTimeout(() => {
      window.print();
    }, 100);
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this slip? This action cannot be undone.')) return;
    try {
      await api.delete(`/weighment/${id}`);
      toast({ title: 'Slip deleted successfully' });
      fetchSlips();
    } catch (error: any) {
      toast({ 
        title: 'Error deleting slip', 
        description: error.response?.data?.error || 'Unknown error occurred',
        variant: 'destructive' 
      });
    }
  };

  const handleClearFilters = () => {
    setSearchInput('');
    setSearchQuery('');
    setDateFrom('');
    setDateTo('');
    setCurrentPage(1);
  };

  const setQuickDateRange = (range: 'today' | 'week' | 'month' | 'all') => {
    const now = new Date();
    const toStr = now.toISOString().slice(0, 10);
    
    switch (range) {
      case 'today':
        setDateFrom(toStr);
        setDateTo(toStr);
        break;
      case 'week': {
        const weekAgo = new Date();
        weekAgo.setDate(weekAgo.getDate() - 7);
        setDateFrom(weekAgo.toISOString().slice(0, 10));
        setDateTo(toStr);
        break;
      }
      case 'month': {
        const monthAgo = new Date();
        monthAgo.setDate(monthAgo.getDate() - 30);
        setDateFrom(monthAgo.toISOString().slice(0, 10));
        setDateTo(toStr);
        break;
      }
      case 'all':
        setDateFrom('');
        setDateTo('');
        break;
    }
  };

  // Generate page numbers to display
  const getPageNumbers = () => {
    const pages: (number | string)[] = [];
    if (totalPages <= 7) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
    } else {
      pages.push(1);
      if (safeCurrentPage > 3) pages.push('...');
      for (let i = Math.max(2, safeCurrentPage - 1); i <= Math.min(totalPages - 1, safeCurrentPage + 1); i++) {
        pages.push(i);
      }
      if (safeCurrentPage < totalPages - 2) pages.push('...');
      pages.push(totalPages);
    }
    return pages;
  };

  return (
    <>
      <PrintSlip slip={selectedSlipToPrint} />
      <div className="flex flex-col h-full space-y-4 no-print">
        <div className="flex justify-between items-end">
          <div>
            <h2 className="text-2xl font-bold tracking-tight text-slate-900">{t('Slip History')}</h2>
            <p className="text-sm text-slate-500">{t('View and reprint historical weighment slips.')}</p>
          </div>
        </div>

        <div className="flex flex-col flex-1 bg-white border border-slate-300 rounded-sm shadow-sm overflow-hidden">
          
          {/* Toolbar Row 1: Search + Actions */}
          <div className="flex justify-between items-center p-2 border-b border-slate-300 bg-slate-50">
            <div className="flex items-center gap-2">
              <div className="relative">
                <Search className="absolute left-2.5 top-2 h-4 w-4 text-slate-500" />
                <Input 
                  placeholder={t('Search slips...')} 
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                  className="h-8 w-64 pl-8 text-xs bg-white rounded-sm border-slate-300 focus-visible:ring-green-500" 
                />
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button 
                onClick={handleForceSync} 
                size="sm" 
                className={`h-8 text-xs rounded-sm ${syncState.isSyncing ? 'bg-slate-400 text-white cursor-not-allowed' : 'bg-green-600 hover:bg-green-700 text-white'}`}
                disabled={syncState.isSyncing}
              >
                <RefreshCw className={`h-3.5 w-3.5 mr-1 ${syncState.isSyncing ? 'animate-spin' : ''}`} /> 
                {syncState.isSyncing 
                  ? `Syncing ${Math.max(0, Math.min(100, Math.round(((syncState.initialCount - syncState.currentCount) / (syncState.initialCount || 1)) * 100)))}%` 
                  : t('Sync Data')}
              </Button>
              <Button variant="outline" size="sm" className="h-8 text-xs rounded-sm border-slate-300" onClick={fetchSlips}>
                <RefreshCw className="h-3.5 w-3.5 mr-1" /> {t('Refresh')}
              </Button>
              <div className="flex items-center ml-2 mr-1 gap-1.5">
                <input 
                  type="checkbox" 
                  id="greenAssistToggle"
                  checked={isGreenAssistFormat} 
                  onChange={(e) => setIsGreenAssistFormat(e.target.checked)} 
                  className="h-3.5 w-3.5 accent-green-600 rounded cursor-pointer"
                />
                <label htmlFor="greenAssistToggle" className="text-xs font-medium text-slate-600 cursor-pointer">
                  Green Assist Format
                </label>
              </div>
              <Button variant="outline" size="sm" className="h-8 text-xs rounded-sm border-slate-300 bg-green-50 hover:bg-green-100 text-green-700 border-green-200" onClick={handleExportCSV}>
                <Download className="h-3.5 w-3.5 mr-1" /> {t('Export CSV')}
              </Button>
            </div>
          </div>
          
          {/* Toolbar Row 2: Date Range Filter */}
          <div className="flex flex-wrap items-center gap-2 p-2 border-b border-slate-200 bg-white">
            <Calendar className="h-4 w-4 text-slate-400 ml-1" />
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">{t('Date Range')}:</span>
            <Input 
              type="date" 
              value={dateFrom} 
              onChange={(e) => setDateFrom(e.target.value)} 
              className="h-7 w-36 text-xs rounded-sm border-slate-300"
            />
            <span className="text-xs text-slate-400">{t('to')}</span>
            <Input 
              type="date" 
              value={dateTo} 
              onChange={(e) => setDateTo(e.target.value)} 
              className="h-7 w-36 text-xs rounded-sm border-slate-300"
            />
            <div className="h-5 border-l border-slate-200 mx-1" />
            <Button variant="outline" size="sm" className={`h-7 px-2 text-[10px] rounded-sm ${!dateFrom && !dateTo ? 'bg-green-50 border-green-300 text-green-700' : 'border-slate-300'}`} onClick={() => setQuickDateRange('all')}>
              {t('All')}
            </Button>
            <Button variant="outline" size="sm" className={`h-7 px-2 text-[10px] rounded-sm ${dateFrom === new Date().toISOString().slice(0,10) && dateTo === new Date().toISOString().slice(0,10) ? 'bg-green-50 border-green-300 text-green-700' : 'border-slate-300'}`} onClick={() => setQuickDateRange('today')}>
              {t('Today')}
            </Button>
            <Button variant="outline" size="sm" className="h-7 px-2 text-[10px] rounded-sm border-slate-300" onClick={() => setQuickDateRange('week')}>
              {t('Last 7 Days')}
            </Button>
            <Button variant="outline" size="sm" className="h-7 px-2 text-[10px] rounded-sm border-slate-300" onClick={() => setQuickDateRange('month')}>
              {t('Last 30 Days')}
            </Button>
            {(dateFrom || dateTo || searchQuery) && (
              <Button variant="ghost" size="sm" className="h-7 px-2 text-[10px] rounded-sm text-red-500 hover:text-red-600" onClick={handleClearFilters}>
                {t('Clear Filters')}
              </Button>
            )}
          </div>

          {/* Summary Stats Bar */}
          <div className="flex items-center gap-6 px-3 py-1.5 border-b border-slate-200 bg-green-50/50 text-xs">
            <span className="text-slate-500 font-medium">{t('Filtered Results')}:</span>
            <span className="font-bold text-slate-700">{summaryStats.count} {t('slips')}</span>
            <span className="text-slate-300">|</span>
            <span className="text-slate-500">{t('Total Gross')}: <span className="font-bold text-slate-700">{summaryStats.totalGross.toLocaleString()} KG</span></span>
            <span className="text-slate-300">|</span>
            <span className="text-slate-500">{t('Total Net')}: <span className="font-bold text-green-700">{summaryStats.totalNet.toLocaleString()} KG</span></span>
          </div>
          
          {/* Table */}
          <div className="flex-1 overflow-auto">
            <Table>
              <TableHeader className="sticky top-0 z-10 shadow-sm">
                <TableRow className="bg-[#92D050] hover:bg-[#92D050]">
                  <TableHead colSpan={isGreenAssistFormat ? 8 : 4} className="h-8 py-1 px-3 text-xs font-bold text-black border border-slate-400 text-center uppercase">NATURE GREEN WASTE COLLECTION REPORT</TableHead>
                  <TableHead colSpan={isGreenAssistFormat ? 8 : 3} className="h-8 py-1 px-3 text-xs font-bold text-black border border-slate-400 text-center uppercase">NO. OF RECEIPTS - {summaryStats.count}</TableHead>
                  <TableHead colSpan={isGreenAssistFormat ? 9 : 4} className="h-8 py-1 px-3 text-xs font-bold text-black border border-slate-400 text-center uppercase">
                    DATED: {(() => {
                      if (dateFrom && dateTo) {
                        if (dateFrom === dateTo) {
                          return new Date(dateFrom).toLocaleDateString('en-GB', {day: '2-digit', month: '2-digit', year: 'numeric'}).replace(/\//g, '-');
                        }
                        const fromStr = new Date(dateFrom).toLocaleDateString('en-GB', {day: '2-digit', month: '2-digit', year: 'numeric'}).replace(/\//g, '-');
                        const toStr = new Date(dateTo).toLocaleDateString('en-GB', {day: '2-digit', month: '2-digit', year: 'numeric'}).replace(/\//g, '-');
                        return `${fromStr} TO ${toStr}`;
                      } else if (dateFrom) {
                        const fromStr = new Date(dateFrom).toLocaleDateString('en-GB', {day: '2-digit', month: '2-digit', year: 'numeric'}).replace(/\//g, '-');
                        return `${fromStr} ONWARDS`;
                      } else if (dateTo) {
                        const toStr = new Date(dateTo).toLocaleDateString('en-GB', {day: '2-digit', month: '2-digit', year: 'numeric'}).replace(/\//g, '-');
                        return `UP TO ${toStr}`;
                      }
                      return new Date().toLocaleDateString('en-GB', {day: '2-digit', month: '2-digit', year: 'numeric'}).replace(/\//g, '-');
                    })()}
                  </TableHead>
                </TableRow>
                <TableRow className="bg-[#FFC000] hover:bg-[#FFC000]">
                  {isGreenAssistFormat ? (
                    <>
                      <TableHead className="h-8 py-1 px-3 text-xs font-bold text-black border border-slate-400 w-16 text-center">{t('S.No.')}</TableHead>
                      <TableHead className="h-8 py-1 px-3 text-xs font-bold text-black border border-slate-400 text-center">{t('Zone Name')}</TableHead>
                      <TableHead className="h-8 py-1 px-3 text-xs font-bold text-black border border-slate-400 text-center">{t('Ward Name')}</TableHead>
                      <TableHead className="h-8 py-1 px-3 text-xs font-bold text-black border border-slate-400 text-center">{t('Vehicle Number')}</TableHead>
                      <TableHead className="h-8 py-1 px-3 text-xs font-bold text-black border border-slate-400 text-center">{t('Gross Weight (Kg)')}</TableHead>
                      <TableHead className="h-8 py-1 px-3 text-xs font-bold text-black border border-slate-400 text-center">{t('Tare Weight (Kg)')}</TableHead>
                      <TableHead className="h-8 py-1 px-3 text-xs font-bold text-black border border-slate-400 text-center">{t('Net Weight (Kg)')}</TableHead>
                      <TableHead className="h-8 py-1 px-3 text-xs font-bold text-black border border-slate-400 text-center">{t('Content Type')}</TableHead>
                      <TableHead className="h-8 py-1 px-3 text-xs font-bold text-black border border-slate-400 text-center">{t('Date Of Weighment')}</TableHead>
                      <TableHead className="h-8 py-1 px-3 text-xs font-bold text-black border border-slate-400 text-center">{t('Receipt Number')}</TableHead>
                      <TableHead className="h-8 py-1 px-3 text-xs font-bold text-black border border-slate-400 text-center">{t('Vehicle Type')}</TableHead>
                      <TableHead className="h-8 py-1 px-3 text-xs font-bold text-black border border-slate-400 text-center">{t('Weighbridge Party Name')}</TableHead>
                      <TableHead className="h-8 py-1 px-3 text-xs font-bold text-black border border-slate-400 text-center">{t('Date of Entry')}</TableHead>
                      <TableHead className="h-8 py-1 px-3 text-xs font-bold text-black border border-slate-400 text-center">{t('Time of Entry')}</TableHead>
                      <TableHead className="h-8 py-1 px-3 text-xs font-bold text-black border border-slate-400 text-center">{t('Driver Name')}</TableHead>
                      <TableHead className="h-8 py-1 px-3 text-xs font-bold text-black border border-slate-400 text-center">{t('Driver Mobile Number')}</TableHead>
                      <TableHead className="h-8 py-1 px-3 text-xs font-bold text-black border border-slate-400 text-center">{t('Supervisor Name')}</TableHead>
                      <TableHead className="h-8 py-1 px-3 text-xs font-bold text-black border border-slate-400 text-center">{t('Supervisor Display ID')}</TableHead>
                      <TableHead className="h-8 py-1 px-3 text-xs font-bold text-black border border-slate-400 text-center">{t('Supervisor Contact Number')}</TableHead>
                      <TableHead className="h-8 py-1 px-3 text-xs font-bold text-black border border-slate-400 text-center">{t('Zone In-Charge Name')}</TableHead>
                      <TableHead className="h-8 py-1 px-3 text-xs font-bold text-black border border-slate-400 text-center">{t('In Date')}</TableHead>
                      <TableHead className="h-8 py-1 px-3 text-xs font-bold text-black border border-slate-400 text-center">{t('In Time')}</TableHead>
                      <TableHead className="h-8 py-1 px-3 text-xs font-bold text-black border border-slate-400 text-center">{t('Out Date')}</TableHead>
                      <TableHead className="h-8 py-1 px-3 text-xs font-bold text-black border border-slate-400 text-center">{t('Out Time')}</TableHead>
                      <TableHead className="h-8 py-1 px-3 text-xs font-bold text-black border border-slate-400 text-center">{t('ACTIONS')}</TableHead>
                    </>
                  ) : (
                    <>
                      <TableHead className="h-8 py-1 px-3 text-xs font-bold text-black border border-slate-400 w-16 text-center">{t('S.NO.')}</TableHead>
                      <TableHead className="h-8 py-1 px-3 text-xs font-bold text-black border border-slate-400 text-center">{t('RECEIPT NO.')}</TableHead>
                      <TableHead className="h-8 py-1 px-3 text-xs font-bold text-black border border-slate-400 text-center">{t('DATE')}</TableHead>
                      <TableHead className="h-8 py-1 px-3 text-xs font-bold text-black border border-slate-400 text-center">{t('VEHICLE')}</TableHead>
                      <TableHead className="h-8 py-1 px-3 text-xs font-bold text-black border border-slate-400 text-center">{t('WARD')}</TableHead>
                      <TableHead className="h-8 py-1 px-3 text-xs font-bold text-black border border-slate-400 text-center">{t('VEHICLE TYPE')}</TableHead>
                      <TableHead className="h-8 py-1 px-3 text-xs font-bold text-black border border-slate-400 text-center">{t('GROSS WEIGHT')}</TableHead>
                      <TableHead className="h-8 py-1 px-3 text-xs font-bold text-black border border-slate-400 text-center">{t('TARE WEIGHT')}</TableHead>
                      <TableHead className="h-8 py-1 px-3 text-xs font-bold text-black border border-slate-400 text-center">{t('NET WEIGHT')}</TableHead>
                      <TableHead className="h-8 py-1 px-3 text-xs font-bold text-black border border-slate-400 text-center">{t('OPERATOR')}</TableHead>
                      <TableHead className="h-8 py-1 px-3 text-xs font-bold text-black border border-slate-400 text-center">{t('TIME')}</TableHead>
                      <TableHead className="h-8 py-1 px-3 text-xs font-bold text-black border border-slate-400 text-center">{t('ACTIONS')}</TableHead>
                    </>
                  )}
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={isGreenAssistFormat ? 25 : 12} className="p-4">
                      <TableSkeleton rows={10} />
                    </TableCell>
                  </TableRow>
                ) : paginatedSlips.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={isGreenAssistFormat ? 25 : 12} className="text-center py-6 text-slate-500">
                      <div className="flex flex-col items-center justify-center">
                        <FileText className="h-8 w-8 text-slate-300 mb-2" />
                        <p>{t('No weighment slips found. Generate a slip first.')}</p>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  paginatedSlips.map((s, index) => {
                    const d = new Date(s.date);
                    const dateStr = d.toLocaleDateString('en-IN');
                    const timeStr = d.toLocaleTimeString('en-IN', { timeStyle: 'short' });
                    
                    return (
                      <TableRow key={s.id} className="hover:bg-blue-50/50 transition-colors">
                        {isGreenAssistFormat ? (
                          <>
                            <TableCell className="py-1.5 px-3 text-xs text-black border border-slate-300 text-center">{(safeCurrentPage - 1) * pageSize + index + 1}</TableCell>
                            <TableCell className="py-1.5 px-3 text-xs text-black border border-slate-300 text-center"></TableCell>
                            <TableCell className="py-1.5 px-3 text-xs text-black border border-slate-300 text-center">{s.source?.name || ''}</TableCell>
                            <TableCell className="py-1.5 px-3 text-xs text-black border border-slate-300 text-center">{s.vehicle?.vehicleNumber || ''}</TableCell>
                            <TableCell className="py-1.5 px-3 text-xs text-black border border-slate-300 text-center">{s.grossWeight}</TableCell>
                            <TableCell className="py-1.5 px-3 text-xs text-black border border-slate-300 text-center">{s.tareWeight}</TableCell>
                            <TableCell className="py-1.5 px-3 text-xs text-black border border-slate-300 text-center">{s.netWeight}</TableCell>
                            <TableCell className="py-1.5 px-3 text-xs text-black border border-slate-300 text-center">{s.material?.name || ''}</TableCell>
                            <TableCell className="py-1.5 px-3 text-xs text-black border border-slate-300 text-center whitespace-nowrap">{dateStr}</TableCell>
                            <TableCell className="py-1.5 px-3 text-xs text-black border border-slate-300 text-center whitespace-nowrap">{s.slipNumber}</TableCell>
                            <TableCell className="py-1.5 px-3 text-xs text-black border border-slate-300 text-center">{s.vehicleType?.name || s.vehicle?.vehicleType?.name || ''}</TableCell>
                            <TableCell className="py-1.5 px-3 text-xs text-black border border-slate-300 text-center"></TableCell>
                            <TableCell className="py-1.5 px-3 text-xs text-black border border-slate-300 text-center whitespace-nowrap">{dateStr}</TableCell>
                            <TableCell className="py-1.5 px-3 text-xs text-black border border-slate-300 text-center whitespace-nowrap">{timeStr}</TableCell>
                            <TableCell className="py-1.5 px-3 text-xs text-black border border-slate-300 text-center">{s.driverName || ''}</TableCell>
                            <TableCell className="py-1.5 px-3 text-xs text-black border border-slate-300 text-center">{s.vehicle?.mobile || ''}</TableCell>
                            <TableCell className="py-1.5 px-3 text-xs text-black border border-slate-300 text-center">{s.operator?.username || ''}</TableCell>
                            <TableCell className="py-1.5 px-3 text-xs text-black border border-slate-300 text-center"></TableCell>
                            <TableCell className="py-1.5 px-3 text-xs text-black border border-slate-300 text-center"></TableCell>
                            <TableCell className="py-1.5 px-3 text-xs text-black border border-slate-300 text-center"></TableCell>
                            <TableCell className="py-1.5 px-3 text-xs text-black border border-slate-300 text-center whitespace-nowrap">{dateStr}</TableCell>
                            <TableCell className="py-1.5 px-3 text-xs text-black border border-slate-300 text-center whitespace-nowrap">{timeStr}</TableCell>
                            <TableCell className="py-1.5 px-3 text-xs text-black border border-slate-300 text-center whitespace-nowrap">{dateStr}</TableCell>
                            <TableCell className="py-1.5 px-3 text-xs text-black border border-slate-300 text-center whitespace-nowrap">{timeStr}</TableCell>
                          </>
                        ) : (
                          <>
                            <TableCell className="py-1.5 px-3 text-xs text-black border border-slate-300 text-center">{(safeCurrentPage - 1) * pageSize + index + 1}</TableCell>
                            <TableCell className="py-1.5 px-3 text-xs font-medium text-black border border-slate-300 text-center">{s.slipNumber}</TableCell>
                            <TableCell className="py-1.5 px-3 text-xs text-black border border-slate-300 text-center whitespace-nowrap">{d.toLocaleDateString()}</TableCell>
                            <TableCell className="py-1.5 px-3 text-xs font-medium text-black border border-slate-300 text-center">{s.vehicle?.vehicleNumber || 'N/A'}</TableCell>
                            <TableCell className="py-1.5 px-3 text-xs text-black border border-slate-300 text-center">{s.source?.name || 'N/A'}</TableCell>
                            <TableCell className="py-1.5 px-3 text-xs text-black border border-slate-300 text-center truncate max-w-[150px]">{s.vehicleType?.name || s.vehicle?.vehicleType?.name || 'N/A'}</TableCell>
                            <TableCell className="py-1.5 px-3 text-xs text-black border border-slate-300 text-center">{s.grossWeight}</TableCell>
                            <TableCell className="py-1.5 px-3 text-xs text-black border border-slate-300 text-center">{s.tareWeight}</TableCell>
                            <TableCell className="py-1.5 px-3 text-xs font-bold text-black border border-slate-300 text-center bg-blue-50/30">{s.netWeight}</TableCell>
                            <TableCell className="py-1.5 px-3 text-xs font-medium text-black border border-slate-300 text-center text-slate-600 bg-slate-50">{s.operator?.username || 'N/A'}</TableCell>
                            <TableCell className="py-1.5 px-3 text-xs text-black border border-slate-300 text-center whitespace-nowrap">{timeStr}</TableCell>
                          </>
                        )}
                        <TableCell className="py-1.5 px-3 border border-slate-300 text-center">
                          <div className="flex justify-end gap-1">
                            <Button variant="ghost" size="sm" className="h-6 px-2 text-[10px] uppercase font-bold text-blue-600 hover:bg-blue-100 rounded-sm" onClick={() => handlePrint(s)}>
                              <Printer className="h-3 w-3 mr-1" /> {t('Print')}
                            </Button>
                            {userRole === 'admin' && (
                              <Button variant="ghost" size="sm" className="h-6 px-2 text-[10px] uppercase font-bold text-red-600 hover:bg-red-100 rounded-sm" onClick={() => handleDelete(s.id)}>
                                <Trash2 className="h-3 w-3 mr-1" /> {t('Delete')}
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>
          
          {/* Pagination Footer */}
          <div className="flex items-center justify-between p-2 border-t border-slate-300 bg-slate-50 text-xs text-slate-500">
            <div className="flex items-center gap-2">
              <span>{t('Showing')} {totalRecords > 0 ? ((safeCurrentPage - 1) * pageSize) + 1 : 0}-{Math.min(safeCurrentPage * pageSize, totalRecords)} {t('of')} {totalRecords} {t('records')}</span>
              <div className="h-4 border-l border-slate-200 mx-1" />
              <span className="text-slate-400">{t('Rows per page')}:</span>
              <Select value={String(pageSize)} onValueChange={(val) => setPageSize(Number(val))}>
                <SelectTrigger className="h-6 w-16 text-[10px] rounded-sm border-slate-300">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="5">5</SelectItem>
                  <SelectItem value="10">10</SelectItem>
                  <SelectItem value="25">25</SelectItem>
                  <SelectItem value="50">50</SelectItem>
                  <SelectItem value="100">100</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center gap-1">
              <Button 
                variant="outline" size="icon" 
                className="h-6 w-6 rounded-sm border-slate-300" 
                onClick={() => setCurrentPage(1)} 
                disabled={safeCurrentPage <= 1}
              >
                <ChevronsLeft className="h-3 w-3" />
              </Button>
              <Button 
                variant="outline" size="icon" 
                className="h-6 w-6 rounded-sm border-slate-300" 
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))} 
                disabled={safeCurrentPage <= 1}
              >
                <ChevronLeft className="h-3 w-3" />
              </Button>
              
              {getPageNumbers().map((page, i) => (
                typeof page === 'number' ? (
                  <Button
                    key={i}
                    variant={page === safeCurrentPage ? 'default' : 'outline'}
                    size="sm"
                    className={`h-6 w-6 p-0 text-[10px] rounded-sm ${page === safeCurrentPage ? 'bg-green-600 hover:bg-green-700 text-white' : 'border-slate-300'}`}
                    onClick={() => setCurrentPage(page)}
                  >
                    {page}
                  </Button>
                ) : (
                  <span key={i} className="text-slate-400 px-1">...</span>
                )
              ))}
              
              <Button 
                variant="outline" size="icon" 
                className="h-6 w-6 rounded-sm border-slate-300" 
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} 
                disabled={safeCurrentPage >= totalPages}
              >
                <ChevronRight className="h-3 w-3" />
              </Button>
              <Button 
                variant="outline" size="icon" 
                className="h-6 w-6 rounded-sm border-slate-300" 
                onClick={() => setCurrentPage(totalPages)} 
                disabled={safeCurrentPage >= totalPages}
              >
                <ChevronsRight className="h-3 w-3" />
              </Button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
