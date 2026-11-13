import React, { useState, useEffect } from 'react';
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
  Check
} from 'lucide-react';
import { formatINR, formatDate, COMPOUNDING_OPTIONS, apiRequest } from '../utils';

export default function FDDetailModal({ 
  fdId, 
  isOpen, 
  onClose, 
  onPrintCertificate,
  onPrematureClose,
  onRenewFD 
}) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

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

  const handleMarkSchedulePaid = async (scheduleId) => {
    try {
      await apiRequest(`/fds/schedule/${scheduleId}/mark-paid`, {
        method: 'POST',
        body: JSON.stringify({
          payment_reference: 'NEFT-' + Date.now(),
          paid_date: new Date().toISOString().split('T')[0]
        })
      });
      fetchDetails();
    } catch (err) {
      alert('Error updating schedule: ' + err.message);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 max-w-3xl w-full p-6 sm:p-8 relative my-8">
        
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute right-5 top-5 p-2 rounded-full hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        {loading || !data ? (
          <div className="py-20 text-center">
            <div className="inline-block w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
            <p className="text-xs text-slate-400 mt-2 font-medium">Loading details...</p>
          </div>
        ) : (
          <div className="space-y-6">
            
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
                  <thead className="bg-slate-100 sticky top-0 text-slate-600 uppercase font-semibold">
                    <tr>
                      <th className="py-2 px-3">#</th>
                      <th className="py-2 px-3">Date</th>
                      {!data.fd.is_cumulative && <th className="py-2 px-3 text-right">Payout Amount</th>}
                      <th className="py-2 px-3 text-right">Interest Accrued</th>
                      <th className="py-2 px-3 text-right">Balance</th>
                      <th className="py-2 px-3 text-center">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-medium">
                    {data.schedule.map((row) => (
                      <tr key={row.id} className="hover:bg-slate-50">
                        <td className="py-2 px-3 text-slate-400">{row.period_no}</td>
                        <td className="py-2 px-3 text-slate-700">{formatDate(row.payout_date)}</td>
                        {!data.fd.is_cumulative && (
                          <td className="py-2 px-3 text-right font-bold text-emerald-600">
                            {formatINR(row.payout_amount)}
                          </td>
                        )}
                        <td className="py-2 px-3 text-right text-slate-600">
                          {formatINR(row.interest_accrued)}
                        </td>
                        <td className="py-2 px-3 text-right font-bold text-slate-800">
                          {formatINR(row.balance)}
                        </td>
                        <td className="py-2 px-3 text-center">
                          {row.status === 'PAID' ? (
                            <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full">
                              <Check className="w-3 h-3" /> PAID ({formatDate(row.paid_date)})
                            </span>
                          ) : !data.fd.is_cumulative ? (
                            <button
                              onClick={() => handleMarkSchedulePaid(row.id)}
                              className="text-[10px] font-bold text-indigo-600 hover:text-indigo-800 bg-indigo-50 px-2 py-0.5 rounded cursor-pointer"
                            >
                              Mark Paid
                            </button>
                          ) : (
                            <span className="text-[10px] text-slate-400 font-medium">Compounded</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

          </div>
        )}

      </div>
    </div>
  );
}
