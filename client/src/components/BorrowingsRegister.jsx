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

  const filteredUdhars = udhars.filter(u => {
    return !search || 
      u.voucher_no.toLowerCase().includes(search.toLowerCase()) ||
      u.lender_name.toLowerCase().includes(search.toLowerCase()) ||
      u.narration.toLowerCase().includes(search.toLowerCase());
  });

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
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search voucher, lender..."
              className="w-full text-xs pl-8 pr-3 py-1.5 rounded-lg border border-slate-200 focus:outline-none focus:border-purple-500"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead className="bg-slate-50 border-b border-slate-200 text-[10px] uppercase font-bold text-slate-500 tracking-wider">
              <tr>
                <th className="py-2.5 px-4">Voucher No</th>
                <th className="py-2.5 px-4">Date</th>
                <th className="py-2.5 px-4">Lender / Creditor Name</th>
                <th className="py-2.5 px-4">Deposit To</th>
                <th className="py-2.5 px-4 text-right">Amount Borrowed</th>
                <th className="py-2.5 px-4 text-right">Repaid</th>
                <th className="py-2.5 px-4 text-right">Balance Due</th>
                <th className="py-2.5 px-4">Status</th>
                <th className="py-2.5 px-4">Narration</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {filteredUdhars.map((u) => (
                <tr key={u.id} className="hover:bg-slate-50 transition">
                  <td className="py-3 px-4 font-mono font-bold text-purple-700">{u.voucher_no}</td>
                  <td className="py-3 px-4 text-slate-500 whitespace-nowrap">{u.borrowing_date}</td>
                  <td className="py-3 px-4 font-bold text-slate-900">
                    <div>{u.lender_name}</div>
                    {u.phone && <div className="text-[10px] text-slate-400 font-normal">{u.phone}</div>}
                  </td>
                  <td className="py-3 px-4">
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-700">
                      {u.payment_mode === 'CASH' ? 'CASH BOOK (गल्ला)' : 'BANK BOOK'}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-right font-mono font-bold text-purple-700">
                    ₹{u.amount.toLocaleString('en-IN')}
                  </td>
                  <td className="py-3 px-4 text-right font-mono font-bold text-emerald-700">
                    ₹{u.amount_repaid.toLocaleString('en-IN')}
                  </td>
                  <td className="py-3 px-4 text-right font-mono font-black text-rose-700">
                    ₹{u.outstanding_balance.toLocaleString('en-IN')}
                  </td>
                  <td className="py-3 px-4">
                    <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold ${
                      u.status === 'ACTIVE' ? 'bg-amber-100 text-amber-900 border border-amber-300' : 'bg-emerald-100 text-emerald-900'
                    }`}>
                      {u.status}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-slate-500 max-w-xs truncate">{u.narration}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* 4. Add Borrowing Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs overflow-y-auto">
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
                  <input
                    type="date"
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
    </div>
  );
}
