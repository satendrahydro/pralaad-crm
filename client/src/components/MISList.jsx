import React, { useState, useEffect } from 'react';
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
  Send
} from 'lucide-react';
import { formatINR, formatDate, apiRequest } from '../utils';

export default function MISList({ onOpenNewMIS, isEmployee = false }) {
  const [accounts, setAccounts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [selectedMIS, setSelectedMIS] = useState(null);
  const [misDetails, setMisDetails] = useState(null);
  const [detailsLoading, setDetailsLoading] = useState(false);

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
  const [payoutModalOpen, setPayoutModalOpen] = useState(false);
  const [selectedSchedule, setSelectedSchedule] = useState(null);
  const [paymentRef, setPaymentRef] = useState('');

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
          payment_reference: paymentRef || `NEFT-MIS-${Date.now().toString().slice(-6)}`
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

          <button
            id="mis-export-csv-btn"
            onClick={handleExportCSV}
            className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold border border-slate-200 transition cursor-pointer flex items-center gap-1.5"
            title="Export MIS to CSV"
          >
            Export CSV
          </button>

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
                accounts.map(mis => (
                  <tr key={mis.id} className="hover:bg-slate-50/80 transition">
                    <td className="py-3 px-4 font-mono font-bold text-slate-900">{mis.mis_number}</td>
                    <td className="py-3 px-4">
                      <div className="font-semibold text-slate-800">{mis.customer_name}</div>
                      <div className="text-[11px] text-slate-400">{mis.customer_phone}</div>
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
      </div>

      {/* 4. MIS Detailed Payout Schedule Drawer */}
      {selectedMIS && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-4xl w-full p-6 relative max-h-[90vh] flex flex-col animate-fadeIn">
            
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-blue-50 border border-blue-200 flex items-center justify-center text-blue-700 font-black">
                  MIS
                </div>
                <div>
                  <h2 className="text-base font-bold text-slate-900">
                    {selectedMIS.mis_number} — {selectedMIS.customer_name}
                  </h2>
                  <p className="text-xs text-slate-500">
                    {formatINR(selectedMIS.deposit_amount)} Principal • {selectedMIS.tenure_months} Months • {selectedMIS.annual_rate}% p.a.
                  </p>
                </div>
              </div>

              <button
                onClick={() => setSelectedMIS(null)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="py-4 overflow-y-auto flex-1 space-y-4">
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

              <div className="border border-slate-200 rounded-xl overflow-hidden">
                <div className="px-4 py-2.5 bg-slate-50 border-b border-slate-200 font-bold text-xs text-slate-700 flex justify-between items-center">
                  <span>Monthly Interest Payout Schedule ({misDetails?.schedules?.length || 0})</span>
                  <span className="text-[11px] text-slate-400">Credited to Customer Bank/Savings A/c</span>
                </div>

                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50/50 border-b border-slate-200 text-slate-500 font-semibold">
                    <tr>
                      <th className="py-2.5 px-3">Month</th>
                      <th className="py-2.5 px-3">Payout Date</th>
                      <th className="py-2.5 px-3 text-right">Net Payable</th>
                      <th className="py-2.5 px-3 text-center">Status</th>
                      <th className="py-2.5 px-3 text-center">Paid Date</th>
                      <th className="py-2.5 px-3">Payment Reference</th>
                      <th className="py-2.5 px-3 text-center">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {misDetails?.schedules?.map(sched => (
                      <tr key={sched.id} className="hover:bg-slate-50/50">
                        <td className="py-2.5 px-3 font-mono text-slate-400">#{sched.month_no}</td>
                        <td className="py-2.5 px-3 font-medium text-slate-800">{formatDate(sched.payout_date)}</td>
                        <td className="py-2.5 px-3 text-right font-bold text-slate-900">{formatINR(sched.net_payable)}</td>
                        <td className="py-2.5 px-3 text-center">
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            sched.status === 'PAID' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                          }`}>
                            {sched.status}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 text-center text-slate-500">
                          {sched.paid_date ? formatDate(sched.paid_date) : '-'}
                        </td>
                        <td className="py-2.5 px-3 font-mono text-slate-600 truncate max-w-xs">
                          {sched.payment_reference || '-'}
                        </td>
                        <td className="py-2.5 px-3 text-center">
                          {sched.status === 'PENDING' ? (
                            <button
                              onClick={() => {
                                setSelectedSchedule(sched);
                                setPaymentRef(`NEFT-MIS-${Date.now().toString().slice(-6)}`);
                                setPayoutModalOpen(true);
                              }}
                              className="px-2.5 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded font-bold text-[11px] shadow-xs cursor-pointer"
                            >
                              Disburse
                            </button>
                          ) : (
                            <span className="text-[10px] text-emerald-700 font-bold">Disbursed</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

          </div>
        </div>
      )}

      {/* 5. Disburse Payout Modal */}
      {payoutModalOpen && selectedSchedule && (
        <div className="fixed inset-0 z-60 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl border border-slate-200 max-w-md w-full p-6 animate-fadeIn">
            <h3 className="text-base font-bold text-slate-900">
              Disburse MIS Month #{selectedSchedule.month_no} Payout
            </h3>
            <p className="text-xs text-slate-500 mt-1">
              Customer: {selectedMIS.customer_name} • Payout Due: {formatDate(selectedSchedule.payout_date)}
            </p>

            <form onSubmit={handleDisbursePayout} className="mt-4 space-y-4">
              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">Monthly Interest Payout</label>
                <input
                  type="text"
                  readOnly
                  value={formatINR(selectedSchedule.net_payable)}
                  className="w-full text-xs p-2.5 bg-slate-100 border border-slate-200 rounded-lg font-bold text-emerald-700"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">Payment Reference / Bank NEFT UTR</label>
                <input
                  type="text"
                  required
                  value={paymentRef}
                  onChange={(e) => setPaymentRef(e.target.value)}
                  className="w-full text-xs p-2.5 bg-white border border-slate-200 rounded-lg focus:outline-none focus:border-slate-800"
                />
              </div>

              {isEmployee && (
                <p className="text-[11px] text-amber-700 bg-amber-50 p-2 rounded border border-amber-200">
                  ⚠️ As Employee (Maker), this payout request will be submitted for Admin Checker verification before releasing payment.
                </p>
              )}

              <div className="flex items-center gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setPayoutModalOpen(false)}
                  className="flex-1 py-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-xs"
                >
                  Authorize Payout
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
