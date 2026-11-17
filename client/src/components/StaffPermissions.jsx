import React, { useState, useEffect } from 'react';
import { 
  ShieldCheck, 
  UserCheck, 
  Users, 
  Lock, 
  Unlock, 
  RotateCcw, 
  Save, 
  CheckCircle2, 
  AlertCircle, 
  FileText, 
  History, 
  Search, 
  FolderLock, 
  Repeat, 
  Coins, 
  Wallet, 
  Printer, 
  Download, 
  Smartphone, 
  BarChart3, 
  UserPlus, 
  Edit3, 
  FileCheck 
} from 'lucide-react';
import { apiRequest } from '../utils';

export default function StaffPermissions() {
  const [staffList, setStaffList] = useState([]);
  const [selectedStaffId, setSelectedStaffId] = useState('');
  const [permissions, setPermissions] = useState({});
  const [originalPermissions, setOriginalPermissions] = useState({});
  const [catalog, setCatalog] = useState({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState(null);
  const [applyToAll, setApplyToAll] = useState(false);
  const [activeSubTab, setActiveSubTab] = useState('matrix'); // 'matrix' | 'audit'
  const [auditLogs, setAuditLogs] = useState([]);
  const [auditLoading, setAuditLoading] = useState(false);
  const [searchFilter, setSearchFilter] = useState('');

  // Fetch staff list and catalog
  useEffect(() => {
    loadStaffPermissions();
  }, []);

  const loadStaffPermissions = async () => {
    try {
      setLoading(true);
      const res = await apiRequest('/permissions/staff');
      if (res.success) {
        setStaffList(res.staff);
        setCatalog(res.catalog || {});
        if (res.staff.length > 0) {
          const firstStaff = res.staff[0];
          setSelectedStaffId(firstStaff.id);
          setPermissions(firstStaff.permissions);
          setOriginalPermissions(firstStaff.permissions);
        }
      }
    } catch (err) {
      setFeedback({ type: 'error', message: err.message || 'Failed to load staff permissions' });
    } finally {
      setLoading(false);
    }
  };

  // Switch selected staff member
  const handleSelectStaff = (id) => {
    setSelectedStaffId(id);
    const found = staffList.find(s => String(s.id) === String(id));
    if (found) {
      setPermissions({ ...found.permissions });
      setOriginalPermissions({ ...found.permissions });
    }
    setFeedback(null);
    setApplyToAll(false);
  };

  // Toggle individual permission
  const handleToggle = (key) => {
    setPermissions(prev => ({
      ...prev,
      [key]: !prev[key]
    }));
  };

  // Toggle all in a category
  const handleCategoryToggle = (categoryKeys, enable) => {
    setPermissions(prev => {
      const updated = { ...prev };
      for (const k of categoryKeys) {
        updated[k] = enable;
      }
      return updated;
    });
  };

  // Save permissions
  const handleSave = async () => {
    try {
      setSaving(true);
      setFeedback(null);

      if (applyToAll) {
        const res = await apiRequest('/permissions/staff/bulk', {
          method: 'POST',
          body: JSON.stringify({
            apply_to_all: true,
            permissions
          })
        });

        if (res.success) {
          setFeedback({ 
            type: 'success', 
            message: `Permissions successfully applied to ALL ${res.staffCount} Staff accounts! (${res.changesCount} change(s) logged)` 
          });
          await loadStaffPermissions();
        }
      } else {
        const res = await apiRequest(`/permissions/staff/${selectedStaffId}`, {
          method: 'PUT',
          body: JSON.stringify({ permissions })
        });

        if (res.success) {
          setFeedback({ 
            type: 'success', 
            message: `Permissions saved instantly for staff member. (${res.changesCount} change(s) recorded in audit log)` 
          });
          setOriginalPermissions({ ...permissions });
          // Update local staff list
          setStaffList(prev => prev.map(s => s.id === Number(selectedStaffId) ? { ...s, permissions, has_custom_permissions: true } : s));
        }
      }
    } catch (err) {
      setFeedback({ type: 'error', message: err.message || 'Failed to save permissions' });
    } finally {
      setSaving(false);
    }
  };

  // Restore defaults
  const handleRestoreDefaults = async () => {
    if (!window.confirm(applyToAll 
      ? 'Are you sure you want to restore default permissions (All 17 Functions ON) for ALL Staff members?' 
      : 'Restore default permissions (All 17 Functions ON) for this Staff member?')) {
      return;
    }

    try {
      setSaving(true);
      setFeedback(null);

      if (applyToAll) {
        const res = await apiRequest('/permissions/staff/restore-all-defaults', { method: 'POST' });
        if (res.success) {
          setFeedback({ type: 'success', message: 'Default permissions restored for ALL staff members.' });
          await loadStaffPermissions();
        }
      } else {
        const res = await apiRequest(`/permissions/staff/${selectedStaffId}/restore-defaults`, { method: 'POST' });
        if (res.success) {
          setFeedback({ type: 'success', message: 'Default permissions restored successfully (All 17 Functions ON).' });
          setPermissions(res.permissions);
          setOriginalPermissions(res.permissions);
          setStaffList(prev => prev.map(s => s.id === Number(selectedStaffId) ? { ...s, permissions: res.permissions, has_custom_permissions: false } : s));
        }
      }
    } catch (err) {
      setFeedback({ type: 'error', message: err.message || 'Failed to restore defaults' });
    } finally {
      setSaving(false);
    }
  };

  // Load audit logs
  const loadAuditLogs = async () => {
    try {
      setAuditLoading(true);
      const res = await apiRequest('/permissions/audit-logs?limit=50');
      if (res.success) {
        setAuditLogs(res.logs);
      }
    } catch (err) {
      console.error('Failed to load audit logs:', err);
    } finally {
      setAuditLoading(false);
    }
  };

  useEffect(() => {
    if (activeSubTab === 'audit') {
      loadAuditLogs();
    }
  }, [activeSubTab]);

  // Group catalog items into categories
  const categories = [
    {
      title: 'CUSTOMER MANAGEMENT',
      color: 'blue',
      icon: Users,
      keys: ['cust_registration', 'cust_edit', 'cust_kyc', 'cust_doc_upload', 'cust_search']
    },
    {
      title: 'FINANCIAL PRODUCTS',
      color: 'emerald',
      icon: FolderLock,
      keys: ['fd_creation', 'rd_creation', 'mis_creation', 'savings_creation', 'savings_deposit', 'savings_withdrawal', 'fd_closure_request']
    },
    {
      title: 'OPERATIONS',
      color: 'purple',
      icon: ShieldCheck,
      keys: ['app_access_request', 'reports_view', 'csv_export', 'receipt_print', 'cert_print']
    }
  ];

  const selectedStaff = staffList.find(s => String(s.id) === String(selectedStaffId));
  const hasUnsavedChanges = JSON.stringify(permissions) !== JSON.stringify(originalPermissions);
  const disabledCount = Object.values(permissions).filter(v => v === false).length;

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-indigo-600"></div>
        <span className="ml-3 text-slate-600 font-medium">Loading staff access permissions...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-[#082e20] rounded-2xl p-6 text-white shadow-xl border border-[#1a5d43] flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <span className="px-2.5 py-0.5 rounded-full text-xs font-bold uppercase tracking-wider bg-amber-500/20 text-[#FBBF24] border border-[#D4AF37]/40">
              Super Admin Control
            </span>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
              Instant Live Enforcement
            </span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-white">Staff Function Permissions</h1>
          <p className="text-emerald-100/90 text-sm mt-1 max-w-2xl">
            Configure granular, function-level access privileges for staff members. Any disabled function is enforced at the backend API with immediate effect (HTTP 403 Forbidden).
          </p>
        </div>

        {/* Sub-tab Navigation */}
        <div className="flex bg-[#062319] p-1 rounded-xl self-start md:self-auto border border-[#134e38]">
          <button
            onClick={() => setActiveSubTab('matrix')}
            className={`px-4 py-2 rounded-lg text-xs font-semibold transition-all flex items-center gap-2 ${
              activeSubTab === 'matrix' 
                ? 'bg-[#D4AF37] text-[#062319] font-bold shadow-sm' 
                : 'text-slate-300 hover:text-white'
            }`}
          >
            <ShieldCheck className="w-4 h-4" />
            Permissions Matrix
          </button>
          <button
            onClick={() => setActiveSubTab('audit')}
            className={`px-4 py-2 rounded-lg text-xs font-semibold transition-all flex items-center gap-2 ${
              activeSubTab === 'audit' 
                ? 'bg-[#D4AF37] text-[#062319] font-bold shadow-md' 
                : 'text-slate-300 hover:text-white'
            }`}
          >
            <History className="w-4 h-4" />
            Audit History
          </button>
        </div>
      </div>

      {feedback && (
        <div className={`p-4 rounded-xl flex items-center gap-3 text-sm font-medium ${
          feedback.type === 'success' 
            ? 'bg-emerald-50 border border-emerald-200 text-emerald-800' 
            : 'bg-rose-50 border border-rose-200 text-rose-800'
        }`}>
          {feedback.type === 'success' ? (
            <CheckCircle2 className="w-5 h-5 text-emerald-600 flex-shrink-0" />
          ) : (
            <AlertCircle className="w-5 h-5 text-rose-600 flex-shrink-0" />
          )}
          <span>{feedback.message}</span>
        </div>
      )}

      {activeSubTab === 'matrix' ? (
        <>
          {/* Staff Selection & Actions Control Bar */}
          <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-sm flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 w-full lg:w-auto">
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wider whitespace-nowrap">
                Select Staff Account:
              </label>
              <select
                value={selectedStaffId}
                onChange={(e) => handleSelectStaff(e.target.value)}
                disabled={applyToAll}
                className="w-full sm:w-72 px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:opacity-50"
              >
                {staffList.map(s => (
                  <option key={s.id} value={s.id}>
                    {s.full_name} (@{s.username}) {s.disabled_count > 0 ? `[${s.disabled_count} Restricted]` : '[Full Access]'}
                  </option>
                ))}
              </select>

              {/* Apply to All Staff Checkbox */}
              <label className="flex items-center gap-2 cursor-pointer ml-1 select-none">
                <input
                  type="checkbox"
                  checked={applyToAll}
                  onChange={(e) => setApplyToAll(e.target.checked)}
                  className="w-4 h-4 text-indigo-600 rounded border-slate-300 focus:ring-indigo-500"
                />
                <span className="text-xs font-bold text-indigo-900 uppercase tracking-wide">
                  Apply to All Staff ({staffList.length})
                </span>
              </label>
            </div>

            {/* Quick Actions */}
            <div className="flex items-center gap-2.5 w-full lg:w-auto justify-end">
              <button
                onClick={handleRestoreDefaults}
                disabled={saving}
                className="px-3.5 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 border border-slate-300 rounded-xl transition-all flex items-center gap-1.5"
                title="Restore default state (All 17 functions ON)"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                Restore Defaults
              </button>

              <button
                onClick={handleSave}
                disabled={saving}
                className={`px-5 py-2 text-xs font-bold rounded-xl text-white transition-all shadow-md flex items-center gap-2 ${
                  hasUnsavedChanges || applyToAll
                    ? 'bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 ring-2 ring-emerald-400/40 animate-pulse'
                    : 'bg-indigo-600 hover:bg-indigo-700'
                }`}
              >
                <Save className="w-4 h-4" />
                {saving ? 'Saving...' : (applyToAll ? 'Apply to All Staff' : 'Save Permissions')}
              </button>
            </div>
          </div>

          {/* Current Staff Overview Status Card */}
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
            <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-sm flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold text-slate-500 uppercase">Target Persona</p>
                <p className="text-sm font-bold text-slate-800 mt-0.5">
                  {applyToAll ? 'All Staff Members' : (selectedStaff?.full_name || 'Staff')}
                </p>
              </div>
              <UserCheck className="w-8 h-8 text-indigo-500/80" />
            </div>

            <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-sm flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold text-slate-500 uppercase">Enabled Functions</p>
                <p className="text-base font-bold text-emerald-600 mt-0.5">
                  {17 - disabledCount} / 17 Active
                </p>
              </div>
              <Unlock className="w-8 h-8 text-emerald-500/80" />
            </div>

            <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-sm flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold text-slate-500 uppercase">Restricted Functions</p>
                <p className={`text-base font-bold mt-0.5 ${disabledCount > 0 ? 'text-rose-600' : 'text-slate-400'}`}>
                  {disabledCount} Disabled
                </p>
              </div>
              <Lock className="w-8 h-8 text-rose-500/80" />
            </div>

            <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-sm flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold text-slate-500 uppercase">Enforcement Mode</p>
                <p className="text-xs font-bold text-indigo-700 mt-0.5">
                  Live API (HTTP 403)
                </p>
              </div>
              <ShieldCheck className="w-8 h-8 text-purple-500/80" />
            </div>
          </div>

          {/* Granular Permission Categories */}
          <div className="space-y-6">
            {categories.map(cat => {
              const CatIcon = cat.icon;
              const allEnabled = cat.keys.every(k => permissions[k] === true);
              const allDisabled = cat.keys.every(k => permissions[k] === false);

              return (
                <div key={cat.title} className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
                  {/* Category Header */}
                  <div className="bg-slate-50/80 px-6 py-4 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-indigo-100/80 text-indigo-700 rounded-lg">
                        <CatIcon className="w-5 h-5" />
                      </div>
                      <div>
                        <h2 className="text-sm font-bold text-slate-800 tracking-wide uppercase">
                          {cat.title}
                        </h2>
                        <p className="text-xs text-slate-500">
                          {cat.keys.filter(k => permissions[k] === true).length} of {cat.keys.length} functions permitted
                        </p>
                      </div>
                    </div>

                    {/* Batch toggles for category */}
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => handleCategoryToggle(cat.keys, true)}
                        className="px-2.5 py-1 text-xs font-medium text-emerald-700 bg-emerald-50 hover:bg-emerald-100 rounded-lg transition"
                      >
                        Enable All
                      </button>
                      <button
                        type="button"
                        onClick={() => handleCategoryToggle(cat.keys, false)}
                        className="px-2.5 py-1 text-xs font-medium text-rose-700 bg-rose-50 hover:bg-rose-100 rounded-lg transition"
                      >
                        Disable All
                      </button>
                    </div>
                  </div>

                  {/* Switch Controls Grid */}
                  <div className="p-6 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                    {cat.keys.map(key => {
                      const item = catalog[key] || { label: key, description: '' };
                      const isEnabled = permissions[key] !== false;

                      return (
                        <div
                          key={key}
                          onClick={() => handleToggle(key)}
                          className={`p-4 rounded-xl border transition-all cursor-pointer flex items-start justify-between gap-3 select-none ${
                            isEnabled
                              ? 'bg-emerald-50/20 border-emerald-200 hover:border-emerald-300'
                              : 'bg-rose-50/20 border-rose-200 hover:border-rose-300'
                          }`}
                        >
                          <div className="flex-1 pr-2">
                            <div className="flex items-center gap-2">
                              <span className={`inline-block w-2 h-2 rounded-full ${isEnabled ? 'bg-emerald-500' : 'bg-rose-500'}`}></span>
                              <h3 className="text-sm font-bold text-slate-800">
                                {item.label}
                              </h3>
                            </div>
                            <p className="text-xs text-slate-500 mt-1 line-clamp-2">
                              {item.description}
                            </p>
                            <span className={`inline-block mt-2 px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                              isEnabled 
                                ? 'bg-emerald-100 text-emerald-800' 
                                : 'bg-rose-100 text-rose-800'
                            }`}>
                              {isEnabled ? 'PERMITTED (ON)' : 'RESTRICTED (OFF)'}
                            </span>
                          </div>

                          {/* Toggle Switch */}
                          <div className="pt-1">
                            <button
                              type="button"
                              role="switch"
                              aria-checked={isEnabled}
                              className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                                isEnabled ? 'bg-emerald-600' : 'bg-slate-300'
                              }`}
                            >
                              <span
                                aria-hidden="true"
                                className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                                  isEnabled ? 'translate-x-5' : 'translate-x-0'
                                }`}
                              />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </>
      ) : (
        /* Audit History View */
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm p-6 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-bold text-slate-800">Permission Change Audit Log</h2>
              <p className="text-xs text-slate-500">Immutable record of every permission adjustment made by Super Admin.</p>
            </div>
            <button
              onClick={loadAuditLogs}
              disabled={auditLoading}
              className="px-3 py-1.5 text-xs font-semibold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 rounded-lg transition"
            >
              {auditLoading ? 'Refreshing...' : 'Refresh Logs'}
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-600 uppercase font-bold border-b border-slate-200">
                <tr>
                  <th className="py-3 px-4">Timestamp</th>
                  <th className="py-3 px-4">Super Admin</th>
                  <th className="py-3 px-4">Staff Member</th>
                  <th className="py-3 px-4">Permission Function</th>
                  <th className="py-3 px-4">Action</th>
                  <th className="py-3 px-4">State Transition</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {auditLogs.length === 0 ? (
                  <tr>
                    <td colSpan="6" className="py-8 text-center text-slate-400">
                      No permission changes recorded yet.
                    </td>
                  </tr>
                ) : (
                  auditLogs.map(log => (
                    <tr key={log.id} className="hover:bg-slate-50/60">
                      <td className="py-3 px-4 font-mono text-slate-500">
                        {new Date(log.created_at).toLocaleString()}
                      </td>
                      <td className="py-3 px-4 font-semibold text-slate-800">
                        {log.admin_username} (ID: {log.admin_id})
                      </td>
                      <td className="py-3 px-4 font-semibold text-indigo-700">
                        {log.staff_username} (ID: {log.staff_id})
                      </td>
                      <td className="py-3 px-4 font-medium text-slate-700">
                        {log.permission_label}
                      </td>
                      <td className="py-3 px-4">
                        <span className="px-2 py-0.5 bg-slate-100 text-slate-700 rounded text-[10px] font-bold">
                          {log.action_type}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          log.old_value === 1 ? 'text-emerald-700 bg-emerald-50' : 'text-rose-700 bg-rose-50'
                        }`}>
                          {log.old_value === 1 ? 'ON' : 'OFF'}
                        </span>
                        <span className="mx-1 text-slate-400">→</span>
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          log.new_value === 1 ? 'text-emerald-700 bg-emerald-50' : 'text-rose-700 bg-rose-50'
                        }`}>
                          {log.new_value === 1 ? 'ON' : 'OFF'}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
