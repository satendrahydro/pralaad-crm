import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { 
  Plus, 
  Search, 
  RotateCw, 
  User, 
  CreditCard, 
  ArrowDownLeft, 
  ArrowUpRight, 
  CheckCircle2, 
  AlertCircle, 
  DollarSign, 
  ArrowRight,
  Receipt,
  Eye,
  X,
  Wallet,
  Building2,
  Download,
  FileSpreadsheet,
  Sparkles
} from 'lucide-react';
import { formatINR, formatDate, apiRequest } from '../utils';
import { exportToExcel } from '../utils/excelExport';

export default function SavingsList({ onOpenNewSavings, isEmployee = false, onViewCustomerProfile }) {
  const [accounts, setAccounts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [selectedAccount, setSelectedAccount] = useState(null);
  const [accountDetails, setAccountDetails] = useState(null);
  const [detailsLoading, setDetailsLoading] = useState(false);
  // Voucher modal state: 'DEPOSIT' | 'WITHDRAWAL' | null
  const [voucherModalType, setVoucherModalType] = useState(null);
  const [voucherAmount, setVoucherAmount] = useState('');
  const [paymentMode, setPaymentMode] = useState('CASH');
  const [referenceNumber, setReferenceNumber] = useState('');
  const [narration, setNarration] = useState('');

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        if (voucherModalType) setVoucherModalType(null);
        else if (selectedAccount) setSelectedAccount(null);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedAccount, voucherModalType]);

  const handleExportExcel = () => {
    if (!accounts.length) return alert('No Savings records to export');
    const rows = accounts.map(s => ({
      'Account Number': s.account_number || '',
      'Customer Name': s.customer_name || '',
      'Phone': s.customer_phone || '',
      'Current Balance (₹)': s.current_balance,
      'Opening Balance (₹)': s.opening_balance,
      'Minimum Balance (₹)': s.minimum_balance,
      'Interest Rate (% p.a.)': s.annual_interest_rate,
      'Nominee': s.nominee_name || '',
      'Status': s.status || ''
    }));
    exportToExcel(rows, 'TARPL_Savings_Accounts', 'Savings Accounts');
  };

  const handleExportCSV = () => {
    if (!accounts.length) return alert('No Savings records to export');
    const headers = ['Account Number', 'Customer Name', 'Phone', 'Current Balance', 'Opening Balance', 'Minimum Balance', 'Interest Rate', 'Nominee', 'Status'];
    const rows = accounts.map(s => [
      `"${s.account_number || ''}"`,
      `"${s.customer_name || ''}"`,
      `"${s.customer_phone || ''}"`,
      s.current_balance,
      s.opening_balance,
      s.minimum_balance,
      s.annual_interest_rate,
      `"${s.nominee_name || ''}"`,
      `"${s.status || ''}"`
    ]);
    const csvContent = 'data:text/csv;charset=utf-8,\uFEFF' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const link = document.createElement('a');
    link.href = encodeURI(csvContent);
    link.download = `Savings_Accounts_${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const fetchAccounts = async () => {
    try {
      setLoading(true);
      let q = `/savings?status=${statusFilter}`;
      if (search) q += `&search=${encodeURIComponent(search)}`;
      const res = await apiRequest(q);
      if (res.success) setAccounts(res.accounts || []);
    } catch (e) {
      console.error('Error fetching savings accounts:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAccounts();
  }, [statusFilter, search]);

  const openDetails = async (acc) => {
    setSelectedAccount(acc);
    try {
      setDetailsLoading(true);
      const res = await apiRequest(`/savings/${acc.id}`);
      if (res.success) setAccountDetails(res);
    } catch (e) {
      alert('Error loading savings account details: ' + e.message);
    } finally {
      setDetailsLoading(false);
    }
  };

  const handleVoucherSubmit = async (e) => {
    e.preventDefault();
    if (!selectedAccount || !voucherModalType) return;

    const amount = parseFloat(voucherAmount);
    if (!amount || amount <= 0) {
      alert('Please enter a valid amount');
      return;
    }

    if (voucherModalType === 'WITHDRAWAL') {
      if ((selectedAccount.current_balance - amount) < selectedAccount.minimum_balance) {
        alert(`Insufficient balance. Minimum balance of ${formatINR(selectedAccount.minimum_balance)} must be maintained. Current balance: ${formatINR(selectedAccount.current_balance)}`);
        return;
      }
    }

    const endpoint = voucherModalType === 'DEPOSIT' ? `/savings/${selectedAccount.id}/deposit` : `/savings/${selectedAccount.id}/withdraw`;

    try {
      const res = await apiRequest(endpoint, {
        method: 'POST',
        body: JSON.stringify({
          amount,
          payment_mode: paymentMode,
          reference_number: referenceNumber,
          narration: narration || (voucherModalType === 'DEPOSIT' ? 'Cash/Transfer Deposit' : 'Cash/Transfer Withdrawal')
        })
      });

      if (res.success) {
        alert(res.message || 'Voucher submitted successfully');
        setVoucherModalType(null);
        setVoucherAmount('');
        openDetails(selectedAccount);
        fetchAccounts();
      }
    } catch (err) {
      alert('Transaction error: ' + err.message);
    }
  };

  return (
    <div className="space-y-6 animate-fadeIn pb-16">
      
      {/* 1. Header */}
      <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-xl font-bold text-slate-900 tracking-tight">Savings Accounts</h1>
            <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
              Liquid Deposits & Ledger Passbook
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Real-time balance tracking, cash & bank deposit/withdrawal vouchers, and passbook statements
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={fetchAccounts}
            className="p-2 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg border border-slate-200 transition cursor-pointer"
            title="Refresh"
          >
            <RotateCw className="w-4 h-4" />
          </button>

          {/* Dual Export: Excel (.xlsx) & CSV */}
          <div className="flex items-center rounded-xl border border-slate-200 bg-slate-100 p-0.5 shadow-2xs">
            <button
              id="savings-export-excel-btn"
              onClick={handleExportExcel}
              className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg text-xs flex items-center gap-1.5 transition cursor-pointer shadow-xs active:scale-95"
              title="Export to Microsoft Excel (.xlsx)"
            >
              <FileSpreadsheet className="w-3.5 h-3.5 text-white" />
              <span>Excel (.xlsx)</span>
            </button>
            <button
              id="savings-export-csv-btn"
              onClick={handleExportCSV}
              className="px-2.5 py-1.5 hover:bg-slate-200 text-slate-700 font-bold rounded-lg text-xs flex items-center gap-1 transition cursor-pointer"
              title="Export to CSV"
            >
              <Download className="w-3.5 h-3.5 text-slate-500" />
              <span>CSV</span>
            </button>
          </div>

          <button
            onClick={onOpenNewSavings}
            className="inline-flex items-center gap-2 px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-semibold shadow-xs transition cursor-pointer"
          >
            <Plus className="w-4 h-4" /> Open Savings A/c
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
            placeholder="Search by account number, customer name, phone..."
            className="w-full text-xs pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:border-slate-800 transition"
          />
        </div>

        <div className="flex items-center gap-2">
          {['ALL', 'ACTIVE', 'DORMANT', 'CLOSED'].map(st => (
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

      {/* 3. Savings Accounts Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold">
              <tr>
                <th className="py-3 px-4">Account Number</th>
                <th className="py-3 px-4">Customer</th>
                <th className="py-3 px-4 text-right">Current Ledger Balance</th>
                <th className="py-3 px-4 text-right">Min Balance</th>
                <th className="py-3 px-4 text-center">Interest Rate</th>
                <th className="py-3 px-4 text-center">Opened Date</th>
                <th className="py-3 px-4 text-center">Status</th>
                <th className="py-3 px-4 text-center">Vouchers & Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan="8" className="py-12 text-center text-slate-400">Loading savings accounts...</td>
                </tr>
              ) : accounts.length === 0 ? (
                <tr>
                  <td colSpan="8" className="py-12 text-center text-slate-400">No savings accounts found.</td>
                </tr>
              ) : (
                accounts.map(acc => (
                  <tr key={acc.id} className="hover:bg-slate-50/80 transition">
                    <td className="py-3 px-4 font-mono font-bold text-slate-900">{acc.account_number}</td>
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => onViewCustomerProfile && onViewCustomerProfile(acc.customer_id)}
                          className="font-bold text-slate-900 hover:text-emerald-700 hover:underline text-left cursor-pointer truncate max-w-[150px]"
                          title="Click to view Customer 360 Profile"
                        >
                          {acc.customer_name}
                        </button>
                        <button
                          type="button"
                          onClick={() => onViewCustomerProfile && onViewCustomerProfile(acc.customer_id)}
                          className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 bg-gradient-to-r from-emerald-600 to-teal-700 hover:from-emerald-700 hover:to-teal-800 text-white rounded-md transition shadow-2xs cursor-pointer active:scale-95 shrink-0"
                          title="Customer 360: View all active accounts & services"
                        >
                          <Sparkles className="w-2.5 h-2.5 text-amber-300" />
                          <span>360°</span>
                        </button>
                      </div>
                      <div className="text-[11px] text-slate-400 mt-0.5">{acc.customer_phone}</div>
                    </td>
                    <td className="py-3 px-4 text-right">
                      <div className="text-sm font-black text-slate-900">{formatINR(acc.current_balance)}</div>
                      <div className="text-[10px] text-slate-400">Available Funds</div>
                    </td>
                    <td className="py-3 px-4 text-right font-medium text-slate-600">{formatINR(acc.minimum_balance)}</td>
                    <td className="py-3 px-4 text-center font-bold text-emerald-700">{acc.annual_interest_rate}% p.a.</td>
                    <td className="py-3 px-4 text-center text-slate-600">{formatDate(acc.opened_date)}</td>
                    <td className="py-3 px-4 text-center">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        acc.status === 'ACTIVE' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-slate-100 text-slate-700'
                      }`}>
                        {acc.status}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-center">
                      <div className="flex items-center justify-center gap-1.5">
                        <button
                          onClick={() => {
                            setSelectedAccount(acc);
                            setVoucherAmount('');
                            setReferenceNumber(`DEP-${Date.now().toString().slice(-4)}`);
                            setVoucherModalType('DEPOSIT');
                          }}
                          className="px-2 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 rounded font-bold text-[11px] border border-emerald-200 transition cursor-pointer"
                        >
                          + Deposit
                        </button>
                        <button
                          onClick={() => {
                            setSelectedAccount(acc);
                            setVoucherAmount('');
                            setReferenceNumber(`WDR-${Date.now().toString().slice(-4)}`);
                            setVoucherModalType('WITHDRAWAL');
                          }}
                          className="px-2 py-1 bg-rose-50 hover:bg-rose-100 text-rose-800 rounded font-bold text-[11px] border border-rose-200 transition cursor-pointer"
                        >
                          - Withdraw
                        </button>
                        <button
                          onClick={() => openDetails(acc)}
                          className="p-1 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded transition cursor-pointer"
                          title="Passbook Statement"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* 4. Passbook Statement Drawer */}
      {selectedAccount && accountDetails && !voucherModalType && createPortal(
        <div 
          className="fixed inset-0 z-[9999] bg-slate-950/80 backdrop-blur-sm flex justify-center items-center p-3 sm:p-6 overflow-hidden"
          onClick={(e) => { if (e.target === e.currentTarget) setSelectedAccount(null); }}
        >
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-4xl w-full max-h-[88vh] flex flex-col overflow-hidden animate-fadeIn relative">
            
            {/* Pinned Top Header */}
            <div className="shrink-0 px-4 sm:px-6 py-3.5 border-b border-slate-200 bg-white flex items-center justify-between gap-3 shadow-xs z-10">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-10 h-10 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-700 font-black shrink-0">
                  <Wallet className="w-5 h-5" />
                </div>
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="text-base font-bold text-slate-900 truncate">
                      {selectedAccount.account_number} — {selectedAccount.customer_name}
                    </h2>
                    {onViewCustomerProfile && (
                      <button
                        type="button"
                        onClick={() => onViewCustomerProfile(selectedAccount.customer_id)}
                        className="px-2 py-0.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 rounded text-xs font-semibold cursor-pointer transition flex items-center gap-1 shrink-0"
                        title="View Complete Customer 360° Profile & All Services"
                      >
                        👤 360° All Services
                      </button>
                    )}
                  </div>
                  <p className="text-xs text-slate-500 truncate">
                    Savings Passbook • Current Balance: <strong className="text-slate-900">{formatINR(selectedAccount.current_balance)}</strong>
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setSelectedAccount(null)}
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-slate-100 hover:bg-rose-50 text-slate-700 hover:text-rose-600 border border-slate-300 hover:border-rose-200 rounded-xl font-bold text-xs transition cursor-pointer active:scale-95 shrink-0"
                title="Close"
              >
                <X className="w-4 h-4 stroke-[2.5]" />
                <span>Close</span>
              </button>
            </div>

            <div className="p-4 sm:p-6 overflow-y-auto flex-1 space-y-4 min-h-0">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                  <span className="text-slate-400 block text-[11px]">Available Balance</span>
                  <span className="text-base font-black text-slate-900">{formatINR(selectedAccount.current_balance)}</span>
                </div>
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                  <span className="text-slate-400 block text-[11px]">Minimum Balance Guard</span>
                  <span className="text-base font-bold text-slate-700">{formatINR(selectedAccount.minimum_balance)}</span>
                </div>
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                  <span className="text-slate-400 block text-[11px]">Annual Interest Yield</span>
                  <span className="text-base font-bold text-emerald-700">{selectedAccount.annual_interest_rate}% p.a.</span>
                </div>
              </div>

              <div className="border border-slate-200 rounded-xl overflow-hidden">
                <div className="px-4 py-2.5 bg-slate-50 border-b border-slate-200 font-bold text-xs text-slate-700 flex justify-between items-center">
                  <span>Passbook Statement & Transaction History</span>
                  <span className="text-[11px] text-slate-400">{accountDetails.transactions?.length || 0} Entries</span>
                </div>

                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50/50 border-b border-slate-200 text-slate-500 font-semibold">
                    <tr>
                      <th className="py-2.5 px-3">Date</th>
                      <th className="py-2.5 px-3">Txn Ref</th>
                      <th className="py-2.5 px-3">Type</th>
                      <th className="py-2.5 px-3">Narration</th>
                      <th className="py-2.5 px-3 text-right">Debit (Withdrawal)</th>
                      <th className="py-2.5 px-3 text-right">Credit (Deposit)</th>
                      <th className="py-2.5 px-3 text-right">Balance</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {accountDetails.transactions?.map(txn => {
                      const isCredit = txn.transaction_type === 'DEPOSIT' || txn.transaction_type === 'CREDIT';
                      const isDebit = txn.transaction_type === 'WITHDRAWAL' || txn.transaction_type === 'DEBIT';
                      return (
                        <tr key={txn.id} className="hover:bg-slate-50/50">
                          <td className="py-2.5 px-3 text-slate-600">{formatDate(txn.created_at)}</td>
                          <td className="py-2.5 px-3 font-mono font-bold text-slate-900">{txn.transaction_number}</td>
                          <td className="py-2.5 px-3">
                            <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                              isCredit ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-rose-50 text-rose-700 border border-rose-200'
                            }`}>
                              {isCredit ? 'CREDIT' : 'DEBIT'}
                            </span>
                          </td>
                          <td className="py-2.5 px-3 text-slate-600 truncate max-w-xs">{txn.narration}</td>
                          <td className="py-2.5 px-3 text-right font-mono text-rose-600 font-semibold">
                            {isDebit ? formatINR(txn.amount) : '-'}
                          </td>
                          <td className="py-2.5 px-3 text-right font-mono text-emerald-700 font-bold">
                            {isCredit ? formatINR(txn.amount) : '-'}
                          </td>
                          <td className="py-2.5 px-3 text-right font-mono font-black text-slate-900">
                            {formatINR(txn.balance_after)}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Pinned Bottom Footer */}
            <div className="shrink-0 px-6 py-2.5 border-t border-slate-200 bg-slate-50 flex items-center justify-between text-xs text-slate-500 z-10">
              <span>Press <kbd className="px-1.5 py-0.5 bg-slate-200 rounded text-[11px] font-mono text-slate-700">Esc</kbd> or click outside to close</span>
            </div>

          </div>
        </div>,
        document.body
      )}

      {/* 5. Deposit / Withdrawal Voucher Modal */}
      {voucherModalType && selectedAccount && createPortal(
        <div className="fixed inset-0 z-[10000] bg-slate-950/80 backdrop-blur-xs flex justify-center items-start pt-16 pb-10 p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-xl border border-slate-200 max-w-md w-full p-6 animate-fadeIn">
            <h3 className="text-base font-bold text-slate-900">
              {voucherModalType === 'DEPOSIT' ? 'Deposit Voucher' : 'Withdrawal Voucher'}
            </h3>
            <p className="text-xs text-slate-500 mt-1">
              Account: {selectedAccount.account_number} ({selectedAccount.customer_name}) • Balance: {formatINR(selectedAccount.current_balance)}
            </p>

            <form onSubmit={handleVoucherSubmit} className="mt-4 space-y-4">
              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">
                  {voucherModalType === 'DEPOSIT' ? 'Deposit Amount (₹)' : 'Withdrawal Amount (₹)'}
                </label>
                <input
                  type="number"
                  min="1"
                  step="0.01"
                  required
                  value={voucherAmount}
                  onChange={(e) => setVoucherAmount(e.target.value)}
                  placeholder="e.g. 5000"
                  className="w-full text-base font-bold p-2.5 bg-white border border-slate-200 rounded-lg focus:outline-none focus:border-slate-800"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">Payment Mode</label>
                <select
                  value={paymentMode}
                  onChange={(e) => setPaymentMode(e.target.value)}
                  className="w-full text-xs p-2.5 bg-white border border-slate-200 rounded-lg focus:outline-none focus:border-slate-800"
                >
                  <option value="CASH">Cash in Vault</option>
                  <option value="TRANSFER">Bank Transfer / NEFT</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">Reference Number</label>
                <input
                  type="text"
                  value={referenceNumber}
                  onChange={(e) => setReferenceNumber(e.target.value)}
                  placeholder="Receipt / UTR No"
                  className="w-full text-xs p-2.5 bg-white border border-slate-200 rounded-lg focus:outline-none focus:border-slate-800"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">Narration / Remarks</label>
                <input
                  type="text"
                  value={narration}
                  onChange={(e) => setNarration(e.target.value)}
                  placeholder="Description of transaction"
                  className="w-full text-xs p-2.5 bg-white border border-slate-200 rounded-lg focus:outline-none focus:border-slate-800"
                />
              </div>

              {voucherModalType === 'WITHDRAWAL' && (
                <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-800">
                  Minimum Balance Required: <strong>{formatINR(selectedAccount.minimum_balance)}</strong>. Maximum withdrawable: <strong>{formatINR(Math.max(0, selectedAccount.current_balance - selectedAccount.minimum_balance))}</strong>.
                </div>
              )}

              {isEmployee && (
                <p className="text-[11px] text-amber-700 bg-amber-50 p-2 rounded border border-amber-200">
                  ⚠️ As Employee (Maker), this voucher will be submitted for Admin Checker authorization before updating balances.
                </p>
              )}

              <div className="flex items-center gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setVoucherModalType(null)}
                  className="flex-1 py-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className={`flex-1 py-2 rounded-lg text-white font-bold text-xs shadow-xs ${
                    voucherModalType === 'DEPOSIT' ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-rose-600 hover:bg-rose-700'
                  }`}
                >
                  Submit {voucherModalType === 'DEPOSIT' ? 'Deposit' : 'Withdrawal'}
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
