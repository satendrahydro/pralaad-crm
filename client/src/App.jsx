import React, { useState, useEffect } from 'react';
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
  Smartphone
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

  const [quickAddCustomerOpen, setQuickAddCustomerOpen] = useState(false);

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

  return (
    <div className="min-h-screen bg-slate-100/70 flex flex-col font-sans">
      
      {/* Top Navigation Bar */}
      <header className="bg-slate-900 text-white sticky top-0 z-40 border-b border-slate-800 shadow-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          
          {/* Logo / Brand */}
          <div className="flex items-center gap-3">
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
              <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-indigo-600 to-indigo-400 text-white flex items-center justify-center shadow-md shadow-indigo-500/30">
                <TrendingUp className="w-5 h-5" />
              </div>
              <div>
                <span className="font-black text-base tracking-tight text-white block group-hover:text-indigo-300 transition">
                  Pralaad FD Portal
                </span>
                <span className="text-[10px] text-indigo-300/80 -mt-0.5 block font-medium">
                  Internal Fixed Deposit CRM
                </span>
              </div>
            </div>
          </div>

          {/* Quick Right Actions */}
          <div className="flex items-center gap-3">
            
            {/* Client Mobile App Toggle Pill */}
            <button
              onClick={() => setViewMode('customer')}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white shadow-md text-xs font-bold transition cursor-pointer"
            >
              <Smartphone className="w-3.5 h-3.5" />
              <span>Client Mobile App</span>
            </button>

            {/* WhatsApp Reminder Shortcut Pill */}
            <button
              onClick={() => setActiveTab('whatsapp')}
              className="hidden lg:flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-400/30 text-xs font-semibold transition cursor-pointer"
            >
              <MessageSquare className="w-3.5 h-3.5 text-emerald-400" />
              WhatsApp Alerts
            </button>

            {/* Subscription Pill */}
            <button
              onClick={() => setActiveTab('subscription')}
              className="hidden xl:flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-400/30 text-xs font-semibold transition cursor-pointer"
            >
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
              AMC Active (₹24K/yr)
            </button>

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

            {/* User Profile & Logout */}
            <div className="flex items-center gap-2 pl-3 border-l border-slate-800">
              <div className="text-right hidden sm:block">
                <span className="text-xs font-bold text-white block leading-none">{user?.full_name || 'Admin'}</span>
                <span className="text-[10px] text-slate-400 uppercase font-semibold">{user?.role || 'Operator'}</span>
              </div>

              <button
                onClick={handleLogout}
                title="Sign Out"
                className="p-2 text-slate-400 hover:text-rose-400 hover:bg-slate-800 rounded-xl transition cursor-pointer"
              >
                <LogOut className="w-4 h-4" />
              </button>
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
                  className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl font-semibold text-xs transition cursor-pointer ${
                    isActive
                      ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20'
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
          <div className="bg-gradient-to-br from-indigo-950 to-slate-900 text-white rounded-2xl p-4 shadow-sm text-xs space-y-2">
            <div className="flex items-center gap-1.5 text-indigo-300 font-bold">
              <Sparkles className="w-4 h-4" />
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
          <div className="md:hidden bg-white border border-slate-200 rounded-2xl p-3 shadow-lg space-y-1 mb-4">
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
                  className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl font-semibold text-xs transition ${
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
