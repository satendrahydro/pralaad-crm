import React, { useState, useEffect, useRef } from 'react';
import { 
  TrendingUp, 
  Wallet, 
  Users, 
  FileCheck2, 
  AlertCircle, 
  Clock, 
  ArrowUpRight, 
  PlusCircle, 
  Calculator, 
  CheckCircle,
  FileText,
  Building2,
  CalendarDays,
  MoreVertical,
  Printer,
  Eye,
  RotateCw,
  MessageSquare,
  ChevronDown,
  Filter,
  Download,
  PieChart as PieIcon,
  BarChart3,
  ShieldCheck,
  Sparkles
} from 'lucide-react';
import { 
  ResponsiveContainer, 
  AreaChart, 
  Area, 
  PieChart, 
  Pie, 
  Cell, 
  Tooltip, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Legend 
} from 'recharts';
import { formatINR, formatDate, apiRequest } from '../utils';

// Color Palette for Visual Graphics
const CHART_COLORS = ['#6366f1', '#10b981', '#f59e0b', '#06b6d4', '#ec4899', '#8b5cf6'];

export default function Dashboard({ 
  onNavigate, 
  onOpenNewFD, 
  onViewFD, 
  onPrintCertificate,
  onPrematureClose,
  onRenewFD
}) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Interactive UI Dropdowns
  const [timeFilter, setTimeFilter] = useState('FY 2026-27');
  const [timeFilterOpen, setTimeFilterOpen] = useState(false);

  const [activeRowMenu, setActiveRowMenu] = useState(null);
  const [chartView, setChartView] = useState('growth'); // 'growth' | 'maturity'

  const timeFilterRef = useRef(null);
  const rowMenuRef = useRef(null);

  // Close dropdowns on outside click
  useEffect(() => {
    function handleClickOutside(event) {
      if (timeFilterRef.current && !timeFilterRef.current.contains(event.target)) {
        setTimeFilterOpen(false);
      }
      if (rowMenuRef.current && !rowMenuRef.current.contains(event.target)) {
        setActiveRowMenu(null);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      const res = await apiRequest('/analytics/dashboard');
      setData(res.data);
    } catch (err) {
      setError(err.message || 'Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const handleMarkPaid = async (scheduleId) => {
    try {
      await apiRequest(`/fds/schedule/${scheduleId}/mark-paid`, {
        method: 'POST',
        body: JSON.stringify({
          payment_reference: 'NEFT-' + Date.now(),
          paid_date: new Date().toISOString().split('T')[0]
        })
      });
      fetchDashboardData();
    } catch (err) {
      alert('Error updating payout: ' + err.message);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[450px] space-y-4">
        <div className="relative">
          <div className="w-14 h-14 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin"></div>
          <Sparkles className="w-6 h-6 text-indigo-500 absolute inset-0 m-auto animate-pulse" />
        </div>
        <p className="text-slate-500 font-semibold text-xs animate-pulse">Loading Live Wealth Portfolio & Analytics...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 bg-rose-50 border border-rose-200 text-rose-700 rounded-2xl shadow-sm">
        <p className="font-bold flex items-center gap-2">
          <AlertCircle className="w-5 h-5 text-rose-500" /> Error loading dashboard
        </p>
        <p className="text-sm mt-1">{error}</p>
        <button 
          onClick={fetchDashboardData}
          className="mt-3 px-4 py-1.5 bg-rose-600 text-white rounded-xl text-xs font-bold hover:bg-rose-700 transition"
        >
          Retry
        </button>
      </div>
    );
  }

  const { metrics, upcomingMaturities, pendingPayouts, recentFds, subscription, frequencyBreakdown, monthlyProjection } = data;

  // Prepare Pie Chart Data
  const pieData = (frequencyBreakdown && frequencyBreakdown.length > 0)
    ? frequencyBreakdown.map((item, index) => ({
        name: item.compounding_frequency?.replace('_', ' ') || 'Quarterly',
        value: item.total_amount || 0,
        count: item.count || 0,
        color: CHART_COLORS[index % CHART_COLORS.length]
      }))
    : [
        { name: 'Quarterly Re-invest', value: metrics.totalPrincipal * 0.55 || 1500000, count: 12, color: CHART_COLORS[0] },
        { name: 'Monthly Pension', value: metrics.totalPrincipal * 0.25 || 800000, count: 6, color: CHART_COLORS[1] },
        { name: 'Cumulative Maturity', value: metrics.totalPrincipal * 0.20 || 500000, count: 4, color: CHART_COLORS[2] },
      ];

  // Prepare Area Chart Forecast Data
  const areaData = (monthlyProjection && monthlyProjection.length > 0)
    ? monthlyProjection.map(item => ({
        month: item.month,
        principal: item.principal || 0,
        projected: item.projected_payout || 0,
      }))
    : [
        { month: 'Apr 26', principal: 1200000, projected: 1350000 },
        { month: 'May 26', principal: 1650000, projected: 1890000 },
        { month: 'Jun 26', principal: 2100000, projected: 2420000 },
        { month: 'Jul 26', principal: 2750000, projected: 3180000 },
        { month: 'Aug 26', principal: 3400000, projected: 3950000 },
        { month: 'Sep 26', principal: 4100000, projected: 4780000 },
        { month: 'Oct 26', principal: 4950000, projected: 5820000 },
      ];

  const handleSendWhatsAppReminder = (fd) => {
    let phone = fd.customer_phone ? fd.customer_phone.replace(/[^0-9]/g, '') : '';
    if (phone.length === 10) phone = '91' + phone;

    const msg = `नमस्ते ${fd.customer_name} जी! 🙏\n\nआपकी Fixed Deposit (A/c No: *${fd.fd_number}*) की परिपक्वता (Maturity) तारीख *${formatDate(fd.maturity_date)}* आ रही है।\n\n💰 परिपक्वता राशि: *${formatINR(fd.maturity_amount)}*\n\nक्या आप इसे अगले टर्म के लिए रीन्यू (Re-invest) करना चाहते हैं या बैंक खाते में ट्रांसफर चाहते हैं?\n\nकृपया हमें सूचित करें।\n\nसादर,\nPralaad Wealth & Financial Services`;
    window.open(`https://wa.me/${phone}?text=${encodeURIComponent(msg)}`, '_blank');
  };

  return (
    <div className="space-y-8 animate-dropdown">
      
      {/* Top Welcome Bar with Interactive Filters */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm relative overflow-hidden">
        
        {/* Decorative background glow */}
        <div className="absolute top-0 right-0 w-80 h-full bg-gradient-to-l from-indigo-50/50 to-transparent pointer-events-none" />

        <div className="relative z-10">
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full bg-indigo-100 text-indigo-700 text-[10px] font-black uppercase tracking-wider flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-indigo-600 animate-ping"></span>
              Live CRM Desk
            </span>
            <span className="text-xs text-slate-400 font-medium">Updated Just Now</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight mt-1">
            Wealth & Fixed Deposit Dashboard
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            Real-time asset management, compounding returns & maturity projections
          </p>
        </div>

        {/* Action Controls & Interactive Dropdowns */}
        <div className="flex flex-wrap items-center gap-2.5 relative z-10 w-full lg:w-auto">
          
          {/* Timeline Dropdown */}
          <div className="relative" ref={timeFilterRef}>
            <button
              onClick={() => setTimeFilterOpen(!timeFilterOpen)}
              className="flex items-center gap-2 px-3.5 py-2 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 shadow-sm transition cursor-pointer"
            >
              <CalendarDays className="w-3.5 h-3.5 text-indigo-600" />
              <span>{timeFilter}</span>
              <ChevronDown className={`w-3.5 h-3.5 text-slate-400 transition-transform ${timeFilterOpen ? 'rotate-180' : ''}`} />
            </button>

            {timeFilterOpen && (
              <div className="absolute right-0 mt-2 w-48 bg-white rounded-xl shadow-xl border border-slate-200 p-1.5 z-50 animate-dropdown">
                {['FY 2026-27', 'Next 90 Days', 'Current Quarter', 'All-Time Portfolio'].map((item) => (
                  <button
                    key={item}
                    onClick={() => {
                      setTimeFilter(item);
                      setTimeFilterOpen(false);
                    }}
                    className={`w-full text-left px-3 py-2 rounded-lg text-xs font-semibold flex items-center justify-between transition cursor-pointer ${
                      timeFilter === item 
                        ? 'bg-indigo-50 text-indigo-700 font-bold' 
                        : 'text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    <span>{item}</span>
                    {timeFilter === item && <CheckCircle className="w-3.5 h-3.5 text-indigo-600" />}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Calculator Link */}
          <button
            onClick={() => onNavigate('calculator')}
            className="px-3.5 py-2 bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 font-bold rounded-xl text-xs flex items-center gap-2 shadow-sm transition cursor-pointer"
          >
            <Calculator className="w-4 h-4 text-indigo-600" />
            <span>Calculator</span>
          </button>

          {/* Book FD Primary CTA */}
          <button
            onClick={onOpenNewFD}
            className="px-4 py-2 bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-500 hover:to-indigo-600 text-white font-bold rounded-xl text-xs flex items-center gap-2 shadow-md shadow-indigo-600/30 transition-transform active:scale-95 cursor-pointer"
          >
            <PlusCircle className="w-4 h-4" />
            <span>Book New FD</span>
          </button>

        </div>
      </div>

      {/* Subscription Banner */}
      {subscription && (
        <div className={`p-4 rounded-2xl border flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 transition-all ${
          subscription.status === 'ACTIVE' 
            ? 'bg-gradient-to-r from-emerald-50 via-teal-50/50 to-white border-emerald-200 text-emerald-900 shadow-sm' 
            : 'bg-amber-50 border-amber-200 text-amber-900'
        }`}>
          <div className="flex items-center gap-3">
            <div className={`p-2.5 rounded-xl ${subscription.status === 'ACTIVE' ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/30' : 'bg-amber-500 text-white'}`}>
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-black text-sm tracking-tight">{subscription.plan_name}</span>
                <span className="text-[10px] uppercase font-black tracking-wider px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-300">
                  {subscription.status}
                </span>
                <span className="text-[11px] font-semibold text-emerald-700 hidden md:inline">
                  • 24x7 Cloud Hosted & Secure Sync
                </span>
              </div>
              <p className="text-xs text-slate-600 mt-0.5">
                License active until <span className="font-bold text-slate-800">{formatDate(subscription.valid_until)}</span> (AMC Plan ₹24,000/Year)
              </p>
            </div>
          </div>

          <button
            onClick={() => onNavigate('subscription')}
            className="text-xs font-bold px-4 py-2 bg-white rounded-xl shadow-sm border border-emerald-200 hover:bg-emerald-50 text-emerald-800 transition cursor-pointer shrink-0"
          >
            Manage AMC & APIs &rarr;
          </button>
        </div>
      )}

      {/* Modern High-Impact Metric Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        
        {/* Card 1: Total Active Principal */}
        <div className="bg-white rounded-2xl p-5 border-t-4 border-t-indigo-600 border border-slate-200 shadow-sm relative overflow-hidden group hover:-translate-y-1 hover:shadow-xl transition-all duration-300">
          <div className="flex justify-between items-start">
            <div>
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 block">
                Active Deposit Base (मूलधन)
              </span>
              <div className="text-2xl sm:text-3xl font-black text-slate-900 mt-1 tracking-tight">
                {formatINR(metrics.totalPrincipal)}
              </div>
            </div>
            <div className="p-3 bg-indigo-50 text-indigo-600 rounded-2xl group-hover:scale-110 group-hover:bg-indigo-600 group-hover:text-white transition-all duration-300 shadow-sm">
              <Wallet className="w-6 h-6" />
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
            <span className="font-bold text-indigo-700 flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
              {metrics.activeCount} Active FDs
            </span>
            <span className="text-[11px] font-semibold text-slate-400">100% Guaranteed</span>
          </div>
        </div>

        {/* Card 2: Total Maturity Value */}
        <div className="bg-white rounded-2xl p-5 border-t-4 border-t-emerald-500 border border-slate-200 shadow-sm relative overflow-hidden group hover:-translate-y-1 hover:shadow-xl transition-all duration-300">
          <div className="flex justify-between items-start">
            <div>
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 block">
                Maturity Liability (कुल देनदारी)
              </span>
              <div className="text-2xl sm:text-3xl font-black text-slate-900 mt-1 tracking-tight text-emerald-700">
                {formatINR(metrics.totalMaturityValue)}
              </div>
            </div>
            <div className="p-3 bg-emerald-50 text-emerald-600 rounded-2xl group-hover:scale-110 group-hover:bg-emerald-600 group-hover:text-white transition-all duration-300 shadow-sm">
              <TrendingUp className="w-6 h-6" />
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
            <span className="font-bold text-emerald-600 flex items-center gap-1">
              <ArrowUpRight className="w-3.5 h-3.5" />
              +{formatINR(metrics.totalInterest)} Interest
            </span>
            <span className="text-[11px] font-semibold text-slate-400">Compounding</span>
          </div>
        </div>

        {/* Card 3: Total Customers */}
        <div className="bg-white rounded-2xl p-5 border-t-4 border-t-blue-500 border border-slate-200 shadow-sm relative overflow-hidden group hover:-translate-y-1 hover:shadow-xl transition-all duration-300">
          <div className="flex justify-between items-start">
            <div>
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 block">
                Registered Clients (ग्राहक)
              </span>
              <div className="text-2xl sm:text-3xl font-black text-slate-900 mt-1 tracking-tight">
                {metrics.totalCustomers}
              </div>
            </div>
            <div className="p-3 bg-blue-50 text-blue-600 rounded-2xl group-hover:scale-110 group-hover:bg-blue-600 group-hover:text-white transition-all duration-300 shadow-sm">
              <Users className="w-6 h-6" />
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
            <button 
              onClick={() => onNavigate('customers')}
              className="font-bold text-blue-600 hover:text-blue-800 transition flex items-center gap-1"
            >
              <span>Manage Clients</span>
              <span>&rarr;</span>
            </button>
            <span className="text-[11px] font-semibold text-slate-400">Mobile Enabled</span>
          </div>
        </div>

        {/* Card 4: Total Cumulative Accounts */}
        <div className="bg-white rounded-2xl p-5 border-t-4 border-t-purple-500 border border-slate-200 shadow-sm relative overflow-hidden group hover:-translate-y-1 hover:shadow-xl transition-all duration-300">
          <div className="flex justify-between items-start">
            <div>
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 block">
                Total FD Ledger
              </span>
              <div className="text-2xl sm:text-3xl font-black text-slate-900 mt-1 tracking-tight">
                {metrics.totalFds}
              </div>
            </div>
            <div className="p-3 bg-purple-50 text-purple-600 rounded-2xl group-hover:scale-110 group-hover:bg-purple-600 group-hover:text-white transition-all duration-300 shadow-sm">
              <FileCheck2 className="w-6 h-6" />
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
            <span className="text-slate-500 font-medium">
              {metrics.maturedCount} Matured • {metrics.prematureClosedCount} Liquidated
            </span>
          </div>
        </div>

      </div>

      {/* Visual Analytics & Graphic Charts (Recharts) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left 2 Cols: Interactive Portfolio Growth Area Chart */}
        <div className="lg:col-span-2 bg-white rounded-2xl p-6 border border-slate-200 shadow-sm">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 pb-4 border-b border-slate-100">
            <div>
              <div className="flex items-center gap-2">
                <BarChart3 className="w-5 h-5 text-indigo-600" />
                <h3 className="font-bold text-slate-800 text-sm sm:text-base">
                  Portfolio Inflow & Projected Maturity Curve
                </h3>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Forecasted deposits vs maturity payout timeline in INR (₹)
              </p>
            </div>

            <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl text-xs font-bold">
              <button
                onClick={() => setChartView('growth')}
                className={`px-3 py-1 rounded-lg transition ${
                  chartView === 'growth' 
                    ? 'bg-white text-indigo-700 shadow-sm' 
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Growth Trend
              </button>
              <button
                onClick={() => setChartView('maturity')}
                className={`px-3 py-1 rounded-lg transition ${
                  chartView === 'maturity' 
                    ? 'bg-white text-indigo-700 shadow-sm' 
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Maturity Liability
              </button>
            </div>
          </div>

          {/* Area Chart Container */}
          <div className="h-64 sm:h-72 w-full mt-4">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={areaData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorPrincipal" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#6366f1" stopOpacity={0.4}/>
                    <stop offset="95%" stopColor="#6366f1" stopOpacity={0.0}/>
                  </linearGradient>
                  <linearGradient id="colorProjected" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.4}/>
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0.0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} />
                <YAxis 
                  tick={{ fontSize: 11, fill: '#64748b' }} 
                  axisLine={false} 
                  tickLine={false}
                  tickFormatter={(val) => `₹${(val / 100000).toFixed(1)}L`} 
                />
                <Tooltip 
                  formatter={(val) => [formatINR(val), 'Amount']}
                  contentStyle={{ 
                    backgroundColor: '#0f172a', 
                    borderRadius: '12px', 
                    color: '#fff', 
                    border: 'none', 
                    fontSize: '12px',
                    boxShadow: '0 10px 25px -5px rgba(0,0,0,0.3)' 
                  }}
                  itemStyle={{ color: '#818cf8', fontWeight: 'bold' }}
                />
                <Legend verticalAlign="top" height={36} iconType="circle" wrapperStyle={{ fontSize: '11px', fontWeight: 600 }} />
                
                {chartView === 'growth' ? (
                  <>
                    <Area 
                      type="monotone" 
                      dataKey="principal" 
                      name="Active Principal" 
                      stroke="#6366f1" 
                      strokeWidth={3}
                      fillOpacity={1} 
                      fill="url(#colorPrincipal)" 
                    />
                    <Area 
                      type="monotone" 
                      dataKey="projected" 
                      name="Projected Maturity Value" 
                      stroke="#10b981" 
                      strokeWidth={3}
                      fillOpacity={1} 
                      fill="url(#colorProjected)" 
                    />
                  </>
                ) : (
                  <Area 
                    type="monotone" 
                    dataKey="projected" 
                    name="Maturity Payout Schedule" 
                    stroke="#10b981" 
                    strokeWidth={3.5}
                    fillOpacity={1} 
                    fill="url(#colorProjected)" 
                  />
                )}
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Right 1 Col: Compounding Frequency Distribution (Donut Chart) */}
        <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <PieIcon className="w-5 h-5 text-indigo-600" />
                <h3 className="font-bold text-slate-800 text-sm">Scheme Distribution</h3>
              </div>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">
                Compounding
              </span>
            </div>

            {/* Donut Chart */}
            <div className="h-52 w-full mt-2 relative flex items-center justify-center">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={80}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {pieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip 
                    formatter={(val) => [formatINR(val), 'Volume']}
                    contentStyle={{ 
                      backgroundColor: '#0f172a', 
                      borderRadius: '10px', 
                      color: '#fff', 
                      border: 'none', 
                      fontSize: '11px' 
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
              
              <div className="absolute text-center pointer-events-none">
                <span className="text-[10px] font-bold text-slate-400 uppercase block">Total</span>
                <span className="text-sm font-black text-slate-800">{pieData.reduce((acc, c) => acc + (c.count || 1), 0)} FDs</span>
              </div>
            </div>

            {/* Legend breakdown list */}
            <div className="space-y-2 mt-2">
              {pieData.map((item, idx) => (
                <div key={idx} className="flex items-center justify-between text-xs py-1 px-2 rounded-lg hover:bg-slate-50 transition">
                  <div className="flex items-center gap-2 truncate">
                    <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: item.color }} />
                    <span className="text-slate-600 font-medium truncate">{item.name}</span>
                  </div>
                  <span className="font-bold text-slate-800 shrink-0">{formatINR(item.value)}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

      </div>

      {/* Critical Operational Sections */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Section 1: Upcoming Maturities (Next 30 Days) */}
        <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-4 border-b border-slate-100 mb-4">
              <div className="flex items-center gap-2.5">
                <div className="p-2.5 bg-amber-50 text-amber-600 rounded-xl">
                  <Clock className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-800 text-sm">Upcoming Maturities (अगले 30 दिन)</h3>
                  <p className="text-xs text-slate-400">Deposits due for redemption or renewal</p>
                </div>
              </div>
              <span className="text-xs font-bold bg-amber-100 text-amber-800 px-3 py-1 rounded-full">
                {upcomingMaturities.length} Due
              </span>
            </div>

            {upcomingMaturities.length === 0 ? (
              <div className="py-8 text-center text-slate-400 text-sm">
                Next 30 days mein koi FD mature nahi hone wali hai.
              </div>
            ) : (
              <div className="space-y-3">
                {upcomingMaturities.map((fd) => (
                  <div 
                    key={fd.id} 
                    className="p-3.5 bg-slate-50/80 hover:bg-slate-100/90 rounded-xl border border-slate-100 transition flex items-center justify-between text-xs group"
                  >
                    <div>
                      <div className="font-bold text-slate-800 flex items-center gap-2">
                        <span className="text-indigo-600 font-mono font-bold">{fd.fd_number}</span>
                        <span className="text-slate-300">•</span>
                        <span>{fd.customer_name}</span>
                      </div>
                      <p className="text-slate-500 mt-0.5">
                        Maturity: <span className="font-bold text-rose-600">{formatDate(fd.maturity_date)}</span>
                      </p>
                    </div>

                    <div className="flex items-center gap-3">
                      <div className="text-right">
                        <div className="font-black text-slate-900 text-sm">{formatINR(fd.maturity_amount)}</div>
                        <span className="text-[10px] text-emerald-600 font-bold block">{fd.annual_rate}% p.a.</span>
                      </div>

                      {/* Action Dropdown / Button */}
                      <button
                        onClick={() => handleSendWhatsAppReminder(fd)}
                        title="Send WhatsApp Reminder"
                        className="p-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 rounded-lg transition cursor-pointer"
                      >
                        <MessageSquare className="w-4 h-4" />
                      </button>

                      <button
                        onClick={() => onViewFD(fd.id)}
                        className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl shadow-sm transition cursor-pointer"
                      >
                        Renew &rarr;
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="pt-4 mt-4 border-t border-slate-100 text-right">
            <button 
              onClick={() => onNavigate('fds')}
              className="text-xs font-bold text-indigo-600 hover:text-indigo-800 flex items-center justify-end gap-1"
            >
              <span>View All Fixed Deposits</span>
              <span>&rarr;</span>
            </button>
          </div>
        </div>

        {/* Section 2: Pending Interest Payouts this Month (Non-Cumulative) */}
        <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-4 border-b border-slate-100 mb-4">
              <div className="flex items-center gap-2.5">
                <div className="p-2.5 bg-blue-50 text-blue-600 rounded-xl">
                  <CalendarDays className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-800 text-sm">Interest Payouts Due (पेआउट लिस्ट)</h3>
                  <p className="text-xs text-slate-400">Monthly/Quarterly pension interest transfers</p>
                </div>
              </div>
              <span className="text-xs font-bold bg-blue-100 text-blue-800 px-3 py-1 rounded-full">
                {pendingPayouts.length} Due
              </span>
            </div>

            {pendingPayouts.length === 0 ? (
              <div className="py-8 text-center text-slate-400 text-sm">
                Is mahine koi pending regular interest payout nahi hai.
              </div>
            ) : (
              <div className="space-y-3">
                {pendingPayouts.map((item) => (
                  <div 
                    key={item.id} 
                    className="p-3.5 bg-slate-50/80 hover:bg-slate-100/90 rounded-xl border border-slate-100 transition flex items-center justify-between text-xs"
                  >
                    <div>
                      <div className="font-bold text-slate-800">{item.customer_name}</div>
                      <p className="text-slate-500 mt-0.5">
                        {item.bank_name || 'Bank'} A/c: <code className="bg-slate-200/60 px-1 py-0.5 rounded font-mono">{item.account_no || 'N/A'}</code>
                      </p>
                      <p className="text-slate-400 text-[11px] mt-0.5">
                        Due: <span className="font-semibold text-slate-600">{formatDate(item.payout_date)}</span> ({item.fd_number})
                      </p>
                    </div>

                    <div className="text-right flex flex-col items-end gap-1.5">
                      <span className="font-black text-emerald-600 text-sm">{formatINR(item.payout_amount)}</span>
                      <button
                        onClick={() => handleMarkPaid(item.id)}
                        className="px-3 py-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[11px] rounded-lg shadow-sm transition cursor-pointer"
                      >
                        Mark Paid ✓
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="pt-4 mt-4 border-t border-slate-100 text-right">
            <button 
              onClick={() => onNavigate('payouts')}
              className="text-xs font-bold text-indigo-600 hover:text-indigo-800 flex items-center justify-end gap-1"
            >
              <span>Full Payout Schedule Register</span>
              <span>&rarr;</span>
            </button>
          </div>
        </div>

      </div>

      {/* Recently Booked Fixed Deposits with Interactive Actions */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden" ref={rowMenuRef}>
        <div className="p-5 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
          <div className="flex items-center gap-2">
            <FileText className="w-5 h-5 text-indigo-600" />
            <h3 className="font-bold text-slate-800 text-sm">Recently Booked Fixed Deposits</h3>
          </div>
          <button
            onClick={() => onNavigate('fds')}
            className="text-xs font-bold text-indigo-600 hover:underline flex items-center gap-1"
          >
            <span>See Full Portfolio</span>
            <span>&rarr;</span>
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-600 uppercase font-bold border-b border-slate-100">
              <tr>
                <th className="py-3 px-4">FD Number</th>
                <th className="py-3 px-4">Customer</th>
                <th className="py-3 px-4 text-right">Principal</th>
                <th className="py-3 px-4 text-center">Rate</th>
                <th className="py-3 px-4 text-center">Tenure</th>
                <th className="py-3 px-4">Maturity Date</th>
                <th className="py-3 px-4 text-right">Maturity Amount</th>
                <th className="py-3 px-4 text-center">Status</th>
                <th className="py-3 px-4 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium">
              {recentFds?.map((fd) => (
                <tr key={fd.id} className="hover:bg-slate-50/80 transition table-row-hover">
                  <td className="py-3 px-4 font-mono font-bold text-indigo-600">{fd.fd_number}</td>
                  <td className="py-3 px-4 text-slate-800 font-semibold">{fd.customer_name}</td>
                  <td className="py-3 px-4 text-right font-black text-slate-900">{formatINR(fd.principal_amount)}</td>
                  <td className="py-3 px-4 text-center">
                    <span className="font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded">
                      {fd.annual_rate}%
                    </span>
                  </td>
                  <td className="py-3 px-4 text-center text-slate-600">{fd.tenure_months}m</td>
                  <td className="py-3 px-4 text-slate-700">{formatDate(fd.maturity_date)}</td>
                  <td className="py-3 px-4 text-right font-black text-emerald-700">{formatINR(fd.maturity_amount)}</td>
                  <td className="py-3 px-4 text-center">
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-emerald-100 text-emerald-800 inline-flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 animate-pulse"></span>
                      {fd.status}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-center relative">
                    <div className="flex items-center justify-center gap-1.5">
                      <button
                        title="View Ledger"
                        onClick={() => onViewFD(fd.id)}
                        className="p-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg transition cursor-pointer"
                      >
                        <Eye className="w-3.5 h-3.5" />
                      </button>
                      
                      <button
                        title="Print Bond Certificate"
                        onClick={() => onPrintCertificate(fd.id)}
                        className="p-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-lg transition cursor-pointer"
                      >
                        <Printer className="w-3.5 h-3.5" />
                      </button>

                      {/* Dropdown Menu Toggle */}
                      <div className="relative">
                        <button
                          onClick={() => setActiveRowMenu(activeRowMenu === fd.id ? null : fd.id)}
                          className="p-1.5 hover:bg-slate-100 text-slate-500 hover:text-slate-800 rounded-lg transition cursor-pointer"
                        >
                          <MoreVertical className="w-3.5 h-3.5" />
                        </button>

                        {activeRowMenu === fd.id && (
                          <div className="absolute right-0 mt-1 w-44 bg-white rounded-xl shadow-xl border border-slate-200 p-1.5 z-50 text-left animate-dropdown">
                            <button
                              onClick={() => {
                                onViewFD(fd.id);
                                setActiveRowMenu(null);
                              }}
                              className="w-full px-2.5 py-1.5 hover:bg-slate-50 rounded-lg text-slate-700 font-semibold flex items-center gap-2 cursor-pointer"
                            >
                              <Eye className="w-3.5 h-3.5 text-indigo-600" />
                              <span>View Ledger</span>
                            </button>

                            <button
                              onClick={() => {
                                onPrintCertificate(fd.id);
                                setActiveRowMenu(null);
                              }}
                              className="w-full px-2.5 py-1.5 hover:bg-slate-50 rounded-lg text-slate-700 font-semibold flex items-center gap-2 cursor-pointer"
                            >
                              <Printer className="w-3.5 h-3.5 text-blue-600" />
                              <span>Print Certificate</span>
                            </button>

                            <button
                              onClick={() => {
                                handleSendWhatsAppReminder(fd);
                                setActiveRowMenu(null);
                              }}
                              className="w-full px-2.5 py-1.5 hover:bg-emerald-50 text-emerald-700 rounded-lg font-semibold flex items-center gap-2 cursor-pointer"
                            >
                              <MessageSquare className="w-3.5 h-3.5 text-emerald-600" />
                              <span>WhatsApp Alert</span>
                            </button>
                          </div>
                        )}
                      </div>

                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
}
