import React, { useState, useEffect } from 'react';
import {
  Search,
  CheckCircle2,
  RefreshCw,
  ChevronRight,
  Landmark
} from 'lucide-react';
import { apiRequest } from '../utils';
import TransactionBackgroundModal from './TransactionBackgroundModal';

export default function TransactionsLedger() {
  const [filterType, setFilterType] = useState('ALL');
  const [ledgerCode, setLedgerCode] = useState('102');
  const [searchTerm, setSearchTerm] = useState('');
  const [statement, setStatement] = useState([]);
  const [ledgerInfo, setLedgerInfo] = useState(null);
  const [pagination, setPagination] = useState({ page: 1, limit: 100, totalRows: 0, totalPages: 1 });
  const [loading, setLoading] = useState(true);
  const [selectedTxDetail, setSelectedTxDetail] = useState(null);
  const [loadingTxDetail, setLoadingTxDetail] = useState(false);

  const today = new Date().toISOString().split('T')[0];

  const fetchLedger = async (page = 1, codeOverride = ledgerCode, typeOverride = filterType, searchOverride = searchTerm) => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        branch: 'ALL',
        startDate: '2026-01-01',
        endDate: today,
        manualOnly: typeOverride === 'MANUAL' ? '1' : '0',
        txType: typeOverride === 'DEBIT' || typeOverride === 'CREDIT' ? typeOverride : 'ALL',
        search: searchOverride || '',
        page: String(page),
        limit: '100'
      });
      const res = await apiRequest(`/accounting/ledger-statement/${encodeURIComponent(codeOverride)}?${params.toString()}`);
      if (res && res.success) {
        setStatement(res.statement || []);
        setLedgerInfo(res.ledger || null);
        setPagination(res.pagination || { page: 1, limit: 100, totalRows: res.statement?.length || 0, totalPages: 1 });
      }
    } catch (err) {
      console.error('Failed to load general ledger:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLedger(1, ledgerCode, filterType, searchTerm);
  }, [ledgerCode, filterType]);

  const handleOpenBackground = async (row) => {
    setSelectedTxDetail({ row, ledger: ledgerInfo, background: null });
    setLoadingTxDetail(true);
    try {
      const params = new URLSearchParams({
        id: row.id || '',
        voucher_no: row.voucher_no || '',
        ledger_name: ledgerInfo?.name || 'CASH BOOK'
      });
      const res = await apiRequest(`/accounting/transaction-background?${params.toString()}`);
      if (res && res.success && res.background) {
        setSelectedTxDetail({ row, ledger: ledgerInfo, background: res.background });
      }
    } catch (err) {
      console.error('Failed to load transaction background:', err);
    } finally {
      setLoadingTxDetail(false);
    }
  };

  const formatNum = (val) => {
    const n = Number(val || 0);
    const abs = Math.abs(n).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    return n < 0 ? `(${abs})` : abs;
  };

  return (
    <div className="space-y-5 pb-12 animate-fadeIn">
      {/* Header */}
      <div className="bg-white rounded-xl border border-slate-200/90 shadow-xs p-5 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="text-xl md:text-2xl font-bold tracking-tight text-slate-900">
              Transactions &amp; General Ledger
            </h1>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
              Live SQLite Double-Entry
            </span>
          </div>
          <p className="text-xs md:text-sm text-slate-500 mt-1">
            Click any transaction description below to inspect payment mode, scheme, customer &amp; audit background
          </p>
        </div>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            fetchLedger(1, ledgerCode, filterType, searchTerm);
          }}
          className="flex flex-wrap items-center gap-2"
        >
          <select
            value={ledgerCode}
            onChange={(e) => setLedgerCode(e.target.value)}
            className="text-xs px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg font-semibold text-slate-800"
          >
            <option value="102">102 — CASH BOOK</option>
            <option value="103">103 — BANK BOOK</option>
            <option value="LED-005">LED-005 — NEW FD RD MIS</option>
            <option value="LED-007">LED-007 — SAVING ACCOUNTS</option>
            <option value="LED-008">LED-008 — RD ACCOUNTS</option>
          </select>
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5 pointer-events-none" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search voucher, customer, FD/RD..."
              className="text-xs pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:border-indigo-500 w-52 sm:w-64"
            />
          </div>
          <button
            type="submit"
            className="px-3.5 py-2 bg-[#082e20] hover:bg-[#0a3d2b] text-white text-xs font-bold rounded-lg cursor-pointer inline-flex items-center gap-1"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>Search</span>
          </button>
        </form>
      </div>

      {/* Ledger Summary Bar */}
      {ledgerInfo && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="bg-white p-3.5 rounded-xl border border-slate-200">
            <div className="text-[10px] font-bold text-slate-400 uppercase">Opening Balance</div>
            <div className="text-base font-mono font-bold text-slate-900">₹{formatNum(ledgerInfo.opening_balance)}</div>
          </div>
          <div className="bg-white p-3.5 rounded-xl border border-slate-200">
            <div className="text-[10px] font-bold text-slate-400 uppercase">Total Debits</div>
            <div className="text-base font-mono font-bold text-emerald-700">₹{formatNum(ledgerInfo.total_debit)}</div>
          </div>
          <div className="bg-white p-3.5 rounded-xl border border-slate-200">
            <div className="text-[10px] font-bold text-slate-400 uppercase">Total Credits</div>
            <div className="text-base font-mono font-bold text-rose-700">₹{formatNum(ledgerInfo.total_credit)}</div>
          </div>
          <div className="bg-white p-3.5 rounded-xl border border-slate-200">
            <div className="text-[10px] font-bold text-slate-400 uppercase">Closing Balance</div>
            <div className="text-base font-mono font-bold text-indigo-700">₹{formatNum(ledgerInfo.closing_balance)}</div>
          </div>
        </div>
      )}

      {/* Filter & Transactions Table */}
      <div className="bg-white rounded-xl border border-slate-200/90 shadow-xs overflow-hidden">
        <div className="p-3.5 border-b border-slate-100 flex items-center justify-between gap-3 flex-wrap bg-slate-50/60">
          <div className="flex items-center gap-1.5 flex-wrap">
            {[
              { id: 'ALL', label: 'All Entries' },
              { id: 'DEBIT', label: 'Debit Only' },
              { id: 'CREDIT', label: 'Credit Only' },
              { id: 'MANUAL', label: 'Manual Vouchers Only' }
            ].map(tab => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setFilterType(tab.id)}
                className={`text-xs px-3 py-1.5 rounded-lg font-semibold transition cursor-pointer ${
                  filterType === tab.id
                    ? 'bg-[#082e20] text-[#D4AF37] shadow-xs'
                    : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <div className="text-xs text-slate-500">
            Showing <strong className="text-slate-800">{statement.length}</strong> of{' '}
            <strong className="text-slate-800">{pagination.totalRows?.toLocaleString('en-IN') || 0}</strong> records
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-[11px] text-left">
            <thead className="bg-slate-50 border-b border-slate-200 text-[10px] uppercase font-bold text-slate-600">
              <tr>
                <th className="py-2 px-2">Branch</th>
                <th className="py-2 px-2">Date</th>
                <th className="py-2 px-2">Description (Click for Background)</th>
                <th className="py-2 px-2 text-center">Sys</th>
                <th className="py-2 px-2 text-right">Opening</th>
                <th className="py-2 px-2 text-right">Debit</th>
                <th className="py-2 px-2 text-right">Credit</th>
                <th className="py-2 px-2 text-right">Closing</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {loading ? (
                <tr>
                  <td colSpan="8" className="py-10 text-center text-slate-400">Loading general ledger entries...</td>
                </tr>
              ) : statement.length === 0 ? (
                <tr>
                  <td colSpan="8" className="py-10 text-center text-slate-400">
                    <Landmark className="w-7 h-7 mx-auto mb-1 text-slate-300" />
                    No ledger transactions found.
                  </td>
                </tr>
              ) : (
                statement.map((s, idx) => (
                  <tr key={s.id || idx} className="hover:bg-slate-50 transition">
                    <td className="py-2 px-2 whitespace-nowrap text-[10px] font-medium">{s.branch || 'MAIN BRANCH'}</td>
                    <td className="py-2 px-2 whitespace-nowrap text-slate-600">{s.date}</td>
                    <td className="py-2 px-2 max-w-[260px]">
                      <button
                        type="button"
                        onClick={() => handleOpenBackground(s)}
                        className="text-left text-[#2563eb] hover:text-[#1d4ed8] hover:underline font-medium cursor-pointer group flex flex-col items-start gap-0.5 max-w-full"
                      >
                        <span className="inline-flex items-center gap-1 max-w-full">
                          <span className="truncate max-w-[230px]">{s.description || s.particulars}</span>
                          <ChevronRight className="w-3 h-3 opacity-60 group-hover:opacity-100 transition shrink-0" />
                        </span>
                        <span className="flex items-center gap-1.5 text-[10px]">
                          {s.voucher_no && <span className="font-mono text-slate-500">[{s.voucher_no}]</span>}
                          {s.payment_mode && (
                            <span className="px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200 font-bold uppercase">
                              {s.payment_mode}
                            </span>
                          )}
                        </span>
                      </button>
                    </td>
                    <td className="py-2 px-2 text-center">
                      <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold text-white ${s.is_system === 'Yes' ? 'bg-[#00a65a]' : 'bg-[#dd4b39]'}`}>
                        {s.is_system || 'Yes'}
                      </span>
                    </td>
                    <td className="py-2 px-2 text-right font-mono whitespace-nowrap">{formatNum(s.opening_balance)}</td>
                    <td className="py-2 px-2 text-right font-mono font-bold text-slate-800 whitespace-nowrap">{s.debit > 0 ? formatNum(s.debit) : ''}</td>
                    <td className="py-2 px-2 text-right font-mono font-bold text-slate-800 whitespace-nowrap">{s.credit > 0 ? formatNum(s.credit) : ''}</td>
                    <td className="py-2 px-2 text-right font-mono font-bold text-slate-900 whitespace-nowrap">{formatNum(s.running_balance ?? s.balance)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {pagination.totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-2.5 bg-slate-50 border-t border-slate-200 text-xs">
            <span>Page <strong>{pagination.page}</strong> of <strong>{pagination.totalPages}</strong></span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                disabled={pagination.page <= 1 || loading}
                onClick={() => fetchLedger(Math.max(1, pagination.page - 1))}
                className="px-3 py-1 bg-white border border-slate-300 rounded font-bold disabled:opacity-40 cursor-pointer"
              >
                ← Prev
              </button>
              <button
                type="button"
                disabled={pagination.page >= pagination.totalPages || loading}
                onClick={() => fetchLedger(Math.min(pagination.totalPages, pagination.page + 1))}
                className="px-3 py-1 bg-white border border-slate-300 rounded font-bold disabled:opacity-40 cursor-pointer"
              >
                Next →
              </button>
            </div>
          </div>
        )}
      </div>

      <TransactionBackgroundModal
        detail={selectedTxDetail}
        loading={loadingTxDetail}
        onClose={() => setSelectedTxDetail(null)}
        onOpenLedger={(targetName) => {
          const u = String(targetName || '').toUpperCase();
          const nextCode = u.includes('CASH') ? '102'
            : u.includes('BANK') ? '103'
            : u.includes('RD ACCOUNT') ? 'LED-008'
            : u.includes('SAVING') ? 'LED-007'
            : u.includes('FD') ? 'LED-005'
            : null;
          setSelectedTxDetail(null);
          if (nextCode) setLedgerCode(nextCode);
        }}
        formatAccountingNum={formatNum}
      />
    </div>
  );
}
