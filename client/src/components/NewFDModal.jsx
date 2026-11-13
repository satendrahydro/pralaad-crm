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
  Calculator as CalcIcon
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
  const [compoundingFrequency, setCompoundingFrequency] = useState('quarterly');
  const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [remarks, setRemarks] = useState('');

  const [preview, setPreview] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Fetch customers
  const loadCustomers = async () => {
    try {
      const res = await apiRequest('/customers');
      setCustomers(res.customers || []);
      if (res.customers?.length > 0 && !selectedCustomerId) {
        setSelectedCustomerId(res.customers[0].id);
      }
    } catch (err) {
      console.error('Failed to load customers', err);
    }
  };

  useEffect(() => {
    if (isOpen) {
      loadCustomers();
      if (initialData) {
        if (initialData.principal) setPrincipal(initialData.principal);
        if (initialData.annualRate) setAnnualRate(initialData.annualRate);
        if (initialData.tenureMonths) setTenureMonths(initialData.tenureMonths);
        if (initialData.compoundingFrequency) setCompoundingFrequency(initialData.compoundingFrequency);
        if (initialData.startDate) setStartDate(initialData.startDate);
      }
    }
  }, [isOpen, initialData]);

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

      onFDCreated(res.fd);
      onClose();
    } catch (err) {
      setError(err.message || 'Failed to book FD');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  const selectedCustomer = customers.find(c => String(c.id) === String(selectedCustomerId));
  const filteredCustomers = customers.filter(c => 
    c.full_name.toLowerCase().includes(customerSearch.toLowerCase()) ||
    c.phone.includes(customerSearch) ||
    c.customer_code.toLowerCase().includes(customerSearch.toLowerCase())
  );

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 max-w-2xl w-full p-6 sm:p-8 relative my-8">
        
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute right-5 top-5 p-2 rounded-full hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition cursor-pointer"
        >
          <X className="w-5 h-5" />
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
                Select Client / Account Holder (ग्राहक)
              </label>
              <button
                type="button"
                onClick={onOpenQuickAddCustomer}
                className="text-xs font-bold text-indigo-600 hover:text-indigo-800 flex items-center gap-1 cursor-pointer"
              >
                <UserPlus className="w-3.5 h-3.5" />
                + Add New Client
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <input
                  type="text"
                  placeholder="Search client by name/phone..."
                  value={customerSearch}
                  onChange={(e) => setCustomerSearch(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <select
                  value={selectedCustomerId}
                  onChange={(e) => setSelectedCustomerId(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:ring-2 focus:ring-indigo-500 cursor-pointer"
                >
                  <option value="">-- Choose Customer --</option>
                  {filteredCustomers.map(c => (
                    <option key={c.id} value={c.id}>
                      {c.full_name} ({c.phone}) - {c.customer_code}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {selectedCustomer && (
              <div className="text-[11px] text-slate-500 flex flex-wrap gap-x-4 gap-y-1 pt-1 border-t border-slate-200/60">
                <span>PAN: <strong className="text-slate-700">{selectedCustomer.pan_card || 'N/A'}</strong></span>
                <span>Bank: <strong className="text-slate-700">{selectedCustomer.bank_name || 'N/A'}</strong></span>
                <span>Nominee: <strong className="text-slate-700">{selectedCustomer.nominee_name || 'N/A'}</strong></span>
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
              <label className="block text-xs font-semibold text-slate-600 mb-1">
                Tenure (in Months)
              </label>
              <input
                type="number"
                required
                min="1"
                max="240"
                value={tenureMonths}
                onChange={(e) => setTenureMonths(parseInt(e.target.value) || 1)}
                className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold text-slate-800 focus:bg-white focus:ring-2 focus:ring-indigo-500"
              />
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

      </div>
    </div>
  );
}
