import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
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
  Lock,
  PlusCircle,
  XCircle,
  ArrowDownCircle,
  ArrowUpCircle,
  Sparkles,
  RefreshCw,
  Edit3
} from 'lucide-react';
import { formatINR, formatDate, apiRequest } from '../utils';

export default function UnifiedCustomerProfileModal({ 
  customerId, 
  isOpen, 
  onClose,
  onOpenFD,
  onOpenRD,
  onOpenMIS,
  onOpenSavings,
  onPrematureClose,
  onRenewFD,
  onPrintCertificate,
  onNavigate,
  refreshTrigger
}) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('OVERVIEW'); // 'OVERVIEW' | 'FD' | 'RD' | 'MIS' | 'SAVINGS'

  // Quick Action & Service Lifecycle States
  const [savingsModal, setSavingsModal] = useState({
    open: false,
    account: null,
    type: 'DEPOSIT', // 'DEPOSIT' | 'WITHDRAWAL'
    amount: '',
    payment_mode: 'CASH',
    reference_number: '',
    narration: '',
    loading: false
  });

  const [rdInstallModal, setRdInstallModal] = useState({
    open: false,
    rd: null,
    installment: null,
    lateFee: 0,
    paymentMode: 'CASH',
    transactionRef: '',
    loading: false
  });

  const [closeServiceModal, setCloseServiceModal] = useState({
    open: false,
    type: null, // 'RD' | 'MIS' | 'SAVINGS'
    item: null,
    remarks: '',
    loading: false
  });

  // Client Details Edit State
  const [editProfileOpen, setEditProfileOpen] = useState(false);
  const [editFormData, setEditFormData] = useState({});
  const [editSubmitting, setEditSubmitting] = useState(false);
  const [editError, setEditError] = useState('');

  const handleOpenEditProfile = () => {
    if (!data?.customer) return;
    setEditFormData({
      full_name: data.customer.full_name || '',
      phone: data.customer.phone || '',
      email: data.customer.email || '',
      father_name: data.customer.father_name || '',
      dob: data.customer.dob || '',
      address: data.customer.address || '',
      pan_card: data.customer.pan_card || '',
      aadhaar_no: data.customer.aadhaar_no || '',
      bank_name: data.customer.bank_name || '',
      account_no: data.customer.account_no || '',
      ifsc_code: data.customer.ifsc_code || '',
      nominee_name: data.customer.nominee_name || '',
      nominee_relation: data.customer.nominee_relation || ''
    });
    setEditError('');
    setEditProfileOpen(true);
  };

  const handleSaveProfile = async (e) => {
    e.preventDefault();
    if (!editFormData.full_name || !editFormData.phone) {
      setEditError('Customer Name and Phone number are required');
      return;
    }
    setEditSubmitting(true);
    setEditError('');
    try {
      const res = await apiRequest(`/customers/${data.customer.id}`, {
        method: 'PUT',
        body: JSON.stringify(editFormData)
      });
      if (res && res.success !== false) {
        if (res.makerApprovalRequired) {
          alert(res.message || 'कस्टमर प्रोफाइल में बदलाव Super Admin अप्रूवल के लिए सबमिट कर दिया गया है। Super Admin द्वारा अप्रूव होने के बाद ही यह लागू होगा।');
        }
        setEditProfileOpen(false);
        await fetchPortfolio();
      } else {
        setEditError(res?.message || 'Failed to update customer profile');
      }
    } catch (err) {
      setEditError(err.message || 'Failed to update customer profile');
    } finally {
      setEditSubmitting(false);
    }
  };

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
  }, [isOpen, customerId, refreshTrigger]);

  const handleOpenSavingsVoucher = (account, type = 'DEPOSIT') => {
    setSavingsModal({
      open: true,
      account,
      type,
      amount: '',
      payment_mode: 'CASH',
      reference_number: `VCH-${Date.now().toString().slice(-6)}`,
      narration: type === 'DEPOSIT' ? 'Cash/Bank Deposit' : 'Cash/Bank Withdrawal',
      loading: false
    });
  };

  const handleSavingsVoucherSubmit = async (e) => {
    e.preventDefault();
    const amt = parseFloat(savingsModal.amount);
    if (!amt || amt <= 0) return alert('Please enter a valid amount');
    if (savingsModal.type === 'WITHDRAWAL') {
      const remaining = savingsModal.account.current_balance - amt;
      if (remaining < savingsModal.account.minimum_balance) {
        return alert(`Cannot withdraw. Minimum balance of ${formatINR(savingsModal.account.minimum_balance)} must be maintained. Current balance is ${formatINR(savingsModal.account.current_balance)}.`);
      }
    }
    try {
      setSavingsModal(prev => ({ ...prev, loading: true }));
      const endpoint = savingsModal.type === 'DEPOSIT' 
        ? `/savings/${savingsModal.account.id}/deposit` 
        : `/savings/${savingsModal.account.id}/withdraw`;
      const res = await apiRequest(endpoint, {
        method: 'POST',
        body: JSON.stringify({
          amount: amt,
          payment_mode: savingsModal.payment_mode,
          reference_number: savingsModal.reference_number,
          narration: savingsModal.narration
        })
      });
      alert(res.message || 'Savings transaction successful');
      setSavingsModal({ open: false, account: null, type: 'DEPOSIT', amount: '', payment_mode: 'CASH', reference_number: '', narration: '', loading: false });
      fetchPortfolio();
    } catch (err) {
      alert('Transaction error: ' + err.message);
    } finally {
      setSavingsModal(prev => ({ ...prev, loading: false }));
    }
  };

  const handleOpenRDInstallment = async (rd) => {
    try {
      const res = await apiRequest(`/rd/${rd.id}/installments`);
      if (res.success && res.installments) {
        const pending = res.installments.find(i => i.status === 'PENDING');
        if (!pending) {
          return alert('All installments for this Recurring Deposit have already been paid.');
        }
        setRdInstallModal({
          open: true,
          rd,
          installment: pending,
          lateFee: 0,
          paymentMode: 'CASH',
          transactionRef: `COLL-RD-${Date.now().toString().slice(-6)}`,
          loading: false
        });
      } else {
        alert('Could not fetch installments for this RD');
      }
    } catch (e) {
      alert('Error fetching RD installments: ' + e.message);
    }
  };

  const handleCollectRDInstallmentSubmit = async (e) => {
    e.preventDefault();
    if (!rdInstallModal.rd || !rdInstallModal.installment) return;
    try {
      setRdInstallModal(prev => ({ ...prev, loading: true }));
      const res = await apiRequest(`/rd/${rdInstallModal.rd.id}/installments/${rdInstallModal.installment.id}/collect`, {
        method: 'POST',
        body: JSON.stringify({
          payment_mode: rdInstallModal.paymentMode,
          transaction_ref: rdInstallModal.transactionRef,
          late_fee: parseFloat(rdInstallModal.lateFee || 0)
        })
      });
      alert(res.message || 'RD installment collected successfully');
      setRdInstallModal({ open: false, rd: null, installment: null, lateFee: 0, paymentMode: 'CASH', transactionRef: '', loading: false });
      fetchPortfolio();
    } catch (e) {
      alert('Error collecting RD installment: ' + e.message);
    } finally {
      setRdInstallModal(prev => ({ ...prev, loading: false }));
    }
  };

  const handleConfirmClose = (type, item) => {
    setCloseServiceModal({
      open: true,
      type,
      item,
      remarks: '',
      loading: false
    });
  };

  const handleCloseServiceSubmit = async (e) => {
    e.preventDefault();
    const { type, item, remarks } = closeServiceModal;
    if (!type || !item) return;

    try {
      setCloseServiceModal(prev => ({ ...prev, loading: true }));
      let endpoint = '';
      if (type === 'RD') endpoint = `/rd/${item.id}/close`;
      else if (type === 'MIS') endpoint = `/mis/${item.id}/close`;
      else if (type === 'SAVINGS') endpoint = `/savings/${item.id}/close`;

      const res = await apiRequest(endpoint, {
        method: 'POST',
        body: JSON.stringify({ remarks })
      });
      alert(res.message || `${type} service closed successfully.`);
      setCloseServiceModal({ open: false, type: null, item: null, remarks: '', loading: false });
      fetchPortfolio();
    } catch (e) {
      alert(`Error closing ${type}: ` + e.message);
    } finally {
      setCloseServiceModal(prev => ({ ...prev, loading: false }));
    }
  };

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

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

  return createPortal(
    <div 
      className="fixed inset-0 z-[9999] bg-slate-950/80 backdrop-blur-sm flex justify-center items-center p-3 sm:p-6 overflow-hidden"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-5xl w-full max-h-[88vh] flex flex-col overflow-hidden animate-fadeIn relative">
        
        {/* Pinned Top Header */}
        <div className="shrink-0 px-4 sm:px-6 py-3.5 sm:py-4 border-b border-slate-200 bg-white flex items-center justify-between gap-3 shadow-xs z-10">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-12 h-12 rounded-xl bg-slate-900 text-white font-bold flex items-center justify-center text-lg shadow-xs shrink-0 tracking-wider">
              {data?.customer?.full_name?.split(' ').filter(Boolean).slice(0, 2).map(n=>n[0]).join('').toUpperCase() || 'CU'}
            </div>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-lg font-bold text-slate-900 truncate">
                  {data?.customer?.full_name || 'Customer Profile'}
                </h2>
                <span className="text-xs font-mono font-bold bg-slate-100 text-slate-700 px-2 py-0.5 rounded">
                  {data?.customer?.customer_code}
                </span>
                <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200 flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3" /> KYC Verified
                </span>
                <span className="text-[10px] font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded-full border border-blue-200">
                  📅 Member Since: {data?.customer?.created_at ? new Date(data.customer.created_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '2019'}
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5 truncate">
                {data?.customer?.phone} • {data?.customer?.email || 'No email registered'} • PAN: {data?.customer?.pan_card}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={handleOpenEditProfile}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold text-xs transition cursor-pointer active:scale-95 shadow-xs"
              title="Edit Client Name, Phone, Address & Bank Details"
            >
              <Edit3 className="w-3.5 h-3.5" />
              <span>Edit Profile (क्लाइंट एडिट करें)</span>
            </button>
            <button
              onClick={onClose}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-slate-100 hover:bg-rose-50 text-slate-700 hover:text-rose-600 border border-slate-300 hover:border-rose-200 rounded-xl font-bold text-xs transition cursor-pointer active:scale-95"
              title="Close"
            >
              <X className="w-4 h-4 stroke-[2.5]" />
              <span>Close</span>
            </button>
          </div>
        </div>

        {loading || !data ? (
          <div className="py-20 text-center text-slate-400">
            <RotateCw className="w-8 h-8 animate-spin mx-auto text-slate-600 mb-2" />
            <p className="text-xs font-medium">Aggregating Customer 360 Multi-Product Portfolio...</p>
          </div>
        ) : (
          <div className="p-4 sm:p-6 overflow-y-auto flex-1 space-y-5 min-h-0">
            
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
                  {data.summary?.activeAccounts ?? data.summary?.totalAccounts ?? 0}
                </span>
                <span className="text-[10px] text-slate-400 mt-0.5 block">
                  {(data.summary?.closedAccounts || 0) > 0 ? `(${data.summary.closedAccounts} Closed/Matured)` : 'FD, RD, MIS & Savings'}
                </span>
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
            <div className="flex items-center gap-1 border-b border-slate-200 pb-2 overflow-x-auto">
              {[
                { id: 'OVERVIEW', label: 'Overview & Services' },
                { id: 'FD', label: `Fixed Deposits (${data.portfolio?.fds?.length || 0})` },
                { id: 'RD', label: `Recurring Deposits (${data.portfolio?.rds?.length || 0})` },
                { id: 'MIS', label: `Monthly Income (${data.portfolio?.mis?.length || 0})` },
                { id: 'SAVINGS', label: `Savings A/c (${data.portfolio?.savings?.length || 0})` },
                { id: 'LOANS', label: `Loans (${(data.portfolio?.loans?.length || 0) + (data.portfolio?.goldLoans?.length || 0)})` }
              ].map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer whitespace-nowrap ${
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
                
                {/* SERVICES ACTIVE VS CLOSED SUMMARY MATRIX */}
                <div className="md:col-span-2 p-4 bg-white rounded-xl border border-slate-200 shadow-xs space-y-3">
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 border-b pb-2">
                    <div>
                      <h3 className="font-bold text-slate-900 text-xs uppercase tracking-wider">
                        Complete Services Portfolio (ली गई सभी सेवाएं & स्थिति)
                      </h3>
                      <p className="text-[11px] text-slate-500">
                        Total {data.summary?.totalAccounts} services subscribed • {data.summary?.activeAccounts || 0} Active • {data.summary?.closedAccounts || 0} Closed/Matured
                      </p>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-bold text-[10px]">
                        ✓ {data.summary?.activeAccounts || 0} Active
                      </span>
                      {(data.summary?.closedAccounts || 0) > 0 && (
                        <span className="px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-600 font-bold text-[10px]">
                          {data.summary?.closedAccounts} Closed
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5 text-xs">
                    {/* FD Card */}
                    <div className="p-3 bg-emerald-50/60 rounded-xl border border-emerald-200/80 flex flex-col justify-between hover:shadow-xs transition">
                      <div>
                        <div className="flex justify-between items-center mb-1">
                          <span className="font-bold text-emerald-950 text-xs">Fixed Deposit (FD)</span>
                          <span className="font-mono font-bold text-emerald-700">{data.summary?.productBreakdown?.fd?.count || 0}</span>
                        </div>
                        <div className="text-[11px] text-slate-600">
                          Active: <strong className="text-emerald-700">{data.summary?.productBreakdown?.fd?.active || 0}</strong> • Closed: <strong>{data.summary?.productBreakdown?.fd?.closed || 0}</strong>
                        </div>
                        <div className="font-bold text-slate-900 text-xs mt-1.5 font-mono">
                          {formatINR(data.summary?.productBreakdown?.fd?.activeDeposits || 0)}
                        </div>
                      </div>
                      <div className="mt-3 pt-2 border-t border-emerald-200/70 flex items-center justify-between gap-1">
                        <button
                          type="button"
                          onClick={() => onOpenFD && onOpenFD(data.customer)}
                          className="px-2 py-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg text-[10px] shadow-2xs transition cursor-pointer flex items-center gap-1 active:scale-95"
                          title="Book New Fixed Deposit"
                        >
                          <PlusCircle className="w-3 h-3" /> + Book FD
                        </button>
                        <button
                          type="button"
                          onClick={() => setActiveTab('FD')}
                          className="text-[10px] font-semibold text-slate-600 hover:text-slate-900 cursor-pointer"
                        >
                          Manage →
                        </button>
                      </div>
                    </div>

                    {/* RD Card */}
                    <div className="p-3 bg-teal-50/60 rounded-xl border border-teal-200/80 flex flex-col justify-between hover:shadow-xs transition">
                      <div>
                        <div className="flex justify-between items-center mb-1">
                          <span className="font-bold text-teal-950 text-xs">Recurring (RD)</span>
                          <span className="font-mono font-bold text-teal-700">{data.summary?.productBreakdown?.rd?.count || 0}</span>
                        </div>
                        <div className="text-[11px] text-slate-600">
                          Active: <strong className="text-teal-700">{data.summary?.productBreakdown?.rd?.active || 0}</strong> • Closed: <strong>{data.summary?.productBreakdown?.rd?.closed || 0}</strong>
                        </div>
                        <div className="font-bold text-slate-900 text-xs mt-1.5 font-mono">
                          {formatINR(data.summary?.productBreakdown?.rd?.activeDeposits || 0)}
                        </div>
                      </div>
                      <div className="mt-3 pt-2 border-t border-teal-200/70 flex items-center justify-between gap-1">
                        <button
                          type="button"
                          onClick={() => onOpenRD && onOpenRD(data.customer)}
                          className="px-2 py-1 bg-teal-600 hover:bg-teal-700 text-white font-bold rounded-lg text-[10px] shadow-2xs transition cursor-pointer flex items-center gap-1 active:scale-95"
                          title="Start New Recurring Deposit"
                        >
                          <PlusCircle className="w-3 h-3" /> + Start RD
                        </button>
                        <button
                          type="button"
                          onClick={() => setActiveTab('RD')}
                          className="text-[10px] font-semibold text-slate-600 hover:text-slate-900 cursor-pointer"
                        >
                          Manage →
                        </button>
                      </div>
                    </div>

                    {/* MIS Card */}
                    <div className="p-3 bg-blue-50/60 rounded-xl border border-blue-200/80 flex flex-col justify-between hover:shadow-xs transition">
                      <div>
                        <div className="flex justify-between items-center mb-1">
                          <span className="font-bold text-blue-950 text-xs">Monthly (MIS)</span>
                          <span className="font-mono font-bold text-blue-700">{data.summary?.productBreakdown?.mis?.count || 0}</span>
                        </div>
                        <div className="text-[11px] text-slate-600">
                          Active: <strong className="text-blue-700">{data.summary?.productBreakdown?.mis?.active || 0}</strong> • Closed: <strong>{data.summary?.productBreakdown?.mis?.closed || 0}</strong>
                        </div>
                        <div className="font-bold text-slate-900 text-xs mt-1.5 font-mono">
                          {formatINR(data.summary?.productBreakdown?.mis?.activeDeposits || 0)}
                        </div>
                      </div>
                      <div className="mt-3 pt-2 border-t border-blue-200/70 flex items-center justify-between gap-1">
                        <button
                          type="button"
                          onClick={() => onOpenMIS && onOpenMIS(data.customer)}
                          className="px-2 py-1 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg text-[10px] shadow-2xs transition cursor-pointer flex items-center gap-1 active:scale-95"
                          title="Open Monthly Income Scheme"
                        >
                          <PlusCircle className="w-3 h-3" /> + Start MIS
                        </button>
                        <button
                          type="button"
                          onClick={() => setActiveTab('MIS')}
                          className="text-[10px] font-semibold text-slate-600 hover:text-slate-900 cursor-pointer"
                        >
                          Manage →
                        </button>
                      </div>
                    </div>

                    {/* Savings Card */}
                    <div className="p-3 bg-amber-50/60 rounded-xl border border-amber-200/80 flex flex-col justify-between hover:shadow-xs transition">
                      <div>
                        <div className="flex justify-between items-center mb-1">
                          <span className="font-bold text-amber-950 text-xs">Savings Account</span>
                          <span className="font-mono font-bold text-amber-700">{data.summary?.productBreakdown?.savings?.count || 0}</span>
                        </div>
                        <div className="text-[11px] text-slate-600">
                          Status: {(data.summary?.productBreakdown?.savings?.count || 0) > 0 ? (
                            <strong className="text-emerald-700">ACTIVE</strong>
                          ) : (
                            <span className="text-slate-400 font-medium">Not Opened</span>
                          )}
                        </div>
                        <div className="font-bold text-slate-900 text-xs mt-1.5 font-mono">
                          {formatINR(data.summary?.productBreakdown?.savings?.currentBalance || 0)}
                        </div>
                      </div>
                      <div className="mt-3 pt-2 border-t border-amber-200/70 flex items-center justify-between gap-1">
                        <button
                          type="button"
                          onClick={() => {
                            const sb = data.portfolio?.savings?.[0];
                            if (sb) handleOpenSavingsVoucher(sb, 'DEPOSIT');
                            else if (onOpenSavings) onOpenSavings(data.customer);
                          }}
                          className="px-2 py-1 bg-amber-600 hover:bg-amber-700 text-white font-bold rounded-lg text-[10px] shadow-2xs transition cursor-pointer flex items-center gap-1 active:scale-95"
                          title="Deposit or Open Savings Account"
                        >
                          <PlusCircle className="w-3 h-3" /> + Deposit / SB
                        </button>
                        <button
                          type="button"
                          onClick={() => setActiveTab('SAVINGS')}
                          className="text-[10px] font-semibold text-slate-600 hover:text-slate-900 cursor-pointer"
                        >
                          Manage →
                        </button>
                      </div>
                    </div>

                    {/* Loans Card */}
                    <div className="p-3 bg-purple-50/60 rounded-xl border border-purple-200/80 flex flex-col justify-between hover:shadow-xs transition">
                      <div>
                        <div className="flex justify-between items-center mb-1">
                          <span className="font-bold text-purple-950 text-xs">Loans / Advances</span>
                          <span className="font-mono font-bold text-purple-700">{data.summary?.productBreakdown?.loans?.count || 0}</span>
                        </div>
                        <div className="text-[11px] text-slate-600">
                          Sanctioned: <strong className="text-purple-700">{formatINR(data.summary?.productBreakdown?.loans?.activeSanctioned || 0)}</strong>
                        </div>
                        <div className="text-[11px] text-slate-500 mt-1">
                          Gold, LAD & Business
                        </div>
                      </div>
                      <div className="mt-3 pt-2 border-t border-purple-200/70 flex items-center justify-between gap-1">
                        <button
                          type="button"
                          onClick={() => onNavigate ? onNavigate('loans') : setActiveTab('LOANS')}
                          className="px-2 py-1 bg-purple-600 hover:bg-purple-700 text-white font-bold rounded-lg text-[10px] shadow-2xs transition cursor-pointer flex items-center gap-1 active:scale-95"
                          title="Apply Loan Against Deposit or Gold Loan"
                        >
                          <PlusCircle className="w-3 h-3" /> + Loan
                        </button>
                        <button
                          type="button"
                          onClick={() => setActiveTab('LOANS')}
                          className="text-[10px] font-semibold text-slate-600 hover:text-slate-900 cursor-pointer"
                        >
                          View →
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
                  <div className="flex justify-between items-center mb-2 pb-1 border-b border-slate-200/60">
                    <h3 className="font-bold text-slate-900 uppercase tracking-wider text-[11px]">Personal & KYC Details</h3>
                    <button
                      type="button"
                      onClick={handleOpenEditProfile}
                      className="text-[11px] font-bold text-indigo-600 hover:text-indigo-800 flex items-center gap-1 cursor-pointer hover:underline"
                    >
                      <Edit3 className="w-3 h-3" /> Edit Details
                    </button>
                  </div>
                  <div className="flex justify-between"><span className="text-slate-400">Full Name</span><span className="font-semibold text-slate-800">{data.customer.full_name}</span></div>
                  <div className="flex justify-between"><span className="text-slate-400">Phone</span><span className="font-semibold text-slate-800">{data.customer.phone}</span></div>
                  <div className="flex justify-between"><span className="text-slate-400">Email</span><span className="font-semibold text-slate-800">{data.customer.email || 'N/A'}</span></div>
                  <div className="flex justify-between"><span className="text-slate-400">PAN Card</span><span className="font-mono font-semibold text-slate-800">{data.customer.pan_card}</span></div>
                  <div className="flex justify-between"><span className="text-slate-400">Aadhaar No</span><span className="font-mono font-semibold text-slate-800">{data.customer.aadhaar_no || 'N/A'}</span></div>
                  <div className="flex justify-between"><span className="text-slate-400">Address</span><span className="font-semibold text-slate-800 truncate max-w-xs">{data.customer.address}</span></div>
                </div>

                <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
                  <div className="flex justify-between items-center mb-2 pb-1 border-b border-slate-200/60">
                    <h3 className="font-bold text-slate-900 uppercase tracking-wider text-[11px]">Bank & Nominee Mandate</h3>
                    <button
                      type="button"
                      onClick={handleOpenEditProfile}
                      className="text-[11px] font-bold text-indigo-600 hover:text-indigo-800 flex items-center gap-1 cursor-pointer hover:underline"
                    >
                      <Edit3 className="w-3 h-3" /> Edit Bank
                    </button>
                  </div>
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
              <div className="space-y-3">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 bg-slate-50 p-3 rounded-xl border border-slate-200">
                  <div>
                    <h3 className="font-bold text-slate-900 text-xs uppercase tracking-wider">Fixed Deposits Portfolio ({data.portfolio?.fds?.length || 0})</h3>
                    <p className="text-[11px] text-slate-500">सावधि जमा रसीदें, नवीनीकरण एवं समय से पहले बंद करने के विकल्प</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => onOpenFD && onOpenFD(data.customer)}
                    className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs flex items-center gap-1.5 shadow-xs transition cursor-pointer active:scale-95 shrink-0"
                  >
                    <PlusCircle className="w-3.5 h-3.5" />
                    <span>+ Book New FD for {data.customer.full_name}</span>
                  </button>
                </div>

                <div className="border border-slate-200 rounded-xl overflow-x-auto">
                  <table className="w-full text-left text-xs whitespace-nowrap">
                    <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold">
                      <tr>
                        <th className="py-2.5 px-3">FD Number</th>
                        <th className="py-2.5 px-3 text-right">Principal</th>
                        <th className="py-2.5 px-3 text-center">Rate</th>
                        <th className="py-2.5 px-3 text-center">Tenure</th>
                        <th className="py-2.5 px-3 text-right">Maturity Value</th>
                        <th className="py-2.5 px-3">Maturity Date</th>
                        <th className="py-2.5 px-3 text-center">Status</th>
                        <th className="py-2.5 px-3 text-right">Actions (सेवा बंद / प्रबंधित करें)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {(!data.portfolio?.fds || data.portfolio?.fds?.length === 0) ? (
                        <tr>
                          <td colSpan={8} className="py-8 text-center text-slate-400">
                            No Fixed Deposits booked yet. Click "+ Book New FD" to create one.
                          </td>
                        </tr>
                      ) : (
                        data.portfolio.fds.map(f => (
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
                            <td className="py-2.5 px-3 text-right">
                              <div className="flex items-center gap-1.5 justify-end">
                                {f.status === 'ACTIVE' && (
                                  <>
                                    <button
                                      type="button"
                                      onClick={() => onPrematureClose && onPrematureClose(f)}
                                      className="px-2.5 py-1 bg-rose-50 hover:bg-rose-100 text-rose-700 font-bold rounded-lg text-[11px] border border-rose-200 transition cursor-pointer flex items-center gap-1 shadow-2xs active:scale-95"
                                      title="समय से पहले FD तुड़वाएं और खाता बंद करें"
                                    >
                                      <XCircle className="w-3 h-3 text-rose-600" />
                                      <span>Foreclose (प्री-क्लोज़)</span>
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => onPrintCertificate && onPrintCertificate(f.id)}
                                      className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-lg text-[11px] border border-slate-200 transition cursor-pointer flex items-center gap-1"
                                      title="Certificate"
                                    >
                                      <Receipt className="w-3 h-3 text-slate-500" />
                                      <span>Certificate</span>
                                    </button>
                                  </>
                                )}
                                {f.status === 'MATURED' && (
                                  <button
                                    type="button"
                                    onClick={() => onRenewFD && onRenewFD(f)}
                                    className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg text-[11px] transition cursor-pointer flex items-center gap-1 shadow-2xs"
                                    title="Renew FD"
                                  >
                                    <RotateCw className="w-3 h-3" />
                                    <span>Renew (नवीनीकरण)</span>
                                  </button>
                                )}
                                {f.status === 'CLOSED_PREMATURE' && (
                                  <span className="text-[11px] font-semibold text-rose-600 bg-rose-50 px-2 py-0.5 rounded border border-rose-200">
                                    Closed Prematurely
                                  </span>
                                )}
                              </div>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {activeTab === 'RD' && (
              <div className="space-y-3">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 bg-slate-50 p-3 rounded-xl border border-slate-200">
                  <div>
                    <h3 className="font-bold text-slate-900 text-xs uppercase tracking-wider">Recurring Deposits (RD) Portfolio ({data.portfolio?.rds?.length || 0})</h3>
                    <p className="text-[11px] text-slate-500">मासिक किस्त जमा, पासबुक एवं खाता बंद/फॉरक्लोजर विकल्प</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => onOpenRD && onOpenRD(data.customer)}
                    className="px-3 py-1.5 bg-teal-600 hover:bg-teal-700 text-white font-bold rounded-xl text-xs flex items-center gap-1.5 shadow-xs transition cursor-pointer active:scale-95 shrink-0"
                  >
                    <PlusCircle className="w-3.5 h-3.5" />
                    <span>+ Start New RD for {data.customer.full_name}</span>
                  </button>
                </div>

                <div className="border border-slate-200 rounded-xl overflow-x-auto">
                  <table className="w-full text-left text-xs whitespace-nowrap">
                    <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold">
                      <tr>
                        <th className="py-2.5 px-3">RD Number</th>
                        <th className="py-2.5 px-3 text-right">Monthly Deposit</th>
                        <th className="py-2.5 px-3 text-center">Paid / Total</th>
                        <th className="py-2.5 px-3 text-right">Deposited to Date</th>
                        <th className="py-2.5 px-3 text-right">Maturity Amount</th>
                        <th className="py-2.5 px-3 text-center">Status</th>
                        <th className="py-2.5 px-3 text-right">Actions (किस्त भरें / RD बंद करें)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {(!data.portfolio?.rds || data.portfolio?.rds?.length === 0) ? (
                        <tr>
                          <td colSpan={7} className="py-8 text-center text-slate-400">
                            No Recurring Deposits found. Click "+ Start New RD" to start one.
                          </td>
                        </tr>
                      ) : (
                        data.portfolio.rds.map(r => (
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
                            <td className="py-2.5 px-3 text-right">
                              <div className="flex items-center gap-1.5 justify-end">
                                {r.status === 'ACTIVE' && (
                                  <>
                                    <button
                                      type="button"
                                      onClick={() => handleOpenRDInstallment(r)}
                                      className="px-2.5 py-1 bg-teal-600 hover:bg-teal-700 text-white font-bold rounded-lg text-[11px] transition cursor-pointer flex items-center gap-1 shadow-2xs active:scale-95"
                                      title="Collect Pending Installment"
                                    >
                                      <CreditCard className="w-3 h-3" />
                                      <span>+ Pay Installment</span>
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => handleConfirmClose('RD', r)}
                                      className="px-2.5 py-1 bg-rose-50 hover:bg-rose-100 text-rose-700 font-bold rounded-lg text-[11px] border border-rose-200 transition cursor-pointer flex items-center gap-1"
                                      title="Foreclose / Close RD"
                                    >
                                      <XCircle className="w-3 h-3 text-rose-600" />
                                      <span>Foreclose (प्री-क्लोज़)</span>
                                    </button>
                                  </>
                                )}
                                {r.status === 'CLOSED_PREMATURE' && (
                                  <span className="text-[11px] font-semibold text-slate-500 bg-slate-100 px-2 py-0.5 rounded">
                                    Closed Prematurely
                                  </span>
                                )}
                              </div>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {activeTab === 'MIS' && (
              <div className="space-y-3">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 bg-slate-50 p-3 rounded-xl border border-slate-200">
                  <div>
                    <h3 className="font-bold text-slate-900 text-xs uppercase tracking-wider">Monthly Income Scheme (MIS) Portfolio ({data.portfolio?.mis?.length || 0})</h3>
                    <p className="text-[11px] text-slate-500">मासिक ब्याज भुगतान, 60-महीने शेड्यूल एवं समय पूर्व बंद करने के विकल्प</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => onOpenMIS && onOpenMIS(data.customer)}
                    className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-xs flex items-center gap-1.5 shadow-xs transition cursor-pointer active:scale-95 shrink-0"
                  >
                    <PlusCircle className="w-3.5 h-3.5" />
                    <span>+ Start New MIS for {data.customer.full_name}</span>
                  </button>
                </div>

                <div className="border border-slate-200 rounded-xl overflow-x-auto">
                  <table className="w-full text-left text-xs whitespace-nowrap">
                    <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold">
                      <tr>
                        <th className="py-2.5 px-3">MIS Number</th>
                        <th className="py-2.5 px-3 text-right">Deposit Amount</th>
                        <th className="py-2.5 px-3 text-center">Tenure</th>
                        <th className="py-2.5 px-3 text-right">Monthly Payout</th>
                        <th className="py-2.5 px-3 text-right">Maturity Return</th>
                        <th className="py-2.5 px-3 text-center">Status</th>
                        <th className="py-2.5 px-3 text-right">Actions (पेआउट / MIS बंद करें)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {(!data.portfolio?.mis || data.portfolio?.mis?.length === 0) ? (
                        <tr>
                          <td colSpan={7} className="py-8 text-center text-slate-400">
                            No Monthly Income Schemes opened yet. Click "+ Start New MIS" to create one.
                          </td>
                        </tr>
                      ) : (
                        data.portfolio.mis.map(m => (
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
                            <td className="py-2.5 px-3 text-right">
                              <div className="flex items-center gap-1.5 justify-end">
                                {m.status === 'ACTIVE' && (
                                  <>
                                    <button
                                      type="button"
                                      onClick={() => onNavigate && onNavigate('mis')}
                                      className="px-2.5 py-1 bg-blue-50 hover:bg-blue-100 text-blue-700 font-bold rounded-lg text-[11px] border border-blue-200 transition cursor-pointer flex items-center gap-1"
                                      title="View Payout Schedule in MIS Module"
                                    >
                                      <DollarSign className="w-3 h-3 text-blue-600" />
                                      <span>Payout Schedules</span>
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => handleConfirmClose('MIS', m)}
                                      className="px-2.5 py-1 bg-rose-50 hover:bg-rose-100 text-rose-700 font-bold rounded-lg text-[11px] border border-rose-200 transition cursor-pointer flex items-center gap-1"
                                      title="Foreclose / Close MIS"
                                    >
                                      <XCircle className="w-3 h-3 text-rose-600" />
                                      <span>Foreclose (प्री-क्लोज़)</span>
                                    </button>
                                  </>
                                )}
                                {m.status === 'CLOSED_PREMATURE' && (
                                  <span className="text-[11px] font-semibold text-slate-500 bg-slate-100 px-2 py-0.5 rounded">
                                    Closed Prematurely
                                  </span>
                                )}
                              </div>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {activeTab === 'SAVINGS' && (
              <div className="space-y-3">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 bg-slate-50 p-3 rounded-xl border border-slate-200">
                  <div>
                    <h3 className="font-bold text-slate-900 text-xs uppercase tracking-wider">Savings Account Portfolio ({data.portfolio?.savings?.length || 0})</h3>
                    <p className="text-[11px] text-slate-500">सीधे यहां से नकदी जमा/निकासी वाउचर डालें अथवा खाता बंद करें</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => onOpenSavings && onOpenSavings(data.customer)}
                    className="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white font-bold rounded-xl text-xs flex items-center gap-1.5 shadow-xs transition cursor-pointer active:scale-95 shrink-0"
                  >
                    <PlusCircle className="w-3.5 h-3.5" />
                    <span>+ Open Savings Account</span>
                  </button>
                </div>

                <div className="border border-slate-200 rounded-xl overflow-x-auto">
                  <table className="w-full text-left text-xs whitespace-nowrap">
                    <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold">
                      <tr>
                        <th className="py-2.5 px-3">Account Number</th>
                        <th className="py-2.5 px-3 text-right">Current Ledger Balance</th>
                        <th className="py-2.5 px-3 text-right">Min Balance</th>
                        <th className="py-2.5 px-3 text-center">Annual Interest Rate</th>
                        <th className="py-2.5 px-3 text-center">Status</th>
                        <th className="py-2.5 px-3 text-right">Direct Vouchers (जमा / निकासी / बंद)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {(!data.portfolio?.savings || data.portfolio?.savings?.length === 0) ? (
                        <tr>
                          <td colSpan={6} className="py-8 text-center text-slate-400">
                            No Savings Account opened for this member. Click "+ Open Savings Account" above.
                          </td>
                        </tr>
                      ) : (
                        data.portfolio.savings.map(s => (
                          <tr key={s.id} className="hover:bg-slate-50">
                            <td className="py-2.5 px-3 font-mono font-bold text-slate-900">{s.account_number}</td>
                            <td className="py-2.5 px-3 text-right font-black text-slate-900">{formatINR(s.current_balance)}</td>
                            <td className="py-2.5 px-3 text-right text-slate-600">{formatINR(s.minimum_balance)}</td>
                            <td className="py-2.5 px-3 text-center font-bold text-emerald-700">{s.annual_interest_rate}% p.a.</td>
                            <td className="py-2.5 px-3 text-center">
                              <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                s.status === 'ACTIVE' ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-600'
                              }`}>
                                {s.status}
                              </span>
                            </td>
                            <td className="py-2.5 px-3 text-right">
                              <div className="flex items-center gap-1.5 justify-end">
                                {s.status === 'ACTIVE' && (
                                  <>
                                    <button
                                      type="button"
                                      onClick={() => handleOpenSavingsVoucher(s, 'DEPOSIT')}
                                      className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg text-[11px] transition cursor-pointer flex items-center gap-1 shadow-2xs active:scale-95"
                                      title="Cash / Bank Deposit"
                                    >
                                      <ArrowDownCircle className="w-3 h-3" />
                                      <span>💰 Deposit (जमा)</span>
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => handleOpenSavingsVoucher(s, 'WITHDRAWAL')}
                                      className="px-2.5 py-1 bg-amber-600 hover:bg-amber-700 text-white font-bold rounded-lg text-[11px] transition cursor-pointer flex items-center gap-1 shadow-2xs active:scale-95"
                                      title="Cash / Cheque Withdrawal"
                                    >
                                      <ArrowUpCircle className="w-3 h-3" />
                                      <span>🏧 Withdraw (निकासी)</span>
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => handleConfirmClose('SAVINGS', s)}
                                      className="px-2 py-1 bg-rose-50 hover:bg-rose-100 text-rose-700 font-bold rounded-lg text-[10px] border border-rose-200 transition cursor-pointer"
                                      title="Close Account and Settle Balance"
                                    >
                                      <span>✕ Close A/c</span>
                                    </button>
                                  </>
                                )}
                                {s.status === 'CLOSED' && (
                                  <span className="text-[11px] font-semibold text-slate-500 bg-slate-100 px-2 py-0.5 rounded">
                                    Account Closed
                                  </span>
                                )}
                              </div>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* 8. Loans & Advances Tab */}
            {activeTab === 'LOANS' && (
              <div className="space-y-3">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 bg-slate-50 p-3 rounded-xl border border-slate-200">
                  <div>
                    <h3 className="font-bold text-slate-900 text-xs uppercase tracking-wider">Loans & Advances Portfolio</h3>
                    <p className="text-[11px] text-slate-500">Loan Against Deposit (LAD) एवं गोल्ड लोन विवरण</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => onNavigate && onNavigate('loans')}
                    className="px-3 py-1.5 bg-purple-600 hover:bg-purple-700 text-white font-bold rounded-xl text-xs flex items-center gap-1.5 shadow-xs transition cursor-pointer active:scale-95 shrink-0"
                  >
                    <PlusCircle className="w-3.5 h-3.5" />
                    <span>+ Sanction Loan / Gold Loan</span>
                  </button>
                </div>

                <div className="border border-slate-200 rounded-xl overflow-x-auto">
                  <table className="w-full text-left text-xs whitespace-nowrap">
                    <thead className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-200">
                      <tr>
                        <th className="py-2.5 px-3">Loan Number</th>
                        <th className="py-2.5 px-3">Type / Collateral</th>
                        <th className="py-2.5 px-3 text-right">Sanctioned Amount</th>
                        <th className="py-2.5 px-3 text-right">Outstanding Principal</th>
                        <th className="py-2.5 px-3 text-center">Interest Rate</th>
                        <th className="py-2.5 px-3 text-center">Status</th>
                        <th className="py-2.5 px-3 text-right">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {((data.portfolio?.loans?.length || 0) + (data.portfolio?.goldLoans?.length || 0)) === 0 ? (
                        <tr>
                          <td colSpan={7} className="py-8 text-center text-slate-400">
                            No active or past loans recorded for this member. Click "+ Sanction Loan" above.
                          </td>
                        </tr>
                      ) : (
                        <>
                          {data.portfolio?.loans?.map(l => (
                            <tr key={'lad-' + l.id} className="hover:bg-slate-50">
                              <td className="py-2.5 px-3 font-mono font-bold text-slate-900">{l.loan_number}</td>
                              <td className="py-2.5 px-3 text-slate-700">{l.collateral_type || 'Loan Against Deposit'}</td>
                              <td className="py-2.5 px-3 text-right font-bold text-slate-900">{formatINR(l.sanctioned_amount)}</td>
                              <td className="py-2.5 px-3 text-right font-black text-rose-700">{formatINR(l.outstanding_principal || l.sanctioned_amount)}</td>
                              <td className="py-2.5 px-3 text-center font-bold text-slate-800">{l.interest_rate}% p.a.</td>
                              <td className="py-2.5 px-3 text-center">
                                <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${l.status === 'ACTIVE' ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-600'}`}>
                                  {l.status}
                                </span>
                              </td>
                              <td className="py-2.5 px-3 text-right">
                                <button
                                  type="button"
                                  onClick={() => onNavigate && onNavigate('loans')}
                                  className="px-2.5 py-1 bg-purple-50 hover:bg-purple-100 text-purple-700 font-bold rounded-lg text-[11px] border border-purple-200 transition cursor-pointer"
                                >
                                  Manage Repayments →
                                </button>
                              </td>
                            </tr>
                          ))}
                          {data.portfolio?.goldLoans?.map(g => (
                            <tr key={'gl-' + g.id} className="hover:bg-slate-50">
                              <td className="py-2.5 px-3 font-mono font-bold text-amber-700">🥇 {g.loan_number}</td>
                              <td className="py-2.5 px-3 text-slate-700">Gold Loan ({g.total_weight_grams}g)</td>
                              <td className="py-2.5 px-3 text-right font-bold text-slate-900">{formatINR(g.sanctioned_amount)}</td>
                              <td className="py-2.5 px-3 text-right font-black text-rose-700">{formatINR(g.outstanding_principal || g.sanctioned_amount)}</td>
                              <td className="py-2.5 px-3 text-center font-bold text-slate-800">{g.interest_rate_percent}% p.a.</td>
                              <td className="py-2.5 px-3 text-center">
                                <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${g.status === 'ACTIVE' ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-600'}`}>
                                  {g.status}
                                </span>
                              </td>
                              <td className="py-2.5 px-3 text-right">
                                <button
                                  type="button"
                                  onClick={() => onNavigate && onNavigate('gold_loan')}
                                  className="px-2.5 py-1 bg-amber-50 hover:bg-amber-100 text-amber-800 font-bold rounded-lg text-[11px] border border-amber-200 transition cursor-pointer"
                                >
                                  Gold Appraisal / Repay →
                                </button>
                              </td>
                            </tr>
                          ))}
                        </>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

          </div>
        )}

        {/* Credentials Created Popup */}
        {showCredentialsPopup && (
          <div className="fixed inset-0 z-[220] bg-slate-950/80 backdrop-blur-xs flex justify-center items-start pt-16 pb-10 p-4 overflow-y-auto">
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
          <div className="fixed inset-0 z-[220] bg-slate-950/80 backdrop-blur-xs flex justify-center items-start pt-16 pb-10 p-4 overflow-y-auto">
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

        {/* 1. Direct Savings Deposit / Withdrawal Modal */}
        {savingsModal.open && savingsModal.account && (
          <div className="fixed inset-0 z-[10020] bg-slate-950/80 backdrop-blur-xs flex justify-center items-start pt-16 pb-10 p-4 overflow-y-auto animate-fadeIn">
            <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200">
              <div className="flex justify-between items-center pb-3 border-b border-slate-100 mb-4">
                <div className="flex items-center gap-2">
                  <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${savingsModal.type === 'DEPOSIT' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
                    {savingsModal.type === 'DEPOSIT' ? <ArrowDownCircle className="w-5 h-5" /> : <ArrowUpCircle className="w-5 h-5" />}
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-900 text-sm">
                      {savingsModal.type === 'DEPOSIT' ? 'Deposit Cash / Transfer' : 'Withdraw Cash / Transfer'}
                    </h3>
                    <p className="text-[10px] text-slate-500">Savings A/c: {savingsModal.account.account_number}</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setSavingsModal(prev => ({ ...prev, open: false }))}
                  className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleSavingsVoucherSubmit} className="space-y-4 text-xs">
                {/* Balance Summary Strip */}
                <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl flex justify-between items-center text-xs">
                  <div>
                    <span className="text-slate-500 block text-[10px] uppercase font-bold">Current Balance</span>
                    <span className="font-bold font-mono text-slate-900 text-sm">{formatINR(savingsModal.account.current_balance)}</span>
                  </div>
                  <div className="text-right">
                    <span className="text-slate-500 block text-[10px] uppercase font-bold">Min Balance Req</span>
                    <span className="font-bold font-mono text-slate-600">{formatINR(savingsModal.account.minimum_balance)}</span>
                  </div>
                </div>

                {/* Type Toggle */}
                <div className="grid grid-cols-2 gap-2 p-1 bg-slate-100 rounded-xl">
                  <button
                    type="button"
                    onClick={() => setSavingsModal(prev => ({ ...prev, type: 'DEPOSIT' }))}
                    className={`py-1.5 rounded-lg font-bold text-xs transition cursor-pointer flex items-center justify-center gap-1 ${
                      savingsModal.type === 'DEPOSIT' ? 'bg-white text-emerald-700 shadow-xs' : 'text-slate-600'
                    }`}
                  >
                    <ArrowDownCircle className="w-3.5 h-3.5" /> 💰 Deposit (जमा)
                  </button>
                  <button
                    type="button"
                    onClick={() => setSavingsModal(prev => ({ ...prev, type: 'WITHDRAWAL' }))}
                    className={`py-1.5 rounded-lg font-bold text-xs transition cursor-pointer flex items-center justify-center gap-1 ${
                      savingsModal.type === 'WITHDRAWAL' ? 'bg-white text-amber-700 shadow-xs' : 'text-slate-600'
                    }`}
                  >
                    <ArrowUpCircle className="w-3.5 h-3.5" /> 🏧 Withdraw (निकासी)
                  </button>
                </div>

                {/* Amount */}
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Transaction Amount (₹) *</label>
                  <input
                    type="number"
                    min="1"
                    step="1"
                    required
                    value={savingsModal.amount}
                    onChange={(e) => setSavingsModal(prev => ({ ...prev, amount: e.target.value }))}
                    placeholder="Enter amount (e.g. 5000)"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold font-mono text-slate-900 focus:bg-white focus:ring-2 focus:ring-indigo-600"
                  />
                  {savingsModal.amount && (
                    <span className="text-[10px] text-emerald-600 font-semibold mt-1 block">
                      {formatINR(savingsModal.amount)}
                    </span>
                  )}
                </div>

                {/* Payment Mode & Reference */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Payment Mode</label>
                    <select
                      value={savingsModal.payment_mode}
                      onChange={(e) => setSavingsModal(prev => ({ ...prev, payment_mode: e.target.value }))}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:bg-white"
                    >
                      <option value="CASH">💵 Cash at Branch</option>
                      <option value="BANK_TRANSFER">🏦 NEFT / RTGS</option>
                      <option value="UPI">📱 UPI / QR</option>
                      <option value="CHEQUE">📝 Cheque</option>
                    </select>
                  </div>
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Reference No</label>
                    <input
                      type="text"
                      value={savingsModal.reference_number}
                      onChange={(e) => setSavingsModal(prev => ({ ...prev, reference_number: e.target.value }))}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-mono text-xs focus:bg-white"
                    />
                  </div>
                </div>

                {/* Narration */}
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Narration / Notes</label>
                  <input
                    type="text"
                    value={savingsModal.narration}
                    onChange={(e) => setSavingsModal(prev => ({ ...prev, narration: e.target.value }))}
                    placeholder="Passbook transaction narration"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:bg-white"
                  />
                </div>

                {/* Actions */}
                <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setSavingsModal(prev => ({ ...prev, open: false }))}
                    className="px-3.5 py-1.5 text-slate-600 hover:bg-slate-100 font-semibold rounded-xl cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={savingsModal.loading}
                    className={`px-5 py-2 text-white font-bold rounded-xl shadow-md transition cursor-pointer flex items-center gap-1.5 active:scale-95 disabled:opacity-50 ${
                      savingsModal.type === 'DEPOSIT' ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-amber-600 hover:bg-amber-700'
                    }`}
                  >
                    {savingsModal.loading ? 'Posting...' : savingsModal.type === 'DEPOSIT' ? 'Deposit Funds' : 'Disburse Withdrawal'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* 2. Direct RD Installment Collection Modal */}
        {rdInstallModal.open && rdInstallModal.rd && rdInstallModal.installment && (
          <div className="fixed inset-0 z-[10020] bg-slate-950/80 backdrop-blur-xs flex justify-center items-start pt-16 pb-10 p-4 overflow-y-auto animate-fadeIn">
            <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200">
              <div className="flex justify-between items-center pb-3 border-b border-slate-100 mb-4">
                <div className="flex items-center gap-2">
                  <div className="w-9 h-9 rounded-xl bg-teal-100 text-teal-700 flex items-center justify-center">
                    <CreditCard className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-900 text-sm">Collect RD Installment #{rdInstallModal.installment.installment_no}</h3>
                    <p className="text-[10px] text-slate-500">RD Number: {rdInstallModal.rd.rd_number} • {data?.customer?.full_name}</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setRdInstallModal(prev => ({ ...prev, open: false }))}
                  className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleCollectRDInstallmentSubmit} className="space-y-4 text-xs">
                <div className="p-3 bg-teal-50/70 border border-teal-200 rounded-xl space-y-1.5">
                  <div className="flex justify-between">
                    <span className="text-slate-600 font-medium">Scheduled Due Date:</span>
                    <span className="font-mono font-bold text-slate-900">📅 {formatDate(rdInstallModal.installment.due_date)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-600 font-medium">Installment Amount:</span>
                    <span className="font-mono font-bold text-teal-800 text-sm">{formatINR(rdInstallModal.installment.installment_amount)}</span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Late Fee / Penalty (₹)</label>
                    <input
                      type="number"
                      min="0"
                      value={rdInstallModal.lateFee}
                      onChange={(e) => setRdInstallModal(prev => ({ ...prev, lateFee: e.target.value }))}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-mono text-xs focus:bg-white"
                    />
                  </div>
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Payment Mode</label>
                    <select
                      value={rdInstallModal.paymentMode}
                      onChange={(e) => setRdInstallModal(prev => ({ ...prev, paymentMode: e.target.value }))}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:bg-white"
                    >
                      <option value="CASH">💵 Cash</option>
                      <option value="BANK_TRANSFER">🏦 Bank Transfer</option>
                      <option value="UPI">📱 UPI</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Voucher / Receipt Reference</label>
                  <input
                    type="text"
                    value={rdInstallModal.transactionRef}
                    onChange={(e) => setRdInstallModal(prev => ({ ...prev, transactionRef: e.target.value }))}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-mono text-xs focus:bg-white"
                  />
                </div>

                <div className="p-3 bg-slate-900 text-white rounded-xl flex justify-between items-center">
                  <span className="text-slate-300 text-xs">Total Amount Collected:</span>
                  <span className="font-mono font-black text-emerald-400 text-base">
                    {formatINR((rdInstallModal.installment.installment_amount || 0) + parseFloat(rdInstallModal.lateFee || 0))}
                  </span>
                </div>

                <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setRdInstallModal(prev => ({ ...prev, open: false }))}
                    className="px-3.5 py-1.5 text-slate-600 hover:bg-slate-100 font-semibold rounded-xl cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={rdInstallModal.loading}
                    className="px-5 py-2 bg-teal-600 hover:bg-teal-700 text-white font-bold rounded-xl shadow-md transition cursor-pointer flex items-center gap-1.5 active:scale-95 disabled:opacity-50"
                  >
                    {rdInstallModal.loading ? 'Recording...' : 'Collect & Issue Receipt'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* 3. Confirm Service Foreclosure / Closure Modal */}
        {closeServiceModal.open && closeServiceModal.item && (
          <div className="fixed inset-0 z-[10020] bg-slate-950/80 backdrop-blur-xs flex justify-center items-start pt-16 pb-10 p-4 overflow-y-auto animate-fadeIn">
            <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200">
              <div className="flex justify-between items-center pb-3 border-b border-slate-100 mb-4">
                <div className="flex items-center gap-2">
                  <div className="w-9 h-9 rounded-xl bg-rose-100 text-rose-700 flex items-center justify-center">
                    <AlertTriangle className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-900 text-sm">
                      Confirm Foreclosure ({closeServiceModal.type} बंद करें)
                    </h3>
                    <p className="text-[10px] text-slate-500">
                      {closeServiceModal.type === 'RD' ? `RD Number: ${closeServiceModal.item.rd_number}` :
                       closeServiceModal.type === 'MIS' ? `MIS Number: ${closeServiceModal.item.mis_number}` :
                       `Account: ${closeServiceModal.item.account_number}`}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setCloseServiceModal(prev => ({ ...prev, open: false }))}
                  className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleCloseServiceSubmit} className="space-y-4 text-xs">
                <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-900 text-xs space-y-1">
                  <p className="font-bold">⚠️ Warning / चेतावनी:</p>
                  <p className="text-[11px] leading-relaxed text-rose-800">
                    This will permanently terminate this {closeServiceModal.type} account for depositor <b>{data?.customer?.full_name}</b> and calculate final payout or penalty settlement. Future schedules will be cancelled.
                  </p>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Closure Remarks / Reason (खाता बंद करने का कारण) *</label>
                  <textarea
                    required
                    rows="2"
                    value={closeServiceModal.remarks}
                    onChange={(e) => setCloseServiceModal(prev => ({ ...prev, remarks: e.target.value }))}
                    placeholder="e.g. Member requested premature foreclosure for emergency funds"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:bg-white focus:ring-2 focus:ring-rose-500"
                  ></textarea>
                </div>

                <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setCloseServiceModal(prev => ({ ...prev, open: false }))}
                    className="px-3.5 py-1.5 text-slate-600 hover:bg-slate-100 font-semibold rounded-xl cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={closeServiceModal.loading}
                    className="px-5 py-2 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-xl shadow-md transition cursor-pointer flex items-center gap-1.5 active:scale-95 disabled:opacity-50"
                  >
                    {closeServiceModal.loading ? 'Closing...' : `Confirm & Foreclose ${closeServiceModal.type}`}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* 4. Edit Client Profile Modal */}
        {editProfileOpen && (
          <div className="fixed inset-0 z-[10030] bg-slate-950/80 backdrop-blur-xs flex justify-center items-start pt-10 pb-10 p-4 overflow-y-auto animate-fadeIn">
            <div className="bg-white rounded-2xl max-w-xl w-full p-6 shadow-2xl border border-slate-200">
              <div className="flex justify-between items-center pb-3 border-b border-slate-100 mb-4">
                <div className="flex items-center gap-2.5">
                  <div className="w-10 h-10 rounded-xl bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold">
                    <Edit3 className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-900 text-sm">
                      Edit Client Profile (ग्राहक विवरण बदलें)
                    </h3>
                    <p className="text-[11px] text-slate-500 font-mono">
                      {data?.customer?.customer_code} • {data?.customer?.full_name}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setEditProfileOpen(false)}
                  className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {editError && (
                <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-800 text-xs mb-3 font-medium flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 shrink-0 text-rose-600" />
                  <span>{editError}</span>
                </div>
              )}

              <form onSubmit={handleSaveProfile} className="space-y-4 text-xs">
                {/* Section 1: Basic Info */}
                <div>
                  <h4 className="font-bold text-slate-900 text-xs uppercase tracking-wider mb-2 text-indigo-900">
                    1. Basic & Contact Information
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block font-bold text-slate-700 mb-1">Full Name (पूरा नाम) *</label>
                      <input
                        type="text"
                        required
                        value={editFormData.full_name || ''}
                        onChange={(e) => setEditFormData({ ...editFormData, full_name: e.target.value })}
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-900 focus:bg-white focus:ring-2 focus:ring-indigo-500"
                        placeholder="e.g. Ramesh Kumar"
                      />
                    </div>
                    <div>
                      <label className="block font-bold text-slate-700 mb-1">Mobile Phone (मोबाइल नंबर) *</label>
                      <input
                        type="text"
                        required
                        maxLength="10"
                        value={editFormData.phone || ''}
                        onChange={(e) => setEditFormData({ ...editFormData, phone: e.target.value.replace(/\D/g, '') })}
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-mono font-bold text-slate-900 focus:bg-white focus:ring-2 focus:ring-indigo-500"
                        placeholder="10-digit mobile"
                      />
                    </div>
                    <div>
                      <label className="block font-bold text-slate-700 mb-1">Email Address (ईमेल)</label>
                      <input
                        type="email"
                        value={editFormData.email || ''}
                        onChange={(e) => setEditFormData({ ...editFormData, email: e.target.value })}
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-indigo-500"
                        placeholder="client@example.com"
                      />
                    </div>
                    <div>
                      <label className="block font-bold text-slate-700 mb-1">Father / Husband Name</label>
                      <input
                        type="text"
                        value={editFormData.father_name || ''}
                        onChange={(e) => setEditFormData({ ...editFormData, father_name: e.target.value })}
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-indigo-500"
                        placeholder="Father's name"
                      />
                    </div>
                    <div className="sm:col-span-2">
                      <label className="block font-bold text-slate-700 mb-1">Full Address (पूरा पता)</label>
                      <input
                        type="text"
                        value={editFormData.address || ''}
                        onChange={(e) => setEditFormData({ ...editFormData, address: e.target.value })}
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-indigo-500"
                        placeholder="Village / Ward, Tehsil, City, Pincode"
                      />
                    </div>
                  </div>
                </div>

                {/* Section 2: KYC Details */}
                <div className="pt-2 border-t border-slate-100">
                  <h4 className="font-bold text-slate-900 text-xs uppercase tracking-wider mb-2 text-indigo-900">
                    2. Official KYC Mandate
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block font-bold text-slate-700 mb-1">PAN Card Number</label>
                      <input
                        type="text"
                        maxLength="10"
                        value={editFormData.pan_card || ''}
                        onChange={(e) => setEditFormData({ ...editFormData, pan_card: e.target.value.toUpperCase() })}
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl uppercase font-mono font-bold focus:bg-white focus:ring-2 focus:ring-indigo-500"
                        placeholder="ABCDE1234F"
                      />
                    </div>
                    <div>
                      <label className="block font-bold text-slate-700 mb-1">Aadhaar Card Number</label>
                      <input
                        type="text"
                        maxLength="12"
                        value={editFormData.aadhaar_no || ''}
                        onChange={(e) => setEditFormData({ ...editFormData, aadhaar_no: e.target.value.replace(/\D/g, '') })}
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-mono focus:bg-white focus:ring-2 focus:ring-indigo-500"
                        placeholder="12-digit Aadhaar"
                      />
                    </div>
                  </div>
                </div>

                {/* Section 3: Bank & Nominee */}
                <div className="pt-2 border-t border-slate-100">
                  <h4 className="font-bold text-slate-900 text-xs uppercase tracking-wider mb-2 text-indigo-900">
                    3. Bank Account & Nominee Mandate
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                      <label className="block font-bold text-slate-700 mb-1">Bank Name</label>
                      <input
                        type="text"
                        value={editFormData.bank_name || ''}
                        onChange={(e) => setEditFormData({ ...editFormData, bank_name: e.target.value })}
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-indigo-500"
                        placeholder="e.g. State Bank of India"
                      />
                    </div>
                    <div>
                      <label className="block font-bold text-slate-700 mb-1">Account Number</label>
                      <input
                        type="text"
                        value={editFormData.account_no || ''}
                        onChange={(e) => setEditFormData({ ...editFormData, account_no: e.target.value })}
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-mono focus:bg-white focus:ring-2 focus:ring-indigo-500"
                        placeholder="Account number"
                      />
                    </div>
                    <div>
                      <label className="block font-bold text-slate-700 mb-1">IFSC Code</label>
                      <input
                        type="text"
                        maxLength="11"
                        value={editFormData.ifsc_code || ''}
                        onChange={(e) => setEditFormData({ ...editFormData, ifsc_code: e.target.value.toUpperCase() })}
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-mono uppercase focus:bg-white focus:ring-2 focus:ring-indigo-500"
                        placeholder="SBIN0001234"
                      />
                    </div>
                    <div>
                      <label className="block font-bold text-slate-700 mb-1">Nominee Name</label>
                      <input
                        type="text"
                        value={editFormData.nominee_name || ''}
                        onChange={(e) => setEditFormData({ ...editFormData, nominee_name: e.target.value })}
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-indigo-500"
                        placeholder="Nominee full name"
                      />
                    </div>
                    <div>
                      <label className="block font-bold text-slate-700 mb-1">Nominee Relation</label>
                      <input
                        type="text"
                        value={editFormData.nominee_relation || ''}
                        onChange={(e) => setEditFormData({ ...editFormData, nominee_relation: e.target.value })}
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-indigo-500"
                        placeholder="Spouse, Son, Daughter..."
                      />
                    </div>
                  </div>
                </div>

                <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setEditProfileOpen(false)}
                    className="px-4 py-2 text-slate-600 hover:bg-slate-100 font-semibold rounded-xl cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={editSubmitting}
                    className="px-6 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl shadow-md transition cursor-pointer flex items-center gap-1.5 active:scale-95 disabled:opacity-50"
                  >
                    {editSubmitting ? 'Saving Changes...' : 'Save Profile Changes (सुरक्षित करें)'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Pinned Bottom Footer */}
        <div className="shrink-0 px-6 py-2.5 border-t border-slate-200 bg-slate-50 flex items-center justify-between text-xs text-slate-500 z-10">
          <span>Press <kbd className="px-1.5 py-0.5 bg-slate-200 rounded text-[11px] font-mono text-slate-700">Esc</kbd> or click outside to close</span>
        </div>

      </div>
    </div>,
    document.body
  );
}
