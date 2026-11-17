import React, { useState, useEffect } from 'react';
import { 
  CreditCard, 
  CheckCircle2, 
  Clock, 
  Zap, 
  ShieldCheck, 
  Smartphone, 
  Code, 
  Sparkles,
  QrCode,
  Building2,
  Server,
  Headphones,
  Database,
  History,
  AlertTriangle,
  RotateCcw,
  FileText,
  CheckCircle,
  Sliders
} from 'lucide-react';
import { formatINR, formatDate, apiRequest } from '../utils';

export default function Subscription() {
  const [sub, setSub] = useState(null);
  const [loading, setLoading] = useState(true);
  const [renewModalOpen, setRenewModalOpen] = useState(false);
  const [selectedTier, setSelectedTier] = useState('professional');
  const [selectedPeriod, setSelectedPeriod] = useState('annual'); // 'annual' | 'half_yearly'
  const [paymentMethod, setPaymentMethod] = useState('Bank Transfer (NEFT/RTGS)');
  const [processing, setProcessing] = useState(false);
  const [activeTab, setActiveTab] = useState('plan'); // 'plan' | 'amc' | 'api' | 'history'

  // History & Status State
  const [historyList, setHistoryList] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [updatingStatus, setUpdatingStatus] = useState(false);
  const [statusMessage, setStatusMessage] = useState('');

  const currentUser = (() => {
    try {
      return JSON.parse(localStorage.getItem('pralaad_fd_user'));
    } catch {
      return null;
    }
  })();
  const isSuperAdmin = currentUser?.role === 'admin';

  const fetchHistory = async () => {
    try {
      setLoadingHistory(true);
      const res = await apiRequest('/subscription/history');
      if (res.success) {
        setHistoryList(res.history || []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingHistory(false);
    }
  };

  const handleStatusChange = async (newStatus) => {
    if (!confirm(`Are you sure you want to change subscription status to ${newStatus}?`)) return;
    try {
      setUpdatingStatus(true);
      const res = await apiRequest('/subscription/status', {
        method: 'POST',
        body: JSON.stringify({ status: newStatus })
      });
      setStatusMessage(res.message);
      fetchSub();
      setTimeout(() => setStatusMessage(''), 4000);
    } catch (err) {
      alert('Failed to update status: ' + err.message);
    } finally {
      setUpdatingStatus(false);
    }
  };

  const fetchSub = async () => {
    try {
      setLoading(true);
      const res = await apiRequest('/subscription');
      setSub(res.subscription);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSub();
  }, []);

  useEffect(() => {
    if (activeTab === 'history') {
      fetchHistory();
    }
  }, [activeTab]);

  const handleRenewPayment = async () => {
    try {
      setProcessing(true);
      const res = await apiRequest('/subscription/renew', {
        method: 'POST',
        body: JSON.stringify({
          tier: selectedTier,
          billing_period: selectedPeriod,
          payment_method: paymentMethod,
          transaction_id: 'TXN-AMC-' + Date.now()
        })
      });
      alert(res.message);
      setRenewModalOpen(false);
      fetchSub();
    } catch (err) {
      alert('Payment processing error: ' + err.message);
    } finally {
      setProcessing(false);
    }
  };

  if (loading) {
    return (
      <div className="py-20 text-center">
        <div className="inline-block w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  const tiers = [
    {
      id: 'starter',
      name: 'Silver Starter Plan',
      price: '₹12,000',
      period: '/ Year',
      monthly_eq: '₹1,000 / month',
      description: 'छोटें डिपॉजिट सलाहकारों या शुरूआती फर्म के लिए',
      popular: false,
      features: [
        'Up to 300 Active Fixed Deposits',
        'All 9 Compounding & Payout Models',
        'Digital Certificate / Receipt Generator',
        '1-Click WhatsApp Reminders',
        'Standard Email & Ticket Support'
      ]
    },
    {
      id: 'professional',
      name: 'Gold Business Plan (Most Popular)',
      price: '₹24,000',
      period: '/ Year',
      monthly_eq: '₹2,000 / month',
      description: 'फुल मेंटेनेंस, क्लाउड बैकअप और अनलिमिटेड FDs',
      popular: true,
      features: [
        'Unlimited Fixed Deposits & Clients',
        'Automated 3-Day WhatsApp Reminders',
        'Daily Cloud Database Backup (Zero Data Loss)',
        'Premature Liquidation & Penalty Calculator',
        'Multi-User Staff & Role Access',
        'Full Annual Maintenance (AMC) Included',
        'Priority Phone & WhatsApp Tech Support'
      ]
    },
    {
      id: 'enterprise',
      name: 'Platinum Enterprise Plan',
      price: '₹48,000',
      period: '/ Year',
      monthly_eq: '₹4,000 / month',
      description: 'मल्टी-ब्रांच, डेडिकेटेड क्लाउड सर्वर और मोबाइल ऐप रेडी',
      popular: false,
      features: [
        'Dedicated Cloud VPS & Custom Domain (crm.domain.com)',
        'Mobile App (Android/iOS) REST APIs Sync',
        'Online Payment Gateway Webhook Integration',
        'Multi-Branch Management & Hierarchy',
        'Hourly Encrypted Cloud Backups',
        'Dedicated Technical Account Manager',
        '100% Free Custom Tweaks & Lifetime Upgrades'
      ]
    }
  ];

  return (
    <div className="space-y-6">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Software Licensing & Annual Maintenance (AMC)</h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Internal software license, yearly maintenance contracts and cloud infrastructure
          </p>
        </div>

        {/* Tab Toggle */}
        <div className="flex bg-slate-100 p-1 rounded-xl text-xs font-semibold">
          <button
            onClick={() => setActiveTab('plan')}
            className={`px-3 py-1.5 rounded-lg transition cursor-pointer ${
              activeTab === 'plan' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600'
            }`}
          >
            Commercial Packages
          </button>
          <button
            onClick={() => setActiveTab('amc')}
            className={`px-3 py-1.5 rounded-lg transition cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'amc' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600'
            }`}
          >
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
            AMC Scope & Services
          </button>
          <button
            onClick={() => setActiveTab('api')}
            className={`px-3 py-1.5 rounded-lg transition cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'api' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600'
            }`}
          >
            <Smartphone className="w-3.5 h-3.5 text-indigo-600" />
            Mobile App & Online Payment APIs
          </button>
          <button
            onClick={() => setActiveTab('history')}
            className={`px-3 py-1.5 rounded-lg transition cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'history' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600'
            }`}
          >
            <History className="w-3.5 h-3.5 text-purple-600" />
            Renewal History
          </button>
        </div>
      </div>

      {activeTab === 'plan' && (
        <div className="space-y-6">
          
          {/* Status update alert banner */}
          {statusMessage && (
            <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold rounded-2xl flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-emerald-600" />
              <span>{statusMessage}</span>
            </div>
          )}

          {/* Current Active Plan Status Banner */}
          <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white rounded-3xl p-6 sm:p-8 shadow-xl relative overflow-hidden">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-amber-300 bg-amber-400/20 px-3 py-1 rounded-full border border-amber-300/30">
                    CURRENT ACTIVATED LICENSE
                  </span>
                  
                  <span className={`text-[10px] font-black uppercase px-2.5 py-0.5 rounded-full border ${
                    sub?.status === 'ACTIVE'
                      ? 'bg-emerald-500/20 text-emerald-300 border-emerald-400/40'
                      : sub?.status === 'PENDING'
                      ? 'bg-amber-500/20 text-amber-300 border-amber-400/40'
                      : 'bg-rose-500/20 text-rose-300 border-rose-400/40'
                  }`}>
                    ● STATUS: {sub?.status || 'ACTIVE'}
                  </span>
                </div>

                <h2 className="text-2xl sm:text-3xl font-black mt-2">
                  {sub?.plan_name || 'FD Gold Pro Tier'}
                </h2>
                <p className="text-xs text-indigo-200 mt-1">
                  Full Fixed Deposit Suite • Annual Maintenance Contract (AMC) & Cloud Backups Active
                </p>
              </div>

              <div className="bg-white/10 p-4 rounded-2xl backdrop-blur-md border border-white/10 text-right">
                <span className="text-[10px] text-indigo-200 uppercase font-bold block">License Validity</span>
                <div className="text-2xl font-black text-emerald-400 mt-0.5">
                  {sub?.days_left ?? 365} Days Remaining
                </div>
                <span className="text-xs text-slate-300">Valid until {formatDate(sub?.valid_until)}</span>
              </div>
            </div>

            <div className="mt-6 pt-6 border-t border-white/15 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
              <div className="text-xs text-indigo-200 flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-emerald-400" />
                <span>Annual Maintenance Fee: <strong>₹24,000 / Year (₹2,000/mo)</strong></span>
              </div>

              <div className="flex items-center gap-2 flex-wrap">
                {isSuperAdmin && (
                  <div className="flex items-center gap-1 bg-white/10 p-1 rounded-xl border border-white/15 text-[10px]">
                    <span className="text-indigo-200 px-2 font-bold">Admin Override:</span>
                    <button
                      type="button"
                      disabled={updatingStatus || sub?.status === 'ACTIVE'}
                      onClick={() => handleStatusChange('ACTIVE')}
                      className={`px-2 py-1 rounded-lg font-bold transition cursor-pointer ${
                        sub?.status === 'ACTIVE' ? 'bg-emerald-500 text-white' : 'text-slate-300 hover:text-white'
                      }`}
                    >
                      Active
                    </button>
                    <button
                      type="button"
                      disabled={updatingStatus || sub?.status === 'SUSPENDED'}
                      onClick={() => handleStatusChange('SUSPENDED')}
                      className={`px-2 py-1 rounded-lg font-bold transition cursor-pointer ${
                        sub?.status === 'SUSPENDED' ? 'bg-rose-500 text-white' : 'text-slate-300 hover:text-white'
                      }`}
                    >
                      Suspend
                    </button>
                    <button
                      type="button"
                      disabled={updatingStatus || sub?.status === 'EXPIRED'}
                      onClick={() => handleStatusChange('EXPIRED')}
                      className={`px-2 py-1 rounded-lg font-bold transition cursor-pointer ${
                        sub?.status === 'EXPIRED' ? 'bg-amber-500 text-white' : 'text-slate-300 hover:text-white'
                      }`}
                    >
                      Expire
                    </button>
                  </div>
                )}

                <button
                  onClick={() => setRenewModalOpen(true)}
                  className="px-5 py-2.5 bg-amber-400 hover:bg-amber-300 text-slate-950 text-xs font-black rounded-xl shadow-lg transition flex items-center gap-2 cursor-pointer"
                >
                  <Zap className="w-4 h-4" />
                  Renew License
                </button>
              </div>
            </div>
          </div>

          {/* Non-Destructive Financial Records Guarantee */}
          <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl flex items-start gap-3 text-emerald-900 text-xs">
            <ShieldCheck className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
            <div>
              <div className="font-bold text-emerald-950">Non-Destructive Financial Data Guarantee:</div>
              <p className="text-emerald-800 text-[11px] mt-0.5 leading-relaxed">
                If the software subscription expires or is temporarily suspended, <b>customer financial records, deposits (FD, RD, MIS, Savings), transaction ledgers, and payout schedules are NEVER deleted, archived, or deactivated</b>. Your financial database remains permanently intact and safely preserved.
              </p>
            </div>
          </div>

          {/* Pricing Tiers Grid */}
          <div>
            <div className="text-center mb-6">
              <h2 className="text-xl font-bold text-slate-900">Recommended Commercial Packages for Client</h2>
              <p className="text-xs text-slate-500 mt-1">क्लाइंट को देने के लिए 3 स्पष्ट और प्रोफ़ेशनल पैकेज:</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {tiers.map((t) => (
                <div
                  key={t.id}
                  className={`bg-white rounded-3xl p-6 border transition flex flex-col justify-between relative ${
                    t.popular
                      ? 'border-2 border-indigo-600 shadow-xl shadow-indigo-600/10'
                      : 'border-slate-200 shadow-sm hover:shadow-md'
                  }`}
                >
                  {t.popular && (
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-indigo-600 text-white text-[10px] uppercase font-black px-3 py-1 rounded-full shadow-md">
                      BEST VALUE • FULL AMC
                    </div>
                  )}

                  <div>
                    <h3 className="font-bold text-slate-900 text-base">{t.name}</h3>
                    <p className="text-xs text-slate-500 mt-1">{t.description}</p>

                    <div className="my-5 pb-5 border-b border-slate-100">
                      <div className="flex items-baseline gap-1">
                        <span className="text-3xl font-black text-slate-900">{t.price}</span>
                        <span className="text-xs text-slate-400 font-semibold">{t.period}</span>
                      </div>
                      <span className="text-xs font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded mt-1 inline-block">
                        Equivalent to {t.monthly_eq}
                      </span>
                    </div>

                    <div className="space-y-2.5">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                        Included in this package:
                      </span>
                      {t.features.map((f, i) => (
                        <div key={i} className="flex items-start gap-2 text-xs text-slate-700">
                          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                          <span>{f}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="mt-8 pt-4 border-t border-slate-100">
                    <button
                      onClick={() => {
                        setSelectedTier(t.id);
                        setRenewModalOpen(true);
                      }}
                      className={`w-full py-2.5 rounded-xl text-xs font-bold transition cursor-pointer ${
                        t.popular
                          ? 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-md'
                          : 'bg-slate-100 hover:bg-slate-200 text-slate-800'
                      }`}
                    >
                      Choose {t.name.split(' ')[0]}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

        </div>
      )}

      {/* AMC Scope Tab */}
      {activeTab === 'amc' && (
        <div className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 shadow-sm space-y-6">
          <div className="border-b border-slate-100 pb-4">
            <h2 className="text-xl font-bold text-slate-900">Annual Maintenance Contract (AMC) क्या कवर करता है?</h2>
            <p className="text-xs text-slate-500 mt-1">
              क्लाइंट से ₹10,000 से ₹24,000 सालाना लेने पर आपको उन्हें क्या-क्या सुविधाएं देनी हैं:
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5 text-xs">
            
            <div className="p-5 bg-slate-50 rounded-2xl border border-slate-200 space-y-2.5">
              <div className="flex items-center gap-2 font-bold text-slate-900 text-sm">
                <Server className="w-4 h-4 text-indigo-600" />
                1. क्लाउड सर्वर व डोमेन होस्टिंग (Hosting & Uptime)
              </div>
              <p className="text-slate-600 leading-relaxed">
                क्लाइंट के सॉफ्टवेयर को 24x7 बिना रुके चलाने के लिए VPS सर्वर, SSL सिक्योरिटी सर्टिफिकेट, और डोमेन मैपिंग का पूरा खर्च और मेंटेनेंस आपके ज़िम्मे रहता है।
              </p>
            </div>

            <div className="p-5 bg-slate-50 rounded-2xl border border-slate-200 space-y-2.5">
              <div className="flex items-center gap-2 font-bold text-slate-900 text-sm">
                <Database className="w-4 h-4 text-emerald-600" />
                2. ऑटोमैटिक डेटाबेस बैकअप (Zero Data Loss)
              </div>
              <p className="text-slate-600 leading-relaxed">
                FDs और पैसों का रिकॉर्ड बेहद संवेदनशील होता है। AMC के तहत हर रात ऑटोमैटिक क्लाउड बैकअप लिया जाता है ताकि कंप्यूटर खराब होने पर भी 1 सेकंड में सारा डेटा रिकवर हो सके।
              </p>
            </div>

            <div className="p-5 bg-slate-50 rounded-2xl border border-slate-200 space-y-2.5">
              <div className="flex items-center gap-2 font-bold text-slate-900 text-sm">
                <Smartphone className="w-4 h-4 text-amber-600" />
                3. WhatsApp रिमाइंडर व गेटवे मेंटेनेंस
              </div>
              <p className="text-slate-600 leading-relaxed">
                WhatsApp के समय-समय पर आने वाले अपडेट्स और API टोकन्स को सुचारू रखना ताकि क्लाइंट्स को 3 दिन पहले रिमाइंडर मैसेज बिना रुकावट जाते रहें।
              </p>
            </div>

            <div className="p-5 bg-slate-50 rounded-2xl border border-slate-200 space-y-2.5">
              <div className="flex items-center gap-2 font-bold text-slate-900 text-sm">
                <Headphones className="w-4 h-4 text-blue-600" />
                4. टेक्निकल सपोर्ट व स्टाफ ट्रेनिंग
              </div>
              <p className="text-slate-600 leading-relaxed">
                क्लाइंट या उनके कर्मचारियों को जब भी कोई गणना (Calculation), रसीद प्रिंटिंग या सिस्टम चलाने में दिक्कत आए, तो फ़ोन या AnyDesk/TeamViewer पर तुरंत सहायता उपलब्ध कराना।
              </p>
            </div>

          </div>

          <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl flex items-center gap-3 text-xs text-emerald-900">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
            <div>
              <p className="font-bold">बिजनेस टिप (Pricing Recommendation):</p>
              <p>क्लाइंट को बोलें: <strong>"₹25,000 वन-टाइम सॉफ्टवेयर सेटअप और ₹15,000 से ₹20,000 सालाना मेंटेनेंस (AMC)"</strong>। इससे आपको हर साल रेगुलर रिकरिंग इनकम मिलती रहेगी!</p>
            </div>
          </div>
        </div>
      )}

      {/* APIs Tab */}
      {activeTab === 'api' && (
        <div className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 shadow-sm space-y-6">
          <div className="flex items-center gap-3 pb-4 border-b border-slate-100">
            <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
              <Code className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-900">Mobile Application & Online Payment Connectors</h2>
              <p className="text-xs text-slate-500">
                भविष्य में बनने वाले मोबाइल ऐप और ऑनलाइन पेमेंट गेटवे को सीधे इस CRM से जोड़ने के लिए REST APIs
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="p-5 bg-slate-50 rounded-2xl border border-slate-200 space-y-3 text-xs">
              <div className="flex items-center gap-2 font-bold text-slate-800 text-sm">
                <Smartphone className="w-4 h-4 text-indigo-600" />
                Client Self-Service Mobile App (Android/iOS)
              </div>
              <p className="text-slate-600">
                जब आप क्लाइंट के ग्राहकों के लिए मोबाइल ऐप बनाएंगे, तो वो इसी डेटाबेस से लाइव कनेक्ट रहेगी:
              </p>
              <div className="space-y-1.5 font-mono text-[11px]">
                <div className="p-2 bg-white rounded border border-slate-200 flex justify-between">
                  <span className="text-emerald-700 font-bold">POST</span>
                  <span className="text-slate-700">/api/auth/login</span>
                  <span className="text-slate-400">Mobile Login</span>
                </div>
                <div className="p-2 bg-white rounded border border-slate-200 flex justify-between">
                  <span className="text-blue-700 font-bold">GET</span>
                  <span className="text-slate-700">/api/fds?customer_id=...</span>
                  <span className="text-slate-400">Live FD Portfolio</span>
                </div>
                <div className="p-2 bg-white rounded border border-slate-200 flex justify-between">
                  <span className="text-emerald-700 font-bold">POST</span>
                  <span className="text-slate-700">/api/fds/calculate</span>
                  <span className="text-slate-400">FD Simulator</span>
                </div>
              </div>
            </div>

            <div className="p-5 bg-slate-50 rounded-2xl border border-slate-200 space-y-3 text-xs">
              <div className="flex items-center gap-2 font-bold text-slate-800 text-sm">
                <CreditCard className="w-4 h-4 text-emerald-600" />
                Online Payment Gateway (Razorpay / Cashfree UPI)
              </div>
              <p className="text-slate-600">
                ग्राहक ऐप से UPI या नेटबैंकिंग द्वारा सीधे पेमेंट करके नई FD बुक कर सकेंगे और रसीद तुरंत उनके फोन पर आ जाएगी।
              </p>
              <div className="p-3 bg-white rounded-xl border border-slate-200 space-y-1 text-[11px] text-slate-600">
                <p className="font-bold text-slate-800">✅ Webhook Ready Architecture</p>
                <p>पेमेंट सक्सेस होते ही FD ऑटोमैटिक एक्टिवेट हो जाएगी।</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Renewal & Payment History Tab */}
      {activeTab === 'history' && (
        <div className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 shadow-sm space-y-6">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 pb-4 border-b border-slate-100">
            <div>
              <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
                <History className="w-5 h-5 text-indigo-600" />
                Subscription & Renewal Payment History
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Complete historical record of license renewals, commercial packages, and status transitions
              </p>
            </div>

            <button
              type="button"
              onClick={fetchHistory}
              disabled={loadingHistory}
              className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-xl flex items-center gap-1.5 transition cursor-pointer"
            >
              <RotateCcw className={`w-3.5 h-3.5 ${loadingHistory ? 'animate-spin' : ''}`} />
              Refresh Log
            </button>
          </div>

          {loadingHistory ? (
            <div className="py-12 text-center text-slate-400 text-xs">
              <div className="inline-block w-6 h-6 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin mb-2"></div>
              <div>Loading subscription history...</div>
            </div>
          ) : historyList.length === 0 ? (
            <div className="py-12 text-center text-slate-400 text-xs">
              No renewal transactions recorded yet.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-200 text-slate-400 font-bold uppercase tracking-wider text-[10px]">
                    <th className="pb-3 pl-2">ID</th>
                    <th className="pb-3">Plan Name</th>
                    <th className="pb-3">Status</th>
                    <th className="pb-3">Valid Until</th>
                    <th className="pb-3">Billing Cycle</th>
                    <th className="pb-3">Monthly Eq.</th>
                    <th className="pb-3">Payment Date / Ref</th>
                    <th className="pb-3 pr-2">Notes</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                  {historyList.map((item) => (
                    <tr key={item.id} className="hover:bg-slate-50 transition">
                      <td className="py-3.5 pl-2 font-mono text-slate-400">#{item.id}</td>
                      <td className="py-3.5 font-bold text-slate-900">{item.plan_name}</td>
                      <td className="py-3.5">
                        <span className={`px-2 py-0.5 rounded-full font-bold text-[10px] uppercase ${
                          item.status === 'ACTIVE'
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            : item.status === 'PENDING'
                            ? 'bg-amber-50 text-amber-700 border border-amber-200'
                            : 'bg-rose-50 text-rose-700 border border-rose-200'
                        }`}>
                          {item.status}
                        </span>
                      </td>
                      <td className="py-3.5 font-mono text-slate-800">{formatDate(item.valid_until)}</td>
                      <td className="py-3.5 font-semibold text-indigo-700">{item.billing_cycle || 'ANNUAL'}</td>
                      <td className="py-3.5 font-mono font-bold text-slate-900">₹{item.monthly_price?.toLocaleString('en-IN') || 0}</td>
                      <td className="py-3.5">
                        <div className="text-slate-800">{item.last_payment_date ? formatDate(item.last_payment_date) : '—'}</div>
                        <div className="text-[10px] text-slate-400 font-mono">{item.last_payment_ref || 'Initial Setup'}</div>
                      </td>
                      <td className="py-3.5 pr-2 text-slate-500 text-[11px] max-w-xs truncate">
                        {item.notes || 'Standard License'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Renewal Modal */}
      {renewModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 max-w-md w-full p-6 sm:p-8 relative">
            <h3 className="text-lg font-bold text-slate-900">Renew Software License & AMC</h3>
            <p className="text-xs text-slate-500 mt-0.5">Select package and record payment</p>

            <div className="mt-5 space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-slate-600 mb-1.5">Select Package</label>
                <select
                  value={selectedTier}
                  onChange={(e) => setSelectedTier(e.target.value)}
                  className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-800 cursor-pointer"
                >
                  <option value="starter">Silver Starter Tier (₹12,000 / Year)</option>
                  <option value="professional">Gold Pro Tier + Full AMC (₹24,000 / Year)</option>
                  <option value="enterprise">Platinum Enterprise + Mobile App (₹48,000 / Year)</option>
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-600 mb-1.5">Billing Term</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setSelectedPeriod('annual')}
                    className={`p-2.5 rounded-xl border font-bold text-center cursor-pointer ${
                      selectedPeriod === 'annual'
                        ? 'border-indigo-600 bg-indigo-50 text-indigo-900'
                        : 'border-slate-200 bg-slate-50 text-slate-600'
                    }`}
                  >
                    1 Full Year (Annual)
                  </button>
                  <button
                    type="button"
                    onClick={() => setSelectedPeriod('half_yearly')}
                    className={`p-2.5 rounded-xl border font-bold text-center cursor-pointer ${
                      selectedPeriod === 'half_yearly'
                        ? 'border-indigo-600 bg-indigo-50 text-indigo-900'
                        : 'border-slate-200 bg-slate-50 text-slate-600'
                    }`}
                  >
                    6 Months
                  </button>
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-600 mb-1.5">Payment Method</label>
                <input
                  type="text"
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl"
                  placeholder="e.g. Bank NEFT / Corporate UPI"
                />
              </div>

              <div className="p-3.5 bg-indigo-50 border border-indigo-200 rounded-2xl flex justify-between items-center text-indigo-950 font-bold">
                <span>Total Amount:</span>
                <span className="text-xl text-indigo-700">
                  {selectedTier === 'starter' 
                    ? (selectedPeriod === 'annual' ? '₹12,000' : '₹6,000')
                    : selectedTier === 'professional'
                    ? (selectedPeriod === 'annual' ? '₹24,000' : '₹12,000')
                    : (selectedPeriod === 'annual' ? '₹48,000' : '₹24,000')}
                </span>
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setRenewModalOpen(false)}
                  className="px-4 py-2 font-semibold text-slate-600 hover:bg-slate-100 rounded-xl cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={processing}
                  onClick={handleRenewPayment}
                  className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl shadow-lg transition cursor-pointer disabled:opacity-50"
                >
                  {processing ? 'Processing...' : 'Confirm & Activate'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
