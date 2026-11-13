import React, { useState, useEffect } from 'react';
import { X, AlertTriangle, CheckCircle, Calculator } from 'lucide-react';
import { formatINR, formatDate, apiRequest } from '../utils';

export default function PrematureCloseModal({ fd, isOpen, onClose, onSuccess }) {
  const [withdrawalDate, setWithdrawalDate] = useState(new Date().toISOString().split('T')[0]);
  const [penaltyRate, setPenaltyRate] = useState(1.0);
  const [preview, setPreview] = useState(null);
  const [loading, setLoading] = useState(false);
  const [remarks, setRemarks] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (isOpen && fd) {
      const fetchPreview = async () => {
        try {
          setLoading(true);
          const res = await apiRequest(`/fds/${fd.id}/premature-preview`, {
            method: 'POST',
            body: JSON.stringify({ withdrawalDate, penaltyRate })
          });
          setPreview(res.preview);
        } catch (err) {
          console.error(err);
        } finally {
          setLoading(false);
        }
      };
      fetchPreview();
    }
  }, [isOpen, fd, withdrawalDate, penaltyRate]);

  if (!isOpen || !fd) return null;

  const handleExecuteClose = async () => {
    if (!confirm('Are you sure you want to prematurely liquidate this Fixed Deposit? This action cannot be undone.')) {
      return;
    }

    try {
      setSubmitting(true);
      await apiRequest(`/fds/${fd.id}/premature-close`, {
        method: 'POST',
        body: JSON.stringify({ withdrawalDate, penaltyRate, remarks })
      });
      alert('FD Liquidated successfully.');
      onSuccess();
      onClose();
    } catch (err) {
      alert('Error liquidating FD: ' + err.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 max-w-lg w-full p-6 sm:p-8 relative">
        
        <button
          onClick={onClose}
          className="absolute right-5 top-5 p-2 rounded-full hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-3 mb-6">
          <div className="w-12 h-12 rounded-2xl bg-rose-100 text-rose-600 flex items-center justify-center">
            <AlertTriangle className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-slate-900">Premature FD Liquidation</h2>
            <p className="text-xs text-slate-500">समय से पहले FD तुड़वाने और पेनल्टी कटौती का हिसाब</p>
          </div>
        </div>

        <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 text-xs mb-5 space-y-1">
          <p><span className="text-slate-500">FD Number:</span> <strong className="text-indigo-900">{fd.fd_number}</strong></p>
          <p><span className="text-slate-500">Depositor:</span> <strong>{fd.customer_name}</strong></p>
          <p><span className="text-slate-500">Original Principal:</span> <strong className="text-slate-900">{formatINR(fd.principal_amount)}</strong></p>
          <p><span className="text-slate-500">Original Interest Rate:</span> <strong className="text-emerald-700">{fd.annual_rate}% p.a.</strong></p>
        </div>

        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">
                Liquidation Date
              </label>
              <input
                type="date"
                value={withdrawalDate}
                onChange={(e) => setWithdrawalDate(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">
                Penalty Rate Deduction (%)
              </label>
              <input
                type="number"
                step="0.25"
                min="0"
                max="5"
                value={penaltyRate}
                onChange={(e) => setPenaltyRate(parseFloat(e.target.value) || 0)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800"
              />
            </div>
          </div>

          {preview && (
            <div className="p-4 bg-rose-50/70 border border-rose-200 rounded-2xl space-y-2 text-xs">
              <div className="flex justify-between">
                <span className="text-slate-600">Days Completed:</span>
                <span className="font-bold text-slate-800">{preview.daysCompleted} Days</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-600">Applicable Interest Rate:</span>
                <span className="font-bold text-slate-800">
                  {preview.originalRate}% - {preview.penaltyRate}% = <span className="text-emerald-700">{preview.adjustedRate}%</span>
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-600">Eligible Interest Earned:</span>
                <span className="font-bold text-emerald-700">+{formatINR(preview.eligibleInterest)}</span>
              </div>
              {preview.alreadyPaidInterest > 0 && (
                <div className="flex justify-between text-rose-600">
                  <span>Already Paid Periodic Interest:</span>
                  <span className="font-bold">-{formatINR(preview.alreadyPaidInterest)}</span>
                </div>
              )}
              <div className="pt-2 border-t border-rose-200 flex justify-between items-center text-sm">
                <span className="font-bold text-slate-900">Net Payable Settlement:</span>
                <span className="text-lg font-black text-rose-700">{formatINR(preview.netPayable)}</span>
              </div>
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">
              Closure Reason / Remarks
            </label>
            <input
              type="text"
              placeholder="e.g. Urgent customer fund requirement"
              value={remarks}
              onChange={(e) => setRemarks(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs"
            />
          </div>

          <div className="flex justify-end gap-3 pt-3 border-t border-slate-100">
            <button
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl cursor-pointer"
            >
              Cancel
            </button>

            <button
              onClick={handleExecuteClose}
              disabled={submitting || !preview}
              className="px-5 py-2.5 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-xl shadow-lg shadow-rose-600/30 transition cursor-pointer disabled:opacity-50"
            >
              {submitting ? 'Processing...' : 'Confirm Liquidation'}
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}
