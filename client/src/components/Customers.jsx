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
  Smartphone
} from 'lucide-react';
import { formatINR, formatDate, apiRequest } from '../utils';

export default function Customers({ onSelectCustomerForFD }) {
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  
  // Add Modal State
  const [modalOpen, setModalOpen] = useState(false);
  const [formData, setFormData] = useState({
    full_name: '',
    phone: '',
    email: '',
    pan_card: '',
    aadhaar_no: '',
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

  // Share Credentials on WhatsApp
  const handleShareCredentialsOnWhatsApp = (cust) => {
    let cleanPhone = cust.phone ? cust.phone.replace(/[^0-9]/g, '') : '';
    if (cleanPhone.length === 10) cleanPhone = '91' + cleanPhone;

    const accessNote = cust.app_access_enabled === 0 
      ? '⚠️ ध्यान दें: आपका ऐप एक्सेस वर्तमान में अस्थायी रूप से निष्क्रिय है।'
      : '✅ आपका मोबाइल ऐप एक्सेस सक्रिय है।';

    const msg = `नमस्ते ${cust.full_name} जी! 🙏\n\nआपके Pralaad Wealth Fixed Deposit मोबाइल ऐप क्रेडेंशियल्स:\n\n👤 Login ID: ${cust.login_id || cust.customer_code}\n🔑 Password: ${cust.login_password || 'client123'}\n${accessNote}\n\n📱 ऐप ओपन करें और अपनी सभी FDs और ब्याज पेआउट लाइव देखें।\n\nधन्यवाद,\nPralaad Wealth & Financial Services`;

    window.open(`https://wa.me/${cleanPhone}?text=${encodeURIComponent(msg)}`, '_blank');
  };

  // 1-Click Toggle App Access
  const handleToggleAppAccess = async (cust) => {
    try {
      setActionLoading(cust.id);
      const res = await apiRequest(`/customers/${cust.id}/toggle-access`, {
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
      `⚠️ WARNING: क्या आप सच में ग्राहक "${cust.full_name}" (${cust.customer_code}) को CRM से डिलीट करना चाहते हैं?\n\nडिलीट करने पर इस ग्राहक का मोबाइल ऐप एक्सेस तुरंत बंद हो जाएगा और ऐप से लॉगआउट हो जाएगा!`
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
      phone: cust.phone || '',
      email: cust.email || '',
      pan_card: cust.pan_card || '',
      aadhaar_no: cust.aadhaar_no || '',
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
      setEditError(err.message || 'Error updating customer');
    } finally {
      setEditSubmitting(false);
    }
  };

  // Handle Add Submit
  const handleAddSubmit = async (e) => {
    e.preventDefault();
    if (!formData.full_name || !formData.phone) {
      setFormError('Name and phone are required');
      return;
    }

    try {
      setSubmitting(true);
      setFormError('');
      await apiRequest('/customers', {
        method: 'POST',
        body: JSON.stringify(formData)
      });
      setModalOpen(false);
      setFormData({
        full_name: '',
        phone: '',
        email: '',
        pan_card: '',
        aadhaar_no: '',
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
    } catch (err) {
      setFormError(err.message || 'Error saving customer');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Client Management (ग्राहक एवं मोबाइल ऐप एक्सेस)</h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Manage KYC, bank accounts, portfolio, and mobile app login IDs & passwords directly from CRM
          </p>
        </div>

        <button
          onClick={() => setModalOpen(true)}
          className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-xl text-xs flex items-center gap-2 shadow-lg shadow-indigo-600/20 transition cursor-pointer"
        >
          <UserPlus className="w-4 h-4" />
          Add New Client
        </button>
      </div>

      {/* Search & Overview Stats */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="relative w-full max-w-md">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by client name, mobile, PAN, customer code..."
            className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:ring-2 focus:ring-indigo-500 focus:bg-white"
          />
        </div>

        <div className="flex items-center gap-2 text-xs font-semibold">
          <span className="px-3 py-1 bg-indigo-50 text-indigo-700 rounded-lg">
            Total: {customers.length} Clients
          </span>
          <span className="px-3 py-1 bg-emerald-50 text-emerald-700 rounded-lg flex items-center gap-1">
            <Smartphone className="w-3.5 h-3.5" />
            App Enabled: {customers.filter(c => c.app_access_enabled !== 0).length}
          </span>
        </div>
      </div>

      {/* Customer Cards Grid */}
      {loading ? (
        <div className="py-20 text-center">
          <div className="inline-block w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
        </div>
      ) : customers.length === 0 ? (
        <div className="bg-white p-12 text-center rounded-2xl border border-slate-200 text-slate-400">
          <Users className="w-12 h-12 mx-auto stroke-1 mb-2 opacity-50" />
          <p className="font-semibold text-slate-700">No clients found</p>
          <p className="text-xs mt-1">Click "Add New Client" to register your first depositor</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {customers.map((c) => {
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
                    </div>

                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => handleOpenEdit(c)}
                        title="Edit Customer Details & Change Password"
                        className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-500 hover:text-indigo-600 cursor-pointer"
                      >
                        <Edit3 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDeleteCustomer(c)}
                        title="Delete Client from CRM & Block App"
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
                    {c.email && (
                      <p className="flex items-center gap-2">
                        <Mail className="w-3.5 h-3.5 text-slate-400" />
                        <span className="truncate">{c.email}</span>
                      </p>
                    )}
                    <p className="flex items-center gap-2">
                      <CreditCard className="w-3.5 h-3.5 text-slate-400" />
                      <span>PAN: <strong className="font-mono text-slate-700">{c.pan_card || 'Not Added'}</strong></span>
                    </p>
                    <p className="text-[11px] text-slate-500">
                      Bank: {c.bank_name || 'N/A'} {c.account_no ? `(..${c.account_no.slice(-4)})` : ''}
                    </p>
                  </div>

                  {/* Mobile App Login Credentials & Control Box */}
                  <div className={`mt-3 p-3 rounded-xl border flex flex-col gap-2 ${
                    isAppActive ? 'bg-indigo-50/70 border-indigo-100' : 'bg-rose-50 border-rose-200'
                  }`}>
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="font-bold text-slate-800 flex items-center gap-1.5">
                        <Key className="w-3.5 h-3.5 text-indigo-600" />
                        App Credentials:
                      </span>
                      <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                        isAppActive ? 'text-indigo-700 bg-indigo-100' : 'text-rose-700 bg-rose-200'
                      }`}>
                        {isAppActive ? 'Access ON' : 'Access OFF'}
                      </span>
                    </div>

                    <div className="font-mono text-[11px] bg-white/80 p-2 rounded-lg border border-slate-200/60 flex justify-between items-center">
                      <div>
                        <span className="text-slate-500 text-[10px] block">Login ID:</span>
                        <strong className="text-slate-900">{c.login_id || c.customer_code}</strong>
                      </div>
                      <div className="text-right">
                        <span className="text-slate-500 text-[10px] block">Password:</span>
                        <strong className="text-indigo-900">{c.login_password || 'client123'}</strong>
                      </div>
                    </div>

                    {/* Quick Access Control Buttons */}
                    <div className="flex items-center gap-2 pt-1">
                      <button
                        onClick={() => handleToggleAppAccess(c)}
                        disabled={actionLoading === c.id}
                        className={`flex-1 py-1.5 px-2 rounded-lg text-[10px] font-bold flex items-center justify-center gap-1 transition cursor-pointer ${
                          isAppActive
                            ? 'bg-rose-100 hover:bg-rose-200 text-rose-800'
                            : 'bg-emerald-600 hover:bg-emerald-700 text-white'
                        }`}
                      >
                        {isAppActive ? (
                          <>
                            <Lock className="w-3 h-3" />
                            Block App
                          </>
                        ) : (
                          <>
                            <Unlock className="w-3 h-3" />
                            Enable App
                          </>
                        )}
                      </button>

                      <button
                        onClick={() => handleShareCredentialsOnWhatsApp(c)}
                        title="Send Login ID & Password on WhatsApp"
                        className="py-1.5 px-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg transition cursor-pointer flex items-center gap-1 text-[10px] font-bold"
                      >
                        <MessageSquare className="w-3 h-3" />
                        WhatsApp
                      </button>
                    </div>
                  </div>
                </div>

                <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
                  <div>
                    <span className="text-[10px] text-slate-400 block uppercase font-bold">Total Active</span>
                    <span className="font-black text-emerald-700 text-sm">
                      {formatINR(c.total_active_investment)}
                    </span>
                  </div>

                  <button
                    onClick={() => onSelectCustomerForFD(c.id)}
                    className="px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-bold rounded-xl text-xs transition cursor-pointer"
                  >
                    + Book FD
                  </button>
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
                <h2 className="text-xl font-bold text-slate-900">Edit Client & App Access</h2>
                <p className="text-xs text-slate-500">
                  Update customer KYC, change app password, or suspend mobile login
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
              </div>

              {/* Dedicated Mobile App Security & Credentials Section */}
              <div className="p-4 bg-indigo-50/60 rounded-2xl border border-indigo-200 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-indigo-900 flex items-center gap-1.5 text-xs">
                    <Smartphone className="w-4 h-4 text-indigo-600" />
                    Mobile App Access & Security Settings
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
                    <label className="block font-semibold text-slate-700 text-[11px] mb-1">
                      App Login ID / Username
                    </label>
                    <input
                      type="text"
                      value={editFormData.login_id}
                      onChange={(e) => setEditFormData({ ...editFormData, login_id: e.target.value })}
                      placeholder="e.g. CUST-1001"
                      className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl font-mono font-bold text-slate-900"
                    />
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-700 text-[11px] mb-1">
                      App Password (नया पासवर्ड)
                    </label>
                    <input
                      type="text"
                      value={editFormData.login_password}
                      onChange={(e) => setEditFormData({ ...editFormData, login_password: e.target.value })}
                      placeholder="Enter new password"
                      className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl font-mono font-bold text-indigo-900"
                    />
                  </div>
                </div>
                <p className="text-[10px] text-slate-500">
                  💡 CRM mein yahan password change ya App Block karte hi mobile phone par turant live sync ho jata hai.
                </p>
              </div>

              {/* Bank Details */}
              <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200 space-y-2">
                <span className="font-bold text-slate-700 block">Bank Account for Payouts / Redemption:</span>
                <div className="grid grid-cols-3 gap-2">
                  <input
                    type="text"
                    placeholder="Bank Name"
                    value={editFormData.bank_name}
                    onChange={(e) => setEditFormData({ ...editFormData, bank_name: e.target.value })}
                    className="px-2.5 py-1.5 bg-white border border-slate-200 rounded-xl text-xs"
                  />
                  <input
                    type="text"
                    placeholder="Account Number"
                    value={editFormData.account_no}
                    onChange={(e) => setEditFormData({ ...editFormData, account_no: e.target.value })}
                    className="px-2.5 py-1.5 bg-white border border-slate-200 rounded-xl text-xs font-mono"
                  />
                  <input
                    type="text"
                    placeholder="IFSC Code"
                    value={editFormData.ifsc_code}
                    onChange={(e) => setEditFormData({ ...editFormData, ifsc_code: e.target.value.toUpperCase() })}
                    className="px-2.5 py-1.5 bg-white border border-slate-200 rounded-xl text-xs uppercase font-mono"
                  />
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
                <h2 className="text-xl font-bold text-slate-900">Add New Client (ग्राहक जोड़ें)</h2>
                <p className="text-xs text-slate-500">Enter personal information and assign mobile app credentials</p>
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
                      Login ID (खाली छोड़ने पर Auto-Code)
                    </label>
                    <input
                      type="text"
                      value={formData.login_id}
                      onChange={(e) => setFormData({ ...formData, login_id: e.target.value })}
                      placeholder="Auto CUST-XXXX"
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
                  {submitting ? 'Saving...' : 'Register Client'}
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

    </div>
  );
}
