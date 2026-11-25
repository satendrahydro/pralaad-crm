import React, { useState } from 'react';
import { 
  Sparkles, 
  Layers, 
  PlusCircle, 
  Percent, 
  Calendar, 
  CheckCircle2, 
  Info, 
  ShieldCheck, 
  ArrowRight,
  TrendingUp,
  Tag,
  Search,
  LayoutGrid,
  Table as TableIcon,
  Lock,
  AlertTriangle,
  Building2,
  Clock
} from 'lucide-react';
import { formatINR } from '../utils';

export const OFFICIAL_TARPL_SCHEMES = [
  {
    id: 1,
    scheme_code: 'TARPL FD 2019',
    scheme_name: 'TARPL FD 2019 DOUBLE (रकम दोगुनी)',
    category: 'doubling',
    compounding_frequency: 'cumulative_yearly',
    is_cumulative: 1,
    base_annual_rate: 12.24,
    senior_citizen_bonus: 0.0,
    tenure_months: 72,
    min_amount: 1000,
    lock_in_months: 3,
    interest_lock_in_months: 6,
    penalty_rate: 2.0,
    payout_type: 'Cumulative Yearly (Maturity Doubling)',
    description: 'रकम 72 महीने (6 वर्ष) में ठीक दोगुनी हो जाती है। वार्षिक चक्रवृद्धि ब्याज। 3 महीने का लॉक-इन और 2% पेनाल्टी रूल्स।',
    tag: 'CAPITAL DOUBLING',
    badgeColor: 'bg-amber-100 text-amber-800 border-amber-300'
  },
  {
    id: 2,
    scheme_code: 'TARPL FD 1',
    scheme_name: 'F D 15% Annual Growth',
    category: 'fd',
    compounding_frequency: 'yearly',
    is_cumulative: 0,
    base_annual_rate: 15.0,
    senior_citizen_bonus: 0.5,
    tenure_months: 67,
    min_amount: 5000,
    lock_in_months: 3,
    interest_lock_in_months: 6,
    penalty_rate: 2.0,
    payout_type: 'Yearly Payout',
    description: '67 महीने की अवधि के लिए 15% प्रति वर्ष की दर से वार्षिक ब्याज भुगतान।',
    tag: 'POPULAR FD',
    badgeColor: 'bg-indigo-50 text-indigo-700 border-indigo-200'
  },
  {
    id: 3,
    scheme_code: 'TARPL FD 2',
    scheme_name: 'F D 18% High Yield Term',
    category: 'fd',
    compounding_frequency: 'yearly',
    is_cumulative: 0,
    base_annual_rate: 18.0,
    senior_citizen_bonus: 0.5,
    tenure_months: 67,
    min_amount: 1000,
    lock_in_months: 3,
    interest_lock_in_months: 6,
    penalty_rate: 2.0,
    payout_type: 'Yearly Payout',
    description: 'कम से कम ₹1,000 से शुरू। 67 महीने की अवधि और 18% प्रति वर्ष का उच्च ब्याज दर।',
    tag: 'HIGH YIELD FD',
    badgeColor: 'bg-purple-50 text-purple-700 border-purple-200'
  },
  {
    id: 4,
    scheme_code: 'FD GAURANSH',
    scheme_name: 'FD Gauransh 24% Super Yield',
    category: 'fd',
    compounding_frequency: 'yearly',
    is_cumulative: 0,
    base_annual_rate: 24.0,
    senior_citizen_bonus: 0.0,
    tenure_months: 67,
    min_amount: 1000,
    lock_in_months: 3,
    interest_lock_in_months: 6,
    penalty_rate: 2.0,
    payout_type: 'Yearly Payout',
    description: 'सर्वोच्च वार्षिक ब्याज दर 24% प्रति वर्ष। 67 महीने की अवधि के साथ।',
    tag: 'MAX YIELD FD',
    badgeColor: 'bg-rose-50 text-rose-700 border-rose-200'
  },
  {
    id: 5,
    scheme_code: 'TARPL FD 16%',
    scheme_name: 'FD 16% (5-Year Standard)',
    category: 'fd',
    compounding_frequency: 'yearly',
    is_cumulative: 0,
    base_annual_rate: 16.0,
    senior_citizen_bonus: 0.5,
    tenure_months: 60,
    min_amount: 5000,
    lock_in_months: 3,
    interest_lock_in_months: 6,
    penalty_rate: 2.0,
    payout_type: 'Yearly Payout',
    description: '5 साल (60 महीने) के लिए 16% वार्षिक ब्याज। स्थिर और सुरक्षित कॉर्पोरेट डिपॉजिट।',
    tag: '5-YEAR TERM',
    badgeColor: 'bg-blue-50 text-blue-700 border-blue-200'
  },
  {
    id: 6,
    scheme_code: 'DEVRAJ',
    scheme_name: 'FD Devraj 20% (1-Year Fast Track)',
    category: 'fd',
    compounding_frequency: 'yearly',
    is_cumulative: 0,
    base_annual_rate: 20.0,
    senior_citizen_bonus: 0.0,
    tenure_months: 12,
    min_amount: 10000,
    lock_in_months: 3,
    interest_lock_in_months: 6,
    penalty_rate: 2.0,
    payout_type: 'Yearly Payout',
    description: 'मात्र 12 महीने (1 वर्ष) की अवधि में 20% का हाई रिटर्न। अल्पकालिक पूंजी के लिए उपयुक्त।',
    tag: '1-YEAR FAST',
    badgeColor: 'bg-emerald-50 text-emerald-700 border-emerald-200'
  },
  {
    id: 7,
    scheme_code: 'TARPL FD SEP 2019',
    scheme_name: 'FD Sep 2019 (12M Term)',
    category: 'fd',
    compounding_frequency: 'yearly',
    is_cumulative: 0,
    base_annual_rate: 15.0,
    senior_citizen_bonus: 0.5,
    tenure_months: 12,
    min_amount: 1000,
    lock_in_months: 3,
    interest_lock_in_months: 6,
    penalty_rate: 2.0,
    payout_type: 'Yearly Payout',
    description: '1 वर्ष के लिए ₹1,000 की न्यूनतम राशि से 15% वार्षिक रिटर्न।',
    tag: '12M ENTRY',
    badgeColor: 'bg-slate-100 text-slate-700 border-slate-200'
  },
  {
    id: 8,
    scheme_code: 'TARPL MIS 1',
    scheme_name: 'MIS 1 [12% Monthly Payout]',
    category: 'mis',
    compounding_frequency: 'monthly',
    is_cumulative: 0,
    base_annual_rate: 12.0,
    senior_citizen_bonus: 0.5,
    tenure_months: 60,
    min_amount: 25000,
    lock_in_months: 3,
    interest_lock_in_months: 6,
    penalty_rate: 2.0,
    payout_type: 'Monthly (1.0% p.m.)',
    description: 'मासिक आय योजना। 60 महीने तक हर महीने निश्चित 1% ब्याज सीधे बैंक खाते में।',
    tag: 'MONTHLY PENSION',
    badgeColor: 'bg-teal-50 text-teal-700 border-teal-200'
  },
  {
    id: 9,
    scheme_code: 'TARPL MIS 2',
    scheme_name: 'MIS 2 [15% Monthly Payout]',
    category: 'mis',
    compounding_frequency: 'monthly',
    is_cumulative: 0,
    base_annual_rate: 15.0,
    senior_citizen_bonus: 0.5,
    tenure_months: 60,
    min_amount: 25000,
    lock_in_months: 3,
    interest_lock_in_months: 6,
    penalty_rate: 2.0,
    payout_type: 'Monthly (1.25% p.m.)',
    description: 'मासिक आय योजना। 60 महीने तक हर महीने 1.25% ब्याज बैंक खाते में पे-आउट।',
    tag: 'REGULAR INCOME',
    badgeColor: 'bg-teal-50 text-teal-700 border-teal-200'
  },
  {
    id: 10,
    scheme_code: 'TARPL MIS 3',
    scheme_name: 'MIS 3 [18% Monthly Payout]',
    category: 'mis',
    compounding_frequency: 'monthly',
    is_cumulative: 0,
    base_annual_rate: 18.0,
    senior_citizen_bonus: 0.5,
    tenure_months: 60,
    min_amount: 25000,
    lock_in_months: 3,
    interest_lock_in_months: 6,
    penalty_rate: 2.0,
    payout_type: 'Monthly (1.50% p.m.)',
    description: 'मासिक आय योजना। 60 महीने तक हर महीने 1.50% ब्याज नियमित बैंक क्रेडिट।',
    tag: 'POPULAR MIS',
    badgeColor: 'bg-teal-50 text-teal-700 border-teal-200'
  },
  {
    id: 11,
    scheme_code: 'TARPL MIS 4',
    scheme_name: 'MIS 4 [24% Monthly Payout]',
    category: 'mis',
    compounding_frequency: 'monthly',
    is_cumulative: 0,
    base_annual_rate: 24.0,
    senior_citizen_bonus: 0.5,
    tenure_months: 60,
    min_amount: 25000,
    lock_in_months: 3,
    interest_lock_in_months: 6,
    penalty_rate: 2.0,
    payout_type: 'Monthly (2.0% p.m.)',
    description: 'मासिक आय योजना। 60 महीने तक हर महीने 2.0% ब्याज का शानदार मासिक कैशफ्लो।',
    tag: 'HIGH CASHFLOW',
    badgeColor: 'bg-emerald-50 text-emerald-800 border-emerald-300'
  },
  {
    id: 12,
    scheme_code: 'TARPL MIS 5',
    scheme_name: 'MIS 5 [36% Super Monthly Yield]',
    category: 'mis',
    compounding_frequency: 'monthly',
    is_cumulative: 0,
    base_annual_rate: 36.0,
    senior_citizen_bonus: 0.0,
    tenure_months: 60,
    min_amount: 25000,
    lock_in_months: 3,
    interest_lock_in_months: 6,
    penalty_rate: 2.0,
    payout_type: 'Monthly (3.0% p.m.)',
    description: '36% प्रति वर्ष की दर से हर महीने 3.0% का सुपर मासिक पे-आउट।',
    tag: 'MAX MONTHLY YIELD',
    badgeColor: 'bg-amber-50 text-amber-800 border-amber-300'
  },
  {
    id: 13,
    scheme_code: 'TARPL MIS 6',
    scheme_name: 'MIS Narpat Singh (16.5% 6-Year)',
    category: 'mis',
    compounding_frequency: 'monthly',
    is_cumulative: 0,
    base_annual_rate: 16.5,
    senior_citizen_bonus: 0.5,
    tenure_months: 72,
    min_amount: 100000,
    lock_in_months: 3,
    interest_lock_in_months: 6,
    penalty_rate: 2.0,
    payout_type: 'Monthly (1.375% p.m.)',
    description: '6 वर्ष (72 महीने) के दीर्घकालिक निवेश पर ₹1 लाख से शुरू होने वाला 16.5% मासिक पे-आउट।',
    tag: 'LONG TERM MIS',
    badgeColor: 'bg-sky-50 text-sky-700 border-sky-200'
  },
  {
    id: 14,
    scheme_code: 'TARPL ADARSH',
    scheme_name: 'MIS 20% Adarsh Plan',
    category: 'mis',
    compounding_frequency: 'monthly',
    is_cumulative: 0,
    base_annual_rate: 20.0,
    senior_citizen_bonus: 0.0,
    tenure_months: 12,
    min_amount: 300000,
    lock_in_months: 3,
    interest_lock_in_months: 6,
    penalty_rate: 2.0,
    payout_type: 'Monthly (1.66% p.m.)',
    description: 'HNI स्पेशल। 12 महीने के लिए ₹3 लाख से शुरू होने वाला 20% वार्षिक दर पर मासिक पे-आउट।',
    tag: 'HNI 1-YEAR MIS',
    badgeColor: 'bg-violet-50 text-violet-700 border-violet-200'
  },
  {
    id: 15,
    scheme_code: 'MIS 1.625 %',
    scheme_name: 'MIS 1.625% Monthly (19.5% p.a.)',
    category: 'mis',
    compounding_frequency: 'monthly',
    is_cumulative: 0,
    base_annual_rate: 19.5,
    senior_citizen_bonus: 0.0,
    tenure_months: 12,
    min_amount: 5000,
    lock_in_months: 3,
    interest_lock_in_months: 6,
    penalty_rate: 2.0,
    payout_type: 'Monthly (1.625% p.m.)',
    description: 'हर महीने ₹5,000 न्यूनतम पर 1.625% (19.5% वार्षिक) की दर से मासिक ब्याज।',
    tag: 'FLEXIBLE MIS',
    badgeColor: 'bg-cyan-50 text-cyan-700 border-cyan-200'
  },
  {
    id: 16,
    scheme_code: '19.20%',
    scheme_name: 'MIS Sangeeta (19.2% 5-Year)',
    category: 'mis',
    compounding_frequency: 'monthly',
    is_cumulative: 0,
    base_annual_rate: 19.2,
    senior_citizen_bonus: 0.5,
    tenure_months: 60,
    min_amount: 100000,
    lock_in_months: 3,
    interest_lock_in_months: 6,
    penalty_rate: 2.0,
    payout_type: 'Monthly (1.60% p.m.)',
    description: '₹1 लाख की न्यूनतम पूंजी पर 60 महीने के लिए 19.2% वार्षिक (1.60% मासिक) पे-आउट।',
    tag: 'PREMIUM MIS',
    badgeColor: 'bg-indigo-50 text-indigo-700 border-indigo-200'
  },
  {
    id: 17,
    scheme_code: 'MANOJ MEERPUR 1.75',
    scheme_name: 'Manoj Meerpur 1.75 (21.0% p.a.)',
    category: 'mis',
    compounding_frequency: 'monthly',
    is_cumulative: 0,
    base_annual_rate: 21.0,
    senior_citizen_bonus: 0.5,
    tenure_months: 60,
    min_amount: 50000,
    lock_in_months: 3,
    interest_lock_in_months: 6,
    penalty_rate: 2.0,
    payout_type: 'Monthly (1.75% p.m.)',
    description: '₹50,000 से शुरू। 60 महीने तक हर माह 1.75% (21% वार्षिक) की दर से नियमित ब्याज।',
    tag: 'BRANCH SPECIAL',
    badgeColor: 'bg-fuchsia-50 text-fuchsia-700 border-fuchsia-200'
  },
  {
    id: 18,
    scheme_code: 'TARPL PRADEEP',
    scheme_name: 'TARPL Pradeep Vishnoi (30.0% p.a.)',
    category: 'mis',
    compounding_frequency: 'monthly',
    is_cumulative: 0,
    base_annual_rate: 30.0,
    senior_citizen_bonus: 0.0,
    tenure_months: 20,
    min_amount: 100000,
    lock_in_months: 3,
    interest_lock_in_months: 6,
    penalty_rate: 2.0,
    payout_type: 'Monthly (2.50% p.m.)',
    description: '20 महीने की विशेष अवधि पर 30% वार्षिक (2.5% मासिक) का उच्च पे-आउट।',
    tag: 'SPECIAL 20-MONTH',
    badgeColor: 'bg-rose-50 text-rose-700 border-rose-200'
  },
  {
    id: 19,
    scheme_code: 'TARPL NEW PENSION',
    scheme_name: 'TARPL MIS Pension Scheme New',
    category: 'mis',
    compounding_frequency: 'monthly',
    is_cumulative: 0,
    base_annual_rate: 18.0,
    senior_citizen_bonus: 1.0,
    tenure_months: 60,
    min_amount: 100000,
    lock_in_months: 3,
    interest_lock_in_months: 6,
    penalty_rate: 2.0,
    payout_type: 'Monthly Chart Based',
    description: 'सीनियर सिटीजन्स और रिटायर्ड सदस्यों के लिए चार्ट आधारित मासिक पेंशन योजना।',
    tag: 'PENSION PLAN',
    badgeColor: 'bg-amber-100 text-amber-900 border-amber-300'
  }
];

