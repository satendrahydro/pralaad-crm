import React, { useState, useEffect, useRef, useMemo, lazy, Suspense } from 'react';
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
import TarplLogo from './components/TarplLogo';
import CommercialLockScreen from './components/CommercialLockScreen';

const Dashboard = lazy(() => import('./components/Dashboard'));
const CalculatorComponent = lazy(() => import('./components/Calculator'));
const FDList = lazy(() => import('./components/FDList'));
const Customers = lazy(() => import('./components/Customers'));
const Payouts = lazy(() => import('./components/Payouts'));
const Subscription = lazy(() => import('./components/Subscription'));
const Settings = lazy(() => import('./components/Settings'));
const WhatsAppReminders = lazy(() => import('./components/WhatsAppReminders'));
import DeveloperContactModal from './components/DeveloperContactModal';
const UserManagement = lazy(() => import('./components/UserManagement'));
const StaffPermissions = lazy(() => import('./components/StaffPermissions'));

// Stage 3 New Dedicated Modules
const FDSchemes = lazy(() => import('./components/FDSchemes'));
const TransactionsLedger = lazy(() => import('./components/TransactionsLedger'));
const MaturityCalendar = lazy(() => import('./components/MaturityCalendar'));
const Reports = lazy(() => import('./components/Reports'));
const BranchManagement = lazy(() => import('./components/BranchManagement'));
const EmployeeDashboard = lazy(() => import('./components/EmployeeDashboard'));
const ApprovalsQueue = lazy(() => import('./components/ApprovalsQueue'));
const FDCreatioDetailView = lazy(() => import('./components/FDCreatioDetailView'));

// Stage 4 Multi-Product Modules (RD, MIS, Savings, 360 Portfolio)
const RDList = lazy(() => import('./components/RDList'));
const MISList = lazy(() => import('./components/MISList'));
const SavingsList = lazy(() => import('./components/SavingsList'));
const AgentRanks = lazy(() => import('./components/AgentRanks'));
const AgentsList = lazy(() => import('./components/AgentsList'));
const CollectionCenters = lazy(() => import('./components/CollectionCenters'));
const LoansAgainstDeposit = lazy(() => import('./components/LoansAgainstDeposit'));
const GoldLoanList = lazy(() => import('./components/GoldLoanList'));
const BorrowingsRegister = lazy(() => import('./components/BorrowingsRegister'));
const UnifiedCustomerProfileModal = lazy(() => import('./components/UnifiedCustomerProfileModal'));
const NewRDModal = lazy(() => import('./components/NewRDModal'));
const NewMISModal = lazy(() => import('./components/NewMISModal'));
const NewSavingsModal = lazy(() => import('./components/NewSavingsModal'));
const DayBook = lazy(() => import('./components/DayBook'));
const NewJournalEntryModal = lazy(() => import('./components/NewJournalEntryModal'));
const DailyCollection = lazy(() => import('./components/DailyCollection'));
const ScheduleSmsModal = lazy(() => import('./components/ScheduleSmsModal'));
const PaymentsToCollect = lazy(() => import('./components/PaymentsToCollect'));
const PaymentsToRelease = lazy(() => import('./components/PaymentsToRelease'));
const RolePermissionsEditor = lazy(() => import('./components/RolePermissionsEditor'));
const AuditTrailView = lazy(() => import('./components/AuditTrailView'));

