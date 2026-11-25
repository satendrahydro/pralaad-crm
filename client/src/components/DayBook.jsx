import React, { useState, useEffect } from 'react';
import { 
  BookOpen, 
  Calendar, 
  Search, 
  RefreshCw, 
  Download, 
  Printer, 
  Plus, 
  ArrowUpRight, 
  ArrowDownLeft, 
  Wallet, 
  Building2, 
  Coins, 
  FileText,
  TrendingUp,
  CreditCard,
  CheckCircle2,
  Coffee,
  Receipt,
  Fuel,
  Zap,
  Sparkles,
  Utensils,
  X,
  Tag,
  AlertCircle,
  PiggyBank,
  Landmark,
  BadgeIndianRupee,
  Scale,
  Gem,
  HandCoins,
  Briefcase,
  Layers,
  ChevronRight,
  Filter,
  Clock,
  ArrowRight
} from 'lucide-react';
import { apiRequest, formatINR, formatDate } from '../utils';

// Standard INPUT (आवक / Cash In / Receipt) Categories
const INPUT_CATEGORIES = [
  { id: 'GOLD_LOAN_RECOVERY', name: 'Gold Loan EMI / Recovery', hindi: 'गोल्ड लोन वसूली व किश्त', icon: Gem, color: 'amber' },
  { id: 'BORROWING_INFLOW', name: 'उधार लिया (Money Borrowed / Udhar Inflow)', hindi: 'किसी से उधार / कर्ज लिया', icon: HandCoins, color: 'purple' },
  { id: 'DAILY_COLLECTION', name: 'Daily RD & Deposit Collection', hindi: 'दैनिक किश्त व कलेक्शन', icon: Coins, color: 'emerald' },
  { id: 'SAVINGS_DEPOSIT', name: 'Savings A/C Cash Deposit', hindi: 'बचत खाते में नकद जमा', icon: PiggyBank, color: 'green' },
  { id: 'LOAN_RECOVERY', name: 'Property / Business Loan EMI', hindi: 'ऋण वसूली व ईएमआई जमा', icon: Briefcase, color: 'teal' },
  { id: 'BANK_WITHDRAWAL_VAULT', name: 'Cash Withdrawn from Bank', hindi: 'बैंक से निकासी (गल्ले में)', icon: Landmark, color: 'cyan' },
  { id: 'MEMBERSHIP_FEE', name: 'Member Share & Admission Fee', hindi: 'शेयर पूंजी व सदस्यता शुल्क', icon: Building2, color: 'blue' },
  { id: 'MISC_INFLOW', name: 'Misc Inflow / Other Income', hindi: 'अन्य विविध आवक', icon: ArrowDownLeft, color: 'indigo' }
];

// Standard OUTPUT (जावक / Cash Out / Payment / Expense) Categories
const OUTPUT_CATEGORIES = [
  { id: 'GOLD_LOAN_DISBURSEMENT', name: 'Gold Loan Cash Disbursement', hindi: 'गोल्ड लोन वितरण (ऋण दिया)', icon: Gem, color: 'amber' },
  { id: 'BORROWING_REPAYMENT', name: 'उधार लौटाया (Borrowing Repaid / Udhar Return)', hindi: 'उधार ली गई रकम की वापसी', icon: HandCoins, color: 'purple' },
  { id: 'LOAN_DISBURSEMENT', name: 'Property / Business Loan Disbursal', hindi: 'अन्य ऋण वितरण भुगतान', icon: Briefcase, color: 'indigo' },
  { id: 'TEA_REFRESHMENT', name: 'Tea, Coffee & Pantry', hindi: 'चाय-पानी व नाश्ता', icon: Coffee, color: 'amber' },
  { id: 'OFFICE_STATIONERY', name: 'Office Stationery & Printing', hindi: 'स्टेशनरी, पेपर व प्रिंटिंग', icon: FileText, color: 'blue' },
  { id: 'CONVEYANCE', name: 'Conveyance & Traveling', hindi: 'फील्ड पेट्रोल व यात्रा', icon: Fuel, color: 'purple' },
  { id: 'UTILITIES', name: 'Electricity, Water & Net', hindi: 'बिजली, इंटरनेट व रिचार्ज', icon: Zap, color: 'yellow' },
  { id: 'SAVINGS_WITHDRAWAL', name: 'Savings A/C Withdrawal', hindi: 'बचत खाते से नकद निकासी', icon: ArrowUpRight, color: 'rose' },
  { id: 'BANK_DEPOSIT_VAULT', name: 'Cash Deposited into Bank', hindi: 'गल्ले से बैंक खाते में जमा', icon: Landmark, color: 'sky' },
  { id: 'OFFICE_MAINTENANCE', name: 'Cleaning & Repairs', hindi: 'सफाई व मेंटेनेंस', icon: Sparkles, color: 'emerald' },
  { id: 'MISCELLANEOUS', name: 'Miscellaneous Petty Cash', hindi: 'अन्य फुटकर खर्च', icon: Receipt, color: 'red' }
];

