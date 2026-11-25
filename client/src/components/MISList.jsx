import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { 
  Plus, 
  Search, 
  RotateCw, 
  Calendar, 
  User, 
  CreditCard, 
  Clock, 
  CheckCircle2, 
  AlertCircle, 
  DollarSign, 
  ArrowRight,
  Receipt,
  Eye,
  X,
  Send,
  BookOpen,
  ArrowDownLeft,
  ArrowUpRight,
  Printer,
  Download,
  Filter,
  Check,
  FileSpreadsheet,
  Sparkles
} from 'lucide-react';
import { formatINR, formatDate, apiRequest } from '../utils';
import { exportToExcel } from '../utils/excelExport';
import PaginationBar from './PaginationBar';

export default function MISList({ onOpenNewMIS, isEmployee = false, onViewCustomerProfile }) {
  const [accounts, setAccounts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 25;
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [selectedMIS, setSelectedMIS] = useState(null);
  const [misDetails, setMisDetails] = useState(null);
  const [detailsLoading, setDetailsLoading] = useState(false);
  const [activeModalTab, setActiveModalTab] = useState('passbook'); // 'passbook' | 'schedules'
  const [passbookFilter, setPassbookFilter] = useState('ALL'); // 'ALL' | 'CREDIT' | 'DEBIT'
  const [payoutModalOpen, setPayoutModalOpen] = useState(false);
  const [selectedSchedule, setSelectedSchedule] = useState(null);
  const [paymentRef, setPaymentRef] = useState('');
  const [disbursalDate, setDisbursalDate] = useState(new Date().toISOString().split('T')[0]);
  const [disbursalPayMode, setDisbursalPayMode] = useState('Online Transfer (NEFT)');

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        if (payoutModalOpen) setPayoutModalOpen(false);
        else if (selectedMIS) setSelectedMIS(null);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedMIS, payoutModalOpen]);

  const handleExportExcel = () => {
    if (!accounts.length) return alert('No MIS records to export');
    const rows = accounts.map(m => ({
      'MIS Number': m.mis_number || '',
      'Customer Name': m.customer_name || '',
      'Phone': m.customer_phone || '',
      'Deposit Amount (₹)': m.deposit_amount,
      'Annual Interest Rate (%)': m.annual_rate,
      'Tenure (Months)': m.tenure_months,
      'Monthly Payout (₹)': m.monthly_payout,
      'Payout Account': m.payout_account_no || '',
      'IFSC Code': m.payout_bank_ifsc || '',
      'Status': m.status || ''
    }));
    exportToExcel(rows, 'TARPL_MIS_Portfolio', 'Monthly Income Schemes');
  };

  const handleExportCSV = () => {
    if (!accounts.length) return alert('No MIS records to export');
    const headers = ['MIS Number', 'Customer Name', 'Phone', 'Deposit Amount', 'Annual Rate', 'Tenure Months', 'Monthly Payout', 'Payout Account', 'IFSC', 'Status'];
    const rows = accounts.map(m => [
      `"${m.mis_number || ''}"`,
      `"${m.customer_name || ''}"`,
      `"${m.customer_phone || ''}"`,
      m.deposit_amount,
      m.annual_rate,
      m.tenure_months,
      m.monthly_payout,
      `"${m.payout_account_no || ''}"`,
      `"${m.payout_bank_ifsc || ''}"`,
      `"${m.status || ''}"`
    ]);
    const csvContent = 'data:text/csv;charset=utf-8,\uFEFF' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const link = document.createElement('a');
    link.href = encodeURI(csvContent);
    link.download = `MIS_Portfolio_${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const fetchMIS = async () => {
    try {
      setLoading(true);
      let q = `/mis?status=${statusFilter}`;
      if (search) q += `&search=${encodeURIComponent(search)}`;
      const res = await apiRequest(q);
      if (res.success) setAccounts(res.accounts || []);
    } catch (e) {
      console.error('Error fetching MIS accounts:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMIS();
  }, [statusFilter, search]);

  const openDetails = async (mis) => {
    setSelectedMIS(mis);
    setActiveModalTab('passbook');
    setPassbookFilter('ALL');
    try {
      setDetailsLoading(true);
      const res = await apiRequest(`/mis/${mis.id}`);
      if (res.success) setMisDetails(res);
    } catch (e) {
      alert('Error loading MIS details: ' + e.message);
    } finally {
      setDetailsLoading(false);
    }
  };

  const handleDisbursePayout = async (e) => {
    e.preventDefault();
    if (!selectedMIS || !selectedSchedule) return;

    try {
      const res = await apiRequest(`/mis/${selectedMIS.id}/payouts/${selectedSchedule.id}/pay`, {
        method: 'POST',
        body: JSON.stringify({
          payment_reference: paymentRef || `NEFT-MIS-${Date.now().toString().slice(-6)}`,
          paid_date: disbursalDate || new Date().toISOString().split('T')[0],
          pay_mode: disbursalPayMode
        })
      });

      if (res.success) {
        alert(res.message || 'MIS Monthly Payout processed successfully');
        setPayoutModalOpen(false);
        openDetails(selectedMIS);
        fetchMIS();
      }
    } catch (err) {
      alert('Error disbursing payout: ' + err.message);
    }
  };

  return (
    <div className="space-y-6 animate-fadeIn pb-16">
      
      {/* 1. Header */}
      <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-xl font-bold text-slate-900 tracking-tight">Monthly Income Scheme (MIS)</h1>
            <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200">
              Guaranteed Monthly Yield
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Lump-sum capital investment with scheduled monthly interest payouts and 100% capital return at maturity
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={fetchMIS}
            className="p-2 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg border border-slate-200 transition cursor-pointer"
            title="Refresh"
          >
            <RotateCw className="w-4 h-4" />
          </button>

          {/* Dual Export: Excel (.xlsx) & CSV */}
          <div className="flex items-center rounded-xl border border-slate-200 bg-slate-100 p-0.5 shadow-2xs">
            <button
              id="mis-export-excel-btn"
              onClick={handleExportExcel}
              className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg text-xs flex items-center gap-1.5 transition cursor-pointer shadow-xs active:scale-95"
              title="Export to Microsoft Excel (.xlsx)"
            >
              <FileSpreadsheet className="w-3.5 h-3.5 text-white" />
              <span>Excel (.xlsx)</span>
            </button>
            <button
              id="mis-export-csv-btn"
              onClick={handleExportCSV}
              className="px-2.5 py-1.5 hover:bg-slate-200 text-slate-700 font-bold rounded-lg text-xs flex items-center gap-1 transition cursor-pointer"
              title="Export to CSV"
            >
              <Download className="w-3.5 h-3.5 text-slate-500" />
              <span>CSV</span>
            </button>
          </div>

          <button
            onClick={onOpenNewMIS}
            className="inline-flex items-center gap-2 px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-semibold shadow-xs transition cursor-pointer"
          >
            <Plus className="w-4 h-4" /> Start New MIS
          </button>
        </div>
      </div>

      {/* 2. Filters & Search */}
      <div className="bg-white rounded-xl border border-slate-200 p-3 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5 pointer-events-none" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by MIS number, customer name, phone..."
            className="w-full text-xs pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:border-slate-800 transition"
          />
        </div>

        <div className="flex items-center gap-2">
          {['ALL', 'ACTIVE', 'MATURED', 'CLOSED_PREMATURE'].map(st => (
            <button
              key={st}
              onClick={() => setStatusFilter(st)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer ${
                statusFilter === st 
                  ? 'bg-slate-900 text-white' 
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              {st}
            </button>
          ))}
        </div>
      </div>

      {/* 3. MIS Data Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold">
              <tr>
                <th className="py-3 px-4">MIS Number</th>
                <th className="py-3 px-4">Customer</th>
                <th className="py-3 px-4 text-right">Lump Sum Deposit</th>
                <th className="py-3 px-4 text-center">Tenure</th>
                <th className="py-3 px-4 text-center">Rate</th>
                <th className="py-3 px-4 text-right">Monthly Payout</th>
                <th className="py-3 px-4 text-right">Total Payout Liability</th>
                <th className="py-3 px-4 text-center">Status</th>
                <th className="py-3 px-4 text-center">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan="9" className="py-12 text-center text-slate-400">Loading monthly income schemes...</td>
                </tr>
              ) : accounts.length === 0 ? (
                <tr>
                  <td colSpan="9" className="py-12 text-center text-slate-400">No MIS accounts found.</td>
                </tr>
              ) : (
                accounts.slice((Math.min(currentPage, Math.max(1, Math.ceil(accounts.length / pageSize))) - 1) * pageSize, Math.min(currentPage, Math.max(1, Math.ceil(accounts.length / pageSize))) * pageSize).map(mis => (
                  <tr key={mis.id} className="hover:bg-slate-50/80 transition">
                    <td className="py-3 px-4 font-mono font-bold text-slate-900">{mis.mis_number}</td>
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => onViewCustomerProfile && onViewCustomerProfile(mis.customer_id)}
                          className="font-bold text-slate-900 hover:text-blue-700 hover:underline text-left cursor-pointer truncate max-w-[150px]"
                          title="Click to view Customer 360 Profile"
                        >
                          {mis.customer_name}
                        </button>
                        <button
                          type="button"
                          onClick={() => onViewCustomerProfile && onViewCustomerProfile(mis.customer_id)}
                          className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 bg-gradient-to-r from-emerald-600 to-teal-700 hover:from-emerald-700 hover:to-teal-800 text-white rounded-md transition shadow-2xs cursor-pointer active:scale-95 shrink-0"
                          title="Customer 360: View all active accounts & services"
                        >
                          <Sparkles className="w-2.5 h-2.5 text-amber-300" />
                          <span>360°</span>
                        </button>
                      </div>
                      <div className="text-[11px] text-slate-400 mt-0.5">{mis.customer_phone}</div>
                    </td>
                    <td className="py-3 px-4 text-right font-bold text-slate-900">{formatINR(mis.deposit_amount)}</td>
                    <td className="py-3 px-4 text-center text-slate-600">{mis.tenure_months} M</td>
                    <td className="py-3 px-4 text-center font-semibold text-blue-700">{mis.annual_rate}%</td>
                    <td className="py-3 px-4 text-right font-black text-emerald-700">{formatINR(mis.monthly_payout)}/mo</td>
                    <td className="py-3 px-4 text-right font-semibold text-slate-800">{formatINR(mis.total_payout_amount)}</td>
                    <td className="py-3 px-4 text-center">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        mis.status === 'ACTIVE' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-slate-100 text-slate-700'
                      }`}>
                        {mis.status}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-center">
                      <button
                        onClick={() => openDetails(mis)}
                        className="inline-flex items-center gap-1 px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-800 font-semibold rounded text-[11px] transition cursor-pointer"
                      >
                        <Eye className="w-3.5 h-3.5" /> Details
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        <PaginationBar totalItems={accounts.length} page={currentPage} pageSize={pageSize} onPageChange={setCurrentPage} label="MIS accounts" />
      </div>

      {/* 4. MIS Detailed Payout Schedule Drawer */}
      {selectedMIS && createPortal(
        <div 
          className="fixed inset-0 z-[9999] bg-slate-950/80 backdrop-blur-sm flex justify-center items-center p-3 sm:p-6 overflow-hidden"
          onClick={(e) => { if (e.target === e.currentTarget) setSelectedMIS(null); }}
        >
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-[98vw] 2xl:max-w-[1400px] w-full max-h-[88vh] flex flex-col overflow-hidden animate-fadeIn relative">
            
            {/* Pinned Top Header */}
            <div className="shrink-0 px-4 sm:px-6 py-3.5 border-b border-slate-200 bg-white flex items-center justify-between gap-3 shadow-xs z-10">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-10 h-10 rounded-xl bg-blue-50 border border-blue-200 flex items-center justify-center text-blue-700 font-black shrink-0">
                  MIS
                </div>
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="text-base font-bold text-slate-900 truncate">
                      {selectedMIS.mis_number} — {selectedMIS.customer_name}
                    </h2>
                    {onViewCustomerProfile && (
                      <button
                        type="button"
                        onClick={() => onViewCustomerProfile(selectedMIS.customer_id)}
                        className="px-2 py-0.5 bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 rounded text-xs font-semibold cursor-pointer transition flex items-center gap-1 shrink-0"
                        title="View Complete Customer 360° Profile & All Services"
                      >
                        👤 360° All Services
                      </button>
                    )}
                  </div>
                  <p className="text-xs text-slate-500 truncate">
                    {formatINR(selectedMIS.deposit_amount)} Principal • {selectedMIS.tenure_months} Months • {selectedMIS.annual_rate}% p.a.
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setSelectedMIS(null)}
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-slate-100 hover:bg-rose-50 text-slate-700 hover:text-rose-600 border border-slate-300 hover:border-rose-200 rounded-xl font-bold text-xs transition cursor-pointer active:scale-95 shrink-0"
                title="Close Passbook"
              >
                <X className="w-4 h-4 stroke-[2.5]" />
                <span>Close</span>
              </button>
            </div>

            <div className="p-4 sm:p-6 overflow-y-auto flex-1 space-y-4 min-h-0">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                  <span className="text-slate-400 block text-[11px]">Lump Sum Capital</span>
                  <span className="text-sm font-bold text-slate-900">{formatINR(selectedMIS.deposit_amount)}</span>
                </div>
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                  <span className="text-slate-400 block text-[11px]">Monthly Payout</span>
                  <span className="text-sm font-bold text-emerald-700">{formatINR(selectedMIS.monthly_payout)}</span>
                </div>
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                  <span className="text-slate-400 block text-[11px]">Total Yield</span>
                  <span className="text-sm font-bold text-slate-900">{formatINR(selectedMIS.total_payout_amount)}</span>
                </div>
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                  <span className="text-slate-400 block text-[11px]">Maturity Return</span>
                  <span className="text-sm font-bold text-blue-700">{formatINR(selectedMIS.deposit_amount)} (100%)</span>
                </div>
              </div>

              {/* Sub-Tabs: Passbook & Transactions Ledger vs Payout Schedule */}
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 pt-2 border-t border-slate-200">
                <div className="inline-flex rounded-xl bg-slate-100 p-1 border border-slate-200 text-xs font-bold gap-1 shadow-inner">
                  <button
                    onClick={() => setActiveModalTab('passbook')}
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg transition cursor-pointer ${
                      activeModalTab === 'passbook'
                        ? 'bg-white text-indigo-700 shadow-sm border border-slate-200/80 font-black'
                        : 'text-slate-600 hover:text-slate-900 font-semibold'
                    }`}
                  >
                    <BookOpen className="w-4 h-4 text-indigo-600" />
                    <span>📖 पासबुक खाता विवरण (Passbook Transactions Ledger)</span>
                  </button>
                  <button
                    onClick={() => setActiveModalTab('schedules')}
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg transition cursor-pointer ${
                      activeModalTab === 'schedules'
                        ? 'bg-white text-emerald-700 shadow-sm border border-slate-200/80 font-black'
                        : 'text-slate-600 hover:text-slate-900 font-semibold'
                    }`}
                  >
                    <Calendar className="w-4 h-4 text-emerald-600" />
                    <span>📅 60-Month Interest Schedule ({misDetails?.schedules?.length || 0})</span>
                  </button>
                </div>

                <div className="flex items-center gap-2">
                  {activeModalTab === 'passbook' && (
                    <div className="inline-flex rounded-lg border border-slate-200 p-0.5 bg-slate-50 text-[11px] font-semibold">
                      <button
                        onClick={() => setPassbookFilter('ALL')}
                        className={`px-2 py-1 rounded ${passbookFilter === 'ALL' ? 'bg-white shadow-xs text-indigo-700 font-bold' : 'text-slate-500'}`}
                      >
                        All
                      </button>
                      <button
                        onClick={() => setPassbookFilter('CREDIT')}
                        className={`px-2 py-1 rounded ${passbookFilter === 'CREDIT' ? 'bg-white shadow-xs text-emerald-700 font-bold' : 'text-slate-500'}`}
                      >
                        Credits
                      </button>
                      <button
                        onClick={() => setPassbookFilter('DEBIT')}
                        className={`px-2 py-1 rounded ${passbookFilter === 'DEBIT' ? 'bg-white shadow-xs text-rose-700 font-bold' : 'text-slate-500'}`}
                      >
                        Withdrawals
                      </button>
                    </div>
                  )}

                  <button
                    onClick={() => window.print()}
                    className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold border border-slate-200 transition cursor-pointer flex items-center gap-1.5"
                    title="Print Account Statement"
                  >
                    <Printer className="w-3.5 h-3.5" /> Print Statement
                  </button>
                </div>
              </div>

              {/* ======================================================== */}
              {/* VIEW 1: ACCOUNT PASSBOOK & TRANSACTIONS (RUNNING BALANCE) */}
              {/* ======================================================== */}
              {activeModalTab === 'passbook' && (() => {
                const principal = Number(selectedMIS.deposit_amount) || 0;
                let runningBalance = 0;
                const txns = [];

                // 1. Initial Deposit
                runningBalance = principal;
                txns.push({
                  id: `dep-${selectedMIS.id}`,
                  date: selectedMIS.start_date,
                  dueDate: selectedMIS.start_date,
                  paidDate: selectedMIS.start_date,
                  pay_mode: 'Cash / Online Transfer',
                  remarks: 'Monthly Income Scheme Opening Amount (Lump-Sum Principal)',
                  status: 'Active',
                  debit: null,
                  credit: principal,
                  balance: runningBalance,
                  accounted: 'Yes',
                  type: 'CREDIT'
                });

                // 2. Chronological Monthly Accruals & Withdrawals
                const todayStr = new Date().toISOString().split('T')[0];

                misDetails?.schedules?.forEach(s => {
                  const netPayable = Number(s.net_payable) || Number(s.payout_amount) || 0;
                  const isPaid = s.status === 'PAID';
                  const isFuture = s.payout_date > todayStr;
                  const isDueToday = s.payout_date === todayStr;
                  const isOverdue = !isPaid && s.payout_date < todayStr;

                  let displayStatus = 'Settled';
                  if (!isPaid) {
                    if (isFuture) displayStatus = 'Scheduled';
                    else if (isDueToday) displayStatus = 'Due Today';
                    else displayStatus = 'Overdue';
                  } else if (s.paid_date && s.paid_date > todayStr) {
                    displayStatus = 'Post-Dated';
                  }

                  // A. Interest Accrued / Credit (Due)
                  runningBalance += netPayable;
                  const intTxn = {
                    id: `int-${s.id}`,
                    monthNo: s.month_no,
                    date: s.payout_date,
                    dueDate: s.payout_date,
                    paidDate: s.paid_date,
                    pay_mode: 'System (Auto ROI)',
                    remarks: `Interest Credit for Month #${s.month_no}`,
                    status: displayStatus,
                    isFuture,
                    isDueToday,
                    isOverdue,
                    isPaid,
                    debit: null,
                    credit: netPayable,
                    balance: runningBalance,
                    accounted: 'Yes',
                    type: 'CREDIT',
                    schedule: s
                  };
                  txns.push(intTxn);

                  // B. Interest Disbursed / Withdrawal
                  if (s.status === 'PAID') {
                    runningBalance -= netPayable;
                    const isPostDated = s.paid_date && s.paid_date > todayStr;
                    txns.push({
                      id: `wdr-${s.id}`,
                      monthNo: s.month_no,
                      date: s.paid_date || s.payout_date,
                      dueDate: s.payout_date,
                      paidDate: s.paid_date || s.payout_date,
                      pay_mode: 'Online Transfer (NEFT)',
                      remarks: `Monthly Interest Payout / Withdrawal (${s.payment_reference || 'Disbursed'})`,
                      status: isPostDated ? 'Post-Dated' : 'Settled',
                      isPostDated,
                      debit: netPayable,
                      credit: null,
                      balance: runningBalance, // Restores exactly back to Principal!
                      accounted: 'Yes',
                      type: 'DEBIT',
                      paymentRef: s.payment_reference,
                      schedule: s
                    });
                  }
                });

                const filteredTxns = txns.filter(t => {
                  if (passbookFilter === 'CREDIT') return t.credit !== null;
                  if (passbookFilter === 'DEBIT') return t.debit !== null;
                  return true;
                });

                return (
                  <div className="border border-slate-200 rounded-xl overflow-hidden shadow-xs">
                    <div className="px-4 py-2.5 bg-slate-50 border-b border-slate-200 font-bold text-xs text-slate-800 flex justify-between items-center">
                      <div className="flex items-center gap-2">
                        <BookOpen className="w-4 h-4 text-indigo-600" />
                        <span>Passbook Transactions Ledger ({filteredTxns.length} entries)</span>
                      </div>
                      <div className="text-[11px] text-slate-500 font-medium">
                        Principal: <strong className="text-slate-800">{formatINR(principal)}</strong> • Book Balance: <strong className="text-indigo-700">{formatINR(runningBalance)}</strong>
                      </div>
                    </div>

                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-xs">
                        <thead className="bg-[#0f172a] text-white font-bold uppercase tracking-wider text-[10px]">
                          <tr>
                            <th className="py-2.5 px-2.5 whitespace-nowrap">TXN DATE</th>
                            <th className="py-2.5 px-2.5">PARTICULARS</th>
                            <th className="py-2.5 px-2 text-center whitespace-nowrap">STATUS</th>
                            <th className="py-2.5 px-2.5 text-center bg-slate-900 text-slate-300 whitespace-nowrap">
                              SCHEDULE / DUE DATE (देय तिथि)
                            </th>
                            <th className="py-2.5 px-2.5 text-center bg-emerald-950/50 text-emerald-300 whitespace-nowrap">
                              DISBURSED DATE (डिसबर्स स्थिति)
                            </th>
                            <th className="py-2.5 px-2.5 text-right whitespace-nowrap">DEBIT (-)</th>
                            <th className="py-2.5 px-2.5 text-right whitespace-nowrap">CREDIT (+)</th>
                            <th className="py-2.5 px-2.5 text-right whitespace-nowrap">BALANCE</th>
                            <th className="py-2.5 px-2.5 text-center whitespace-nowrap">ACTION / UTR REF</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 font-medium text-xs">
                          {filteredTxns.map((t, idx) => {
                            const isWithdrawal = t.type === 'DEBIT';
                            const isInitialDep = t.id?.startsWith('dep-');

                            return (
                              <tr key={t.id || idx} className={`hover:bg-slate-50/80 transition ${t.status === 'Due Today' ? 'bg-amber-50/60 font-semibold' : t.status === 'Overdue' ? 'bg-rose-50/40' : ''}`}>
                                <td className="py-2 px-2.5 font-mono text-slate-800 whitespace-nowrap">
                                  {formatDate(t.date)}
                                </td>
                                <td className="py-2 px-2.5 max-w-[220px]">
                                  <div className="font-semibold text-slate-900 truncate" title={t.remarks}>
                                    {t.remarks}
                                  </div>
                                  <div className="text-[10px] text-slate-400">
                                    {t.pay_mode}
                                  </div>
                                </td>
                                <td className="py-2 px-2 text-center whitespace-nowrap">
                                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                    t.status === 'Active' || t.status === 'Settled'
                                      ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                                      : t.status === 'Scheduled'
                                      ? 'bg-sky-50 text-sky-800 border border-sky-200'
                                      : t.status === 'Due Today'
                                      ? 'bg-amber-100 text-amber-900 border border-amber-300 animate-pulse'
                                      : t.status === 'Post-Dated'
                                      ? 'bg-indigo-50 text-indigo-800 border border-indigo-200'
                                      : 'bg-rose-100 text-rose-800 border border-rose-200'
                                  }`}>
                                    {t.status}
                                  </span>
                                </td>

                                {/* SCHEDULE / DUE DATE */}
                                <td className="py-2 px-2.5 text-center whitespace-nowrap bg-slate-50/30">
                                  {isInitialDep ? (
                                    <span className="font-mono text-slate-500 text-[11px]">{formatDate(t.date)}</span>
                                  ) : t.status === 'Scheduled' ? (
                                    <div>
                                      <span className="font-mono font-bold text-sky-900 text-xs bg-sky-50 px-2 py-0.5 rounded border border-sky-200 inline-block">
                                        🗓️ {formatDate(t.dueDate)}
                                      </span>
                                      <div className="text-[10px] text-sky-600 font-medium mt-0.5">
                                        (आगामी देय तिथि)
                                      </div>
                                    </div>
                                  ) : t.status === 'Due Today' ? (
                                    <div>
                                      <span className="font-mono font-bold text-amber-900 text-xs bg-amber-100 px-2 py-0.5 rounded border border-amber-300 inline-block">
                                        🔔 {formatDate(t.dueDate)}
                                      </span>
                                      <div className="text-[10px] text-amber-700 font-bold mt-0.5">
                                        (आज देय / Due Today)
                                      </div>
                                    </div>
                                  ) : t.status === 'Overdue' ? (
                                    <div>
                                      <span className="font-mono font-bold text-rose-900 text-xs bg-rose-100 px-2 py-0.5 rounded border border-rose-300 inline-block">
                                        ⚠️ {formatDate(t.dueDate)}
                                      </span>
                                      <div className="text-[10px] text-rose-700 font-semibold mt-0.5">
                                        (Overdue since {formatDate(t.dueDate)})
                                      </div>
                                    </div>
                                  ) : (
                                    <div>
                                      <span className="font-mono text-slate-700 text-xs">
                                        {formatDate(t.dueDate)}
                                      </span>
                                      <div className="text-[10px] text-slate-400">Due Date</div>
                                    </div>
                                  )}
                                </td>

                                {/* DISBURSED DATE */}
                                <td className="py-2 px-2.5 text-center whitespace-nowrap bg-emerald-50/30">
                                  {isInitialDep ? (
                                    <span className="font-mono text-emerald-700 font-bold text-[11px]">
                                      Received {formatDate(t.date)}
                                    </span>
                                  ) : t.isPostDated ? (
                                    <div>
                                      <span className="font-mono font-bold text-indigo-800 text-xs bg-indigo-50 px-2 py-0.5 rounded border border-indigo-200 inline-block">
                                        ⏳ {formatDate(t.paidDate)}
                                      </span>
                                      <div className="text-[10px] text-indigo-600 font-medium mt-0.5">
                                        (Post-Dated Disbursal)
                                      </div>
                                    </div>
                                  ) : isWithdrawal || t.paidDate ? (
                                    <div>
                                      <span className="font-mono font-bold text-emerald-800 text-xs bg-emerald-100/70 px-2 py-0.5 rounded border border-emerald-300 inline-block">
                                        ✓ {formatDate(t.paidDate || t.date)}
                                      </span>
                                      <div className="text-[10px] text-emerald-700 font-medium mt-0.5">
                                        (Disbursed on {formatDate(t.paidDate || t.date)})
                                      </div>
                                    </div>
                                  ) : t.status === 'Scheduled' ? (
                                    <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-slate-100 text-slate-500 border border-slate-200">
                                      ⏳ Not Due Yet (आगामी)
                                    </span>
                                  ) : t.status === 'Due Today' ? (
                                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-50 text-amber-800 border border-amber-200">
                                      ⏳ Ready for Payout
                                    </span>
                                  ) : (
                                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-200">
                                      ⏳ Overdue (Unpaid)
                                    </span>
                                  )}
                                </td>

                                <td className="py-2 px-2.5 text-right font-mono font-bold whitespace-nowrap">
                                  {t.debit ? (
                                    <span className="text-rose-600">-{formatINR(t.debit)}</span>
                                  ) : (
                                    <span className="text-slate-300">-</span>
                                  )}
                                </td>
                                <td className="py-2 px-2.5 text-right font-mono font-bold whitespace-nowrap">
                                  {t.credit ? (
                                    <span className="text-emerald-600">+{formatINR(t.credit)}</span>
                                  ) : (
                                    <span className="text-slate-300">-</span>
                                  )}
                                </td>
                                <td className="py-2 px-2.5 text-right font-mono font-black text-slate-900 whitespace-nowrap bg-slate-50/50">
                                  {formatINR(t.balance)}
                                </td>
                                <td className="py-2 px-2.5 text-center whitespace-nowrap">
                                  {t.status === 'Due Today' || t.status === 'Overdue' ? (
                                    <button
                                      onClick={() => {
                                        setSelectedSchedule(t.schedule);
                                        setPaymentRef(`NEFT-MIS-${Date.now().toString().slice(-6)}`);
                                        setDisbursalDate(new Date().toISOString().split('T')[0]);
                                        setPayoutModalOpen(true);
                                      }}
                                      className="px-3 py-1 bg-amber-500 hover:bg-amber-600 text-slate-950 rounded-lg font-black text-[11px] shadow-xs cursor-pointer flex items-center gap-1 mx-auto transition"
                                    >
                                      <ArrowUpRight className="w-3.5 h-3.5" /> Disburse
                                    </button>
                                  ) : t.status === 'Scheduled' ? (
                                    <span className="text-[11px] text-slate-400 font-mono italic">
                                      Due {formatDate(t.dueDate)}
                                    </span>
                                  ) : (
                                    <div>
                                      <span className="text-[11px] text-slate-700 font-mono font-bold">
                                        {t.paymentRef || 'Settled'}
                                      </span>
                                      {t.paidDate && (
                                        <div className="text-[10px] text-emerald-600 font-mono">
                                          Paid {formatDate(t.paidDate)}
                                        </div>
                                      )}
                                    </div>
                                  )}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                );
              })()}

              {/* ======================================================== */}
              {/* ======================================================== */}
              {/* VIEW 2: MONTHLY PAYOUT SCHEDULE (60 MONTHS)             */}
              {/* ======================================================== */}
              {activeModalTab === 'schedules' && (() => {
                const todayStr = new Date().toISOString().split('T')[0];

                return (
                  <div className="border border-slate-200 rounded-xl overflow-hidden shadow-xs">
                    <div className="px-4 py-2.5 bg-slate-50 border-b border-slate-200 font-bold text-xs text-slate-700 flex justify-between items-center">
                      <span>Monthly Interest Payout Schedule ({misDetails?.schedules?.length || 0})</span>
                      <span className="text-[11px] text-slate-400">Credited to Customer Bank/Savings A/c</span>
                    </div>

                    <table className="w-full text-left text-xs">
                      <thead className="bg-[#0f172a] text-white font-bold uppercase tracking-wider text-[10px]">
                        <tr>
                          <th className="py-2.5 px-3">Month</th>
                          <th className="py-2.5 px-3 bg-slate-900 text-slate-300">Schedule / Due Date (देय तिथि)</th>
                          <th className="py-2.5 px-3 text-right">Net Payable</th>
                          <th className="py-2.5 px-3 text-center">Status</th>
                          <th className="py-2.5 px-3 text-center bg-emerald-950/40 text-emerald-300">Disbursed Date (डिसबर्स स्थिति)</th>
                          <th className="py-2.5 px-3">Payment Reference / UTR</th>
                          <th className="py-2.5 px-3 text-center">Action</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {misDetails?.schedules?.map(sched => {
                          const isPaid = sched.status === 'PAID';
                          const isFuture = sched.payout_date > todayStr;
                          const isDueToday = sched.payout_date === todayStr;
                          const isOverdue = !isPaid && sched.payout_date < todayStr;
                          const isPostDated = isPaid && sched.paid_date && sched.paid_date > todayStr;

                          let rowStatus = 'Settled';
                          if (!isPaid) {
                            if (isFuture) rowStatus = 'Scheduled';
                            else if (isDueToday) rowStatus = 'Due Today';
                            else rowStatus = 'Overdue';
                          } else if (isPostDated) {
                            rowStatus = 'Post-Dated';
                          }

                          return (
                            <tr key={sched.id} className={`hover:bg-slate-50/50 ${rowStatus === 'Due Today' ? 'bg-amber-50/40' : rowStatus === 'Overdue' ? 'bg-rose-50/30' : ''}`}>
                              <td className="py-2.5 px-3 font-mono text-slate-400">#{sched.month_no}</td>
                              <td className="py-2.5 px-3 font-bold text-slate-800 font-mono">
                                {formatDate(sched.payout_date)}
                                {rowStatus === 'Scheduled' && (
                                  <span className="ml-1.5 text-[10px] text-sky-700 bg-sky-50 px-1.5 py-0.5 rounded font-semibold border border-sky-200">
                                    🗓️ आगामी
                                  </span>
                                )}
                                {rowStatus === 'Due Today' && (
                                  <span className="ml-1.5 text-[10px] text-amber-800 bg-amber-100 px-1.5 py-0.5 rounded font-bold border border-amber-300 animate-pulse">
                                    🔔 आज देय
                                  </span>
                                )}
                                {rowStatus === 'Overdue' && (
                                  <span className="ml-1.5 text-[10px] text-rose-700 bg-rose-100 px-1.5 py-0.5 rounded font-bold border border-rose-300">
                                    ⚠️ Overdue
                                  </span>
                                )}
                              </td>
                              <td className="py-2.5 px-3 text-right font-black text-slate-900">{formatINR(sched.net_payable)}</td>
                              <td className="py-2.5 px-3 text-center">
                                <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                  rowStatus === 'Settled'
                                    ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                                    : rowStatus === 'Scheduled'
                                    ? 'bg-sky-50 text-sky-800 border border-sky-200'
                                    : rowStatus === 'Due Today'
                                    ? 'bg-amber-100 text-amber-900 border border-amber-300 animate-pulse'
                                    : rowStatus === 'Post-Dated'
                                    ? 'bg-purple-100 text-purple-800 border border-purple-200'
                                    : 'bg-rose-100 text-rose-800 border border-rose-200'
                                }`}>
                                  {rowStatus === 'Scheduled' ? 'SCHEDULED (आगामी)' : rowStatus === 'Due Today' ? 'DUE TODAY' : rowStatus === 'Overdue' ? 'OVERDUE' : rowStatus === 'Post-Dated' ? 'POST-DATED (लंबित)' : 'SETTLED'}
                                </span>
                              </td>
                              <td className="py-2.5 px-3 text-center">
                                {isPostDated ? (
                                  <span className="text-xs font-mono font-bold text-purple-700 bg-purple-50 px-2 py-0.5 rounded border border-purple-200">
                                    ⏳ Post-Dated ({formatDate(sched.paid_date)})
                                  </span>
                                ) : sched.paid_date ? (
                                  <span className="text-xs font-mono font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                                    ✓ {formatDate(sched.paid_date)}
                                  </span>
                                ) : rowStatus === 'Scheduled' ? (
                                  <span className="text-[11px] text-slate-400 font-medium">⏳ Not Due Yet (आगामी)</span>
                                ) : rowStatus === 'Due Today' ? (
                                  <span className="text-[11px] text-amber-700 font-bold bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200">Ready for Disbursal</span>
                                ) : (
                                  <span className="text-[11px] text-rose-700 font-bold bg-rose-50 px-1.5 py-0.5 rounded border border-rose-200">Overdue (Unpaid)</span>
                                )}
                              </td>
                              <td className="py-2.5 px-3 font-mono text-slate-700 truncate max-w-xs font-semibold">
                                {sched.payment_reference || '-'}
                              </td>
                              <td className="py-2.5 px-3 text-center">
                                {rowStatus === 'Due Today' || rowStatus === 'Overdue' ? (
                                  <button
                                    onClick={() => {
                                      setSelectedSchedule(sched);
                                      setPaymentRef(`NEFT-MIS-${Date.now().toString().slice(-6)}`);
                                      setDisbursalDate(new Date().toISOString().split('T')[0]);
                                      setPayoutModalOpen(true);
                                    }}
                                    className="px-2.5 py-1 bg-amber-500 hover:bg-amber-600 text-slate-950 rounded font-black text-[11px] shadow-xs cursor-pointer flex items-center gap-1 mx-auto"
                                  >
                                    <ArrowUpRight className="w-3.5 h-3.5" /> Disburse
                                  </button>
                                ) : rowStatus === 'Scheduled' ? (
                                  <span className="text-[11px] text-slate-400 font-mono italic">
                                    Due {formatDate(sched.payout_date)}
                                  </span>
                                ) : (
                                  <span className="text-[10px] text-emerald-700 font-bold">Disbursed ✓</span>
                                )}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                );
              })()}
            </div>

            {/* Pinned Bottom Footer */}
            <div className="shrink-0 px-6 py-2.5 border-t border-slate-200 bg-slate-50 flex items-center justify-between text-xs text-slate-500 z-10">
              <span>Press <kbd className="px-1.5 py-0.5 bg-slate-200 rounded text-[11px] font-mono text-slate-700">Esc</kbd> or click outside to close</span>
            </div>

          </div>
        </div>,
        document.body
      )}

      {/* 5. Disburse Payout Modal */}
      {payoutModalOpen && selectedSchedule && createPortal(
        <div className="fixed inset-0 z-[10000] bg-slate-950/80 backdrop-blur-xs flex justify-center items-start pt-16 pb-10 p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-xl border border-slate-200 max-w-md w-full p-6 animate-fadeIn">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div>
                <h3 className="text-base font-bold text-slate-900">
                  Disburse MIS Month #{selectedSchedule.month_no} Payout
                </h3>
                <p className="text-xs text-slate-500 mt-1">
                  Customer: <strong className="text-slate-800">{selectedMIS.customer_name}</strong>
                </p>
              </div>
              <button
                type="button"
                onClick={() => setPayoutModalOpen(false)}
                className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-100 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleDisbursePayout} className="mt-4 space-y-3.5 text-xs">
              <div className="p-3 bg-amber-50/70 border border-amber-200 rounded-xl space-y-1 text-xs">
                <div className="flex justify-between">
                  <span className="text-slate-600 font-medium">Scheduled Due Date (निर्धारित देय तिथि):</span>
                  <span className="font-mono font-bold text-amber-900">📅 {formatDate(selectedSchedule.payout_date)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-600 font-medium">Net Monthly Payout Amount:</span>
                  <span className="font-mono font-black text-emerald-700 text-sm">{formatINR(selectedSchedule.net_payable)}</span>
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">
                  Disbursement Date (डिसबर्स करने की तारीख - आज या पूर्व तिथि) *
                </label>
                <input
                  type="date"
                  required
                  max={new Date().toISOString().split('T')[0]}
                  value={disbursalDate}
                  onChange={(e) => setDisbursalDate(e.target.value)}
                  className="w-full text-xs p-2.5 bg-white border border-slate-200 rounded-lg font-bold text-slate-900 focus:outline-none focus:border-indigo-600 font-mono"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">
                  Payment Mode (भुगतान का माध्यम)
                </label>
                <select
                  value={disbursalPayMode}
                  onChange={(e) => setDisbursalPayMode(e.target.value)}
                  className="w-full text-xs p-2.5 bg-white border border-slate-200 rounded-lg font-semibold focus:outline-none focus:border-indigo-600"
                >
                  <option value="Online Transfer (NEFT)">Online Transfer (NEFT)</option>
                  <option value="IMPS / RTGS Fast Transfer">IMPS / RTGS Fast Transfer</option>
                  <option value="Cash (गल्ले से नकद भुगतान)">Cash (गल्ले से नकद भुगतान)</option>
                  <option value="Cheque / Demand Draft">Cheque / Demand Draft</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">
                  Payment Reference / Bank UTR No. *
                </label>
                <input
                  type="text"
                  required
                  value={paymentRef}
                  onChange={(e) => setPaymentRef(e.target.value)}
                  placeholder="e.g. NEFT-MIS-889900 or Cash Voucher #12"
                  className="w-full text-xs p-2.5 bg-white border border-slate-200 rounded-lg font-mono focus:outline-none focus:border-indigo-600"
                />
              </div>

              {isEmployee && (
                <p className="text-[11px] text-amber-700 bg-amber-50 p-2 rounded border border-amber-200">
                  ⚠️ As Employee (Maker), this payout request will be submitted for Admin Checker verification before releasing payment.
                </p>
              )}

              <div className="flex items-center gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setPayoutModalOpen(false)}
                  className="flex-1 py-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2 rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs shadow-xs cursor-pointer"
                >
                  Authorize & Disburse Payout
                </button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}

    </div>
  );
}
