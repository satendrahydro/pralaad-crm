import React, { useState, useEffect } from 'react';
import { X, Calculator, ShieldCheck, AlertCircle, UserPlus, Smartphone, Key } from 'lucide-react';
import { formatINR, apiRequest } from '../utils';

export default function NewRDModal({ isOpen, onClose, onSuccess, initialCustomerId = null, isEmployee = false }) {
  const [customers, setCustomers] = useState([]);
  const [customerId, setCustomerId] = useState('');
  const [customerSearch, setCustomerSearch] = useState('');
  const [monthlyInstallment, setMonthlyInstallment] = useState(5000);
  const [tenureMonths, setTenureMonths] = useState(12);
  const [isCustomTenure, setIsCustomTenure] = useState(false);
  const [annualRate, setAnnualRate] = useState(8.0);
  const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [remarks, setRemarks] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [appAccessEnabled, setAppAccessEnabled] = useState(true);
  const [appPassword, setAppPassword] = useState('client123');
  const [sendWhatsAppCreds, setSendWhatsAppCreds] = useState(false);

  // Quick Add Customer Inline State
  const [quickAddOpen, setQuickAddOpen] = useState(false);
  const [quickCust, setQuickCust] = useState({ full_name: '', phone: '', email: '', pan_card: '' });
  const [quickLoading, setQuickLoading] = useState(false);
  const [quickError, setQuickError] = useState('');

  const loadCustomers = async () => {
    try {
      const res = await apiRequest('/customers');
      if (res.success && res.customers) {
        setCustomers(res.customers);
      }
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    if (isOpen) {
      loadCustomers();
      if (initialCustomerId) {
        setCustomerId(String(initialCustomerId));
        setCustomerSearch('');
      }
    } else {
      setCustomerSearch('');
      setQuickError('');
    }
  }, [isOpen, initialCustomerId]);

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
        const newC = res.customer;
        setCustomers(prev => [newC, ...prev.filter(c => c.id !== newC.id)]);
        setCustomerId(String(newC.id));
        setCustomerSearch('');
        setQuickAddOpen(false);
        setQuickCust({ full_name: '', phone: '', email: '', pan_card: '' });
      }
    } catch (err) {
      setQuickError(err.message || 'Error saving customer');
    } finally {
      setQuickLoading(false);
    }
  };

  // Local projection
  useEffect(() => {
    if (customerId) {
      const c = customers.find(x => String(x.id) === String(customerId));
      if (c) {
        setAppAccessEnabled(c.app_access_enabled !== 0);
        setAppPassword(c.login_password || 'client123');
      }
    }
  }, [customerId, customers]);

  if (!isOpen) return null;

  const P = parseFloat(monthlyInstallment) || 0;
  const n = parseInt(tenureMonths) || 12;
  const r = (parseFloat(annualRate) || 0) / 100;
  let maturityEst = 0;
  for (let i = 1; i <= n; i++) {
    const q = (n - i + 1) / 3;
    maturityEst += P * Math.pow(1 + (r / 4), q);
  }
  const totalPrincipalEst = P * n;
  const totalInterestEst = Math.max(0, maturityEst - totalPrincipalEst);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!customerId) {
      alert('Please select a customer');
      return;
    }

    try {
      setSubmitting(true);
      const res = await apiRequest('/rd', {
        method: 'POST',
        body: JSON.stringify({
          customer_id: parseInt(customerId),
          monthly_installment: P,
          tenure_months: n,
          annual_rate: parseFloat(annualRate),
          start_date: startDate,
          remarks
        })
      });

      if (res.success) {
        // Sync customer app access & password settings
        try {
          await apiRequest(`/customers/${customerId}`, {
            method: 'PUT',
            body: JSON.stringify({
              app_access_enabled: appAccessEnabled ? 1 : 0,
              login_password: appPassword || 'client123'
            })
          });
        } catch (e) {
          console.warn('App access sync notice:', e);
        }

        if (sendWhatsAppCreds) {
          const c = customers.find(x => String(x.id) === String(customerId));
          if (c?.phone) {
            const cleanPhone = c.phone.replace(/[^0-9]/g, '');
            const fullPhone = cleanPhone.length === 10 ? `91${cleanPhone}` : cleanPhone;
            const msg = `नमस्ते ${c.full_name} जी! 🙏\n\nTaranganjali Private Limited में आपका आवर्ती जमा खाता (RD Account) सफलतापूर्वक खुल गया है।\n\n📱 मोबाइल ऐप लॉगिन विवरण:\n👤 User ID: ${c.customer_code}\n🔑 Password: ${appPassword || 'client123'}\n\n📲 ऐप डाउनलोड करें और अपनी RD किस्तें व पासबुक देखें:\n${window.location.origin}\n\nधन्यवाद,\nTaranganjali Private Limited`;
            window.open(`https://wa.me/${fullPhone}?text=${encodeURIComponent(msg)}`, '_blank');
          }
        }

        alert(res.message || 'RD proposal submitted successfully');
        onSuccess && onSuccess();
      }
    } catch (err) {
      alert('Error creating RD: ' + err.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[10001] bg-slate-950/80 backdrop-blur-sm flex justify-center items-start pt-6 sm:pt-8 pb-10 p-3 sm:p-6 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-xl border border-slate-200 max-w-lg w-full p-6 animate-fadeIn">
        
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div>
            <h2 className="text-base font-bold text-slate-900">Start Recurring Deposit (RD)</h2>
            <p className="text-xs text-slate-500">Monthly systematic installment deposit</p>
          </div>
          <button 
            onClick={onClose} 
            className="inline-flex items-center gap-1 px-3 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 rounded-xl font-bold text-xs border border-rose-200 transition cursor-pointer"
            title="Close"
          >
            <X className="w-4 h-4 text-rose-600 stroke-[2.5]" />
            <span>Close</span>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
            <div className="flex justify-between items-center">
              <label className="text-xs font-semibold text-slate-700">Select Customer (ग्राहक चुनें) *</label>
              <button
                type="button"
                onClick={() => {
                  setQuickError('');
                  setQuickCust({ full_name: '', phone: '', email: '', pan_card: '' });
                  setQuickAddOpen(true);
                }}
                className="text-xs font-bold text-indigo-600 hover:text-indigo-800 flex items-center gap-1 cursor-pointer bg-indigo-50 hover:bg-indigo-100 px-2 py-0.5 rounded transition"
              >
                <UserPlus className="w-3.5 h-3.5" />
                + Add New Client
              </button>
            </div>
            
            <div className="grid grid-cols-2 gap-2">
              <input
                type="text"
                placeholder="Search name/phone/code..."
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
                    setCustomerId(String(matches[0].id));
                  }
                }}
                className="w-full text-xs p-2 bg-white border border-slate-200 rounded-lg"
              />
              <select
                required
                value={customerId}
                onChange={(e) => setCustomerId(e.target.value)}
                className="w-full text-xs p-2 bg-white border border-slate-200 rounded-lg font-semibold"
              >
                <option value="">-- Choose Depositor --</option>
                {customers
                  .filter(c => {
                    const q = customerSearch.trim().toLowerCase();
                    if (!q) return true;
                    return (
                      (c.full_name && c.full_name.toLowerCase().includes(q)) ||
                      (c.phone && c.phone.includes(q)) ||
                      (c.customer_code && c.customer_code.toLowerCase().includes(q)) ||
                      String(c.id) === q ||
                      String(c.id) === String(customerId)
                    );
                  })
                  .map(c => (
                    <option key={c.id} value={c.id}>
                      {c.full_name} ({c.customer_code} • {c.phone})
                    </option>
                  ))}
              </select>
            </div>

            {customers.find(c => String(c.id) === String(customerId)) && (
              <div className="text-[11px] text-emerald-800 bg-emerald-50 p-2 rounded-lg border border-emerald-200 flex justify-between items-center">
                <span>
                  Selected: <strong>{customers.find(c => String(c.id) === String(customerId)).full_name}</strong> ({customers.find(c => String(c.id) === String(customerId)).customer_code})
                </span>
                <button type="button" onClick={() => setCustomerId('')} className="text-rose-600 font-semibold hover:underline">Change</button>
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-slate-700 block mb-1">Monthly Deposit (₹)</label>
              <input
                type="number"
                min="500"
                step="100"
                required
                value={monthlyInstallment}
                onChange={(e) => setMonthlyInstallment(e.target.value)}
                className="w-full text-xs p-2.5 bg-white border border-slate-200 rounded-lg focus:outline-none focus:border-slate-800 font-bold"
              />
            </div>
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs font-semibold text-slate-700">Tenure (अवधि)</label>
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
                className="w-full text-xs p-2.5 bg-white border border-slate-200 rounded-lg focus:outline-none focus:border-slate-800"
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
                    min="0"
                    max="360"
                    required
                    value={tenureMonths}
                    onChange={(e) => setTenureMonths(e.target.value === '' ? '' : parseInt(e.target.value) || 0)}
                    onBlur={() => {
                      if (!tenureMonths || Number(tenureMonths) < 1) setTenureMonths(1);
                    }}
                    placeholder="Enter custom months"
                    className="w-full text-xs p-2.5 bg-amber-50/50 border border-amber-300 rounded-lg font-bold text-slate-900 focus:outline-none focus:ring-1 focus:ring-amber-500"
                  />
                  <span className="absolute right-3 top-2.5 text-xs font-semibold text-slate-500 pointer-events-none">
                    Months ({((parseInt(tenureMonths) || 0) / 12).toFixed(1)} Yrs)
                  </span>
                </div>
              )}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-slate-700 block mb-1">Annual Interest Rate (%)</label>
              <input
                type="number"
                step="0.05"
                required
                value={annualRate}
                onChange={(e) => setAnnualRate(e.target.value)}
                className="w-full text-xs p-2.5 bg-white border border-slate-200 rounded-lg focus:outline-none focus:border-slate-800"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-700 block mb-1">First Deposit Date</label>
              <input
                type="date"
                required
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full text-xs p-2.5 bg-white border border-slate-200 rounded-lg focus:outline-none focus:border-slate-800"
              />
            </div>
          </div>

          {/* Projection Card */}
          <div className="p-3 bg-teal-50 border border-teal-200 rounded-xl space-y-1 text-xs">
            <div className="flex justify-between text-teal-900">
              <span>Total Principal to Deposit:</span>
              <span className="font-bold">{formatINR(totalPrincipalEst)}</span>
            </div>
            <div className="flex justify-between text-teal-900">
              <span>Projected Compound Interest:</span>
              <span className="font-bold">{formatINR(totalInterestEst)}</span>
            </div>
            <div className="flex justify-between text-teal-950 pt-1 border-t border-teal-200 text-sm font-black">
              <span>Maturity Yield:</span>
              <span>{formatINR(maturityEst)}</span>
            </div>
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-700 block mb-1">Remarks</label>
            <input
              type="text"
              value={remarks}
              onChange={(e) => setRemarks(e.target.value)}
              placeholder="e.g. Regular monthly goal savings"
              className="w-full text-xs p-2.5 bg-white border border-slate-200 rounded-lg focus:outline-none focus:border-slate-800"
            />
          </div>

          {/* 📱 Mobile App Access Control Card */}
          <div className="p-3 bg-gradient-to-r from-amber-500/10 to-indigo-500/10 border border-amber-500/30 rounded-xl space-y-2.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="p-1.5 bg-amber-500 text-slate-950 rounded-lg font-bold">
                  <Smartphone className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-slate-900">Mobile App Access (मोबाइल ऐप एक्सेस)</h4>
                  <p className="text-[10px] text-slate-500">इस RD को ग्राहक के मोबाइल ऐप व डिजिटल पासबुक में तुरंत सक्रिय रखें</p>
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
                    {customers.find(c => String(c.id) === String(customerId))?.customer_code || 'Auto-Assigned'}
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
                    <span>📲 RD बनने पर ग्राहक को WhatsApp पर लॉगिन आईडी व पासवर्ड भेजें</span>
                  </label>
                </div>
              </div>
            )}
          </div>

          {isEmployee && (
            <p className="text-[11px] text-amber-700 bg-amber-50 p-2 rounded border border-amber-200">
              ⚠️ Submitted as draft (`PENDING_APPROVAL`). Contract activates upon Admin Checker authorization.
            </p>
          )}

          <div className="flex items-center gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="flex-1 py-2 rounded-lg bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs shadow-xs disabled:opacity-50"
            >
              {submitting ? 'Submitting...' : 'Confirm RD Booking'}
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
                  <p className="text-[11px] text-slate-500">Save client & auto-select for this Recurring Deposit</p>
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
                    placeholder="e.g. Ramesh Chandra Sharma"
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
