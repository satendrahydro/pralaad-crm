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
  DollarSign
} from 'lucide-react';
import { formatINR, formatDate, apiRequest } from '../utils';

export default function Customers({ 
  onSelectCustomerForFD, 
  onSelectCustomerForRD,
  onSelectCustomerForMIS,
  onViewPortfolio 
}) {
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedBranch, setSelectedBranch] = useState('ALL');
  const [selectedKYC, setSelectedKYC] = useState('ALL');
  const [viewMode, setViewMode] = useState('table'); // 'table' (Hubco 15-col default) or 'cards'
  
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
    is_senior_citizen: false,
    login_id: '',
    login_password: 'client123',
    app_access_enabled: true
  });
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState('');

  // Edit Modal State
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState(null);
  const [editFormData, setEditFormData] = useState({});
  const [editSubmitting, setEditSubmitting] = useState(false);
  const [editError, setEditError] = useState('');

  // Delete State
  const [actionLoading, setActionLoading] = useState(null);

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

  // Client-side branch and KYC filter
  const filteredCustomers = customers.filter(c => {
    const branchMatch = selectedBranch === 'ALL' || (c.branch || 'MAIN BRANCH') === selectedBranch;
    const kycMatch = selectedKYC === 'ALL' || (c.kyc_status || 'PENDING') === selectedKYC;
    return branchMatch && kycMatch;
  });

  // Share Credentials on WhatsApp
  const handleShareCredentialsOnWhatsApp = (cust) => {
    let cleanPhone = cust.phone ? cust.phone.replace(/[^0-9]/g, '') : '';
    if (cleanPhone.length === 10) cleanPhone = '91' + cleanPhone;

    const accessNote = cust.app_access_enabled === 0 
      ? '⚠️ ध्यान दें: आपका ऐप एक्सेस वर्तमान में अस्थायी रूप से निष्क्रिय है।'
      : '✅ आपका मोबाइल ऐप एक्सेस सक्रिय है।';

    const msg = `नमस्ते ${cust.full_name} जी! 🙏\n\nTaranganjali Realtech (TARPL) मोबाइल ऐप क्रेडेंशियल्स:\n\n👤 Member ID: ${cust.customer_code}\n🔑 Password: ${cust.login_password || 'client123'}\n${accessNote}\n\n📱 ऐप ओपन करें और अपनी सभी FD, RD, MIS और ब्याज पेआउट लाइव देखें।\n\nधन्यवाद,\nTarang Anjali Real Tech Pvt. Ltd.`;

    window.open(`https://wa.me/${cleanPhone}?text=${encodeURIComponent(msg)}`, '_blank');
  };

  // 1-Click Toggle App Access
  const handleToggleAppAccess = async (cust) => {
    try {
      setActionLoading(cust.id);
      await apiRequest(`/customers/${cust.id}/toggle-access`, {
        method: 'PATCH'
      });
      fetchCustomers();
    } catch (err) {
      alert(err.message || 'Failed to toggle app access');
    } finally {
      setActionLoading(null);
    }
  };

  // Delete Customer
  const handleDeleteCustomer = async (cust) => {
    const confirmDelete = window.confirm(
      `⚠️ WARNING: क्या आप सच में ग्राहक "${cust.full_name}" (${cust.customer_code}) को CRM से डिलीट करना चाहते हैं?\n\nडिलीट करने पर इस ग्राहक का मोबाइल ऐप एक्सेस तुरंत बंद हो जाएगा!`
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
      is_senior_citizen: Boolean(cust.is_senior_citizen),
      login_id: cust.login_id || cust.customer_code,
      login_password: cust.login_password || 'client123',
      app_access_enabled: cust.app_access_enabled !== 0
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

      await apiRequest(`/customers/${editingCustomer.id}`, {
        method: 'PUT',
        body: JSON.stringify(editFormData)
      });

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

      if (res.success) {
        setModalOpen(false);
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
          is_senior_citizen: false,
          login_id: '',
          login_password: 'client123',
          app_access_enabled: true
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
            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200">
              Hubco v6.1 Parity Desk
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
              title="Hubco 15-Column Tabular View"
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
              <option value="ALL">All Branches (4)</option>
              <option value="MAIN BRANCH">MAIN BRANCH</option>
              <option value="TARPL SAVING">TARPL SAVING</option>
              <option value="TARPL0002">TARPL0002</option>
              <option value="SHEKHUPURA BRANCH">SHEKHUPURA BRANCH</option>
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

      {/* Main View: Hubco 15-Column Table vs Cards */}
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
        /* Exact Hubco 15-Column Table View */
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
                  <th className="py-3 px-2 text-center">APP STATUS</th>
                  <th className="py-3 px-4 text-center">⚡ QUICK ACTIONS (HUBCORDESK)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredCustomers.map((c) => {
                  const isAppActive = c.app_access_enabled !== 0;
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

                      {/* App Status */}
                      <td className="py-3 px-2 text-center">
                        <button
                          onClick={() => handleToggleAppAccess(c)}
                          className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full cursor-pointer transition ${
                            isAppActive 
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100' 
                              : 'bg-rose-50 text-rose-700 border border-rose-200 hover:bg-rose-100'
                          }`}
                          title={isAppActive ? 'Click to Block App' : 'Click to Enable App'}
                        >
                          {isAppActive ? 'Active' : 'Blocked'}
                        </button>
                      </td>

                      {/* ⚡ Quick Action Desk Buttons */}
                      <td className="py-3 px-4">
                        <div className="flex items-center justify-center gap-1.5 flex-nowrap">
                          {/* [+ FD] */}
                          <button
                            onClick={() => onSelectCustomerForFD && onSelectCustomerForFD(c.id)}
                            className="px-2 py-1 bg-indigo-50 hover:bg-indigo-600 text-indigo-700 hover:text-white rounded text-[11px] font-bold transition cursor-pointer whitespace-nowrap"
                            title="Book New Fixed Deposit"
                          >
                            + FD
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

                          {/* WhatsApp Credentials */}
                          <button
                            onClick={() => handleShareCredentialsOnWhatsApp(c)}
                            className="p-1 hover:bg-emerald-50 text-emerald-600 rounded transition cursor-pointer"
                            title="Send App Login on WhatsApp"
                          >
                            <MessageSquare className="w-3.5 h-3.5" />
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
          {filteredCustomers.map((c) => {
            const isAppActive = c.app_access_enabled !== 0;
            return (
              <div 
                key={c.id} 
                className={`bg-white rounded-2xl border transition flex flex-col justify-between p-5 shadow-sm hover:shadow-md ${
                  isAppActive ? 'border-slate-200' : 'border-rose-300 bg-rose-50/20'
                }`}
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
                        {isAppActive ? (
                          <span className="text-[9px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-1.5 py-0.2 rounded-full flex items-center gap-0.5">
                            <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse"></span>
                            App Active
                          </span>
                        ) : (
                          <span className="text-[9px] font-bold text-rose-700 bg-rose-100 border border-rose-200 px-1.5 py-0.2 rounded-full flex items-center gap-0.5">
                            <span className="w-1.5 h-1.5 bg-rose-500 rounded-full"></span>
                            App Blocked
                          </span>
                        )}
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

                  {/* App Credentials Box */}
                  <div className={`mt-3 p-3 rounded-xl border flex flex-col gap-2 ${
                    isAppActive ? 'bg-indigo-50/70 border-indigo-100' : 'bg-rose-50 border-rose-200'
                  }`}>
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="font-bold text-slate-800 flex items-center gap-1.5">
                        <Key className="w-3.5 h-3.5 text-indigo-600" />
                        Credentials:
                      </span>
                      <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                        isAppActive ? 'text-indigo-700 bg-indigo-100' : 'text-rose-700 bg-rose-200'
                      }`}>
                        ID: {c.login_id || c.customer_code} | PW: {c.login_password || 'client123'}
                      </span>
                    </div>

                    <div className="flex items-center gap-2 pt-1">
                      <button
                        onClick={() => handleToggleAppAccess(c)}
                        disabled={actionLoading === c.id}
                        className={`flex-1 py-1 px-2 rounded-lg text-[10px] font-bold flex items-center justify-center gap-1 transition cursor-pointer ${
                          isAppActive ? 'bg-rose-100 hover:bg-rose-200 text-rose-800' : 'bg-emerald-600 hover:bg-emerald-700 text-white'
                        }`}
                      >
                        {isAppActive ? 'Block App' : 'Enable App'}
                      </button>

                      <button
                        onClick={() => handleShareCredentialsOnWhatsApp(c)}
                        className="py-1 px-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg transition cursor-pointer flex items-center gap-1 text-[10px] font-bold"
                      >
                        <MessageSquare className="w-3 h-3" />
                        WhatsApp
                      </button>
                    </div>
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

      {/* Edit Customer Modal */}
      {editModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 max-w-xl w-full p-6 sm:p-8 relative my-8">
            <button
              onClick={() => setEditModalOpen(false)}
              className="absolute right-5 top-5 p-2 rounded-full hover:bg-slate-100 text-slate-400 hover:text-slate-600 cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3 mb-6">
              <div className="w-12 h-12 rounded-2xl bg-indigo-600 text-white flex items-center justify-center">
                <Edit3 className="w-6 h-6" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-slate-900">Edit Member & App Access</h2>
                <p className="text-xs text-slate-500">
                  Update customer KYC, change branch, or modify mobile app credentials
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
                    <option value="TARPL0002">TARPL0002</option>
                    <option value="SHEKHUPURA BRANCH">SHEKHUPURA BRANCH</option>
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

              {/* Mobile App Credentials */}
              <div className="p-4 bg-indigo-50/60 rounded-2xl border border-indigo-200 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-indigo-900 flex items-center gap-1.5 text-xs">
                    <Smartphone className="w-4 h-4 text-indigo-600" />
                    Mobile App Access Settings
                  </span>

                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={editFormData.app_access_enabled}
                      onChange={(e) => setEditFormData({ ...editFormData, app_access_enabled: e.target.checked })}
                      className="w-4 h-4 accent-indigo-600 rounded cursor-pointer"
                    />
                    <span className="font-bold text-slate-800 text-[11px]">
                      {editFormData.app_access_enabled ? 'App Active (चालू)' : 'App Blocked (बंद)'}
                    </span>
                  </label>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block font-semibold text-slate-700 text-[11px] mb-1">App Login ID</label>
                    <input
                      type="text"
                      value={editFormData.login_id}
                      onChange={(e) => setEditFormData({ ...editFormData, login_id: e.target.value })}
                      className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl font-mono"
                    />
                  </div>
                  <div>
                    <label className="block font-semibold text-slate-700 text-[11px] mb-1">App Password</label>
                    <input
                      type="text"
                      value={editFormData.login_password}
                      onChange={(e) => setEditFormData({ ...editFormData, login_password: e.target.value })}
                      className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl font-mono font-bold text-indigo-900"
                    />
                  </div>
                </div>
              </div>

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
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 max-w-xl w-full p-6 sm:p-8 relative my-8">
            <button
              onClick={() => setModalOpen(false)}
              className="absolute right-5 top-5 p-2 rounded-full hover:bg-slate-100 text-slate-400 hover:text-slate-600 cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3 mb-6">
              <div className="w-12 h-12 rounded-2xl bg-indigo-600 text-white flex items-center justify-center">
                <UserPlus className="w-6 h-6" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-slate-900">Add New Member (सदस्य जोड़ें)</h2>
                <p className="text-xs text-slate-500">Taranganjali Realtech Official Customer Onboarding</p>
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
                    <option value="TARPL0002">TARPL0002</option>
                    <option value="SHEKHUPURA BRANCH">SHEKHUPURA BRANCH</option>
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

              {/* Mobile App Login Credentials Setting */}
              <div className="p-3.5 bg-indigo-50/70 border border-indigo-200 rounded-2xl space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-indigo-950 flex items-center gap-1.5 text-xs">
                    <Smartphone className="w-4 h-4 text-indigo-600" />
                    Mobile App Credentials (लॉगिन आईडी व पासवर्ड)
                  </span>
                  <label className="flex items-center gap-1.5 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.app_access_enabled}
                      onChange={(e) => setFormData({ ...formData, app_access_enabled: e.target.checked })}
                      className="w-4 h-4 accent-indigo-600 rounded"
                    />
                    <span className="font-bold text-slate-700 text-[11px]">Enable App</span>
                  </label>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block font-semibold text-slate-600 text-[10px] mb-0.5">
                      Login ID (खाली छोड़ने पर Auto M-XXXX)
                    </label>
                    <input
                      type="text"
                      value={formData.login_id}
                      onChange={(e) => setFormData({ ...formData, login_id: e.target.value })}
                      placeholder="Auto M-XXXX"
                      className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg font-mono text-xs"
                    />
                  </div>
                  <div>
                    <label className="block font-semibold text-slate-600 text-[10px] mb-0.5">
                      Initial Password
                    </label>
                    <input
                      type="text"
                      value={formData.login_password}
                      onChange={(e) => setFormData({ ...formData, login_password: e.target.value })}
                      placeholder="client123"
                      className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg font-mono text-xs text-indigo-900 font-bold"
                    />
                  </div>
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

    </div>
  );
}
