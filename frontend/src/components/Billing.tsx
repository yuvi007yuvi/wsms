import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Trash2, Plus, Printer } from 'lucide-react';
import api from '@/lib/api';
import { useNavigate } from 'react-router-dom';

const formatIndianNumber = (num: number) => {
  return new Intl.NumberFormat('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(num);
};

const numberToWords = (num: number): string => {
  const a = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
  const b = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];
  
  const numStr = Math.floor(num).toString();
  if (numStr.length > 9) return 'Amount too large';
  
  const n = ('000000000' + numStr).slice(-9).match(/^(\d{2})(\d{2})(\d{2})(\d{1})(\d{2})$/);
  if (!n) return '';
  let str = '';
  str += (Number(n[1]) != 0) ? (a[Number(n[1])] || b[Number(n[1][0])] + ' ' + a[Number(n[1][1])]) + ' Crore ' : '';
  str += (Number(n[2]) != 0) ? (a[Number(n[2])] || b[Number(n[2][0])] + ' ' + a[Number(n[2][1])]) + ' Lakh ' : '';
  str += (Number(n[3]) != 0) ? (a[Number(n[3])] || b[Number(n[3][0])] + ' ' + a[Number(n[3][1])]) + ' Thousand ' : '';
  str += (Number(n[4]) != 0) ? (a[Number(n[4])] || b[Number(n[4][0])] + ' ' + a[Number(n[4][1])]) + ' Hundred ' : '';
  str += (Number(n[5]) != 0) ? ((str != '') ? 'and ' : '') + (a[Number(n[5])] || b[Number(n[5][0])] + ' ' + a[Number(n[5][1])]) : '';
  
  return str.trim() ? str.trim() + ' Only' : 'Zero Only';
};

