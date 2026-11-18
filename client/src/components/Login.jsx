import React, { useState } from 'react';
import { Lock, User, ShieldCheck, ArrowRight, TrendingUp, KeyRound, CheckCircle, AlertTriangle, X, RefreshCw } from 'lucide-react';
import { apiRequest } from '../utils';
import TarplLogo from './TarplLogo';

export default function Login({ onLoginSuccess }) {
  const [username, setUsername] = useState('admin');
  const [password, setPassword] = useState('admin123');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Forgot Password / OTP Modal State
  const [showForgotModal, setShowForgotModal] = useState(false);
  const [forgotStep, setForgotStep] = useState(1); // 1: Identifier, 2: OTP, 3: New Password
  const [forgotIdentifier, setForgotIdentifier] = useState('');
  const [otpCode, setOtpCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [resetToken, setResetToken] = useState('');
  const [forgotLoading, setForgotLoading] = useState(false);
  const [forgotError, setForgotError] = useState('');
  const [forgotSuccess, setForgotSuccess] = useState('');
  const [demoOtpHint, setDemoOtpHint] = useState('');
  const [maskedPhone, setMaskedPhone] = useState('');

  const handleQuickFill = (u, p) => {
    setUsername(u);
    setPassword(p);
    setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const data = await apiRequest('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ username, password })
      });

      localStorage.setItem('pralaad_fd_token', data.token);
      localStorage.setItem('pralaad_fd_user', JSON.stringify(data.user));
      onLoginSuccess(data.user, data.subscription);
    } catch (err) {
      setError(err.message || 'Login failed. Please check credentials.');
    } finally {
      setLoading(false);
    }
  };

  // Step 1: Send OTP
  const handleSendOtp = async (e) => {
    e.preventDefault();
    setForgotLoading(true);
    setForgotError('');
    setForgotSuccess('');

    try {
      const res = await apiRequest('/auth/forgot-password', {
        method: 'POST',
        body: JSON.stringify({ identifier: forgotIdentifier })
      });

      setMaskedPhone(res.masked_phone || '');
      setDemoOtpHint(res.demo_otp_hint || '');
      setForgotStep(2);
      setForgotSuccess(res.message);
    } catch (err) {
      setForgotError(err.message || 'Failed to send OTP.');
    } finally {
      setForgotLoading(false);
    }
  };

  // Step 2: Verify OTP
  const handleVerifyOtp = async (e) => {
    e.preventDefault();
    setForgotLoading(true);
    setForgotError('');
    setForgotSuccess('');

    try {
      const res = await apiRequest('/auth/verify-otp', {
        method: 'POST',
        body: JSON.stringify({ identifier: forgotIdentifier, otp: otpCode })
      });

      setResetToken(res.reset_token);
      setForgotStep(3);
      setForgotSuccess(res.message);
    } catch (err) {
      setForgotError(err.message || 'Invalid OTP code.');
    } finally {
      setForgotLoading(false);
    }
  };

  // Step 3: Reset Password
  const handleResetPassword = async (e) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      setForgotError('Passwords do not match.');
      return;
    }
    if (newPassword.length < 6) {
      setForgotError('Password must be at least 6 characters.');
      return;
    }

    setForgotLoading(true);
    setForgotError('');
    setForgotSuccess('');

    try {
      const res = await apiRequest('/auth/reset-password', {
        method: 'POST',
        body: JSON.stringify({
          identifier: forgotIdentifier,
          reset_token: resetToken,
          new_password: newPassword
        })
      });

      setForgotSuccess(res.message);
      setTimeout(() => {
        setShowForgotModal(false);
        setPassword(newPassword);
        setUsername(forgotIdentifier);
        // Reset modal state
        setForgotStep(1);
        setForgotIdentifier('');
        setOtpCode('');
        setNewPassword('');
        setConfirmPassword('');
        setResetToken('');
        setDemoOtpHint('');
      }, 1500);
    } catch (err) {
      setForgotError(err.message || 'Password reset failed.');
    } finally {
      setForgotLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#062319] via-[#082e20] to-[#062319] flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-white/95 backdrop-blur-md rounded-2xl shadow-2xl border border-white/20 p-8">
        
        {/* Brand Header */}
        <div className="text-center mb-6">
          <div className="flex justify-center mb-3">
            <TarplLogo variant="badge" size={84} />
          </div>
          <h1 className="text-xl font-black text-[#062319] tracking-tight">TARANG ANJALI REAL TECH PVT. LTD.</h1>
          <p className="text-xs text-[#0A5C36] font-bold mt-0.5">जीत आपके विश्वास की • Institutional Banking & Wealth CRM</p>
        </div>

        {/* Quick Role Select Tabs */}
        <div className="grid grid-cols-2 gap-2 mb-6 p-1 bg-slate-100 rounded-xl text-xs font-semibold">
          <button
            type="button"
            onClick={() => handleQuickFill('admin', 'admin123')}
            className={`py-2 rounded-lg transition cursor-pointer text-center ${
              username === 'admin'
                ? 'bg-[#062319] text-[#FBBF24] shadow-xs font-bold'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Super Admin (Owner)
          </button>
          <button
            type="button"
            onClick={() => handleQuickFill('staff1', 'staff123')}
            className={`py-2 rounded-lg transition cursor-pointer text-center ${
              username === 'staff1'
                ? 'bg-[#062319] text-[#FBBF24] shadow-xs font-bold'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Staff (Maker)
          </button>
        </div>

        {error && (
          <div className="mb-5 p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-xl flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-rose-500 shrink-0"></span>
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1.5">
              Login ID / Username
            </label>
            <div className="relative">
              <User className="w-5 h-5 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                required
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full pl-11 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#0A5C36] focus:bg-white text-slate-800 transition text-sm font-medium"
                placeholder="Enter username or mobile"
              />
            </div>
          </div>

          <div>
            <div className="flex justify-between items-center mb-1.5">
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600">
                Password
              </label>
              <button
                type="button"
                onClick={() => {
                  setForgotIdentifier(username);
                  setForgotStep(1);
                  setForgotError('');
                  setForgotSuccess('');
                  setShowForgotModal(true);
                }}
                className="text-xs font-semibold text-[#0A5C36] hover:text-[#08482a] cursor-pointer"
              >
                Forgot Password?
              </button>
            </div>
            <div className="relative">
              <Lock className="w-5 h-5 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full pl-11 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#0A5C36] focus:bg-white text-slate-800 transition text-sm font-medium"
                placeholder="Enter password"
              />
            </div>
          </div>

          <div className="p-3 bg-amber-50/70 border border-amber-200/80 rounded-xl flex items-start gap-2.5 text-xs text-amber-900">
            <ShieldCheck className="w-4 h-4 text-[#D4AF37] shrink-0 mt-0.5" />
            <div className="leading-relaxed">
              <span className="font-semibold">Active Experience:</span> {username === 'admin' ? 'Super Admin (Checker & Approver)' : 'Staff Member (Maker & Submitter)'}
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 px-4 bg-[#D4AF37] hover:bg-[#C59B27] active:bg-[#B38C1F] text-[#062319] font-bold rounded-xl shadow-lg transition flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer text-sm"
          >
            {loading ? (
              <span className="inline-block w-5 h-5 border-2 border-[#062319] border-t-transparent rounded-full animate-spin"></span>
            ) : (
              <>
                Sign In to Portal
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </form>

        <div className="mt-6 pt-5 border-t border-slate-100 text-center text-xs text-slate-400">
          Dual Custody Protected • Strict Maker-Checker Architecture
        </div>
      </div>

      {/* Forgot Password OTP Modal */}
      {showForgotModal && (
        <div className="fixed inset-0 bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 animate-fadeIn">
            <div className="flex justify-between items-center mb-4 pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-indigo-100 text-indigo-600 flex items-center justify-center font-bold">
                  <KeyRound className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 text-sm">Staff Password Reset</h3>
                  <p className="text-[11px] text-slate-500">Verified Mobile OTP Verification</p>
                </div>
              </div>
              <button
                onClick={() => setShowForgotModal(false)}
                className="text-slate-400 hover:text-slate-600 p-1 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Stepper Header */}
            <div className="flex items-center justify-between mb-5 px-4 text-xs font-bold text-slate-500">
              <span className={forgotStep >= 1 ? 'text-indigo-600' : ''}>1. Mobile</span>
              <span className="text-slate-300">→</span>
              <span className={forgotStep >= 2 ? 'text-indigo-600' : ''}>2. OTP</span>
              <span className="text-slate-300">→</span>
              <span className={forgotStep >= 3 ? 'text-indigo-600' : ''}>3. New Password</span>
            </div>

            {forgotError && (
              <div className="mb-4 p-2.5 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-xl flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                <span>{forgotError}</span>
              </div>
            )}

            {forgotSuccess && (
              <div className="mb-4 p-2.5 bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs rounded-xl flex items-center gap-2">
                <CheckCircle className="w-4 h-4 shrink-0" />
                <span>{forgotSuccess}</span>
              </div>
            )}

            {/* Step 1: Identifier */}
            {forgotStep === 1 && (
              <form onSubmit={handleSendOtp} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Staff Username or Registered Phone
                  </label>
                  <input
                    type="text"
                    required
                    value={forgotIdentifier}
                    onChange={(e) => setForgotIdentifier(e.target.value)}
                    placeholder="e.g. employee1 or 9876543210"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:bg-white focus:ring-2 focus:ring-indigo-600"
                  />
                  <p className="text-[11px] text-slate-400 mt-1">
                    A 6-digit OTP will be generated and sent to the registered mobile.
                  </p>
                </div>

                <div className="p-2.5 bg-amber-50 border border-amber-200 rounded-xl text-[11px] text-amber-800">
                  <div className="font-bold">Gateway Notice:</div>
                  Simulated SMS Mode Active. OTP will appear in prompt response.
                </div>

                <div className="flex justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowForgotModal(false)}
                    className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={forgotLoading}
                    className="px-4 py-2 text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl shadow-md transition cursor-pointer disabled:opacity-50"
                  >
                    {forgotLoading ? 'Sending...' : 'Send OTP Code'}
                  </button>
                </div>
              </form>
            )}

            {/* Step 2: OTP Verification */}
            {forgotStep === 2 && (
              <form onSubmit={handleVerifyOtp} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Enter 6-Digit OTP Code
                  </label>
                  <input
                    type="text"
                    required
                    maxLength={6}
                    value={otpCode}
                    onChange={(e) => setOtpCode(e.target.value)}
                    placeholder="123456"
                    className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-center text-lg font-mono font-bold tracking-widest text-slate-800 focus:bg-white focus:ring-2 focus:ring-indigo-600"
                  />
                  <div className="flex justify-between items-center text-[11px] text-slate-500 mt-1.5">
                    <span>Sent to: <b className="text-slate-700">{maskedPhone}</b></span>
                    <button
                      type="button"
                      onClick={handleSendOtp}
                      className="text-indigo-600 font-semibold hover:underline cursor-pointer flex items-center gap-1"
                    >
                      <RefreshCw className="w-3 h-3" /> Resend
                    </button>
                  </div>
                </div>

                {demoOtpHint && (
                  <div className="p-2 bg-indigo-50 border border-indigo-200 rounded-xl text-center text-xs text-indigo-900 font-medium">
                    Demo Simulated OTP: <code className="font-mono font-bold bg-indigo-200 px-2 py-0.5 rounded text-indigo-950">{demoOtpHint}</code>
                  </div>
                )}

                <div className="flex justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setForgotStep(1)}
                    className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl cursor-pointer"
                  >
                    Back
                  </button>
                  <button
                    type="submit"
                    disabled={forgotLoading}
                    className="px-4 py-2 text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl shadow-md transition cursor-pointer disabled:opacity-50"
                  >
                    {forgotLoading ? 'Verifying...' : 'Verify OTP'}
                  </button>
                </div>
              </form>
            )}

            {/* Step 3: Set New Password */}
            {forgotStep === 3 && (
              <form onSubmit={handleResetPassword} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    New Password
                  </label>
                  <input
                    type="password"
                    required
                    minLength={6}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Minimum 6 characters"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:bg-white focus:ring-2 focus:ring-indigo-600"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Confirm New Password
                  </label>
                  <input
                    type="password"
                    required
                    minLength={6}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Re-enter new password"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:bg-white focus:ring-2 focus:ring-indigo-600"
                  />
                </div>

                <div className="flex justify-end gap-2 pt-2">
                  <button
                    type="submit"
                    disabled={forgotLoading}
                    className="w-full py-2.5 text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl shadow-md transition cursor-pointer disabled:opacity-50"
                  >
                    {forgotLoading ? 'Updating Password...' : 'Save New Password & Sign In'}
                  </button>
                </div>
              </form>
            )}

          </div>
        </div>
      )}

    </div>
  );
}
