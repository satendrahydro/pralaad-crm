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
  ArrowRight,
  Pencil
} from 'lucide-react';
import { formatINR, formatDate, apiRequest } from '../utils';
import RolePermissionsEditor from './RolePermissionsEditor';
import EditUserModal from './EditUserModal';

export default function UserManagement({ onOpenCustomerPortfolio }) {
  const [editingStaff, setEditingStaff] = useState(null);
  const [activeTab, setActiveTab] = useState('staff'); // 'staff' | 'roles'
  const [staffList, setStaffList] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  // Modals
  const [showAddStaffModal, setShowAddStaffModal] = useState(false);
  const [showResetPassModal, setShowResetPassModal] = useState(false);

  // Add Staff Form
  const [newStaff, setNewStaff] = useState({ username: '', full_name: '', phone: '', password: '', role: 'employee' });
  const [addingStaff, setAddingStaff] = useState(false);

  // Reset Password State
  const [resetTarget, setResetTarget] = useState(null); // { type: 'staff', id, name, username }
  const [resetNewPass, setResetNewPass] = useState('');
  const [resetting, setResetting] = useState(false);

  // Feedback alerts
  const [alertMessage, setAlertMessage] = useState(null);
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

  // 2. Reset Password (Staff)
  const handleExecuteResetPassword = async (e) => {
    e.preventDefault();
    if (!resetTarget) return;

    try {
      setResetting(true);
      const res = await apiRequest(`/users/staff/${resetTarget.id}/reset-password`, {
        method: 'POST',
        body: JSON.stringify({ new_password: resetNewPass })
      });
      showAlert(res.message);
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
            Internal Staff team accounts and role security governance
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

          {activeTab === 'staff' && (
            <button
              onClick={() => setShowAddStaffModal(true)}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl shadow-md text-xs flex items-center gap-2 transition cursor-pointer"
            >
              <UserPlus className="w-4 h-4" />
              Add Staff Member
            </button>
          )}

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
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-w-xl">
          <div className="p-4 bg-white border border-slate-200 rounded-2xl shadow-xs">
            <span className="text-[11px] font-semibold text-slate-500 block">Total Staff (Makers)</span>
            <div className="text-2xl font-black text-slate-900 mt-1">{stats.totalStaff}</div>
            <span className="text-[10px] text-emerald-600 font-bold mt-0.5 block">{stats.activeStaff} Active</span>
          </div>

          <div className="p-4 bg-white border border-slate-200 rounded-2xl shadow-xs">
            <span className="text-[11px] font-semibold text-slate-500 block">Total Registered Members</span>
            <div className="text-2xl font-black text-slate-900 mt-1">{stats.totalCustomers}</div>
            <span className="text-[10px] text-slate-400 mt-0.5 block">Registered Clients</span>
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
                              onClick={() => setEditingStaff(u)}
                              className="px-2.5 py-1 text-[11px] font-bold text-slate-700 hover:text-purple-700 hover:bg-purple-50 rounded-lg border border-slate-200 transition cursor-pointer flex items-center gap-1"
                              title="Edit Name / Username / Phone"
                            >
                              <Pencil className="w-3 h-3" />
                              Edit
                            </button>

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
        {/* TAB 2: PERMISSIONS / ROLES MATRIX                       */}
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
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-xs flex justify-center items-start pt-16 pb-10 p-4 z-[200] overflow-y-auto">
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
      {/* MODAL 2: RESET STAFF PASSWORD                            */}
      {/* ======================================================== */}
      {showResetPassModal && resetTarget && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-xs flex justify-center items-start pt-16 pb-10 p-4 z-[200] overflow-y-auto">
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
                <label className="block font-semibold text-slate-700 mb-1">New Staff Password</label>
                <input
                  type="text"
                  required
                  minLength={6}
                  value={resetNewPass}
                  onChange={(e) => setResetNewPass(e.target.value)}
                  placeholder="Minimum 6 characters"
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

      <EditUserModal
        isOpen={Boolean(editingStaff)}
        user={editingStaff}
        isSelf={editingStaff?.id === currentUser?.id}
        onClose={() => setEditingStaff(null)}
        onSaved={(res) => {
          showAlert(res.message);
          fetchData();
        }}
      />

    </div>
  );
}