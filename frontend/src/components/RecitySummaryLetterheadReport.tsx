import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Printer, FileText } from 'lucide-react';

export interface RecitySummaryLetterheadProps {
  isOpen: boolean;
  onClose: () => void;
  data: any[];
  categoryLabel: string;
  dateFrom?: string;
  dateTo?: string;
}

export default function RecitySummaryLetterheadReport({
  isOpen,
  onClose,
  data,
  categoryLabel,
  dateFrom,
  dateTo
}: RecitySummaryLetterheadProps) {
  const [includeDigitalLetterhead, setIncludeDigitalLetterhead] = useState(true);
  const [signatoryName, setSignatoryName] = useState('Aneeta John');
  const [partyName, setPartyName] = useState('Nature Green');
  const [municipalityName, setMunicipalityName] = useState('Mathura Municipal Corporation');

  const formatDateDMY = (dStr?: string | Date) => {
    if (!dStr) return '';
    const d = new Date(dStr);
    if (isNaN(d.getTime())) return '';
    const dd = String(d.getDate()).padStart(2, '0');
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const yyyy = d.getFullYear();
    return `${dd}-${mm}-${yyyy}`;
  };

  const getCertificationDateText = () => {
    if (dateFrom && dateTo) {
      if (dateFrom === dateTo) return formatDateDMY(dateFrom);
      return `${formatDateDMY(dateFrom)} to ${formatDateDMY(dateTo)}`;
    }
    if (dateFrom) return `from ${formatDateDMY(dateFrom)}`;
    if (dateTo) return `up to ${formatDateDMY(dateTo)}`;
    return formatDateDMY(new Date());
  };

  const totalSlips = data.reduce((sum, item) => sum + (Number(item.count) || 0), 0);
  const totalGross = data.reduce((sum, item) => sum + (Number(item.grossWeight) || 0), 0);
  const totalTare = data.reduce((sum, item) => sum + (Number(item.tareWeight) || 0), 0);
  const totalNet = data.reduce((sum, item) => sum + (Number(item.netWeight) || 0), 0);

  const handlePrint = () => {
    window.print();
  };

  if (!isOpen) return null;

  return (
    <>
      {/* On-screen Preview Dialog */}
      <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
        <DialogContent className="max-w-4xl max-h-[92vh] flex flex-col p-0 overflow-hidden no-print">
          <DialogHeader className="p-4 border-b border-slate-200 bg-slate-50 flex flex-row items-center justify-between">
            <div className="flex items-center gap-2">
              <FileText className="w-5 h-5 text-blue-700" />
              <div>
                <DialogTitle className="text-base font-bold text-slate-800">
                  Recity Summary Report Letterhead Preview
                </DialogTitle>
                <p className="text-xs text-slate-500">
                  {categoryLabel} Summary | {data.length} Categories | {totalSlips} Total Slips
                </p>
              </div>
            </div>

            <Button
              variant="default"
              size="sm"
              className="bg-blue-700 hover:bg-blue-800 text-white font-semibold text-xs h-8 px-4"
              onClick={handlePrint}
            >
              <Printer className="w-4 h-4 mr-1.5" /> Print Now
            </Button>
          </DialogHeader>

          {/* Controls Bar */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3 p-3 bg-blue-50/50 border-b border-slate-200 text-xs">
            <div className="flex items-center space-x-2">
              <Switch
                id="sum-digital-toggle"
                checked={includeDigitalLetterhead}
                onCheckedChange={setIncludeDigitalLetterhead}
              />
              <Label htmlFor="sum-digital-toggle" className="cursor-pointer font-medium text-slate-700">
                Digital Letterhead
                <span className="block text-[10px] text-slate-500 font-normal">
                  {includeDigitalLetterhead ? 'Includes Logo & Footer' : 'Pre-printed Stationery Margin'}
                </span>
              </Label>
            </div>

            <div>
              <Label className="text-[11px] font-semibold text-slate-700">Signatory Name</Label>
              <Input
                value={signatoryName}
                onChange={(e) => setSignatoryName(e.target.value)}
                className="h-7 text-xs bg-white mt-1 border-slate-300"
              />
            </div>

            <div>
              <Label className="text-[11px] font-semibold text-slate-700">Contractor / Party</Label>
              <Input
                value={partyName}
                onChange={(e) => setPartyName(e.target.value)}
                className="h-7 text-xs bg-white mt-1 border-slate-300"
              />
            </div>

            <div>
              <Label className="text-[11px] font-semibold text-slate-700">Corporation / Facility</Label>
              <Input
                value={municipalityName}
                onChange={(e) => setMunicipalityName(e.target.value)}
                className="h-7 text-xs bg-white mt-1 border-slate-300"
              />
            </div>
          </div>

          {/* Live Page Preview */}
          <div className="flex-1 overflow-auto bg-slate-200/80 p-6 flex justify-center">
            <div className="w-[210mm] min-h-[297mm] bg-white shadow-xl border border-slate-300 p-8 flex flex-col justify-between text-black text-[12px] font-sans box-border">
              <SummaryPageContent
                data={data}
                categoryLabel={categoryLabel}
                includeDigitalLetterhead={includeDigitalLetterhead}
                signatoryName={signatoryName}
                partyName={partyName}
                municipalityName={municipalityName}
                certificationDate={getCertificationDateText()}
                totalSlips={totalSlips}
                totalGross={totalGross}
                totalTare={totalTare}
                totalNet={totalNet}
              />
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Actual Print Media Output */}
      <div className="print-only w-full bg-white text-black m-0 p-8 min-h-screen flex flex-col justify-between box-border">
        <SummaryPageContent
          data={data}
          categoryLabel={categoryLabel}
          includeDigitalLetterhead={includeDigitalLetterhead}
          signatoryName={signatoryName}
          partyName={partyName}
          municipalityName={municipalityName}
          certificationDate={getCertificationDateText()}
          totalSlips={totalSlips}
          totalGross={totalGross}
          totalTare={totalTare}
          totalNet={totalNet}
        />
      </div>
    </>
  );
}

