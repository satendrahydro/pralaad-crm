import React, { useState, useEffect } from 'react';
import { X, Calculator, ShieldCheck, UserPlus } from 'lucide-react';
import { formatINR, apiRequest } from '../utils';

export default function NewMISModal({ isOpen, onClose, onSuccess, initialCustomerId = null, isEmployee = false }) {
  const [customers, setCustomers] = useState([]);
  const [customerId, setCustomerId] = useState('');
  const [customerSearch, setCustomerSearch] = useState('');
  const [depositAmount, setDepositAmount] = useState(500000);
  const [tenureMonths, setTenureMonths] = useState(60);
  const [isCustomTenure, setIsCustomTenure] = useState(false);
  const [annualRate, setAnnualRate] = useState(8.4);
  const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [payoutAccountNo, setPayoutAccountNo] = useState('');
  const [payoutBankIfsc, setPayoutBankIfsc] = useState('');
  const [remarks, setRemarks] = useState('');
  const [submitting, setSubmitting] = useState(false);

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
        const targetId = initialCustomerId || customerId;
        if (targetId) {
          const match = res.customers.find(c => String(c.id) === String(targetId));
          if (match) {
            setPayoutAccountNo(match.account_no || '');
            setPayoutBankIfsc(match.ifsc_code || '');
          }
        }
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
        setPayoutAccountNo(newC.account_no || '');
        setPayoutBankIfsc(newC.ifsc_code || '');
        setQuickAddOpen(false);
        setQuickCust({ full_name: '', phone: '', email: '', pan_card: '' });
      }
    } catch (err) {
      setQuickError(err.message || 'Error saving customer');
    } finally {
      setQuickLoading(false);
    }
  };

  if (!isOpen) return null;

  // Local calculation: monthly payout = (P * r) / 1200
  const P = parseFloat(depositAmount) || 0;
  const n = parseInt(tenureMonths) || 60;
  const r = parseFloat(annualRate) || 0;
  const monthlyPayoutEst = Math.round(((P * (r / 100)) / 12) * 100) / 100;
  const totalPayoutEst = Math.round((monthlyPayoutEst * n) * 100) / 100;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!customerId) {
      alert('Please select a customer');
      return;
    }

    try {
      setSubmitting(true);
      const res = await apiRequest('/mis', {
        method: 'POST',
        body: JSON.stringify({
          customer_id: parseInt(customerId),
          deposit_amount: P,
          tenure_months: n,
          annual_rate: r,
          start_date: startDate,
          payout_account_no: payoutAccountNo,
          payout_bank_ifsc: payoutBankIfsc,
          remarks
        })
      });

      if (res.success) {
        alert(res.message || 'MIS proposal submitted successfully');
        onSuccess && onSuccess();
      }
    } catch (err) {
      alert('Error creating MIS: ' + err.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[10001] bg-slate-950/80 backdrop-blur-sm flex justify-center items-start pt-6 sm:pt-8 pb-10 p-3 sm:p-6 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-xl border border-slate-200 max-w-lg w-full p-6 animate-fadeIn">
        
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div>
            <h2 className="text-base font-bold text-slate-900">Start Monthly Income Scheme (MIS)</h2>
            <p className="text-xs text-slate-500">Fixed regular monthly pension yield with capital preservation</p>
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
              <div className="relative">
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
                      const id = String(matches[0].id);
                      setCustomerId(id);
                      setPayoutAccountNo(matches[0].account_no || '');
                      setPayoutBankIfsc(matches[0].ifsc_code || '');
                    }
                  }}
                  className="w-full text-xs p-2 pr-6 bg-white border border-slate-200 rounded-lg focus:outline-none focus:border-indigo-500"
                />
                {customerSearch && (
                  <button
                    type="button"
                    onClick={() => setCustomerSearch('')}
                    className="absolute right-2 top-2 text-slate-400 hover:text-slate-600 text-xs font-bold"
                  >
                    ✕
                  </button>
                )}
              </div>
              <select
                required
                value={customerId}
                onChange={(e) => {
                  const id = e.target.value;
                  setCustomerId(id);
                  const found = customers.find(c => c.id === parseInt(id));
                  if (found) {
                    setPayoutAccountNo(found.account_no || '');
                    setPayoutBankIfsc(found.ifsc_code || '');
                  }
                }}
                className="w-full text-xs p-2 bg-white border border-slate-200 rounded-lg font-semibold focus:outline-none focus:border-indigo-500"
              >
                <option value="">-- Choose Depositor ({customers.length}) --</option>
                {customers
                  .filter(c => {
                    if (String(c.id) === String(customerId)) return true;
                    const q = customerSearch.trim().toLowerCase();
                    if (!q) return true;
                    return (
                      (c.full_name && c.full_name.toLowerCase().includes(q)) ||
                      (c.phone && c.phone.includes(q)) ||
                      (c.customer_code && c.customer_code.toLowerCase().includes(q)) ||
                      String(c.id) === q
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
              <div className="text-xs text-emerald-900 bg-emerald-50 p-2.5 rounded-lg border border-emerald-300 flex justify-between items-center animate-fadeIn shadow-xs">
                <div>
                  <span className="font-bold text-emerald-950">
                    ✓ {customers.find(c => String(c.id) === String(customerId)).full_name}
                  </span>
                  <span className="text-[11px] text-emerald-700 ml-1.5">
                    ({customers.find(c => String(c.id) === String(customerId)).customer_code} • 📞 {customers.find(c => String(c.id) === String(customerId)).phone})
                  </span>
                </div>
                <button type="button" onClick={() => { setCustomerId(''); setCustomerSearch(''); }} className="text-xs text-rose-600 font-bold hover:underline cursor-pointer">✕ Remove</button>
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-slate-700 block mb-1">Lump Sum Capital (₹)</label>
              <input
                type="number"
                min="10000"
                step="5000"
                required
                value={depositAmount}
                onChange={(e) => setDepositAmount(e.target.value)}
                className="w-full text-xs p-2.5 bg-white border border-slate-200 rounded-lg focus:outline-none focus:border-slate-800 font-bold"
              />
            </div>
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs font-semibold text-slate-700">Scheme Tenure (अवधि)</label>
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
                    setTenureMonths(parseInt(val) || 60);
                  }
                }}
                className="w-full text-xs p-2.5 bg-white border border-slate-200 rounded-lg focus:outline-none focus:border-slate-800"
              >
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
                    min="1"
                    max="360"
                    required
                    value={tenureMonths}
                    onChange={(e) => setTenureMonths(Math.max(1, parseInt(e.target.value) || 1))}
                    placeholder="Enter custom months"
                    className="w-full text-xs p-2.5 bg-amber-50/50 border border-amber-300 rounded-lg font-bold text-slate-900 focus:outline-none focus:ring-1 focus:ring-amber-500"
                  />
                  <span className="absolute right-3 top-2.5 text-xs font-semibold text-slate-500">
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
              <label className="text-xs font-semibold text-slate-700 block mb-1">Deposit Start Date</label>
              <input
                type="date"
                required
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full text-xs p-2.5 bg-white border border-slate-200 rounded-lg focus:outline-none focus:border-slate-800"
              />
            </div>
          </div>

          {/* Monthly Payout Metric Box */}
          <div className="p-3 bg-blue-50 border border-blue-200 rounded-xl space-y-1 text-xs">
            <div className="flex justify-between text-blue-900">
              <span>Guaranteed Monthly Pension Payout:</span>
              <span className="text-sm font-black text-blue-950">{formatINR(monthlyPayoutEst)}/month</span>
            </div>
            <div className="flex justify-between text-blue-900">
              <span>Total Interest Payout over {n} Months:</span>
              <span className="font-bold">{formatINR(totalPayoutEst)}</span>
            </div>
            <div className="flex justify-between text-blue-950 pt-1 border-t border-blue-200 text-xs font-bold">
              <span>Capital Return at Maturity:</span>
              <span>{formatINR(P)} (100% Principal)</span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-slate-700 block mb-1">Payout Bank Account No</label>
              <input
                type="text"
                value={payoutAccountNo}
                onChange={(e) => setPayoutAccountNo(e.target.value)}
                placeholder="Bank Account No"
                className="w-full text-xs p-2.5 bg-white border border-slate-200 rounded-lg font-mono focus:outline-none focus:border-slate-800"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-700 block mb-1">Payout Bank IFSC</label>
              <input
                type="text"
                value={payoutBankIfsc}
                onChange={(e) => setPayoutBankIfsc(e.target.value)}
                placeholder="IFSC Code"
                className="w-full text-xs p-2.5 bg-white border border-slate-200 rounded-lg font-mono focus:outline-none focus:border-slate-800"
              />
            </div>
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
              {submitting ? 'Submitting...' : 'Confirm MIS Booking'}
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
                  <p className="text-[11px] text-slate-500">Save client & auto-select for this Monthly Income Scheme</p>
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
