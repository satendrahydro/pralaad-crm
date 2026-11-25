import React from 'react';
import { X } from 'lucide-react';

/**
 * Shared modal rendering full payment mode, customer, scheme, double-entry
 * journal impact, and related account history when clicking any transaction description.
 */
export default function TransactionBackgroundModal({ detail, loading, onClose, formatAccountingNum }) {
  if (!detail) return null;

  const fmtNum = formatAccountingNum || ((val) => {
    const n = Number(val || 0);
    const abs = Math.abs(n).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    return n < 0 ? `(${abs})` : abs;
  });

  const { row = {}, ledger = {}, background = null } = detail;

  return (
    <div className="fixed inset-0 z-[230] flex justify-center items-start pt-6 pb-8 p-3 sm:p-4 bg-slate-950/80 backdrop-blur-xs overflow-y-auto">
      <div className="bg-white rounded-xl shadow-2xl border border-slate-300 w-full max-w-3xl overflow-hidden animate-fadeIn">
        <div className="px-5 py-3.5 bg-[#082e20] text-white flex items-center justify-between border-b border-emerald-800">
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 rounded bg-[#D4AF37] text-[#062319] font-black text-[10px] uppercase">
                {background?.is_system ? 'System Banking' : 'Manual Voucher'}
              </span>
              <span className="text-[11px] font-mono text-emerald-200">
                {background?.voucher_no || row.voucher_no}
              </span>
            </div>
            <h3 className="text-base sm:text-lg font-semibold mt-0.5">
              {background?.title || row.description || row.account || row.action_label}
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex items-center gap-1 px-3 py-1.5 bg-white/15 hover:bg-white/25 rounded-lg text-xs font-bold transition cursor-pointer"
          >
            <X className="w-4 h-4 text-white" />
            <span>Close</span>
          </button>
        </div>

        <div className="p-4 sm:p-5 space-y-4 text-xs">
          {loading ? (
            <div className="py-10 text-center text-slate-500 font-medium">
              लेन-देन और पेमेंट का पूरा विवरण लोड हो रहा है...
            </div>
          ) : (
            <>
              {/* 1. Payment Mode & Double-Entry Impact */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="p-3.5 rounded-lg bg-emerald-50/70 border border-emerald-200 space-y-1.5">
                  <div className="text-[10px] font-black uppercase text-emerald-800 tracking-wider">
                    Payment &amp; Mode Breakdown (कैसे पेमेंट हुई)
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-600">Payment Mode:</span>
                    <span className="font-bold text-emerald-900 uppercase">
                      {background?.payment?.mode || row.payment_mode || 'CASH'}
                    </span>
                  </div>
                  <div className="text-[11px] text-emerald-700 font-medium">
                    {background?.payment?.mode_label || 'Cash / Counter Entry'}
                  </div>
                  <div className="flex justify-between pt-1 border-t border-emerald-200/60">
                    <span className="text-slate-600">Ref / UTR / Receipt:</span>
                    <span className="font-mono font-bold text-slate-800">
                      {background?.payment?.reference_no || row.reference_no || row.voucher_no || '-'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-600">Recorded By / Branch:</span>
                    <span className="font-semibold text-slate-800">
                      {background?.payment?.recorded_by || 'Staff'} • {background?.branch || row.branch || 'MAIN BRANCH'}
                    </span>
                  </div>
                </div>

                <div className="p-3.5 rounded-lg bg-amber-50/70 border border-amber-200 space-y-1.5">
                  <div className="text-[10px] font-black uppercase text-amber-900 tracking-wider">
                    Double-Entry Ledger Impact ({ledger?.name || 'LEDGER'})
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-600">Debit Account (DR):</span>
                    <span className="font-bold text-slate-900 truncate max-w-[180px]">
                      {background?.journal?.debit_account || ledger?.name || 'CASH BOOK'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-600">Credit Account (CR):</span>
                    <span className="font-bold text-slate-900 truncate max-w-[180px]">
                      {background?.journal?.credit_account || row.particulars || row.account || '-'}
                    </span>
                  </div>
                  {row.opening_balance !== undefined && (
                    <div className="flex justify-between pt-1 border-t border-amber-200/60">
                      <span className="text-slate-600">Opening Balance:</span>
                      <span className="font-mono font-semibold text-slate-700">₹{fmtNum(row.opening_balance)}</span>
                    </div>
                  )}
                  <div className="flex justify-between">
                    <span className="text-slate-600">Transaction Amount:</span>
                    <span className="font-mono font-black text-indigo-800">
                      ₹{fmtNum(Math.max(row.debit || 0, row.credit || 0, row.amount || 0, row.inflow_amount || 0, row.outflow_amount || 0))}
                      {(row.debit > 0 || row.credit > 0) && ` (${row.debit > 0 ? 'DEBIT' : 'CREDIT'})`}
                    </span>
                  </div>
                  {(row.running_balance !== undefined || row.balance !== undefined) && (
                    <div className="flex justify-between">
                      <span className="text-slate-600">Closing Balance:</span>
                      <span className="font-mono font-black text-slate-900">₹{fmtNum(row.running_balance ?? row.balance)}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* 2. Customer & Linked Account / Scheme Info */}
              {background && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="p-3.5 rounded-lg bg-slate-50 border border-slate-200 space-y-1.5">
                    <div className="text-[10px] font-black uppercase text-slate-500 tracking-wider">
                      Member / Party Details
                    </div>
                    <div className="font-bold text-slate-900 text-sm">
                      {background.customer?.name}{' '}
                      {background.customer?.code && background.customer.code !== '-' && (
                        <span className="text-xs font-mono text-[#3c8dbc]">({background.customer.code})</span>
                      )}
                    </div>
                    <div className="flex justify-between text-slate-600">
                      <span>Phone:</span>
                      <span className="font-mono text-slate-800">{background.customer?.phone || '-'}</span>
                    </div>
                    <div className="flex justify-between text-slate-600 gap-2">
                      <span>Address:</span>
                      <span className="text-right text-slate-800">{background.customer?.address || '-'}</span>
                    </div>
                    <div className="flex justify-between text-slate-600">
                      <span>Timestamp:</span>
                      <span className="font-mono text-slate-800">{background.created_at || row.date}</span>
                    </div>
                  </div>

                  <div className="p-3.5 rounded-lg bg-slate-50 border border-slate-200 space-y-1.5">
                    <div className="text-[10px] font-black uppercase text-slate-500 tracking-wider">
                      Scheme / Voucher Background
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-600">Scheme / Type:</span>
                      <span className="font-bold text-slate-900">{background.scheme?.type}</span>
                    </div>
                    {background.scheme?.rate && (
                      <div className="flex justify-between">
                        <span className="text-slate-600">Rate / Tenure:</span>
                        <span className="font-semibold text-slate-800">
                          {background.scheme.rate} • {background.scheme.tenure}
                        </span>
                      </div>
                    )}
                    {background.scheme?.maturity_date && (
                      <div className="flex justify-between">
                        <span className="text-slate-600">Start → Maturity:</span>
                        <span className="font-mono text-slate-800">
                          {background.scheme.start_date} → {background.scheme.maturity_date}
                        </span>
                      </div>
                    )}
                    {background.scheme?.maturity_amount > 0 && (
                      <div className="flex justify-between">
                        <span className="text-slate-600">Maturity Value:</span>
                        <span className="font-mono font-bold text-emerald-700">
                          ₹{Number(background.scheme.maturity_amount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                        </span>
                      </div>
                    )}
                    <div className="text-[11px] text-slate-700 pt-1 border-t border-slate-200">
                      <strong>Narration:</strong> {background.scheme?.narration || row.narration || '-'}
                    </div>
                  </div>
                </div>
              )}

              {/* 3. Account History / Installment Trail */}
              {background?.related_history?.length > 0 && (
                <div className="border border-slate-200 rounded-lg overflow-hidden">
                  <div className="px-3 py-2 bg-slate-100 border-b border-slate-200 font-bold text-[11px] uppercase text-slate-700">
                    Account / Passbook Activity History ({background.scheme?.account_no})
                  </div>
                  <div className="max-h-44 overflow-y-auto">
                    <table className="w-full text-[11px] text-left">
                      <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase">
                        <tr>
                          <th className="py-1.5 px-2.5">Date</th>
                          <th className="py-1.5 px-2.5">Ref / Txn No</th>
                          <th className="py-1.5 px-2.5">Particulars</th>
                          <th className="py-1.5 px-2.5">Payment Mode</th>
                          <th className="py-1.5 px-2.5 text-right">Amount</th>
                          <th className="py-1.5 px-2.5 text-center">Status / Flow</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {background.related_history.map((h, hIdx) => (
                          <tr key={hIdx} className="hover:bg-slate-50">
                            <td className="py-1.5 px-2.5 font-mono text-slate-600 whitespace-nowrap">{h.date}</td>
                            <td className="py-1.5 px-2.5 font-mono text-slate-700 whitespace-nowrap">{h.voucher_no}</td>
                            <td className="py-1.5 px-2.5 text-slate-800">{h.description}</td>
                            <td className="py-1.5 px-2.5 text-slate-600">{h.payment_mode}</td>
                            <td className="py-1.5 px-2.5 text-right font-mono font-bold text-slate-900">₹{fmtNum(h.amount)}</td>
                            <td className="py-1.5 px-2.5 text-center">
                              <span className="px-1.5 py-0.5 rounded bg-slate-100 text-slate-700 font-bold text-[10px]">{h.flow}</span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
