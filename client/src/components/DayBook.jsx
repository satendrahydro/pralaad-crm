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
  ArrowRight,
  Eye,
  Pencil,
  ChevronDown,
  Trash2
} from 'lucide-react';
import { apiRequest, formatINR, formatDate } from '../utils';
import TarplLogo from './TarplLogo';
import TransactionBackgroundModal from './TransactionBackgroundModal';

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
  // Default to Prahlad 1:1 3-Column Day Book ('BANKING'), with switchers for 'DAILY_USE' and 'LEDGERS'
  const [dayBookOption, setDayBookOption] = useState('BANKING');

  // Single Date default matching Prahlad CRM (DD/MM/YYYY), expandable to Custom Multi-Day Range
  const todayStr = new Date().toISOString().split('T')[0];
  const [startDate, setStartDate] = useState(todayStr);
  const [endDate, setEndDate] = useState(todayStr);
  const [datePreset, setDatePreset] = useState('TODAY'); // 'TODAY' | 'YESTERDAY' | 'WEEK' | 'MONTH' | 'CUSTOM'
  const [showCustomRange, setShowCustomRange] = useState(false);

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  
  // Universal Search & Filters
  const [search, setSearch] = useState('');
  const [selectedBranch, setSelectedBranch] = useState('ALL');
  const [viewFormat, setViewFormat] = useState('format1'); // 'format1' | 'format2'
  const [selectedLedgerFilter, setSelectedLedgerFilter] = useState('ALL');
  const [flowTypeFilter, setFlowTypeFilter] = useState('ALL');
  const [bankingProductFilter, setBankingProductFilter] = useState('ALL');

  // Print Preview Modal (1:1 with Prahlad ?print=yes for Format 1 & Format 2)
  const [showPrintPreview, setShowPrintPreview] = useState(false);

  // Input & Output Modal State (Daily Use)
  const [showEntryModal, setShowEntryModal] = useState(false);
  const [modalMode, setModalMode] = useState('INFLOW');
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState('');
  const [formSuccess, setFormSuccess] = useState('');

  // Prahlad 1:1 Ledger Statement Drilldown Modal State
  const [showStatementModal, setShowStatementModal] = useState(false);
  const [selectedLedgerStatement, setSelectedLedgerStatement] = useState(null);
  const [loadingStatement, setLoadingStatement] = useState(false);
  const [stmtLedgerRef, setStmtLedgerRef] = useState(null);
  const [stmtBranch, setStmtBranch] = useState('ALL');
  const [stmtFromDate, setStmtFromDate] = useState('2026-11-01');
  const [stmtToDate, setStmtToDate] = useState(todayStr);
  const [stmtManualOnly, setStmtManualOnly] = useState(false);
  const [stmtSearch, setStmtSearch] = useState('');
  const [stmtMinAmt, setStmtMinAmt] = useState('');
  const [stmtMaxAmt, setStmtMaxAmt] = useState('');
  const [stmtTxType, setStmtTxType] = useState('ALL');
  const [stmtPage, setStmtPage] = useState(1);
  const [selectedTxDetail, setSelectedTxDetail] = useState(null);
  const [loadingTxDetail, setLoadingTxDetail] = useState(false);

  // Ledger Accounts Index & Edit Modal State (Matches /accounting/accounts & /edit)
  const [ledgersList, setLedgersList] = useState([]);
  const [ledgersTab, setLedgersTab] = useState('ALL'); // 'ALL' | 'Asset' | 'Liability' | 'Equity' | 'Expense' | 'Revenue'
  const [ledgersSearch, setLedgersSearch] = useState('');
  const [editingLedger, setEditingLedger] = useState(null);
  const [savingLedgerEdit, setSavingLedgerEdit] = useState(false);

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

  // Helper: Double-entry Debit/Credit presentation for Format 1 table & Print
  const getLedgerFormat1Columns = (ledger) => {
    const isAssetType = ['Asset', 'Expense'].some(t => (ledger.type || '').includes(t)) ||
      ['TARPL MAIN', 'CASH BOOK', 'BANK BOOK', 'GOLD LOAN BOOK'].includes(ledger.name) ||
      ledger.code === 'LED-002';
    const debit = isAssetType ? (ledger.receipts || 0) : (ledger.payments || 0);
    const credit = isAssetType ? (ledger.payments || 0) : (ledger.receipts || 0);
    return {
      displayType: isAssetType ? 'Asset' : 'Liability',
      displayName: ledger.name === 'NEW FD RD MIS' ? 'NEW FD / MIS/ RD' : ledger.name,
      debit,
      credit
    };
  };

  // Format numeric currency matching Prahlad 1:1 (negatives in parentheses)
  const formatAccountingNum = (num) => {
    const val = Number(num || 0);
    const abs = Math.abs(val).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    return val < 0 ? `(${abs})` : abs;
  };

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
        setLedgersList(res.allLedgers || res.ledgers || []);
      }
    } catch (err) {
      console.error('Failed to load Day Book:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchLedgersIndex = async () => {
    try {
      const res = await apiRequest(`/accounting/ledgers?branch=${selectedBranch}`);
      if (res && res.success) {
        setLedgersList(res.ledgers || []);
      }
    } catch (err) {
      console.error('Failed to load Ledgers:', err);
    }
  };

  useEffect(() => {
    fetchDayBook();
  }, [startDate, endDate, selectedBranch]);

  useEffect(() => {
    if (dayBookOption === 'LEDGERS') {
      fetchLedgersIndex();
    }
  }, [dayBookOption, selectedBranch]);

  const handleDeleteCashEntry = async (voucher) => {
    if (!voucher || !voucher.id) return;
    if (!window.confirm(`क्या आप वाउचर "${voucher.voucher_no}" (₹${voucher.amount}) को हटाना चाहते हैं?`)) return;
    try {
      const targetId = voucher.id || voucher.voucher_no;
      const res = await apiRequest(`/accounting/cash-entry/${encodeURIComponent(targetId)}`, { method: 'DELETE' });
      if (res && res.success) {
        fetchDayBook();
      } else {
        alert(res?.message || 'वाउचर हटाने में समस्या आई।');
      }
    } catch (err) {
      alert(err.message || 'वाउचर हटाने में त्रुटि।');
    }
  };

  // Fetch Statement Drilldown with active Prahlad filters
  const loadLedgerStatement = async (ledger, overrides = {}) => {
    const targetLedger = ledger || stmtLedgerRef;
    if (!targetLedger) return;
    setLoadingStatement(true);
    const branchVal = overrides.branch !== undefined ? overrides.branch : stmtBranch;
    const fromVal = overrides.fromDate !== undefined ? overrides.fromDate : stmtFromDate;
    const toVal = overrides.toDate !== undefined ? overrides.toDate : stmtToDate;
    const manualVal = overrides.manualOnly !== undefined ? overrides.manualOnly : stmtManualOnly;
    const searchVal = overrides.search !== undefined ? overrides.search : stmtSearch;
    const minVal = overrides.minAmt !== undefined ? overrides.minAmt : stmtMinAmt;
    const maxVal = overrides.maxAmt !== undefined ? overrides.maxAmt : stmtMaxAmt;
    const typeVal = overrides.txType !== undefined ? overrides.txType : stmtTxType;
    const pageVal = overrides.page !== undefined ? overrides.page : stmtPage;

    try {
      const params = new URLSearchParams({
        branch: branchVal,
        startDate: fromVal,
        endDate: toVal,
        manualOnly: manualVal ? '1' : '0',
        search: searchVal || '',
        minAmount: minVal || '',
        maxAmount: maxVal || '',
        txType: typeVal || 'ALL',
        page: String(pageVal || 1),
        limit: '100'
      });
      const codeKey = targetLedger.code || targetLedger.name;
      const res = await apiRequest(`/accounting/ledger-statement/${encodeURIComponent(codeKey)}?${params.toString()}`);
      if (res && res.success) {
        setSelectedLedgerStatement(res);
        if (res.pagination?.page) setStmtPage(res.pagination.page);
      } else {
        setSelectedLedgerStatement({
          ledger: {
            code: targetLedger.code || 'LED',
            group: targetLedger.group_name || 'GENERAL LEDGER',
            name: targetLedger.name,
            system_name: targetLedger.system_name || targetLedger.name,
            is_system: 'Yes',
            show_in_db: targetLedger.show_in_db ? 'Yes' : 'No',
            risk_percent: targetLedger.risk_percent || 0,
            type: targetLedger.type || 'Asset',
            branch: data?.branchName || selectedBranch,
            total_t: 0,
            last_t: '-',
            opening_balance: targetLedger.opening_balance || 0,
            closing_balance: targetLedger.closing_balance || 0,
            total_debit: targetLedger.payments || 0,
            total_credit: targetLedger.receipts || 0,
            net_diff: (targetLedger.payments || 0) - (targetLedger.receipts || 0)
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

  // Handle clicking on ANY ledger card or Eye icon to open 1:1 Statement Drilldown
  const handleOpenLedgerStatement = (ledger) => {
    const defaultFrom = startDate;
    setStmtLedgerRef(ledger);
    setStmtBranch(selectedBranch);
    setStmtFromDate(defaultFrom);
    setStmtToDate(endDate);
    setStmtManualOnly(false);
    setStmtSearch('');
    setStmtMinAmt('');
    setStmtMaxAmt('');
    setStmtTxType('ALL');
    setStmtPage(1);
    setSelectedTxDetail(null);
    setShowStatementModal(true);
    loadLedgerStatement(ledger, {
      branch: selectedBranch,
      fromDate: defaultFrom,
      toDate: endDate,
      manualOnly: false,
      search: '',
      minAmt: '',
      maxAmt: '',
      txType: 'ALL',
      page: 1
    });
  };

  // Clickable Transaction Description -> Open Full Payment & Scheme Background Detail (1:1 Prahlad Drilldown)
  const handleOpenTransactionBackground = async (row, ledgerInfo) => {
    setSelectedTxDetail({ row, ledger: ledgerInfo, background: null });
    setLoadingTxDetail(true);
    try {
      const params = new URLSearchParams({
        id: row.id || '',
        voucher_no: row.voucher_no || '',
        ledger_name: ledgerInfo?.name || 'CASH BOOK'
      });
      const res = await apiRequest(`/accounting/transaction-background?${params.toString()}`);
      if (res && res.success && res.background) {
        setSelectedTxDetail({ row, ledger: ledgerInfo, background: res.background });
      }
    } catch (err) {
      console.error('Failed to load transaction background:', err);
    } finally {
      setLoadingTxDetail(false);
    }
  };

  const handleSaveLedgerEdit = async (e) => {
    e.preventDefault();
    if (!editingLedger) return;
    setSavingLedgerEdit(true);
    try {
      const res = await apiRequest(`/accounting/ledgers/${encodeURIComponent(editingLedger.code)}`, {
        method: 'PUT',
        body: JSON.stringify({
          name: editingLedger.name,
          show_in_db: !!editingLedger.show_in_db,
          is_bank_account: !!editingLedger.is_bank_account,
          risk_percent: Number(editingLedger.risk_percent) || 0
        })
      });
      if (res && res.success) {
        setEditingLedger(null);
        await Promise.all([fetchLedgersIndex(), fetchDayBook()]);
      }
    } catch (err) {
      console.error('Error updating ledger:', err);
    } finally {
      setSavingLedgerEdit(false);
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
        body: JSON.stringify({ ...formData, branch_code: selectedBranch })
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
  const formattedStart = startDate.split('-').reverse().join('/');
  const formattedEnd = endDate.split('-').reverse().join('/');
  const dateRangeLabel = isRange
    ? `${formattedStart} से ${formattedEnd}`
    : formattedStart;

  const activeDayBookLedgers = (data?.ledgers || []).filter(l => l.show_in_db !== false);

  // Reusable two-sided Roz Kird side table helper (used on screen and print view)
  const renderRozKirdSide = (sideLabel, isJama, groups, cashTotal, transferTotal, grandTotal, compact = false) => {
    const headerBorder = isJama ? 'border-emerald-500 text-emerald-800' : 'border-rose-500 text-rose-800';
    const theadCls = isJama ? 'bg-emerald-50/60 text-emerald-950 border-emerald-100' : 'bg-rose-50/60 text-rose-950 border-rose-100';
    const groupRowCls = isJama ? 'bg-emerald-100/50 text-emerald-900' : 'bg-rose-100/50 text-rose-900';
    const amountCls = isJama ? 'text-emerald-700' : 'text-rose-700';
    const footerCls = isJama ? 'border-emerald-400 bg-emerald-50/80 text-emerald-950' : 'border-rose-400 bg-rose-50/80 text-rose-950';

    if (compact) {
      // Exact Prahlad Print Format 2 styling (bordered table with red headings matching step_24_shot_2.png)
      return (
        <div>
          <div className="font-bold text-sm text-center mb-1">{sideLabel}</div>
          <table className="w-full text-[11px] border border-slate-700 border-collapse">
            <thead>
              <tr className="border-b border-slate-700 text-[#991b1b] font-bold bg-white">
                <th className="p-1 text-left border-r border-slate-700">खाते नं.</th>
                <th className="p-1 text-left border-r border-slate-700">नाव / नॅरेशन</th>
                <th className="p-1 text-right border-r border-slate-700">कॅश</th>
                <th className="p-1 text-right border-r border-slate-700">ट्रान्सफर</th>
                <th className="p-1 text-right">एकूण</th>
              </tr>
            </thead>
            <tbody>
              {groups.length === 0 ? (
                <tr className="border-b border-slate-300">
                  <td colSpan="5" className="p-3 text-center text-slate-400 italic">-</td>
                </tr>
              ) : (
                groups.map((g, gIdx) => (
                  <React.Fragment key={gIdx}>
                    <tr className="font-bold border-b border-slate-600 bg-slate-50">
                      <td colSpan="2" className="p-1 uppercase border-r border-slate-600">{g.categoryName}</td>
                      <td className="p-1 text-right font-mono border-r border-slate-600">{Number(g.cashTotal || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                      <td className="p-1 text-right font-mono border-r border-slate-600">{Number(g.transferTotal || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                      <td className="p-1 text-right font-mono">{Number(g.total || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                    </tr>
                    {g.items.map((it, iIdx) => (
                      <tr key={iIdx} className="border-b border-slate-400">
                        <td className="p-1 font-mono text-[10px] border-r border-slate-400">{it.account_no}</td>
                        <td className="p-1 border-r border-slate-400">{it.name_narration}</td>
                        <td className="p-1 text-right font-mono border-r border-slate-400">{Number(it.cash || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                        <td className="p-1 text-right font-mono border-r border-slate-400">{Number(it.transfer || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                        <td className="p-1 text-right font-mono">{Number(it.total || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                      </tr>
                    ))}
                  </React.Fragment>
                ))
              )}
            </tbody>
            <tfoot>
              <tr className="bg-slate-100 font-bold border-t border-slate-700">
                <td colSpan="2" className="p-1 uppercase border-r border-slate-700">एकूण {sideLabel}</td>
                <td className="p-1 text-right font-mono border-r border-slate-700">{cashTotal.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                <td className="p-1 text-right font-mono border-r border-slate-700">{transferTotal.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                <td className="p-1 text-right font-mono">{grandTotal.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
              </tr>
            </tfoot>
          </table>
        </div>
      );
    }

    return (
      <div className="p-2.5 sm:p-3 space-y-2.5">
        <div className={`flex items-center justify-between pb-2 border-b-2 ${headerBorder}`}>
          <span className="text-xs sm:text-sm font-black uppercase tracking-wide flex items-center gap-1.5">
            {isJama ? <ArrowDownLeft className="w-4 h-4 text-emerald-600" /> : <ArrowUpRight className="w-4 h-4 text-rose-600" />}
            <span>{sideLabel} ({isJama ? 'CREDITS / INFLOW' : 'DEBITS / OUTFLOW'})</span>
          </span>
          <span className={`text-xs font-mono font-bold px-2 py-0.5 rounded border shrink-0 ${isJama ? 'bg-emerald-50 text-emerald-800 border-emerald-200' : 'bg-rose-50 text-rose-800 border-rose-200'}`}>
            ₹{grandTotal.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-[11px]">
            <thead className={`font-bold text-[10px] uppercase border-b ${theadCls}`}>
              <tr>
                <th className="py-1.5 px-1.5 text-left">खाते नं.</th>
                <th className="py-1.5 px-1.5 text-left">नाव / नॅरेशन</th>
                <th className="py-1.5 px-1.5 text-right">कॅश (₹)</th>
                <th className="py-1.5 px-1.5 text-right">ट्रान्सफर (₹)</th>
                <th className="py-1.5 px-1.5 text-right">एकूण (₹)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {groups.length === 0 ? (
                <tr>
                  <td colSpan="5" className="py-8 text-center text-slate-400 italic">
                    इस अवधि में कोई {sideLabel} प्रविष्टि नहीं है।
                  </td>
                </tr>
              ) : (
                groups.map((group, gIdx) => (
                  <React.Fragment key={gIdx}>
                    <tr className={`font-bold ${groupRowCls}`}>
                      <td colSpan="2" className="py-1.5 px-1.5 uppercase text-[10px]">{group.categoryName}</td>
                      <td className="py-1.5 px-1.5 text-right font-mono text-[10px] whitespace-nowrap">{group.cashTotal > 0 ? `₹${group.cashTotal.toLocaleString('en-IN')}` : '-'}</td>
                      <td className="py-1.5 px-1.5 text-right font-mono text-[10px] whitespace-nowrap">{group.transferTotal > 0 ? `₹${group.transferTotal.toLocaleString('en-IN')}` : '-'}</td>
                      <td className={`py-1.5 px-1.5 text-right font-mono text-[10px] font-black whitespace-nowrap ${amountCls}`}>₹{group.total.toLocaleString('en-IN')}</td>
                    </tr>
                    {group.items.map((item, iIdx) => (
                      <tr key={iIdx} className="hover:bg-slate-50 transition">
                        <td className="py-1.5 px-1.5 font-mono text-[10px] text-slate-500 whitespace-nowrap pl-2.5">{item.account_no}</td>
                        <td className="py-1.5 px-1.5 font-medium text-slate-800 truncate max-w-[125px]">{item.name_narration}</td>
                        <td className="py-1.5 px-1.5 text-right font-mono text-slate-600 whitespace-nowrap">{item.cash > 0 ? `₹${item.cash.toLocaleString('en-IN')}` : '-'}</td>
                        <td className="py-1.5 px-1.5 text-right font-mono text-slate-600 whitespace-nowrap">{item.transfer > 0 ? `₹${item.transfer.toLocaleString('en-IN')}` : '-'}</td>
                        <td className={`py-1.5 px-1.5 text-right font-mono font-bold whitespace-nowrap ${amountCls}`}>₹{item.total.toLocaleString('en-IN')}</td>
                      </tr>
                    ))}
                  </React.Fragment>
                ))
              )}
            </tbody>
            <tfoot className={`border-t-2 font-black ${footerCls}`}>
              <tr>
                <td colSpan="2" className="py-2 px-1.5 uppercase text-[11px]">एकूण {sideLabel}</td>
                <td className="py-2 px-1.5 text-right font-mono whitespace-nowrap">₹{cashTotal.toLocaleString('en-IN')}</td>
                <td className="py-2 px-1.5 text-right font-mono whitespace-nowrap">₹{transferTotal.toLocaleString('en-IN')}</td>
                <td className={`py-2 px-1.5 text-right font-mono text-xs whitespace-nowrap ${amountCls}`}>₹{grandTotal.toLocaleString('en-IN')}</td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>
    );
  };

  // Shared 1:1 Prahlad Printable Sheet (Letterhead + Format 1 OR Format 2 रोज किर्द तपशील)
  const renderPrintableSheetBody = () => {
    const f1Totals = activeDayBookLedgers.reduce((acc, l) => {
      const col = getLedgerFormat1Columns(l);
      acc.opening += l.opening_balance || 0;
      acc.debit += col.debit;
      acc.credit += col.credit;
      acc.closing += l.closing_balance || 0;
      return acc;
    }, { opening: 0, debit: 0, credit: 0, closing: 0 });

    return (
      <div className="bg-white text-black p-6 font-sans max-w-5xl mx-auto">
        {/* Exact Prahlad CRM Official Company Letterhead */}
        <div className="flex items-center justify-between gap-4 pb-3 border-b-2 border-slate-800 mb-3">
          <div className="w-28 shrink-0 flex items-center justify-center">
            <TarplLogo variant="icon" size={96} />
          </div>
          <div className="flex-1 text-center">
            <h1 className="text-xl font-bold tracking-wide text-slate-950 uppercase">
              TARANGANJALI REALTECH PVT LTD
            </h1>
            <p className="text-[11px] text-slate-500">(Incorporated under the Companies Act, 2013)</p>
            <p className="text-[11px] text-slate-500">Registered by Ministry of Corporate Affairs, Govt. of India</p>
            <p className="text-[11px] text-slate-800 font-medium mt-0.5">
              VEDIC VIHAR, CIVIL LINE-I, NEAR AYUSHMAN, HOSPITAL OPP. ANDHRA BANK
            </p>
            <p className="text-[11px] text-slate-700">
              KIRATPUR NAJIBABAD ROAD BIJNOR Uttar Pradesh - 246701
            </p>
            <p className="text-[11px] text-slate-800">
              E: geetanjalihir@gmail.com &nbsp; M: 9837554433
            </p>
            <p className="text-[11px] text-slate-800 font-semibold">
              CIN: U45400UP2013PTC058306
            </p>
          </div>
          <div className="w-28 shrink-0"></div>
        </div>

        <div className="text-center font-bold text-sm text-slate-900 my-3">
          Day book for the period day : {formattedStart} to {formattedEnd}
          {selectedBranch !== 'ALL' && (
            <span className="block text-xs font-semibold text-slate-600 mt-0.5">
              Branch: {data?.branchName || selectedBranch}
            </span>
          )}
        </div>

        {viewFormat === 'format1' ? (
          <table className="w-full text-xs border border-slate-700 border-collapse">
            <thead>
              <tr className="border-b border-slate-700 text-[#991b1b] font-bold bg-white">
                <th className="p-2 text-left border-r border-slate-700">NAME</th>
                <th className="p-2 text-center border-r border-slate-700">TYPE</th>
                <th className="p-2 text-right border-r border-slate-700">OPENING BAL.<br />({formattedStart})</th>
                <th className="p-2 text-right border-r border-slate-700">DEBIT</th>
                <th className="p-2 text-right border-r border-slate-700">CREDIT</th>
                <th className="p-2 text-right">CLOSING BAL.<br />({formattedEnd})</th>
              </tr>
            </thead>
            <tbody>
              {activeDayBookLedgers.map((l, idx) => {
                const f1 = getLedgerFormat1Columns(l);
                return (
                  <tr key={idx} className="border-b border-slate-500">
                    <td className="p-2 font-medium border-r border-slate-500">{f1.displayName}</td>
                    <td className="p-2 text-center border-r border-slate-500">{f1.displayType}</td>
                    <td className="p-2 text-right font-mono border-r border-slate-500">{formatAccountingNum(l.opening_balance)}</td>
                    <td className="p-2 text-right font-mono border-r border-slate-500">{f1.debit.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                    <td className="p-2 text-right font-mono border-r border-slate-500">{f1.credit.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                    <td className="p-2 text-right font-mono">{formatAccountingNum(l.closing_balance)}</td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot>
              <tr className="font-bold italic border-t-2 border-slate-700 bg-slate-50">
                <td colSpan="2" className="p-2 text-center uppercase border-r border-slate-700">GRAND TOTAL</td>
                <td className="p-2 text-right font-mono border-r border-slate-700">{formatAccountingNum(f1Totals.opening)}</td>
                <td className="p-2 text-right font-mono border-r border-slate-700">{f1Totals.debit.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                <td className="p-2 text-right font-mono border-r border-slate-700">{f1Totals.credit.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                <td className="p-2 text-right font-mono">{formatAccountingNum(f1Totals.closing)}</td>
              </tr>
            </tfoot>
          </table>
        ) : (
          <div>
            <div className="text-center font-bold text-sm mb-2">
              रोज किर्द तपशील <br />
              <span className="text-xs font-semibold">(Transaction Date: {dateRangeLabel})</span>
            </div>
            <div className="grid grid-cols-2 gap-3">
              {renderRozKirdSide(
                'जमा',
                true,
                data?.rozKird?.jama || [],
                data?.rozKird?.totals?.jamaCashTotal || 0,
                data?.rozKird?.totals?.jamaTransferTotal || 0,
                data?.rozKird?.totals?.jamaGrandTotal || 0,
                true
              )}
              {renderRozKirdSide(
                'नावे',
                false,
                data?.rozKird?.nave || [],
                data?.rozKird?.totals?.naveCashTotal || 0,
                data?.rozKird?.totals?.naveTransferTotal || 0,
                data?.rozKird?.totals?.naveGrandTotal || 0,
                true
              )}
            </div>
          </div>
        )}

        <div className="mt-8 pt-3 border-t border-slate-300 flex justify-between text-[11px] text-slate-600">
          <span>Prepared by: Accountant / Cashier</span>
          <span>Verified by: Branch Manager</span>
          <span>Authorized by: TARPL Director</span>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      
      {/* ======================================================== */}
      {/* 1. PRAHLAD 1:1 TOP HEADER & NAVIGATION STRIP             */}
      {/* ======================================================== */}
      <div className="bg-white rounded-xl p-4 shadow-xs border border-slate-200 space-y-4">
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-3 pb-3 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-normal text-slate-800 tracking-tight">Day Book</h1>
            <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-amber-50 text-amber-800 border border-amber-200">
              {data?.branchName || selectedBranch}
            </span>
          </div>

          {/* 3 Main Sub-Views + Quick Vouchers */}
          <div className="flex flex-wrap items-center gap-2 w-full lg:w-auto justify-between lg:justify-end">
            <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl border border-slate-200">
              <button
                type="button"
                onClick={() => setDayBookOption('BANKING')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                  dayBookOption === 'BANKING' ? 'bg-[#082e20] text-[#FBBF24] shadow-xs' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Landmark className="w-3.5 h-3.5" />
                <span>Day Book (1:1)</span>
              </button>
              <button
                type="button"
                onClick={() => setDayBookOption('DAILY_USE')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                  dayBookOption === 'DAILY_USE' ? 'bg-slate-900 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Coffee className="w-3.5 h-3.5" />
                <span>Daily Use ({data?.daily?.summary?.total_vouchers || 0})</span>
              </button>
              <button
                type="button"
                onClick={() => setDayBookOption('LEDGERS')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                  dayBookOption === 'LEDGERS' ? 'bg-indigo-600 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Eye className="w-3.5 h-3.5" />
                <span>Ledgers (Accounts)</span>
              </button>
            </div>

            <div className="flex items-center gap-1.5">
              <button
                onClick={() => handleOpenModal('INFLOW')}
                className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-2xs transition cursor-pointer"
                title="Record Cash Inflow (+ आवक)"
              >
                <ArrowDownLeft className="w-3.5 h-3.5" />
                <span>+ आवक</span>
              </button>
              <button
                onClick={() => handleOpenModal('OUTFLOW')}
                className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs shadow-2xs transition cursor-pointer"
                title="Record Expense / Outflow (- खर्च)"
              >
                <ArrowUpRight className="w-3.5 h-3.5" />
                <span>- खर्च</span>
              </button>
              <button
                onClick={() => onOpenJournalEntry && onOpenJournalEntry()}
                className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-black text-amber-400 font-bold text-xs shadow-2xs transition cursor-pointer"
                title="New Journal Entry"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>JV</span>
              </button>
              <button
                onClick={handleExportCSV}
                className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-slate-300 hover:bg-slate-50 text-slate-700 font-bold text-xs transition cursor-pointer"
                title="Export CSV"
              >
                <Download className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>

        {/* PRAHLAD EXACT CENTERED SEARCH STRIP + RIGHT-ALIGNED FORMAT DROPDOWN */}
        {dayBookOption !== 'LEDGERS' && (
          <div className="flex flex-col md:flex-row items-center justify-between gap-3 pt-1">
            <div className="hidden xl:block w-28 shrink-0"></div>

            {/* Centered Branch + Date + Green GET button (matches admin.taranganjali.com 1:1) */}
            <div className="flex flex-wrap items-center justify-center gap-2 flex-1 min-w-0">
              <select
                value={selectedBranch}
                onChange={(e) => setSelectedBranch(e.target.value)}
                className="px-2.5 py-2 bg-white border border-slate-300 rounded text-xs font-medium text-slate-800 w-52 sm:w-56 truncate focus:outline-none focus:border-[#3c8dbc]"
              >
                <option value="ALL">ALL</option>
                <option value="BHR001">MAIN BRANCH (BHR001)</option>
                <option value="BHR002">TARPL0002 (BHR002)</option>
                <option value="BRH003">TARPL SAVING (BRH003)</option>
                <option value="SHEKHUPURA">SHEKHUPURA BRANCH (शेखुपुरा / सुजालपुर)</option>
              </select>

              <div className="flex items-center border border-slate-300 rounded bg-white px-2.5 py-1.5">
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => {
                    const val = e.target.value;
                    setStartDate(val);
                    if (!showCustomRange) setEndDate(val);
                    setDatePreset('CUSTOM');
                  }}
                  className="text-xs font-medium text-slate-800 focus:outline-none cursor-pointer"
                />
                {showCustomRange && (
                  <>
                    <span className="mx-1.5 text-slate-400 text-xs">→</span>
                    <input
                      type="date"
                      value={endDate}
                      onChange={(e) => {
                        setEndDate(e.target.value);
                        setDatePreset('CUSTOM');
                      }}
                      className="text-xs font-medium text-slate-800 focus:outline-none cursor-pointer"
                    />
                  </>
                )}
              </div>

              <button
                type="button"
                onClick={fetchDayBook}
                disabled={loading}
                className="px-4 py-2 bg-[#00a65a] hover:bg-[#008d4c] text-white font-semibold text-xs rounded shadow-2xs transition cursor-pointer flex items-center gap-1.5 uppercase tracking-wide"
              >
                {loading && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
                <span>GET</span>
              </button>

              <button
                type="button"
                onClick={() => setShowCustomRange(!showCustomRange)}
                className={`px-2.5 py-2 rounded border text-[11px] font-bold transition cursor-pointer ${
                  showCustomRange ? 'bg-indigo-50 border-indigo-300 text-indigo-700' : 'bg-slate-50 border-slate-300 text-slate-600 hover:bg-slate-100'
                }`}
                title="Toggle Custom Date Range & Presets"
              >
                {showCustomRange ? 'Single Date' : 'Range 📅'}
              </button>
            </div>

            {/* Right-aligned Format Selector matching step_7_shot_1.png */}
            <div className="flex flex-col items-end shrink-0">
              <span className="text-[11px] font-bold text-slate-600 mb-0.5">Format:</span>
              <select
                value={viewFormat}
                onChange={(e) => setViewFormat(e.target.value)}
                className="px-2.5 py-1.5 bg-white border border-slate-300 rounded text-xs font-medium text-slate-800 focus:outline-none focus:border-[#3c8dbc] cursor-pointer whitespace-nowrap min-w-[125px] shrink-0"
              >
                <option value="format1">Format 1</option>
                <option value="format2">Format 2 (रोज किर्द)</option>
              </select>
            </div>
          </div>
        )}

        {/* Expandable Custom Date Presets & Search Bar when Range toggled or in Daily Use */}
        {(showCustomRange || dayBookOption === 'DAILY_USE' || search.length > 0) && dayBookOption !== 'LEDGERS' && (
          <div className="pt-3 border-t border-slate-100 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-2.5">
            <div className="flex flex-wrap items-center gap-1.5">
              {[
                { id: 'TODAY', label: 'आज (Today)' },
                { id: 'YESTERDAY', label: 'कल (Yesterday)' },
                { id: 'WEEK', label: '19 Nov - 25 Nov' },
                { id: 'MONTH', label: 'This Month' }
              ].map(p => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => {
                    applyDatePreset(p.id);
                    if (p.id === 'WEEK' || p.id === 'MONTH') setShowCustomRange(true);
                  }}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition cursor-pointer ${
                    datePreset === p.id ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  {p.label}
                </button>
              ))}
            </div>

            <div className="flex flex-wrap items-center gap-2 flex-1 md:max-w-xl justify-end">
              <div className="relative flex-1 min-w-[200px]">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search member, voucher, account no..."
                  className="w-full text-xs pl-8 pr-7 py-1.5 rounded-lg bg-slate-50 border border-slate-200 focus:bg-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
                {search && (
                  <button onClick={() => setSearch('')} className="absolute right-2 top-1.5 text-slate-400 hover:text-slate-600 text-xs font-bold">✕</button>
                )}
              </div>

              <div className="flex items-center bg-slate-100 p-0.5 rounded-lg">
                {['ALL', 'INFLOW', 'OUTFLOW'].map(ft => (
                  <button
                    key={ft}
                    onClick={() => setFlowTypeFilter(ft)}
                    className={`px-2 py-1 rounded text-[11px] font-bold cursor-pointer ${
                      flowTypeFilter === ft ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-500'
                    }`}
                  >
                    {ft === 'ALL' ? 'All' : ft === 'INFLOW' ? 'आवक/जमा' : 'जावक/नावे'}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}
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
                  className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs transition cursor-pointer shrink-0 whitespace-nowrap"
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
                  className="px-2.5 py-1 rounded-lg bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs transition cursor-pointer shrink-0 whitespace-nowrap"
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
                    <th className="py-2.5 px-4 text-center">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700">
                  {filteredDailyVouchers.length === 0 ? (
                    <tr>
                      <td colSpan="9" className="py-12 text-center text-slate-400">
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
                            <button
                              type="button"
                              onClick={() => handleOpenTransactionBackground({ ...v, description: `${v.category_name || v.category} - ${v.party_name || v.account}`, debit: isInflow ? v.amount : 0, credit: !isInflow ? v.amount : 0 }, { name: v.ledger || 'CASH BOOK' })}
                              className="text-left text-[#2563eb] hover:underline cursor-pointer"
                              title="Click for Payment & Voucher Background"
                            >
                              {v.category_name || v.category}
                            </button>
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
                          <td className="py-3 px-4 text-center whitespace-nowrap">
                            <button
                              type="button"
                              onClick={() => handleDeleteCashEntry(v)}
                              className="inline-flex items-center gap-1 px-2 py-1 rounded bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 font-bold text-[10px] transition cursor-pointer"
                              title="Delete Voucher Entry"
                            >
                              <Trash2 className="w-3 h-3" />
                              <span>Delete</span>
                            </button>
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
      {/* 3B. VIEW 2: BANKING (PRAHLAD 1:1 3-COLUMN DAY BOOK)      */}
      {/* ======================================================== */}
      {dayBookOption === 'BANKING' && (
        <div className="space-y-6 animate-fadeIn">

          {/* EXACT 1:1 3 EQUAL COLUMNS: OPENING | CURRENT/ CLOSING | DAY TRANSACTIONS */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">

            {/* COLUMN 1: OPENING (<DD/MM/YYYY>) - Amber/Orange Top Border (#f39c12) */}
            <div className="bg-white rounded shadow-xs border-t-[3px] border-t-[#f39c12] border-x border-b border-slate-200 overflow-hidden">
              <div className="min-h-[48px] px-3 flex items-center justify-center border-b border-slate-100 text-center">
                <h3 className="text-[13px] xl:text-[14px] font-medium text-slate-700 tracking-wide whitespace-nowrap">
                  OPENING ({formattedStart})
                </h3>
              </div>
              <div className="py-4 px-4 space-y-5 text-center">
                {activeDayBookLedgers.map((ledger) => (
                  <div key={ledger.id || ledger.code} className="group">
                    <div className="text-[22px] font-normal text-slate-900 leading-tight font-sans tabular-nums">
                      {formatAccountingNum(ledger.opening_balance)}
                    </div>
                    <button
                      type="button"
                      onClick={() => handleOpenLedgerStatement(ledger)}
                      className="text-[12px] font-medium text-[#3c8dbc] hover:text-[#23527c] hover:underline uppercase mt-0.5 inline-flex items-center gap-1 cursor-pointer"
                      title="Open Ledger Statement (Eye View)"
                    >
                      <span>{ledger.name}</span>
                      <Eye className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                    </button>
                  </div>
                ))}
              </div>
            </div>

            {/* COLUMN 2: CURRENT/ CLOSING (<DD/MM/YYYY>) - Red Top Border (#dd4b39) */}
            <div className="bg-white rounded shadow-xs border-t-[3px] border-t-[#dd4b39] border-x border-b border-slate-200 overflow-hidden">
              <div className="min-h-[48px] px-3 flex items-center justify-center border-b border-slate-100 text-center">
                <h3 className="text-[13px] xl:text-[14px] font-medium text-slate-700 tracking-wide whitespace-nowrap">
                  CURRENT/ CLOSING ({formattedEnd})
                </h3>
              </div>
              <div className="py-4 px-4 space-y-5 text-center">
                {activeDayBookLedgers.map((ledger) => (
                  <div key={ledger.id || ledger.code} className="group">
                    <div className="text-[22px] font-normal text-slate-900 leading-tight font-sans tabular-nums">
                      {formatAccountingNum(ledger.closing_balance)}
                    </div>
                    <button
                      type="button"
                      onClick={() => handleOpenLedgerStatement(ledger)}
                      className="text-[12px] font-medium text-[#3c8dbc] hover:text-[#23527c] hover:underline uppercase mt-0.5 inline-flex items-center gap-1 cursor-pointer"
                      title="Open Ledger Statement (Eye View)"
                    >
                      <span>{ledger.name}</span>
                      <Eye className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                    </button>
                  </div>
                ))}
              </div>
            </div>

            {/* COLUMN 3: DAY TRANSACTIONS - Green Top Border (#00a65a) */}
            <div className="bg-white rounded shadow-xs border-t-[3px] border-t-[#00a65a] border-x border-b border-slate-200 overflow-hidden">
              <div className="min-h-[48px] px-3 flex items-center justify-center border-b border-slate-100 text-center">
                <h3 className="text-[13px] xl:text-[14px] font-medium text-slate-700 tracking-wide whitespace-nowrap">
                  DAY TRANSACTIONS
                </h3>
              </div>
              <div className="py-4 px-4 space-y-5 text-center">
                {activeDayBookLedgers.map((ledger) => {
                  const netMovement = Number(((ledger.receipts || 0) - (ledger.payments || 0)).toFixed(2));
                  return (
                    <div key={ledger.id || ledger.code} className="group">
                      <div className="text-[22px] font-normal text-slate-900 leading-tight font-sans tabular-nums">
                        {formatAccountingNum(netMovement)}
                      </div>
                      <button
                        type="button"
                        onClick={() => handleOpenLedgerStatement(ledger)}
                        className="text-[12px] font-medium text-[#3c8dbc] hover:text-[#23527c] hover:underline uppercase mt-0.5 inline-flex items-center gap-1 cursor-pointer"
                        title="Open Ledger Statement (Eye View)"
                      >
                        <span>{ledger.name}</span>
                        <Eye className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>

          </div>

          {/* CENTERED GREEN PRINT BUTTON (EXACT 1:1 PRAHLAD PLACEMENT) */}
          <div className="flex justify-center pt-1">
            <button
              type="button"
              onClick={() => setShowPrintPreview(true)}
              className="px-6 py-2 bg-[#00a65a] hover:bg-[#008d4c] text-white text-xs font-bold rounded shadow-xs uppercase tracking-wider inline-flex items-center gap-1.5 transition cursor-pointer"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>PRINT</span>
            </button>
          </div>

          {/* ======================================================== */}
          {/* FORMAT 2 ON-SCREEN LIVE VIEW: TWO-SIDED रोज किर्द तपशील */}
          {/* ======================================================== */}
          {viewFormat === 'format2' && (
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
              <div className="p-4 bg-slate-900 text-white flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <BookOpen className="w-5 h-5 text-amber-400" />
                  <div>
                    <h3 className="text-sm font-black tracking-wide flex items-center gap-2">
                      <span>रोज किर्द तपशील (Format 2 — जमा vs नावे)</span>
                    </h3>
                    <p className="text-[11px] text-slate-300">
                      Transaction Date: {dateRangeLabel} • {data?.branchName || selectedBranch}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3 text-xs">
                  <span className="text-emerald-400 font-bold">🟢 जमा: ₹{(data?.rozKird?.totals?.jamaGrandTotal || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                  <span className="text-rose-400 font-bold">🔴 नावे: ₹{(data?.rozKird?.totals?.naveGrandTotal || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                  <button
                    type="button"
                    onClick={() => setShowPrintPreview(true)}
                    className="px-3 py-1 bg-[#00a65a] hover:bg-[#008d4c] text-white rounded text-xs font-bold cursor-pointer flex items-center gap-1"
                  >
                    <Printer className="w-3.5 h-3.5" /> Print Preview
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 divide-y lg:divide-y-0 lg:divide-x divide-slate-200">
                {renderRozKirdSide(
                  'जमा',
                  true,
                  data?.rozKird?.jama || [],
                  data?.rozKird?.totals?.jamaCashTotal || 0,
                  data?.rozKird?.totals?.jamaTransferTotal || 0,
                  data?.rozKird?.totals?.jamaGrandTotal || 0,
                  false
                )}
                {renderRozKirdSide(
                  'नावे',
                  false,
                  data?.rozKird?.nave || [],
                  data?.rozKird?.totals?.naveCashTotal || 0,
                  data?.rozKird?.totals?.naveTransferTotal || 0,
                  data?.rozKird?.totals?.naveGrandTotal || 0,
                  false
                )}
              </div>
            </div>
          )}

          {/* ======================================================== */}
          {/* FORMAT 1 ON-SCREEN LIVE SUMMARY TABLE (DOUBLE ENTRY)     */}
          {/* ======================================================== */}
          {viewFormat === 'format1' && (
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
              <div className="p-4 bg-slate-900 text-white flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <FileText className="w-5 h-5 text-indigo-400" />
                  <div>
                    <h3 className="text-sm font-black tracking-wide">
                      Day Book Ledger Statement Summary (Format 1)
                    </h3>
                    <p className="text-[11px] text-slate-300">
                      Double-entry Asset & Liability Summary • {dateRangeLabel} • {data?.branchName || selectedBranch}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setShowPrintPreview(true)}
                  className="px-3 py-1.5 bg-[#00a65a] hover:bg-[#008d4c] text-white rounded-lg text-xs font-bold transition flex items-center gap-1.5 cursor-pointer"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>Open Print View</span>
                </button>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left">
                  <thead className="bg-slate-50 border-b border-slate-200 text-[10px] uppercase font-bold text-[#991b1b] tracking-wider">
                    <tr>
                      <th className="py-2.5 px-2.5">NAME</th>
                      <th className="py-2.5 px-2.5">TYPE</th>
                      <th className="py-2.5 px-2.5 text-right whitespace-nowrap">OPENING ({formattedStart})</th>
                      <th className="py-2.5 px-2.5 text-right">DEBIT</th>
                      <th className="py-2.5 px-2.5 text-right">CREDIT</th>
                      <th className="py-2.5 px-2.5 text-right whitespace-nowrap">CLOSING ({formattedEnd})</th>
                      <th className="py-2.5 px-2.5 text-center whitespace-nowrap">EYE VIEW</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-slate-700">
                    {activeDayBookLedgers.map((ledger) => {
                      const f1 = getLedgerFormat1Columns(ledger);
                      return (
                        <tr key={ledger.id || ledger.code} className="hover:bg-slate-50 transition">
                          <td className="py-2.5 px-2.5 font-bold text-[#3c8dbc]">
                            <button
                              type="button"
                              onClick={() => handleOpenLedgerStatement(ledger)}
                              className="hover:underline cursor-pointer text-left"
                            >
                              {f1.displayName}
                            </button>
                          </td>
                          <td className="py-2.5 px-2.5 whitespace-nowrap">
                            <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                              f1.displayType === 'Asset'
                                ? 'bg-blue-50 text-blue-800 border border-blue-200'
                                : 'bg-amber-50 text-amber-800 border border-amber-200'
                            }`}>
                              {f1.displayType}
                            </span>
                          </td>
                          <td className="py-2.5 px-2.5 text-right font-mono font-semibold text-slate-800 whitespace-nowrap">
                            {formatAccountingNum(ledger.opening_balance)}
                          </td>
                          <td className="py-2.5 px-2.5 text-right font-mono font-bold text-slate-800 whitespace-nowrap">
                            {f1.debit.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </td>
                          <td className="py-2.5 px-2.5 text-right font-mono font-bold text-slate-800 whitespace-nowrap">
                            {f1.credit.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </td>
                          <td className="py-2.5 px-2.5 text-right font-mono font-bold text-indigo-700 text-xs sm:text-sm whitespace-nowrap">
                            {formatAccountingNum(ledger.closing_balance)}
                          </td>
                          <td className="py-2.5 px-2.5 text-center whitespace-nowrap">
                            <button
                              type="button"
                              onClick={() => handleOpenLedgerStatement(ledger)}
                              className="inline-flex items-center gap-1 px-2 py-1 rounded bg-slate-100 hover:bg-indigo-100 text-slate-700 hover:text-indigo-700 font-bold text-[11px] transition cursor-pointer"
                              title="View Ledger Statement"
                            >
                              <Eye className="w-3.5 h-3.5" />
                              <span>View</span>
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                  <tfoot className="bg-slate-100 border-t-2 border-slate-300 font-black italic text-slate-900">
                    <tr>
                      <td colSpan="2" className="py-2.5 px-2.5 uppercase text-xs">GRAND TOTAL</td>
                      <td className="py-2.5 px-2.5 text-right font-mono text-xs sm:text-sm whitespace-nowrap">
                        {formatAccountingNum(activeDayBookLedgers.reduce((s, l) => s + (l.opening_balance || 0), 0))}
                      </td>
                      <td className="py-2.5 px-2.5 text-right font-mono text-xs sm:text-sm whitespace-nowrap">
                        {activeDayBookLedgers.reduce((s, l) => s + getLedgerFormat1Columns(l).debit, 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </td>
                      <td className="py-2.5 px-2.5 text-right font-mono text-xs sm:text-sm whitespace-nowrap">
                        {activeDayBookLedgers.reduce((s, l) => s + getLedgerFormat1Columns(l).credit, 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </td>
                      <td className="py-2.5 px-2.5 text-right font-mono text-indigo-900 text-xs sm:text-sm whitespace-nowrap">
                        {formatAccountingNum(activeDayBookLedgers.reduce((s, l) => s + (l.closing_balance || 0), 0))}
                      </td>
                      <td></td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>
          )}
          
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
                            <button
                              type="button"
                              onClick={() => handleOpenTransactionBackground({ ...t, description: `${t.action_label} - ${t.customer_name}`, debit: isInflow ? (t.inflow_amount || 0) : 0, credit: !isInflow ? (t.outflow_amount || 0) : 0 }, { name: t.payment_mode?.includes('BANK') ? 'BANK BOOK' : 'CASH BOOK' })}
                              className="text-left group cursor-pointer"
                              title="Click for full Payment Mode & Scheme Background"
                            >
                              <div className="font-bold text-[#2563eb] group-hover:underline">{t.action_label}</div>
                              <div className="text-[11px] text-slate-500 truncate max-w-xs">{t.narration} • View Background</div>
                            </button>
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
      {/* 3C. VIEW 3: LEDGER ACCOUNTS INDEX (1:1 /accounting/accounts) */}
      {/* ======================================================== */}
      {dayBookOption === 'LEDGERS' && (
        <div className="bg-white rounded-xl shadow-xs border border-slate-200 overflow-hidden animate-fadeIn">
          <div className="p-4 border-b border-slate-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-normal text-slate-800">LEDGER ACCOUNTS</h2>
              <p className="text-xs text-slate-500">
                प्रहलाद CRM 1:1 खाता सूची • किसी भी खाते पर 👁️ Eye View से स्टेटमेंट देखें या ✏️ से Show In Day Book टॉगल करें
              </p>
            </div>
            <select
              value={selectedBranch}
              onChange={(e) => setSelectedBranch(e.target.value)}
              className="px-3 py-1.5 bg-white border border-slate-300 rounded text-xs font-medium text-slate-800"
            >
              <option value="ALL">ALL</option>
              <option value="BHR001">MAIN BRANCH (BHR001)</option>
              <option value="BHR002">TARPL0002 (BHR002)</option>
              <option value="BRH003">TARPL SAVING (BRH003)</option>
              <option value="SHEKHUPURA">SHEKHUPURA BRANCH (शेखुपुरा / सुजालपुर)</option>
            </select>
          </div>

          <div className="px-4 pt-3 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3 bg-slate-50/50">
            <div className="flex items-center gap-1 overflow-x-auto">
              {[
                { id: 'ALL', label: 'ALL' },
                { id: 'Asset', label: 'ASSETS' },
                { id: 'Liability', label: 'LIABILITIES' },
                { id: 'Equity', label: 'EQUITY' },
                { id: 'Expense', label: 'EXPENSES' },
                { id: 'Revenue', label: 'REVENUE' }
              ].map(t => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => setLedgersTab(t.id)}
                  className={`px-3 py-2 text-xs font-bold border-b-2 transition cursor-pointer ${
                    ledgersTab === t.id
                      ? 'border-[#3c8dbc] text-[#3c8dbc] bg-white'
                      : 'border-transparent text-slate-500 hover:text-slate-800'
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>

            <div className="pb-2 flex items-center gap-2">
              <span className="text-xs text-slate-500">Search:</span>
              <input
                type="text"
                value={ledgersSearch}
                onChange={(e) => setLedgersSearch(e.target.value)}
                placeholder="Code, Name, Group..."
                className="px-2.5 py-1 border border-slate-300 rounded text-xs bg-white focus:outline-none focus:border-[#3c8dbc]"
              />
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-50 border-b border-slate-200 text-[11px] font-bold text-slate-700 uppercase">
                <tr>
                  <th className="py-2.5 px-4">CODE</th>
                  <th className="py-2.5 px-4">NAME</th>
                  <th className="py-2.5 px-4">SYSTEM NAME</th>
                  <th className="py-2.5 px-4">GROUP</th>
                  <th className="py-2.5 px-4">TYPE</th>
                  <th className="py-2.5 px-4 text-center">SYSTEM A/C</th>
                  <th className="py-2.5 px-4 text-center">SHOW IN DB</th>
                  <th className="py-2.5 px-4 text-right">BALANCE</th>
                  <th className="py-2.5 px-4 text-center">ACTIONS</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {(ledgersList || [])
                  .filter(l => ledgersTab === 'ALL' || (l.type || '').toLowerCase() === ledgersTab.toLowerCase())
                  .filter(l => {
                    const q = ledgersSearch.trim().toLowerCase();
                    if (!q) return true;
                    return (
                      (l.code || '').toLowerCase().includes(q) ||
                      (l.name || '').toLowerCase().includes(q) ||
                      (l.group_name || '').toLowerCase().includes(q)
                    );
                  })
                  .map((l) => (
                    <tr key={l.code} className="hover:bg-slate-50 transition">
                      <td className="py-2.5 px-4 font-mono font-bold text-slate-700">{l.code}</td>
                      <td className="py-2.5 px-4 font-bold text-[#3c8dbc]">
                        <button type="button" onClick={() => handleOpenLedgerStatement(l)} className="hover:underline cursor-pointer">
                          {l.name}
                        </button>
                      </td>
                      <td className="py-2.5 px-4 font-mono text-slate-600">{l.system_name || l.name}</td>
                      <td className="py-2.5 px-4 text-slate-600">{l.group_name || '-'}</td>
                      <td className="py-2.5 px-4 font-medium text-slate-700">{l.type}</td>
                      <td className="py-2.5 px-4 text-center">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold text-white ${l.is_system ? 'bg-[#00a65a]' : 'bg-rose-500'}`}>
                          {l.is_system ? 'Yes' : 'No'}
                        </span>
                      </td>
                      <td className="py-2.5 px-4 text-center">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold text-white ${l.show_in_db ? 'bg-[#00a65a]' : 'bg-slate-400'}`}>
                          {l.show_in_db ? 'Yes' : 'No'}
                        </span>
                      </td>
                      <td className="py-2.5 px-4 text-right font-mono font-bold text-slate-900">
                        {formatAccountingNum(l.closing_balance)}
                      </td>
                      <td className="py-2.5 px-4 text-center">
                        <div className="inline-flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => setEditingLedger({ ...l })}
                            className="p-1.5 rounded bg-[#3c8dbc] hover:bg-[#367fa9] text-white cursor-pointer"
                            title="Edit Ledger / Toggle Show In Day Book"
                          >
                            <Pencil className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleOpenLedgerStatement(l)}
                            className="p-1.5 rounded bg-slate-200 hover:bg-slate-300 text-slate-700 cursor-pointer"
                            title="Eye View Ledger Statement"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* 5. PRAHLAD 1:1 LEDGER STATEMENT DRILLDOWN (step_24_shot_1)*/}
      {/* ======================================================== */}
      {showStatementModal && selectedLedgerStatement && (
        <div className="fixed inset-0 z-[200] flex justify-center items-start pt-4 pb-8 p-2 sm:p-4 bg-slate-950/80 backdrop-blur-sm overflow-y-auto">
          <div className="bg-white rounded-xl shadow-2xl border border-slate-300 w-full max-w-6xl overflow-hidden">
            {/* Header */}
            <div className="px-5 py-3.5 bg-[#082e20] text-white flex items-center justify-between border-b border-emerald-800">
              <div>
                <h3 className="text-lg font-medium flex items-center gap-2">
                  <span>{selectedLedgerStatement.ledger.type} Ledger - {selectedLedgerStatement.ledger.name}</span>
                </h3>
                <p className="text-[11px] text-emerald-300">
                  Ledgers &gt; {selectedLedgerStatement.ledger.type} &gt; {selectedLedgerStatement.ledger.name}
                </p>
              </div>
              <button
                onClick={() => setShowStatementModal(false)}
                className="inline-flex items-center gap-1 px-3 py-1.5 bg-white/15 hover:bg-white/25 rounded-lg text-xs font-bold transition cursor-pointer"
              >
                <X className="w-4 h-4 text-white" />
                <span>Close</span>
              </button>
            </div>

            <div className="p-4 sm:p-5 space-y-4">
              {/* Top Filter Strip matching step_24_shot_1.png */}
              <div className="flex flex-wrap items-center justify-center gap-2 bg-slate-50 p-3 rounded-lg border border-slate-200">
                <select
                  value={stmtBranch}
                  onChange={(e) => setStmtBranch(e.target.value)}
                  className="px-2.5 py-1.5 bg-white border border-slate-300 rounded text-xs font-medium text-slate-800"
                >
                  <option value="ALL">ALL</option>
                  <option value="BHR001">MAIN BRANCH (BHR001)</option>
                  <option value="BHR002">TARPL0002 (BHR002)</option>
                  <option value="BRH003">TARPL SAVING (BRH003)</option>
                  <option value="SHEKHUPURA">SHEKHUPURA BRANCH (शेखुपुरा / सुजालपुर)</option>
                </select>
                <input
                  type="date"
                  value={stmtFromDate}
                  onChange={(e) => setStmtFromDate(e.target.value)}
                  className="px-2.5 py-1.5 bg-white border border-slate-300 rounded text-xs text-slate-800"
                />
                <span className="text-slate-400 font-bold">-</span>
                <input
                  type="date"
                  value={stmtToDate}
                  onChange={(e) => setStmtToDate(e.target.value)}
                  className="px-2.5 py-1.5 bg-white border border-slate-300 rounded text-xs text-slate-800"
                />
                <label className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-700 px-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={stmtManualOnly}
                    onChange={(e) => setStmtManualOnly(e.target.checked)}
                    className="rounded border-slate-300"
                  />
                  <span>SHOW MANUAL ONLY</span>
                </label>
                <button
                  type="button"
                  onClick={() => {
                    setStmtPage(1);
                    loadLedgerStatement(stmtLedgerRef, { page: 1 });
                  }}
                  className="px-4 py-1.5 bg-[#f39c12] hover:bg-[#e08e0b] text-white font-bold text-xs rounded uppercase cursor-pointer"
                >
                  SEARCH
                </button>
              </div>

              {/* Prahlad 1:1 Summary Strip Table */}
              <div className="overflow-x-auto border border-slate-200 rounded-lg">
                <table className="w-full text-[11px] text-left">
                  <thead className="bg-slate-50 border-b border-slate-200 font-bold text-slate-700 uppercase">
                    <tr>
                      <th className="py-2 px-2.5">CODE</th>
                      <th className="py-2 px-2.5">GROUP</th>
                      <th className="py-2 px-2.5">NAME</th>
                      <th className="py-2 px-2.5">SYSTEM NAME</th>
                      <th className="py-2 px-2.5">IS SYSTEM</th>
                      <th className="py-2 px-2.5">SHOW IN DB</th>
                      <th className="py-2 px-2.5">TYPE</th>
                      <th className="py-2 px-2.5 text-right">TOTAL T.</th>
                      <th className="py-2 px-2.5 text-right">OPENING BAL.</th>
                      <th className="py-2 px-2.5 text-right">T. DEBITS</th>
                      <th className="py-2 px-2.5 text-right">T. CREDITS</th>
                      <th className="py-2 px-2.5 text-right">CLOSING BALANCE</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr className="bg-white">
                      <td className="py-2.5 px-2.5 font-mono font-bold">{selectedLedgerStatement.ledger.code}</td>
                      <td className="py-2.5 px-2.5 text-[#3c8dbc] font-medium">{selectedLedgerStatement.ledger.group || 'CASH & CASH EQUIVALENT'}</td>
                      <td className="py-2.5 px-2.5 font-bold">{selectedLedgerStatement.ledger.name}</td>
                      <td className="py-2.5 px-2.5 font-mono text-slate-600">{selectedLedgerStatement.ledger.system_name || selectedLedgerStatement.ledger.name}</td>
                      <td className="py-2.5 px-2.5">
                        <span className="px-2 py-0.5 rounded bg-[#00a65a] text-white font-bold text-[10px]">{selectedLedgerStatement.ledger.is_system || 'Yes'}</span>
                      </td>
                      <td className="py-2.5 px-2.5">
                        <span className="px-2 py-0.5 rounded bg-[#00a65a] text-white font-bold text-[10px]">{selectedLedgerStatement.ledger.show_in_db || 'Yes'}</span>
                      </td>
                      <td className="py-2.5 px-2.5">{selectedLedgerStatement.ledger.type}</td>
                      <td className="py-2.5 px-2.5 text-right font-mono">{selectedLedgerStatement.ledger.total_t ?? selectedLedgerStatement.statement?.length ?? 0}</td>
                      <td className="py-2.5 px-2.5 text-right font-mono">{formatAccountingNum(selectedLedgerStatement.ledger.opening_balance)}</td>
                      <td className="py-2.5 px-2.5 text-right font-mono font-bold text-slate-800">{formatAccountingNum(selectedLedgerStatement.ledger.total_debit)}</td>
                      <td className="py-2.5 px-2.5 text-right font-mono font-bold text-slate-800">{formatAccountingNum(selectedLedgerStatement.ledger.total_credit)}</td>
                      <td className="py-2.5 px-2.5 text-right font-mono font-bold text-indigo-800">{formatAccountingNum(selectedLedgerStatement.ledger.closing_balance)}</td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {/* Transactions Filter Strip matching step_24_shot_1.png */}
              <div>
                <h4 className="text-base font-normal text-slate-800 mb-2">Transactions</h4>
                <div className="grid grid-cols-1 sm:grid-cols-5 gap-2 items-end mb-3">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 mb-1">Description</label>
                    <input
                      type="text"
                      value={stmtSearch}
                      onChange={(e) => setStmtSearch(e.target.value)}
                      placeholder="Search Description"
                      className="w-full px-2.5 py-1.5 border border-slate-300 rounded text-xs"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 mb-1">Min Amount</label>
                    <input
                      type="number"
                      value={stmtMinAmt}
                      onChange={(e) => setStmtMinAmt(e.target.value)}
                      placeholder="Amount From"
                      className="w-full px-2.5 py-1.5 border border-slate-300 rounded text-xs"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 mb-1">Max Amount</label>
                    <input
                      type="number"
                      value={stmtMaxAmt}
                      onChange={(e) => setStmtMaxAmt(e.target.value)}
                      placeholder="Amount To"
                      className="w-full px-2.5 py-1.5 border border-slate-300 rounded text-xs"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 mb-1">Type</label>
                    <select
                      value={stmtTxType}
                      onChange={(e) => setStmtTxType(e.target.value)}
                      className="w-full px-2.5 py-1.5 border border-slate-300 rounded text-xs bg-white"
                    >
                      <option value="ALL">All</option>
                      <option value="DEBIT">Debit</option>
                      <option value="CREDIT">Credit</option>
                    </select>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => {
                        setStmtPage(1);
                        loadLedgerStatement(stmtLedgerRef, { page: 1 });
                      }}
                      className="px-3 py-1.5 bg-[#3c8dbc] hover:bg-[#367fa9] text-white font-bold text-xs rounded inline-flex items-center gap-1 cursor-pointer"
                    >
                      <Search className="w-3 h-3" /> SEARCH
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setStmtSearch(''); setStmtMinAmt(''); setStmtMaxAmt(''); setStmtTxType('ALL'); setStmtPage(1);
                        loadLedgerStatement(stmtLedgerRef, { search: '', minAmt: '', maxAmt: '', txType: 'ALL', page: 1 });
                      }}
                      className="px-3 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold text-xs rounded inline-flex items-center gap-1 cursor-pointer"
                    >
                      <RefreshCw className="w-3 h-3" /> CLEAR
                    </button>
                  </div>
                </div>

                {/* Transactions Table matching step_24_shot_1.png */}
                <div className="overflow-x-auto max-h-80 overflow-y-auto border border-slate-200 rounded-lg">
                  <table className="w-full text-xs text-left">
                    <thead className="bg-slate-50 border-b border-slate-200 text-[10px] uppercase font-bold text-slate-600 sticky top-0">
                      <tr>
                        <th className="py-2.5 px-3">BRANCH</th>
                        <th className="py-2.5 px-3">DATE</th>
                        <th className="py-2.5 px-3">DESCRIPTION</th>
                        <th className="py-2.5 px-3 text-center">IS SYSTEM</th>
                        <th className="py-2.5 px-3 text-right">O. BALANCE</th>
                        <th className="py-2.5 px-3 text-right">DEBIT</th>
                        <th className="py-2.5 px-3 text-right">CREDIT</th>
                        <th className="py-2.5 px-3 text-right">C. BALANCE</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-slate-700">
                      {loadingStatement ? (
                        <tr>
                          <td colSpan="8" className="py-8 text-center text-slate-400">Loading ledger statement...</td>
                        </tr>
                      ) : selectedLedgerStatement.statement?.length === 0 ? (
                        <tr>
                          <td colSpan="8" className="py-8 text-center text-slate-400">इस अवधि में कोई प्रविष्टि नहीं पाई गई।</td>
                        </tr>
                      ) : (
                        selectedLedgerStatement.statement?.map((s, idx) => (
                          <tr key={idx} className="hover:bg-slate-50 transition">
                            <td className="py-2.5 px-3 text-[11px] font-medium text-slate-700 whitespace-nowrap">{s.branch || 'MAIN BRANCH'}</td>
                            <td className="py-2.5 px-3 text-slate-600 whitespace-nowrap">{s.date}</td>
                            <td className="py-2.5 px-3 font-medium">
                              <button
                                type="button"
                                onClick={() => handleOpenTransactionBackground(s, selectedLedgerStatement.ledger)}
                                className="text-left text-[#2563eb] hover:text-[#1d4ed8] hover:underline cursor-pointer group flex flex-col items-start gap-0.5"
                                title="Click to view full payment mode, voucher & customer background"
                              >
                                <span className="inline-flex items-center gap-1">
                                  <span>{s.description || s.particulars}</span>
                                  <ChevronRight className="w-3.5 h-3.5 opacity-55 group-hover:opacity-100 group-hover:translate-x-0.5 transition shrink-0" />
                                </span>
                                <span className="flex flex-wrap items-center gap-1.5 text-[10px] no-underline">
                                  {s.voucher_no && <span className="font-mono text-slate-500">[{s.voucher_no}]</span>}
                                  {s.payment_mode && (
                                    <span className="px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200 font-bold uppercase">
                                      {s.payment_mode}
                                    </span>
                                  )}
                                  <span className="text-amber-700 font-semibold opacity-80 group-hover:opacity-100">
                                    • View Payment & Background
                                  </span>
                                </span>
                              </button>
                            </td>
                            <td className="py-2.5 px-3 text-center">
                              <span className={`px-2 py-0.5 rounded text-[10px] font-bold text-white ${s.is_system === 'Yes' ? 'bg-[#00a65a]' : 'bg-[#dd4b39]'}`}>
                                {s.is_system || 'Yes'}
                              </span>
                            </td>
                            <td className="py-2.5 px-3 text-right font-mono text-slate-700">
                              {formatAccountingNum(s.opening_balance ?? 0)}
                            </td>
                            <td className="py-2.5 px-3 text-right font-mono font-bold text-slate-800">
                              {s.debit > 0 ? formatAccountingNum(s.debit) : ''}
                            </td>
                            <td className="py-2.5 px-3 text-right font-mono font-bold text-slate-800">
                              {s.credit > 0 ? formatAccountingNum(s.credit) : ''}
                            </td>
                            <td className="py-2.5 px-3 text-right font-mono font-bold text-slate-900">
                              {formatAccountingNum(s.running_balance ?? s.balance ?? 0)}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>

                {selectedLedgerStatement.pagination && selectedLedgerStatement.pagination.totalRows > 0 && (
                  <div className="flex flex-wrap items-center justify-between gap-2 px-3 py-2.5 bg-slate-50 border-t border-slate-200 text-xs">
                    <span className="text-slate-600 font-medium">
                      Showing <strong className="text-slate-900">{selectedLedgerStatement.statement?.length || 0}</strong> of{' '}
                      <strong className="text-slate-900">{selectedLedgerStatement.pagination.totalRows.toLocaleString('en-IN')}</strong> rows
                      {' '}• Page <strong className="text-slate-900">{selectedLedgerStatement.pagination.page}</strong> of{' '}
                      <strong className="text-slate-900">{selectedLedgerStatement.pagination.totalPages}</strong>
                    </span>
                    {selectedLedgerStatement.pagination.totalPages > 1 && (
                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          disabled={selectedLedgerStatement.pagination.page <= 1 || loadingStatement}
                          onClick={() => {
                            const nextP = Math.max(1, selectedLedgerStatement.pagination.page - 1);
                            setStmtPage(nextP);
                            loadLedgerStatement(stmtLedgerRef, { page: nextP });
                          }}
                          className="px-3 py-1 bg-white border border-slate-300 rounded font-bold text-slate-700 hover:bg-slate-100 disabled:opacity-40 cursor-pointer"
                        >
                          ← Prev
                        </button>
                        <button
                          type="button"
                          disabled={selectedLedgerStatement.pagination.page >= selectedLedgerStatement.pagination.totalPages || loadingStatement}
                          onClick={() => {
                            const nextP = Math.min(selectedLedgerStatement.pagination.totalPages, selectedLedgerStatement.pagination.page + 1);
                            setStmtPage(nextP);
                            loadLedgerStatement(stmtLedgerRef, { page: nextP });
                          }}
                          className="px-3 py-1 bg-white border border-slate-300 rounded font-bold text-slate-700 hover:bg-slate-100 disabled:opacity-40 cursor-pointer"
                        >
                          Next →
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 5A-2. Clickable Transaction Payment & Background Modal */}
      <TransactionBackgroundModal
        detail={selectedTxDetail}
        loading={loadingTxDetail}
        onClose={() => setSelectedTxDetail(null)}
        formatAccountingNum={formatAccountingNum}
      />

      {/* ======================================================== */}
      {/* 5B. EDIT LEDGER MODAL (1:1 /edit SHOW IN DAY BOOK TOGGLE)*/}
      {/* ======================================================== */}
      {editingLedger && (
        <div className="fixed inset-0 z-[210] flex justify-center items-center p-4 bg-slate-950/75 backdrop-blur-xs">
          <div className="bg-white rounded-xl shadow-2xl border border-slate-200 w-full max-w-md overflow-hidden">
            <div className="px-5 py-3.5 bg-[#082e20] text-white flex items-center justify-between">
              <h3 className="text-sm font-bold">EDIT LEDGER - {editingLedger.name}</h3>
              <button onClick={() => setEditingLedger(null)} className="text-white/70 hover:text-white cursor-pointer">
                <X className="w-4 h-4" />
              </button>
            </div>
            <form onSubmit={handleSaveLedgerEdit} className="p-5 space-y-4 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Display Name *</label>
                <input
                  type="text"
                  value={editingLedger.name}
                  onChange={(e) => setEditingLedger(prev => ({ ...prev, name: e.target.value }))}
                  className="w-full px-3 py-2 border border-slate-300 rounded focus:outline-none focus:border-[#3c8dbc]"
                  required
                />
              </div>
              <div>
                <label className="block font-bold text-slate-700 mb-1">System Name</label>
                <input type="text" value={editingLedger.system_name} disabled className="w-full px-3 py-2 border border-slate-200 rounded bg-slate-100 text-slate-500" />
              </div>
              <div>
                <label className="block font-bold text-slate-700 mb-1">Code</label>
                <input type="text" value={editingLedger.code} disabled className="w-full px-3 py-2 border border-slate-200 rounded bg-slate-100 text-slate-500" />
              </div>
              <div className="flex items-center justify-between py-2 border-y border-slate-100">
                <span className="font-bold text-slate-700">Is Bank Account</span>
                <div className="flex items-center gap-4">
                  <label className="flex items-center gap-1 cursor-pointer">
                    <input type="radio" checked={!!editingLedger.is_bank_account} onChange={() => setEditingLedger(prev => ({ ...prev, is_bank_account: true }))} /> Yes
                  </label>
                  <label className="flex items-center gap-1 cursor-pointer">
                    <input type="radio" checked={!editingLedger.is_bank_account} onChange={() => setEditingLedger(prev => ({ ...prev, is_bank_account: false }))} /> No
                  </label>
                </div>
              </div>
              <div className="flex items-center justify-between py-2 border-b border-slate-100">
                <span className="font-bold text-slate-700">Show In Day Book</span>
                <div className="flex items-center gap-4">
                  <label className="flex items-center gap-1 cursor-pointer font-semibold text-emerald-700">
                    <input type="radio" checked={!!editingLedger.show_in_db} onChange={() => setEditingLedger(prev => ({ ...prev, show_in_db: true }))} /> Yes
                  </label>
                  <label className="flex items-center gap-1 cursor-pointer font-semibold text-rose-700">
                    <input type="radio" checked={!editingLedger.show_in_db} onChange={() => setEditingLedger(prev => ({ ...prev, show_in_db: false }))} /> No
                  </label>
                </div>
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button type="button" onClick={() => setEditingLedger(null)} className="px-4 py-2 bg-[#dd4b39] text-white font-bold rounded cursor-pointer">CANCEL</button>
                <button type="submit" disabled={savingLedgerEdit} className="px-4 py-2 bg-[#00a65a] text-white font-bold rounded cursor-pointer">
                  {savingLedgerEdit ? 'SAVING...' : 'UPDATE ACCOUNT'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* 6. PRAHLAD 1:1 FULL PRINT PREVIEW OVERLAY (step_29 & 24) */}
      {/* ======================================================== */}
      {showPrintPreview && (
        <div className="fixed inset-0 z-[220] bg-slate-800/90 backdrop-blur-xs overflow-y-auto p-4 print:hidden">
          <div className="max-w-5xl mx-auto">
            <div className="flex items-center justify-between mb-4 bg-slate-900 px-4 py-2.5 rounded-xl border border-slate-700">
              <span className="text-xs font-bold text-slate-200">
                Print Preview — {viewFormat === 'format1' ? 'Format 1 (Summary Statement)' : 'Format 2 (रोज किर्द तपशील)'}
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="px-5 py-1.5 bg-[#00a65a] hover:bg-[#008d4c] text-white font-bold text-xs rounded uppercase tracking-wider cursor-pointer underline"
                >
                  PRINT
                </button>
                <button
                  type="button"
                  onClick={() => setShowPrintPreview(false)}
                  className="px-3 py-1.5 bg-slate-700 hover:bg-slate-600 text-white font-bold text-xs rounded cursor-pointer"
                >
                  Close
                </button>
              </div>
            </div>
            <div className="bg-white rounded-lg shadow-2xl overflow-hidden">
              {renderPrintableSheetBody()}
            </div>
          </div>
        </div>
      )}

      {/* Hidden DOM container used exclusively by browser @media print */}
      <div id="printable-daybook" className="hidden print:block">
        {renderPrintableSheetBody()}
      </div>

    </div>
  );
}
