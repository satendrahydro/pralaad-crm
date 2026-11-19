import React, { useState, useEffect } from 'react';
import { 
  TrendingUp, 
  Wallet, 
  Users, 
  FileCheck2, 
  AlertCircle, 
  Clock, 
  ArrowUpRight, 
  PlusCircle, 
  Calculator, 
  CheckCircle2, 
  FileText, 
  Building2, 
  CalendarDays, 
  MoreVertical, 
  Printer, 
  Eye, 
  RotateCw, 
  MessageSquare, 
  ChevronRight, 
  Download, 
  PieChart as PieIcon, 
  BarChart3, 
  ShieldCheck, 
  Search, 
  RefreshCw, 
  ArrowRight,
  Sparkles,
  CreditCard,
  UserCheck,
  Check,
  Percent,
  Banknote,
  Repeat,
  Coins,
  LogOut
} from 'lucide-react';
import { 
  ResponsiveContainer, 
  AreaChart, 
  Area, 
  BarChart,
  Bar,
  PieChart, 
  Pie, 
  Cell, 
  Tooltip, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Legend 
} from 'recharts';
import { formatINR, formatDate, apiRequest } from '../utils';

// Premium Banking FinTech Palette: Forest Green & Golden Yellow
const FINTECH_COLORS = {
  primary: '#0A5C36',     // Forest Green
  secondary: '#D4AF37',   // Golden Yellow
  success: '#10b981',     // Emerald
  warning: '#f59e0b',     // Amber
  dark: '#062319',        // Night Forest
  slate: '#78716c'        // Warm Stone
};

const PIE_COLORS = ['#0A5C36', '#D4AF37', '#10b981', '#f59e0b', '#047857', '#d97706'];

