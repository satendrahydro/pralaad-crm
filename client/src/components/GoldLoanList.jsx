import React, { useState, useEffect } from 'react';
import { 
  Gem, 
  Coins, 
  Search, 
  Plus, 
  RefreshCw, 
  Printer, 
  CheckCircle2, 
  AlertCircle, 
  Scale, 
  ShieldCheck, 
  Lock, 
  ArrowUpRight, 
  ArrowDownLeft,
  X,
  FileText,
  User,
  UserPlus,
  Phone
} from 'lucide-react';
import { apiRequest, formatDate, formatINR } from '../utils';
import PaginationBar from './PaginationBar';
import DateInput from './DateInput';

export default function GoldLoanList() {
  const [loans, setLoans] = useState([]);
  const [kpis, setKpis] = useState(null);
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 25;

  // Sanction Modal State
  const [showSanctionModal, setShowSanctionModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [sanctionError, setSanctionError] = useState('');
  const [sanctionSuccess, setSanctionSuccess] = useState('');

  const [newLoan, setNewLoan] = useState({
    customer_id: '',
    gold_items_detail: '',
    gross_weight_grams: '',
    net_weight_grams: '',
    purity_karat: 22,
    valuation_rate_per_gram: 6800,
    sanctioned_amount: '',
    interest_rate: 15.0,
    tenure_months: 12,
    locker_location: 'Vault Locker A-1',
    pouch_number: '',
    disbursement_mode: 'CASH',
    disbursal_date: new Date().toISOString().split('T')[0]
  });

  // Repayment Modal State
  const [showRepayModal, setShowRepayModal] = useState(false);
  const [selectedLoan, setSelectedLoan] = useState(null);
  const [repayAmount, setRepayAmount] = useState('');
  const [repayDate, setRepayDate] = useState(new Date().toISOString().split('T')[0]);
  const [repayMode, setRepayMode] = useState('CASH');
  const [repayRef, setRepayRef] = useState('');
  const [repayNarration, setRepayNarration] = useState('');
  const [repaying, setRepaying] = useState(false);

  // Quick Add Customer State
  const [showQuickAddCustomer, setShowQuickAddCustomer] = useState(false);
  const [quickCustLoading, setQuickCustLoading] = useState(false);
  const [quickCustError, setQuickCustError] = useState('');
  const [quickCustForm, setQuickCustForm] = useState({
    full_name: '',
    phone: '',
    father_name: '',
    pan_card: '',
    aadhaar_no: '',
    address: '',
    branch: 'MAIN BRANCH (BHR001 - Bijnor)'
  });

  const fetchLoans = async () => {
    setLoading(true);
    try {
      const res = await apiRequest('/loans/gold-loans');
      if (res && res.success) {
        setLoans(res.loans || []);
        setKpis(res.kpis || {});
      }
    } catch (err) {
      console.error('Failed to fetch gold loans:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchCustomers = async () => {
    try {
      const res = await apiRequest('/customers');
      if (res && res.customers) {
        setCustomers(res.customers);
      }
    } catch (err) {
      console.error('Failed to fetch customers:', err);
    }
  };

  useEffect(() => {
    fetchLoans();
    fetchCustomers();
  }, []);

  // Calculated values for Gold Valuation
  const netWeightNum = parseFloat(newLoan.net_weight_grams) || 0;
  const rateNum = parseFloat(newLoan.valuation_rate_per_gram) || 6800;
  const totalValuation = netWeightNum * rateNum;
  const maxSanctionAllowed = Math.round(((totalValuation * 0.75) + Number.EPSILON) * 100) / 100; // 75% LTV
  const sanctionedNum = parseFloat(newLoan.sanctioned_amount) || 0;
  const calculatedMonthlyInterest = Math.round((((sanctionedNum * ((parseFloat(newLoan.interest_rate) || 0) / 100)) / 12) + Number.EPSILON) * 100) / 100;

  const handleQuickAddCustomer = async (e) => {
    if (e) e.preventDefault();
    if (!quickCustForm.full_name.trim()) {
      setQuickCustError('कृपया ग्राहक का पूरा नाम दर्ज करें।');
      return;
    }
    if (!quickCustForm.phone.trim()) {
      setQuickCustError('कृपया 10-अंकीय मोबाइल नंबर दर्ज करें।');
      return;
    }

    setQuickCustLoading(true);
    setQuickCustError('');
    try {
      const res = await apiRequest('/customers', {
        method: 'POST',
        body: JSON.stringify({
          ...quickCustForm,
          kyc_status: quickCustForm.pan_card ? 'FULL_KYC' : 'PENDING'
        })
      });
      if (res && res.success && res.customer) {
        setCustomers(prev => [res.customer, ...prev]);
        setNewLoan(prev => ({ ...prev, customer_id: String(res.customer.id) }));
        setShowQuickAddCustomer(false);
        setQuickCustForm({
          full_name: '',
          phone: '',
          father_name: '',
          pan_card: '',
          aadhaar_no: '',
          address: '',
          branch: 'MAIN BRANCH (BHR001 - Bijnor)'
        });
      } else {
        setQuickCustError(res?.message || 'ग्राहक जोड़ने में समस्या आई।');
      }
    } catch (err) {
      setQuickCustError(err.message || 'त्रुटि: ग्राहक सेव नहीं हो सका।');
    } finally {
      setQuickCustLoading(false);
    }
  };

  const handleSanctionSubmit = async (e) => {
    e.preventDefault();
    setSanctionError('');
    setSanctionSuccess('');

    if (!newLoan.customer_id) {
      setSanctionError('Please select a customer.');
      return;
    }
    if (!newLoan.gold_items_detail.trim()) {
      setSanctionError('Please enter gold ornaments description.');
      return;
    }
    if (netWeightNum <= 0) {
      setSanctionError('Please enter valid gold net weight.');
      return;
    }
    if (sanctionedNum <= 0) {
      setSanctionError('Please enter valid loan amount.');
      return;
    }
    if (sanctionedNum > maxSanctionAllowed) {
      setSanctionError(`Sanction amount cannot exceed ₹${maxSanctionAllowed.toLocaleString('en-IN')} (75% LTV limit).`);
      return;
    }

    setSubmitting(true);
    try {
      const res = await apiRequest('/loans/gold-loans', {
        method: 'POST',
        body: JSON.stringify(newLoan)
      });

      if (res && res.success) {
        setSanctionSuccess(res.message || 'Gold Loan sanctioned successfully!');
        setTimeout(() => {
          setShowSanctionModal(false);
          setSanctionSuccess('');
          setNewLoan({
            customer_id: '',
            gold_items_detail: '',
            gross_weight_grams: '',
            net_weight_grams: '',
            purity_karat: 22,
            valuation_rate_per_gram: 6800,
            sanctioned_amount: '',
            interest_rate: 15.0,
            tenure_months: 12,
            locker_location: 'Vault Locker A-1',
            pouch_number: '',
            disbursement_mode: 'CASH'
          });
          fetchLoans();
        }, 1000);
      } else {
        setSanctionError(res?.message || 'Failed to sanction gold loan.');
      }
    } catch (err) {
      setSanctionError(err.message || 'Error sanctioning gold loan.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleRepaySubmit = async (e) => {
    e.preventDefault();
    if (!repayAmount || parseFloat(repayAmount) <= 0) return;
    setRepaying(true);
    try {
      const res = await apiRequest('/loans/gold-loans/repay', {
        method: 'POST',
        body: JSON.stringify({
          loan_id: selectedLoan.id,
          amount: parseFloat(repayAmount),
          payment_mode: repayMode,
          payment_date: repayDate,
          repayment_date: repayDate,
          reference_no: repayRef,
          narration: repayNarration
        })
      });

      if (res && res.success) {
        setShowRepayModal(false);
        setSelectedLoan(null);
        setRepayAmount('');
        fetchLoans();
      } else {
        alert(res?.message || 'Failed to process repayment.');
      }
    } catch (err) {
      alert(err.message || 'Error processing repayment.');
    } finally {
      setRepaying(false);
    }
  };

  const filteredLoans = loans.filter(l => {
    const matchesSearch = !search || 
      l.loan_number.toLowerCase().includes(search.toLowerCase()) ||
      l.customer_name.toLowerCase().includes(search.toLowerCase()) ||
      l.gold_items_detail.toLowerCase().includes(search.toLowerCase()) ||
      l.pouch_number.toLowerCase().includes(search.toLowerCase());
    const matchesStatus = statusFilter === 'ALL' || l.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const selectedCustomerObj = customers.find(c => String(c.id) === String(newLoan.customer_id));

  return (
    <div className="space-y-6">
      {/* 1. Header & Actions */}
      <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-200 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-amber-500 flex items-center justify-center text-slate-950 font-bold shadow-xs">
              <Gem className="w-5 h-5" />
            </div>
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Gold Loans (गोल्ड लोन)</h1>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-900 border border-amber-300">
              Gold Collateral Secured
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Gold ornament valuation, weight & karat appraisal, locker vault tracking, and Day Book cash disbursement/recovery
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowSanctionModal(true)}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold text-xs shadow-xs transition cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>+ Sanction New Gold Loan</span>
          </button>
        </div>
      </div>

      {/* 2. Gold KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Active Gold Loans</span>
          <div className="text-xl font-black text-slate-800 mt-1">
            {kpis?.total_loans || 0} Accounts
          </div>
          <span className="text-[10px] text-slate-400">Pouch in Vault</span>
        </div>

        <div className="bg-white p-4 rounded-xl border border-amber-200 shadow-sm bg-gradient-to-br from-white to-amber-50/40">
          <span className="text-[11px] font-bold text-amber-800 uppercase tracking-wider block flex items-center gap-1">
            <Scale className="w-3.5 h-3.5" /> Gold Weight in Locker
          </span>
          <div className="text-xl font-black text-amber-900 mt-1 font-mono">
            {(kpis?.total_gold_weight_grams || 0).toFixed(1)}g
          </div>
          <span className="text-[10px] text-amber-700 font-semibold">22K / 24K Net Purity</span>
        </div>

        <div className="bg-white p-4 rounded-xl border border-amber-200 shadow-sm bg-gradient-to-br from-white to-amber-50/40">
          <span className="text-[11px] font-bold text-amber-800 uppercase tracking-wider block">Gold Market Valuation</span>
          <div className="text-xl font-black text-amber-900 mt-1 font-mono">
            ₹{(kpis?.total_valuation || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })}
          </div>
          <span className="text-[10px] text-amber-700">Valued @ ₹6,800/g</span>
        </div>

        <div className="bg-white p-4 rounded-xl border border-indigo-200 shadow-sm bg-gradient-to-br from-white to-indigo-50/40">
          <span className="text-[11px] font-bold text-indigo-800 uppercase tracking-wider block">Outstanding Principal</span>
          <div className="text-xl font-black text-indigo-900 mt-1 font-mono">
            ₹{(kpis?.total_outstanding || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })}
          </div>
          <span className="text-[10px] text-indigo-700 font-semibold">Active Loan Assets</span>
        </div>

        <div className="bg-white p-4 rounded-xl border border-emerald-200 shadow-sm bg-gradient-to-br from-white to-emerald-50/40">
          <span className="text-[11px] font-bold text-emerald-800 uppercase tracking-wider block flex items-center gap-1">
            <CheckCircle2 className="w-3.5 h-3.5" /> Total Recovered
          </span>
          <div className="text-xl font-black text-emerald-900 mt-1 font-mono">
            ₹{(kpis?.total_recovered || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })}
          </div>
          <span className="text-[10px] text-emerald-700">Principal + Interest</span>
        </div>
      </div>

      {/* 3. Gold Loans Table */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex flex-col md:flex-row items-start md:items-center justify-between gap-3">
          <div>
            <h2 className="text-sm font-bold text-slate-900">Gold Loan Ledger & Ornament Safe-Custody</h2>
            <p className="text-xs text-slate-500">Live loans secured against verified gold jewelry</p>
          </div>

          <div className="flex items-center gap-2 w-full md:w-auto">
            <div className="relative flex-1 md:w-64">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search loan no, borrower, pouch..."
                className="w-full text-xs pl-8 pr-3 py-1.5 rounded-lg border border-slate-200 focus:outline-none focus:border-amber-500"
              />
            </div>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="text-xs py-1.5 px-2.5 rounded-lg border border-slate-200 font-medium"
            >
              <option value="ALL">All Status</option>
              <option value="ACTIVE">ACTIVE</option>
              <option value="REPAID_RELEASED">REPAID & RELEASED</option>
            </select>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead className="bg-slate-50 border-b border-slate-200 text-[10px] uppercase font-bold text-slate-500 tracking-wider">
              <tr>
                <th className="py-2.5 px-3">Loan No</th>
                <th className="py-2.5 px-3">Borrower (Customer)</th>
                <th className="py-2.5 px-3">Collateral Ornaments</th>
                <th className="py-2.5 px-3">Net Wt / Karat</th>
                <th className="py-2.5 px-3">Locker & Pouch</th>
                <th className="py-2.5 px-3 text-amber-950 bg-amber-100/70 whitespace-nowrap">DISBURSED DATE (डिसबर्स तारीख)</th>
                <th className="py-2.5 px-3 text-amber-950 bg-amber-100/70 whitespace-nowrap">DUE / MATURITY (देय तिथि)</th>
                <th className="py-2.5 px-3 text-right">Sanctioned</th>
                <th className="py-2.5 px-3 text-right">Outstanding</th>
                <th className="py-2.5 px-3">Monthly Byaj</th>
                <th className="py-2.5 px-3">Status</th>
                <th className="py-2.5 px-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {filteredLoans.slice((Math.min(currentPage, Math.max(1, Math.ceil(filteredLoans.length / pageSize))) - 1) * pageSize, Math.min(currentPage, Math.max(1, Math.ceil(filteredLoans.length / pageSize))) * pageSize).map((l) => (
                <tr key={l.id} className="hover:bg-slate-50 transition">
                  <td className="py-3 px-3 font-mono font-bold text-amber-700 flex items-center gap-1">
                    <Gem className="w-3.5 h-3.5 text-amber-500" />
                    <span>{l.loan_number}</span>
                  </td>
                  <td className="py-3 px-3 font-bold text-slate-900">
                    <div>{l.customer_name}</div>
                    <div className="text-[10px] text-slate-400 font-normal">{l.customer_phone}</div>
                  </td>
                  <td className="py-3 px-3 text-slate-700 max-w-xs truncate font-medium">
                    {l.gold_items_detail}
                  </td>
                  <td className="py-3 px-3 font-mono">
                    <span className="font-bold text-slate-900">{l.net_weight_grams}g</span>
                    <span className="text-[10px] text-slate-400 ml-1 font-semibold">({l.purity_karat}K)</span>
                  </td>
                  <td className="py-3 px-3">
                    <div className="font-mono text-[11px] font-bold text-slate-800">{l.pouch_number}</div>
                    <div className="text-[10px] text-slate-400 flex items-center gap-1">
                      <Lock className="w-3 h-3 text-slate-400" />
                      {l.locker_location}
                    </div>
                  </td>
                  {/* Disbursed Date */}
                  <td className="py-3 px-3 font-mono font-bold text-slate-800 bg-amber-50/20 whitespace-nowrap">
                    {formatDate(l.disbursal_date)}
                  </td>
                  {/* Maturity Date */}
                  <td className="py-3 px-3 font-mono font-bold text-slate-800 bg-amber-50/20 whitespace-nowrap">
                    {formatDate(l.maturity_date)}
                  </td>
                  <td className="py-3 px-3 text-right font-mono font-bold text-slate-900">
                    ₹{l.sanctioned_amount.toLocaleString('en-IN')}
                  </td>
                  <td className="py-3 px-3 text-right font-mono font-black text-rose-700">
                    ₹{l.outstanding_principal.toLocaleString('en-IN')}
                  </td>
                  <td className="py-3 px-3 font-mono text-emerald-700 font-bold">
                    ₹{l.monthly_interest.toLocaleString('en-IN')}/mo
                  </td>
                  <td className="py-3 px-3">
                    <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold ${
                      l.status === 'ACTIVE' ? 'bg-amber-100 text-amber-900 border border-amber-300' : 'bg-emerald-100 text-emerald-900'
                    }`}>
                      {l.status}
                    </span>
                  </td>
                  <td className="py-3 px-3 text-right">
                    {l.status === 'ACTIVE' && (
                      <button
                        onClick={() => {
                          setSelectedLoan(l);
                          setRepayAmount(String(l.monthly_interest || ''));
                          setRepayDate(new Date().toISOString().split('T')[0]);
                          setRepayRef(`REPAY-GL-${Date.now().toString().slice(-6)}`);
                          setRepayNarration(`Gold loan monthly interest repayment for ${l.loan_number}`);
                          setShowRepayModal(true);
                        }}
                        className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold transition cursor-pointer"
                      >
                        Repay / Byaj
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <PaginationBar totalItems={filteredLoans.length} page={currentPage} pageSize={pageSize} onPageChange={setCurrentPage} label="gold loans" />
      </div>

      {/* 4. SANCTION NEW GOLD LOAN MODAL */}
      {showSanctionModal && (
        <div className="fixed inset-0 z-[200] flex justify-center items-start pt-6 sm:pt-8 pb-10 p-3 sm:p-6 bg-slate-950/80 backdrop-blur-sm overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-lg overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="px-6 py-4 bg-gradient-to-r from-amber-500 to-amber-600 text-slate-950 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-white/20 flex items-center justify-center">
                  <Gem className="w-5 h-5 text-slate-950" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-950">Sanction New Gold Loan (नया स्वर्ण ऋण)</h3>
                  <p className="text-[11px] text-slate-900 font-medium">Gold appraisal, LTV 75% limit & live Day Book cash disbursal</p>
                </div>
              </div>
              <button 
                type="button"
                onClick={() => setShowSanctionModal(false)}
                className="inline-flex items-center gap-1 px-3 py-1.5 bg-black/20 hover:bg-black/30 text-slate-950 rounded-xl text-xs font-bold transition cursor-pointer"
                title="Close"
              >
                <X className="w-4 h-4 stroke-[2.5]" />
                <span>✕ Close</span>
              </button>
            </div>

            <form onSubmit={handleSanctionSubmit} className="p-6 space-y-4">
              {sanctionError && (
                <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 flex items-center gap-2 text-rose-700 text-xs">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{sanctionError}</span>
                </div>
              )}

              {sanctionSuccess && (
                <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center gap-2 text-emerald-800 text-xs">
                  <CheckCircle2 className="w-4 h-4 shrink-0" />
                  <span>{sanctionSuccess}</span>
                </div>
              )}

              {/* Customer Selector with 1-Click Quick Add */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                    Borrower / Customer (ऋण लेने वाला सदस्य) *
                  </label>
                  <button
                    type="button"
                    onClick={() => {
                      setShowQuickAddCustomer(!showQuickAddCustomer);
                      setQuickCustError('');
                    }}
                    className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-900 bg-amber-100 hover:bg-amber-200 px-2.5 py-1 rounded-lg border border-amber-300 transition cursor-pointer shadow-xs"
                    title="नया कस्टमर ऑनबोर्ड करें"
                  >
                    <UserPlus className="w-3.5 h-3.5 text-amber-800" />
                    <span>{showQuickAddCustomer ? '✕ Close Registration' : '+ New Customer (नया सदस्य जोड़ें)'}</span>
                  </button>
                </div>

                {/* Inline Quick Add Customer Form */}
                {showQuickAddCustomer && (
                  <div className="mb-3 p-3.5 bg-gradient-to-br from-amber-50 to-orange-50 border-2 border-amber-400 rounded-xl space-y-3 animate-fadeIn text-xs shadow-sm">
                    <div className="flex items-center justify-between pb-1.5 border-b border-amber-200">
                      <div className="font-bold text-amber-950 flex items-center gap-1.5 text-xs">
                        <UserPlus className="w-4 h-4 text-amber-700" />
                        <span>Quick Walk-in Borrower Onboarding (नया सदस्य पंजीकरण)</span>
                      </div>
                      <span className="text-[10px] bg-amber-200 text-amber-900 px-2 py-0.5 rounded-full font-bold">
                        Instant 1-Click
                      </span>
                    </div>

                    {quickCustError && (
                      <div className="p-2 bg-rose-100 border border-rose-300 text-rose-800 rounded-lg text-xs font-medium">
                        {quickCustError}
                      </div>
                    )}

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                      <div>
                        <label className="block text-[11px] font-bold text-slate-700 mb-0.5">
                          Full Name (पूरा नाम) *
                        </label>
                        <input
                          type="text"
                          required
                          placeholder="e.g. Ramesh Kumar"
                          value={quickCustForm.full_name}
                          onChange={(e) => setQuickCustForm(prev => ({ ...prev, full_name: e.target.value }))}
                          className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-semibold focus:ring-2 focus:ring-amber-500"
                        />
                      </div>

                      <div>
                        <label className="block text-[11px] font-bold text-slate-700 mb-0.5">
                          Mobile Number (फोन नंबर) *
                        </label>
                        <input
                          type="tel"
                          required
                          placeholder="10-digit mobile"
                          value={quickCustForm.phone}
                          onChange={(e) => setQuickCustForm(prev => ({ ...prev, phone: e.target.value }))}
                          className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-semibold focus:ring-2 focus:ring-amber-500"
                        />
                      </div>

                      <div>
                        <label className="block text-[11px] font-bold text-slate-700 mb-0.5">
                          Father / Spouse Name (पिता/पति)
                        </label>
                        <input
                          type="text"
                          placeholder="e.g. Shri Shyam Lal"
                          value={quickCustForm.father_name}
                          onChange={(e) => setQuickCustForm(prev => ({ ...prev, father_name: e.target.value }))}
                          className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-amber-500"
                        />
                      </div>

                      <div>
                        <label className="block text-[11px] font-bold text-slate-700 mb-0.5">
                          Aadhaar / PAN Card
                        </label>
                        <input
                          type="text"
                          placeholder="XXXX-XXXX-XXXX"
                          value={quickCustForm.aadhaar_no}
                          onChange={(e) => setQuickCustForm(prev => ({ ...prev, aadhaar_no: e.target.value, pan_card: e.target.value }))}
                          className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-mono focus:ring-2 focus:ring-amber-500"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 mb-0.5">
                        Address / Village (पता)
                      </label>
                      <input
                        type="text"
                        placeholder="Village / Mohalla, Tehsil, Bijnor"
                        value={quickCustForm.address}
                        onChange={(e) => setQuickCustForm(prev => ({ ...prev, address: e.target.value }))}
                        className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-amber-500"
                      />
                    </div>

                    <div className="flex items-center justify-end gap-2 pt-1">
                      <button
                        type="button"
                        onClick={() => setShowQuickAddCustomer(false)}
                        className="px-3 py-1.5 bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 rounded-lg font-bold text-xs transition cursor-pointer"
                      >
                        Cancel
                      </button>
                      <button
                        type="button"
                        disabled={quickCustLoading}
                        onClick={handleQuickAddCustomer}
                        className="px-4 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-lg font-bold text-xs shadow-xs transition flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                      >
                        {quickCustLoading ? (
                          <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                        ) : (
                          <CheckCircle2 className="w-3.5 h-3.5" />
                        )}
                        <span>Save & Select Borrower (सदस्य बनाएं और चुनें)</span>
                      </button>
                    </div>
                  </div>
                )}

                <select
                  value={newLoan.customer_id}
                  onChange={(e) => {
                    if (e.target.value === '__NEW__') {
                      setShowQuickAddCustomer(true);
                    } else {
                      setNewLoan(prev => ({ ...prev, customer_id: e.target.value }));
                    }
                  }}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs font-bold text-slate-800 bg-white focus:outline-none focus:ring-2 focus:ring-amber-500"
                  required
                >
                  <option value="">-- Select Member / Borrower --</option>
                  <option value="__NEW__" className="text-amber-800 font-bold bg-amber-50">
                    ➕ + Register New Walk-in Customer (नया सदस्य जोड़ें)...
                  </option>
                  {customers.map(c => (
                    <option key={c.id} value={c.id}>{c.full_name} ({c.customer_code || `CUST-${c.id}`}) - {c.phone}</option>
                  ))}
                </select>

                {/* Selected Customer Card Preview */}
                {selectedCustomerObj && (
                  <div className="mt-2 p-2.5 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center justify-between text-xs animate-fadeIn">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-lg bg-emerald-600 text-white flex items-center justify-center font-bold text-xs">
                        <User className="w-4 h-4" />
                      </div>
                      <div>
                        <div className="font-bold text-slate-900 flex items-center gap-2">
                          <span>{selectedCustomerObj.full_name}</span>
                          <span className="text-[10px] bg-emerald-200 text-emerald-900 px-1.5 py-0.2 rounded font-mono font-bold">
                            {selectedCustomerObj.customer_code || `CUST-${selectedCustomerObj.id}`}
                          </span>
                        </div>
                        <div className="text-[11px] text-slate-500 flex items-center gap-2 mt-0.5">
                          <span>📱 {selectedCustomerObj.phone}</span>
                          {selectedCustomerObj.address && (
                            <>
                              <span>•</span>
                              <span className="truncate max-w-[200px]">📍 {selectedCustomerObj.address}</span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                    <span className="text-[10px] font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full border border-emerald-300">
                      Verified Borrower
                    </span>
                  </div>
                )}
              </div>

              {/* Gold Ornament Description */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Gold Ornaments Description (आभूषणों का विवरण) *
                </label>
                <input
                  type="text"
                  placeholder="e.g. 2 Gold Bangles, 1 Gold Chain, 2 Rings"
                  value={newLoan.gold_items_detail}
                  onChange={(e) => setNewLoan(prev => ({ ...prev, gold_items_detail: e.target.value }))}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-500"
                  required
                />
              </div>

              {/* Weight & Purity */}
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Gross Wt (g)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    placeholder="45.0"
                    value={newLoan.gross_weight_grams}
                    onChange={(e) => setNewLoan(prev => ({ ...prev, gross_weight_grams: e.target.value }))}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs font-mono font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Net Wt (g) *
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    placeholder="42.5"
                    value={newLoan.net_weight_grams}
                    onChange={(e) => setNewLoan(prev => ({ ...prev, net_weight_grams: e.target.value }))}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs font-mono font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-500"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Purity Karat
                  </label>
                  <select
                    value={newLoan.purity_karat}
                    onChange={(e) => setNewLoan(prev => ({ ...prev, purity_karat: e.target.value }))}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs font-bold text-slate-800 bg-white focus:outline-none focus:ring-2 focus:ring-amber-500"
                  >
                    <option value="22">22 Karat (916)</option>
                    <option value="24">24 Karat (999)</option>
                    <option value="20">20 Karat (833)</option>
                    <option value="18">18 Karat (750)</option>
                  </select>
                </div>
              </div>

              {/* Live Gold Valuation Card */}
              <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl">
                <div className="flex items-center justify-between text-xs text-amber-900">
                  <span>Market Valuation (@ ₹{rateNum}/g):</span>
                  <strong className="font-mono text-sm">₹{totalValuation.toLocaleString('en-IN')}</strong>
                </div>
                <div className="flex items-center justify-between text-xs text-amber-800 mt-1 font-bold">
                  <span>Max Sanction Allowed (75% LTV):</span>
                  <strong className="font-mono text-sm text-emerald-700">₹{maxSanctionAllowed.toLocaleString('en-IN')}</strong>
                </div>
              </div>

              {/* Sanction Amount & Disbursal Mode */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Sanction Amount (₹) *
                  </label>
                  <input
                    type="number"
                    max={maxSanctionAllowed || 10000000}
                    placeholder={`Max ₹${maxSanctionAllowed}`}
                    value={newLoan.sanctioned_amount}
                    onChange={(e) => setNewLoan(prev => ({ ...prev, sanctioned_amount: e.target.value }))}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs font-mono font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-500"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Disburse Via (खाता) *
                  </label>
                  <select
                    value={newLoan.disbursement_mode}
                    onChange={(e) => setNewLoan(prev => ({ ...prev, disbursement_mode: e.target.value }))}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs font-bold text-slate-800 bg-white focus:outline-none focus:ring-2 focus:ring-amber-500"
                  >
                    <option value="CASH">CASH BOOK (गल्ले से नकद)</option>
                    <option value="BANK_ONLINE">BANK BOOK (बैंक खाता / NEFT)</option>
                  </select>
                </div>
              </div>

              {/* Locker Location & Pouch */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Locker Safe Location
                  </label>
                  <input
                    type="text"
                    value={newLoan.locker_location}
                    onChange={(e) => setNewLoan(prev => ({ ...prev, locker_location: e.target.value }))}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Pouch / Packet Barcode
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. POUCH-GL-103"
                    value={newLoan.pouch_number}
                    onChange={(e) => setNewLoan(prev => ({ ...prev, pouch_number: e.target.value }))}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-500"
                  />
                </div>
              </div>

              {/* Monthly Interest note */}
              {sanctionedNum > 0 && (
                <div className="text-xs text-slate-600 bg-slate-50 p-2.5 rounded-xl border border-slate-200 flex items-center justify-between">
                  <span>Monthly Interest Payable @ 15% p.a.:</span>
                  <span className="font-mono font-bold text-emerald-700">₹{calculatedMonthlyInterest.toLocaleString('en-IN')}/mo</span>
                </div>
              )}

              {/* Disbursal Date */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Disbursal Date (डिसबर्स किस तारीख पर किया गया) *
                </label>
                <DateInput
                  required
                  value={newLoan.disbursal_date}
                  onChange={(e) => setNewLoan(prev => ({ ...prev, disbursal_date: e.target.value }))}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs font-mono font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>

              {/* Actions */}
              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setShowSanctionModal(false)}
                  className="px-4 py-2 border border-slate-300 rounded-xl text-xs font-bold text-slate-700 hover:bg-slate-50 transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="inline-flex items-center gap-1.5 px-5 py-2 bg-amber-500 hover:bg-amber-600 text-slate-950 rounded-xl text-xs font-bold shadow-xs transition cursor-pointer"
                >
                  {submitting ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
                  <span>Sanction & Disburse Cash</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 5. REPAYMENT MODAL */}
      {showRepayModal && selectedLoan && (
        <div className="fixed inset-0 z-[200] flex justify-center items-start pt-16 pb-10 p-4 bg-slate-950/80 backdrop-blur-xs overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="px-6 py-4 bg-emerald-600 text-white flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold">Gold Loan Repayment / Byaj</h3>
                <p className="text-[11px] text-white/80">{selectedLoan.loan_number} - {selectedLoan.customer_name}</p>
              </div>
              <button 
                type="button" 
                onClick={() => setShowRepayModal(false)} 
                className="inline-flex items-center gap-1 px-2.5 py-1 bg-white/20 hover:bg-white/30 text-white rounded-lg text-xs font-bold transition cursor-pointer"
                title="Close"
              >
                <X className="w-4 h-4 text-white" />
                <span>Close</span>
              </button>
            </div>

            <form onSubmit={handleRepaySubmit} className="p-6 space-y-4">
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs space-y-1">
                <div className="flex justify-between">
                  <span className="text-slate-500">Total Sanctioned:</span>
                  <span className="font-mono font-bold">₹{selectedLoan.sanctioned_amount.toLocaleString('en-IN')}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Current Outstanding:</span>
                  <span className="font-mono font-bold text-rose-700">₹{selectedLoan.outstanding_principal.toLocaleString('en-IN')}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Monthly Interest:</span>
                  <span className="font-mono font-bold text-emerald-700">₹{selectedLoan.monthly_interest.toLocaleString('en-IN')}</span>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Repayment Amount (₹) *
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={repayAmount}
                  onChange={(e) => setRepayAmount(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl text-base font-mono font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Repayment Date (जमा करने की तारीख) *
                </label>
                <DateInput
                  required
                  value={repayDate}
                  onChange={(e) => setRepayDate(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl font-mono font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Payment Mode *
                </label>
                <select
                  value={repayMode}
                  onChange={(e) => setRepayMode(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs font-bold text-slate-800 bg-white"
                >
                  <option value="CASH">CASH BOOK (गल्ले में जमा)</option>
                  <option value="BANK_ONLINE">BANK BOOK (बैंक खाता / UPI)</option>
                  <option value="CHEQUE">Bank Cheque / DD</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Receipt / UTR Reference No
                </label>
                <input
                  type="text"
                  placeholder="e.g. UTR-GL-9912 or RCPT-501"
                  value={repayRef}
                  onChange={(e) => setRepayRef(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl font-mono font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Narration / Remarks
                </label>
                <input
                  type="text"
                  value={repayNarration}
                  onChange={(e) => setRepayNarration(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs text-slate-800"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setShowRepayModal(false)}
                  className="px-4 py-2 border border-slate-300 rounded-xl text-xs font-bold text-slate-700 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={repaying}
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold cursor-pointer"
                >
                  {repaying ? 'Processing...' : 'Save & Record in Day Book'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
