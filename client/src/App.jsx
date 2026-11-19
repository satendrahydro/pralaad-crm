import React, { useState, useEffect, useRef } from 'react';
import { 
  TrendingUp, 
  LayoutDashboard, 
  Calculator, 
  FolderLock, 
  Users, 
  Award,
  Building,
  BadgePercent,
  CalendarDays, 
  CreditCard, 
  Settings as SettingsIcon, 
  LogOut, 
  PlusCircle, 
  Plus,
  ShieldCheck, 
  Bell, 
  Menu, 
  X, 
  Sparkles, 
  ExternalLink,
  Download,
  MessageSquare,
  Smartphone,
  ChevronDown,
  Building2,
  CheckCircle2,
  Clock,
  UserCheck,
  Search,
  RefreshCw,
  HelpCircle,
  Play,
  Layers,
  ChevronLeft,
  ChevronRight,
  Filter,
  Check,
  Receipt,
  BarChart3,
  Globe,
  Sliders,
  FileText,
  Repeat,
  Coins,
  Wallet,
  BookOpen,
  ArrowUpRight,
  ArrowDownLeft,
  Send,
  Gem,
  HandCoins,
  Home,
  Briefcase
} from 'lucide-react';

import Login from './components/Login';
import Dashboard from './components/Dashboard';
import CalculatorComponent from './components/Calculator';
import FDList from './components/FDList';
import Customers from './components/Customers';
import Payouts from './components/Payouts';
import Subscription from './components/Subscription';
import Settings from './components/Settings';
import WhatsAppReminders from './components/WhatsAppReminders';
import CustomerApp from './components/CustomerApp';
import UserManagement from './components/UserManagement';
import StaffPermissions from './components/StaffPermissions';
import TarplLogo from './components/TarplLogo';

// Stage 3 New Dedicated Modules
import FDSchemes from './components/FDSchemes';
import TransactionsLedger from './components/TransactionsLedger';
import MaturityCalendar from './components/MaturityCalendar';
import Reports from './components/Reports';
import BranchManagement from './components/BranchManagement';
import EmployeeDashboard from './components/EmployeeDashboard';
import ApprovalsQueue from './components/ApprovalsQueue';
import FDCreatioDetailView from './components/FDCreatioDetailView';

// Stage 4 Multi-Product Modules (RD, MIS, Savings, 360 Portfolio)
import RDList from './components/RDList';
import MISList from './components/MISList';
import SavingsList from './components/SavingsList';
import AgentRanks from './components/AgentRanks';
import AgentsList from './components/AgentsList';
import CollectionCenters from './components/CollectionCenters';
import LoansAgainstDeposit from './components/LoansAgainstDeposit';
import GoldLoanList from './components/GoldLoanList';
import BorrowingsRegister from './components/BorrowingsRegister';
import UnifiedCustomerProfileModal from './components/UnifiedCustomerProfileModal';
import NewRDModal from './components/NewRDModal';
import NewMISModal from './components/NewMISModal';
import NewSavingsModal from './components/NewSavingsModal';
import DayBook from './components/DayBook';
import NewJournalEntryModal from './components/NewJournalEntryModal';
import DailyCollection from './components/DailyCollection';
import ScheduleSmsModal from './components/ScheduleSmsModal';
import PaymentsToCollect from './components/PaymentsToCollect';
import PaymentsToRelease from './components/PaymentsToRelease';
import RolePermissionsEditor from './components/RolePermissionsEditor';

import NewFDModal from './components/NewFDModal';
import FDDetailModal from './components/FDDetailModal';
import Certificate from './components/Certificate';
import PrematureCloseModal from './components/PrematureCloseModal';
import RenewModal from './components/RenewModal';
import CommercialLockScreen from './components/CommercialLockScreen';

import { apiRequest, getApiBase } from './utils';

