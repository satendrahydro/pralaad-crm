import React, { useState, useEffect } from 'react';
import { X, Wallet, ShieldCheck, UserPlus } from 'lucide-react';
import { formatINR, apiRequest } from '../utils';

export default function NewSavingsModal({ isOpen, onClose, onSuccess, isEmployee = false, initialCustomerId = null }) {
  const [customers, setCustomers] = useState([]);
  const [customerId, setCustomerId] = useState('');
  const [customerSearch, setCustomerSearch] = useState('');
  const [openingBalance, setOpeningBalance] = useState(5000);
  const [minimumBalance, setMinimumBalance] = useState(1000);
  const [annualRate, setAnnualRate] = useState(4.0);
  const [nomineeName, setNomineeName] = useState('');
  const [nomineeRelation, setNomineeRelation] = useState('');
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
      if (res.success) setCustomers(res.customers || []);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    if (isOpen) {
      loadCustomers();
      if (initialCustomerId) {
        setCustomerId(String(initialCustomerId));
      }
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
        await loadCustomers();
        setCustomerId(String(res.customer.id));
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

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!customerId) {
      alert('Please select a customer');
      return;
    }

    try {
      setSubmitting(true);
      const res = await apiRequest('/savings', {
        method: 'POST',
        body: JSON.stringify({
          customer_id: parseInt(customerId),
          opening_balance: parseFloat(openingBalance || 0),
          minimum_balance: parseFloat(minimumBalance || 1000),
          annual_interest_rate: parseFloat(annualRate || 4.0),
          nominee_name: nomineeName,
          nominee_relation: nomineeRelation,
          remarks
        })
      });

      if (res.success) {
        alert(res.message || 'Savings Account opening proposed successfully');
        onSuccess && onSuccess();
      }
    } catch (err) {
      alert('Error opening savings account: ' + err.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[10001] bg-slate-950/80 backdrop-blur-sm flex justify-center items-start pt-6 sm:pt-8 pb-10 p-3 sm:p-6 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-xl border border-slate-200 max-w-lg w-full p-6 animate-fadeIn">
        
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div>
            <h2 className="text-base font-bold text-slate-900">Open Savings Account</h2>
            <p className="text-xs text-slate-500">Liquid customer deposit account with passbook statement</p>
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
              <label className="text-xs font-semibold text-slate-700">Select Customer (खाताधारक चुनें) *</label>
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
                    const id = String(matches[0].id);
                    setCustomerId(id);
                    setNomineeName(matches[0].nominee_name || '');
                    setNomineeRelation(matches[0].nominee_relation || '');
                  }
                }}
                className="w-full text-xs p-2 bg-white border border-slate-200 rounded-lg"
              />
              <select
                required
                value={customerId}
                onChange={(e) => {
                  const id = e.target.value;
                  setCustomerId(id);
                  const found = customers.find(c => c.id === parseInt(id));
                  if (found) {
                    setNomineeName(found.nominee_name || '');
                    setNomineeRelation(found.nominee_relation || '');
                  }
                }}
                className="w-full text-xs p-2 bg-white border border-slate-200 rounded-lg font-semibold"
              >
                <option value="">-- Choose Account Holder --</option>
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
              <label className="text-xs font-semibold text-slate-700 block mb-1">Opening Cash Deposit (₹)</label>
              <input
                type="number"
                min="0"
                step="500"
                required
                value={openingBalance}
                onChange={(e) => setOpeningBalance(e.target.value)}
                className="w-full text-xs p-2.5 bg-white border border-slate-200 rounded-lg focus:outline-none focus:border-slate-800 font-bold"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-700 block mb-1">Minimum Balance Guard (₹)</label>
              <input
                type="number"
                min="500"
                step="100"
                required
                value={minimumBalance}
                onChange={(e) => setMinimumBalance(e.target.value)}
                className="w-full text-xs p-2.5 bg-white border border-slate-200 rounded-lg focus:outline-none focus:border-slate-800"
              />
            </div>
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-700 block mb-1">Annual Interest Rate (% p.a.)</label>
            <input
              type="number"
              step="0.1"
              required
              value={annualRate}
              onChange={(e) => setAnnualRate(e.target.value)}
              className="w-full text-xs p-2.5 bg-white border border-slate-200 rounded-lg focus:outline-none focus:border-slate-800 font-bold text-emerald-700"
            />
            <p className="text-[10px] text-slate-400 mt-1">Calculated via daily product balance method & credited periodically</p>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-slate-700 block mb-1">Nominee Name</label>
              <input
                type="text"
                value={nomineeName}
                onChange={(e) => setNomineeName(e.target.value)}
                placeholder="Full Name"
                className="w-full text-xs p-2.5 bg-white border border-slate-200 rounded-lg focus:outline-none focus:border-slate-800"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-700 block mb-1">Nominee Relation</label>
              <input
                type="text"
                value={nomineeRelation}
                onChange={(e) => setNomineeRelation(e.target.value)}
                placeholder="Relationship"
                className="w-full text-xs p-2.5 bg-white border border-slate-200 rounded-lg focus:outline-none focus:border-slate-800"
              />
            </div>
          </div>

          {isEmployee && (
            <p className="text-[11px] text-amber-700 bg-amber-50 p-2 rounded border border-amber-200">
              ⚠️ Submitted as draft (`PENDING_APPROVAL`). Account activates upon Admin Checker authorization.
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
              {submitting ? 'Submitting...' : 'Open Savings Account'}
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
                  <p className="text-[11px] text-slate-500">Save client & auto-select for this Savings Account</p>
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
