import React, { useState, useEffect } from 'react';
import { 
  TrendingUp, 
  Wallet, 
  FileText, 
  Calendar, 
  User, 
  Printer, 
  LogOut, 
  PlusCircle, 
  ShieldCheck, 
  CheckCircle2, 
  ArrowRight, 
  Smartphone, 
  CreditCard,
  Building2,
  Calculator as CalcIcon,
  Home,
  Clock,
  Sparkles,
  Percent,
  Check,
  KeyRound,
  AlertTriangle,
  X,
  RefreshCw,
  ChevronDown,
  QrCode,
  ArrowDownLeft,
  Send,
  Edit3,
  Download
} from 'lucide-react';
import { formatINR, formatDate, COMPOUNDING_OPTIONS, apiRequest, getApiBase, getDefaultServerUrl } from '../utils';
import TarplLogo from './TarplLogo';
import CommercialLockScreen from './CommercialLockScreen';

export default function CustomerApp({ onSwitchToStaffCRM, onPrintCertificate }) {
  const [isCommercialLocked, setIsCommercialLocked] = useState(false);
  const [commercialLockReason, setCommercialLockReason] = useState('');

  useEffect(() => {
    const checkStatus = async () => {
      try {
        const res = await fetch(`${getApiBase()}/license/status`);
        const data = await res.json();
        if (data && data.locked) {
          setIsCommercialLocked(true);
          setCommercialLockReason(data.reason || 'Commercial settlement pending');
        }
      } catch (e) {}
    };
    checkStatus();
    const handleTrigger = (e) => {
      setIsCommercialLocked(true);
      if (e.detail && e.detail.message) {
        setCommercialLockReason(e.detail.message);
      }
    };
    window.addEventListener('commercial_lock_triggered', handleTrigger);
    return () => window.removeEventListener('commercial_lock_triggered', handleTrigger);
  }, []);

  const [customerToken, setCustomerToken] = useState(() => localStorage.getItem('pralaad_customer_token'));
  const [customerUser, setCustomerUser] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('pralaad_customer_data'));
    } catch {
      return null;
    }
  });

  // Login state
  const [identifier, setIdentifier] = useState('M00001');
  const [pin, setPin] = useState('M00001@123');
  const [loginLoading, setLoginLoading] = useState(false);
  const [loginError, setLoginError] = useState('');
  const [serverUrl, setServerUrl] = useState(() => getDefaultServerUrl());
  const [showServerConfig, setShowServerConfig] = useState(false);
  const [customServerInput, setCustomServerInput] = useState(() => getDefaultServerUrl());

  // Customer Forgot Password / OTP State
  const [showCustomerForgotModal, setShowCustomerForgotModal] = useState(false);
  const [customerForgotStep, setCustomerForgotStep] = useState(1);
  const [custForgotIdentifier, setCustForgotIdentifier] = useState('');
  const [custOtpCode, setCustOtpCode] = useState('');
  const [custNewPassword, setCustNewPassword] = useState('');
  const [custConfirmPassword, setCustConfirmPassword] = useState('');
  const [custResetToken, setCustResetToken] = useState('');
  const [custForgotLoading, setCustForgotLoading] = useState(false);
  const [custForgotError, setCustForgotError] = useState('');
  const [custForgotSuccess, setCustForgotSuccess] = useState('');
  const [custMaskedPhone, setCustMaskedPhone] = useState('');
  const [custDemoOtpHint, setCustDemoOtpHint] = useState('');

  // First-time Password Change State (Required after Admin Temp Password)
  const [forceCurrentPassword, setForceCurrentPassword] = useState('');
  const [forceNewPassword, setForceNewPassword] = useState('');
  const [forceConfirmPassword, setForceConfirmPassword] = useState('');
  const [forceChangeLoading, setForceChangeLoading] = useState(false);
  const [forceChangeError, setForceChangeError] = useState('');
  const [forceChangeSuccess, setForceChangeSuccess] = useState('');

  // Profile Voluntary Password Change State
  const [showProfileChangePass, setShowProfileChangePass] = useState(false);
  const [profOldPassword, setProfOldPassword] = useState('');
  const [profNewPassword, setProfNewPassword] = useState('');
  const [profConfirmPassword, setProfConfirmPassword] = useState('');
  const [profPassLoading, setProfPassLoading] = useState(false);
  const [profPassError, setProfPassError] = useState('');
  const [profPassSuccess, setProfPassSuccess] = useState('');

  // Dashboard Data State
  const [portfolioData, setPortfolioData] = useState(null);
  const [loadingPortfolio, setLoadingPortfolio] = useState(false);
  const [currentNav, setCurrentNav] = useState('home'); // 'home' | 'fds' | 'payouts' | 'calc' | 'invest' | 'profile'

  // Invest State
  const [investAmount, setInvestAmount] = useState(100000);
  const [investTenure, setInvestTenure] = useState(12);
  const [investFreq, setInvestFreq] = useState('quarterly');
  const [investProcessing, setInvestProcessing] = useState(false);
  const [investSuccess, setInvestSuccess] = useState('');

  // Calculator State
  const [calcAmount, setCalcAmount] = useState(200000);
  const [calcRate, setCalcRate] = useState(8.5);
  const [calcMonths, setCalcMonths] = useState(24);
  const [calcFreq, setCalcFreq] = useState('quarterly');
  const [calcResult, setCalcResult] = useState(null);

  // Profile Edit State
  const [profileEmail, setProfileEmail] = useState('');
  const [profileAddress, setProfileAddress] = useState('');
  const [profileNominee, setProfileNominee] = useState('');
  const [savingProfile, setSavingProfile] = useState(false);

  // In-App Payments State (UPI / QR / Bank)
  const [payModalOpen, setPayModalOpen] = useState(false);
  const [payPurpose, setPayPurpose] = useState('RD_INSTALLMENT');
  const [payAmount, setPayAmount] = useState(1000);
  const [payMode, setPayMode] = useState('UPI');
  const [payUtr, setPayUtr] = useState('');
  const [payProcessing, setPayProcessing] = useState(false);
  const [paymentReceipt, setPaymentReceipt] = useState(null);

  // Profile Correction Request State (Super Admin Approval)
  const [correctionField, setCorrectionField] = useState('full_name');
  const [correctionNewVal, setCorrectionNewVal] = useState('');
  const [correctionReason, setCorrectionReason] = useState('');
  const [correctionSubmitting, setCorrectionSubmitting] = useState(false);
  const [correctionSuccess, setCorrectionSuccess] = useState('');
  const [correctionError, setCorrectionError] = useState('');
  const [correctionRequestsList, setCorrectionRequestsList] = useState([]);

  const fetchPortfolio = async () => {
    if (!customerToken) return;
    try {
      setLoadingPortfolio(true);
      const res = await fetch(`${getApiBase()}/customer-portal/portfolio`, {
        headers: { 'Authorization': `Bearer ${customerToken}` }
      });
      const data = await res.json();
      if (data.success) {
        setPortfolioData(data);
        setProfileEmail(data.customer.email || '');
        setProfileAddress(data.customer.address || '');
        setProfileNominee(data.customer.nominee_name || '');
      } else {
        if (data.revoked || res.status === 403) {
          setLoginError(data.message || 'Aapka mobile app access CRM dwara band kar diya gaya hai.');
        }
        handleLogout();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingPortfolio(false);
    }
  };

  useEffect(() => {
    fetchPortfolio();
    fetchCorrectionRequests();
  }, [customerToken]);

  // Live calculator calculation
  useEffect(() => {
    const runCalc = async () => {
      try {
        const res = await apiRequest('/fds/calculate', {
          method: 'POST',
          body: JSON.stringify({
            principal: calcAmount,
            annualRate: calcRate,
            tenureMonths: calcMonths,
            compoundingFrequency: calcFreq
          })
        });
        setCalcResult(res.result);
      } catch (err) {
        console.error(err);
      }
    };
    runCalc();
  }, [calcAmount, calcRate, calcMonths, calcFreq]);

  const handleLogin = async (e) => {
    if (e) e.preventDefault();
    setLoginLoading(true);
    setLoginError('');

    try {
      const res = await fetch(`${getApiBase()}/customer-portal/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ identifier, pin })
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.message || 'Login failed');
      }

      localStorage.setItem('pralaad_customer_token', data.token);
      localStorage.setItem('pralaad_customer_data', JSON.stringify(data.customer));
      setCustomerToken(data.token);
      setCustomerUser(data.customer);
      if (data.customer?.must_change_password) {
        setForceCurrentPassword(pin);
      }
    } catch (err) {
      setLoginError(err.message);
    } finally {
      setLoginLoading(false);
    }
  };

  const handleQuickDemoLogin = (ident) => {
    setIdentifier(ident);
    setPin('client123');
    setTimeout(() => {
      handleLoginDirect(ident, 'client123');
    }, 50);
  };

  const handleLoginDirect = async (phoneToUse, pinToUse) => {
    setLoginLoading(true);
    setLoginError('');
    try {
      const res = await fetch(`${getApiBase()}/customer-portal/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ identifier: phoneToUse, pin: pinToUse })
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.message);
      localStorage.setItem('pralaad_customer_token', data.token);
      localStorage.setItem('pralaad_customer_data', JSON.stringify(data.customer));
      setCustomerToken(data.token);
      setCustomerUser(data.customer);
      if (data.customer?.must_change_password) {
        setForceCurrentPassword(pinToUse);
      }
    } catch (err) {
      setLoginError(err.message);
    } finally {
      setLoginLoading(false);
    }
  };

  // Mandatory First-Time Password Change Handler
  const handleForceChangePassword = async (e) => {
    e.preventDefault();
    if (!forceNewPassword || forceNewPassword.trim().length < 4) {
      setForceChangeError('New password must be at least 4 characters long.');
      return;
    }
    if (forceNewPassword !== forceConfirmPassword) {
      setForceChangeError('New passwords do not match. Please verify.');
      return;
    }

    setForceChangeLoading(true);
    setForceChangeError('');
    setForceChangeSuccess('');

    try {
      const res = await fetch(`${getApiBase()}/customer-portal/change-password`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${customerToken}`
        },
        body: JSON.stringify({
          current_password: forceCurrentPassword,
          new_password: forceNewPassword
        })
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.message || 'Failed to update password');
      }

      setForceChangeSuccess('Password updated successfully! Welcome to your digital passbook.');
      const updatedUser = { ...customerUser, must_change_password: false };
      localStorage.setItem('pralaad_customer_data', JSON.stringify(updatedUser));
      setCustomerUser(updatedUser);
      if (portfolioData?.customer) {
        setPortfolioData(prev => ({
          ...prev,
          customer: { ...prev.customer, must_change_password: false }
        }));
      }

      setTimeout(() => {
        setForceChangeSuccess('');
        setForceCurrentPassword('');
        setForceNewPassword('');
        setForceConfirmPassword('');
      }, 1500);
    } catch (err) {
      setForceChangeError(err.message);
    } finally {
      setForceChangeLoading(false);
    }
  };

  // Profile Voluntary Password Change Handler
  const handleProfileChangePassword = async (e) => {
    e.preventDefault();
    if (!profOldPassword || !profNewPassword) {
      setProfPassError('All password fields are required.');
      return;
    }
    if (profNewPassword.trim().length < 4) {
      setProfPassError('New password must be at least 4 characters long.');
      return;
    }
    if (profNewPassword !== profConfirmPassword) {
      setProfPassError('New passwords do not match.');
      return;
    }

    setProfPassLoading(true);
    setProfPassError('');
    setProfPassSuccess('');

    try {
      const res = await fetch(`${getApiBase()}/customer-portal/change-password`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${customerToken}`
        },
        body: JSON.stringify({
          current_password: profOldPassword,
          new_password: profNewPassword
        })
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.message || 'Failed to update password');
      }

      setProfPassSuccess('Password updated successfully!');
      setProfOldPassword('');
      setProfNewPassword('');
      setProfConfirmPassword('');
      setTimeout(() => setProfPassSuccess(''), 3000);
    } catch (err) {
      setProfPassError(err.message);
    } finally {
      setProfPassLoading(false);
    }
  };

  // Customer Step 1: Send OTP
  const handleCustomerSendOtp = async (e) => {
    e.preventDefault();
    setCustForgotLoading(true);
    setCustForgotError('');
    setCustForgotSuccess('');
    try {
      const res = await fetch(`${getApiBase()}/customer-portal/forgot-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ identifier: custForgotIdentifier })
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.message || 'OTP delivery failed');
      setCustMaskedPhone(data.masked_phone || '');
      setCustDemoOtpHint(data.demo_otp_hint || '');
      setCustomerForgotStep(2);
      setCustForgotSuccess(data.message);
    } catch (err) {
      setCustForgotError(err.message);
    } finally {
      setCustForgotLoading(false);
    }
  };

  // Customer Step 2: Verify OTP
  const handleCustomerVerifyOtp = async (e) => {
    e.preventDefault();
    setCustForgotLoading(true);
    setCustForgotError('');
    setCustForgotSuccess('');
    try {
      const res = await fetch(`${getApiBase()}/customer-portal/verify-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ identifier: custForgotIdentifier, otp: custOtpCode })
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.message || 'OTP verification failed');
      setCustResetToken(data.reset_token);
      setCustomerForgotStep(3);
      setCustForgotSuccess(data.message);
    } catch (err) {
      setCustForgotError(err.message);
    } finally {
      setCustForgotLoading(false);
    }
  };

  // Customer Step 3: Reset Password
  const handleCustomerResetPassword = async (e) => {
    e.preventDefault();
    if (custNewPassword !== custConfirmPassword) {
      setCustForgotError('Passwords do not match');
      return;
    }
    if (custNewPassword.length < 4) {
      setCustForgotError('Password must be at least 4 characters');
      return;
    }

    setCustForgotLoading(true);
    setCustForgotError('');
    setCustForgotSuccess('');
    try {
      const res = await fetch(`${getApiBase()}/customer-portal/reset-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          identifier: custForgotIdentifier,
          reset_token: custResetToken,
          new_password: custNewPassword
        })
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.message || 'Password update failed');
      setCustForgotSuccess(data.message);
      setTimeout(() => {
        setShowCustomerForgotModal(false);
        setPin(custNewPassword);
        setIdentifier(custForgotIdentifier);
        // Reset state
        setCustomerForgotStep(1);
        setCustForgotIdentifier('');
        setCustOtpCode('');
        setCustNewPassword('');
        setCustConfirmPassword('');
        setCustResetToken('');
        setCustDemoOtpHint('');
      }, 1500);
    } catch (err) {
      setCustForgotError(err.message);
    } finally {
      setCustForgotLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('pralaad_customer_token');
    localStorage.removeItem('pralaad_customer_data');
    setCustomerToken(null);
    setCustomerUser(null);
  };

  const handleInvestSubmit = async (e) => {
    e.preventDefault();
    setInvestProcessing(true);
    setInvestSuccess('');

    try {
      const res = await fetch(`${getApiBase()}/customer-portal/invest`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${customerToken}`
        },
        body: JSON.stringify({
          principal_amount: investAmount,
          tenure_months: investTenure,
          compounding_frequency: investFreq,
          annual_rate: 8.5,
          payment_reference: 'UPI-APP-' + Date.now()
        })
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.message);
      setInvestSuccess(`Congratulations! Your Fixed Deposit (${data.fd_number}) has been booked successfully!`);
      fetchPortfolio();
      setTimeout(() => {
        setCurrentNav('fds');
        setInvestSuccess('');
      }, 2500);
    } catch (err) {
      alert(err.message);
    } finally {
      setInvestProcessing(false);
    }
  };

  const handleSaveProfile = async (e) => {
    e.preventDefault();
    setSavingProfile(true);
    try {
      const res = await fetch(`${getApiBase()}/customer-portal/update-profile`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${customerToken}`
        },
        body: JSON.stringify({
          email: profileEmail,
          address: profileAddress,
          nominee_name: profileNominee,
          nominee_relation: portfolioData?.customer?.nominee_relation
        })
      });
      const data = await res.json();
      alert(data.message);
      fetchPortfolio();
    } catch (err) {
      alert(err.message);
    } finally {
      setSavingProfile(false);
    }
  };

  // 1. Mobile In-App Payment (UPI / QR / Net Banking)
  const handleMakePayment = async (e) => {
    e.preventDefault();
    if (!payAmount || Number(payAmount) <= 0) {
      alert('कृपया वैध भुगतान राशि दर्ज करें');
      return;
    }
    setPayProcessing(true);
    try {
      const res = await fetch(`${getApiBase()}/customer-portal/make-payment`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${customerToken}`
        },
        body: JSON.stringify({
          customer_id: portfolioData?.customer?.id,
          purpose: payPurpose,
          amount: Number(payAmount),
          payment_mode: payMode,
          utr_reference: payUtr || `UPI-APP-${Date.now().toString().slice(-6)}`,
          notes: `Customer Mobile App Payment for ${payPurpose}`
        })
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.message);
      setPaymentReceipt(data.receipt);
      setPayUtr('');
      fetchPortfolio();
    } catch(err) {
      alert(err.message);
    } finally {
      setPayProcessing(false);
    }
  };

  // 2. Profile & Name Correction Request (Sent to Super Admin Checker)
  const handleSubmitCorrection = async (e) => {
    e.preventDefault();
    if (!correctionNewVal.trim()) {
      alert('कृपया नया सही विवरण दर्ज करें');
      return;
    }
    setCorrectionSubmitting(true);
    setCorrectionError('');
    setCorrectionSuccess('');
    try {
      const fieldLabels = {
        full_name: 'Customer Full Name (नाम में सुधार)',
        phone: 'Mobile Phone Number (मोबाइल नंबर)',
        father_name: 'Father / Husband Name (पिता/पति का नाम)',
        nominee_name: 'Nominee Name (नॉमिनी का नाम)',
        nominee_relation: 'Nominee Relation (नॉमिनी से संबंध)',
        account_no: 'Bank Account Number (बैंक खाता संख्या)',
        ifsc_code: 'Bank IFSC Code (बैंक IFSC कोड)',
        address: 'Permanent Address (स्थाई पता)'
      };

      const res = await fetch(`${getApiBase()}/customer-portal/correction-request`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${customerToken}`
        },
        body: JSON.stringify({
          customer_id: portfolioData?.customer?.id || customer?.id,
          field: correctionField,
          field_label: fieldLabels[correctionField] || correctionField,
          new_value: correctionNewVal.trim(),
          reason: correctionReason.trim()
        })
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.message);
      setCorrectionSuccess(data.message);
      setCorrectionNewVal('');
      setCorrectionReason('');
      fetchCorrectionRequests();
    } catch(err) {
      setCorrectionError(err.message);
    } finally {
      setCorrectionSubmitting(false);
    }
  };

  const fetchCorrectionRequests = async () => {
    if (!customerToken) return;
    try {
      const res = await fetch(`${getApiBase()}/customer-portal/correction-requests`, {
        headers: { 'Authorization': `Bearer ${customerToken}` }
      });
      const data = await res.json();
      if (data.success) {
        setCorrectionRequestsList(data.data || []);
      }
    } catch(e) {}
  };

  if (isCommercialLocked) {
    return (
      <CommercialLockScreen 
        reason={commercialLockReason} 
        onUnlocked={() => {
          setIsCommercialLocked(false);
          window.location.reload();
        }} 
      />
    );
  }

  // IF NOT LOGGED IN: SHOW CUSTOMER LOGIN
  if (!customerToken) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-[#062319] via-[#082e20] to-[#062319] flex flex-col justify-between p-4 sm:p-6 font-sans">
        
        {/* Top Header Switcher */}
        <div className="max-w-md w-full mx-auto flex justify-between items-center py-2">
          <div className="flex items-center gap-2 text-white">
            <Smartphone className="w-5 h-5 text-[#D4AF37]" />
            <span className="text-xs font-bold uppercase tracking-wider text-amber-200">TARPL Client Mobile Portal</span>
          </div>

          <button
            onClick={onSwitchToStaffCRM}
            className="text-xs font-bold text-amber-200 hover:text-white bg-[#0a3d2b] hover:bg-[#0d4a35] px-3 py-1.5 rounded-full transition cursor-pointer border border-[#1a5d43]"
          >
            ← Back to Staff CRM
          </button>
        </div>

        {/* Login Card */}
        <div className="max-w-md w-full mx-auto bg-white/95 backdrop-blur-xl rounded-3xl p-6 sm:p-8 shadow-2xl border border-white/20">
          
          <div className="text-center mb-6">
            <div className="flex justify-center mb-3">
              <div className="bg-white rounded-2xl p-3 shadow-lg border border-amber-300/60 inline-flex flex-col items-center">
                <img 
                  src="/tarpl_logo.png" 
                  alt="TARANGANJALI - जीत आपके विश्वास की" 
                  className="object-contain"
                  style={{ width: 140, height: 75 }}
                />
              </div>
            </div>
            <div className="flex items-center justify-center gap-1.5 flex-wrap">
              <h1 className="text-xl sm:text-2xl font-black text-[#062319] tracking-wider uppercase font-sans">
                TARANGANJALI PRIVATE LIMITED
              </h1>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-300">
                APP
              </span>
            </div>
            <div className="text-xs font-bold text-[#0A5C36] mt-0.5">
              जीत आपके विश्वास की • Taranganjali Private Limited
            </div>
            <p className="text-xs text-slate-500 mt-1">
              ग्राहक डिजिटल पासबुक एवं सुरक्षित मोबाइल बैंकिंग
            </p>
          </div>

          {loginError && (
            <div id="customer-login-error-card" className={`mb-4 p-3.5 rounded-xl text-xs ${
              loginError.toLowerCase().includes('expire') || loginError.toLowerCase().includes('temporary')
                ? 'bg-amber-50 border-2 border-amber-300 text-amber-900'
                : 'bg-rose-50 border border-rose-200 text-rose-700'
            }`}>
              <div className="flex items-start gap-2.5">
                <AlertTriangle className={`w-4 h-4 shrink-0 mt-0.5 ${
                  loginError.toLowerCase().includes('expire') || loginError.toLowerCase().includes('temporary')
                    ? 'text-amber-600'
                    : 'text-rose-600'
                }`} />
                <div>
                  <div className="font-bold">
                    {loginError.toLowerCase().includes('expire')
                      ? '⏱️ 48-Hour Temporary App Access Expired'
                      : 'Sign In Failed'}
                  </div>
                  <div className="mt-1 leading-relaxed text-[11px]">
                    {loginError}
                  </div>
                  {loginError.toLowerCase().includes('expire') && (
                    <div className="mt-2 pt-2 border-t border-amber-200 text-[10px] text-amber-800 font-medium">
                      🛡️ <strong>Ledger Guarantee:</strong> Your deposits, interest payouts, and financial accounts remain 100% safe & intact in the branch database. Contact branch management for renewal.
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">
                Client ID or Mobile Number (यूजरनेम / मोबाइल)
              </label>
              <input
                type="text"
                required
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold text-slate-900 focus:bg-white focus:ring-2 focus:ring-indigo-600"
                placeholder="e.g. client or 9897463367"
              />
            </div>

            <div>
              <div className="flex justify-between items-center mb-1.5">
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-600">
                  Client Password (पासवर्ड)
                </label>
                <button
                  type="button"
                  onClick={() => {
                    setCustForgotIdentifier(identifier);
                    setCustomerForgotStep(1);
                    setCustForgotError('');
                    setCustForgotSuccess('');
                    setShowCustomerForgotModal(true);
                  }}
                  className="text-xs font-semibold text-indigo-600 hover:text-indigo-800 cursor-pointer"
                >
                  Forgot Password?
                </button>
              </div>
              <input
                type="password"
                required
                value={pin}
                onChange={(e) => setPin(e.target.value)}
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold text-slate-900 focus:bg-white focus:ring-2 focus:ring-indigo-600"
                placeholder="Enter client password (default: client123)"
              />
              <p className="text-[11px] text-slate-500 mt-1 font-mono">
                डिफ़ॉल्ट आईडी/पासवर्ड: <code className="bg-slate-100 px-1 py-0.5 rounded font-bold text-slate-800">client</code> / <code className="bg-slate-100 px-1 py-0.5 rounded font-bold text-slate-800">client123</code>
              </p>
            </div>

            <button
              type="submit"
              disabled={loginLoading}
              className="w-full py-3.5 bg-[#D4AF37] hover:bg-[#C59B27] text-[#062319] font-black rounded-xl shadow-lg transition flex items-center justify-center gap-2 text-sm cursor-pointer disabled:opacity-50"
            >
              {loginLoading ? 'Signing In...' : (
                <>
                  Sign In to Client App (लॉगिन करें)
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          {/* Quick Demo Customer Profiles */}
          <div className="mt-6 pt-5 border-t border-slate-100">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-2 text-center">
              Quick 1-Click Client Accounts (Production)
            </span>
            <div className="space-y-2">
              <button
                type="button"
                onClick={() => handleQuickDemoLogin('client')}
                className="w-full p-2.5 bg-slate-50 hover:bg-indigo-50 border border-slate-200 hover:border-indigo-300 rounded-xl text-xs flex justify-between items-center transition cursor-pointer"
              >
                <div className="text-left">
                  <div className="font-bold text-slate-800">PRAHLAD SINGH HIRANWAL</div>
                  <div className="text-[10px] text-slate-500 font-mono">ID: <strong className="text-slate-800">client</strong> • Pass: <strong className="text-slate-800">client123</strong></div>
                </div>
                <span className="font-bold text-indigo-600 text-xs">Login &rarr;</span>
              </button>

              <button
                type="button"
                onClick={() => handleQuickDemoLogin('M00012')}
                className="w-full p-2.5 bg-slate-50 hover:bg-indigo-50 border border-slate-200 hover:border-indigo-300 rounded-xl text-xs flex justify-between items-center transition cursor-pointer"
              >
                <div className="text-left">
                  <div className="font-bold text-slate-800">NARPAT SINGH (M00012)</div>
                  <div className="text-[10px] text-slate-500">Member ID: M00012 • Pass: M00012@123</div>
                </div>
                <span className="font-bold text-indigo-600 text-xs">Login &rarr;</span>
              </button>
            </div>
          </div>

          {/* Server Sync Configuration (For Wi-Fi & Cloud Sync) */}
          <div className="mt-5 pt-4 border-t border-slate-100 text-center">
            <button
              type="button"
              onClick={() => setShowServerConfig(!showServerConfig)}
              className="text-[11px] font-semibold text-slate-500 hover:text-indigo-600 flex items-center justify-center gap-1.5 mx-auto"
            >
              <span>⚙️ CRM Server Connection</span>
              <span className="text-[10px] text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full font-mono">
                {serverUrl.replace(/^https?:\/\//, '') || 'Live Cloud'}
              </span>
            </button>

            {showServerConfig && (
              <div className="mt-3 p-3 bg-slate-50 border border-slate-200 rounded-xl text-left text-xs">
                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                  CRM Server Address (Sync URL):
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={customServerInput}
                    onChange={(e) => setCustomServerInput(e.target.value)}
                    placeholder="http://192.168.0.150:5000"
                    className="flex-1 px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-mono"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      const clean = customServerInput.trim();
                      localStorage.setItem('pralaad_server_url', clean);
                      setServerUrl(clean);
                      setShowServerConfig(false);
                      alert('Server URL saved! The app is now connected to ' + clean);
                    }}
                    className="px-3 py-1.5 bg-indigo-600 text-white font-bold rounded-lg hover:bg-indigo-700"
                  >
                    Save
                  </button>
                </div>
                <p className="text-[10px] text-slate-500 mt-1.5 leading-relaxed">
                  💡 <b>Office / Wi-Fi par:</b> Laptop ka IP address (default: <code className="text-slate-700 font-bold">http://192.168.0.150:5000</code>)<br/>
                  🌐 <b>Anywhere Internet:</b> Apna live server / cloud domain enter karein.
                </p>
              </div>
            )}
          </div>

        </div>

        {/* Customer Security Shield Banner */}
        <div className="mt-4 p-4 bg-emerald-950/90 border border-emerald-800/80 rounded-2xl text-white shadow-xl space-y-3">
          <div className="flex items-center gap-2 pb-2 border-b border-emerald-800/60">
            <ShieldCheck className="w-5 h-5 text-[#D4AF37]" />
            <div>
              <div className="text-xs font-black tracking-wide text-white">
                तरंगांजलि त्रिस्तरीय ग्राहक सुरक्षा कवच
              </div>
              <div className="text-[10px] text-emerald-300">
                100% Protected • 256-Bit SSL • Super Admin Governance
              </div>
            </div>
          </div>

          <div className="space-y-2 text-[11px] text-emerald-100">
            <div className="flex items-start gap-2 bg-emerald-900/60 p-2 rounded-xl border border-emerald-800/40">
              <span className="text-[#D4AF37] font-bold">1.</span>
              <div>
                <strong className="text-white block">सुपर एडमिन सुरक्षा (Maker-Checker):</strong>
                आपके खाते का नाम, मोबाइल या बैंक विवरण बिना सुपर एडमिन के प्रत्यक्ष सत्यापन और अनुमोदन के कोई नहीं बदल सकता।
              </div>
            </div>

            <div className="flex items-start gap-2 bg-emerald-900/60 p-2 rounded-xl border border-emerald-800/40">
              <span className="text-[#D4AF37] font-bold">2.</span>
              <div>
                <strong className="text-white block">256-बिट बैंक-ग्रेड एन्क्रिप्शन:</strong>
                आपकी समस्त जमा, ब्याज, एफडी व आरडी विवरण सुरक्षित सर्वर पर 256-बिट क्रिप्टोग्राफी से पूर्ण सुरक्षित है।
              </div>
            </div>

            <div className="flex items-start gap-2 bg-emerald-900/60 p-2 rounded-xl border border-emerald-800/40">
              <span className="text-[#D4AF37] font-bold">3.</span>
              <div>
                <strong className="text-white block">डिजिटल ई-रसीद गारंटी:</strong>
                प्रत्येक भुगतान व किस्त जमा पर तुरंत यूनिक रसीद संख्या (Receipt ID) व मुहर सहित डिजिटल रसीद मिलती है।
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="text-center text-xs text-slate-500 py-3">
          Safe & Encrypted 256-Bit Financial Client Portal • Powered by <strong className="text-slate-700">Crafted Reach ®</strong>
        </div>

        {/* Customer Forgot Password Modal */}
        {showCustomerForgotModal && (
          <div className="fixed inset-0 bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-2xl max-w-sm w-full p-5 shadow-2xl border border-slate-200 animate-fadeIn">
              <div className="flex justify-between items-center mb-4 pb-2 border-b border-slate-100">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-indigo-100 text-indigo-600 flex items-center justify-center font-bold">
                    <KeyRound className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-900 text-sm">Reset Client Password</h3>
                    <p className="text-[10px] text-slate-500">Verified Mobile OTP</p>
                  </div>
                </div>
                <button
                  onClick={() => setShowCustomerForgotModal(false)}
                  className="text-slate-400 hover:text-slate-600 p-1 cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Stepper Header */}
              <div className="flex items-center justify-between mb-4 px-3 text-[11px] font-bold text-slate-500">
                <span className={customerForgotStep >= 1 ? 'text-indigo-600' : ''}>1. Mobile</span>
                <span className="text-slate-300">→</span>
                <span className={customerForgotStep >= 2 ? 'text-indigo-600' : ''}>2. OTP</span>
                <span className="text-slate-300">→</span>
                <span className={customerForgotStep >= 3 ? 'text-indigo-600' : ''}>3. New Password</span>
              </div>

              {custForgotError && (
                <div className="mb-3 p-2 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-xl flex items-center gap-1.5">
                  <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                  <span>{custForgotError}</span>
                </div>
              )}

              {custForgotSuccess && (
                <div className="mb-3 p-2 bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs rounded-xl flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                  <span>{custForgotSuccess}</span>
                </div>
              )}

              {/* Step 1: Client ID / Mobile */}
              {customerForgotStep === 1 && (
                <form onSubmit={handleCustomerSendOtp} className="space-y-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Client ID or Registered Mobile
                    </label>
                    <input
                      type="text"
                      required
                      value={custForgotIdentifier}
                      onChange={(e) => setCustForgotIdentifier(e.target.value)}
                      placeholder="e.g. M00001 or 9897463367"
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:bg-white focus:ring-2 focus:ring-indigo-600"
                    />
                  </div>

                  <div className="p-2 bg-amber-50 border border-amber-200 rounded-xl text-[10px] text-amber-800">
                    <span className="font-bold">Gateway Notice:</span> Simulated SMS Mode Active. OTP will appear in prompt.
                  </div>

                  <div className="flex justify-end gap-2 pt-2">
                    <button
                      type="button"
                      onClick={() => setShowCustomerForgotModal(false)}
                      className="px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl cursor-pointer"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={custForgotLoading}
                      className="px-4 py-1.5 text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl shadow-md transition cursor-pointer disabled:opacity-50"
                    >
                      {custForgotLoading ? 'Sending...' : 'Send OTP'}
                    </button>
                  </div>
                </form>
              )}

              {/* Step 2: OTP Verification */}
              {customerForgotStep === 2 && (
                <form onSubmit={handleCustomerVerifyOtp} className="space-y-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Enter 6-Digit OTP Code
                    </label>
                    <input
                      type="text"
                      required
                      maxLength={6}
                      value={custOtpCode}
                      onChange={(e) => setCustOtpCode(e.target.value)}
                      placeholder="123456"
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-center text-lg font-mono font-bold tracking-widest text-slate-800 focus:bg-white focus:ring-2 focus:ring-indigo-600"
                    />
                    <div className="flex justify-between items-center text-[10px] text-slate-500 mt-1">
                      <span>Sent to: <b className="text-slate-700">{custMaskedPhone}</b></span>
                      <button
                        type="button"
                        onClick={handleCustomerSendOtp}
                        className="text-indigo-600 font-semibold hover:underline cursor-pointer flex items-center gap-0.5"
                      >
                        <RefreshCw className="w-3 h-3" /> Resend
                      </button>
                    </div>
                  </div>

                  {custDemoOtpHint && (
                    <div className="p-2 bg-indigo-50 border border-indigo-200 rounded-xl text-center text-xs text-indigo-900 font-medium">
                      Simulated OTP: <code className="font-mono font-bold bg-indigo-200 px-2 py-0.5 rounded text-indigo-950">{custDemoOtpHint}</code>
                    </div>
                  )}

                  <div className="flex justify-end gap-2 pt-2">
                    <button
                      type="button"
                      onClick={() => setCustomerForgotStep(1)}
                      className="px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl cursor-pointer"
                    >
                      Back
                    </button>
                    <button
                      type="submit"
                      disabled={custForgotLoading}
                      className="px-4 py-1.5 text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl shadow-md transition cursor-pointer disabled:opacity-50"
                    >
                      {custForgotLoading ? 'Verifying...' : 'Verify OTP'}
                    </button>
                  </div>
                </form>
              )}

              {/* Step 3: New Password */}
              {customerForgotStep === 3 && (
                <form onSubmit={handleCustomerResetPassword} className="space-y-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      New Password / PIN
                    </label>
                    <input
                      type="password"
                      required
                      minLength={4}
                      value={custNewPassword}
                      onChange={(e) => setCustNewPassword(e.target.value)}
                      placeholder="Minimum 4 characters"
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:bg-white focus:ring-2 focus:ring-indigo-600"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Confirm New Password / PIN
                    </label>
                    <input
                      type="password"
                      required
                      minLength={4}
                      value={custConfirmPassword}
                      onChange={(e) => setCustConfirmPassword(e.target.value)}
                      placeholder="Re-enter password"
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:bg-white focus:ring-2 focus:ring-indigo-600"
                    />
                  </div>

                  <div className="flex justify-end gap-2 pt-2">
                    <button
                      type="submit"
                      disabled={custForgotLoading}
                      className="w-full py-2 text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl shadow-md transition cursor-pointer disabled:opacity-50"
                    >
                      {custForgotLoading ? 'Saving...' : 'Save New Password & Sign In'}
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

  const { customer, stats, fds = [], upcomingPayouts = [], companySettings = {} } = portfolioData || {};
  const mustChangePassword = Boolean(customerUser?.must_change_password || customer?.must_change_password);

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col font-sans pb-20">
      
      {/* Mandatory First-Time Password Change Modal */}
      {mustChangePassword && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4 z-50 animate-fadeIn">
          <div className="bg-white rounded-3xl max-w-sm w-full p-6 shadow-2xl border border-slate-100">
            <div className="w-14 h-14 rounded-2xl bg-amber-100 text-amber-600 flex items-center justify-center mx-auto mb-4 shadow-sm">
              <KeyRound className="w-7 h-7" />
            </div>
            
            <div className="text-center mb-5">
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 uppercase tracking-wider inline-block mb-1">
                Security Requirement
              </span>
              <h3 className="text-lg font-black text-slate-900">Set Permanent Password</h3>
              <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                You logged in with an admin temporary password. For security compliance, please create your personal password before viewing your deposits.
              </p>
            </div>

            {forceChangeSuccess && (
              <div className="mb-4 p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs rounded-xl flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>{forceChangeSuccess}</span>
              </div>
            )}

            {forceChangeError && (
              <div className="mb-4 p-3 bg-rose-50 border border-rose-200 text-rose-800 text-xs rounded-xl flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                <span>{forceChangeError}</span>
              </div>
            )}

            <form onSubmit={handleForceChangePassword} className="space-y-3.5">
              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-600 mb-1">
                  Temporary Password
                </label>
                <input
                  type="password"
                  required
                  value={forceCurrentPassword}
                  onChange={(e) => setForceCurrentPassword(e.target.value)}
                  placeholder="Enter temporary password"
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:bg-white focus:ring-2 focus:ring-indigo-600"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-600 mb-1">
                  New Permanent Password (नया पासवर्ड)
                </label>
                <input
                  type="password"
                  required
                  minLength={4}
                  value={forceNewPassword}
                  onChange={(e) => setForceNewPassword(e.target.value)}
                  placeholder="Minimum 4 characters or digits"
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:bg-white focus:ring-2 focus:ring-indigo-600"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-600 mb-1">
                  Confirm New Password (पासवर्ड कन्फर्म करें)
                </label>
                <input
                  type="password"
                  required
                  minLength={4}
                  value={forceConfirmPassword}
                  onChange={(e) => setForceConfirmPassword(e.target.value)}
                  placeholder="Re-enter new password"
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:bg-white focus:ring-2 focus:ring-indigo-600"
                />
              </div>

              <div className="pt-2 space-y-2">
                <button
                  type="submit"
                  disabled={forceChangeLoading}
                  className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl text-xs shadow-md transition cursor-pointer disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {forceChangeLoading ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      <span>Updating Password...</span>
                    </>
                  ) : (
                    <>
                      <Check className="w-4 h-4" />
                      <span>Save & Open Passbook</span>
                    </>
                  )}
                </button>

                <button
                  type="button"
                  onClick={handleLogout}
                  className="w-full py-2 text-slate-500 hover:text-slate-800 text-xs font-semibold rounded-xl hover:bg-slate-100 transition cursor-pointer"
                >
                  Cancel & Sign Out
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      
      {/* App Mobile Header */}
      <header className="bg-[#062319] text-white sticky top-0 z-40 border-b border-[#134e38] shadow-md">
        <div className="max-w-md mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="bg-white rounded-lg p-1 shadow-sm border border-amber-300/60 shrink-0 flex items-center justify-center">
              <img 
                src="/tarpl_logo.png" 
                alt="TARANGANJALI" 
                className="object-contain"
                style={{ height: 28, width: 38 }}
              />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <h2 className="font-black text-sm tracking-tight text-white leading-tight truncate">
                  {customer?.full_name || 'My FD Account'}
                </h2>
                <span className="text-[8px] font-bold px-1 py-0.2 rounded bg-amber-400/20 text-[#FBBF24] border border-amber-400/40">
                  TARPL
                </span>
              </div>
              <span className="text-[10px] text-amber-200/90 font-mono truncate block">
                {customer?.customer_code} • {customer?.phone}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={onSwitchToStaffCRM}
              className="text-[10px] font-bold bg-[#082e20] hover:bg-[#0a3d2b] text-amber-200 border border-[#1a5d43] px-2.5 py-1.5 rounded-lg transition cursor-pointer"
            >
              CRM Portal
            </button>
            <button
              onClick={handleLogout}
              title="Logout from Customer App"
              className="flex items-center gap-1 text-[11px] font-bold bg-rose-600/20 hover:bg-rose-600 text-rose-300 hover:text-white border border-rose-500/40 px-2.5 py-1.5 rounded-lg transition cursor-pointer shadow-xs"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Logout</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Mobile App Container */}
      <main className="max-w-md w-full mx-auto p-4 flex-1 space-y-5">
        
        {loadingPortfolio && !portfolioData ? (
          <div className="py-24 text-center">
            <div className="inline-block w-8 h-8 border-4 border-[#0A5C36] border-t-transparent rounded-full animate-spin"></div>
            <p className="text-xs text-slate-500 mt-2 font-medium">Loading your portfolio...</p>
          </div>
        ) : (
          <>
            {/* 48-Hour Temporary Access Banner */}
            {(customer?.access_type === 'TEMPORARY' || customerUser?.access_type === 'TEMPORARY') && (
              <div id="customer-temp-access-banner" className="bg-gradient-to-r from-amber-50 to-orange-50 border-2 border-amber-300 rounded-2xl p-3.5 shadow-sm">
                <div className="flex items-start gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-amber-500 text-white flex items-center justify-center shrink-0 shadow-sm mt-0.5">
                    <Clock className="w-4 h-4 animate-pulse" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2 flex-wrap">
                      <span className="text-xs font-black text-amber-950 uppercase tracking-wide">
                        ⏱️ 48-Hour Preview Access
                      </span>
                      <span className="text-[11px] font-bold font-mono px-2 py-0.5 bg-amber-200 text-amber-900 rounded-full border border-amber-300">
                        {customer?.remaining_formatted || customerUser?.remaining_formatted || '48h Active'}
                      </span>
                    </div>
                    <p className="text-[11px] text-amber-900 mt-1 leading-relaxed">
                      Your online app preview is temporary. <strong>Financial Safety Guarantee:</strong> All your fixed deposits, savings balances, and interest payouts remain 100% secure in the branch core ledger even after app access expires.
                    </p>
                    {customer?.expires_at && (
                      <div className="text-[10px] text-amber-800 font-medium mt-1.5 flex items-center gap-1">
                        <span>Valid until:</span>
                        <code className="font-mono font-bold bg-white/70 px-1.5 py-0.5 rounded text-amber-950">
                          {formatDate(customer.expires_at)}
                        </code>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* VIEW 1: HOME DASHBOARD */}
            {currentNav === 'home' && (
              <div className="space-y-4">
                
                {/* Total Wealth Highlight Card (Private Wealth Digital Passbook in Dark Forest Green & Gold) */}
                <div className="bg-[#082e20] text-white rounded-3xl p-6 shadow-xl border border-[#1a5d43] relative overflow-hidden">
                  <div className="absolute top-0 right-0 w-64 h-64 bg-[#D4AF37]/10 rounded-full blur-2xl pointer-events-none -mr-16 -mt-16"></div>

                  <div className="relative z-10 flex justify-between items-start">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] uppercase font-bold tracking-widest text-[#FDE68A] bg-[#062319]/90 px-2.5 py-0.5 rounded-full border border-[#D4AF37]/40">
                          Digital Passbook
                        </span>
                        {customer?.is_senior_citizen && (
                          <span className="text-[10px] font-bold text-amber-300 bg-amber-950/80 px-2 py-0.5 rounded-full border border-amber-500/30">
                            Senior Citizen (+0.50%)
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-emerald-200 mt-2 font-medium">Consolidated Principal Balance</p>
                      <div className="text-3xl font-black mt-0.5 tracking-tight font-mono text-[#FBBF24]">
                        {formatINR(stats?.totalPrincipal)}
                      </div>
                    </div>

                    <div className="text-right">
                      <span className="text-[10px] text-[#D4AF37] font-bold block uppercase tracking-wider">Active Portfolio</span>
                      <span className="text-base font-bold text-white bg-[#062319] px-3 py-1 rounded-xl inline-block mt-1 border border-[#1a5d43] font-mono">
                        {stats?.activeCount} Active FDs
                      </span>
                    </div>
                  </div>

                  <div className="relative z-10 grid grid-cols-2 gap-3 mt-5 pt-5 border-t border-[#1a5d43] text-xs">
                    <div className="bg-[#062319]/90 p-3 rounded-2xl border border-[#1a5d43]">
                      <span className="text-[10px] text-emerald-200 block font-medium">Guaranteed Maturity Value</span>
                      <span className="text-base font-bold text-white font-mono mt-0.5 block">{formatINR(stats?.totalMaturity)}</span>
                    </div>
                    <div className="bg-[#062319]/90 p-3 rounded-2xl border border-[#1a5d43]">
                      <span className="text-[10px] text-amber-200 block font-medium">Accrued Interest Gain</span>
                      <span className="text-base font-bold text-[#FBBF24] font-mono mt-0.5 block">+{formatINR(stats?.totalInterest)}</span>
                    </div>
                  </div>
                </div>

                {/* Quick Action Shortcuts */}
                <div className="grid grid-cols-4 gap-2 text-center text-xs font-semibold">
                  <button
                    onClick={() => {
                      setPaymentReceipt(null);
                      setPayModalOpen(true);
                    }}
                    className="p-2.5 bg-gradient-to-br from-emerald-600 to-teal-700 text-white rounded-2xl shadow-sm hover:shadow-md transition cursor-pointer flex flex-col items-center gap-1 relative overflow-hidden"
                  >
                    <div className="p-1.5 bg-white/20 text-white rounded-xl">
                      <CreditCard className="w-4 h-4" />
                    </div>
                    <span className="text-[10px] font-bold">Pay / Deposit</span>
                    <span className="text-[7px] bg-[#FBBF24] text-[#062319] px-1 rounded-full font-black uppercase">UPI/QR</span>
                  </button>

                  <button
                    onClick={() => setCurrentNav('fds')}
                    className="p-2.5 bg-white rounded-2xl border border-slate-200 shadow-sm hover:bg-slate-50 transition cursor-pointer flex flex-col items-center gap-1.5"
                  >
                    <div className="p-1.5 bg-indigo-50 text-indigo-600 rounded-xl">
                      <FileText className="w-4 h-4" />
                    </div>
                    <span className="text-[10px] text-slate-800 font-semibold">Receipts</span>
                  </button>

                  <button
                    onClick={() => setCurrentNav('invest')}
                    className="p-2.5 bg-white rounded-2xl border border-slate-200 shadow-sm hover:bg-slate-50 transition cursor-pointer flex flex-col items-center gap-1.5"
                  >
                    <div className="p-1.5 bg-amber-50 text-amber-600 rounded-xl">
                      <PlusCircle className="w-4 h-4" />
                    </div>
                    <span className="text-[10px] text-slate-800 font-semibold">Invest</span>
                  </button>

                  <button
                    onClick={() => setCurrentNav('calc')}
                    className="p-2.5 bg-white rounded-2xl border border-slate-200 shadow-sm hover:bg-slate-50 transition cursor-pointer flex flex-col items-center gap-1.5"
                  >
                    <div className="p-1.5 bg-blue-50 text-blue-600 rounded-xl">
                      <CalcIcon className="w-4 h-4" />
                    </div>
                    <span className="text-[10px] text-slate-800 font-semibold">Calculator</span>
                  </button>
                </div>

                {/* Active Fixed Deposits Carousel / List */}
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <h3 className="font-bold text-slate-800 text-sm">My Active Fixed Deposits</h3>
                    <button
                      onClick={() => setCurrentNav('fds')}
                      className="text-xs font-bold text-indigo-600"
                    >
                      View All &rarr;
                    </button>
                  </div>

                  {fds.map((fd) => (
                    <div 
                      key={fd.id}
                      className="bg-white rounded-2xl p-4 border border-slate-200 shadow-sm space-y-3"
                    >
                      <div className="flex justify-between items-start">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-indigo-700 text-sm">{fd.fd_number}</span>
                            <span className="text-[10px] font-bold bg-emerald-100 text-emerald-800 px-2 py-0.2 rounded-full">
                              {fd.status}
                            </span>
                          </div>
                          <span className="text-[11px] text-slate-500 block mt-0.5">
                            {fd.tenure_months} Months • {fd.annual_rate}% p.a.
                          </span>
                        </div>

                        <div className="text-right">
                          <span className="text-[10px] text-slate-400 block font-bold">Principal</span>
                          <span className="text-base font-black text-slate-900">{formatINR(fd.principal_amount)}</span>
                        </div>
                      </div>

                      <div className="p-2.5 bg-slate-50 rounded-xl flex justify-between items-center text-xs">
                        <div>
                          <span className="text-[10px] text-slate-400 block">Maturity Date</span>
                          <span className="font-bold text-slate-800">{formatDate(fd.maturity_date)}</span>
                        </div>
                        <div className="text-right">
                          <span className="text-[10px] text-slate-400 block">Maturity Amount</span>
                          <span className="font-black text-emerald-700 text-sm">{formatINR(fd.maturity_amount)}</span>
                        </div>
                      </div>

                      <div className="flex justify-end gap-2 pt-1">
                        <button
                          onClick={() => onPrintCertificate(fd.id)}
                          className="px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-bold rounded-xl text-xs transition flex items-center gap-1.5 cursor-pointer"
                        >
                          <Printer className="w-3.5 h-3.5" />
                          FD Certificate / Receipt
                        </button>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Upcoming Payouts / Passbook */}
                {upcomingPayouts.length > 0 && (
                  <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-sm space-y-3">
                    <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                      <div className="flex items-center gap-2">
                        <Clock className="w-4 h-4 text-emerald-600" />
                        <h4 className="font-bold text-slate-800 text-xs">Upcoming Interest Credits to Bank</h4>
                      </div>
                      <span className="text-[10px] font-bold bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full">
                        {upcomingPayouts.length} Due
                      </span>
                    </div>

                    <div className="space-y-2 text-xs">
                      {upcomingPayouts.slice(0, 3).map((item) => (
                        <div key={item.id} className="p-2.5 bg-slate-50 rounded-xl flex justify-between items-center">
                          <div>
                            <span className="font-bold text-slate-800 block">{formatDate(item.payout_date)}</span>
                            <span className="text-[10px] text-slate-400">FD: {item.fd_number} (Period #{item.period_no})</span>
                          </div>
                          <span className="text-emerald-700 font-black text-sm">+{formatINR(item.payout_amount)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

              </div>
            )}

            {/* VIEW 2: ALL FDs & CERTIFICATES */}
            {currentNav === 'fds' && (
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <h2 className="text-base font-bold text-slate-900">My Fixed Deposit Accounts</h2>
                  <span className="text-xs font-semibold text-slate-500">{fds.length} Total</span>
                </div>

                {fds.map((fd) => (
                  <div key={fd.id} className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm space-y-4">
                    <div className="flex justify-between items-start">
                      <div>
                        <span className="font-bold text-indigo-700 text-base">{fd.fd_number}</span>
                        <p className="text-xs text-slate-500 mt-0.5">{fd.remarks || 'Standard Fixed Deposit'}</p>
                      </div>
                      <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800">
                        {fd.status}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-xs bg-slate-50 p-3 rounded-xl">
                      <div>
                        <span className="text-slate-400 text-[10px] block">Deposit Amount</span>
                        <span className="font-black text-slate-900 text-sm">{formatINR(fd.principal_amount)}</span>
                      </div>
                      <div>
                        <span className="text-slate-400 text-[10px] block">Interest Rate</span>
                        <span className="font-bold text-emerald-600 text-sm">{fd.annual_rate}% p.a.</span>
                      </div>
                      <div>
                        <span className="text-slate-400 text-[10px] block">Booking Date</span>
                        <span className="font-semibold text-slate-700">{formatDate(fd.start_date)}</span>
                      </div>
                      <div>
                        <span className="text-slate-400 text-[10px] block">Maturity Date</span>
                        <span className="font-bold text-rose-700">{formatDate(fd.maturity_date)}</span>
                      </div>
                    </div>

                    <div className="flex justify-between items-center pt-2 border-t border-slate-100">
                      <div>
                        <span className="text-[10px] text-slate-400 block font-bold uppercase">Maturity Amount</span>
                        <span className="text-lg font-black text-emerald-700">{formatINR(fd.maturity_amount)}</span>
                      </div>

                      <button
                        onClick={() => onPrintCertificate(fd.id)}
                        className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl text-xs shadow-md transition flex items-center gap-1.5 cursor-pointer"
                      >
                        <Printer className="w-4 h-4" />
                        Download Receipt
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* VIEW 3: LIVE FD CALCULATOR */}
            {currentNav === 'calc' && (
              <div className="bg-white rounded-3xl p-5 border border-slate-200 shadow-sm space-y-4">
                <div className="border-b border-slate-100 pb-3">
                  <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                    <CalcIcon className="w-5 h-5 text-indigo-600" />
                    Live FD Returns Calculator
                  </h2>
                  <p className="text-xs text-slate-500 mt-0.5">Check how much your savings will grow</p>
                </div>

                <div className="space-y-3 text-xs">
                  <div>
                    <label className="block font-semibold text-slate-600 mb-1">Deposit Amount (जमा राशि ₹)</label>
                    <input
                      type="number"
                      step="10000"
                      value={calcAmount}
                      onChange={(e) => setCalcAmount(Number(e.target.value))}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-base font-bold text-slate-900"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block font-semibold text-slate-600 mb-1">Interest Rate (%)</label>
                      <input
                        type="number"
                        step="0.1"
                        value={calcRate}
                        onChange={(e) => setCalcRate(parseFloat(e.target.value) || 0)}
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-bold"
                      />
                    </div>
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="block font-semibold text-slate-600">Tenure (अवधि)</label>
                      </div>
                      <select
                        value={[12, 24, 36, 60].includes(calcMonths) ? calcMonths : 'custom'}
                        onChange={(e) => {
                          const val = e.target.value;
                          if (val !== 'custom') {
                            setCalcMonths(parseInt(val) || 12);
                          } else {
                            if ([12, 24, 36, 60].includes(calcMonths)) {
                              setCalcMonths(18); // default custom
                            }
                          }
                        }}
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-semibold cursor-pointer text-xs"
                      >
                        <option value="12">12 Months (1 Year)</option>
                        <option value="24">24 Months (2 Years)</option>
                        <option value="36">36 Months (3 Years)</option>
                        <option value="60">60 Months (5 Years)</option>
                        <option value="custom">Custom Tenure (कस्टम अवधि)</option>
                      </select>
                      {(![12, 24, 36, 60].includes(calcMonths)) && (
                        <div className="mt-2 relative">
                          <input
                            type="number"
                            min="1"
                            max="360"
                            value={calcMonths}
                            onChange={(e) => setCalcMonths(Math.max(1, parseInt(e.target.value) || 1))}
                            className="w-full px-3 py-1.5 bg-amber-50/60 border border-amber-300 rounded-lg font-bold text-xs"
                            placeholder="Enter custom months"
                          />
                          <span className="absolute right-3 top-1.5 text-xs text-slate-500 font-semibold">
                            Months ({((calcMonths || 0) / 12).toFixed(1)} Yrs)
                          </span>
                        </div>
                      )}
                    </div>
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-600 mb-1">Scheme Type</label>
                    <select
                      value={calcFreq}
                      onChange={(e) => setCalcFreq(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-semibold cursor-pointer"
                    >
                      <option value="quarterly">Quarterly Compounding (Cumulative)</option>
                      <option value="monthly">Monthly Compounding</option>
                      <option value="payout_monthly">Monthly Pension Payout</option>
                      <option value="simple">Simple Interest at Maturity</option>
                    </select>
                  </div>
                </div>

                {calcResult && (
                  <div className="bg-indigo-900 text-white p-4 rounded-2xl space-y-2 mt-4 text-xs">
                    <div className="flex justify-between items-center border-b border-indigo-800 pb-2">
                      <span className="text-indigo-200">Maturity Amount:</span>
                      <span className="text-xl font-black text-amber-300">{formatINR(calcResult.maturityAmount)}</span>
                    </div>
                    <div className="flex justify-between items-center text-slate-200">
                      <span>Total Interest Gains:</span>
                      <span className="font-bold text-emerald-400">+{formatINR(calcResult.totalInterest)}</span>
                    </div>
                    <div className="flex justify-between items-center text-slate-200">
                      <span>Maturity Date:</span>
                      <span className="font-semibold">{formatDate(calcResult.maturityDate)}</span>
                    </div>
                  </div>
                )}

                <button
                  onClick={() => {
                    setInvestAmount(calcAmount);
                    setInvestTenure(calcMonths);
                    setInvestFreq(calcFreq);
                    setCurrentNav('invest');
                  }}
                  className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl text-xs transition cursor-pointer"
                >
                  Apply For This FD &rarr;
                </button>
              </div>
            )}

            {/* VIEW 4: BRANCH CONTACT & INQUIRY DESK (STRICTLY VIEW-ONLY) */}
            {currentNav === 'invest' && (
              <div className="bg-white rounded-3xl p-5 border border-slate-200 shadow-sm space-y-4">
                <div className="border-b border-slate-100 pb-3">
                  <div className="flex items-center gap-2">
                    <Building2 className="w-5 h-5 text-indigo-600" />
                    <h2 className="text-base font-bold text-slate-900">Branch Deposit Desk</h2>
                  </div>
                  <p className="text-xs text-slate-500 mt-0.5">Strictly View-Only Digital Passbook</p>
                </div>

                <div className="p-4 bg-indigo-50/80 border border-indigo-100 rounded-2xl text-slate-700 space-y-2 text-xs">
                  <div className="flex items-center gap-2 text-indigo-900 font-bold">
                    <ShieldCheck className="w-4 h-4 text-indigo-600" />
                    <span>Authorized Maker-Checker Protocol</span>
                  </div>
                  <p className="text-slate-600 leading-relaxed">
                    To maintain strict institutional dual custody and regulatory security, all new Fixed Deposits, Recurring Deposits, MIS pension plans, and Savings Accounts must be executed through an authorized branch desk.
                  </p>
                </div>

                <div className="space-y-3 pt-2 text-xs">
                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Main Operations Branch</span>
                    <strong className="text-slate-900 text-sm block mt-0.5">{companySettings?.company_name || 'Fixed Deposit Wealth Management Desk'}</strong>
                    <p className="text-slate-500 text-xs mt-1">{companySettings?.address || 'Vedic Vihar, Civil Line-I, Near Ayushman Hospital, Kiratpur Road, Bijnor, Uttar Pradesh - 246701'}</p>
                  </div>

                  <div className="grid grid-cols-2 gap-2.5">
                    <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Helpline Phone</span>
                      <strong className="text-slate-900 font-mono mt-0.5 block">{companySettings?.phone || '+91 98111 22334'}</strong>
                    </div>
                    <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Official Email</span>
                      <strong className="text-slate-900 truncate block mt-0.5">{companySettings?.email || 'support@fdcrm.com'}</strong>
                    </div>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setCurrentNav('fds')}
                  className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl text-xs transition cursor-pointer"
                >
                  View My Active Deposit Receipts &rarr;
                </button>
              </div>
            )}

            {/* VIEW 5: PROFILE & KYC */}
            {currentNav === 'profile' && (
              <div className="bg-white rounded-3xl p-5 border border-slate-200 shadow-sm space-y-4">
                <div className="border-b border-slate-100 pb-3">
                  <h2 className="text-base font-bold text-slate-900">My Registered Profile & KYC</h2>
                  <p className="text-xs text-slate-500 mt-0.5">Verified customer records</p>
                </div>

                <div className="space-y-3 text-xs">
                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-1.5">
                    <p><span className="text-slate-400">Full Name:</span> <strong className="text-slate-800">{customer?.full_name}</strong></p>
                    <p><span className="text-slate-400">Mobile Phone:</span> <span className="text-slate-800 font-mono">{customer?.phone}</span></p>
                    <p><span className="text-slate-400">PAN Card:</span> <strong className="font-mono text-slate-900">{customer?.pan_card || 'Verified'}</strong></p>
                    <p><span className="text-slate-400">Repayment Bank:</span> <span className="font-semibold text-slate-800">{customer?.bank_name} (A/c: {customer?.account_no})</span></p>
                    <p><span className="text-slate-400">Nominee:</span> <strong className="text-slate-800">{customer?.nominee_name} ({customer?.nominee_relation})</strong></p>
                  </div>

                  <form onSubmit={handleSaveProfile} className="space-y-3 pt-2">
                    <span className="font-bold text-slate-800 block text-xs">Update Contact Information:</span>
                    <div>
                      <label className="block text-slate-500 mb-1">Email ID</label>
                      <input
                        type="email"
                        value={profileEmail}
                        onChange={(e) => setProfileEmail(e.target.value)}
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl"
                      />
                    </div>

                    <div>
                      <label className="block text-slate-500 mb-1">Address</label>
                      <input
                        type="text"
                        value={profileAddress}
                        onChange={(e) => setProfileAddress(e.target.value)}
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl"
                      />
                    </div>

                    <button
                      type="submit"
                      disabled={savingProfile}
                      className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl transition cursor-pointer"
                    >
                      {savingProfile ? 'Saving...' : 'Update Details'}
                    </button>
                  </form>

                  {/* ======================================================== */}
                  {/* PROFILE & NAME CORRECTION REQUEST (SUPER ADMIN APPROVAL) */}
                  {/* ======================================================== */}
                  <div className="pt-4 border-t border-slate-200 space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5">
                        <Edit3 className="w-4 h-4 text-purple-600" />
                        <span className="font-bold text-slate-900 text-xs">Request Profile Correction / Name Change</span>
                      </div>
                      <span className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-purple-100 text-purple-900 border border-purple-200">
                        Super Admin Approval
                      </span>
                    </div>

                    <p className="text-[11px] text-slate-600 leading-relaxed bg-amber-50 p-2.5 rounded-xl border border-amber-200">
                      🛡️ <strong>सुरक्षा सूचना:</strong> नाम में सुधार (Name Change), मोबाइल नंबर, नॉमिनी या बैंक खाता विवरण बदलने का अनुरोध सीधे <strong>सुपर एडमिन (Checker)</strong> के पास अनुमोदन हेतु जाता है। सुपर एडमिन द्वारा सत्यापन और स्वीकृति के बाद ही आपका रिकॉर्ड लाइव अपडेट होगा।
                    </p>

                    {correctionSuccess && (
                      <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-800 text-xs font-semibold flex items-center gap-2">
                        <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                        <span>{correctionSuccess}</span>
                      </div>
                    )}

                    {correctionError && (
                      <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-800 text-xs font-semibold flex items-center gap-2">
                        <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                        <span>{correctionError}</span>
                      </div>
                    )}

                    <form onSubmit={handleSubmitCorrection} className="p-3 bg-slate-50 rounded-2xl border border-slate-200 space-y-2.5">
                      <div>
                        <label className="block text-[11px] font-bold text-slate-700 mb-1">संशोधन का क्षेत्र (Field to Correct):</label>
                        <select
                          value={correctionField}
                          onChange={(e) => {
                            setCorrectionField(e.target.value);
                            setCorrectionNewVal('');
                          }}
                          className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-semibold text-slate-800 focus:ring-2 focus:ring-purple-500"
                        >
                          <option value="full_name">Customer Full Name (नाम में सुधार / Name Change)</option>
                          <option value="phone">Mobile Phone (मोबाइल नंबर)</option>
                          <option value="father_name">Father / Husband Name (पिता/पति का नाम)</option>
                          <option value="nominee_name">Nominee Name (नॉमिनी का नाम)</option>
                          <option value="nominee_relation">Nominee Relation (नॉमिनी से संबंध)</option>
                          <option value="account_no">Bank Account Number (बैंक खाता संख्या)</option>
                          <option value="ifsc_code">Bank IFSC Code (बैंक IFSC कोड)</option>
                          <option value="address">Permanent Address (स्थाई पता)</option>
                        </select>
                      </div>

                      <div className="p-2 bg-white rounded-xl border border-slate-200 text-xs">
                        <span className="text-[10px] text-slate-400 block uppercase font-bold">Current Record (मौजूदा विवरण):</span>
                        <span className="font-bold text-slate-800 font-mono text-xs">
                          {customer?.[correctionField] || '(खाली / Not Set)'}
                        </span>
                      </div>

                      <div>
                        <label className="block text-[11px] font-bold text-slate-700 mb-1">नया सही विवरण (Requested New Value):</label>
                        <input
                          type="text"
                          required
                          value={correctionNewVal}
                          onChange={(e) => setCorrectionNewVal(e.target.value)}
                          placeholder="उदा. आधार कार्ड के अनुसार सही नाम"
                          className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-semibold text-slate-800 focus:ring-2 focus:ring-purple-500"
                        />
                      </div>

                      <div>
                        <label className="block text-[11px] font-bold text-slate-700 mb-1">संशोधन का कारण (Reason / Document Note):</label>
                        <input
                          type="text"
                          value={correctionReason}
                          onChange={(e) => setCorrectionReason(e.target.value)}
                          placeholder="उदा. आधार कार्ड के अनुसार स्पेलिंग सुधार"
                          className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs text-slate-800 focus:ring-2 focus:ring-purple-500"
                        />
                      </div>

                      <button
                        type="submit"
                        disabled={correctionSubmitting}
                        className="w-full py-2.5 bg-purple-700 hover:bg-purple-800 text-white font-bold rounded-xl text-xs transition shadow-sm cursor-pointer flex items-center justify-center gap-1.5"
                      >
                        <Send className="w-3.5 h-3.5" />
                        <span>{correctionSubmitting ? 'भेजा जा रहा है...' : 'Send Request to Super Admin (सत्यापन हेतु भेजें)'}</span>
                      </button>
                    </form>

                    {/* Correction Requests Status History */}
                    {correctionRequestsList.length > 0 && (
                      <div className="space-y-2 pt-2">
                        <span className="font-bold text-slate-800 block text-xs">मेरे पूर्व संशोधन अनुरोध (Correction Requests History):</span>
                        <div className="divide-y divide-slate-100 border border-slate-200 rounded-xl overflow-hidden text-xs">
                          {correctionRequestsList.map(req => (
                            <div key={req.id} className="p-2.5 bg-white space-y-1">
                              <div className="flex justify-between items-center">
                                <span className="font-mono font-bold text-[11px] text-slate-900">{req.request_number}</span>
                                <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                  req.status === 'APPROVED' ? 'bg-emerald-100 text-emerald-800' :
                                  req.status === 'REJECTED' ? 'bg-rose-100 text-rose-800' :
                                  'bg-amber-100 text-amber-800'
                                }`}>
                                  {req.status === 'APPROVED' ? '✅ Approved by Super Admin' :
                                   req.status === 'REJECTED' ? '❌ Rejected' : '⏳ Pending Super Admin Approval'}
                                </span>
                              </div>
                              <div className="text-[11px] text-slate-600">
                                <strong>{req.field_label || req.field}:</strong> <span className="line-through text-rose-500">{req.old_value || '(खाली)'}</span> ➔ <span className="text-emerald-700 font-bold">{req.new_value}</span>
                              </div>
                              {req.decision_notes && (
                                <div className="text-[10px] text-slate-500 italic">
                                  Super Admin Note: {req.decision_notes}
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Voluntary Change Password Section */}
                  <div className="pt-4 border-t border-slate-200">
                    <button
                      type="button"
                      onClick={() => setShowProfileChangePass(!showProfileChangePass)}
                      className="flex items-center justify-between w-full p-3 bg-slate-50 hover:bg-slate-100 rounded-xl border border-slate-200 text-left transition cursor-pointer"
                    >
                      <div className="flex items-center gap-2 text-slate-800 font-bold">
                        <KeyRound className="w-4 h-4 text-indigo-600" />
                        <span>Change App Password / PIN</span>
                      </div>
                      <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform ${showProfileChangePass ? 'rotate-180' : ''}`} />
                    </button>

                    {showProfileChangePass && (
                      <form onSubmit={handleProfileChangePassword} className="mt-3 p-4 bg-white rounded-xl border border-slate-200 space-y-3">
                        {profPassSuccess && (
                          <div className="p-2.5 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs rounded-lg flex items-center gap-2">
                            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                            <span>{profPassSuccess}</span>
                          </div>
                        )}
                        {profPassError && (
                          <div className="p-2.5 bg-rose-50 border border-rose-200 text-rose-800 text-xs rounded-lg flex items-center gap-2">
                            <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                            <span>{profPassError}</span>
                          </div>
                        )}
                        <div>
                          <label className="block text-slate-600 text-xs font-semibold mb-1">Current Password</label>
                          <input
                            type="password"
                            required
                            value={profOldPassword}
                            onChange={(e) => setProfOldPassword(e.target.value)}
                            className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs"
                            placeholder="Current password"
                          />
                        </div>
                        <div>
                          <label className="block text-slate-600 text-xs font-semibold mb-1">New Password (नया पासवर्ड)</label>
                          <input
                            type="password"
                            required
                            minLength={4}
                            value={profNewPassword}
                            onChange={(e) => setProfNewPassword(e.target.value)}
                            className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs"
                            placeholder="Minimum 4 characters"
                          />
                        </div>
                        <div>
                          <label className="block text-slate-600 text-xs font-semibold mb-1">Confirm New Password</label>
                          <input
                            type="password"
                            required
                            minLength={4}
                            value={profConfirmPassword}
                            onChange={(e) => setProfConfirmPassword(e.target.value)}
                            className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs"
                            placeholder="Re-enter new password"
                          />
                        </div>
                        <button
                          type="submit"
                          disabled={profPassLoading}
                          className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl transition cursor-pointer text-xs shadow-sm"
                        >
                          {profPassLoading ? 'Updating Password...' : 'Save New Password'}
                        </button>
                      </form>
                    )}
                  </div>
                </div>
              </div>
            )}
          </>
        )}

        {/* ======================================================== */}
        {/* IN-APP ONLINE PAYMENT & DIGITAL E-RECEIPT MODAL          */}
        {/* ======================================================== */}
        {payModalOpen && (
          <div className="fixed inset-0 bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fadeIn">
            <div className="bg-white rounded-3xl max-w-md w-full p-5 space-y-4 shadow-2xl border border-slate-100 max-h-[90vh] overflow-y-auto">
              
              {/* Receipt View (Shown after successful payment) */}
              {paymentReceipt ? (
                <div className="space-y-4 text-center">
                  <div className="w-12 h-12 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto shadow-sm">
                    <CheckCircle2 className="w-7 h-7" />
                  </div>
                  
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-800 bg-emerald-100 px-2.5 py-0.5 rounded-full">
                      Payment Successful & Synced
                    </span>
                    <h3 className="text-xl font-black text-slate-900 mt-1">Taranganjali Digital E-Receipt</h3>
                    <p className="text-xs text-slate-400">जीत आपके विश्वास की</p>
                  </div>

                  {/* Printable E-Receipt Card */}
                  <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 text-left text-xs space-y-2.5 shadow-inner">
                    <div className="flex justify-between items-center border-b border-slate-200 pb-2">
                      <span className="text-slate-400 text-[10px]">रसीद संख्या (Receipt No):</span>
                      <strong className="font-mono text-slate-900 text-xs">{paymentReceipt.receipt_no}</strong>
                    </div>

                    <div className="flex justify-between items-center border-b border-slate-200 pb-2">
                      <span className="text-slate-400 text-[10px]">खाताधारक (Depositor):</span>
                      <strong className="text-slate-800 text-xs">{paymentReceipt.customer_name} ({paymentReceipt.customer_code})</strong>
                    </div>

                    <div className="flex justify-between items-center border-b border-slate-200 pb-2">
                      <span className="text-slate-400 text-[10px]">भुगतान का प्रकार (Purpose):</span>
                      <span className="font-bold text-indigo-700">{paymentReceipt.purpose}</span>
                    </div>

                    <div className="flex justify-between items-center border-b border-slate-200 pb-2">
                      <span className="text-slate-400 text-[10px]">भुगतान माध्यम (Mode):</span>
                      <span className="px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 font-bold text-[10px]">
                        {paymentReceipt.payment_mode}
                      </span>
                    </div>

                    <div className="flex justify-between items-center border-b border-slate-200 pb-2">
                      <span className="text-slate-400 text-[10px]">UTR / Ref No:</span>
                      <span className="font-mono font-bold text-slate-700">{paymentReceipt.utr_reference}</span>
                    </div>

                    <div className="pt-1 flex justify-between items-center text-sm">
                      <span className="font-bold text-slate-700">कुल जमा राशि (Amount Paid):</span>
                      <span className="font-black text-emerald-700 text-lg font-mono">
                        {formatINR(paymentReceipt.amount)}
                      </span>
                    </div>

                    <div className="pt-2 text-[10px] text-slate-400 text-center border-t border-slate-200">
                      यह रसीद तरंगांजलि रियल टेक प्रा. लि. के कोर बैंकिंग लेजर में दर्ज हो चुकी है।
                    </div>
                  </div>

                  <div className="flex gap-2 pt-2">
                    <button
                      onClick={() => window.print()}
                      className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold rounded-xl text-xs transition cursor-pointer flex items-center justify-center gap-1.5"
                    >
                      <Printer className="w-3.5 h-3.5" />
                      <span>Print Receipt</span>
                    </button>
                    <button
                      onClick={() => {
                        setPaymentReceipt(null);
                        setPayModalOpen(false);
                      }}
                      className="flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs transition shadow-md cursor-pointer"
                    >
                      Done / पूरा हुआ
                    </button>
                  </div>
                </div>
              ) : (
                /* Payment Form View */
                <form onSubmit={handleMakePayment} className="space-y-4">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold">
                        <CreditCard className="w-4 h-4" />
                      </div>
                      <div>
                        <h3 className="text-sm font-bold text-slate-900">Taranganjali Instant Pay</h3>
                        <p className="text-[10px] text-slate-400">UPI / QR व बैंक से ऑनलाइन जमा करें</p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setPayModalOpen(false)}
                      className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 cursor-pointer"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>

                  {/* 1. Purpose Selector */}
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">
                      भुगतान का प्रकार चुनें (Payment Purpose):
                    </label>
                    <select
                      value={payPurpose}
                      onChange={(e) => setPayPurpose(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-semibold text-slate-800 focus:ring-2 focus:ring-emerald-500 cursor-pointer"
                    >
                      <option value="RD_INSTALLMENT">RD Monthly Installment (आरडी मासिक किस्त)</option>
                      <option value="SAVINGS_DEPOSIT">Savings Account Deposit (बचत खाते में जमा)</option>
                      <option value="LOAN_EMI">Loan EMI / Repayment (ऋण की किस्त)</option>
                      <option value="NEW_INVESTMENT">New Term Deposit (नया फिक्स डिपॉजिट)</option>
                    </select>
                  </div>

                  {/* 2. Amount Input & Quick Pills */}
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">
                      जमा राशि (Amount in ₹):
                    </label>
                    <div className="relative">
                      <span className="absolute left-3 top-2 font-bold text-slate-400 text-sm">₹</span>
                      <input
                        type="number"
                        min="100"
                        step="100"
                        required
                        value={payAmount}
                        onChange={(e) => setPayAmount(e.target.value)}
                        className="w-full pl-8 pr-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-sm font-black text-slate-900 font-mono focus:ring-2 focus:ring-emerald-500"
                      />
                    </div>
                    <div className="flex gap-1.5 mt-2 flex-wrap">
                      {[500, 1000, 2000, 5000, 10000].map(amt => (
                        <button
                          key={amt}
                          type="button"
                          onClick={() => setPayAmount(amt)}
                          className={`px-2 py-0.5 rounded-lg text-[10px] font-bold transition cursor-pointer ${
                            Number(payAmount) === amt
                              ? 'bg-emerald-600 text-white shadow-xs'
                              : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                          }`}
                        >
                          ₹{amt.toLocaleString('en-IN')}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* 3. Payment Mode Tabs */}
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">
                      भुगतान का माध्यम (Payment Method):
                    </label>
                    <div className="grid grid-cols-2 gap-2 text-xs font-bold">
                      <button
                        type="button"
                        onClick={() => setPayMode('UPI')}
                        className={`p-2 rounded-xl border flex items-center justify-center gap-1.5 transition cursor-pointer ${
                          payMode === 'UPI'
                            ? 'bg-emerald-50 border-emerald-500 text-emerald-800 shadow-xs'
                            : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                        }`}
                      >
                        <QrCode className="w-4 h-4 text-emerald-600" />
                        <span>UPI / QR Scan</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setPayMode('NET_BANKING')}
                        className={`p-2 rounded-xl border flex items-center justify-center gap-1.5 transition cursor-pointer ${
                          payMode === 'NET_BANKING'
                            ? 'bg-blue-50 border-blue-500 text-blue-800 shadow-xs'
                            : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                        }`}
                      >
                        <Building2 className="w-4 h-4 text-blue-600" />
                        <span>Bank Transfer</span>
                      </button>
                    </div>
                  </div>

                  {/* Payment Details Container */}
                  {payMode === 'UPI' ? (
                    <div className="p-3 bg-emerald-50/70 rounded-2xl border border-emerald-200 text-center space-y-2">
                      <div className="inline-block p-2 bg-white rounded-xl shadow-xs border border-emerald-200">
                        {/* Mock SVG QR Code */}
                        <svg className="w-24 h-24 mx-auto" viewBox="0 0 100 100" fill="currentColor">
                          <rect width="100" height="100" fill="white" />
                          <rect x="5" y="5" width="25" height="25" fill="#062319" />
                          <rect x="9" y="9" width="17" height="17" fill="white" />
                          <rect x="13" y="13" width="9" height="9" fill="#062319" />
                          
                          <rect x="70" y="5" width="25" height="25" fill="#062319" />
                          <rect x="74" y="9" width="17" height="17" fill="white" />
                          <rect x="78" y="13" width="9" height="9" fill="#062319" />

                          <rect x="5" y="70" width="25" height="25" fill="#062319" />
                          <rect x="9" y="74" width="17" height="17" fill="white" />
                          <rect x="13" y="78" width="9" height="9" fill="#062319" />

                          <rect x="35" y="10" width="5" height="15" fill="#062319" />
                          <rect x="45" y="5" width="10" height="5" fill="#062319" />
                          <rect x="40" y="25" width="15" height="5" fill="#062319" />
                          <rect x="10" y="35" width="5" height="20" fill="#062319" />
                          <rect x="25" y="40" width="10" height="10" fill="#062319" />
                          <rect x="45" y="45" width="12" height="12" fill="#D4AF37" />
                          <rect x="65" y="35" width="10" height="20" fill="#062319" />
                          <rect x="85" y="45" width="5" height="15" fill="#062319" />
                          <rect x="35" y="70" width="15" height="5" fill="#062319" />
                          <rect x="40" y="85" width="10" height="10" fill="#062319" />
                          <rect x="65" y="75" width="15" height="5" fill="#062319" />
                          <rect x="75" y="85" width="15" height="10" fill="#062319" />
                        </svg>
                      </div>

                      <div className="text-xs space-y-0.5">
                        <span className="font-bold text-slate-800 block">UPI ID: taranganjali@icici</span>
                        <span className="text-[10px] text-slate-500">Google Pay • PhonePe • Paytm • BHIM</span>
                      </div>

                      <a
                        href={`upi://pay?pa=taranganjali@icici&pn=Taranganjali%20Private%20Limited&am=${payAmount}&tn=${payPurpose}&cu=INR`}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-xs transition"
                      >
                        <Smartphone className="w-3.5 h-3.5" />
                        <span>Open UPI App to Pay ₹{Number(payAmount).toLocaleString('en-IN')}</span>
                      </a>
                    </div>
                  ) : (
                    <div className="p-3 bg-blue-50/70 rounded-2xl border border-blue-200 text-xs space-y-1.5">
                      <div className="font-bold text-blue-900 border-b border-blue-200 pb-1 flex justify-between items-center">
                        <span>Company Official Current A/c:</span>
                        <span className="text-[10px] bg-blue-100 text-blue-800 px-1.5 py-0.2 rounded font-bold">PNB</span>
                      </div>
                      <p><span className="text-slate-500">Account Name:</span> <strong className="text-slate-800">Taranganjali Private Limited</strong></p>
                      <p><span className="text-slate-500">Account No:</span> <strong className="font-mono text-slate-900">0123002100045678</strong></p>
                      <p><span className="text-slate-500">IFSC Code:</span> <strong className="font-mono text-slate-900">PUNB0012300</strong> (Main Branch)</p>
                    </div>
                  )}

                  {/* 4. UTR / Reference No. Input */}
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">
                      UTR / Transaction Reference Number (12 अंक):
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="उदा. 432198765432 या UPI-123456"
                      value={payUtr}
                      onChange={(e) => setPayUtr(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-mono font-bold text-slate-900 focus:ring-2 focus:ring-emerald-500"
                    />
                    <span className="text-[10px] text-slate-400 mt-0.5 block">
                      Google Pay, PhonePe या बैंक ट्रांसफर के बाद प्राप्त 12-अंकों का UTR नंबर दर्ज करें
                    </span>
                  </div>

                  <button
                    type="submit"
                    disabled={payProcessing}
                    className="w-full py-3 bg-[#16a34a] hover:bg-emerald-700 text-white font-bold rounded-2xl text-xs shadow-md transition cursor-pointer flex items-center justify-center gap-2"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    <span>{payProcessing ? 'भुगतान दर्ज हो रहा है...' : `Confirm & Record Payment (₹${Number(payAmount).toLocaleString('en-IN')})`}</span>
                  </button>
                </form>
              )}

            </div>
          </div>
        )}

      </main>

      {/* Modern Bottom Mobile App Navigation Bar */}
      <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 z-50 shadow-2xl">
        <div className="max-w-md mx-auto grid grid-cols-5 text-center py-2 px-1">
          <button
            onClick={() => setCurrentNav('home')}
            className={`flex flex-col items-center gap-1 transition cursor-pointer ${
              currentNav === 'home' ? 'text-indigo-600 font-bold' : 'text-slate-400 hover:text-slate-600'
            }`}
          >
            <Home className="w-5 h-5" />
            <span className="text-[10px]">Home</span>
          </button>

          <button
            onClick={() => setCurrentNav('fds')}
            className={`flex flex-col items-center gap-1 transition cursor-pointer ${
              currentNav === 'fds' ? 'text-indigo-600 font-bold' : 'text-slate-400 hover:text-slate-600'
            }`}
          >
            <FileText className="w-5 h-5" />
            <span className="text-[10px]">My FDs</span>
          </button>

          <button
            onClick={() => setCurrentNav('invest')}
            className={`flex flex-col items-center gap-1 transition cursor-pointer ${
              currentNav === 'invest' ? 'text-indigo-600 font-bold' : 'text-slate-400 hover:text-slate-600'
            }`}
          >
            <div className="w-7 h-7 -mt-2 bg-indigo-600 text-white rounded-full flex items-center justify-center shadow-md">
              <Building2 className="w-4 h-4" />
            </div>
            <span className="text-[10px]">Branch Desk</span>
          </button>

          <button
            onClick={() => setCurrentNav('calc')}
            className={`flex flex-col items-center gap-1 transition cursor-pointer ${
              currentNav === 'calc' ? 'text-indigo-600 font-bold' : 'text-slate-400 hover:text-slate-600'
            }`}
          >
            <CalcIcon className="w-5 h-5" />
            <span className="text-[10px]">Calc</span>
          </button>

          <button
            onClick={() => setCurrentNav('profile')}
            className={`flex flex-col items-center gap-1 transition cursor-pointer ${
              currentNav === 'profile' ? 'text-indigo-600 font-bold' : 'text-slate-400 hover:text-slate-600'
            }`}
          >
            <User className="w-5 h-5" />
            <span className="text-[10px]">Profile</span>
          </button>
        </div>
      </nav>

    </div>
  );
}
