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
  CheckCircle,
  FileText,
  Building2,
  CalendarDays
} from 'lucide-react';
import { formatINR, formatDate, apiRequest } from '../utils';

export default function Dashboard({ 
  onNavigate, 
  onOpenNewFD, 
  onViewFD, 
  onPrintCertificate 
}) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      const res = await apiRequest('/analytics/dashboard');
      setData(res.data);
    } catch (err) {
      setError(err.message || 'Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const handleMarkPaid = async (scheduleId) => {
    try {
      await apiRequest(`/fds/schedule/${scheduleId}/mark-paid`, {
        method: 'POST',
        body: JSON.stringify({
          payment_reference: 'NEFT-' + Date.now(),
          paid_date: new Date().toISOString().split('T')[0]
        })
      });
      fetchDashboardData();
    } catch (err) {
      alert('Error updating payout: ' + err.message);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="w-10 h-10 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 bg-rose-50 border border-rose-200 text-rose-700 rounded-2xl">
        <p className="font-bold">Error loading dashboard</p>
        <p className="text-sm">{error}</p>
      </div>
    );
  }

  const { metrics, upcomingMaturities, pendingPayouts, recentFds, subscription } = data;

  return (
    <div className="space-y-8">
      
      {/* Top Welcome & Quick Actions */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Fixed Deposit Overview</h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Real-time portfolio status, upcoming maturities & monthly interest liabilities
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => onNavigate('calculator')}
            className="px-4 py-2.5 bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 font-semibold rounded-xl text-xs flex items-center gap-2 shadow-sm transition cursor-pointer"
          >
            <Calculator className="w-4 h-4 text-indigo-600" />
            Live Calculator
          </button>

          <button
            onClick={onOpenNewFD}
            className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-xl text-xs flex items-center gap-2 shadow-lg shadow-indigo-600/20 transition cursor-pointer"
          >
            <PlusCircle className="w-4 h-4" />
            Book New FD
          </button>
        </div>
      </div>

      {/* Subscription Banner */}
      {subscription && (
        <div className={`p-4 rounded-2xl border flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 ${
          subscription.status === 'ACTIVE' 
            ? 'bg-emerald-50/80 border-emerald-200 text-emerald-900' 
            : 'bg-amber-50 border-amber-200 text-amber-900'
        }`}>
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-xl ${subscription.status === 'ACTIVE' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
              <CheckCircle className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-sm">{subscription.plan_name}</span>
                <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-white/80 border border-emerald-300">
                  {subscription.status}
                </span>
              </div>
              <p className="text-xs opacity-90">
                Monthly Subscription • Valid until <span className="font-bold">{formatDate(subscription.valid_until)}</span>
              </p>
            </div>
          </div>

          <button
            onClick={() => onNavigate('subscription')}
            className="text-xs font-bold px-3.5 py-2 bg-white rounded-xl shadow-sm border border-emerald-200 hover:bg-emerald-100/50 transition cursor-pointer text-emerald-800"
          >
            Manage Subscription
          </button>
        </div>
      )}

      {/* Metric Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        
        {/* Card 1: Total Active Principal */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm relative overflow-hidden group hover:shadow-md transition">
          <div className="flex justify-between items-start">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Active Deposit Base (मूलधन)
            </span>
            <div className="p-2.5 bg-indigo-50 text-indigo-600 rounded-xl">
              <Wallet className="w-5 h-5" />
            </div>
          </div>
          <div className="text-2xl font-black text-slate-900 mt-2">
            {formatINR(metrics.totalPrincipal)}
          </div>
          <div className="text-xs text-indigo-600 font-semibold mt-1 flex items-center gap-1">
            <span>{metrics.activeCount} Active Accounts</span>
          </div>
        </div>

        {/* Card 2: Total Maturity Value */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm relative overflow-hidden group hover:shadow-md transition">
          <div className="flex justify-between items-start">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Maturity Liability (कुल देनदारी)
            </span>
            <div className="p-2.5 bg-emerald-50 text-emerald-600 rounded-xl">
              <TrendingUp className="w-5 h-5" />
            </div>
          </div>
          <div className="text-2xl font-black text-slate-900 mt-2">
            {formatINR(metrics.totalMaturityValue)}
          </div>
          <div className="text-xs text-emerald-600 font-semibold mt-1 flex items-center gap-1">
            <span>+{formatINR(metrics.totalInterest)} Interest Component</span>
          </div>
        </div>

        {/* Card 3: Total Customers */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm relative overflow-hidden group hover:shadow-md transition">
          <div className="flex justify-between items-start">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Registered Clients (ग्राहक)
            </span>
            <div className="p-2.5 bg-blue-50 text-blue-600 rounded-xl">
              <Users className="w-5 h-5" />
            </div>
          </div>
          <div className="text-2xl font-black text-slate-900 mt-2">
            {metrics.totalCustomers}
          </div>
          <div className="text-xs text-blue-600 font-semibold mt-1 flex items-center gap-1 cursor-pointer" onClick={() => onNavigate('customers')}>
            <span>View All Profiles &rarr;</span>
          </div>
        </div>

        {/* Card 4: Total Cumulative Accounts */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm relative overflow-hidden group hover:shadow-md transition">
          <div className="flex justify-between items-start">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Total FDs Managed
            </span>
            <div className="p-2.5 bg-violet-50 text-violet-600 rounded-xl">
              <FileCheck2 className="w-5 h-5" />
            </div>
          </div>
          <div className="text-2xl font-black text-slate-900 mt-2">
            {metrics.totalFds}
          </div>
          <div className="text-xs text-slate-500 font-medium mt-1">
            {metrics.maturedCount} Matured • {metrics.prematureClosedCount} Liquidated
          </div>
        </div>

      </div>

      {/* Critical Operational Sections */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Section 1: Upcoming Maturities (Next 30 Days) */}
        <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-4 border-b border-slate-100 mb-4">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-amber-50 text-amber-600 rounded-xl">
                  <Clock className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-800 text-sm">Upcoming Maturities (अगले 30 दिन)</h3>
                  <p className="text-xs text-slate-400">Deposits due for redemption or renewal</p>
                </div>
              </div>
              <span className="text-xs font-bold bg-amber-100 text-amber-800 px-2.5 py-1 rounded-full">
                {upcomingMaturities.length} Due
              </span>
            </div>

            {upcomingMaturities.length === 0 ? (
              <div className="py-8 text-center text-slate-400 text-sm">
                Next 30 days mein koi FD mature nahi hone wali hai.
              </div>
            ) : (
              <div className="space-y-3">
                {upcomingMaturities.map((fd) => (
                  <div 
                    key={fd.id} 
                    className="p-3.5 bg-slate-50 hover:bg-slate-100/80 rounded-xl border border-slate-100 transition flex items-center justify-between text-xs"
                  >
                    <div>
                      <div className="font-bold text-slate-800 flex items-center gap-2">
                        <span>{fd.fd_number}</span>
                        <span className="text-slate-400">•</span>
                        <span>{fd.customer_name}</span>
                      </div>
                      <p className="text-slate-500 mt-0.5">
                        Maturity: <span className="font-semibold text-rose-600">{formatDate(fd.maturity_date)}</span>
                      </p>
                    </div>

                    <div className="text-right">
                      <div className="font-bold text-slate-900 text-sm">{formatINR(fd.maturity_amount)}</div>
                      <button
                        onClick={() => onViewFD(fd.id)}
                        className="text-indigo-600 hover:text-indigo-800 font-semibold text-[11px] mt-0.5"
                      >
                        Action / Renew &rarr;
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="pt-4 mt-4 border-t border-slate-100 text-right">
            <button 
              onClick={() => onNavigate('fds')}
              className="text-xs font-semibold text-indigo-600 hover:underline"
            >
              View All Fixed Deposits &rarr;
            </button>
          </div>
        </div>

        {/* Section 2: Pending Interest Payouts this Month (Non-Cumulative) */}
        <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-4 border-b border-slate-100 mb-4">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-blue-50 text-blue-600 rounded-xl">
                  <CalendarDays className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-800 text-sm">Interest Payouts Due (पेआउट लिस्ट)</h3>
                  <p className="text-xs text-slate-400">Monthly/Quarterly pension interest transfers</p>
                </div>
              </div>
              <span className="text-xs font-bold bg-blue-100 text-blue-800 px-2.5 py-1 rounded-full">
                {pendingPayouts.length} Due
              </span>
            </div>

            {pendingPayouts.length === 0 ? (
              <div className="py-8 text-center text-slate-400 text-sm">
                Is mahine koi pending regular interest payout nahi hai.
              </div>
            ) : (
              <div className="space-y-3">
                {pendingPayouts.map((item) => (
                  <div 
                    key={item.id} 
                    className="p-3.5 bg-slate-50 hover:bg-slate-100/80 rounded-xl border border-slate-100 transition flex items-center justify-between text-xs"
                  >
                    <div>
                      <div className="font-bold text-slate-800">{item.customer_name}</div>
                      <p className="text-slate-500 mt-0.5">
                        {item.bank_name || 'Bank'} A/c: <code className="bg-slate-200/60 px-1 py-0.5 rounded">{item.account_no || 'N/A'}</code>
                      </p>
                      <p className="text-slate-400 text-[11px] mt-0.5">
                        Due: {formatDate(item.payout_date)} ({item.fd_number})
                      </p>
                    </div>

                    <div className="text-right flex flex-col items-end gap-1.5">
                      <span className="font-bold text-emerald-600 text-sm">{formatINR(item.payout_amount)}</span>
                      <button
                        onClick={() => handleMarkPaid(item.id)}
                        className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-[11px] rounded-lg shadow-sm transition cursor-pointer"
                      >
                        Mark Paid
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="pt-4 mt-4 border-t border-slate-100 text-right">
            <button 
              onClick={() => onNavigate('payouts')}
              className="text-xs font-semibold text-indigo-600 hover:underline"
            >
              Full Payout Schedule Register &rarr;
            </button>
          </div>
        </div>

      </div>

      {/* Recent Booked FDs Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-5 border-b border-slate-100 flex justify-between items-center">
          <div className="flex items-center gap-2">
            <FileText className="w-5 h-5 text-indigo-600" />
            <h3 className="font-bold text-slate-800 text-sm">Recently Booked Fixed Deposits</h3>
          </div>
          <button
            onClick={() => onNavigate('fds')}
            className="text-xs font-semibold text-indigo-600 hover:underline"
          >
            See All &rarr;
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-600 uppercase font-semibold">
              <tr>
                <th className="py-3 px-4">FD Number</th>
                <th className="py-3 px-4">Customer</th>
                <th className="py-3 px-4 text-right">Principal</th>
                <th className="py-3 px-4 text-center">Rate</th>
                <th className="py-3 px-4 text-center">Tenure</th>
                <th className="py-3 px-4">Maturity Date</th>
                <th className="py-3 px-4 text-right">Maturity Amount</th>
                <th className="py-3 px-4 text-center">Status</th>
                <th className="py-3 px-4 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium">
              {recentFds?.map((fd) => (
                <tr key={fd.id} className="hover:bg-slate-50/70 transition">
                  <td className="py-3 px-4 font-bold text-indigo-600">{fd.fd_number}</td>
                  <td className="py-3 px-4 text-slate-800 font-semibold">{fd.customer_name}</td>
                  <td className="py-3 px-4 text-right font-bold text-slate-900">{formatINR(fd.principal_amount)}</td>
                  <td className="py-3 px-4 text-center text-emerald-600 font-bold">{fd.annual_rate}%</td>
                  <td className="py-3 px-4 text-center text-slate-600">{fd.tenure_months}m</td>
                  <td className="py-3 px-4 text-slate-700">{formatDate(fd.maturity_date)}</td>
                  <td className="py-3 px-4 text-right font-bold text-emerald-700">{formatINR(fd.maturity_amount)}</td>
                  <td className="py-3 px-4 text-center">
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                      {fd.status}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-center">
                    <div className="flex items-center justify-center gap-2">
                      <button
                        onClick={() => onViewFD(fd.id)}
                        className="px-2 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded text-[11px] font-semibold transition cursor-pointer"
                      >
                        Details
                      </button>
                      <button
                        onClick={() => onPrintCertificate(fd.id)}
                        className="px-2 py-1 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded text-[11px] font-semibold transition cursor-pointer"
                      >
                        Receipt
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
}
