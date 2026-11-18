import React, { useState } from 'react';
import { 
  ShieldCheck, 
  CheckCircle2, 
  HelpCircle, 
  Save, 
  X, 
  Users, 
  KeyRound, 
  ArrowRight,
  Layers,
  ChevronRight
} from 'lucide-react';
import { apiRequest } from '../utils';

export default function RolePermissionsEditor({ onCancel }) {
  // Top role metadata
  const [selectedRole, setSelectedRole] = useState('accountant');
  const [roleName, setRoleName] = useState('accountant');
  const [rolePosition, setRolePosition] = useState('2');
  const [permissionType, setPermissionType] = useState('both'); // 'admin' | 'agent' | 'both'
  const [isActive, setIsActive] = useState('yes');

  // Main Category Tab (11 categories from Hubco)
  const [activeCategory, setActiveCategory] = useState('MANAGEMENT');

  // Subtab under MANAGEMENT
  const [activeSubtab, setActiveSubtab] = useState('Dashboard');

  // Notifications
  const [feedback, setFeedback] = useState(null);
  const [saving, setSaving] = useState(false);

  // Available roles to switch between
  const rolesList = [
    { id: 'accountant', name: 'accountant', weight: '2', type: 'both' },
    { id: 'branch_manager', name: 'Branch manager', weight: '1', type: 'admin' },
    { id: 'asst_manager', name: 'assistant branch manager', weight: '2', type: 'admin' },
    { id: 'sales_manager', name: 'Sales manager', weight: '5', type: 'both' },
    { id: 'advisor', name: 'ADVISOR', weight: '6', type: 'agent' },
    { id: 'cashier', name: 'Cashier / Teller', weight: '3', type: 'both' }
  ];

  const handleRoleChange = (roleId) => {
    setSelectedRole(roleId);
    const r = rolesList.find(x => x.id === roleId);
    if (r) {
      setRoleName(r.name);
      setRolePosition(r.weight);
      setPermissionType(r.type);
    }
  };

  // Main 11 Hubco Categories
  const mainCategories = [
    'MANAGEMENT',
    'DEPOSITS',
    'LOANS',
    'ACCOUNTING',
    'OPERATIONS',
    'PAYMENTS',
    'BANK GATEWAYS',
    'REPORTS',
    'VERIFICATION AND LEGAL',
    'SYSTEM SETTINGS',
    'CORE UTILITIES'
  ];

  // Subtabs under MANAGEMENT with their exact badges
  const managementSubtabs = [
    { name: 'Dashboard', badge: 0, color: 'bg-sky-500' },
    { name: 'Company', badge: 0, color: 'bg-cyan-500' },
    { name: 'User Management', badge: 0, color: 'bg-rose-400' },
    { name: 'Hr Management', badge: 0, color: 'bg-emerald-500' },
    { name: 'Member Management', badge: 14, color: 'bg-cyan-600' },
    { name: 'Advisors', badge: 0, color: 'bg-sky-500' },
    { name: 'Collection Centers', badge: 0, color: 'bg-amber-500' }
  ];

  // Dashboard Settings Checkboxes (36 exact items from Hubco)
  const dashboardLeft = [
    'Show SMS Balance',
    'Activate SMS Service',
    'Generate Mobile / Bill Payment Wallet',
    'Show Email Token Balance',
    'Show Hypto Wallet Balance',
    'Show Happay Debit Card Balance',
    'Show Zro Card Balance',
    'Show CashYear Card Balance',
    'Show FidyPay Balance',
    'Show IDS Pay Balance',
    'Show ICICI Balance',
    'Show Lender Balance',
    'Show Support Option in Header',
    'Show Gold Rate Calendar on Dashboard',
    'Show Banners on Dashboard',
    'Show Lender EMI Due Alert on Dashboard',
    'Show Background Job Stuck Alert',
    'Show Loan Outstanding Balance on Dashboard'
  ];

  const dashboardRight = [
    'Show SMS Wallet Info',
    'Show Mobile Recharge Balance',
    'Show Verification Suite Balance',
    'Show CashFree Wallet Balance',
    'Show Happay Prepaid Card Balance',
    'Show Happay Debit Card Wallet Info',
    'Show Zro Card Wallet Info',
    'Show CashYear Card Wallet Info',
    'Show BusyBox Balance',
    'Show Yesbank Balance',
    'Show Canara Balance',
    'Show Notification Option in Header',
    'Show Google Play Link on Dashboard',
    'Show Notice Board on Dashboard',
    'Show Search Member on Dashboard',
    'Show Failed E-NACH UPI Transactions Alert',
    'Show FD / MIS & RD / DD Balance on Dashboard',
    'Show Company Bank / Cash Balance on Dashboard'
  ];

  const reportDashboardLeft = [
    'Loan Portfolio Dashboard',
    'Enach Dashboard',
    'Loan Payment to Collect Dashboard',
    'Deposit Collections Dashboard',
    'Notification Dashboard',
    'Associate / Staff Portfolio Dashboard'
  ];

  const reportDashboardRight = [
    'Loan Dashboard',
    'Loan Collections Dashboard',
    'Future Loan Collection Dashboard',
    'Deposit Payment to Collect Dashboard',
    'Show/ Edit Software Control Panel Dashboard'
  ];

  const appointmentItems = [
    'Show Appointments on Dashboard',
    'Show All Appointments on Dashboard'
  ];

  // Checkbox state map
  const [checkedItems, setCheckedItems] = useState({
    'Show FD / MIS & RD / DD Balance on Dashboard': true,
    'Show Company Bank / Cash Balance on Dashboard': true,
    'Show Search Member on Dashboard': true,
    'Show Notification Option in Header': true,
    'Show Support Option in Header': true,
    'Deposit Collections Dashboard': true,
    'Deposit Payment to Collect Dashboard': true
  });

  const toggleCheck = (item) => {
    setCheckedItems(prev => ({
      ...prev,
      [item]: !prev[item]
    }));
  };

  const handleSelectAllGroup = (group) => {
    const allChecked = group.every(item => checkedItems[item]);
    const next = { ...checkedItems };
    group.forEach(item => {
      next[item] = !allChecked;
    });
    setCheckedItems(next);
  };

  const handleSaveRole = async () => {
    setSaving(true);
    setFeedback(null);
    try {
      // simulate API save or save via backend
      setTimeout(() => {
        setSaving(false);
        setFeedback({
          type: 'success',
          msg: `Role '${roleName}' permissions updated successfully! Changes applied immediately.`
        });
        setTimeout(() => setFeedback(null), 4000);
      }, 700);
    } catch (err) {
      setSaving(false);
      setFeedback({ type: 'error', msg: err.message || 'Failed to update role' });
    }
  };

  return (
    <div className="space-y-4">
      {/* Top Breadcrumb & Title */}
      <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-1.5 text-xs text-slate-500">
            <span className="hover:text-amber-600 cursor-pointer font-medium">Roles</span>
            <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
            <span className="font-semibold text-slate-700">{roleName}</span>
            <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
            <span className="text-amber-600 font-bold">Edit</span>
          </div>
          <h1 className="text-lg font-black text-slate-900 tracking-tight mt-1">
            Edit Role/ Permission - {roleName}
          </h1>
        </div>

        {/* Role Quick Switcher */}
        <div className="flex items-center gap-2">
          <label className="text-xs font-bold text-slate-500 uppercase whitespace-nowrap">Switch Role:</label>
          <select 
            value={selectedRole}
            onChange={(e) => handleRoleChange(e.target.value)}
            className="text-xs font-bold py-1.5 px-3 rounded-lg border border-slate-300 bg-white text-slate-800 focus:outline-none focus:border-amber-500"
          >
            {rolesList.map(r => (
              <option key={r.id} value={r.id}>{r.name}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Feedback Banner */}
      {feedback && (
        <div className={`p-3 rounded-xl border text-xs flex items-center gap-2 ${
          feedback.type === 'success' 
            ? 'bg-emerald-50 border-emerald-200 text-emerald-800' 
            : 'bg-rose-50 border-rose-200 text-rose-800'
        }`}>
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span className="font-semibold">{feedback.msg}</span>
        </div>
      )}

      {/* Role Attributes Card */}
      <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-xs">
        <div className="max-w-2xl space-y-4 text-xs">
          {/* Role Name */}
          <div className="grid grid-cols-1 sm:grid-cols-3 items-center gap-2">
            <label className="font-bold text-slate-700">
              Role Name <span className="text-rose-600">*</span>
            </label>
            <div className="sm:col-span-2">
              <input 
                type="text" 
                value={roleName}
                onChange={(e) => setRoleName(e.target.value)}
                className="w-full p-2 border border-slate-300 rounded-lg text-xs font-semibold text-slate-800 focus:outline-none focus:border-amber-500"
              />
            </div>
          </div>

          {/* Role Position / Weight-age */}
          <div className="grid grid-cols-1 sm:grid-cols-3 items-center gap-2">
            <label className="font-bold text-slate-700">
              Role Position/ Weight-age <span className="text-rose-600">*</span>
            </label>
            <div className="sm:col-span-2">
              <input 
                type="number" 
                value={rolePosition}
                onChange={(e) => setRolePosition(e.target.value)}
                className="w-full p-2 border border-slate-300 rounded-lg text-xs font-semibold text-slate-800 focus:outline-none focus:border-amber-500"
              />
            </div>
          </div>

          {/* Permission Type */}
          <div className="grid grid-cols-1 sm:grid-cols-3 items-center gap-2">
            <label className="font-bold text-slate-700">
              Permission Type <span className="text-rose-600">*</span>
            </label>
            <div className="sm:col-span-2 flex items-center gap-4">
              <label className="inline-flex items-center gap-1.5 cursor-pointer">
                <input 
                  type="radio" 
                  name="permType" 
                  value="admin"
                  checked={permissionType === 'admin'}
                  onChange={(e) => setPermissionType(e.target.value)}
                  className="text-amber-600 focus:ring-amber-500"
                />
                <span className="font-medium text-slate-700">Admin Type</span>
              </label>

              <label className="inline-flex items-center gap-1.5 cursor-pointer">
                <input 
                  type="radio" 
                  name="permType" 
                  value="agent"
                  checked={permissionType === 'agent'}
                  onChange={(e) => setPermissionType(e.target.value)}
                  className="text-amber-600 focus:ring-amber-500"
                />
                <span className="font-medium text-slate-700">Agent Type</span>
              </label>

              <label className="inline-flex items-center gap-1.5 cursor-pointer">
                <input 
                  type="radio" 
                  name="permType" 
                  value="both"
                  checked={permissionType === 'both'}
                  onChange={(e) => setPermissionType(e.target.value)}
                  className="text-amber-600 focus:ring-amber-500"
                />
                <span className="font-medium text-slate-700">Both Type</span>
              </label>
            </div>
          </div>

          {/* Active */}
          <div className="grid grid-cols-1 sm:grid-cols-3 items-center gap-2">
            <label className="font-bold text-slate-700">
              Active <span className="text-rose-600">*</span>
            </label>
            <div className="sm:col-span-2 flex items-center gap-4">
              <label className="inline-flex items-center gap-1.5 cursor-pointer">
                <input 
                  type="radio" 
                  name="activeStatus" 
                  value="yes"
                  checked={isActive === 'yes'}
                  onChange={(e) => setIsActive(e.target.value)}
                  className="text-amber-600 focus:ring-amber-500"
                />
                <span className="font-medium text-slate-700">Yes</span>
              </label>

              <label className="inline-flex items-center gap-1.5 cursor-pointer">
                <input 
                  type="radio" 
                  name="activeStatus" 
                  value="no"
                  checked={isActive === 'no'}
                  onChange={(e) => setIsActive(e.target.value)}
                  className="text-amber-600 focus:ring-amber-500"
                />
                <span className="font-medium text-slate-700">No</span>
              </label>
            </div>
          </div>
        </div>
      </div>

      {/* Main 11 Hubco Category Tabs */}
      <div className="bg-white rounded-t-xl border border-b-0 border-slate-200 overflow-x-auto shadow-xs">
        <div className="flex border-b border-slate-200 min-w-max">
          {mainCategories.map(cat => {
            const isCatActive = activeCategory === cat;
            return (
              <button
                key={cat}
                type="button"
                onClick={() => setActiveCategory(cat)}
                className={`px-4 py-3 text-xs font-bold tracking-wider uppercase transition cursor-pointer relative border-r border-slate-100 ${
                  isCatActive 
                    ? 'text-rose-600 bg-white border-t-2 border-t-rose-600' 
                    : 'text-slate-600 bg-slate-50 hover:bg-slate-100 hover:text-slate-900'
                }`}
              >
                {cat}
              </button>
            );
          })}
        </div>
      </div>

      {/* Subtabs Bar (under Category) */}
      {activeCategory === 'MANAGEMENT' && (
        <div className="bg-white p-3 border-x border-b border-slate-200 flex flex-wrap gap-1.5">
          {managementSubtabs.map(sub => {
            const isSubActive = activeSubtab === sub.name;
            return (
              <button
                key={sub.name}
                type="button"
                onClick={() => setActiveSubtab(sub.name)}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-bold transition cursor-pointer ${
                  isSubActive 
                    ? 'bg-sky-500 text-white shadow-xs' 
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                <span>{sub.name}</span>
                <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                  isSubActive ? 'bg-white/30 text-white' : `${sub.color} text-white`
                }`}>
                  {sub.badge}
                </span>
              </button>
            );
          })}
        </div>
      )}

      {/* Category Contents */}
      {activeCategory === 'MANAGEMENT' && activeSubtab === 'Dashboard' && (
        <div className="space-y-4">
          {/* Card 1: Dashboard Settings */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="bg-slate-50 px-4 py-2.5 border-b border-slate-200 flex items-center justify-between">
              <h3 className="text-xs font-bold text-slate-800 tracking-wide">
                Dashboard Settings
              </h3>
              <div className="flex items-center gap-1.5 text-xs text-slate-600">
                <input 
                  type="checkbox" 
                  id="select_all_dash_settings"
                  onChange={() => handleSelectAllGroup([...dashboardLeft, ...dashboardRight])}
                  className="rounded border-slate-300 text-amber-600 focus:ring-amber-500 cursor-pointer"
                />
                <label htmlFor="select_all_dash_settings" className="text-[11px] font-semibold text-slate-500 cursor-pointer">
                  Select All
                </label>
              </div>
            </div>

            <div className="p-4 grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-2 text-xs">
              {/* Left Column (18 items) */}
              <div className="space-y-2">
                {dashboardLeft.map(item => (
                  <label key={item} className="flex items-center gap-2.5 hover:text-slate-950 cursor-pointer py-0.5">
                    <input 
                      type="checkbox"
                      checked={!!checkedItems[item]}
                      onChange={() => toggleCheck(item)}
                      className="rounded border-slate-300 text-amber-600 focus:ring-amber-500"
                    />
                    <span className="text-slate-700 font-medium text-[11px]">{item}</span>
                  </label>
                ))}
              </div>

              {/* Right Column (18 items) */}
              <div className="space-y-2">
                {dashboardRight.map(item => (
                  <label key={item} className="flex items-center gap-2.5 hover:text-slate-950 cursor-pointer py-0.5">
                    <input 
                      type="checkbox"
                      checked={!!checkedItems[item]}
                      onChange={() => toggleCheck(item)}
                      className="rounded border-slate-300 text-amber-600 focus:ring-amber-500"
                    />
                    <span className="text-slate-700 font-medium text-[11px]">{item}</span>
                  </label>
                ))}
              </div>
            </div>
          </div>

          {/* Card 2: Report Dashboard */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="bg-slate-50 px-4 py-2.5 border-b border-slate-200 flex items-center justify-between">
              <h3 className="text-xs font-bold text-slate-800 tracking-wide">
                Report Dashboard
              </h3>
              <div className="flex items-center gap-1.5 text-xs text-slate-600">
                <input 
                  type="checkbox" 
                  id="select_all_reports_dash"
                  onChange={() => handleSelectAllGroup([...reportDashboardLeft, ...reportDashboardRight])}
                  className="rounded border-slate-300 text-amber-600 focus:ring-amber-500 cursor-pointer"
                />
                <label htmlFor="select_all_reports_dash" className="text-[11px] font-semibold text-slate-500 cursor-pointer">
                  Select All
                </label>
              </div>
            </div>

            <div className="p-4 grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-2 text-xs">
              <div className="space-y-2">
                {reportDashboardLeft.map(item => (
                  <label key={item} className="flex items-center justify-between hover:text-slate-950 cursor-pointer py-0.5 pr-2">
                    <div className="flex items-center gap-2.5">
                      <input 
                        type="checkbox"
                        checked={!!checkedItems[item]}
                        onChange={() => toggleCheck(item)}
                        className="rounded border-slate-300 text-amber-600 focus:ring-amber-500"
                      />
                      <span className="text-slate-700 font-medium text-[11px]">{item}</span>
                    </div>
                    <HelpCircle className="w-3.5 h-3.5 text-sky-500" />
                  </label>
                ))}
              </div>

              <div className="space-y-2">
                {reportDashboardRight.map(item => (
                  <label key={item} className="flex items-center justify-between hover:text-slate-950 cursor-pointer py-0.5 pr-2">
                    <div className="flex items-center gap-2.5">
                      <input 
                        type="checkbox"
                        checked={!!checkedItems[item]}
                        onChange={() => toggleCheck(item)}
                        className="rounded border-slate-300 text-amber-600 focus:ring-amber-500"
                      />
                      <span className="text-slate-700 font-medium text-[11px]">{item}</span>
                    </div>
                    <HelpCircle className="w-3.5 h-3.5 text-sky-500" />
                  </label>
                ))}
              </div>
            </div>
          </div>

          {/* Card 3: Appointment Dashboard */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="bg-slate-50 px-4 py-2.5 border-b border-slate-200 flex items-center justify-between">
              <h3 className="text-xs font-bold text-slate-800 tracking-wide">
                Appointment Dashboard
              </h3>
              <div className="flex items-center gap-1.5 text-xs text-slate-600">
                <input 
                  type="checkbox" 
                  id="select_all_appointments"
                  onChange={() => handleSelectAllGroup(appointmentItems)}
                  className="rounded border-slate-300 text-amber-600 focus:ring-amber-500 cursor-pointer"
                />
                <label htmlFor="select_all_appointments" className="text-[11px] font-semibold text-slate-500 cursor-pointer">
                  Select All
                </label>
              </div>
            </div>

            <div className="p-4 grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-2 text-xs">
              {appointmentItems.map(item => (
                <label key={item} className="flex items-center gap-2.5 hover:text-slate-950 cursor-pointer py-0.5">
                  <input 
                    type="checkbox"
                    checked={!!checkedItems[item]}
                    onChange={() => toggleCheck(item)}
                    className="rounded border-slate-300 text-amber-600 focus:ring-amber-500"
                  />
                  <span className="text-slate-700 font-medium text-[11px]">{item}</span>
                </label>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Placeholder content for other categories (Deposits, Loans, Accounting etc.) */}
      {activeCategory !== 'MANAGEMENT' && (
        <div className="bg-white rounded-xl p-8 border border-slate-200 text-center shadow-xs space-y-3">
          <div className="w-12 h-12 bg-amber-50 text-amber-600 rounded-full flex items-center justify-center mx-auto">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <h3 className="text-sm font-bold text-slate-900">{activeCategory} Permissions Matrix</h3>
          <p className="text-xs text-slate-500 max-w-md mx-auto">
            Granular access controls for {activeCategory.toLowerCase()} operations are active under role '{roleName}'.
          </p>
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-emerald-50 text-emerald-800 border border-emerald-200 rounded-full text-xs font-bold">
            <CheckCircle2 className="w-3.5 h-3.5" />
            Full Access Enabled for Role Weight {rolePosition}
          </div>
        </div>
      )}

      {/* Bottom Sticky Action Buttons */}
      <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-sm flex items-center justify-end gap-3">
        <button
          type="button"
          onClick={onCancel}
          className="px-5 py-2 rounded-lg bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs uppercase tracking-wider transition cursor-pointer shadow-xs"
        >
          Cancel
        </button>

        <button
          type="button"
          disabled={saving}
          onClick={handleSaveRole}
          className="px-6 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs uppercase tracking-wider transition cursor-pointer shadow-xs disabled:opacity-50"
        >
          {saving ? 'Updating...' : 'Update Role'}
        </button>
      </div>
    </div>
  );
}