export default function DayBook({ onOpenJournalEntry, onOpenCustomerProfile }) {
  // 1. Two Main Day Book Options requested by User:
  // 'DAILY_USE' (Daily In-Out & Office Expenses) vs 'BANKING' (FD, RD, MIS, Savings Core Banking)
  const [dayBookOption, setDayBookOption] = useState('DAILY_USE');

  // Custom Date Range State (Supports single date and multi-day custom range)
  const todayStr = new Date().toISOString().split('T')[0];
  const [startDate, setStartDate] = useState('2026-11-19'); // Default sample starting date
  const [endDate, setEndDate] = useState(todayStr); // Today
  const [datePreset, setDatePreset] = useState('WEEK'); // 'TODAY' | 'YESTERDAY' | 'WEEK' | 'MONTH' | 'CUSTOM'

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  
  // Custom Search: Active across BOTH options (Customer, Voucher, Category, Party, Narration)
  const [search, setSearch] = useState('');
  
  // Filters
  const [selectedBranch, setSelectedBranch] = useState('ALL');
  const [viewFormat, setViewFormat] = useState('format1'); // 'format1' | 'format2'
  const [selectedLedgerFilter, setSelectedLedgerFilter] = useState('ALL');
  const [flowTypeFilter, setFlowTypeFilter] = useState('ALL'); // 'ALL' | 'INFLOW' | 'OUTFLOW'
  const [bankingProductFilter, setBankingProductFilter] = useState('ALL'); // 'ALL' | 'FD' | 'RD' | 'MIS' | 'SAVINGS'

  // Input & Output Modal State (Daily Use)
  const [showEntryModal, setShowEntryModal] = useState(false);
  const [modalMode, setModalMode] = useState('INFLOW'); // 'INFLOW' | 'OUTFLOW'
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState('');
  const [formSuccess, setFormSuccess] = useState('');

  // Account Ledger Statement Drilldown Modal State
  const [showStatementModal, setShowStatementModal] = useState(false);
  const [selectedLedgerStatement, setSelectedLedgerStatement] = useState(null);
  const [loadingStatement, setLoadingStatement] = useState(false);
  const [statementFilter, setStatementFilter] = useState('ALL');

  const [formData, setFormData] = useState({
    entry_type: 'INFLOW',
    entry_date: todayStr,
    category: 'DAILY_COLLECTION',
    category_name: 'Daily RD & Deposit Collection',
    amount: '',
    payment_mode: 'CASH',
    party_name: '',
    reference_no: '',
    narration: ''
  });

  // Date Preset Switcher
  const applyDatePreset = (preset) => {
    setDatePreset(preset);
    const now = new Date();
    const fmt = (d) => d.toISOString().split('T')[0];
    if (preset === 'TODAY') {
      const t = fmt(now);
      setStartDate(t);
      setEndDate(t);
    } else if (preset === 'YESTERDAY') {
      const y = new Date(now);
      y.setDate(y.getDate() - 1);
      const yt = fmt(y);
      setStartDate(yt);
      setEndDate(yt);
    } else if (preset === 'WEEK') {
      // 19 Nov - 25 Nov range or last 7 days
      setStartDate('2026-11-19');
      setEndDate(fmt(now));
    } else if (preset === 'MONTH') {
      const m = new Date(now.getFullYear(), now.getMonth(), 1);
      setStartDate(fmt(m));
      setEndDate(fmt(now));
    }
  };

  const fetchDayBook = async () => {
    setLoading(true);
    try {
      const res = await apiRequest(`/accounting/day-book?startDate=${startDate}&endDate=${endDate}&branch=${selectedBranch}`);
      if (res && res.success) {
        setData(res);
      }
    } catch (err) {
      console.error('Failed to load Day Book:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDayBook();
  }, [startDate, endDate, selectedBranch]);

  // Handle clicking on ANY ledger card in 3-column view to open full statement
  const handleOpenLedgerStatement = async (ledger) => {
    setLoadingStatement(true);
    setShowStatementModal(true);
    setStatementFilter('ALL');
    try {
      const res = await apiRequest(`/accounting/ledger-statement/${encodeURIComponent(ledger.code || ledger.name)}?date=${endDate}`);
      if (res && res.success) {
        setSelectedLedgerStatement(res);
      } else {
        setSelectedLedgerStatement({
          ledger: {
            code: ledger.code || 'LED',
            name: ledger.name,
            type: ledger.type || 'Banking Balance Ledger',
            branch: 'MAIN BRANCH (BHR001)',
            opening_balance: ledger.opening_balance,
            closing_balance: ledger.closing_balance,
            total_debit: ledger.payments || 0,
            total_credit: ledger.receipts || 0
          },
          statement: []
        });
      }
    } catch (err) {
      console.error('Error fetching ledger statement:', err);
    } finally {
      setLoadingStatement(false);
    }
  };

  // Open modal with pre-configured flow
  const handleOpenModal = (type, defaultCat = null) => {
    setModalMode(type);
    setFormError('');
    setFormSuccess('');
    const cats = type === 'INFLOW' ? INPUT_CATEGORIES : OUTPUT_CATEGORIES;
    const initialCat = defaultCat || cats[0];

    setFormData({
      entry_type: type,
      entry_date: endDate || todayStr,
      category: initialCat.id,
      category_name: initialCat.name,
      amount: '',
      payment_mode: 'CASH',
      party_name: '',
      reference_no: '',
      narration: ''
    });
    setShowEntryModal(true);
  };

  const handleSwitchModalType = (type) => {
    setModalMode(type);
    setFormError('');
    const cats = type === 'INFLOW' ? INPUT_CATEGORIES : OUTPUT_CATEGORIES;
    setFormData(prev => ({
      ...prev,
      entry_type: type,
      category: cats[0].id,
      category_name: cats[0].name
    }));
  };

  const handleSubmitEntry = async (e) => {
    e.preventDefault();
    setFormError('');
    setFormSuccess('');

    if (!formData.amount || parseFloat(formData.amount) <= 0) {
      setFormError('Please enter a valid amount.');
      return;
    }
    if (!formData.party_name.trim()) {
      setFormError(formData.entry_type === 'INFLOW' 
        ? 'Please enter Depositor / Received From name (कस्टमर या एडवाइजर का नाम).' 
        : 'Please enter Payee / Paid To / Vendor name (दुकानदार या सदस्य का नाम).');
      return;
    }
    if (!formData.narration.trim()) {
      setFormError('Please enter a brief narration / reason for this entry.');
      return;
    }

    setSubmitting(true);
    try {
      const res = await apiRequest('/accounting/cash-entry', {
        method: 'POST',
        body: JSON.stringify(formData)
      });

      if (res && res.success) {
        setFormSuccess(res.message || 'Entry recorded successfully!');
        setTimeout(() => {
          setShowEntryModal(false);
          setFormSuccess('');
          fetchDayBook();
        }, 800);
      } else {
        setFormError(res?.message || 'Failed to record entry.');
      }
    } catch (err) {
      setFormError(err.message || 'Error recording entry.');
    } finally {
      setSubmitting(false);
    }
  };

  // Export to CSV Helper
  const handleExportCSV = () => {
    let rows = [];
    let filename = '';
    if (dayBookOption === 'DAILY_USE') {
      filename = `TARPL_Daily_Out_In_${startDate}_to_${endDate}.csv`;
      rows.push(['Voucher No', 'Date', 'Time', 'Flow Type', 'Category', 'Party / Name', 'Ledger', 'Amount (₹)', 'Narration']);
      filteredDailyVouchers.forEach(v => {
        rows.push([
          v.voucher_no,
          v.date,
          v.time,
          v.entry_type,
          v.category_name,
          `"${v.party_name || v.account || ''}"`,
          v.ledger,
          v.amount,
          `"${(v.narration || '').replace(/"/g, '""')}"`
        ]);
      });
    } else {
      filename = `TARPL_Banking_DayBook_${startDate}_to_${endDate}.csv`;
      rows.push(['Date', 'Time', 'Voucher / Ref No', 'Customer Name', 'Customer ID', 'Product', 'Transaction Type', 'Inflow (आया ₹)', 'Outflow (गया ₹)', 'Mode', 'Narration']);
      filteredBankingTxns.forEach(t => {
        rows.push([
          t.date,
          t.time || '',
          t.voucher_no,
          `"${t.customer_name}"`,
          t.customer_code,
          t.product,
          `"${t.action_label}"`,
          t.inflow_amount || 0,
          t.outflow_amount || 0,
          t.payment_mode,
          `"${(t.narration || '').replace(/"/g, '""')}"`
        ]);
      });
    }

    const csvContent = 'data:text/csv;charset=utf-8,' + rows.map(e => e.join(',')).join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // 1. Filtered Daily Use Vouchers (Supports Custom Search)
  const filteredDailyVouchers = (data?.daily?.vouchers || data?.vouchers || []).filter(v => {
    const q = search.trim().toLowerCase();
    const matchesSearch = !q || 
      (v.voucher_no && v.voucher_no.toLowerCase().includes(q)) ||
      (v.party_name && v.party_name.toLowerCase().includes(q)) ||
      (v.account && v.account.toLowerCase().includes(q)) ||
      (v.category_name && v.category_name.toLowerCase().includes(q)) ||
      (v.narration && v.narration.toLowerCase().includes(q)) ||
      (v.reference_no && v.reference_no.toLowerCase().includes(q)) ||
      String(v.amount).includes(q);
    
    const matchesLedger = selectedLedgerFilter === 'ALL' || v.ledger === selectedLedgerFilter;
    
    let matchesFlow = true;
    if (flowTypeFilter === 'INFLOW') {
      matchesFlow = v.type === 'RECEIPT' || v.entry_type === 'INFLOW' || v.voucher_no.startsWith('IN-');
    } else if (flowTypeFilter === 'OUTFLOW') {
      matchesFlow = v.type === 'EXPENSE' || v.type === 'PAYMENT' || v.entry_type === 'OUTFLOW' || v.voucher_no.startsWith('OUT-') || v.voucher_no.startsWith('EXP-');
    }

    return matchesSearch && matchesLedger && matchesFlow;
  });

  // 2. Filtered Banking Transactions (Supports Custom Search)
  const filteredBankingTxns = (data?.banking?.transactions || []).filter(t => {
    const q = search.trim().toLowerCase();
    const matchesSearch = !q ||
      (t.customer_name && t.customer_name.toLowerCase().includes(q)) ||
      (t.customer_code && t.customer_code.toLowerCase().includes(q)) ||
      (t.voucher_no && t.voucher_no.toLowerCase().includes(q)) ||
      (t.product && t.product.toLowerCase().includes(q)) ||
      (t.action_label && t.action_label.toLowerCase().includes(q)) ||
      (t.narration && t.narration.toLowerCase().includes(q)) ||
      (t.customer_phone && t.customer_phone.includes(q)) ||
      String(t.inflow_amount).includes(q) ||
      String(t.outflow_amount).includes(q);

    const matchesProduct = bankingProductFilter === 'ALL' || t.product === bankingProductFilter;

    let matchesFlow = true;
    if (flowTypeFilter === 'INFLOW') {
      matchesFlow = (t.inflow_amount || 0) > 0;
    } else if (flowTypeFilter === 'OUTFLOW') {
      matchesFlow = (t.outflow_amount || 0) > 0;
    }

    return matchesSearch && matchesProduct && matchesFlow;
  });

  const isRange = startDate !== endDate;
  const dateRangeLabel = isRange 
    ? `${startDate.split('-').reverse().join('/')} से ${endDate.split('-').reverse().join('/')}` 
    : `${startDate.split('-').reverse().join('/')}`;

  return (
    <div className="space-y-6">
      
      {/* ======================================================== */}
      {/* 1. TOP HEADER & MAIN DAY BOOK OPTION SELECTOR (2 OPTIONS) */}
      {/* ======================================================== */}
      <div className="bg-white rounded-2xl p-4 sm:p-5 shadow-sm border border-slate-200 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2">
              <BookOpen className="w-6 h-6 text-indigo-600" />
              <span>Day Book</span>
            </h1>
            <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-indigo-100 text-indigo-800 border border-indigo-200">
              Taranganjali Bijnor
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            2 मुख्य विकल्प: दैनिक खर्च व आवक-जावक (Daily Out-In) और कोर बैंकिंग डे-बुक (FD, RD, MIS, Savings)
          </p>
        </div>

        {/* 2 MAIN DAY BOOK OPTIONS TOGGLE */}
        <div className="flex items-center gap-2 bg-slate-100 p-1.5 rounded-2xl border border-slate-200 w-full md:w-auto">
          {/* OPTION 1: DAILY USE (दैनिक खर्च व आवक-जावक) */}
          <button
            type="button"
            onClick={() => setDayBookOption('DAILY_USE')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition cursor-pointer flex-1 md:flex-none justify-center ${
              dayBookOption === 'DAILY_USE'
                ? 'bg-slate-900 text-white shadow-md'
                : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
            }`}
          >
            <Coffee className={`w-4 h-4 ${dayBookOption === 'DAILY_USE' ? 'text-amber-400' : 'text-slate-500'}`} />
            <span>1. Daily Use (दैनिक आवक-जावक)</span>
            <span className={`px-2 py-0.5 rounded-full text-[10px] font-mono font-bold ${
              dayBookOption === 'DAILY_USE' ? 'bg-slate-800 text-amber-300' : 'bg-slate-200 text-slate-700'
            }`}>
              {data?.daily?.summary?.total_vouchers || data?.entries?.length || 0}
            </span>
          </button>

          {/* OPTION 2: BANKING (कोर बैंकिंग डे-बुक) */}
          <button
            type="button"
            onClick={() => setDayBookOption('BANKING')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition cursor-pointer flex-1 md:flex-none justify-center ${
              dayBookOption === 'BANKING'
                ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
            }`}
          >
            <Landmark className={`w-4 h-4 ${dayBookOption === 'BANKING' ? 'text-emerald-300' : 'text-slate-500'}`} />
            <span>2. Banking (कोर बैंकिंग डे-बुक)</span>
            <span className={`px-2 py-0.5 rounded-full text-[10px] font-mono font-bold ${
              dayBookOption === 'BANKING' ? 'bg-indigo-800 text-emerald-300' : 'bg-slate-200 text-slate-700'
            }`}>
              {data?.banking?.transactions?.length || 0} Txns
            </span>
          </button>
        </div>

        {/* Global Action Buttons */}
        <div className="flex items-center gap-2 w-full md:w-auto justify-end">
          <button
            onClick={handleExportCSV}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-300 hover:bg-slate-50 text-slate-700 font-bold text-xs shadow-2xs transition cursor-pointer"
            title="Download Excel / CSV"
          >
            <Download className="w-3.5 h-3.5 text-slate-500" />
            <span className="hidden sm:inline">Export CSV</span>
          </button>

          <button
            onClick={() => window.print()}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-300 hover:bg-slate-50 text-slate-700 font-bold text-xs shadow-2xs transition cursor-pointer"
            title="Print Current Sheet"
          >
            <Printer className="w-3.5 h-3.5 text-slate-500" />
            <span className="hidden sm:inline">Print</span>
          </button>

          {dayBookOption === 'DAILY_USE' && (
            <>
              <button
                onClick={() => handleOpenModal('INFLOW')}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-xs transition cursor-pointer"
                title="Record Cash Inflow / Receipt (रुपया आया / आवक)"
              >
                <ArrowDownLeft className="w-4 h-4" />
                <span>+ आवक</span>
              </button>

              <button
                onClick={() => handleOpenModal('OUTFLOW')}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs shadow-xs transition cursor-pointer"
                title="Record Cash Outflow / Expense (रुपया गया / खर्च)"
              >
                <ArrowUpRight className="w-4 h-4" />
                <span>- खर्च / जावक</span>
              </button>
            </>
          )}

          <button
            onClick={() => onOpenJournalEntry && onOpenJournalEntry()}
            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-slate-900 hover:bg-black text-amber-400 font-bold text-xs shadow-xs transition"
            title="New Journal Entry (JV)"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>JV</span>
          </button>
        </div>
      </div>

      {/* ======================================================== */}
      {/* 2. UNIVERSAL CUSTOM DATE RANGE & SEARCH FILTER COCKPIT   */}
      {/* ======================================================== */}
      <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-200 space-y-3">
        <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3">
          
          {/* Quick Date Range Preset Buttons */}
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mr-1">तारीख अवधि:</span>
            {[
              { id: 'WEEK', label: '19 Nov से 25 Nov (Last 7 Days)' },
              { id: 'TODAY', label: 'आज (Today)' },
              { id: 'YESTERDAY', label: 'कल (Yesterday)' },
              { id: 'MONTH', label: 'इस महीने (This Month)' },
              { id: 'CUSTOM', label: 'कस्टम रेंज' }
            ].map(p => (
              <button
                key={p.id}
                type="button"
                onClick={() => applyDatePreset(p.id)}
                className={`px-2.5 py-1 rounded-lg text-xs font-bold transition cursor-pointer ${
                  datePreset === p.id
                    ? 'bg-indigo-600 text-white shadow-2xs'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>

          {/* Date Picker Controls: From Date to To Date */}
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-1.5 bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-200 text-xs font-semibold text-slate-700">
              <span className="text-slate-400 font-bold text-[10px]">FROM:</span>
              <input 
                type="date" 
                value={startDate} 
                onChange={(e) => { setStartDate(e.target.value); setDatePreset('CUSTOM'); }}
                className="bg-transparent border-none text-xs font-bold text-slate-800 focus:outline-none cursor-pointer"
              />
            </div>

            <span className="text-slate-400 font-bold text-xs">→</span>

            <div className="flex items-center gap-1.5 bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-200 text-xs font-semibold text-slate-700">
              <span className="text-slate-400 font-bold text-[10px]">TO:</span>
              <input 
                type="date" 
                value={endDate} 
                onChange={(e) => { setEndDate(e.target.value); setDatePreset('CUSTOM'); }}
                className="bg-transparent border-none text-xs font-bold text-slate-800 focus:outline-none cursor-pointer"
              />
            </div>

            <button
              onClick={fetchDayBook}
              disabled={loading}
              className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs shadow-xs transition cursor-pointer flex items-center gap-1"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
              <span>लागू करें</span>
            </button>
          </div>
        </div>

        {/* Search Bar & Secondary Product/Flow Filters (ACTIVE IN BOTH OPTIONS) */}
        <div className="pt-3 border-t border-slate-100 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
          
          {/* Universal Search Box */}
          <div className="relative flex-1 max-w-lg">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-2.5" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={
                dayBookOption === 'DAILY_USE'
                  ? 'सर्च करें: पार्टी का नाम, वाउचर नंबर, खर्च का प्रकार, विवरण...'
                  : 'सर्च करें: कस्टमर का नाम, मेम्बर कोड (CUST-XXXX), खाता/FD/RD/MIS नंबर...'
              }
              className="w-full text-xs pl-9 pr-8 py-2 rounded-xl bg-slate-50 border border-slate-200 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 font-medium text-slate-900"
            />
            {search && (
              <button 
                onClick={() => setSearch('')}
                className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-600 font-bold text-xs"
              >
                ✕
              </button>
            )}
          </div>

          {/* Option-Specific Sub Filters */}
          <div className="flex flex-wrap items-center gap-2">
            
            {/* If Banking Option: Product Pills */}
            {dayBookOption === 'BANKING' && (
              <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl">
                {['ALL', 'FD', 'RD', 'MIS', 'SAVINGS'].map(prod => (
                  <button
                    key={prod}
                    onClick={() => setBankingProductFilter(prod)}
                    className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition cursor-pointer ${
                      bankingProductFilter === prod
                        ? 'bg-white text-indigo-700 shadow-2xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    {prod === 'ALL' ? 'सभी प्रोडक्ट्स' : prod}
                  </button>
                ))}
              </div>
            )}

            {/* Inflow vs Outflow Toggle (Active in Both Options) */}
            <div className="flex items-center bg-slate-100 p-1 rounded-xl">
              <button
                onClick={() => setFlowTypeFilter('ALL')}
                className={`px-3 py-1 rounded-lg text-xs font-bold transition cursor-pointer ${
                  flowTypeFilter === 'ALL' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-500 hover:text-slate-900'
                }`}
              >
                All
              </button>
              <button
                onClick={() => setFlowTypeFilter('INFLOW')}
                className={`px-2.5 py-1 rounded-lg text-xs font-bold transition cursor-pointer flex items-center gap-1 ${
                  flowTypeFilter === 'INFLOW' ? 'bg-emerald-600 text-white shadow-2xs' : 'text-slate-500 hover:text-emerald-700'
                }`}
              >
                <ArrowDownLeft className="w-3.5 h-3.5" />
                <span>{dayBookOption === 'DAILY_USE' ? 'आवक (In)' : 'आया (जमा)'}</span>
              </button>
              <button
                onClick={() => setFlowTypeFilter('OUTFLOW')}
                className={`px-2.5 py-1 rounded-lg text-xs font-bold transition cursor-pointer flex items-center gap-1 ${
                  flowTypeFilter === 'OUTFLOW' ? 'bg-rose-600 text-white shadow-2xs' : 'text-slate-500 hover:text-rose-700'
                }`}
              >
                <ArrowUpRight className="w-3.5 h-3.5" />
                <span>{dayBookOption === 'DAILY_USE' ? 'जावक (Out)' : 'गया (निकासी)'}</span>
              </button>
            </div>

            {/* Branch Selector */}
            <select 
              value={selectedBranch} 
              onChange={(e) => setSelectedBranch(e.target.value)}
              className="px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 focus:outline-none"
            >
              <option value="ALL">All Branches (2)</option>
              <option value="BHR001">MAIN BRANCH</option>
              <option value="BRH003">TARPL SAVING</option>
            </select>
          </div>
        </div>
      </div>

      {/* ======================================================== */}
      {/* 3A. VIEW 1: DAILY USE (दैनिक खर्च व आवक-जावक)            */}
      {/* ======================================================== */}
      {dayBookOption === 'DAILY_USE' && (
        <div className="space-y-6 animate-fadeIn">
          
          {/* Top 3 KPI Flow Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Input Inflow Card */}
            <div className="bg-gradient-to-br from-emerald-50 via-white to-emerald-50/20 border border-emerald-300 rounded-2xl p-4 shadow-sm relative overflow-hidden">
              <div className="flex items-center justify-between pb-2 border-b border-emerald-200">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-emerald-600 flex items-center justify-center text-white shadow-xs">
                    <ArrowDownLeft className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="text-[11px] font-bold text-emerald-800 uppercase tracking-wider block">
                      Total Input / Inflow (कुल आवक)
                    </span>
                    <span className="text-[10px] text-emerald-600">{dateRangeLabel}</span>
                  </div>
                </div>
                <button
                  onClick={() => handleOpenModal('INFLOW')}
                  className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs transition cursor-pointer"
                >
                  + Add आवक
                </button>
              </div>

              <div className="mt-3 flex items-baseline justify-between">
                <div className="text-2xl font-black font-mono text-emerald-700 tracking-tight">
                  +₹{(data?.daily?.summary?.total_inflow || data?.summary?.inflows?.total || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                </div>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                  Cash In
                </span>
              </div>

              <div className="mt-2 flex items-center justify-between text-xs text-slate-600 pt-2 border-t border-emerald-100 font-medium">
                <span>गल्ला (Cash): <strong className="font-mono text-emerald-700">₹{(data?.daily?.summary?.inflows?.cash || data?.summary?.inflows?.cash || 0).toLocaleString('en-IN')}</strong></span>
                <span>बैंक (Online): <strong className="font-mono text-emerald-700">₹{(data?.daily?.summary?.inflows?.bank || data?.summary?.inflows?.bank || 0).toLocaleString('en-IN')}</strong></span>
              </div>
            </div>

            {/* Output Outflow Card */}
            <div className="bg-gradient-to-br from-rose-50 via-white to-rose-50/20 border border-rose-300 rounded-2xl p-4 shadow-sm relative overflow-hidden">
              <div className="flex items-center justify-between pb-2 border-b border-rose-200">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-rose-600 flex items-center justify-center text-white shadow-xs">
                    <ArrowUpRight className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="text-[11px] font-bold text-rose-800 uppercase tracking-wider block">
                      Total Output / Outflow (कुल खर्च व जावक)
                    </span>
                    <span className="text-[10px] text-rose-600">{dateRangeLabel}</span>
                  </div>
                </div>
                <button
                  onClick={() => handleOpenModal('OUTFLOW')}
                  className="px-2.5 py-1 rounded-lg bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs transition cursor-pointer"
                >
                  - Add खर्च
                </button>
              </div>

              <div className="mt-3 flex items-baseline justify-between">
                <div className="text-2xl font-black font-mono text-rose-700 tracking-tight">
                  -₹{(data?.daily?.summary?.total_outflow || data?.summary?.outflows?.total || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                </div>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-rose-100 text-rose-800">
                  Payments
                </span>
              </div>

              <div className="mt-2 flex items-center justify-between text-xs text-slate-600 pt-2 border-t border-rose-100 font-medium">
                <span>गल्ला (Cash): <strong className="font-mono text-rose-700">₹{(data?.daily?.summary?.outflows?.cash || data?.summary?.outflows?.cash || 0).toLocaleString('en-IN')}</strong></span>
                <span>बैंक (Online): <strong className="font-mono text-rose-700">₹{(data?.daily?.summary?.outflows?.bank || data?.summary?.outflows?.bank || 0).toLocaleString('en-IN')}</strong></span>
              </div>
            </div>

            {/* Net Cashflow Movement Card */}
            <div className="bg-gradient-to-br from-indigo-50 via-white to-indigo-50/20 border border-indigo-200 rounded-2xl p-4 shadow-sm flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between pb-2 border-b border-indigo-100">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-lg bg-indigo-600 flex items-center justify-center text-white shadow-xs">
                      <Scale className="w-4 h-4" />
                    </div>
                    <div>
                      <span className="text-[11px] font-bold text-indigo-900 uppercase tracking-wider block">
                        Net Cash Movement (शुद्ध रोकड़ प्रवाह)
                      </span>
                      <span className="text-[10px] text-indigo-600">आवक minus जावक</span>
                    </div>
                  </div>
                </div>

                <div className="mt-3">
                  {(() => {
                    const net = (data?.daily?.summary?.net_cashflow ?? data?.summary?.net_cashflow ?? 0);
                    return (
                      <div className={`text-2xl font-black font-mono tracking-tight ${net >= 0 ? 'text-emerald-700' : 'text-rose-700'}`}>
                        {net >= 0 ? '+' : ''}₹{net.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </div>
                    );
                  })()}
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    Current Vault Balance: <strong className="font-mono text-slate-800">₹{(data?.ledgers?.find(l => l.code === 'LED-003')?.closing_balance || 0).toLocaleString('en-IN')}</strong>
                  </p>
                </div>
              </div>

              {/* Quick Entry Chips */}
              <div className="pt-2 border-t border-indigo-100 flex flex-wrap items-center gap-1.5 text-xs">
                <span className="text-[10px] font-bold text-slate-400">Quick:</span>
                <button
                  onClick={() => handleOpenModal('OUTFLOW', OUTPUT_CATEGORIES[3])}
                  className="px-2 py-0.5 bg-amber-100 hover:bg-amber-200 text-amber-900 rounded font-bold text-[10px] transition cursor-pointer flex items-center gap-1"
                >
                  <Coffee className="w-3 h-3" />
                  <span>- चाय/नाश्ता</span>
                </button>
                <button
                  onClick={() => handleOpenModal('OUTFLOW', OUTPUT_CATEGORIES[4])}
                  className="px-2 py-0.5 bg-blue-100 hover:bg-blue-200 text-blue-900 rounded font-bold text-[10px] transition cursor-pointer flex items-center gap-1"
                >
                  <FileText className="w-3 h-3" />
                  <span>- स्टेशनरी</span>
                </button>
                <button
                  onClick={() => handleOpenModal('INFLOW', INPUT_CATEGORIES[2])}
                  className="px-2 py-0.5 bg-emerald-100 hover:bg-emerald-200 text-emerald-900 rounded font-bold text-[10px] transition cursor-pointer flex items-center gap-1"
                >
                  <Coins className="w-3 h-3" />
                  <span>+ कलेक्शन</span>
                </button>
                <button
                  onClick={() => handleOpenModal('INFLOW', INPUT_CATEGORIES[1])}
                  className="px-2 py-0.5 bg-purple-100 hover:bg-purple-200 text-purple-900 rounded font-bold text-[10px] transition cursor-pointer flex items-center gap-1"
                >
                  <HandCoins className="w-3 h-3" />
                  <span>+ उधार लिया</span>
                </button>
              </div>
            </div>
          </div>

          {/* Detailed Daily Vouchers Table */}
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
            <div className="p-4 border-b border-slate-100 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <div>
                <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <Receipt className="w-4 h-4 text-indigo-600" />
                  <span>Daily Use Entries & Vouchers ({filteredDailyVouchers.length})</span>
                </h2>
                <p className="text-xs text-slate-500">
                  {dateRangeLabel} के दौरान हुए सभी दैनिक खर्चे एवं आवक-जावक की सूची
                </p>
              </div>
              <div className="text-xs text-slate-500">
                Showing {filteredDailyVouchers.length} matching entries
              </div>
            </div>

            <div className="overflow-x-auto max-h-[600px] overflow-y-auto">
              <table className="w-full text-xs text-left">
                <thead className="bg-slate-50 border-b border-slate-200 text-[10px] uppercase font-bold text-slate-500 tracking-wider sticky top-0 z-10 shadow-2xs">
                  <tr>
                    <th className="py-2.5 px-4">Voucher No</th>
                    <th className="py-2.5 px-4">Date & Time</th>
                    <th className="py-2.5 px-4">Flow Type</th>
                    <th className="py-2.5 px-4">Head / Category</th>
                    <th className="py-2.5 px-4">Party / Name</th>
                    <th className="py-2.5 px-4">Mode / Ledger</th>
                    <th className="py-2.5 px-4">Narration / Bill No</th>
                    <th className="py-2.5 px-4 text-right">Amount (₹)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700">
                  {filteredDailyVouchers.length === 0 ? (
                    <tr>
                      <td colSpan="8" className="py-12 text-center text-slate-400">
                        <Receipt className="w-8 h-8 mx-auto text-slate-300 mb-2" />
                        <p className="font-semibold">इस अवधि में कोई वाउचर या एंट्री नहीं मिली।</p>
                        <p className="text-[11px] text-slate-400 mt-0.5">तारीख बदलें या "+ आवक" / "- खर्च" बटन से नई एंट्री दर्ज करें।</p>
                      </td>
                    </tr>
                  ) : (
                    filteredDailyVouchers.map((v) => {
                      const isInflow = v.type === 'RECEIPT' || v.entry_type === 'INFLOW' || v.voucher_no?.startsWith('IN-');
                      return (
                        <tr key={v.id} className={`hover:bg-slate-50 transition ${isInflow ? 'bg-emerald-50/15' : 'bg-rose-50/15'}`}>
                          <td className="py-3 px-4 font-mono font-bold text-slate-900 flex items-center gap-1.5 whitespace-nowrap">
                            {isInflow ? (
                              <ArrowDownLeft className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                            ) : (
                              <ArrowUpRight className="w-3.5 h-3.5 text-rose-600 shrink-0" />
                            )}
                            <span className={isInflow ? 'text-emerald-800' : 'text-amber-800'}>{v.voucher_no}</span>
                          </td>
                          <td className="py-3 px-4 text-slate-500 whitespace-nowrap">
                            <div className="font-medium text-slate-800">{v.date ? v.date.split('-').reverse().join('/') : ''}</div>
                            <div className="text-[10px] text-slate-400">{v.time || '11:00 AM'}</div>
                          </td>
                          <td className="py-3 px-4 whitespace-nowrap">
                            {isInflow ? (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
                                आवक (In)
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-800 border border-rose-300">
                                जावक (Out)
                              </span>
                            )}
                          </td>
                          <td className="py-3 px-4 font-semibold text-slate-900 whitespace-nowrap">
                            {v.category_name || v.category}
                          </td>
                          <td className="py-3 px-4 font-medium text-slate-800">
                            <div>{v.party_name || v.account}</div>
                          </td>
                          <td className="py-3 px-4 whitespace-nowrap">
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-700">
                              {v.payment_mode === 'CASH' ? 'गल्ला (CASH)' : 'बैंक (ONLINE)'}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-slate-600 max-w-xs truncate">
                            {(v.bill_number || v.reference_no) && (
                              <span className="font-mono text-slate-500 font-semibold mr-1 bg-slate-100 px-1.5 py-0.5 rounded">
                                [{v.bill_number || v.reference_no}]
                              </span>
                            )}
                            {v.narration}
                          </td>
                          <td className={`py-3 px-4 text-right font-mono font-bold text-sm whitespace-nowrap ${
                            isInflow ? 'text-emerald-700' : 'text-rose-700'
                          }`}>
                            {isInflow ? '+' : '-'}₹{v.amount?.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* 3-Column Live Banking Ledgers (Optionally viewable in Daily Use) */}
          <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div>
                <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">11 Live Banking Balance Ledgers</h3>
                <p className="text-[11px] text-slate-500">Click on any ledger below to view complete Passbook Statement</p>
              </div>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5 pt-3">
              {(data?.ledgers || []).map((ledger) => (
                <div
                  key={ledger.id}
                  onClick={() => handleOpenLedgerStatement(ledger)}
                  className="p-2.5 rounded-xl border border-slate-200 bg-slate-50/60 hover:bg-indigo-50/60 hover:border-indigo-300 transition cursor-pointer text-center group"
                >
                  <span className="font-mono font-bold text-xs text-slate-900 block group-hover:text-indigo-700">
                    ₹{ledger.closing_balance.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                  </span>
                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-tight block mt-0.5 truncate">
                    {ledger.name}
                  </span>
                </div>
              ))}
            </div>
          </div>

        </div>
      )}

      {/* ======================================================== */}
      {/* 3B. VIEW 2: BANKING (कोर बैंकिंग डे-बुक)                  */}
      {/* ======================================================== */}
      {dayBookOption === 'BANKING' && (
        <div className="space-y-6 animate-fadeIn">
          
          {/* Top 4 Banking KPI Cards (कितना आया, कितना गया, तरलता, नए खाते) */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            
            {/* 1. कुल आया (Total Banking Inflow) */}
            <div className="bg-gradient-to-br from-emerald-50 via-white to-emerald-50/30 border border-emerald-300 rounded-2xl p-4 shadow-sm">
              <div className="flex items-center justify-between pb-2 border-b border-emerald-100">
                <span className="text-[11px] font-bold text-emerald-800 uppercase tracking-wider flex items-center gap-1.5">
                  <ArrowDownLeft className="w-4 h-4 text-emerald-600" />
                  कुल आया (Total Inflow)
                </span>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                  जमा
                </span>
              </div>
              <div className="text-2xl font-black font-mono text-emerald-700 mt-2 tracking-tight">
                +₹{(data?.banking?.summary?.total_inflow || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
              </div>
              <p className="text-[11px] text-slate-500 mt-1">
                FD, RD, MIS नई बुकिंग्स + बचत जमा
              </p>
            </div>

            {/* 2. कुल गया (Total Banking Outflow) */}
            <div className="bg-gradient-to-br from-rose-50 via-white to-rose-50/30 border border-rose-300 rounded-2xl p-4 shadow-sm">
              <div className="flex items-center justify-between pb-2 border-b border-rose-100">
                <span className="text-[11px] font-bold text-rose-800 uppercase tracking-wider flex items-center gap-1.5">
                  <ArrowUpRight className="w-4 h-4 text-rose-600" />
                  कुल गया (Total Outflow)
                </span>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-rose-100 text-rose-800">
                  निकासी
                </span>
              </div>
              <div className="text-2xl font-black font-mono text-rose-700 mt-2 tracking-tight">
                -₹{(data?.banking?.summary?.total_outflow || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
              </div>
              <p className="text-[11px] text-slate-500 mt-1">
                बचत निकासी + MIS ब्याज पेआउट + बंदियां
              </p>
            </div>

            {/* 3. शुद्ध बैंकिंग तरलता (Net Banking Flow) */}
            <div className="bg-gradient-to-br from-indigo-50 via-white to-indigo-50/30 border border-indigo-200 rounded-2xl p-4 shadow-sm">
              <div className="flex items-center justify-between pb-2 border-b border-indigo-100">
                <span className="text-[11px] font-bold text-indigo-900 uppercase tracking-wider flex items-center gap-1.5">
                  <Scale className="w-4 h-4 text-indigo-600" />
                  शुद्ध तरलता (Net Flow)
                </span>
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                  (data?.banking?.summary?.net_liquidity || 0) >= 0 ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                }`}>
                  {(data?.banking?.summary?.net_liquidity || 0) >= 0 ? 'Surplus (+)' : 'Deficit (-)'}
                </span>
              </div>
              <div className={`text-2xl font-black font-mono mt-2 tracking-tight ${
                (data?.banking?.summary?.net_liquidity || 0) >= 0 ? 'text-indigo-900' : 'text-rose-700'
              }`}>
                {(data?.banking?.summary?.net_liquidity || 0) >= 0 ? '+' : ''}₹{(data?.banking?.summary?.net_liquidity || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
              </div>
              <p className="text-[11px] text-slate-500 mt-1">
                {dateRangeLabel} में शुद्ध बैंकिंग शेष
              </p>
            </div>

            {/* 4. कुल नए खाते (Total New Accounts Opened) */}
            <div className="bg-gradient-to-br from-amber-50 via-white to-amber-50/30 border border-amber-300 rounded-2xl p-4 shadow-sm">
              <div className="flex items-center justify-between pb-2 border-b border-amber-100">
                <span className="text-[11px] font-bold text-amber-900 uppercase tracking-wider flex items-center gap-1.5">
                  <Sparkles className="w-4 h-4 text-amber-600" />
                  कुल नए खाते (New Accounts)
                </span>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-800">
                  Booked
                </span>
              </div>
              <div className="text-2xl font-black font-mono text-amber-900 mt-2 tracking-tight">
                {data?.banking?.summary?.total_new_accounts || 0} Accounts
              </div>
              <p className="text-[11px] text-slate-500 mt-1">
                FD + RD + MIS + Savings नए अनुबंध
              </p>
            </div>

          </div>

          {/* Product-Wise Operational Matrix (FD, RD, MIS, Savings Breakdown) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            
            {/* FD Box */}
            <div className="bg-white rounded-2xl p-4 border border-indigo-200 shadow-xs space-y-2">
              <div className="flex items-center justify-between pb-1.5 border-b border-slate-100">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-lg bg-indigo-600 text-white flex items-center justify-center font-bold text-xs">
                    FD
                  </div>
                  <h4 className="font-bold text-slate-900 text-xs">Fixed Deposit (सावधि)</h4>
                </div>
                <span className="text-[10px] font-mono font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded">
                  {data?.banking?.summary?.fd?.opened_count || 0} Open
                </span>
              </div>
              <div className="text-xs space-y-1 pt-1">
                <div className="flex justify-between">
                  <span className="text-slate-500">नई FD जमा:</span>
                  <strong className="font-mono text-emerald-700 font-bold">
                    +₹{(data?.banking?.summary?.fd?.opened_amount || 0).toLocaleString('en-IN')}
                  </strong>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">परिपक्व / बंदी:</span>
                  <strong className="font-mono text-slate-700">
                    {data?.banking?.summary?.fd?.closed_count || 0} (₹{(data?.banking?.summary?.fd?.closed_amount || 0).toLocaleString('en-IN')})
                  </strong>
                </div>
              </div>
            </div>

            {/* RD Box */}
            <div className="bg-white rounded-2xl p-4 border border-teal-200 shadow-xs space-y-2">
              <div className="flex items-center justify-between pb-1.5 border-b border-slate-100">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-lg bg-teal-600 text-white flex items-center justify-center font-bold text-xs">
                    RD
                  </div>
                  <h4 className="font-bold text-slate-900 text-xs">Recurring (आवर्ती जमा)</h4>
                </div>
                <span className="text-[10px] font-mono font-bold text-teal-700 bg-teal-50 px-2 py-0.5 rounded">
                  {data?.banking?.summary?.rd?.opened_count || 0} Open
                </span>
              </div>
              <div className="text-xs space-y-1 pt-1">
                <div className="flex justify-between">
                  <span className="text-slate-500">मासिक किश्त कमिटमेंट:</span>
                  <strong className="font-mono text-slate-800 font-bold">
                    ₹{(data?.banking?.summary?.rd?.opened_installment || 0).toLocaleString('en-IN')}/mo
                  </strong>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">किश्तें वसूली:</span>
                  <strong className="font-mono text-emerald-700 font-bold">
                    {data?.banking?.summary?.rd?.installments_paid_count || 0} Paid (+₹{(data?.banking?.summary?.rd?.installments_paid_amount || 0).toLocaleString('en-IN')})
                  </strong>
                </div>
              </div>
            </div>

            {/* MIS Box */}
            <div className="bg-white rounded-2xl p-4 border border-blue-200 shadow-xs space-y-2">
              <div className="flex items-center justify-between pb-1.5 border-b border-slate-100">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-lg bg-blue-600 text-white flex items-center justify-center font-bold text-xs">
                    MIS
                  </div>
                  <h4 className="font-bold text-slate-900 text-xs">Monthly Income (मासिक आय)</h4>
                </div>
                <span className="text-[10px] font-mono font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded">
                  {data?.banking?.summary?.mis?.opened_count || 0} Open
                </span>
              </div>
              <div className="text-xs space-y-1 pt-1">
                <div className="flex justify-between">
                  <span className="text-slate-500">नया MIS जमा:</span>
                  <strong className="font-mono text-emerald-700 font-bold">
                    +₹{(data?.banking?.summary?.mis?.opened_amount || 0).toLocaleString('en-IN')}
                  </strong>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">मासिक ब्याज भुगतान:</span>
                  <strong className="font-mono text-rose-700 font-bold">
                    {data?.banking?.summary?.mis?.payouts_count || 0} Payouts (-₹{(data?.banking?.summary?.mis?.payouts_amount || 0).toLocaleString('en-IN')})
                  </strong>
                </div>
              </div>
            </div>

            {/* Savings Box */}
            <div className="bg-white rounded-2xl p-4 border border-amber-200 shadow-xs space-y-2">
              <div className="flex items-center justify-between pb-1.5 border-b border-slate-100">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-lg bg-amber-600 text-white flex items-center justify-center font-bold text-xs">
                    SB
                  </div>
                  <h4 className="font-bold text-slate-900 text-xs">Savings (बचत खाता)</h4>
                </div>
                <span className="text-[10px] font-mono font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded">
                  {data?.banking?.summary?.savings?.opened_count || 0} Open
                </span>
              </div>
              <div className="text-xs space-y-1 pt-1">
                <div className="flex justify-between">
                  <span className="text-slate-500">बचत खाते में नकद जमा:</span>
                  <strong className="font-mono text-emerald-700 font-bold">
                    +₹{(data?.banking?.summary?.savings?.total_deposits || 0).toLocaleString('en-IN')}
                  </strong>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">बचत खाते से निकासी:</span>
                  <strong className="font-mono text-rose-700 font-bold">
                    -₹{(data?.banking?.summary?.savings?.total_withdrawals || 0).toLocaleString('en-IN')}
                  </strong>
                </div>
              </div>
            </div>

          </div>

          {/* Granular Banking Transactions Ledger Table */}
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
            <div className="p-4 border-b border-slate-100 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <div>
                <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <Landmark className="w-4 h-4 text-indigo-600" />
                  <span>Core Banking Transaction Ledger ({filteredBankingTxns.length})</span>
                </h2>
                <p className="text-xs text-slate-500">
                  {dateRangeLabel} के दौरान हुए सभी बैंकिंग लेनदेन, नई बुकिंग्स व भुगतानों का सम्पूर्ण विवरण
                </p>
              </div>
              <div className="text-xs text-slate-500">
                Showing {filteredBankingTxns.length} transactions
              </div>
            </div>

            <div className="overflow-x-auto max-h-[600px] overflow-y-auto">
              <table className="w-full text-xs text-left">
                <thead className="bg-slate-50 border-b border-slate-200 text-[10px] uppercase font-bold text-slate-500 tracking-wider sticky top-0 z-10 shadow-2xs">
                  <tr>
                    <th className="py-2.5 px-4">Date & Time</th>
                    <th className="py-2.5 px-4">Ref / Account No</th>
                    <th className="py-2.5 px-4">Customer Name & ID</th>
                    <th className="py-2.5 px-4">Product</th>
                    <th className="py-2.5 px-4">Transaction Details</th>
                    <th className="py-2.5 px-4">Mode</th>
                    <th className="py-2.5 px-4 text-right">Inflow (आया ₹)</th>
                    <th className="py-2.5 px-4 text-right">Outflow (गया ₹)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700">
                  {filteredBankingTxns.length === 0 ? (
                    <tr>
                      <td colSpan="8" className="py-12 text-center text-slate-400">
                        <Landmark className="w-8 h-8 mx-auto text-slate-300 mb-2" />
                        <p className="font-semibold">इस तारीख अवधि में कोई बैंकिंग लेनदेन नहीं मिला।</p>
                        <p className="text-[11px] text-slate-400 mt-0.5">तारीख अवधि बदलकर (e.g. 19 Nov से 25 Nov) पुनः जांचें।</p>
                      </td>
                    </tr>
                  ) : (
                    filteredBankingTxns.map((t) => {
                      const isInflow = (t.inflow_amount || 0) > 0;
                      return (
                        <tr key={t.id} className={`hover:bg-slate-50 transition ${isInflow ? 'bg-emerald-50/15' : 'bg-rose-50/15'}`}>
                          <td className="py-3 px-4 whitespace-nowrap">
                            <div className="font-semibold text-slate-900">{t.date ? t.date.split('-').reverse().join('/') : ''}</div>
                            <div className="text-[10px] text-slate-400">{t.time || '11:00 AM'}</div>
                          </td>
                          <td className="py-3 px-4 font-mono font-bold text-slate-900 whitespace-nowrap">
                            <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-800 border border-slate-200">
                              {t.voucher_no}
                            </span>
                          </td>
                          <td className="py-3 px-4">
                            <div className="font-bold text-slate-900 flex items-center gap-1.5">
                              <span>{t.customer_name}</span>
                            </div>
                            <div className="text-[10px] text-indigo-600 font-mono font-bold">
                              {t.customer_code} • {t.customer_phone || ''}
                            </div>
                          </td>
                          <td className="py-3 px-4 whitespace-nowrap">
                            <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                              t.product === 'FD' ? 'bg-indigo-100 text-indigo-800 border border-indigo-200' :
                              t.product === 'RD' ? 'bg-teal-100 text-teal-800 border border-teal-200' :
                              t.product === 'MIS' ? 'bg-blue-100 text-blue-800 border border-blue-200' :
                              'bg-amber-100 text-amber-800 border border-amber-200'
                            }`}>
                              {t.product}
                            </span>
                          </td>
                          <td className="py-3 px-4">
                            <div className="font-bold text-slate-900">{t.action_label}</div>
                            <div className="text-[11px] text-slate-500 truncate max-w-xs">{t.narration}</div>
                          </td>
                          <td className="py-3 px-4 whitespace-nowrap">
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-600">
                              {t.payment_mode}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-right font-mono font-bold text-sm text-emerald-700 whitespace-nowrap">
                            {t.inflow_amount > 0 ? `+₹${t.inflow_amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}` : '-'}
                          </td>
                          <td className="py-3 px-4 text-right font-mono font-bold text-sm text-rose-700 whitespace-nowrap">
                            {t.outflow_amount > 0 ? `-₹${t.outflow_amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}` : '-'}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>

        </div>
      )}

      {/* ======================================================== */}
      {/* 4. MODAL: RECORD INPUT (आवक) & OUTPUT (जावक) (Daily Use) */}
      {/* ======================================================== */}
      {showEntryModal && (
        <div className="fixed inset-0 z-[200] flex justify-center items-start pt-6 sm:pt-8 pb-10 p-3 sm:p-4 bg-slate-950/80 backdrop-blur-sm overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-lg overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className={`px-6 py-4 flex items-center justify-between text-white ${
              modalMode === 'INFLOW' 
                ? 'bg-gradient-to-r from-emerald-600 to-teal-700' 
                : 'bg-gradient-to-r from-rose-600 to-amber-700'
            }`}>
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-white/20 flex items-center justify-center">
                  {modalMode === 'INFLOW' ? <ArrowDownLeft className="w-5 h-5" /> : <ArrowUpRight className="w-5 h-5" />}
                </div>
                <div>
                  <h3 className="text-base font-bold">
                    {modalMode === 'INFLOW' ? 'Record Input (रुपया आया / आवक)' : 'Record Output (रुपया गया / खर्च)'}
                  </h3>
                  <p className="text-[11px] text-white/80 font-medium">
                    {modalMode === 'INFLOW' 
                      ? 'दैनिक जमा, कलेक्शन, बचत जमा, या बैंक से गल्ले में आवक' 
                      : 'चाय-नाश्ता, स्टेशनरी, पेट्रोल, बिल, बचत निकासी या जावक'}
                  </p>
                </div>
              </div>
              <button 
                onClick={() => setShowEntryModal(false)}
                className="inline-flex items-center gap-1 px-3 py-1.5 bg-black/20 hover:bg-black/30 rounded-xl text-xs font-bold transition cursor-pointer"
                title="Close"
              >
                <X className="w-4 h-4 text-white" />
                <span>Close</span>
              </button>
            </div>

            <div className="p-4 bg-slate-50 border-b border-slate-200 flex items-center justify-center gap-2">
              <button
                type="button"
                onClick={() => handleSwitchModalType('INFLOW')}
                className={`flex-1 py-2 px-3 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 transition cursor-pointer ${
                  modalMode === 'INFLOW'
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : 'bg-white border border-slate-300 text-slate-700 hover:bg-slate-100'
                }`}
              >
                <ArrowDownLeft className="w-4 h-4" />
                <span>🟢 Input / Inflow (आवक)</span>
              </button>
              <button
                type="button"
                onClick={() => handleSwitchModalType('OUTFLOW')}
                className={`flex-1 py-2 px-3 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 transition cursor-pointer ${
                  modalMode === 'OUTFLOW'
                    ? 'bg-rose-600 text-white shadow-xs'
                    : 'bg-white border border-slate-300 text-slate-700 hover:bg-slate-100'
                }`}
              >
                <ArrowUpRight className="w-4 h-4" />
                <span>🔴 Output / Outflow (खर्च / जावक)</span>
              </button>
            </div>

            <form onSubmit={handleSubmitEntry} className="p-6 space-y-4">
              {formError && (
                <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 flex items-center gap-2 text-rose-700 text-xs">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{formError}</span>
                </div>
              )}

              {formSuccess && (
                <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center gap-2 text-emerald-800 text-xs">
                  <CheckCircle2 className="w-4 h-4 shrink-0" />
                  <span>{formSuccess}</span>
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                  {modalMode === 'INFLOW' ? 'Input Head / Source (आवक का प्रकार) *' : 'Output Head / Category (खर्च का प्रकार) *'}
                </label>
                <div className="grid grid-cols-2 gap-2 max-h-48 overflow-y-auto pr-1">
                  {(modalMode === 'INFLOW' ? INPUT_CATEGORIES : OUTPUT_CATEGORIES).map(cat => {
                    const isSelected = formData.category === cat.id;
                    const Icon = cat.icon;
                    return (
                      <button
                        type="button"
                        key={cat.id}
                        onClick={() => setFormData(prev => ({
                          ...prev,
                          category: cat.id,
                          category_name: cat.name
                        }))}
                        className={`flex items-center gap-2 p-2 rounded-xl border text-left transition cursor-pointer ${
                          isSelected
                            ? modalMode === 'INFLOW'
                              ? 'bg-emerald-50 border-emerald-500 ring-2 ring-emerald-500/20 text-slate-950 font-bold'
                              : 'bg-rose-50 border-rose-500 ring-2 ring-rose-500/20 text-slate-950 font-bold'
                            : 'bg-white border-slate-200 hover:border-slate-300 text-slate-700'
                        }`}
                      >
                        <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${
                          isSelected 
                            ? modalMode === 'INFLOW' ? 'bg-emerald-600 text-white' : 'bg-rose-600 text-white'
                            : 'bg-slate-100 text-slate-500'
                        }`}>
                          <Icon className="w-4 h-4" />
                        </div>
                        <div className="min-w-0">
                          <div className="text-xs font-bold truncate">{cat.name}</div>
                          <div className="text-[10px] text-slate-400 truncate">{cat.hindi}</div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                    Amount (रुपये) *
                  </label>
                  <span className="text-[11px] text-slate-400 font-medium">Presets</span>
                </div>
                <div className="flex items-center gap-1.5 mb-2 overflow-x-auto pb-1">
                  {(modalMode === 'INFLOW' 
                    ? [500, 1000, 2000, 5000, 10000, 25000, 50000]
                    : [20, 50, 100, 180, 250, 500, 1000, 5000]
                  ).map(amt => (
                    <button
                      type="button"
                      key={amt}
                      onClick={() => setFormData(prev => ({ ...prev, amount: String(amt) }))}
                      className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 border border-slate-200 text-xs font-mono font-bold text-slate-700 transition cursor-pointer"
                    >
                      ₹{amt.toLocaleString('en-IN')}
                    </button>
                  ))}
                </div>
                <div className="relative">
                  <span className="absolute left-3 top-2.5 font-bold text-slate-400 text-sm">₹</span>
                  <input
                    type="number"
                    step="0.01"
                    min="1"
                    placeholder="Enter amount (e.g. 5000)"
                    value={formData.amount}
                    onChange={(e) => setFormData(prev => ({ ...prev, amount: e.target.value }))}
                    className="w-full pl-8 pr-3 py-2 border border-slate-300 rounded-xl text-base font-mono font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    {modalMode === 'INFLOW' ? 'Deposit Into (खाता) *' : 'Paid From (खाता) *'}
                  </label>
                  <select
                    value={formData.payment_mode}
                    onChange={(e) => setFormData(prev => ({ ...prev, payment_mode: e.target.value }))}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs font-bold text-slate-800 bg-white"
                  >
                    <option value="CASH">CASH BOOK (गल्ला / Cash)</option>
                    <option value="BANK_ONLINE">BANK BOOK (बैंक खाता / UPI)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Entry Date (दिनांक) *
                  </label>
                  <input
                    type="date"
                    value={formData.entry_date}
                    onChange={(e) => setFormData(prev => ({ ...prev, entry_date: e.target.value }))}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs font-bold text-slate-800 bg-white"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    {modalMode === 'INFLOW' ? 'Received From (नाम) *' : 'Paid To (दुकानदार / वेंडर) *'}
                  </label>
                  <input
                    type="text"
                    placeholder={modalMode === 'INFLOW' ? 'e.g. Sunil Kumar / Customer' : 'e.g. Raju Chai Stall / Staff'}
                    value={formData.party_name}
                    onChange={(e) => setFormData(prev => ({ ...prev, party_name: e.target.value }))}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Bill / Ref No (वैकल्पिक)
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. BILL-491"
                    value={formData.reference_no}
                    onChange={(e) => setFormData(prev => ({ ...prev, reference_no: e.target.value }))}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs font-medium text-slate-800 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Narration / Description (विवरण) *
                </label>
                <textarea
                  rows="2"
                  placeholder="e.g. 5 staff members afternoon tea & snacks"
                  value={formData.narration}
                  onChange={(e) => setFormData(prev => ({ ...prev, narration: e.target.value }))}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  required
                ></textarea>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowEntryModal(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className={`px-5 py-2 rounded-xl text-xs font-bold text-white shadow-md transition cursor-pointer disabled:opacity-50 ${
                    modalMode === 'INFLOW'
                      ? 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-600/30'
                      : 'bg-rose-600 hover:bg-rose-700 shadow-rose-600/30'
                  }`}
                >
                  {submitting ? 'Saving...' : modalMode === 'INFLOW' ? 'Save Inflow (आवक दर्ज करें)' : 'Save Expense (खर्च दर्ज करें)'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* 5. STATEMENT DRILLDOWN PASSBOOK MODAL                    */}
      {/* ======================================================== */}
      {showStatementModal && selectedLedgerStatement && (
        <div className="fixed inset-0 z-[200] flex justify-center items-start pt-6 sm:pt-8 pb-10 p-3 sm:p-4 bg-slate-950/80 backdrop-blur-sm overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-4xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center font-bold text-sm">
                  {selectedLedgerStatement.ledger.code}
                </div>
                <div>
                  <h3 className="text-base font-bold flex items-center gap-2">
                    <span>{selectedLedgerStatement.ledger.name}</span>
                    <span className="text-xs px-2 py-0.5 rounded bg-slate-800 text-amber-300 font-normal">
                      {selectedLedgerStatement.ledger.type}
                    </span>
                  </h3>
                  <p className="text-[11px] text-slate-400">Passbook Ledger Statement for {dateRangeLabel}</p>
                </div>
              </div>
              <button 
                onClick={() => setShowStatementModal(false)}
                className="inline-flex items-center gap-1 px-3 py-1.5 bg-white/10 hover:bg-white/20 rounded-xl text-xs font-bold transition cursor-pointer"
              >
                <X className="w-4 h-4 text-white" />
                <span>Close</span>
              </button>
            </div>

            <div className="p-4 sm:p-6 space-y-4">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-slate-50 p-4 rounded-xl border border-slate-200 text-xs">
                <div>
                  <span className="text-slate-400 block text-[10px] uppercase font-bold">Opening Balance</span>
                  <span className="font-mono font-bold text-slate-800 text-sm mt-0.5 block">
                    ₹{selectedLedgerStatement.ledger.opening_balance.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px] uppercase font-bold text-emerald-700">Total Credits (Receipts)</span>
                  <span className="font-mono font-bold text-emerald-700 text-sm mt-0.5 block">
                    +₹{(selectedLedgerStatement.ledger.total_credit || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px] uppercase font-bold text-rose-700">Total Debits (Payments)</span>
                  <span className="font-mono font-bold text-rose-700 text-sm mt-0.5 block">
                    -₹{(selectedLedgerStatement.ledger.total_debit || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px] uppercase font-bold">Closing Balance</span>
                  <span className="font-mono font-bold text-indigo-700 text-sm mt-0.5 block">
                    ₹{selectedLedgerStatement.ledger.closing_balance.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </span>
                </div>
              </div>

              <div className="overflow-x-auto max-h-96 overflow-y-auto border border-slate-200 rounded-xl">
                <table className="w-full text-xs text-left">
                  <thead className="bg-slate-50 border-b border-slate-200 text-[10px] uppercase font-bold text-slate-500 tracking-wider sticky top-0">
                    <tr>
                      <th className="py-2.5 px-3">Vch No</th>
                      <th className="py-2.5 px-3">Date</th>
                      <th className="py-2.5 px-3">Particulars / Party</th>
                      <th className="py-2.5 px-3">Narration</th>
                      <th className="py-2.5 px-3 text-right">Debit (₹)</th>
                      <th className="py-2.5 px-3 text-right">Credit (₹)</th>
                      <th className="py-2.5 px-3 text-right">Balance (₹)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-slate-700">
                    {loadingStatement ? (
                      <tr>
                        <td colSpan="7" className="py-8 text-center text-slate-400">Loading statement...</td>
                      </tr>
                    ) : selectedLedgerStatement.statement?.length === 0 ? (
                      <tr>
                        <td colSpan="7" className="py-8 text-center text-slate-400">इस अवधि में कोई प्रविष्टि नहीं पाई गई।</td>
                      </tr>
                    ) : (
                      selectedLedgerStatement.statement?.map((s, idx) => (
                        <tr key={idx} className="hover:bg-slate-50 transition">
                          <td className="py-2.5 px-3 font-mono font-bold text-slate-800">{s.voucher_no}</td>
                          <td className="py-2.5 px-3 text-slate-500 whitespace-nowrap">{s.date}</td>
                          <td className="py-2.5 px-3 font-medium text-slate-800">{s.particulars}</td>
                          <td className="py-2.5 px-3 text-slate-500 truncate max-w-xs">{s.narration}</td>
                          <td className="py-2.5 px-3 text-right font-mono font-bold text-rose-700">
                            {s.debit > 0 ? `₹${s.debit.toLocaleString('en-IN')}` : '-'}
                          </td>
                          <td className="py-2.5 px-3 text-right font-mono font-bold text-emerald-700">
                            {s.credit > 0 ? `₹${s.credit.toLocaleString('en-IN')}` : '-'}
                          </td>
                          <td className="py-2.5 px-3 text-right font-mono font-bold text-slate-900">
                            ₹{s.balance.toLocaleString('en-IN')}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
