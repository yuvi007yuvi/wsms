import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Printer, FileText, ChevronLeft, ChevronRight, Download, Loader2 } from 'lucide-react';
import html2pdf from 'html2pdf.js';

const RECITY_WARDS: Record<string, string> = {
  "61": "CHAUBIYA PADA",
  "38": "CIVIL LINES",
  "58": "GAU GHAT",
  "10": "AURANGABAD PRATHAM",
  "18": "GENERAL GANJ",
  "65": "HOLI GALI",
  "4": "ISHAPUR YAMUNAPAR",
  "53": "KRISHNAPURI",
  "64": "GHATI BAHALRAI",
  "5": "BHARATPURGATE",
  "29": "KOYALA ALIPUR",
  "23": "AHEERPADA",
  "56": "MANDI RAMDAS",
  "32": "RANCHIBAGAR",
  "17": "BAIRAGPURA",
  "42": "MANOHARPURA",
  "49": "DAMPIER NAGAR",
  "40": "RAJKUMAR",
  "36": "JAISINGH PURA",
  "35": "BANKHANDI",
  "22": "BADRINAGAR",
  "26": "NAYA NAGLA",
  "28": "AURANGABAD DWITIYA",
  "60": "JAGANNATHPURI",
  "45": "BIRLA MANDIR",
  "55": "GOVINDNAGAR",
  "39": "MAHAVIDYA COLONY",
  "14": "LAXMINAGAR YAMUNAPAR",
  "19": "RAMNAGAR YAMUNAPAR",
  "63": "MALIYAN SADAR",
  "12": "RADHESHYAM COLONY",
  "47": "DWARKAPURI",
  "68": "SHANTI NAGAR",
  "46": "RADHA NAGAR",
  "27": "BAD",
  "7": "LOHWAN",
  "54": "PRATAPNAGAR",
  "31": "NAVNEET NAGAR"
};

const FIRST_PAGE_ROWS = 20;
const SUBSEQUENT_PAGE_ROWS = 20;

export interface RecityLetterheadProps {
  isOpen: boolean;
  onClose: () => void;
  slips: any[];
  dateFrom?: string;
  dateTo?: string;
}

