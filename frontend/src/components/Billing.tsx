import { useState, useRef, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Trash2, Plus, Printer } from 'lucide-react';
import api from '@/lib/api';
import { useNavigate } from 'react-router-dom';

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
  const [selectedPlan, setSelectedPlan] = useState('professional_annual');

  useEffect(() => {
    api.get('/settings').then(res => setSettings(res.data)).catch(err => console.error(err));
    api.get('/superadmin/projects').then(res => setProjects(res.data)).catch(err => console.error(err));
  }, []);

  const handleProjectSelect = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const p = projects.find(proj => proj.id === e.target.value);
    if (p) {
      setClientName(p.name);
    }
  };

  const generateSubscriptionBill = () => {
    let desc = '';
    let price = 0;
    
    if (selectedPlan === 'starter_monthly') {
      desc = 'Starter Site Plan - Monthly Subscription';
      price = 2499;
    } else if (selectedPlan === 'starter_annual') {
      desc = 'Starter Site Plan - Annual Subscription';
      price = 1999 * 12; // 23988
    } else if (selectedPlan === 'professional_monthly') {
      desc = 'Municipal Professional Plan - Monthly Subscription';
      price = 5999;
    } else if (selectedPlan === 'professional_annual') {
      desc = 'Municipal Professional Plan - Annual Subscription';
      price = 4799 * 12; // 57588
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

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-6 p-6 pb-20 max-w-5xl mx-auto">
      <div className="flex justify-between items-center no-print">
        <h2 className="text-3xl font-bold tracking-tight">Billing & Invoices</h2>
        <Button onClick={handlePrint}>
          <Printer className="mr-2 h-4 w-4" /> Print Invoice
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
            <select className="flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50" value={selectedPlan} onChange={e => setSelectedPlan(e.target.value)}>
              <option value="starter_monthly">Starter Site - Monthly (₹2,499)</option>
              <option value="starter_annual">Starter Site - Annual (₹23,988)</option>
              <option value="professional_monthly">Municipal Professional - Monthly (₹5,999)</option>
              <option value="professional_annual">Municipal Professional - Annual (₹57,588)</option>
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

      {/* PRINTABLE INVOICE TEMPLATE */}
      <div className="bg-white text-black p-10 print-only hidden">
        <div className="flex justify-between items-start border-b pb-6 mb-6">
          <div>
            {settings.logoUrl ? (
              <img src={settings.logoUrl} alt="Logo" className="h-16 mb-4" />
            ) : (
              <h1 className="text-2xl font-bold text-green-700 mb-2">{settings.companyName || 'WeighT360Pro'}</h1>
            )}
            <p className="text-sm text-gray-600 whitespace-pre-line">{settings.address || 'Company Address'}</p>
          </div>
          <div className="text-right">
            <h2 className="text-3xl font-light text-gray-400 mb-2">INVOICE</h2>
            <p className="font-semibold text-gray-800">{invoiceNumber}</p>
            <p className="text-sm text-gray-600">Date: {invoiceDate}</p>
          </div>
        </div>

        <div className="mb-8">
          <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-2">Bill To</h3>
          <p className="font-semibold text-lg">{clientName || 'Client Name'}</p>
          {clientAddress && <p className="text-gray-600">{clientAddress}</p>}
          {clientPhone && <p className="text-gray-600">{clientPhone}</p>}
        </div>

        <table className="w-full text-left mb-8">
          <thead>
            <tr className="border-b-2 border-gray-300">
              <th className="py-3 font-semibold text-gray-700">Description</th>
              <th className="py-3 font-semibold text-gray-700 text-right">Qty</th>
              <th className="py-3 font-semibold text-gray-700 text-right">Unit Price</th>
              <th className="py-3 font-semibold text-gray-700 text-right">Amount</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item, index) => (
              <tr key={index} className="border-b border-gray-200">
                <td className="py-3 text-gray-800">{item.description || '-'}</td>
                <td className="py-3 text-gray-800 text-right">{item.quantity}</td>
                <td className="py-3 text-gray-800 text-right">₹{item.price.toFixed(2)}</td>
                <td className="py-3 text-gray-800 text-right">₹{(item.quantity * item.price).toFixed(2)}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <div className="flex justify-end mb-12">
          <div className="w-64 space-y-3">
            <div className="flex justify-between text-gray-600">
              <span>Subtotal</span>
              <span>₹{subtotal.toFixed(2)}</span>
            </div>
            {taxRate > 0 && (
              <div className="flex justify-between text-gray-600">
                <span>Tax ({taxRate}%)</span>
                <span>₹{tax.toFixed(2)}</span>
              </div>
            )}
            <div className="flex justify-between text-xl font-bold text-gray-800 border-t pt-3">
              <span>Total</span>
              <span>₹{total.toFixed(2)}</span>
            </div>
          </div>
        </div>

        <div className="border-t pt-6 text-sm text-gray-500 text-center mt-12">
          <p>Thank you for your business.</p>
        </div>
      </div>
    </div>
  );
}