interface SummaryPageContentProps {
  data: any[];
  categoryLabel: string;
  includeDigitalLetterhead: boolean;
  signatoryName: string;
  partyName: string;
  municipalityName: string;
  certificationDate: string;
  totalSlips: number;
  totalGross: number;
  totalTare: number;
  totalNet: number;
}

function SummaryPageContent({
  data,
  categoryLabel,
  includeDigitalLetterhead,
  signatoryName,
  partyName,
  municipalityName,
  certificationDate,
  totalSlips,
  totalGross,
  totalTare,
  totalNet
}: SummaryPageContentProps) {
  return (
    <div className="flex flex-col justify-between h-full flex-1">
      <div>
        {/* Header */}
        {includeDigitalLetterhead ? (
          <div className="flex justify-between items-center mb-6">
            <div className="w-16"></div>
            <div className="flex-1 flex justify-center">
              <img src="/recity-logo.jpg" alt="Recity" className="h-14 object-contain" />
            </div>
            <div className="text-right text-xs font-semibold text-slate-800 w-16">1</div>
          </div>
        ) : (
          <div className="h-24 flex justify-end items-start mb-2">
            <span className="text-xs font-semibold text-slate-800">1</span>
          </div>
        )}

        {/* Intro */}
        <div className="mb-4 text-[13px] leading-relaxed text-slate-900 space-y-2.5">
          <p>
            This is to certify that we have taken receipt of the aggregated quantities of Municipal Solid Waste
            sent by <strong>{partyName}</strong>, from the wards of <strong>{municipalityName}</strong>, for the period{' '}
            <strong>{certificationDate}</strong>.
          </p>
          <p className="font-medium pt-1">
            Aggregated summary details ({categoryLabel}) are given below:
          </p>
        </div>

        {/* Table */}
        <table className="w-full border-collapse border border-black text-[12px] mt-2">
          <thead>
            <tr className="border-b border-black bg-slate-50 font-bold text-center">
              <th className="border border-black p-2 w-14">Sl. No.</th>
              <th className="border border-black p-2 text-left">{categoryLabel}</th>
              <th className="border border-black p-2 w-24">Slip Count</th>
              <th className="border border-black p-2 w-28">Gross Weight (KG)</th>
              <th className="border border-black p-2 w-28">Tare Weight (KG)</th>
              <th className="border border-black p-2 w-28">Net Weight (KG)</th>
            </tr>
          </thead>
          <tbody>
            {data.map((item, idx) => (
              <tr key={idx} className="border-b border-black text-center">
                <td className="border border-black p-2">{idx + 1}</td>
                <td className="border border-black p-2 text-left font-semibold">{item.key || 'N/A'}</td>
                <td className="border border-black p-2">{item.count}</td>
                <td className="border border-black p-2">{Number(item.grossWeight || 0).toLocaleString()}</td>
                <td className="border border-black p-2">{Number(item.tareWeight || 0).toLocaleString()}</td>
                <td className="border border-black p-2 font-bold">{Number(item.netWeight || 0).toLocaleString()}</td>
              </tr>
            ))}
            <tr className="border-t-2 border-black bg-slate-100 font-bold text-center">
              <td colSpan={2} className="border border-black p-2 text-right uppercase">Total:</td>
              <td className="border border-black p-2">{totalSlips}</td>
              <td className="border border-black p-2">{totalGross.toLocaleString()}</td>
              <td className="border border-black p-2">{totalTare.toLocaleString()}</td>
              <td className="border border-black p-2 text-blue-900 font-extrabold">{totalNet.toLocaleString()}</td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* Signature and Footer */}
      <div className="mt-8">
        <div className="mb-6 pl-2">
          <div className="flex items-center gap-2 mb-1">
            <span className="font-semibold text-xs">Signature:</span>
            <div className="w-48 border-b border-black inline-block mt-3"></div>
          </div>
          <div className="flex items-center gap-2 text-xs">
            <span className="font-semibold">Name:</span>
            <span className="italic underline">{signatoryName}</span>
          </div>
        </div>

        {includeDigitalLetterhead ? (
          <div className="pt-2">
            <div className="text-center text-[10px] leading-snug text-slate-800 border-t border-slate-300 pt-1.5 space-y-0.5">
              <p>
                <span className="text-blue-800">contact@recity.in</span> | <span className="text-blue-800">www.recity.in</span> | CIN.: U93090MH2017PTC293495 | Mobile No. 9819694739
              </p>
              <p className="font-semibold text-slate-900">
                Recity Network Pvt Ltd <span className="font-normal">| UNIT NO. S12-S14, 2nd FLOOR, PINNACLE BUSINESS PARK, MAHAKALI CAVES ROAD, SHANTI NAGAR, ANDHERI EAST, MUMBAI 400093.</span>
              </p>
            </div>
            <div className="mt-1.5 w-full">
              <img src="/recity-footer-strip.jpg" alt="Footer Border" className="w-full h-2 object-fill" />
            </div>
          </div>
        ) : (
          <div className="h-16"></div>
        )}
      </div>
    </div>
  );
}
