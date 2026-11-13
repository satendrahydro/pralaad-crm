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
  Check
} from 'lucide-react';
import { formatINR, formatDate, COMPOUNDING_OPTIONS, apiRequest, getApiBase, getDefaultServerUrl } from '../utils';

export default function CustomerApp({ onSwitchToStaffCRM, onPrintCertificate }) {
  const [customerToken, setCustomerToken] = useState(() => localStorage.getItem('pralaad_customer_token'));
  const [customerUser, setCustomerUser] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('pralaad_customer_data'));
    } catch {
      return null;
    }
  });

  // Login state
  const [identifier, setIdentifier] = useState('CUST-1001');
  const [pin, setPin] = useState('client123');
  const [loginLoading, setLoginLoading] = useState(false);
  const [loginError, setLoginError] = useState('');
  const [serverUrl, setServerUrl] = useState(() => getDefaultServerUrl());
  const [showServerConfig, setShowServerConfig] = useState(false);
  const [customServerInput, setCustomServerInput] = useState(() => getDefaultServerUrl());

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
    } catch (err) {
      setLoginError(err.message);
    } finally {
      setLoginLoading(false);
    }
  };

  const handleQuickDemoLogin = (phone) => {
    setIdentifier(phone);
    setPin('1234');
    setTimeout(() => {
      handleLoginDirect(phone, '1234');
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
    } catch (err) {
      setLoginError(err.message);
    } finally {
      setLoginLoading(false);
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

  // IF NOT LOGGED IN: SHOW CUSTOMER LOGIN
  if (!customerToken) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-indigo-950 flex flex-col justify-between p-4 sm:p-6 font-sans">
        
        {/* Top Header Switcher */}
        <div className="max-w-md w-full mx-auto flex justify-between items-center py-2">
          <div className="flex items-center gap-2 text-white">
            <Smartphone className="w-5 h-5 text-indigo-400" />
            <span className="text-xs font-bold uppercase tracking-wider text-indigo-300">Client Mobile Portal</span>
          </div>

          <button
            onClick={onSwitchToStaffCRM}
            className="text-xs font-bold text-slate-300 hover:text-white bg-white/10 hover:bg-white/20 px-3 py-1.5 rounded-full transition cursor-pointer"
          >
            ← Back to Staff CRM
          </button>
        </div>

        {/* Login Card */}
        <div className="max-w-md w-full mx-auto bg-white/95 backdrop-blur-xl rounded-3xl p-6 sm:p-8 shadow-2xl border border-white/20">
          
          <div className="text-center mb-6">
            <div className="w-16 h-16 rounded-2xl bg-indigo-600 text-white flex items-center justify-center mx-auto shadow-lg shadow-indigo-600/30 mb-3">
              <TrendingUp className="w-8 h-8" />
            </div>
            <h1 className="text-2xl font-black text-slate-900">Pralaad Wealth App</h1>
            <p className="text-xs text-slate-500 mt-1">अपने सभी Fixed Deposits और पेआउट्स की स्थिति लाइव देखें</p>
          </div>

          {loginError && (
            <div className="mb-4 p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-xl">
              {loginError}
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
                placeholder="e.g. CUST-1001 or 9811122334"
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">
                Client Password (पासवर्ड)
              </label>
              <input
                type="password"
                required
                value={pin}
                onChange={(e) => setPin(e.target.value)}
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold text-slate-900 focus:bg-white focus:ring-2 focus:ring-indigo-600"
                placeholder="Enter client password"
              />
              <p className="text-[11px] text-slate-400 mt-1">डिफ़ॉल्ट क्लाइंट पासवर्ड: <code className="bg-slate-100 px-1 py-0.5 rounded font-mono font-bold text-slate-700">client123</code></p>
            </div>

            <button
              type="submit"
              disabled={loginLoading}
              className="w-full py-3.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl shadow-lg shadow-indigo-600/30 transition flex items-center justify-center gap-2 text-sm cursor-pointer disabled:opacity-50"
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
              Quick 1-Click Demo Client Accounts
            </span>
            <div className="space-y-2">
              <button
                type="button"
                onClick={() => handleQuickDemoLogin('CUST-1001')}
                className="w-full p-2.5 bg-slate-50 hover:bg-indigo-50 border border-slate-200 hover:border-indigo-300 rounded-xl text-xs flex justify-between items-center transition cursor-pointer"
              >
                <div className="text-left">
                  <div className="font-bold text-slate-800">Rajesh Sharma (CUST-1001)</div>
                  <div className="text-[10px] text-slate-500">ID: CUST-1001 • Pass: client123</div>
                </div>
                <span className="font-bold text-indigo-600 text-xs">Login &rarr;</span>
              </button>

              <button
                type="button"
                onClick={() => handleQuickDemoLogin('CUST-1002')}
                className="w-full p-2.5 bg-slate-50 hover:bg-indigo-50 border border-slate-200 hover:border-indigo-300 rounded-xl text-xs flex justify-between items-center transition cursor-pointer"
              >
                <div className="text-left">
                  <div className="font-bold text-slate-800">Mahendra Patel (CUST-1002)</div>
                  <div className="text-[10px] text-slate-500">ID: CUST-1002 • Pass: client123</div>
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
                    placeholder="http://192.168.31.240:5000"
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
                  💡 <b>Office / Wi-Fi par:</b> Laptop ka IP address (default: <code className="text-slate-700 font-bold">http://192.168.31.240:5000</code>)<br/>
                  🌐 <b>Anywhere Internet:</b> Apna live server / cloud domain enter karein.
                </p>
              </div>
            )}
          </div>

        </div>

        {/* Footer */}
        <div className="text-center text-xs text-slate-500 py-4">
          Safe & Encrypted 256-Bit Financial Client Portal
        </div>

      </div>
    );
  }

  const { customer, stats, fds = [], upcomingPayouts = [], companySettings = {} } = portfolioData || {};

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col font-sans pb-20">
      
      {/* App Mobile Header */}
      <header className="bg-slate-900 text-white sticky top-0 z-40 border-b border-slate-800 shadow-md">
        <div className="max-w-md mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-indigo-500 to-indigo-700 text-white flex items-center justify-center font-black shadow-md">
              <TrendingUp className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-black text-sm tracking-tight text-white leading-tight">
                {customer?.full_name || 'My FD Account'}
              </h2>
              <span className="text-[10px] text-indigo-300 font-mono">
                {customer?.customer_code} • {customer?.phone}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={onSwitchToStaffCRM}
              className="text-[10px] font-bold bg-white/10 hover:bg-white/20 text-indigo-200 px-2.5 py-1.5 rounded-lg transition cursor-pointer"
            >
              CRM Portal
            </button>
            <button
              onClick={handleLogout}
              title="Logout"
              className="p-1.5 text-slate-400 hover:text-rose-400 rounded-lg cursor-pointer"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </header>

      {/* Main Mobile App Container */}
      <main className="max-w-md w-full mx-auto p-4 flex-1 space-y-5">
        
        {loadingPortfolio && !portfolioData ? (
          <div className="py-24 text-center">
            <div className="inline-block w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
            <p className="text-xs text-slate-500 mt-2 font-medium">Loading your portfolio...</p>
          </div>
        ) : (
          <>
            {/* VIEW 1: HOME DASHBOARD */}
            {currentNav === 'home' && (
              <div className="space-y-4">
                
                {/* Total Wealth Highlight Card */}
                <div className="bg-gradient-to-br from-indigo-700 via-indigo-800 to-slate-950 text-white rounded-3xl p-6 shadow-xl relative overflow-hidden">
                  <div className="flex justify-between items-start">
                    <div>
                      <span className="text-[10px] uppercase font-bold tracking-widest text-indigo-200 bg-white/10 px-2.5 py-0.5 rounded-full">
                        Total Investment Portfolio
                      </span>
                      <p className="text-xs text-indigo-200 mt-2">Active Principal Deposited</p>
                      <div className="text-3xl font-black mt-0.5 tracking-tight">
                        {formatINR(stats?.totalPrincipal)}
                      </div>
                    </div>

                    <div className="text-right">
                      <span className="text-[10px] text-emerald-300 font-bold block uppercase">Active FDs</span>
                      <span className="text-lg font-black text-white bg-white/10 px-2.5 py-0.5 rounded-lg inline-block mt-0.5">
                        {stats?.activeCount} FDs
                      </span>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3 mt-5 pt-5 border-t border-white/15 text-xs">
                    <div className="bg-white/10 p-2.5 rounded-xl">
                      <span className="text-[10px] text-indigo-200 block">Total Maturity Value</span>
                      <span className="text-base font-black text-white">{formatINR(stats?.totalMaturity)}</span>
                    </div>
                    <div className="bg-white/10 p-2.5 rounded-xl">
                      <span className="text-[10px] text-emerald-200 block">Interest Gains</span>
                      <span className="text-base font-black text-emerald-300">+{formatINR(stats?.totalInterest)}</span>
                    </div>
                  </div>
                </div>

                {/* Quick Action Shortcuts */}
                <div className="grid grid-cols-3 gap-2 text-center text-xs font-semibold">
                  <button
                    onClick={() => setCurrentNav('fds')}
                    className="p-3 bg-white rounded-2xl border border-slate-200 shadow-sm hover:bg-slate-50 transition cursor-pointer flex flex-col items-center gap-1.5"
                  >
                    <div className="p-2 bg-indigo-50 text-indigo-600 rounded-xl">
                      <FileText className="w-4 h-4" />
                    </div>
                    <span className="text-[11px] text-slate-800">My Receipts</span>
                  </button>

                  <button
                    onClick={() => setCurrentNav('invest')}
                    className="p-3 bg-white rounded-2xl border border-slate-200 shadow-sm hover:bg-slate-50 transition cursor-pointer flex flex-col items-center gap-1.5"
                  >
                    <div className="p-2 bg-emerald-50 text-emerald-600 rounded-xl">
                      <PlusCircle className="w-4 h-4" />
                    </div>
                    <span className="text-[11px] text-slate-800">Invest More</span>
                  </button>

                  <button
                    onClick={() => setCurrentNav('calc')}
                    className="p-3 bg-white rounded-2xl border border-slate-200 shadow-sm hover:bg-slate-50 transition cursor-pointer flex flex-col items-center gap-1.5"
                  >
                    <div className="p-2 bg-blue-50 text-blue-600 rounded-xl">
                      <CalcIcon className="w-4 h-4" />
                    </div>
                    <span className="text-[11px] text-slate-800">Calculator</span>
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
                      <label className="block font-semibold text-slate-600 mb-1">Tenure (Months)</label>
                      <input
                        type="number"
                        value={calcMonths}
                        onChange={(e) => setCalcMonths(parseInt(e.target.value) || 12)}
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-bold"
                      />
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

            {/* VIEW 4: INVEST MORE / SELF-SERVICE BOOKING */}
            {currentNav === 'invest' && (
              <div className="bg-white rounded-3xl p-5 border border-slate-200 shadow-sm space-y-4">
                <div className="border-b border-slate-100 pb-3">
                  <h2 className="text-base font-bold text-slate-900">Open New Fixed Deposit</h2>
                  <p className="text-xs text-slate-500 mt-0.5">Instant online FD booking with UPI / Netbanking</p>
                </div>

                {investSuccess && (
                  <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs rounded-xl flex items-center gap-2">
                    <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                    <span>{investSuccess}</span>
                  </div>
                )}

                <form onSubmit={handleInvestSubmit} className="space-y-3 text-xs">
                  <div>
                    <label className="block font-semibold text-slate-600 mb-1">Deposit Amount (₹)</label>
                    <input
                      type="number"
                      required
                      min="5000"
                      step="5000"
                      value={investAmount}
                      onChange={(e) => setInvestAmount(Number(e.target.value))}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-base font-bold text-slate-900"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block font-semibold text-slate-600 mb-1">Tenure (Months)</label>
                      <input
                        type="number"
                        min="3"
                        max="120"
                        value={investTenure}
                        onChange={(e) => setInvestTenure(parseInt(e.target.value) || 12)}
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-bold"
                      />
                    </div>
                    <div>
                      <label className="block font-semibold text-slate-600 mb-1">Interest Rate</label>
                      <div className="px-3 py-2 bg-slate-100 rounded-xl font-bold text-emerald-700">
                        8.50% p.a.
                      </div>
                    </div>
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-600 mb-1">Interest Scheme</label>
                    <select
                      value={investFreq}
                      onChange={(e) => setInvestFreq(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-semibold cursor-pointer"
                    >
                      <option value="quarterly">Quarterly Compounding (Growth FD)</option>
                      <option value="payout_monthly">Monthly Regular Pension Payout</option>
                      <option value="simple">Simple Interest at Maturity</option>
                    </select>
                  </div>

                  <div className="p-3 bg-indigo-50 border border-indigo-100 rounded-xl text-slate-700 space-y-1">
                    <div className="flex justify-between font-bold">
                      <span>Payment Method:</span>
                      <span className="text-indigo-700">UPI / Net Banking Auto-Pay</span>
                    </div>
                    <p className="text-[10px] text-slate-500">
                      Amount will be debited directly from your linked bank account ({customer?.bank_name} - ..{customer?.account_no?.slice(-4) || 'XXXX'}).
                    </p>
                  </div>

                  <button
                    type="submit"
                    disabled={investProcessing}
                    className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl shadow-lg shadow-emerald-600/30 transition text-xs cursor-pointer disabled:opacity-50"
                  >
                    {investProcessing ? 'Processing Payment...' : 'Pay & Book FD Instantly'}
                  </button>
                </form>
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
                </div>
              </div>
            )}
          </>
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
              currentNav === 'invest' ? 'text-emerald-600 font-bold' : 'text-slate-400 hover:text-slate-600'
            }`}
          >
            <div className="w-7 h-7 -mt-2 bg-emerald-600 text-white rounded-full flex items-center justify-center shadow-md">
              <PlusCircle className="w-4 h-4" />
            </div>
            <span className="text-[10px]">Invest</span>
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
