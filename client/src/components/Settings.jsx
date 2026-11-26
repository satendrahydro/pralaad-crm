import React, { useState, useEffect } from 'react';
import { 
  Settings as SettingsIcon, 
  Building2, 
  Save, 
  CheckCircle, 
  Shield, 
  Users, 
  UserPlus, 
  KeyRound, 
  UserCheck, 
  UserX, 
  AlertTriangle,
  X,
  Lock,
  Phone,
  User,
  ShieldAlert,
  Pencil
} from 'lucide-react';
import { apiRequest, onNumericInputChange, sanitizeNumberInput } from '../utils';
import EditUserModal from './EditUserModal';

export default function Settings() {
  const [currentUser, setCurrentUser] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('pralaad_fd_user'));
    } catch {
      return null;
    }
  });
  const [editingUser, setEditingUser] = useState(null);

  const isSuperAdmin = currentUser?.role === 'admin';
  const [activeTab, setActiveTab] = useState('company'); // 'company' | 'staff' | 'slabs'

  // Deposit Rate Slabs State
  const [slabs, setSlabs] = useState([
    { id: 1, tenure: '12 Months', minMonths: 12, generalRate: 8.00, seniorRate: 8.50 },
    { id: 2, tenure: '24 Months', minMonths: 24, generalRate: 8.25, seniorRate: 8.75 },
    { id: 3, tenure: '36 Months', minMonths: 36, generalRate: 8.50, seniorRate: 9.00 },
    { id: 4, tenure: '60 Months', minMonths: 60, generalRate: 8.75, seniorRate: 9.25 }
  ]);
  const [slabSuccess, setSlabSuccess] = useState('');

  const handleUpdateSlab = (id, field, value) => {
    setSlabs(prev => prev.map(s => s.id === id ? { ...s, [field]: sanitizeNumberInput(value) } : s));
  };

  const handleSaveSlabs = (e) => {
    e.preventDefault();
    setSlabSuccess('Interest rate slabs updated successfully in memory for active session.');
    setTimeout(() => setSlabSuccess(''), 4000);
  };

  // Company Settings State
  const [settings, setSettings] = useState({
    company_name: '',
    company_tagline: '',
    phone: '',
    email: '',
    address: '',
    license_no: '',
    senior_bonus_rate: '0.50',
    default_penalty_rate: '1.00',
    terms_conditions: ''
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);

  // Staff Management State
  const [staffUsers, setStaffUsers] = useState([]);
  const [loadingStaff, setLoadingStaff] = useState(false);
  const [staffError, setStaffError] = useState('');
  const [staffSuccess, setStaffSuccess] = useState('');

  // Add Staff Modal
  const [showAddModal, setShowAddModal] = useState(false);
  const [newStaff, setNewStaff] = useState({
    username: '',
    full_name: '',
    phone: '',
    password: '',
    role: 'employee'
  });
  const [addingStaff, setAddingStaff] = useState(false);

  // Reset Password Modal
  const [showResetModal, setShowResetModal] = useState(false);
  const [selectedStaff, setSelectedStaff] = useState(null);
  const [newPassword, setNewPassword] = useState('');
  const [resettingPass, setResettingPass] = useState(false);

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        setLoading(true);
        const res = await apiRequest('/settings');
        setSettings(prev => ({ ...prev, ...(res.settings || {}) }));
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchSettings();
  }, []);

  const fetchStaff = async () => {
    if (!isSuperAdmin) return;
    try {
      setLoadingStaff(true);
      setStaffError('');
      const res = await apiRequest('/users');
      if (res.success) {
        setStaffUsers(res.staff || res.users || []);
      }
    } catch (err) {
      setStaffError(err.message || 'Failed to fetch staff members.');
    } finally {
      setLoadingStaff(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'staff') {
      fetchStaff();
    }
  }, [activeTab]);

  const handleSave = async (e) => {
    e.preventDefault();
    try {
      setSaving(true);
      await apiRequest('/settings', {
        method: 'POST',
        body: JSON.stringify({ settings })
      });
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (err) {
      alert('Error saving settings: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  // Toggle user active status
  const handleToggleUser = async (user) => {
    if (user.id === currentUser?.id) {
      alert('You cannot deactivate your own Super Admin account.');
      return;
    }

    const actionText = user.is_active === 1 ? 'DEACTIVATE' : 'ACTIVATE';
    if (!confirm(`Are you sure you want to ${actionText} staff account '${user.username}'?`)) return;

    try {
      const res = await apiRequest(`/users/${user.id}/toggle`, { method: 'PATCH' });
      setStaffSuccess(res.message);
      fetchStaff();
      setTimeout(() => setStaffSuccess(''), 3000);
    } catch (err) {
      alert('Failed to update user status: ' + err.message);
    }
  };

  // Create new staff
  const handleCreateStaff = async (e) => {
    e.preventDefault();
    if (!newStaff.username || !newStaff.full_name || !newStaff.password) {
      alert('Please fill in all required fields.');
      return;
    }

    try {
      setAddingStaff(true);
      const res = await apiRequest('/users', {
        method: 'POST',
        body: JSON.stringify(newStaff)
      });
      setStaffSuccess(res.message);
      setShowAddModal(false);
      setNewStaff({ username: '', full_name: '', phone: '', password: '', role: 'employee' });
      fetchStaff();
      setTimeout(() => setStaffSuccess(''), 3000);
    } catch (err) {
      alert('Error creating staff member: ' + err.message);
    } finally {
      setAddingStaff(false);
    }
  };

  // Reset password
  const handleResetPassword = async (e) => {
    e.preventDefault();
    if (!newPassword || newPassword.length < 6) {
      alert('Password must be at least 6 characters.');
      return;
    }

    try {
      setResettingPass(true);
      const res = await apiRequest(`/users/${selectedStaff.id}/reset-password`, {
        method: 'POST',
        body: JSON.stringify({ new_password: newPassword })
      });
      setStaffSuccess(res.message);
      setShowResetModal(false);
      setSelectedStaff(null);
      setNewPassword('');
      setTimeout(() => setStaffSuccess(''), 3000);
    } catch (err) {
      alert('Failed to reset password: ' + err.message);
    } finally {
      setResettingPass(false);
    }
  };

  if (loading) {
    return (
      <div className="py-20 text-center">
        <div className="inline-block w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6 w-full">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">System & Staff Settings</h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Branding, financial policies aur Super Admin security controls
          </p>
        </div>

        {/* Tab Switcher */}
        <div className="flex p-1 bg-slate-100 rounded-xl border border-slate-200 text-xs font-bold">
          <button
            onClick={() => setActiveTab('company')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg transition cursor-pointer ${
              activeTab === 'company'
                ? 'bg-white text-indigo-700 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Building2 className="w-4 h-4" />
            Company & Rates
          </button>
          
          <button
            onClick={() => setActiveTab('staff')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg transition cursor-pointer ${
              activeTab === 'staff'
                ? 'bg-white text-indigo-700 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Users className="w-4 h-4" />
            Staff & Team Access
          </button>
          <button
            id="settings-tab-slabs"
            onClick={() => setActiveTab('slabs')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg transition cursor-pointer ${
              activeTab === 'slabs'
                ? 'bg-white text-indigo-700 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Shield className="w-4 h-4" />
            Interest Rate Slabs
          </button>
        </div>
      </div>

      {/* Success banner */}
      {success && (
        <div className="flex items-center gap-2 text-emerald-700 bg-emerald-50 border border-emerald-200 px-4 py-2 rounded-xl text-xs font-bold animate-fade-in">
          <CheckCircle className="w-4 h-4" />
          Settings Saved Successfully!
        </div>
      )}

      {staffSuccess && (
        <div className="flex items-center gap-2 text-emerald-700 bg-emerald-50 border border-emerald-200 px-4 py-2 rounded-xl text-xs font-bold animate-fade-in">
          <CheckCircle className="w-4 h-4" />
          {staffSuccess}
        </div>
      )}

      {/* ======================================================== */}
      {/* TAB 1: COMPANY & CALCULATION SETTINGS                    */}
      {/* ======================================================== */}
      {activeTab === 'company' && (
        <form onSubmit={handleSave} className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 shadow-sm space-y-6">
          
          {/* Company Identity */}
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-indigo-600 mb-4 flex items-center gap-2">
              <Building2 className="w-4 h-4" />
              Company Details (Appears on FD Certificates & Receipts)
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div>
                <label className="block font-semibold text-slate-600 mb-1">Company / Organization Name</label>
                <input
                  type="text"
                  value={settings.company_name}
                  onChange={(e) => setSettings({ ...settings, company_name: e.target.value })}
                  className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-800"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-600 mb-1">Tagline / Subheading</label>
                <input
                  type="text"
                  value={settings.company_tagline}
                  onChange={(e) => setSettings({ ...settings, company_tagline: e.target.value })}
                  className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl font-medium"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-600 mb-1">Official Contact Phone</label>
                <input
                  type="text"
                  value={settings.phone}
                  onChange={(e) => setSettings({ ...settings, phone: e.target.value })}
                  className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl font-medium"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-600 mb-1">Official Email Address</label>
                <input
                  type="email"
                  value={settings.email}
                  onChange={(e) => setSettings({ ...settings, email: e.target.value })}
                  className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl font-medium"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-600 mb-1">Corporate Registration / License No.</label>
                <input
                  type="text"
                  value={settings.license_no}
                  onChange={(e) => setSettings({ ...settings, license_no: e.target.value })}
                  className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl font-medium"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-600 mb-1">Registered Head Office Address</label>
                <input
                  type="text"
                  value={settings.address}
                  onChange={(e) => setSettings({ ...settings, address: e.target.value })}
                  className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl font-medium"
                />
              </div>
            </div>
          </div>

          {/* Calculation Parameters */}
          <div className="pt-4 border-t border-slate-100">
            <h3 className="text-xs font-bold uppercase tracking-wider text-indigo-600 mb-4 flex items-center gap-2">
              <Shield className="w-4 h-4" />
              Default Rate Policies
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div>
                <label className="block font-semibold text-slate-600 mb-1">Senior Citizen Bonus Rate (% extra)</label>
                <input
                  type="number"
                  step="0.05"
                  value={settings.senior_bonus_rate}
                  onChange={(e) => onNumericInputChange(e, (v) => setSettings({ ...settings, senior_bonus_rate: v }))}
                  className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl font-bold"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-600 mb-1">Default Premature Penalty (% deduction)</label>
                <input
                  type="number"
                  step="0.05"
                  value={settings.default_penalty_rate}
                  onChange={(e) => onNumericInputChange(e, (v) => setSettings({ ...settings, default_penalty_rate: v }))}
                  className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl font-bold"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block font-semibold text-slate-600 mb-1">Receipt Terms & Conditions</label>
                <textarea
                  rows="4"
                  value={settings.terms_conditions}
                  onChange={(e) => setSettings({ ...settings, terms_conditions: e.target.value })}
                  className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl font-sans text-xs leading-relaxed"
                ></textarea>
              </div>
            </div>
          </div>

          <div className="pt-4 border-t border-slate-100 flex justify-end">
            <button
              type="submit"
              disabled={saving}
              className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl shadow-lg shadow-indigo-600/30 transition flex items-center gap-2 text-xs cursor-pointer disabled:opacity-50"
            >
              <Save className="w-4 h-4" />
              {saving ? 'Saving...' : 'Save Settings'}
            </button>
          </div>
        </form>
      )}

      {/* ======================================================== */}
      {/* TAB 3: INTEREST RATE SLABS EDITOR                       */}
      {/* ======================================================== */}
      {activeTab === 'slabs' && (
        <form onSubmit={handleSaveSlabs} className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 shadow-sm space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-4">
            <div>
              <h2 className="text-lg font-bold text-slate-900">Term Deposit Interest Rate Slabs</h2>
              <p className="text-xs text-slate-500">Configure standard and senior citizen annual yields per tenure bracket</p>
            </div>
            <button
              type="submit"
              id="save-slabs-btn"
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-xs transition cursor-pointer"
            >
              Save Rate Slabs
            </button>
          </div>

          {slabSuccess && (
            <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-xs font-bold">
              {slabSuccess}
            </div>
          )}

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-600 uppercase font-bold border-b border-slate-100">
                <tr>
                  <th className="py-3 px-4">Tenure Bracket</th>
                  <th className="py-3 px-4">Duration (Months)</th>
                  <th className="py-3 px-4">General Citizen Rate (% p.a.)</th>
                  <th className="py-3 px-4">Senior Citizen Rate (% p.a.)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                {slabs.map((slab) => (
                  <tr key={slab.id} className="hover:bg-slate-50">
                    <td className="py-3 px-4 font-bold text-slate-900">{slab.tenure}</td>
                    <td className="py-3 px-4 text-slate-600 font-mono">{slab.minMonths} Months</td>
                    <td className="py-3 px-4">
                      <input
                        type="number"
                        step="0.05"
                        id={`slab-gen-rate-${slab.id}`}
                        value={slab.generalRate}
                        onChange={(e) => onNumericInputChange(e, (val) => handleUpdateSlab(slab.id, 'generalRate', val))}
                        className="w-28 px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg font-bold text-slate-800 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                      />
                    </td>
                    <td className="py-3 px-4">
                      <input
                        type="number"
                        step="0.05"
                        id={`slab-sr-rate-${slab.id}`}
                        value={slab.seniorRate}
                        onChange={(e) => onNumericInputChange(e, (val) => handleUpdateSlab(slab.id, 'seniorRate', val))}
                        className="w-28 px-2.5 py-1.5 bg-amber-50 border border-amber-200 rounded-lg font-bold text-amber-900 focus:outline-none focus:ring-1 focus:ring-amber-500"
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </form>
      )}

      {/* ======================================================== */}
      {/* TAB 2: STAFF & TEAM ACCESS CONTROL (SUPER ADMIN ONLY)    */}
      {/* ======================================================== */}
      {activeTab === 'staff' && (
        <div className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 shadow-sm space-y-6">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 pb-4 border-b border-slate-100">
            <div>
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Users className="w-5 h-5 text-indigo-600" />
                Staff Members & Role Permissions
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Two-tier architecture: Super Admin (Approver) and Staff (Maker / Entry Submitter)
              </p>
            </div>

            {isSuperAdmin && (
              <button
                type="button"
                onClick={() => setShowAddModal(true)}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl shadow-md text-xs flex items-center gap-2 transition cursor-pointer"
              >
                <UserPlus className="w-4 h-4" />
                Add Staff Member
              </button>
            )}
          </div>

          {!isSuperAdmin ? (
            <div className="p-6 bg-amber-50 border border-amber-200 rounded-2xl flex items-center gap-3 text-amber-800 text-sm">
              <ShieldAlert className="w-6 h-6 shrink-0 text-amber-600" />
              <div>
                <p className="font-bold">Access Restricted to Super Admin</p>
                <p className="text-xs text-amber-700 mt-0.5">
                  Only the Super Admin (System Owner) is authorized to manage internal team members, roles, and security credentials.
                </p>
              </div>
            </div>
          ) : loadingStaff ? (
            <div className="py-12 text-center text-slate-400 text-xs">
              <div className="inline-block w-6 h-6 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin mb-2"></div>
              <div>Loading staff roster...</div>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-200 text-slate-400 font-bold uppercase tracking-wider text-[10px]">
                    <th className="pb-3 pl-2">User / Name</th>
                    <th className="pb-3">Role</th>
                    <th className="pb-3">Phone</th>
                    <th className="pb-3">Status</th>
                    <th className="pb-3">Created</th>
                    <th className="pb-3 pr-2 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                  {staffUsers.map((u) => {
                    const isAdmin = u.role === 'admin';
                    const isActive = u.is_active === 1;
                    return (
                      <tr key={u.id} className="hover:bg-slate-50 transition">
                        <td className="py-3.5 pl-2">
                          <div className="flex items-center gap-2.5">
                            <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold text-xs ${
                              isAdmin ? 'bg-purple-100 text-purple-700' : 'bg-indigo-100 text-indigo-700'
                            }`}>
                              {u.full_name ? u.full_name.slice(0, 2).toUpperCase() : 'U'}
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
                          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            isActive
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                              : 'bg-rose-50 text-rose-700 border border-rose-200'
                          }`}>
                            <span className={`w-1.5 h-1.5 rounded-full ${isActive ? 'bg-emerald-500' : 'bg-rose-500'}`}></span>
                            {isActive ? 'Active' : 'Disabled'}
                          </span>
                        </td>

                        <td className="py-3.5 text-slate-400 text-[11px]">
                          {u.created_at ? u.created_at.split(' ')[0] : '—'}
                        </td>

                        <td className="py-3.5 pr-2 text-right">
                          <div className="inline-flex items-center gap-1.5">
                            <button
                              type="button"
                              onClick={() => setEditingUser(u)}
                              className="px-2.5 py-1 text-[11px] font-bold text-slate-700 hover:text-purple-700 hover:bg-purple-50 rounded-lg border border-slate-200 transition cursor-pointer flex items-center gap-1"
                              title="Edit Name / Username / Phone"
                            >
                              <Pencil className="w-3 h-3" />
                              Edit
                            </button>

                            <button
                              type="button"
                              onClick={() => {
                                setSelectedStaff(u);
                                setNewPassword('');
                                setShowResetModal(true);
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
                                onClick={() => handleToggleUser(u)}
                                className={`px-2.5 py-1 text-[11px] font-bold rounded-lg border transition cursor-pointer flex items-center gap-1 ${
                                  isActive
                                    ? 'text-rose-600 border-rose-200 hover:bg-rose-50'
                                    : 'text-emerald-600 border-emerald-200 hover:bg-emerald-50'
                                }`}
                                title={isActive ? 'Disable Account' : 'Enable Account'}
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
          )}

          {/* Maker-Checker Guidance Card */}
          <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl text-xs text-slate-600 space-y-1.5">
            <div className="font-bold text-slate-800 flex items-center gap-1.5">
              <Shield className="w-4 h-4 text-indigo-600" />
              Dual-Custody Permission Governance:
            </div>
            <ul className="list-disc pl-5 text-[11px] space-y-1 text-slate-500">
              <li><b>Staff Role (Maker):</b> Can create clients, KYC, and submit FD, RD, MIS, and Savings deposit requests. Cannot approve or disburse funds.</li>
              <li><b>Super Admin Role (Checker):</b> Possesses exclusive authority to approve requests, configure rate schemes, manage subscriptions, and oversee audit logs.</li>
              <li><b>Field Collectors (Android APK):</b> Internal staff using the Taranganjali Banking Collector app under branch Maker-Checker authorization.</li>
            </ul>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* MODAL: ADD NEW STAFF MEMBER                              */}
      {/* ======================================================== */}
      {showAddModal && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-xs flex justify-center items-start pt-16 pb-10 p-4 z-[200] overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 animate-fadeIn">
            <div className="flex justify-between items-center mb-4 pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-indigo-100 text-indigo-600 flex items-center justify-center font-bold">
                  <UserPlus className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 text-sm">Create Staff Account</h3>
                  <p className="text-[11px] text-slate-500">New Maker Team Member</p>
                </div>
              </div>
              <button
                onClick={() => setShowAddModal(false)}
                className="text-slate-400 hover:text-slate-600 p-1 cursor-pointer"
              >
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
                  placeholder="e.g. rahul_ops"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-mono text-xs focus:bg-white focus:ring-2 focus:ring-indigo-600"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Mobile Number (For OTP Verification)</label>
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
                <label className="block font-semibold text-slate-700 mb-1">System Role</label>
                <select
                  value={newStaff.role}
                  onChange={(e) => setNewStaff({ ...newStaff, role: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-semibold text-slate-800"
                >
                  <option value="employee">Staff Member (Maker / Submitter Only)</option>
                  <option value="admin">Super Admin (Approver & System Owner)</option>
                </select>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
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
      {/* MODAL: RESET STAFF PASSWORD                              */}
      {/* ======================================================== */}
      {showResetModal && selectedStaff && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-xs flex justify-center items-start pt-16 pb-10 p-4 z-[200] overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-sm w-full p-6 shadow-2xl border border-slate-200 animate-fadeIn">
            <div className="flex justify-between items-center mb-4 pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-indigo-100 text-indigo-600 flex items-center justify-center font-bold">
                  <KeyRound className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 text-sm">Direct Password Reset</h3>
                  <p className="text-[11px] text-slate-500">Super Admin Override</p>
                </div>
              </div>
              <button
                onClick={() => setShowResetModal(false)}
                className="text-slate-400 hover:text-slate-600 p-1 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleResetPassword} className="space-y-4 text-xs">
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                <div className="font-bold text-slate-900">{selectedStaff.full_name}</div>
                <div className="text-[11px] text-slate-500 font-mono">@{selectedStaff.username} ({selectedStaff.role})</div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Set New Password</label>
                <input
                  type="password"
                  required
                  minLength={6}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Minimum 6 characters"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-medium focus:bg-white focus:ring-2 focus:ring-indigo-600"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowResetModal(false)}
                  className="px-4 py-2 font-semibold text-slate-600 hover:bg-slate-100 rounded-xl cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={resettingPass}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl shadow-md transition cursor-pointer disabled:opacity-50"
                >
                  {resettingPass ? 'Resetting...' : 'Save Password'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <EditUserModal
        isOpen={Boolean(editingUser)}
        user={editingUser}
        isSelf={editingUser?.id === currentUser?.id}
        onClose={() => setEditingUser(null)}
        onSaved={(res) => {
          if (res.user && res.user.id === currentUser?.id) {
            setCurrentUser(res.user);
          }
          setStaffSuccess(res.message);
          fetchStaff();
          setTimeout(() => setStaffSuccess(''), 3000);
        }}
      />

    </div>
  );
}