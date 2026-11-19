import React, { useState } from 'react';
import { 
  Lock, 
  User, 
  ShieldCheck, 
  ArrowRight, 
  TrendingUp, 
  KeyRound, 
  CheckCircle, 
  AlertTriangle, 
  X, 
  RefreshCw,
  Shield,
  FileCheck,
  Landmark,
  Smartphone,
  CheckCircle2,
  Scale,
  HelpCircle,
  ChevronRight,
  Info,
  Fingerprint,
  LockKeyhole,
  FileText
} from 'lucide-react';
import { apiRequest } from '../utils';
import TarplLogo from './TarplLogo';

export default function Login({ onLoginSuccess }) {
  const [username, setUsername] = useState('admin');
  const [password, setPassword] = useState('admin123');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Security Whitepaper / Modal State
  const [showSecurityModal, setShowSecurityModal] = useState(false);
  const [activeSecurityTab, setActiveSecurityTab] = useState('maker_checker'); // 'maker_checker' | 'encryption' | 'audit' | 'rbac' | 'double_entry' | 'otp'

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

  // Security System Specifications Array
  const securitySystems = [
    {
      id: 'maker_checker',
      title: 'Maker-Checker Dual Control Architecture',
      hindiTitle: 'दोहरा नियंत्रण / चार-आँखों का नियम (Four-Eyes Principle)',
      icon: ShieldCheck,
      color: 'amber',
      tag: 'Mandatory Governance',
      summary: 'शाखा का कोई भी कर्मचारी अकेले खाता खोलने, फंड निकासी या ग्राहक प्रोफाइल में बदलाव नहीं कर सकता।',
      howItWorks: [
        'मेकर (शाखा ऑपरेटर/कर्मचारी) डेटा एंट्री करता है — सिस्टम इसे सीधे लागू करने के बजाय PENDING_APPROVAL स्थिति में सुरक्षित रखता है।',
        'सुपर एडमिन / चेकर डेस्क पर लाइव अंतर (Old ➔ New Diff) और साक्ष्य प्रस्तुत होते हैं।',
        'केवल सुपर एडमिन के बायोमेट्रिक/क्रिप्टोग्राफिक अनुमोदन के बाद ही डेटाबेस में वास्तविक बदलाव या भुगतान निष्पादित होता है।'
      ]
    },
    {
      id: 'encryption',
      title: '256-Bit Bank-Grade Data Cryptography',
      hindiTitle: '256-बिट बैंक-स्तरीय डेटा एन्क्रिप्शन (AES-256 & TLS 1.3)',
      icon: LockKeyhole,
      color: 'emerald',
      tag: 'Data at Rest & Transit',
      summary: 'सभी पासवर्ड्स, बैंक खाते, आधार/पैन और वित्तीय आंकड़े सैन्य-स्तरीय 256-बिट एन्क्रिप्शन से सुरक्षित हैं।',
      howItWorks: [
        'सभी यूजर व स्टाफ पासवर्ड्स Bcrypt 10-Salt Round हैशिंग से सुरक्षित हैं — सिस्टम डेटाबेस में भी मूल पासवर्ड किसी को दिखाई नहीं देता।',
        'इंटरनेट और वाई-फाई पर प्रेषित समस्त डेटा TLS 1.3 बैंक-ग्रेड सुरक्षित टनल से गुजरता है, जिससे स्निफिंग या हैकिंग असंभव है।',
        'क्लाइंट टोकन HMAC SHA-256 डिजिटल हस्ताक्षर के साथ एन्कोड होते हैं।'
      ]
    },
    {
      id: 'audit',
      title: 'Tamper-Evident Forensic Audit Trail',
      hindiTitle: 'अपरिवर्तनीय डिजिटल ऑडिट लॉग (Forensic Audit Trail)',
      icon: FileCheck,
      color: 'blue',
      tag: 'Zero-Tamper Guarantee',
      summary: 'प्रत्येक लॉगिन, क्लिक, लेन-देन, डे-बुक प्रविष्टि और अप्रूवल का स्थायी रिकॉर्ड दर्ज होता है।',
      howItWorks: [
        'हर गतिविधि के साथ ऑपरेटर आईडी, सटीक टाइमस्टैम्प, आईपी पता और प्रभावित बहीखाता (Ledger) दर्ज होता है।',
        'ऑडिट लॉग्स को कोई भी यूजर अथवा कर्मचारी डिलीट या ओवरराइट नहीं कर सकता।',
        'किसी भी विसंगति पर तत्काल स्वचालित लॉग फ्लैग होकर सुपर एडमिन कंसोल पर प्रदर्शित होता है।'
      ]
    },
    {
      id: 'rbac',
      title: 'Role-Based Access Control (RBAC Guard)',
      hindiTitle: 'पद-आधारित अधिकार नियंत्रण (Strict RBAC Permissions)',
      icon: Fingerprint,
      color: 'purple',
      tag: 'Least Privilege',
      summary: 'कैशियर, फील्ड एडवाइजर, ब्रांच मैनेजर और सुपर एडमिन केवल अपने अधिकार क्षेत्र में ही कार्य कर सकते हैं।',
      howItWorks: [
        'कैशियर केवल दैनिक नकद आवक-जावक दर्ज कर सकता है; वह मुख्य ब्याज दरें या योजनाएं नहीं बदल सकता।',
        'फील्ड एडवाइजर केवल अपने आवंटित ग्राहकों का विवरण देख सकता है।',
        'सुपर एडमिन ही नीति-निर्धारण, ब्याज दरें, यूजर राइट्स और अंतिम वित्तीय अप्रूवल देने का एकाधिकार रखता है।'
      ]
    },
    {
      id: 'double_entry',
      title: 'Double-Entry Vault & Day Book Reconciliation',
      hindiTitle: 'दोहरी बहीखाता प्रणाली एवं दैनिक वॉल्ट सामंजस्य (Reconciliation)',
      icon: Scale,
      color: 'teal',
      tag: 'Accounting Integrity',
      summary: 'डे-बुक में प्रत्येक इनपुट (आवक) व आउटपुट (जावक) का वास्तविक बैंक व तिजोरी (Vault) से लाइव मिलान।',
      howItWorks: [
        'बिना अधिकृत वाउचर (Receipt/Payment Voucher) कोई भी राशि किसी भी खाते में न आ सकती है न जा सकती है।',
        '9 कोर बैंकिंग लेजर्स (Cash, Bank, FD, RD, MIS, Saving, DD, Gold Loan, Udhar) का प्रति सेकंड रनिंग बैलेंस टेली होता है।',
        'दिन के अंत में 3-कॉलम डे-बुक (Opening, Current, Transactions) द्वारा 100% गणितीय शुद्धता प्रमाणित होती है।'
      ]
    },
    {
      id: 'otp',
      title: 'Session Guard & 2FA Mobile OTP Verification',
      hindiTitle: 'सत्र सुरक्षा, ऑटो-टाइमआउट व 2-फैक्टर मोबाइल ओटीपी',
      icon: Smartphone,
      color: 'rose',
      tag: 'Access Security',
      summary: 'अकेले छोड़े गए कंप्यूटर पर अनधिकृत पहुंच रोकने हेतु 15 मिनट में स्वतः लॉगआउट व ओटीपी पासवर्ड रीसेट।',
      howItWorks: [
        'पासवर्ड भूलने पर केवल पंजीकृत और सत्यापित मोबाइल नंबर पर भेजे गए 6-अंकीय ओटीपी के बाद ही पासवर्ड बदला जा सकता है।',
        'निष्क्रिय रहने पर सत्र अपने-आप सुरक्षित रूप से समाप्त हो जाता है और स्क्रीन लॉक हो जाती है।',
        'एक समय में एक ही अधिकृत डिवाइस पर सक्रिय सत्र की अनुमति रहती है।'
      ]
    }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#062319] via-[#082e20] to-[#041a12] flex items-center justify-center p-4 sm:p-6 lg:p-8">
      
      {/* Main Container: 2-Column Responsive Institutional Layout */}
      <div className="w-full max-w-6xl grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
        
        {/* ======================================================== */}
        {/* LEFT COLUMN: ACTIVE SECURITY SYSTEM SHOWCASE (7 cols)    */}
        {/* ======================================================== */}
        <div className="lg:col-span-7 bg-[#062319]/90 border border-[#1a5d43]/80 rounded-3xl p-6 sm:p-8 backdrop-blur-md shadow-2xl flex flex-col justify-between text-white relative overflow-hidden">
          
          {/* Subtle Background Watermark / Accent */}
          <div className="absolute -right-16 -bottom-16 w-64 h-64 bg-[#D4AF37]/5 rounded-full blur-3xl pointer-events-none"></div>

          <div>
            {/* Brand Header */}
            <div className="flex items-center gap-3 pb-5 border-b border-[#1a5d43]/80">
              <TarplLogo variant="icon" size={48} />
              <div>
                <div className="text-sm font-black tracking-wide text-white flex items-center gap-2">
                  <span>TARANG ANJALI REAL TECH PVT. LTD.</span>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#D4AF37]/20 text-[#D4AF37] border border-[#D4AF37]/40">
                    ISO Certified
                  </span>
                </div>
                <div className="text-xs text-[#FBBF24] font-bold">
                  जीत आपके विश्वास की • Institutional Core Banking & Wealth CRM
                </div>
              </div>
            </div>

            {/* Security Architecture Header */}
            <div className="mt-5">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs font-bold mb-2">
                <ShieldCheck className="w-4 h-4 text-emerald-400" />
                <span>6-Tier Active Cyber & Financial Defense Shield</span>
              </div>
              <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight">
                संस्थागत सुरक्षा एवं संरक्षा प्रणाली (Security Systems in Action)
              </h2>
              <p className="text-xs text-slate-300 mt-1 leading-relaxed">
                तरंगांजलि कोर बैंकिंग में आपकी पूंजी, ग्राहक रिकॉर्ड और बहीखातों की अखंडता सुनिश्चित करने के लिए निम्नलिखित 6 उच्च-स्तरीय सुरक्षा प्रणालियां चौबीसों घंटे सक्रिय रूप से कार्य करती हैं:
              </p>
            </div>

            {/* 6 Security System Highlights Grid */}
            <div className="mt-5 grid grid-cols-1 sm:grid-cols-2 gap-3">
              {securitySystems.map((sec) => {
                const Icon = sec.icon;
                return (
                  <div 
                    key={sec.id}
                    onClick={() => {
                      setActiveSecurityTab(sec.id);
                      setShowSecurityModal(true);
                    }}
                    className="p-3 rounded-2xl bg-[#082e20]/80 border border-[#1a5d43] hover:border-[#D4AF37]/60 hover:bg-[#0a3d2b] transition cursor-pointer group flex flex-col justify-between"
                    title="क्लिक करके विस्तृत कार्यप्रणाली देखें"
                  >
                    <div>
                      <div className="flex items-center justify-between mb-1.5">
                        <div className="w-7 h-7 rounded-lg bg-[#D4AF37]/20 border border-[#D4AF37]/40 flex items-center justify-center text-[#D4AF37] group-hover:scale-105 transition">
                          <Icon className="w-4 h-4" />
                        </div>
                        <span className="text-[9px] font-bold uppercase tracking-wider text-emerald-400/80 bg-emerald-950/60 px-1.5 py-0.5 rounded border border-emerald-800/40">
                          {sec.tag}
                        </span>
                      </div>
                      <div className="text-xs font-bold text-white group-hover:text-[#FBBF24] transition leading-tight">
                        {sec.hindiTitle}
                      </div>
                      <div className="text-[11px] text-slate-300 mt-1 leading-snug line-clamp-2">
                        {sec.summary}
                      </div>
                    </div>

                    <div className="mt-2 pt-1.5 border-t border-[#134e38] flex items-center justify-between text-[10px] text-emerald-300 font-semibold">
                      <span>कार्यप्रणाली विवरण पढ़ें</span>
                      <ChevronRight className="w-3 h-3 group-hover:translate-x-0.5 transition" />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Bottom Security Footer Strip */}
          <div className="mt-5 pt-4 border-t border-[#1a5d43]/80 flex flex-wrap items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2 text-slate-300">
              <Lock className="w-3.5 h-3.5 text-[#D4AF37]" />
              <span className="text-[11px]">256-Bit SSL/TLS Certified • Zero-Trust Policy Active</span>
            </div>

            <button
              type="button"
              onClick={() => setShowSecurityModal(true)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#D4AF37]/15 hover:bg-[#D4AF37]/25 text-[#FBBF24] border border-[#D4AF37]/30 font-bold text-xs transition cursor-pointer"
            >
              <Info className="w-3.5 h-3.5" />
              <span>संपूर्ण सुरक्षा नियमावली देखें (Full Policy)</span>
            </button>
          </div>

        </div>

        {/* ======================================================== */}
        {/* RIGHT COLUMN: LOGIN FORM & AUTHENTICATION (5 cols)       */}
        {/* ======================================================== */}
        <div className="lg:col-span-5 bg-white/95 backdrop-blur-md rounded-3xl shadow-2xl border border-white/20 p-6 sm:p-8 flex flex-col justify-between">
          
          <div>
            {/* Top Brand Header for Mobile / Tablet */}
            <div className="text-center mb-5">
              <div className="flex justify-center mb-2.5">
                <TarplLogo variant="badge" size={72} />
              </div>
              <h1 className="text-lg font-black text-[#062319] tracking-tight">
                कर्मचारी एवं प्रबंधक लॉगिन
              </h1>
              <p className="text-xs text-[#0A5C36] font-bold">
                Authorized Personnel Only • Secure Portal
              </p>
            </div>

            {/* Quick Role Select Tabs */}
            <div className="grid grid-cols-2 gap-2 mb-5 p-1 bg-slate-100 rounded-xl text-xs font-semibold">
              <button
                type="button"
                onClick={() => handleQuickFill('admin', 'admin123')}
                className={`py-2 rounded-lg transition cursor-pointer text-center ${
                  username === 'admin'
                    ? 'bg-[#062319] text-[#FBBF24] shadow-xs font-bold'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Super Admin (Checker)
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
              <div className="mb-4 p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-xl flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0 text-rose-600" />
                <span>{error}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">
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
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-600">
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
                    className="text-xs font-bold text-[#0A5C36] hover:text-[#08482a] cursor-pointer"
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

              <div className="p-3 bg-amber-50/80 border border-amber-200/80 rounded-xl flex items-start gap-2.5 text-xs text-amber-900">
                <ShieldCheck className="w-4 h-4 text-[#D4AF37] shrink-0 mt-0.5" />
                <div className="leading-relaxed">
                  <span className="font-bold">सक्रिय सुरक्षा अधिकार:</span>{' '}
                  {username === 'admin' 
                    ? 'Super Admin (चेकर एवं अंतिम वित्तीय अनुमोदन प्राधिकारी)' 
                    : 'Staff Maker (प्रविष्टि ऑपरेटर - केवल प्रस्तावकर्ता)'}
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3.5 px-4 bg-[#D4AF37] hover:bg-[#C59B27] active:bg-[#B38C1F] text-[#062319] font-black rounded-xl shadow-lg transition flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer text-sm"
              >
                {loading ? (
                  <span className="inline-block w-5 h-5 border-2 border-[#062319] border-t-transparent rounded-full animate-spin"></span>
                ) : (
                  <>
                    Sign In to Portal (प्रवेश करें)
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>
          </div>

          {/* Security Certifications Strip at Bottom */}
          <div className="mt-5 pt-4 border-t border-slate-100 space-y-2 text-center">
            <div className="text-[11px] font-bold text-slate-600 flex items-center justify-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
              <span>दोहरा प्राधिकरण एवं 256-बिट SSL सुरक्षा से सुरक्षित</span>
            </div>
            <div className="text-[10px] text-slate-400">
              Taranganjali Real Tech Pvt. Ltd. • All Session Logged & Audited
            </div>
          </div>

        </div>

      </div>

      {/* ======================================================== */}
      {/* SECURITY ARCHITECTURE WHITEPAPER MODAL                   */}
      {/* ======================================================== */}
      {showSecurityModal && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-3xl max-w-3xl w-full p-6 sm:p-8 shadow-2xl border border-slate-200 max-h-[90vh] flex flex-col animate-fadeIn">
            
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-4 border-b border-slate-200">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-800 flex items-center justify-center font-black">
                  <ShieldCheck className="w-6 h-6 text-emerald-700" />
                </div>
                <div>
                  <h3 className="font-black text-slate-900 text-base sm:text-lg">
                    तरंगांजलि बैंकिंग सुरक्षा प्रणाली (Security Systems & Operation Guide)
                  </h3>
                  <p className="text-xs text-slate-500">
                    कोर बैंकिंग एवं ग्राहक पोर्टल में सक्रिय 6-स्तरीय सुरक्षा संरचना की विस्तृत कार्यप्रणाली
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowSecurityModal(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Content */}
            <div className="py-4 overflow-y-auto flex-1 space-y-4">
              
              {/* Security Systems Selector Pills */}
              <div className="flex flex-wrap gap-1.5 p-1 bg-slate-100 rounded-xl">
                {securitySystems.map((sec) => (
                  <button
                    key={sec.id}
                    onClick={() => setActiveSecurityTab(sec.id)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                      activeSecurityTab === sec.id
                        ? 'bg-[#062319] text-[#FBBF24] shadow-xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    {sec.title.split(' ')[0]}
                  </button>
                ))}
              </div>

              {/* Active Security Detail Card */}
              {(() => {
                const current = securitySystems.find(s => s.id === activeSecurityTab) || securitySystems[0];
                const Icon = current.icon;
                return (
                  <div className="bg-slate-50 rounded-2xl border border-slate-200 p-5 space-y-4">
                    <div className="flex items-start justify-between gap-3 pb-3 border-b border-slate-200">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center shadow-xs">
                          <Icon className="w-5 h-5" />
                        </div>
                        <div>
                          <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full border border-emerald-200">
                            {current.tag}
                          </span>
                          <h4 className="text-sm sm:text-base font-black text-slate-900 mt-1">
                            {current.hindiTitle}
                          </h4>
                          <div className="text-xs text-slate-500 font-mono">
                            {current.title}
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="text-xs text-slate-700 font-medium leading-relaxed bg-white p-3.5 rounded-xl border border-slate-200">
                      <strong>उद्देश्य एवं सारांश:</strong> {current.summary}
                    </div>

                    <div>
                      <h5 className="text-xs font-bold uppercase tracking-wider text-slate-800 mb-2 flex items-center gap-1.5">
                        <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                        <span>यह सुरक्षा प्रणाली कैसे काम करती है (Operational Flow):</span>
                      </h5>
                      <div className="space-y-2">
                        {current.howItWorks.map((step, idx) => (
                          <div key={idx} className="flex items-start gap-2.5 text-xs text-slate-700 bg-white p-3 rounded-xl border border-slate-200/80">
                            <span className="w-5 h-5 rounded-full bg-emerald-100 text-emerald-800 font-bold flex items-center justify-center text-[11px] shrink-0 mt-0.5">
                              {idx + 1}
                            </span>
                            <span className="leading-relaxed">{step}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                );
              })()}

              {/* Regulatory Assurance Callout */}
              <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 text-xs text-amber-900 flex items-start gap-3">
                <Landmark className="w-5 h-5 text-amber-700 shrink-0 mt-0.5" />
                <div className="leading-relaxed">
                  <strong>तरंगांजलि वित्तीय गारंटी एवं ऑडिट प्रतिबद्धता:</strong> कंपनी अधिनियम एवं वित्तीय दिशा-निर्देशों के तहत तरंगांजलि कोर बैंकिंग में प्रत्येक खाता, नकद प्रवाह (Day Book Cash & Bank) तथा सदस्य डेटा स्थायी रूप से सुरक्षित है। बिना सुपर एडमिन अनुमोदन के किसी भी प्रकार का अवैध लेन-देन या नाम परिवर्तन पूर्णतया असंभव है।
                </div>
              </div>

            </div>

            {/* Modal Footer */}
            <div className="pt-4 border-t border-slate-200 flex justify-end">
              <button
                onClick={() => setShowSecurityModal(false)}
                className="px-6 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition cursor-pointer"
              >
                समझ लिया (Close)
              </button>
            </div>

          </div>
        </div>
      )}

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
