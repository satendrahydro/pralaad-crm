import React, { useState } from 'react';
import { X, CheckCircle2, AlertTriangle, BookOpen, ArrowRight } from 'lucide-react';
import { apiRequest } from '../utils';
import DateInput from './DateInput';

export default function NewJournalEntryModal({ isOpen, onClose, onSuccess }) {
  const [voucherDate, setVoucherDate] = useState(new Date().toISOString().split('T')[0]);
  const [referenceNo, setReferenceNo] = useState(`JV-${Date.now().toString().slice(-6)}`);
  const [debitLedger, setDebitLedger] = useState('Cash Book');
  const [creditLedger, setCreditLedger] = useState('Tarpl Main');
  const [amount, setAmount] = useState('');
  const [narration, setNarration] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  if (!isOpen) return null;

  const standardLedgers = [
    'Tarpl Main',
    'Wallet Balance',
    'Cash Book',
    'Bank Book (PNB / SBI)',
    'New FD RD MIS',
    'Saving Accounts',
    'RD Accounts',
    'DD Accounts',
    'Commission Expense',
    'Interest Expense',
    'Loan Disbursal Pool'
  ];

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!amount || parseFloat(amount) <= 0) {
      setError('Please enter a valid amount.');
      return;
    }

    if (debitLedger === creditLedger) {
      setError('Debit and Credit ledgers cannot be identical.');
      return;
    }

    setLoading(true);
    try {
      const res = await apiRequest('/accounting/journal-entry', {
        method: 'POST',
        body: JSON.stringify({
          voucher_date: voucherDate,
          reference_no: referenceNo,
          debit_ledger: debitLedger,
          credit_ledger: creditLedger,
          amount: parseFloat(amount),
          narration
        })
      });

      if (res && res.success) {
        setSuccess(res.message);
        setTimeout(() => {
          if (onSuccess) onSuccess();
          onClose();
        }, 1200);
      } else {
        setError(res?.message || 'Failed to post journal entry.');
      }
    } catch (err) {
      setError(err.message || 'Error posting journal entry.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[200] flex justify-center items-start pt-16 pb-10 p-4 bg-slate-950/80 backdrop-blur-xs overflow-y-auto animate-fadeIn">
      <div className="w-full max-w-lg bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 bg-gradient-to-r from-amber-500 to-amber-600 text-slate-950 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <BookOpen className="w-5 h-5" />
            <div>
              <h2 className="text-base font-black tracking-tight">New Journal Entry (JV)</h2>
              <p className="text-[11px] font-semibold text-slate-900/80">Double-Entry Banking Voucher</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-black/10 transition">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-700 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {success && (
            <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-800 flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>{success}</span>
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">Voucher Date</label>
              <DateInput
                value={voucherDate}
                onChange={(e) => setVoucherDate(e.target.value)}
                className="w-full text-xs p-2.5 rounded-xl border border-slate-300 font-semibold text-slate-800"
                required
              />
            </div>
            <div>
              <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">Voucher No</label>
              <input
                type="text"
                value={referenceNo}
                onChange={(e) => setReferenceNo(e.target.value)}
                className="w-full text-xs p-2.5 rounded-xl border border-slate-300 font-mono font-bold text-slate-800"
                required
              />
            </div>
          </div>

          <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-3">
            <div>
              <label className="block text-[11px] font-bold text-emerald-800 uppercase mb-1 flex items-center justify-between">
                <span>Debit Ledger (Dr)</span>
                <span className="text-[10px] text-emerald-600 font-normal">Incoming / Asset / Expense</span>
              </label>
              <select
                value={debitLedger}
                onChange={(e) => setDebitLedger(e.target.value)}
                className="w-full text-xs p-2.5 rounded-xl border border-slate-300 font-bold text-slate-900 bg-white"
              >
                {standardLedgers.map(l => (
                  <option key={`dr-${l}`} value={l}>{l}</option>
                ))}
              </select>
            </div>

            <div className="flex justify-center text-slate-400">
              <ArrowRight className="w-4 h-4 transform rotate-90" />
            </div>

            <div>
              <label className="block text-[11px] font-bold text-rose-800 uppercase mb-1 flex items-center justify-between">
                <span>Credit Ledger (Cr)</span>
                <span className="text-[10px] text-rose-600 font-normal">Outgoing / Liability / Income</span>
              </label>
              <select
                value={creditLedger}
                onChange={(e) => setCreditLedger(e.target.value)}
                className="w-full text-xs p-2.5 rounded-xl border border-slate-300 font-bold text-slate-900 bg-white"
              >
                {standardLedgers.map(l => (
                  <option key={`cr-${l}`} value={l}>{l}</option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">Transaction Amount (₹)</label>
            <input
              type="number"
              step="0.01"
              min="1"
              placeholder="e.g. 50000"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="w-full text-sm font-black p-2.5 rounded-xl border border-slate-300 text-slate-900 font-mono"
              required
            />
          </div>

          <div>
            <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">Narration / Particulars</label>
            <textarea
              rows={2}
              placeholder="Enter transfer details, depositor reference, or reason..."
              value={narration}
              onChange={(e) => setNarration(e.target.value)}
              className="w-full text-xs p-2.5 rounded-xl border border-slate-300 text-slate-800"
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl border border-slate-300 text-xs font-semibold text-slate-700 hover:bg-slate-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-5 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold text-xs shadow-sm transition disabled:opacity-50"
            >
              {loading ? 'Posting Voucher...' : 'Post Journal Voucher'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
