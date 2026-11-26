import React, { useState, useEffect, Suspense, lazy } from 'react';
import {
  Wallet,
  ArrowDownLeft,
  Building,
  Users,
  Calculator as CalcIcon,
  BadgePercent,
  Gem,
  LogOut,
  Menu,
  X,
  Globe,
  RefreshCw,
  Plus
} from 'lucide-react';
import Login from './components/Login';
import TarplLogo from './components/TarplLogo';
import CommercialLockScreen from './components/CommercialLockScreen';
import DeveloperContactModal from './components/DeveloperContactModal';
import { getApiBase } from './utils';

const DailyCollection = lazy(() => import('./components/DailyCollection'));
const PaymentsToCollect = lazy(() => import('./components/PaymentsToCollect'));
const CollectionCenters = lazy(() => import('./components/CollectionCenters'));
const Customers = lazy(() => import('./components/Customers'));
const LoansAgainstDeposit = lazy(() => import('./components/LoansAgainstDeposit'));
const GoldLoanList = lazy(() => import('./components/GoldLoanList'));
const CalculatorComponent = lazy(() => import('./components/Calculator'));

const UnifiedCustomerProfileModal = lazy(() => import('./components/UnifiedCustomerProfileModal'));
const NewFDModal = lazy(() => import('./components/NewFDModal'));
const NewRDModal = lazy(() => import('./components/NewRDModal'));
const NewSavingsModal = lazy(() => import('./components/NewSavingsModal'));
const Certificate = lazy(() => import('./components/Certificate'));

const COLLECTOR_TABS = [
  { id: 'daily_collection', label: 'Daily Sheet', short: 'Collect', icon: Wallet },
  { id: 'payments_to_collect', label: 'Due Recoveries', short: 'Dues', icon: ArrowDownLeft },
  { id: 'customers', label: 'Members KYC', short: 'Members', icon: Users },
  { id: 'centers', label: 'Centers', short: 'Centers', icon: Building },
  { id: 'loans', label: 'Deposit Loans', short: 'Loans', icon: BadgePercent },
  { id: 'gold_loan', label: 'Gold Loans', short: 'Gold', icon: Gem },
  { id: 'calculator', label: 'FD Calculator', short: 'Calc', icon: CalcIcon }
];

