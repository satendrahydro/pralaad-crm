import React, { useState, useEffect } from 'react';
import { 
  HandCoins, 
  Search, 
  Plus, 
  RefreshCw, 
  Printer, 
  CheckCircle2, 
  AlertCircle, 
  ArrowUpRight, 
  ArrowDownLeft,
  X,
  User,
  Phone,
  Calendar,
  Wallet
} from 'lucide-react';
import { apiRequest } from '../utils';
import PaginationBar from './PaginationBar';
import DateInput from './DateInput';

export default function BorrowingsRegister() {
  const [udhars, setUdhars] = useState([]);
  const [kpis, setKpis] = useState(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  // Add Borrowing Modal State
  const [showAddModal, setShowAddModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Repay Modal State
  const [repayItem, setRepayItem] = useState(null);
  const [repayAmount, setRepayAmount] = useState('');
  const [repayMode, setRepayMode] = useState('CASH');
  const [repayNarration, setRepayNarration] = useState('');
  const [repaySubmitting, setRepaySubmitting] = useState(false);
  const [repayMsg, setRepayMsg] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 25;

  const [formData, setFormData] = useState({
    lender_name: '',
    phone: '',
    amount: '',
    interest_rate: 0,
    payment_mode: 'CASH',
    due_date: '',
    narration: ''
  });

  const fetchUdhars = async () => {
    setLoading(true);
    try {
      const res = await apiRequest('/loans/udhar');
      if (res && res.success) {
        setUdhars(res.udhars || []);
        setKpis(res.kpis || {});
      }
    } catch (err) {
      console.error('Failed to fetch udhar borrowings:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUdhars();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

    if (!formData.lender_name.trim()) {
      setErrorMsg('Please enter Lender / Person name (किससे उधार लिया).');
      return;
    }
    if (!formData.amount || parseFloat(formData.amount) <= 0) {
      setErrorMsg('Please enter a valid borrowing amount.');
      return;
    }

    setSubmitting(true);
    try {
      const res = await apiRequest('/loans/udhar', {
        method: 'POST',
        body: JSON.stringify(formData)
      });

      if (res && res.success) {
        setSuccessMsg(res.message || 'Borrowing recorded successfully!');
        setTimeout(() => {
          setShowAddModal(false);
          setSuccessMsg('');
          setFormData({
            lender_name: '',
            phone: '',
            amount: '',
            interest_rate: 0,
            payment_mode: 'CASH',
            due_date: '',
            narration: ''
          });
          fetchUdhars();
        }, 1000);
      } else {
        setErrorMsg(res?.message || 'Failed to record borrowing.');
      }
    } catch (err) {
      setErrorMsg(err.message || 'Error recording borrowing.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleSubmitRepay = async (e) => {
    e.preventDefault();
    if (!repayItem || !repayAmount || parseFloat(repayAmount) <= 0) return;
    setRepaySubmitting(true);
    setRepayMsg('');
    try {
      const res = await apiRequest('/loans/udhar/repay', {
        method: 'POST',
        body: JSON.stringify({
          udhar_id: repayItem.id,
          amount: parseFloat(repayAmount),
          payment_mode: repayMode,
          narration: repayNarration || `Repayment to ${repayItem.lender_name}`
        })
      });
      if (res && res.success) {
        setRepayMsg(res.message || 'Repayment recorded!');
        setTimeout(() => {
          setRepayItem(null);
          setRepayMsg('');
          fetchUdhars();
        }, 900);
      } else {
        alert(res?.message || 'Repayment failed');
      }
    } catch (err) {
      alert(err.message || 'Error processing repayment');
    } finally {
      setRepaySubmitting(false);
    }
  };

  const filteredUdhars = udhars.filter(u => {
    return !search ||
      u.voucher_no.toLowerCase().includes(search.toLowerCase()) ||
      u.lender_name.toLowerCase().includes(search.toLowerCase()) ||
      u.narration.toLowerCase().includes(search.toLowerCase());
  });
  const totalPages = Math.max(1, Math.ceil(filteredUdhars.length / pageSize));
  const safePage = Math.min(currentPage, totalPages);
  const paginatedUdhars = filteredUdhars.slice((safePage - 1) * pageSize, safePage * pageSize);

  return (
    <div className="space-y-6">
      {/* 1. Header & Actions */}
      <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-200 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-purple-600 flex items-center justify-center text-white font-bold shadow-xs">
              <HandCoins className="w-5 h-5" />
            </div>
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Udhar & Borrowing Register (उधार खाता)</h1>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-purple-100 text-purple-900 border border-purple-300">
              Hand Loans & Market Borrowings
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Tracking external hand loans, director borrowings, market credit taken & repaid. Synced live with Day Book cash flow.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowAddModal(true)}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs shadow-xs transition cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>+ Record Udhar Taken (उधार लिया)</span>
          </button>
        </div>
      </div>

      {/* 2. KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Active Lenders</span>
          <div className="text-xl font-black text-slate-800 mt-1">
            {kpis?.active_lenders || 0} Persons / Parties
          </div>
          <span className="text-[10px] text-slate-400">Creditors & Directors</span>
        </div>

        <div className="bg-white p-4 rounded-xl border border-purple-200 shadow-sm bg-gradient-to-br from-white to-purple-50/40">
          <span className="text-[11px] font-bold text-purple-800 uppercase tracking-wider block flex items-center gap-1">
            <ArrowDownLeft className="w-3.5 h-3.5" /> Total Udhar Taken
          </span>
          <div className="text-xl font-black text-purple-900 mt-1 font-mono">
            ₹{(kpis?.total_borrowed || 0).toLocaleString('en-IN')}
          </div>
          <span className="text-[10px] text-purple-700">Inflow into Branch</span>
        </div>

        <div className="bg-white p-4 rounded-xl border border-emerald-200 shadow-sm bg-gradient-to-br from-white to-emerald-50/40">
          <span className="text-[11px] font-bold text-emerald-800 uppercase tracking-wider block flex items-center gap-1">
            <ArrowUpRight className="w-3.5 h-3.5" /> Total Udhar Repaid
          </span>
          <div className="text-xl font-black text-emerald-900 mt-1 font-mono">
            ₹{(kpis?.total_repaid || 0).toLocaleString('en-IN')}
          </div>
          <span className="text-[10px] text-emerald-700">Returned to Lenders</span>
        </div>

        <div className="bg-white p-4 rounded-xl border border-rose-200 shadow-sm bg-gradient-to-br from-white to-rose-50/40">
          <span className="text-[11px] font-bold text-rose-800 uppercase tracking-wider block">Outstanding Due</span>
          <div className="text-xl font-black text-rose-900 mt-1 font-mono">
            ₹{(kpis?.total_outstanding || 0).toLocaleString('en-IN')}
          </div>
          <span className="text-[10px] text-rose-700 font-semibold">Remaining Liability</span>
        </div>
      </div>

      {/* 3. Udhars Table */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex flex-col md:flex-row items-start md:items-center justify-between gap-3">
          <div>
            <h2 className="text-sm font-bold text-slate-900">Borrowings & Hand Loan Register</h2>
            <p className="text-xs text-slate-500">Record of who lent money to the company/branch and repayment status</p>
          </div>

          <div className="relative flex-1 md:w-64">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              value={search}
              onChange={(e) => { setSearch(e.target.value); setCurrentPage(1); }}
              placeholder="Search voucher, lender..."
              className="w-full text-xs pl-8 pr-3 py-1.5 rounded-lg border border-slate-200 focus:outline-none focus:border-purple-500"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-[11px] text-left">
            <thead className="bg-slate-50 border-b border-slate-200 text-[10px] uppercase font-bold text-slate-500 tracking-wider">
              <tr>
                <th className="py-2.5 px-2.5">Voucher No</th>
                <th className="py-2.5 px-2.5">Date</th>
                <th className="py-2.5 px-2.5">Lender / Creditor</th>
                <th className="py-2.5 px-2.5">Mode</th>
                <th className="py-2.5 px-2.5 text-right">Borrowed</th>
                <th className="py-2.5 px-2.5 text-right">Repaid</th>
                <th className="py-2.5 px-2.5 text-right">Balance Due</th>
                <th className="py-2.5 px-2.5">Status</th>
                <th className="py-2.5 px-2.5">Narration</th>
                <th className="py-2.5 px-2.5 text-center">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {paginatedUdhars.length === 0 ? (
                <tr>
                  <td colSpan="10" className="py-10 text-center text-slate-400">No borrowing records found.</td>
                </tr>
              ) : (
                paginatedUdhars.map((u) => (
                <tr key={u.id} className="hover:bg-slate-50 transition">
                  <td className="py-2.5 px-2.5 font-mono font-bold text-purple-700 whitespace-nowrap">{u.voucher_no}</td>
                  <td className="py-2.5 px-2.5 text-slate-500 whitespace-nowrap">{u.borrowing_date}</td>
                  <td className="py-2.5 px-2.5 font-bold text-slate-900">
                    <div className="truncate max-w-[145px]">{u.lender_name}</div>
                    {u.phone && <div className="text-[10px] text-slate-400 font-normal">{u.phone}</div>}
                  </td>
                  <td className="py-2.5 px-2.5 whitespace-nowrap">
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-700">
                      {u.payment_mode === 'CASH' ? 'CASH' : 'BANK'}
                    </span>
                  </td>
                  <td className="py-2.5 px-2.5 text-right font-mono font-bold text-purple-700 whitespace-nowrap">
                    ₹{u.amount.toLocaleString('en-IN')}
                  </td>
                  <td className="py-2.5 px-2.5 text-right font-mono font-bold text-emerald-700 whitespace-nowrap">
                    ₹{u.amount_repaid.toLocaleString('en-IN')}
                  </td>
                  <td className="py-2.5 px-2.5 text-right font-mono font-black text-rose-700 whitespace-nowrap">
                    ₹{u.outstanding_balance.toLocaleString('en-IN')}
                  </td>
                  <td className="py-2.5 px-2.5 whitespace-nowrap">
                    <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold ${
                      u.status === 'ACTIVE' ? 'bg-amber-100 text-amber-900 border border-amber-300' : 'bg-emerald-100 text-emerald-900'
                    }`}>
                      {u.status}
                    </span>
                  </td>
                  <td className="py-2.5 px-2.5 text-slate-500 truncate max-w-[130px]" title={u.narration}>{u.narration}</td>
                  <td className="py-2.5 px-2.5 text-center whitespace-nowrap">
                    {u.outstanding_balance > 0 ? (
                      <button
                        type="button"
                        onClick={() => {
                          setRepayItem(u);
                          setRepayAmount(String(u.outstanding_balance));
                          setRepayMode('CASH');
                          setRepayNarration('');
                          setRepayMsg('');
                        }}
                        className="px-2.5 py-1 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded text-[10px] cursor-pointer"
                      >
                        Repay (लौटाएं)
                      </button>
                    ) : (
                      <span className="text-[10px] font-bold text-emerald-700">✓ Settled</span>
                    )}
                  </td>
                </tr>
              ))
              )}
            </tbody>
          </table>
        </div>

        <PaginationBar
          totalItems={filteredUdhars.length}
          page={safePage}
          pageSize={pageSize}
          onPageChange={setCurrentPage}
          label="lenders"
        />
      </div>

      {/* 4. Add Borrowing Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-[200] flex justify-center items-start pt-16 pb-10 p-4 bg-slate-950/80 backdrop-blur-xs overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-lg overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="px-6 py-4 bg-gradient-to-r from-purple-600 to-indigo-700 text-white flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-white/20 flex items-center justify-center">
                  <HandCoins className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h3 className="text-base font-bold">Record Udhar / Borrowing Taken (उधार लिया)</h3>
                  <p className="text-[11px] text-white/80">Inflow credited directly to Cash Vault or Bank Book in Day Report</p>
                </div>
              </div>
              <button onClick={() => setShowAddModal(false)} className="cursor-pointer">
                <X className="w-5 h-5 text-white" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              {errorMsg && (
                <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 flex items-center gap-2 text-rose-700 text-xs">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{errorMsg}</span>
                </div>
              )}
              {successMsg && (
                <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center gap-2 text-emerald-800 text-xs">
                  <CheckCircle2 className="w-4 h-4 shrink-0" />
                  <span>{successMsg}</span>
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Lender / Creditor Name (किससे उधार लिया) *
                </label>
                <input
                  type="text"
                  placeholder="e.g. Ramesh Chandra (Director) / Aggarwal Finance"
                  value={formData.lender_name}
                  onChange={(e) => setFormData(prev => ({ ...prev, lender_name: e.target.value }))}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-purple-500"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Amount Borrowed (₹) *
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="1"
                    placeholder="e.g. 50000"
                    value={formData.amount}
                    onChange={(e) => setFormData(prev => ({ ...prev, amount: e.target.value }))}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs font-mono font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-purple-500"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Credited Into (खाता) *
                  </label>
                  <select
                    value={formData.payment_mode}
                    onChange={(e) => setFormData(prev => ({ ...prev, payment_mode: e.target.value }))}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs font-bold text-slate-800 bg-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                  >
                    <option value="CASH">CASH BOOK (गल्ले में जमा)</option>
                    <option value="BANK_ONLINE">BANK BOOK (बैंक खाता / NEFT)</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Phone Number
                  </label>
                  <input
                    type="text"
                    placeholder="Mobile / Contact"
                    value={formData.phone}
                    onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-purple-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Return Due Date
                  </label>
                  <DateInput
                    value={formData.due_date}
                    onChange={(e) => setFormData(prev => ({ ...prev, due_date: e.target.value }))}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs text-slate-800 bg-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Narration / Purpose (उधार लेने का कारण)
                </label>
                <textarea
                  rows="2"
                  placeholder="e.g. Temporary cash borrowed from director for branch liquidity buffer"
                  value={formData.narration}
                  onChange={(e) => setFormData(prev => ({ ...prev, narration: e.target.value }))}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-purple-500 resize-none"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 border border-slate-300 rounded-xl text-xs font-bold text-slate-700 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-bold cursor-pointer inline-flex items-center gap-1.5"
                >
                  {submitting ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
                  <span>Save Udhar & Credit Day Book</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 5. Repay Borrowing Modal */}
      {repayItem && (
        <div className="fixed inset-0 z-[200] flex justify-center items-start pt-16 pb-10 p-4 bg-slate-950/80 backdrop-blur-xs overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-md overflow-hidden p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-sm font-bold text-slate-900">Repay Udhar ({repayItem.voucher_no})</h3>
                <p className="text-[11px] text-slate-500">{repayItem.lender_name} • Due ₹{repayItem.outstanding_balance.toLocaleString('en-IN')}</p>
              </div>
              <button onClick={() => setRepayItem(null)} className="cursor-pointer"><X className="w-4 h-4 text-slate-500" /></button>
            </div>
            {repayMsg && (
              <div className="p-2.5 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs">{repayMsg}</div>
            )}
            <form onSubmit={handleSubmitRepay} className="space-y-3 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Repayment Amount (₹) *</label>
                <input
                  type="number"
                  step="0.01"
                  value={repayAmount}
                  onChange={(e) => setRepayAmount(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg font-mono font-bold"
                  required
                />
              </div>
              <div>
                <label className="block font-bold text-slate-700 mb-1">Payment Mode</label>
                <select
                  value={repayMode}
                  onChange={(e) => setRepayMode(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-white"
                >
                  <option value="CASH">Cash Counter (गल्ले से)</option>
                  <option value="BANK_ONLINE">Bank / UPI Transfer</option>
                </select>
              </div>
              <div>
                <label className="block font-bold text-slate-700 mb-1">Remarks</label>
                <input
                  type="text"
                  value={repayNarration}
                  onChange={(e) => setRepayNarration(e.target.value)}
                  placeholder="Repayment note..."
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button type="button" onClick={() => setRepayItem(null)} className="px-3 py-1.5 border border-slate-300 rounded-lg font-bold">Cancel</button>
                <button type="submit" disabled={repaySubmitting} className="px-4 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-lg font-bold cursor-pointer">
                  {repaySubmitting ? 'Saving...' : 'Confirm Repayment'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
