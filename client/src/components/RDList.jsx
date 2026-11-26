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
  Check,
  Download,
  FileSpreadsheet,
  Sparkles
} from 'lucide-react';
import { formatINR, formatDate, apiRequest, onNumericInputChange } from '../utils';
import { exportToExcel } from '../utils/excelExport';
import PaginationBar from './PaginationBar';
import DateInput from './DateInput';

export default function RDList({ onOpenNewRD, isEmployee = false, onViewCustomerProfile }) {
  const [rds, setRds] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 25;
  const [selectedRD, setSelectedRD] = useState(null);
  const [rdDetails, setRdDetails] = useState(null);
  const [detailsLoading, setDetailsLoading] = useState(false);
  const [collectModalOpen, setCollectModalOpen] = useState(false);
  const [selectedInstallment, setSelectedInstallment] = useState(null);
  const [collectLateFee, setCollectLateFee] = useState(0);
  const [paymentMode, setPaymentMode] = useState('CASH');
  const [collectDate, setCollectDate] = useState(new Date().toISOString().split('T')[0]);
  const [collectRef, setCollectRef] = useState('');

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        if (collectModalOpen) setCollectModalOpen(false);
        else if (selectedRD) setSelectedRD(null);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedRD, collectModalOpen]);

  const handleExportExcel = () => {
    if (!rds.length) return alert('No RD records to export');
    const rows = rds.map(r => ({
      'RD Number': r.rd_number || '',
      'Customer Name': r.customer_name || '',
      'Phone': r.customer_phone || '',
      'Monthly Installment (₹)': r.monthly_installment,
      'Interest Rate (% p.a.)': r.annual_rate,
      'Tenure (Months)': r.tenure_months,
      'Total Principal (₹)': r.total_principal,
      'Maturity Amount (₹)': r.maturity_amount,
      'Installments Paid': r.installments_paid,
      'Status': r.status || ''
    }));
    exportToExcel(rows, 'TARPL_RD_Portfolio', 'Recurring Deposits');
  };

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

  // Opens collection modal directly for the first overdue / pending installment of an RD
  const openCollectNext = async (rd) => {
    setSelectedRD(rd);
    try {
      setDetailsLoading(true);
      const res = await apiRequest(`/rd/${rd.id}`);
      if (res.success) {
        setRdDetails(res);
        const nextInst = (res.installments || []).find(i => !['COLLECTED', 'PAID'].includes(i.status));
        if (nextInst) {
          setSelectedInstallment(nextInst);
          setCollectLateFee(0);
          setCollectDate(new Date().toISOString().split('T')[0]);
          setCollectRef(`COLL-RD-${Date.now().toString().slice(-6)}`);
          setCollectModalOpen(true);
        } else {
          alert('All installments for this Recurring Deposit have already been collected.');
        }
      }
    } catch (e) {
      alert('Error loading RD installments: ' + e.message);
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
          late_fee: parseFloat(collectLateFee || 0),
          paid_date: collectDate,
          collection_date: collectDate,
          transaction_ref: collectRef
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

          {/* Dual Export: Excel (.xlsx) & CSV */}
          <div className="flex items-center rounded-xl border border-slate-200 bg-slate-100 p-0.5 shadow-2xs">
            <button
              id="rd-export-excel-btn"
              onClick={handleExportExcel}
              className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg text-xs flex items-center gap-1.5 transition cursor-pointer shadow-xs active:scale-95"
              title="Export to Microsoft Excel (.xlsx)"
            >
              <FileSpreadsheet className="w-3.5 h-3.5 text-white" />
              <span>Excel (.xlsx)</span>
            </button>
            <button
              id="rd-export-csv-btn"
              onClick={handleExportCSV}
              className="px-2.5 py-1.5 hover:bg-slate-200 text-slate-700 font-bold rounded-lg text-xs flex items-center gap-1 transition cursor-pointer"
              title="Export to CSV"
            >
              <Download className="w-3.5 h-3.5 text-slate-500" />
              <span>CSV</span>
            </button>
          </div>

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
                rds.slice((Math.min(currentPage, Math.max(1, Math.ceil(rds.length / pageSize))) - 1) * pageSize, Math.min(currentPage, Math.max(1, Math.ceil(rds.length / pageSize))) * pageSize).map(rd => {
                  const progressPct = Math.min(100, Math.round((rd.installments_paid / rd.tenure_months) * 100));
                  return (
                    <tr key={rd.id} className="hover:bg-slate-50/80 transition">
                      <td className="py-3 px-4 font-mono font-bold text-slate-900">{rd.rd_number}</td>
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => onViewCustomerProfile && onViewCustomerProfile(rd.customer_id)}
                            className="font-bold text-slate-900 hover:text-teal-700 hover:underline text-left cursor-pointer truncate max-w-[150px]"
                            title="Click to view Customer 360 Profile"
                          >
                            {rd.customer_name}
                          </button>
                          <button
                            type="button"
                            onClick={() => onViewCustomerProfile && onViewCustomerProfile(rd.customer_id)}
                            className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 bg-gradient-to-r from-emerald-600 to-teal-700 hover:from-emerald-700 hover:to-teal-800 text-white rounded-md transition shadow-2xs cursor-pointer active:scale-95 shrink-0"
                            title="Customer 360: View all active accounts & services"
                          >
                            <Sparkles className="w-2.5 h-2.5 text-amber-300" />
                            <span>360°</span>
                          </button>
                        </div>
                        <div className="text-[11px] text-slate-400 mt-0.5">{rd.customer_phone}</div>
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
                        <div className="inline-flex items-center gap-1.5 justify-center">
                          {rd.status === 'ACTIVE' && (rd.installments_paid || 0) < (rd.tenure_months || 0) && (
                            <button
                              type="button"
                              onClick={() => openCollectNext(rd)}
                              className="inline-flex items-center gap-1 px-2.5 py-1 bg-teal-600 hover:bg-teal-700 text-white font-bold rounded text-[11px] shadow-2xs transition cursor-pointer active:scale-95"
                              title="Collect next pending RD installment"
                            >
                              <CreditCard className="w-3.5 h-3.5" /> Collect क़िस्त
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => openDetails(rd)}
                            className="inline-flex items-center gap-1 px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-800 font-semibold rounded text-[11px] transition cursor-pointer"
                          >
                            <Eye className="w-3.5 h-3.5" /> Details
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
        <PaginationBar totalItems={rds.length} page={currentPage} pageSize={pageSize} onPageChange={setCurrentPage} label="RDs" />
      </div>

      {/* 4. RD Detailed Installments Passbook Drawer */}
      {selectedRD && createPortal(
        <div 
          className="fixed inset-0 z-[9999] bg-slate-950/80 backdrop-blur-sm flex justify-center items-center p-3 sm:p-6 overflow-hidden"
          onClick={(e) => { if (e.target === e.currentTarget) setSelectedRD(null); }}
        >
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-[96vw] xl:max-w-6xl w-full max-h-[88vh] flex flex-col overflow-hidden animate-fadeIn relative">
            
            {/* Pinned Top Header */}
            <div className="shrink-0 px-4 sm:px-6 py-3.5 border-b border-slate-200 bg-white flex items-center justify-between gap-3 shadow-xs z-10">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-10 h-10 rounded-xl bg-teal-50 border border-teal-200 flex items-center justify-center text-teal-700 font-black shrink-0">
                  RD
                </div>
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="text-base font-bold text-slate-900 truncate">
                      {selectedRD.rd_number} — {selectedRD.customer_name}
                    </h2>
                    {onViewCustomerProfile && (
                      <button
                        type="button"
                        onClick={() => onViewCustomerProfile(selectedRD.customer_id)}
                        className="px-2 py-0.5 bg-teal-50 hover:bg-teal-100 text-teal-700 border border-teal-200 rounded text-xs font-semibold cursor-pointer transition flex items-center gap-1 shrink-0"
                        title="View Complete Customer 360° Profile & All Services"
                      >
                        👤 360° All Services
                      </button>
                    )}
                  </div>
                  <p className="text-xs text-slate-500 truncate">
                    {formatINR(selectedRD.monthly_installment)}/month • {selectedRD.tenure_months} Months • {selectedRD.annual_rate}% p.a.
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setSelectedRD(null)}
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-slate-100 hover:bg-rose-50 text-slate-700 hover:text-rose-600 border border-slate-300 hover:border-rose-200 rounded-xl font-bold text-xs transition cursor-pointer active:scale-95 shrink-0"
                title="Close Passbook"
              >
                <X className="w-4 h-4 stroke-[2.5]" />
                <span>Close</span>
              </button>
            </div>

            {/* Content & Installment Table */}
            <div className="p-4 sm:p-6 overflow-y-auto flex-1 space-y-4 min-h-0">
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
                  <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 uppercase font-bold text-[10px] tracking-wider">
                    <tr>
                      <th className="py-2.5 px-3">#</th>
                      <th className="py-2.5 px-3 text-slate-800 bg-slate-100">Schedule / Due Date (देय तिथि)</th>
                      <th className="py-2.5 px-3 text-slate-800 bg-slate-100">Collected Date (जमा करने की तारीख)</th>
                      <th className="py-2.5 px-3 text-right">Installment</th>
                      <th className="py-2.5 px-3 text-right">Late Fee</th>
                      <th className="py-2.5 px-3">Payment Mode & Ref</th>
                      <th className="py-2.5 px-3 text-center">Status</th>
                      <th className="py-2.5 px-3 text-center">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {rdDetails?.installments?.map(inst => {
                      const todayStr = new Date().toISOString().split('T')[0];
                      const isCollected = inst.status === 'COLLECTED' || inst.status === 'PAID';
                      const isOverdue = !isCollected && inst.due_date && inst.due_date < todayStr;
                      const isFuture = !isCollected && inst.due_date && inst.due_date > todayStr;
                      const isDueToday = !isCollected && inst.due_date && inst.due_date === todayStr;

                      return (
                        <tr key={inst.id} className="hover:bg-slate-50/50">
                          <td className="py-2.5 px-3 font-mono text-slate-400">{inst.installment_no}</td>
                          <td className="py-2.5 px-3 bg-amber-50/20">
                            <span className="font-mono font-bold text-slate-800">{formatDate(inst.due_date)}</span>
                            {isOverdue && (
                              <span className="ml-1.5 inline-block text-[9px] font-bold text-rose-700 bg-rose-50 px-1.5 py-0.2 rounded border border-rose-200">
                                ⚠️ Overdue
                              </span>
                            )}
                            {isFuture && (
                              <span className="ml-1.5 inline-block text-[9px] font-semibold text-sky-700 bg-sky-50 px-1.5 py-0.2 rounded border border-sky-200">
                                🗓️ Scheduled
                              </span>
                            )}
                          </td>
                          <td className="py-2.5 px-3 bg-emerald-50/20">
                            {inst.paid_date ? (
                              <span className="inline-flex items-center gap-1 font-mono font-bold text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded-lg border border-emerald-300">
                                <Check className="w-2.5 h-2.5 text-emerald-600" />
                                {formatDate(inst.paid_date)}
                              </span>
                            ) : isFuture ? (
                              <span className="text-[10px] text-slate-500 font-medium bg-slate-100 px-1.5 py-0.5 rounded">
                                Upcoming Due
                              </span>
                            ) : (
                              <span className="text-[10px] text-amber-700 font-bold bg-amber-100/60 px-1.5 py-0.5 rounded">
                                Awaiting Deposit
                              </span>
                            )}
                          </td>
                          <td className="py-2.5 px-3 text-right font-mono font-bold text-slate-900">{formatINR(inst.installment_amount)}</td>
                          <td className="py-2.5 px-3 text-right text-rose-600 font-mono">{inst.late_fee > 0 ? formatINR(inst.late_fee) : '-'}</td>
                          <td className="py-2.5 px-3">
                            {isCollected ? (
                              <div>
                                <span className="text-[10px] font-bold text-slate-800 bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200">
                                  {inst.payment_mode || 'CASH'}
                                </span>
                                {inst.transaction_ref && (
                                  <div className="text-[9px] font-mono text-slate-500 mt-0.5">{inst.transaction_ref}</div>
                                )}
                              </div>
                            ) : (
                              <span className="text-[10px] text-slate-400 italic">-</span>
                            )}
                          </td>
                          <td className="py-2.5 px-3 text-center">
                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                              isCollected 
                                ? 'bg-emerald-100 text-emerald-800 border border-emerald-300' 
                                : isFuture 
                                ? 'bg-sky-50 text-sky-800 border border-sky-200'
                                : isDueToday
                                ? 'bg-amber-100 text-amber-800 border border-amber-300'
                                : 'bg-rose-100 text-rose-800 border border-rose-200'
                            }`}>
                              {isCollected ? 'COLLECTED' : isFuture ? 'SCHEDULED' : isDueToday ? 'DUE TODAY' : 'OVERDUE'}
                            </span>
                          </td>
                          <td className="py-2.5 px-3 text-center">
                            {!isCollected ? (
                              <button
                                onClick={() => {
                                  setSelectedInstallment(inst);
                                  setCollectLateFee(0);
                                  setCollectDate(new Date().toISOString().split('T')[0]);
                                  setCollectRef(`COLL-RD-${Date.now().toString().slice(-6)}`);
                                  setCollectModalOpen(true);
                                }}
                                className={`px-2.5 py-1 rounded-lg font-bold text-[11px] shadow-xs cursor-pointer ${
                                  isFuture ? 'bg-slate-200 hover:bg-slate-300 text-slate-700' : 'bg-teal-600 hover:bg-teal-700 text-white'
                                }`}
                              >
                                {isFuture ? 'Advance Collect' : 'Collect'}
                              </button>
                            ) : (
                              <span className="text-[10px] font-bold text-emerald-700">✓ Received</span>
                            )}
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

      {/* 5. Collect Installment Modal */}
      {collectModalOpen && selectedInstallment && createPortal(
        <div className="fixed inset-0 z-[10000] bg-slate-950/80 backdrop-blur-xs flex justify-center items-start pt-16 pb-10 p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-xl border border-slate-200 max-w-md w-full p-6 animate-fadeIn">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div>
                <h3 className="text-base font-bold text-slate-900">
                  Collect RD Installment #{selectedInstallment.installment_no}
                </h3>
                <p className="text-xs text-slate-500 mt-1">
                  {selectedRD.customer_name} • Scheduled Due Date: {formatDate(selectedInstallment.due_date)}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setCollectModalOpen(false)}
                className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-100 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCollectSubmit} className="mt-4 space-y-3.5">
              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="text-[11px] font-bold text-slate-700 uppercase block mb-1">Installment Amount</label>
                  <input
                    type="text"
                    readOnly
                    value={formatINR(selectedInstallment.installment_amount)}
                    className="w-full text-xs p-2 bg-slate-100 border border-slate-200 rounded-lg font-bold text-slate-800 font-mono"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-bold text-slate-700 uppercase block mb-1">Late Fine / Penalty</label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={collectLateFee}
                    onChange={(e) => onNumericInputChange(e, setCollectLateFee)}
                    placeholder="0.00"
                    className="w-full text-xs p-2 bg-white border border-slate-300 rounded-lg font-mono font-bold focus:outline-none focus:border-slate-800"
                  />
                </div>
              </div>

              {/* Deposit / Collection Date */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-[11px] font-bold text-slate-700 uppercase">
                    Collection Date (जमा करने की तारीख) *
                  </label>
                  {selectedInstallment.due_date && selectedInstallment.due_date <= new Date().toISOString().split('T')[0] && collectDate !== selectedInstallment.due_date && (
                    <button
                      type="button"
                      onClick={() => setCollectDate(selectedInstallment.due_date)}
                      className="text-[10px] font-bold text-teal-700 bg-teal-50 hover:bg-teal-100 px-2 py-0.5 rounded border border-teal-200 cursor-pointer"
                    >
                      Use Due Date ({formatDate(selectedInstallment.due_date)})
                    </button>
                  )}
                </div>
                <DateInput
                  required
                  max={new Date().toISOString().split('T')[0]}
                  value={collectDate}
                  onChange={(e) => setCollectDate(e.target.value)}
                  className="w-full text-xs p-2 bg-white border border-slate-300 rounded-lg font-mono font-bold focus:outline-none focus:border-teal-600"
                />
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-700 uppercase block mb-1">Collection Mode</label>
                <select
                  value={paymentMode}
                  onChange={(e) => setPaymentMode(e.target.value)}
                  className="w-full text-xs p-2 bg-white border border-slate-300 rounded-lg font-bold focus:outline-none focus:border-slate-800"
                >
                  <option value="CASH">Cash in Vault (गल्ले में जमा)</option>
                  <option value="BANK_NEFT">Bank NEFT / Direct Transfer</option>
                  <option value="SAVINGS_TRANSFER">Transfer from Customer Savings A/c</option>
                  <option value="CHEQUE">Cheque / Demand Draft</option>
                </select>
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-700 uppercase block mb-1">
                  Receipt / Transaction Reference No
                </label>
                <input
                  type="text"
                  placeholder="e.g. COLL-RD-91823"
                  value={collectRef}
                  onChange={(e) => setCollectRef(e.target.value)}
                  className="w-full text-xs p-2 bg-white border border-slate-300 rounded-lg font-mono font-bold"
                />
              </div>

              <div className="p-3 bg-teal-50 border border-teal-200 rounded-xl flex justify-between items-center">
                <span className="text-xs font-semibold text-teal-900">Total Collection Amount:</span>
                <span className="text-sm font-black text-teal-800 font-mono">
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
                  className="flex-1 py-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2 rounded-lg bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs shadow-xs cursor-pointer"
                >
                  Confirm Collection
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