export default function RecityLetterheadReport({
  isOpen,
  onClose,
  slips,
  dateFrom,
  dateTo
}: RecityLetterheadProps) {
  const [includeDigitalLetterhead, setIncludeDigitalLetterhead] = useState(true);
  const [partyName, setPartyName] = useState('Nature Green');
  const [municipalityName, setMunicipalityName] = useState('Mathura Municipal Corporation');
  const [customCertificationDate, setCustomCertificationDate] = useState('');
  const [previewPage, setPreviewPage] = useState(1);

  const [strictFilter, setStrictFilter] = useState(true);
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);

  // Format date as DD-MM-YYYY
  const formatDateDMY = (dStr?: string | Date) => {
    if (!dStr) return '';
    const d = new Date(dStr);
    if (isNaN(d.getTime())) return '';
    const dd = String(d.getDate()).padStart(2, '0');
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const yyyy = d.getFullYear();
    return `${dd}-${mm}-${yyyy}`;
  };

  // Format full time as DD-MM-YYYY HH:mm:ss
  const formatDateTime = (dStr?: string | Date) => {
    if (!dStr) return '';
    const d = new Date(dStr);
    if (isNaN(d.getTime())) return '';
    const dd = String(d.getDate()).padStart(2, '0');
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const yyyy = d.getFullYear();
    const hh = String(d.getHours()).padStart(2, '0');
    const min = String(d.getMinutes()).padStart(2, '0');
    const ss = String(d.getSeconds()).padStart(2, '0');
    return `${dd}-${mm}-${yyyy} ${hh}:${min}:${ss}`;
  };

  // Compute certification date label
  const getCertificationDateText = () => {
    if (customCertificationDate) return customCertificationDate;
    if (dateFrom && dateTo) {
      if (dateFrom === dateTo) return formatDateDMY(dateFrom);
      return `${formatDateDMY(dateFrom)} to ${formatDateDMY(dateTo)}`;
    }
    if (dateFrom) return `from ${formatDateDMY(dateFrom)}`;
    if (dateTo) return `up to ${formatDateDMY(dateTo)}`;
    return formatDateDMY(new Date());
  };

  // Filter slips to ONLY include Recity wards, and map their source.name to the actual Ward Name.
  const filteredSlips = slips.map(slip => {
    const sourceName = slip.source?.name || '';
    const match = sourceName.match(/\d+/);
    let mappedName = null;
    
    if (match && RECITY_WARDS[match[0]]) {
      mappedName = RECITY_WARDS[match[0]];
    } else {
      const isDirectName = Object.values(RECITY_WARDS).includes(sourceName.toUpperCase());
      if (isDirectName) mappedName = sourceName.toUpperCase();
    }

    if (mappedName) {
      return { ...slip, mappedLocation: mappedName };
    }
    
    // If strictFilter is off, we still return the slip but with its original name
    if (!strictFilter) {
      return { ...slip, mappedLocation: sourceName };
    }
    
    return null;
  }).filter(Boolean);

  // Chunk slips into pages
  const pages: any[][] = [];
  let remainingSlips = [...filteredSlips];

  if (remainingSlips.length === 0) {
    pages.push([]);
  } else {
    // First page
    pages.push(remainingSlips.slice(0, FIRST_PAGE_ROWS));
    remainingSlips = remainingSlips.slice(FIRST_PAGE_ROWS);

    // Subsequent pages
    while (remainingSlips.length > 0) {
      pages.push(remainingSlips.slice(0, SUBSEQUENT_PAGE_ROWS));
      remainingSlips = remainingSlips.slice(SUBSEQUENT_PAGE_ROWS);
    }
  }

  const totalPages = pages.length;

  // Calculate overall summary stats
  const totalGross = filteredSlips.reduce((sum, s) => sum + (Number(s.grossWeight) || 0), 0);
  const totalTare = filteredSlips.reduce((sum, s) => sum + (Number(s.tareWeight) || 0), 0);
  const totalNet = filteredSlips.reduce((sum, s) => sum + (Number(s.netWeight) || 0), 0);

  const handleDownloadPDF = () => {
    const originalElement = document.getElementById('recity-letterhead-print-content');
    if (!originalElement) return;
    
    setIsGeneratingPDF(true);

    // Create a temporary container attached directly to body
    // This bypasses any overflow: hidden rules on parent containers that cause html2canvas to crop
    const tempContainer = document.createElement('div');
    tempContainer.style.position = 'absolute';
    tempContainer.style.left = '0';
    tempContainer.style.top = '0';
    tempContainer.style.width = '210mm';
    tempContainer.style.zIndex = '-9999';
    tempContainer.style.backgroundColor = 'white';

    const clonedElement = originalElement.cloneNode(true) as HTMLElement;
    clonedElement.style.display = 'block';
    
    tempContainer.appendChild(clonedElement);
    document.body.appendChild(tempContainer);

    // Allow browser 1 tick to compute layout before capturing
    setTimeout(() => {
      const opt: any = {
        margin:       0,
        filename:     `Recity_Letterhead_${formatDateDMY(new Date())}.pdf`,
        image:        { type: 'jpeg', quality: 0.98 },
        html2canvas:  { scale: 2, useCORS: true, logging: false },
        jsPDF:        { unit: 'mm', format: 'a4', orientation: 'portrait' }
      };

      html2pdf().set(opt).from(clonedElement).save().then(() => {
        document.body.removeChild(tempContainer);
        setIsGeneratingPDF(false);
      }).catch((err: any) => {
        console.error("PDF Generation Error", err);
        if (document.body.contains(tempContainer)) document.body.removeChild(tempContainer);
        setIsGeneratingPDF(false);
      });
    }, 150);
  };

  const handlePrint = () => {
    window.print();
  };

  if (!isOpen) return null;

  return (
    <>
      {/* On-Screen Configuration & Preview Modal (Hidden in Print) */}
      <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
        <DialogContent className="max-w-5xl max-h-[92vh] flex flex-col p-0 overflow-hidden no-print">
          <DialogHeader className="p-4 border-b border-slate-200 bg-slate-50 flex flex-row items-center justify-between">
            <div className="flex items-center gap-2">
              <FileText className="w-5 h-5 text-blue-700" />
              <div>
                <DialogTitle className="text-base font-bold text-slate-800">
                  Recity Letterhead Print Preview
                </DialogTitle>
                <p className="text-xs text-slate-500">
                  Total Slips: {filteredSlips.length} | {totalPages} Page{totalPages > 1 ? 's' : ''}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                className="border-blue-600 text-blue-700 hover:bg-blue-50 font-semibold text-xs h-8 px-4 disabled:opacity-50"
                onClick={handleDownloadPDF}
                disabled={isGeneratingPDF}
              >
                {isGeneratingPDF ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-1.5 animate-spin" /> Generating...
                  </>
                ) : (
                  <>
                    <Download className="w-4 h-4 mr-1.5" /> Download PDF
                  </>
                )}
              </Button>
              <Button
                variant="default"
                size="sm"
                className="bg-blue-700 hover:bg-blue-800 text-white font-semibold text-xs h-8 px-4"
                onClick={handlePrint}
              >
                <Printer className="w-4 h-4 mr-1.5" /> Print Now
              </Button>
            </div>
          </DialogHeader>

          {/* Controls Bar */}
          <div className="grid grid-cols-1 md:grid-cols-6 gap-3 p-3 bg-blue-50/50 border-b border-slate-200 text-xs">
            <div className="flex items-center space-x-2">
              <Switch
                id="digital-letterhead-toggle"
                checked={includeDigitalLetterhead}
                onCheckedChange={setIncludeDigitalLetterhead}
              />
              <Label htmlFor="digital-letterhead-toggle" className="cursor-pointer font-medium text-slate-700">
                Digital Letterhead
                <span className="block text-[10px] text-slate-500 font-normal">
                  {includeDigitalLetterhead ? 'Includes Logo & Footer' : 'Pre-printed Stationery Margin'}
                </span>
              </Label>
            </div>
            
            <div className="flex items-center space-x-2">
              <Switch
                id="strict-filter-toggle"
                checked={strictFilter}
                onCheckedChange={setStrictFilter}
              />
              <Label htmlFor="strict-filter-toggle" className="cursor-pointer font-medium text-slate-700">
                Filter Wards
                <span className="block text-[10px] text-slate-500 font-normal">
                  {strictFilter ? 'Only 38 Recity Wards' : 'Show All Wards'}
                </span>
              </Label>
            </div>

            <div>
              <Label className="text-[11px] font-semibold text-slate-700">Party / Contractor</Label>
              <Input
                value={partyName}
                onChange={(e) => setPartyName(e.target.value)}
                className="h-7 text-xs bg-white mt-1 border-slate-300"
                placeholder="Nature Green"
              />
            </div>

            <div>
              <Label className="text-[11px] font-semibold text-slate-700">Corporation / Facility</Label>
              <Input
                value={municipalityName}
                onChange={(e) => setMunicipalityName(e.target.value)}
                className="h-7 text-xs bg-white mt-1 border-slate-300"
                placeholder="Mathura Municipal Corporation"
              />
            </div>

            <div>
              <Label className="text-[11px] font-semibold text-slate-700">Certification Date</Label>
              <Input
                value={customCertificationDate}
                onChange={(e) => setCustomCertificationDate(e.target.value)}
                className="h-7 text-xs bg-white mt-1 border-slate-300"
                placeholder="e.g. 28-05-2026"
              />
            </div>
          </div>

          {/* Live Page Preview Scrollable Viewport */}
          <div className="flex-1 overflow-auto bg-slate-200/80 p-6 flex flex-col items-center gap-6">
            {/* Page Navigation Indicator */}
            {totalPages > 1 && (
              <div className="sticky top-0 z-20 flex items-center gap-3 bg-white/90 backdrop-blur-sm px-3 py-1.5 rounded-full shadow-sm border border-slate-300 text-xs">
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 w-6 p-0"
                  disabled={previewPage <= 1}
                  onClick={() => setPreviewPage(p => Math.max(1, p - 1))}
                >
                  <ChevronLeft className="w-4 h-4" />
                </Button>
                <span className="font-semibold text-slate-700">
                  Page {previewPage} of {totalPages}
                </span>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 w-6 p-0"
                  disabled={previewPage >= totalPages}
                  onClick={() => setPreviewPage(p => Math.min(totalPages, p + 1))}
                >
                  <ChevronRight className="w-4 h-4" />
                </Button>
                <span className="text-slate-400">|</span>
                <span className="text-[11px] text-slate-500">
                  (Printing will automatically output all {totalPages} pages)
                </span>
              </div>
            )}

            {/* Simulated Sheet for Selected Preview Page */}
            <div className="w-[210mm] min-h-[297mm] bg-white shadow-xl border border-slate-300 p-8 flex flex-col justify-between text-black text-[12px] font-sans box-border relative">
              <PageContent
                pageIndex={previewPage - 1}
                pageSlips={pages[previewPage - 1] || []}
                includeDigitalLetterhead={includeDigitalLetterhead}
                partyName={partyName}
                municipalityName={municipalityName}
                certificationDate={getCertificationDateText()}
                formatDateDMY={formatDateDMY}
                formatDateTime={formatDateTime}
                isLastPage={previewPage === totalPages}
                totalGross={totalGross}
                totalTare={totalTare}
                totalNet={totalNet}
                totalSlipsCount={filteredSlips.length}
              />
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Actual Print Media Rendering (Hidden on Screen, Active only when printing) */}
      <div id="recity-letterhead-print-content" className="print-only w-full bg-white text-black m-0 p-0">
        {pages.map((pageSlips, pageIndex) => (
          <div
            key={pageIndex}
            className="w-full min-h-screen flex flex-col justify-between p-8 box-border"
            style={{
              pageBreakAfter: pageIndex < totalPages - 1 ? 'always' : 'auto',
              breakAfter: pageIndex < totalPages - 1 ? 'page' : 'auto'
            }}
          >
            <PageContent
              pageIndex={pageIndex}
              pageSlips={pageSlips}
              includeDigitalLetterhead={includeDigitalLetterhead}
              partyName={partyName}
              municipalityName={municipalityName}
              certificationDate={getCertificationDateText()}
              formatDateDMY={formatDateDMY}
              formatDateTime={formatDateTime}
              isLastPage={pageIndex === totalPages - 1}
              totalGross={totalGross}
              totalTare={totalTare}
              totalNet={totalNet}
              totalSlipsCount={filteredSlips.length}
            />
          </div>
        ))}
      </div>
    </>
  );
}

