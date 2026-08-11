

interface PrintSlipProps {
  slip: any; // The weighment slip object containing all details
}

export default function PrintSlip({ slip }: PrintSlipProps) {
  if (!slip) return null;

  // The format requires 3 identical tickets
  const copies = [1, 2, 3];

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
              <div className="flex"><span className="w-32 uppercase">Date</span><span>: {new Date(slip.date).toLocaleDateString()}</span></div>
              <div className="flex"><span className="w-32 uppercase">Driver Name</span><span>: {slip.driverName || slip.vehicle?.driverName || '-'}</span></div>
              <div className="flex"><span className="w-32 uppercase">Location</span><span>: {slip.source?.name || '-'}</span></div>
              <div className="flex"><span className="w-32 uppercase">Supervisor</span><span>: -</span></div>
            </div>
            <div className="space-y-0.5">
              <div className="flex"><span className="w-32 uppercase">Waste Type</span><span>: {slip.material?.name || '-'}</span></div>
              <div className="flex"><span className="w-32 uppercase">Vehicle</span><span>: {slip.vehicle?.vehicleNumber || '-'}</span></div>
              <div className="flex"><span className="w-32 uppercase">Party Name</span><span>: NATURE GREEN</span></div>
              <div className="flex"><span className="w-32 uppercase">Vehicle Type</span><span>: {slip.vehicle?.type || '-'}</span></div>
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
              <div className="flex"><span className="w-32 uppercase">Date Time</span><span>: {new Date(slip.date).toLocaleString()}</span></div>
              <div className="flex"><span className="w-32 uppercase">Date Time</span><span>: {new Date(slip.date).toLocaleString()}</span></div>
              <div className="flex"><span className="w-32 uppercase">Date Time</span><span>: {new Date(slip.date).toLocaleString()}</span></div>
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