export default function CollectorApp() {
  const [token, setToken] = useState(localStorage.getItem('pralaad_fd_token'));
  const [user, setUser] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('pralaad_fd_user'));
    } catch {
      return null;
    }
  });
  const [activeTab, setActiveTab] = useState('daily_collection');
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [developerContactOpen, setDeveloperContactOpen] = useState(false);

  const [isCommercialLocked, setIsCommercialLocked] = useState(false);
  const [commercialLockReason, setCommercialLockReason] = useState('');

  // Quick Field Action Modals
  const [refreshKey, setRefreshKey] = useState(0);
  const [portfolioCustomerId, setPortfolioCustomerId] = useState(null);
  const [portfolioModalOpen, setPortfolioModalOpen] = useState(false);
  const [newFDModalOpen, setNewFDModalOpen] = useState(false);
  const [newFDInitialData, setNewFDInitialData] = useState(null);
  const [newRDModalOpen, setNewRDModalOpen] = useState(false);
  const [rdCustomerId, setRdCustomerId] = useState(null);
  const [newSavingsModalOpen, setNewSavingsModalOpen] = useState(false);
  const [savingsCustomerId, setSavingsCustomerId] = useState(null);
  const [certFDId, setCertFDId] = useState(null);
  const [certModalOpen, setCertModalOpen] = useState(false);

  useEffect(() => {
    fetch(`${getApiBase()}/license/status`)
      .then((res) => res.json())
      .then((data) => {
        if (data && data.locked) {
          setIsCommercialLocked(true);
          setCommercialLockReason(data.reason || 'Commercial settlement pending');
        }
      })
      .catch(() => {});

    const handleTrigger = (e) => {
      setIsCommercialLocked(true);
      if (e.detail && e.detail.message) {
        setCommercialLockReason(e.detail.message);
      }
    };
    const handleUserUpdated = (e) => {
      if (e.detail) setUser(e.detail);
    };
    const handleAuthExpired = () => {
      setToken(null);
      setUser(null);
    };

    window.addEventListener('commercial_lock_triggered', handleTrigger);
    window.addEventListener('pralaad_user_updated', handleUserUpdated);
    window.addEventListener('pralaad_auth_expired', handleAuthExpired);
    return () => {
      window.removeEventListener('commercial_lock_triggered', handleTrigger);
      window.removeEventListener('pralaad_user_updated', handleUserUpdated);
      window.removeEventListener('pralaad_auth_expired', handleAuthExpired);
    };
  }, []);

  const handleLoginSuccess = (userData) => {
    setUser(userData);
    setToken(localStorage.getItem('pralaad_fd_token'));
    setActiveTab('daily_collection');
  };

  const handleLogout = () => {
    localStorage.removeItem('pralaad_fd_token');
    localStorage.removeItem('pralaad_fd_user');
    localStorage.removeItem('pralaad_staff_permissions');
    setToken(null);
    setUser(null);
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
  const currentTitle = COLLECTOR_TABS.find((t) => t.id === activeTab)?.label || 'Field Collection';

  return (
    <div className="min-h-screen bg-[#f4f6f9] flex flex-col font-sans text-slate-800 pb-16">
      {/* Compact Collector Top Bar */}
      <header className="sticky top-0 z-30 h-14 bg-[#082e20] text-white px-3 sm:px-5 flex items-center justify-between border-b border-[#1a5d43] shadow-sm">
        <div className="flex items-center gap-2.5 min-w-0">
          <button
            type="button"
            onClick={() => setDrawerOpen(true)}
            className="p-2 rounded-lg bg-[#0a3d2b] text-emerald-200 hover:text-white cursor-pointer"
            title="Employee Menu"
          >
            <Menu className="w-5 h-5" />
          </button>
          <TarplLogo size="xs" />
          <div className="min-w-0">
            <h1 className="text-sm font-extrabold tracking-tight truncate leading-none">{currentTitle}</h1>
            <p className="text-[10px] text-[#D4AF37] font-semibold mt-0.5 truncate">
              {user?.full_name || user?.username || 'Company Employee'} • Company Employee
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          <button
            type="button"
            onClick={() => setRefreshKey((k) => k + 1)}
            className="p-2 rounded-lg bg-[#0a3d2b] text-emerald-200 hover:text-white cursor-pointer"
            title="Refresh"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={handleLogout}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-rose-600/20 hover:bg-rose-600 text-rose-200 hover:text-white border border-rose-500/40 text-xs font-bold cursor-pointer"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Logout</span>
          </button>
        </div>
      </header>

      {/* Slide-out Navigation Drawer */}
      {drawerOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 flex" onClick={() => setDrawerOpen(false)}>
          <div
            className="w-72 max-w-[85vw] bg-[#062319] text-white h-full flex flex-col justify-between p-4 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div>
              <div className="flex items-center justify-between pb-3 border-b border-[#1a5d43] mb-3">
                <div>
                  <div className="font-black text-sm text-[#D4AF37]">Taranganjali Employee</div>
                  <div className="text-[11px] text-emerald-300">
                    {user?.full_name || 'Company Employee'} (@{user?.username || 'employee'})
                  </div>
                </div>
                <button type="button" onClick={() => setDrawerOpen(false)} className="p-1 text-emerald-200 hover:text-white cursor-pointer">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-1">
                {COLLECTOR_TABS.map((item) => {
                  const Icon = item.icon;
                  const active = activeTab === item.id;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => {
                        setActiveTab(item.id);
                        setDrawerOpen(false);
                      }}
                      className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-bold transition cursor-pointer ${
                        active
                          ? 'bg-[#D4AF37] text-[#062319]'
                          : 'text-emerald-100 hover:bg-[#0a3d2b]'
                      }`}
                    >
                      <Icon className="w-4 h-4 shrink-0" />
                      <span>{item.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="space-y-2 pt-3 border-t border-[#1a5d43] text-xs">
              <button
                type="button"
                onClick={() => {
                  setDrawerOpen(false);
                  setDeveloperContactOpen(true);
                }}
                className="w-full flex items-center gap-2 px-3 py-2 rounded-lg bg-[#0a3d2b] text-emerald-200 hover:text-white font-semibold cursor-pointer"
              >
                <Globe className="w-3.5 h-3.5" /> Contact Us / Support
              </button>
              <button
                type="button"
                onClick={handleLogout}
                className="w-full flex items-center gap-2 px-3 py-2 rounded-lg bg-rose-600/20 text-rose-300 hover:bg-rose-600 hover:text-white font-bold cursor-pointer"
              >
                <LogOut className="w-3.5 h-3.5" /> Logout
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Main Content */}
      <main className="flex-1 p-3 sm:p-5 w-full max-w-6xl mx-auto">
        <Suspense fallback={<div className="p-10 text-center text-xs font-semibold text-slate-400">Loading module...</div>}>
          {activeTab === 'daily_collection' && <DailyCollection key={`dc-${refreshKey}`} />}
          {activeTab === 'payments_to_collect' && <PaymentsToCollect key={`ptc-${refreshKey}`} />}
          {activeTab === 'centers' && <CollectionCenters key={`cc-${refreshKey}`} />}
          {activeTab === 'customers' && (
            <Customers
              key={`cust-${refreshKey}`}
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
              onViewPortfolio={(cid) => {
                setPortfolioCustomerId(cid);
                setPortfolioModalOpen(true);
              }}
            />
          )}
          {activeTab === 'loans' && <LoansAgainstDeposit key={`loans-${refreshKey}`} />}
          {activeTab === 'gold_loan' && <GoldLoanList key={`gold-${refreshKey}`} />}
          {activeTab === 'calculator' && (
            <CalculatorComponent
              onBookFromCalc={(calcData) => {
                setNewFDInitialData(calcData);
                setNewFDModalOpen(true);
              }}
            />
          )}
        </Suspense>
      </main>

      {/* Modals */}
      <Suspense fallback={null}>
        <NewFDModal
          isOpen={newFDModalOpen}
          onClose={() => setNewFDModalOpen(false)}
          onSuccess={() => {
            setNewFDModalOpen(false);
            setRefreshKey((k) => k + 1);
          }}
          initialData={newFDInitialData}
        />
        <NewRDModal
          isOpen={newRDModalOpen}
          onClose={() => {
            setNewRDModalOpen(false);
            setRdCustomerId(null);
          }}
          onSuccess={() => {
            setNewRDModalOpen(false);
            setRdCustomerId(null);
            setRefreshKey((k) => k + 1);
          }}
          isEmployee={isEmployee}
          initialCustomerId={rdCustomerId}
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
            setRefreshKey((k) => k + 1);
          }}
          isEmployee={isEmployee}
          initialCustomerId={savingsCustomerId}
        />
        <UnifiedCustomerProfileModal
          customerId={portfolioCustomerId}
          isOpen={portfolioModalOpen}
          onClose={() => {
            setPortfolioModalOpen(false);
            setPortfolioCustomerId(null);
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
          onOpenSavings={() => {
            setSavingsCustomerId(portfolioCustomerId);
            setNewSavingsModalOpen(true);
          }}
          onPrintCertificate={(fdId) => {
            setCertFDId(fdId);
            setCertModalOpen(true);
          }}
          refreshTrigger={refreshKey}
        />
        <Certificate
          fdId={certFDId}
          isOpen={certModalOpen}
          onClose={() => setCertModalOpen(false)}
        />
      </Suspense>

      <DeveloperContactModal
        isOpen={developerContactOpen}
        onClose={() => setDeveloperContactOpen(false)}
      />

      {/* Employee Sticky Bottom Navigation */}
      <nav className="fixed bottom-0 left-0 right-0 z-30 bg-[#062319] border-t border-[#1a5d43] flex items-center justify-around py-1 px-1 text-slate-300 shadow-2xl">
        {[
          COLLECTOR_TABS[0],
          COLLECTOR_TABS[1],
          COLLECTOR_TABS[2],
          COLLECTOR_TABS[6]
        ].map((tab) => {
          const Icon = tab.icon;
          const active = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={`flex flex-col items-center justify-center p-1.5 rounded-lg flex-1 cursor-pointer ${
                active ? 'text-[#D4AF37] font-bold' : 'hover:text-white'
              }`}
            >
              <Icon className="w-4 h-4 mb-0.5" />
              <span className="text-[10px]">{tab.short}</span>
            </button>
          );
        })}
        <button
          type="button"
          onClick={() => setDrawerOpen(true)}
          className="flex flex-col items-center justify-center p-1.5 rounded-lg flex-1 hover:text-white cursor-pointer"
        >
          <Plus className="w-4 h-4 mb-0.5" />
          <span className="text-[10px]">More</span>
        </button>
      </nav>
    </div>
  );
}
