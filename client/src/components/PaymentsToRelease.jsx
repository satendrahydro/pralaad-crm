import React, { useState, useEffect } from 'react';
import { 
  ArrowUpRight, 
  Search, 
  Building2, 
  CheckCircle2, 
  Clock, 
  CreditCard, 
  Printer, 
  ShieldCheck,
  Send
} from 'lucide-react';
import { apiRequest } from '../utils';

export default function PaymentsToRelease() {
  const [releases, setReleases] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('ALL');

  // Modal
  const [activeRelease, setActiveRelease] = useState(null);
  const [payoutMode, setPayoutMode] = useState('NEFT');
  const [utrNumber, setUtrNumber] = useState('');
  const [releaseSuccess, setReleaseSuccess] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const fetchReleases = async () => {
    setLoading(true);
    try {
      const res = await apiRequest('/accounting/payments-to-release');
      if (res && res.success) {
        setReleases(res.releases || []);
      }
    } catch (err) {
      console.error('Failed to fetch payments to release:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReleases();
  }, []);

  const handleOpenRelease = (item) => {
    setActiveRelease(item);
    setPayoutMode('NEFT');
    setUtrNumber(`UTR${Date.now().toString().slice(-8)}`);
    setReleaseSuccess('');
  };

  const handleConfirmRelease = async () => {
    if (!activeRelease) return;
    setSubmitting(true);
    try {
      const res = await apiRequest('/accounting/release-payment', {
        method: 'POST',
        body: JSON.stringify({
          release_id: activeRelease.id,
          account_no: activeRelease.account_no,
          customer_name: activeRelease.customer_name,
          amount: activeRelease.amount,
          payment_mode: payoutMode,
          utr_no: utrNumber
        })
      });

      if (res && res.success) {
        setReleaseSuccess(res.message);
        setReleases(prev => prev.map(r => {
          if (r.id === activeRelease.id) {
            return { ...r, status: 'RELEASED', utr_no: res.utr_no };
          }
          return r;
        }));
        setTimeout(() => {
          setActiveRelease(null);
          setReleaseSuccess('');
        }, 1500);
      }
    } catch (err) {
      alert(err.message || 'Payment release failed');
    } finally {
      setSubmitting(false);
    }
  };

  const filteredReleases = releases.filter(r => {
    const matchesSearch = !search ||
      r.customer_name.toLowerCase().includes(search.toLowerCase()) ||
      r.account_no.toLowerCase().includes(search.toLowerCase()) ||
      r.member_code.toLowerCase().includes(search.toLowerCase());
    const matchesType = typeFilter === 'ALL' || r.payment_type.includes(typeFilter);
    return matchesSearch && matchesType;
  });

  const totalPayable = filteredReleases.reduce((sum, r) => sum + (r.status !== 'RELEASED' ? r.amount : 0), 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-200 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-rose-500/10 text-rose-600 flex items-center justify-center shrink-0">
            <ArrowUpRight className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-black text-slate-900 tracking-tight">Payments to Release</h1>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-rose-100 text-rose-800 border border-rose-200">
                Disbursements & Claims
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Authorized maturity claims, recurring MIS monthly interest credits & loan disbursals
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="text-right">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Total Payable Claims</span>
            <span className="text-lg font-black text-rose-600 font-mono">
              ₹{totalPayable.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
            </span>
          </div>
          <button
            onClick={() => window.print()}
            className="p-2.5 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-600 transition"
            title="Print Release Schedule"
          >
            <Printer className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Filter and Search */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="relative flex-1 w-full sm:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search claim, depositor, account..."
            className="w-full text-xs pl-9 pr-3 py-2 rounded-lg border border-slate-200 focus:outline-none focus:border-rose-500"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="text-xs py-2 px-3 rounded-lg border border-slate-200 font-medium"
          >
            <option value="ALL">All Payment Types</option>
            <option value="FD Maturity">FD Maturity Claims</option>
            <option value="MIS Payout">Monthly MIS Payouts</option>
            <option value="Loan Disbursal">Loan Disbursals</option>
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead className="bg-slate-50 border-b border-slate-200 text-[10px] uppercase font-bold text-slate-500 tracking-wider">
              <tr>
                <th className="py-3 px-4">Branch</th>
                <th className="py-3 px-4">Payment Category</th>
                <th className="py-3 px-4">Account Number</th>
                <th className="py-3 px-4">Beneficiary Member</th>
                <th className="py-3 px-4">Bank & IFSC</th>
                <th className="py-3 px-4 text-right">Payable Amount</th>
                <th className="py-3 px-4 text-amber-950 bg-amber-50">Due Date (पेंडिंग कब से था)</th>
                <th className="py-3 px-4 text-emerald-950 bg-emerald-50">Disbursed Date (डिसबर्स तारीख)</th>
                <th className="py-3 px-4 text-center">Checker Approval</th>
                <th className="py-3 px-4 text-center">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700 font-medium">
              {filteredReleases.map((item) => (
                <tr key={item.id} className="hover:bg-slate-50 transition">
                  <td className="py-3 px-4 text-[11px] font-semibold text-slate-800 whitespace-nowrap">
                    {item.branch}
                  </td>
                  <td className="py-3 px-4">
                    <span className="font-bold text-slate-900 bg-slate-100 px-2 py-0.5 rounded text-[10px]">
                      {item.payment_type}
                    </span>
                  </td>
                  <td className="py-3 px-4 font-mono font-bold text-slate-800">
                    {item.account_no}
                  </td>
                  <td className="py-3 px-4">
                    <div className="font-bold text-slate-900">{item.customer_name}</div>
                    <div className="text-[10px] text-slate-400 font-mono">{item.member_code}</div>
                  </td>
                  <td className="py-3 px-4">
                    <div className="font-semibold text-slate-800 text-[11px]">{item.bank_name}</div>
                    <div className="text-[10px] text-slate-400 font-mono">A/C: {item.account_number} • {item.ifsc_code}</div>
                  </td>
                  <td className="py-3 px-4 text-right font-mono font-black text-rose-700 text-sm">
                    ₹{item.amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </td>
                  <td className="py-3 px-4 whitespace-nowrap text-slate-800 font-bold font-mono bg-amber-50/20">
                    {item.due_date}
                  </td>
                  <td className="py-3 px-4 whitespace-nowrap bg-emerald-50/20">
                    {item.status === 'RELEASED' ? (
                      <div>
                        <span className="inline-flex items-center gap-1 font-mono font-bold text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded text-[10px]">
                          ✓ {item.released_date || new Date().toISOString().split('T')[0]}
                        </span>
                        {item.utr_no && (
                          <div className="text-[10px] font-mono text-slate-500 mt-0.5">{item.utr_no}</div>
                        )}
                      </div>
                    ) : (
                      <span className="text-[10px] font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                        Pending Release
                      </span>
                    )}
                  </td>
                  <td className="py-3 px-4 text-center">
                    <span className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                      item.status === 'RELEASED'
                        ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                        : item.status === 'APPROVED_READY' || item.status === 'READY_TO_RELEASE'
                        ? 'bg-blue-100 text-blue-800 border border-blue-200'
                        : 'bg-amber-100 text-amber-800 border border-amber-200'
                    }`}>
                      {item.status.replace(/_/g, ' ')}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-center">
                    {item.status === 'RELEASED' ? (
                      <span className="text-[11px] font-bold text-emerald-700 flex items-center justify-center gap-1">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        {item.utr_no || 'Disbursed'}
                      </span>
                    ) : (
                      <button
                        onClick={() => handleOpenRelease(item)}
                        className="inline-flex items-center gap-1 px-3 py-1 bg-rose-600 hover:bg-rose-700 text-white rounded-lg font-bold text-[11px] shadow-xs cursor-pointer"
                      >
                        <Send className="w-3 h-3" />
                        <span>Release</span>
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Release Confirmation Modal */}
      {activeRelease && (
        <div className="fixed inset-0 z-[200] flex justify-center items-start pt-16 pb-10 p-4 bg-slate-950/80 backdrop-blur-xs overflow-y-auto animate-fadeIn">
          <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl border border-slate-200 p-6 space-y-4">
            <div className="flex items-center justify-between border-b pb-3">
              <div>
                <h3 className="text-base font-black text-slate-900">Authorize Bank Payout / Release</h3>
                <p className="text-xs text-slate-500">{activeRelease.payment_type} • {activeRelease.account_no}</p>
              </div>
              <button 
                type="button"
                onClick={() => setActiveRelease(null)} 
                className="inline-flex items-center gap-1 px-2.5 py-1 bg-rose-50 hover:bg-rose-100 text-rose-700 rounded-lg text-xs font-bold transition cursor-pointer"
                title="Close"
              >
                ✕ Close
              </button>
            </div>

            {releaseSuccess && (
              <div className="p-3 bg-emerald-50 border border-emerald-200 text-xs text-emerald-800 rounded-xl flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                <span>{releaseSuccess}</span>
              </div>
            )}

            <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 space-y-1.5 text-xs">
              <div className="flex justify-between">
                <span className="text-slate-500">Beneficiary:</span>
                <span className="font-bold text-slate-900">{activeRelease.customer_name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Bank & Account:</span>
                <span className="font-semibold text-slate-800">{activeRelease.bank_name} ({activeRelease.account_number})</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">IFSC Code:</span>
                <span className="font-mono text-slate-700">{activeRelease.ifsc_code}</span>
              </div>
              <div className="flex justify-between border-t pt-1 font-bold text-sm">
                <span className="text-slate-800">Net Payable Amount:</span>
                <span className="font-mono text-rose-700">₹{activeRelease.amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">Transfer Mode</label>
              <div className="grid grid-cols-3 gap-2">
                {['NEFT', 'RTGS', 'CHEQUE'].map(m => (
                  <button
                    key={m}
                    type="button"
                    onClick={() => setPayoutMode(m)}
                    className={`py-2 px-2 text-center rounded-xl text-xs font-bold transition ${
                      payoutMode === m ? 'bg-rose-600 text-white shadow-xs' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                    }`}
                  >
                    {m}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">UTR / Bank Reference No</label>
              <input
                type="text"
                value={utrNumber}
                onChange={(e) => setUtrNumber(e.target.value)}
                className="w-full text-xs font-mono font-bold p-2.5 rounded-xl border border-slate-300"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setActiveRelease(null)}
                className="px-4 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={submitting}
                onClick={handleConfirmRelease}
                className="px-5 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs shadow-xs disabled:opacity-50"
              >
                {submitting ? 'Releasing...' : 'Authorize & Mark Released'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