export default function FDSchemes({ onOpenNewFD }) {
  const [schemes] = useState(OFFICIAL_TARPL_SCHEMES);
  const [filterCategory, setFilterCategory] = useState('all');
  const [search, setSearch] = useState('');
  const [viewMode, setViewMode] = useState('table'); // 'table' (enterprise list) or 'grid'

  const filteredSchemes = schemes.filter(s => {
    const matchesCat = filterCategory === 'all' || s.category === filterCategory;
    const matchesSearch = s.scheme_name.toLowerCase().includes(search.toLowerCase()) ||
                          s.scheme_code.toLowerCase().includes(search.toLowerCase());
    return matchesCat && matchesSearch;
  });

  return (
    <div className="space-y-6 pb-12 animate-fadeIn">
      {/* Header */}
      <div className="bg-white rounded-xl border border-slate-200/90 shadow-xs p-5 md:p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl md:text-2xl font-bold tracking-tight text-slate-900">
              Official FD & MIS Schemes Master
            </h1>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
              {schemes.length} Live Schemes
            </span>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200">
              Taranganjali Official
            </span>
          </div>
          <p className="text-xs md:text-sm text-slate-500 mt-1">
            कंपनी की सभी अधिकृत 19 फिक्स्ड डिपॉजिट व मासिक आय योजनाएं
          </p>
        </div>

        <div className="flex items-center gap-3">
          {/* View Mode Toggle */}
          <div className="inline-flex rounded-lg border border-slate-200 p-0.5 bg-slate-50">
            <button
              onClick={() => setViewMode('table')}
              className={`p-1.5 rounded-md text-xs font-medium flex items-center gap-1 transition ${
                viewMode === 'table' ? 'bg-white shadow-xs text-indigo-600 font-bold' : 'text-slate-500 hover:text-slate-900'
              }`}
              title="Tabular View"
            >
              <TableIcon className="w-3.5 h-3.5" />
              Table
            </button>
            <button
              onClick={() => setViewMode('grid')}
              className={`p-1.5 rounded-md text-xs font-medium flex items-center gap-1 transition ${
                viewMode === 'grid' ? 'bg-white shadow-xs text-indigo-600 font-bold' : 'text-slate-500 hover:text-slate-900'
              }`}
              title="Card Grid View"
            >
              <LayoutGrid className="w-3.5 h-3.5" />
              Cards
            </button>
          </div>

          <button
            onClick={onOpenNewFD}
            className="inline-flex items-center gap-2 px-4 py-2 text-xs md:text-sm font-bold rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm transition cursor-pointer"
          >
            <PlusCircle className="w-4 h-4" />
            Book FD with Scheme
          </button>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 flex flex-col md:flex-row items-center justify-between gap-4">
        {/* Category Tabs */}
        <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
          <button
            onClick={() => setFilterCategory('all')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer ${
              filterCategory === 'all' 
                ? 'bg-slate-900 text-white shadow-xs' 
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            All Products ({schemes.length})
          </button>
          <button
            onClick={() => setFilterCategory('fd')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer ${
              filterCategory === 'fd' 
                ? 'bg-indigo-600 text-white shadow-xs' 
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            Fixed Deposit (FD) Plans ({schemes.filter(s => s.category === 'fd').length})
          </button>
          <button
            onClick={() => setFilterCategory('mis')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer ${
              filterCategory === 'mis' 
                ? 'bg-teal-600 text-white shadow-xs' 
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            Monthly Income (MIS) ({schemes.filter(s => s.category === 'mis').length})
          </button>
          <button
            onClick={() => setFilterCategory('doubling')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer ${
              filterCategory === 'doubling' 
                ? 'bg-amber-600 text-white shadow-xs' 
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            Capital Doubling ({schemes.filter(s => s.category === 'doubling').length})
          </button>
        </div>

        {/* Search */}
        <div className="relative w-full md:w-64">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Search Scheme Name or Code..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white"
          />
        </div>
      </div>

      {/* View Switcher: Table View vs Grid */}
      {viewMode === 'table' ? (
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-600 font-bold uppercase text-[11px] tracking-wider">
                  <th className="py-3 px-4">CODE</th>
                  <th className="py-3 px-4">SCHEME NAME</th>
                  <th className="py-3 px-4">MIN. AMT</th>
                  <th className="py-3 px-4">TENURE</th>
                  <th className="py-3 px-4">INTEREST PAYOUT</th>
                  <th className="py-3 px-4 text-center">ANNUAL RATE (%)</th>
                  <th className="py-3 px-4 text-center">LOCK-IN / PENALTY</th>
                  <th className="py-3 px-4 text-center">STATUS</th>
                  <th className="py-3 px-4 text-right">ACTION</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredSchemes.map((s) => (
                  <tr key={s.id} className="hover:bg-slate-50/80 transition">
                    <td className="py-3 px-4 font-mono font-bold text-slate-900">
                      {s.scheme_code}
                    </td>
                    <td className="py-3 px-4">
                      <div className="font-bold text-slate-900">{s.scheme_name}</div>
                      <div className="text-[10px] text-slate-500 line-clamp-1">{s.description}</div>
                    </td>
                    <td className="py-3 px-4 font-semibold text-slate-700">
                      {formatINR(s.min_amount)}
                    </td>
                    <td className="py-3 px-4 font-semibold text-slate-800">
                      {typeof s.tenure_months === 'number' ? `${s.tenure_months} MONTHS` : s.tenure_months}
                    </td>
                    <td className="py-3 px-4">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        s.category === 'mis' 
                          ? 'bg-teal-50 text-teal-700 border border-teal-200' 
                          : s.category === 'doubling'
                          ? 'bg-amber-50 text-amber-800 border border-amber-300'
                          : 'bg-indigo-50 text-indigo-700 border border-indigo-200'
                      }`}>
                        {s.payout_type}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-center">
                      <span className="font-extrabold text-sm text-emerald-600">
                        {typeof s.base_annual_rate === 'number' ? `${s.base_annual_rate}%` : s.base_annual_rate}
                      </span>
                      {s.senior_citizen_bonus > 0 && (
                        <span className="block text-[10px] text-amber-600 font-semibold">
                          +{s.senior_citizen_bonus}% Sr.
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-center text-[11px] text-slate-500">
                      <div>Lock: <strong className="text-slate-700">{s.lock_in_months}M</strong></div>
                      <div>Penal: <strong className="text-rose-600">{s.penalty_rate}%</strong></div>
                    </td>
                    <td className="py-3 px-4 text-center">
                      <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                        <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full"></span>
                        Active
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right">
                      <button
                        onClick={onOpenNewFD}
                        className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-bold rounded bg-emerald-50 hover:bg-emerald-600 text-emerald-700 hover:text-white transition cursor-pointer"
                      >
                        Book <ArrowRight className="w-3 h-3" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        /* Cards View */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredSchemes.map((s) => (
            <div 
              key={s.id}
              className="bg-white rounded-xl border border-slate-200/90 shadow-xs p-5 flex flex-col justify-between hover:border-emerald-300 hover:shadow-sm transition group"
            >
              <div>
                <div className="flex items-center justify-between gap-2 mb-3">
                  <span className={`text-[11px] font-bold px-2 py-0.5 rounded border ${s.badgeColor}`}>
                    {s.tag}
                  </span>
                  <span className="text-xs font-mono font-bold text-slate-400">
                    {s.scheme_code}
                  </span>
                </div>

                <h3 className="text-base font-bold text-slate-900 group-hover:text-emerald-600 transition">
                  {s.scheme_name}
                </h3>
                <p className="text-xs text-slate-500 mt-2 line-clamp-2">
                  {s.description}
                </p>

                {/* Rates Box */}
                <div className="my-4 p-3 bg-slate-50 rounded-lg border border-slate-100 flex items-center justify-between">
                  <div>
                    <div className="text-[11px] font-semibold text-slate-400 uppercase">Annual Yield</div>
                    <div className="text-xl font-bold text-emerald-600">
                      {typeof s.base_annual_rate === 'number' ? `${s.base_annual_rate}%` : s.base_annual_rate} <span className="text-xs text-slate-500">p.a.</span>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-[11px] font-semibold text-slate-400 uppercase">Payout Mode</div>
                    <div className="text-xs font-bold text-slate-800">{s.payout_type}</div>
                  </div>
                </div>

                {/* Spec Attributes */}
                <div className="space-y-2 text-xs text-slate-600">
                  <div className="flex justify-between py-1 border-b border-slate-100">
                    <span className="text-slate-400">Tenure</span>
                    <span className="font-semibold text-slate-800">
                      {typeof s.tenure_months === 'number' ? `${s.tenure_months} Months` : s.tenure_months}
                    </span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-slate-100">
                    <span className="text-slate-400">Min. Deposit</span>
                    <span className="font-semibold text-slate-800">
                      {formatINR(s.min_amount)}
                    </span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-slate-100">
                    <span className="text-slate-400">Lock-in Period</span>
                    <span className="font-semibold text-slate-800">
                      {s.lock_in_months} Months
                    </span>
                  </div>
                  <div className="flex justify-between py-1">
                    <span className="text-slate-400">Premature Penalty</span>
                    <span className="font-semibold text-rose-600">
                      {s.penalty_rate}% interest deduction
                    </span>
                  </div>
                </div>
              </div>

              <div className="mt-5 pt-4 border-t border-slate-100">
                <button
                  onClick={onOpenNewFD}
                  className="w-full inline-flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-bold rounded-lg bg-emerald-50 hover:bg-emerald-600 text-emerald-700 hover:text-white transition cursor-pointer"
                >
                  Book with this Scheme <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