// Subcomponent for each single letterhead page
interface PageContentProps {
  pageIndex: number;
  pageSlips: any[];
  includeDigitalLetterhead: boolean;
  partyName: string;
  municipalityName: string;
  certificationDate: string;
  formatDateDMY: (d?: string | Date) => string;
  formatDateTime: (d?: string | Date) => string;
  isLastPage: boolean;
  totalGross: number;
  totalTare: number;
  totalNet: number;
  totalSlipsCount: number;
}

function PageContent({
  pageIndex,
  pageSlips,
  includeDigitalLetterhead,
  partyName,
  municipalityName,
  certificationDate,
  formatDateDMY,
  formatDateTime,
  isLastPage,
  totalGross,
  totalTare,
  totalNet,
  totalSlipsCount
}: PageContentProps) {
  return (
    <div className="flex flex-col justify-between h-full flex-1">
      {/* Top Header Section */}
      <div>
        {includeDigitalLetterhead ? (
          <div className="flex justify-between items-center mb-6">
            <div className="w-16"></div>
            <div className="flex-1 flex justify-center">
              <img
                src="/recity-logo.jpg"
                alt="Recity"
                className="h-14 object-contain"
                onError={(e) => {
                  // Fallback title text if image is unavailable
                  (e.target as HTMLElement).style.display = 'none';
                }}
              />
            </div>
            <div className="text-right text-xs font-semibold text-slate-800 w-16">
              {pageIndex + 1}
            </div>
          </div>
        ) : (
          /* Pre-printed stationery margin spacing */
          <div className="h-24 flex justify-end items-start mb-2">
            <span className="text-xs font-semibold text-slate-800">{pageIndex + 1}</span>
          </div>
        )}

        {/* Certification Intro text (Only on Page 1) */}
        {pageIndex === 0 && (
          <div className="mb-4 text-[13px] leading-relaxed text-slate-900 space-y-2.5 text-justify">
            <p>
              This is to certify that we have taken receipt of the following quantities of Municipal Solid Waste
              sent by <strong>{partyName}</strong>, from the wards of <strong>{municipalityName}</strong>, on{' '}
              <strong>{certificationDate}</strong>.
            </p>
            <p>
              The waste supplied would be safely segregated in the facility, and would be sent for further
              processing/recycling.
            </p>
            <p className="font-medium pt-1">
              Received load details are given below:
            </p>
          </div>
        )}

        {/* Data Table */}
        <div className="w-full mt-2">
          <table className="w-full border-collapse border border-black text-[10px] leading-tight table-fixed break-words">
            <thead>
              <tr className="border-b border-black bg-slate-50 font-bold text-center text-[9px]">
                <th className="border border-black p-1 w-[5%]">Sl. No.</th>
                <th className="border border-black p-1 w-[12%]">Receipt No</th>
                <th className="border border-black p-1 w-[9%]">Date</th>
                <th className="border border-black p-1 w-[10%]">Party Name</th>
                <th className="border border-black p-1 w-[10%]">Vehicle No</th>
                <th className="border border-black p-1 w-[11%]">Location</th>
                <th className="border border-black p-1 w-[10%]">Vehicle Type</th>
                <th className="border border-black p-1 w-[8%]">Material</th>
                <th className="border border-black p-1 w-[6%]">Gross</th>
                <th className="border border-black p-1 w-[6%]">Tare</th>
                <th className="border border-black p-1 w-[6%]">Net</th>
                <th className="border border-black p-1 w-[7%]">Time</th>
              </tr>
            </thead>
            <tbody>
              {pageSlips.length === 0 ? (
                <tr>
                  <td colSpan={12} className="border border-black text-center py-6 text-slate-500">
                    No weighment records available for this period.
                  </td>
                </tr>
              ) : (
                pageSlips.map((slip, idx) => {
                  const slipDate = slip.date ? formatDateDMY(slip.date) : '';
                  const slipTime = slip.date ? formatDateTime(slip.date).split(' ')[1] : '';
                  const vehicleNum = slip.vehicle?.vehicleNumber || '-';
                  const wardLocation = slip.mappedLocation || slip.source?.name || '-';
                  const vehicleType = slip.vehicleType?.name || slip.vehicle?.vehicleType?.name || 'D2D';
                  const materialType = slip.material?.name || 'MSW';
                  
                  const overallIdx = pageIndex === 0 ? idx + 1 : FIRST_PAGE_ROWS + (pageIndex - 1) * SUBSEQUENT_PAGE_ROWS + idx + 1;

                  return (
                    <tr key={slip.id || idx} className="border-b border-black text-center text-[9px]">
                      <td className="border border-black py-1 px-0.5">{overallIdx}</td>
                      <td className="border border-black py-1 px-0.5 font-medium break-all">{slip.slipNumber}</td>
                      <td className="border border-black py-1 px-0.5">{slipDate}</td>
                      <td className="border border-black py-1 px-0.5 truncate">{partyName}</td>
                      <td className="border border-black py-1 px-0.5 font-semibold break-all">{vehicleNum}</td>
                      <td className="border border-black py-1 px-0.5 break-words">{wardLocation}</td>
                      <td className="border border-black py-1 px-0.5 break-words">{vehicleType}</td>
                      <td className="border border-black py-1 px-0.5 break-words">{materialType}</td>
                      <td className="border border-black py-1 px-0.5">{slip.grossWeight ?? '-'}</td>
                      <td className="border border-black py-1 px-0.5">{slip.tareWeight ?? '-'}</td>
                      <td className="border border-black py-1 px-0.5 font-bold">{slip.netWeight ?? '-'}</td>
                      <td className="border border-black py-1 px-0.5">{slipTime}</td>
                    </tr>
                  );
                })
              )}

              {/* Show Totals Row on the Last Page */}
              {isLastPage && pageSlips.length > 0 && (
                <tr className="border-t-2 border-black bg-slate-100 font-bold text-center">
                  <td colSpan={8} className="border border-black py-1.5 px-2 text-right uppercase">
                    Total ({totalSlipsCount} Loads):
                  </td>
                  <td className="border border-black py-1.5 px-1">{totalGross.toLocaleString()}</td>
                  <td className="border border-black py-1.5 px-1">{totalTare.toLocaleString()}</td>
                  <td className="border border-black py-1.5 px-1 font-extrabold text-blue-900">{totalNet.toLocaleString()}</td>
                  <td className="border border-black py-1.5 px-1 text-[10px]">KG</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Bottom Section: Signature & Letterhead Footer */}
      <div className="mt-8">


        {/* Digital Letterhead Footer from docx */}
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
            {/* Decorative bottom color strip from Letter Head - Recity (1).docx */}
            <div className="mt-1.5 w-full">
              <img
                src="/recity-footer-strip.jpg"
                alt="Footer Border"
                className="w-full h-2 object-fill"
              />
            </div>
          </div>
        ) : (
          /* Pre-printed stationery bottom spacing */
          <div className="h-16"></div>
        )}
      </div>
    </div>
  );
}
