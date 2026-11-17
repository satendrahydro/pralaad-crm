import React, { useState } from 'react';
import { Lock, ShieldAlert, KeyRound, CheckCircle2, AlertTriangle, ArrowRight } from 'lucide-react';
import TarplLogo from './TarplLogo';
import { getApiBase } from '../utils';

export default function CommercialLockScreen({ reason, onUnlocked }) {
  const [showUnlockModal, setShowUnlockModal] = useState(false);
  const [masterKey, setMasterKey] = useState('');
  const [unlocking, setUnlocking] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const handleUnlock = async (e) => {
    e.preventDefault();
    if (!masterKey) {
      setError('Please enter Master Developer Key');
      return;
    }

    try {
      setUnlocking(true);
      setError('');
      const res = await fetch(`${getApiBase()}/license/unlock`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ masterKey })
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.message || 'Invalid Master Key');

      setSuccess('License Unlocked Successfully! Reloading system...');
      setTimeout(() => {
        if (onUnlocked) onUnlocked();
        else window.location.reload();
      }, 1200);
    } catch (err) {
      setError(err.message || 'Failed to unlock system');
    } finally {
      setUnlocking(false);
    }
  };

  return (
    <div className="fixed inset-0 z-9999 bg-[#062319] text-white flex flex-col items-center justify-center p-4 select-none">
      {/* Background radial glow */}
      <div className="absolute inset-0 bg-radial from-emerald-900/30 via-transparent to-transparent pointer-events-none"></div>

      <div className="relative z-10 max-w-lg w-full bg-[#0b3425]/95 border-2 border-amber-500/40 rounded-3xl p-6 md:p-8 shadow-2xl shadow-black/80 text-center backdrop-blur-md">
        
        {/* Brand Logo */}
        <div className="flex justify-center mb-4">
          <TarplLogo className="h-16 w-auto" />
        </div>

        {/* Status Badge */}
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-rose-500/20 border border-rose-500/50 text-rose-300 text-xs font-bold uppercase tracking-wider mb-4">
          <Lock className="w-3.5 h-3.5" />
          <span>System Access Suspended</span>
        </div>

        {/* Title */}
        <h1 className="text-xl md:text-2xl font-black text-amber-300 mb-2">
          Commercial License Suspended
        </h1>
        <p className="text-xs md:text-sm text-slate-300 leading-relaxed mb-6">
          This software deployment has been temporarily suspended by the vendor due to pending commercial settlement or license renewal. All transaction processing, customer logins, and staff operations are restricted.
        </p>

        {/* Notice Card */}
        <div className="p-4 bg-emerald-950/60 border border-amber-500/30 rounded-2xl text-left space-y-2 mb-6">
          <div className="flex items-center gap-2 text-amber-400 font-bold text-xs">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <span>Settlement Required</span>
          </div>
          <p className="text-[11px] text-slate-300 leading-relaxed">
            {reason || 'Pending developer commercial settlement / AMC license milestone.'}
          </p>
          <div className="pt-2 border-t border-emerald-900/80 text-[11px] text-slate-400">
            Database records and financial data remain 100% encrypted & preserved.
          </div>
        </div>

        {/* Action / Help */}
        <div className="space-y-3">
          <p className="text-xs text-slate-400">
            To restore full operational access, please contact the Software Vendor / Developer to clear outstanding dues.
          </p>

          <button
            type="button"
            onClick={() => setShowUnlockModal(true)}
            className="text-[11px] text-amber-400/80 hover:text-amber-300 underline cursor-pointer transition font-medium"
          >
            🔐 Vendor Master Key Access
          </button>
        </div>
      </div>

      {/* Developer Master Unlock Modal */}
      {showUnlockModal && (
        <div className="fixed inset-0 z-10000 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#0b3425] border border-amber-500/60 rounded-2xl max-w-sm w-full p-6 text-white shadow-2xl relative animate-scaleIn">
            <h3 className="text-sm font-bold text-amber-300 flex items-center gap-2 mb-2">
              <KeyRound className="w-4 h-4 text-amber-400" />
              Vendor Master Authorization
            </h3>
            <p className="text-xs text-slate-300 mb-4">
              Enter your Master Developer Key to unlock this CRM deployment instantly.
            </p>

            {error && (
              <div className="p-2.5 bg-rose-950/80 border border-rose-500/50 rounded-xl text-rose-300 text-xs mb-3 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {success && (
              <div className="p-2.5 bg-emerald-950/80 border border-emerald-500/50 rounded-xl text-emerald-300 text-xs mb-3 flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                <span>{success}</span>
              </div>
            )}

            <form onSubmit={handleUnlock} className="space-y-3">
              <input
                type="password"
                required
                value={masterKey}
                onChange={(e) => setMasterKey(e.target.value)}
                placeholder="Enter Master Developer Key"
                className="w-full px-3 py-2 bg-emerald-950 border border-amber-500/40 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-400"
              />

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => { setShowUnlockModal(false); setError(''); }}
                  className="px-3 py-1.5 text-xs text-slate-400 hover:text-white rounded-lg transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={unlocking}
                  className="px-4 py-1.5 bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold text-xs rounded-lg transition shadow-md disabled:opacity-50 cursor-pointer"
                >
                  {unlocking ? 'Verifying...' : 'Unlock System'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
