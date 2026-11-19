import React, { useState, useEffect } from 'react';
import { 
  Users, 
  UserCheck, 
  UserX, 
  UserPlus, 
  KeyRound, 
  Smartphone, 
  ShieldCheck, 
  ShieldAlert, 
  Search, 
  Filter, 
  RefreshCw, 
  CheckCircle2, 
  AlertTriangle, 
  X, 
  Copy, 
  Check, 
  MessageSquare, 
  Clock,
  Shield,
  Phone,
  User,
  Lock,
  ArrowRight
} from 'lucide-react';
import { formatINR, formatDate, apiRequest } from '../utils';
import RolePermissionsEditor from './RolePermissionsEditor';

export default function UserManagement({ onOpenCustomerPortfolio }) {
  const [activeTab, setActiveTab] = useState('staff'); // 'staff' | 'customers'
  const [staffList, setStaffList] = useState([]);
  const [customerList, setCustomerList] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [custFilter, setCustFilter] = useState('ALL'); // 'ALL' | 'ACTIVE' | 'PENDING' | 'NOT_CREATED' | 'SUSPENDED'

  // Modals
  const [showAddStaffModal, setShowAddStaffModal] = useState(false);
  const [showCreateCustAppModal, setShowCreateCustAppModal] = useState(false);
  const [showResetPassModal, setShowResetPassModal] = useState(false);
  const [showCredentialsCard, setShowCredentialsCard] = useState(null);

  // Add Staff Form
  const [newStaff, setNewStaff] = useState({ username: '', full_name: '', phone: '', password: '', role: 'employee' });
  const [addingStaff, setAddingStaff] = useState(false);

  // Create Customer App Form
  const [selectedCustId, setSelectedCustId] = useState('');
  const [customLoginId, setCustomLoginId] = useState('');
  const [customTempPass, setCustomTempPass] = useState('');
  const [accessTypeChoice, setAccessTypeChoice] = useState('PERMANENT'); // 'PERMANENT' | 'TEMPORARY'
  const [creatingCustApp, setCreatingCustApp] = useState(false);

  // Reset Password State
  const [resetTarget, setResetTarget] = useState(null); // { type: 'staff'|'customer', id, name, username }
  const [resetNewPass, setResetNewPass] = useState('');
  const [resetting, setResetting] = useState(false);

  // Feedback alerts
  const [alertMessage, setAlertMessage] = useState(null);
  const [copied, setCopied] = useState(false);

  const currentUser = (() => {
    try {
      return JSON.parse(localStorage.getItem('pralaad_fd_user'));
    } catch {
      return null;
    }
  })();
  const isSuperAdmin = currentUser?.role === 'admin';

  const fetchData = async () => {
    try {
      setLoading(true);
      const [usersRes, statsRes] = await Promise.all([
        apiRequest(`/users?search=${encodeURIComponent(search)}`),
        apiRequest('/users/stats')
      ]);

      if (usersRes.success) {
        setStaffList(usersRes.staff || []);
        setCustomerList(usersRes.customers || []);
      }
      if (statsRes.success) {
        setStats(statsRes.stats);
      }
    } catch (err) {
      console.error('Error loading user management data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [search]);

  const showAlert = (text, type = 'success') => {
    setAlertMessage({ text, type });
    setTimeout(() => setAlertMessage(null), 4000);
  };

  // 1. Staff Actions
  const handleToggleStaff = async (staffMember) => {
    if (staffMember.id === currentUser?.id) {
      alert('You cannot deactivate your own Super Admin account.');
      return;
    }
    const actionText = staffMember.is_active === 1 ? 'DEACTIVATE' : 'ACTIVATE';
    if (!confirm(`Are you sure you want to ${actionText} staff account '${staffMember.username}'?`)) return;

    try {
      const res = await apiRequest(`/users/staff/${staffMember.id}/toggle`, { method: 'PATCH' });
      showAlert(res.message);
      fetchData();
    } catch (err) {
      alert(err.message);
    }
  };

  const handleCreateStaff = async (e) => {
    e.preventDefault();
    try {
      setAddingStaff(true);
      const res = await apiRequest('/users/staff', {
        method: 'POST',
        body: JSON.stringify(newStaff)
      });
      showAlert(res.message);
      setShowAddStaffModal(false);
      setNewStaff({ username: '', full_name: '', phone: '', password: '', role: 'employee' });
      fetchData();
    } catch (err) {
      alert(err.message);
    } finally {
      setAddingStaff(false);
    }
  };

  // 2. Customer App Actions
  const handleCreateCustomerApp = async (e) => {
    e.preventDefault();
    if (!selectedCustId) {
      alert('Please select a customer.');
      return;
    }

    try {
      setCreatingCustApp(true);
      const res = await apiRequest('/users/customer', {
        method: 'POST',
        body: JSON.stringify({
          customer_id: selectedCustId,
          login_id: customLoginId,
          temp_password: customTempPass,
          access_type: accessTypeChoice
        })
      });

      setShowCreateCustAppModal(false);
      setSelectedCustId('');
      setCustomLoginId('');
      setCustomTempPass('');
      setAccessTypeChoice('PERMANENT');

      // Show generated credentials card
      setShowCredentialsCard({
        customer: res.customer,
        temp_password: res.temp_password
      });

      showAlert(res.message);
      fetchData();
    } catch (err) {
      alert(err.message);
    } finally {
      setCreatingCustApp(false);
    }
  };

  const handleRenewTemporary = async (cust) => {
    if (!confirm(`Renew 48-Hour Temporary App Access for '${cust.full_name}'? New expiry will be set to 48 hours from now.`)) return;
    try {
      const res = await apiRequest(`/users/customer/${cust.id}/renew-temporary`, { method: 'POST' });
      showAlert(res.message);
      fetchData();
    } catch (err) {
      alert(err.message);
    }
  };

  const handleToggleCustomerApp = async (cust) => {
    const action = cust.app_access_enabled === 1 ? 'SUSPEND' : 'ACTIVATE';
    if (!confirm(`Are you sure you want to ${action} app access for customer '${cust.full_name}'?`)) return;

    try {
      const res = await apiRequest(`/users/customer/${cust.id}/toggle`, { method: 'PATCH' });
      showAlert(res.message);
      fetchData();
    } catch (err) {
      alert(err.message);
    }
  };

  // 3. Reset Password (Staff or Customer)
  const handleExecuteResetPassword = async (e) => {
    e.preventDefault();
    if (!resetTarget) return;

    try {
      setResetting(true);
      if (resetTarget.type === 'staff') {
        const res = await apiRequest(`/users/staff/${resetTarget.id}/reset-password`, {
          method: 'POST',
          body: JSON.stringify({ new_password: resetNewPass })
        });
        showAlert(res.message);
      } else {
        const res = await apiRequest(`/users/customer/${resetTarget.id}/reset-password`, {
          method: 'POST',
          body: JSON.stringify({ new_password: resetNewPass })
        });
        setShowCredentialsCard({
          customer: customerList.find(c => c.id === resetTarget.id) || { full_name: resetTarget.name, customer_code: resetTarget.username, phone: resetTarget.phone, login_id: resetTarget.username },
          temp_password: res.temp_password
        });
        showAlert(res.message);
      }
      setShowResetPassModal(false);
      setResetTarget(null);
      setResetNewPass('');
      fetchData();
    } catch (err) {
      alert(err.message);
    } finally {
      setResetting(false);
    }
  };

  // Filtered customers
  const filteredCustomers = customerList.filter(c => {
    if (custFilter === 'ACTIVE') return c.app_access_enabled === 1 && c.app_access_status === 'ACTIVE';
    if (custFilter === 'PENDING') return c.app_access_status === 'PENDING' || c.app_access_status === 'PENDING FIRST LOGIN';
    if (custFilter === 'TEMPORARY') return c.access_type === 'TEMPORARY';
    if (custFilter === 'EXPIRED') return c.app_access_status === 'EXPIRED' || c.is_expired;
    if (custFilter === 'SUSPENDED') return c.app_access_status === 'SUSPENDED' || (c.app_access_enabled === 0 && c.login_id);
    if (custFilter === 'NOT_CREATED') return !c.app_access_status || c.app_access_status === 'NOT_CREATED';
    return true;
  });

  const handleShareCredentialsWhatsApp = (cust, password) => {
    let cleanPhone = cust.phone ? cust.phone.replace(/[^0-9]/g, '') : '';
    if (cleanPhone.length === 10) cleanPhone = '91' + cleanPhone;

    const msg = `नमस्ते ${cust.full_name} जी! 🙏\n\nआपके Multi-Product Fixed Deposit मोबाइल ऐप क्रेडेंशियल्स:\n\n👤 Login ID: ${cust.login_id || cust.customer_code}\n🔑 Temporary Password: ${password}\n\n📱 ऐप ओपन करें और पहली बार लॉगिन करते ही अपना नया पासवर्ड सेट करें।\n\nलिंक: http://localhost:5000\n\nधन्यवाद,\nWealth & Deposit Management Desk`;
    window.open(`https://wa.me/${cleanPhone}?text=${encodeURIComponent(msg)}`, '_blank');
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-6 w-full">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">User & Access Management</h1>
            <span className="text-[10px] uppercase font-black bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded-full border border-indigo-200">
              Super Admin Only
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Internal Staff team accounts, customer mobile app logins, and role security governance
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setActiveTab(activeTab === 'roles' ? 'staff' : 'roles')}
            className={`px-3.5 py-2 rounded-xl text-xs font-black shadow-md flex items-center gap-1.5 transition cursor-pointer border ${
              activeTab === 'roles'
                ? 'bg-slate-900 text-amber-300 border-slate-950'
                : 'bg-amber-500 hover:bg-amber-600 text-slate-950 border-amber-600'
            }`}
          >
            <ShieldCheck className="w-4 h-4 text-slate-950" />
            {activeTab === 'roles' ? 'Back to Staff Accounts' : 'Roles & Permissions Matrix'}
          </button>

          {activeTab === 'staff' ? (
            <button
              onClick={() => setShowAddStaffModal(true)}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl shadow-md text-xs flex items-center gap-2 transition cursor-pointer"
            >
              <UserPlus className="w-4 h-4" />
              Add Staff Member
            </button>
          ) : activeTab === 'customers' ? (
            <button
              onClick={() => setShowCreateCustAppModal(true)}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl shadow-md text-xs flex items-center gap-2 transition cursor-pointer"
            >
              <Smartphone className="w-4 h-4" />
              Create Customer App Login
            </button>
          ) : null}

          <button
            onClick={fetchData}
            title="Refresh Data"
            className="p-2 bg-white hover:bg-slate-50 text-slate-600 border border-slate-200 rounded-xl transition cursor-pointer shadow-xs"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Alert Banner */}
      {alertMessage && (
        <div className={`p-3 rounded-xl border text-xs font-bold flex items-center gap-2 animate-fadeIn ${
          alertMessage.type === 'success' 
            ? 'bg-emerald-50 border-emerald-200 text-emerald-800' 
            : 'bg-rose-50 border-rose-200 text-rose-800'
        }`}>
          <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
          <span>{alertMessage.text}</span>
        </div>
      )}

      {/* KPI Cards Strip */}
      {stats && (
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
          <div className="p-4 bg-white border border-slate-200 rounded-2xl shadow-xs">
            <span className="text-[11px] font-semibold text-slate-500 block">Total Staff (Makers)</span>
            <div className="text-2xl font-black text-slate-900 mt-1">{stats.totalStaff}</div>
            <span className="text-[10px] text-emerald-600 font-bold mt-0.5 block">{stats.activeStaff} Active</span>
          </div>

          <div className="p-4 bg-white border border-slate-200 rounded-2xl shadow-xs">
            <span className="text-[11px] font-semibold text-slate-500 block">Total Depositors</span>
            <div className="text-2xl font-black text-slate-900 mt-1">{stats.totalCustomers}</div>
            <span className="text-[10px] text-slate-400 mt-0.5 block">Registered Clients</span>
          </div>

          <div className="p-4 bg-white border border-emerald-200 bg-emerald-50/30 rounded-2xl shadow-xs">
            <span className="text-[11px] font-semibold text-emerald-700 block">App Active Clients</span>
            <div className="text-2xl font-black text-emerald-700 mt-1">{stats.appActiveCustomers}</div>
            <span className="text-[10px] text-emerald-600 mt-0.5 block">Can Login to App</span>
          </div>

          <div className="p-4 bg-white border border-amber-200 bg-amber-50/30 rounded-2xl shadow-xs">
            <span className="text-[11px] font-semibold text-amber-700 block">Pending App Requests</span>
            <div className="text-2xl font-black text-amber-700 mt-1">{stats.appPendingCustomers}</div>
            <span className="text-[10px] text-amber-600 mt-0.5 block">Awaiting Checker</span>
          </div>

          <div className="p-4 bg-white border border-rose-200 bg-rose-50/30 rounded-2xl shadow-xs">
            <span className="text-[11px] font-semibold text-rose-700 block">Suspended Logins</span>
            <div className="text-2xl font-black text-rose-700 mt-1">{stats.appSuspendedCustomers}</div>
            <span className="text-[10px] text-rose-600 mt-0.5 block">Access Blocked</span>
          </div>
        </div>
      )}

      {/* Main Tabs Navigation */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center p-4 border-b border-slate-200 gap-3 bg-slate-50/50">
          
          {/* Tab Selector */}
          <div className="flex p-1 bg-slate-200/70 rounded-xl text-xs font-bold">
            <button
              onClick={() => setActiveTab('staff')}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg transition cursor-pointer ${
                activeTab === 'staff'
                  ? 'bg-white text-indigo-700 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Users className="w-4 h-4" />
              Staff Team Accounts ({staffList.length})
            </button>
            
            <button
              onClick={() => setActiveTab('customers')}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg transition cursor-pointer ${
                activeTab === 'customers'
                  ? 'bg-white text-emerald-700 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Smartphone className="w-4 h-4" />
              Customer Mobile App Logins ({customerList.length})
            </button>

            <button
              onClick={() => setActiveTab('roles')}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg transition cursor-pointer font-bold ${
                activeTab === 'roles'
                  ? 'bg-amber-500 text-slate-950 shadow-xs ring-2 ring-amber-400'
                  : 'bg-amber-100/90 text-amber-900 hover:bg-amber-200'
              }`}
            >
              <ShieldCheck className="w-4 h-4 text-amber-700" />
              Roles & Permissions Matrix
              <span className="text-[10px] font-black uppercase px-1.5 py-0.5 rounded bg-amber-600 text-white">Security</span>
            </button>
          </div>

          {/* Search Bar */}
          <div className="relative w-full sm:w-72">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by name, ID, phone..."
              className="w-full pl-9 pr-3 py-2 bg-white border border-slate-300 rounded-xl text-xs focus:ring-2 focus:ring-indigo-600 text-slate-800"
            />
          </div>
        </div>

        {/* ======================================================== */}
        {/* TAB 1: STAFF TEAM ACCOUNTS                               */}
        {/* ======================================================== */}
        {activeTab === 'staff' && (
          <div className="p-4 sm:p-6 space-y-4">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-200 text-slate-400 font-bold uppercase tracking-wider text-[10px]">
                    <th className="pb-3 pl-2">User / Full Name</th>
                    <th className="pb-3">Role</th>
                    <th className="pb-3">Phone</th>
                    <th className="pb-3">Status</th>
                    <th className="pb-3">Last Login</th>
                    <th className="pb-3">Created</th>
                    <th className="pb-3 pr-2 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                  {staffList.map((u) => {
                    const isAdmin = u.role === 'admin';
                    const isActive = u.is_active === 1;
                    return (
                      <tr key={u.id} className="hover:bg-slate-50 transition">
                        <td className="py-3.5 pl-2">
                          <div className="flex items-center gap-2.5">
                            <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold text-xs ${
                              isAdmin ? 'bg-purple-100 text-purple-700' : 'bg-indigo-100 text-indigo-700'
                            }`}>
                              {u.full_name ? u.full_name.slice(0, 2).toUpperCase() : 'ST'}
                            </div>
                            <div>
                              <div className="font-bold text-slate-900">{u.full_name}</div>
                              <div className="text-[11px] text-slate-400 font-mono">@{u.username}</div>
                            </div>
                          </div>
                        </td>

                        <td className="py-3.5">
                          <span className={`px-2 py-0.5 rounded-md font-bold text-[10px] ${
                            isAdmin 
                              ? 'bg-purple-50 text-purple-700 border border-purple-200' 
                              : 'bg-indigo-50 text-indigo-700 border border-indigo-200'
                          }`}>
                            {isAdmin ? 'Super Admin (Checker)' : 'Staff Member (Maker)'}
                          </span>
                        </td>

                        <td className="py-3.5 font-mono text-slate-600">
                          {u.phone || '—'}
                        </td>

                        <td className="py-3.5">
                          <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                            isActive
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                              : 'bg-rose-50 text-rose-700 border border-rose-200'
                          }`}>
                            <span className={`w-1.5 h-1.5 rounded-full ${isActive ? 'bg-emerald-500' : 'bg-rose-500'}`}></span>
                            {isActive ? 'Active' : 'Disabled'}
                          </span>
                        </td>

                        <td className="py-3.5 text-slate-500 text-[11px]">
                          {u.last_login_at ? formatDate(u.last_login_at) : 'Never logged in'}
                        </td>

                        <td className="py-3.5 text-slate-400 text-[11px]">
                          {u.created_at ? u.created_at.split(' ')[0] : '—'}
                        </td>

                        <td className="py-3.5 pr-2 text-right">
                          <div className="inline-flex items-center gap-1.5">
                            <button
                              type="button"
                              onClick={() => {
                                setResetTarget({ type: 'staff', id: u.id, name: u.full_name, username: u.username });
                                setResetNewPass('');
                                setShowResetPassModal(true);
                              }}
                              className="px-2.5 py-1 text-[11px] font-bold text-slate-600 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg border border-slate-200 transition cursor-pointer flex items-center gap-1"
                              title="Reset Password"
                            >
                              <KeyRound className="w-3 h-3" />
                              Reset Pass
                            </button>

                            {u.id !== currentUser?.id && (
                              <button
                                type="button"
                                onClick={() => handleToggleStaff(u)}
                                className={`px-2.5 py-1 text-[11px] font-bold rounded-lg border transition cursor-pointer flex items-center gap-1 ${
                                  isActive
                                    ? 'text-rose-600 border-rose-200 hover:bg-rose-50'
                                    : 'text-emerald-600 border-emerald-200 hover:bg-emerald-50'
                                }`}
                                title={isActive ? 'Disable Staff Account' : 'Enable Staff Account'}
                              >
                                {isActive ? (
                                  <>
                                    <UserX className="w-3 h-3" /> Disable
                                  </>
                                ) : (
                                  <>
                                    <UserCheck className="w-3 h-3" /> Enable
                                  </>
                                )}
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ======================================================== */}
        {/* TAB 2: CUSTOMER MOBILE APP LOGINS                        */}
        {/* ======================================================== */}
        {activeTab === 'customers' && (
          <div className="p-4 sm:p-6 space-y-4">
            
            {/* Filter Pills */}
            <div className="flex items-center gap-1.5 flex-wrap pb-2 text-xs">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mr-1">Filter Status:</span>
              {[
                { id: 'ALL', label: 'All Depositors' },
                { id: 'ACTIVE', label: 'App Active' },
                { id: 'TEMPORARY', label: '⏱️ 48H Temporary' },
                { id: 'EXPIRED', label: '⚠️ Expired' },
                { id: 'PENDING', label: 'Pending Approval' },
                { id: 'NOT_CREATED', label: 'Not Created' },
                { id: 'SUSPENDED', label: 'Suspended' }
              ].map(f => (
                <button
                  key={f.id}
                  onClick={() => setCustFilter(f.id)}
                  className={`px-3 py-1 rounded-lg font-bold transition cursor-pointer ${
                    custFilter === f.id
                      ? 'bg-slate-900 text-white'
                      : 'bg-slate-100 hover:bg-slate-200 text-slate-600'
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-200 text-slate-400 font-bold uppercase tracking-wider text-[10px]">
                    <th className="pb-3 pl-2">Client ID / Name</th>
                    <th className="pb-3">App Login ID</th>
                    <th className="pb-3">Registered Mobile</th>
                    <th className="pb-3">App Status</th>
                    <th className="pb-3">Access Policy & Expiry</th>
                    <th className="pb-3">Last App Login</th>
                    <th className="pb-3">Active FDs</th>
                    <th className="pb-3 pr-2 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                  {filteredCustomers.map((c) => {
                    const hasAccess = c.app_access_enabled === 1;
                    const status = c.app_access_status || (hasAccess ? 'ACTIVE' : 'NOT_CREATED');
                    const isTemp = c.access_type === 'TEMPORARY';
                    return (
                      <tr key={c.id} className="hover:bg-slate-50 transition">
                        <td className="py-3.5 pl-2">
                          <button
                            type="button"
                            onClick={() => onOpenCustomerPortfolio && onOpenCustomerPortfolio(c.id)}
                            className="text-left group cursor-pointer"
                          >
                            <div className="font-bold text-slate-900 group-hover:text-indigo-600 flex items-center gap-1.5">
                              {c.full_name}
                              <ArrowRight className="w-3 h-3 opacity-0 group-hover:opacity-100 transition" />
                            </div>
                            <div className="text-[11px] font-mono text-slate-400">{c.customer_code}</div>
                          </button>
                        </td>

                        <td className="py-3.5">
                          {c.login_id ? (
                            <code className="bg-slate-100 px-2 py-0.5 rounded text-[11px] font-mono font-bold text-slate-800">
                              {c.login_id}
                            </code>
                          ) : (
                            <span className="text-slate-400 italic">Not Assigned</span>
                          )}
                        </td>

                        <td className="py-3.5 font-mono text-slate-600">
                          {c.phone}
                        </td>

                        <td className="py-3.5">
                          <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                            status === 'ACTIVE'
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                              : status === 'PENDING' || status === 'PENDING FIRST LOGIN'
                              ? 'bg-sky-50 text-sky-700 border border-sky-200'
                              : status === 'EXPIRED'
                              ? 'bg-rose-100 text-rose-800 border border-rose-300 font-black'
                              : status === 'SUSPENDED'
                              ? 'bg-rose-50 text-rose-700 border border-rose-200'
                              : 'bg-slate-100 text-slate-600 border border-slate-200'
                          }`}>
                            <span className={`w-1.5 h-1.5 rounded-full ${
                              status === 'ACTIVE' ? 'bg-emerald-500' :
                              status === 'PENDING' || status === 'PENDING FIRST LOGIN' ? 'bg-sky-500' :
                              status === 'EXPIRED' ? 'bg-rose-600' :
                              status === 'SUSPENDED' ? 'bg-rose-500' : 'bg-slate-400'
                            }`}></span>
                            {status === 'ACTIVE' ? 'Active' :
                             status === 'PENDING FIRST LOGIN' ? 'Pending 1st Login' :
                             status === 'PENDING' ? 'Pending Approval' :
                             status === 'EXPIRED' ? 'Access Expired' :
                             status === 'SUSPENDED' ? 'Suspended' : 'Not Created'}
                          </span>
                        </td>

                        <td className="py-3.5">
                          {isTemp ? (
                            <div className="flex flex-col gap-0.5">
                              <span className="inline-flex items-center gap-1 text-[10px] font-black text-amber-800 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-full w-max">
                                <Clock className="w-3 h-3 text-amber-600" />
                                48H TEMPORARY
                              </span>
                              {status === 'PENDING FIRST LOGIN' && (
                                <span className="text-[10px] text-sky-700 font-bold">
                                  48h begins on first login
                                </span>
                              )}
                              {status === 'ACTIVE' && c.expires_at && (
                                <span className="text-[10px] text-emerald-700 font-bold">
                                  {c.remaining_formatted || 'Active'}
                                </span>
                              )}
                              {status === 'EXPIRED' && (
                                <span className="text-[10px] text-rose-700 font-bold">
                                  Expired (Renew below)
                                </span>
                              )}
                            </div>
                          ) : (
                            <div className="flex flex-col gap-0.5">
                              <span className="inline-flex items-center gap-1 text-[10px] font-black text-indigo-700 bg-indigo-50 border border-indigo-200 px-2 py-0.5 rounded-full w-max">
                                <ShieldCheck className="w-3 h-3 text-indigo-600" />
                                PERMANENT
                              </span>
                              <span className="text-[10px] text-slate-400">Continuous access</span>
                            </div>
                          )}
                        </td>

                        <td className="py-3.5 text-slate-500 text-[11px]">
                          {c.last_login_at ? formatDate(c.last_login_at) : 'Never'}
                        </td>

                        <td className="py-3.5 font-bold text-slate-900">
                          {c.total_fds || 0} ({formatINR(c.total_active_investment)})
                        </td>

                        <td className="py-3.5 pr-2 text-right">
                          <div className="inline-flex items-center gap-1.5 flex-wrap justify-end">
                            {status === 'NOT_CREATED' ? (
                              <button
                                type="button"
                                id={`create-login-btn-${c.id}`}
                                onClick={() => {
                                  setSelectedCustId(c.id);
                                  setCustomLoginId(c.customer_code);
                                  setShowCreateCustAppModal(true);
                                }}
                                className="px-2.5 py-1 text-[11px] font-bold bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg transition cursor-pointer shadow-xs flex items-center gap-1"
                              >
                                <Smartphone className="w-3 h-3" />
                                Create Login
                              </button>
                            ) : (
                              <>
                                {isTemp && (
                                  <button
                                    type="button"
                                    id={`renew-temp-btn-${c.id}`}
                                    onClick={() => handleRenewTemporary(c)}
                                    className="px-2 py-1 text-[11px] font-bold text-amber-800 hover:bg-amber-100 bg-amber-50 rounded-lg border border-amber-300 transition cursor-pointer flex items-center gap-1 shadow-xs"
                                    title="Renew for another 48 hours"
                                  >
                                    <RefreshCw className="w-3 h-3 text-amber-600" />
                                    Renew 48h
                                  </button>
                                )}

                                <button
                                  type="button"
                                  onClick={() => {
                                    setResetTarget({ type: 'customer', id: c.id, name: c.full_name, username: c.login_id || c.customer_code, phone: c.phone });
                                    setResetNewPass('');
                                    setShowResetPassModal(true);
                                  }}
                                  className="px-2 py-1 text-[11px] font-bold text-slate-600 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg border border-slate-200 transition cursor-pointer flex items-center gap-1"
                                  title="Reset Password"
                                >
                                  <KeyRound className="w-3 h-3" />
                                  Reset
                                </button>

                                <button
                                  type="button"
                                  onClick={() => handleToggleCustomerApp(c)}
                                  className={`px-2 py-1 text-[11px] font-bold rounded-lg border transition cursor-pointer flex items-center gap-1 ${
                                    status === 'ACTIVE'
                                      ? 'text-rose-600 border-rose-200 hover:bg-rose-50'
                                      : 'text-emerald-600 border-emerald-200 hover:bg-emerald-50'
                                  }`}
                                  title={status === 'ACTIVE' ? 'Suspend App Access' : 'Activate App Access'}
                                >
                                  {status === 'ACTIVE' ? <UserX className="w-3 h-3" /> : <UserCheck className="w-3 h-3" />}
                                  {status === 'ACTIVE' ? 'Suspend' : 'Activate'}
                                </button>
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

          </div>
        )}

        {/* ======================================================== */}
        {/* TAB 3: PERMISSIONS / ROLES (HUBCO MATRIX)                */}
        {/* ======================================================== */}
        {activeTab === 'roles' && (
          <div className="p-4 sm:p-6">
            <RolePermissionsEditor onCancel={() => setActiveTab('staff')} />
          </div>
        )}

      </div>

      {/* ======================================================== */}
      {/* MODAL 1: ADD STAFF MEMBER (SUPER ADMIN)                  */}
      {/* ======================================================== */}
      {showAddStaffModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 animate-fadeIn">
            <div className="flex justify-between items-center mb-4 pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-indigo-100 text-indigo-600 flex items-center justify-center font-bold">
                  <UserPlus className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 text-sm">Create Staff Login Account</h3>
                  <p className="text-[11px] text-slate-500">Office Maker / Operator Account</p>
                </div>
              </div>
              <button onClick={() => setShowAddStaffModal(false)} className="text-slate-400 hover:text-slate-600 p-1 cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateStaff} className="space-y-3.5 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Full Name</label>
                <div className="relative">
                  <User className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    required
                    value={newStaff.full_name}
                    onChange={(e) => setNewStaff({ ...newStaff, full_name: e.target.value })}
                    placeholder="e.g. Rahul Sharma"
                    className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-medium focus:bg-white focus:ring-2 focus:ring-indigo-600"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Username / Login ID</label>
                <input
                  type="text"
                  required
                  value={newStaff.username}
                  onChange={(e) => setNewStaff({ ...newStaff, username: e.target.value.toLowerCase().trim() })}
                  placeholder="e.g. rahul_teller"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-mono text-xs focus:bg-white focus:ring-2 focus:ring-indigo-600"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Mobile Number</label>
                <div className="relative">
                  <Phone className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="tel"
                    value={newStaff.phone}
                    onChange={(e) => setNewStaff({ ...newStaff, phone: e.target.value })}
                    placeholder="e.g. 9876543210"
                    className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-medium focus:bg-white focus:ring-2 focus:ring-indigo-600"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Initial Password</label>
                <div className="relative">
                  <Lock className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="password"
                    required
                    minLength={6}
                    value={newStaff.password}
                    onChange={(e) => setNewStaff({ ...newStaff, password: e.target.value })}
                    placeholder="Minimum 6 characters"
                    className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-medium focus:bg-white focus:ring-2 focus:ring-indigo-600"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Assigned Role</label>
                <select
                  value={newStaff.role}
                  onChange={(e) => setNewStaff({ ...newStaff, role: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-semibold text-slate-800"
                >
                  <option value="employee">Staff Member (Maker / Submitter Only)</option>
                  <option value="admin">Super Admin (System Owner / Checker)</option>
                </select>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowAddStaffModal(false)}
                  className="px-4 py-2 font-semibold text-slate-600 hover:bg-slate-100 rounded-xl cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={addingStaff}
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl shadow-md transition cursor-pointer disabled:opacity-50"
                >
                  {addingStaff ? 'Creating...' : 'Create Account'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* MODAL 2: CREATE CUSTOMER APP LOGIN (SUPER ADMIN)         */}
      {/* ======================================================== */}
      {showCreateCustAppModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 animate-fadeIn">
            <div className="flex justify-between items-center mb-4 pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-600 flex items-center justify-center font-bold">
                  <Smartphone className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 text-sm">Activate Customer Mobile App Login</h3>
                  <p className="text-[11px] text-slate-500">Link Depositor to Mobile Digital Passbook</p>
                </div>
              </div>
              <button onClick={() => setShowCreateCustAppModal(false)} className="text-slate-400 hover:text-slate-600 p-1 cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateCustomerApp} className="space-y-3.5 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1.5">Access Duration Policy</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    id="access-type-permanent-btn"
                    onClick={() => setAccessTypeChoice('PERMANENT')}
                    className={`p-2.5 rounded-xl border text-left flex items-start gap-2 transition cursor-pointer ${
                      accessTypeChoice === 'PERMANENT'
                        ? 'bg-indigo-50 border-indigo-500 text-indigo-900 ring-2 ring-indigo-500/20'
                        : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                    }`}
                  >
                    <ShieldCheck className={`w-4 h-4 mt-0.5 shrink-0 ${accessTypeChoice === 'PERMANENT' ? 'text-indigo-600' : 'text-slate-400'}`} />
                    <div>
                      <div className="font-bold text-xs">Permanent Access</div>
                      <div className="text-[10px] text-slate-500">Continuous standard access</div>
                    </div>
                  </button>

                  <button
                    type="button"
                    id="access-type-temporary-btn"
                    onClick={() => setAccessTypeChoice('TEMPORARY')}
                    className={`p-2.5 rounded-xl border text-left flex items-start gap-2 transition cursor-pointer ${
                      accessTypeChoice === 'TEMPORARY'
                        ? 'bg-amber-50 border-amber-500 text-amber-900 ring-2 ring-amber-500/20'
                        : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                    }`}
                  >
                    <Clock className={`w-4 h-4 mt-0.5 shrink-0 ${accessTypeChoice === 'TEMPORARY' ? 'text-amber-600' : 'text-slate-400'}`} />
                    <div>
                      <div className="font-bold text-xs">Temporary (48 Hours)</div>
                      <div className="text-[10px] text-slate-500">Starts on 1st login, auto-expires</div>
                    </div>
                  </button>
                </div>

                {accessTypeChoice === 'TEMPORARY' && (
                  <div className="mt-2 p-2.5 bg-amber-50 border border-amber-200 rounded-xl text-[10px] text-amber-900 flex items-start gap-2">
                    <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                    <div>
                      <span className="font-bold block">48-Hour Temporary Access Policy:</span>
                      <span>Countdown begins only when customer completes their first successful login. Shows <b>Pending First Login</b> beforehand. After 48 hours, app access automatically expires without altering any deposit records. Super Admin can renew for another 48 hours.</span>
                    </div>
                  </div>
                )}
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Select Depositor / Customer</label>
                <select
                  required
                  value={selectedCustId}
                  onChange={(e) => {
                    setSelectedCustId(e.target.value);
                    const selected = customerList.find(c => c.id === parseInt(e.target.value));
                    if (selected) {
                      setCustomLoginId(selected.customer_code);
                    }
                  }}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-800"
                >
                  <option value="">-- Choose Depositor --</option>
                  {customerList.map(c => (
                    <option key={c.id} value={c.id}>
                      {c.full_name} ({c.customer_code}) - {c.phone} {c.app_access_enabled === 1 ? '[Active]' : ''}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Unique Customer App Login ID</label>
                <input
                  type="text"
                  value={customLoginId}
                  onChange={(e) => setCustomLoginId(e.target.value.trim())}
                  placeholder="Defaults to Member ID (e.g. M00001)"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-mono text-xs focus:bg-white focus:ring-2 focus:ring-emerald-600"
                />
                <p className="text-[10px] text-slate-400 mt-0.5">Depositor can log in with this ID or their registered mobile number.</p>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Temporary Password (Auto-generated if blank)</label>
                <input
                  type="text"
                  value={customTempPass}
                  onChange={(e) => setCustomTempPass(e.target.value)}
                  placeholder="Leave empty to auto-generate secure temp password"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-mono text-xs focus:bg-white focus:ring-2 focus:ring-emerald-600"
                />
                <p className="text-[10px] text-slate-400 mt-0.5">A temporary password requires the depositor to choose their personal password on first login.</p>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowCreateCustAppModal(false)}
                  className="px-4 py-2 font-semibold text-slate-600 hover:bg-slate-100 rounded-xl cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={creatingCustApp}
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl shadow-md transition cursor-pointer disabled:opacity-50"
                >
                  {creatingCustApp ? 'Activating...' : 'Activate & Generate Credentials'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* MODAL 3: CREDENTIALS GENERATED CARD                      */}
      {/* ======================================================== */}
      {showCredentialsCard && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 animate-fadeIn">
            <div className="flex justify-between items-center mb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-600 flex items-center justify-center">
                  <CheckCircle2 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 text-sm">App Login Credentials Ready</h3>
                  <p className="text-[11px] text-slate-500">Share securely with depositor</p>
                </div>
              </div>
              <button onClick={() => setShowCredentialsCard(null)} className="text-slate-400 hover:text-slate-600 p-1 cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-4 bg-slate-900 text-white rounded-xl space-y-3 font-mono text-xs my-4 shadow-inner">
              <div className="flex justify-between border-b border-slate-800 pb-2">
                <span className="text-slate-400 font-sans">Depositor:</span>
                <span className="font-bold font-sans text-white">{showCredentialsCard.customer?.full_name}</span>
              </div>
              <div className="flex justify-between border-b border-slate-800 pb-2">
                <span className="text-slate-400 font-sans">Customer ID:</span>
                <span className="font-bold text-indigo-300">{showCredentialsCard.customer?.customer_code}</span>
              </div>
              <div className="flex justify-between border-b border-slate-800 pb-2">
                <span className="text-slate-400 font-sans">Login ID:</span>
                <span className="font-bold text-emerald-300">{showCredentialsCard.customer?.login_id}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-400 font-sans">Temporary Password:</span>
                <span className="font-bold text-amber-300 text-sm">{showCredentialsCard.temp_password}</span>
              </div>
            </div>

            <p className="text-[11px] text-slate-500 mb-4 leading-relaxed">
              ⚠️ <b>Security Notice:</b> This temporary password will only be displayed once. Depositor must set their own password upon first login.
            </p>

            <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-100 text-xs">
              <button
                type="button"
                onClick={() => {
                  const text = `Depositor: ${showCredentialsCard.customer?.full_name}\nLogin ID: ${showCredentialsCard.customer?.login_id}\nTemp Password: ${showCredentialsCard.temp_password}\nApp URL: http://localhost:5000`;
                  copyToClipboard(text);
                }}
                className="py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold rounded-xl transition cursor-pointer flex items-center justify-center gap-1.5"
              >
                {copied ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
                {copied ? 'Copied!' : 'Copy Credentials'}
              </button>

              <button
                type="button"
                onClick={() => handleShareCredentialsWhatsApp(showCredentialsCard.customer, showCredentialsCard.temp_password)}
                className="py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl transition cursor-pointer flex items-center justify-center gap-1.5 shadow-md"
              >
                <MessageSquare className="w-4 h-4" />
                Send via WhatsApp
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* MODAL 4: RESET PASSWORD                                  */}
      {/* ======================================================== */}
      {showResetPassModal && resetTarget && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-sm w-full p-6 shadow-2xl border border-slate-200 animate-fadeIn">
            <div className="flex justify-between items-center mb-3 pb-2 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-indigo-100 text-indigo-600 flex items-center justify-center font-bold">
                  <KeyRound className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 text-sm">Direct Password Reset</h3>
                  <p className="text-[11px] text-slate-500">Super Admin Override</p>
                </div>
              </div>
              <button onClick={() => setShowResetPassModal(false)} className="text-slate-400 hover:text-slate-600 p-1 cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleExecuteResetPassword} className="space-y-4 text-xs">
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                <div className="font-bold text-slate-900">{resetTarget.name}</div>
                <div className="text-[11px] text-slate-500 font-mono">@{resetTarget.username} ({resetTarget.type.toUpperCase()})</div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  {resetTarget.type === 'customer' ? 'New Temporary Password (Auto if empty)' : 'New Staff Password'}
                </label>
                <input
                  type="text"
                  value={resetNewPass}
                  onChange={(e) => setResetNewPass(e.target.value)}
                  placeholder={resetTarget.type === 'customer' ? 'Leave blank to auto-generate' : 'Minimum 6 characters'}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-mono text-xs focus:bg-white focus:ring-2 focus:ring-indigo-600"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowResetPassModal(false)}
                  className="px-4 py-2 font-semibold text-slate-600 hover:bg-slate-100 rounded-xl cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={resetting}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl shadow-md transition cursor-pointer disabled:opacity-50"
                >
                  {resetting ? 'Resetting...' : 'Save & Issue Password'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}