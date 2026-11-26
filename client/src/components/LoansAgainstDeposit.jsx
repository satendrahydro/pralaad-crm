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
  FileText,
  User,
  UserPlus,
  Home,
  Building2
} from 'lucide-react';
import { formatINR, formatDate, apiRequest, onNumericInputChange } from '../utils';
import PaginationBar from './PaginationBar';
import DateInput from './DateInput';

export default function LoansAgainstDeposit({ 
  loanType = 'DEPOSIT', 
  title = 'Loan Against Deposit (फिक्स डिपॉजिट पर ऋण)' 
}) {
  const [loans, setLoans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 25;
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
  const [disbursalDate, setDisbursalDate] = useState(new Date().toISOString().split('T')[0]);
  const [submittingLoan, setSubmittingLoan] = useState(false);

  // Repayment Modal State
  const [repayModalOpen, setRepayModalOpen] = useState(false);
  const [selectedLoanForRepay, setSelectedLoanForRepay] = useState(null);
  const [repayAmount, setRepayAmount] = useState('');
  const [repayDate, setRepayDate] = useState(new Date().toISOString().split('T')[0]);
  const [repayMode, setRepayMode] = useState('CASH');
  const [repayRef, setRepayRef] = useState('');
  const [repayNarration, setRepayNarration] = useState('');
  const [submittingRepay, setSubmittingRepay] = useState(false);

  // Property / Business Collateral State (For Mortgage / Business Loans)
  const [propertyType, setPropertyType] = useState('Residential House (आवासीय मकान)');
  const [propertyDetails, setPropertyDetails] = useState('');
  const [propertyValuation, setPropertyValuation] = useState(1500000);

  // Quick Add Customer State
  const [showQuickAddCustomer, setShowQuickAddCustomer] = useState(false);
  const [quickCustLoading, setQuickCustLoading] = useState(false);
  const [quickCustError, setQuickCustError] = useState('');
  const [quickCustForm, setQuickCustForm] = useState({
    full_name: '',
    phone: '',
    father_name: '',
    pan_card: '',
    aadhaar_no: '',
    address: '',
    branch: 'MAIN BRANCH (BHR001 - Bijnor)'
  });

  const fetchLoans = async () => {
    try {
      setLoading(true);
      let q = `/loans/against-deposit?collateral_type=${encodeURIComponent(loanType)}`;
      if (search) q += `&search=${encodeURIComponent(search)}`;
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
  }, [search, loanType]);

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
  const numericRate = parseFloat(interestRate) || 0;
  const numericLoanAmount = parseFloat(loanAmount) || 0;
  const numericTenure = parseInt(tenureMonths) || 0;
  const monthlyRate = (numericRate / 12) / 100;
  const estimatedEMI = monthlyRate > 0 && numericTenure > 0 && numericLoanAmount > 0
    ? Math.round((numericLoanAmount * monthlyRate * Math.pow(1 + monthlyRate, numericTenure)) / (Math.pow(1 + monthlyRate, numericTenure) - 1))
    : 0;

  const handleQuickAddCustomer = async (e) => {
    if (e) e.preventDefault();
    if (!quickCustForm.full_name.trim()) {
      setQuickCustError('कृपया ग्राहक का पूरा नाम दर्ज करें।');
      return;
    }
    if (!quickCustForm.phone.trim()) {
      setQuickCustError('कृपया 10-अंकीय मोबाइल नंबर दर्ज करें।');
      return;
    }

    setQuickCustLoading(true);
    setQuickCustError('');
    try {
      const res = await apiRequest('/customers', {
        method: 'POST',
        body: JSON.stringify({
          ...quickCustForm,
          kyc_status: quickCustForm.pan_card ? 'FULL_KYC' : 'PENDING'
        })
      });
      if (res && res.success && res.customer) {
        setCustomers(prev => [res.customer, ...prev]);
        setSelectedCustomerId(String(res.customer.id));
        setShowQuickAddCustomer(false);
        setQuickCustForm({
          full_name: '',
          phone: '',
          father_name: '',
          pan_card: '',
          aadhaar_no: '',
          address: '',
          branch: 'MAIN BRANCH (BHR001 - Bijnor)'
        });
      } else {
        setQuickCustError(res?.message || 'ग्राहक जोड़ने में समस्या आई।');
      }
    } catch (err) {
      setQuickCustError(err.message || 'त्रुटि: ग्राहक सेव नहीं हो सका।');
    } finally {
      setQuickCustLoading(false);
    }
  };

  const isMortgageOrBusiness = loanType === 'MORTGAGE' || loanType === 'BUSINESS';
  const selectedCustomerObj = customers.find(c => String(c.id) === String(selectedCustomerId));

  // LTV & max allowed limits
  const maxAllowedLimit = isMortgageOrBusiness 
    ? (loanType === 'MORTGAGE' ? Math.round(Number(propertyValuation) * 0.70) : Math.round(Number(propertyValuation) * 0.60))
    : (selectedFD ? Math.round(selectedFD.deposit_amount * 0.85) : 0);

  const handleSanctionLoan = async (e) => {
    e.preventDefault();
    if (!selectedCustomerId) {
      return alert('कृपया ऋण लेने वाले ग्राहक / सदस्य का चयन करें।');
    }

    if (!isMortgageOrBusiness && !selectedFD) {
      return alert('कृपया संपार्श्विक (Collateral) फिक्स डिपॉजिट चुनें।');
    }

    if ((parseFloat(loanAmount) || 0) <= 0) {
      return alert('कृपया मान्य ऋण राशि दर्ज करें।');
    }

    if (maxAllowedLimit > 0 && (parseFloat(loanAmount) || 0) > maxAllowedLimit) {
      return alert(`ऋण राशि अधिकतम सीमा ₹${maxAllowedLimit.toLocaleString('en-IN')} से अधिक नहीं हो सकती।`);
    }

    setSubmittingLoan(true);
    try {
      const collateralTitle = isMortgageOrBusiness
        ? (loanType === 'MORTGAGE' ? `${propertyType}: ${propertyDetails || 'Title Deed Paperwork'}` : `Business: ${propertyDetails || 'Stock Hypothecation'}`)
        : selectedFD.fd_number;

      const collateralVal = isMortgageOrBusiness
        ? (parseFloat(propertyValuation) || 0)
        : Number(selectedFD.deposit_amount);

      const res = await apiRequest('/loans/against-deposit', {
        method: 'POST',
        body: JSON.stringify({
          customer_id: Number(selectedCustomerId),
          collateral_type: loanType,
          collateral_fd_number: collateralTitle,
          fd_deposit_amount: collateralVal,
          sanctioned_amount: parseFloat(loanAmount) || 0,
          interest_rate: parseFloat(interestRate) || 0,
          tenure_months: parseInt(tenureMonths) || 12,
          disbursal_date: disbursalDate
        })
      });

      if (res.success) {
        alert(res.message);
        setSanctionModalOpen(false);
        fetchLoans();
      } else {
        alert(res.message || 'ऋण स्वीकृत करने में त्रुटि आई।');
      }
    } catch (err) {
      alert('Error sanctioning loan: ' + err.message);
    } finally {
      setSubmittingLoan(false);
    }
  };

  const handleOpenRepayModal = (loan) => {
    setSelectedLoanForRepay(loan);
    setRepayAmount(String(loan.emi_amount || Math.round(loan.outstanding_principal / 12)));
    setRepayDate(new Date().toISOString().split('T')[0]);
    setRepayMode('CASH');
    setRepayRef(`REPAY-${Date.now().toString().slice(-6)}`);
    setRepayNarration(`EMI / loan repayment for ${loan.loan_number}`);
    setRepayModalOpen(true);
  };

  const handleRepaySubmit = async (e) => {
    e.preventDefault();
    if (!selectedLoanForRepay || !repayAmount || Number(repayAmount) <= 0) return;
    setSubmittingRepay(true);
    try {
      const res = await apiRequest('/loans/against-deposit/repay', {
        method: 'POST',
        body: JSON.stringify({
          loan_id: selectedLoanForRepay.id,
          amount: Number(repayAmount),
          payment_mode: repayMode,
          payment_date: repayDate,
          reference_no: repayRef,
          narration: repayNarration
        })
      });
      if (res && res.success) {
        alert(res.message);
        setRepayModalOpen(false);
        setSelectedLoanForRepay(null);
        fetchLoans();
      } else {
        alert(res?.message || 'Error processing repayment');
      }
    } catch (err) {
      alert('Error: ' + err.message);
    } finally {
      setSubmittingRepay(false);
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
                {title || 'Loan Against Deposit (LAD)'}
                <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200">
                  {loanType === 'MORTGAGE' ? 'Collateralized Property' : loanType === 'BUSINESS' ? 'Commercial Credit' : 'Secured FD Credit'}
                </span>
              </h1>
              <p className="text-xs text-slate-500 mt-0.5">
                {loanType === 'MORTGAGE' 
                  ? 'Property and mortgage advances with title deeds and physical valuation tracking' 
                  : loanType === 'BUSINESS' 
                    ? 'Working capital and trade loans for local businesses, enterprises & shops' 
                    : 'Instant credit advances up to 85% LTV against active Fixed Deposits with zero collateral risk'}
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
            <Plus className="w-4 h-4" /> 
            {loanType === 'MORTGAGE' 
              ? 'Sanction Property / Mortgage Loan (ऋण स्वीकृत करें)' 
              : loanType === 'BUSINESS' 
                ? 'Sanction Business Loan (व्यवसाय ऋण)' 
                : 'Sanction Loan Against FD (फिक्स डिपॉजिट पर ऋण)'}
          </button>
        </div>
      </div>

      {/* 2. Metrics Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
        <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs">
          <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Sanctioned Portfolio</div>
          <div className="text-2xl font-black text-slate-900 mt-1">{formatINR(totalSanctioned)}</div>
          <div className="text-[11px] text-indigo-600 font-medium mt-0.5">{loans.length} Active {loanType === 'MORTGAGE' ? 'Property' : loanType === 'BUSINESS' ? 'Business' : 'FD'} Advances</div>
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
          <div className="text-2xl font-black text-blue-700 mt-1">
            {loanType === 'MORTGAGE' ? '70%' : loanType === 'BUSINESS' ? '60%' : '85%'}
          </div>
          <div className="text-[11px] text-slate-500 font-medium mt-0.5">
            {loanType === 'MORTGAGE' ? 'Backed by Registered Property Deed' : loanType === 'BUSINESS' ? 'Backed by Business Stock' : 'Backed by Customer FD Lien'}
          </div>
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
            placeholder="Search by loan number, customer, or collateral details..."
            className="w-full text-xs pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:border-slate-800 transition"
          />
        </div>
      </div>

      {/* 4. Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#f59e0b] text-white font-bold tracking-wider uppercase text-[10px]">
              <tr>
                <th className="py-3 px-3">Loan Number</th>
                <th className="py-3 px-3">Customer Name</th>
                <th className="py-3 px-3">
                  {loanType === 'MORTGAGE' ? 'Collateral Property' : loanType === 'BUSINESS' ? 'Collateral Asset' : 'Collateral FD'}
                </th>
                <th className="py-3 px-3 text-amber-950 bg-amber-400">DISBURSED DATE (डिसबर्स तारीख)</th>
                <th className="py-3 px-3 text-amber-950 bg-amber-400">DUE / MATURITY (देय तिथि)</th>
                <th className="py-3 px-3 text-right">Sanctioned Amount</th>
                <th className="py-3 px-3 text-center">Interest</th>
                <th className="py-3 px-3 text-right">Monthly EMI</th>
                <th className="py-3 px-3 text-right">Outstanding</th>
                <th className="py-3 px-3 text-center">Status</th>
                <th className="py-3 px-3 text-center">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium">
              {loading ? (
                <tr>
                  <td colSpan="11" className="py-12 text-center text-slate-400">Loading loans...</td>
                </tr>
              ) : loans.length === 0 ? (
                <tr>
                  <td colSpan="11" className="py-12 text-center text-slate-400">
                    No active {loanType === 'MORTGAGE' ? 'property / mortgage' : loanType === 'BUSINESS' ? 'business' : 'FD'} loans found.
                  </td>
                </tr>
              ) : (
                loans.slice((Math.min(currentPage, Math.max(1, Math.ceil(loans.length / pageSize))) - 1) * pageSize, Math.min(currentPage, Math.max(1, Math.ceil(loans.length / pageSize))) * pageSize).map((l) => (
                  <tr key={l.id} className="hover:bg-amber-50/20 transition">
                    <td className="py-3 px-3 font-mono font-bold text-slate-900">{l.loan_number}</td>
                    <td className="py-3 px-3">
                      <div className="font-bold text-slate-800 text-sm">{l.customer_name}</div>
                      <div className="text-[11px] text-slate-400 font-mono">{l.customer_phone}</div>
                    </td>
                    <td className="py-3 px-3">
                      <span className="inline-flex items-center gap-1 font-mono font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-200">
                        {loanType === 'MORTGAGE' ? <Home className="w-3 h-3 text-amber-600" /> : loanType === 'BUSINESS' ? <Building2 className="w-3 h-3 text-blue-600" /> : <Lock className="w-3 h-3 text-indigo-500" />}
                        {l.collateral_fd_number}
                      </span>
                    </td>
                    {/* Disbursed Date */}
                    <td className="py-3 px-3 font-mono font-bold text-slate-800 bg-amber-50/30">
                      {formatDate(l.disbursal_date)}
                    </td>
                    {/* Due / Maturity Date */}
                    <td className="py-3 px-3 font-mono font-bold text-slate-800 bg-amber-50/30">
                      {formatDate(l.maturity_date)}
                    </td>
                    <td className="py-3 px-3 text-right font-black text-slate-900 text-sm font-mono">
                      {formatINR(l.sanctioned_amount)}
                    </td>
                    <td className="py-3 px-3 text-center font-bold text-blue-700">
                      {l.interest_rate}%
                    </td>
                    <td className="py-3 px-3 text-right font-black text-emerald-700 font-mono">
                      {formatINR(l.emi_amount)}/mo
                    </td>
                    <td className="py-3 px-3 text-right font-black text-rose-700 font-mono">
                      {formatINR(l.outstanding_principal)}
                    </td>
                    <td className="py-3 px-3 text-center">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        l.status === 'ACTIVE' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-slate-100 text-slate-700'
                      }`}>
                        {l.status}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-center">
                      {l.status === 'ACTIVE' ? (
                        <button
                          type="button"
                          onClick={() => handleOpenRepayModal(l)}
                          className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold transition cursor-pointer shadow-xs whitespace-nowrap"
                        >
                          Repay / EMI
                        </button>
                      ) : (
                        <span className="text-[10px] text-slate-400 font-bold">Closed</span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        <PaginationBar totalItems={loans.length} page={currentPage} pageSize={pageSize} onPageChange={setCurrentPage} label="loans" />
      </div>

      {/* 5. Sanction Modal */}
      {sanctionModalOpen && (
        <div className="fixed inset-0 z-[200] bg-slate-950/80 backdrop-blur-sm flex justify-center items-start pt-6 sm:pt-8 pb-10 p-3 sm:p-6 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-xl w-full p-6 animate-fadeIn relative">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className={`p-2 rounded-lg ${loanType === 'MORTGAGE' ? 'bg-amber-100 text-amber-800' : loanType === 'BUSINESS' ? 'bg-blue-100 text-blue-800' : 'bg-indigo-100 text-indigo-800'}`}>
                  {loanType === 'MORTGAGE' ? <Home className="w-5 h-5" /> : loanType === 'BUSINESS' ? <Building2 className="w-5 h-5" /> : <Lock className="w-5 h-5" />}
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">
                    {loanType === 'MORTGAGE' 
                      ? 'Sanction Property / Mortgage Loan (संपत्ति बंधक ऋण)' 
                      : loanType === 'BUSINESS' 
                        ? 'Sanction Business Loan (व्यवसाय ऋण)' 
                        : 'Sanction Loan Against Fixed Deposit (LAD)'}
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    {loanType === 'MORTGAGE'
                      ? 'Walk-in borrower onboarding, Title Deed verification & 70% LTV appraisal'
                      : loanType === 'BUSINESS'
                        ? 'Commercial borrower onboarding & 60% stock hypothecation sanction'
                        : 'Instant credit advance up to 85% LTV against active customer Fixed Deposit'}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setSanctionModalOpen(false)}
                className="inline-flex items-center gap-1 px-3 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 hover:text-rose-900 rounded-xl font-bold text-xs border border-rose-200 transition cursor-pointer"
                title="Close"
              >
                <X className="w-4 h-4 text-rose-600 stroke-[2.5]" />
                <span>Close</span>
              </button>
            </div>

            <form onSubmit={handleSanctionLoan} className="mt-4 space-y-4 text-xs">
              {/* Borrower Selection + Instant Quick Customer Add */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="font-bold text-slate-800 flex items-center gap-1">
                    <User className="w-3.5 h-3.5 text-indigo-600" />
                    BORROWER / CUSTOMER (ऋण लेने वाला सदस्य) *
                  </label>
                  <button
                    type="button"
                    onClick={() => setShowQuickAddCustomer(!showQuickAddCustomer)}
                    className="inline-flex items-center gap-1 text-[11px] font-bold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 px-2.5 py-1 rounded-lg border border-indigo-200 transition cursor-pointer shadow-xs"
                    title="नया कस्टमर ऑनबोर्ड करें"
                  >
                    <UserPlus className="w-3.5 h-3.5 text-indigo-600" />
                    <span>{showQuickAddCustomer ? '✕ Close Registration' : '+ New Customer (नया सदस्य जोड़ें)'}</span>
                  </button>
                </div>

                {/* Inline Quick Add Customer Form */}
                {showQuickAddCustomer && (
                  <div className="mb-3 p-3.5 bg-gradient-to-br from-indigo-50 to-blue-50 border-2 border-indigo-300 rounded-xl space-y-3 animate-fadeIn text-xs shadow-sm">
                    <div className="flex items-center justify-between pb-1.5 border-b border-indigo-200">
                      <div className="font-bold text-indigo-950 flex items-center gap-1.5 text-xs">
                        <UserPlus className="w-4 h-4 text-indigo-700" />
                        <span>Quick Walk-in Borrower Onboarding (नया सदस्य पंजीकरण)</span>
                      </div>
                      <span className="text-[10px] bg-indigo-200 text-indigo-900 px-2 py-0.5 rounded-full font-bold">
                        Instant 1-Click
                      </span>
                    </div>

                    {quickCustError && (
                      <div className="p-2 bg-rose-100 border border-rose-300 text-rose-800 rounded-lg text-xs font-medium">
                        {quickCustError}
                      </div>
                    )}

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                      <div>
                        <label className="block text-[11px] font-bold text-slate-700 mb-0.5">
                          Full Name (पूरा नाम) *
                        </label>
                        <input
                          type="text"
                          required
                          placeholder="e.g. Ramesh Kumar"
                          value={quickCustForm.full_name}
                          onChange={(e) => setQuickCustForm(prev => ({ ...prev, full_name: e.target.value }))}
                          className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-semibold focus:ring-2 focus:ring-indigo-500"
                        />
                      </div>

                      <div>
                        <label className="block text-[11px] font-bold text-slate-700 mb-0.5">
                          Mobile Number (फोन नंबर) *
                        </label>
                        <input
                          type="tel"
                          required
                          placeholder="10-digit mobile"
                          value={quickCustForm.phone}
                          onChange={(e) => setQuickCustForm(prev => ({ ...prev, phone: e.target.value }))}
                          className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-semibold focus:ring-2 focus:ring-indigo-500"
                        />
                      </div>

                      <div>
                        <label className="block text-[11px] font-bold text-slate-700 mb-0.5">
                          Father / Spouse Name (पिता/पति)
                        </label>
                        <input
                          type="text"
                          placeholder="e.g. Shri Shyam Lal"
                          value={quickCustForm.father_name}
                          onChange={(e) => setQuickCustForm(prev => ({ ...prev, father_name: e.target.value }))}
                          className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-indigo-500"
                        />
                      </div>

                      <div>
                        <label className="block text-[11px] font-bold text-slate-700 mb-0.5">
                          Aadhaar / PAN Card
                        </label>
                        <input
                          type="text"
                          placeholder="XXXX-XXXX-XXXX"
                          value={quickCustForm.aadhaar_no}
                          onChange={(e) => setQuickCustForm(prev => ({ ...prev, aadhaar_no: e.target.value, pan_card: e.target.value }))}
                          className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-mono focus:ring-2 focus:ring-indigo-500"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 mb-0.5">
                        Address / Village (पता)
                      </label>
                      <input
                        type="text"
                        placeholder="Village / Mohalla, Tehsil, Bijnor"
                        value={quickCustForm.address}
                        onChange={(e) => setQuickCustForm(prev => ({ ...prev, address: e.target.value }))}
                        className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-indigo-500"
                      />
                    </div>

                    <div className="flex items-center justify-end gap-2 pt-1">
                      <button
                        type="button"
                        onClick={() => setShowQuickAddCustomer(false)}
                        className="px-3 py-1.5 bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 rounded-lg font-bold text-xs transition cursor-pointer"
                      >
                        Cancel
                      </button>
                      <button
                        type="button"
                        disabled={quickCustLoading}
                        onClick={handleQuickAddCustomer}
                        className="px-4 py-1.5 bg-indigo-700 hover:bg-indigo-800 text-white rounded-lg font-bold text-xs shadow-xs transition flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                      >
                        {quickCustLoading ? (
                          <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                        ) : (
                          <CheckCircle2 className="w-3.5 h-3.5" />
                        )}
                        <span>Save & Select Borrower (सदस्य बनाएं और चुनें)</span>
                      </button>
                    </div>
                  </div>
                )}

                <select
                  value={selectedCustomerId}
                  onChange={(e) => {
                    if (e.target.value === '__NEW__') {
                      setShowQuickAddCustomer(true);
                    } else {
                      handleCustomerChange(e.target.value);
                    }
                  }}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none font-semibold"
                >
                  <option value="">-- Select Member / Borrower --</option>
                  <option value="__NEW__" className="text-indigo-700 font-bold bg-indigo-50">
                    ➕ + Register New Walk-in Customer (नया सदस्य जोड़ें)...
                  </option>
                  {customers.map(c => (
                    <option key={c.id} value={c.id}>{c.full_name} ({c.customer_code || 'MEMBER'} - {c.phone})</option>
                  ))}
                </select>

                {/* Selected Customer Preview Card */}
                {selectedCustomerObj && (
                  <div className="mt-2 p-2.5 bg-indigo-50/50 border border-indigo-200 rounded-lg flex items-center justify-between text-xs animate-fadeIn">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-full bg-indigo-200 text-indigo-900 font-bold flex items-center justify-center text-xs">
                        {selectedCustomerObj.full_name.charAt(0)}
                      </div>
                      <div>
                        <div className="font-bold text-slate-900">{selectedCustomerObj.full_name} ({selectedCustomerObj.customer_code || 'M00000'})</div>
                        <div className="text-[11px] text-slate-500">📞 {selectedCustomerObj.phone} • {selectedCustomerObj.branch || 'Main Branch'}</div>
                      </div>
                    </div>
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300 flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3 text-emerald-700" /> Verified Borrower
                    </span>
                  </div>
                )}
              </div>

              {/* Collateral Section */}
              {loanType === 'MORTGAGE' ? (
                <div className="p-3.5 bg-amber-50/60 border border-amber-200 rounded-xl space-y-3">
                  <div className="flex items-center justify-between text-xs font-bold text-amber-950 border-b border-amber-200 pb-1.5">
                    <div className="flex items-center gap-1.5">
                      <Home className="w-4 h-4 text-amber-700" />
                      <span>Property / Real Estate Collateral Details (बंधक संपत्ति का विवरण)</span>
                    </div>
                    <span className="text-[10px] bg-amber-200 text-amber-900 px-2 py-0.5 rounded-full font-bold">
                      70% Max LTV
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    <div>
                      <label className="font-semibold text-slate-700 block mb-1">Property Type (प्रकार) *</label>
                      <select
                        value={propertyType}
                        onChange={(e) => setPropertyType(e.target.value)}
                        className="w-full p-2 bg-white border border-slate-200 rounded-lg font-medium text-xs focus:outline-none"
                      >
                        <option value="Residential House / Flat (आवासीय मकान)">Residential House / Flat (आवासीय मकान)</option>
                        <option value="Commercial Shop / Showroom (दुकान / शोरूम)">Commercial Shop / Showroom (दुकान / शोरूम)</option>
                        <option value="Agricultural Land / Farm (कृषि भूमि)">Agricultural Land / Farm (कृषि भूमि)</option>
                        <option value="Commercial Plot (व्यावसायिक प्लॉट)">Commercial Plot (व्यावसायिक प्लॉट)</option>
                        <option value="Industrial Shed / Godown (गोदाम / शेड)">Industrial Shed / Godown (गोदाम / शेड)</option>
                      </select>
                    </div>

                    <div>
                      <label className="font-semibold text-slate-700 block mb-1">Title Deed / Registry / Khasra No *</label>
                      <input
                        type="text"
                        value={propertyDetails}
                        onChange={(e) => setPropertyDetails(e.target.value)}
                        placeholder="e.g. Registry 4210/2022, Khasra 152/1"
                        className="w-full p-2 bg-white border border-slate-200 rounded-lg text-xs font-medium focus:outline-none"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    <div>
                      <label className="font-semibold text-slate-700 block mb-1">Market Valuation / Circle Rate (मूल्यांकन ₹) *</label>
                      <input
                        type="number"
                        min="50000"
                        step="10000"
                        value={propertyValuation}
                        onChange={(e) => {
                          onNumericInputChange(e, (val) => {
                            setPropertyValuation(val);
                            setLoanAmount(Math.round((parseFloat(val) || 0) * 0.70));
                          });
                        }}
                        className="w-full p-2 bg-white border border-slate-200 rounded-lg text-xs font-bold text-slate-900 focus:outline-none"
                      />
                    </div>

                    <div>
                      <label className="font-semibold text-slate-700 block mb-1">Max Sanction Limit (70% LTV)</label>
                      <div className="w-full p-2 bg-emerald-50 border border-emerald-300 rounded-lg text-xs font-black text-emerald-800">
                        {formatINR(Math.round(propertyValuation * 0.70))}
                      </div>
                    </div>
                  </div>
                </div>
              ) : loanType === 'BUSINESS' ? (
                <div className="p-3.5 bg-blue-50/60 border border-blue-200 rounded-xl space-y-3">
                  <div className="flex items-center justify-between text-xs font-bold text-blue-950 border-b border-blue-200 pb-1.5">
                    <div className="flex items-center gap-1.5">
                      <Building2 className="w-4 h-4 text-blue-700" />
                      <span>Business & Commercial Hypothecation (व्यापारिक स्टॉक / संपत्ति)</span>
                    </div>
                    <span className="text-[10px] bg-blue-200 text-blue-900 px-2 py-0.5 rounded-full font-bold">
                      60% Max LTV
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    <div>
                      <label className="font-semibold text-slate-700 block mb-1">Business Name & Trade *</label>
                      <input
                        type="text"
                        value={propertyType}
                        onChange={(e) => setPropertyType(e.target.value)}
                        placeholder="e.g. Sharma Hardware & Sanitary"
                        className="w-full p-2 bg-white border border-slate-200 rounded-lg font-medium text-xs focus:outline-none"
                      />
                    </div>

                    <div>
                      <label className="font-semibold text-slate-700 block mb-1">GSTIN / Stock Details / Hypothecation</label>
                      <input
                        type="text"
                        value={propertyDetails}
                        onChange={(e) => setPropertyDetails(e.target.value)}
                        placeholder="e.g. GSTIN / Stock Register Hypothecation"
                        className="w-full p-2 bg-white border border-slate-200 rounded-lg text-xs font-medium focus:outline-none"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    <div>
                      <label className="font-semibold text-slate-700 block mb-1">Stock / Asset Valuation (₹) *</label>
                      <input
                        type="number"
                        min="50000"
                        step="10000"
                        value={propertyValuation}
                        onChange={(e) => {
                          onNumericInputChange(e, (val) => {
                            setPropertyValuation(val);
                            setLoanAmount(Math.round((parseFloat(val) || 0) * 0.60));
                          });
                        }}
                        className="w-full p-2 bg-white border border-slate-200 rounded-lg text-xs font-bold text-slate-900 focus:outline-none"
                      />
                    </div>

                    <div>
                      <label className="font-semibold text-slate-700 block mb-1">Max Sanction Limit (60% LTV)</label>
                      <div className="w-full p-2 bg-emerald-50 border border-emerald-300 rounded-lg text-xs font-black text-emerald-800">
                        {formatINR(Math.round(propertyValuation * 0.60))}
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
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

                  {selectedFD && (
                    <div className="mt-2 p-3 bg-indigo-50 border border-indigo-200 rounded-xl space-y-1">
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
                </div>
              )}

              {/* Loan Amount & Interest Rate */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Loan Amount Requested (₹) *</label>
                  <input
                    type="number"
                    min="10000"
                    max={maxAllowedLimit > 0 ? maxAllowedLimit : undefined}
                    value={loanAmount}
                    onChange={(e) => onNumericInputChange(e, setLoanAmount)}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none font-bold text-slate-900"
                  />
                </div>

                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Interest Rate (% p.a.)</label>
                  <input
                    type="number"
                    step="0.5"
                    value={interestRate}
                    onChange={(e) => onNumericInputChange(e, setInterestRate)}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none font-bold text-blue-700"
                  />
                </div>
              </div>

              {/* Tenure & EMI */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Tenure (Months)</label>
                  <input
                    type="number"
                    min="6"
                    max="180"
                    value={tenureMonths}
                    onChange={(e) => onNumericInputChange(e, setTenureMonths)}
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

              {/* Disbursal Date */}
              <div>
                <label className="font-semibold text-slate-700 block mb-1">Disbursal Date (डिसबर्स किस तारीख पर किया गया) *</label>
                <DateInput
                  required
                  value={disbursalDate}
                  onChange={(e) => setDisbursalDate(e.target.value)}
                  className="w-full p-2.5 bg-white border border-slate-300 rounded-lg font-mono font-bold text-slate-900 focus:outline-none focus:border-indigo-600"
                />
              </div>

              <div className="flex items-center gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setSanctionModalOpen(false)}
                  className="flex-1 py-2.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!selectedCustomerId || (!isMortgageOrBusiness && !selectedFD) || submittingLoan}
                  className="flex-1 py-2.5 rounded-lg bg-indigo-700 hover:bg-indigo-800 text-white font-bold shadow-xs cursor-pointer disabled:opacity-50"
                >
                  {submittingLoan ? 'Processing...' : (loanType === 'MORTGAGE' ? 'Sanction Property Loan' : loanType === 'BUSINESS' ? 'Sanction Business Loan' : 'Sanction LAD Loan')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 6. Repayment / EMI Collection Modal */}
      {repayModalOpen && selectedLoanForRepay && (
        <div className="fixed inset-0 z-[200] bg-slate-950/80 backdrop-blur-xs flex justify-center items-start pt-16 pb-10 p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-md w-full p-6 animate-fadeIn relative">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div>
                <h3 className="text-base font-bold text-slate-900">
                  Loan Repayment / EMI Collection
                </h3>
                <p className="text-[11px] text-slate-500">
                  {selectedLoanForRepay.loan_number} • {selectedLoanForRepay.customer_name}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setRepayModalOpen(false)}
                className="inline-flex items-center gap-1 px-2.5 py-1 bg-rose-50 hover:bg-rose-100 text-rose-700 rounded-lg font-bold text-xs border border-rose-200 transition cursor-pointer"
                title="Close"
              >
                <X className="w-4 h-4 text-rose-600" />
                <span>Close</span>
              </button>
            </div>

            <form onSubmit={handleRepaySubmit} className="mt-4 space-y-3.5 text-xs">
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-1">
                <div className="flex justify-between">
                  <span className="text-slate-500">Total Sanctioned:</span>
                  <span className="font-mono font-bold text-slate-900">{formatINR(selectedLoanForRepay.sanctioned_amount)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Current Outstanding:</span>
                  <span className="font-mono font-black text-rose-700">{formatINR(selectedLoanForRepay.outstanding_principal)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Monthly EMI:</span>
                  <span className="font-mono font-bold text-emerald-700">{formatINR(selectedLoanForRepay.emi_amount)}/mo</span>
                </div>
                <div className="flex justify-between border-t border-slate-200 pt-1 text-[11px]">
                  <span className="text-slate-500">Disbursed Date:</span>
                  <span className="font-mono text-slate-700">{formatDate(selectedLoanForRepay.disbursal_date)}</span>
                </div>
                <div className="flex justify-between text-[11px]">
                  <span className="text-slate-500">Maturity Date:</span>
                  <span className="font-mono text-slate-700">{formatDate(selectedLoanForRepay.maturity_date)}</span>
                </div>
              </div>

              <div>
                <label className="font-bold text-slate-700 uppercase block mb-1">Repayment Amount (₹) *</label>
                <input
                  type="number"
                  required
                  step="0.01"
                  min="1"
                  max={selectedLoanForRepay.outstanding_principal}
                  value={repayAmount}
                  onChange={(e) => setRepayAmount(e.target.value)}
                  className="w-full p-2.5 bg-white border border-slate-300 rounded-xl font-mono font-black text-slate-900 text-sm focus:outline-none"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 uppercase block mb-1">Repayment Date (जमा करने की तारीख) *</label>
                <DateInput
                  required
                  value={repayDate}
                  onChange={(e) => setRepayDate(e.target.value)}
                  className="w-full p-2 bg-white border border-slate-300 rounded-xl font-mono font-bold"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 uppercase block mb-1">Payment Mode *</label>
                <select
                  value={repayMode}
                  onChange={(e) => setRepayMode(e.target.value)}
                  className="w-full p-2 bg-white border border-slate-300 rounded-xl font-bold"
                >
                  <option value="CASH">Cash Book (गल्ले में जमा)</option>
                  <option value="BANK_ONLINE">Bank Online / NEFT / UPI</option>
                  <option value="CHEQUE">Bank Cheque / DD</option>
                </select>
              </div>

              <div>
                <label className="font-bold text-slate-700 uppercase block mb-1">Receipt / UTR Reference No</label>
                <input
                  type="text"
                  placeholder="e.g. UTR-98124 or RCPT-1002"
                  value={repayRef}
                  onChange={(e) => setRepayRef(e.target.value)}
                  className="w-full p-2 bg-white border border-slate-300 rounded-xl font-mono font-bold"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 uppercase block mb-1">Narration / Remarks</label>
                <input
                  type="text"
                  value={repayNarration}
                  onChange={(e) => setRepayNarration(e.target.value)}
                  className="w-full p-2 bg-white border border-slate-300 rounded-xl text-slate-800"
                />
              </div>

              <div className="flex items-center gap-2 pt-2 border-t">
                <button
                  type="button"
                  onClick={() => setRepayModalOpen(false)}
                  className="flex-1 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingRepay}
                  className="flex-1 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold shadow-xs cursor-pointer"
                >
                  {submittingRepay ? 'Processing...' : 'Save & Record in Day Book'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
