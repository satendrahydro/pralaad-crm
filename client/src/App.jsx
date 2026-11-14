import React, { useState, useEffect, useRef } from 'react';
import { 
  TrendingUp, 
  LayoutDashboard, 
  Calculator, 
  FolderLock, 
  Users, 
  CalendarDays, 
  CreditCard, 
  Settings as SettingsIcon, 
  LogOut, 
  PlusCircle, 
  ShieldCheck, 
  Bell, 
  Menu, 
  X, 
  Sparkles, 
  ExternalLink,
  MessageSquare,
  Smartphone,
  ChevronDown,
  Building2,
  CheckCircle,
  Clock,
  UserCheck
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

import NewFDModal from './components/NewFDModal';
import FDDetailModal from './components/FDDetailModal';
import Certificate from './components/Certificate';
import PrematureCloseModal from './components/PrematureCloseModal';
import RenewModal from './components/RenewModal';

import { apiRequest } from './utils';

export default function App() {
  const [token, setToken] = useState(localStorage.getItem('pralaad_fd_token'));
  const [user, setUser] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('pralaad_fd_user'));
    } catch {
      return null;
    }
  });

  const [activeTab, setActiveTab] = useState('dashboard');
  const [viewMode, setViewMode] = useState('staff'); // 'staff' | 'customer'
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Header Dropdowns
  const [branchDropdownOpen, setBranchDropdownOpen] = useState(false);
  const [activeBranch, setActiveBranch] = useState('Main Branch - Delhi NCR');
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [profileDropdownOpen, setProfileDropdownOpen] = useState(false);

  const branchRef = useRef(null);
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

  // Dropdown close on outside click
  useEffect(() => {
    function handleClickOutside(event) {
      if (branchRef.current && !branchRef.current.contains(event.target)) {
        setBranchDropdownOpen(false);
      }
      if (notifRef.current && !notifRef.current.contains(event.target)) {
        setNotificationsOpen(false);
      }
      if (profileRef.current && !profileRef.current.contains(event.target)) {
        setProfileDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleLoginSuccess = (userData, subData) => {
    setUser(userData);
    setToken(localStorage.getItem('pralaad_fd_token'));
    setActiveTab('dashboard');
  };

  const handleLogout = () => {
    localStorage.removeItem('pralaad_fd_token');
    localStorage.removeItem('pralaad_fd_user');
    setToken(null);
    setUser(null);
  };

  // Quick navigation helpers
  const handleBookFromCalc = (calcData) => {
    setNewFDInitialData(calcData);
    setNewFDModalOpen(true);
  };

  const handleViewFD = (id) => {
    setSelectedFDId(id);
    setDetailModalOpen(true);
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

  const navItems = [
    { id: 'dashboard', label: 'Overview', icon: LayoutDashboard },
    { id: 'calculator', label: 'Live Calculator', icon: Calculator, badge: 'All Options' },
    { id: 'fds', label: 'FD Portfolio', icon: FolderLock },
    { id: 'whatsapp', label: 'WhatsApp Alerts', icon: MessageSquare, badge: '3 Days' },
    { id: 'customers', label: 'Clients / KYC', icon: Users },
    { id: 'payouts', label: 'Interest Payouts', icon: CalendarDays },
    { id: 'subscription', label: 'Subscription & APIs', icon: CreditCard },
    { id: 'settings', label: 'CRM Settings', icon: SettingsIcon },
  ];

  const branches = [
    { name: 'Main Branch - Delhi NCR', code: 'DEL-HQ', city: 'Connaught Place' },
    { name: 'Noida Wealth Desk', code: 'NOI-01', city: 'Sector 62' },
    { name: 'Gurgaon Corporate Hub', code: 'GUR-02', city: 'DLF CyberCity' }
  ];

  return (
    <div className="min-h-screen bg-slate-100/70 flex flex-col font-sans">
      
      {/* Top Navigation Bar */}
      <header className="bg-slate-900 text-white sticky top-0 z-40 border-b border-slate-800 shadow-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          
          {/* Logo / Brand & Branch Switcher Dropdown */}
          <div className="flex items-center gap-4">
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden p-2 rounded-lg text-slate-300 hover:text-white hover:bg-slate-800"
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>

            <div 
              onClick={() => setActiveTab('dashboard')}
              className="flex items-center gap-2.5 cursor-pointer group"
            >
              <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-indigo-600 to-indigo-400 text-white flex items-center justify-center shadow-md shadow-indigo-500/30 group-hover:scale-105 transition">
                <TrendingUp className="w-5 h-5" />
              </div>
              <div>
                <span className="font-black text-base tracking-tight text-white block group-hover:text-indigo-300 transition">
                  FD Portal
                </span>
                <span className="text-[10px] text-indigo-300/80 -mt-0.5 block font-medium">
                  Fixed Deposit & Wealth CRM
                </span>
              </div>
            </div>

            {/* Branch Selector Dropdown */}
            <div className="hidden lg:relative lg:block ml-2" ref={branchRef}>
              <button
                onClick={() => setBranchDropdownOpen(!branchDropdownOpen)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800/90 hover:bg-slate-800 text-slate-200 border border-slate-700/60 text-xs font-semibold transition cursor-pointer"
              >
                <Building2 className="w-3.5 h-3.5 text-indigo-400" />
                <span>{activeBranch}</span>
                <ChevronDown className={`w-3.5 h-3.5 text-slate-400 transition-transform ${branchDropdownOpen ? 'rotate-180' : ''}`} />
              </button>

              {branchDropdownOpen && (
                <div className="absolute left-0 mt-2 w-64 bg-slate-850 bg-slate-900 rounded-xl shadow-2xl border border-slate-700 p-2 z-50 animate-dropdown text-xs">
                  <div className="px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-400 border-b border-slate-800 mb-1">
                    Select Operating Branch
                  </div>
                  {branches.map((b) => (
                    <button
                      key={b.code}
                      onClick={() => {
                        setActiveBranch(b.name);
                        setBranchDropdownOpen(false);
                      }}
                      className={`w-full text-left px-2.5 py-2 rounded-lg flex items-center justify-between transition cursor-pointer ${
                        activeBranch === b.name ? 'bg-indigo-600 text-white' : 'text-slate-300 hover:bg-slate-800'
                      }`}
                    >
                      <div>
                        <div className="font-bold">{b.name}</div>
                        <div className="text-[10px] opacity-75">{b.city} ({b.code})</div>
                      </div>
                      {activeBranch === b.name && <CheckCircle className="w-4 h-4 text-white" />}
                    </button>
                  ))}
                </div>
              )}
            </div>

          </div>

          {/* Quick Right Actions & Dropdowns */}
          <div className="flex items-center gap-3">
            
            {/* Client Mobile App Toggle Pill */}
            <button
              onClick={() => setViewMode('customer')}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white shadow-md text-xs font-bold transition cursor-pointer"
            >
              <Smartphone className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Client Mobile App</span>
              <span className="sm:hidden">App</span>
            </button>

            {/* Interactive Notification Bell Dropdown */}
            <div className="relative" ref={notifRef}>
              <button
                onClick={() => setNotificationsOpen(!notificationsOpen)}
                className="relative p-2 text-slate-300 hover:text-white hover:bg-slate-800 rounded-xl transition cursor-pointer"
                title="Alerts & Reminders"
              >
                <Bell className="w-4 h-4" />
                <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-rose-500 rounded-full animate-ping"></span>
                <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-rose-500 rounded-full"></span>
              </button>

              {notificationsOpen && (
                <div className="absolute right-0 mt-2 w-80 bg-white rounded-2xl shadow-2xl border border-slate-200 text-slate-800 z-50 animate-dropdown overflow-hidden">
                  <div className="p-3 bg-slate-900 text-white flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Bell className="w-4 h-4 text-indigo-400" />
                      <span className="font-bold text-xs">Maturity & Payout Alerts</span>
                    </div>
                    <span className="text-[10px] bg-rose-500 text-white font-bold px-1.5 py-0.5 rounded-full">3 New</span>
                  </div>

                  <div className="divide-y divide-slate-100 max-h-72 overflow-y-auto text-xs font-medium">
                    <div 
                      onClick={() => {
                        setActiveTab('whatsapp');
                        setNotificationsOpen(false);
                      }}
                      className="p-3 hover:bg-slate-50 transition cursor-pointer flex items-start gap-2.5"
                    >
                      <div className="p-2 bg-emerald-100 text-emerald-700 rounded-lg shrink-0 mt-0.5">
                        <MessageSquare className="w-3.5 h-3.5" />
                      </div>
                      <div>
                        <div className="font-bold text-slate-900">3-Day WhatsApp Reminders Due</div>
                        <p className="text-[11px] text-slate-500">Upcoming maturities needing customer renewal consent</p>
                      </div>
                    </div>

                    <div 
                      onClick={() => {
                        setActiveTab('payouts');
                        setNotificationsOpen(false);
                      }}
                      className="p-3 hover:bg-slate-50 transition cursor-pointer flex items-start gap-2.5"
                    >
                      <div className="p-2 bg-blue-100 text-blue-700 rounded-lg shrink-0 mt-0.5">
                        <CalendarDays className="w-3.5 h-3.5" />
                      </div>
                      <div>
                        <div className="font-bold text-slate-900">Monthly Pension Payouts Ready</div>
                        <p className="text-[11px] text-slate-500">Non-cumulative interest schedules due this cycle</p>
                      </div>
                    </div>

                    <div 
                      onClick={() => {
                        setActiveTab('subscription');
                        setNotificationsOpen(false);
                      }}
                      className="p-3 hover:bg-slate-50 transition cursor-pointer flex items-start gap-2.5"
                    >
                      <div className="p-2 bg-amber-100 text-amber-700 rounded-lg shrink-0 mt-0.5">
                        <ShieldCheck className="w-3.5 h-3.5" />
                      </div>
                      <div>
                        <div className="font-bold text-slate-900">24x7 Cloud Sync Active</div>
                        <p className="text-[11px] text-slate-500">Database connected to Render 24x7 service</p>
                      </div>
                    </div>
                  </div>

                  <div className="p-2.5 bg-slate-50 text-center border-t border-slate-100">
                    <button 
                      onClick={() => setNotificationsOpen(false)}
                      className="text-xs font-bold text-indigo-600 hover:text-indigo-800"
                    >
                      Close Alerts
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Book FD Header CTA */}
            <button
              onClick={() => {
                setNewFDInitialData(null);
                setNewFDModalOpen(true);
              }}
              className="px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-500 active:bg-indigo-700 text-white font-bold rounded-xl text-xs flex items-center gap-1.5 shadow-md shadow-indigo-600/30 transition cursor-pointer"
            >
              <PlusCircle className="w-4 h-4" />
              <span className="hidden sm:inline">Book FD</span>
            </button>

            {/* User Profile Avatar & Dropdown Menu */}
            <div className="relative pl-2 border-l border-slate-800" ref={profileRef}>
              <button
                onClick={() => setProfileDropdownOpen(!profileDropdownOpen)}
                className="flex items-center gap-2 p-1 rounded-xl hover:bg-slate-800 transition cursor-pointer"
              >
                <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-indigo-500 to-purple-600 text-white font-black text-xs flex items-center justify-center shadow-md">
                  {user?.full_name ? user.full_name[0].toUpperCase() : 'A'}
                </div>
                <div className="text-left hidden md:block">
                  <span className="text-xs font-bold text-white block leading-none">{user?.full_name || 'Admin'}</span>
                  <span className="text-[9px] text-indigo-300 uppercase font-semibold">{user?.role || 'Manager'}</span>
                </div>
                <ChevronDown className={`w-3.5 h-3.5 text-slate-400 hidden sm:block transition-transform ${profileDropdownOpen ? 'rotate-180' : ''}`} />
              </button>

              {profileDropdownOpen && (
                <div className="absolute right-0 mt-2 w-56 bg-white rounded-2xl shadow-2xl border border-slate-200 text-slate-800 p-2 z-50 animate-dropdown text-xs">
                  <div className="p-2 border-b border-slate-100 mb-1">
                    <div className="font-bold text-slate-900">{user?.full_name || 'Admin User'}</div>
                    <div className="text-[11px] text-slate-500">{user?.username || 'admin'}</div>
                  </div>

                  <button
                    onClick={() => {
                      setViewMode('customer');
                      setProfileDropdownOpen(false);
                    }}
                    className="w-full text-left px-3 py-2 hover:bg-slate-50 rounded-xl font-semibold flex items-center gap-2 text-indigo-700 transition cursor-pointer"
                  >
                    <Smartphone className="w-4 h-4 text-indigo-600" />
                    <span>Client Mobile App View</span>
                  </button>

                  <button
                    onClick={() => {
                      setActiveTab('settings');
                      setProfileDropdownOpen(false);
                    }}
                    className="w-full text-left px-3 py-2 hover:bg-slate-50 rounded-xl font-semibold flex items-center gap-2 text-slate-700 transition cursor-pointer"
                  >
                    <SettingsIcon className="w-4 h-4 text-slate-500" />
                    <span>CRM Settings</span>
                  </button>

                  <button
                    onClick={() => {
                      setActiveTab('subscription');
                      setProfileDropdownOpen(false);
                    }}
                    className="w-full text-left px-3 py-2 hover:bg-slate-50 rounded-xl font-semibold flex items-center gap-2 text-slate-700 transition cursor-pointer"
                  >
                    <CreditCard className="w-4 h-4 text-slate-500" />
                    <span>Subscription & AMC</span>
                  </button>

                  <div className="my-1 border-t border-slate-100"></div>

                  <button
                    onClick={() => {
                      setProfileDropdownOpen(false);
                      handleLogout();
                    }}
                    className="w-full text-left px-3 py-2 hover:bg-rose-50 text-rose-600 rounded-xl font-bold flex items-center gap-2 transition cursor-pointer"
                  >
                    <LogOut className="w-4 h-4 text-rose-500" />
                    <span>Sign Out</span>
                  </button>
                </div>
              )}
            </div>

          </div>

        </div>
      </header>

      {/* Main Workspace Layout with Sidebar */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 w-full flex-1 flex flex-col md:flex-row gap-6">
        
        {/* Desktop Sidebar Navigation */}
        <aside className="hidden md:block w-64 shrink-0 space-y-2">
          <div className="bg-white rounded-2xl border border-slate-200 p-3 shadow-sm space-y-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => setActiveTab(item.id)}
                  className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl font-bold text-xs transition cursor-pointer ${
                    isActive
                      ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                      : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <Icon className={`w-4 h-4 ${isActive ? 'text-white' : 'text-slate-400'}`} />
                    <span>{item.label}</span>
                  </div>
                  {item.badge && (
                    <span className={`text-[9px] px-1.5 py-0.2 rounded font-bold ${
                      isActive ? 'bg-indigo-700 text-white' : 'bg-indigo-50 text-indigo-700'
                    }`}>
                      {item.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {/* Quick Help Card */}
          <div className="bg-gradient-to-br from-indigo-950 to-slate-900 text-white rounded-2xl p-4 shadow-sm text-xs space-y-2 border border-indigo-900/50">
            <div className="flex items-center gap-1.5 text-indigo-300 font-bold">
              <Sparkles className="w-4 h-4 text-indigo-400" />
              <span>Multi-Compounding Ready</span>
            </div>
            <p className="text-slate-300 text-[11px] leading-relaxed">
              Quarterly, Monthly, Half-Yearly, Simple aur Monthly Pension Payout sabhi supported hain.
            </p>
          </div>

          {/* Client Mobile App Preview Card */}
          <div className="bg-gradient-to-br from-violet-900 to-indigo-950 text-white rounded-2xl p-4 shadow-md text-xs space-y-2.5 border border-violet-500/30">
            <div className="flex items-center gap-2 text-amber-300 font-bold">
              <Smartphone className="w-4 h-4" />
              <span>Customer Mobile App</span>
            </div>
            <p className="text-indigo-200 text-[11px] leading-relaxed">
              क्लाइंट अपने फोन पर अपनी FDs, रसीदें और ब्याज पेआउट कैसे देखेगा:
            </p>
            <button
              onClick={() => setViewMode('customer')}
              className="w-full py-2 bg-white text-slate-900 hover:bg-indigo-50 font-black rounded-xl text-xs transition cursor-pointer shadow-sm"
            >
              Open Client App View &rarr;
            </button>
          </div>
        </aside>

        {/* Mobile Navigation Drawer */}
        {mobileMenuOpen && (
          <div className="md:hidden bg-white border border-slate-200 rounded-2xl p-3 shadow-lg space-y-1 mb-4 animate-dropdown">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => {
                    setActiveTab(item.id);
                    setMobileMenuOpen(false);
                  }}
                  className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl font-bold text-xs transition ${
                    isActive
                      ? 'bg-indigo-600 text-white'
                      : 'text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <Icon className="w-4 h-4" />
                    <span>{item.label}</span>
                  </div>
                </button>
              );
            })}
          </div>
        )}

        {/* Dynamic Main Workspace Content */}
        <main className="flex-1 min-w-0">
          {activeTab === 'dashboard' && (
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
            />
          )}

          {activeTab === 'calculator' && (
            <CalculatorComponent
              onBookFromCalc={handleBookFromCalc}
            />
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

          {activeTab === 'whatsapp' && (
            <WhatsAppReminders
              onViewFD={handleViewFD}
            />
          )}

          {activeTab === 'customers' && (
            <Customers
              onSelectCustomerForFD={(customerId) => {
                setNewFDInitialData({ customerId });
                setNewFDModalOpen(true);
              }}
            />
          )}

          {activeTab === 'payouts' && (
            <Payouts />
          )}

          {activeTab === 'subscription' && (
            <Subscription />
          )}

          {activeTab === 'settings' && (
            <Settings />
          )}
        </main>

      </div>

      {/* Global Modals */}
      <NewFDModal
        isOpen={newFDModalOpen}
        onClose={() => setNewFDModalOpen(false)}
        initialData={newFDInitialData}
        onFDCreated={(newFd) => {
          handlePrintCertificate(newFd.id);
        }}
        onOpenQuickAddCustomer={() => {
          setNewFDModalOpen(false);
          setActiveTab('customers');
        }}
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
          if (activeTab === 'dashboard') window.location.reload();
        }}
      />

      <RenewModal
        fd={renewFD}
        isOpen={renewModalOpen}
        onClose={() => setRenewModalOpen(false)}
        onSuccess={() => {
          if (activeTab === 'dashboard') window.location.reload();
        }}
      />

    </div>
  );
}
