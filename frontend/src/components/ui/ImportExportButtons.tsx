import React, { useRef } from 'react';
import { Button } from './button';
import { Download, Upload } from 'lucide-react';
import Papa from 'papaparse';
import { useToast } from '@/hooks/use-toast';
import api from '@/lib/api';

interface ImportExportButtonsProps {
  data?: any[];
  exportFilename: string;
  importEndpoint: string;
  exportEndpoint?: string;
  onImportSuccess: () => void;
}

export function ImportExportButtons({ data = [], exportFilename, importEndpoint, exportEndpoint, onImportSuccess }: ImportExportButtonsProps) {
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleExport = async () => {
    let exportData = data;

    if (exportEndpoint) {
      try {
        const res = await api.get(exportEndpoint, { params: { limit: 100000 } });
        exportData = res.data?.data || res.data || [];
      } catch (error) {
        toast({ title: 'Failed to fetch data for export', variant: 'destructive' });
        return;
      }
    }

    if (!exportData || exportData.length === 0) {
      toast({ title: 'No data to export', variant: 'destructive' });
      return;
    }
    
    // Create a deep copy to remove internal fields like id, createdAt, updatedAt if desired,
    // but typically we can just export everything or let the user decide.
    // For simplicity, we export raw data, stripping out complex objects if any.
    const cleanData = exportData.map((item: any) => {
      const cleanItem = { ...item };
      // Remove nested relational objects (like vehicleType) from CSV
      for (const key in cleanItem) {
        if (typeof cleanItem[key] === 'object' && cleanItem[key] !== null) {
          delete cleanItem[key];
        }
      }
      return cleanItem;
    });

    const csv = Papa.unparse(cleanData);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `${exportFilename}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: async (results) => {
        try {
          if (results.errors.length > 0) {
            console.error('CSV Parsing Errors:', results.errors);
            toast({ title: 'Error parsing CSV file', variant: 'destructive' });
            return;
          }

          // Convert string booleans back to true/false if needed, 
          // or just pass raw strings to backend and let Prisma cast.
          const payload = results.data.map((row: any) => {
            // Clean up boolean fields since CSV makes them strings
            if (row.isActive === 'true') row.isActive = true;
            if (row.isActive === 'false') row.isActive = false;
            if (row.isDefault === 'true') row.isDefault = true;
            if (row.isDefault === 'false') row.isDefault = false;
            // Remove id, createdAt, updatedAt so they don't cause conflicts
            delete row.id;
            delete row.createdAt;
            delete row.updatedAt;
            return row;
          });

          const res = await api.post(importEndpoint, { items: payload });
          toast({ 
            title: 'Import Successful', 
            description: `Successfully imported ${res.data.count || payload.length} records.` 
          });
          onImportSuccess();
        } catch (error: any) {
          console.error('Import failed', error);
          toast({ 
            title: 'Import Failed', 
            description: error.response?.data?.error || 'An error occurred during import',
            variant: 'destructive' 
          });
        } finally {
          // Reset input
          if (fileInputRef.current) {
            fileInputRef.current.value = '';
          }
        }
      }
    });
  };

  return (
    <div className="flex gap-2">
      <Button variant="outline" onClick={handleExport} className="whitespace-nowrap">
        <Download className="mr-2 h-4 w-4" /> Export CSV
      </Button>
      <input 
        type="file" 
        accept=".csv" 
        className="hidden" 
        ref={fileInputRef} 
        onChange={handleImport} 
      />
      <Button variant="outline" onClick={() => fileInputRef.current?.click()} className="whitespace-nowrap">
        <Upload className="mr-2 h-4 w-4" /> Import CSV
      </Button>
    </div>
  );
}
