import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Check, Zap, Building2, ShieldCheck, Scale, RefreshCw, HelpCircle, ArrowRight, Wrench } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

export default function Pricing() {
  const { toast } = useToast();
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'annually'>('annually');

  const handleSelectPlan = (planName: string) => {
    toast({
      title: 'Plan Selection',
      description: `You selected the ${planName} plan (${billingCycle}). Software maintenance & support are fully included. Our team will contact you for activation.`,
    });
  };

  const plans = [
    {
      id: 'starter',
      name: 'Starter Site',
      badge: 'Single Weighbridge',
      description: 'Essential weighing and ticket generation for small collection centers or single weighbridge sites.',
      monthlyPrice: '₹2,499',
      annualPrice: '₹1,999',
      unit: '/ weighbridge / month',
      periodNote: billingCycle === 'annually' ? 'Billed annually (₹23,988/yr)' : 'Billed monthly',
      features: [
        'Up to 1 Weighbridge Terminal',
        'Up to 5,000 Weighment Slips / mo',
        'Standard 3-Copy Thermal Ticket Print',
        'Vehicle & Material Masters (Up to 100)',
        'Local SQLite Offline Database',
        'Basic CSV & Excel Data Export',
        'Free Software Maintenance & Bug Fixes Included',
        'Standard Email Support',
      ],
      cta: 'Get Started',
      popular: false,
      icon: Scale,
    },
    {
      id: 'professional',
      name: 'Municipal Professional',
      badge: 'Most Popular',
      description: 'Complete operational suite for Municipalities & Urban Local Bodies with Cloud Sync & Multi-Site support.',
      monthlyPrice: '₹5,999',
      annualPrice: '₹4,799',
      unit: '/ weighbridge / month',
      periodNote: billingCycle === 'annually' ? 'Billed annually (₹57,588/yr)' : 'Billed monthly',
      features: [
        'Up to 5 Weighbridge Terminals',
        'Unlimited Weighment Slips',
        'Automatic Offline-to-Cloud Sync (10s Queue)',
        'Full Real-time Executive Analytics Dashboard',
        'Unlimited Fleet & Material Master Data',
        'Granular Role-Based Access Control (RBAC)',
        'Serial COM & Socket.io Hardware Streaming',
        'Custom Header & Municipal Logo Customization',
        'Comprehensive Maintenance, Updates & Cloud Backups Included',
        'Priority Phone & Remote Desktop Support',
      ],
      cta: 'Choose Professional',
      popular: true,
      icon: Zap,
    },
    {
      id: 'enterprise',
      name: 'Enterprise Corporate',
      badge: 'Unlimited Fleet',
      description: 'Dedicated infrastructure, custom ERP integration, and 24/7 SLA support for large MSW concessionaires.',
      monthlyPrice: '₹12,499',
      annualPrice: '₹9,999',
      unit: '/ site / month',
      periodNote: billingCycle === 'annually' ? 'Billed annually (₹1,19,988/yr)' : 'Billed monthly',
      features: [
        'Unlimited Weighbridge Terminals & Sites',
        'Dedicated Private Cloud PostgreSQL Instance',
        'Custom ERP & ANPR (Number Plate) API Integration',
        'Real-time Multi-Plant Aggregated Analytics',
        'Automated Daily / Monthly PDF Audit Email Reports',
        'Full Audit Trail & Tamper Prevention Security',
        'Custom Hardware Serial Drivers Support',
        'Full Dedicated Maintenance, System Health & Hardware Support SLA Included',
        '24/7 Dedicated Technical Account Manager & On-site SLA',
      ],
      cta: 'Contact Sales',
      popular: false,
      icon: Building2,
    },
  ];

  const comparisons = [
    { feature: 'Software Maintenance & Updates', starter: 'Included (Free Routine Patches)', pro: 'Included (Priority Updates & Health Checks)', enterprise: 'Included (24/7 Managed Maintenance SLA)' },
    { feature: 'Weighbridge Terminals Supported', starter: '1 Terminal', pro: 'Up to 5 Terminals', enterprise: 'Unlimited' },
    { feature: 'Monthly Slip Limit', starter: '5,000 / mo', pro: 'Unlimited', enterprise: 'Unlimited' },
    { feature: 'Cloud Sync Interval', starter: 'Manual Export', pro: 'Real-time (10 Seconds)', enterprise: 'Instant / Dedicated DB' },
    { feature: 'Dashboard Analytics', starter: 'Basic Statistics', pro: 'Full Charts & Hourly Activity', enterprise: 'Multi-Plant Aggregated' },
    { feature: 'Role-Based Access Control', starter: 'Standard (2 Roles)', pro: 'Dynamic Matrix (4 Roles)', enterprise: 'Custom Enterprise Roles' },
    { feature: 'Hardware Support & Drivers', starter: 'Serial COM Standard', pro: 'Serial COM + Socket.io Stream', enterprise: 'Custom Serial Protocols + ANPR' },
    { feature: 'Support & SLA Level', starter: 'Email Support (48h)', pro: 'Priority Support (4h)', enterprise: '24/7 Dedicated SLA (1h)' },
  ];

  return (
    <div className="space-y-8 max-w-7xl mx-auto pb-12">
      {/* Maintenance Included Banner */}
      <div className="bg-emerald-800 text-white p-3 rounded-sm shadow-sm flex items-center justify-center gap-2 text-xs sm:text-sm font-semibold tracking-wide">
        <Wrench className="w-4 h-4 text-emerald-300 animate-pulse" />
        <span>All Subscription Plans Include 100% Software Maintenance, Version Updates, and System Health Monitoring at No Extra Cost!</span>
      </div>

      {/* Header Section */}
      <div className="text-center space-y-3">
        <Badge variant="outline" className="px-3 py-1 text-xs uppercase tracking-wider font-bold border-green-300 bg-green-50 text-green-800">
          Commercial Subscription Plans
        </Badge>
        <h1 className="text-4xl font-extrabold tracking-tight text-slate-900">
          Flexible Pricing for Every Municipal & Waste Operations Scale
        </h1>
        <p className="text-slate-500 max-w-2xl mx-auto text-sm sm:text-base">
          Choose the right WeighT360Pro plan for your weighbridge facility. Scale seamlessly from single collection hubs to full municipal waste management networks with maintenance completely covered.
        </p>

        {/* Monthly vs Annual Toggle */}
        <div className="pt-4 flex items-center justify-center gap-3">
          <span className={`text-sm font-bold ${billingCycle === 'monthly' ? 'text-slate-900' : 'text-slate-500'}`}>
            Monthly Billing
          </span>
          <button
            onClick={() => setBillingCycle(prev => prev === 'monthly' ? 'annually' : 'monthly')}
            className="relative inline-flex h-7 w-14 shrink-0 cursor-pointer rounded-full border-2 border-transparent bg-slate-200 transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-green-600 focus:ring-offset-2 data-[checked]:bg-green-600"
            data-checked={billingCycle === 'annually' ? true : undefined}
          >
            <span
              className={`pointer-events-none inline-block h-6 w-6 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out ${
                billingCycle === 'annually' ? 'translate-x-7' : 'translate-x-0'
              }`}
            />
          </button>
          <div className="flex items-center gap-1.5">
            <span className={`text-sm font-bold ${billingCycle === 'annually' ? 'text-slate-900' : 'text-slate-500'}`}>
              Annual Billing
            </span>
            <span className="px-2 py-0.5 text-[10px] font-extrabold text-green-700 bg-green-100 border border-green-300 rounded-full uppercase tracking-wider">
              Save 20%
            </span>
          </div>
        </div>
      </div>

      {/* Pricing Cards */}
      <div className="grid gap-6 md:grid-cols-3 pt-4">
        {plans.map((plan) => {
          const Icon = plan.icon;
          const price = billingCycle === 'annually' ? plan.annualPrice : plan.monthlyPrice;

          return (
            <Card
              key={plan.id}
              className={`relative flex flex-col justify-between transition-all duration-200 ${
                plan.popular
                  ? 'border-2 border-green-600 shadow-xl bg-white scale-105 z-10'
                  : 'border border-slate-200 shadow-sm bg-white hover:border-slate-300'
              }`}
            >
              {plan.popular && (
                <div className="absolute -top-3.5 left-0 right-0 flex justify-center">
                  <span className="bg-green-600 text-white font-bold text-xs px-3 py-1 rounded-full uppercase tracking-wider shadow-sm flex items-center gap-1">
                    <Zap className="w-3.5 h-3.5 fill-white" /> Recommended by Municipalities
                  </span>
                </div>
              )}

              <CardHeader className="pt-6 pb-4">
                <div className="flex items-center justify-between">
                  <span className="p-2.5 rounded-lg bg-green-50 text-green-700 border border-green-100">
                    <Icon className="w-6 h-6" />
                  </span>
                  <Badge variant="secondary" className="text-[10px] uppercase font-bold tracking-wider bg-slate-100 text-slate-700">
                    {plan.badge}
                  </Badge>
                </div>
                <CardTitle className="text-xl font-bold text-slate-900 mt-3">{plan.name}</CardTitle>
                <CardDescription className="text-xs text-slate-500 min-h-[36px]">{plan.description}</CardDescription>
              </CardHeader>

              <CardContent className="space-y-6 flex-1">
                <div className="border-t border-b border-slate-100 py-4">
                  <div className="flex items-baseline gap-1">
                    <span className="text-4xl font-extrabold text-slate-900 tracking-tight">{price}</span>
                    <span className="text-xs text-slate-500 font-medium">{plan.unit}</span>
                  </div>
                  <p className="text-[11px] text-green-700 font-semibold mt-1">{plan.periodNote}</p>
                </div>

                <div className="space-y-2.5">
                  <span className="text-xs font-bold text-slate-700 uppercase tracking-wider block">Included Features:</span>
                  {plan.features.map((feat, idx) => (
                    <div key={idx} className="flex items-start gap-2 text-xs text-slate-600">
                      <Check className="w-4 h-4 text-green-600 shrink-0 mt-0.5" />
                      <span className={feat.includes('Maintenance') ? 'font-bold text-slate-900' : ''}>{feat}</span>
                    </div>
                  ))}
                </div>
              </CardContent>

              <CardFooter className="pt-4 pb-6">
                <Button
                  onClick={() => handleSelectPlan(plan.name)}
                  className={`w-full h-11 font-bold uppercase tracking-wider text-xs rounded-sm transition-all ${
                    plan.popular
                      ? 'bg-green-700 hover:bg-green-800 text-white shadow-md'
                      : 'bg-slate-900 hover:bg-slate-800 text-white'
                  }`}
                >
                  {plan.cta} <ArrowRight className="w-4 h-4 ml-1.5" />
                </Button>
              </CardFooter>
            </Card>
          );
        })}
      </div>

      {/* Feature Comparison Table */}
      <div className="pt-8 space-y-4">
        <div className="text-center space-y-1">
          <h2 className="text-2xl font-bold text-slate-900">Detailed Feature Comparison</h2>
          <p className="text-xs text-slate-500">Compare capability matrices across WeighT360Pro commercial editions.</p>
        </div>

        <div className="bg-white border border-slate-300 rounded-sm shadow-sm overflow-hidden">
          <table className="w-full text-xs">
            <thead className="bg-slate-100 border-b border-slate-300">
              <tr>
                <th className="text-left px-4 py-3 font-bold text-slate-700 uppercase tracking-wider w-1/3">Feature / Capability</th>
                <th className="text-center px-4 py-3 font-bold text-slate-700 uppercase tracking-wider">Starter Site</th>
                <th className="text-center px-4 py-3 font-bold text-green-800 bg-green-50 uppercase tracking-wider">Municipal Pro</th>
                <th className="text-center px-4 py-3 font-bold text-slate-700 uppercase tracking-wider">Enterprise Corporate</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {comparisons.map((row, idx) => (
                <tr key={idx} className={row.feature.includes('Maintenance') ? 'bg-green-50/60 hover:bg-green-50 transition-colors' : 'hover:bg-slate-50 transition-colors'}>
                  <td className="px-4 py-3 font-semibold text-slate-800 flex items-center gap-1.5">
                    {row.feature.includes('Maintenance') && <Wrench className="w-3.5 h-3.5 text-green-700" />}
                    {row.feature}
                  </td>
                  <td className="px-4 py-3 text-center text-slate-600">{row.starter}</td>
                  <td className="px-4 py-3 text-center font-bold text-green-900 bg-green-50/50">{row.pro}</td>
                  <td className="px-4 py-3 text-center text-slate-800 font-medium">{row.enterprise}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Trust & Guarantees Bar */}
      <div className="bg-gradient-to-r from-green-900 to-emerald-950 text-white rounded-sm p-6 shadow-md grid grid-cols-1 md:grid-cols-4 gap-6 text-center">
        <div className="flex flex-col items-center space-y-1.5">
          <Wrench className="w-8 h-8 text-emerald-400" />
          <h4 className="font-bold text-sm">Full Maintenance Included</h4>
          <p className="text-xs text-emerald-200/80">Zero extra fees for system maintenance, bug fixes, or quarterly software updates.</p>
        </div>
        <div className="flex flex-col items-center space-y-1.5">
          <ShieldCheck className="w-8 h-8 text-emerald-400" />
          <h4 className="font-bold text-sm">Government & ULB Compliant</h4>
          <p className="text-xs text-emerald-200/80">Built strictly following urban local body weighbridge audit guidelines.</p>
        </div>
        <div className="flex flex-col items-center space-y-1.5">
          <RefreshCw className="w-8 h-8 text-emerald-400" />
          <h4 className="font-bold text-sm">Zero-Downtime Guarantee</h4>
          <p className="text-xs text-emerald-200/80">Offline SQLite database ensures transactions never pause during internet outage.</p>
        </div>
        <div className="flex flex-col items-center space-y-1.5">
          <HelpCircle className="w-8 h-8 text-emerald-400" />
          <h4 className="font-bold text-sm">Hardware Agnostic Support</h4>
          <p className="text-xs text-emerald-200/80">Compatible with all major indicator models (Essae, Avery, Eagle, etc.).</p>
        </div>
      </div>
    </div>
  );
}
