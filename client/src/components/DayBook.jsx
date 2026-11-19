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
  Briefcase
} from 'lucide-react';
import { apiRequest } from '../utils';

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

export default function DayBook({ onOpenJournalEntry }) {
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedLedgerFilter, setSelectedLedgerFilter] = useState('ALL');
  const [selectedBranch, setSelectedBranch] = useState('ALL');
  const [flowTypeFilter, setFlowTypeFilter] = useState('ALL'); // 'ALL' | 'INFLOW' | 'OUTFLOW'
  const [viewFormat, setViewFormat] = useState('format1'); // 'format1' | 'format2'

  // Input & Output Modal State
  const [showEntryModal, setShowEntryModal] = useState(false);
  const [modalMode, setModalMode] = useState('INFLOW'); // 'INFLOW' (Input) | 'OUTFLOW' (Output)
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState('');
  const [formSuccess, setFormSuccess] = useState('');

  // Account Ledger Statement Drilldown Modal State
  const [showStatementModal, setShowStatementModal] = useState(false);
  const [selectedLedgerStatement, setSelectedLedgerStatement] = useState(null);
  const [loadingStatement, setLoadingStatement] = useState(false);
  const [statementFilter, setStatementFilter] = useState('ALL'); // 'ALL' | 'DEBIT' | 'CREDIT'

  const [formData, setFormData] = useState({
    entry_type: 'INFLOW',
    entry_date: new Date().toISOString().split('T')[0],
    category: 'DAILY_COLLECTION',
    category_name: 'Daily RD & Deposit Collection',
    amount: '',
    payment_mode: 'CASH', // 'CASH' or 'BANK_ONLINE'
    party_name: '',
    reference_no: '',
    narration: ''
  });

  const fetchDayBook = async () => {
    setLoading(true);
    try {
      const res = await apiRequest(`/accounting/day-book?date=${date}&branch=${selectedBranch}`);
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
  }, [date, selectedBranch]);

  // Handle clicking on ANY ledger card in 3-column view to open full statement
  const handleOpenLedgerStatement = async (ledger) => {
    setLoadingStatement(true);
    setShowStatementModal(true);
    setStatementFilter('ALL');
    try {
      const res = await apiRequest(`/accounting/ledger-statement/${encodeURIComponent(ledger.code || ledger.name)}?date=${date}`);
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
      entry_date: date,
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

  // Switch between Input & Output inside modal
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

  // Submit Handler for Cash Entry (Input / Output)
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
        body: JSON.stringify({
          ...formData,
          entry_date: date
        })
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

  // Filter Vouchers by Search, Ledger and Flow Type (Input vs Output)
  const filteredVouchers = (data?.vouchers || []).filter(v => {
    const matchesSearch = !search || 
      v.voucher_no.toLowerCase().includes(search.toLowerCase()) ||
      v.account.toLowerCase().includes(search.toLowerCase()) ||
      v.narration.toLowerCase().includes(search.toLowerCase());
    
    const matchesLedger = selectedLedgerFilter === 'ALL' || v.ledger === selectedLedgerFilter;
    
    let matchesFlow = true;
    if (flowTypeFilter === 'INFLOW') {
      matchesFlow = v.type === 'RECEIPT' || v.entry_type === 'INFLOW' || v.voucher_no.startsWith('IN-');
    } else if (flowTypeFilter === 'OUTFLOW') {
      matchesFlow = v.type === 'EXPENSE' || v.type === 'PAYMENT' || v.entry_type === 'OUTFLOW' || v.voucher_no.startsWith('OUT-') || v.voucher_no.startsWith('EXP-');
    }

    return matchesSearch && matchesLedger && matchesFlow;
  });

  return (
    <div className="space-y-6">
      {/* 1. Header & Controls Matching Live Taranganjali CRM */}
      <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-200 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Day Book</h1>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200">
              Core Banking
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Complete Input (आवक) & Output (जावक) tracking. Click on any ledger below to view full Statement Passbook.
          </p>
        </div>

        {/* Filter Controls matching http://admin.taranganjali.com/accounting/day-book */}
        <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
          {/* Branch Selector Dropdown */}
          <select 
            value={selectedBranch} 
            onChange={(e) => setSelectedBranch(e.target.value)}
            className="px-3 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-xs font-semibold text-slate-700 focus:outline-none focus:ring-1 focus:ring-amber-500"
          >
            <option value="ALL">ALL (All Branches)</option>
            <option value="BHR001">BHR001 - MAIN BRANCH</option>
            <option value="BHR002">BHR002 - TARPL0002</option>
            <option value="BRH003">BRH003 - TARPL SAVING</option>
            <option value="SHEKHUPURA">TARPL0002 - SHEKHUPURA BRANCH</option>
          </select>

          {/* Date Picker */}
          <div className="flex items-center gap-1.5 bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-300 text-xs font-semibold text-slate-700">
            <input 
              type="date" 
              value={date} 
              onChange={(e) => setDate(e.target.value)}
              className="bg-transparent border-none text-xs font-bold text-slate-800 focus:outline-none cursor-pointer"
            />
          </div>

          {/* GET Button */}
          <button
            onClick={fetchDayBook}
            className="px-4 py-1.5 bg-[#16a34a] hover:bg-emerald-700 text-white font-bold rounded-lg text-xs shadow-xs transition cursor-pointer"
          >
            GET
          </button>

          {/* Format Dropdown */}
          <div className="flex items-center gap-1.5 ml-2">
            <span className="text-xs text-slate-500 font-medium">Format:</span>
            <select
              value={viewFormat}
              onChange={(e) => setViewFormat(e.target.value)}
              className="px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-bold text-slate-800 focus:outline-none cursor-pointer"
            >
              <option value="format1">Format 1 (3-Column Banking View)</option>
              <option value="format2">Format 2 (Detailed Table View)</option>
            </select>
          </div>

          {/* Action Buttons: Dual Input & Output Entry */}
          <div className="flex items-center gap-2 ml-auto">
            {/* 🟢 INPUT ENTRY BUTTON */}
            <button
              onClick={() => handleOpenModal('INFLOW')}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-xs transition cursor-pointer"
              title="Record Cash Inflow / Receipt (रुपया आया / आवक)"
            >
              <ArrowDownLeft className="w-4 h-4" />
              <span>+ Input (आवक / Receipt)</span>
            </button>

            {/* 🔴 OUTPUT ENTRY BUTTON */}
            <button
              onClick={() => handleOpenModal('OUTFLOW')}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs shadow-xs transition cursor-pointer"
              title="Record Cash Outflow / Payment / Expense (रुपया गया / जावक)"
            >
              <ArrowUpRight className="w-4 h-4" />
              <span>- Output (जावक / Payment)</span>
            </button>

            {/* JOURNAL ENTRY */}
            <button
              onClick={() => onOpenJournalEntry && onOpenJournalEntry()}
              className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-slate-900 hover:bg-black text-amber-400 font-bold text-xs shadow-xs transition"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>JV</span>
            </button>
          </div>
        </div>
      </div>

      {/* ======================================================== */}
      {/* 2. DUAL-FLOW INFLOW & OUTFLOW COMMAND COCKPIT              */}
      {/* ======================================================== */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* INPUT / INFLOW CARD (आवक / रुपया आया) */}
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
                <span className="text-[10px] text-emerald-600">Deposits, Collections, Loan Recovery & Cash In</span>
              </div>
            </div>
            <button
              onClick={() => handleOpenModal('INFLOW')}
              className="px-2 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[11px] transition cursor-pointer"
            >
              + Add Input
            </button>
          </div>

          <div className="mt-3 flex items-baseline justify-between">
            <div className="text-2xl font-black font-mono text-emerald-700 tracking-tight">
              +₹{(data?.summary?.inflows?.total || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
            </div>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
              Receipts
            </span>
          </div>

          <div className="mt-2 flex items-center justify-between text-xs text-slate-600 pt-2 border-t border-emerald-100 font-medium">
            <span>Cash Vault: <strong className="font-mono text-emerald-700">₹{(data?.summary?.inflows?.cash || 0).toLocaleString('en-IN')}</strong></span>
            <span>Bank/UPI: <strong className="font-mono text-emerald-700">₹{(data?.summary?.inflows?.bank || 0).toLocaleString('en-IN')}</strong></span>
          </div>
        </div>

        {/* OUTPUT / OUTFLOW CARD (जावक / रुपया गया) */}
        <div className="bg-gradient-to-br from-rose-50 via-white to-rose-50/20 border border-rose-300 rounded-2xl p-4 shadow-sm relative overflow-hidden">
          <div className="flex items-center justify-between pb-2 border-b border-rose-200">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-rose-600 flex items-center justify-center text-white shadow-xs">
                <ArrowUpRight className="w-4 h-4" />
              </div>
              <div>
                <span className="text-[11px] font-bold text-rose-800 uppercase tracking-wider block">
                  Total Output / Outflow (कुल जावक)
                </span>
                <span className="text-[10px] text-rose-600">Expenses, Withdrawals, Loans & Payouts</span>
              </div>
            </div>
            <button
              onClick={() => handleOpenModal('OUTFLOW')}
              className="px-2 py-1 rounded-lg bg-rose-600 hover:bg-rose-700 text-white font-bold text-[11px] transition cursor-pointer"
            >
              - Add Output
            </button>
          </div>

          <div className="mt-3 flex items-baseline justify-between">
            <div className="text-2xl font-black font-mono text-rose-700 tracking-tight">
              -₹{(data?.summary?.outflows?.total || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
            </div>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-rose-100 text-rose-800">
              Payments
            </span>
          </div>

          <div className="mt-2 flex items-center justify-between text-xs text-slate-600 pt-2 border-t border-rose-100 font-medium">
            <span>Cash Vault: <strong className="font-mono text-rose-700">₹{(data?.summary?.outflows?.cash || 0).toLocaleString('en-IN')}</strong></span>
            <span>Bank/UPI: <strong className="font-mono text-rose-700">₹{(data?.summary?.outflows?.bank || 0).toLocaleString('en-IN')}</strong></span>
          </div>
        </div>

        {/* NET DAY FLOW & QUICK STATS (शुद्ध दैनिक प्रवाह) */}
        <div className="bg-gradient-to-br from-indigo-50 via-white to-indigo-50/20 border border-indigo-200 rounded-2xl p-4 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-2 border-b border-indigo-100">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-indigo-600 flex items-center justify-center text-white shadow-xs">
                  <Scale className="w-4 h-4" />
                </div>
                <div>
                  <span className="text-[11px] font-bold text-indigo-900 uppercase tracking-wider block">
                    Net Cash Movement (शुद्ध दैनिक प्रवाह)
                  </span>
                  <span className="text-[10px] text-indigo-600">Input (आवक) minus Output (जावक)</span>
                </div>
              </div>
            </div>

            <div className="mt-3">
              {(() => {
                const net = (data?.summary?.net_cashflow || 0);
                return (
                  <div className={`text-2xl font-black font-mono tracking-tight ${net >= 0 ? 'text-emerald-700' : 'text-rose-700'}`}>
                    {net >= 0 ? '+' : ''}₹{net.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </div>
                );
              })()}
              <p className="text-[11px] text-slate-500 mt-0.5">
                Current Vault Cash: <strong className="font-mono text-slate-800">₹{(data?.ledgers?.find(l => l.code === 'LED-003')?.closing_balance || 0).toLocaleString('en-IN')}</strong>
              </p>
            </div>
          </div>

          {/* Quick Action Chips */}
          <div className="pt-2 border-t border-indigo-100 flex flex-wrap items-center gap-1.5 text-xs">
            <span className="text-[10px] font-bold text-slate-400">Quick:</span>
            <button
              onClick={() => handleOpenModal('INFLOW', INPUT_CATEGORIES[1])}
              className="px-2 py-0.5 bg-purple-100 hover:bg-purple-200 text-purple-900 rounded font-bold text-[10px] transition cursor-pointer flex items-center gap-1"
              title="Record Borrowed Money / Udhar Inflow (उधार लिया)"
            >
              <HandCoins className="w-3 h-3" />
              <span>+ उधार लिया</span>
            </button>
            <button
              onClick={() => handleOpenModal('OUTFLOW', OUTPUT_CATEGORIES[1])}
              className="px-2 py-0.5 bg-rose-100 hover:bg-rose-200 text-rose-900 rounded font-bold text-[10px] transition cursor-pointer flex items-center gap-1"
              title="Record Udhar Repayment (उधार लौटाया)"
            >
              <HandCoins className="w-3 h-3" />
              <span>- उधार लौटाया</span>
            </button>
            <button
              onClick={() => handleOpenModal('INFLOW', INPUT_CATEGORIES[0])}
              className="px-2 py-0.5 bg-amber-100 hover:bg-amber-200 text-amber-900 rounded font-bold text-[10px] transition cursor-pointer flex items-center gap-1"
              title="Record Gold Loan EMI / Recovery"
            >
              <Gem className="w-3 h-3" />
              <span>+ गोल्ड लोन किश्त</span>
            </button>
            <button
              onClick={() => handleOpenModal('OUTFLOW', OUTPUT_CATEGORIES[0])}
              className="px-2 py-0.5 bg-amber-100 hover:bg-amber-200 text-amber-900 rounded font-bold text-[10px] transition cursor-pointer flex items-center gap-1"
              title="Record Gold Loan Cash Disbursal"
            >
              <Gem className="w-3 h-3" />
              <span>- गोल्ड लोन दिया</span>
            </button>
            <button
              onClick={() => handleOpenModal('OUTFLOW', OUTPUT_CATEGORIES[3])}
              className="px-2 py-0.5 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded font-bold text-[10px] transition cursor-pointer flex items-center gap-1"
            >
              <Coffee className="w-3 h-3" />
              <span>- चाय/नाश्ता</span>
            </button>
          </div>
        </div>
      </div>

      {/* ======================================================== */}
      {/* 3. FORMAT 1: 3-COLUMN BANKING LAYOUT (EXACT PARITY)       */}
      {/* ======================================================== */}
      {viewFormat === 'format1' && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
            
            {/* COLUMN 1: OPENING */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden border-t-4 border-t-amber-500">
              <div className="py-3 px-4 bg-slate-50 border-b border-slate-200 text-center font-bold text-xs text-slate-700 tracking-wider">
                OPENING ({date.split('-').reverse().join('/')})
              </div>
              <div className="divide-y divide-slate-100">
                {(data?.ledgers || []).map((ledger) => (
                  <div 
                    key={ledger.id} 
                    onClick={() => handleOpenLedgerStatement(ledger)}
                    className="p-4 text-center hover:bg-amber-50/60 cursor-pointer transition group border-b border-slate-100 last:border-b-0"
                    title={`Click to open Passbook Statement for ${ledger.name}`}
                  >
                    <div className="text-lg font-bold font-mono text-slate-900 tracking-tight group-hover:text-amber-700 transition">
                      {ledger.opening_balance.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </div>
                    <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mt-0.5 group-hover:text-slate-800 transition flex items-center justify-center gap-1">
                      <span>{ledger.name}</span>
                      <Search className="w-2.5 h-2.5 opacity-0 group-hover:opacity-100 text-amber-600 transition" />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* COLUMN 2: CURRENT / CLOSING */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden border-t-4 border-t-rose-500">
              <div className="py-3 px-4 bg-slate-50 border-b border-slate-200 text-center font-bold text-xs text-slate-700 tracking-wider">
                CURRENT/ CLOSING ({date.split('-').reverse().join('/')})
              </div>
              <div className="divide-y divide-slate-100">
                {(data?.ledgers || []).map((ledger) => (
                  <div 
                    key={ledger.id} 
                    onClick={() => handleOpenLedgerStatement(ledger)}
                    className="p-4 text-center hover:bg-rose-50/60 cursor-pointer transition group border-b border-slate-100 last:border-b-0"
                    title={`Click to open Passbook Statement for ${ledger.name}`}
                  >
                    <div className="text-lg font-bold font-mono text-slate-900 tracking-tight group-hover:text-rose-700 transition">
                      {ledger.closing_balance.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </div>
                    <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mt-0.5 group-hover:text-slate-800 transition flex items-center justify-center gap-1">
                      <span>{ledger.name}</span>
                      <Search className="w-2.5 h-2.5 opacity-0 group-hover:opacity-100 text-rose-600 transition" />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* COLUMN 3: DAY TRANSACTIONS */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden border-t-4 border-t-emerald-500">
              <div className="py-3 px-4 bg-slate-50 border-b border-slate-200 text-center font-bold text-xs text-slate-700 tracking-wider">
                DAY TRANSACTIONS
              </div>
              <div className="divide-y divide-slate-100">
                {(data?.ledgers || []).map((ledger) => {
                  const netDay = (ledger.receipts || 0) - (ledger.payments || 0);
                  return (
                    <div 
                      key={ledger.id} 
                      onClick={() => handleOpenLedgerStatement(ledger)}
                      className="p-4 text-center hover:bg-emerald-50/60 cursor-pointer transition group border-b border-slate-100 last:border-b-0"
                      title={`Click to open Passbook Statement for ${ledger.name}`}
                    >
                      <div className={`text-lg font-bold font-mono tracking-tight ${netDay > 0 ? 'text-emerald-600' : netDay < 0 ? 'text-rose-600' : 'text-slate-800'}`}>
                        {netDay > 0 ? '+' : ''}{netDay.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </div>
                      <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mt-0.5 group-hover:text-slate-800 transition flex items-center justify-center gap-1">
                        <span>{ledger.name}</span>
                        <Search className="w-2.5 h-2.5 opacity-0 group-hover:opacity-100 text-emerald-600 transition" />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

          </div>

          {/* Blue PRINT Button Matching live Hubco Day Book bottom */}
          <div className="flex items-center justify-center pt-3 pb-2">
            <button
              onClick={() => window.print()}
              className="inline-flex items-center gap-2 px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs uppercase tracking-wider rounded-xl shadow-md transition cursor-pointer"
            >
              <Printer className="w-4 h-4" />
              <span>PRINT DAY BOOK</span>
            </button>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* 4. FORMAT 2: DETAILED 8-COLUMN TABLE                      */}
      {/* ======================================================== */}
      {viewFormat === 'format2' && (
        <div className="space-y-6">
          {/* Summary KPI Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Total Opening</span>
              <div className="text-lg md:text-xl font-black text-slate-800 mt-1">
                ₹{(data?.summary?.total_opening || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
              </div>
              <span className="text-[10px] text-slate-400">11 Banking Ledgers</span>
            </div>

            <div className="bg-white p-4 rounded-xl border border-emerald-200/80 shadow-sm bg-gradient-to-br from-white to-emerald-50/40">
              <span className="text-[11px] font-bold text-emerald-700 uppercase tracking-wider flex items-center gap-1">
                <ArrowDownLeft className="w-3.5 h-3.5" /> Total Receipts (Input)
              </span>
              <div className="text-lg md:text-xl font-black text-emerald-800 mt-1">
                +₹{(data?.summary?.total_receipts || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
              </div>
              <span className="text-[10px] text-emerald-600">Collections & Inflows</span>
            </div>

            <div className="bg-white p-4 rounded-xl border border-rose-200/80 shadow-sm bg-gradient-to-br from-white to-rose-50/40">
              <span className="text-[11px] font-bold text-rose-700 uppercase tracking-wider flex items-center gap-1">
                <ArrowUpRight className="w-3.5 h-3.5" /> Total Payments (Output)
              </span>
              <div className="text-lg md:text-xl font-black text-rose-800 mt-1">
                -₹{(data?.summary?.total_payments || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
              </div>
              <span className="text-[10px] text-rose-600">Expenses & Outflows</span>
            </div>

            <div className="bg-white p-4 rounded-xl border border-indigo-200/80 shadow-sm bg-gradient-to-br from-white to-indigo-50/40">
              <span className="text-[11px] font-bold text-indigo-700 uppercase tracking-wider">Net Closing Balance</span>
              <div className="text-lg md:text-xl font-black text-indigo-900 mt-1">
                ₹{(data?.summary?.total_closing || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
              </div>
              <span className="text-[10px] text-indigo-600 font-semibold">Vault + Bank + Reserves</span>
            </div>
          </div>

          {/* 11 Core Banking Ledgers Table */}
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
              <div>
                <h2 className="text-sm font-bold text-slate-900">Banking Balance Ledgers</h2>
                <p className="text-xs text-slate-500">Live reconciliation breakdown for {date}</p>
              </div>
              <button
                onClick={() => window.print()}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-50 cursor-pointer"
              >
                <Printer className="w-3.5 h-3.5 text-slate-500" />
                <span>Print Sheet</span>
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="bg-slate-50 border-b border-slate-200 text-[10px] uppercase font-bold text-slate-500 tracking-wider">
                  <tr>
                    <th className="py-3 px-4">Code</th>
                    <th className="py-3 px-4">Ledger Name</th>
                    <th className="py-3 px-4">Classification</th>
                    <th className="py-3 px-4 text-right">Opening Balance</th>
                    <th className="py-3 px-4 text-right text-emerald-700">Receipts (Input Dr)</th>
                    <th className="py-3 px-4 text-right text-rose-700">Payments (Output Cr)</th>
                    <th className="py-3 px-4 text-right">Closing Balance</th>
                    <th className="py-3 px-4 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700 font-medium">
                  {(data?.ledgers || []).map((ledger) => (
                    <tr key={ledger.id} className="hover:bg-slate-50/80 transition">
                      <td className="py-3 px-4 font-mono font-bold text-slate-500">{ledger.code}</td>
                      <td className="py-3 px-4 font-bold text-slate-900 flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                        {ledger.name}
                      </td>
                      <td className="py-3 px-4 text-slate-500">{ledger.type}</td>
                      <td className="py-3 px-4 text-right font-mono">
                        ₹{ledger.opening_balance.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </td>
                      <td className="py-3 px-4 text-right font-mono font-bold text-emerald-600">
                        +₹{ledger.receipts.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </td>
                      <td className="py-3 px-4 text-right font-mono font-bold text-rose-600">
                        -₹{ledger.payments.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </td>
                      <td className="py-3 px-4 text-right font-mono font-black text-slate-900">
                        ₹{ledger.closing_balance.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </td>
                      <td className="py-3 px-4 text-right">
                        <button
                          onClick={() => handleOpenLedgerStatement(ledger)}
                          className="px-2.5 py-1 bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-300 rounded-lg text-[11px] font-bold transition cursor-pointer"
                        >
                          View Ledger
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* 5. VOUCHERS LIST WITH INPUT / OUTPUT FILTER TABS          */}
      {/* ======================================================== */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex flex-col md:flex-row items-start md:items-center justify-between gap-3">
          <div>
            <h2 className="text-sm font-bold text-slate-900">Day Book Transaction Vouchers (आवक व जावक प्रविष्टियां)</h2>
            <p className="text-xs text-slate-500">Double-entry vouchers for {date} across all ledgers</p>
          </div>

          <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
            {/* Input vs Output Flow Filter Tabs */}
            <div className="flex items-center bg-slate-100 p-1 rounded-xl">
              <button
                onClick={() => setFlowTypeFilter('ALL')}
                className={`px-3 py-1 rounded-lg text-xs font-bold transition cursor-pointer ${
                  flowTypeFilter === 'ALL' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-500 hover:text-slate-900'
                }`}
              >
                All Entries ({data?.vouchers?.length || 0})
              </button>
              <button
                onClick={() => setFlowTypeFilter('INFLOW')}
                className={`px-3 py-1 rounded-lg text-xs font-bold transition cursor-pointer flex items-center gap-1 ${
                  flowTypeFilter === 'INFLOW' ? 'bg-emerald-600 text-white shadow-2xs' : 'text-slate-500 hover:text-emerald-700'
                }`}
              >
                <ArrowDownLeft className="w-3.5 h-3.5" />
                <span>Input (आवक)</span>
              </button>
              <button
                onClick={() => setFlowTypeFilter('OUTFLOW')}
                className={`px-3 py-1 rounded-lg text-xs font-bold transition cursor-pointer flex items-center gap-1 ${
                  flowTypeFilter === 'OUTFLOW' ? 'bg-rose-600 text-white shadow-2xs' : 'text-slate-500 hover:text-rose-700'
                }`}
              >
                <ArrowUpRight className="w-3.5 h-3.5" />
                <span>Output (जावक)</span>
              </button>
            </div>

            {/* Search Box */}
            <div className="relative flex-1 sm:w-48">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search party, voucher..."
                className="w-full text-xs pl-8 pr-3 py-1.5 rounded-lg border border-slate-200 focus:outline-none focus:border-amber-500"
              />
            </div>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead className="bg-slate-50 border-b border-slate-200 text-[10px] uppercase font-bold text-slate-500 tracking-wider">
              <tr>
                <th className="py-2.5 px-4">Voucher No</th>
                <th className="py-2.5 px-4">Time</th>
                <th className="py-2.5 px-4">Flow Type</th>
                <th className="py-2.5 px-4">Ledger</th>
                <th className="py-2.5 px-4">Account / Head / Party</th>
                <th className="py-2.5 px-4">Narration / Ref No</th>
                <th className="py-2.5 px-4 text-right">Amount (₹)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {filteredVouchers.map((v) => {
                const isInflow = v.type === 'RECEIPT' || v.entry_type === 'INFLOW' || v.voucher_no.startsWith('IN-');
                const isExpense = v.type === 'EXPENSE' || v.voucher_no.startsWith('EXP-') || v.voucher_no.startsWith('OUT-');
                
                return (
                  <tr key={v.id} className={`hover:bg-slate-50 transition ${isInflow ? 'bg-emerald-50/10' : 'bg-rose-50/10'}`}>
                    <td className="py-3 px-4 font-mono font-bold text-slate-900 flex items-center gap-1.5">
                      {isInflow ? (
                        <ArrowDownLeft className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                      ) : (
                        <ArrowUpRight className="w-3.5 h-3.5 text-rose-600 shrink-0" />
                      )}
                      <span className={isInflow ? 'text-emerald-800' : 'text-amber-800'}>{v.voucher_no}</span>
                    </td>
                    <td className="py-3 px-4 text-slate-500 whitespace-nowrap">{v.time}</td>
                    
                    {/* Flow Type Badge */}
                    <td className="py-3 px-4">
                      {isInflow ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
                          <ArrowDownLeft className="w-3 h-3" />
                          INPUT (आवक)
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-800 border border-rose-300">
                          <ArrowUpRight className="w-3 h-3" />
                          OUTPUT (जावक)
                        </span>
                      )}
                    </td>

                    <td className="py-3 px-4 font-semibold text-slate-900">{v.ledger}</td>
                    
                    <td className="py-3 px-4 font-medium text-slate-800">
                      <div>{v.account}</div>
                      {v.party_name && <div className="text-[10px] text-slate-400">Party: {v.party_name}</div>}
                    </td>

                    <td className="py-3 px-4 text-slate-500 max-w-xs truncate">
                      {(v.bill_number || v.reference_no) && (
                        <span className="font-mono text-slate-500 font-semibold mr-1 bg-slate-100 px-1.5 py-0.5 rounded">
                          [{v.bill_number || v.reference_no}]
                        </span>
                      )}
                      {v.narration}
                    </td>

                    <td className={`py-3 px-4 text-right font-mono font-bold text-sm ${
                      isInflow ? 'text-emerald-700' : 'text-rose-700'
                    }`}>
                      {isInflow ? '+' : '-'}₹{v.amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* ======================================================== */}
      {/* 6. DUAL-PURPOSE MODAL: RECORD INPUT (आवक) & OUTPUT (जावक)  */}
      {/* ======================================================== */}
      {showEntryModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-lg overflow-hidden my-8 animate-in fade-in zoom-in-95 duration-200">
            {/* Modal Header with Dynamic Theme */}
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
                    {modalMode === 'INFLOW' ? 'Record Input (रुपया आया / आवक)' : 'Record Output (रुपया गया / जावक)'}
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
                className="w-8 h-8 rounded-lg bg-black/10 hover:bg-black/20 flex items-center justify-center transition cursor-pointer"
              >
                <X className="w-4 h-4 text-white" />
              </button>
            </div>

            {/* Entry Mode Switcher Tabs inside Modal */}
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
                <span>🟢 Input / Inflow (आवक - आया)</span>
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
                <span>🔴 Output / Outflow (जावक - गया)</span>
              </button>
            </div>

            {/* Modal Body / Form */}
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

              {/* Category / Head Selection */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                  {modalMode === 'INFLOW' ? 'Input Head / Source (आवक का प्रकार) *' : 'Output Head / Category (जावक का प्रकार) *'}
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

              {/* Amount & Quick Presets */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                    Amount (रुपये) *
                  </label>
                  <span className="text-[11px] text-slate-400 font-medium">Quick Amount Presets</span>
                </div>

                {/* Quick Presets tailored for Inflow vs Outflow */}
                <div className="flex items-center gap-1.5 mb-2 overflow-x-auto pb-1">
                  {(modalMode === 'INFLOW' 
                    ? [500, 1000, 2000, 5000, 10000, 25000, 50000, 100000]
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
                    className={`w-full pl-8 pr-3 py-2 border rounded-xl text-base font-mono font-bold text-slate-900 focus:outline-none focus:ring-2 ${
                      modalMode === 'INFLOW' ? 'focus:ring-emerald-500 border-slate-300' : 'focus:ring-rose-500 border-slate-300'
                    }`}
                    required
                  />
                </div>
              </div>

              {/* Payment Mode (Cash vs Bank) & Date */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    {modalMode === 'INFLOW' ? 'Deposit Into (खाता) *' : 'Paid From (खाता) *'}
                  </label>
                  <select
                    value={formData.payment_mode}
                    onChange={(e) => setFormData(prev => ({ ...prev, payment_mode: e.target.value }))}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs font-bold text-slate-800 bg-white focus:outline-none focus:ring-2 focus:ring-amber-500"
                  >
                    <option value="CASH">CASH BOOK (गल्ला / Cash Vault)</option>
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
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs font-bold text-slate-800 bg-white focus:outline-none focus:ring-2 focus:ring-amber-500"
                    required
                  />
                </div>
              </div>

              {/* Party Name & Reference No */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    {modalMode === 'INFLOW' ? 'Received From (जमाकर्ता / सदस्य) *' : 'Paid To (पानेवाला / वेंडर) *'}
                  </label>
                  <input
                    type="text"
                    placeholder={modalMode === 'INFLOW' ? 'e.g. Sunil Kumar / Customer' : 'e.g. Raju Chai Stall / Staff'}
                    value={formData.party_name}
                    onChange={(e) => setFormData(prev => ({ ...prev, party_name: e.target.value }))}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-500"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Receipt / Slip / Ref No
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. REC-104 / BILL-92"
                    value={formData.reference_no}
                    onChange={(e) => setFormData(prev => ({ ...prev, reference_no: e.target.value }))}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-500"
                  />
                </div>
              </div>

              {/* Narration */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Narration / Purpose (विवरण / कारण) *
                </label>
                <textarea
                  rows="2"
                  placeholder={modalMode === 'INFLOW' 
                    ? 'e.g. Daily market collection received from sector 4 advisor' 
                    : 'e.g. Office tea, snacks & refreshments for staff'}
                  value={formData.narration}
                  onChange={(e) => setFormData(prev => ({ ...prev, narration: e.target.value }))}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-500 resize-none"
                  required
                />
              </div>

              {/* Modal Footer Actions */}
              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setShowEntryModal(false)}
                  className="px-4 py-2 border border-slate-300 rounded-xl text-xs font-bold text-slate-700 hover:bg-slate-50 transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className={`inline-flex items-center gap-1.5 px-5 py-2 text-white rounded-xl text-xs font-bold shadow-xs transition cursor-pointer disabled:opacity-50 ${
                    modalMode === 'INFLOW' ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-rose-600 hover:bg-rose-700'
                  }`}
                >
                  {submitting ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      <span>Saving...</span>
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>{modalMode === 'INFLOW' ? 'Save Input Entry (आवक दर्ज करें)' : 'Save Output Entry (जावक दर्ज करें)'}</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* 7. ACCOUNT LEDGER STATEMENT DRILLDOWN MODAL (ON CLICK)    */}
      {/* ======================================================== */}
      {showStatementModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-4xl overflow-hidden my-8 animate-in fade-in zoom-in-95 duration-200">
            {/* Header matching live Hubco account ledger */}
            <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-amber-500 flex items-center justify-center text-slate-950 font-bold">
                  <BookOpen className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-base font-bold text-white">
                      Account Ledger — {selectedLedgerStatement?.ledger?.name || 'Loading...'}
                    </h3>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                      Live Ledger Passbook
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-400">
                    {selectedLedgerStatement?.ledger?.type} • Branch: {selectedLedgerStatement?.ledger?.branch || 'MAIN BRANCH'}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => window.print()}
                  className="px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>Print Ledger</span>
                </button>
                <button
                  onClick={() => setShowStatementModal(false)}
                  className="w-8 h-8 rounded-lg bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* KPI Cards inside Statement Modal */}
            <div className="p-6 bg-slate-50 border-b border-slate-200 grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-white p-3.5 rounded-xl border border-slate-200">
                <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider block">Opening Balance</span>
                <div className="text-base font-black font-mono text-slate-900 mt-1">
                  ₹{(selectedLedgerStatement?.ledger?.opening_balance || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                </div>
              </div>

              <div className="bg-white p-3.5 rounded-xl border border-emerald-200 bg-emerald-50/20">
                <span className="text-[10px] uppercase font-bold text-emerald-700 tracking-wider block">Total Credits (+)</span>
                <div className="text-base font-black font-mono text-emerald-700 mt-1">
                  +₹{(selectedLedgerStatement?.ledger?.total_credit || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                </div>
              </div>

              <div className="bg-white p-3.5 rounded-xl border border-rose-200 bg-rose-50/20">
                <span className="text-[10px] uppercase font-bold text-rose-700 tracking-wider block">Total Debits (-)</span>
                <div className="text-base font-black font-mono text-rose-700 mt-1">
                  -₹{(selectedLedgerStatement?.ledger?.total_debit || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                </div>
              </div>

              <div className="bg-white p-3.5 rounded-xl border border-indigo-200 bg-indigo-50/20">
                <span className="text-[10px] uppercase font-bold text-indigo-700 tracking-wider block">Current Balance</span>
                <div className="text-base font-black font-mono text-indigo-900 mt-1">
                  ₹{(selectedLedgerStatement?.ledger?.closing_balance || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                </div>
              </div>
            </div>

            {/* Filter Tabs for Statement */}
            <div className="px-6 py-3 border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <span className="text-xs font-semibold text-slate-500 mr-1">Filter:</span>
                {['ALL', 'CREDIT', 'DEBIT'].map(mode => (
                  <button
                    key={mode}
                    onClick={() => setStatementFilter(mode)}
                    className={`px-3 py-1 rounded-lg text-xs font-bold transition cursor-pointer ${
                      statementFilter === mode 
                        ? 'bg-slate-900 text-white' 
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    {mode === 'ALL' ? 'All Transactions' : mode === 'CREDIT' ? 'Credits (आवक)' : 'Debits (जावक)'}
                  </button>
                ))}
              </div>
              <span className="text-xs text-slate-500 font-mono">
                {(selectedLedgerStatement?.statement || []).length} Records
              </span>
            </div>

            {/* 8-Column Statement Table matching live CRM */}
            <div className="max-h-96 overflow-y-auto">
              <table className="w-full text-xs text-left">
                <thead className="bg-slate-100/80 sticky top-0 border-b border-slate-200 text-[10px] uppercase font-bold text-slate-600 tracking-wider">
                  <tr>
                    <th className="py-2.5 px-4">Date</th>
                    <th className="py-2.5 px-4">Voucher No</th>
                    <th className="py-2.5 px-4">Description / Party</th>
                    <th className="py-2.5 px-4">Is System</th>
                    <th className="py-2.5 px-4 text-right text-rose-700">Debit (-)</th>
                    <th className="py-2.5 px-4 text-right text-emerald-700">Credit (+)</th>
                    <th className="py-2.5 px-4 text-right">Running Balance</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {loadingStatement ? (
                    <tr>
                      <td colSpan={7} className="py-8 text-center text-slate-400">
                        <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2 text-amber-500" />
                        Loading account ledger statement...
                      </td>
                    </tr>
                  ) : (selectedLedgerStatement?.statement || [])
                    .filter(item => {
                      if (statementFilter === 'CREDIT') return item.credit > 0;
                      if (statementFilter === 'DEBIT') return item.debit > 0;
                      return true;
                    })
                    .map((row, idx) => (
                      <tr key={idx} className="hover:bg-slate-50 transition">
                        <td className="py-2.5 px-4 whitespace-nowrap text-slate-600 font-mono">{row.date}</td>
                        <td className="py-2.5 px-4 font-mono font-bold text-amber-700">{row.voucher_no}</td>
                        <td className="py-2.5 px-4 font-medium text-slate-800">
                          <div>{row.description}</div>
                          {row.narration && <div className="text-[10px] text-slate-400 font-normal">{row.narration}</div>}
                        </td>
                        <td className="py-2.5 px-4">
                          <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-600">
                            {row.is_system || 'YES'}
                          </span>
                        </td>
                        <td className="py-2.5 px-4 text-right font-mono font-bold text-rose-600">
                          {row.debit > 0 ? `-₹${row.debit.toLocaleString('en-IN', { minimumFractionDigits: 2 })}` : '—'}
                        </td>
                        <td className="py-2.5 px-4 text-right font-mono font-bold text-emerald-600">
                          {row.credit > 0 ? `+₹${row.credit.toLocaleString('en-IN', { minimumFractionDigits: 2 })}` : '—'}
                        </td>
                        <td className="py-2.5 px-4 text-right font-mono font-black text-slate-900">
                          ₹{row.running_balance.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>

            {/* Footer */}
            <div className="px-6 py-3 bg-slate-50 border-t border-slate-200 flex items-center justify-between text-xs text-slate-500">
              <span>Official Double-Entry Core Banking Statement</span>
              <button
                onClick={() => setShowStatementModal(false)}
                className="px-4 py-1.5 bg-slate-900 text-white rounded-lg font-bold hover:bg-black transition cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
