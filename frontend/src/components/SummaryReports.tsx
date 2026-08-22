import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Download, RefreshCw, Calendar, FileText } from 'lucide-react';
import api from '@/lib/api';
import { useToast } from '@/hooks/use-toast';
import { TableSkeleton } from '@/components/ui/LoadingSkeletons';

export default function SummaryReports() {
  const { t } = useTranslation();
  const [data, setData] = useState<any[]>([]);
  const [reportType, setReportType] = useState('daily');
  
  // Date Range Filter
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  const { toast } = useToast();
  const [loading, setLoading] = useState(false);

  const fetchSummary = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ reportType });
      if (dateFrom) params.append('dateFrom', dateFrom);
      if (dateTo) params.append('dateTo', dateTo);

      const res = await api.get(`/weighment/summary?${params.toString()}`);
      if (res.data && res.data.data) {
        setData(res.data.data);
      }
    } catch (error) {
      console.error(error);
      toast({ title: 'Error fetching summary', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSummary();
  }, [reportType, dateFrom, dateTo]);

  const handleExportCSV = () => {
    if (data.length === 0) return;
    try {
      const headers = ['Category', 'Slip Count', 'Gross Weight (Kg)', 'Tare Weight (Kg)', 'Net Weight (Kg)'];
      
      const csvContent = [
        headers.join(','),
        ...data.map((item: any) => [
          `"${item.key.replace(/"/g, '""')}"`,
          item.count,
          item.grossWeight,
          item.tareWeight,
          item.netWeight
        ].join(','))
      ].join('\n');
      
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', `summary_${reportType}_${new Date().toISOString().slice(0, 10)}.csv`);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (e) {
      console.error(e);
      toast({ title: 'Export Failed', variant: 'destructive' });
    }
  };

  const handleClearFilters = () => {
    setDateFrom('');
    setDateTo('');
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

  const totalCount = data.reduce((sum, item) => sum + item.count, 0);
  const totalNet = data.reduce((sum, item) => sum + item.netWeight, 0);

  const getCategoryLabel = () => {
    switch (reportType) {
      case 'daily': return 'Date';
      case 'vehicleType': return 'Vehicle Type';
      case 'ward': return 'Ward (Source)';
      case 'work': return 'Work (Destination)';
      case 'source': return 'Source';
      default: return 'Category';
    }
  };

  return (
    <div className="flex flex-col h-full space-y-4">
      <div className="flex justify-between items-end">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-slate-900">{t('Summary Reports')}</h2>
          <p className="text-sm text-slate-500">{t('View aggregated weighment data.')}</p>
        </div>
      </div>

      <div className="flex flex-col flex-1 bg-white border border-slate-300 rounded-sm shadow-sm overflow-hidden">
        
        {/* Toolbar Row 1: Report Type + Actions */}
        <div className="flex justify-between items-center p-2 border-b border-slate-300 bg-slate-50">
          <div className="flex items-center gap-4">
            <span className="text-sm font-bold text-slate-700 ml-2">Report Type:</span>
            <Select value={reportType} onValueChange={(val) => setReportType(val)}>
              <SelectTrigger className="h-8 w-64 text-xs rounded-sm border-slate-300 bg-white">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="daily">Daily Wise</SelectItem>
                <SelectItem value="vehicleType">Vehicle Type Wise</SelectItem>
                <SelectItem value="ward">Ward Wise (Source)</SelectItem>
                <SelectItem value="work">Work Wise (Destination)</SelectItem>
                <SelectItem value="source">Source Wise</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" className="h-8 text-xs rounded-sm border-slate-300" onClick={fetchSummary}>
              <RefreshCw className="h-3.5 w-3.5 mr-1" /> {t('Refresh')}
            </Button>
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
          {(dateFrom || dateTo) && (
            <Button variant="ghost" size="sm" className="h-7 px-2 text-[10px] rounded-sm text-red-500 hover:text-red-600" onClick={handleClearFilters}>
              {t('Clear Filters')}
            </Button>
          )}
        </div>

        {/* Summary Stats Bar */}
        <div className="flex items-center gap-6 px-3 py-1.5 border-b border-slate-200 bg-green-50/50 text-xs">
          <span className="text-slate-500 font-medium">{t('Total Slips')}:</span>
          <span className="font-bold text-slate-700">{totalCount}</span>
          <span className="text-slate-300">|</span>
          <span className="text-slate-500">{t('Total Net Weight')}:</span>
          <span className="font-bold text-green-700">{totalNet.toLocaleString()} KG</span>
        </div>
        
        {/* Table */}
        <div className="flex-1 overflow-auto">
          <Table>
            <TableHeader className="sticky top-0 z-10 shadow-sm bg-slate-100">
              <TableRow>
                <TableHead className="font-bold text-black border border-slate-300">{getCategoryLabel()}</TableHead>
                <TableHead className="font-bold text-black border border-slate-300 text-right">Slip Count</TableHead>
                <TableHead className="font-bold text-black border border-slate-300 text-right">Gross Weight (Kg)</TableHead>
                <TableHead className="font-bold text-black border border-slate-300 text-right">Tare Weight (Kg)</TableHead>
                <TableHead className="font-bold text-black border border-slate-300 text-right bg-blue-50/50">Net Weight (Kg)</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={5} className="p-4">
                    <TableSkeleton rows={5} />
                  </TableCell>
                </TableRow>
              ) : data.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-10 text-slate-500">
                    <div className="flex flex-col items-center justify-center">
                      <FileText className="h-8 w-8 text-slate-300 mb-2" />
                      <p>{t('No data available for the selected period.')}</p>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                data.map((item, index) => (
                  <TableRow key={index} className="hover:bg-slate-50">
                    <TableCell className="border border-slate-300 font-medium">{item.key}</TableCell>
                    <TableCell className="border border-slate-300 text-right">{item.count}</TableCell>
                    <TableCell className="border border-slate-300 text-right">{item.grossWeight.toLocaleString()}</TableCell>
                    <TableCell className="border border-slate-300 text-right">{item.tareWeight.toLocaleString()}</TableCell>
                    <TableCell className="border border-slate-300 text-right font-bold text-green-700 bg-blue-50/20">{item.netWeight.toLocaleString()}</TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>
    </div>
  );
}
