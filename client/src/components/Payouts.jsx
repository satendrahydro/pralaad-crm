import React, { useState, useEffect } from 'react';
import { 
  CalendarDays, 
  CheckCircle2, 
  Clock, 
  CreditCard, 
  Search, 
  Building2,
  Check,
  Send,
  X,
  FileSpreadsheet,
  AlertCircle,
  RefreshCw,
  Wallet,
  ArrowUpRight
} from 'lucide-react';
import { formatINR, formatDate, apiRequest } from '../utils';
import DateInput from './DateInput';

export default function Payouts() {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('PENDING'); // 'PENDING' | 'PAID' | 'ALL'
  const [search, setSearch] = useState('');
  const [selectedIds, setSelectedIds] = useState([]);

  // Disbursal Modal State
  const [activeItem, setActiveItem] = useState(null);
  const [disbursalDate, setDisbursalDate] = useState(new Date().toISOString().split('T')[0]);
  const [paymentMode, setPaymentMode] = useState('NEFT');
  const [utrNumber, setUtrNumber] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [disburseError, setDisburseError] = useState('');

  const fetchPayouts = async () => {
    try {
      setLoading(true);
      const res = await apiRequest(`/fds/payouts?status=${filter}&search=${encodeURIComponent(search)}`);
      setData(res.payouts || []);
      setSelectedIds([]);
    } catch (err) {
      console.error('Error fetching payouts:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPayouts();
  }, [filter]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    fetchPayouts();
  };

  const handleSelectAll = (e) => {
    if (e.target.checked) {
      setSelectedIds(data.map(d => d.id));
    } else {
      setSelectedIds([]);
    }
  };

  const handleToggleSelect = (id) => {
    setSelectedIds(prev => 
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  const handleExportNEFTSheet = () => {
    const listToExport = selectedIds.length > 0 
      ? data.filter(d => selectedIds.includes(d.id))
      : data;
    
    if (!listToExport.length) return alert('No payouts available to export');

    const headers = ['Beneficiary Name', 'Bank Name', 'Account Number', 'IFSC Code', 'Payout Amount', 'Schedule / Due Date', 'Disbursed Date', 'FD Number', 'Mode', 'UTR Ref'];
    const rows = listToExport.map(item => [
      `"${item.customer_name || ''}"`,
      `"${item.bank_name || 'HDFC Bank'}"`,
      `"${item.account_no || ''}"`,
      `"${item.ifsc_code || ''}"`,
      item.payout_amount,
      `"${item.payout_date || ''}"`,
      `"${item.paid_date || ''}"`,
      `"${item.fd_number || ''}"`,
      `"${item.payment_mode || 'NEFT'}"`,
      `"${item.payment_reference || ''}"`
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,\uFEFF' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const link = document.createElement('a');
    link.href = encodeURI(csvContent);
    link.download = `Interest_Payout_Batch_${filter}_${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const openDisburseModal = (item) => {
    setActiveItem(item);
    setDisbursalDate(new Date().toISOString().split('T')[0]);
    setPaymentMode('NEFT');
    setUtrNumber(`NEFT-${Date.now().toString().slice(-6)}`);
    setDisburseError('');
  };

  const handleConfirmDisbursal = async (e) => {
    e.preventDefault();
    if (!activeItem) return;
    setSubmitting(true);
    setDisburseError('');

    try {
      const user = JSON.parse(localStorage.getItem('pralaad_fd_user') || '{}');
      if (user.role === 'employee') {
        const res = await apiRequest('/approvals', {
          method: 'POST',
          body: JSON.stringify({
            request_type: 'INTEREST_PAYOUT',
            customer_id: activeItem.customer_id,
            fd_id: activeItem.fd_id,
            proposed_amount: activeItem.payout_amount,
            request_data: {
              scheduleId: activeItem.id,
              paymentReference: utrNumber,
              paid_date: disbursalDate,
              payment_mode: paymentMode
            },
            remarks: `Staff Payout Proposal: ${activeItem.fd_number || 'FD'} (UTR: ${utrNumber}) Disbursed on ${disbursalDate}`
          })
        });
        alert(`Payout proposal submitted (${res.request_number}). Awaiting Admin Checker verification.`);
        setActiveItem(null);
        fetchPayouts();
        return;
      }

      await apiRequest(`/fds/schedule/${activeItem.id}/mark-paid`, {
        method: 'POST',
        body: JSON.stringify({
          payment_reference: utrNumber,
          paid_date: disbursalDate,
          payment_mode: paymentMode
        })
      });
      alert('Payout disbursed and recorded successfully!');
      setActiveItem(null);
      fetchPayouts();
    } catch (err) {
      setDisburseError('Error processing disbursal: ' + err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const totalAmount = data.reduce((acc, curr) => acc + (curr.payout_amount || 0), 0);
  const todayStr = new Date().toISOString().split('T')[0];

  return (
    <div className="space-y-6 animate-fadeIn pb-16">
      
      {/* Header */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="p-2.5 bg-emerald-50 rounded-xl border border-emerald-200 text-emerald-700">
              <CalendarDays className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-xl font-black text-slate-900 tracking-tight flex items-center gap-2">
                Interest Payout Register (ब्याज भुगतान रजिस्टर)
                <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200">
                  Fixed Deposits
                </span>
              </h1>
              <p className="text-xs text-slate-500 mt-0.5">
                Periodic interest payout calendar: Track when payout was pending (देय तिथि) and exact disbursement date (डिसबर्स तारीख)
              </p>
            </div>
          </div>
        </div>

        <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-2xl text-right shrink-0">
          <span className="text-[10px] uppercase font-bold text-emerald-800 block">
            {filter === 'PENDING' ? 'Total Pending Due' : filter === 'PAID' ? 'Total Disbursed' : 'Total Portfolio Amount'}
          </span>
          <span className="text-xl font-black text-emerald-800 font-mono">{formatINR(totalAmount)}</span>
        </div>
      </div>

      {/* Filter Tabs and Search Bar */}
      <div className="bg-white rounded-2xl border border-slate-200 p-3.5 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-3">
        {/* Status Filter Tabs */}
        <div className="flex items-center gap-1.5 p-1 bg-slate-100 rounded-xl w-full sm:w-auto">
          <button
            type="button"
            onClick={() => setFilter('PENDING')}
            className={`flex-1 sm:flex-none px-4 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer flex items-center justify-center gap-1.5 ${
              filter === 'PENDING' 
                ? 'bg-amber-500 text-slate-950 shadow-xs' 
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Clock className="w-3.5 h-3.5" />
            <span>PENDING (बकाया / देय)</span>
          </button>

          <button
            type="button"
            onClick={() => setFilter('PAID')}
            className={`flex-1 sm:flex-none px-4 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer flex items-center justify-center gap-1.5 ${
              filter === 'PAID' 
                ? 'bg-emerald-600 text-white shadow-xs' 
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>PAID / DISBURSED (डिसबर्स्ड)</span>
          </button>

          <button
            type="button"
            onClick={() => setFilter('ALL')}
            className={`flex-1 sm:flex-none px-4 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer flex items-center justify-center gap-1.5 ${
              filter === 'ALL' 
                ? 'bg-indigo-600 text-white shadow-xs' 
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <span>ALL (सभी रिकॉर्ड्स)</span>
          </button>
        </div>

        {/* Search & Actions */}
        <div className="flex items-center gap-2.5 w-full sm:w-auto">
          <form onSubmit={handleSearchSubmit} className="relative flex-1 sm:w-64">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search FD, customer, UTR..."
              className="w-full text-xs pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:border-slate-800"
            />
          </form>

          <button
            type="button"
            onClick={fetchPayouts}
            className="p-1.5 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg border border-slate-200 transition cursor-pointer"
            title="Refresh"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>

          <button
            type="button"
            onClick={handleExportNEFTSheet}
            className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold shadow-xs transition flex items-center gap-1.5 cursor-pointer whitespace-nowrap"
            title="Export CSV for Bank Transfer"
          >
            <FileSpreadsheet className="w-3.5 h-3.5" />
            <span>Export NEFT {selectedIds.length > 0 ? `(${selectedIds.length})` : ''}</span>
          </button>
        </div>
      </div>

      {/* Payouts Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="p-3 bg-slate-50 border-b border-slate-200 flex justify-between items-center text-xs font-semibold text-slate-700">
          <div className="flex items-center gap-2">
            <span>Interest Payout Schedule Records</span>
            <span className="font-mono text-slate-500">({data.length} Records)</span>
          </div>
          {selectedIds.length > 0 && (
            <span className="text-[11px] bg-indigo-100 text-indigo-800 px-2.5 py-0.5 rounded-full font-bold">
              {selectedIds.length} Rows Selected for Batch
            </span>
          )}
        </div>

        {loading ? (
          <div className="py-20 text-center">
            <div className="inline-block w-8 h-8 border-4 border-emerald-600 border-t-transparent rounded-full animate-spin"></div>
            <p className="text-xs text-slate-400 mt-2 font-medium">Loading payout records...</p>
          </div>
        ) : data.length === 0 ? (
          <div className="py-16 text-center text-slate-400">
            <CalendarDays className="w-12 h-12 mx-auto stroke-1 mb-2 opacity-50" />
            <p className="font-semibold text-slate-700 text-sm">Koi payout record nahi mila</p>
            <p className="text-xs mt-1">Sabhi interest payouts up-to-date hain.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#f8fafc] text-slate-600 uppercase font-bold text-[10px] tracking-wider border-b border-slate-200">
                <tr>
                  <th className="py-3 px-3 text-center w-8">
                    <input
                      type="checkbox"
                      checked={selectedIds.length === data.length && data.length > 0}
                      onChange={handleSelectAll}
                      className="rounded accent-emerald-600 cursor-pointer"
                    />
                  </th>
                  <th className="py-3 px-3">FD Number</th>
                  <th className="py-3 px-3">Customer / Beneficiary</th>
                  <th className="py-3 px-3 text-slate-800 bg-slate-100">
                    SCHEDULE / DUE DATE (देय तिथि)
                  </th>
                  <th className="py-3 px-3 text-slate-800 bg-slate-100">
                    DISBURSED DATE (डिसबर्स स्थिति)
                  </th>
                  <th className="py-3 px-3">Bank Account & IFSC</th>
                  <th className="py-3 px-3 text-right">Payout Amount</th>
                  <th className="py-3 px-3">Payment Ref / UTR</th>
                  <th className="py-3 px-3 text-center">Status</th>
                  <th className="py-3 px-3 text-center">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                {data.map((item) => {
                  const isPaid = item.status === 'PAID';
                  const isFuture = item.payout_date > todayStr;
                  const isDueToday = item.payout_date === todayStr;
                  const isOverdue = !isPaid && item.payout_date < todayStr;
                  const isPostDated = isPaid && item.paid_date && item.paid_date > todayStr;

                  return (
                    <tr 
                      key={item.id} 
                      className={`hover:bg-slate-50 transition ${selectedIds.includes(item.id) ? 'bg-indigo-50/40' : ''} ${isDueToday && !isPaid ? 'bg-amber-50/40 font-semibold' : isOverdue ? 'bg-rose-50/30' : ''}`}
                    >
                      <td className="py-3 px-3 text-center">
                        <input
                          type="checkbox"
                          checked={selectedIds.includes(item.id)}
                          onChange={() => handleToggleSelect(item.id)}
                          className="rounded accent-emerald-600 cursor-pointer"
                        />
                      </td>

                      <td className="py-3 px-3 font-mono font-bold text-indigo-700">
                        {item.fd_number}
                        <div className="text-[10px] text-slate-400 font-normal">Period #{item.period_no || 1}</div>
                      </td>

                      <td className="py-3 px-3">
                        <div className="font-bold text-slate-900">{item.customer_name}</div>
                        <div className="text-[10px] text-slate-400 font-mono">{item.customer_phone}</div>
                      </td>

                      {/* DUE DATE */}
                      <td className="py-3 px-3 bg-slate-50/30">
                        <div className="font-mono font-bold text-slate-900">
                          {formatDate(item.payout_date)}
                        </div>
                        {isOverdue ? (
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold text-rose-700 bg-rose-50 px-1.5 py-0.5 rounded border border-rose-200 mt-0.5">
                            <Clock className="w-2.5 h-2.5" /> Overdue
                          </span>
                        ) : isDueToday && !isPaid ? (
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-800 bg-amber-100 px-1.5 py-0.5 rounded border border-amber-300 mt-0.5 animate-pulse">
                            🔔 Due Today
                          </span>
                        ) : !isPaid ? (
                          <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-sky-800 bg-sky-50 px-1.5 py-0.5 rounded border border-sky-200 mt-0.5">
                            🗓️ Scheduled (आगामी)
                          </span>
                        ) : (
                          <span className="text-[10px] text-slate-400 font-mono block mt-0.5">
                            Due on schedule
                          </span>
                        )}
                      </td>

                      {/* DISBURSED DATE */}
                      <td className="py-3 px-3 bg-emerald-50/20">
                        {isPostDated ? (
                          <span className="inline-flex items-center gap-1 font-mono font-bold text-purple-800 bg-purple-50 px-2 py-0.5 rounded-lg border border-purple-200">
                            <Clock className="w-3 h-3 text-purple-600" />
                            Post-Dated ({formatDate(item.paid_date)})
                          </span>
                        ) : item.paid_date ? (
                          <div>
                            <span className="inline-flex items-center gap-1 font-mono font-bold text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded-lg border border-emerald-300">
                              <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                              {formatDate(item.paid_date)}
                            </span>
                            <div className="text-[10px] text-emerald-700 font-semibold mt-0.5">
                              {item.payment_mode || 'NEFT'}
                            </div>
                          </div>
                        ) : isFuture ? (
                          <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-lg">
                            ⏳ Not Due Yet (आगामी)
                          </span>
                        ) : isDueToday ? (
                          <span className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-800 bg-amber-100 px-2 py-0.5 rounded-lg border border-amber-300">
                            Ready for Disbursal
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-[11px] font-bold text-rose-700 bg-rose-50 px-2 py-0.5 rounded-lg border border-rose-200">
                            <Clock className="w-3 h-3 text-rose-600" />
                            Overdue (Unpaid)
                          </span>
                        )}
                      </td>

                      {/* BANK DETAILS */}
                      <td className="py-3 px-3">
                        <div className="text-slate-800 font-semibold">{item.bank_name || 'Bank N/A'}</div>
                        <div className="text-[10px] text-slate-500 font-mono">
                          A/C: {item.account_no || '-'}
                        </div>
                        <div className="text-[10px] text-slate-400 font-mono">
                          IFSC: {item.ifsc_code || '-'}
                        </div>
                      </td>

                      {/* AMOUNT */}
                      <td className="py-3 px-3 text-right font-mono font-black text-emerald-700 text-sm">
                        {formatINR(item.payout_amount)}
                      </td>

                      {/* UTR / REF */}
                      <td className="py-3 px-3">
                        {item.payment_reference ? (
                          <span className="font-mono text-[11px] font-bold text-slate-700 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                            {item.payment_reference}
                          </span>
                        ) : (
                          <span className="text-[11px] text-slate-400 italic">Not Disbursed</span>
                        )}
                      </td>

                      {/* STATUS */}
                      <td className="py-3 px-3 text-center">
                        <span className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                          isPaid 
                            ? 'bg-emerald-100 text-emerald-900 border border-emerald-300' 
                            : 'bg-amber-100 text-amber-900 border border-amber-300'
                        }`}>
                          {item.status}
                        </span>
                      </td>

                      {/* ACTION */}
                      <td className="py-3 px-3 text-center">
                        {!isPaid ? (
                          <button
                            type="button"
                            onClick={() => openDisburseModal(item)}
                            className="inline-flex items-center gap-1 px-3 py-1 bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold rounded-lg text-xs shadow-xs transition cursor-pointer"
                          >
                            <Send className="w-3 h-3" />
                            <span>Disburse</span>
                          </button>
                        ) : (
                          <span className="text-[11px] font-bold text-emerald-700 flex items-center justify-center gap-1">
                            <Check className="w-3.5 h-3.5 text-emerald-600" /> Settled
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* DISBURSAL CONFIRMATION MODAL */}
      {activeItem && (
        <div className="fixed inset-0 z-[200] flex justify-center items-start pt-16 pb-10 p-4 bg-slate-950/80 backdrop-blur-sm overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="px-6 py-4 bg-gradient-to-r from-emerald-600 to-teal-700 text-white flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-white/20 flex items-center justify-center">
                  <ArrowUpRight className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h3 className="text-base font-bold">Disburse Interest Payout</h3>
                  <p className="text-[11px] text-white/80">{activeItem.fd_number} • Period #{activeItem.period_no || 1}</p>
                </div>
              </div>
              <button 
                type="button"
                onClick={() => setActiveItem(null)} 
                className="inline-flex items-center gap-1 px-2.5 py-1 bg-white/20 hover:bg-white/30 text-white rounded-lg text-xs font-bold transition cursor-pointer"
                title="Close"
              >
                <X className="w-4 h-4 text-white" />
                <span>Close</span>
              </button>
            </div>

            <form onSubmit={handleConfirmDisbursal} className="p-6 space-y-4 text-xs">
              {disburseError && (
                <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{disburseError}</span>
                </div>
              )}

              {/* Beneficiary & Amount Summary */}
              <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-1.5">
                <div className="flex justify-between">
                  <span className="text-slate-500">Beneficiary:</span>
                  <span className="font-bold text-slate-900">{activeItem.customer_name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Bank & Account:</span>
                  <span className="font-semibold text-slate-800">{activeItem.bank_name || 'Bank'} ({activeItem.account_no || 'N/A'})</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">IFSC Code:</span>
                  <span className="font-mono text-slate-700">{activeItem.ifsc_code || 'N/A'}</span>
                </div>
                <div className="flex justify-between border-t border-slate-200 pt-1.5 mt-1 font-bold text-sm">
                  <span className="text-slate-800">Net Payout Amount:</span>
                  <span className="font-mono text-emerald-700">{formatINR(activeItem.payout_amount)}</span>
                </div>
              </div>

              {/* Pending / Due Date Display */}
              <div>
                <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Schedule / Due Date (निर्धारित देय तिथि)
                </label>
                <input
                  type="text"
                  readOnly
                  value={`${formatDate(activeItem.payout_date)} (${activeItem.payout_date})`}
                  className="w-full px-3 py-2 bg-slate-100 border border-slate-200 rounded-xl font-mono font-bold text-slate-700 cursor-not-allowed"
                />
              </div>

              {/* Disbursal Date Input */}
              <div>
                <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Disbursed Date (डिसबर्स किस तारीख पर किया गया - आज या पूर्व तिथि) *
                </label>
                <DateInput
                  required
                  max={new Date().toISOString().split('T')[0]}
                  value={disbursalDate}
                  onChange={(e) => setDisbursalDate(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl font-mono font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              {/* Payment Mode Selection */}
              <div>
                <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Payment Mode (भुगतान का तरीका) *
                </label>
                <select
                  value={paymentMode}
                  onChange={(e) => setPaymentMode(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                >
                  <option value="NEFT">Bank NEFT / Online Transfer</option>
                  <option value="RTGS">RTGS High-Value Transfer</option>
                  <option value="CASH">Cash Book (गल्ले से नकद)</option>
                  <option value="CHEQUE">Bank Cheque / DD</option>
                </select>
              </div>

              {/* UTR / Reference */}
              <div>
                <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Bank UTR / Transaction Reference No *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. NEFT-991283 or CHQ-00192"
                  value={utrNumber}
                  onChange={(e) => setUtrNumber(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl font-mono font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              {/* Actions */}
              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setActiveItem(null)}
                  className="px-4 py-2 border border-slate-300 rounded-xl font-bold text-slate-700 hover:bg-slate-50 transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="inline-flex items-center gap-1.5 px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold shadow-xs transition cursor-pointer disabled:opacity-50"
                >
                  {submitting ? (
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <CheckCircle2 className="w-3.5 h-3.5" />
                  )}
                  <span>Authorize & Disburse Payout</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
