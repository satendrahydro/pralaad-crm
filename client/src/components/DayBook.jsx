import React, { useState, useEffect } from 'react';
import { 
  BookOpen, 
  Calendar, 
  Search, 
  RefreshCw, 
  Download, 
  Printer, 
  Plus, 
  ArrowUpRight, 
  ArrowDownLeft, 
  Wallet, 
  Building2, 
  Coins, 
  FileText,
  TrendingUp,
  CreditCard,
  CheckCircle2
} from 'lucide-react';
import { apiRequest } from '../utils';

export default function DayBook({ onOpenJournalEntry }) {
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedLedgerFilter, setSelectedLedgerFilter] = useState('ALL');
  const [viewFormat, setViewFormat] = useState('format1'); // 'format1' | 'format2'

  const fetchDayBook = async () => {
    setLoading(true);
    try {
      const res = await apiRequest(`/accounting/day-book?date=${date}`);
      if (res && res.success) {
        setData(res);
      }
    } catch (err) {
      console.error('Failed to load Day Book:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDayBook();
  }, [date]);

  const filteredVouchers = (data?.vouchers || []).filter(v => {
    const matchesSearch = !search || 
      v.voucher_no.toLowerCase().includes(search.toLowerCase()) ||
      v.account.toLowerCase().includes(search.toLowerCase()) ||
      v.narration.toLowerCase().includes(search.toLowerCase());
    const matchesLedger = selectedLedgerFilter === 'ALL' || v.ledger === selectedLedgerFilter;
    return matchesSearch && matchesLedger;
  });

  return (
    <div className="space-y-6">
      {/* 1. Header & Controls Matching Live Taranganjali CRM */}
      <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-200 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Day Book</h1>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200">
              Core Banking
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Daily balance tracking across cash vault, bank accounts, deposit liabilities, and pool wallets
          </p>
        </div>

        {/* Filter Controls matching admin.taranganjali.com/accounting/day-book */}
        <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
          {/* Branch / Ledger Filter Dropdown */}
          <select 
            value={selectedLedgerFilter} 
            onChange={(e) => setSelectedLedgerFilter(e.target.value)}
            className="px-3 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-xs font-semibold text-slate-700 focus:outline-none focus:ring-1 focus:ring-amber-500"
          >
            <option value="ALL">ALL</option>
            <option value="TARPL MAIN">TARPL MAIN</option>
            <option value="WALLET BALANCE">WALLET BALANCE</option>
            <option value="CASH BOOK">CASH BOOK</option>
            <option value="BANK BOOK">BANK BOOK</option>
            <option value="NEW FD RD MIS">NEW FD RD MIS</option>
            <option value="SAVING ACCOUNTS">SAVING ACCOUNTS</option>
            <option value="RD ACCOUNTS">RD ACCOUNTS</option>
            <option value="DD ACCOUNTS">DD ACCOUNTS</option>
          </select>

          {/* Date Picker */}
          <div className="flex items-center gap-1.5 bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-300 text-xs font-semibold text-slate-700">
            <input 
              type="date" 
              value={date} 
              onChange={(e) => setDate(e.target.value)}
              className="bg-transparent border-none text-xs font-bold text-slate-800 focus:outline-none cursor-pointer"
            />
          </div>

          {/* GET Button */}
          <button
            onClick={fetchDayBook}
            className="px-4 py-1.5 bg-[#16a34a] hover:bg-emerald-700 text-white font-bold rounded-lg text-xs shadow-xs transition cursor-pointer"
          >
            GET
          </button>

          {/* Format Dropdown */}
          <div className="flex items-center gap-1.5 ml-2">
            <span className="text-xs text-slate-500 font-medium">Format:</span>
            <select
              value={viewFormat}
              onChange={(e) => setViewFormat(e.target.value)}
              className="px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-bold text-slate-800 focus:outline-none cursor-pointer"
            >
              <option value="format1">Format 1 (3-Column Banking View)</option>
              <option value="format2">Format 2 (Detailed Table View)</option>
            </select>
          </div>

          <button
            onClick={() => onOpenJournalEntry && onOpenJournalEntry()}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold text-xs shadow-xs transition ml-auto"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>New Journal Entry</span>
          </button>
        </div>
      </div>

      {/* ======================================================== */}
      {/* 2. FORMAT 1: 3-COLUMN BANKING LAYOUT (EXACT PARITY)       */}
      {/* ======================================================== */}
      {viewFormat === 'format1' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          
          {/* COLUMN 1: OPENING */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden border-t-4 border-t-amber-500">
            <div className="py-3 px-4 bg-slate-50 border-b border-slate-200 text-center font-bold text-xs text-slate-700 tracking-wider">
              OPENING ({date.split('-').reverse().join('/')})
            </div>
            <div className="divide-y divide-slate-100">
              {(data?.ledgers || []).map((ledger) => (
                <div key={ledger.id} className="p-4 text-center hover:bg-slate-50/50 transition">
                  <div className="text-lg font-bold font-mono text-slate-900 tracking-tight">
                    {ledger.opening_balance.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </div>
                  <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mt-0.5">
                    {ledger.name}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* COLUMN 2: CURRENT / CLOSING */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden border-t-4 border-t-rose-500">
            <div className="py-3 px-4 bg-slate-50 border-b border-slate-200 text-center font-bold text-xs text-slate-700 tracking-wider">
              CURRENT/ CLOSING ({date.split('-').reverse().join('/')})
            </div>
            <div className="divide-y divide-slate-100">
              {(data?.ledgers || []).map((ledger) => (
                <div key={ledger.id} className="p-4 text-center hover:bg-slate-50/50 transition">
                  <div className="text-lg font-bold font-mono text-slate-900 tracking-tight">
                    {ledger.closing_balance.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </div>
                  <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mt-0.5">
                    {ledger.name}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* COLUMN 3: DAY TRANSACTIONS */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden border-t-4 border-t-emerald-500">
            <div className="py-3 px-4 bg-slate-50 border-b border-slate-200 text-center font-bold text-xs text-slate-700 tracking-wider">
              DAY TRANSACTIONS
            </div>
            <div className="divide-y divide-slate-100">
              {(data?.ledgers || []).map((ledger) => {
                const netDay = (ledger.receipts || 0) - (ledger.payments || 0);
                return (
                  <div key={ledger.id} className="p-4 text-center hover:bg-slate-50/50 transition">
                    <div className={`text-lg font-bold font-mono tracking-tight ${netDay > 0 ? 'text-emerald-600' : netDay < 0 ? 'text-rose-600' : 'text-slate-800'}`}>
                      {netDay.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </div>
                    <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mt-0.5">
                      {ledger.name}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

        </div>
      )}

      {/* ======================================================== */}
      {/* 3. FORMAT 2: DETAILED 8-COLUMN TABLE                      */}
      {/* ======================================================== */}
      {viewFormat === 'format2' && (
        <div className="space-y-6">
          {/* Summary KPI Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Total Opening</span>
              <div className="text-lg md:text-xl font-black text-slate-800 mt-1">
                ₹{(data?.summary?.total_opening || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
              </div>
              <span className="text-[10px] text-slate-400">9 Core Banking Ledgers</span>
            </div>

            <div className="bg-white p-4 rounded-xl border border-emerald-200/80 shadow-sm bg-gradient-to-br from-white to-emerald-50/40">
              <span className="text-[11px] font-bold text-emerald-700 uppercase tracking-wider flex items-center gap-1">
                <ArrowDownLeft className="w-3.5 h-3.5" /> Total Receipts
              </span>
              <div className="text-lg md:text-xl font-black text-emerald-800 mt-1">
                +₹{(data?.summary?.total_receipts || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
              </div>
              <span className="text-[10px] text-emerald-600">Collections & Inflows</span>
            </div>

            <div className="bg-white p-4 rounded-xl border border-rose-200/80 shadow-sm bg-gradient-to-br from-white to-rose-50/40">
              <span className="text-[11px] font-bold text-rose-700 uppercase tracking-wider flex items-center gap-1">
                <ArrowUpRight className="w-3.5 h-3.5" /> Total Payments
              </span>
              <div className="text-lg md:text-xl font-black text-rose-800 mt-1">
                -₹{(data?.summary?.total_payments || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
              </div>
              <span className="text-[10px] text-rose-600">Payouts & Disbursements</span>
            </div>

            <div className="bg-white p-4 rounded-xl border border-indigo-200/80 shadow-sm bg-gradient-to-br from-white to-indigo-50/40">
              <span className="text-[11px] font-bold text-indigo-700 uppercase tracking-wider">Net Closing Balance</span>
              <div className="text-lg md:text-xl font-black text-indigo-900 mt-1">
                ₹{(data?.summary?.total_closing || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
              </div>
              <span className="text-[10px] text-indigo-600 font-semibold">Vault + Bank + Reserves</span>
            </div>
          </div>

          {/* 8 Core Banking Ledgers Table */}
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
              <div>
                <h2 className="text-sm font-bold text-slate-900">Banking Balance Ledgers</h2>
                <p className="text-xs text-slate-500">Live reconciliation breakdown for {date}</p>
              </div>
              <button
                onClick={() => window.print()}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-50"
              >
                <Printer className="w-3.5 h-3.5 text-slate-500" />
                <span>Print Sheet</span>
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="bg-slate-50 border-b border-slate-200 text-[10px] uppercase font-bold text-slate-500 tracking-wider">
                  <tr>
                    <th className="py-3 px-4">Code</th>
                    <th className="py-3 px-4">Ledger Name</th>
                    <th className="py-3 px-4">Classification</th>
                    <th className="py-3 px-4 text-right">Opening Balance</th>
                    <th className="py-3 px-4 text-right text-emerald-700">Receipts (Dr)</th>
                    <th className="py-3 px-4 text-right text-rose-700">Payments (Cr)</th>
                    <th className="py-3 px-4 text-right">Closing Balance</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700 font-medium">
                  {(data?.ledgers || []).map((ledger) => (
                    <tr key={ledger.id} className="hover:bg-slate-50/80 transition">
                      <td className="py-3 px-4 font-mono font-bold text-slate-500">{ledger.code}</td>
                      <td className="py-3 px-4 font-bold text-slate-900 flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                        {ledger.name}
                      </td>
                      <td className="py-3 px-4 text-slate-500">{ledger.type}</td>
                      <td className="py-3 px-4 text-right font-mono">
                        ₹{ledger.opening_balance.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </td>
                      <td className="py-3 px-4 text-right font-mono font-bold text-emerald-600">
                        +₹{ledger.receipts.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </td>
                      <td className="py-3 px-4 text-right font-mono font-bold text-rose-600">
                        -₹{ledger.payments.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </td>
                      <td className="py-3 px-4 text-right font-mono font-black text-slate-900">
                        ₹{ledger.closing_balance.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Transactions & Vouchers Recorded Today */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div>
            <h2 className="text-sm font-bold text-slate-900">Day Book Transaction Vouchers</h2>
            <p className="text-xs text-slate-500">Detailed double-entry vouchers recorded on {date}</p>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <div className="relative flex-1 sm:w-64">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search voucher, member..."
                className="w-full text-xs pl-8 pr-3 py-1.5 rounded-lg border border-slate-200 focus:outline-none focus:border-amber-500"
              />
            </div>
            <select
              value={selectedLedgerFilter}
              onChange={(e) => setSelectedLedgerFilter(e.target.value)}
              className="text-xs py-1.5 px-2.5 rounded-lg border border-slate-200 focus:outline-none focus:border-amber-500 font-medium"
            >
              <option value="ALL">All Ledgers</option>
              {(data?.ledgers || []).map(l => (
                <option key={l.id} value={l.name}>{l.name}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead className="bg-slate-50 border-b border-slate-200 text-[10px] uppercase font-bold text-slate-500 tracking-wider">
              <tr>
                <th className="py-2.5 px-4">Voucher No</th>
                <th className="py-2.5 px-4">Time</th>
                <th className="py-2.5 px-4">Ledger</th>
                <th className="py-2.5 px-4">Account / Member</th>
                <th className="py-2.5 px-4">Dr / Cr Entry</th>
                <th className="py-2.5 px-4">Narration</th>
                <th className="py-2.5 px-4 text-right">Amount</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {filteredVouchers.map((v) => (
                <tr key={v.id} className="hover:bg-slate-50 transition">
                  <td className="py-3 px-4 font-mono font-bold text-amber-700">{v.voucher_no}</td>
                  <td className="py-3 px-4 text-slate-500 whitespace-nowrap">{v.time}</td>
                  <td className="py-3 px-4 font-medium text-slate-900">{v.ledger}</td>
                  <td className="py-3 px-4 font-medium text-slate-800">{v.account}</td>
                  <td className="py-3 px-4">
                    <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold ${
                      v.type === 'RECEIPT' ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                    }`}>
                      {v.dr_cr}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-slate-500 max-w-xs truncate">{v.narration}</td>
                  <td className={`py-3 px-4 text-right font-mono font-bold ${
                    v.type === 'RECEIPT' ? 'text-emerald-700' : 'text-rose-700'
                  }`}>
                    {v.type === 'RECEIPT' ? '+' : '-'}₹{v.amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
