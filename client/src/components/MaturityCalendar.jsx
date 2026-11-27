import React, { useState, useEffect } from 'react';
import { 
  CalendarDays, 
  Clock, 
  Search, 
  Filter, 
  ArrowRight, 
  CheckCircle2, 
  AlertCircle, 
  Eye, 
  RotateCw, 
  Printer, 
  Download,
  Calendar
} from 'lucide-react';
import { formatINR, formatDate, apiRequest } from '../utils';

export default function MaturityCalendar({ onViewFD, onRenewFD, onPrintCertificate }) {
  const [fds, setFds] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterQuarter, setFilterQuarter] = useState('ALL');
  const [currentMonth, setCurrentMonth] = useState(new Date(2027, 2, 1)); // March 2027
  const [selectedDay, setSelectedDay] = useState(null);

  const fetchFds = () => {
    setLoading(true);
    apiRequest('/fds')
      .then(res => {
        if (res.success) {
          const list = res.fds || res.data || [];
          const sorted = list.sort((a, b) => new Date(a.maturity_date) - new Date(b.maturity_date));
          setFds(sorted);
        }
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchFds();
  }, []);

  const handlePrevMonth = () => {
    setCurrentMonth(prev => new Date(prev.getFullYear(), prev.getMonth() - 1, 1));
    setSelectedDay(null);
  };

  const handleNextMonth = () => {
    setCurrentMonth(prev => new Date(prev.getFullYear(), prev.getMonth() + 1, 1));
    setSelectedDay(null);
  };

  const daysInMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0).getDate();
  const firstDayIndex = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1).getDay();

  // Filter FDs for current month / selected day
  const monthStr = `${currentMonth.getFullYear()}-${String(currentMonth.getMonth() + 1).padStart(2, '0')}`;
  const monthFds = fds.filter(fd => (fd.maturity_date || '').startsWith(monthStr));
  const displayedFds = selectedDay 
    ? monthFds.filter(fd => (fd.maturity_date || '').endsWith(String(selectedDay).padStart(2, '0')))
    : monthFds;

  const handleSettleMaturity = async (fd) => {
    let user = {};
    try { user = JSON.parse(localStorage.getItem('pralaad_fd_user') || '{}') || {}; } catch (e) {}
    const isEmp = user.role === 'employee';

    if (isEmp) {
      const ref = prompt('Enter Bank Disbursement Reference / UTR for Maturity Settlement:', 'UTR-' + Date.now().toString().slice(-6));
      if (!ref) return;

      const res = await apiRequest('/approvals', {
        method: 'POST',
        body: JSON.stringify({
          request_type: 'MATURITY_SETTLEMENT',
          customer_id: fd.customer_id,
          fd_id: fd.id,
          proposed_amount: fd.maturity_amount,
          request_data: {
            fdId: fd.id,
            settlementDate: new Date().toISOString().split('T')[0],
            paymentReference: ref
          },
          remarks: `Staff Maturity Settlement Proposal: ${fd.fd_number} (₹${fd.maturity_amount.toLocaleString('en-IN')})`
        })
      });
      alert(`Maturity settlement proposal submitted (${res.request_number}). Awaiting Admin Checker authorization.`);
      return;
    }

    if (!window.confirm(`Authorize full maturity settlement of ₹${fd.maturity_amount.toLocaleString('en-IN')} for ${fd.fd_number}?`)) return;
    const ref = prompt('Enter Bank Disbursement Reference / UTR:', 'SETTLE-NEFT-' + Date.now().toString().slice(-6));
    if (!ref) return;

    const res = await apiRequest('/approvals', {
      method: 'POST',
      body: JSON.stringify({
        request_type: 'MATURITY_SETTLEMENT',
        customer_id: fd.customer_id,
        fd_id: fd.id,
        proposed_amount: fd.maturity_amount,
        request_data: {
          fdId: fd.id,
          settlementDate: new Date().toISOString().split('T')[0],
          paymentReference: ref
        },
        remarks: `Direct Admin Maturity Settlement: ${fd.fd_number}`
      })
    });
    if (res.requestId) {
      await apiRequest(`/approvals/${res.requestId}/approve`, {
        method: 'POST',
        body: JSON.stringify({ decision_remarks: 'Authorized and disbursed by Administrator' })
      });
      alert(`FD ${fd.fd_number} has been settled and marked MATURED.`);
      fetchFds();
    }
  };

  return (
    <div className="space-y-6 pb-12 animate-fadeIn">
      {/* Header */}
      <div className="bg-white rounded-xl border border-slate-200/90 shadow-xs p-5 md:p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl md:text-2xl font-bold tracking-tight text-slate-900">
              Maturity Calendar & Liquidity Schedule
            </h1>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200">
              Timeline View
            </span>
          </div>
          <p className="text-xs md:text-sm text-slate-500 mt-1">
            Chronological maturity projections, settlement pipelines and renewal workflows
          </p>
        </div>
      </div>

      {/* Interactive Month/Year Calendar Navigation & Date Grid */}
      <div className="bg-white rounded-xl border border-slate-200/90 shadow-xs p-5">
        <div className="flex items-center justify-between pb-4 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <Calendar className="w-5 h-5 text-indigo-600" />
            <h2 id="cal-month-header" className="text-base font-bold text-slate-800">
              {currentMonth.toLocaleString('default', { month: 'long', year: 'numeric' })}
            </h2>
            <span className="text-xs px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 font-bold border border-indigo-200">
              {monthFds.length} Maturities this month
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              id="cal-prev-month-btn"
              onClick={handlePrevMonth}
              className="px-3 py-1.5 rounded-lg border border-slate-200 bg-slate-50 hover:bg-slate-100 text-xs font-bold text-slate-700 transition cursor-pointer"
            >
              &larr; Prev Month
            </button>
            <button
              id="cal-today-btn"
              onClick={() => {
                setCurrentMonth(new Date());
                setSelectedDay(null);
              }}
              className="px-3 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-xs font-semibold text-slate-700 transition cursor-pointer"
            >
              Current
            </button>
            <button
              id="cal-next-month-btn"
              onClick={handleNextMonth}
              className="px-3 py-1.5 rounded-lg border border-slate-200 bg-slate-50 hover:bg-slate-100 text-xs font-bold text-slate-700 transition cursor-pointer"
            >
              Next Month &rarr;
            </button>
          </div>
        </div>

        {/* Days of Week */}
        <div className="grid grid-cols-7 gap-1 mt-4 text-center text-[11px] font-bold text-slate-400 uppercase tracking-wider">
          {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(d => (
            <div key={d} className="py-1">{d}</div>
          ))}
        </div>

        {/* Date Cells Grid */}
        <div className="grid grid-cols-7 gap-1.5 mt-2">
          {Array.from({ length: firstDayIndex }).map((_, i) => (
            <div key={`empty-${i}`} className="h-14 rounded-lg bg-slate-50/50"></div>
          ))}

          {Array.from({ length: daysInMonth }).map((_, i) => {
            const dayNum = i + 1;
            const dayPadded = String(dayNum).padStart(2, '0');
            const dayFds = monthFds.filter(f => (f.maturity_date || '').endsWith(dayPadded));
            const isSelected = selectedDay === dayNum;

            return (
              <button
                key={`day-${dayNum}`}
                id={`cal-day-cell-${dayNum}`}
                onClick={() => setSelectedDay(isSelected ? null : dayNum)}
                className={`h-14 p-1 rounded-xl border text-left transition cursor-pointer flex flex-col justify-between ${
                  isSelected 
                    ? 'border-indigo-600 bg-indigo-50/80 ring-2 ring-indigo-500/30' 
                    : dayFds.length > 0 
                      ? 'border-amber-300 bg-amber-50/50 hover:bg-amber-100/50' 
                      : 'border-slate-100 bg-white hover:bg-slate-50'
                }`}
              >
                <span className={`text-xs font-bold ${isSelected ? 'text-indigo-700' : 'text-slate-700'}`}>
                  {dayNum}
                </span>
                {dayFds.length > 0 && (
                  <span className="text-[10px] font-bold px-1 py-0.5 rounded bg-amber-200 text-amber-900 truncate">
                    {dayFds.length} due
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {selectedDay && (
          <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
            <span className="font-semibold text-slate-700">
              Drilldown: Filtered to <strong className="text-indigo-700">{selectedDay} {currentMonth.toLocaleString('default', { month: 'short', year: 'numeric' })}</strong> ({displayedFds.length} records)
            </span>
            <button
              onClick={() => setSelectedDay(null)}
              className="text-indigo-600 hover:text-indigo-800 font-bold underline cursor-pointer"
            >
              Clear Filter (Show All Month)
            </button>
          </div>
        )}
      </div>

      {/* Maturity Timeline Cards */}
      <div className="bg-white rounded-xl border border-slate-200/90 shadow-xs overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex items-center justify-between gap-4 bg-slate-50/50">
          <div className="text-xs font-bold text-slate-600 uppercase tracking-wider">
            {selectedDay ? `Maturities on ${selectedDay} ${currentMonth.toLocaleString('default', { month: 'short' })}` : 'Contracted Deposit Maturities'}
          </div>
          <div className="text-xs text-slate-500">
            Showing: <strong className="text-slate-900">{displayedFds.length}</strong> of {fds.length} Total
          </div>
        </div>

        <div className="divide-y divide-slate-100">
          {loading ? (
            <div className="p-8 text-center text-slate-400 text-xs">Loading maturity schedule...</div>
          ) : displayedFds.length === 0 ? (
            <div className="p-8 text-center text-slate-400 text-xs">No maturities found for the selected view.</div>
          ) : (
            displayedFds.map(fd => {
              const daysRemaining = Math.ceil((new Date(fd.maturity_date) - new Date()) / (1000 * 60 * 60 * 24));
              const isDueSoon = daysRemaining <= 30 && daysRemaining >= 0;

              return (
                <div key={fd.id} className="p-5 hover:bg-slate-50/60 transition flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="flex items-start gap-4">
                    <div className={`w-12 h-12 rounded-xl flex flex-col items-center justify-center font-bold text-xs shrink-0 border ${
                      isDueSoon 
                        ? 'bg-rose-50 border-rose-200 text-rose-700' 
                        : 'bg-indigo-50 border-indigo-200 text-indigo-700'
                    }`}>
                      <span className="text-[10px] font-semibold uppercase">
                        {new Date(fd.maturity_date).toLocaleString('default', { month: 'short' })}
                      </span>
                      <span className="text-base font-extrabold leading-none">
                        {new Date(fd.maturity_date).getDate()}
                      </span>
                    </div>

                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-sm text-slate-900">{fd.fd_number}</span>
                        <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-slate-100 text-slate-700">
                          {fd.annual_rate}% p.a.
                        </span>
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                          fd.status === 'ACTIVE' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-slate-100 text-slate-600'
                        }`}>
                          {fd.status}
                        </span>
                      </div>
                      <div className="text-xs text-slate-500 mt-1">
                        Client: <strong className="text-slate-800">{fd.customer_name}</strong> • Phone: {fd.phone}
                      </div>
                      <div className="text-xs text-slate-400 mt-0.5">
                        Booked: {formatDate(fd.start_date)} ({fd.tenure_months} Months tenure)
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between sm:justify-end gap-5 pt-3 sm:pt-0 border-t sm:border-t-0 border-slate-100">
                    <div className="text-left sm:text-right">
                      <div className="text-xs text-slate-400 font-medium">Maturity Value</div>
                      <div className="text-base font-bold text-slate-900">{formatINR(fd.maturity_amount)}</div>
                      <div className={`text-[11px] font-semibold mt-0.5 ${
                        daysRemaining < 0 ? 'text-slate-400' : daysRemaining <= 30 ? 'text-rose-600 font-bold' : 'text-slate-500'
                      }`}>
                        {daysRemaining < 0 ? 'Matured' : daysRemaining === 0 ? 'Due Today' : `${daysRemaining} days remaining`}
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => handleSettleMaturity(fd)}
                        className="px-2.5 py-1.5 rounded-lg bg-emerald-50 hover:bg-emerald-600 hover:text-white text-emerald-700 font-bold text-xs transition cursor-pointer flex items-center gap-1"
                        title="Settle Maturity Payout"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5" /> Settle
                      </button>
                      <button
                        onClick={() => onViewFD && onViewFD(fd.id)}
                        className="p-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-600 transition cursor-pointer"
                        title="View Full FD Schedule"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => onRenewFD && onRenewFD(fd)}
                        className="p-2 rounded-lg bg-emerald-50 hover:bg-emerald-600 hover:text-white text-emerald-700 transition cursor-pointer"
                        title="Renew FD"
                      >
                        <RotateCw className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => onPrintCertificate && onPrintCertificate(fd.id)}
                        className="p-2 rounded-lg bg-indigo-50 hover:bg-indigo-600 hover:text-white text-indigo-700 transition cursor-pointer"
                        title="Download Certificate"
                      >
                        <Printer className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
