import React, { useState, useEffect } from 'react';
import { 
  Users, 
  Search, 
  UserPlus, 
  Phone, 
  Mail, 
  CreditCard, 
  FileText, 
  Building2,
  X,
  CheckCircle,
  Eye,
  Key,
  MessageSquare,
  Copy,
  Edit3,
  Trash2,
  Lock,
  Unlock,
  ShieldAlert,
  ShieldCheck,
  Smartphone,
  LayoutGrid,
  Table as TableIcon,
  PlusCircle,
  ArrowRight,
  ChevronRight,
  Filter,
  DollarSign,
  Wallet,
  Coins,
  Megaphone,
  Send,
  Check,
  Sparkles
} from 'lucide-react';
import { formatINR, formatDate, apiRequest, onNumericInputChange } from '../utils';

export default function Customers({ 
  onSelectCustomerForFD, 
  onSelectCustomerForRD,
  onSelectCustomerForMIS,
  onSelectCustomerForSavings,
  onViewPortfolio 
}) {
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedBranch, setSelectedBranch] = useState('ALL');
  const [selectedKYC, setSelectedKYC] = useState('ALL');
  const [viewMode, setViewMode] = useState('table'); // 'table' (Enterprise 15-col default) or 'cards'
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 30; // 30 rows/page
  
  // Add Modal State
  const [modalOpen, setModalOpen] = useState(false);
  const [formData, setFormData] = useState({
    full_name: '',
    father_name: '',
    branch: 'MAIN BRANCH',
    phone: '',
    email: '',
    pan_card: '',
    aadhaar_no: '',
    kyc_status: 'PENDING',
    address: '',
    bank_name: '',
    account_no: '',
    ifsc_code: '',
    nominee_name: '',
    nominee_relation: '',
    is_senior_citizen: false
  });
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState('');

  // Simultaneous Account Opening Options during Customer Registration
  const [openSavingsWithCust, setOpenSavingsWithCust] = useState(false);
  const [savingsDeposit, setSavingsDeposit] = useState(1000);
  const [openFDWithCust, setOpenFDWithCust] = useState(false);
  const [fdPrincipal, setFdPrincipal] = useState(50000);
  const [fdTenureMonths, setFdTenureMonths] = useState(12);
  const [fdInterestRate, setFdInterestRate] = useState(9.5);
  const [fdCompounding, setFdCompounding] = useState('quarterly');

  // Edit Modal State
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState(null);
  const [editFormData, setEditFormData] = useState({});
  const [editSubmitting, setEditSubmitting] = useState(false);
  const [editError, setEditError] = useState('');

  // Delete State
  const [actionLoading, setActionLoading] = useState(null);

  // Bulk WhatsApp Offer Broadcast State
  const [showBroadcastModal, setShowBroadcastModal] = useState(false);
  const [offerTitle, setOfferTitle] = useState('विशेष सावधि जमा योजना (Special High-Return FD)');
  const [offerRate, setOfferRate] = useState('11.00%');
  const [offerTenure, setOfferTenure] = useState('36 माह (3 Years)');
  const [minDeposit, setMinDeposit] = useState('₹50,000');
  const [targetAudience, setTargetAudience] = useState('ALL'); // 'ALL' | 'SENIOR'
  const [broadcastSentMap, setBroadcastSentMap] = useState({});
  const [copiedBroadcast, setCopiedBroadcast] = useState(false);

  const getBroadcastMessage = (custName = '{CUSTOMER_NAME}') => {
    return `नमस्ते ${custName} जी! 🙏\n\nतरंगांजलि (TARPL) की ओर से आपके लिए विशेष निवेश योजना:\n\n🌟 योजना: ${offerTitle}\n💰 विशेष ब्याज दर: ${offerRate} प्रति वर्ष (बैंक से कहीं अधिक)\n⏳ निवेश अवधि: ${offerTenure}\n💵 न्यूनतम जमा: ${minDeposit}\n🔒 100% सुरक्षित एवं मासिक/वार्षिक रिटर्न विकल्प\n\nयह विशेष दर सीमित समय के लिए उपलब्ध है। अपनी FD बुक कराने या जानकारी के लिए संपर्क करें:\n📞 +91 98974 63367 / +91 94123 45678\n📍 तरंगांजलि प्राइवेट लिमिटेड (TARPL)\nवेदिक विहार, बिजनौर (उ.प्र.)`;
  };

  const handleSendSingleOfferWhatsApp = (cust) => {
    const phone = cust.phone ? cust.phone.replace(/[^0-9]/g, '') : '';
    if (!phone) {
      alert('ग्राहक का फ़ोन नंबर उपलब्ध नहीं है।');
      return;
    }
    const fullPhone = phone.length === 10 ? `91${phone}` : phone;
    const msg = getBroadcastMessage(cust.full_name);
    window.open(`https://wa.me/${fullPhone}?text=${encodeURIComponent(msg)}`, '_blank');
    setBroadcastSentMap(prev => ({ ...prev, [cust.id]: true }));
  };

  const broadcastRecipients = customers.filter(c => {
    if (targetAudience === 'SENIOR') return c.is_senior_citizen === 1;
    return true;
  });

  const fetchCustomers = async () => {
    try {
      setLoading(true);
      const res = await apiRequest(`/customers${search ? `?search=${encodeURIComponent(search)}` : ''}`);
      setCustomers(res.customers || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const timer = setTimeout(fetchCustomers, 200);
    return () => clearTimeout(timer);
  }, [search]);

  // Reset pagination on filter or search change
  useEffect(() => {
    setCurrentPage(1);
  }, [search, selectedBranch, selectedKYC]);

  // Client-side branch and KYC filter
  const filteredCustomers = customers.filter(c => {
    const branchMatch = selectedBranch === 'ALL' || (c.branch || 'MAIN BRANCH') === selectedBranch;
    const kycMatch = selectedKYC === 'ALL' || (c.kyc_status || 'PENDING') === selectedKYC;
    return branchMatch && kycMatch;
  });

  const totalPages = Math.ceil(filteredCustomers.length / pageSize) || 1;
  const paginatedCustomers = filteredCustomers.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  // Delete Customer
  const handleDeleteCustomer = async (cust) => {
    const confirmDelete = window.confirm(
      `⚠️ WARNING: क्या आप सच में ग्राहक "${cust.full_name}" (${cust.customer_code}) को CRM से डिलीट करना चाहते हैं?\n\nडिलीट करने पर इस ग्राहक के सभी जुड़े खाते (FD, RD, MIS, Savings, Loan) और ट्रांजैक्शन रिकॉर्ड स्थायी रूप से हट जाएंगे!`
    );
    if (!confirmDelete) return;

    try {
      setActionLoading(cust.id);
      const res = await apiRequest(`/customers/${cust.id}?force=true`, {
        method: 'DELETE'
      });
      alert(res.message || 'Client deleted successfully');
      fetchCustomers();
    } catch (err) {
      alert(err.message || 'Failed to delete customer');
    } finally {
      setActionLoading(null);
    }
  };

  // Open Edit Modal
  const handleOpenEdit = (cust) => {
    setEditingCustomer(cust);
    setEditFormData({
      full_name: cust.full_name || '',
      father_name: cust.father_name || '',
      branch: cust.branch || 'MAIN BRANCH',
      phone: cust.phone || '',
      email: cust.email || '',
      pan_card: cust.pan_card || '',
      aadhaar_no: cust.aadhaar_no || '',
      kyc_status: cust.kyc_status || 'PENDING',
      address: cust.address || '',
      bank_name: cust.bank_name || '',
      account_no: cust.account_no || '',
      ifsc_code: cust.ifsc_code || '',
      nominee_name: cust.nominee_name || '',
      nominee_relation: cust.nominee_relation || '',
      is_senior_citizen: Boolean(cust.is_senior_citizen)
    });
    setEditError('');
    setEditModalOpen(true);
  };

  // Handle Edit Submit
  const handleEditSubmit = async (e) => {
    e.preventDefault();
    if (!editFormData.full_name || !editFormData.phone) {
      setEditError('Name and phone are required');
      return;
    }

    try {
      setEditSubmitting(true);
      setEditError('');

      const res = await apiRequest(`/customers/${editingCustomer.id}`, {
        method: 'PUT',
        body: JSON.stringify(editFormData)
      });

      if (res?.makerApprovalRequired) {
        alert(res.message || 'कस्टमर प्रोफाइल में बदलाव Super Admin अप्रूवल के लिए सबमिट कर दिया गया है। Super Admin द्वारा अप्रूव होने के बाद ही यह लागू होगा।');
      }

      setEditModalOpen(false);
      fetchCustomers();
    } catch (err) {
      setEditError(err.message || 'Failed to update customer');
    } finally {
      setEditSubmitting(false);
    }
  };

  // Handle Add Submit
  const handleAddSubmit = async (e) => {
    e.preventDefault();
    if (!formData.full_name || !formData.phone) {
      setFormError('Full name and mobile phone are required');
      return;
    }

    try {
      setSubmitting(true);
      setFormError('');

      const res = await apiRequest('/customers', {
        method: 'POST',
        body: JSON.stringify(formData)
      });

      if (res.success && res.customer) {
        const newCustId = res.customer.id;
        let createdNotices = [];

        // 1. If Savings Account requested simultaneously
        if (openSavingsWithCust) {
          try {
            const sbRes = await apiRequest('/savings', {
              method: 'POST',
              body: JSON.stringify({
                customer_id: newCustId,
                opening_balance: Number(savingsDeposit) || 1000,
                minimum_balance: 1000,
                annual_interest_rate: 4.0,
                nominee_name: formData.nominee_name,
                nominee_relation: formData.nominee_relation,
                remarks: 'Opened simultaneously with Member KYC registration'
              })
            });
            if (sbRes.success) createdNotices.push('बचत खाता (Savings Account)');
          } catch(e) {
            console.error('Failed to auto-open savings:', e);
          }
        }

        // 2. If Fixed Deposit requested simultaneously
        if (openFDWithCust) {
          try {
            const effectiveRate = Number(fdInterestRate) || (formData.is_senior_citizen ? 10.0 : 9.5);
            const fdRes = await apiRequest('/fds', {
              method: 'POST',
              body: JSON.stringify({
                customer_id: newCustId,
                principal_amount: Number(fdPrincipal) || 50000,
                annual_rate: effectiveRate,
                tenure_months: Number(fdTenureMonths) || 12,
                compounding_frequency: fdCompounding || 'quarterly',
                start_date: new Date().toISOString().split('T')[0],
                remarks: 'Booked simultaneously with Member KYC registration'
              })
            });
            if (fdRes.success) createdNotices.push('फिक्स्ड डिपॉजिट (FD)');
          } catch(e) {
            console.error('Failed to auto-book FD:', e);
          }
        }

        if (createdNotices.length > 0) {
          alert(`सदस्य सफलतापूर्वक पंजीकृत हो गया है एवं ${createdNotices.join(' तथा ')} खाता तुरंत चालू कर दिया गया है!`);
        }

        setModalOpen(false);
        setOpenSavingsWithCust(false);
        setOpenFDWithCust(false);
        setFormData({
          full_name: '',
          father_name: '',
          branch: 'MAIN BRANCH',
          phone: '',
          email: '',
          pan_card: '',
          aadhaar_no: '',
          kyc_status: 'PENDING',
          address: '',
          bank_name: '',
          account_no: '',
          ifsc_code: '',
          nominee_name: '',
          nominee_relation: '',
          is_senior_citizen: false
        });
        fetchCustomers();
      }
    } catch (err) {
      setFormError(err.message || 'Failed to create customer');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6 pb-12 animate-fadeIn">
      
      {/* Top Header Card */}
      <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs p-5 md:p-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-xl md:text-2xl font-bold tracking-tight text-slate-900">
              Customer Master & Members Desk
            </h1>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
              {customers.length} Members Registered
            </span>
          </div>
          <p className="text-xs md:text-sm text-slate-500 mt-1">
            प्रत्येक सदस्य के आगे सीधा 1-क्लिक एक्शन: [+ FD], [+ RD], [+ MIS], [+ Loan], 360° पासबुक व WhatsApp
          </p>
        </div>

        <div className="flex items-center gap-3">
          {/* View Mode Switcher */}
          <div className="inline-flex rounded-lg border border-slate-200 p-0.5 bg-slate-50">
            <button
              onClick={() => setViewMode('table')}
              className={`p-1.5 rounded-md text-xs font-medium flex items-center gap-1 transition ${
                viewMode === 'table' ? 'bg-white shadow-xs text-indigo-600 font-bold' : 'text-slate-500 hover:text-slate-900'
              }`}
              title="15-Column Tabular View"
            >
              <TableIcon className="w-3.5 h-3.5" />
              Table
            </button>
            <button
              onClick={() => setViewMode('cards')}
              className={`p-1.5 rounded-md text-xs font-medium flex items-center gap-1 transition ${
                viewMode === 'cards' ? 'bg-white shadow-xs text-indigo-600 font-bold' : 'text-slate-500 hover:text-slate-900'
              }`}
              title="Modern Cards View"
            >
              <LayoutGrid className="w-3.5 h-3.5" />
              Cards
            </button>
          </div>

          <button
            onClick={() => setShowBroadcastModal(true)}
            className="inline-flex items-center gap-2 px-3.5 py-2 text-xs md:text-sm font-bold rounded-xl bg-emerald-600 text-white hover:bg-emerald-700 shadow-md shadow-emerald-600/20 transition cursor-pointer"
            title="Send Special Offer / Rate Hike to All Members on WhatsApp"
          >
            <Megaphone className="w-4 h-4" />
            <span>📢 Broadcast Offer</span>
          </button>

          <button
            onClick={() => setModalOpen(true)}
            className="inline-flex items-center gap-2 px-4 py-2 text-xs md:text-sm font-bold rounded-xl bg-indigo-600 text-white hover:bg-indigo-700 shadow-md shadow-indigo-600/20 transition cursor-pointer"
          >
            <UserPlus className="w-4 h-4" />
            Add New Member
          </button>
        </div>
      </div>

      {/* Search & Filter Toolbar */}
      <div className="bg-white rounded-2xl border border-slate-200 p-4 flex flex-col md:flex-row items-center justify-between gap-4 shadow-xs">
        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
          {/* Branch Filter */}
          <div className="flex items-center gap-1.5 text-xs text-slate-600">
            <Building2 className="w-3.5 h-3.5 text-slate-400" />
            <select
              value={selectedBranch}
              onChange={(e) => setSelectedBranch(e.target.value)}
              className="px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="ALL">All Branches (2)</option>
              <option value="MAIN BRANCH">MAIN BRANCH</option>
              <option value="TARPL SAVING">TARPL SAVING</option>
            </select>
          </div>

          {/* KYC Status Filter */}
          <div className="flex items-center gap-1.5 text-xs text-slate-600">
            <ShieldCheck className="w-3.5 h-3.5 text-slate-400" />
            <select
              value={selectedKYC}
              onChange={(e) => setSelectedKYC(e.target.value)}
              className="px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="ALL">All KYC Status</option>
              <option value="FULL_KYC">FULL KYC</option>
              <option value="MIN_KYC">MIN KYC</option>
              <option value="PENDING">PENDING</option>
            </select>
          </div>

          <span className="text-xs text-slate-400 font-medium">
            Showing {filteredCustomers.length} of {customers.length}
          </span>
        </div>

        {/* Search Input */}
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Search Member No (M01704), Name, Mobile, PAN..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white"
          />
        </div>
      </div>

      {/* Main View: 15-Column Table vs Cards */}
      {loading ? (
        <div className="py-20 text-center">
          <div className="inline-block w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-xs text-slate-500 mt-2 font-medium">Loading Members...</p>
        </div>
      ) : filteredCustomers.length === 0 ? (
        <div className="bg-white p-12 text-center rounded-2xl border border-slate-200 text-slate-400">
          <Users className="w-12 h-12 mx-auto stroke-1 mb-2 opacity-50" />
          <p className="font-semibold text-slate-700">No members found</p>
          <p className="text-xs mt-1">Try adjusting your search criteria or click "Add New Member"</p>
        </div>
      ) : viewMode === 'table' ? (
        /* 15-Column Table View */
        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50/90 border-b border-slate-200 text-slate-600 font-bold uppercase text-[10px] tracking-wider">
                  <th className="py-3 px-3">CUSTOMER NO.</th>
                  <th className="py-3 px-3">BRANCH</th>
                  <th className="py-3 px-3">NAME</th>
                  <th className="py-3 px-3">F/H NAME</th>
                  <th className="py-3 px-2 text-center">SR. CTZ</th>
                  <th className="py-3 px-3">ENROLL DATE</th>
                  <th className="py-3 px-3">AADHAAR / PAN</th>
                  <th className="py-3 px-2 text-center">KYC</th>
                  <th className="py-3 px-3">MOBILE NO</th>
                  <th className="py-3 px-3 text-right">ACTIVE DEPOSITS</th>
                  <th className="py-3 px-4 text-center">⚡ QUICK ACTIONS</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {paginatedCustomers.map((c) => {
                  return (
                    <tr key={c.id} className="hover:bg-slate-50/80 transition group">
                      
                      {/* Customer No */}
                      <td className="py-3 px-3">
                        <button
                          onClick={() => onViewPortfolio && onViewPortfolio(c.id)}
                          className="font-mono font-bold text-indigo-600 hover:text-indigo-800 hover:underline cursor-pointer flex items-center gap-1"
                          title="Open 360° Customer Profile"
                        >
                          {c.customer_code}
                          <Eye className="w-3 h-3 opacity-0 group-hover:opacity-100 transition" />
                        </button>
                      </td>

                      {/* Branch */}
                      <td className="py-3 px-3 text-slate-600 font-semibold whitespace-nowrap">
                        {c.branch || 'MAIN BRANCH'}
                      </td>

                      {/* Full Name */}
                      <td className="py-3 px-3">
                        <div className="font-bold text-slate-900 whitespace-nowrap">{c.full_name}</div>
                        {c.email && <div className="text-[10px] text-slate-400">{c.email}</div>}
                      </td>

                      {/* Father / Husband Name */}
                      <td className="py-3 px-3 text-slate-600 whitespace-nowrap">
                        {c.father_name || c.nominee_name || '-'}
                      </td>

                      {/* Senior Citizen */}
                      <td className="py-3 px-2 text-center">
                        {c.is_senior_citizen ? (
                          <span className="text-[10px] font-bold text-amber-700 bg-amber-100 px-1.5 py-0.5 rounded">
                            Yes
                          </span>
                        ) : (
                          <span className="text-[10px] text-slate-400">No</span>
                        )}
                      </td>

                      {/* Enroll Date */}
                      <td className="py-3 px-3 text-slate-600 whitespace-nowrap">
                        {formatDate(c.created_at)}
                      </td>

                      {/* Aadhaar / PAN */}
                      <td className="py-3 px-3 font-mono text-[11px] whitespace-nowrap">
                        {c.pan_card ? (
                          <span className="text-slate-800 font-bold block">{c.pan_card}</span>
                        ) : null}
                        {c.aadhaar_no ? (
                          <span className="text-slate-400 text-[10px] block">Aadhaar: ..{c.aadhaar_no.slice(-4)}</span>
                        ) : null}
                        {!c.pan_card && !c.aadhaar_no && <span className="text-slate-400">-</span>}
                      </td>

                      {/* KYC Status */}
                      <td className="py-3 px-2 text-center">
                        <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded uppercase ${
                          (c.kyc_status === 'FULL_KYC' || c.pan_card)
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            : 'bg-amber-50 text-amber-700 border border-amber-200'
                        }`}>
                          {c.kyc_status || (c.pan_card ? 'FULL KYC' : 'PENDING')}
                        </span>
                      </td>

                      {/* Mobile */}
                      <td className="py-3 px-3 font-medium text-slate-700 whitespace-nowrap">
                        {c.phone}
                      </td>

                      {/* Active Deposits */}
                      <td className="py-3 px-3 text-right">
                        <div className="font-bold text-emerald-600">
                          {formatINR(c.total_active_investment || 0)}
                        </div>
                        <div className="text-[10px] text-slate-400">
                          {c.total_fds || 0} active FDs
                        </div>
                      </td>

                      {/* ⚡ Quick Action Desk Buttons */}
                      <td className="py-3 px-4">
                        <div className="flex items-center justify-center gap-1.5 flex-nowrap">
                          {/* [+ FD] */}
                          <button
                            onClick={() => onSelectCustomerForFD && onSelectCustomerForFD(c.id)}
                            className="px-2 py-1 bg-indigo-50 hover:bg-indigo-600 text-indigo-700 hover:text-white rounded text-[11px] font-bold transition cursor-pointer whitespace-nowrap"
                            title="Book New Fixed Deposit (FD)"
                          >
                            + FD
                          </button>

                          {/* [+ SB / Savings] */}
                          <button
                            onClick={() => onSelectCustomerForSavings && onSelectCustomerForSavings(c.id)}
                            className="px-2 py-1 bg-emerald-50 hover:bg-emerald-600 text-emerald-700 hover:text-white rounded text-[11px] font-bold transition cursor-pointer whitespace-nowrap"
                            title="Open New Savings Account (बचत खाता खोलें)"
                          >
                            + SB (Savings)
                          </button>

                          {/* [+ RD] */}
                          <button
                            onClick={() => onSelectCustomerForRD && onSelectCustomerForRD(c.id)}
                            className="px-2 py-1 bg-teal-50 hover:bg-teal-600 text-teal-700 hover:text-white rounded text-[11px] font-bold transition cursor-pointer whitespace-nowrap"
                            title="Start New Recurring Deposit (RD)"
                          >
                            + RD
                          </button>

                          {/* [+ MIS] */}
                          <button
                            onClick={() => onSelectCustomerForMIS && onSelectCustomerForMIS(c.id)}
                            className="px-2 py-1 bg-amber-50 hover:bg-amber-600 text-amber-800 hover:text-white rounded text-[11px] font-bold transition cursor-pointer whitespace-nowrap"
                            title="Start Monthly Income Scheme (MIS)"
                          >
                            + MIS
                          </button>

                          {/* 360° Passbook */}
                          <button
                            onClick={() => onViewPortfolio && onViewPortfolio(c.id)}
                            className="p-1 hover:bg-slate-100 text-slate-600 hover:text-indigo-600 rounded transition cursor-pointer"
                            title="360° Member Ledger & Passbook"
                          >
                            <FileText className="w-3.5 h-3.5" />
                          </button>

                          {/* Edit */}
                          <button
                            onClick={() => handleOpenEdit(c)}
                            className="p-1 hover:bg-slate-100 text-slate-500 hover:text-indigo-600 rounded transition cursor-pointer"
                            title="Edit Member"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>

                          {/* Delete */}
                          <button
                            onClick={() => handleDeleteCustomer(c)}
                            className="p-1 hover:bg-rose-50 text-slate-400 hover:text-rose-600 rounded transition cursor-pointer"
                            title="Delete Member"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>

                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        /* Modern Cards View */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {paginatedCustomers.map((c) => {
            return (
              <div 
                key={c.id} 
                className="bg-white rounded-2xl border border-slate-200 transition flex flex-col justify-between p-5 shadow-sm hover:shadow-md"
              >
                <div>
                  <div className="flex justify-between items-start">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-mono font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded">
                          {c.customer_code}
                        </span>
                        <span className="text-[10px] font-semibold text-slate-500 bg-slate-100 px-2 py-0.5 rounded">
                          {c.branch || 'MAIN BRANCH'}
                        </span>
                      </div>

                      <h3 className="font-bold text-slate-900 text-base mt-1.5 flex items-center gap-2">
                        {c.full_name}
                        {c.is_senior_citizen ? (
                          <span className="text-[9px] font-bold text-amber-700 bg-amber-100 px-1.5 py-0.2 rounded">
                            Sr. Citizen
                          </span>
                        ) : null}
                      </h3>
                      {c.father_name && (
                        <p className="text-[11px] text-slate-400">S/W/D of: {c.father_name}</p>
                      )}
                    </div>

                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => handleOpenEdit(c)}
                        title="Edit Customer"
                        className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-500 hover:text-indigo-600 cursor-pointer"
                      >
                        <Edit3 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDeleteCustomer(c)}
                        title="Delete Client"
                        className="p-1.5 hover:bg-rose-50 rounded-lg text-slate-400 hover:text-rose-600 cursor-pointer"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  <div className="mt-3 space-y-1.5 text-xs text-slate-600 border-t border-slate-100 pt-3">
                    <p className="flex items-center gap-2">
                      <Phone className="w-3.5 h-3.5 text-slate-400" />
                      <span>{c.phone}</span>
                    </p>
                    <p className="flex items-center gap-2">
                      <CreditCard className="w-3.5 h-3.5 text-slate-400" />
                      <span>PAN: <strong className="font-mono text-slate-700">{c.pan_card || 'Not Added'}</strong></span>
                    </p>
                  </div>


                </div>

                {/* Card Quick Action Bar */}
                <div className="mt-4 pt-3 border-t border-slate-100">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[10px] text-slate-400 font-bold uppercase">Active Investment</span>
                    <span className="font-black text-emerald-700 text-sm">{formatINR(c.total_active_investment || 0)}</span>
                  </div>

                  <div className="grid grid-cols-4 gap-1.5">
                    <button
                      onClick={() => onSelectCustomerForFD && onSelectCustomerForFD(c.id)}
                      className="py-1 bg-indigo-50 hover:bg-indigo-600 text-indigo-700 hover:text-white rounded text-[10px] font-bold transition text-center cursor-pointer"
                    >
                      + FD
                    </button>
                    <button
                      onClick={() => onSelectCustomerForSavings && onSelectCustomerForSavings(c.id)}
                      className="py-1 bg-emerald-50 hover:bg-emerald-600 text-emerald-700 hover:text-white rounded text-[10px] font-bold transition text-center cursor-pointer"
                    >
                      + SB
                    </button>
                    <button
                      onClick={() => onSelectCustomerForRD && onSelectCustomerForRD(c.id)}
                      className="py-1 bg-teal-50 hover:bg-teal-600 text-teal-700 hover:text-white rounded text-[10px] font-bold transition text-center cursor-pointer"
                    >
                      + RD
                    </button>
                    <button
                      onClick={() => onSelectCustomerForMIS && onSelectCustomerForMIS(c.id)}
                      className="py-1 bg-amber-50 hover:bg-amber-600 text-amber-800 hover:text-white rounded text-[10px] font-bold transition text-center cursor-pointer"
                    >
                      + MIS
                    </button>
                    <button
                      onClick={() => onViewPortfolio && onViewPortfolio(c.id)}
                      className="py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded text-[10px] font-bold transition text-center cursor-pointer"
                    >
                      360°
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Pagination Controls */}
      {filteredCustomers.length > pageSize && (
        <div className="bg-white rounded-2xl border border-slate-200 p-4 flex flex-col sm:flex-row items-center justify-between gap-3 shadow-xs">
          <div className="text-xs text-slate-500 font-medium">
            Showing <span className="font-bold text-slate-800">{(currentPage - 1) * pageSize + 1}</span> to{' '}
            <span className="font-bold text-slate-800">{Math.min(currentPage * pageSize, filteredCustomers.length)}</span> of{' '}
            <span className="font-bold text-indigo-600">{filteredCustomers.length.toLocaleString('en-IN')}</span> members
          </div>

          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setCurrentPage(1)}
              disabled={currentPage === 1}
              className="px-2.5 py-1 text-xs font-semibold rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
            >
              First
            </button>
            <button
              onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
              disabled={currentPage === 1}
              className="px-2.5 py-1 text-xs font-semibold rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
            >
              Prev
            </button>
            
            <div className="px-3 py-1 text-xs font-bold bg-indigo-50 text-indigo-700 rounded-lg border border-indigo-200">
              Page {currentPage} of {totalPages}
            </div>

            <button
              onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
              disabled={currentPage === totalPages}
              className="px-2.5 py-1 text-xs font-semibold rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
            >
              Next
            </button>
            <button
              onClick={() => setCurrentPage(totalPages)}
              disabled={currentPage === totalPages}
              className="px-2.5 py-1 text-xs font-semibold rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
            >
              Last
            </button>
          </div>
        </div>
      )}

      {/* Edit Customer Modal */}
      {editModalOpen && (
        <div className="fixed inset-0 z-[200] bg-slate-950/80 backdrop-blur-sm flex justify-center items-start pt-6 sm:pt-8 pb-10 p-3 sm:p-6 overflow-y-auto">
          <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 max-w-xl w-full p-6 sm:p-8 relative">
            <button
              onClick={() => setEditModalOpen(false)}
              className="absolute right-5 top-5 inline-flex items-center gap-1 px-3 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 rounded-xl font-bold text-xs border border-rose-200 transition cursor-pointer"
              title="Close"
            >
              <X className="w-4 h-4 text-rose-600 stroke-[2.5]" />
              <span>Close</span>
            </button>

            <div className="flex items-center gap-3 mb-6">
              <div className="w-12 h-12 rounded-2xl bg-indigo-600 text-white flex items-center justify-center">
                <Edit3 className="w-6 h-6" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-slate-900">Edit Member & KYC Profile</h2>
                <p className="text-xs text-slate-500">
                  Update customer KYC details, contact information, branch, and nominee mandate
                </p>
              </div>
            </div>

            {editError && (
              <div className="mb-4 p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-xl">
                {editError}
              </div>
            )}

            <form onSubmit={handleEditSubmit} className="space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="sm:col-span-2">
                  <label className="block font-semibold text-slate-600 mb-1">Full Name (पूरा नाम) *</label>
                  <input
                    type="text"
                    required
                    value={editFormData.full_name}
                    onChange={(e) => setEditFormData({ ...editFormData, full_name: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-semibold text-slate-900"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-600 mb-1">Father / Husband Name</label>
                  <input
                    type="text"
                    value={editFormData.father_name}
                    onChange={(e) => setEditFormData({ ...editFormData, father_name: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-600 mb-1">Branch</label>
                  <select
                    value={editFormData.branch}
                    onChange={(e) => setEditFormData({ ...editFormData, branch: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-semibold"
                  >
                    <option value="MAIN BRANCH">MAIN BRANCH</option>
                    <option value="TARPL SAVING">TARPL SAVING</option>
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-slate-600 mb-1">Mobile Phone *</label>
                  <input
                    type="tel"
                    required
                    value={editFormData.phone}
                    onChange={(e) => setEditFormData({ ...editFormData, phone: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-semibold"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-600 mb-1">Email ID</label>
                  <input
                    type="email"
                    value={editFormData.email}
                    onChange={(e) => setEditFormData({ ...editFormData, email: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-600 mb-1">PAN Card</label>
                  <input
                    type="text"
                    maxLength="10"
                    value={editFormData.pan_card}
                    onChange={(e) => setEditFormData({ ...editFormData, pan_card: e.target.value.toUpperCase() })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl uppercase font-mono"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-600 mb-1">Aadhaar Number</label>
                  <input
                    type="text"
                    maxLength="12"
                    value={editFormData.aadhaar_no}
                    onChange={(e) => setEditFormData({ ...editFormData, aadhaar_no: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-mono"
                  />
                </div>
              </div>

              {/* Mobile App Credentials removed: Collector-only CRM */}

              <div className="flex justify-end gap-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setEditModalOpen(false)}
                  className="px-4 py-2 font-semibold text-slate-600 hover:bg-slate-100 rounded-xl cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={editSubmitting}
                  className="px-6 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl shadow-lg shadow-indigo-600/30 transition cursor-pointer disabled:opacity-50"
                >
                  {editSubmitting ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}


      {/* Add Customer Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-[200] bg-slate-950/80 backdrop-blur-sm flex justify-center items-start pt-6 sm:pt-8 pb-10 p-3 sm:p-6 overflow-y-auto">
          <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 max-w-xl w-full p-6 sm:p-8 relative">
            <button
              onClick={() => setModalOpen(false)}
              className="absolute right-5 top-5 inline-flex items-center gap-1 px-3 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 rounded-xl font-bold text-xs border border-rose-200 transition cursor-pointer"
              title="Close"
            >
              <X className="w-4 h-4 text-rose-600 stroke-[2.5]" />
              <span>Close</span>
            </button>

            <div className="flex items-center gap-3 mb-6">
              <div className="w-12 h-12 rounded-2xl bg-indigo-600 text-white flex items-center justify-center">
                <UserPlus className="w-6 h-6" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-slate-900">Add New Member (सदस्य जोड़ें)</h2>
                <p className="text-xs text-slate-500">Taranganjali Private Limited Official Customer Onboarding</p>
              </div>
            </div>

            {formError && (
              <div className="mb-4 p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-xl">
                {formError}
              </div>
            )}

            <form onSubmit={handleAddSubmit} className="space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="sm:col-span-2">
                  <label className="block font-semibold text-slate-600 mb-1">Full Name (पूरा नाम) *</label>
                  <input
                    type="text"
                    required
                    value={formData.full_name}
                    onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-semibold"
                    placeholder="e.g. Ramesh Chandra Sharma"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-600 mb-1">Father / Husband Name</label>
                  <input
                    type="text"
                    value={formData.father_name}
                    onChange={(e) => setFormData({ ...formData, father_name: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl"
                    placeholder="Father/Husband Name"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-600 mb-1">Branch</label>
                  <select
                    value={formData.branch}
                    onChange={(e) => setFormData({ ...formData, branch: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-semibold"
                  >
                    <option value="MAIN BRANCH">MAIN BRANCH</option>
                    <option value="TARPL SAVING">TARPL SAVING</option>
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-slate-600 mb-1">Mobile Phone *</label>
                  <input
                    type="tel"
                    required
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl"
                    placeholder="10 digit phone number"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-600 mb-1">Email ID</label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl"
                    placeholder="email@example.com"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-600 mb-1">PAN Card Number</label>
                  <input
                    type="text"
                    maxLength="10"
                    value={formData.pan_card}
                    onChange={(e) => setFormData({ ...formData, pan_card: e.target.value.toUpperCase() })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl uppercase font-mono"
                    placeholder="ABCDE1234F"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-600 mb-1">Aadhaar Number</label>
                  <input
                    type="text"
                    maxLength="12"
                    value={formData.aadhaar_no}
                    onChange={(e) => setFormData({ ...formData, aadhaar_no: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-mono"
                    placeholder="12 digit Aadhaar"
                  />
                </div>
              </div>

              {/* Senior Citizen Toggle */}
              <div className="p-3 bg-amber-50/70 border border-amber-200 rounded-xl flex items-center justify-between">
                <div>
                  <p className="font-bold text-amber-900">Senior Citizen (60+ Years)</p>
                  <p className="text-[11px] text-amber-700">Eligible for +0.50% higher interest rate on all FDs</p>
                </div>
                <input
                  type="checkbox"
                  checked={formData.is_senior_citizen}
                  onChange={(e) => setFormData({ ...formData, is_senior_citizen: e.target.checked })}
                  className="w-5 h-5 accent-indigo-600 rounded cursor-pointer"
                />
              </div>

              {/* Bank Details */}
              <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200 space-y-2">
                <span className="font-bold text-slate-700 block">Bank Account for Payouts / Redemption:</span>
                <div className="grid grid-cols-3 gap-2">
                  <input
                    type="text"
                    placeholder="Bank Name"
                    value={formData.bank_name}
                    onChange={(e) => setFormData({ ...formData, bank_name: e.target.value })}
                    className="px-2.5 py-1.5 bg-white border border-slate-200 rounded-xl"
                  />
                  <input
                    type="text"
                    placeholder="Account Number"
                    value={formData.account_no}
                    onChange={(e) => setFormData({ ...formData, account_no: e.target.value })}
                    className="px-2.5 py-1.5 bg-white border border-slate-200 rounded-xl font-mono"
                  />
                  <input
                    type="text"
                    placeholder="IFSC Code"
                    value={formData.ifsc_code}
                    onChange={(e) => setFormData({ ...formData, ifsc_code: e.target.value.toUpperCase() })}
                    className="px-2.5 py-1.5 bg-white border border-slate-200 rounded-xl uppercase font-mono"
                  />
                </div>
              </div>

              {/* Nominee */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-600 mb-1">Nominee Name</label>
                  <input
                    type="text"
                    value={formData.nominee_name}
                    onChange={(e) => setFormData({ ...formData, nominee_name: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl"
                    placeholder="Nominee full name"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-600 mb-1">Nominee Relation</label>
                  <input
                    type="text"
                    value={formData.nominee_relation}
                    onChange={(e) => setFormData({ ...formData, nominee_relation: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl"
                    placeholder="e.g. Spouse / Son / Daughter"
                  />
                </div>
              </div>

              {/* Simultaneous Account Opening (FD & Savings Account Options) */}
              <div className="p-4 bg-gradient-to-br from-emerald-50/80 to-teal-50/80 border-2 border-emerald-300/80 rounded-2xl space-y-3.5 shadow-xs">
                <div className="flex items-center justify-between flex-wrap gap-1">
                  <div className="flex items-center gap-2">
                    <span className="p-1.5 bg-emerald-600 text-white rounded-lg shadow-xs">
                      <Coins className="w-4 h-4" />
                    </span>
                    <div>
                      <h4 className="font-bold text-xs uppercase tracking-wider text-emerald-950">
                        खाता चयन (Open Accounts Simultaneously)
                      </h4>
                      <p className="text-[11px] text-emerald-700">
                        सदस्य पंजीकरण के साथ ही बचत खाता (Savings) व FD एक साथ चालू करें
                      </p>
                    </div>
                  </div>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-200/60 text-emerald-800">
                    Optional
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                  {/* Option 1: Savings Account */}
                  <div className={`p-3.5 rounded-xl border-2 transition-all ${
                    openSavingsWithCust 
                      ? 'bg-white border-emerald-500 shadow-sm ring-1 ring-emerald-400' 
                      : 'bg-white/70 border-slate-200 hover:border-emerald-300'
                  }`}>
                    <label className="flex items-start gap-2.5 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={openSavingsWithCust}
                        onChange={(e) => setOpenSavingsWithCust(e.target.checked)}
                        className="w-4 h-4 accent-emerald-600 rounded mt-0.5 cursor-pointer"
                      />
                      <div className="flex-1 text-xs">
                        <div className="font-black text-slate-900 flex items-center gap-1.5">
                          <Wallet className="w-3.5 h-3.5 text-emerald-600" />
                          <span>1. बचत खाता (Savings A/C)</span>
                        </div>
                        <p className="text-[10px] text-slate-500 mt-0.5">
                          न्यूनतम बैलेंस ₹1,000 • 4% वार्षिक ब्याज
                        </p>
                      </div>
                    </label>

                    {openSavingsWithCust && (
                      <div className="mt-3 pt-2.5 border-t border-emerald-100 space-y-1 animate-fadeIn">
                        <label className="block text-[10px] font-bold text-slate-700">
                          प्रारंभिक जमा राशि (Initial Deposit ₹):
                        </label>
                        <input
                          type="number"
                          value={savingsDeposit}
                          onChange={(e) => onNumericInputChange(e, setSavingsDeposit)}
                          min="500"
                          step="100"
                          className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-300 rounded-lg font-bold text-xs text-slate-900 focus:bg-white focus:ring-1 focus:ring-emerald-500"
                          placeholder="e.g. 5000"
                        />
                        <span className="text-[9px] text-slate-400 block">पासबुक व चेक सुविधा तुरंत सक्रिय</span>
                      </div>
                    )}
                  </div>

                  {/* Option 2: Fixed Deposit (FD) */}
                  <div className={`p-3.5 rounded-xl border-2 transition-all ${
                    openFDWithCust 
                      ? 'bg-white border-indigo-500 shadow-sm ring-1 ring-indigo-400' 
                      : 'bg-white/70 border-slate-200 hover:border-indigo-300'
                  }`}>
                    <label className="flex items-start gap-2.5 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={openFDWithCust}
                        onChange={(e) => {
                          const willOpen = e.target.checked;
                          setOpenFDWithCust(willOpen);
                          if (willOpen && formData.is_senior_citizen) {
                            setFdInterestRate(10.0);
                          } else if (willOpen) {
                            setFdInterestRate(9.5);
                          }
                        }}
                        className="w-4 h-4 accent-indigo-600 rounded mt-0.5 cursor-pointer"
                      />
                      <div className="flex-1 text-xs">
                        <div className="font-black text-slate-900 flex items-center gap-1.5">
                          <Coins className="w-3.5 h-3.5 text-indigo-600" />
                          <span>2. फिक्स्ड डिपॉजिट (FD)</span>
                        </div>
                        <p className="text-[10px] text-slate-500 mt-0.5">
                          FD सर्टिफिकेट व मैच्योरिटी बॉन्ड
                        </p>
                      </div>
                    </label>

                    {openFDWithCust && (
                      <div className="mt-3 pt-2.5 border-t border-indigo-100 space-y-2 animate-fadeIn">
                        <div>
                          <label className="block text-[10px] font-bold text-slate-700 mb-0.5">
                            FD मूलधन राशि (Principal Amount ₹):
                          </label>
                          <input
                            type="number"
                            value={fdPrincipal}
                            onChange={(e) => onNumericInputChange(e, setFdPrincipal)}
                            min="1000"
                            step="1000"
                            className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-300 rounded-lg font-bold text-xs text-slate-900 focus:bg-white focus:ring-1 focus:ring-indigo-500"
                            placeholder="e.g. 50000"
                          />
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <label className="block text-[10px] font-bold text-slate-700 mb-0.5">
                              अवधि (Months):
                            </label>
                            <input
                              type="number"
                              value={fdTenureMonths}
                              onChange={(e) => onNumericInputChange(e, setFdTenureMonths)}
                              min="1"
                              max="120"
                              className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-xs"
                              placeholder="12"
                            />
                          </div>
                          <div>
                            <label className="block text-[10px] font-bold text-slate-700 mb-0.5">
                              ब्याज दर (% Annual):
                            </label>
                            <input
                              type="number"
                              step="0.1"
                              value={fdInterestRate}
                              onChange={(e) => onNumericInputChange(e, setFdInterestRate)}
                              className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-xs font-bold text-indigo-700"
                              placeholder="9.5"
                            />
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="px-4 py-2 font-semibold text-slate-600 hover:bg-slate-100 rounded-xl cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-6 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl shadow-lg shadow-indigo-600/30 transition cursor-pointer disabled:opacity-50"
                >
                  {submitting ? 'Saving...' : 'Register Member'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}


      {/* MODAL 3: BULK WHATSAPP BROADCAST & SPECIAL OFFERS */}
      {showBroadcastModal && (
        <div className="fixed inset-0 z-[200] bg-slate-950/80 backdrop-blur-sm flex justify-center items-start pt-6 sm:pt-8 pb-10 p-3 sm:p-6 overflow-y-auto">
          <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 max-w-4xl w-full p-6 sm:p-8 relative">
            <button
              onClick={() => setShowBroadcastModal(false)}
              className="absolute right-5 top-5 inline-flex items-center gap-1 px-3 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 rounded-xl font-bold text-xs border border-rose-200 transition cursor-pointer"
              title="Close"
            >
              <X className="w-4 h-4 text-rose-600 stroke-[2.5]" />
              <span>Close</span>
            </button>

            <div className="flex items-center gap-3 mb-6">
              <div className="w-12 h-12 rounded-2xl bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold">
                <Megaphone className="w-6 h-6" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-xl font-bold text-slate-900">WhatsApp Broadcast & Special Offers</h2>
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 uppercase tracking-wide">
                    Live Broadcast
                  </span>
                </div>
                <p className="text-xs text-slate-500 mt-0.5">
                  सभी खाताधारकों को एक साथ नई ब्याज दर (FD Rate Hike), त्योहार ऑफर या विशेष स्कीम का संदेश भेजें
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              {/* Left Column: Offer Settings & Live Preview */}
              <div className="lg:col-span-6 space-y-4">
                {/* Target Audience Filter */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">1. दर्शक चुनें (Target Audience):</label>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <button
                      type="button"
                      onClick={() => setTargetAudience('ALL')}
                      className={`p-2.5 rounded-xl border font-bold text-left transition cursor-pointer ${
                        targetAudience === 'ALL'
                          ? 'border-emerald-600 bg-emerald-50 text-emerald-900 shadow-xs'
                          : 'border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100'
                      }`}
                    >
                      <div className="text-[11px] font-bold">👥 सभी ग्राहक (All Members)</div>
                      <div className="text-[10px] text-slate-500 mt-0.5 font-normal">{customers.length} खाताधारक</div>
                    </button>
                    <button
                      type="button"
                      onClick={() => setTargetAudience('SENIOR')}
                      className={`p-2.5 rounded-xl border font-bold text-left transition cursor-pointer ${
                        targetAudience === 'SENIOR'
                          ? 'border-emerald-600 bg-emerald-50 text-emerald-900 shadow-xs'
                          : 'border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100'
                      }`}
                    >
                      <div className="text-[11px] font-bold">🎖️ वरिष्ठ नागरिक (Senior Only)</div>
                      <div className="text-[10px] text-slate-500 mt-0.5 font-normal">
                        {customers.filter(c => c.is_senior_citizen === 1).length} खाताधारक
                      </div>
                    </button>
                  </div>
                </div>

                {/* Offer Parameters */}
                <div className="bg-slate-50 border border-slate-200 rounded-2xl p-3.5 space-y-3">
                  <div className="text-[11px] font-bold uppercase tracking-wider text-slate-500">2. ऑफर विवरण भरें:</div>
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700 mb-1">योजना का नाम (Scheme Name):</label>
                    <input
                      type="text"
                      value={offerTitle}
                      onChange={(e) => setOfferTitle(e.target.value)}
                      className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-semibold text-slate-800"
                    />
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    <div>
                      <label className="block text-[10px] font-semibold text-slate-700 mb-1">ब्याज दर (ROI):</label>
                      <input
                        type="text"
                        value={offerRate}
                        onChange={(e) => setOfferRate(e.target.value)}
                        className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-bold text-emerald-700"
                        placeholder="11.00%"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-semibold text-slate-700 mb-1">अवधि (Tenure):</label>
                      <input
                        type="text"
                        value={offerTenure}
                        onChange={(e) => setOfferTenure(e.target.value)}
                        className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-semibold text-slate-800"
                        placeholder="36 माह"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-semibold text-slate-700 mb-1">न्यूनतम जमा:</label>
                      <input
                        type="text"
                        value={minDeposit}
                        onChange={(e) => setMinDeposit(e.target.value)}
                        className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-semibold text-slate-800"
                        placeholder="₹50,000"
                      />
                    </div>
                  </div>
                </div>

                {/* Live Message Preview */}
                <div>
                  <div className="flex justify-between items-center mb-1">
                    <label className="text-[11px] font-bold text-slate-700 flex items-center gap-1">
                      <MessageSquare className="w-3.5 h-3.5 text-emerald-600" />
                      लाइव संदेश पूर्वावलोकन (WhatsApp Preview):
                    </label>
                    <button
                      type="button"
                      onClick={() => {
                        navigator.clipboard.writeText(getBroadcastMessage());
                        setCopiedBroadcast(true);
                        setTimeout(() => setCopiedBroadcast(false), 2000);
                      }}
                      className="text-[10px] font-bold text-indigo-600 hover:text-indigo-800 flex items-center gap-1 cursor-pointer"
                    >
                      {copiedBroadcast ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                      {copiedBroadcast ? 'Copied!' : 'Copy Text'}
                    </button>
                  </div>
                  <div className="p-3 bg-[#e5ddd5] dark:bg-slate-900 rounded-2xl border border-slate-300 text-xs text-slate-800 dark:text-slate-200 font-sans leading-relaxed whitespace-pre-wrap max-h-48 overflow-y-auto">
                    <div className="bg-white dark:bg-slate-800 p-3 rounded-xl shadow-xs">
                      {getBroadcastMessage(broadcastRecipients[0]?.full_name || 'श्रीमान / श्रीमती')}
                    </div>
                  </div>
                </div>
              </div>

              {/* Right Column: 1-Click Send Queue */}
              <div className="lg:col-span-6 flex flex-col h-full border-t lg:border-t-0 lg:border-l border-slate-200 lg:pl-6 pt-4 lg:pt-0">
                <div className="flex justify-between items-center mb-3">
                  <div>
                    <h3 className="font-bold text-slate-900 text-xs">संदेश भेजने की सूची (Broadcast Queue)</h3>
                    <p className="text-[11px] text-slate-500">
                      {broadcastRecipients.length} खाताधारक लक्षित ({Object.keys(broadcastSentMap).length} भेजे गए)
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      const allTexts = broadcastRecipients.map(c => `[${c.full_name} - ${c.phone}]:\n${getBroadcastMessage(c.full_name)}`).join('\n\n---\n\n');
                      navigator.clipboard.writeText(allTexts);
                      setCopiedBroadcast(true);
                      setTimeout(() => setCopiedBroadcast(false), 2000);
                    }}
                    className="px-2.5 py-1 text-[11px] font-bold bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg border border-slate-200 flex items-center gap-1 cursor-pointer"
                  >
                    <Copy className="w-3 h-3" />
                    Copy All
                  </button>
                </div>

                <div className="flex-1 overflow-y-auto max-h-[380px] divide-y divide-slate-100 border border-slate-200 rounded-2xl bg-slate-50/50 p-2 space-y-1.5">
                  {broadcastRecipients.map((c) => {
                    const isSent = broadcastSentMap[c.id];
                    return (
                      <div key={c.id} className="p-2.5 bg-white rounded-xl border border-slate-200/80 flex items-center justify-between gap-3 hover:bg-slate-50 transition">
                        <div className="min-w-0">
                          <div className="font-bold text-slate-900 text-xs flex items-center gap-1.5">
                            <span>{c.full_name}</span>
                            {c.is_senior_citizen === 1 && (
                              <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-amber-100 text-amber-800">Sr.</span>
                            )}
                          </div>
                          <div className="text-[11px] text-slate-500 font-mono mt-0.5">
                            📞 {c.phone || 'No Phone'} • <span className="text-slate-400">{c.customer_code}</span>
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={() => handleSendSingleOfferWhatsApp(c)}
                          className={`px-3.5 py-1.5 rounded-xl font-bold text-xs flex items-center gap-1.5 shadow-xs transition cursor-pointer shrink-0 ${
                            isSent
                              ? 'bg-slate-100 text-slate-500 border border-slate-200 hover:bg-emerald-50 hover:text-emerald-700'
                              : 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-600/20'
                          }`}
                        >
                          {isSent ? (
                            <>
                              <Check className="w-3.5 h-3.5 text-emerald-600" />
                              <span>Sent ✓</span>
                            </>
                          ) : (
                            <>
                              <Send className="w-3.5 h-3.5" />
                              <span>Send WhatsApp</span>
                            </>
                          )}
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between pt-4 border-t border-slate-100 mt-6">
              <div className="text-xs text-emerald-700 bg-emerald-50 px-3 py-1.5 rounded-xl border border-emerald-200 font-medium flex items-center gap-1.5">
                <span>👉 दाएँ लिस्ट में प्रत्येक सदस्य के आगे हरे <b>"Send WhatsApp"</b> बटन पर क्लिक करें।</span>
              </div>
              <button
                type="button"
                onClick={() => setShowBroadcastModal(false)}
                className="px-5 py-2 font-semibold text-slate-600 hover:bg-slate-100 rounded-xl text-xs cursor-pointer"
              >
                Done / बंद करें
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
