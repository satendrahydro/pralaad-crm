import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { 
  X, 
  Printer, 
  RotateCw, 
  AlertTriangle, 
  Building2, 
  Calendar, 
  User, 
  CreditCard,
  CheckCircle2,
  Clock,
  Check,
  Sparkles
} from 'lucide-react';
import { formatINR, formatDate, COMPOUNDING_OPTIONS, apiRequest } from '../utils';
import DateInput from './DateInput';

export default function FDDetailModal({ 
  fdId, 
  isOpen, 
  onClose, 
  onPrintCertificate,
  onPrematureClose,
  onRenewFD,
  onViewCustomerProfile 
}) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [payingSchedule, setPayingSchedule] = useState(null);
  const [payDate, setPayDate] = useState(new Date().toISOString().split('T')[0]);
  const [payRef, setPayRef] = useState('');
  const [payMode, setPayMode] = useState('NEFT');
  const [paySubmitting, setPaySubmitting] = useState(false);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && isOpen) {
        if (payingSchedule) setPayingSchedule(null);
        else onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, payingSchedule, onClose]);

  const fetchDetails = async () => {
    if (!fdId) return;
    try {
      setLoading(true);
      const res = await apiRequest(`/fds/${fdId}`);
      setData(res);
    } catch (err) {
      console.error('Error loading FD details', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen && fdId) {
      fetchDetails();
    }
  }, [isOpen, fdId]);

  const handleOpenPay = (scheduleRow) => {
    setPayingSchedule(scheduleRow);
    setPayDate(new Date().toISOString().split('T')[0]);
    setPayRef(`NEFT-${Date.now().toString().slice(-6)}`);
    setPayMode('NEFT');
  };

  const handleConfirmSchedulePaid = async (e) => {
    e.preventDefault();
    if (!payingSchedule) return;
    setPaySubmitting(true);
    try {
      await apiRequest(`/fds/schedule/${payingSchedule.id}/mark-paid`, {
        method: 'POST',
        body: JSON.stringify({
          payment_reference: payRef,
          paid_date: payDate,
          payment_mode: payMode
        })
      });
      setPayingSchedule(null);
      fetchDetails();
    } catch (err) {
      alert('Error updating schedule: ' + err.message);
    } finally {
      setPaySubmitting(false);
    }
  };

  if (!isOpen) return null;

  return createPortal(
    <div 
      className="fixed inset-0 z-[9999] bg-slate-950/80 backdrop-blur-sm flex justify-center items-center p-3 sm:p-6 overflow-hidden"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 max-w-4xl w-full max-h-[88vh] flex flex-col overflow-hidden animate-fadeIn relative">
        
        {/* Pinned Top Header */}
        <div className="shrink-0 px-6 py-4 border-b border-slate-200 bg-white flex flex-wrap items-center justify-between gap-3 shadow-xs z-10">
          <div className="flex items-center gap-3 min-w-0">
            <span className="text-xl font-black text-indigo-600">{data?.fd?.fd_number || 'FD Details'}</span>
            {data?.fd?.status && (
              <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800">
                {data.fd.status}
              </span>
            )}
            {data?.fd?.customer_name && (
              <span className="text-sm font-bold text-slate-800 truncate">
                • {data.fd.customer_name}
              </span>
            )}
            {onViewCustomerProfile && data?.fd?.customer_id && (
              <button
                type="button"
                onClick={() => onViewCustomerProfile(data.fd.customer_id)}
                className="px-2.5 py-0.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 rounded-lg text-xs font-semibold cursor-pointer transition flex items-center gap-1 shrink-0"
                title="View Complete Customer 360° Profile & All Services"
              >
                👤 360° All Services
              </button>
            )}
          </div>

          <div className="flex items-center gap-2">
            {data?.fd && (
              <>
                <button
                  onClick={() => onPrintCertificate(data.fd.id)}
                  className="px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-xs font-bold rounded-xl transition flex items-center gap-1.5 cursor-pointer"
                >
                  <Printer className="w-3.5 h-3.5" />
                  Print
                </button>

                {data.fd.status === 'ACTIVE' && (
                  <>
                    <button
                      onClick={() => onPrematureClose(data.fd)}
                      className="px-3 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 text-xs font-bold rounded-xl transition flex items-center gap-1.5 cursor-pointer"
                    >
                      <AlertTriangle className="w-3.5 h-3.5" />
                      Close
                    </button>

                    <button
                      onClick={() => onRenewFD(data.fd)}
                      className="px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 text-xs font-bold rounded-xl transition flex items-center gap-1.5 cursor-pointer"
                    >
                      <RotateCw className="w-3.5 h-3.5" />
                      Renew
                    </button>
                  </>
                )}
              </>
            )}

            <button
              onClick={onClose}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-slate-100 hover:bg-rose-50 text-slate-700 hover:text-rose-600 border border-slate-300 hover:border-rose-200 rounded-xl font-bold text-xs transition cursor-pointer active:scale-95 shrink-0"
              title="Close Modal"
            >
              <X className="w-4 h-4 stroke-[2.5]" />
              <span>Close</span>
            </button>
          </div>
        </div>

        {loading || !data ? (
          <div className="py-20 text-center">
            <div className="inline-block w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
            <p className="text-xs text-slate-400 mt-2 font-medium">Loading details...</p>
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6 min-h-0">
            
            {/* Header */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 pb-4 border-b border-slate-100">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xl font-black text-indigo-600">{data.fd.fd_number}</span>
                  <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800">
                    {data.fd.status}
                  </span>
                </div>
                <p className="text-xs text-slate-500 mt-0.5">
                  Booked on {formatDate(data.fd.start_date)}
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => onPrintCertificate(data.fd.id)}
                  className="px-3.5 py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-xs font-bold rounded-xl transition flex items-center gap-1.5 cursor-pointer"
                >
                  <Printer className="w-4 h-4" />
                  Print Receipt
                </button>

                {data.fd.status === 'ACTIVE' && (
                  <>
                    <button
                      onClick={() => onPrematureClose(data.fd)}
                      className="px-3.5 py-2 bg-rose-50 hover:bg-rose-100 text-rose-700 text-xs font-bold rounded-xl transition flex items-center gap-1.5 cursor-pointer"
                    >
                      <AlertTriangle className="w-4 h-4" />
                      Premature Close
                    </button>

                    <button
                      onClick={() => onRenewFD(data.fd)}
                      className="px-3.5 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 text-xs font-bold rounded-xl transition flex items-center gap-1.5 cursor-pointer"
                    >
                      <RotateCw className="w-4 h-4" />
                      Renew
                    </button>
                  </>
                )}
              </div>
            </div>

            {/* Financial Summary Highlight */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-slate-50 p-4 rounded-2xl border border-slate-200">
              <div>
                <span className="text-[10px] uppercase font-bold text-slate-400 block">Principal Invested</span>
                <span className="text-lg font-black text-slate-900">{formatINR(data.fd.principal_amount)}</span>
              </div>
              <div>
                <span className="text-[10px] uppercase font-bold text-slate-400 block">Annual Interest Rate</span>
                <span className="text-lg font-black text-emerald-600">{data.fd.annual_rate}%</span>
              </div>
              <div>
                <span className="text-[10px] uppercase font-bold text-slate-400 block">Total Interest</span>
                <span className="text-lg font-black text-indigo-600">+{formatINR(data.fd.total_interest)}</span>
              </div>
              <div>
                <span className="text-[10px] uppercase font-bold text-slate-400 block">Maturity Amount</span>
                <span className="text-lg font-black text-slate-900">{formatINR(data.fd.maturity_amount)}</span>
              </div>
            </div>

            {/* Client & Account Info */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div className="p-4 rounded-2xl border border-slate-200 bg-white space-y-2">
                <div className="flex items-center gap-2 font-bold text-slate-800 border-b border-slate-100 pb-2">
                  <User className="w-4 h-4 text-indigo-600" />
                  Client Profile
                </div>
                <div className="space-y-1">
                  <p><span className="text-slate-400">Name:</span> <strong className="text-slate-800">{data.fd.customer_name}</strong></p>
                  <p><span className="text-slate-400">Customer ID:</span> <span className="font-mono text-slate-700">{data.fd.customer_code}</span></p>
                  <p><span className="text-slate-400">Phone:</span> <span className="text-slate-700">{data.fd.customer_phone}</span></p>
                  <p><span className="text-slate-400">PAN Card:</span> <span className="font-mono text-slate-700 font-semibold">{data.fd.customer_pan || 'N/A'}</span></p>
                  <p><span className="text-slate-400">Aadhaar:</span> <span className="font-mono text-slate-700">{data.fd.customer_aadhaar || 'N/A'}</span></p>
                </div>
              </div>

              <div className="p-4 rounded-2xl border border-slate-200 bg-white space-y-2">
                <div className="flex items-center gap-2 font-bold text-slate-800 border-b border-slate-100 pb-2">
                  <CreditCard className="w-4 h-4 text-indigo-600" />
                  Bank & Nominee Info
                </div>
                <div className="space-y-1">
                  <p><span className="text-slate-400">Bank Name:</span> <strong className="text-slate-800">{data.fd.bank_name || 'N/A'}</strong></p>
                  <p><span className="text-slate-400">Account No:</span> <span className="font-mono text-slate-700">{data.fd.account_no || 'N/A'}</span></p>
                  <p><span className="text-slate-400">IFSC Code:</span> <span className="font-mono text-slate-700">{data.fd.ifsc_code || 'N/A'}</span></p>
                  <p><span className="text-slate-400">Nominee:</span> <strong className="text-slate-800">{data.fd.nominee_name || 'N/A'}</strong> ({data.fd.nominee_relation || 'N/A'})</p>
                </div>
              </div>
            </div>

            {/* Schedule / Ledger Table */}
            <div className="border border-slate-200 rounded-2xl overflow-hidden">
              <div className="p-3.5 bg-slate-50 border-b border-slate-200 flex justify-between items-center text-xs">
                <span className="font-bold text-slate-800">
                  {data.fd.is_cumulative ? 'Compounding Milestone Ledger' : 'Payout & Interest Schedule'}
                </span>
                <span className="text-slate-500">{data.schedule.length} Records</span>
              </div>

              <div className="max-h-60 overflow-y-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-100 sticky top-0 text-slate-600 uppercase font-semibold text-[10px]">
                    <tr>
                      <th className="py-2 px-2.5">#</th>
                      <th className="py-2 px-2.5 text-slate-800 bg-slate-100">Schedule / Due Date (देय तिथि)</th>
                      <th className="py-2 px-2.5 text-slate-800 bg-slate-100">Disbursed Date (डिसबर्स स्थिति)</th>
                      {!data.fd.is_cumulative && <th className="py-2 px-2.5 text-right">Payout Amount</th>}
                      <th className="py-2 px-2.5 text-right">Interest Accrued</th>
                      <th className="py-2 px-2.5 text-right">Balance</th>
                      <th className="py-2 px-2.5 text-center">Status / Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-medium">
                    {data.schedule.map((row) => {
                      const todayStr = new Date().toISOString().split('T')[0];
                      const isPaid = row.status === 'PAID';
                      const isFuture = row.payout_date > todayStr;
                      const isDueToday = row.payout_date === todayStr;
                      const isOverdue = !isPaid && row.payout_date < todayStr;
                      const isPostDated = isPaid && row.paid_date && row.paid_date > todayStr;

                      return (
                        <tr key={row.id} className={`hover:bg-slate-50 ${isDueToday ? 'bg-amber-50/40' : isOverdue ? 'bg-rose-50/30' : ''}`}>
                          <td className="py-2 px-2.5 text-slate-400 font-mono">{row.period_no}</td>
                          <td className="py-2 px-2.5 font-mono font-bold text-slate-800">
                            {formatDate(row.payout_date)}
                            {isFuture && !isPaid && (
                              <span className="ml-1.5 text-[9px] text-sky-700 bg-sky-50 px-1.5 py-0.5 rounded font-semibold border border-sky-200">
                                🗓️ आगामी
                              </span>
                            )}
                            {isDueToday && !isPaid && (
                              <span className="ml-1.5 text-[9px] text-amber-800 bg-amber-100 px-1.5 py-0.5 rounded font-bold border border-amber-300 animate-pulse">
                                🔔 आज देय
                              </span>
                            )}
                            {isOverdue && (
                              <span className="ml-1.5 text-[9px] text-rose-700 bg-rose-100 px-1.5 py-0.5 rounded font-bold border border-rose-300">
                                ⚠️ Overdue
                              </span>
                            )}
                          </td>
                          <td className="py-2 px-2.5">
                            {isPostDated ? (
                              <span className="inline-flex items-center gap-1 text-[10px] font-bold text-purple-800 bg-purple-50 px-1.5 py-0.5 rounded border border-purple-200">
                                ⏳ Post-Dated ({formatDate(row.paid_date)})
                              </span>
                            ) : row.paid_date ? (
                              <div>
                                <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-800 bg-emerald-100 px-1.5 py-0.5 rounded border border-emerald-300">
                                  <Check className="w-2.5 h-2.5" /> {formatDate(row.paid_date)}
                                </span>
                                {row.payment_reference && (
                                  <div className="text-[9px] font-mono text-slate-500 mt-0.5">{row.payment_reference}</div>
                                )}
                              </div>
                            ) : isFuture ? (
                              <span className="text-[10px] font-semibold text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded">
                                ⏳ Not Due Yet (आगामी)
                              </span>
                            ) : isDueToday ? (
                              <span className="text-[10px] font-bold text-amber-800 bg-amber-100 px-1.5 py-0.5 rounded border border-amber-200">
                                Ready for Payout
                              </span>
                            ) : (
                              <span className="text-[10px] font-bold text-rose-700 bg-rose-50 px-1.5 py-0.5 rounded border border-rose-200">
                                Overdue (Unpaid)
                              </span>
                            )}
                          </td>
                          {!data.fd.is_cumulative && (
                            <td className="py-2 px-2.5 text-right font-bold text-emerald-600 font-mono">
                              {formatINR(row.payout_amount)}
                            </td>
                          )}
                          <td className="py-2 px-2.5 text-right text-slate-600 font-mono">
                            {formatINR(row.interest_accrued)}
                          </td>
                          <td className="py-2 px-2.5 text-right font-bold text-slate-800 font-mono">
                            {formatINR(row.balance)}
                          </td>
                          <td className="py-2 px-2.5 text-center">
                            {row.status === 'PAID' ? (
                              <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                                <Check className="w-3 h-3" /> Settled
                              </span>
                            ) : !data.fd.is_cumulative ? (
                              isFuture ? (
                                <span className="text-[10px] text-slate-400 font-mono italic">
                                  Due {formatDate(row.payout_date)}
                                </span>
                              ) : (
                                <button
                                  type="button"
                                  onClick={() => handleOpenPay(row)}
                                  className="text-[10px] font-bold text-slate-950 hover:bg-amber-600 bg-amber-500 px-2 py-1 rounded shadow-xs cursor-pointer"
                                >
                                  Disburse
                                </button>
                              )
                            ) : (
                              <span className="text-[10px] text-slate-400 font-medium">Compounded</span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Disbursal Modal for Schedule Row */}
            {payingSchedule && (
              <div className="fixed inset-0 z-[220] bg-slate-950/80 backdrop-blur-xs flex justify-center items-start pt-16 pb-10 p-4 overflow-y-auto">
                <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-sm w-full p-5 space-y-3.5">
                  <div className="flex items-center justify-between border-b pb-2">
                    <h4 className="font-bold text-slate-900 text-sm">Disburse Payout #{payingSchedule.period_no}</h4>
                    <button type="button" onClick={() => setPayingSchedule(null)} className="p-1 rounded text-slate-400 hover:text-slate-700 hover:bg-slate-100 font-bold">✕ Close</button>
                  </div>

                  <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-200 text-xs space-y-1">
                    <div className="flex justify-between">
                      <span className="text-slate-500">Payout Amount:</span>
                      <span className="font-mono font-bold text-emerald-700">{formatINR(payingSchedule.payout_amount)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Scheduled Due Date:</span>
                      <span className="font-mono text-slate-800">{formatDate(payingSchedule.payout_date)}</span>
                    </div>
                  </div>

                  <form onSubmit={handleConfirmSchedulePaid} className="space-y-3 text-xs">
                    <div>
                      <label className="block font-bold text-slate-700 mb-1">Disbursed Date (डिसबर्स तारीख) *</label>
                      <DateInput
                        required
                        max={new Date().toISOString().split('T')[0]}
                        value={payDate}
                        onChange={(e) => setPayDate(e.target.value)}
                        className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg font-mono font-bold"
                      />
                    </div>

                    <div>
                      <label className="block font-bold text-slate-700 mb-1">Payment Mode *</label>
                      <select
                        value={payMode}
                        onChange={(e) => setPayMode(e.target.value)}
                        className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg font-bold"
                      >
                        <option value="NEFT">Bank NEFT / Online</option>
                        <option value="RTGS">RTGS</option>
                        <option value="CASH">Cash Book</option>
                        <option value="CHEQUE">Cheque / DD</option>
                      </select>
                    </div>

                    <div>
                      <label className="block font-bold text-slate-700 mb-1">UTR / Reference No *</label>
                      <input
                        type="text"
                        required
                        value={payRef}
                        onChange={(e) => setPayRef(e.target.value)}
                        className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg font-mono font-bold"
                      />
                    </div>

                    <div className="flex items-center justify-end gap-2 pt-2 border-t">
                      <button
                        type="button"
                        onClick={() => setPayingSchedule(null)}
                        className="px-3 py-1.5 border border-slate-300 rounded-lg font-bold text-slate-700"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        disabled={paySubmitting}
                        className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg"
                      >
                        {paySubmitting ? 'Saving...' : 'Confirm Disbursal'}
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            )}

          </div>
        )}

        {/* Pinned Bottom Footer */}
        <div className="shrink-0 px-6 py-2.5 border-t border-slate-200 bg-slate-50 flex items-center justify-between text-xs text-slate-500 z-10">
          <span>Press <kbd className="px-1.5 py-0.5 bg-slate-200 rounded text-[11px] font-mono text-slate-700">Esc</kbd> or click outside to close</span>
        </div>

      </div>
    </div>,
    document.body
  );
}
