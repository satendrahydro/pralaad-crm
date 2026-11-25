import React, { useState } from 'react';
import { X, RotateCw, CheckCircle, Calculator } from 'lucide-react';
import { formatINR, formatDate, COMPOUNDING_OPTIONS, apiRequest } from '../utils';

export default function RenewModal({ fd, isOpen, onClose, onSuccess }) {
  const [renewType, setRenewType] = useState('PRINCIPAL_PLUS_INTEREST');
  const [newRate, setNewRate] = useState(fd?.annual_rate || 8.5);
  const [newTenure, setNewTenure] = useState(fd?.tenure_months || 12);
  const [isCustomTenure, setIsCustomTenure] = useState(![6, 12, 24, 36, 60].includes(Number(fd?.tenure_months || 12)));
  const [compoundingFreq, setCompoundingFreq] = useState(fd?.compounding_frequency || 'quarterly');
  const [submitting, setSubmitting] = useState(false);

  if (!isOpen || !fd) return null;

  const renewalPrincipal = (renewType === 'PRINCIPAL_PLUS_INTEREST') ? fd.maturity_amount : fd.principal_amount;

  const handleRenew = async () => {
    try {
      setSubmitting(true);
      const user = JSON.parse(localStorage.getItem('pralaad_fd_user') || '{}');
      if (user.role === 'employee') {
        const res = await apiRequest('/approvals', {
          method: 'POST',
          body: JSON.stringify({
            request_type: 'RENEWAL',
            customer_id: fd.customer_id,
            fd_id: fd.id,
            proposed_amount: renewalPrincipal,
            request_data: {
              fdId: fd.id,
              renewType,
              newRate: parseFloat(newRate),
              newTenureMonths: parseInt(newTenure),
              compoundingFrequency: compoundingFreq
            },
            remarks: `Staff Renewal Proposal: ${fd.fd_number} for ${newTenure}M @ ${newRate}%`
          })
        });
        alert(`Renewal proposal submitted (${res.request_number}). Awaiting Admin verification.`);
        onClose();
        return;
      }

      const res = await apiRequest(`/fds/${fd.id}/renew`, {
        method: 'POST',
        body: JSON.stringify({
          renew_type: renewType,
          new_rate: parseFloat(newRate),
          new_tenure_months: parseInt(newTenure),
          compounding_frequency: compoundingFreq
        })
      });
      alert(res.message);
      onSuccess();
      onClose();
    } catch (err) {
      alert('Error renewing FD: ' + err.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[10001] bg-slate-950/80 backdrop-blur-sm flex justify-center items-start pt-16 pb-10 p-4 overflow-y-auto">
      <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 max-w-lg w-full p-6 sm:p-8 relative">
        
        <button
          onClick={onClose}
          className="absolute right-5 top-5 p-2 rounded-full hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-3 mb-6">
          <div className="w-12 h-12 rounded-2xl bg-emerald-100 text-emerald-700 flex items-center justify-center">
            <RotateCw className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-slate-900">Renew Fixed Deposit</h2>
            <p className="text-xs text-slate-500">मैच्योरिटी के बाद FD को आगे रीन्यू करने का प्रोसेस</p>
          </div>
        </div>

        <div className="space-y-4 text-xs">
          {/* Rollover Type */}
          <div>
            <label className="block font-bold uppercase tracking-wider text-slate-600 mb-2">
              Rollover Option
            </label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setRenewType('PRINCIPAL_PLUS_INTEREST')}
                className={`p-3 rounded-xl border text-left cursor-pointer transition ${
                  renewType === 'PRINCIPAL_PLUS_INTEREST'
                    ? 'border-indigo-600 bg-indigo-50/70 text-indigo-950 font-bold'
                    : 'border-slate-200 bg-slate-50 text-slate-700'
                }`}
              >
                <div className="text-xs font-bold">Principal + Interest</div>
                <div className="text-[11px] text-slate-500 mt-1">Roll over full {formatINR(fd.maturity_amount)}</div>
              </button>

              <button
                type="button"
                onClick={() => setRenewType('PRINCIPAL_ONLY')}
                className={`p-3 rounded-xl border text-left cursor-pointer transition ${
                  renewType === 'PRINCIPAL_ONLY'
                    ? 'border-indigo-600 bg-indigo-50/70 text-indigo-950 font-bold'
                    : 'border-slate-200 bg-slate-50 text-slate-700'
                }`}
              >
                <div className="text-xs font-bold">Principal Only</div>
                <div className="text-[11px] text-slate-500 mt-1">Roll over original {formatINR(fd.principal_amount)}</div>
              </button>
            </div>
          </div>

          <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-200 flex justify-between items-center">
            <span className="font-semibold text-emerald-900">New Deposit Principal:</span>
            <span className="text-base font-black text-emerald-900">{formatINR(renewalPrincipal)}</span>
          </div>

          {/* New Parameters */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-slate-600 mb-1">New Rate (% p.a.)</label>
              <input
                type="number"
                step="0.05"
                value={newRate}
                onChange={(e) => setNewRate(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-bold"
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block font-semibold text-slate-600">New Tenure (अवधि)</label>
                {isCustomTenure && (
                  <span className="text-[10px] font-bold text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200">
                    Custom Active
                  </span>
                )}
              </div>
              <select
                value={isCustomTenure ? 'custom' : newTenure}
                onChange={(e) => {
                  const val = e.target.value;
                  if (val === 'custom') {
                    setIsCustomTenure(true);
                  } else {
                    setIsCustomTenure(false);
                    setNewTenure(parseInt(val) || 12);
                  }
                }}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold cursor-pointer"
              >
                <option value="6">6 Months</option>
                <option value="12">12 Months (1 Year)</option>
                <option value="24">24 Months (2 Years)</option>
                <option value="36">36 Months (3 Years)</option>
                <option value="60">60 Months (5 Years)</option>
                <option value="custom">Custom Tenure (कस्टम अवधि)</option>
              </select>

              {isCustomTenure && (
                <div className="mt-2 relative animate-fadeIn">
                  <input
                    type="number"
                    min="1"
                    max="360"
                    value={newTenure}
                    onChange={(e) => setNewTenure(Math.max(1, parseInt(e.target.value) || 1))}
                    placeholder="Enter custom months"
                    className="w-full px-3 py-1.5 bg-amber-50/50 border border-amber-300 rounded-lg text-xs font-bold text-slate-900"
                  />
                  <span className="absolute right-3 top-1.5 text-xs font-semibold text-slate-500">
                    Months ({((parseInt(newTenure) || 0) / 12).toFixed(1)} Yrs)
                  </span>
                </div>
              )}
            </div>
          </div>

          <div>
            <label className="block font-semibold text-slate-600 mb-1">Compounding Frequency</label>
            <select
              value={compoundingFreq}
              onChange={(e) => setCompoundingFreq(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium cursor-pointer"
            >
              {COMPOUNDING_OPTIONS.map(o => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          </div>

          <div className="flex justify-end gap-3 pt-3 border-t border-slate-100">
            <button
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl cursor-pointer"
            >
              Cancel
            </button>

            <button
              onClick={handleRenew}
              disabled={submitting}
              className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow-lg shadow-emerald-600/30 transition cursor-pointer disabled:opacity-50"
            >
              {submitting ? 'Renewing...' : 'Confirm Renewal'}
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}