export default function App() {
  const [token, setToken] = useState(localStorage.getItem('pralaad_fd_token'));
  const [user, setUser] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('pralaad_fd_user'));
    } catch {
      return null;
    }
  });

  const [isCommercialLocked, setIsCommercialLocked] = useState(false);
  const [commercialLockReason, setCommercialLockReason] = useState('');

  const checkLicenseStatus = async () => {
    try {
      const res = await fetch(`${getApiBase()}/license/status`);
      const data = await res.json();
      if (data && data.locked) {
        setIsCommercialLocked(true);
        setCommercialLockReason(data.reason || 'Commercial settlement pending');
      } else {
        setIsCommercialLocked(false);
      }
    } catch (e) {}
  };

  useEffect(() => {
    checkLicenseStatus();
    const handleTrigger = (e) => {
      setIsCommercialLocked(true);
      if (e.detail && e.detail.message) {
        setCommercialLockReason(e.detail.message);
      }
    };
    window.addEventListener('commercial_lock_triggered', handleTrigger);
    return () => window.removeEventListener('commercial_lock_triggered', handleTrigger);
  }, []);

  const [activeTab, setActiveTab] = useState('dashboard');
  const [viewMode, setViewMode] = useState('staff'); // 'staff' | 'customer'
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Creatio Multi-Tab Window Dock State
  const [openTabs, setOpenTabs] = useState([
    { id: 'dashboard', label: 'Home Page', icon: LayoutDashboard, color: 'bg-fuchsia-600', closable: false }
  ]);

  // Top Bar Dropdowns & Filters
  const [branchDropdownOpen, setBranchDropdownOpen] = useState(false);
  const [selectedBranch, setSelectedBranch] = useState('All Branches');
  const [branchesList, setBranchesList] = useState([
    'All Branches',
    'MAIN BRANCH (BHR001 - Bijnor)',
    'TARPL SAVING (BRH003 - Bijnor)',
    'SHEKHUPURA BRANCH (Bijnor)',
    'TARPL0002 (BHR002 - Bijnor)'
  ]);

  useEffect(() => {
    fetch('/api/branches')
      .then(res => res.json())
      .then(data => {
        if (data && data.success && Array.isArray(data.branches) && data.branches.length > 0) {
          const list = ['All Branches', ...data.branches.map(b => `${b.branch_name} (${b.branch_code} - ${b.city})`)];
          setBranchesList(list);
        }
      })
      .catch(() => {});
  }, []);
  
  const [fyDropdownOpen, setFyDropdownOpen] = useState(false);
  const [selectedFY, setSelectedFY] = useState('FY 2026-27');
  const [language, setLanguage] = useState('EN'); // 'EN' | 'HI'

  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [profileDropdownOpen, setProfileDropdownOpen] = useState(false);
  const [globalSearch, setGlobalSearch] = useState('');
  const [searchFocused, setSearchFocused] = useState(false);

  const branchRef = useRef(null);
  const fyRef = useRef(null);
  const notifRef = useRef(null);
  const profileRef = useRef(null);

  // Modal States
  const [newFDModalOpen, setNewFDModalOpen] = useState(false);
  const [newFDInitialData, setNewFDInitialData] = useState(null);

  const [selectedFDId, setSelectedFDId] = useState(null);
  const [detailModalOpen, setDetailModalOpen] = useState(false);

  const [certFDId, setCertFDId] = useState(null);
  const [certModalOpen, setCertModalOpen] = useState(false);

  const [prematureFD, setPrematureFD] = useState(null);
  const [prematureModalOpen, setPrematureModalOpen] = useState(false);

  const [renewFD, setRenewFD] = useState(null);
  const [renewModalOpen, setRenewModalOpen] = useState(false);

  // Multi-Product Modals
  const [newRDModalOpen, setNewRDModalOpen] = useState(false);
  const [newMISModalOpen, setNewMISModalOpen] = useState(false);
  const [newSavingsModalOpen, setNewSavingsModalOpen] = useState(false);
  const [customerPortfolioModalOpen, setCustomerPortfolioModalOpen] = useState(false);
  const [portfolioCustomerId, setPortfolioCustomerId] = useState(null);

  // Hubco v6.1 Parity Accounting & SMS Modals / Dropdowns
  const [journalEntryModalOpen, setJournalEntryModalOpen] = useState(false);
  const [scheduleSmsModalOpen, setScheduleSmsModalOpen] = useState(false);
  const [accountsDropdownOpen, setAccountsDropdownOpen] = useState(false);
  const accountsRef = useRef(null);

  // Dropdown close on outside click
  useEffect(() => {
    function handleClickOutside(event) {
      if (branchRef.current && !branchRef.current.contains(event.target)) {
        setBranchDropdownOpen(false);
      }
      if (fyRef.current && !fyRef.current.contains(event.target)) {
        setFyDropdownOpen(false);
      }
      if (notifRef.current && !notifRef.current.contains(event.target)) {
        setNotificationsOpen(false);
      }
      if (profileRef.current && !profileRef.current.contains(event.target)) {
        setProfileDropdownOpen(false);
      }
      if (accountsRef.current && !accountsRef.current.contains(event.target)) {
        setAccountsDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleLoginSuccess = (userData, subData) => {
    setUser(userData);
    setToken(localStorage.getItem('pralaad_fd_token'));
    setActiveTab('dashboard');
    refreshPermissions();
  };

  const [staffPermissions, setStaffPermissions] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('pralaad_staff_permissions')) || {};
    } catch {
      return {};
    }
  });

  const refreshPermissions = async () => {
    const curToken = localStorage.getItem('pralaad_fd_token');
    if (!curToken) return;
    try {
      const res = await apiRequest('/permissions/my-permissions');
      if (res.success && res.permissions) {
        setStaffPermissions(res.permissions);
        localStorage.setItem('pralaad_staff_permissions', JSON.stringify(res.permissions));
      }
    } catch (e) {
      // ignore
    }
  };

  useEffect(() => {
    if (token) {
      refreshPermissions();
    }
  }, [token, activeTab]);

  useEffect(() => {
    const handleAuthExpired = () => {
      setToken(null);
      setUser(null);
      setStaffPermissions({});
    };
    window.addEventListener('pralaad_auth_expired', handleAuthExpired);
    return () => window.removeEventListener('pralaad_auth_expired', handleAuthExpired);
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('pralaad_fd_token');
    localStorage.removeItem('pralaad_fd_user');
    localStorage.removeItem('pralaad_staff_permissions');
    setToken(null);
    setUser(null);
    setStaffPermissions({});
  };

  // Quick navigation helpers
  const handleBookFromCalc = (calcData) => {
    setNewFDInitialData(calcData);
    setNewFDModalOpen(true);
  };

  // Switch or open a Creatio Tab
  const handleSwitchTab = (tabId, label, icon, color) => {
    if (!openTabs.some(t => t.id === tabId)) {
      setOpenTabs(prev => [...prev, {
        id: tabId,
        label: label,
        icon: icon || FolderLock,
        color: color || 'bg-indigo-600',
        closable: tabId !== 'dashboard'
      }]);
    }
    setActiveTab(tabId);
    setMobileMenuOpen(false);
  };

  // Open FD in Creatio Master-Detail View
  const handleViewFD = (id) => {
    setSelectedFDId(id);
    const tabId = `fd-${id}`;
    if (!openTabs.some(t => t.id === tabId)) {
      setOpenTabs(prev => [...prev, {
        id: tabId,
        label: `FD #${id}`,
        icon: FolderLock,
        color: 'bg-emerald-600',
        closable: true,
        entityId: id
      }]);
    }
    setActiveTab(tabId);
  };

  const handleCloseTab = (e, tabId) => {
    e.stopPropagation();
    const remaining = openTabs.filter(t => t.id !== tabId);
    setOpenTabs(remaining);
    if (activeTab === tabId) {
      const fallback = remaining[remaining.length - 1];
      setActiveTab(fallback ? fallback.id : 'dashboard');
    }
  };

  const handlePrintCertificate = (id) => {
    setCertFDId(id);
    setCertModalOpen(true);
  };

  const handlePrematureClose = (fd) => {
    setPrematureFD(fd);
    setPrematureModalOpen(true);
  };

  const handleRenewFD = (fd) => {
    setRenewFD(fd);
    setRenewModalOpen(true);
  };

  if (isCommercialLocked) {
    return (
      <CommercialLockScreen 
        reason={commercialLockReason} 
        onUnlocked={() => {
          setIsCommercialLocked(false);
          window.location.reload();
        }} 
      />
    );
  }

  if (viewMode === 'customer') {
    return (
      <>
        <CustomerApp 
          onSwitchToStaffCRM={() => setViewMode('staff')}
          onPrintCertificate={handlePrintCertificate}
        />
        <Certificate
          fdId={certFDId}
          isOpen={certModalOpen}
          onClose={() => setCertModalOpen(false)}
        />
      </>
    );
  }

  if (!token) {
    return (
      <div className="relative">
        <div className="absolute top-4 right-4 z-50">
          <button
            onClick={() => setViewMode('customer')}
            className="flex items-center gap-1.5 px-4 py-2 rounded-full bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs shadow-lg transition cursor-pointer"
          >
            <Smartphone className="w-4 h-4" />
            Switch to Client Mobile App
          </button>
        </div>
        <Login onLoginSuccess={handleLoginSuccess} />
      </div>
    );
  }

  const isEmployee = user?.role === 'employee';

  // Multi-Product Navigation Modules Mapped to Premium FinTech Color Architecture
  const navSections = isEmployee ? [
    {
      title: 'MAKER OPERATIONS',
      items: [
        { id: 'dashboard', label: 'Maker Dashboard', icon: LayoutDashboard, color: 'bg-indigo-600' },
        { id: 'customers', label: 'Customers & KYC', icon: Users, color: 'bg-teal-600' },
        { id: 'schemes', label: 'Deposit Schemes', icon: Sparkles, color: 'bg-amber-600' }
      ]
    },
    {
      title: 'MULTI-PRODUCT DESK',
      items: [
        { id: 'fds', label: 'Fixed Deposits (FD)', icon: FolderLock, color: 'bg-indigo-600' },
        { id: 'rds', label: 'Recurring Deposits (RD)', icon: Repeat, color: 'bg-cyan-600' },
        { id: 'mis', label: 'Monthly Income (MIS)', icon: Coins, color: 'bg-teal-600' },
        { id: 'savings', label: 'Savings Accounts (SB)', icon: Wallet, color: 'bg-emerald-600' }
      ]
    },
    {
      title: 'CALCULATION & SCHEDULES',
      items: [
        { id: 'calculator', label: 'Deposit Calculator', icon: Calculator, color: 'bg-indigo-500' },
        { id: 'maturity', label: 'Maturity Calendar', icon: CalendarDays, color: 'bg-sky-600' }
      ]
    },
    {
      title: 'AGENTS & ADVISORS',
      items: [
        { id: 'agent_ranks', label: 'Associate/ Advisor Ranks', icon: Award, color: 'bg-amber-600' },
        { id: 'agents_list', label: 'Associates / Advisors', icon: Users, color: 'bg-teal-600' }
      ]
    }
  ] : [
    {
      title: 'CORE DEPOSIT PRODUCTS',
      items: [
        { id: 'dashboard', label: 'Executive Dashboard', icon: LayoutDashboard, color: 'bg-indigo-600' },
        { id: 'approvals', label: 'Approvals Queue', icon: ShieldCheck, color: 'bg-amber-600', badge: 'Checker' },
        { id: 'fds', label: 'Fixed Deposits (FD)', icon: FolderLock, color: 'bg-indigo-600' },
        { id: 'rds', label: 'Recurring Deposits (RD)', icon: Repeat, color: 'bg-cyan-600' },
        { id: 'mis', label: 'Monthly Income (MIS)', icon: Coins, color: 'bg-teal-600' },
        { id: 'savings', label: 'Savings Accounts (SB)', icon: Wallet, color: 'bg-emerald-600' },
        { id: 'customers', label: 'Customers & KYC 360', icon: Users, color: 'bg-teal-600' },
        { id: 'schemes', label: 'Deposit Schemes', icon: Sparkles, color: 'bg-amber-600' }
      ]
    },
    {
      title: 'LOANS & ADVANCES (ऋण विभाग)',
      items: [
        { id: 'gold_loan', label: 'Gold Loan (गोल्ड लोन)', icon: Gem, color: 'bg-amber-600', badge: 'Gold' },
        { id: 'loans', label: 'Loan Against Deposit (LAD)', icon: BadgePercent, color: 'bg-indigo-600', badge: 'Secured' },
        { id: 'borrowings_udhar', label: 'Udhar Register (उधार खाता)', icon: HandCoins, color: 'bg-purple-600', badge: 'Udhar' },
        { id: 'mortgage_loan', label: 'Prop. / Mortgage Loan', icon: Home, color: 'bg-blue-600' },
        { id: 'business_loan', label: 'Business Loan (व्यापार ऋण)', icon: Briefcase, color: 'bg-emerald-600' }
      ]
    },
    {
      title: 'USER & ACCESS MANAGEMENT',
      items: [
        { id: 'roles_permissions', label: 'Permissions / Roles', icon: ShieldCheck, color: 'bg-emerald-600', badge: 'Matrix' },
        { id: 'users', label: 'Staff & Mobile Users', icon: UserCheck, color: 'bg-indigo-600', badge: 'Admin' },
        { id: 'staff_permissions', label: 'Staff Guard Matrix', icon: ShieldCheck, color: 'bg-cyan-600', badge: 'Security' }
      ]
    },
    {
      title: 'ACCOUNTING & FIELD OPS',
      items: [
        { id: 'day_book', label: 'Day Book (9 Ledgers)', icon: BookOpen, color: 'bg-amber-600', badge: 'Live' },
        { id: 'daily_collection', label: 'Daily Collection', icon: Coins, color: 'bg-emerald-600', badge: 'NEW' },
        { id: 'payments_to_collect', label: 'Payments to Collect', icon: CreditCard, color: 'bg-orange-600', badge: 'EMI/Dues' },
        { id: 'payments_to_release', label: 'Payments to Release', icon: ArrowUpRight, color: 'bg-rose-600', badge: 'Payouts' }
      ]
    },
    {
      title: 'FINANCIAL OPERATIONS',
      items: [
        { id: 'payouts', label: 'Interest & Payouts', icon: CreditCard, color: 'bg-orange-600', badge: 'Due' },
        { id: 'maturity', label: 'Maturity Calendar', icon: CalendarDays, color: 'bg-sky-600' },
        { id: 'transactions', label: 'Transactions Ledger', icon: Receipt, color: 'bg-teal-600' },
        { id: 'calculator', label: 'Deposit Calculator', icon: Calculator, color: 'bg-indigo-500' }
      ]
    },
    {
      title: 'AGENTS & ADVISORS',
      items: [
        { id: 'agent_ranks', label: 'Associate/ Advisor Ranks', icon: Award, color: 'bg-amber-600', badge: '6 Ranks' },
        { id: 'agents_list', label: 'Associates / Advisors', icon: Users, color: 'bg-teal-600', badge: '16 Active' },
        { id: 'centers', label: 'Coll. Centers & Groups', icon: Building, color: 'bg-emerald-600', badge: '4 Centers' }
      ]
    },
    {
      title: 'INTELLIGENCE & SETTINGS',
      items: [
        { id: 'reports', label: 'Reports & Analytics', icon: BarChart3, color: 'bg-rose-600' },
        { id: 'whatsapp', label: 'WhatsApp Alerts', icon: MessageSquare, color: 'bg-emerald-600' },
        { id: 'branches', label: 'Branch Management', icon: Building2, color: 'bg-slate-600' },
        { id: 'subscription', label: 'Subscription & APIs', icon: ShieldCheck, color: 'bg-indigo-600' },
        { id: 'settings', label: 'CRM Settings', icon: SettingsIcon, color: 'bg-slate-600' }
      ]
    }
  ];

  const branches = branchesList;

  const fiscalYears = [
    'FY 2026-27',
    'FY 2025-26',
    'FY 2024-25'
  ];

  // Active module title for breadcrumbs
  let activeModuleLabel = 'Executive Dashboard';
  for (const section of navSections) {
    const found = section.items.find(i => i.id === activeTab);
    if (found) {
      activeModuleLabel = found.label;
      break;
    }
  }
  if (activeTab.startsWith('fd-')) {
    activeModuleLabel = `Fixed Deposit Record #${activeTab.replace('fd-', '')}`;
  }

  return (
    <div className="min-h-screen bg-[#FAF8F5] text-slate-900 flex font-sans selection:bg-[#D4AF37] selection:text-[#062319]">
      
      {/* ======================================================== */}
      {/* 1. ENTERPRISE FINTECH DARK FOREST GREEN SIDEBAR           */}
      {/* ======================================================== */}
      <aside className={`
        fixed inset-y-0 left-0 z-50 bg-[#062319] text-slate-300 border-r border-[#134e38] flex flex-col justify-between transition-all duration-300 ease-in-out
        ${sidebarCollapsed ? 'w-20' : 'w-64'}
        ${mobileMenuOpen ? 'translate-x-0 shadow-2xl' : '-translate-x-full md:translate-x-0'}
      `}>
        
        {/* Top: Logo & Collapse Button */}
        <div>
          <div className="h-16 flex items-center justify-between px-4 border-b border-[#134e38]">
            <div 
              onClick={() => handleSwitchTab('dashboard', 'Executive Dashboard', LayoutDashboard, 'bg-emerald-700')}
              className="flex items-center gap-2 cursor-pointer flex-1 min-w-0"
            >
              <TarplLogo variant={sidebarCollapsed ? 'icon' : 'full'} />
            </div>

            {/* Desktop Collapse Toggle */}
            <button
              onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
              className="hidden md:flex p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-[#0a3d2b] transition cursor-pointer"
              title={sidebarCollapsed ? 'Expand Sidebar' : 'Collapse Sidebar'}
            >
              {sidebarCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
            </button>

            {/* Mobile Close Button */}
            <button
              onClick={() => setMobileMenuOpen(false)}
              className="md:hidden p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-[#0a3d2b]"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Navigation Links with FinTech Hierarchy */}
          <nav className="p-3 space-y-5 overflow-y-auto max-h-[calc(100vh-140px)]">
            {navSections.map((section, sIdx) => (
              <div key={sIdx} className="space-y-1">
                {!sidebarCollapsed && (
                  <div className="px-3 text-[10px] font-bold text-emerald-400/70 uppercase tracking-wider mb-2">
                    {section.title}
                  </div>
                )}
                {section.items.map((item) => {
                  const Icon = item.icon;
                  const isActive = activeTab === item.id;
                  return (
                    <button
                      key={item.id}
                      onClick={() => handleSwitchTab(item.id, item.label, item.icon, item.color)}
                      title={sidebarCollapsed ? item.label : undefined}
                      className={`
                        w-full flex items-center gap-3 px-2.5 py-2 rounded-lg text-xs font-semibold transition cursor-pointer group relative
                        ${isActive 
                          ? 'bg-[#0a3d2b] text-[#FBBF24] font-bold border-l-2 border-[#D4AF37] shadow-xs' 
                          : 'text-slate-300 hover:text-white hover:bg-[#082e20]'
                        }
                        ${sidebarCollapsed ? 'justify-center px-0' : ''}
                      `}
                    >
                      {/* Active Indicator Bar */}
                      {isActive && (
                        <div className="absolute left-0 top-1.5 bottom-1.5 w-1 bg-[#D4AF37] rounded-r-full"></div>
                      )}

                      {/* Clean FinTech Square Icon Tile */}
                      <div className={`w-7 h-7 rounded-lg ${isActive ? 'bg-[#D4AF37] text-[#062319]' : 'bg-[#082e20] text-emerald-300 group-hover:text-white'} flex items-center justify-center shrink-0 shadow-xs transition`}>
                        <Icon className="w-4 h-4" />
                      </div>

                      {!sidebarCollapsed && (
                        <span className="flex-1 text-left truncate font-medium">
                          {item.label}
                        </span>
                      )}

                      {!sidebarCollapsed && item.badge && (
                        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30 shadow-xs">
                          {item.badge}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            ))}
          </nav>
        </div>

        {/* Bottom User / Status Strip */}
        <div className="p-3 border-t border-[#134e38]">
          {!sidebarCollapsed ? (
            <div className="bg-[#082e20] rounded-xl p-2.5 border border-[#1a5d43] flex items-center justify-between">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-8 h-8 rounded-lg bg-[#D4AF37] text-[#062319] flex items-center justify-center font-black text-xs shrink-0 shadow-xs ring-1 ring-[#D4AF37]/50">
                  {user?.full_name ? user.full_name.slice(0, 2).toUpperCase() : 'AD'}
                </div>
                <div className="min-w-0">
                  <div className="text-xs font-bold text-white truncate">
                    {user?.full_name || 'Administrator'}
                  </div>
                  <div className="text-[10px] text-amber-300 truncate flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#D4AF37]"></span>
                    {isEmployee ? 'Staff Maker' : 'Super Admin'}
                  </div>
                </div>
              </div>
              <button
                onClick={handleLogout}
                title="Logout from CRM"
                className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-[#0a3d2b] rounded-lg transition cursor-pointer"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <div className="flex justify-center">
              <button
                onClick={handleLogout}
                title="Logout"
                className="p-2 text-slate-400 hover:text-rose-400 hover:bg-[#0a3d2b] rounded-lg transition cursor-pointer"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>

      </aside>

      {/* ======================================================== */}
      {/* 2. DARK FOREST GREEN TOP APPLICATION BAR                  */}
      {/* ======================================================== */}
      <div className={`
        flex-1 flex flex-col min-w-0 transition-all duration-300 ease-in-out
        ${sidebarCollapsed ? 'md:ml-20' : 'md:ml-64'}
      `}>
        
        {/* Deep Forest Green Header Bar */}
        <header className="h-16 bg-[#082e20] text-white border-b border-[#1a5d43] sticky top-0 z-40 px-4 sm:px-6 flex items-center justify-between shadow-xs">
          
          {/* Left: Mobile Toggle, Quick Booking & Breadcrumb */}
          <div className="flex items-center gap-3">
            <button
              onClick={() => setMobileMenuOpen(true)}
              className="md:hidden p-2 rounded-lg text-slate-300 hover:bg-[#0a3d2b]"
            >
              <Menu className="w-5 h-5" />
            </button>

            {/* Quick Process Action Button */}
            <button 
              onClick={() => {
                setNewFDInitialData(null);
                setNewFDModalOpen(true);
              }}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#D4AF37] hover:bg-[#C59B27] text-[#062319] font-bold text-xs shadow-xs transition cursor-pointer"
              title="Quick New Deposit Booking"
            >
              <PlusCircle className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">New Booking</span>
            </button>

            {/* Direct DAY BOOK Navigation Button (Always Visible in Top Bar) */}
            <button
              onClick={() => handleSwitchTab('day_book', 'Day Book (8 Ledgers)', BookOpen, 'bg-amber-600')}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-bold transition cursor-pointer ${
                activeTab === 'day_book'
                  ? 'bg-[#D4AF37] text-[#062319] border-[#D4AF37] shadow-xs'
                  : 'bg-[#062319] hover:bg-[#0a3d2b] border-[#1a5d43] text-amber-300'
              }`}
              title="Open Day Book (Daily Cash & Bank Ledgers)"
            >
              <BookOpen className="w-3.5 h-3.5 text-[#D4AF37]" />
              <span>Day Book</span>
            </button>

            {/* Breadcrumb Navigation */}
            <div className="hidden lg:flex items-center gap-2 text-xs font-medium text-slate-300">
              <span className="text-emerald-300 font-semibold">TARPL CRM</span>
              <span>/</span>
              <span className="text-[#FBBF24] font-bold bg-[#062319] px-2.5 py-1 rounded-md border border-[#1a5d43]">
                {activeModuleLabel}
              </span>
            </div>

            {/* Quick Navigation Modules */}
            <div className="hidden md:flex items-center gap-1.5 ml-1">
              {/* ACCOUNTS Dropdown */}
              <div className="relative" ref={accountsRef}>
                <button
                  onClick={() => setAccountsDropdownOpen(!accountsDropdownOpen)}
                  className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-[#062319] hover:bg-[#0a3d2b] border border-[#1a5d43] text-xs font-bold text-amber-300 uppercase tracking-wider transition cursor-pointer"
                  title="Banking Accounts & Ledgers"
                >
                  <span>Accounts</span>
                  <ChevronDown className="w-3 h-3 text-amber-400" />
                </button>

                {accountsDropdownOpen && (
                  <div className="absolute left-0 mt-2 w-56 bg-white rounded-xl shadow-2xl border border-slate-200 p-1.5 z-50 text-xs text-slate-800 animate-fadeIn">
                    <div className="px-3 py-1.5 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                      Core Banking Ledgers
                    </div>
                    <button
                      onClick={() => {
                        handleSwitchTab('day_book', 'Day Book (8 Ledgers)', BookOpen, 'bg-amber-600');
                        setAccountsDropdownOpen(false);
                      }}
                      className="w-full text-left px-3 py-2 rounded-lg hover:bg-slate-50 font-medium text-slate-700 flex items-center gap-2 cursor-pointer"
                    >
                      <BookOpen className="w-3.5 h-3.5 text-amber-600" />
                      <span>Day Book (8 Ledgers)</span>
                    </button>
                    <button
                      onClick={() => {
                        setJournalEntryModalOpen(true);
                        setAccountsDropdownOpen(false);
                      }}
                      className="w-full text-left px-3 py-2 rounded-lg hover:bg-slate-50 font-medium text-slate-700 flex items-center gap-2 cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5 text-emerald-600" />
                      <span>New Journal Entry</span>
                    </button>
                    <button
                      onClick={() => {
                        handleSwitchTab('transactions', 'Transactions Ledger', Receipt, 'bg-teal-600');
                        setAccountsDropdownOpen(false);
                      }}
                      className="w-full text-left px-3 py-2 rounded-lg hover:bg-slate-50 font-medium text-slate-700 flex items-center gap-2 cursor-pointer"
                    >
                      <Receipt className="w-3.5 h-3.5 text-indigo-600" />
                      <span>General Ledger</span>
                    </button>
                    <button
                      onClick={() => {
                        handleSwitchTab('reports', 'Reports & Analytics', BarChart3, 'bg-rose-600');
                        setAccountsDropdownOpen(false);
                      }}
                      className="w-full text-left px-3 py-2 rounded-lg hover:bg-slate-50 font-medium text-slate-700 flex items-center gap-2 cursor-pointer"
                    >
                      <BarChart3 className="w-3.5 h-3.5 text-rose-600" />
                      <span>Trial Balance & Balance Sheet</span>
                    </button>
                  </div>
                )}
              </div>

              {/* Direct NEW JOURNAL ENTRY button */}
              <button
                onClick={() => setJournalEntryModalOpen(true)}
                className="px-2.5 py-1.5 rounded-lg bg-[#062319] hover:bg-[#0a3d2b] border border-[#1a5d43] text-xs font-bold text-white uppercase tracking-wider transition cursor-pointer whitespace-nowrap"
              >
                New Journal Entry
              </button>

              {/* Direct DAY BOOK button */}
              <button
                onClick={() => handleSwitchTab('day_book', 'Day Book (8 Ledgers)', BookOpen, 'bg-amber-600')}
                className={`px-2.5 py-1.5 rounded-lg border text-xs font-bold uppercase tracking-wider transition cursor-pointer whitespace-nowrap ${
                  activeTab === 'day_book'
                    ? 'bg-[#D4AF37] text-[#062319] border-[#D4AF37]'
                    : 'bg-[#062319] hover:bg-[#0a3d2b] border-[#1a5d43] text-white'
                }`}
              >
                Day Book
              </button>

              {/* Direct SCHEDULE SMS button */}
              <button
                onClick={() => setScheduleSmsModalOpen(true)}
                className="px-2.5 py-1.5 rounded-lg bg-[#062319] hover:bg-[#0a3d2b] border border-[#1a5d43] text-xs font-bold text-white uppercase tracking-wider transition cursor-pointer whitespace-nowrap"
              >
                Schedule SMS
              </button>

              {/* Direct DAILY COLLECTION button with NEW badge */}
              <button
                onClick={() => handleSwitchTab('daily_collection', 'Daily Collection', Coins, 'bg-emerald-600')}
                className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-xs font-bold uppercase tracking-wider transition cursor-pointer whitespace-nowrap ${
                  activeTab === 'daily_collection'
                    ? 'bg-emerald-600 text-white border-emerald-400'
                    : 'bg-emerald-950/70 hover:bg-emerald-900 border-emerald-500/40 text-emerald-200'
                }`}
              >
                <span>Daily Collection</span>
                <span className="text-[9px] bg-emerald-500 text-slate-950 font-black px-1 rounded">NEW</span>
              </button>
            </div>
          </div>

          {/* Center: Global Search Bar */}
          <div className="hidden lg:flex items-center relative max-w-xs xl:max-w-md w-full mx-2">
            <Search className="w-4 h-4 text-emerald-400 absolute left-3.5 top-2.5 pointer-events-none" />
            <input
              type="text"
              value={globalSearch}
              onChange={(e) => setGlobalSearch(e.target.value)}
              onFocus={() => setSearchFocused(true)}
              onBlur={() => setTimeout(() => setSearchFocused(false), 200)}
              placeholder="Search contracts, depositors, PAN, mobile..."
              className="w-full text-xs pl-10 pr-12 py-2 bg-[#062319] text-white placeholder-emerald-300/50 border border-[#1a5d43] rounded-lg focus:outline-none focus:border-[#D4AF37] transition"
            />
            <span className="absolute right-3 top-2 text-[10px] font-mono text-amber-300 bg-[#082e20] px-1.5 py-0.5 rounded border border-[#1a5d43]">
              Ctrl K
            </span>
          </div>

          {/* Right: Branch Selector, FY Selector, Notifications, Customer App, Profile */}
          <div className="flex items-center gap-2 sm:gap-2.5">

            {/* 1. Branch Selector */}
            <div className="relative" ref={branchRef}>
              <button
                onClick={() => setBranchDropdownOpen(!branchDropdownOpen)}
                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-[#062319] hover:bg-[#0a3d2b] border border-[#1a5d43] text-xs font-semibold text-white transition cursor-pointer"
                title="Select Operating Branch"
              >
                <Building2 className="w-3.5 h-3.5 text-[#D4AF37] shrink-0" />
                <span className="hidden sm:inline max-w-[120px] truncate">{selectedBranch}</span>
                <ChevronDown className="w-3 h-3 text-emerald-300" />
              </button>

              {branchDropdownOpen && (
                <div className="absolute right-0 mt-2 w-72 bg-white rounded-xl shadow-xl border border-slate-200 p-1.5 z-50 text-xs text-slate-800 animate-fadeIn">
                  <div className="px-3 py-1.5 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                    Select Branch
                  </div>
                  {branches.map(b => (
                    <button
                      key={b}
                      onClick={() => {
                        setSelectedBranch(b);
                        setBranchDropdownOpen(false);
                      }}
                      className={`w-full text-left px-3 py-2 rounded-lg font-medium transition flex items-center justify-between cursor-pointer ${
                        selectedBranch === b ? 'bg-emerald-50 text-emerald-900 font-bold' : 'hover:bg-slate-50 text-slate-700'
                      }`}
                    >
                      <span>{b}</span>
                      {selectedBranch === b && <Check className="w-3.5 h-3.5 text-emerald-700" />}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* 2. Financial Year (FY) Filter */}
            <div className="relative" ref={fyRef}>
              <button
                onClick={() => setFyDropdownOpen(!fyDropdownOpen)}
                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-[#062319] hover:bg-[#0a3d2b] border border-[#1a5d43] text-xs font-semibold text-white transition cursor-pointer"
                title="Financial Year Filter"
              >
                <span className="font-mono text-[#FBBF24] font-bold">{selectedFY}</span>
                <ChevronDown className="w-3 h-3 text-emerald-300" />
              </button>

              {fyDropdownOpen && (
                <div className="absolute right-0 mt-2 w-44 bg-white rounded-xl shadow-xl border border-slate-200 p-1.5 z-50 text-xs text-slate-800 animate-fadeIn">
                  <div className="px-3 py-1.5 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                    Fiscal Cycle
                  </div>
                  {fiscalYears.map(fy => (
                    <button
                      key={fy}
                      onClick={() => {
                        setSelectedFY(fy);
                        setFyDropdownOpen(false);
                      }}
                      className={`w-full text-left px-3 py-2 rounded-lg font-medium transition flex items-center justify-between cursor-pointer ${
                        selectedFY === fy ? 'bg-emerald-50 text-emerald-900 font-bold' : 'hover:bg-slate-50 text-slate-700'
                      }`}
                    >
                      <span>{fy}</span>
                      {selectedFY === fy && <Check className="w-3.5 h-3.5 text-emerald-700" />}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* 3. Language Toggle: EN / HI */}
            <button
              id="topbar-language-toggle-btn"
              onClick={() => setLanguage(prev => prev === 'EN' ? 'HI' : 'EN')}
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-[#062319] hover:bg-[#0a3d2b] border border-[#1a5d43] text-xs font-bold text-white transition cursor-pointer"
              title="Toggle Language (English / Hindi)"
            >
              <span className={language === 'EN' ? 'text-[#FBBF24] font-black' : 'text-slate-400'}>EN</span>
              <span className="text-slate-500">/</span>
              <span className={language === 'HI' ? 'text-emerald-400 font-black' : 'text-slate-400'}>HI</span>
            </button>

            {/* 4. Notification Center */}
            <div className="relative" ref={notifRef}>
              <button
                onClick={() => setNotificationsOpen(!notificationsOpen)}
                className="p-1.5 rounded-lg text-slate-300 hover:text-white hover:bg-[#0a3d2b] transition relative cursor-pointer"
                title="Notifications"
              >
                <Bell className="w-4 h-4" />
                <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-[#D4AF37] ring-2 ring-[#082e20]"></span>
              </button>

              {notificationsOpen && (
                <div className="absolute right-0 mt-2 w-80 bg-white rounded-xl shadow-xl border border-slate-200 p-3 z-50 text-xs text-slate-800 animate-fadeIn">
                  <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                    <span className="font-bold text-slate-900">Notifications & Alerts</span>
                    <span className="text-[10px] bg-amber-50 text-amber-800 font-semibold px-2 py-0.5 rounded-full border border-amber-200">
                      2 Operational
                    </span>
                  </div>
                  <div className="divide-y divide-slate-100 max-h-72 overflow-y-auto">
                    <div 
                      onClick={() => { handleSwitchTab('payouts', 'Interest & Payouts', CreditCard, 'bg-emerald-700'); setNotificationsOpen(false); }}
                      className="p-3 hover:bg-slate-50 cursor-pointer flex gap-3"
                    >
                      <div className="w-2 h-2 rounded-full bg-[#D4AF37] mt-1.5 shrink-0"></div>
                      <div>
                        <div className="font-bold text-slate-900">Interest Payouts Scheduled</div>
                        <p className="text-slate-500 text-[11px] mt-0.5">Non-cumulative interest schedules due for bank NEFT</p>
                      </div>
                    </div>
                    <div 
                      onClick={() => { handleSwitchTab('maturity', 'Maturity Calendar', CalendarDays, 'bg-emerald-700'); setNotificationsOpen(false); }}
                      className="p-3 hover:bg-slate-50 cursor-pointer flex gap-3"
                    >
                      <div className="w-2 h-2 rounded-full bg-[#F59E0B] mt-1.5 shrink-0"></div>
                      <div>
                        <div className="font-bold text-slate-900">30-Day Maturity Timeline</div>
                        <p className="text-slate-500 text-[11px] mt-0.5">Deposits reaching maturity soon</p>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* 5. Switch to Customer View-Only App Pill & Download APK */}
            <button
              onClick={() => setViewMode('customer')}
              className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 font-bold text-xs border border-amber-500/40 transition cursor-pointer"
              title="Preview Customer Digital Passbook"
            >
              <Smartphone className="w-3.5 h-3.5" />
              <span>Customer App</span>
            </button>

            <a
              href="/Taranganjali_Banking.apk"
              download="Taranganjali_Banking.apk"
              className="hidden md:flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-xs transition"
              title="Download Android APK File for Mobile (Taranganjali)"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Download APK</span>
            </a>

            {/* Direct Logout Button */}
            <button
              onClick={handleLogout}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-rose-600/20 hover:bg-rose-600 text-rose-300 hover:text-white border border-rose-500/40 text-xs font-bold transition cursor-pointer shadow-xs"
              title="Logout from CRM"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Logout</span>
            </button>

            {/* 6. User Profile Menu */}
            <div className="relative pl-1 sm:pl-2 border-l border-[#1e2d4d]" ref={profileRef}>
              <button
                onClick={() => setProfileDropdownOpen(!profileDropdownOpen)}
                className="flex items-center gap-2 p-1 rounded-lg hover:bg-slate-800/60 transition cursor-pointer"
              >
                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500 to-indigo-700 text-white font-bold text-xs flex items-center justify-center shadow-xs ring-1 ring-indigo-400/30">
                  {user?.full_name ? user.full_name.slice(0, 2).toUpperCase() : 'AD'}
                </div>
                <div className="hidden md:block text-left">
                  <div className="text-xs font-bold text-white leading-tight">
                    {user?.full_name || 'Admin'}
                  </div>
                  <div className="text-[10px] text-teal-400 font-semibold">{isEmployee ? 'Staff Maker' : 'Super Admin'}</div>
                </div>
                <ChevronDown className="w-3 h-3 text-slate-400 hidden sm:block" />
              </button>

              {profileDropdownOpen && (
                <div className="absolute right-0 mt-2 w-52 bg-white rounded-xl shadow-xl border border-slate-200 p-1.5 z-50 text-xs text-slate-800 animate-fadeIn">
                  <div className="px-3 py-2 border-b border-slate-100">
                    <div className="font-bold text-slate-900">{user?.full_name || 'Admin'}</div>
                    <div className="text-[11px] text-slate-400">{user?.username || 'admin'}</div>
                  </div>
                  {!isEmployee && (
                    <button
                      onClick={() => { handleSwitchTab('users', 'User Management', UserCheck, 'bg-indigo-600'); setProfileDropdownOpen(false); }}
                      className="w-full text-left px-3 py-2 rounded-lg hover:bg-slate-50 text-slate-700 font-medium flex items-center gap-2 cursor-pointer mt-1"
                    >
                      <UserCheck className="w-3.5 h-3.5 text-indigo-500" /> User Management
                    </button>
                  )}
                  <button
                    onClick={() => { handleSwitchTab('settings', 'CRM Settings', SettingsIcon, 'bg-slate-600'); setProfileDropdownOpen(false); }}
                    className="w-full text-left px-3 py-2 rounded-lg hover:bg-slate-50 text-slate-700 font-medium flex items-center gap-2 cursor-pointer mt-1"
                  >
                    <SettingsIcon className="w-3.5 h-3.5 text-slate-400" /> CRM Settings
                  </button>
                  <button
                    onClick={() => { handleSwitchTab('subscription', 'Subscription & APIs', ShieldCheck, 'bg-indigo-600'); setProfileDropdownOpen(false); }}
                    className="w-full text-left px-3 py-2 rounded-lg hover:bg-slate-50 text-slate-700 font-medium flex items-center gap-2 cursor-pointer"
                  >
                    <ShieldCheck className="w-3.5 h-3.5 text-slate-400" /> License & APIs
                  </button>
                  <div className="border-t border-slate-100 my-1"></div>
                  <button
                    onClick={handleLogout}
                    className="w-full text-left px-3 py-2 rounded-lg hover:bg-rose-50 text-rose-600 font-semibold flex items-center gap-2 cursor-pointer"
                  >
                    <LogOut className="w-3.5 h-3.5" /> Logout
                  </button>
                </div>
              )}
            </div>

          </div>

        </header>

        {/* ======================================================== */}
        {/* 3. DYNAMIC CONTENT AREA                                  */}
        {/* ======================================================== */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto pb-16">
          
          {/* Render Creatio Full Entity View if activeTab is an FD record */}
          {activeTab.startsWith('fd-') && (
            <FDCreatioDetailView 
              fdId={activeTab.replace('fd-', '')}
              onBack={() => setActiveTab('fds')}
              onPrintCertificate={handlePrintCertificate}
              onPrematureClose={handlePrematureClose}
              onRenewFD={handleRenewFD}
            />
          )}

          {activeTab === 'dashboard' && (
            isEmployee ? (
              <EmployeeDashboard
                user={user}
                permissions={staffPermissions}
                onNavigate={setActiveTab}
                onOpenNewFD={() => {
                  setNewFDInitialData(null);
                  setNewFDModalOpen(true);
                }}
              />
            ) : (
              <Dashboard 
                onNavigate={setActiveTab}
                onOpenNewFD={() => {
                  setNewFDInitialData(null);
                  setNewFDModalOpen(true);
                }}
                onViewFD={handleViewFD}
                onPrintCertificate={handlePrintCertificate}
                onPrematureClose={handlePrematureClose}
                onRenewFD={handleRenewFD}
                selectedBranch={selectedBranch}
                selectedFY={selectedFY}
              />
            )
          )}

          {activeTab === 'approvals' && (
            <ApprovalsQueue onApproved={() => setActiveTab('dashboard')} />
          )}

          {activeTab === 'fds' && (
            <FDList 
              onOpenNewFD={() => {
                setNewFDInitialData(null);
                setNewFDModalOpen(true);
              }}
              onViewFD={handleViewFD}
              onPrintCertificate={handlePrintCertificate}
              onPrematureClose={handlePrematureClose}
              onRenewFD={handleRenewFD}
            />
          )}

          {activeTab === 'rds' && (
            <RDList 
              onOpenNewRD={() => setNewRDModalOpen(true)}
              isEmployee={isEmployee}
            />
          )}

          {activeTab === 'mis' && (
            <MISList 
              onOpenNewMIS={() => setNewMISModalOpen(true)}
              isEmployee={isEmployee}
            />
          )}

          {activeTab === 'savings' && (
            <SavingsList 
              onOpenNewSavings={() => setNewSavingsModalOpen(true)}
              isEmployee={isEmployee}
            />
          )}

          {activeTab === 'customers' && (
            <Customers 
              onSelectCustomerForFD={(cid) => {
                setNewFDInitialData({ customer_id: cid });
                setNewFDModalOpen(true);
              }}
              onSelectCustomerForRD={(cid) => {
                setNewRDModalOpen(true);
              }}
              onSelectCustomerForMIS={(cid) => {
                setNewMISModalOpen(true);
              }}
              onViewPortfolio={(cid) => {
                setPortfolioCustomerId(cid);
                setCustomerPortfolioModalOpen(true);
              }}
            />
          )}

          {activeTab === 'schemes' && (
            <FDSchemes 
              onOpenNewFD={() => {
                setNewFDInitialData(null);
                setNewFDModalOpen(true);
              }}
            />
          )}

          {activeTab === 'payouts' && (
            <Payouts />
          )}

          {activeTab === 'maturity' && (
            <MaturityCalendar 
              onViewFD={handleViewFD}
              onRenewFD={handleRenewFD}
              onPrintCertificate={handlePrintCertificate}
            />
          )}

          {activeTab === 'transactions' && (
            <TransactionsLedger />
          )}

          {activeTab === 'calculator' && (
            <CalculatorComponent onBookFD={handleBookFromCalc} />
          )}

          {activeTab === 'reports' && (
            <Reports />
          )}

          {activeTab === 'whatsapp' && (
            <WhatsAppReminders />
          )}

          {activeTab === 'users' && (
            <UserManagement 
              onOpenCustomerPortfolio={(cid) => {
                setPortfolioCustomerId(cid);
                setCustomerPortfolioModalOpen(true);
              }}
            />
          )}

          {activeTab === 'roles_permissions' && (
            <RolePermissionsEditor 
              onCancel={() => handleSwitchTab('dashboard', 'Executive Dashboard', LayoutDashboard, 'bg-indigo-600')} 
            />
          )}

          {activeTab === 'staff_permissions' && (
            <StaffPermissions />
          )}

          {activeTab === 'branches' && (
            <BranchManagement />
          )}

          {activeTab === 'agent_ranks' && (
            <AgentRanks 
              onOpenAgentsDirectory={() => handleSwitchTab('agents_list', 'Associates / Advisors', Users, 'bg-teal-600')} 
            />
          )}

          {activeTab === 'agents_list' && (
            <AgentsList 
              onBackToRanks={() => handleSwitchTab('agent_ranks', 'Associate/ Advisor Ranks', Award, 'bg-amber-600')} 
            />
          )}

          {activeTab === 'centers' && (
            <CollectionCenters />
          )}

          {activeTab === 'loans' && (
            <LoansAgainstDeposit />
          )}

          {activeTab === 'gold_loan' && (
            <GoldLoanList />
          )}

          {activeTab === 'borrowings_udhar' && (
            <BorrowingsRegister />
          )}

          {activeTab === 'mortgage_loan' && (
            <LoansAgainstDeposit loanType="MORTGAGE" title="Property & Mortgage Loans (प्रॉपर्टी / बंधक ऋण)" />
          )}

          {activeTab === 'business_loan' && (
            <LoansAgainstDeposit loanType="BUSINESS" title="Business Loans (व्यापार ऋण)" />
          )}

          {activeTab === 'day_book' && (
            <DayBook 
              onOpenJournalEntry={() => setJournalEntryModalOpen(true)} 
            />
          )}

          {activeTab === 'daily_collection' && (
            <DailyCollection />
          )}

          {activeTab === 'payments_to_collect' && (
            <PaymentsToCollect />
          )}

          {activeTab === 'payments_to_release' && (
            <PaymentsToRelease />
          )}

          {activeTab === 'subscription' && (
            <Subscription />
          )}

          {activeTab === 'settings' && (
            <Settings />
          )}
        </main>

        {/* ======================================================== */}
        {/* 4. ENTERPRISE TASKBAR DOCK                               */}
        {/* ======================================================== */}
        <div className="fixed bottom-0 inset-x-0 h-10 bg-[#062319] border-t border-[#134e38] px-3 flex items-center gap-1.5 z-40 shadow-lg overflow-x-auto">
          {openTabs.map((tab) => {
            const Icon = tab.icon || FolderLock;
            const isActive = activeTab === tab.id;
            return (
              <div 
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-t-lg text-xs font-semibold cursor-pointer border-t-2 transition shrink-0 ${
                  isActive 
                    ? 'bg-[#0a3d2b] text-[#FBBF24] border-[#D4AF37] shadow-sm' 
                    : 'bg-[#082e20] text-slate-400 border-transparent hover:bg-[#0a3d2b] hover:text-slate-200'
                }`}
              >
                <div className={`w-4 h-4 rounded ${isActive ? 'bg-[#D4AF37] text-[#062319]' : 'bg-[#082e20] text-emerald-300'} flex items-center justify-center text-[9px]`}>
                  <Icon className="w-2.5 h-2.5" />
                </div>
                <span className="truncate max-w-[150px]">{tab.label}</span>
                {tab.closable && (
                  <button 
                    onClick={(e) => handleCloseTab(e, tab.id)}
                    className="text-slate-500 hover:text-rose-400 hover:bg-[#062319] rounded p-0.5 ml-1 transition cursor-pointer"
                    title="Close Tab"
                  >
                    <X className="w-3 h-3" />
                  </button>
                )}
              </div>
            );
          })}
        </div>

      </div>

      {/* ======================================================== */}
      {/* 5. MODALS & POPUPS                                       */}
      {/* ======================================================== */}
      <NewFDModal
        isOpen={newFDModalOpen}
        onClose={() => setNewFDModalOpen(false)}
        onSuccess={() => {
          setNewFDModalOpen(false);
          setActiveTab('fds');
        }}
        initialData={newFDInitialData}
      />

      <FDDetailModal
        fdId={selectedFDId}
        isOpen={detailModalOpen}
        onClose={() => setDetailModalOpen(false)}
        onPrintCertificate={handlePrintCertificate}
        onPrematureClose={handlePrematureClose}
        onRenewFD={handleRenewFD}
      />

      <Certificate
        fdId={certFDId}
        isOpen={certModalOpen}
        onClose={() => setCertModalOpen(false)}
      />

      <PrematureCloseModal
        fd={prematureFD}
        isOpen={prematureModalOpen}
        onClose={() => setPrematureModalOpen(false)}
        onSuccess={() => {
          setPrematureModalOpen(false);
          setActiveTab('fds');
        }}
      />

      <RenewModal
        fd={renewFD}
        isOpen={renewModalOpen}
        onClose={() => setRenewModalOpen(false)}
        onSuccess={() => {
          setRenewModalOpen(false);
          setActiveTab('fds');
        }}
      />

      {/* Multi-Product Modals */}
      <NewRDModal
        isOpen={newRDModalOpen}
        onClose={() => setNewRDModalOpen(false)}
        onSuccess={() => {
          setNewRDModalOpen(false);
          setActiveTab('rds');
        }}
        isEmployee={isEmployee}
      />

      <NewMISModal
        isOpen={newMISModalOpen}
        onClose={() => setNewMISModalOpen(false)}
        onSuccess={() => {
          setNewMISModalOpen(false);
          setActiveTab('mis');
        }}
        isEmployee={isEmployee}
      />

      <NewSavingsModal
        isOpen={newSavingsModalOpen}
        onClose={() => setNewSavingsModalOpen(false)}
        onSuccess={() => {
          setNewSavingsModalOpen(false);
          setActiveTab('savings');
        }}
        isEmployee={isEmployee}
      />

      <UnifiedCustomerProfileModal
        customerId={portfolioCustomerId}
        isOpen={customerPortfolioModalOpen}
        onClose={() => {
          setCustomerPortfolioModalOpen(false);
          setPortfolioCustomerId(null);
        }}
        onOpenFD={() => setNewFDModalOpen(true)}
        onOpenRD={() => setNewRDModalOpen(true)}
        onOpenMIS={() => setNewMISModalOpen(true)}
        onOpenSavings={() => setNewSavingsModalOpen(true)}
      />

      {/* Hubco Parity Accounting & SMS Modals */}
      <NewJournalEntryModal
        isOpen={journalEntryModalOpen}
        onClose={() => setJournalEntryModalOpen(false)}
        onSuccess={() => {}}
      />

      <ScheduleSmsModal
        isOpen={scheduleSmsModalOpen}
        onClose={() => setScheduleSmsModalOpen(false)}
      />

    </div>
  );
}
