import React from 'react';
import { X, Printer, ExternalLink } from 'lucide-react';

/**
 * Shared modal matching Prahlad's `Entries | Show` ("LEDGER BILL ENTRY") drilldown
 * alongside full payment mode, customer, scheme, journal impact, and account history.
 */
export default function TransactionBackgroundModal({
  detail,
  loading,
  onClose,
  onOpenLedger,
  formatAccountingNum
}) {
  if (!detail) return null;

  const fmtNum = formatAccountingNum || ((val) => {
    const n = Number(val || 0);
    const abs = Math.abs(n).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    return n < 0 ? `(${abs})` : abs;
  });

  const { row = {}, ledger = {}, background = null } = detail;
  const entryTitle = background?.title || row.description || row.account || row.action_label || 'Transaction Entry';
  const entryBranch = background?.branch || row.branch || 'MAIN BRANCH';
  const entryAmount = Math.max(
    Number(background?.journal?.amount || 0),
    Number(background?.payment?.amount || 0),
    Number(row.debit || 0),
    Number(row.credit || 0),
    Number(row.amount || 0),
    Number(row.inflow_amount || 0),
    Number(row.outflow_amount || 0)
  );
  const debitLabel = background?.journal?.debit_account || (row.debit > 0 ? ledger?.name : null) || ledger?.name || 'CASH BOOK';
  const creditLabel = background?.journal?.credit_account || (row.credit > 0 ? ledger?.name : null) || row.particulars || row.account || '-';
  const isSystemEntry = background ? !!background.is_system : (row.is_system !== 'No');
  const tDate = background?.transaction_date || row.date || '-';
  const createdAt = background?.created_at || row.created_at || tDate;

  const handlePrintVoucher = () => {
    const win = window.open('', '_blank', 'width=860,height=640');
    if (!win) {
      window.print();
      return;
    }
    const safe = (v) => String(v ?? '-').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    win.document.write(`<!doctype html>
<html>
<head>
  <title>Ledger Bill Entry - ${safe(entryTitle)}</title>
  <style>
    body { font-family: Arial, sans-serif; color: #111827; padding: 24px; font-size: 12px; }
    h1 { font-size: 16px; margin: 0 0 4px; color: #082e20; }
    .sub { font-size: 11px; color: #64748b; margin-bottom: 14px; }
    table { width: 100%; border-collapse: collapse; margin-top: 12px; }
    th, td { border: 1px solid #cbd5e1; padding: 8px 10px; text-align: left; }
    th { background: #f1f5f9; font-size: 10px; text-transform: uppercase; }
    .num { text-align: right; font-family: monospace; font-weight: bold; }
    .meta { margin-top: 14px; display: flex; gap: 24px; font-size: 11px; }
  </style>
</head>
<body>
  <h1>TARANGANJALI REALTECH PVT LTD — LEDGER BILL ENTRY</h1>
  <div class="sub">Journal Entry: ${safe(entryTitle)} | Ref: ${safe(background?.voucher_no || row.voucher_no || '-')}</div>
  <table>
    <thead>
      <tr>
        <th>Description</th>
        <th>Branch</th>
        <th class="num">Debits (₹)</th>
        <th class="num">Credits (₹)</th>
        <th>Is System</th>
        <th>T. Date</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td><strong>${safe(entryTitle)}</strong></td>
        <td>-</td>
        <td class="num"></td>
        <td class="num"></td>
        <td>${isSystemEntry ? 'Yes' : 'No'}</td>
        <td>${safe(tDate)}</td>
      </tr>
      <tr>
        <td>${safe(debitLabel)}</td>
        <td>${safe(entryBranch)}</td>
        <td class="num">${safe(fmtNum(entryAmount))}</td>
        <td class="num"></td>
        <td></td>
        <td></td>
      </tr>
      <tr>
        <td>${safe(creditLabel)}</td>
        <td>${safe(entryBranch)}</td>
        <td class="num"></td>
        <td class="num">${safe(fmtNum(entryAmount))}</td>
        <td></td>
        <td></td>
      </tr>
    </tbody>
  </table>
  <div class="meta">
    <div><strong>Payment Mode:</strong> ${safe(background?.payment?.mode || row.payment_mode || 'CASH')}</div>
    <div><strong>Member / Party:</strong> ${safe(background?.customer?.name || '-')}</div>
    <div><strong>Recorded By:</strong> ${safe(background?.payment?.recorded_by || 'Staff')}</div>
  </div>
</body>
</html>`);
    win.document.close();
    win.focus();
    win.print();
  };

  const renderLedgerLink = (label) => {
    const clean = String(label || '-');
    if (!onOpenLedger || clean === '-') {
      return <span className="font-semibold text-slate-800">{clean}</span>;
    }
    return (
      <button
        type="button"
        onClick={() => onOpenLedger(clean)}
        className="text-left font-semibold text-[#3c8dbc] hover:text-[#23527c] hover:underline inline-flex items-center gap-1 cursor-pointer"
        title={`Open statement for ${clean}`}
      >
        <span>{clean}</span>
        <ExternalLink className="w-3 h-3 opacity-70 shrink-0" />
      </button>
    );
  };

  return (
    <div className="fixed inset-0 z-[230] flex justify-center items-start pt-6 pb-8 p-3 sm:p-4 bg-slate-950/80 backdrop-blur-xs overflow-y-auto print:hidden">
      <div className="bg-white rounded-xl shadow-2xl border border-slate-300 w-full max-w-4xl overflow-hidden animate-fadeIn">
        <div className="px-5 py-3.5 bg-[#082e20] text-white flex items-center justify-between border-b border-emerald-800 gap-3">
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="px-2 py-0.5 rounded bg-[#D4AF37] text-[#062319] font-black text-[10px] uppercase">
                {isSystemEntry ? 'System Banking' : 'Manual Voucher'}
              </span>
              <span className="text-[11px] font-mono text-emerald-200">
                Journal Entries &gt; {background?.voucher_no || row.voucher_no || 'ENTRY'}
              </span>
            </div>
            <h3 className="text-base sm:text-lg font-semibold mt-0.5 truncate">
              Journal Entry — {entryTitle}
            </h3>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={handlePrintVoucher}
              title="Print Ledger Bill Entry"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#00a65a] hover:bg-[#008d4c] rounded-lg text-xs font-bold text-white transition cursor-pointer"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Print</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              className="inline-flex items-center gap-1 px-3 py-1.5 bg-white/15 hover:bg-white/25 rounded-lg text-xs font-bold transition cursor-pointer"
            >
              <X className="w-4 h-4 text-white" />
              <span>Close</span>
            </button>
          </div>
        </div>

        <div className="p-4 sm:p-5 space-y-4 text-xs">
          {loading ? (
            <div className="py-10 text-center text-slate-500 font-medium">
              लेन-देन और पेमेंट का पूरा विवरण लोड हो रहा है...
            </div>
          ) : (
            <>
              {/* 0. Prahlad 1:1 LEDGER BILL ENTRY Double-Entry Table */}
              <div className="border-t-[3px] border-t-[#f39c12] border border-slate-200 rounded-lg overflow-hidden shadow-xs">
                <div className="px-3.5 py-2 bg-slate-50 border-b border-slate-200 flex items-center justify-between gap-2 flex-wrap">
                  <span className="text-[11px] font-bold uppercase tracking-wide text-slate-800">
                    LEDGER BILL ENTRY — {entryTitle}
                  </span>
                  <span className="text-[10px] font-mono text-slate-500">
                    Double-Entry Balanced: ₹{fmtNum(entryAmount)}
                  </span>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-[11px] text-left">
                    <thead className="bg-slate-50 border-b border-slate-200 text-[10px] uppercase font-bold text-slate-600">
                      <tr>
                        <th className="py-2 px-3">Description</th>
                        <th className="py-2 px-3">Branch</th>
                        <th className="py-2 px-3 text-right">Debits</th>
                        <th className="py-2 px-3 text-right">Credits</th>
                        <th className="py-2 px-3 text-center">Is System</th>
                        <th className="py-2 px-3">T. Date</th>
                        <th className="py-2 px-3">Created At</th>
                        <th className="py-2 px-3 text-center">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      <tr className="bg-white">
                        <td className="py-2.5 px-3 font-semibold text-slate-900">{entryTitle}</td>
                        <td className="py-2.5 px-3 text-slate-400">-</td>
                        <td className="py-2.5 px-3 text-right"></td>
                        <td className="py-2.5 px-3 text-right"></td>
                        <td className="py-2.5 px-3 text-center">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold text-white ${isSystemEntry ? 'bg-[#00a65a]' : 'bg-[#dd4b39]'}`}>
                            {isSystemEntry ? 'Yes' : 'No'}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 font-mono text-slate-700 whitespace-nowrap">{tDate}</td>
                        <td className="py-2.5 px-3 font-mono text-slate-600 whitespace-nowrap">{createdAt}</td>
                        <td className="py-2.5 px-3 text-center">
                          <button
                            type="button"
                            onClick={handlePrintVoucher}
                            title="Print Voucher"
                            className="p-1.5 rounded bg-[#00a65a] hover:bg-[#008d4c] text-white inline-flex items-center justify-center cursor-pointer"
                          >
                            <Printer className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                      <tr className="bg-slate-50/50 hover:bg-emerald-50/40">
                        <td className="py-2 px-3">{renderLedgerLink(debitLabel)}</td>
                        <td className="py-2 px-3 text-slate-700 font-medium">{entryBranch}</td>
                        <td className="py-2 px-3 text-right font-mono font-bold text-slate-900 whitespace-nowrap">
                          {fmtNum(entryAmount)}
                        </td>
                        <td className="py-2 px-3 text-right"></td>
                        <td colSpan={4}></td>
                      </tr>
                      <tr className="bg-white hover:bg-rose-50/40">
                        <td className="py-2 px-3">{renderLedgerLink(creditLabel)}</td>
                        <td className="py-2 px-3 text-slate-700 font-medium">{entryBranch}</td>
                        <td className="py-2 px-3 text-right"></td>
                        <td className="py-2 px-3 text-right font-mono font-bold text-slate-900 whitespace-nowrap">
                          {fmtNum(entryAmount)}
                        </td>
                        <td colSpan={4}></td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>

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
                      {background?.payment?.recorded_by || 'Staff'} • {entryBranch}
                    </span>
                  </div>
                </div>

                <div className="p-3.5 rounded-lg bg-amber-50/70 border border-amber-200 space-y-1.5">
                  <div className="text-[10px] font-black uppercase text-amber-900 tracking-wider">
                    Double-Entry Ledger Impact ({ledger?.name || 'LEDGER'})
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-600">Debit Account (DR):</span>
                    <span className="font-bold text-slate-900 truncate max-w-[180px]">{debitLabel}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-600">Credit Account (CR):</span>
                    <span className="font-bold text-slate-900 truncate max-w-[180px]">{creditLabel}</span>
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
                      ₹{fmtNum(entryAmount)}
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
                      <span className="font-mono text-slate-800">{createdAt}</span>
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
