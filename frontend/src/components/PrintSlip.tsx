interface PrintSlipProps {
  slip: any; // The weighment slip object containing all details
}

export default function PrintSlip({ slip }: PrintSlipProps) {
  if (!slip) return null;

  // Determine Project Context dynamically
  const projectName = slip.project?.name || localStorage.getItem('projectName') || '';
  const isNatureGreen = !projectName || projectName.toLowerCase().includes('nature') || projectName.toLowerCase().includes('green');

  // Determine print copies mode:
  // '1' for continuous tractor-feed dot-matrix (LX-310) - prints 1 slip per weighment without feeding full sheet
  // '3' for standard A4 sheet (3 copies per A4 page)
  const savedPrintMode = localStorage.getItem('printCopiesMode') || (isNatureGreen ? '3' : '1');
  const copiesCount = parseInt(savedPrintMode, 10) || (isNatureGreen ? 3 : 1);
  const copies = Array.from({ length: copiesCount }, (_, i) => i + 1);

  // Format date helper: DD-MM-YYYY (day:month:year) for new projects
  const formatDMY = (dateInput: any) => {
    if (!dateInput) return '-';
    const d = new Date(dateInput);
    if (isNaN(d.getTime())) return '-';
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    return `${day}-${month}-${year}`;
  };

  // Format date-time helper: DD-MM-YYYY HH:mm:ss for new projects
  const formatDateTimeDMY = (dateInput: any) => {
    if (!dateInput) return '-';
    const d = new Date(dateInput);
    if (isNaN(d.getTime())) return '-';
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    const hours = String(d.getHours()).padStart(2, '0');
    const minutes = String(d.getMinutes()).padStart(2, '0');
    const seconds = String(d.getSeconds()).padStart(2, '0');
    return `${day}-${month}-${year} ${hours}:${minutes}:${seconds}`;
  };

  // If Nature Green (original format), render the exact 100% original layout
  if (isNatureGreen) {
    return (
      <div className="print-only w-full bg-white text-black py-0 px-8 m-0 font-mono text-sm">
        {copies.map((copyIndex) => (
          <div key={copyIndex} className="flex flex-col justify-between h-[31vh] border-b-2 border-dashed border-gray-400 pb-2 mb-2 last:border-b-0 last:mb-0 last:pb-0 box-border">

            {/* Header */}
            <div>
              <div className="flex justify-between items-center mb-1">
                {/* Logo */}
                <div className="w-20 h-10 flex items-center justify-start">
                  <img src="/images.jpg" alt="Logo" className="h-full object-contain" />
                </div>
                <div className="text-center flex-1">
                  <h1 className="text-xl font-bold uppercase leading-tight">Nagar Nigam Mathura Vrindavan</h1>
                </div>
                <div className="w-20"></div> {/* spacer for centering */}
              </div>

              <div className="border-b border-dashed border-gray-400 mb-1"></div>
              <div className="text-center font-bold tracking-widest mb-1 text-base">TICKET</div>
            </div>

            {/* Details 2-Column Grid */}
            <div className="grid grid-cols-2 gap-x-4 gap-y-1 leading-tight text-sm">
              <div className="space-y-0.5">
                <div className="flex"><span className="w-32 uppercase">Receipt No.</span><span>: {slip.slipNumber}</span></div>
                <div className="flex"><span className="w-32 uppercase">Date</span><span>: {formatDMY(slip.date)}</span></div>
                <div className="flex"><span className="w-32 uppercase">Driver Name</span><span>: {slip.driverName || slip.vehicle?.driverName || '-'}</span></div>
                <div className="flex"><span className="w-32 uppercase">Location</span><span>: {slip.source?.name || '-'}</span></div>
                <div className="flex"><span className="w-32 uppercase">Supervisor</span><span>: -</span></div>
              </div>
              <div className="space-y-0.5">
                <div className="flex"><span className="w-32 uppercase">Waste Type</span><span>: {slip.material?.name || '-'}</span></div>
                <div className="flex"><span className="w-32 uppercase">Vehicle</span><span>: {slip.vehicle?.vehicleNumber || '-'}</span></div>
                <div className="flex"><span className="w-32 uppercase">Party Name</span><span>: NATURE GREEN</span></div>
                <div className="flex"><span className="w-32 uppercase">Vehicle Type</span><span>: {slip.vehicleType?.name || slip.vehicle?.vehicleType?.name || '-'}</span></div>
                <div className="flex"><span className="w-32 uppercase">Zone Incharge</span><span>: -</span></div>
              </div>
            </div>

            <div className="border-b border-dashed border-gray-400"></div>

            {/* Weight Section */}
            <div className="grid grid-cols-2 gap-x-4 gap-y-1 leading-tight text-sm">
              <div className="space-y-0.5">
                <div className="flex"><span className="w-32 uppercase">Gross Weight</span><span>: {slip.grossWeight}</span></div>
                <div className="flex"><span className="w-32 uppercase">Tare Weight</span><span>: {slip.tareWeight}</span></div>
                <div className="flex"><span className="w-32 uppercase font-bold">Net Weight</span><span className="font-bold">: {slip.netWeight}</span></div>
              </div>
              <div className="space-y-0.5">
                <div className="flex"><span className="w-32 uppercase">Date Time</span><span>: {formatDateTimeDMY(slip.date)}</span></div>
                <div className="flex"><span className="w-32 uppercase">Date Time</span><span>: {formatDateTimeDMY(slip.date)}</span></div>
                <div className="flex"><span className="w-32 uppercase">Date Time</span><span>: {formatDateTimeDMY(slip.date)}</span></div>
              </div>
            </div>

            {/* Footer Signatures */}
            <div className="flex justify-between items-end mt-2 px-2">
              <div className="uppercase font-semibold border-t border-black pt-1">Driver Signature</div>
              <div className="uppercase font-bold text-xs tracking-wide">Thanks Visit Again</div>
              <div className="uppercase font-semibold border-t border-black pt-1">Operator Signature</div>
            </div>

          </div>
        ))}
      </div>
    );
  }

  // Otherwise, render customized project format (Urban Enviro / New Projects)
  const isUrbanEnviro = projectName.toLowerCase().includes('urban');
  let headerTitle = "ECOSTAN INFRA PVT. LTD.";
  let siteSubtitle = "Mathura Road, Aligarh";
  let partyName = "URBAN ENVIROTECH-ZONE=03";

  if (!isUrbanEnviro && projectName) {
    headerTitle = projectName;
    partyName = projectName.toUpperCase();
    siteSubtitle = slip.project?.address || "";
  }

  return (
    <div className="print-only w-full bg-white text-black py-0 px-8 m-0 font-mono text-sm">
      {copies.map((copyIndex) => (
        <div 
          key={copyIndex} 
          className={`flex flex-col justify-between ${copiesCount > 1 ? 'h-[31vh]' : 'min-h-[85mm] max-h-[92mm]'} border-b-2 border-dashed border-gray-400 pb-2 mb-2 last:border-b-0 last:mb-0 last:pb-0 box-border`}
        >

          {/* Header */}
          <div>
            <div className="text-center mb-2">
              <h1 className="text-base font-bold leading-tight">{headerTitle}</h1>
              {siteSubtitle && (
                <div className="text-xs font-medium text-gray-800 tracking-wide">{siteSubtitle}</div>
              )}
            </div>
          </div>

          {/* Details 2-Column Grid matching Urban Slip */}
          <div className="grid grid-cols-2 gap-x-6 gap-y-1 leading-tight text-xs">
            <div className="space-y-1">
              <div className="flex"><span className="w-36">Weigh slip no</span><span>: {slip.slipNumber}</span></div>
              <div className="flex"><span className="w-36">Vehicle no</span><span>: {slip.vehicle?.vehicleNumber || '-'}</span></div>
              <div className="flex"><span className="w-36">Material</span><span>: {slip.material?.name || 'SOLID WASTE'}</span></div>
            </div>
            <div className="space-y-1">
              <div className="flex"><span className="w-36">Customer Name</span><span>: {partyName}</span></div>
              <div className="flex"><span className="w-36">Vehicle Type</span><span>: {slip.vehicleType?.name || slip.vehicle?.vehicleType?.name || 'DUMPER'}</span></div>
            </div>
          </div>

          {/* Weight Section matching Urban Slip */}
          <div className="grid grid-cols-2 gap-x-6 gap-y-1 leading-tight text-xs my-2">
            <div className="space-y-1">
              <div className="flex"><span className="w-36">Weight1</span><span>: {slip.grossWeight}</span></div>
              <div className="flex"><span className="w-36">Weight2</span><span>: {slip.tareWeight}</span></div>
              <div className="flex font-bold"><span className="w-36">Net weight</span><span>: {slip.netWeight}</span></div>
            </div>
            <div className="space-y-1">
              <div className="flex"><span className="w-20">Date1</span><span>: {formatDateTimeDMY(slip.date)}</span></div>
              <div className="flex"><span className="w-20">Date2</span><span>: {formatDateTimeDMY(slip.date)}</span></div>
            </div>
          </div>

          {/* Footer Signatures */}
          <div className="flex justify-end items-end mt-2 pr-4 pb-1">
            <div className="text-xs font-medium">Operator signature</div>
          </div>

        </div>
      ))}
    </div>
  );
}
