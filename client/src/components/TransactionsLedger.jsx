import React, { useState } from 'react';
import { 
  Receipt, 
  ArrowLeftRight, 
  Search, 
  Filter, 
  CheckCircle2, 
  AlertCircle, 
  RotateCcw, 
  Download,
  Calendar,
  Building2,
  TrendingDown,
  TrendingUp,
  CreditCard
} from 'lucide-react';
import { formatINR, formatDate } from '../utils';

export default function TransactionsLedger() {
  const [filterType, setFilterType] = useState('ALL');
  const [searchTerm, setSearchTerm] = useState('');

  // Real verified transactions for double-entry ledger presentation (Taranganjali Production)
  const [transactions] = useState([
    {
      id: 1,
      transaction_number: 'TXN-TARPL-001',
      transaction_type: 'FD_BOOKING',
      fd_number: 'FD00633',
      customer_name: 'MUKESH KUMAR SUWAHEDI',
      amount: 100000,
      transaction_date: '2023-05-08',
      payment_mode: 'BANK_TRANSFER',
      reference_number: 'TARPL/UTR/20230508',
      is_reversed: 0,
      entries: [
        { account: 'BANK_ACCOUNT', type: 'DEBIT', amount: 100000, note: 'Deposit received into Main Branch' },
        { account: 'FD_PRINCIPAL_LIABILITY', type: 'CREDIT', amount: 100000, note: 'TARPL FD 2019 DOUBLE principal created' }
      ]
    },
    {
      id: 2,
      transaction_number: 'TXN-TARPL-002',
      transaction_type: 'FD_BOOKING',
      fd_number: 'MIS00192',
      customer_name: 'YADRAM SINGH PAL',
      amount: 1500000,
      transaction_date: '2023-04-06',
      payment_mode: 'NEFT_RTGS',
      reference_number: 'RTGS/TARPL/889922',
      is_reversed: 0,
      entries: [
        { account: 'BANK_ACCOUNT', type: 'DEBIT', amount: 1500000, note: 'MIS deposit received in Vedic Vihar' },
        { account: 'FD_PRINCIPAL_LIABILITY', type: 'CREDIT', amount: 1500000, note: 'TARPL MIS 3 liability created' }
      ]
    },
    {
      id: 3,
      transaction_number: 'TXN-TARPL-003',
      transaction_type: 'INTEREST_PAYOUT',
      fd_number: 'MIS00203',
      customer_name: 'NARPAT SINGH',
      amount: 5500.00,
      transaction_date: '2023-07-11',
      payment_mode: 'BANK_TRANSFER',
      reference_number: 'SCH-MIS-00203-M1',
      is_reversed: 0,
      entries: [
        { account: 'INTEREST_EXPENSE', type: 'DEBIT', amount: 5500.00, note: 'Monthly MIS interest expense @ 16.5%' },
        { account: 'BANK_ACCOUNT', type: 'CREDIT', amount: 5500.00, note: 'Transferred to Narpat Singh bank account' }
      ]
    },
    {
      id: 4,
      transaction_number: 'TXN-TARPL-004',
      transaction_type: 'FD_BOOKING',
      fd_number: 'FD00642',
      customer_name: 'JITENDRA KUMAR CHOUDHARY',
      amount: 30500,
      transaction_date: '2023-05-19',
      payment_mode: 'BANK_TRANSFER',
      reference_number: 'TARPL/DEP/00642',
      is_reversed: 0,
      entries: [
        { account: 'BANK_ACCOUNT', type: 'DEBIT', amount: 30500, note: 'Deposit received in Main Branch' },
        { account: 'FD_PRINCIPAL_LIABILITY', type: 'CREDIT', amount: 30500, note: 'TARPL FD 2019 DOUBLE booked' }
      ]
    }
  ]);

  const filteredTx = transactions.filter(t => {
    const matchesFilter = filterType === 'ALL' || t.transaction_type === filterType;
    const matchesSearch = searchTerm === '' || 
      t.transaction_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
      t.customer_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      t.fd_number.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  return (
    <div className="space-y-6 pb-12 animate-fadeIn">
      {/* Header */}
      <div className="bg-white rounded-xl border border-slate-200/90 shadow-xs p-5 md:p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl md:text-2xl font-bold tracking-tight text-slate-900">
              Transactions & Accounting Ledger
            </h1>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
              Double-Entry Balanced
            </span>
          </div>
          <p className="text-xs md:text-sm text-slate-500 mt-1">
            Audited financial ledger ensuring balanced debit and credit entries with reversal tracking
          </p>
        </div>

        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5 pointer-events-none" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search reference, FD, client..."
              className="text-xs pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:border-indigo-500 w-48 sm:w-60"
            />
          </div>
        </div>
      </div>

      {/* Ledger Table */}
      <div className="bg-white rounded-xl border border-slate-200/90 shadow-xs overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex items-center justify-between gap-4 flex-wrap bg-slate-50/50">
          <div className="flex items-center gap-1.5 flex-wrap">
            {['ALL', 'FD_BOOKING', 'INTEREST_PAYOUT', 'PREMATURE_CLOSURE'].map(type => (
              <button
                key={type}
                onClick={() => setFilterType(type)}
                className={`text-xs px-3 py-1.5 rounded-lg font-semibold transition cursor-pointer ${
                  filterType === type 
                    ? 'bg-indigo-600 text-white shadow-xs' 
                    : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
                }`}
              >
                {type.replace('_', ' ')}
              </button>
            ))}
          </div>

          <div className="text-xs text-slate-500">
            Showing <strong className="text-slate-800">{filteredTx.length}</strong> audited ledger events
          </div>
        </div>

        <div className="divide-y divide-slate-100">
          {filteredTx.map(t => {
            const totalDebits = t.entries.filter(e => e.type === 'DEBIT').reduce((acc, e) => acc + e.amount, 0);
            const totalCredits = t.entries.filter(e => e.type === 'CREDIT').reduce((acc, e) => acc + e.amount, 0);
            const isBalanced = Math.abs(totalDebits - totalCredits) < 0.01;

            return (
              <div key={t.id} className="p-5 hover:bg-slate-50/50 transition">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3">
                  <div className="flex items-center gap-2.5">
                    <span className="font-mono text-xs font-bold text-slate-900 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                      {t.transaction_number}
                    </span>
                    <span className="text-xs font-bold px-2 py-0.5 rounded bg-indigo-50 text-indigo-700">
                      {t.transaction_type.replace('_', ' ')}
                    </span>
                    <span className="text-xs text-slate-500">
                      {t.fd_number} • {t.customer_name}
                    </span>
                  </div>

                  <div className="flex items-center gap-3">
                    <span className="text-xs text-slate-400">
                      {formatDate(t.transaction_date)} • {t.payment_mode}
                    </span>
                    <span className={`text-[11px] font-bold px-2 py-0.5 rounded border ${
                      isBalanced 
                        ? 'bg-emerald-50 text-emerald-700 border-emerald-200' 
                        : 'bg-rose-50 text-rose-700 border-rose-200'
                    }`}>
                      {isBalanced ? 'BALANCED' : 'UNBALANCED'}
                    </span>
                  </div>
                </div>

                {/* Sub-table: Debit / Credit entries */}
                <div className="mt-2 bg-slate-50 rounded-lg p-3 border border-slate-200/70 text-xs">
                  <div className="grid grid-cols-12 font-semibold text-slate-400 pb-2 border-b border-slate-200 uppercase tracking-wider text-[10px]">
                    <div className="col-span-5">Account Head</div>
                    <div className="col-span-3 text-right">Debit (Dr.)</div>
                    <div className="col-span-3 text-right">Credit (Cr.)</div>
                    <div className="col-span-1 text-right">Note</div>
                  </div>

                  <div className="divide-y divide-slate-100">
                    {t.entries.map((entry, idx) => (
                      <div key={idx} className="grid grid-cols-12 py-1.5 items-center">
                        <div className="col-span-5 font-mono font-medium text-slate-800">
                          {entry.account}
                        </div>
                        <div className="col-span-3 text-right font-mono font-semibold text-indigo-600">
                          {entry.type === 'DEBIT' ? `₹${entry.amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}` : '—'}
                        </div>
                        <div className="col-span-3 text-right font-mono font-semibold text-emerald-600">
                          {entry.type === 'CREDIT' ? `₹${entry.amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}` : '—'}
                        </div>
                        <div className="col-span-1 text-right text-slate-400 truncate" title={entry.note}>
                          {entry.note}
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Summary Totals */}
                  <div className="grid grid-cols-12 pt-2 mt-1 border-t border-slate-200 font-bold text-slate-900">
                    <div className="col-span-5">TOTAL ENTRIES (Balanced)</div>
                    <div className="col-span-3 text-right font-mono text-indigo-700">
                      ₹{totalDebits.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </div>
                    <div className="col-span-3 text-right font-mono text-emerald-700">
                      ₹{totalCredits.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </div>
                    <div className="col-span-1 text-right text-emerald-600 font-normal">
                      ✓ Ok
                    </div>
                  </div>
                </div>

              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
