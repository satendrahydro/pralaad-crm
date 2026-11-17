import React, { useState, useEffect } from 'react';
import { 
  X, 
  User, 
  CreditCard, 
  FolderLock, 
  Calendar, 
  Clock, 
  CheckCircle2, 
  RotateCw, 
  Wallet, 
  DollarSign, 
  Building2, 
  ShieldCheck, 
  Receipt,
  ArrowRight,
  Smartphone,
  KeyRound,
  Copy,
  Check,
  MessageSquare,
  AlertTriangle,
  UserCheck,
  UserX,
  Lock
} from 'lucide-react';
import { formatINR, formatDate, apiRequest } from '../utils';

export default function UnifiedCustomerProfileModal({ 
  customerId, 
  isOpen, 
  onClose,
  onOpenFD,
  onOpenRD,
  onOpenMIS,
  onOpenSavings
}) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('OVERVIEW'); // 'OVERVIEW' | 'FD' | 'RD' | 'MIS' | 'SAVINGS'

  const fetchPortfolio = async () => {
    if (!customerId) return;
    try {
      setLoading(true);
      const res = await apiRequest(`/customers/${customerId}/portfolio`);
      if (res.success) {
        setData(res);
      }
    } catch (e) {
      console.error('Error fetching customer portfolio:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen && customerId) {
      fetchPortfolio();
    }
  }, [isOpen, customerId]);

  const currentUser = (() => {
    try {
      return JSON.parse(localStorage.getItem('pralaad_fd_user'));
    } catch {
      return null;
    }
  })();
  const isSuperAdmin = currentUser?.role === 'admin';

  // App Access Management States
  const [actionLoading, setActionLoading] = useState(false);
  const [actionFeedback, setActionFeedback] = useState(null);
  const [showCredentialsPopup, setShowCredentialsPopup] = useState(null);
  const [showResetModal, setShowResetModal] = useState(false);
  const [resetNewPass, setResetNewPass] = useState('');
  const [copied, setCopied] = useState(false);

  // 1. Super Admin Create App Login
  const handleSuperAdminCreateApp = async (accessType = 'PERMANENT') => {
    try {
      setActionLoading(true);
      const res = await apiRequest('/users/customer', {
        method: 'POST',
        body: JSON.stringify({
          customer_id: customerId,
          login_id: data.customer.login_id || data.customer.customer_code,
          access_type: accessType
        })
      });
      setShowCredentialsPopup({
        customer: res.customer,
        temp_password: res.temp_password
      });
      setActionFeedback({ text: res.message, type: 'success' });
      fetchPortfolio();
    } catch (err) {
      alert(err.message || 'Failed to create App Login');
    } finally {
      setActionLoading(false);
    }
  };

  const handleRenewTemporaryAccess = async () => {
    try {
      setActionLoading(true);
      const res = await apiRequest(`/users/customer/${customerId}/renew-temporary`, { method: 'POST' });
      setActionFeedback({ text: res.message, type: 'success' });
      fetchPortfolio();
    } catch (err) {
      alert(err.message || 'Failed to renew temporary access');
    } finally {
      setActionLoading(false);
    }
  };

  // 2. Staff Request App Access (Goes to Approvals Queue)
  const handleStaffRequestApp = async () => {
    try {
      setActionLoading(true);
      const res = await apiRequest('/approvals', {
        method: 'POST',
        body: JSON.stringify({
          request_type: 'CUSTOMER_APP_ACCESS',
          customer_id: customerId,
          proposed_amount: 0,
          request_data: {
            customerId: customerId,
            customer_code: data.customer.customer_code,
            full_name: data.customer.full_name,
            phone: data.customer.phone,
            login_id: data.customer.customer_code
          },
          remarks: `Staff ${currentUser?.username || 'maker'} requested mobile app access for ${data.customer.full_name}`
        })
      });
      setActionFeedback({ text: 'Customer App Access request submitted to Super Admin for approval.', type: 'success' });
      fetchPortfolio();
    } catch (err) {
      alert(err.message || 'Failed to submit request');
    } finally {
      setActionLoading(false);
    }
  };

  // 3. Super Admin Toggle Access
  const handleToggleAccess = async () => {
    try {
      setActionLoading(true);
      const res = await apiRequest(`/users/customer/${customerId}/toggle`, { method: 'PATCH' });
      setActionFeedback({ text: res.message, type: 'success' });
      fetchPortfolio();
    } catch (err) {
      alert(err.message);
    } finally {
      setActionLoading(false);
    }
  };

  // 4. Reset Password
  const handleResetPassword = async (e) => {
    e.preventDefault();
    try {
      setActionLoading(true);
      const res = await apiRequest(`/users/customer/${customerId}/reset-password`, {
        method: 'POST',
        body: JSON.stringify({ new_password: resetNewPass })
      });
      setShowResetModal(false);
      setResetNewPass('');
      setShowCredentialsPopup({
        customer: data.customer,
        temp_password: res.temp_password
      });
      setActionFeedback({ text: res.message, type: 'success' });
      fetchPortfolio();
    } catch (err) {
      alert(err.message);
    } finally {
      setActionLoading(false);
    }
  };

  const handleShareWhatsApp = (password) => {
    let cleanPhone = data.customer.phone ? data.customer.phone.replace(/[^0-9]/g, '') : '';
    if (cleanPhone.length === 10) cleanPhone = '91' + cleanPhone;

    const passPart = password ? `\n🔑 Temporary Password: ${password}` : '';
    const msg = `नमस्ते ${data.customer.full_name} जी! 🙏\n\nआपके Multi-Product Fixed Deposit मोबाइल ऐप क्रेडेंशियल्स:\n\n👤 Login ID: ${data.customer.login_id || data.customer.customer_code}${passPart}\n\n📱 ऐप ओपन करें और अपनी सभी FDs और ब्याज पेआउट लाइव देखें: http://localhost:5000\n\nधन्यवाद,\nWealth & Deposit Management Desk`;
    window.open(`https://wa.me/${cleanPhone}?text=${encodeURIComponent(msg)}`, '_blank');
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-5xl w-full p-6 relative my-8 flex flex-col max-h-[92vh] animate-fadeIn">
        
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-slate-900 text-white font-bold flex items-center justify-center text-lg shadow-xs">
              {data?.customer?.full_name?.split(' ').map(n=>n[0]).join('') || 'CU'}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold text-slate-900">
                  {data?.customer?.full_name || 'Customer Profile'}
                </h2>
                <span className="text-xs font-mono font-bold bg-slate-100 text-slate-700 px-2 py-0.5 rounded">
                  {data?.customer?.customer_code}
                </span>
                <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200 flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3" /> KYC Verified
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                {data?.customer?.phone} • {data?.customer?.email || 'No email registered'} • PAN: {data?.customer?.pan_card}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {loading || !data ? (
          <div className="py-20 text-center text-slate-400">
            <RotateCw className="w-8 h-8 animate-spin mx-auto text-slate-600 mb-2" />
            <p className="text-xs font-medium">Aggregating Customer 360 Multi-Product Portfolio...</p>
          </div>
        ) : (
          <div className="py-4 overflow-y-auto flex-1 space-y-5">
            
            {/* 1. Aggregate Financial Strip */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="p-3.5 bg-slate-900 text-white rounded-xl shadow-xs">
                <span className="text-slate-300 block text-[11px] font-medium">Total Net Worth Deposited</span>
                <span className="text-xl font-black mt-1 block tracking-tight">
                  {formatINR(data.summary?.totalDeposits)}
                </span>
                <span className="text-[10px] text-slate-400 mt-0.5 block">Across 4 Products</span>
              </div>

              <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl">
                <span className="text-slate-500 block text-[11px] font-medium">Active Accounts</span>
                <span className="text-xl font-bold text-slate-900 mt-1 block tracking-tight">
                  {data.summary?.totalAccounts}
                </span>
                <span className="text-[10px] text-slate-400 mt-0.5 block">FD, RD, MIS & Savings</span>
              </div>

              <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl">
                <span className="text-slate-500 block text-[11px] font-medium">Accrued Interest / Yield</span>
                <span className="text-xl font-bold text-emerald-700 mt-1 block tracking-tight">
                  {formatINR(data.summary?.totalInterest)}
                </span>
                <span className="text-[10px] text-slate-400 mt-0.5 block">Earnings to date</span>
              </div>

              <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl">
                <span className="text-slate-500 block text-[11px] font-medium">Savings Account Balance</span>
                <span className="text-xl font-bold text-blue-700 mt-1 block tracking-tight">
                  {formatINR(data.summary?.productBreakdown?.savings?.currentBalance || 0)}
                </span>
                <span className="text-[10px] text-slate-400 mt-0.5 block">Liquid Available</span>
              </div>
            </div>

            {/* 2. Product Tabs */}
            <div className="flex items-center gap-1 border-b border-slate-200 pb-2">
              {[
                { id: 'OVERVIEW', label: 'Customer Overview' },
                { id: 'FD', label: `Fixed Deposits (${data.portfolio?.fds?.length || 0})` },
                { id: 'RD', label: `Recurring Deposits (${data.portfolio?.rds?.length || 0})` },
                { id: 'MIS', label: `Monthly Income (${data.portfolio?.mis?.length || 0})` },
                { id: 'SAVINGS', label: `Savings A/c (${data.portfolio?.savings?.length || 0})` }
              ].map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer ${
                    activeTab === tab.id 
                      ? 'bg-slate-900 text-white' 
                      : 'text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {/* 3. Tab Contents */}
            {activeTab === 'OVERVIEW' && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
                  <h3 className="font-bold text-slate-900 uppercase tracking-wider text-[11px] mb-2">Personal & KYC Details</h3>
                  <div className="flex justify-between"><span className="text-slate-400">Full Name</span><span className="font-semibold text-slate-800">{data.customer.full_name}</span></div>
                  <div className="flex justify-between"><span className="text-slate-400">Phone</span><span className="font-semibold text-slate-800">{data.customer.phone}</span></div>
                  <div className="flex justify-between"><span className="text-slate-400">Email</span><span className="font-semibold text-slate-800">{data.customer.email || 'N/A'}</span></div>
                  <div className="flex justify-between"><span className="text-slate-400">PAN Card</span><span className="font-mono font-semibold text-slate-800">{data.customer.pan_card}</span></div>
                  <div className="flex justify-between"><span className="text-slate-400">Aadhaar No</span><span className="font-mono font-semibold text-slate-800">{data.customer.aadhaar_no || 'N/A'}</span></div>
                  <div className="flex justify-between"><span className="text-slate-400">Address</span><span className="font-semibold text-slate-800 truncate max-w-xs">{data.customer.address}</span></div>
                </div>

                <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
                  <h3 className="font-bold text-slate-900 uppercase tracking-wider text-[11px] mb-2">Bank & Nominee Mandate</h3>
                  <div className="flex justify-between"><span className="text-slate-400">Bank Name</span><span className="font-semibold text-slate-800">{data.customer.bank_name || 'N/A'}</span></div>
                  <div className="flex justify-between"><span className="text-slate-400">Account No</span><span className="font-mono font-semibold text-slate-800">{data.customer.account_no || 'N/A'}</span></div>
                  <div className="flex justify-between"><span className="text-slate-400">IFSC Code</span><span className="font-mono font-semibold text-slate-800">{data.customer.ifsc_code || 'N/A'}</span></div>
                  <div className="flex justify-between"><span className="text-slate-400">Nominee Name</span><span className="font-semibold text-slate-800">{data.customer.nominee_name || 'N/A'}</span></div>
                  <div className="flex justify-between"><span className="text-slate-400">Nominee Relation</span><span className="font-semibold text-slate-800">{data.customer.nominee_relation || 'N/A'}</span></div>
                  <div className="flex justify-between"><span className="text-slate-400">Senior Citizen Status</span><span className="font-semibold text-slate-800">{data.customer.is_senior_citizen === 1 ? 'YES (+0.50% Yield)' : 'NO'}</span></div>
                </div>

                {/* DEDICATED SECTION: CUSTOMER MOBILE APP ACCESS */}
                <div className="md:col-span-2 p-5 bg-gradient-to-br from-indigo-50/60 via-white to-slate-50 rounded-2xl border border-indigo-200 shadow-xs space-y-4">
                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 pb-3 border-b border-indigo-100">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-xl bg-indigo-600 text-white flex items-center justify-center shadow-xs">
                        <Smartphone className="w-4 h-4" />
                      </div>
                      <div>
                        <h3 className="font-bold text-slate-900 text-sm">Customer Mobile App Access</h3>
                        <p className="text-[11px] text-slate-500">External depositor credentials and digital passbook controls</p>
                      </div>
                    </div>

                    {/* App Status Badge */}
                    <div className="flex items-center gap-2">
                      <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold ${
                        data.customer.app_access_status === 'ACTIVE'
                          ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                          : data.customer.app_access_status === 'PENDING FIRST LOGIN'
                          ? 'bg-sky-100 text-sky-800 border border-sky-300'
                          : data.customer.app_access_status === 'PENDING'
                          ? 'bg-amber-100 text-amber-800 border border-amber-300 animate-pulse'
                          : data.customer.app_access_status === 'EXPIRED'
                          ? 'bg-rose-100 text-rose-800 border border-rose-300 font-black'
                          : data.customer.app_access_status === 'SUSPENDED'
                          ? 'bg-rose-100 text-rose-800 border border-rose-300'
                          : 'bg-slate-100 text-slate-600 border border-slate-300'
                      }`}>
                        <span className={`w-2 h-2 rounded-full ${
                          data.customer.app_access_status === 'ACTIVE' ? 'bg-emerald-500' :
                          data.customer.app_access_status === 'PENDING FIRST LOGIN' ? 'bg-sky-500' :
                          data.customer.app_access_status === 'PENDING' ? 'bg-amber-500' :
                          data.customer.app_access_status === 'EXPIRED' ? 'bg-rose-600' :
                          data.customer.app_access_status === 'SUSPENDED' ? 'bg-rose-500' : 'bg-slate-400'
                        }`}></span>
                        Status: {
                          data.customer.app_access_status === 'ACTIVE' 
                            ? (data.customer.access_type === 'TEMPORARY' ? 'Active (48H Temporary)' : 'Active (Permanent)') :
                          data.customer.app_access_status === 'PENDING FIRST LOGIN' ? 'Pending 1st Login' :
                          data.customer.app_access_status === 'PENDING' ? 'Pending Approval' :
                          data.customer.app_access_status === 'EXPIRED' ? 'Access Expired' :
                          data.customer.app_access_status === 'SUSPENDED' ? 'Suspended' : 'Not Created'
                        }
                      </span>
                    </div>
                  </div>

                  {actionFeedback && (
                    <div className="p-2.5 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold rounded-xl flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                      <span>{actionFeedback.text}</span>
                    </div>
                  )}

                  {/* Access Parameters Grid */}
                  <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 bg-white p-3.5 rounded-xl border border-slate-200 text-xs">
                    <div>
                      <span className="text-slate-400 block text-[10px] uppercase font-bold">Customer ID</span>
                      <span className="font-mono font-bold text-indigo-700 text-sm mt-0.5 block">{data.customer.customer_code}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[10px] uppercase font-bold">App Login ID</span>
                      <span className="font-mono font-bold text-slate-800 text-sm mt-0.5 block">
                        {data.customer.login_id || data.customer.customer_code}
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[10px] uppercase font-bold">Access Policy</span>
                      <span className={`inline-flex items-center gap-1 font-bold text-xs mt-1 ${
                        data.customer.access_type === 'TEMPORARY' ? 'text-amber-800' : 'text-indigo-800'
                      }`}>
                        {data.customer.access_type === 'TEMPORARY' ? (
                          <><Clock className="w-3.5 h-3.5 text-amber-600" /> 48-Hour Temporary</>
                        ) : (
                          <><ShieldCheck className="w-3.5 h-3.5 text-indigo-600" /> Permanent Access</>
                        )}
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[10px] uppercase font-bold">Validity / Expiry</span>
                      <span className="font-medium text-slate-700 text-xs mt-0.5 block">
                        {data.customer.access_type === 'TEMPORARY' ? (
                          data.customer.app_access_status === 'PENDING FIRST LOGIN' ? (
                            <span className="text-sky-700 font-bold">48h (Starts on 1st login)</span>
                          ) : data.customer.app_access_status === 'EXPIRED' ? (
                            <span className="text-rose-700 font-bold">Expired</span>
                          ) : data.customer.expires_at ? (
                            <span className="text-emerald-700 font-bold">{formatDate(data.customer.expires_at)}</span>
                          ) : '48 Hours'
                        ) : (
                          <span className="text-slate-500 font-semibold">Continuous Lifetime</span>
                        )}
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[10px] uppercase font-bold">Last App Login</span>
                      <span className="font-medium text-slate-600 text-xs mt-0.5 block">
                        {data.customer.last_login_at ? formatDate(data.customer.last_login_at) : 'Never logged in'}
                      </span>
                    </div>
                  </div>

                  {/* Actions Strip */}
                  <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-indigo-100">
                    <div className="text-[11px] text-slate-500">
                      {isSuperAdmin ? (
                        <span>Dual Custody: <b>Super Admin Direct Activation (Permanent & 48H Temp)</b> enabled</span>
                      ) : (
                        <span>Maker Mode: <b>App requests require Super Admin Checker verification</b></span>
                      )}
                    </div>

                    <div className="flex items-center gap-2 flex-wrap">
                      {/* Super Admin Direct Controls */}
                      {isSuperAdmin ? (
                        <>
                          {data.customer.app_access_status !== 'ACTIVE' && data.customer.app_access_status !== 'PENDING FIRST LOGIN' ? (
                            <div className="flex items-center gap-2">
                              <button
                                type="button"
                                id="profile-create-perm-btn"
                                disabled={actionLoading}
                                onClick={() => handleSuperAdminCreateApp('PERMANENT')}
                                className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs flex items-center gap-1.5 shadow-sm transition cursor-pointer disabled:opacity-50"
                              >
                                <ShieldCheck className="w-3.5 h-3.5" />
                                Create Permanent Access
                              </button>
                              <button
                                type="button"
                                id="profile-create-temp-btn"
                                disabled={actionLoading}
                                onClick={() => handleSuperAdminCreateApp('TEMPORARY')}
                                className="px-3.5 py-1.5 bg-amber-600 hover:bg-amber-700 text-white font-bold rounded-xl text-xs flex items-center gap-1.5 shadow-sm transition cursor-pointer disabled:opacity-50"
                              >
                                <Clock className="w-3.5 h-3.5" />
                                Create 48H Temp Access
                              </button>
                            </div>
                          ) : (
                            <>
                              {data.customer.access_type === 'TEMPORARY' && (
                                <button
                                  type="button"
                                  id="profile-renew-temp-btn"
                                  disabled={actionLoading}
                                  onClick={handleRenewTemporaryAccess}
                                  className="px-3 py-1.5 bg-amber-50 hover:bg-amber-100 text-amber-800 font-bold rounded-xl text-xs flex items-center gap-1.5 border border-amber-300 transition cursor-pointer shadow-xs"
                                  title="Renew 48-Hour Temporary Access"
                                >
                                  <RefreshCw className="w-3.5 h-3.5 text-amber-600" />
                                  Renew 48 Hours
                                </button>
                              )}

                              <button
                                type="button"
                                disabled={actionLoading}
                                onClick={() => setShowResetModal(true)}
                                className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs flex items-center gap-1.5 border border-slate-300 transition cursor-pointer"
                              >
                                <KeyRound className="w-3.5 h-3.5 text-slate-500" />
                                Reset Password
                              </button>

                              <button
                                type="button"
                                onClick={() => handleShareWhatsApp()}
                                className="px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 font-bold rounded-xl text-xs flex items-center gap-1.5 border border-emerald-200 transition cursor-pointer"
                              >
                                <MessageSquare className="w-3.5 h-3.5 text-emerald-600" />
                                Resend Login Instructions
                              </button>

                              <button
                                type="button"
                                disabled={actionLoading}
                                onClick={handleToggleAccess}
                                className={`px-3 py-1.5 font-bold rounded-xl text-xs flex items-center gap-1.5 border transition cursor-pointer ${
                                  data.customer.app_access_enabled === 1
                                    ? 'text-rose-700 bg-rose-50 border-rose-200 hover:bg-rose-100'
                                    : 'text-emerald-700 bg-emerald-50 border-emerald-200 hover:bg-emerald-100'
                                }`}
                              >
                                {data.customer.app_access_enabled === 1 ? <UserX className="w-3.5 h-3.5" /> : <UserCheck className="w-3.5 h-3.5" />}
                                {data.customer.app_access_enabled === 1 ? 'Deactivate Access' : 'Activate Access'}
                              </button>
                            </>
                          )}
                        </>
                      ) : (
                        /* Staff Workflow Controls */
                        <>
                          {data.customer.app_access_status === 'NOT_CREATED' && (
                            <button
                              type="button"
                              disabled={actionLoading}
                              onClick={handleStaffRequestApp}
                              className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl text-xs flex items-center gap-1.5 shadow-sm transition cursor-pointer disabled:opacity-50"
                            >
                              <Smartphone className="w-3.5 h-3.5" />
                              Request App Access (Send to Admin)
                            </button>
                          )}

                          {data.customer.app_access_status === 'PENDING' && (
                            <span className="text-amber-800 bg-amber-50 border border-amber-200 px-3 py-1.5 rounded-xl font-bold text-xs flex items-center gap-1.5">
                              <Clock className="w-3.5 h-3.5 text-amber-600" />
                              App Access Request Pending with Admin
                            </span>
                          )}

                          {data.customer.app_access_status === 'ACTIVE' && (
                            <button
                              type="button"
                              onClick={() => handleShareWhatsApp()}
                              className="px-3.5 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 font-bold rounded-xl text-xs flex items-center gap-1.5 border border-emerald-200 transition cursor-pointer"
                            >
                              <MessageSquare className="w-3.5 h-3.5 text-emerald-600" />
                              Resend Login Instructions
                            </button>
                          )}
                        </>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'FD' && (
              <div className="border border-slate-200 rounded-xl overflow-hidden">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold">
                    <tr>
                      <th className="py-2.5 px-3">FD Number</th>
                      <th className="py-2.5 px-3 text-right">Principal</th>
                      <th className="py-2.5 px-3 text-center">Rate</th>
                      <th className="py-2.5 px-3 text-center">Tenure</th>
                      <th className="py-2.5 px-3 text-right">Maturity Value</th>
                      <th className="py-2.5 px-3">Maturity Date</th>
                      <th className="py-2.5 px-3 text-center">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {data.portfolio?.fds?.map(f => (
                      <tr key={f.id} className="hover:bg-slate-50">
                        <td className="py-2.5 px-3 font-mono font-bold text-slate-900">{f.fd_number}</td>
                        <td className="py-2.5 px-3 text-right font-bold text-slate-800">{formatINR(f.principal_amount)}</td>
                        <td className="py-2.5 px-3 text-center text-slate-700">{f.annual_rate}%</td>
                        <td className="py-2.5 px-3 text-center text-slate-600">{f.tenure_months} M</td>
                        <td className="py-2.5 px-3 text-right font-black text-slate-900">{formatINR(f.maturity_amount)}</td>
                        <td className="py-2.5 px-3 text-slate-600">{formatDate(f.maturity_date)}</td>
                        <td className="py-2.5 px-3 text-center">
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            f.status === 'ACTIVE' ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-700'
                          }`}>
                            {f.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {activeTab === 'RD' && (
              <div className="border border-slate-200 rounded-xl overflow-hidden">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold">
                    <tr>
                      <th className="py-2.5 px-3">RD Number</th>
                      <th className="py-2.5 px-3 text-right">Monthly Deposit</th>
                      <th className="py-2.5 px-3 text-center">Paid / Total</th>
                      <th className="py-2.5 px-3 text-right">Deposited to Date</th>
                      <th className="py-2.5 px-3 text-right">Maturity Amount</th>
                      <th className="py-2.5 px-3 text-center">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {data.portfolio?.rds?.map(r => (
                      <tr key={r.id} className="hover:bg-slate-50">
                        <td className="py-2.5 px-3 font-mono font-bold text-slate-900">{r.rd_number}</td>
                        <td className="py-2.5 px-3 text-right font-bold text-slate-800">{formatINR(r.monthly_installment)}</td>
                        <td className="py-2.5 px-3 text-center font-semibold text-teal-700">{r.installments_paid} / {r.tenure_months} M</td>
                        <td className="py-2.5 px-3 text-right font-bold text-slate-900">{formatINR(r.amount_deposited)}</td>
                        <td className="py-2.5 px-3 text-right font-black text-slate-900">{formatINR(r.maturity_amount)}</td>
                        <td className="py-2.5 px-3 text-center">
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-teal-50 text-teal-700">
                            {r.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {activeTab === 'MIS' && (
              <div className="border border-slate-200 rounded-xl overflow-hidden">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold">
                    <tr>
                      <th className="py-2.5 px-3">MIS Number</th>
                      <th className="py-2.5 px-3 text-right">Deposit Amount</th>
                      <th className="py-2.5 px-3 text-center">Tenure</th>
                      <th className="py-2.5 px-3 text-right">Monthly Payout</th>
                      <th className="py-2.5 px-3 text-right">Maturity Return</th>
                      <th className="py-2.5 px-3 text-center">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {data.portfolio?.mis?.map(m => (
                      <tr key={m.id} className="hover:bg-slate-50">
                        <td className="py-2.5 px-3 font-mono font-bold text-slate-900">{m.mis_number}</td>
                        <td className="py-2.5 px-3 text-right font-bold text-slate-800">{formatINR(m.deposit_amount)}</td>
                        <td className="py-2.5 px-3 text-center text-slate-600">{m.tenure_months} M</td>
                        <td className="py-2.5 px-3 text-right font-bold text-emerald-700">{formatINR(m.monthly_payout)}/mo</td>
                        <td className="py-2.5 px-3 text-right font-black text-blue-700">{formatINR(m.deposit_amount)}</td>
                        <td className="py-2.5 px-3 text-center">
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-50 text-blue-700">
                            {m.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {activeTab === 'SAVINGS' && (
              <div className="border border-slate-200 rounded-xl overflow-hidden">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold">
                    <tr>
                      <th className="py-2.5 px-3">Account Number</th>
                      <th className="py-2.5 px-3 text-right">Current Ledger Balance</th>
                      <th className="py-2.5 px-3 text-right">Min Balance</th>
                      <th className="py-2.5 px-3 text-center">Annual Interest Rate</th>
                      <th className="py-2.5 px-3 text-center">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {data.portfolio?.savings?.map(s => (
                      <tr key={s.id} className="hover:bg-slate-50">
                        <td className="py-2.5 px-3 font-mono font-bold text-slate-900">{s.account_number}</td>
                        <td className="py-2.5 px-3 text-right font-black text-slate-900">{formatINR(s.current_balance)}</td>
                        <td className="py-2.5 px-3 text-right text-slate-600">{formatINR(s.minimum_balance)}</td>
                        <td className="py-2.5 px-3 text-center font-bold text-emerald-700">{s.annual_interest_rate}% p.a.</td>
                        <td className="py-2.5 px-3 text-center">
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700">
                            {s.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

          </div>
        )}

        {/* Credentials Created Popup */}
        {showCredentialsPopup && (
          <div className="fixed inset-0 z-60 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl max-w-sm w-full p-6 shadow-2xl border border-slate-200 animate-fadeIn">
              <div className="flex justify-between items-center mb-3">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-600 flex items-center justify-center">
                    <CheckCircle2 className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-900 text-sm">App Login Activated</h3>
                    <p className="text-[10px] text-slate-500">Credentials generated</p>
                  </div>
                </div>
                <button onClick={() => setShowCredentialsPopup(null)} className="text-slate-400 hover:text-slate-600 p-1 cursor-pointer">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="p-3.5 bg-slate-900 text-white rounded-xl space-y-2.5 font-mono text-xs my-3 shadow-inner">
                <div className="flex justify-between border-b border-slate-800 pb-1.5">
                  <span className="text-slate-400 font-sans">Depositor:</span>
                  <span className="font-bold font-sans text-white">{showCredentialsPopup.customer?.full_name}</span>
                </div>
                <div className="flex justify-between border-b border-slate-800 pb-1.5">
                  <span className="text-slate-400 font-sans">Login ID:</span>
                  <span className="font-bold text-emerald-300">{showCredentialsPopup.customer?.login_id || showCredentialsPopup.customer?.customer_code}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-400 font-sans">Temporary Pass:</span>
                  <span className="font-bold text-amber-300 text-sm">{showCredentialsPopup.temp_password}</span>
                </div>
              </div>

              <p className="text-[10px] text-slate-500 mb-3 leading-relaxed">
                ⚠️ Temporary password requires depositor to select their own personal password on first login.
              </p>

              <div className="grid grid-cols-2 gap-2 text-xs">
                <button
                  type="button"
                  onClick={() => {
                    const text = `Depositor: ${showCredentialsPopup.customer?.full_name}\nLogin ID: ${showCredentialsPopup.customer?.login_id || showCredentialsPopup.customer?.customer_code}\nTemp Password: ${showCredentialsPopup.temp_password}\nApp URL: http://localhost:5000`;
                    navigator.clipboard.writeText(text);
                    setCopied(true);
                    setTimeout(() => setCopied(false), 2000);
                  }}
                  className="py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold rounded-xl transition cursor-pointer flex items-center justify-center gap-1"
                >
                  {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                  {copied ? 'Copied!' : 'Copy'}
                </button>

                <button
                  type="button"
                  onClick={() => handleShareWhatsApp(showCredentialsPopup.temp_password)}
                  className="py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl transition cursor-pointer flex items-center justify-center gap-1 shadow-md"
                >
                  <MessageSquare className="w-3.5 h-3.5" />
                  WhatsApp
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Reset Password Modal */}
        {showResetModal && (
          <div className="fixed inset-0 z-60 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl max-w-sm w-full p-5 shadow-2xl border border-slate-200 animate-fadeIn">
              <div className="flex justify-between items-center mb-3 pb-2 border-b border-slate-100">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-indigo-100 text-indigo-600 flex items-center justify-center">
                    <KeyRound className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-900 text-sm">Reset Customer App Password</h3>
                    <p className="text-[10px] text-slate-500">Super Admin Override</p>
                  </div>
                </div>
                <button onClick={() => setShowResetModal(false)} className="text-slate-400 hover:text-slate-600 p-1 cursor-pointer">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleResetPassword} className="space-y-3.5 text-xs">
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                  <div className="font-bold text-slate-900">{data.customer.full_name}</div>
                  <div className="text-[10px] text-slate-500 font-mono">ID: {data.customer.login_id || data.customer.customer_code} • {data.customer.phone}</div>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">New Temporary Password (Auto if blank)</label>
                  <input
                    type="text"
                    value={resetNewPass}
                    onChange={(e) => setResetNewPass(e.target.value)}
                    placeholder="Leave empty to auto-generate"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-mono text-xs focus:bg-white focus:ring-2 focus:ring-indigo-600"
                  />
                </div>

                <div className="flex justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowResetModal(false)}
                    className="px-3 py-1.5 font-semibold text-slate-600 hover:bg-slate-100 rounded-xl cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={actionLoading}
                    className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl shadow-md transition cursor-pointer disabled:opacity-50"
                  >
                    {actionLoading ? 'Updating...' : 'Set & Issue'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
