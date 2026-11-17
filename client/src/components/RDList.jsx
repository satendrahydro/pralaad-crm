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
  X
} from 'lucide-react';
import { formatINR, formatDate, apiRequest } from '../utils';

export default function RDList({ onOpenNewRD, isEmployee = false }) {
  const [rds, setRds] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [selectedRD, setSelectedRD] = useState(null);
  const [rdDetails, setRdDetails] = useState(null);
  const [detailsLoading, setDetailsLoading] = useState(false);
  const [collectModalOpen, setCollectModalOpen] = useState(false);
  const [selectedInstallment, setSelectedInstallment] = useState(null);
  const [collectLateFee, setCollectLateFee] = useState(0);
  const [paymentMode, setPaymentMode] = useState('CASH');

  const handleExportCSV = () => {
    if (!rds.length) return alert('No RD records to export');
    const headers = ['RD Number', 'Customer Name', 'Phone', 'Monthly Installment', 'Annual Rate', 'Tenure Months', 'Total Principal', 'Maturity Amount', 'Installments Paid', 'Status'];
    const rows = rds.map(r => [
      `"${r.rd_number || ''}"`,
      `"${r.customer_name || ''}"`,
      `"${r.customer_phone || ''}"`,
      r.monthly_installment,
      r.annual_rate,
      r.tenure_months,
      r.total_principal,
      r.maturity_amount,
      r.installments_paid,
      `"${r.status || ''}"`
    ]);
    const csvContent = 'data:text/csv;charset=utf-8,\uFEFF' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const link = document.createElement('a');
    link.href = encodeURI(csvContent);
    link.download = `RD_Portfolio_${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const fetchRDs = async () => {
    try {
      setLoading(true);
      let q = `/rd?status=${statusFilter}`;
      if (search) q += `&search=${encodeURIComponent(search)}`;
      const res = await apiRequest(q);
      if (res.success) setRds(res.rds || []);
    } catch (e) {
      console.error('Error fetching RDs:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRDs();
  }, [statusFilter, search]);

  const openDetails = async (rd) => {
    setSelectedRD(rd);
    try {
      setDetailsLoading(true);
      const res = await apiRequest(`/rd/${rd.id}`);
      if (res.success) setRdDetails(res);
    } catch (e) {
      alert('Error loading RD details: ' + e.message);
    } finally {
      setDetailsLoading(false);
    }
  };

  const handleCollectSubmit = async (e) => {
    e.preventDefault();
    if (!selectedRD || !selectedInstallment) return;

    try {
      const res = await apiRequest(`/rd/${selectedRD.id}/installments/${selectedInstallment.id}/collect`, {
        method: 'POST',
        body: JSON.stringify({
          payment_mode: paymentMode,
          late_fee: parseFloat(collectLateFee || 0)
        })
      });

      if (res.success) {
        alert(res.message || 'Installment processed successfully');
        setCollectModalOpen(false);
        openDetails(selectedRD);
        fetchRDs();
      }
    } catch (err) {
      alert('Error collecting installment: ' + err.message);
    }
  };

  return (
    <div className="space-y-6 animate-fadeIn pb-16">
      
      {/* 1. Header & Quick Actions */}
      <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-xl font-bold text-slate-900 tracking-tight">Recurring Deposits (RD)</h1>
            <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-teal-50 text-teal-700 border border-teal-200">
              Monthly Amortization
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Systematic monthly installment deposits with quarterly compound yield
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={fetchRDs}
            className="p-2 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg border border-slate-200 transition cursor-pointer"
            title="Refresh"
          >
            <RotateCw className="w-4 h-4" />
          </button>

          <button
            id="rd-export-csv-btn"
            onClick={handleExportCSV}
            className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold border border-slate-200 transition cursor-pointer flex items-center gap-1.5"
            title="Export RDs to CSV"
          >
            Export CSV
          </button>

          <button
            onClick={onOpenNewRD}
            className="inline-flex items-center gap-2 px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-semibold shadow-xs transition cursor-pointer"
          >
            <Plus className="w-4 h-4" /> Start New RD
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
            placeholder="Search by RD number, customer name, phone..."
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

      {/* 3. RD Data Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold">
              <tr>
                <th className="py-3 px-4">RD Number</th>
                <th className="py-3 px-4">Customer</th>
                <th className="py-3 px-4 text-right">Monthly Deposit</th>
                <th className="py-3 px-4 text-center">Tenure</th>
                <th className="py-3 px-4 text-center">Rate</th>
                <th className="py-3 px-4 text-center">Progress</th>
                <th className="py-3 px-4 text-right">Total Deposited</th>
                <th className="py-3 px-4 text-right">Maturity Value</th>
                <th className="py-3 px-4 text-center">Status</th>
                <th className="py-3 px-4 text-center">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan="10" className="py-12 text-center text-slate-400">Loading recurring deposits...</td>
                </tr>
              ) : rds.length === 0 ? (
                <tr>
                  <td colSpan="10" className="py-12 text-center text-slate-400">No recurring deposit records found.</td>
                </tr>
              ) : (
                rds.map(rd => {
                  const progressPct = Math.min(100, Math.round((rd.installments_paid / rd.tenure_months) * 100));
                  return (
                    <tr key={rd.id} className="hover:bg-slate-50/80 transition">
                      <td className="py-3 px-4 font-mono font-bold text-slate-900">{rd.rd_number}</td>
                      <td className="py-3 px-4">
                        <div className="font-semibold text-slate-800">{rd.customer_name}</div>
                        <div className="text-[11px] text-slate-400">{rd.customer_phone}</div>
                      </td>
                      <td className="py-3 px-4 text-right font-bold text-slate-900">{formatINR(rd.monthly_installment)}</td>
                      <td className="py-3 px-4 text-center text-slate-600">{rd.tenure_months} M</td>
                      <td className="py-3 px-4 text-center font-semibold text-teal-700">{rd.annual_rate}%</td>
                      <td className="py-3 px-4 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          <div className="w-16 bg-slate-100 rounded-full h-1.5 overflow-hidden">
                            <div className="bg-teal-600 h-1.5 rounded-full" style={{ width: `${progressPct}%` }}></div>
                          </div>
                          <span className="text-[10px] font-bold text-slate-600">{rd.installments_paid}/{rd.tenure_months}</span>
                        </div>
                      </td>
                      <td className="py-3 px-4 text-right font-semibold text-slate-800">{formatINR(rd.amount_deposited)}</td>
                      <td className="py-3 px-4 text-right font-bold text-slate-900">{formatINR(rd.maturity_amount)}</td>
                      <td className="py-3 px-4 text-center">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          rd.status === 'ACTIVE' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-slate-100 text-slate-700'
                        }`}>
                          {rd.status}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-center">
                        <button
                          onClick={() => openDetails(rd)}
                          className="inline-flex items-center gap-1 px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-800 font-semibold rounded text-[11px] transition cursor-pointer"
                        >
                          <Eye className="w-3.5 h-3.5" /> Details
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

      {/* 4. RD Detailed Installments Passbook Drawer */}
      {selectedRD && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-4xl w-full p-6 relative max-h-[90vh] flex flex-col animate-fadeIn">
            
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-teal-50 border border-teal-200 flex items-center justify-center text-teal-700 font-black">
                  RD
                </div>
                <div>
                  <h2 className="text-base font-bold text-slate-900">
                    {selectedRD.rd_number} — {selectedRD.customer_name}
                  </h2>
                  <p className="text-xs text-slate-500">
                    {formatINR(selectedRD.monthly_installment)}/month • {selectedRD.tenure_months} Months • {selectedRD.annual_rate}% p.a.
                  </p>
                </div>
              </div>

              <button
                onClick={() => setSelectedRD(null)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Content & Installment Table */}
            <div className="py-4 overflow-y-auto flex-1 space-y-4">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                  <span className="text-slate-400 block text-[11px]">Total Principal</span>
                  <span className="text-sm font-bold text-slate-900">{formatINR(selectedRD.total_principal)}</span>
                </div>
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                  <span className="text-slate-400 block text-[11px]">Amount Deposited</span>
                  <span className="text-sm font-bold text-teal-700">{formatINR(selectedRD.amount_deposited)}</span>
                </div>
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                  <span className="text-slate-400 block text-[11px]">Accrued Yield</span>
                  <span className="text-sm font-bold text-slate-900">{formatINR(selectedRD.total_interest)}</span>
                </div>
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                  <span className="text-slate-400 block text-[11px]">Maturity Amount</span>
                  <span className="text-sm font-bold text-slate-900">{formatINR(selectedRD.maturity_amount)}</span>
                </div>
              </div>

              <div className="border border-slate-200 rounded-xl overflow-hidden">
                <div className="px-4 py-2.5 bg-slate-50 border-b border-slate-200 font-bold text-xs text-slate-700 flex justify-between items-center">
                  <span>Monthly Installment Collection Schedule ({rdDetails?.installments?.length || 0})</span>
                  <span className="text-[11px] text-slate-400">Due every month on day of booking</span>
                </div>

                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50/50 border-b border-slate-200 text-slate-500 font-semibold">
                    <tr>
                      <th className="py-2.5 px-3">#</th>
                      <th className="py-2.5 px-3">Due Date</th>
                      <th className="py-2.5 px-3 text-right">Installment</th>
                      <th className="py-2.5 px-3 text-right">Late Fee</th>
                      <th className="py-2.5 px-3 text-center">Status</th>
                      <th className="py-2.5 px-3 text-center">Paid Date</th>
                      <th className="py-2.5 px-3 text-center">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {rdDetails?.installments?.map(inst => (
                      <tr key={inst.id} className="hover:bg-slate-50/50">
                        <td className="py-2.5 px-3 font-mono text-slate-400">{inst.installment_no}</td>
                        <td className="py-2.5 px-3 font-medium text-slate-800">{formatDate(inst.due_date)}</td>
                        <td className="py-2.5 px-3 text-right font-bold text-slate-900">{formatINR(inst.installment_amount)}</td>
                        <td className="py-2.5 px-3 text-right text-rose-600">{inst.late_fee > 0 ? formatINR(inst.late_fee) : '-'}</td>
                        <td className="py-2.5 px-3 text-center">
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            inst.status === 'COLLECTED' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                          }`}>
                            {inst.status}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 text-center text-slate-500">
                          {inst.paid_date ? formatDate(inst.paid_date) : '-'}
                        </td>
                        <td className="py-2.5 px-3 text-center">
                          {inst.status === 'PENDING' ? (
                            <button
                              onClick={() => {
                                setSelectedInstallment(inst);
                                setCollectLateFee(0);
                                setCollectModalOpen(true);
                              }}
                              className="px-2.5 py-1 bg-teal-600 hover:bg-teal-700 text-white rounded font-bold text-[11px] shadow-xs cursor-pointer"
                            >
                              Collect
                            </button>
                          ) : (
                            <span className="text-[10px] font-mono text-slate-400">{inst.payment_mode || 'PAID'}</span>
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

      {/* 5. Collect Installment Modal */}
      {collectModalOpen && selectedInstallment && (
        <div className="fixed inset-0 z-60 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl border border-slate-200 max-w-md w-full p-6 animate-fadeIn">
            <h3 className="text-base font-bold text-slate-900">
              Collect RD Installment #{selectedInstallment.installment_no}
            </h3>
            <p className="text-xs text-slate-500 mt-1">
              {selectedRD.customer_name} • Due Date: {formatDate(selectedInstallment.due_date)}
            </p>

            <form onSubmit={handleCollectSubmit} className="mt-4 space-y-4">
              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">Installment Amount</label>
                <input
                  type="text"
                  readOnly
                  value={formatINR(selectedInstallment.installment_amount)}
                  className="w-full text-xs p-2.5 bg-slate-100 border border-slate-200 rounded-lg font-bold text-slate-800"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">Late Fine / Penalty (if overdue)</label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={collectLateFee}
                  onChange={(e) => setCollectLateFee(e.target.value)}
                  placeholder="0.00"
                  className="w-full text-xs p-2.5 bg-white border border-slate-200 rounded-lg focus:outline-none focus:border-slate-800"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">Collection Mode</label>
                <select
                  value={paymentMode}
                  onChange={(e) => setPaymentMode(e.target.value)}
                  className="w-full text-xs p-2.5 bg-white border border-slate-200 rounded-lg focus:outline-none focus:border-slate-800"
                >
                  <option value="CASH">Cash in Vault</option>
                  <option value="BANK_NEFT">Bank NEFT / Direct Transfer</option>
                  <option value="SAVINGS_TRANSFER">Transfer from Customer Savings A/c</option>
                </select>
              </div>

              <div className="p-3 bg-teal-50 border border-teal-200 rounded-xl flex justify-between items-center">
                <span className="text-xs font-semibold text-teal-900">Total Collection Amount:</span>
                <span className="text-sm font-black text-teal-800">
                  {formatINR(selectedInstallment.installment_amount + parseFloat(collectLateFee || 0))}
                </span>
              </div>

              {isEmployee && (
                <p className="text-[11px] text-amber-700 bg-amber-50 p-2 rounded border border-amber-200">
                  ⚠️ As Employee (Maker), this collection voucher will be submitted for Admin Checker verification before ledger posting.
                </p>
              )}

              <div className="flex items-center gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setCollectModalOpen(false)}
                  className="flex-1 py-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2 rounded-lg bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs shadow-xs"
                >
                  Confirm Collection
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
