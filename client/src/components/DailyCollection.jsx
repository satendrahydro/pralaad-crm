import React, { useState, useEffect } from 'react';
import { 
  Building, 
  Users, 
  Calendar, 
  Search, 
  CheckCircle2, 
  Coins, 
  Download, 
  Printer, 
  Plus, 
  RefreshCw,
  Clock,
  ArrowRight
} from 'lucide-react';
import { apiRequest } from '../utils';

export default function DailyCollection() {
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [loading, setLoading] = useState(false);
  const [selectedCenter, setSelectedCenter] = useState('ALL');
  const [search, setSearch] = useState('');
  const [collectModalOpen, setCollectModalOpen] = useState(false);
  const [activeItem, setActiveItem] = useState(null);
  const [collectAmount, setCollectAmount] = useState('');
  const [collectSuccess, setCollectSuccess] = useState('');

  const [collections, setCollections] = useState([
    {
      id: 1,
      center_code: 'CEN001',
      center_name: 'Vedik Vihar Center',
      meeting_time: '10:00 AM',
      advisor_code: 'ADV0001',
      advisor_name: 'Ramesh Chandra Sharma',
      customer_name: 'Prahlad Singh',
      account_no: 'RD-2026-0001',
      product: 'RD Installment',
      target_amount: 5000,
      collected_amount: 5000,
      receipt_no: 'REC-884012',
      status: 'COLLECTED'
    },
    {
      id: 2,
      center_code: 'CEN001',
      center_name: 'Vedik Vihar Center',
      meeting_time: '10:00 AM',
      advisor_code: 'ADV0001',
      advisor_name: 'Ramesh Chandra Sharma',
      customer_name: 'Rahul Sharma',
      account_no: 'RD-2026-0004',
      product: 'RD Installment',
      target_amount: 2500,
      collected_amount: 2500,
      receipt_no: 'REC-884013',
      status: 'COLLECTED'
    },
    {
      id: 3,
      center_code: 'CEN002',
      center_name: 'Shekhupura Mandi Center',
      meeting_time: '11:30 AM',
      advisor_code: 'ADV0003',
      advisor_name: 'Dinesh Kumar',
      customer_name: 'Satendra Kumar',
      account_no: 'LAD-2026-001',
      product: 'Loan EMI (LAD)',
      target_amount: 4500,
      collected_amount: 0,
      receipt_no: null,
      status: 'PENDING'
    },
    {
      id: 4,
      center_code: 'CEN003',
      center_name: 'Kiratpur Road Center',
      meeting_time: '02:00 PM',
      advisor_code: 'ADV0002',
      advisor_name: 'Suresh Verma',
      customer_name: 'Narpat Singh',
      account_no: 'RD-2026-0002',
      product: 'RD Installment',
      target_amount: 3000,
      collected_amount: 0,
      receipt_no: null,
      status: 'PENDING'
    },
    {
      id: 5,
      center_code: 'CEN004',
      center_name: 'Shanti Vihar Center',
      meeting_time: '04:00 PM',
      advisor_code: 'ADV0004',
      advisor_name: 'Anil Chauhan',
      customer_name: 'Amit Patel',
      account_no: 'DD-2026-0005',
      product: 'Daily Pigmy',
      target_amount: 1000,
      collected_amount: 1000,
      receipt_no: 'REC-884014',
      status: 'COLLECTED'
    }
  ]);

  const totalTarget = collections.reduce((acc, c) => acc + c.target_amount, 0);
  const totalCollected = collections.reduce((acc, c) => acc + c.collected_amount, 0);
  const pendingCount = collections.filter(c => c.status === 'PENDING').length;

  const handleOpenCollect = (item) => {
    setActiveItem(item);
    setCollectAmount(item.target_amount.toString());
    setCollectSuccess('');
    setCollectModalOpen(true);
  };

  const handleConfirmCollect = () => {
    if (!activeItem) return;
    const rNo = `REC-${Date.now().toString().slice(-6)}`;
    setCollections(prev => prev.map(c => {
      if (c.id === activeItem.id) {
        return {
          ...c,
          collected_amount: parseFloat(collectAmount),
          receipt_no: rNo,
          status: 'COLLECTED'
        };
      }
      return c;
    }));
    setCollectSuccess(`Payment of ₹${collectAmount} collected! Receipt #${rNo}`);
    setTimeout(() => {
      setCollectModalOpen(false);
      setCollectSuccess('');
    }, 1200);
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
                NEW
              </span>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 border border-slate-200">
                Hubco v6.1 Parity
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Live advisor collection roster by collection centers & group meetings
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 w-full md:w-auto">
          <div className="flex items-center gap-1.5 bg-slate-50 px-3 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-700">
            <Calendar className="w-4 h-4 text-slate-400" />
            <input 
              type="date" 
              value={date} 
              onChange={(e) => setDate(e.target.value)}
              className="bg-transparent border-none text-xs font-bold text-slate-800 focus:outline-none"
            />
          </div>

          <button
            onClick={() => window.print()}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-50"
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
            {Math.round((totalCollected / totalTarget) * 100)}% Fulfilled
          </span>
        </div>

        <div className="bg-white p-4 rounded-xl border border-amber-200 shadow-sm bg-gradient-to-br from-white to-amber-50/40">
          <span className="text-[11px] font-bold text-amber-700 uppercase tracking-wider">Pending Collections</span>
          <div className="text-xl font-black text-amber-900 mt-1">
            {pendingCount} Accounts
          </div>
          <span className="text-[10px] text-amber-700">₹{(totalTarget - totalCollected).toLocaleString('en-IN', { minimumFractionDigits: 2 })} in transit</span>
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
              <option value="CEN001">CEN001 - Vedik Vihar</option>
              <option value="CEN002">CEN002 - Shekhupura Mandi</option>
              <option value="CEN003">CEN003 - Kiratpur Road</option>
              <option value="CEN004">CEN004 - Shanti Vihar</option>
            </select>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead className="bg-slate-50 border-b border-slate-200 text-[10px] uppercase font-bold text-slate-500 tracking-wider">
              <tr>
                <th className="py-2.5 px-4">Center & Time</th>
                <th className="py-2.5 px-4">Field Advisor</th>
                <th className="py-2.5 px-4">Customer / Member</th>
                <th className="py-2.5 px-4">Account & Scheme</th>
                <th className="py-2.5 px-4 text-right">Target Due</th>
                <th className="py-2.5 px-4 text-right">Collected</th>
                <th className="py-2.5 px-4">Receipt No</th>
                <th className="py-2.5 px-4 text-center">Status</th>
                <th className="py-2.5 px-4 text-center">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {filteredItems.map((item) => (
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
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Collect Modal */}
      {collectModalOpen && activeItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fadeIn">
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

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                onClick={() => setCollectModalOpen(false)}
                className="px-3 py-1.5 rounded-xl border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmCollect}
                className="px-4 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-xs"
              >
                Confirm & Generate Receipt
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
