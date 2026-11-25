import React, { useState, useEffect } from 'react';
import { 
  X, 
  CheckCircle, 
  UserPlus, 
  Search, 
  Building2, 
  Sparkles,
  Calendar,
  Percent,
  Calculator as CalcIcon,
  Smartphone,
  Key
} from 'lucide-react';
import { formatINR, formatDate, COMPOUNDING_OPTIONS, apiRequest } from '../utils';

export default function NewFDModal({ 
  isOpen, 
  onClose, 
  initialData, 
  onFDCreated,
  onOpenQuickAddCustomer 
}) {
  const [customers, setCustomers] = useState([]);
  const [selectedCustomerId, setSelectedCustomerId] = useState('');
  const [customerSearch, setCustomerSearch] = useState('');

  const [principal, setPrincipal] = useState(100000);
  const [annualRate, setAnnualRate] = useState(8.5);
  const [tenureMonths, setTenureMonths] = useState(12);
  const [isCustomTenure, setIsCustomTenure] = useState(false);
  const [compoundingFrequency, setCompoundingFrequency] = useState('quarterly');
  const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [remarks, setRemarks] = useState('');

  const [preview, setPreview] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [appAccessEnabled, setAppAccessEnabled] = useState(true);
  const [appPassword, setAppPassword] = useState('client123');
  const [sendWhatsAppCreds, setSendWhatsAppCreds] = useState(false);

  // Quick Add Customer Inline State
  const [quickAddOpen, setQuickAddOpen] = useState(false);
  const [quickCust, setQuickCust] = useState({
    full_name: '',
    phone: '',
    email: '',
    pan_card: ''
  });
  const [quickLoading, setQuickLoading] = useState(false);
  const [quickError, setQuickError] = useState('');

  const handleQuickAddSubmit = async (e) => {
    e.preventDefault();
    if (!quickCust.full_name || !quickCust.phone) {
      setQuickError('Name and phone are required (नाम और मोबाइल जरूरी है)');
      return;
    }
    try {
      setQuickLoading(true);
      setQuickError('');
      const res = await apiRequest('/customers', {
        method: 'POST',
        body: JSON.stringify(quickCust)
      });
      if (res.success && res.customer) {
        await loadCustomers();
        setSelectedCustomerId(res.customer.id);
        setQuickAddOpen(false);
        setQuickCust({ full_name: '', phone: '', email: '', pan_card: '' });
      }
    } catch (err) {
      setQuickError(err.message || 'Error saving customer');
    } finally {
      setQuickLoading(false);
    }
  };

  // Fetch customers
  const loadCustomers = async () => {
    try {
      const res = await apiRequest('/customers');
      const list = res.customers || [];
      setCustomers(list);
      if (initialData?.customer_id) {
        setSelectedCustomerId(String(initialData.customer_id));
      } else if (initialData?.customerId) {
        setSelectedCustomerId(String(initialData.customerId));
      }
    } catch (err) {
      console.error('Failed to load customers', err);
    }
  };

  useEffect(() => {
    if (isOpen) {
      loadCustomers();
      if (initialData) {
        if (initialData.customer_id) setSelectedCustomerId(String(initialData.customer_id));
        if (initialData.customerId) setSelectedCustomerId(String(initialData.customerId));
        if (initialData.principal) setPrincipal(initialData.principal);
        if (initialData.annualRate) setAnnualRate(initialData.annualRate);
        if (initialData.tenureMonths) setTenureMonths(initialData.tenureMonths);
        if (initialData.compoundingFrequency) setCompoundingFrequency(initialData.compoundingFrequency);
        if (initialData.startDate) setStartDate(initialData.startDate);
      } else {
        // Reset when opened cleanly without initialData
        setSelectedCustomerId('');
        setCustomerSearch('');
      }
    }
  }, [isOpen, initialData]);

  useEffect(() => {
    if (selectedCustomerId) {
      const c = customers.find(x => String(x.id) === String(selectedCustomerId));
      if (c) {
        setAppAccessEnabled(c.app_access_enabled !== 0);
        setAppPassword(c.login_password || 'client123');
      }
    }
  }, [selectedCustomerId, customers]);

  // Live preview calculation
  useEffect(() => {
    if (!isOpen) return;
    const fetchPreview = async () => {
      try {
        const res = await apiRequest('/fds/calculate', {
          method: 'POST',
          body: JSON.stringify({
            principal: parseFloat(principal) || 0,
            annualRate: parseFloat(annualRate) || 0,
            tenureMonths: parseInt(tenureMonths) || 12,
            compoundingFrequency,
            startDate
          })
        });
        setPreview(res.result);
      } catch (err) {
        console.error('Preview error', err);
      }
    };

    const timer = setTimeout(fetchPreview, 150);
    return () => clearTimeout(timer);
  }, [principal, annualRate, tenureMonths, compoundingFrequency, startDate, isOpen]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!selectedCustomerId) {
      setError('Please select a customer');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const user = JSON.parse(localStorage.getItem('pralaad_fd_user') || '{}');
      const isEmployee = user.role === 'employee';

      if (isEmployee) {
        const res = await apiRequest('/approvals', {
          method: 'POST',
          body: JSON.stringify({
            request_type: 'NEW_FD',
            customer_id: selectedCustomerId,
            proposed_amount: principal,
            request_data: {
              customerId: selectedCustomerId,
              principal,
              annualRate,
              tenureMonths,
              compoundingFrequency,
              startDate,
              remarks
            },
            remarks: `Staff Maker Entry: Proposed FD Booking for ₹${principal}`
          })
        });

        alert(`Submission Successful (${res.request_number})!\n\nThis entry has been queued in 'PENDING APPROVAL'. It will appear as an active FD contract after Admin Checker verification.`);
        if (onFDCreated) onFDCreated({ status: 'PENDING_APPROVAL' });
        onClose();
        return;
      }

      const res = await apiRequest('/fds', {
        method: 'POST',
        body: JSON.stringify({
          customer_id: selectedCustomerId,
          principal_amount: principal,
          annual_rate: annualRate,
          tenure_months: tenureMonths,
          compounding_frequency: compoundingFrequency,
          start_date: startDate,
          remarks
        })
      });

      // Sync customer app access & password settings
      try {
        await apiRequest(`/customers/${selectedCustomerId}`, {
          method: 'PUT',
          body: JSON.stringify({
            app_access_enabled: appAccessEnabled ? 1 : 0,
            login_password: appPassword || 'client123'
          })
        });
      } catch (e) {
        console.warn('App access sync notice:', e);
      }

      if (sendWhatsAppCreds && selectedCustomer?.phone) {
        const cleanPhone = selectedCustomer.phone.replace(/[^0-9]/g, '');
        const fullPhone = cleanPhone.length === 10 ? `91${cleanPhone}` : cleanPhone;
        const msg = `नमस्ते ${selectedCustomer.full_name} जी! 🙏\n\nTaranganjali Private Limited में आपकी नई FD (सावधि जमा) सफलतापूर्वक बुक कर दी गई है।\n\n📱 मोबाइल ऐप लॉगिन विवरण:\n👤 User ID: ${selectedCustomer.customer_code}\n🔑 Password: ${appPassword || 'client123'}\n\n📲 ऐप डाउनलोड करें और अपना FD सर्टिफिकेट व पासबुक देखें:\n${window.location.origin}\n\nधन्यवाद,\nTaranganjali Private Limited`;
        window.open(`https://wa.me/${fullPhone}?text=${encodeURIComponent(msg)}`, '_blank');
      }

      if (onFDCreated) onFDCreated(res.fd);
      onClose();
    } catch (err) {
      setError(err.message || 'Failed to book FD');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  const selectedCustomer = customers.find(c => String(c.id) === String(selectedCustomerId));
  
  const searchLower = customerSearch.trim().toLowerCase();
  let filteredCustomers = customers.filter(c => {
    if (!searchLower) return true;
    return (
      (c.full_name && c.full_name.toLowerCase().includes(searchLower)) ||
      (c.phone && c.phone.includes(searchLower)) ||
      (c.customer_code && c.customer_code.toLowerCase().includes(searchLower)) ||
      String(c.id) === searchLower
    );
  });

  // Ensure selectedCustomer is ALWAYS in the options list so dropdown doesn't blank out
  if (selectedCustomer && !filteredCustomers.some(c => String(c.id) === String(selectedCustomer.id))) {
    filteredCustomers = [selectedCustomer, ...filteredCustomers];
  }

  return (
    <div className="fixed inset-0 z-[10001] bg-slate-950/80 backdrop-blur-sm flex justify-center items-start pt-6 sm:pt-8 pb-10 p-3 sm:p-6 overflow-y-auto">
      <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 max-w-2xl w-full p-6 sm:p-8 relative">
        
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute right-5 top-5 inline-flex items-center gap-1 px-3 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 rounded-xl font-bold text-xs border border-rose-200 transition cursor-pointer"
          title="Close Modal"
        >
          <X className="w-4 h-4 text-rose-600 stroke-[2.5]" />
          <span>Close</span>
        </button>

        {/* Modal Header */}
        <div className="flex items-center gap-3 mb-6">
          <div className="w-12 h-12 rounded-2xl bg-indigo-600 text-white flex items-center justify-center shadow-lg shadow-indigo-600/30">
            <Building2 className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-slate-900">Book New Fixed Deposit</h2>
            <p className="text-xs text-slate-500">Naya FD account create karein aur instant certificate issue karein</p>
          </div>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-xl">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          
          {/* Customer Selection */}
          <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-3">
            <div className="flex justify-between items-center">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-700">
                Select Client / Account Holder (ग्राहक) *
              </label>
              <button
                type="button"
                onClick={() => {
                  setQuickError('');
                  setQuickCust({ full_name: '', phone: '', email: '', pan_card: '' });
                  setQuickAddOpen(true);
                }}
                className="text-xs font-bold text-indigo-600 hover:text-indigo-800 flex items-center gap-1 cursor-pointer bg-indigo-50 hover:bg-indigo-100 px-2.5 py-1 rounded-lg transition"
              >
                <UserPlus className="w-3.5 h-3.5" />
                + Add New Client (ग्राहक जोड़ें)
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-[11px] font-semibold text-slate-600 block mb-1">
                  🔍 Filter / Search Depositor
                </label>
                <div className="relative">
                  <input
                    type="text"
                    placeholder="Search name, phone, code or ID..."
                    value={customerSearch}
                    onChange={(e) => {
                      const val = e.target.value;
                      setCustomerSearch(val);
                      const matches = customers.filter(c => 
                        (c.full_name && c.full_name.toLowerCase().includes(val.toLowerCase())) ||
                        (c.phone && c.phone.includes(val)) ||
                        (c.customer_code && c.customer_code.toLowerCase().includes(val.toLowerCase())) ||
                        String(c.id) === val.trim()
                      );
                      if (matches.length === 1 && val.trim().length >= 3) {
                        setSelectedCustomerId(String(matches[0].id));
                      }
                    }}
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-indigo-500"
                  />
                  {customerSearch && (
                    <button
                      type="button"
                      onClick={() => setCustomerSearch('')}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs font-bold"
                    >
                      ✕
                    </button>
                  )}
                </div>
              </div>

              <div>
                <label className="text-[11px] font-semibold text-slate-600 block mb-1">
                  Choose Customer ({filteredCustomers.length} Available) *
                </label>
                <select
                  required
                  value={selectedCustomerId}
                  onChange={(e) => setSelectedCustomerId(e.target.value)}
                  className={`w-full px-3 py-2 bg-white border rounded-xl text-xs font-semibold focus:ring-2 focus:ring-indigo-500 cursor-pointer ${
                    selectedCustomerId ? 'border-indigo-400 text-slate-900' : 'border-slate-300 text-slate-500'
                  }`}
                >
                  <option value="">-- Click to Select Customer --</option>
                  {filteredCustomers.map(c => (
                    <option key={c.id} value={c.id}>
                      {c.full_name} ({c.phone}) - {c.customer_code}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {selectedCustomer ? (
              <div className="p-3 bg-emerald-50/70 border border-emerald-200 rounded-xl flex items-center justify-between text-xs transition">
                <div className="space-y-0.5">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-slate-900 text-sm">{selectedCustomer.full_name}</span>
                    <span className="px-2 py-0.5 bg-indigo-100 text-indigo-800 font-mono text-[10px] rounded font-bold">{selectedCustomer.customer_code}</span>
                    {selectedCustomer.is_senior_citizen ? (
                      <span className="px-1.5 py-0.5 bg-amber-100 text-amber-800 text-[10px] rounded font-bold">Sr. Citizen (+0.50% Rate Bonus)</span>
                    ) : null}
                  </div>
                  <div className="text-[11px] text-slate-600 flex flex-wrap gap-x-3 gap-y-0.5 pt-0.5">
                    <span>📱 <strong>{selectedCustomer.phone}</strong></span>
                    <span>💳 PAN: <strong>{selectedCustomer.pan_card || 'Not Added'}</strong></span>
                    <span>🏦 <strong>{selectedCustomer.bank_name || 'Bank N/A'}</strong> {selectedCustomer.account_no ? `(..${selectedCustomer.account_no.slice(-4)})` : ''}</span>
                    <span>👤 Nominee: <strong>{selectedCustomer.nominee_name || 'N/A'}</strong></span>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setSelectedCustomerId('');
                    setCustomerSearch('');
                  }}
                  className="px-2.5 py-1 text-[11px] font-semibold text-rose-600 hover:text-rose-800 bg-white hover:bg-rose-50 rounded-lg border border-slate-200 transition cursor-pointer shrink-0"
                >
                  Change
                </button>
              </div>
            ) : (
              <div className="p-2.5 bg-amber-50 border border-amber-200 rounded-xl text-[11px] text-amber-800 flex items-center justify-between">
                <span>⚠️ Please select a customer from the dropdown above, or click "+ Add New Client" to register.</span>
              </div>
            )}
          </div>

          {/* Deposit Parameters */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">
                Deposit Principal Amount (₹)
              </label>
              <input
                type="number"
                required
                min="1000"
                step="1000"
                value={principal}
                onChange={(e) => setPrincipal(Number(e.target.value))}
                className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-800 focus:bg-white focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">
                Annual Interest Rate (% p.a.)
              </label>
              <input
                type="number"
                required
                step="0.05"
                min="1"
                max="30"
                value={annualRate}
                onChange={(e) => setAnnualRate(parseFloat(e.target.value) || 0)}
                className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-800 focus:bg-white focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs font-semibold text-slate-600">
                  Tenure (अवधि)
                </label>
                {isCustomTenure && (
                  <span className="text-[10px] font-bold text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200">
                    Custom Active
                  </span>
                )}
              </div>
              <select
                value={isCustomTenure ? 'custom' : tenureMonths}
                onChange={(e) => {
                  const val = e.target.value;
                  if (val === 'custom') {
                    setIsCustomTenure(true);
                  } else {
                    setIsCustomTenure(false);
                    setTenureMonths(parseInt(val) || 12);
                  }
                }}
                className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:bg-white focus:ring-2 focus:ring-indigo-500 cursor-pointer"
              >
                <option value="6">6 Months</option>
                <option value="12">12 Months (1 Year)</option>
                <option value="24">24 Months (2 Years)</option>
                <option value="36">36 Months (3 Years)</option>
                <option value="60">60 Months (5 Years)</option>
                <option value="custom">Custom Tenure (कस्टम अवधि दर्ज करें)</option>
              </select>

              {isCustomTenure && (
                <div className="mt-2 relative animate-fadeIn">
                  <input
                    type="number"
                    required
                    min="0"
                    max="360"
                    value={tenureMonths}
                    onChange={(e) => setTenureMonths(e.target.value === '' ? '' : parseInt(e.target.value) || 0)}
                    onBlur={() => {
                      if (!tenureMonths || Number(tenureMonths) < 1) setTenureMonths(1);
                    }}
                    placeholder="Enter custom months"
                    className="w-full px-3 py-2 bg-amber-50/50 border border-amber-300 rounded-xl text-xs font-bold text-slate-900 focus:bg-white focus:ring-2 focus:ring-amber-500"
                  />
                  <span className="absolute right-3 top-2 text-xs font-semibold text-slate-500 pointer-events-none">
                    Months ({((parseInt(tenureMonths) || 0) / 12).toFixed(1)} Yrs)
                  </span>
                </div>
              )}
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">
                Deposit Start Date
              </label>
              <input
                type="date"
                required
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold text-slate-800 focus:bg-white focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </div>

          {/* Scheme Selection */}
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">
              Interest Calculation & Payout Frequency
            </label>
            <select
              value={compoundingFrequency}
              onChange={(e) => setCompoundingFrequency(e.target.value)}
              className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:bg-white focus:ring-2 focus:ring-indigo-500 cursor-pointer"
            >
              <optgroup label="Cumulative Schemes (ब्याज मैच्योरिटी पर जुड़ेगा)">
                {COMPOUNDING_OPTIONS.filter(o => o.cumulative).map(opt => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </optgroup>
              <optgroup label="Non-Cumulative Schemes (नियमित ब्याज पेआउट)">
                {COMPOUNDING_OPTIONS.filter(o => !o.cumulative).map(opt => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </optgroup>
            </select>
          </div>

          {/* Live Preview Card */}
          {preview && (
            <div className="bg-gradient-to-r from-indigo-900 to-indigo-800 text-white rounded-2xl p-4 shadow-md">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                <div>
                  <span className="text-indigo-200 block text-[10px]">Maturity Amount</span>
                  <span className="text-base font-black text-white">{formatINR(preview.maturityAmount)}</span>
                </div>
                <div>
                  <span className="text-indigo-200 block text-[10px]">Total Interest</span>
                  <span className="text-sm font-bold text-emerald-300">+{formatINR(preview.totalInterest)}</span>
                </div>
                <div>
                  <span className="text-indigo-200 block text-[10px]">Maturity Date</span>
                  <span className="text-xs font-semibold text-white">{formatDate(preview.maturityDate)}</span>
                </div>
                <div>
                  <span className="text-indigo-200 block text-[10px]">
                    {!preview.isCumulative ? 'Periodic Payout' : 'Compounding'}
                  </span>
                  <span className="text-xs font-bold text-amber-300">
                    {!preview.isCumulative ? formatINR(preview.periodicPayout) : 'Compounded'}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* 📱 Mobile App Access Control Card */}
          <div className="p-3 bg-gradient-to-r from-amber-500/10 to-indigo-500/10 border border-amber-500/30 rounded-xl space-y-2.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="p-1.5 bg-amber-500 text-slate-950 rounded-lg font-bold">
                  <Smartphone className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-slate-900">Mobile App Access (मोबाइल ऐप एक्सेस)</h4>
                  <p className="text-[10px] text-slate-500">इस FD को ग्राहक के मोबाइल ऐप व डिजिटल पासबुक में तुरंत सक्रिय रखें</p>
                </div>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={appAccessEnabled}
                  onChange={(e) => setAppAccessEnabled(e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-9 h-5 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-emerald-600"></div>
                <span className="ml-2 text-xs font-bold text-slate-700">
                  {appAccessEnabled ? 'App Active (चालू)' : 'App Blocked (बंद)'}
                </span>
              </label>
            </div>

            {appAccessEnabled && (
              <div className="pt-2 border-t border-amber-500/20 grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                <div>
                  <span className="text-[10px] text-slate-500 font-semibold block mb-0.5">लॉगिन आईडी (Login ID):</span>
                  <div className="px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg font-mono font-bold text-slate-800">
                    {selectedCustomer ? selectedCustomer.customer_code : 'Auto-Assigned'}
                  </div>
                </div>
                <div>
                  <span className="text-[10px] text-slate-500 font-semibold block mb-0.5">ऐप पासवर्ड (App Password):</span>
                  <input
                    type="text"
                    value={appPassword}
                    onChange={(e) => setAppPassword(e.target.value)}
                    placeholder="client123"
                    className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg font-mono font-bold text-slate-800 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  />
                </div>
                <div className="sm:col-span-2 pt-1">
                  <label className="flex items-center gap-2 cursor-pointer text-[11px] text-slate-700 font-medium">
                    <input
                      type="checkbox"
                      checked={sendWhatsAppCreds}
                      onChange={(e) => setSendWhatsAppCreds(e.target.checked)}
                      className="rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
                    />
                    <span>📲 FD बनने पर ग्राहक को WhatsApp पर लॉगिन आईडी व पासवर्ड भेजें</span>
                  </label>
                </div>
              </div>
            )}
          </div>

          {/* Remarks */}
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">
              Remarks / Notes (Optional)
            </label>
            <input
              type="text"
              placeholder="e.g. Special festive interest rate, Senior citizen bonus included"
              value={remarks}
              onChange={(e) => setRemarks(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:bg-white focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          {/* Actions */}
          <div className="flex justify-end items-center gap-3 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition cursor-pointer"
            >
              Cancel
            </button>

            <button
              type="submit"
              disabled={loading}
              className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl shadow-lg shadow-indigo-600/30 transition flex items-center gap-2 cursor-pointer disabled:opacity-50"
            >
              {loading ? 'Booking...' : 'Confirm & Book Fixed Deposit'}
            </button>
          </div>

        </form>

        {/* Quick Add Customer Modal */}
        {quickAddOpen && (
          <div className="fixed inset-0 z-[10020] bg-slate-950/80 backdrop-blur-xs flex justify-center items-start pt-16 pb-10 p-4 overflow-y-auto">
            <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-md w-full p-6 relative">
              <button
                type="button"
                onClick={() => setQuickAddOpen(false)}
                className="absolute right-4 top-4 p-1.5 rounded-full hover:bg-slate-100 text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
              <div className="flex items-center gap-2.5 mb-4">
                <div className="w-9 h-9 rounded-xl bg-indigo-600 text-white flex items-center justify-center">
                  <UserPlus className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">Quick Add Client (ग्राहक जोड़ें)</h3>
                  <p className="text-[11px] text-slate-500">Save client & auto-select for this Fixed Deposit</p>
                </div>
              </div>

              {quickError && (
                <div className="mb-3 p-2.5 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-xl">
                  {quickError}
                </div>
              )}

              <form onSubmit={handleQuickAddSubmit} className="space-y-3 text-xs">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Full Name (पूरा नाम) *</label>
                  <input
                    type="text"
                    required
                    autoFocus
                    placeholder="e.g. Satendra Kumar"
                    value={quickCust.full_name}
                    onChange={(e) => setQuickCust({ ...quickCust, full_name: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-semibold text-slate-900 focus:bg-white focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Mobile Phone *</label>
                  <input
                    type="tel"
                    required
                    placeholder="10 digit mobile number"
                    value={quickCust.phone}
                    onChange={(e) => setQuickCust({ ...quickCust, phone: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Email ID (Optional)</label>
                    <input
                      type="email"
                      placeholder="email@example.com"
                      value={quickCust.email}
                      onChange={(e) => setQuickCust({ ...quickCust, email: e.target.value })}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white"
                    />
                  </div>
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">PAN Card (Optional)</label>
                    <input
                      type="text"
                      maxLength="10"
                      placeholder="ABCDE1234F"
                      value={quickCust.pan_card}
                      onChange={(e) => setQuickCust({ ...quickCust, pan_card: e.target.value.toUpperCase() })}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl uppercase font-mono focus:bg-white"
                    />
                  </div>
                </div>

                <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setQuickAddOpen(false)}
                    className="px-3.5 py-2 font-semibold text-slate-600 hover:bg-slate-100 rounded-xl cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={quickLoading}
                    className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl shadow-md shadow-indigo-600/30 transition cursor-pointer disabled:opacity-50"
                  >
                    {quickLoading ? 'Saving...' : 'Save & Select Client'}
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