const NewFDModal = lazy(() => import('./components/NewFDModal'));
const FDDetailModal = lazy(() => import('./components/FDDetailModal'));
const Certificate = lazy(() => import('./components/Certificate'));
const PrematureCloseModal = lazy(() => import('./components/PrematureCloseModal'));
const RenewModal = lazy(() => import('./components/RenewModal'));

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
    const handleUserUpdated = (e) => {
      if (e.detail) setUser(e.detail);
    };
    window.addEventListener('commercial_lock_triggered', handleTrigger);
    window.addEventListener('pralaad_user_updated', handleUserUpdated);
    return () => {
      window.removeEventListener('commercial_lock_triggered', handleTrigger);
      window.removeEventListener('pralaad_user_updated', handleUserUpdated);
    };
  }, []);

  const [activeTab, setActiveTab] = useState('dashboard');
  const [developerContactOpen, setDeveloperContactOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [mobileSearchOpen, setMobileSearchOpen] = useState(false);

  // Creatio Multi-Tab Window Dock State
  const [openTabs, setOpenTabs] = useState([
    { id: 'dashboard', label: 'Home Page', icon: LayoutDashboard, color: 'bg-fuchsia-600', closable: false }
  ]);

  // Top Bar Dropdowns & Filters
  const [branchDropdownOpen, setBranchDropdownOpen] = useState(false);
  const [selectedBranch, setSelectedBranch] = useState('MAIN BRANCH (FD, RD, MIS)');
  const [branchesList, setBranchesList] = useState([
    'MAIN BRANCH (FD, RD, MIS)',
    'TARPL SAVINGS BRANCH (Savings Accounts)'
  ]);

  useEffect(() => {
    fetch(`${getApiBase()}/branches`)
      .then(res => res.json())
      .then(data => {
        if (data && data.success && Array.isArray(data.branches) && data.branches.length > 0) {
          const list = data.branches.map(b => b.branch_name);
          setBranchesList(list);
          if (list.length > 0 && !list.includes(selectedBranch)) {
            setSelectedBranch(list[0]);
          }
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
  const [searchResults, setSearchResults] = useState({ customers: [], accounts: [] });
  const [searchLoading, setSearchLoading] = useState(false);
  const searchContainerRef = useRef(null);
  const searchInputRef = useRef(null);

  const branchRef = useRef(null);
  const fyRef = useRef(null);
  const notifRef = useRef(null);
  const profileRef = useRef(null);

  // Live debounced search
  useEffect(() => {
    if (!globalSearch || globalSearch.trim().length === 0) {
      setSearchResults({ customers: [], accounts: [] });
      setSearchLoading(false);
      return;
    }
    const timer = setTimeout(async () => {
      setSearchLoading(true);
      try {
        const res = await apiRequest(`/global-search?q=${encodeURIComponent(globalSearch.trim())}`);
        if (res && res.success) {
          setSearchResults({ customers: res.customers || [], accounts: res.accounts || [] });
        }
      } catch (err) {
        console.error('Search error:', err);
      } finally {
        setSearchLoading(false);
      }
    }, 150);
    return () => clearTimeout(timer);
  }, [globalSearch]);

  // Global Ctrl+K hotkey
  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        searchInputRef.current?.focus();
        setSearchFocused(true);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

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
  const [rdCustomerId, setRdCustomerId] = useState(null);
  const [rdRefreshKey, setRdRefreshKey] = useState(0);

  const [newMISModalOpen, setNewMISModalOpen] = useState(false);
  const [misCustomerId, setMisCustomerId] = useState(null);
  const [misRefreshKey, setMisRefreshKey] = useState(0);

  const [newSavingsModalOpen, setNewSavingsModalOpen] = useState(false);
  const [savingsCustomerId, setSavingsCustomerId] = useState(null);
  const [customerPortfolioModalOpen, setCustomerPortfolioModalOpen] = useState(false);
  const [portfolioCustomerId, setPortfolioCustomerId] = useState(null);
  const [portfolioInitialTab, setPortfolioInitialTab] = useState('OVERVIEW');
  const [refreshKey, setRefreshKey] = useState(0);

  // Core Banking Accounting & SMS Modals / Dropdowns
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
      if (searchContainerRef.current && !searchContainerRef.current.contains(event.target)) {
        setSearchFocused(false);
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

  const crmSystemFunctions = useMemo(() => [
    {
      id: 'fds',
      title: 'Fixed Deposits (FD)',
      subtitle: 'FD Bookings, Certificates, Foreclosures & Renewals',
      hindi: 'सावधि जमा (FD)',
      keywords: ['fd', 'fixed deposit', 'saving', 'interest', 'certificate', 'renewal', 'foreclosure', 'एफडी', 'सावधि'],
      category: 'Deposit Products',
      icon: FolderLock,
      color: 'bg-indigo-600',
      action: () => handleSwitchTab('fds', 'Fixed Deposits (FD)', FolderLock, 'bg-indigo-600')
    },
    {
      id: 'rds',
      title: 'Recurring Deposits (RD)',
      subtitle: 'Monthly Installments, Late Fees, Passbook & Schemes',
      hindi: 'आवर्ती जमा (RD)',
      keywords: ['rd', 'recurring', 'installment', 'monthly', 'kist', 'किस्त', 'आवर्ती'],
      category: 'Deposit Products',
      icon: Repeat,
      color: 'bg-cyan-600',
      action: () => handleSwitchTab('rds', 'Recurring Deposits (RD)', Repeat, 'bg-cyan-600')
    },
    {
      id: 'mis',
      title: 'Monthly Income Scheme (MIS)',
      subtitle: 'Monthly Payouts, 60-Month Schedules & Payout Disbursals',
      hindi: 'मासिक आय योजना (MIS)',
      keywords: ['mis', 'monthly income', 'payout', 'pension', 'monthly interest', 'एमआईएस', 'मासिक आय'],
      category: 'Deposit Products',
      icon: Coins,
      color: 'bg-teal-600',
      action: () => handleSwitchTab('mis', 'Monthly Income (MIS)', Coins, 'bg-teal-600')
    },
    {
      id: 'savings',
      title: 'Savings Accounts (SB)',
      subtitle: 'Passbook, Cash Deposits, Cash Withdrawals & Interest',
      hindi: 'बचत खाता (Savings)',
      keywords: ['savings', 'saving', 'sb', 'deposit', 'withdrawal', 'khata', 'cash', 'बचत', 'जमा', 'निकासी'],
      category: 'Deposit Products',
      icon: Wallet,
      color: 'bg-emerald-600',
      action: () => handleSwitchTab('savings', 'Savings Accounts (SB)', Wallet, 'bg-emerald-600')
    },
    {
      id: 'customers',
      title: 'Customers & Members (सदस्य)',
      subtitle: 'Member Directory, KYC Verification, Aadhaar/PAN & 360° Passbook',
      hindi: 'ग्राहक / सदस्य डायरेक्टरी',
      keywords: ['customer', 'customers', 'member', 'members', 'kyc', 'aadhaar', 'pan', 'passbook', 'profile', 'सदस्य', 'ग्राहक'],
      category: 'Members & KYC',
      icon: Users,
      color: 'bg-teal-600',
      action: () => handleSwitchTab('customers', 'Customers & KYC 360', Users, 'bg-teal-600')
    },
    {
      id: 'day_book',
      title: 'Day Book (9 Ledgers)',
      subtitle: 'Daily Cash Book, Bank Ledger & Real-Time Balancing',
      hindi: 'डे बुक (9 लेजर)',
      keywords: ['day book', 'daybook', 'ledger', 'cash book', 'accounting', 'journal', 'voucher', 'रोजनामचा', 'खाता', 'डे बुक'],
      category: 'Accounting & Finance',
      icon: BookOpen,
      color: 'bg-amber-600',
      action: () => handleSwitchTab('day_book', 'Day Book (9 Ledgers)', BookOpen, 'bg-amber-600')
    },
    {
      id: 'daily_collection',
      title: 'Daily Collection',
      subtitle: 'Agent Field Collections, Daily Sheets & Summaries',
      hindi: 'दैनिक संग्रह',
      keywords: ['daily collection', 'collection', 'field', 'recovery', 'collector', 'कलेक्शन', 'वसूली'],
      category: 'Accounting & Field',
      icon: Coins,
      color: 'bg-emerald-600',
      action: () => handleSwitchTab('daily_collection', 'Daily Collection', Coins, 'bg-emerald-600')
    },
    {
      id: 'gold_loan',
      title: 'Gold Loan (गोल्ड लोन)',
      subtitle: 'Gold Appraisal, Valuation, Disbursals & Repayments',
      hindi: 'स्वर्ण ऋण (गोल्ड लोन)',
      keywords: ['gold', 'gold loan', 'ornament', 'jewel', 'karat', 'गोल्ड', 'सोना', 'स्वर्ण'],
      category: 'Loans & Advances',
      icon: Gem,
      color: 'bg-amber-600',
      action: () => handleSwitchTab('gold_loan', 'Gold Loan (गोल्ड लोन)', Gem, 'bg-amber-600')
    },
    {
      id: 'loans',
      title: 'Loan Against Deposit (LAD)',
      subtitle: 'LAD Against FD/RD/MIS with Lien Marking',
      hindi: 'डिपॉजिट पर ऋण (LAD)',
      keywords: ['loan', 'loans', 'lad', 'loan against deposit', 'lien', 'ऋण', 'लोन'],
      category: 'Loans & Advances',
      icon: BadgePercent,
      color: 'bg-indigo-600',
      action: () => handleSwitchTab('loans', 'Loan Against Deposit (LAD)', BadgePercent, 'bg-indigo-600')
    },
    {
      id: 'borrowings_udhar',
      title: 'Udhar Register (उधार खाता)',
      subtitle: 'Short-term Advances, Market Borrowings & Repayments',
      hindi: 'उधार खाता / रजिस्टर',
      keywords: ['udhar', 'borrowing', 'borrowings', 'advance', 'market borrowing', 'उधार', 'खाता'],
      category: 'Loans & Advances',
      icon: HandCoins,
      color: 'bg-purple-600',
      action: () => handleSwitchTab('borrowings_udhar', 'Udhar Register (उधार खाता)', HandCoins, 'bg-purple-600')
    },
    {
      id: 'schemes',
      title: 'Deposit Schemes',
      subtitle: 'Configure Interest Rates, Tenures & Compounding Rules',
      hindi: 'जमा योजनाएं',
      keywords: ['scheme', 'schemes', 'interest rate', 'rate', 'tenure', 'योजना', 'ब्याज दर'],
      category: 'Deposit Products',
      icon: Sparkles,
      color: 'bg-amber-600',
      action: () => handleSwitchTab('schemes', 'Deposit Schemes', Sparkles, 'bg-amber-600')
    },
    {
      id: 'calculator',
      title: 'Deposit Calculator',
      subtitle: 'Live Interest & Maturity Estimator for FD, RD & MIS',
      hindi: 'ब्याज कैलकुलेटर',
      keywords: ['calculator', 'calculate', 'estimate', 'maturity calculator', 'कैलकुलेटर', 'गणना'],
      category: 'Deposit Products',
      icon: Calculator,
      color: 'bg-indigo-500',
      action: () => handleSwitchTab('calculator', 'Deposit Calculator', Calculator, 'bg-indigo-500')
    },
    {
      id: 'maturity',
      title: 'Maturity Calendar',
      subtitle: 'Upcoming Maturities, Alerts & Due Payouts',
      hindi: 'परिपक्वता कैलेंडर',
      keywords: ['maturity', 'calendar', 'due', 'expiry', 'mature', 'परिपक्वता'],
      category: 'Deposit Products',
      icon: CalendarDays,
      color: 'bg-sky-600',
      action: () => handleSwitchTab('maturity', 'Maturity Calendar', CalendarDays, 'bg-sky-600')
    },
    {
      id: 'payouts',
      title: 'Interest & Payouts',
      subtitle: 'Interest Disbursals, NEFT/RTGS/Cash Approvals',
      hindi: 'ब्याज भुगतान',
      keywords: ['payout', 'payouts', 'interest payout', 'disbursal', 'भुगतान'],
      category: 'Financial Operations',
      icon: CreditCard,
      color: 'bg-orange-600',
      action: () => handleSwitchTab('payouts', 'Interest & Payouts', CreditCard, 'bg-orange-600')
    },
    {
      id: 'payments_to_collect',
      title: 'Payments to Collect',
      subtitle: 'Pending Installments, Loan EMIs & Recovery',
      hindi: 'प्राप्त करने योग्य भुगतान',
      keywords: ['collect', 'payments to collect', 'due emi', 'due installment', 'वसूली'],
      category: 'Accounting & Field',
      icon: CreditCard,
      color: 'bg-orange-600',
      action: () => handleSwitchTab('payments_to_collect', 'Payments to Collect', CreditCard, 'bg-orange-600')
    },
    {
      id: 'payments_to_release',
      title: 'Payments to Release',
      subtitle: 'Maturity Payouts & Disbursal Releases',
      hindi: 'जारी करने योग्य भुगतान',
      keywords: ['release', 'payments to release', 'disburse', 'जारी भुगतान'],
      category: 'Accounting & Field',
      icon: ArrowUpRight,
      color: 'bg-rose-600',
      action: () => handleSwitchTab('payments_to_release', 'Payments to Release', ArrowUpRight, 'bg-rose-600')
    },
    {
      id: 'reports',
      title: 'Reports & Analytics',
      subtitle: 'Financial Statements, Portfolio Growth & Branch Performance',
      hindi: 'रिपोर्ट और विश्लेषण',
      keywords: ['report', 'reports', 'analytics', 'statement', 'download excel', 'रिपोर्ट'],
      category: 'Intelligence & Reports',
      icon: BarChart3,
      color: 'bg-rose-600',
      action: () => handleSwitchTab('reports', 'Reports & Analytics', BarChart3, 'bg-rose-600')
    },
    {
      id: 'settings',
      title: 'CRM Settings & Organization',
      subtitle: 'Company Branding, Tax / GST Settings, Receipt Customization',
      hindi: 'सीआरएम सेटिंग्स',
      keywords: ['setting', 'settings', 'config', 'preference', 'company', 'brand', 'सेटिंग्स', 'कॉन्फ़िगर'],
      category: 'Administration',
      icon: SettingsIcon,
      color: 'bg-slate-600',
      action: () => handleSwitchTab('settings', 'CRM Settings', SettingsIcon, 'bg-slate-600')
    },
    {
      id: 'whatsapp',
      title: 'WhatsApp Alerts & Reminders',
      subtitle: 'Automated SMS, WhatsApp Receipts & Notifications',
      hindi: 'व्हाट्सएप अलर्ट',
      keywords: ['whatsapp', 'sms', 'message', 'alert', 'reminder', 'व्हाट्सएप', 'संदेश'],
      category: 'Administration',
      icon: MessageSquare,
      color: 'bg-emerald-600',
      action: () => handleSwitchTab('whatsapp', 'WhatsApp Alerts', MessageSquare, 'bg-emerald-600')
    },
    {
      id: 'branches',
      title: 'Branch Management',
      subtitle: 'Manage Branches, Sol IDs, Cities & Assigned Managers',
      hindi: 'शाखा प्रबंधन',
      keywords: ['branch', 'branches', 'office', 'sol id', 'शाखा'],
      category: 'Administration',
      icon: Building2,
      color: 'bg-slate-600',
      action: () => handleSwitchTab('branches', 'Branch Management', Building2, 'bg-slate-600')
    },
    {
      id: 'roles_permissions',
      title: 'Permissions & Roles',
      subtitle: 'Role-Based Access Control, Maker-Checker Matrix',
      hindi: 'अनुमतियाँ और भूमिकाएँ',
      keywords: ['role', 'roles', 'permission', 'permissions', 'access', 'security', 'अधिकार'],
      category: 'Administration',
      icon: ShieldCheck,
      color: 'bg-emerald-600',
      action: () => handleSwitchTab('roles_permissions', 'Permissions / Roles', ShieldCheck, 'bg-emerald-600')
    },
    {
      id: 'action_new_fd',
      title: '+ Book New Fixed Deposit',
      subtitle: 'Quick modal to book a new FD deposit certificate',
      hindi: '+ नई सावधि जमा (FD) बुक करें',
      keywords: ['new fd', 'book fd', 'create fd', 'add fd', 'एफडी बनाएं'],
      category: 'Quick Actions',
      icon: PlusCircle,
      color: 'bg-[#D4AF37]',
      action: () => {
        setNewFDInitialData(null);
        setNewFDModalOpen(true);
      }
    },
    {
      id: 'action_new_rd',
      title: '+ Start New Recurring Deposit (RD)',
      subtitle: 'Quick modal to start a new monthly RD scheme',
      hindi: '+ नई आवर्ती जमा (RD) शुरू करें',
      keywords: ['new rd', 'start rd', 'create rd', 'add rd', 'आरडी बनाएं'],
      category: 'Quick Actions',
      icon: PlusCircle,
      color: 'bg-cyan-600',
      action: () => {
        setRdCustomerId(null);
        setNewRDModalOpen(true);
      }
    },
    {
      id: 'action_new_mis',
      title: '+ Open Monthly Income Scheme (MIS)',
      subtitle: 'Quick modal to open a new 60-month MIS investment',
      hindi: '+ नई मासिक आय योजना (MIS) खोलें',
      keywords: ['new mis', 'start mis', 'create mis', 'add mis', 'एमआईएस खोलें'],
      category: 'Quick Actions',
      icon: PlusCircle,
      color: 'bg-teal-600',
      action: () => {
        setMisCustomerId(null);
        setNewMISModalOpen(true);
      }
    },
    {
      id: 'action_new_savings',
      title: '+ Open Savings Account (SB)',
      subtitle: 'Quick modal to register a new member Savings Account',
      hindi: '+ नया बचत खाता (SB) खोलें',
      keywords: ['new savings', 'open savings', 'create savings', 'add sb', 'बचत खाता खोलें'],
      category: 'Quick Actions',
      icon: PlusCircle,
      color: 'bg-emerald-600',
      action: () => {
        setSavingsCustomerId(null);
        setNewSavingsModalOpen(true);
      }
    },
    {
      id: 'action_journal_voucher',
      title: '+ Post Journal Voucher (Day Book)',
      subtitle: 'Post debit/credit transaction voucher into 9 ledgers',
      hindi: '+ नया जर्नल वाउचर पोस्ट करें',
      keywords: ['journal', 'voucher', 'voucher entry', 'post voucher', 'वाउचर'],
      category: 'Quick Actions',
      icon: PlusCircle,
      color: 'bg-amber-600',
      action: () => setJournalEntryModalOpen(true)
    }
  ], []);

  const matchingFunctions = useMemo(() => {
    const q = (globalSearch || '').trim().toLowerCase();
    if (!q) return [];
    return crmSystemFunctions.filter(fn => {
      if (fn.title.toLowerCase().includes(q)) return true;
      if (fn.subtitle?.toLowerCase().includes(q)) return true;
      if (fn.hindi?.toLowerCase().includes(q)) return true;
      return fn.keywords.some(k => k.includes(q) || q.includes(k));
    });
  }, [globalSearch, crmSystemFunctions]);

  const handleSearchKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      if (matchingFunctions.length > 0) {
        matchingFunctions[0].action();
        setSearchFocused(false);
        setMobileSearchOpen(false);
      } else if (searchResults.customers && searchResults.customers.length > 0) {
        const firstCust = searchResults.customers[0];
        setPortfolioCustomerId(firstCust.id);
        setCustomerPortfolioModalOpen(true);
        setSearchFocused(false);
        setMobileSearchOpen(false);
      } else if (searchResults.accounts && searchResults.accounts.length > 0 && searchResults.accounts[0].customer_id) {
        setPortfolioCustomerId(searchResults.accounts[0].customer_id);
        setCustomerPortfolioModalOpen(true);
        setSearchFocused(false);
        setMobileSearchOpen(false);
      } else if (globalSearch.trim()) {
        handleSwitchTab('customers', 'Customers (सदस्य)', Users, 'bg-indigo-600');
        setSearchFocused(false);
        setMobileSearchOpen(false);
      }
    } else if (e.key === 'Escape') {
      setSearchFocused(false);
      setMobileSearchOpen(false);
    }
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

  if (!token) {
    return <Login onLoginSuccess={handleLoginSuccess} />;
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
        { id: 'users', label: 'Staff & Roles Admin', icon: UserCheck, color: 'bg-indigo-600', badge: 'Admin' },
        { id: 'staff_permissions', label: 'Staff Guard Matrix', icon: ShieldCheck, color: 'bg-cyan-600', badge: 'Security' },
        { id: 'audit_logs', label: 'Audit Trail (एंटी-फ्रॉड)', icon: ShieldCheck, color: 'bg-rose-600', badge: 'Anti-Fraud' }
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

  const renderSearchDropdownContent = () => (
    <>
      {/* Scrollable Results Body */}
      <div className="overflow-y-auto flex-1 p-2 space-y-3">
        {/* 1. CRM FUNCTIONS & SETTINGS MATCHES */}
        {matchingFunctions.length > 0 && (
          <div className="p-2 border-b border-slate-100 bg-slate-50/70 rounded-xl">
            <div className="px-2 py-1 text-[10px] font-bold text-slate-500 uppercase tracking-wider flex items-center justify-between">
              <span>CRM Functions & Settings ({matchingFunctions.length})</span>
              <span className="text-[9px] text-amber-700 font-semibold">Direct Jump</span>
            </div>
            <div className="space-y-1 mt-1">
              {matchingFunctions.slice(0, 6).map((fn) => {
                const FnIcon = fn.icon;
                return (
                  <button
                    key={fn.id}
                    type="button"
                    onClick={() => {
                      fn.action();
                      setSearchFocused(false);
                      setMobileSearchOpen(false);
                    }}
                    className="w-full text-left p-2 rounded-xl hover:bg-white hover:shadow-xs transition flex items-center justify-between group cursor-pointer border border-transparent hover:border-amber-200"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className={`w-8 h-8 rounded-lg ${fn.color} text-white flex items-center justify-center shrink-0 shadow-xs group-hover:scale-105 transition`}>
                        <FnIcon className="w-4 h-4" />
                      </div>
                      <div className="min-w-0">
                        <div className="font-bold text-xs text-slate-900 group-hover:text-amber-700 truncate flex items-center gap-1.5">
                          <span>{fn.title}</span>
                          {fn.hindi && (
                            <span className="text-[10px] text-slate-500 font-normal">({fn.hindi})</span>
                          )}
                        </div>
                        <div className="text-[11px] text-slate-500 truncate">
                          {fn.subtitle}
                        </div>
                      </div>
                    </div>
                    <span className="text-[10px] font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full shrink-0 group-hover:bg-amber-600 group-hover:text-white transition">
                      Open →
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* 2. MEMBERS SECTION WITH DIRECT ACTION BUTTONS */}
        {searchResults.customers && searchResults.customers.length > 0 && (
          <div>
            <div className="px-2 py-1 text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center justify-between">
              <span>Members / Depositors ({searchResults.customers.length})</span>
              <span className="text-[9px] text-indigo-600 font-semibold">Click to open 360° Passbook</span>
            </div>
            <div className="space-y-2 mt-1">
              {searchResults.customers.map((c) => (
                <div
                  key={c.id}
                  className="p-2.5 rounded-xl border border-slate-200/80 bg-white hover:border-indigo-200 hover:shadow-xs transition"
                >
                  <div
                    onClick={() => {
                      setPortfolioCustomerId(c.id);
                      setCustomerPortfolioModalOpen(true);
                      setSearchFocused(false);
                      setMobileSearchOpen(false);
                    }}
                    className="flex items-center justify-between cursor-pointer group"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="w-8 h-8 rounded-lg bg-indigo-600 text-white font-bold flex items-center justify-center text-xs shrink-0 group-hover:scale-105 transition">
                        {c.full_name?.charAt(0) || 'M'}
                      </div>
                      <div className="min-w-0">
                        <div className="font-bold text-xs text-slate-900 group-hover:text-indigo-700 truncate flex items-center gap-1.5">
                          <span>{c.full_name}</span>
                          <span className="text-[10px] font-mono font-semibold px-1.5 py-0.2 bg-slate-100 text-slate-600 rounded">
                            {c.customer_code}
                          </span>
                        </div>
                        <div className="text-[11px] text-slate-500">
                          📞 {c.phone} {c.pan_card ? `• PAN: ${c.pan_card}` : ''}
                        </div>
                      </div>
                    </div>

                    {/* Product Counts Badges */}
                    <div className="flex items-center gap-1 shrink-0 ml-2">
                      {c.fds_count > 0 && (
                        <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800">
                          FD:{c.fds_count}
                        </span>
                      )}
                      {c.rds_count > 0 && (
                        <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-cyan-100 text-cyan-800">
                          RD:{c.rds_count}
                        </span>
                      )}
                      {c.mis_count > 0 && (
                        <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-blue-100 text-blue-800">
                          MIS:{c.mis_count}
                        </span>
                      )}
                      {c.savings_count > 0 && (
                        <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-amber-100 text-amber-800">
                          SB:{c.savings_count}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Interconnected Direct Action Buttons Row */}
                  <div className="mt-2 pt-2 border-t border-slate-100 flex items-center gap-1.5 flex-wrap">
                    <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider mr-0.5">Quick Actions:</span>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setNewFDInitialData({ customer_id: c.id, customerId: c.id });
                        setNewFDModalOpen(true);
                        setSearchFocused(false);
                        setMobileSearchOpen(false);
                      }}
                      className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-800 hover:bg-emerald-600 hover:text-white border border-emerald-200 transition cursor-pointer"
                    >
                      + Book FD
                    </button>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setRdCustomerId(c.id);
                        setNewRDModalOpen(true);
                        setSearchFocused(false);
                        setMobileSearchOpen(false);
                      }}
                      className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-cyan-50 text-cyan-800 hover:bg-cyan-600 hover:text-white border border-cyan-200 transition cursor-pointer"
                    >
                      + Start RD
                    </button>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setMisCustomerId(c.id);
                        setNewMISModalOpen(true);
                        setSearchFocused(false);
                        setMobileSearchOpen(false);
                      }}
                      className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-blue-50 text-blue-800 hover:bg-blue-600 hover:text-white border border-blue-200 transition cursor-pointer"
                    >
                      + Start MIS
                    </button>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setSavingsCustomerId(c.id);
                        setNewSavingsModalOpen(true);
                        setSearchFocused(false);
                        setMobileSearchOpen(false);
                      }}
                      className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-amber-50 text-amber-800 hover:bg-amber-600 hover:text-white border border-amber-200 transition cursor-pointer"
                    >
                      + Savings A/c
                    </button>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setPortfolioCustomerId(c.id);
                        setCustomerPortfolioModalOpen(true);
                        setSearchFocused(false);
                        setMobileSearchOpen(false);
                      }}
                      className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-indigo-50 text-indigo-800 hover:bg-indigo-600 hover:text-white border border-indigo-200 transition cursor-pointer ml-auto"
                    >
                      👤 360° Passbook →
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 3. ACCOUNTS SECTION */}
        {searchResults.accounts && searchResults.accounts.length > 0 && (
          <div>
            <div className="px-2 py-1 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
              Accounts & Contracts ({searchResults.accounts.length})
            </div>
            <div className="space-y-1 mt-1">
              {searchResults.accounts.map((acc, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => {
                    if (acc.customer_id) {
                      setPortfolioCustomerId(acc.customer_id);
                      setCustomerPortfolioModalOpen(true);
                    }
                    setSearchFocused(false);
                    setMobileSearchOpen(false);
                  }}
                  className="w-full text-left p-2 rounded-xl hover:bg-slate-50 transition flex items-center justify-between group cursor-pointer"
                >
                  <div>
                    <div className="font-mono font-bold text-xs text-slate-900 flex items-center gap-1.5">
                      <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                        acc.product_type === 'FD' ? 'bg-emerald-100 text-emerald-800' :
                        acc.product_type === 'RD' ? 'bg-cyan-100 text-cyan-800' :
                        acc.product_type === 'MIS' ? 'bg-blue-100 text-blue-800' : 'bg-purple-100 text-purple-800'
                      }`}>
                        {acc.product_type}
                      </span>
                      <span>{acc.account_number}</span>
                    </div>
                    <div className="text-[11px] text-slate-500">
                      {acc.customer_name} • ₹{Number(acc.amount || 0).toLocaleString('en-IN')}
                    </div>
                  </div>
                  <span className="text-[10px] font-bold text-slate-400 group-hover:text-indigo-600">
                    View →
                  </span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* 4. NO RESULTS FOUND */}
        {matchingFunctions.length === 0 &&
         (!searchResults.customers || searchResults.customers.length === 0) &&
         (!searchResults.accounts || searchResults.accounts.length === 0) && !searchLoading && (
          <div className="py-6 text-center text-xs text-slate-500">
            <p className="font-semibold text-slate-700">No member, account, or function found for "{globalSearch}"</p>
            <p className="text-[11px] text-slate-400 mt-1">Press ↵ Enter to search in Customers Directory</p>
          </div>
        )}
      </div>

      {/* Dropdown Footer */}
      <div className="p-2.5 bg-slate-50 flex items-center justify-between text-[11px] text-slate-500 shrink-0">
        <span className="flex items-center gap-1">
          <span className="px-1.5 py-0.5 bg-white border border-slate-200 rounded font-mono font-bold text-[10px]">↵ Enter</span>
          <span>Open match or 360° Passbook</span>
        </span>
        <button
          type="button"
          onClick={() => {
            handleSwitchTab('customers', 'Customers (सदस्य)', Users, 'bg-indigo-600');
            setSearchFocused(false);
            setMobileSearchOpen(false);
          }}
          className="font-bold text-indigo-600 hover:text-indigo-800 cursor-pointer"
        >
          All Customers →
        </button>
      </div>
    </>
  );

  return (
    <div className="min-h-screen max-w-full overflow-x-hidden bg-[#FAF8F5] text-slate-900 flex font-sans selection:bg-[#D4AF37] selection:text-[#062319]">
      
      {/* Mobile Drawer Backdrop Overlay */}
      {mobileMenuOpen && (
        <div 
          className="fixed inset-0 bg-slate-950/70 backdrop-blur-xs z-35 md:hidden animate-fadeIn"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}

      {/* ======================================================== */}
      {/* 1. ENTERPRISE FINTECH DARK FOREST GREEN SIDEBAR           */}
      {/* ======================================================== */}
      <aside className={`
        fixed inset-y-0 left-0 z-40 bg-[#062319] text-slate-300 border-r border-[#134e38] flex flex-col h-screen max-h-screen overflow-hidden transition-all duration-300 ease-in-out
        ${sidebarCollapsed ? 'w-20' : 'w-72'}
        ${mobileMenuOpen ? 'translate-x-0 shadow-2xl' : '-translate-x-full md:translate-x-0'}
      `}>
        
        {/* Top: Logo & Collapse Button */}
        <div className="h-16 flex items-center justify-between px-3.5 border-b border-[#134e38] shrink-0">
          <div 
            onClick={() => handleSwitchTab('dashboard', 'Executive Dashboard', LayoutDashboard, 'bg-emerald-700')}
            className="flex items-center gap-2 cursor-pointer flex-1 min-w-0"
          >
            <TarplLogo variant={sidebarCollapsed ? 'icon' : 'full'} />
          </div>

          {/* Desktop Collapse Toggle */}
          <button
            onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
            className="hidden md:flex p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-[#0a3d2b] transition cursor-pointer shrink-0 ml-1"
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
        <nav className="flex-1 min-h-0 overflow-y-auto p-3 space-y-4">
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

        {/* Bottom User / Status Strip */}
        <div className="p-3 border-t border-[#134e38] bg-[#062319] shrink-0">
          {!sidebarCollapsed ? (
            <div className="bg-[#082e20] rounded-xl p-2.5 border border-[#1a5d43] flex items-center justify-between shadow-sm">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-9 h-9 rounded-lg bg-[#D4AF37] text-[#062319] flex items-center justify-center font-black text-xs shrink-0 shadow-sm ring-2 ring-[#D4AF37]/50">
                  {user?.full_name ? user.full_name.slice(0, 2).toUpperCase() : 'SY'}
                </div>
                <div className="min-w-0 text-left">
                  <div className="text-xs font-bold text-white truncate" title={user?.full_name || 'System Administrator'}>
                    {user?.full_name || 'System Administrator'}
                  </div>
                  <div className="text-[11px] text-amber-300 truncate flex items-center gap-1.5 font-medium mt-0.5">
                    <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
                    {isEmployee ? 'Staff Maker' : 'Super Admin'}
                  </div>
                </div>
              </div>
              <button
                onClick={handleLogout}
                title="Logout from CRM"
                className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-[#0a3d2b] rounded-lg transition cursor-pointer shrink-0 ml-1"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <div className="flex justify-center py-2">
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
        flex-1 flex flex-col min-w-0 max-w-full overflow-x-hidden transition-all duration-300 ease-in-out
        ${sidebarCollapsed ? 'md:ml-20' : 'md:ml-72'}
      `}>
        
        {/* Deep Forest Green Header Bar */}
        <header className="h-16 bg-[#082e20] text-white border-b border-[#1a5d43] sticky top-0 z-30 px-3 sm:px-4 md:px-5 flex items-center justify-between gap-2 shadow-md w-full max-w-full">
          
          {/* Left: Mobile Toggle, Quick Booking, Search Bar & Primary Ledgers */}
          <div className="flex items-center gap-1.5 min-w-0 flex-1">
            <button
              onClick={() => setMobileMenuOpen(true)}
              className="md:hidden p-1.5 rounded-lg text-slate-300 hover:bg-[#0a3d2b] cursor-pointer"
            >
              <Menu className="w-5 h-5" />
            </button>

            {/* Mobile Search Toggle */}
            <button
              onClick={() => {
                setMobileSearchOpen(!mobileSearchOpen);
                if (!mobileSearchOpen) {
                  setTimeout(() => searchInputRef.current?.focus(), 100);
                }
              }}
              className="md:hidden p-1.5 rounded-lg text-emerald-300 hover:text-white hover:bg-[#0a3d2b] cursor-pointer"
              title="Search CRM"
            >
              <Search className="w-4 h-4" />
            </button>

            {/* Quick Process Action Button */}
            <button 
              onClick={() => {
                setNewFDInitialData(null);
                setNewFDModalOpen(true);
              }}
              className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-[#D4AF37] hover:bg-[#C59B27] text-[#062319] font-bold text-xs shadow-xs transition cursor-pointer shrink-0"
              title="Quick New Deposit Booking"
            >
              <PlusCircle className="w-3.5 h-3.5" />
              <span className="hidden 2xl:inline">New Booking</span>
            </button>

            {/* Global Search Bar with Live Multi-Product Dropdown & Ctrl+K */}
            <div className="hidden xl:flex items-center relative flex-1 min-w-[110px] max-w-[175px] transition-all duration-200" ref={searchContainerRef}>
              <Search className="w-3.5 h-3.5 text-emerald-400 absolute left-2.5 top-2.5 pointer-events-none" />
              <input
                ref={searchInputRef}
                type="text"
                value={globalSearch}
                onChange={(e) => {
                  setGlobalSearch(e.target.value);
                  setSearchFocused(true);
                }}
                onFocus={() => setSearchFocused(true)}
                onKeyDown={handleSearchKeyDown}
                placeholder="Search member, mobile, FD..."
                className="w-full text-xs pl-7 pr-12 py-1.5 bg-[#062319] text-white placeholder-emerald-300/60 border border-[#1a5d43] rounded-lg focus:outline-none focus:border-[#D4AF37] focus:ring-1 focus:ring-[#D4AF37]/50 transition"
              />
              <div className="absolute right-1.5 top-1.5 flex items-center gap-1">
                {searchLoading && (
                  <div className="w-3 h-3 border-2 border-amber-400 border-t-transparent rounded-full animate-spin"></div>
                )}
                <span className="text-[9px] font-mono text-amber-300 bg-[#082e20] px-1 py-0.5 rounded border border-[#1a5d43] pointer-events-none">
                  Ctrl K
                </span>
              </div>

              {/* LIVE DROPDOWN RESULTS */}
              {searchFocused && globalSearch.trim().length > 0 && (
                <div className="absolute top-full left-0 mt-1.5 w-[94vw] sm:w-[500px] md:w-[560px] max-w-[95vw] bg-white rounded-2xl shadow-2xl border border-slate-200 z-[150] overflow-hidden text-slate-800 animate-fadeIn divide-y divide-slate-100 max-h-[80vh] flex flex-col">
                  {renderSearchDropdownContent()}
                </div>
              )}
            </div>

            {/* Direct DAY BOOK Navigation Button (1:1 with Prahlad Top Navbar) */}
            <button
              onClick={() => handleSwitchTab('day_book', 'Day Book', BookOpen, 'bg-amber-600')}
              className={`hidden md:inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-xs font-bold transition cursor-pointer shrink-0 ${
                activeTab === 'day_book'
                  ? 'bg-[#D4AF37] text-[#062319] border-[#D4AF37] shadow-xs'
                  : 'bg-[#062319] hover:bg-[#0a3d2b] border-[#1a5d43] text-amber-300'
              }`}
              title="Open Day Book (Prahlad 1:1 Format)"
            >
              <BookOpen className="w-3.5 h-3.5" />
              <span>Day Book</span>
            </button>

            {/* Direct DAILY COLLECTION button with NEW badge (Visible on wide screens) */}
            <button
              onClick={() => handleSwitchTab('daily_collection', 'Daily Collection', Coins, 'bg-emerald-600')}
              className={`hidden 2xl:inline-flex items-center gap-1 px-2 py-1.5 rounded-lg border text-xs font-bold transition cursor-pointer shrink-0 ${
                activeTab === 'daily_collection'
                  ? 'bg-emerald-600 text-white border-emerald-400'
                  : 'bg-emerald-950/70 hover:bg-emerald-900 border-emerald-500/40 text-emerald-200'
              }`}
              title="Daily Field Collection"
            >
              <Coins className="w-3.5 h-3.5 text-emerald-400" />
              <span>Collection</span>
              <span className="text-[9px] bg-emerald-500 text-slate-950 font-black px-1 rounded">NEW</span>
            </button>

            {/* ACCOUNTS Dropdown (Visible on extra-wide screens; always in sidebar & Day Book) */}
            <div className="relative hidden 2xl:block shrink-0" ref={accountsRef}>
              <button
                onClick={() => setAccountsDropdownOpen(!accountsDropdownOpen)}
                className="flex items-center gap-1 px-2 py-1.5 rounded-lg bg-[#062319] hover:bg-[#0a3d2b] border border-[#1a5d43] text-xs font-bold text-amber-300 uppercase tracking-wider transition cursor-pointer shrink-0"
                title="Banking Accounts & Ledgers"
              >
                <span>Accounts</span>
                <ChevronDown className="w-3 h-3 text-amber-400" />
              </button>

              {accountsDropdownOpen && (
                <div className="absolute left-0 mt-2 w-64 bg-white rounded-xl shadow-2xl border border-slate-200 p-1.5 z-[100] text-xs text-slate-800 animate-fadeIn ring-1 ring-black/10">
                  <div className="px-3 py-1.5 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                    Core Banking Ledgers & Tools
                  </div>
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
                      setScheduleSmsModalOpen(true);
                      setAccountsDropdownOpen(false);
                    }}
                    className="w-full text-left px-3 py-2 rounded-lg hover:bg-slate-50 font-medium text-slate-700 flex items-center gap-2 cursor-pointer"
                  >
                    <MessageSquare className="w-3.5 h-3.5 text-blue-600" />
                    <span>Schedule SMS Alert</span>
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
          </div>

          {/* Right: Branch Selector, FY Selector, Notifications, Customer App, Profile */}
          <div className="flex items-center gap-1 sm:gap-1.5 shrink-0 ml-2">

            {/* 1. Branch Selector */}
            <div className="relative" ref={branchRef}>
              <button
                onClick={() => setBranchDropdownOpen(!branchDropdownOpen)}
                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-[#062319] hover:bg-[#0a3d2b] border border-[#1a5d43] text-xs font-semibold text-white transition cursor-pointer shadow-xs"
                title="Select Operating Branch Desk"
              >
                <Building2 className="w-3.5 h-3.5 text-[#D4AF37] shrink-0" />
                <span className="hidden sm:inline max-w-[115px] truncate text-[11px] font-bold text-amber-200">
                  {selectedBranch.includes('SAVINGS') ? 'Savings Desk' : 'FD/RD/MIS Desk'}
                </span>
                <ChevronDown className="w-3 h-3 text-emerald-300 shrink-0" />
              </button>

              {branchDropdownOpen && (
                <div className="absolute right-0 mt-2 w-80 bg-white rounded-2xl shadow-2xl border border-slate-200 p-2 z-[100] text-xs text-slate-800 animate-fadeIn ring-1 ring-black/10">
                  <div className="px-3 py-1.5 text-[10px] font-black text-slate-400 uppercase tracking-wider flex items-center justify-between border-b border-slate-100 pb-2 mb-1">
                    <span>Select Operating Desk / Branch</span>
                    <span className="text-[9px] bg-emerald-100 text-emerald-800 px-1.5 py-0.5 rounded font-bold">2 Branches</span>
                  </div>
                  {branches.map(b => {
                    const isSavings = b.toUpperCase().includes('SAVING');
                    const isSelected = selectedBranch === b;
                    return (
                      <button
                        key={b}
                        onClick={() => {
                          setSelectedBranch(b);
                          setBranchDropdownOpen(false);
                        }}
                        className={`w-full text-left p-2.5 rounded-xl transition flex items-start justify-between cursor-pointer my-1 ${
                          isSelected 
                            ? 'bg-emerald-50 text-emerald-950 font-bold border border-emerald-300 shadow-xs' 
                            : 'hover:bg-slate-50 text-slate-700 border border-transparent'
                        }`}
                      >
                        <div className="min-w-0 pr-2">
                          <div className="text-xs font-bold text-slate-900 truncate">
                            {b}
                          </div>
                          <div className="text-[10px] text-slate-500 mt-0.5 font-medium">
                            {isSavings ? 'Savings, Daily Accounts & Withdrawal Desk' : 'Fixed Deposits (FD), RD & MIS Operations'}
                          </div>
                        </div>
                        {isSelected && <Check className="w-4 h-4 text-emerald-700 shrink-0 mt-0.5" />}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            {/* 2. Financial Year (FY) Filter */}
            <div className="relative" ref={fyRef}>
              <button
                onClick={() => setFyDropdownOpen(!fyDropdownOpen)}
                className="flex items-center gap-0.5 px-2 py-1.5 rounded-lg bg-[#062319] hover:bg-[#0a3d2b] border border-[#1a5d43] text-xs font-semibold text-white transition cursor-pointer"
                title="Financial Year Filter"
              >
                <span className="font-mono text-[#FBBF24] font-bold text-xs">{(selectedFY || 'FY 2026-27').replace('FY ', '')}</span>
                <ChevronDown className="w-3 h-3 text-emerald-300" />
              </button>

              {fyDropdownOpen && (
                <div className="absolute right-0 mt-2 w-44 bg-white rounded-xl shadow-2xl border border-slate-200 p-1.5 z-[100] text-xs text-slate-800 animate-fadeIn ring-1 ring-black/10">
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
              className="flex items-center gap-0.5 px-1.5 py-1.5 rounded-lg bg-[#062319] hover:bg-[#0a3d2b] border border-[#1a5d43] text-xs font-bold text-white transition cursor-pointer"
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
                <div className="absolute right-0 mt-2 w-80 bg-white rounded-xl shadow-2xl border border-slate-200 p-3 z-[100] text-xs text-slate-800 animate-fadeIn ring-1 ring-black/10">
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

            {/* 6. Download APK (Admin & Staff) */}
            <a
              href="/Taranganjali_Banking.apk"
              download="Taranganjali_Banking.apk"
              className="flex items-center gap-1.5 px-2 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-xs transition shrink-0"
              title="Download Android APK File for Mobile"
            >
              <Download className="w-3.5 h-3.5" />
              <span className="hidden 2xl:inline">APK</span>
            </a>

            {/* 7. Direct Logout Button */}
            <button
              onClick={handleLogout}
              className="hidden lg:flex items-center gap-1 px-2 py-1.5 rounded-lg bg-rose-600/20 hover:bg-rose-600 text-rose-300 hover:text-white border border-rose-500/40 text-xs font-bold transition cursor-pointer shadow-xs shrink-0"
              title="Logout from CRM"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span className="hidden 2xl:inline">Logout</span>
            </button>

            {/* 8. User Profile Menu */}
            <div className="relative pl-1 border-l border-[#1a5d43] shrink-0" ref={profileRef}>
              <button
                onClick={() => setProfileDropdownOpen(!profileDropdownOpen)}
                className="flex items-center gap-1.5 px-2 py-1 rounded-lg bg-[#062319] hover:bg-[#0a3d2b] border border-[#1a5d43] transition cursor-pointer"
              >
                <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-indigo-500 to-indigo-700 text-white font-bold text-xs flex items-center justify-center shadow-xs ring-1 ring-indigo-400/30 shrink-0">
                  {user?.full_name ? user.full_name.slice(0, 2).toUpperCase() : 'AD'}
                </div>
                <div className="hidden xl:block text-left">
                  <div className="text-xs font-bold text-white leading-tight max-w-[100px] truncate">
                    {user?.full_name || (isEmployee ? 'Staff Maker' : 'Admin')}
                  </div>
                  <div className="text-[9px] text-teal-400 font-semibold">{isEmployee ? 'Staff Maker' : 'Super Admin'}</div>
                </div>
                <ChevronDown className="w-3 h-3 text-slate-400 shrink-0" />
              </button>

              {profileDropdownOpen && (
                <div className="absolute right-0 mt-2 w-52 bg-white rounded-xl shadow-2xl border border-slate-200 p-1.5 z-[100] text-xs text-slate-800 animate-fadeIn ring-1 ring-black/10">
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
                  <button
                    onClick={() => { setDeveloperContactOpen(true); setProfileDropdownOpen(false); }}
                    className="w-full text-left px-3 py-2 rounded-lg hover:bg-slate-50 text-slate-700 font-medium flex items-center gap-2 cursor-pointer"
                  >
                    <Globe className="w-3.5 h-3.5 text-emerald-600" /> Contact Us / Support
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

        {/* Expandable Mobile Search Bar */}
        {mobileSearchOpen && (
          <div className="md:hidden bg-[#062319] p-2.5 border-b border-[#1a5d43] relative z-25 animate-fadeIn">
            <div className="relative">
              <Search className="w-4 h-4 text-emerald-400 absolute left-3 top-2.5 pointer-events-none" />
              <input
                type="text"
                value={globalSearch}
                onChange={(e) => {
                  setGlobalSearch(e.target.value);
                  setSearchFocused(true);
                }}
                onFocus={() => setSearchFocused(true)}
                onKeyDown={handleSearchKeyDown}
                placeholder="Search member, FD, RD, settings..."
                autoFocus
                className="w-full text-xs pl-8 pr-10 py-2 bg-[#082e20] text-white placeholder-emerald-300/60 border border-[#1a5d43] rounded-lg focus:outline-none focus:border-[#D4AF37]"
              />
              {globalSearch && (
                <button
                  onClick={() => {
                    setGlobalSearch('');
                    setSearchFocused(false);
                  }}
                  className="absolute right-3 top-2 text-slate-400 hover:text-white"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
            {/* Mobile Dropdown Results */}
            {searchFocused && globalSearch.trim().length > 0 && (
              <div className="mt-2 w-full bg-white rounded-xl shadow-2xl border border-slate-200 overflow-hidden text-slate-800 animate-fadeIn divide-y divide-slate-100 max-h-[70vh] flex flex-col">
                {renderSearchDropdownContent()}
              </div>
            )}
          </div>
        )}

        {/* ======================================================== */}
        {/* 3. DYNAMIC CONTENT AREA (FULL-WIDTH FLUID LAYOUT)         */}
        {/* ======================================================== */}
        <main className="flex-1 p-3 sm:p-5 lg:p-6 w-full pb-16">
          <Suspense fallback={<div className="p-10 text-center text-xs font-semibold text-slate-400">Loading module...</div>}>
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
              onViewCustomerProfile={(cid) => {
                setPortfolioCustomerId(cid);
                setCustomerPortfolioModalOpen(true);
              }}
            />
          )}

          {activeTab === 'rds' && (
            <RDList 
              key={rdRefreshKey}
              onOpenNewRD={() => {
                setRdCustomerId(null);
                setNewRDModalOpen(true);
              }}
              isEmployee={isEmployee}
              onViewCustomerProfile={(cid) => {
                setPortfolioCustomerId(cid);
                setCustomerPortfolioModalOpen(true);
              }}
            />
          )}

          {activeTab === 'mis' && (
            <MISList 
              key={misRefreshKey}
              onOpenNewMIS={() => {
                setMisCustomerId(null);
                setNewMISModalOpen(true);
              }}
              isEmployee={isEmployee}
              onViewCustomerProfile={(cid) => {
                setPortfolioCustomerId(cid);
                setCustomerPortfolioModalOpen(true);
              }}
            />
          )}

          {activeTab === 'savings' && (
            <SavingsList 
              onOpenNewSavings={() => setNewSavingsModalOpen(true)}
              isEmployee={isEmployee}
              onViewCustomerProfile={(cid) => {
                setPortfolioCustomerId(cid);
                setCustomerPortfolioModalOpen(true);
              }}
            />
          )}

          {activeTab === 'customers' && (
            <Customers 
              onSelectCustomerForFD={(cid) => {
                setNewFDInitialData({ customer_id: cid });
                setNewFDModalOpen(true);
              }}
              onSelectCustomerForSavings={(cid) => {
                setSavingsCustomerId(cid);
                setNewSavingsModalOpen(true);
              }}
              onSelectCustomerForRD={(cid) => {
                setRdCustomerId(cid);
                setNewRDModalOpen(true);
              }}
              onSelectCustomerForMIS={(cid) => {
                setMisCustomerId(cid);
                setNewMISModalOpen(true);
              }}
              onViewPortfolio={(cid, tab = 'OVERVIEW') => {
                setPortfolioCustomerId(cid);
                setPortfolioInitialTab(tab || 'OVERVIEW');
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

          {activeTab === 'audit_logs' && (
            <AuditTrailView />
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
              key={`daybook-${refreshKey}`}
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
          </Suspense>
        </main>

        {/* ======================================================== */}
        {/* 4. ENTERPRISE TASKBAR DOCK                               */}
        {/* ======================================================== */}
        <div className={`fixed bottom-0 right-0 h-10 bg-[#062319] border-t border-[#134e38] px-3 flex items-center gap-1.5 z-30 shadow-lg overflow-x-auto transition-all duration-300 ${
          sidebarCollapsed ? 'left-0 md:left-20' : 'left-0 md:left-72'
        }`}>
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
      <Suspense fallback={null}>
      <NewFDModal
        isOpen={newFDModalOpen}
        onClose={() => setNewFDModalOpen(false)}
        onSuccess={() => {
          setNewFDModalOpen(false);
          setRefreshKey(prev => prev + 1);
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
        onViewCustomerProfile={(cid) => {
          setDetailModalOpen(false);
          setPortfolioCustomerId(cid);
          setCustomerPortfolioModalOpen(true);
        }}
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
          setRefreshKey(prev => prev + 1);
          setActiveTab('fds');
        }}
      />

      <RenewModal
        fd={renewFD}
        isOpen={renewModalOpen}
        onClose={() => setRenewModalOpen(false)}
        onSuccess={() => {
          setRenewModalOpen(false);
          setRefreshKey(prev => prev + 1);
          setActiveTab('fds');
        }}
      />

      {/* Multi-Product Modals */}
      <NewRDModal
        isOpen={newRDModalOpen}
        initialCustomerId={rdCustomerId}
        onClose={() => {
          setNewRDModalOpen(false);
          setRdCustomerId(null);
        }}
        onSuccess={() => {
          setNewRDModalOpen(false);
          setRdCustomerId(null);
          setRdRefreshKey(prev => prev + 1);
          setRefreshKey(prev => prev + 1);
          setActiveTab('rds');
        }}
        isEmployee={isEmployee}
      />

      <NewMISModal
        isOpen={newMISModalOpen}
        initialCustomerId={misCustomerId}
        onClose={() => {
          setNewMISModalOpen(false);
          setMisCustomerId(null);
        }}
        onSuccess={() => {
          setNewMISModalOpen(false);
          setMisCustomerId(null);
          setMisRefreshKey(prev => prev + 1);
          setRefreshKey(prev => prev + 1);
          setActiveTab('mis');
        }}
        isEmployee={isEmployee}
      />

      <NewSavingsModal
        isOpen={newSavingsModalOpen}
        onClose={() => {
          setNewSavingsModalOpen(false);
          setSavingsCustomerId(null);
        }}
        onSuccess={() => {
          setNewSavingsModalOpen(false);
          setSavingsCustomerId(null);
          setRefreshKey(prev => prev + 1);
          setActiveTab('savings');
        }}
        isEmployee={isEmployee}
        initialCustomerId={savingsCustomerId}
      />

      <UnifiedCustomerProfileModal
        customerId={portfolioCustomerId}
        isOpen={customerPortfolioModalOpen}
        initialTab={portfolioInitialTab}
        onClose={() => {
          setCustomerPortfolioModalOpen(false);
          setPortfolioCustomerId(null);
          setPortfolioInitialTab('OVERVIEW');
        }}
        onOpenFD={(cust) => {
          setNewFDInitialData({
            customer_id: portfolioCustomerId,
            customerId: portfolioCustomerId,
            full_name: cust?.full_name,
            phone: cust?.phone
          });
          setNewFDModalOpen(true);
        }}
        onOpenRD={() => {
          setRdCustomerId(portfolioCustomerId);
          setNewRDModalOpen(true);
        }}
        onOpenMIS={() => {
          setMisCustomerId(portfolioCustomerId);
          setNewMISModalOpen(true);
        }}
        onOpenSavings={() => {
          setSavingsCustomerId(portfolioCustomerId);
          setNewSavingsModalOpen(true);
        }}
        onPrematureClose={(fd) => {
          setPrematureFD(fd);
          setPrematureModalOpen(true);
        }}
        onRenewFD={(fd) => {
          setRenewFD(fd);
          setRenewModalOpen(true);
        }}
        onPrintCertificate={(fdId) => {
          setCertFDId(fdId);
          setCertModalOpen(true);
        }}
        onNavigate={(tab) => {
          setCustomerPortfolioModalOpen(false);
          setActiveTab(tab);
        }}
        refreshTrigger={refreshKey}
      />

      {/* Accounting & SMS Modals */}
      <NewJournalEntryModal
        isOpen={journalEntryModalOpen}
        onClose={() => setJournalEntryModalOpen(false)}
        onSuccess={() => setRefreshKey(prev => prev + 1)}
      />

      <ScheduleSmsModal
        isOpen={scheduleSmsModalOpen}
        onClose={() => setScheduleSmsModalOpen(false)}
      />
      </Suspense>

      <DeveloperContactModal
        isOpen={developerContactOpen}
        onClose={() => setDeveloperContactOpen(false)}
      />

      {/* ======================================================== */}
      {/* STICKY BOTTOM MOBILE NAVIGATION BAR                      */}
      {/* ======================================================== */}
      <nav className="fixed bottom-0 left-0 right-0 z-30 bg-[#062319]/95 backdrop-blur-md border-t border-[#1a5d43] flex md:hidden items-center justify-around py-1 px-1 shadow-2xl text-slate-300">
        <button
          type="button"
          onClick={() => handleSwitchTab('dashboard', 'Executive Dashboard', LayoutDashboard, 'bg-emerald-700')}
          className={`flex flex-col items-center justify-center p-1.5 rounded-lg flex-1 cursor-pointer ${activeTab === 'dashboard' ? 'text-[#D4AF37] font-bold' : 'hover:text-white'}`}
        >
          <LayoutDashboard className="w-4 h-4 mb-0.5" />
          <span className="text-[10px]">Home</span>
        </button>

        <button
          type="button"
          onClick={() => handleSwitchTab('fds', 'Fixed Deposits (FD)', FolderLock, 'bg-indigo-600')}
          className={`flex flex-col items-center justify-center p-1.5 rounded-lg flex-1 cursor-pointer ${activeTab === 'fds' ? 'text-[#D4AF37] font-bold' : 'hover:text-white'}`}
        >
          <FolderLock className="w-4 h-4 mb-0.5" />
          <span className="text-[10px]">FDs</span>
        </button>

        {/* Center Gold Booking Action */}
        <button
          type="button"
          onClick={() => {
            setNewFDInitialData(null);
            setNewFDModalOpen(true);
          }}
          className="flex flex-col items-center justify-center p-1 rounded-xl bg-[#D4AF37] text-[#062319] font-bold shadow-md transform -translate-y-2 hover:scale-105 transition cursor-pointer"
          title="New Booking"
        >
          <div className="w-10 h-10 rounded-full flex items-center justify-center">
            <Plus className="w-6 h-6 stroke-[3]" />
          </div>
          <span className="text-[9px] -mt-1 font-extrabold">New +</span>
        </button>

        <button
          type="button"
          onClick={() => handleSwitchTab('rds', 'Recurring Deposits (RD)', Repeat, 'bg-cyan-600')}
          className={`flex flex-col items-center justify-center p-1.5 rounded-lg flex-1 cursor-pointer ${activeTab === 'rds' ? 'text-[#D4AF37] font-bold' : 'hover:text-white'}`}
        >
          <Repeat className="w-4 h-4 mb-0.5" />
          <span className="text-[10px]">RDs</span>
        </button>

        <button
          type="button"
          onClick={() => handleSwitchTab('customers', 'Customers & KYC 360', Users, 'bg-teal-600')}
          className={`flex flex-col items-center justify-center p-1.5 rounded-lg flex-1 cursor-pointer ${activeTab === 'customers' ? 'text-[#D4AF37] font-bold' : 'hover:text-white'}`}
        >
          <Users className="w-4 h-4 mb-0.5" />
          <span className="text-[10px]">Members</span>
        </button>

        <button
          type="button"
          onClick={() => setMobileMenuOpen(true)}
          className="flex flex-col items-center justify-center p-1.5 rounded-lg flex-1 hover:text-white cursor-pointer"
        >
          <Menu className="w-4 h-4 mb-0.5" />
          <span className="text-[10px]">Menu</span>
        </button>
      </nav>

    </div>
  );
}
