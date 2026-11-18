import React, { useState, useEffect } from 'react';
import { 
  BadgePercent, 
  Search, 
  RotateCw, 
  Plus, 
  ShieldCheck, 
  CreditCard, 
  Calendar, 
  TrendingUp, 
  DollarSign, 
  X,
  Lock,
  CheckCircle2,
  AlertCircle,
  FileText
} from 'lucide-react';
import { formatINR, formatDate, apiRequest } from '../utils';

export default function LoansAgainstDeposit() {
  const [loans, setLoans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [totalSanctioned, setTotalSanctioned] = useState(0);
  const [totalOutstanding, setTotalOutstanding] = useState(0);
  const [totalRecovered, setTotalRecovered] = useState(0);

  // Modal
  const [sanctionModalOpen, setSanctionModalOpen] = useState(false);
  const [customers, setCustomers] = useState([]);
  const [customerFDs, setCustomerFDs] = useState([]);
  const [selectedCustomerId, setSelectedCustomerId] = useState('');
  const [selectedFD, setSelectedFD] = useState(null);
  const [loanAmount, setLoanAmount] = useState(100000);
  const [interestRate, setInterestRate] = useState(14.0);
  const [tenureMonths, setTenureMonths] = useState(36);

  const fetchLoans = async () => {
    try {
      setLoading(true);
      let q = '/loans/against-deposit';
      if (search) q += `?search=${encodeURIComponent(search)}`;
      const res = await apiRequest(q);
      if (res.success && res.loans) {
        setLoans(res.loans);
        setTotalSanctioned(res.total_sanctioned || 0);
        setTotalOutstanding(res.total_outstanding || 0);
        setTotalRecovered(res.total_recovered || 0);
      }
    } catch (e) {
      console.error('Error fetching LAD loans:', e);
    } finally {
      setLoading(false);
    }
  };

  const fetchMeta = async () => {
    try {
      const res = await apiRequest('/customers');
      if (res.success) setCustomers(res.customers || []);
    } catch (e) {}
  };

  useEffect(() => {
    fetchMeta();
  }, []);

  useEffect(() => {
    fetchLoans();
  }, [search]);

  // When customer is selected, fetch their active FDs as collateral
  const handleCustomerChange = async (cid) => {
    setSelectedCustomerId(cid);
    setSelectedFD(null);
    if (!cid) return;
    try {
      const res = await apiRequest(`/fds?customer_id=${cid}`);
      if (res.success && res.fds) {
        const activeFDs = res.fds.filter(f => f.status === 'ACTIVE');
        setCustomerFDs(activeFDs);
        if (activeFDs.length > 0) {
          const first = activeFDs[0];
          setSelectedFD(first);
          const maxSanction = Math.floor(first.deposit_amount * 0.80);
          setLoanAmount(maxSanction);
          setInterestRate(Number(first.annual_rate) + 2.0); // FD rate + 2% standard
        }
      }
    } catch (e) {}
  };

  const handleFDSelect = (fdNum) => {
    const fd = customerFDs.find(f => f.fd_number === fdNum);
    if (fd) {
      setSelectedFD(fd);
      const maxSanction = Math.floor(fd.deposit_amount * 0.80);
      setLoanAmount(maxSanction);
      setInterestRate(Number(fd.annual_rate) + 2.0);
    }
  };

  // Live EMI calculation
  const monthlyRate = (interestRate / 12) / 100;
  const estimatedEMI = monthlyRate > 0 && tenureMonths > 0 
    ? Math.round((loanAmount * monthlyRate * Math.pow(1 + monthlyRate, tenureMonths)) / (Math.pow(1 + monthlyRate, tenureMonths) - 1))
    : 0;

  const handleSanctionLoan = async (e) => {
    e.preventDefault();
    if (!selectedFD) return alert('Please select a collateral Fixed Deposit');

    const maxAllowed = selectedFD.deposit_amount * 0.85;
    if (loanAmount > maxAllowed) {
      return alert(`Loan amount cannot exceed 85% of FD principal (Max: ₹${maxAllowed.toLocaleString('en-IN')})`);
    }

    try {
      const res = await apiRequest('/loans/against-deposit', {
        method: 'POST',
        body: JSON.stringify({
          customer_id: Number(selectedCustomerId),
          collateral_fd_number: selectedFD.fd_number,
          fd_deposit_amount: selectedFD.deposit_amount,
          sanctioned_amount: Number(loanAmount),
          interest_rate: Number(interestRate),
          tenure_months: Number(tenureMonths)
        })
      });

      if (res.success) {
        alert(res.message);
        setSanctionModalOpen(false);
        fetchLoans();
      }
    } catch (err) {
      alert('Error sanctioning loan: ' + err.message);
    }
  };

  return (
    <div className="space-y-6 animate-fadeIn pb-16">
      
      {/* 1. Header */}
      <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-indigo-50 rounded-lg border border-indigo-200 text-indigo-700">
              <BadgePercent className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
                Loan Against Deposit (LAD)
                <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200">
                  Secured FD Credit
                </span>
              </h1>
              <p className="text-xs text-slate-500 mt-0.5">
                Instant credit advances up to 85% LTV against active Fixed Deposits with zero collateral risk
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={fetchLoans}
            className="p-2 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg border border-slate-200 transition cursor-pointer"
            title="Refresh"
          >
            <RotateCw className="w-4 h-4" />
          </button>

          <button
            onClick={() => {
              if (customers.length > 0) {
                handleCustomerChange(customers[0].id);
              }
              setSanctionModalOpen(true);
            }}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-indigo-700 hover:bg-indigo-800 text-white rounded-lg text-xs font-bold shadow-xs transition cursor-pointer"
          >
            <Plus className="w-4 h-4" /> Sanction Loan Against FD
          </button>
        </div>
      </div>

      {/* 2. Metrics Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
        <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs">
          <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Sanctioned Portfolio</div>
          <div className="text-2xl font-black text-slate-900 mt-1">{formatINR(totalSanctioned)}</div>
          <div className="text-[11px] text-indigo-600 font-medium mt-0.5">{loans.length} Active Secured Advances</div>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs">
          <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Outstanding Principal</div>
          <div className="text-2xl font-black text-amber-700 mt-1">{formatINR(totalOutstanding)}</div>
          <div className="text-[11px] text-slate-500 font-medium mt-0.5">Active Loan Exposure</div>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs">
          <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Total Recovered</div>
          <div className="text-2xl font-black text-emerald-700 mt-1">{formatINR(totalRecovered)}</div>
          <div className="text-[11px] text-slate-500 font-medium mt-0.5">Principal + Interest Collected</div>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs">
          <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Max Allowable LTV</div>
          <div className="text-2xl font-black text-blue-700 mt-1">85%</div>
          <div className="text-[11px] text-slate-500 font-medium mt-0.5">Backed by Customer FD Lien</div>
        </div>
      </div>

      {/* 3. Search */}
      <div className="bg-white rounded-xl border border-slate-200 p-3 shadow-xs">
        <div className="relative max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5 pointer-events-none" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by loan number, customer, or collateral FD..."
            className="w-full text-xs pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:border-slate-800 transition"
          />
        </div>
      </div>

      {/* 4. Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#f59e0b] text-white font-bold tracking-wider uppercase text-[11px]">
              <tr>
                <th className="py-3 px-4">Loan Number</th>
                <th className="py-3 px-4">Customer Name</th>
                <th className="py-3 px-4">Collateral FD</th>
                <th className="py-3 px-4 text-right">FD Deposit Value</th>
                <th className="py-3 px-4 text-right">Sanctioned Amount</th>
                <th className="py-3 px-4 text-center">Interest</th>
                <th className="py-3 px-4 text-right">Monthly EMI</th>
                <th className="py-3 px-4 text-right">Outstanding</th>
                <th className="py-3 px-4 text-center">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan="9" className="py-12 text-center text-slate-400">Loading loans against deposit...</td>
                </tr>
              ) : loans.length === 0 ? (
                <tr>
                  <td colSpan="9" className="py-12 text-center text-slate-400">No active loans against deposit found.</td>
                </tr>
              ) : (
                loans.map((l) => (
                  <tr key={l.id} className="hover:bg-amber-50/20 transition">
                    <td className="py-3 px-4 font-mono font-bold text-slate-900">{l.loan_number}</td>
                    <td className="py-3 px-4">
                      <div className="font-bold text-slate-800 text-sm">{l.customer_name}</div>
                      <div className="text-[11px] text-slate-400">{l.customer_phone}</div>
                    </td>
                    <td className="py-3 px-4">
                      <span className="inline-flex items-center gap-1 font-mono font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-200">
                        <Lock className="w-3 h-3 text-indigo-500" />
                        {l.collateral_fd_number}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right font-bold text-slate-700">
                      {formatINR(l.fd_deposit_amount)}
                    </td>
                    <td className="py-3 px-4 text-right font-black text-slate-900 text-sm">
                      {formatINR(l.sanctioned_amount)}
                    </td>
                    <td className="py-3 px-4 text-center font-bold text-blue-700">
                      {l.interest_rate}%
                    </td>
                    <td className="py-3 px-4 text-right font-black text-emerald-700">
                      {formatINR(l.emi_amount)}/mo
                    </td>
                    <td className="py-3 px-4 text-right font-bold text-amber-700">
                      {formatINR(l.outstanding_principal)}
                    </td>
                    <td className="py-3 px-4 text-center">
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                        {l.status}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* 5. Sanction Modal */}
      {sanctionModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-lg w-full p-6 animate-fadeIn relative">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-base font-bold text-slate-900">Sanction Loan Against Fixed Deposit (LAD)</h3>
              <button
                onClick={() => setSanctionModalOpen(false)}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSanctionLoan} className="mt-4 space-y-4 text-xs">
              <div>
                <label className="font-semibold text-slate-700 block mb-1">Select Customer *</label>
                <select
                  value={selectedCustomerId}
                  onChange={(e) => handleCustomerChange(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none font-semibold"
                >
                  {customers.map(c => (
                    <option key={c.id} value={c.id}>{c.full_name} ({c.customer_code} - {c.phone})</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">Select Collateral Fixed Deposit (Lien Marked) *</label>
                {customerFDs.length === 0 ? (
                  <div className="p-3 bg-amber-50 text-amber-700 rounded-lg border border-amber-200 text-xs">
                    No active Fixed Deposits found for this customer.
                  </div>
                ) : (
                  <select
                    value={selectedFD?.fd_number || ''}
                    onChange={(e) => handleFDSelect(e.target.value)}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none font-semibold font-mono"
                  >
                    {customerFDs.map(f => (
                      <option key={f.fd_number} value={f.fd_number}>
                        {f.fd_number} — Principal: {formatINR(f.deposit_amount)} ({f.annual_rate}%)
                      </option>
                    ))}
                  </select>
                )}
              </div>

              {selectedFD && (
                <div className="p-3 bg-indigo-50 border border-indigo-200 rounded-xl space-y-1">
                  <div className="flex justify-between">
                    <span className="text-indigo-800">FD Principal Value:</span>
                    <span className="font-bold text-slate-900">{formatINR(selectedFD.deposit_amount)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-indigo-800">Max Sanction Limit (85% LTV):</span>
                    <span className="font-bold text-emerald-700">{formatINR(selectedFD.deposit_amount * 0.85)}</span>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Loan Amount Requested (₹) *</label>
                  <input
                    type="number"
                    min="10000"
                    max={selectedFD ? selectedFD.deposit_amount * 0.85 : 1000000}
                    value={loanAmount}
                    onChange={(e) => setLoanAmount(Number(e.target.value))}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none font-bold text-slate-900"
                  />
                </div>

                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Interest Rate (% p.a.)</label>
                  <input
                    type="number"
                    step="0.5"
                    value={interestRate}
                    onChange={(e) => setInterestRate(Number(e.target.value))}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none font-bold text-blue-700"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Tenure (Months)</label>
                  <input
                    type="number"
                    min="6"
                    max="60"
                    value={tenureMonths}
                    onChange={(e) => setTenureMonths(Number(e.target.value))}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none font-semibold"
                  />
                </div>

                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Calculated Monthly EMI</label>
                  <input
                    type="text"
                    readOnly
                    value={formatINR(estimatedEMI) + '/mo'}
                    className="w-full p-2.5 bg-slate-100 border border-slate-200 rounded-lg font-black text-emerald-700"
                  />
                </div>
              </div>

              <div className="flex items-center gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setSanctionModalOpen(false)}
                  className="flex-1 py-2.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!selectedFD}
                  className="flex-1 py-2.5 rounded-lg bg-indigo-700 hover:bg-indigo-800 text-white font-bold shadow-xs cursor-pointer disabled:opacity-50"
                >
                  Sanction & Disburse
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
