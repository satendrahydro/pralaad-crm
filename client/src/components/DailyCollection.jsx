import React, { useState, useEffect } from 'react';
import {
  Building,
  Search,
  CheckCircle2,
  Coins,
  Printer,
  Clock,
  RefreshCw
} from 'lucide-react';
import { apiRequest } from '../utils';
import DateInput from './DateInput';

export default function DailyCollection() {
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [loading, setLoading] = useState(true);
  const [selectedCenter, setSelectedCenter] = useState('ALL');
  const [search, setSearch] = useState('');
  const [collectModalOpen, setCollectModalOpen] = useState(false);
  const [activeItem, setActiveItem] = useState(null);
  const [collectAmount, setCollectAmount] = useState('');
  const [collectMode, setCollectMode] = useState('CASH');
  const [collectDate, setCollectDate] = useState(new Date().toISOString().split('T')[0]);
  const [collectSuccess, setCollectSuccess] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [centers, setCenters] = useState([]);
  const [collections, setCollections] = useState([]);

  const fetchCollectionSheet = async () => {
    setLoading(true);
    try {
      const [centersRes, duesRes] = await Promise.all([
        apiRequest('/collection-centers'),
        apiRequest('/accounting/payments-to-collect')
      ]);

      if (centersRes && centersRes.success) {
        setCenters(centersRes.centers || []);
      }
      if (duesRes && duesRes.success) {
        const mapped = (duesRes.items || []).map((item) => {
          const centerCode = String(item.center || '').split(' ')[0] || 'CEN001';
          return {
            id: item.id,
            center_code: centerCode,
            center_name: item.center || 'Branch Counter',
            meeting_time: item.due_date || date,
            advisor_code: item.advisor_code || 'FIELD',
            advisor_name: item.advisor_name || 'Branch Collector',
            customer_name: item.customer_name,
            account_no: item.account_no,
            product: item.account_type || 'RD / Loan',
            target_amount: Number(item.due_amount || 0),
            collected_amount: 0,
            receipt_no: null,
            status: 'PENDING'
          };
        });
        setCollections(mapped);
      }
    } catch (err) {
      console.error('Failed to load daily collections:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCollectionSheet();
  }, [date]);

  const totalTarget = collections.reduce((acc, c) => acc + c.target_amount, 0);
  const totalCollected = collections.reduce((acc, c) => acc + c.collected_amount, 0);
  const pendingCount = collections.filter(c => c.status === 'PENDING').length;
  const fulfilledPct = totalTarget > 0 ? Math.round((totalCollected / totalTarget) * 100) : 0;

  const handleOpenCollect = (item) => {
    setActiveItem(item);
    setCollectAmount(item.target_amount.toString());
    setCollectMode('CASH');
    setCollectDate(new Date().toISOString().split('T')[0]);
    setCollectSuccess('');
    setCollectModalOpen(true);
  };

  const handleConfirmCollect = async () => {
    if (!activeItem) return;
    setSubmitting(true);
    try {
      const amt = parseFloat(collectAmount) || 0;
      const res = await apiRequest('/accounting/collect-payment', {
        method: 'POST',
        body: JSON.stringify({
          item_id: activeItem.id,
          account_no: activeItem.account_no,
          customer_name: activeItem.customer_name,
          amount: amt,
          payment_mode: collectMode,
          collection_date: collectDate
        })
      });
      if (res && res.success) {
        const rNo = res.receipt_no || `REC-${Date.now().toString().slice(-6)}`;
        setCollections(prev => prev.map(c => c.id === activeItem.id ? {
          ...c,
          collected_amount: amt,
          receipt_no: rNo,
          status: 'COLLECTED'
        } : c));
        setCollectSuccess(res.message || `Payment of ₹${amt} collected! Receipt #${rNo}`);
        setTimeout(() => {
          setCollectModalOpen(false);
          setCollectSuccess('');
        }, 1200);
      }
    } catch (err) {
      console.error('Collect error:', err);
    } finally {
      setSubmitting(false);
    }
  };

  const filteredItems = collections.filter(c => {
    const matchesCenter = selectedCenter === 'ALL' || c.center_code === selectedCenter;
    const matchesSearch = !search ||
      c.customer_name.toLowerCase().includes(search.toLowerCase()) ||
      c.advisor_name.toLowerCase().includes(search.toLowerCase()) ||
      c.account_no.toLowerCase().includes(search.toLowerCase());
    return matchesCenter && matchesSearch;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-200 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center shrink-0">
            <Coins className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-black text-slate-900 tracking-tight">Daily Field Collections</h1>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500 text-white shadow-xs">
                LIVE SYNC
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Live advisor collection roster synced with RD dues, loan EMIs &amp; Day Book
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 w-full md:w-auto">
          <div className="flex items-center bg-slate-50 px-2.5 py-1.5 rounded-xl border border-slate-200 text-xs font-semibold text-slate-700">
            <DateInput
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="bg-transparent border-none text-xs font-bold text-slate-800 focus:outline-none"
            />
          </div>

          <button
            onClick={fetchCollectionSheet}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-50 cursor-pointer"
          >
            <RefreshCw className={`w-4 h-4 text-slate-500 ${loading ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>

          <button
            onClick={() => window.print()}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-50 cursor-pointer"
          >
            <Printer className="w-4 h-4 text-slate-500" />
            <span>Print Sheet</span>
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Scheduled Target</span>
          <div className="text-xl font-black text-slate-900 mt-1">
            ₹{totalTarget.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
          </div>
          <span className="text-[10px] text-slate-500">{collections.length} Collections Scheduled</span>
        </div>

        <div className="bg-white p-4 rounded-xl border border-emerald-200 shadow-sm bg-gradient-to-br from-white to-emerald-50/40">
          <span className="text-[11px] font-bold text-emerald-700 uppercase tracking-wider">Mobilized / Collected</span>
          <div className="text-xl font-black text-emerald-800 mt-1">
            ₹{totalCollected.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
          </div>
          <span className="text-[10px] text-emerald-600 font-semibold">
            {fulfilledPct}% Fulfilled
          </span>
        </div>

        <div className="bg-white p-4 rounded-xl border border-amber-200 shadow-sm bg-gradient-to-br from-white to-amber-50/40">
          <span className="text-[11px] font-bold text-amber-700 uppercase tracking-wider">Pending Collections</span>
          <div className="text-xl font-black text-amber-900 mt-1">
            {pendingCount} Accounts
          </div>
          <span className="text-[10px] text-amber-700">₹{(totalTarget - totalCollected).toLocaleString('en-IN', { minimumFractionDigits: 2 })} due</span>
        </div>
      </div>

      {/* Collections Table */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Building className="w-4 h-4 text-emerald-600" />
            <h2 className="text-sm font-bold text-slate-900">Center Meeting Collection Entries</h2>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <div className="relative flex-1 sm:w-60">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search depositor, advisor..."
                className="w-full text-xs pl-8 pr-3 py-1.5 rounded-lg border border-slate-200 focus:outline-none focus:border-emerald-500"
              />
            </div>
            <select
              value={selectedCenter}
              onChange={(e) => setSelectedCenter(e.target.value)}
              className="text-xs py-1.5 px-2.5 rounded-lg border border-slate-200 focus:outline-none font-medium"
            >
              <option value="ALL">All Centers</option>
              {centers.map(c => (
                <option key={c.id || c.center_code} value={c.center_code}>
                  {c.center_code} - {c.center_name}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead className="bg-slate-50 border-b border-slate-200 text-[10px] uppercase font-bold text-slate-500 tracking-wider">
              <tr>
                <th className="py-2.5 px-4">Center &amp; Due Date</th>
                <th className="py-2.5 px-4">Field Advisor</th>
                <th className="py-2.5 px-4">Customer / Member</th>
                <th className="py-2.5 px-4">Account &amp; Scheme</th>
                <th className="py-2.5 px-4 text-right">Target Due</th>
                <th className="py-2.5 px-4 text-right">Collected</th>
                <th className="py-2.5 px-4">Receipt No</th>
                <th className="py-2.5 px-4 text-center">Status</th>
                <th className="py-2.5 px-4 text-center">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {loading ? (
                <tr>
                  <td colSpan="9" className="py-10 text-center text-slate-400">Loading due collections...</td>
                </tr>
              ) : filteredItems.length === 0 ? (
                <tr>
                  <td colSpan="9" className="py-10 text-center text-slate-400">No pending field collections found.</td>
                </tr>
              ) : (
                filteredItems.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-50 transition">
                    <td className="py-3 px-4">
                      <div className="font-bold text-slate-900">{item.center_name}</div>
                      <div className="text-[10px] text-slate-400 flex items-center gap-1 mt-0.5">
                        <Clock className="w-3 h-3 text-slate-400" />
                        <span>{item.meeting_time}</span>
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <div className="font-semibold text-slate-800">{item.advisor_name}</div>
                      <div className="text-[10px] font-mono text-emerald-700">{item.advisor_code}</div>
                    </td>
                    <td className="py-3 px-4 font-bold text-slate-900">{item.customer_name}</td>
                    <td className="py-3 px-4">
                      <div className="font-mono text-slate-800">{item.account_no}</div>
                      <div className="text-[10px] text-slate-500">{item.product}</div>
                    </td>
                    <td className="py-3 px-4 text-right font-mono font-bold text-slate-900">
                      ₹{item.target_amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </td>
                    <td className="py-3 px-4 text-right font-mono font-bold text-emerald-700">
                      ₹{item.collected_amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </td>
                    <td className="py-3 px-4 font-mono text-xs">
                      {item.receipt_no ? (
                        <span className="font-bold text-emerald-700">{item.receipt_no}</span>
                      ) : (
                        <span className="text-slate-400 italic">—</span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-center">
                      <span className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                        item.status === 'COLLECTED'
                          ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                          : 'bg-amber-100 text-amber-800 border border-amber-200'
                      }`}>
                        {item.status}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-center">
                      {item.status === 'PENDING' ? (
                        <button
                          onClick={() => handleOpenCollect(item)}
                          className="px-3 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-bold text-[11px] shadow-xs cursor-pointer"
                        >
                          Collect
                        </button>
                      ) : (
                        <span className="text-[11px] text-emerald-700 font-bold flex items-center justify-center gap-1">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          Done
                        </span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Collect Modal */}
      {collectModalOpen && activeItem && (
        <div className="fixed inset-0 z-[200] flex justify-center items-start pt-16 pb-10 p-4 bg-slate-950/80 backdrop-blur-xs overflow-y-auto animate-fadeIn">
          <div className="w-full max-w-sm bg-white rounded-2xl shadow-2xl border border-slate-200 p-6 space-y-4">
            <h3 className="text-sm font-black text-slate-900">Record Field Collection</h3>
            <p className="text-xs text-slate-500">
              {activeItem.customer_name} • {activeItem.account_no} ({activeItem.product})
            </p>

            {collectSuccess && (
              <div className="p-3 bg-emerald-50 border border-emerald-200 text-xs text-emerald-800 rounded-xl">
                {collectSuccess}
              </div>
            )}

            <div>
              <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">Collected Amount (₹)</label>
              <input
                type="number"
                value={collectAmount}
                onChange={(e) => setCollectAmount(e.target.value)}
                className="w-full text-base font-black p-2.5 rounded-xl border border-slate-300 font-mono"
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-[11px] font-bold text-slate-600 uppercase">Collection Date</label>
                {activeItem.meeting_time && activeItem.meeting_time <= new Date().toISOString().split('T')[0] && collectDate !== activeItem.meeting_time && (
                  <button
                    type="button"
                    onClick={() => setCollectDate(activeItem.meeting_time)}
                    className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200 cursor-pointer"
                  >
                    Use Due Date ({activeItem.meeting_time})
                  </button>
                )}
              </div>
              <DateInput
                max={new Date().toISOString().split('T')[0]}
                value={collectDate}
                onChange={(e) => setCollectDate(e.target.value)}
                className="w-full text-xs font-bold p-2.5 rounded-xl border border-slate-300 bg-white font-mono"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">Payment Mode</label>
              <select
                value={collectMode}
                onChange={(e) => setCollectMode(e.target.value)}
                className="w-full text-xs font-bold p-2.5 rounded-xl border border-slate-300 bg-white"
              >
                <option value="CASH">Cash Collection</option>
                <option value="BANK_ONLINE">UPI / Bank Transfer</option>
              </select>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                onClick={() => setCollectModalOpen(false)}
                className="px-3 py-1.5 rounded-xl border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-slate-50 cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmCollect}
                disabled={submitting}
                className="px-4 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-xs cursor-pointer"
              >
                {submitting ? 'Saving...' : 'Confirm & Generate Receipt'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
