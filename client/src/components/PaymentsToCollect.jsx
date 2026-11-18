import React, { useState, useEffect } from 'react';
import { 
  CreditCard, 
  Search, 
  Filter, 
  ArrowDownLeft, 
  CheckCircle2, 
  AlertTriangle, 
  MessageSquare, 
  Clock, 
  Building, 
  User, 
  Wallet,
  Printer,
  Receipt
} from 'lucide-react';
import { apiRequest } from '../utils';

export default function PaymentsToCollect() {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [branchFilter, setBranchFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');

  // Collect Action Modal
  const [activeItem, setActiveItem] = useState(null);
  const [collectAmount, setCollectAmount] = useState('');
  const [paymentMode, setPaymentMode] = useState('CASH');
  const [collectSuccess, setCollectSuccess] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const fetchCollections = async () => {
    setLoading(true);
    try {
      const res = await apiRequest('/accounting/payments-to-collect');
      if (res && res.success) {
        setData(res.items || []);
      }
    } catch (err) {
      console.error('Failed to fetch payments to collect:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCollections();
  }, []);

  const handleOpenCollect = (item) => {
    setActiveItem(item);
    setCollectAmount(item.due_amount.toString());
    setPaymentMode('CASH');
    setCollectSuccess('');
  };

  const handleConfirmCollect = async () => {
    if (!activeItem) return;
    setSubmitting(true);
    try {
      const res = await apiRequest('/accounting/collect-payment', {
        method: 'POST',
        body: JSON.stringify({
          item_id: activeItem.id,
          account_no: activeItem.account_no,
          customer_name: activeItem.customer_name,
          amount: parseFloat(collectAmount),
          payment_mode: paymentMode
        })
      });

      if (res && res.success) {
        setCollectSuccess(res.message);
        setData(prev => prev.map(p => {
          if (p.id === activeItem.id) {
            return { ...p, status: 'COLLECTED', receipt_no: res.receipt_no };
          }
          return p;
        }));
        setTimeout(() => {
          setActiveItem(null);
          setCollectSuccess('');
        }, 1500);
      }
    } catch (err) {
      alert(err.message || 'Collection failed');
    } finally {
      setSubmitting(false);
    }
  };

  const filteredItems = data.filter(item => {
    const matchesSearch = !search ||
      item.customer_name.toLowerCase().includes(search.toLowerCase()) ||
      item.member_code.toLowerCase().includes(search.toLowerCase()) ||
      item.account_no.toLowerCase().includes(search.toLowerCase()) ||
      item.advisor_name.toLowerCase().includes(search.toLowerCase());
    const matchesBranch = branchFilter === 'ALL' || item.branch.includes(branchFilter);
    const matchesStatus = statusFilter === 'ALL' || item.status === statusFilter;
    return matchesSearch && matchesBranch && matchesStatus;
  });

  const totalDue = filteredItems.reduce((sum, i) => sum + (i.status !== 'COLLECTED' ? i.due_amount : 0), 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-200 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-orange-500/10 text-orange-600 flex items-center justify-center shrink-0">
            <ArrowDownLeft className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-black text-slate-900 tracking-tight">Payments to Collect</h1>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-orange-100 text-orange-800 border border-orange-200">
                Collections Desk
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Due installments, RD maturities & Loan EMIs scheduled for branch and field collection
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="text-right">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Total Outstanding Due</span>
            <span className="text-lg font-black text-orange-600 font-mono">
              ₹{totalDue.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
            </span>
          </div>
          <button
            onClick={() => window.print()}
            className="p-2.5 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-600 transition"
            title="Print Collection Register"
          >
            <Printer className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Filters & Search */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="relative flex-1 w-full sm:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search member, account no, advisor, phone..."
            className="w-full text-xs pl-9 pr-3 py-2 rounded-lg border border-slate-200 focus:outline-none focus:border-orange-500"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <select
            value={branchFilter}
            onChange={(e) => setBranchFilter(e.target.value)}
            className="text-xs py-2 px-3 rounded-lg border border-slate-200 font-medium"
          >
            <option value="ALL">All Branches</option>
            <option value="MAIN BRANCH">Main Branch</option>
            <option value="SHEKHUPURA">Shekhupura Branch</option>
            <option value="TARPL SAVING">Tarpl Saving</option>
          </select>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="text-xs py-2 px-3 rounded-lg border border-slate-200 font-medium"
          >
            <option value="ALL">All Statuses</option>
            <option value="OVERDUE">Overdue Only</option>
            <option value="DUE_TODAY">Due Today</option>
            <option value="DUE_SOON">Due Soon</option>
            <option value="COLLECTED">Collected</option>
          </select>
        </div>
      </div>

      {/* Comprehensive 15-Column Table */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead className="bg-slate-50 border-b border-slate-200 text-[10px] uppercase font-bold text-slate-500 tracking-wider">
              <tr>
                <th className="py-3 px-3">Branch</th>
                <th className="py-3 px-3">Center / Group</th>
                <th className="py-3 px-3">Advisor</th>
                <th className="py-3 px-3">Customer / Member</th>
                <th className="py-3 px-3">A/C Type</th>
                <th className="py-3 px-3">A/C Number</th>
                <th className="py-3 px-3 text-right">Due Amount</th>
                <th className="py-3 px-3">Due Date</th>
                <th className="py-3 px-3 text-center">Overdue</th>
                <th className="py-3 px-3 text-right">SB Balance</th>
                <th className="py-3 px-3 text-center">Status</th>
                <th className="py-3 px-3 text-center">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {filteredItems.map((item) => (
                <tr key={item.id} className="hover:bg-slate-50 transition">
                  <td className="py-3 px-3 font-semibold text-slate-800 text-[11px] whitespace-nowrap">
                    {item.branch}
                  </td>
                  <td className="py-3 px-3">
                    <div className="font-medium text-slate-900 text-[11px]">{item.center}</div>
                    <div className="text-[10px] text-slate-400">{item.group_name}</div>
                  </td>
                  <td className="py-3 px-3">
                    <div className="font-bold text-slate-800 text-[11px]">{item.advisor_name}</div>
                    <span className="text-[10px] font-mono text-emerald-700">{item.advisor_code}</span>
                  </td>
                  <td className="py-3 px-3">
                    <div className="font-black text-slate-900">{item.customer_name}</div>
                    <div className="text-[10px] text-slate-400 font-mono">{item.member_code} • {item.phone}</div>
                  </td>
                  <td className="py-3 px-3">
                    <span className="font-semibold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded text-[10px]">
                      {item.account_type}
                    </span>
                  </td>
                  <td className="py-3 px-3 font-mono font-bold text-slate-800">
                    {item.account_no}
                  </td>
                  <td className="py-3 px-3 text-right font-mono font-black text-slate-900 text-sm">
                    ₹{item.due_amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </td>
                  <td className="py-3 px-3 font-medium text-slate-700 whitespace-nowrap">
                    {item.due_date}
                  </td>
                  <td className="py-3 px-3 text-center font-bold">
                    {item.overdue_days > 0 ? (
                      <span className="text-rose-600 bg-rose-50 px-2 py-0.5 rounded-full text-[10px]">
                        +{item.overdue_days}d
                      </span>
                    ) : (
                      <span className="text-slate-400 text-[10px]">0d</span>
                    )}
                  </td>
                  <td className="py-3 px-3 text-right font-mono text-slate-600 text-[11px]">
                    ₹{item.savings_balance.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </td>
                  <td className="py-3 px-3 text-center">
                    <span className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold ${
                      item.status === 'COLLECTED'
                        ? 'bg-emerald-100 text-emerald-800'
                        : item.status === 'OVERDUE'
                        ? 'bg-rose-100 text-rose-800'
                        : 'bg-amber-100 text-amber-800'
                    }`}>
                      {item.status}
                    </span>
                  </td>
                  <td className="py-3 px-3 text-center">
                    {item.status === 'COLLECTED' ? (
                      <span className="text-[11px] font-bold text-emerald-700 flex items-center justify-center gap-1">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        {item.receipt_no || 'Paid'}
                      </span>
                    ) : (
                      <button
                        onClick={() => handleOpenCollect(item)}
                        className="px-3 py-1 bg-orange-600 hover:bg-orange-700 text-white rounded-lg font-bold text-[11px] shadow-xs cursor-pointer"
                      >
                        Collect
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Collect Action Drawer Modal */}
      {activeItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fadeIn">
          <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl border border-slate-200 p-6 space-y-4">
            <div className="flex items-center justify-between border-b pb-3">
              <div>
                <h3 className="text-base font-black text-slate-900">Receive Installment Collection</h3>
                <p className="text-xs text-slate-500">{activeItem.account_no} • {activeItem.account_type}</p>
              </div>
              <button onClick={() => setActiveItem(null)} className="text-slate-400 hover:text-slate-700">✕</button>
            </div>

            {collectSuccess && (
              <div className="p-3 bg-emerald-50 border border-emerald-200 text-xs text-emerald-800 rounded-xl flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                <span>{collectSuccess}</span>
              </div>
            )}

            <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 space-y-1 text-xs">
              <div className="flex justify-between">
                <span className="text-slate-500">Member:</span>
                <span className="font-bold text-slate-900">{activeItem.customer_name} ({activeItem.member_code})</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Advisor:</span>
                <span className="font-semibold text-slate-800">{activeItem.advisor_name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Savings Account Balance:</span>
                <span className="font-mono font-bold text-emerald-700">₹{activeItem.savings_balance.toLocaleString()}</span>
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">Collection Amount (₹)</label>
              <input
                type="number"
                value={collectAmount}
                onChange={(e) => setCollectAmount(e.target.value)}
                className="w-full text-base font-black p-2.5 rounded-xl border border-slate-300 font-mono"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">Payment Mode</label>
              <div className="grid grid-cols-3 gap-2">
                {['CASH', 'SAVINGS_DEBIT', 'UPI / BANK'].map(mode => (
                  <button
                    key={mode}
                    type="button"
                    onClick={() => setPaymentMode(mode)}
                    className={`py-2 px-2 text-center rounded-xl text-xs font-bold transition ${
                      paymentMode === mode ? 'bg-orange-600 text-white shadow-xs' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                    }`}
                  >
                    {mode}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setActiveItem(null)}
                className="px-4 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={submitting}
                onClick={handleConfirmCollect}
                className="px-5 py-2 rounded-xl bg-orange-600 hover:bg-orange-700 text-white font-bold text-xs shadow-xs disabled:opacity-50"
              >
                {submitting ? 'Processing...' : 'Confirm & Generate Receipt'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