export default function Billing() {
  const navigate = useNavigate();
  
  useEffect(() => {
    const role = localStorage.getItem('role');
    if (role !== 'superadmin') {
      navigate('/dashboard');
    }
  }, [navigate]);

  const [clientName, setClientName] = useState('');
  const [clientAddress, setClientAddress] = useState('');
  const [clientPhone, setClientPhone] = useState('');
  const [invoiceNumber, setInvoiceNumber] = useState('INV-001');
  const [invoiceDate, setInvoiceDate] = useState(new Date().toISOString().slice(0, 10));
  
  const [items, setItems] = useState([{ id: 1, description: '', quantity: 1, price: 0 }]);
  const [taxRate, setTaxRate] = useState(0);
  const [settings, setSettings] = useState<any>({});
  
  const [projects, setProjects] = useState<any[]>([]);
  const [invoices, setInvoices] = useState<any[]>([]);
  const [selectedPlanBase, setSelectedPlanBase] = useState('professional');
  const [selectedDuration, setSelectedDuration] = useState('1'); // Months
  const [selectedProjectId, setSelectedProjectId] = useState('');
  
  // Payment Details
  const [accountNumber, setAccountNumber] = useState('');
  const [ifscCode, setIfscCode] = useState('');

  const fetchInvoices = () => {
    api.get('/superadmin/invoices').then(res => setInvoices(res.data)).catch(err => console.error(err));
  };

  useEffect(() => {
    api.get('/settings').then(res => setSettings(res.data)).catch(err => console.error(err));
    api.get('/superadmin/projects').then(res => setProjects(res.data)).catch(err => console.error(err));
    fetchInvoices();
  }, []);

  const handleProjectSelect = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const val = e.target.value;
    setSelectedProjectId(val);
    const p = projects.find(proj => proj.id === val);
    if (p) {
      setClientName(p.name);
    }
  };

  const generateSubscriptionBill = () => {
    let desc = '';
    let price = 0;
    
    const durationNum = parseInt(selectedDuration);
    let durationText = durationNum === 12 ? 'Annual' : `${durationNum} Month(s)`;

    if (selectedPlanBase === 'starter') {
      desc = `Starter Site Plan - ${durationText} Subscription`;
      if (durationNum === 12) {
        price = 1999 * 12; // 23988
      } else {
        price = 2499 * durationNum;
      }
    } else if (selectedPlanBase === 'professional') {
      desc = `Municipal Professional Plan - ${durationText} Subscription`;
      if (durationNum === 12) {
        price = 4799 * 12; // 57588
      } else {
        price = 5999 * durationNum;
      }
    }

    setItems([{ id: Date.now(), description: desc, quantity: 1, price }]);
  };

  const handleItemChange = (id: number, field: string, value: string | number) => {
    setItems(items.map(item => item.id === id ? { ...item, [field]: value } : item));
  };

  const addItem = () => {
    setItems([...items, { id: Date.now(), description: '', quantity: 1, price: 0 }]);
  };

  const removeItem = (id: number) => {
    setItems(items.filter(item => item.id !== id));
  };

  const subtotal = items.reduce((acc, item) => acc + (item.quantity * item.price), 0);
  const tax = subtotal * (taxRate / 100);
  const total = subtotal + tax;

  const handleSaveAndPrint = async () => {
    try {
      await api.post('/superadmin/invoices', {
        invoiceNumber,
        date: invoiceDate,
        projectId: selectedProjectId || null,
        clientName,
        clientAddress,
        clientPhone,
        subtotal,
        taxRate,
        total,
        items
      });
      fetchInvoices();
      window.print();
    } catch (error) {
      console.error('Failed to save invoice', error);
      alert('Failed to save invoice. Printing anyway...');
      window.print();
    }
  };

  const loadPastInvoice = (inv: any) => {
    setInvoiceNumber(inv.invoiceNumber);
    setInvoiceDate(new Date(inv.date).toISOString().slice(0, 10));
    setSelectedProjectId(inv.projectId || '');
    setClientName(inv.clientName);
    setClientAddress(inv.clientAddress || '');
    setClientPhone(inv.clientPhone || '');
    setTaxRate(inv.taxRate);
    setItems(inv.items.map((item: any) => ({
      id: item.id,
      description: item.description,
      quantity: item.quantity,
      price: item.price
    })));
  };

  const deleteInvoice = async (id: string) => {
    if (!confirm('Are you sure you want to delete this invoice?')) return;
    try {
      await api.delete(`/superadmin/invoices/${id}`);
      fetchInvoices();
    } catch (error) {
      console.error('Failed to delete invoice', error);
      alert('Failed to delete invoice');
    }
  };

  return (
    <div className="space-y-6 p-6 pb-20 print:p-0 print:pb-0 print:space-y-0 max-w-5xl mx-auto">
      <div className="flex justify-between items-center no-print">
        <h2 className="text-3xl font-bold tracking-tight">Billing & Invoices</h2>
        <Button onClick={handleSaveAndPrint}>
          <Printer className="mr-2 h-4 w-4" /> Save & Print
        </Button>
      </div>
      
      <Card className="no-print bg-blue-50 border-blue-200">
        <CardHeader className="py-4">
          <CardTitle className="text-blue-800 text-lg">Auto-Generate Subscription Bill</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col md:flex-row gap-4 items-end pb-4">
          <div className="space-y-2 flex-1">
            <Label>Select Client Project</Label>
            <select className="flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50" onChange={handleProjectSelect} defaultValue="">
              <option value="" disabled>Select a project...</option>
              {projects.map(p => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          </div>
          <div className="space-y-2 flex-1">
            <Label>Subscription Plan</Label>
            <select className="flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50" value={selectedPlanBase} onChange={e => setSelectedPlanBase(e.target.value)}>
              <option value="starter">Starter Site Plan (Base ₹2,499/mo)</option>
              <option value="professional">Municipal Professional (Base ₹5,999/mo)</option>
            </select>
          </div>
          <div className="space-y-2 flex-1">
            <Label>Duration</Label>
            <select className="flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50" value={selectedDuration} onChange={e => setSelectedDuration(e.target.value)}>
              <option value="1">1 Month</option>
              <option value="3">3 Months</option>
              <option value="6">6 Months</option>
              <option value="12">1 Year (Annual Discount)</option>
            </select>
          </div>
          <Button onClick={generateSubscriptionBill} className="bg-blue-600 hover:bg-blue-700">Generate</Button>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 no-print">
        <Card>
          <CardHeader>
            <CardTitle>Client Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Client Name</Label>
              <Input value={clientName} onChange={e => setClientName(e.target.value)} placeholder="e.g. Acme Corp" />
            </div>
            <div className="space-y-2">
              <Label>Address</Label>
              <Input value={clientAddress} onChange={e => setClientAddress(e.target.value)} placeholder="e.g. 123 Main St" />
            </div>
            <div className="space-y-2">
              <Label>Phone / Contact</Label>
              <Input value={clientPhone} onChange={e => setClientPhone(e.target.value)} placeholder="e.g. +1 234 567 8900" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Invoice Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Invoice Number</Label>
              <Input value={invoiceNumber} onChange={e => setInvoiceNumber(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Date</Label>
              <Input type="date" value={invoiceDate} onChange={e => setInvoiceDate(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Tax Rate (%)</Label>
              <Input type="number" min="0" max="100" value={taxRate} onChange={e => setTaxRate(Number(e.target.value))} />
            </div>
            <div className="space-y-2">
              <Label>Bank Account Number</Label>
              <Input value={accountNumber} onChange={e => setAccountNumber(e.target.value)} placeholder="Enter Account Number" />
            </div>
            <div className="space-y-2">
              <Label>IFSC Code</Label>
              <Input value={ifscCode} onChange={e => setIfscCode(e.target.value)} placeholder="Enter IFSC Code" />
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="no-print">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Line Items</CardTitle>
          <Button variant="outline" size="sm" onClick={addItem}>
            <Plus className="mr-2 h-4 w-4" /> Add Item
          </Button>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Description</TableHead>
                <TableHead className="w-[100px]">Qty</TableHead>
                <TableHead className="w-[150px]">Unit Price</TableHead>
                <TableHead className="w-[100px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map((item) => (
                <TableRow key={item.id}>
                  <TableCell>
                    <Input value={item.description} onChange={e => handleItemChange(item.id, 'description', e.target.value)} placeholder="Item description" />
                  </TableCell>
                  <TableCell>
                    <Input type="number" min="1" value={item.quantity} onChange={e => handleItemChange(item.id, 'quantity', Number(e.target.value))} />
                  </TableCell>
                  <TableCell>
                    <Input type="number" min="0" value={item.price} onChange={e => handleItemChange(item.id, 'price', Number(e.target.value))} />
                  </TableCell>
                  <TableCell>
                    <Button variant="ghost" size="icon" onClick={() => removeItem(item.id)} className="text-red-500 hover:text-red-700 hover:bg-red-50">
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Card className="no-print">
        <CardHeader>
          <CardTitle>Billing History</CardTitle>
        </CardHeader>
        <CardContent>
          {invoices.length === 0 ? (
            <p className="text-sm text-gray-500 text-center py-4">No past invoices found.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Invoice #</TableHead>
                  <TableHead>Client</TableHead>
                  <TableHead>Project</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                  <TableHead className="text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {invoices.map((inv) => (
                  <TableRow key={inv.id}>
                    <TableCell>{new Date(inv.date).toLocaleDateString()}</TableCell>
                    <TableCell className="font-medium">{inv.invoiceNumber}</TableCell>
                    <TableCell>{inv.clientName}</TableCell>
                    <TableCell>{inv.project?.name || '-'}</TableCell>
                    <TableCell className="text-right">₹{formatIndianNumber(inv.total)}</TableCell>
                    <TableCell className="text-right flex items-center justify-end gap-2">
                      <Button variant="default" size="sm" className="bg-blue-600 hover:bg-blue-700" onClick={() => loadPastInvoice(inv)}>
                        <Printer className="w-3 h-3 mr-1" /> Load & Print
                      </Button>
                      <Button variant="outline" size="icon" className="h-8 w-8 text-red-500 hover:text-red-700 hover:bg-red-50" onClick={() => deleteInvoice(inv.id)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* PRINTABLE INVOICE TEMPLATE (TALLY FORMAT) */}
      <div className="bg-white text-black print-only p-4 font-sans">
        <div className="border border-black flex flex-col" style={{ minHeight: '1000px' }}>
          {/* Header */}
          <div className="text-center font-bold text-lg border-b border-black py-1 tracking-wide uppercase">
            Tax Invoice
          </div>
          
          {/* Company & Invoice Details */}
          <div className="flex border-b border-black">
            <div className="w-1/2 border-r border-black p-2 flex flex-col">
              <span className="font-bold text-xl">{settings.companyName !== 'Default Company Ltd' && settings.companyName ? settings.companyName : 'WeighT360Pro Solutions'}</span>
              <span className="whitespace-pre-line mt-1 text-sm">{settings.address || 'Tech Park, Block A\nIndustrial Area'}</span>
            </div>
            <div className="w-1/2 flex flex-col">
              <div className="flex border-b border-black flex-1">
                <div className="w-1/2 border-r border-black p-2">
                  <span className="text-xs text-gray-700">Invoice No.</span>
                  <div className="font-bold">{invoiceNumber}</div>
                </div>
                <div className="w-1/2 p-2">
                  <span className="text-xs text-gray-700">Dated</span>
                  <div className="font-bold">{new Date(invoiceDate).toLocaleDateString('en-GB')}</div>
                </div>
              </div>
              <div className="flex flex-1 p-2">
                <div className="w-full">
                  <span className="text-xs text-gray-700">Mode/Terms of Payment</span>
                  <div className="font-bold">-</div>
                </div>
              </div>
            </div>
          </div>
          
          {/* Buyer Details */}
          <div className="border-b border-black p-2 min-h-[100px]">
            <span className="text-xs text-gray-700">Buyer (Bill to)</span>
            <div className="font-bold text-lg mt-1">{clientName || 'Client Name'}</div>
            {clientAddress && <div className="text-sm">{clientAddress}</div>}
            {clientPhone && <div className="text-sm">{clientPhone}</div>}
          </div>
          
          {/* Items Table */}
          <div className="flex-grow flex flex-col relative border-b border-black">
            {/* Absolute Vertical Borders */}
            <div className="absolute inset-0 flex pointer-events-none">
              <div className="w-12 border-r border-black"></div>
              <div className="flex-1 border-r border-black"></div>
              <div className="w-24 border-r border-black"></div>
              <div className="w-28 border-r border-black"></div>
              <div className="w-16 border-r border-black"></div>
              <div className="w-32"></div>
            </div>

            <table className="w-full text-sm border-collapse relative z-10">
              <thead>
                <tr className="border-b border-black bg-gray-50/50">
                  <th className="p-1 w-12 font-bold text-center">Sl<br/>No.</th>
                  <th className="p-1 font-bold text-center">Description of Goods</th>
                  <th className="p-1 w-24 font-bold text-center">Quantity</th>
                  <th className="p-1 w-28 font-bold text-center">Rate</th>
                  <th className="p-1 w-16 font-bold text-center">per</th>
                  <th className="p-1 w-32 font-bold text-center">Amount</th>
                </tr>
              </thead>
              <tbody>
                {items.map((item, index) => (
                  <tr key={index}>
                    <td className="p-1 text-center align-top">{index + 1}</td>
                    <td className="p-1 align-top font-bold">{item.description || '-'}</td>
                    <td className="p-1 text-center align-top font-bold">{item.quantity}</td>
                    <td className="p-1 text-right align-top">{formatIndianNumber(item.price)}</td>
                    <td className="p-1 text-center align-top">Nos</td>
                    <td className="p-1 text-right align-top font-bold">{formatIndianNumber(item.quantity * item.price)}</td>
                  </tr>
                ))}
                {/* Empty rows to push the table footer to the bottom */}
                <tr>
                    <td className="p-1" style={{ height: '100%' }}></td>
                    <td className="p-1"></td>
                    <td className="p-1"></td>
                    <td className="p-1"></td>
                    <td className="p-1"></td>
                    <td className="p-1"></td>
                </tr>
              </tbody>
              <tfoot>
                {taxRate > 0 && (
                  <tr className="border-t border-black bg-gray-50/50">
                    <td className="p-1"></td>
                    <td className="p-1 text-right font-bold italic">Tax ({taxRate}%)</td>
                    <td className="p-1"></td>
                    <td className="p-1"></td>
                    <td className="p-1"></td>
                    <td className="p-1 text-right font-bold">{formatIndianNumber(tax)}</td>
                  </tr>
                )}
                <tr className="border-t border-black">
                  <td className="p-1 text-right font-bold" colSpan={5}>Total</td>
                  <td className="p-1 text-right font-bold text-base">₹ {formatIndianNumber(total)}</td>
                </tr>
              </tfoot>
            </table>
          </div>
          
          {/* Amount in words & Bank Details */}
          <div className="border-t border-black p-2 flex">
            <div className="w-1/2">
              <span className="text-xs text-gray-700">Amount Chargeable (in words)</span>
              <div className="font-bold mt-1">INR {numberToWords(total)}</div>
            </div>
            <div className="w-1/2 text-sm border-l border-black -my-2 py-2 px-2 -mr-2">
              <span className="text-xs text-gray-700 font-bold underline mb-1 block">Company's Bank Details</span>
              <div><span className="text-gray-600">A/c No.:</span> <span className="font-bold">{accountNumber || '-'}</span></div>
              <div><span className="text-gray-600">IFSC:</span> <span className="font-bold">{ifscCode || '-'}</span></div>
            </div>
          </div>
          
          {/* Footer */}
          <div className="flex border-t border-black min-h-[120px] relative">
            <div className="w-1/2 border-r border-black p-2 flex flex-col justify-end text-xs">
              <div className="underline font-bold mb-1">Declaration</div>
              <div>We declare that this invoice shows the actual price of the goods described and that all particulars are true and correct.</div>
            </div>
            <div className="w-1/2 p-2 flex flex-col justify-between items-end text-right relative overflow-hidden">
              <div className="font-bold text-sm z-10 bg-white/80 px-1">for {settings.companyName !== 'Default Company Ltd' && settings.companyName ? settings.companyName : 'WeighT360Pro Solutions'}</div>
              
              {/* CSS Seal/Stamp */}
              <div className="absolute right-12 top-4 opacity-50 transform -rotate-[15deg] pointer-events-none">
                <div className="w-24 h-24 rounded-full border-4 border-blue-800 flex items-center justify-center relative">
                  <div className="w-20 h-20 rounded-full border border-blue-800 flex items-center justify-center flex-col text-blue-800 font-bold uppercase text-center leading-none">
                    <span className="text-[10px] tracking-widest block -mb-1 mt-1">Official</span>
                    <span className="text-sm border-t-2 border-b-2 border-blue-800 w-[110%] text-center py-1 my-[6px]">SEAL</span>
                    <span className="text-[8px] tracking-wider block -mt-1">{new Date().getFullYear()}</span>
                  </div>
                </div>
              </div>

              <div className="text-xs font-bold z-10 bg-white/80 px-1 mt-16">Authorised Signatory</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
