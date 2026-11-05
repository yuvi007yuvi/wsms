import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { 
  Key, 
  Copy, 
  Check, 
  Share2, 
  Send, 
  Code2, 
  Layers, 
  ShieldCheck,
  RefreshCw,
  FileJson,
  FileText
} from 'lucide-react';
import api from '@/lib/api';

export default function ApiGenerator() {
  const { toast } = useToast();
  const [projects, setProjects] = useState<any[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState<string>('');
  const [activeTab, setActiveTab] = useState<'slips' | 'vehicles' | 'summary'>('slips');
  
  // API Key state
  const defaultApiKey = 'ga_live_wsms_sec_99a8b7c6d5e4';
  const [apiKey, setApiKey] = useState(defaultApiKey);
  const [copiedKey, setCopiedKey] = useState(false);
  const [copiedUrl, setCopiedUrl] = useState(false);
  const [copiedCurl, setCopiedCurl] = useState(false);

  // Test parameters
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [limit, setLimit] = useState('10');

  // Live test output
  const [apiResponse, setApiResponse] = useState<any>(null);
  const [loadingResponse, setLoadingResponse] = useState(false);

  const fetchProjects = async () => {
    try {
      const res = await api.get('/external/projects');
      const data = Array.isArray(res.data) ? res.data : [];
      setProjects(data);
      if (data.length > 0 && !selectedProjectId) {
        setSelectedProjectId(data[0].id);
      }
    } catch (error) {
      console.error('Failed to load projects:', error);
    }
  };

  useEffect(() => {
    fetchProjects();
  }, []);

  const getBaseOrigin = () => {
    return window.location.origin;
  };

  const getEndpointPath = () => {
    const targetProject = selectedProjectId || 'all';
    switch (activeTab) {
      case 'slips':
        return `/api/external/projects/${targetProject}/slips`;
      case 'vehicles':
        return `/api/external/projects/${targetProject}/vehicles`;
      case 'summary':
        return `/api/external/projects/${targetProject}/summary`;
    }
  };

  const getQueryString = () => {
    const params = new URLSearchParams();
    if (activeTab === 'slips' || activeTab === 'summary') {
      if (dateFrom) params.append('dateFrom', dateFrom);
      if (dateTo) params.append('dateTo', dateTo);
    }
    if (activeTab === 'slips' || activeTab === 'vehicles') {
      if (limit) params.append('limit', limit);
    }
    const qs = params.toString();
    return qs ? `?${qs}` : '';
  };

  const fullUrl = `${getBaseOrigin()}${getEndpointPath()}${getQueryString()}`;

  const getCurlSnippet = () => {
    return `curl -X GET "${fullUrl}" \\\n  -H "x-api-key: ${apiKey}" \\\n  -H "Accept: application/json"`;
  };

  const copyToClipboard = (text: string, type: 'key' | 'url' | 'curl') => {
    navigator.clipboard.writeText(text);
    if (type === 'key') {
      setCopiedKey(true);
      setTimeout(() => setCopiedKey(false), 2000);
    } else if (type === 'url') {
      setCopiedUrl(true);
      setTimeout(() => setCopiedUrl(false), 2000);
    } else {
      setCopiedCurl(true);
      setTimeout(() => setCopiedCurl(false), 2000);
    }
    toast({ title: 'Copied to clipboard!' });
  };

  const generateNewKey = () => {
    const randomHex = Array.from({ length: 24 }, () => Math.floor(Math.random() * 16).toString(16)).join('');
    const newKey = `wsms_live_${randomHex}`;
    setApiKey(newKey);
    toast({ title: 'Generated New API Key', description: 'Be sure to configure this in your external consumer system.' });
  };

  const testApi = async () => {
    setLoadingResponse(true);
    setApiResponse(null);
    try {
      const endpoint = `${getEndpointPath()}${getQueryString()}`;
      const res = await api.get(endpoint);
      setApiResponse(res.data);
      toast({ title: 'API executed successfully' });
    } catch (error: any) {
      setApiResponse(error.response?.data || { error: 'Request failed' });
      toast({ title: 'API Test Failed', variant: 'destructive' });
    } finally {
      setLoadingResponse(false);
    }
  };

  const selectedProjectObj = projects.find(p => p.id === selectedProjectId);

  const handleDownloadApiDoc = () => {
    const projName = selectedProjectObj?.name || 'All Projects';
    const projId = selectedProjectId || 'all';
    const baseUrl = getBaseOrigin();
    const currentDate = new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });

    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>API Documentation & Integration Credentials - ${projName}</title>
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; line-height: 1.6; color: #1e293b; padding: 40px; margin: 0; background: #fff; }
          .header { border-bottom: 3px solid #2563eb; padding-bottom: 20px; margin-bottom: 30px; display: flex; justify-content: space-between; align-items: flex-end; }
          .header h1 { margin: 0; color: #0f172a; font-size: 26px; }
          .header p { margin: 5px 0 0 0; color: #64748b; font-size: 14px; }
          .badge { background: #eff6ff; color: #1d4ed8; padding: 4px 10px; border-radius: 4px; font-weight: 600; font-size: 12px; border: 1px solid #bfdbfe; }
          .section { margin-bottom: 30px; }
          .section-title { font-size: 18px; font-weight: 700; color: #0f172a; border-bottom: 1px solid #e2e8f0; padding-bottom: 8px; margin-bottom: 15px; }
          .card { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 20px; margin-bottom: 20px; }
          .field { margin-bottom: 12px; }
          .field-label { font-size: 12px; font-weight: 600; text-transform: uppercase; color: #64748b; letter-spacing: 0.5px; margin-bottom: 4px; }
          .field-value { font-family: monospace; font-size: 14px; background: #fff; padding: 8px 12px; border: 1px solid #cbd5e1; border-radius: 4px; color: #0f172a; word-break: break-all; }
          .endpoint { background: #fff; border: 1px solid #e2e8f0; border-left: 4px solid #2563eb; border-radius: 4px; padding: 15px; margin-bottom: 15px; }
          .endpoint-header { display: flex; align-items: center; gap: 10px; margin-bottom: 8px; }
          .method { background: #22c55e; color: #fff; font-weight: 700; font-size: 11px; padding: 3px 8px; border-radius: 3px; font-family: monospace; }
          .path { font-family: monospace; font-size: 13px; font-weight: 600; color: #0f172a; }
          .desc { font-size: 13px; color: #475569; margin: 0 0 10px 0; }
          pre { background: #0f172a; color: #e2e8f0; padding: 12px; border-radius: 6px; font-size: 12px; overflow-x: auto; margin: 8px 0 0 0; }
          .footer { border-top: 1px solid #e2e8f0; padding-top: 15px; margin-top: 40px; font-size: 12px; color: #94a3b8; display: flex; justify-content: space-between; }
          @media print {
            body { padding: 20px; }
            .no-print { display: none; }
          }
        </style>
      </head>
      <body>
        <div class="header">
          <div>
            <h1>REST API Integration Specification</h1>
            <p>Live Weighment Data Synchronization & Telemetry Interface</p>
          </div>
          <div style="text-align: right;">
            <span class="badge">CONFIDENTIAL</span>
            <div style="font-size: 12px; color: #64748b; margin-top: 5px;">Date: ${currentDate}</div>
          </div>
        </div>

        <div class="section">
          <div class="section-title">1. Project & Authentication Credentials</div>
          <div class="card">
            <div class="field">
              <div class="field-label">Target Project / Facility</div>
              <div class="field-value">${projName} (Project ID: ${projId})</div>
            </div>
            <div class="field">
              <div class="field-label">Authentication Header Key</div>
              <div class="field-value">x-api-key</div>
            </div>
            <div class="field">
              <div class="field-label">Integration Secret Key (x-api-key)</div>
              <div class="field-value" style="color: #d97706; font-weight: 700;">${apiKey}</div>
            </div>
            <div class="field">
              <div class="field-label">Base API URL</div>
              <div class="field-value">${baseUrl}/api</div>
            </div>
          </div>
        </div>

        <div class="section">
          <div class="section-title">2. Available Data Sharing Endpoints</div>

          <!-- Endpoint 1 -->
          <div class="endpoint">
            <div class="endpoint-header">
              <span class="method">GET</span>
              <span class="path">/api/external/projects/${projId}/slips</span>
            </div>
            <p class="desc">Retrieves live weighment slips recorded for this project with vehicle details, tare weight, gross weight, net weight, operator and timestamp.</p>
            <div style="font-size: 12px; color: #64748b; margin-bottom: 4px;"><b>Query Parameters:</b> <code>dateFrom (YYYY-MM-DD)</code>, <code>dateTo (YYYY-MM-DD)</code>, <code>limit (default 50)</code>, <code>search (optional)</code></div>
            <pre>curl -X GET "${baseUrl}/api/external/projects/${projId}/slips?limit=10" \
  -H "x-api-key: ${apiKey}" \
  -H "Accept: application/json"</pre>
          </div>

          <!-- Endpoint 2 -->
          <div class="endpoint">
            <div class="endpoint-header">
              <span class="method">GET</span>
              <span class="path">/api/external/projects/${projId}/vehicles</span>
            </div>
            <p class="desc">Returns complete fleet register for this project with vehicle numbers, vehicle type, driver names, mobile, and tare weights.</p>
            <pre>curl -X GET "${baseUrl}/api/external/projects/${projId}/vehicles" \
  -H "x-api-key: ${apiKey}" \
  -H "Accept: application/json"</pre>
          </div>

          <!-- Endpoint 3 -->
          <div class="endpoint">
            <div class="endpoint-header">
              <span class="method">GET</span>
              <span class="path">/api/external/projects/${projId}/summary</span>
            </div>
            <p class="desc">Provides real-time aggregated metrics including total trips, net tonnage, average load, and material-wise weight summaries.</p>
            <div style="font-size: 12px; color: #64748b; margin-bottom: 4px;"><b>Query Parameters:</b> <code>dateFrom (YYYY-MM-DD)</code>, <code>dateTo (YYYY-MM-DD)</code></div>
            <pre>curl -X GET "${baseUrl}/api/external/projects/${projId}/summary" \
  -H "x-api-key: ${apiKey}" \
  -H "Accept: application/json"</pre>
          </div>
        </div>

        <div class="section">
          <div class="section-title">3. Standard Response Format (JSON)</div>
          <pre>{
  "success": true,
  "projectId": "${projId}",
  "meta": {
    "page": 1,
    "limit": 10,
    "totalRecords": 1,
    "totalNetWeightKg": 14500,
    "totalNetWeightTons": "14.500"
  },
  "data": [
    {
      "id": "uuid",
      "slipNumber": "WS261105-0001",
      "date": "2026-11-05T14:30:00.000Z",
      "grossWeight": 25000,
      "tareWeight": 10500,
      "netWeight": 14500,
      "vehicle": { "vehicleNumber": "UP80AB1234", "vehicleType": { "name": "Dumper" } },
      "material": { "name": "Municipal Solid Waste" },
      "source": { "name": "Zone 1" },
      "destination": { "name": "Processing Plant" }
    }
  ]
}</pre>
        </div>

        <div class="footer">
          <span>Nature Green Tools & Machines — Weighment Slip Management System (WSMS)</span>
          <span>Security Notice: Keep your x-api-key confidential</span>
        </div>
      </body>
      </html>
    `;

    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(htmlContent);
      printWindow.document.close();
      printWindow.focus();
      setTimeout(() => {
        printWindow.print();
      }, 500);
    } else {
      toast({ title: 'Popup blocked', description: 'Please allow popups to download/print the API document', variant: 'destructive' });
    }
  };

  return (
    <div className="flex flex-col h-full space-y-5 p-1 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex justify-between items-center bg-white p-5 rounded-lg border border-slate-200 shadow-sm">
        <div>
          <div className="flex items-center gap-2">
            <Share2 className="h-6 w-6 text-blue-600" />
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">Data Sharing & API Generator</h1>
          </div>
          <p className="text-sm text-slate-500 mt-1">
            Generate and test secure REST API feeds to share real-time weighment records, vehicles, and summary data with external platforms.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Badge variant="outline" className="px-3 py-1.5 bg-green-50 text-green-700 border-green-200 gap-1.5 text-xs font-semibold">
            <ShieldCheck className="h-4 w-4" /> Live Sync Ready
          </Badge>
          <Button 
            onClick={handleDownloadApiDoc}
            className="bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs tracking-wide h-9 px-3.5 gap-2 shadow-sm rounded-md"
          >
            <FileText className="h-4 w-4" /> Generate API Document & Credentials
          </Button>
        </div>
      </div>

      {/* Main Configuration Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        
        {/* Left Column: API Credentials & Project Scope */}
        <div className="space-y-5">
          <Card className="border-slate-200 shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-semibold flex items-center gap-2 text-slate-800">
                <Layers className="h-4 w-4 text-blue-600" /> 1. Select Project Scope
              </CardTitle>
              <CardDescription className="text-xs">
                Pick the specific project whose data you want to export or share.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label className="text-xs font-semibold text-slate-700">Project</Label>
                <select
                  value={selectedProjectId}
                  onChange={e => setSelectedProjectId(e.target.value)}
                  className="w-full mt-1 h-9 rounded-md border border-slate-300 bg-white px-3 py-1 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="all">-- All Projects (Combined Feed) --</option>
                  {projects.map(p => (
                    <option key={p.id} value={p.id}>
                      {p.name} ({p._count?.weighmentSlips || 0} slips, {p._count?.vehicles || 0} vehicles)
                    </option>
                  ))}
                </select>
              </div>

              {selectedProjectObj && (
                <div className="p-3 bg-slate-50 rounded-md border border-slate-200 text-xs space-y-1">
                  <div className="font-semibold text-slate-700">{selectedProjectObj.name}</div>
                  <div className="text-slate-500">{selectedProjectObj.address || 'No address set'}</div>
                  <div className="flex gap-4 pt-1 text-slate-600">
                    <span>Slips: <b>{selectedProjectObj._count?.weighmentSlips || 0}</b></span>
                    <span>Vehicles: <b>{selectedProjectObj._count?.vehicles || 0}</b></span>
                    <span>Users: <b>{selectedProjectObj._count?.users || 0}</b></span>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="border-slate-200 shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-semibold flex items-center gap-2 text-slate-800">
                <Key className="h-4 w-4 text-amber-600" /> 2. API Key Authentication
              </CardTitle>
              <CardDescription className="text-xs">
                Static integration key passed in the <code className="text-blue-600">x-api-key</code> request header.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <Label className="text-xs font-semibold text-slate-700">Client Secret Key</Label>
                <div className="flex mt-1">
                  <Input 
                    value={apiKey} 
                    readOnly 
                    className="font-mono text-xs bg-slate-50 rounded-r-none border-r-0"
                  />
                  <Button 
                    type="button" 
                    variant="outline" 
                    className="rounded-l-none border-l h-9 px-3"
                    onClick={() => copyToClipboard(apiKey, 'key')}
                  >
                    {copiedKey ? <Check className="h-4 w-4 text-green-600" /> : <Copy className="h-4 w-4" />}
                  </Button>
                </div>
              </div>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={generateNewKey} 
                className="w-full text-xs font-semibold gap-1.5 h-8 border-slate-300"
              >
                <RefreshCw className="h-3.5 w-3.5" /> Generate Key Alias
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Right Column: Endpoint Selector, Query Builder & Live Tester */}
        <div className="lg:col-span-2 space-y-5">
          <Card className="border-slate-200 shadow-sm">
            <CardHeader className="pb-3">
              <div className="flex justify-between items-center">
                <div>
                  <CardTitle className="text-base font-semibold flex items-center gap-2 text-slate-800">
                    <Code2 className="h-4 w-4 text-blue-600" /> 3. Select Data Endpoint
                  </CardTitle>
                  <CardDescription className="text-xs">
                    Choose which data stream you wish to generate API documentation and URLs for.
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Endpoint Tabs */}
              <div className="grid grid-cols-3 gap-2 p-1 bg-slate-100 rounded-lg text-center text-xs font-semibold">
                <button
                  type="button"
                  onClick={() => setActiveTab('slips')}
                  className={`py-2 px-3 rounded-md transition-all ${
                    activeTab === 'slips' ? 'bg-white text-blue-700 shadow-sm' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Weighment Slips Feed
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('vehicles')}
                  className={`py-2 px-3 rounded-md transition-all ${
                    activeTab === 'vehicles' ? 'bg-white text-blue-700 shadow-sm' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Project Fleet Vehicles
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('summary')}
                  className={`py-2 px-3 rounded-md transition-all ${
                    activeTab === 'summary' ? 'bg-white text-blue-700 shadow-sm' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Tonnage Aggregates
                </button>
              </div>

              {/* Filter Parameters */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-3 bg-slate-50 rounded-md border border-slate-200">
                {(activeTab === 'slips' || activeTab === 'summary') && (
                  <>
                    <div>
                      <Label className="text-[11px] font-semibold text-slate-600">From Date (Optional)</Label>
                      <Input 
                        type="date" 
                        value={dateFrom} 
                        onChange={e => setDateFrom(e.target.value)} 
                        className="h-8 text-xs bg-white mt-1" 
                      />
                    </div>
                    <div>
                      <Label className="text-[11px] font-semibold text-slate-600">To Date (Optional)</Label>
                      <Input 
                        type="date" 
                        value={dateTo} 
                        onChange={e => setDateTo(e.target.value)} 
                        className="h-8 text-xs bg-white mt-1" 
                      />
                    </div>
                  </>
                )}
                {(activeTab === 'slips' || activeTab === 'vehicles') && (
                  <div>
                    <Label className="text-[11px] font-semibold text-slate-600">Record Limit</Label>
                    <Input 
                      type="number" 
                      value={limit} 
                      onChange={e => setLimit(e.target.value)} 
                      className="h-8 text-xs bg-white mt-1" 
                      placeholder="10" 
                    />
                  </div>
                )}
              </div>

              {/* Generated Endpoint URL & cURL */}
              <div className="space-y-3 pt-1">
                <div>
                  <div className="flex justify-between items-center mb-1">
                    <Label className="text-xs font-semibold text-slate-700">Generated Public REST URL</Label>
                    <button 
                      onClick={() => copyToClipboard(fullUrl, 'url')}
                      className="text-xs text-blue-600 hover:text-blue-800 flex items-center gap-1 font-medium"
                    >
                      {copiedUrl ? <Check className="h-3.5 w-3.5 text-green-600" /> : <Copy className="h-3.5 w-3.5" />}
                      {copiedUrl ? 'Copied' : 'Copy URL'}
                    </button>
                  </div>
                  <div className="p-2.5 bg-slate-900 text-slate-100 font-mono text-xs rounded-md break-all">
                    <span className="text-green-400 font-bold mr-2">GET</span>
                    {fullUrl}
                  </div>
                </div>

                <div>
                  <div className="flex justify-between items-center mb-1">
                    <Label className="text-xs font-semibold text-slate-700">cURL Integration Snippet</Label>
                    <button 
                      onClick={() => copyToClipboard(getCurlSnippet(), 'curl')}
                      className="text-xs text-blue-600 hover:text-blue-800 flex items-center gap-1 font-medium"
                    >
                      {copiedCurl ? <Check className="h-3.5 w-3.5 text-green-600" /> : <Copy className="h-3.5 w-3.5" />}
                      {copiedCurl ? 'Copied' : 'Copy cURL'}
                    </button>
                  </div>
                  <pre className="p-3 bg-slate-900 text-slate-200 font-mono text-[11px] rounded-md overflow-x-auto leading-relaxed">
                    {getCurlSnippet()}
                  </pre>
                </div>
              </div>

              {/* Action buttons */}
              <div className="flex gap-3 pt-2">
                <Button 
                  onClick={testApi} 
                  disabled={loadingResponse}
                  className="bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs tracking-wide h-9 px-4 gap-2"
                >
                  <Send className="h-3.5 w-3.5" /> 
                  {loadingResponse ? 'Executing Request...' : 'Send Test Request (GUI)'}
                </Button>
                {apiResponse && (
                  <Button 
                    variant="outline" 
                    onClick={() => setApiResponse(null)}
                    className="text-xs h-9"
                  >
                    Clear Output
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Live Response Viewer */}
          {apiResponse && (
            <Card className="border-slate-200 shadow-sm animate-in fade-in duration-300">
              <CardHeader className="pb-2 flex flex-row items-center justify-between">
                <div>
                  <CardTitle className="text-sm font-semibold flex items-center gap-2 text-slate-800">
                    <FileJson className="h-4 w-4 text-emerald-600" /> Live Response JSON
                  </CardTitle>
                  <CardDescription className="text-xs">
                    Result received from the server API endpoint
                  </CardDescription>
                </div>
                <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200 text-[10px] font-bold">
                  200 OK
                </Badge>
              </CardHeader>
              <CardContent>
                <div className="max-h-96 overflow-auto rounded-md border border-slate-200 bg-slate-950 p-3">
                  <pre className="text-emerald-400 font-mono text-xs leading-snug">
                    {JSON.stringify(apiResponse, null, 2)}
                  </pre>
                </div>
              </CardContent>
            </Card>
          )}

        </div>

      </div>
    </div>
  );
}