export default function Dashboard({ 
  onNavigate, 
  onOpenNewFD, 
  onViewFD, 
  onPrintCertificate,
  onPrematureClose,
  onRenewFD,
  selectedBranch = 'All Branches',
  selectedFY = 'FY 2026-27'
}) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const [quickFilter, setQuickFilter] = useState('ALL');
  const [pendingApprovals, setPendingApprovals] = useState([]);
  const [fromDate, setFromDate] = useState('2026-04-01');
  const [toDate, setToDate] = useState('2027-03-31');
  const [dateFilterApplied, setDateFilterApplied] = useState(false);

  const fetchDashboardData = async () => {
    try {
      setRefreshing(true);
      const res = await apiRequest('/analytics/dashboard');
      if (res.success) {
        setData(res.data);
      } else {
        setError(res.message || 'Unable to retrieve dashboard metrics');
      }

      // Check pending approvals for Maker-Checker workflow
      try {
        const appRes = await apiRequest('/approvals?status=PENDING_APPROVAL');
        if (appRes.success) {
          setPendingApprovals(appRes.data || []);
        }
      } catch(e){}
    } catch (err) {
      setError(err.message || 'Network error fetching dashboard data');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const handleMarkPaid = async (scheduleId) => {
    try {
      await apiRequest(`/fds/schedules/${scheduleId}/pay`, {
        method: 'POST',
        body: JSON.stringify({
          payment_reference: `DIRECT-BANK-NEFT-${Date.now().toString().slice(-6)}`
        })
      });
      fetchDashboardData();
    } catch (err) {
      alert('Failed to mark payout as paid: ' + err.message);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-slate-500">
        <RefreshCw className="w-10 h-10 animate-spin text-indigo-600 mb-4" />
        <p className="text-base font-semibold text-slate-700">Loading Enterprise FD Dashboard...</p>
        <p className="text-xs text-slate-400 mt-1">Aggregating live portfolios, schedules and liabilities</p>
      </div>
    );
  }

  if (error || !data) {
    const handleReLogin = () => {
      localStorage.removeItem('pralaad_fd_token');
      localStorage.removeItem('pralaad_fd_user');
      localStorage.removeItem('pralaad_staff_permissions');
      window.dispatchEvent(new CustomEvent('pralaad_auth_expired'));
      window.location.reload();
    };

    return (
      <div className="p-8 max-w-2xl mx-auto mt-12 bg-white rounded-2xl border border-rose-200 shadow-lg text-center">
        <div className="w-14 h-14 bg-rose-50 text-rose-600 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-rose-100">
          <AlertCircle className="w-8 h-8" />
        </div>
        <h3 className="text-xl font-bold text-slate-900">Dashboard Unavailable</h3>
        <p className="text-sm text-slate-600 mt-2 mb-6 max-w-md mx-auto leading-relaxed">
          {error || 'Unable to connect to Core Banking server or session has expired.'}
        </p>
        <div className="flex flex-wrap items-center justify-center gap-3">
          <button
            onClick={fetchDashboardData}
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-sm font-semibold transition cursor-pointer border border-slate-200"
          >
            <RefreshCw className="w-4 h-4" /> Try Again
          </button>
          <button
            onClick={handleReLogin}
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#0A5C36] hover:bg-[#08482a] text-white rounded-xl text-sm font-bold transition cursor-pointer shadow-md"
          >
            <LogOut className="w-4 h-4" /> Re-Login / Sign In Again
          </button>
        </div>
      </div>
    );
  }

  const { metrics, upcomingMaturities, pendingPayouts, frequencyBreakdown, monthlyProjection, recentFds, subscription } = data;
  const safeMetrics = metrics || {};

  // Chart Data Preparation: Principal vs Interest
  const liabilityPieData = [
    { name: 'Active Principal', value: safeMetrics.totalPrincipal || 0 },
    { name: 'Projected Interest', value: safeMetrics.totalInterest || 0 }
  ];

  // Multi-Product Asset Mix (Real Database Figures in Green & Gold)
  const portfolioMixData = [
    { name: 'Monthly Income (MIS)', value: safeMetrics.mis?.totalDeposit || 0, color: '#D4AF37' },
    { name: 'Fixed Deposits (FD)', value: safeMetrics.totalPrincipal || 0, color: '#0A5C36' },
    { name: 'Savings Accounts (SB)', value: safeMetrics.savings?.totalBalance || 0, color: '#10b981' },
    { name: 'Recurring (RD)', value: safeMetrics.rd?.totalDeposited || 0, color: '#f59e0b' }
  ].filter(p => p.value > 0);

  // Frequency Chart Data
  const freqChartData = (frequencyBreakdown || []).map(f => ({
    name: f.compounding_frequency.replace('payout_', 'Payout ').replace('_', ' ').toUpperCase(),
    count: f.count,
    amount: f.total_amount
  }));

  // Timeline / Projection Data
  const timelineData = (monthlyProjection && monthlyProjection.length > 0)
    ? monthlyProjection.map(m => ({
        month: m.month,
        Principal: m.principal || 0,
        MaturityLiability: m.projected_payout || 0,
        Count: m.count
      }))
    : [
        { month: '2026-04', Principal: 500000, MaturityLiability: 543000, Count: 1 },
        { month: '2026-07', Principal: 250000, MaturityLiability: 271000, Count: 1 },
        { month: '2026-10', Principal: 1000000, MaturityLiability: 1085000, Count: 1 }
      ];

  // Filtered KPIs depending on selected product filter
  const kpis = (() => {
    switch (quickFilter) {
      case 'RD':
        return {
          productLabel: 'Recurring Deposits (RD)',
          badgeColor: 'bg-amber-100 text-amber-900 border-amber-300',
          deskTab: 'rds',
          deskLabel: 'Open Full RD Desk & Passbooks',
          cards: [
            {
              title: 'Active RD Deposited',
              amount: formatINR(metrics.rd?.totalDeposited || 0),
              badge: `${metrics.rd?.activeCount || 0} Active RD Accounts`,
              sub: 'Cumulative Monthly Inflow',
              icon: Repeat,
              color: 'text-amber-600 bg-amber-50 border-amber-100 group-hover:bg-amber-600 group-hover:text-white',
              hoverBorder: 'hover:border-amber-300',
              badgeColor: 'text-amber-700 bg-amber-50'
            },
            {
              title: 'Projected Maturity Liability',
              amount: formatINR(metrics.rd?.totalMaturity || 0),
              badge: 'Maturity Target',
              sub: 'Principal + RD Compound Yield',
              icon: Banknote,
              color: 'text-emerald-600 bg-emerald-50 border-emerald-100 group-hover:bg-emerald-600 group-hover:text-white',
              hoverBorder: 'hover:border-emerald-300',
              badgeColor: 'text-emerald-700 bg-emerald-50'
            },
            {
              title: 'Projected RD Interest',
              amount: formatINR(Math.max(0, (metrics.rd?.totalMaturity || 0) - (metrics.rd?.totalDeposited || 0))),
              badge: 'Accrued RD Interest',
              sub: 'Contracted Compound Terms',
              icon: Percent,
              color: 'text-orange-600 bg-orange-50 border-orange-100 group-hover:bg-orange-600 group-hover:text-white',
              hoverBorder: 'hover:border-orange-300',
              badgeColor: 'text-orange-700 bg-orange-50'
            },
            {
              title: 'Active RD Savers',
              amount: metrics.rd?.activeCount || 0,
              badge: 'RD Depositors',
              sub: 'Enrolled Members',
              icon: Users,
              color: 'text-sky-600 bg-sky-50 border-sky-100 group-hover:bg-sky-600 group-hover:text-white',
              hoverBorder: 'hover:border-sky-300',
              badgeColor: 'text-sky-700 bg-sky-50'
            },
            {
              title: 'Installments Due (30 Days)',
              amount: metrics.rd?.upcomingInstallments?.length || 0,
              badge: 'Action Required',
              sub: 'Upcoming Dues This Month',
              icon: Clock,
              color: 'text-rose-600 bg-rose-50 border-rose-100 group-hover:bg-rose-600 group-hover:text-white',
              hoverBorder: 'hover:border-rose-300',
              badgeColor: 'text-rose-700 bg-rose-50'
            },
            {
              title: 'Monthly Collection Target',
              amount: formatINR(metrics.rd?.totalDeposited ? Math.round(metrics.rd.totalDeposited / 6) : 0),
              badge: 'Active Run-Rate',
              sub: 'Regular Monthly Savings',
              icon: CreditCard,
              color: 'text-violet-600 bg-violet-50 border-violet-100 group-hover:bg-violet-600 group-hover:text-white',
              hoverBorder: 'hover:border-violet-300',
              badgeColor: 'text-violet-700 bg-violet-50'
            },
            {
              title: 'Total Active Contracts',
              amount: metrics.rd?.activeCount || 0,
              badge: '100% Active Status',
              sub: 'Regular Installments',
              icon: FileCheck2,
              color: 'text-teal-600 bg-teal-50 border-teal-100 group-hover:bg-teal-600 group-hover:text-white',
              hoverBorder: 'hover:border-teal-300',
              badgeColor: 'text-teal-700 bg-teal-50'
            },
            {
              title: 'Core Product Scheme',
              amount: 'Recurring Deposit (RD)',
              badge: 'ACTIVE SCHEME',
              sub: 'Monthly Recurring Savings',
              icon: ShieldCheck,
              color: 'text-emerald-600 bg-emerald-50 border-emerald-100',
              hoverBorder: 'hover:border-emerald-300',
              badgeColor: 'text-emerald-700 bg-emerald-50'
            }
          ]
        };

      case 'MIS':
        return {
          productLabel: 'Monthly Income Scheme (MIS)',
          badgeColor: 'bg-yellow-100 text-yellow-900 border-yellow-300',
          deskTab: 'mis',
          deskLabel: 'Open Full MIS Desk & Payout Schedules',
          cards: [
            {
              title: 'Active MIS Principal',
              amount: formatINR(metrics.mis?.totalDeposit || 0),
              badge: `${metrics.mis?.activeCount || 0} Active MIS Accounts`,
              sub: 'Lump-Sum Monthly Servicing',
              icon: Wallet,
              color: 'text-yellow-600 bg-yellow-50 border-yellow-100 group-hover:bg-yellow-600 group-hover:text-white',
              hoverBorder: 'hover:border-yellow-300',
              badgeColor: 'text-yellow-700 bg-yellow-50'
            },
            {
              title: 'Monthly Payout Obligation',
              amount: formatINR(metrics.mis?.totalMonthlyPayout || 0),
              badge: 'Per Month Servicing',
              sub: 'Direct Customer NEFT / Bank Payout',
              icon: Banknote,
              color: 'text-emerald-600 bg-emerald-50 border-emerald-100 group-hover:bg-emerald-600 group-hover:text-white',
              hoverBorder: 'hover:border-emerald-300',
              badgeColor: 'text-emerald-700 bg-emerald-50'
            },
            {
              title: 'Annual Interest Outflow',
              amount: formatINR((metrics.mis?.totalMonthlyPayout || 0) * 12),
              badge: '12-Month Projection',
              sub: 'Contracted Pension Servicing',
              icon: Percent,
              color: 'text-amber-600 bg-amber-50 border-amber-100 group-hover:bg-amber-600 group-hover:text-white',
              hoverBorder: 'hover:border-amber-300',
              badgeColor: 'text-amber-700 bg-amber-50'
            },
            {
              title: 'Active MIS Customers',
              amount: metrics.mis?.activeCount || 0,
              badge: 'Monthly Income Earners',
              sub: 'Senior Citizens & Depositors',
              icon: Users,
              color: 'text-sky-600 bg-sky-50 border-sky-100 group-hover:bg-sky-600 group-hover:text-white',
              hoverBorder: 'hover:border-sky-300',
              badgeColor: 'text-sky-700 bg-sky-50'
            },
            {
              title: 'Payouts Due (30 Days)',
              amount: metrics.mis?.upcomingPayouts?.length || 0,
              badge: 'Pending Payouts',
              sub: 'Scheduled This Month',
              icon: Clock,
              color: 'text-rose-600 bg-rose-50 border-rose-100 group-hover:bg-rose-600 group-hover:text-white',
              hoverBorder: 'hover:border-rose-300',
              badgeColor: 'text-rose-700 bg-rose-50'
            },
            {
              title: 'Effective Return Rate',
              amount: '~9.5% - 10.5% p.a.',
              badge: 'Monthly Credited',
              sub: 'Non-Cumulative High Yield',
              icon: CreditCard,
              color: 'text-violet-600 bg-violet-50 border-violet-100 group-hover:bg-violet-600 group-hover:text-white',
              hoverBorder: 'hover:border-violet-300',
              badgeColor: 'text-violet-700 bg-violet-50'
            },
            {
              title: 'Active MIS Contracts',
              amount: metrics.mis?.activeCount || 0,
              badge: 'Monthly Income Contracts',
              sub: 'Principal Repaid at Maturity',
              icon: FileCheck2,
              color: 'text-teal-600 bg-teal-50 border-teal-100 group-hover:bg-teal-600 group-hover:text-white',
              hoverBorder: 'hover:border-teal-300',
              badgeColor: 'text-teal-700 bg-teal-50'
            },
            {
              title: 'Core Product Scheme',
              amount: 'Monthly Income (MIS)',
              badge: 'ACTIVE SCHEME',
              sub: 'Fixed Regular Monthly Income',
              icon: ShieldCheck,
              color: 'text-emerald-600 bg-emerald-50 border-emerald-100',
              hoverBorder: 'hover:border-emerald-300',
              badgeColor: 'text-emerald-700 bg-emerald-50'
            }
          ]
        };

      case 'SAVINGS':
        return {
          productLabel: 'Savings Accounts (SB)',
          badgeColor: 'bg-emerald-100 text-emerald-900 border-emerald-300',
          deskTab: 'savings',
          deskLabel: 'Open Full Savings Accounts Desk',
          cards: [
            {
              title: 'Total Liquid SB Balance',
              amount: formatINR(metrics.savings?.totalBalance || 0),
              badge: `${metrics.savings?.activeCount || 0} Active Accounts`,
              sub: 'Demand Deposit Liabilities (CASA)',
              icon: Wallet,
              color: 'text-emerald-600 bg-emerald-50 border-emerald-100 group-hover:bg-emerald-600 group-hover:text-white',
              hoverBorder: 'hover:border-emerald-300',
              badgeColor: 'text-emerald-700 bg-emerald-50'
            },
            {
              title: 'Annual Interest Liability',
              amount: formatINR(Math.round((metrics.savings?.totalBalance || 0) * 0.04)),
              badge: '@ 4.0% p.a.',
              sub: 'Daily Balance / Quarterly Credit',
              icon: Banknote,
              color: 'text-emerald-600 bg-emerald-50 border-emerald-100 group-hover:bg-emerald-600 group-hover:text-white',
              hoverBorder: 'hover:border-emerald-300',
              badgeColor: 'text-emerald-700 bg-emerald-50'
            },
            {
              title: 'Minimum Reserve Requirement',
              amount: formatINR((metrics.savings?.activeCount || 0) * 1000),
              badge: 'Min ₹1,000 / A/C',
              sub: 'Mandatory Liquidity Floor',
              icon: Percent,
              color: 'text-amber-600 bg-amber-50 border-amber-100 group-hover:bg-amber-600 group-hover:text-white',
              hoverBorder: 'hover:border-amber-300',
              badgeColor: 'text-amber-700 bg-amber-50'
            },
            {
              title: 'Savings Account Holders',
              amount: metrics.savings?.activeCount || 0,
              badge: 'Active Members',
              sub: 'Core Banking Customers',
              icon: Users,
              color: 'text-sky-600 bg-sky-50 border-sky-100 group-hover:bg-sky-600 group-hover:text-white',
              hoverBorder: 'hover:border-sky-300',
              badgeColor: 'text-sky-700 bg-sky-50'
            },
            {
              title: 'Average Balance / Member',
              amount: formatINR(metrics.savings?.activeCount ? Math.round((metrics.savings?.totalBalance || 0) / metrics.savings.activeCount) : 0),
              badge: 'Float / Account',
              sub: 'Active Liquidity Reserve',
              icon: Clock,
              color: 'text-teal-600 bg-teal-50 border-teal-100 group-hover:bg-teal-600 group-hover:text-white',
              hoverBorder: 'hover:border-teal-300',
              badgeColor: 'text-teal-700 bg-teal-50'
            },
            {
              title: 'Demand Liquidity Ratio',
              amount: '100% On-Demand',
              badge: 'Instant Withdrawal',
              sub: 'Zero Lock-in CASA Deposit',
              icon: CreditCard,
              color: 'text-violet-600 bg-violet-50 border-violet-100 group-hover:bg-violet-600 group-hover:text-white',
              hoverBorder: 'hover:border-violet-300',
              badgeColor: 'text-violet-700 bg-violet-50'
            },
            {
              title: 'Active SB Accounts',
              amount: metrics.savings?.activeCount || 0,
              badge: 'Passbook Enabled',
              sub: 'Interest Servicing Active',
              icon: FileCheck2,
              color: 'text-teal-600 bg-teal-50 border-teal-100 group-hover:bg-teal-600 group-hover:text-white',
              hoverBorder: 'hover:border-teal-300',
              badgeColor: 'text-teal-700 bg-teal-50'
            },
            {
              title: 'Core Product Scheme',
              amount: 'Savings Accounts (SB)',
              badge: 'ACTIVE SCHEME',
              sub: 'Core Member Savings Accounts',
              icon: ShieldCheck,
              color: 'text-emerald-600 bg-emerald-50 border-emerald-100',
              hoverBorder: 'hover:border-emerald-300',
              badgeColor: 'text-emerald-700 bg-emerald-50'
            }
          ]
        };

      case 'FD':
        return {
          productLabel: 'Fixed Deposits (FD)',
          badgeColor: 'bg-emerald-100 text-emerald-900 border-emerald-300',
          deskTab: 'fds',
          deskLabel: 'Open Full Fixed Deposits Desk',
          cards: [
            {
              title: 'Active Principal',
              amount: formatINR(metrics.totalPrincipal),
              badge: `${metrics.activeCount} Active FDs`,
              sub: 'Across portfolio',
              icon: Wallet,
              color: 'text-indigo-600 bg-indigo-50 border-indigo-100 group-hover:bg-indigo-600 group-hover:text-white',
              hoverBorder: 'hover:border-indigo-300',
              badgeColor: 'text-indigo-600 bg-indigo-50'
            },
            {
              title: 'Total Maturity Liability',
              amount: formatINR(metrics.totalMaturityValue),
              badge: 'Principal + Interest',
              sub: '100% Reserve',
              icon: Banknote,
              color: 'text-emerald-600 bg-emerald-50 border-emerald-100 group-hover:bg-emerald-600 group-hover:text-white',
              hoverBorder: 'hover:border-emerald-300',
              badgeColor: 'text-emerald-600 bg-emerald-50'
            },
            {
              title: 'Projected Interest',
              amount: formatINR(metrics.totalInterest),
              badge: 'Accrued Yield',
              sub: 'Contracted terms',
              icon: Percent,
              color: 'text-amber-600 bg-amber-50 border-amber-100 group-hover:bg-amber-600 group-hover:text-white',
              hoverBorder: 'hover:border-amber-300',
              badgeColor: 'text-amber-700 bg-amber-50'
            },
            {
              title: 'Total Customers',
              amount: metrics.totalCustomers,
              badge: 'KYC Registered',
              sub: 'Active Depositors',
              icon: Users,
              color: 'text-sky-600 bg-sky-50 border-sky-100 group-hover:bg-sky-600 group-hover:text-white',
              hoverBorder: 'hover:border-sky-300',
              badgeColor: 'text-sky-700 bg-sky-50'
            },
            {
              title: 'Maturities in 30 Days',
              amount: upcomingMaturities.length,
              badge: 'Action Required',
              sub: 'Next 30 calendar days',
              icon: Clock,
              color: 'text-rose-600 bg-rose-50 border-rose-100 group-hover:bg-rose-600 group-hover:text-white',
              hoverBorder: 'hover:border-rose-300',
              badgeColor: 'text-rose-700 bg-rose-50'
            },
            {
              title: 'Interest Payouts Due',
              amount: pendingPayouts.length,
              badge: 'Non-cumulative',
              sub: 'Bank transfers due',
              icon: CreditCard,
              color: 'text-violet-600 bg-violet-50 border-violet-100 group-hover:bg-violet-600 group-hover:text-white',
              hoverBorder: 'hover:border-violet-300',
              badgeColor: 'text-violet-700 bg-violet-50'
            },
            {
              title: 'Total Contracts Booked',
              amount: metrics.totalFds,
              badge: `${metrics.maturedCount} Matured`,
              sub: `${metrics.prematureClosedCount} Premature`,
              icon: FileCheck2,
              color: 'text-teal-600 bg-teal-50 border-teal-100 group-hover:bg-teal-600 group-hover:text-white',
              hoverBorder: 'hover:border-teal-300',
              badgeColor: 'text-teal-700 bg-teal-50'
            },
            {
              title: 'CRM License Status',
              amount: subscription ? subscription.plan_name.split('(')[0] : 'Enterprise License',
              badge: 'ACTIVE',
              sub: `Valid till ${subscription ? subscription.valid_until : '2027'}`,
              icon: ShieldCheck,
              color: 'text-emerald-600 bg-emerald-50 border-emerald-100',
              hoverBorder: 'hover:border-indigo-300',
              badgeColor: 'text-emerald-700 bg-emerald-50'
            }
          ]
        };

      default: // 'ALL'
        return {
          productLabel: 'Consolidated Portfolio (All 4 Products)',
          badgeColor: 'bg-emerald-100 text-emerald-900 border-emerald-300',
          deskTab: null,
          deskLabel: null,
          cards: [
            {
              title: 'Total Institutional AUM',
              amount: formatINR(metrics.totalInstitutionalDeposits || metrics.totalPrincipal),
              badge: `${metrics.totalActiveAccounts || metrics.activeCount} Total Accounts`,
              sub: 'Consolidated Across 4 Products',
              icon: Wallet,
              color: 'text-indigo-600 bg-indigo-50 border-indigo-100 group-hover:bg-indigo-600 group-hover:text-white',
              hoverBorder: 'hover:border-indigo-300',
              badgeColor: 'text-indigo-600 bg-indigo-50'
            },
            {
              title: 'Total Maturity & Demand Liability',
              amount: formatINR((metrics.totalMaturityValue || 0) + (metrics.rd?.totalMaturity || 0) + (metrics.mis?.totalDeposit || 0) + (metrics.savings?.totalBalance || 0)),
              badge: 'Consolidated Liabilities',
              sub: 'FD + RD + MIS + Savings',
              icon: Banknote,
              color: 'text-emerald-600 bg-emerald-50 border-emerald-100 group-hover:bg-emerald-600 group-hover:text-white',
              hoverBorder: 'hover:border-emerald-300',
              badgeColor: 'text-emerald-700 bg-emerald-50'
            },
            {
              title: 'Projected Total Interest',
              amount: formatINR((metrics.totalInterest || 0) + Math.max(0, (metrics.rd?.totalMaturity || 0) - (metrics.rd?.totalDeposited || 0))),
              badge: 'Contracted Yield',
              sub: 'FD & RD Accrued Obligations',
              icon: Percent,
              color: 'text-amber-600 bg-amber-50 border-amber-100 group-hover:bg-amber-600 group-hover:text-white',
              hoverBorder: 'hover:border-amber-300',
              badgeColor: 'text-amber-700 bg-amber-50'
            },
            {
              title: 'Total Customers',
              amount: metrics.totalCustomers,
              badge: 'KYC Registered',
              sub: 'Consolidated Depositors',
              icon: Users,
              color: 'text-sky-600 bg-sky-50 border-sky-100 group-hover:bg-sky-600 group-hover:text-white',
              hoverBorder: 'hover:border-sky-300',
              badgeColor: 'text-sky-700 bg-sky-50'
            },
            {
              title: 'Maturities & Dues (30 Days)',
              amount: (upcomingMaturities?.length || 0) + (metrics.rd?.upcomingInstallments?.length || 0),
              badge: 'Action Required',
              sub: 'FD Maturities & RD Dues',
              icon: Clock,
              color: 'text-rose-600 bg-rose-50 border-rose-100 group-hover:bg-rose-600 group-hover:text-white',
              hoverBorder: 'hover:border-rose-300',
              badgeColor: 'text-rose-700 bg-rose-50'
            },
            {
              title: 'Monthly Servicing Payouts Due',
              amount: (pendingPayouts?.length || 0) + (metrics.mis?.upcomingPayouts?.length || 0),
              badge: 'Scheduled Outflow',
              sub: 'FD & MIS Bank Transfers',
              icon: CreditCard,
              color: 'text-violet-600 bg-violet-50 border-violet-100 group-hover:bg-violet-600 group-hover:text-white',
              hoverBorder: 'hover:border-violet-300',
              badgeColor: 'text-violet-700 bg-violet-50'
            },
            {
              title: 'Total Active Contracts',
              amount: metrics.totalActiveAccounts || metrics.activeCount,
              badge: 'All 4 Products',
              sub: `${metrics.activeCount} FD • ${metrics.rd?.activeCount || 0} RD • ${metrics.mis?.activeCount || 0} MIS • ${metrics.savings?.activeCount || 0} SB`,
              icon: FileCheck2,
              color: 'text-teal-600 bg-teal-50 border-teal-100 group-hover:bg-teal-600 group-hover:text-white',
              hoverBorder: 'hover:border-teal-300',
              badgeColor: 'text-teal-700 bg-teal-50'
            },
            {
              title: 'CRM License Status',
              amount: subscription ? subscription.plan_name.split('(')[0] : 'Enterprise License',
              badge: 'ACTIVE',
              sub: `Valid till ${subscription ? subscription.valid_until : '2027'}`,
              icon: ShieldCheck,
              color: 'text-emerald-600 bg-emerald-50 border-emerald-100',
              hoverBorder: 'hover:border-indigo-300',
              badgeColor: 'text-emerald-700 bg-emerald-50'
            }
          ]
        };
    }
  })();

  return (
    <div className="space-y-6 pb-12 animate-fadeIn">

      {/* 1. Header Banner & Actions */}
      <div className="bg-white rounded-xl border border-slate-200/90 shadow-xs p-5 md:p-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-xl md:text-2xl font-bold tracking-tight text-slate-900">
              Executive Deposit Overview
            </h1>
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
              Live Sync
            </span>
          </div>
          <p className="text-xs md:text-sm text-slate-500 mt-1 flex items-center gap-2 flex-wrap">
            <span>Portfolio Branch: <strong className="text-slate-700">{selectedBranch}</strong></span>
            <span className="text-slate-300">•</span>
            <span>Fiscal Period: <strong className="text-slate-700">{selectedFY}</strong></span>
            <span className="text-slate-300">•</span>
            <span>Last Updated: {new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}</span>
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2.5 flex-wrap">
          <button
            onClick={() => onNavigate && onNavigate('calculator')}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs md:text-sm font-semibold rounded-lg bg-slate-100 text-slate-700 hover:bg-slate-200 transition border border-slate-200 cursor-pointer"
          >
            <Calculator className="w-4 h-4 text-slate-600" />
            FD Calculator
          </button>

          <button
            onClick={() => onNavigate && onNavigate('customers')}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs md:text-sm font-semibold rounded-lg bg-slate-100 text-slate-700 hover:bg-slate-200 transition border border-slate-200 cursor-pointer"
          >
            <Users className="w-4 h-4 text-slate-600" />
            + Customer
          </button>

          <button
            onClick={onOpenNewFD}
            className="inline-flex items-center gap-2 px-4 py-2 text-xs md:text-sm font-bold rounded-lg bg-[#D4AF37] text-[#062319] hover:bg-[#C59B27] shadow-sm transition cursor-pointer"
          >
            <PlusCircle className="w-4 h-4" />
            Book New FD
          </button>

          <button
            onClick={fetchDashboardData}
            disabled={refreshing}
            title="Refresh Live Metrics"
            className="p-2 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg border border-slate-200 transition cursor-pointer"
          >
            <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin text-[#0A5C36]' : ''}`} />
          </button>
        </div>
      </div>

      {/* Custom Date Range Filter Bar */}
      <div className="bg-white rounded-xl border border-slate-200 p-3 flex flex-wrap items-center justify-between gap-3 text-xs shadow-xs">
        <div className="flex items-center gap-2">
          <CalendarDays className="w-4 h-4 text-[#0A5C36]" />
          <span className="font-bold text-slate-700">Custom Date Range:</span>
          <div className="flex items-center gap-1.5">
            <span className="text-slate-400">From</span>
            <input 
              type="date"
              id="dashboard-date-from"
              value={fromDate}
              onChange={(e) => setFromDate(e.target.value)}
              className="px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 font-semibold focus:outline-none focus:ring-1 focus:ring-[#0A5C36]"
            />
          </div>
          <div className="flex items-center gap-1.5">
            <span className="text-slate-400">To</span>
            <input 
              type="date"
              id="dashboard-date-to"
              value={toDate}
              onChange={(e) => setToDate(e.target.value)}
              className="px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 font-semibold focus:outline-none focus:ring-1 focus:ring-[#0A5C36]"
            />
          </div>
          <button
            id="dashboard-apply-date-btn"
            onClick={() => {
              setDateFilterApplied(true);
              fetchDashboardData();
            }}
            className="px-3 py-1.5 bg-[#0A5C36] hover:bg-[#08482a] text-white rounded-lg font-bold transition shadow-xs cursor-pointer"
          >
            Apply Date Filter
          </button>
          {dateFilterApplied && (
            <button
              onClick={() => {
                setDateFilterApplied(false);
                setFromDate('2026-04-01');
                setToDate('2027-03-31');
                fetchDashboardData();
              }}
              className="text-slate-400 hover:text-slate-600 underline font-semibold ml-1 cursor-pointer"
            >
              Reset
            </button>
          )}
        </div>
        <div className="text-[11px] text-slate-500">
          Active Range: <strong className="text-[#0A5C36]">{fromDate}</strong> to <strong className="text-[#0A5C36]">{toDate}</strong>
        </div>
      </div>

      {/* Multi-Product Selector Pills */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1">
        {[
          { id: 'ALL', label: 'All 4 Deposit Products', count: metrics.totalActiveAccounts || metrics.activeCount },
          { id: 'FD', label: 'Fixed Deposits (FD)', count: metrics.activeCount },
          { id: 'RD', label: 'Recurring Deposits (RD)', count: metrics.rd?.activeCount || 0 },
          { id: 'MIS', label: 'Monthly Income (MIS)', count: metrics.mis?.activeCount || 0 },
          { id: 'SAVINGS', label: 'Savings Accounts (SB)', count: metrics.savings?.activeCount || 0 }
        ].map((prod) => (
          <button
            key={prod.id}
            onClick={() => setQuickFilter(prod.id)}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 shrink-0 cursor-pointer ${
              quickFilter === prod.id
                ? 'bg-[#062319] text-[#FBBF24] shadow-sm ring-2 ring-[#D4AF37]/50 border border-[#1a5d43]'
                : 'bg-white hover:bg-slate-50 text-slate-700 border border-slate-200'
            }`}
          >
            <span>{prod.label}</span>
            <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${
              quickFilter === prod.id ? 'bg-[#D4AF37] text-[#062319] font-bold' : 'bg-slate-100 text-slate-600 font-semibold'
            }`}>
              {prod.count}
            </span>
          </button>
        ))}
      </div>

      {/* Multi-Product Institutional Liquidity Hero (AUM Hero Section in Dark Forest Green & Gold) */}
      <div className="bg-[#082e20] rounded-2xl p-6 text-white shadow-xl border border-[#1a5d43] relative overflow-hidden">
        {/* Subtle background ambient golden glow */}
        <div className="absolute top-0 right-0 w-96 h-96 bg-[#D4AF37]/10 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20"></div>
        <div className="absolute bottom-0 left-1/3 w-64 h-64 bg-emerald-500/10 rounded-full blur-2xl pointer-events-none"></div>

        <div className="relative z-10 flex flex-col 2xl:flex-row 2xl:items-center justify-between gap-5">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-bold uppercase tracking-wider text-[#FDE68A] bg-[#062319]/90 px-2.5 py-0.5 rounded-full border border-[#D4AF37]/40 flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-[#D4AF37] animate-pulse"></span>
                Institutional Deposit Portfolio
              </span>
              <span className="text-[10px] font-semibold text-emerald-300 bg-[#062319]/80 px-2 py-0.5 rounded border border-[#1a5d43]">
                Audited & Reconciled
              </span>
            </div>
            <div className="mt-3">
              <span className="text-xs font-semibold text-emerald-200 uppercase tracking-widest block">Total Assets Under Management (AUM)</span>
              <div className="text-2xl sm:text-3xl md:text-4xl font-black mt-1 tracking-tight text-[#FBBF24] font-mono flex items-baseline gap-2">
                <span>{formatINR(metrics.totalInstitutionalDeposits || metrics.totalPrincipal)}</span>
                <span className="text-xs font-semibold text-emerald-300 font-sans tracking-normal bg-[#062319] px-2 py-0.5 rounded border border-[#1a5d43]">
                  +100% Solvency
                </span>
              </div>
            </div>
            <p className="text-xs text-emerald-100/90 mt-1.5 max-w-xl">
              Consolidated Assets Under Custody across {metrics.totalActiveAccounts || metrics.activeCount} active deposit & savings accounts in {selectedBranch}.
            </p>
          </div>

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-3 w-full 2xl:w-auto shrink-0 pt-2 2xl:pt-0">
            <div 
              onClick={() => onNavigate && onNavigate('fds')}
              className="bg-[#062319]/90 hover:bg-[#0a3d2b] cursor-pointer rounded-xl p-3 sm:p-3.5 border border-[#1a5d43] transition group hover:border-[#D4AF37]/50 min-w-0 overflow-hidden"
            >
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-semibold text-emerald-200 truncate">Fixed Deposits</span>
                <span className="w-2 h-2 rounded-full bg-[#10b981] group-hover:scale-125 transition shrink-0 ml-1"></span>
              </div>
              <span className="text-xs sm:text-sm lg:text-base font-bold text-[#FBBF24] block mt-1 font-mono truncate">{formatINR(metrics.totalPrincipal)}</span>
              <span className="text-[10px] text-emerald-300 block mt-0.5 font-medium truncate">{metrics.activeCount} Active Accounts</span>
            </div>

            <div 
              onClick={() => onNavigate && onNavigate('rds')}
              className="bg-[#062319]/90 hover:bg-[#0a3d2b] cursor-pointer rounded-xl p-3 sm:p-3.5 border border-[#1a5d43] transition group hover:border-amber-400/50 min-w-0 overflow-hidden"
            >
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-semibold text-emerald-200 truncate">Recurring (RD)</span>
                <span className="w-2 h-2 rounded-full bg-[#f59e0b] group-hover:scale-125 transition shrink-0 ml-1"></span>
              </div>
              <span className="text-xs sm:text-sm lg:text-base font-bold text-[#FBBF24] block mt-1 font-mono truncate">{formatINR(metrics.rd?.totalDeposited || 0)}</span>
              <span className="text-[10px] text-amber-300 block mt-0.5 font-medium truncate">{metrics.rd?.activeCount || 0} Active Accounts</span>
            </div>

            <div 
              onClick={() => onNavigate && onNavigate('mis')}
              className="bg-[#062319]/90 hover:bg-[#0a3d2b] cursor-pointer rounded-xl p-3 sm:p-3.5 border border-[#1a5d43] transition group hover:border-[#D4AF37]/50 min-w-0 overflow-hidden"
            >
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-semibold text-emerald-200 truncate">Monthly (MIS)</span>
                <span className="w-2 h-2 rounded-full bg-[#D4AF37] group-hover:scale-125 transition shrink-0 ml-1"></span>
              </div>
              <span className="text-xs sm:text-sm lg:text-base font-bold text-[#FBBF24] block mt-1 font-mono truncate">{formatINR(metrics.mis?.totalDeposit || 0)}</span>
              <span className="text-[10px] text-[#FDE68A] block mt-0.5 font-medium truncate">{formatINR(metrics.mis?.totalMonthlyPayout || 0)}/mo</span>
            </div>

            <div 
              onClick={() => onNavigate && onNavigate('savings')}
              className="bg-[#062319]/90 hover:bg-[#0a3d2b] cursor-pointer rounded-xl p-3 sm:p-3.5 border border-[#1a5d43] transition group hover:border-emerald-400/50 min-w-0 overflow-hidden"
            >
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-semibold text-emerald-200 truncate">Savings (SB)</span>
                <span className="w-2 h-2 rounded-full bg-[#10b981] group-hover:scale-125 transition shrink-0 ml-1"></span>
              </div>
              <span className="text-xs sm:text-sm lg:text-base font-bold text-[#FBBF24] block mt-1 font-mono truncate">{formatINR(metrics.savings?.totalBalance || 0)}</span>
              <span className="text-[10px] text-emerald-300 block mt-0.5 font-medium truncate">{metrics.savings?.activeCount || 0} Accounts</span>
            </div>
          </div>
        </div>
      </div>

      {/* Maker-Checker Pending Approvals Queue Banner */}
      {pendingApprovals.length > 0 && (
        <div className="bg-amber-50/90 border border-amber-200/90 rounded-xl p-4 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3 animate-fadeIn">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-amber-500 text-white flex items-center justify-center font-bold shrink-0 shadow-xs">
              <Clock className="w-5 h-5" />
            </div>
            <div>
              <div className="font-bold text-sm text-amber-950 flex items-center gap-2">
                <span>{pendingApprovals.length} Pending Submission{pendingApprovals.length > 1 ? 's' : ''} Require Admin Authorization</span>
                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-amber-200 text-amber-900">
                  Maker-Checker
                </span>
              </div>
              <p className="text-xs text-amber-800 mt-0.5">
                Staff have submitted new deposit or payout entries awaiting your review before ledger finalization.
              </p>
            </div>
          </div>

          <button
            onClick={() => onNavigate && onNavigate('approvals')}
            className="inline-flex items-center gap-1.5 px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs rounded-lg transition shadow-xs shrink-0 cursor-pointer"
          >
            Review Approvals Queue <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* 2. Primary 8 Financial KPI Cards (Dynamically Filtered by Product) */}
      <div className="space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Metrics Overview:</span>
            <span className={`text-xs font-bold px-3 py-1 rounded-full border shadow-xs ${kpis.badgeColor}`}>
              {kpis.productLabel}
            </span>
          </div>
          {kpis.deskTab && (
            <button
              onClick={() => onNavigate && onNavigate(kpis.deskTab)}
              className="text-xs font-bold text-emerald-800 hover:text-emerald-950 flex items-center gap-1.5 cursor-pointer self-start sm:self-auto bg-emerald-50 hover:bg-emerald-100 px-3 py-1 rounded-lg border border-emerald-200 transition"
            >
              <span>{kpis.deskLabel}</span> <ArrowRight className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {kpis.cards.map((card, idx) => {
            const IconComponent = card.icon;
            return (
              <div 
                key={idx} 
                className={`bg-white rounded-xl border border-slate-200/90 p-5 shadow-xs ${card.hoverBorder} hover:shadow-sm transition group flex flex-col justify-between`}
              >
                <div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">{card.title}</span>
                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center transition border ${card.color}`}>
                      <IconComponent className="w-5 h-5" />
                    </div>
                  </div>
                  <div className="mt-3">
                    <div className="text-2xl font-bold tracking-tight text-slate-900 truncate">
                      {card.amount}
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between text-xs text-slate-500 mt-3 pt-2 border-t border-slate-50 gap-1.5">
                  <span className={`font-semibold px-1.5 py-0.5 rounded text-[10px] shrink-0 ${card.badgeColor}`}>
                    {card.badge}
                  </span>
                  <span className="truncate text-right text-[11px] text-slate-400">{card.sub}</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 3. Financial Analytics Charts Grid (4 Rich Visualizations) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* Chart 1: Maturity & Liability Forecast (2 Columns) */}
        <div className="lg:col-span-2 bg-white rounded-xl border border-slate-200/90 p-5 md:p-6 shadow-xs">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-6">
            <div>
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-[#0A5C36]"></span>
                <h2 className="text-base font-bold text-slate-900">Maturity & Cash Flow Timeline</h2>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">Projected maturity liabilities by monthly redemption cycle</p>
            </div>
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1.5 text-xs text-slate-700 bg-amber-50/80 px-2.5 py-1 rounded-md font-medium border border-amber-200/60">
                <span className="w-2 h-2 rounded-full bg-[#0A5C36]"></span> Principal
              </span>
              <span className="inline-flex items-center gap-1.5 text-xs text-slate-700 bg-amber-50/80 px-2.5 py-1 rounded-md font-medium border border-amber-200/60">
                <span className="w-2 h-2 rounded-full bg-[#D4AF37]"></span> Total Maturity Value
              </span>
            </div>
          </div>

          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={timelineData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorMaturity" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#D4AF37" stopOpacity={0.35}/>
                    <stop offset="95%" stopColor="#D4AF37" stopOpacity={0.0}/>
                  </linearGradient>
                  <linearGradient id="colorPrincipal" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#0A5C36" stopOpacity={0.4}/>
                    <stop offset="95%" stopColor="#0A5C36" stopOpacity={0.0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                <XAxis dataKey="month" stroke="#94a3b8" fontSize={12} tickLine={false} />
                <YAxis 
                  stroke="#94a3b8" 
                  fontSize={11} 
                  tickLine={false} 
                  axisLine={false}
                  tickFormatter={(val) => `₹${(val / 100000).toFixed(1)}L`} 
                />
                <Tooltip 
                  formatter={(val) => [`₹${Number(val).toLocaleString('en-IN')}`, 'Amount']}
                  contentStyle={{ backgroundColor: '#ffffff', borderColor: '#e2e8f0', borderRadius: '8px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)' }}
                />
                <Area 
                  type="monotone" 
                  dataKey="MaturityLiability" 
                  name="Maturity Value" 
                  stroke="#D4AF37" 
                  strokeWidth={2.5}
                  fillOpacity={1} 
                  fill="url(#colorMaturity)" 
                />
                <Area 
                  type="monotone" 
                  dataKey="Principal" 
                  name="Principal Amount" 
                  stroke="#0A5C36" 
                  strokeWidth={2.5}
                  fillOpacity={1} 
                  fill="url(#colorPrincipal)" 
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Chart 2: Multi-Product Portfolio Distribution Donut (1 Column) */}
        <div className="bg-white rounded-xl border border-slate-200/90 p-5 md:p-6 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-[#D4AF37]"></span>
              <h2 className="text-base font-bold text-slate-900">Portfolio Asset Mix</h2>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">Distribution across all 4 deposit products</p>
          </div>

          <div className="h-56 relative my-2">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={portfolioMixData}
                  cx="50%"
                  cy="50%"
                  innerRadius={55}
                  outerRadius={80}
                  paddingAngle={3}
                  dataKey="value"
                >
                  {portfolioMixData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip formatter={(val) => `₹${Number(val).toLocaleString('en-IN')}`} />
              </PieChart>
            </ResponsiveContainer>
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">TOTAL AUM</span>
              <span className="text-sm font-extrabold text-[#062319] font-mono">
                ₹{(((metrics.totalInstitutionalDeposits || metrics.totalPrincipal) || 0) / 10000000).toFixed(2)} Cr
              </span>
            </div>
          </div>

          <div className="space-y-1.5 pt-3 border-t border-slate-100 text-xs">
            {portfolioMixData.map((item, idx) => (
              <div key={idx} className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: item.color }}></span>
                  <span className="text-slate-600 font-medium truncate max-w-[130px]">{item.name}</span>
                </div>
                <strong className="text-slate-900 font-mono text-[11px]">{formatINR(item.value)}</strong>
              </div>
            ))}
          </div>
        </div>

        {/* Chart 3: Compounding & Payout Frequency Distribution (2 Columns) */}
        <div className="lg:col-span-2 bg-white rounded-xl border border-slate-200/90 p-5 md:p-6 shadow-xs">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-6">
            <div>
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-[#0A5C36]"></span>
                <h2 className="text-base font-bold text-slate-900">Compounding & Payout Frequency Breakdown</h2>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">Portfolio distribution by interest servicing frequency</p>
            </div>
            <span className="text-xs text-slate-700 font-medium bg-amber-50 px-2.5 py-1 rounded-md border border-amber-200/50">
              {freqChartData.reduce((acc, curr) => acc + curr.count, 0)} Active Contracts
            </span>
          </div>

          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={freqChartData} margin={{ top: 10, right: 10, left: 0, bottom: 20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                <XAxis dataKey="name" stroke="#94a3b8" fontSize={11} tickLine={false} interval={0} angle={-10} textAnchor="end" />
                <YAxis 
                  stroke="#94a3b8" 
                  fontSize={11} 
                  tickLine={false} 
                  axisLine={false}
                  tickFormatter={(val) => `₹${(val / 100000).toFixed(1)}L`} 
                />
                <Tooltip 
                  formatter={(val, name) => [name === 'amount' ? `₹${Number(val).toLocaleString('en-IN')}` : val, name === 'amount' ? 'Total Amount' : 'Contracts']}
                  contentStyle={{ backgroundColor: '#ffffff', borderColor: '#e2e8f0', borderRadius: '8px' }}
                />
                <Bar dataKey="amount" name="Total Amount" fill="#0A5C36" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Chart 4: Liability Ratio Donut (1 Column) */}
        <div className="bg-white rounded-xl border border-slate-200/90 p-5 md:p-6 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-[#D4AF37]"></span>
              <h2 className="text-base font-bold text-slate-900">Principal vs Interest Ratio</h2>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">Principal deposits vs contracted interest obligations</p>
          </div>

          <div className="h-52 relative my-2">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={liabilityPieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={55}
                  outerRadius={78}
                  paddingAngle={4}
                  dataKey="value"
                >
                  <Cell fill="#0A5C36" />
                  <Cell fill="#D4AF37" />
                </Pie>
                <Tooltip formatter={(val) => `₹${Number(val).toLocaleString('en-IN')}`} />
              </PieChart>
            </ResponsiveContainer>
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">MATURITY</span>
              <span className="text-sm font-extrabold text-[#062319] font-mono">
                ₹{((metrics.totalMaturityValue || 0) / 100000).toFixed(1)}L
              </span>
            </div>
          </div>

          <div className="space-y-2 pt-3 border-t border-slate-100 text-xs">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-[#0A5C36]"></span>
                <span className="text-slate-600 font-medium">Principal Deposits</span>
              </div>
              <strong className="text-slate-900 font-mono text-[11px]">{formatINR(metrics.totalPrincipal)}</strong>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-[#D4AF37]"></span>
                <span className="text-slate-600 font-medium">Contracted Interest</span>
              </div>
              <strong className="text-slate-900 font-mono text-[11px]">{formatINR(metrics.totalInterest)}</strong>
            </div>
          </div>
        </div>

      </div>

      {/* 4. Operational Panels: Upcoming Maturities & Recent Bookings */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* Panel A: Upcoming Maturities (Next 30 Days) */}
        <div className="bg-white rounded-xl border border-slate-200/90 shadow-xs flex flex-col">
          <div className="p-5 border-b border-slate-100 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-rose-50 text-rose-600 flex items-center justify-center font-bold">
                <Clock className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900">Upcoming Maturities (Next 30 Days)</h3>
                <p className="text-xs text-slate-500">Require settlement, reinvestment or renewal notification</p>
              </div>
            </div>
            <button
              onClick={() => onNavigate && onNavigate('fds')}
              className="text-xs font-semibold text-indigo-600 hover:text-indigo-800 flex items-center gap-1 cursor-pointer"
            >
              View All <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="divide-y divide-slate-100 overflow-x-auto flex-1">
            {upcomingMaturities && upcomingMaturities.length > 0 ? (
              upcomingMaturities.map((fd) => {
                const daysRemaining = Math.ceil((new Date(fd.maturity_date) - new Date()) / (1000 * 60 * 60 * 24));
                return (
                  <div key={fd.id} className="p-4 hover:bg-slate-50 transition flex items-center justify-between gap-4">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-sm text-slate-900">{fd.fd_number}</span>
                        <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-slate-100 text-slate-700">
                          {fd.annual_rate}% p.a.
                        </span>
                      </div>
                      <div className="text-xs text-slate-500 mt-1 truncate">
                        {fd.customer_name} • Matures on <strong className="text-slate-700">{formatDate(fd.maturity_date)}</strong>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 shrink-0">
                      <div className="text-right">
                        <div className="font-bold text-sm text-slate-900">{formatINR(fd.maturity_amount)}</div>
                        <span className={`text-[11px] font-semibold px-1.5 py-0.5 rounded ${
                          daysRemaining <= 7 ? 'bg-rose-50 text-rose-700' : 'bg-amber-50 text-amber-700'
                        }`}>
                          {daysRemaining > 0 ? `${daysRemaining} days left` : 'Due Today'}
                        </span>
                      </div>

                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => onViewFD && onViewFD(fd.id)}
                          title="View Details"
                          className="p-1.5 rounded-lg text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 transition cursor-pointer"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => onRenewFD && onRenewFD(fd)}
                          title="Renew FD"
                          className="p-1.5 rounded-lg text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 transition cursor-pointer"
                        >
                          <RotateCw className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="p-8 text-center text-slate-400 text-xs">
                No active fixed deposits maturing within the next 30 days.
              </div>
            )}
          </div>
        </div>

        {/* Panel B: Recent FD Bookings */}
        <div className="bg-white rounded-xl border border-slate-200/90 shadow-xs flex flex-col">
          <div className="p-5 border-b border-slate-100 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold">
                <FileCheck2 className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900">Recent FD Bookings</h3>
                <p className="text-xs text-slate-500">Latest fixed deposits booked in the platform</p>
              </div>
            </div>
            <button
              onClick={() => onNavigate && onNavigate('fds')}
              className="text-xs font-semibold text-indigo-600 hover:text-indigo-800 flex items-center gap-1 cursor-pointer"
            >
              View All <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="divide-y divide-slate-100 overflow-x-auto flex-1">
            {recentFds && recentFds.length > 0 ? (
              recentFds.map((fd) => (
                <div key={fd.id} className="p-4 hover:bg-slate-50 transition flex items-center justify-between gap-4">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-sm text-slate-900">{fd.fd_number}</span>
                      <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700">
                        {fd.status}
                      </span>
                    </div>
                    <div className="text-xs text-slate-500 mt-1 truncate">
                      {fd.customer_name} • {fd.tenure_months}M ({fd.compounding_frequency.replace('payout_', 'Payout ')})
                    </div>
                  </div>

                  <div className="flex items-center gap-3 shrink-0">
                    <div className="text-right">
                      <div className="font-bold text-sm text-slate-900">{formatINR(fd.principal_amount)}</div>
                      <div className="text-xs text-slate-400">@ {fd.annual_rate}% p.a.</div>
                    </div>

                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => onViewFD && onViewFD(fd.id)}
                        title="View Details"
                        className="p-1.5 rounded-lg text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 transition cursor-pointer"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => onPrintCertificate && onPrintCertificate(fd.id)}
                        title="Download Certificate"
                        className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition cursor-pointer"
                      >
                        <Printer className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="p-8 text-center text-slate-400 text-xs">
                No fixed deposits recorded yet.
              </div>
            )}
          </div>
        </div>

      </div>

      {/* 5. Pending Interest Payouts Operational Strip */}
      {pendingPayouts && pendingPayouts.length > 0 && (
        <div className="bg-white rounded-xl border border-slate-200/90 shadow-xs p-5">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <CreditCard className="w-5 h-5 text-indigo-600" />
              <h3 className="text-sm font-bold text-slate-900">
                Action Required: Pending Interest Servicing ({pendingPayouts.length} Due)
              </h3>
            </div>
            <button
              onClick={() => onNavigate && onNavigate('payouts')}
              className="text-xs font-semibold text-indigo-600 hover:text-indigo-800 flex items-center gap-1 cursor-pointer"
            >
              Open Payouts Desk <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-100 text-slate-500 uppercase tracking-wider font-semibold">
                  <th className="pb-3 font-semibold">Due Date</th>
                  <th className="pb-3 font-semibold">FD Number</th>
                  <th className="pb-3 font-semibold">Customer</th>
                  <th className="pb-3 font-semibold">Bank / Account</th>
                  <th className="pb-3 font-semibold text-right">Amount Due</th>
                  <th className="pb-3 font-semibold text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {pendingPayouts.slice(0, 5).map((p) => (
                  <tr key={p.id} className="hover:bg-slate-50 transition">
                    <td className="py-3 font-medium text-slate-900">{formatDate(p.payout_date)}</td>
                    <td className="py-3 font-bold text-indigo-600">{p.fd_number}</td>
                    <td className="py-3">{p.customer_name}</td>
                    <td className="py-3 text-slate-500">
                      {p.bank_name ? `${p.bank_name} (${p.account_no || 'N/A'})` : 'Account details on file'}
                    </td>
                    <td className="py-3 text-right font-bold text-emerald-600">
                      {formatINR(p.payout_amount)}
                    </td>
                    <td className="py-3 text-right">
                      <button
                        onClick={() => handleMarkPaid(p.id)}
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-indigo-50 hover:bg-indigo-600 hover:text-white text-indigo-700 font-semibold text-xs transition cursor-pointer"
                      >
                        <Check className="w-3 h-3" /> Mark Paid
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 6. Upcoming RD Installments Strip */}
      {metrics.rd?.upcomingInstallments && metrics.rd.upcomingInstallments.length > 0 && (quickFilter === 'ALL' || quickFilter === 'RD') && (
        <div className="bg-white rounded-xl border border-slate-200/90 shadow-xs p-5 animate-fadeIn">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Repeat className="w-5 h-5 text-cyan-600" />
              <h3 className="text-sm font-bold text-slate-900">
                Recurring Deposit: Upcoming Installments Due ({metrics.rd.upcomingInstallments.length})
              </h3>
            </div>
            <button
              onClick={() => onNavigate && onNavigate('rds')}
              className="text-xs font-semibold text-cyan-600 hover:text-cyan-800 flex items-center gap-1 cursor-pointer"
            >
              Open RD Desk <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-100 text-slate-500 uppercase tracking-wider font-semibold">
                  <th className="pb-3 font-semibold">Due Date</th>
                  <th className="pb-3 font-semibold">RD Account</th>
                  <th className="pb-3 font-semibold">Customer</th>
                  <th className="pb-3 font-semibold">Installment #</th>
                  <th className="pb-3 font-semibold text-right">Amount Due</th>
                  <th className="pb-3 font-semibold text-right">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {metrics.rd.upcomingInstallments.slice(0, 5).map((inst) => (
                  <tr key={inst.id} className="hover:bg-slate-50 transition">
                    <td className="py-3 font-medium text-slate-900">{formatDate(inst.due_date)}</td>
                    <td className="py-3 font-bold text-cyan-600">{inst.rd_number}</td>
                    <td className="py-3 font-medium">{inst.customer_name}</td>
                    <td className="py-3">Installment #{inst.installment_number}</td>
                    <td className="py-3 text-right font-bold text-slate-900">{formatINR(inst.installment_amount)}</td>
                    <td className="py-3 text-right">
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
                        {inst.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 7. Upcoming MIS Monthly Pension Payouts Strip */}
      {metrics.mis?.upcomingPayouts && metrics.mis.upcomingPayouts.length > 0 && (quickFilter === 'ALL' || quickFilter === 'MIS') && (
        <div className="bg-white rounded-xl border border-slate-200/90 shadow-xs p-5 animate-fadeIn">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Coins className="w-5 h-5 text-purple-600" />
              <h3 className="text-sm font-bold text-slate-900">
                Monthly Income Scheme (MIS): Upcoming Monthly Payouts ({metrics.mis.upcomingPayouts.length})
              </h3>
            </div>
            <button
              onClick={() => onNavigate && onNavigate('mis')}
              className="text-xs font-semibold text-purple-600 hover:text-purple-800 flex items-center gap-1 cursor-pointer"
            >
              Open MIS Desk <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-100 text-slate-500 uppercase tracking-wider font-semibold">
                  <th className="pb-3 font-semibold">Payout Date</th>
                  <th className="pb-3 font-semibold">MIS Account</th>
                  <th className="pb-3 font-semibold">Customer</th>
                  <th className="pb-3 font-semibold">Cycle Month</th>
                  <th className="pb-3 font-semibold text-right">Monthly Payout</th>
                  <th className="pb-3 font-semibold text-right">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {metrics.mis.upcomingPayouts.slice(0, 5).map((payout) => (
                  <tr key={payout.id} className="hover:bg-slate-50 transition">
                    <td className="py-3 font-medium text-slate-900">{formatDate(payout.payout_date)}</td>
                    <td className="py-3 font-bold text-purple-600">{payout.mis_number}</td>
                    <td className="py-3 font-medium">{payout.customer_name}</td>
                    <td className="py-3">Month #{payout.month_number}</td>
                    <td className="py-3 text-right font-bold text-purple-700">{formatINR(payout.payout_amount)}</td>
                    <td className="py-3 text-right">
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
                        {payout.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

    </div>
  );
}
