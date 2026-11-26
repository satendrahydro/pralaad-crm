import React, { useState, useEffect } from 'react';
import { 
  Calculator as CalcIcon, 
  Calendar, 
  TrendingUp, 
  Percent, 
  IndianRupee, 
  ArrowRight, 
  Sparkles,
  Layers,
  CheckCircle2,
  Table as TableIcon
} from 'lucide-react';
import { formatINR, formatDate, COMPOUNDING_OPTIONS, apiRequest } from '../utils';
import DateInput from './DateInput';

export default function Calculator({ onBookFromCalc }) {
  const [principal, setPrincipal] = useState(500000);
  const [annualRate, setAnnualRate] = useState(8.25);
  const [tenureYears, setTenureYears] = useState(2);
  const [tenureMonths, setTenureMonths] = useState(0);
  const [compoundingFrequency, setCompoundingFrequency] = useState('quarterly');
  const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [isSeniorCitizen, setIsSeniorCitizen] = useState(false);
  const [seniorBonus, setSeniorBonus] = useState(0.5);

  const [calcResult, setCalcResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('summary'); // 'summary' | 'schedule'

  // Quick amount chips
  const quickAmounts = [50000, 100000, 250000, 500000, 1000000, 2500000];

  const runCalculation = async () => {
    setLoading(true);
    const totalMonths = (parseInt(tenureYears) * 12) + parseInt(tenureMonths || 0);

    try {
      const res = await apiRequest('/fds/calculate', {
        method: 'POST',
        body: JSON.stringify({
          principal: parseFloat(principal) || 0,
          annualRate: parseFloat(annualRate) || 0,
          tenureMonths: Math.max(1, totalMonths),
          compoundingFrequency,
          startDate,
          isSeniorCitizen,
          seniorBonus: parseFloat(seniorBonus) || 0.5
        })
      });
      setCalcResult(res.result);
    } catch (err) {
      console.error('Calculation error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      runCalculation();
    }, 150);
    return () => clearTimeout(timer);
  }, [principal, annualRate, tenureYears, tenureMonths, compoundingFrequency, startDate, isSeniorCitizen, seniorBonus]);

  const effectiveRate = parseFloat(annualRate) + (isSeniorCitizen ? parseFloat(seniorBonus) : 0);
  const totalMonths = (parseInt(tenureYears) * 12) + parseInt(tenureMonths || 0);
  const totalYears = totalMonths / 12;
  const effectiveYield = (calcResult && principal > 0 && totalYears > 0) 
    ? ((calcResult.totalInterest / principal) / totalYears * 100).toFixed(2) 
    : 0;

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-indigo-900 via-indigo-800 to-blue-900 rounded-2xl p-6 text-white shadow-xl flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/30 text-indigo-200 text-xs font-semibold mb-2 backdrop-blur-sm">
            <Sparkles className="w-3.5 h-3.5" />
            Universal Multi-Option FD Engine
          </div>
          <h2 className="text-2xl font-bold">Fixed Deposit Live Calculator</h2>
          <p className="text-indigo-200 text-sm mt-1">
            Amount aur Interest rate set karte hi maturity, interest ledger aur periodic payouts instantly dekhein
          </p>
        </div>

        {onBookFromCalc && (
          <button
            onClick={() => onBookFromCalc({
              principal,
              annualRate: effectiveRate,
              tenureMonths: totalMonths,
              compoundingFrequency,
              startDate,
              isSeniorCitizen
            })}
            className="px-5 py-3 bg-white text-indigo-900 hover:bg-indigo-50 active:bg-indigo-100 font-bold rounded-xl shadow-lg transition flex items-center gap-2 text-sm shrink-0 cursor-pointer"
          >
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            Book This FD Now
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left Inputs Section (5 Cols) */}
        <div className="lg:col-span-5 bg-white rounded-2xl p-6 shadow-sm border border-slate-200 space-y-6">
          <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
            <CalcIcon className="w-5 h-5 text-indigo-600" />
            <h3 className="font-bold text-slate-800">Deposit Parameters</h3>
          </div>

          {/* Principal Amount */}
          <div>
            <div className="flex justify-between items-center mb-2">
              <label className="text-xs font-semibold uppercase tracking-wider text-slate-600">
                Deposit Principal (जमा राशि)
              </label>
              <span className="text-xs font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded">
                {formatINR(principal)}
              </span>
            </div>
            <div className="relative">
              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-sm">₹</span>
              <input
                type="number"
                min="1000"
                step="5000"
                value={principal}
                onChange={(e) => setPrincipal(Math.max(0, Number(e.target.value)))}
                className="w-full pl-9 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white text-lg transition"
              />
            </div>
            
            {/* Principal Drag Slider */}
            <div className="mt-2">
              <input
                type="range"
                id="calc-slider-principal"
                min="10000"
                max="5000000"
                step="10000"
                value={principal}
                onChange={(e) => setPrincipal(parseFloat(e.target.value))}
                className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-indigo-600"
              />
              <div className="flex justify-between text-[10px] text-slate-400 font-semibold mt-0.5">
                <span>₹10,000</span>
                <span>₹25,00,000</span>
                <span>₹50,00,000</span>
              </div>
            </div>

            {/* Quick Chips */}
            <div className="flex flex-wrap gap-1.5 mt-2.5">
              {quickAmounts.map((amt) => (
                <button
                  key={amt}
                  type="button"
                  onClick={() => setPrincipal(amt)}
                  className={`text-xs px-2.5 py-1 rounded-lg border font-medium transition cursor-pointer ${
                    principal === amt
                      ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm'
                      : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  {formatINR(amt)}
                </button>
              ))}
            </div>
          </div>

          {/* Annual Interest Rate */}
          <div>
            <div className="flex justify-between items-center mb-2">
              <label className="text-xs font-semibold uppercase tracking-wider text-slate-600">
                Annual Interest Rate (ब्याज दर % p.a.)
              </label>
              <span className="text-sm font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded">
                {effectiveRate.toFixed(2)}% p.a.
              </span>
            </div>
            <div className="relative">
              <Percent className="w-4 h-4 absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="number"
                step="0.05"
                min="1"
                max="30"
                value={annualRate}
                onChange={(e) => setAnnualRate(parseFloat(e.target.value) || 0)}
                className="w-full pl-4 pr-10 py-3 bg-slate-50 border border-slate-200 rounded-xl font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white text-base transition"
              />
            </div>

            {/* Rate Drag Slider */}
            <div className="mt-2">
              <input
                type="range"
                id="calc-slider-rate"
                min="4"
                max="15"
                step="0.05"
                value={annualRate}
                onChange={(e) => setAnnualRate(parseFloat(e.target.value))}
                className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-emerald-600"
              />
              <div className="flex justify-between text-[10px] text-slate-400 font-semibold mt-0.5">
                <span>4.0%</span>
                <span>9.5%</span>
                <span>15.0%</span>
              </div>
            </div>

            {/* Senior citizen toggle */}
            <div className="mt-3 p-3 bg-amber-50/70 border border-amber-200/60 rounded-xl flex items-center justify-between">
              <div>
                <p className="text-xs font-bold text-amber-900">Senior Citizen Benefit (+0.50%)</p>
                <p className="text-[11px] text-amber-700">60+ उम्र के ग्राहकों के लिए अतिरिक्त ब्याज</p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={isSeniorCitizen}
                  onChange={(e) => setIsSeniorCitizen(e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-amber-600"></div>
              </label>
            </div>
          </div>

          {/* Tenure */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-semibold uppercase tracking-wider text-slate-600">
                Tenure Selection (अवधि चयन)
              </label>
            </div>
            <div className="flex flex-wrap gap-2 mb-3">
              {[
                { label: '12M (1 Year)', months: 12 },
                { label: '24M (2 Years)', months: 24 },
                { label: '36M (3 Years)', months: 36 },
                { label: '60M (5 Years)', months: 60 },
                { label: 'Custom (कस्टम अवधि)', months: null }
              ].map((t) => {
                const isSelected = t.months !== null 
                  ? (totalMonths === t.months)
                  : (![12, 24, 36, 60].includes(totalMonths));
                return (
                  <button
                    key={t.label}
                    type="button"
                    onClick={() => {
                      if (t.months !== null) {
                        setTenureYears(Math.floor(t.months / 12));
                        setTenureMonths(t.months % 12);
                      }
                    }}
                    className={`px-2.5 py-1 text-xs font-semibold rounded-lg border transition cursor-pointer ${
                      isSelected
                        ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm'
                        : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    {t.label}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1.5">
                Tenure Years
              </label>
              <input
                type="number"
                min="0"
                max="25"
                value={tenureYears}
                onChange={(e) => setTenureYears(Math.max(0, parseInt(e.target.value) || 0))}
                className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1.5">
                Tenure Months
              </label>
              <input
                type="number"
                min="0"
                max="11"
                value={tenureMonths}
                onChange={(e) => setTenureMonths(Math.max(0, parseInt(e.target.value) || 0))}
                className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white text-sm"
              />
            </div>
          </div>

          {/* Tenure Drag Slider */}
          <div className="mt-1">
            <input
              type="range"
              id="calc-slider-tenure"
              min="1"
              max="120"
              step="1"
              value={totalMonths}
              onChange={(e) => {
                const m = parseInt(e.target.value) || 1;
                setTenureYears(Math.floor(m / 12));
                setTenureMonths(m % 12);
              }}
              className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-indigo-600"
            />
            <div className="flex justify-between text-[10px] text-slate-400 font-semibold mt-0.5">
              <span>1 Month</span>
              <span>5 Years (60M)</span>
              <span>10 Years (120M)</span>
            </div>
          </div>

          <p className="text-xs text-slate-500 -mt-2">
            कुल अवधि: <span className="font-semibold text-slate-700">{totalMonths} Months ({totalYears.toFixed(2)} Years)</span>
          </p>

          {/* Compounding & Payout Mode - ALL 9 OPTIONS */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1.5">
              Interest Calculation & Payout Type (ब्याज का प्रकार)
            </label>
            <select
              value={compoundingFrequency}
              onChange={(e) => setCompoundingFrequency(e.target.value)}
              className="w-full px-3.5 py-3 bg-slate-50 border border-slate-200 rounded-xl font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white text-sm cursor-pointer"
            >
              <optgroup label="Cumulative FDs (ब्याज मैच्योरिटी पर जुड़ेगा)">
                {COMPOUNDING_OPTIONS.filter(o => o.cumulative).map(opt => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </optgroup>
              <optgroup label="Non-Cumulative FDs (नियमित ब्याज पेआउट)">
                {COMPOUNDING_OPTIONS.filter(o => !o.cumulative).map(opt => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </optgroup>
            </select>
          </div>

          {/* Deposit Start Date */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1.5">
              Deposit Start Date (जमा तिथि)
            </label>
            <DateInput
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white text-sm"
            />
          </div>

        </div>

        {/* Right Output Section (7 Cols) */}
        <div className="lg:col-span-7 space-y-6">
          
          {/* Main Maturity Highlight Card */}
          <div className="bg-gradient-to-br from-indigo-700 via-indigo-600 to-indigo-800 text-white rounded-2xl p-6 shadow-xl relative overflow-hidden">
            <div className="absolute top-0 right-0 -mr-16 -mt-16 w-56 h-56 bg-white/10 rounded-full blur-2xl pointer-events-none"></div>

            <div className="flex justify-between items-start">
              <div>
                <span className="text-xs font-bold uppercase tracking-widest text-indigo-200 bg-white/10 px-3 py-1 rounded-full backdrop-blur-sm">
                  {calcResult?.isCumulative ? 'Cumulative Maturity Value' : 'Regular Payout FD'}
                </span>
                <p className="text-xs text-indigo-200 mt-2">Total Maturity Amount (कुल मैच्योरिटी राशि)</p>
                <div className="text-4xl md:text-5xl font-black mt-1 tracking-tight">
                  {calcResult ? formatINR(calcResult.maturityAmount) : '...'}
                </div>
              </div>

              <div className="text-right">
                <span className="text-xs text-indigo-200 block">Maturity Date</span>
                <span className="text-base font-bold text-white bg-white/10 px-3 py-1 rounded-lg mt-1 inline-block">
                  {calcResult ? formatDate(calcResult.maturityDate) : '-'}
                </span>
              </div>
            </div>

            {/* Split Metrics */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mt-6 pt-6 border-t border-white/15">
              <div className="bg-white/10 rounded-xl p-3 backdrop-blur-sm">
                <span className="text-xs text-indigo-200 block">Principal Amount</span>
                <span className="text-lg font-bold">{formatINR(principal)}</span>
              </div>

              <div className="bg-white/10 rounded-xl p-3 backdrop-blur-sm">
                <span className="text-xs text-emerald-200 block">Total Interest Earned</span>
                <span className="text-lg font-bold text-emerald-300">
                  +{calcResult ? formatINR(calcResult.totalInterest) : '0'}
                </span>
              </div>

              {!calcResult?.isCumulative ? (
                <div className="bg-amber-400/20 rounded-xl p-3 backdrop-blur-sm col-span-2 sm:col-span-1 border border-amber-300/30">
                  <span className="text-xs text-amber-200 block">Periodic Payout</span>
                  <span className="text-lg font-bold text-amber-300">
                    {formatINR(calcResult?.periodicPayout)}
                  </span>
                </div>
              ) : (
                <div className="bg-white/10 rounded-xl p-3 backdrop-blur-sm col-span-2 sm:col-span-1">
                  <span className="text-xs text-indigo-200 block">Annualized Yield</span>
                  <span className="text-lg font-bold text-white">
                    {effectiveYield}%
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Visual Breakdown Bar */}
          {calcResult && (
            <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-200 space-y-3">
              <div className="flex justify-between items-center text-xs font-semibold text-slate-600">
                <span className="flex items-center gap-1.5">
                  <span className="w-3 h-3 rounded-full bg-indigo-600 inline-block"></span>
                  Principal: {formatINR(principal)} ({((principal / (principal + calcResult.totalInterest)) * 100).toFixed(1)}%)
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="w-3 h-3 rounded-full bg-emerald-500 inline-block"></span>
                  Interest: {formatINR(calcResult.totalInterest)} ({((calcResult.totalInterest / (principal + calcResult.totalInterest)) * 100).toFixed(1)}%)
                </span>
              </div>

              <div className="w-full h-4 bg-slate-100 rounded-full overflow-hidden flex shadow-inner">
                <div 
                  className="bg-indigo-600 h-full transition-all duration-300"
                  style={{ width: `${(principal / (principal + calcResult.totalInterest)) * 100}%` }}
                ></div>
                <div 
                  className="bg-emerald-500 h-full transition-all duration-300"
                  style={{ width: `${(calcResult.totalInterest / (principal + calcResult.totalInterest)) * 100}%` }}
                ></div>
              </div>
            </div>
          )}

          {/* Schedule / Ledger View */}
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
            <div className="p-4 bg-slate-50 border-b border-slate-200 flex justify-between items-center">
              <div className="flex items-center gap-2">
                <TableIcon className="w-4 h-4 text-indigo-600" />
                <h4 className="font-bold text-sm text-slate-800">
                  {calcResult?.isCumulative ? 'Compounding Growth Schedule' : 'Interest Payout Schedule (पेआउट कैलेंडर)'}
                </h4>
              </div>
              <span className="text-xs font-medium text-slate-500">
                {calcResult?.schedule?.length || 0} Periods
              </span>
            </div>

            <div className="max-h-72 overflow-y-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-100/80 sticky top-0 text-slate-600 uppercase font-semibold">
                  <tr>
                    <th className="py-2.5 px-3">#</th>
                    <th className="py-2.5 px-3">Date</th>
                    <th className="py-2.5 px-3">Type</th>
                    {!calcResult?.isCumulative && <th className="py-2.5 px-3 text-right">Payout Amount</th>}
                    <th className="py-2.5 px-3 text-right">Interest Accrued</th>
                    <th className="py-2.5 px-3 text-right">Balance</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium">
                  {calcResult?.schedule?.map((item) => (
                    <tr key={item.periodNo} className="hover:bg-slate-50/70 transition">
                      <td className="py-2.5 px-3 text-slate-400">{item.periodNo}</td>
                      <td className="py-2.5 px-3 text-slate-700">{formatDate(item.payoutDate)}</td>
                      <td className="py-2.5 px-3">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          item.type.includes('Principal') 
                            ? 'bg-amber-100 text-amber-800' 
                            : 'bg-indigo-50 text-indigo-700'
                        }`}>
                          {item.type}
                        </span>
                      </td>
                      {!calcResult?.isCumulative && (
                        <td className="py-2.5 px-3 text-right text-emerald-600 font-bold">
                          {formatINR(item.payoutAmount)}
                        </td>
                      )}
                      <td className="py-2.5 px-3 text-right text-slate-600">
                        {formatINR(item.interestAccrued)}
                      </td>
                      <td className="py-2.5 px-3 text-right font-bold text-slate-800">
                        {formatINR(item.balance)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

        </div>

      </div>
    </div>
  );
}
