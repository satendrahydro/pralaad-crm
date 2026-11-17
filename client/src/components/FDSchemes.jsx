import React, { useState } from 'react';
import { 
  Sparkles, 
  Layers, 
  PlusCircle, 
  Percent, 
  Calendar, 
  CheckCircle2, 
  Info, 
  ShieldCheck, 
  ArrowRight,
  TrendingUp,
  Tag
} from 'lucide-react';
import { formatINR } from '../utils';

export default function FDSchemes({ onOpenNewFD }) {
  const [schemes] = useState([
    {
      id: 1,
      scheme_code: 'SCH-CUM-Q',
      scheme_name: 'Cumulative Growth Plan (Quarterly)',
      compounding_frequency: 'quarterly',
      is_cumulative: 1,
      base_annual_rate: 8.50,
      senior_citizen_bonus: 0.50,
      min_tenure_months: 12,
      max_tenure_months: 120,
      min_amount: 10000,
      penalty_rate: 1.0,
      description: 'Quarterly compounding with lump-sum principal and interest payout upon maturity. Maximum wealth compounding effect.',
      tag: 'MOST POPULAR',
      badgeColor: 'bg-indigo-50 text-indigo-700 border-indigo-200'
    },
    {
      id: 2,
      scheme_code: 'SCH-INC-M',
      scheme_name: 'Regular Monthly Income Plan',
      compounding_frequency: 'payout_monthly',
      is_cumulative: 0,
      base_annual_rate: 8.00,
      senior_citizen_bonus: 0.50,
      min_tenure_months: 12,
      max_tenure_months: 60,
      min_amount: 25000,
      penalty_rate: 1.0,
      description: 'Monthly interest credited directly to depositor bank account. Ideal for retirees and regular pension-style income.',
      tag: 'REGULAR CASHFLOW',
      badgeColor: 'bg-emerald-50 text-emerald-700 border-emerald-200'
    },
    {
      id: 3,
      scheme_code: 'SCH-INC-Q',
      scheme_name: 'Quarterly Dividend Income Plan',
      compounding_frequency: 'payout_quarterly',
      is_cumulative: 0,
      base_annual_rate: 8.25,
      senior_citizen_bonus: 0.50,
      min_tenure_months: 12,
      max_tenure_months: 60,
      min_amount: 25000,
      penalty_rate: 1.0,
      description: 'Quarterly interest disbursement directly to bank account. Balanced yield for medium-term capital servicing.',
      tag: 'DIVIDEND YIELD',
      badgeColor: 'bg-sky-50 text-sky-700 border-sky-200'
    },
    {
      id: 4,
      scheme_code: 'SCH-INC-A',
      scheme_name: 'Annual Yield Plan',
      compounding_frequency: 'payout_annual',
      is_cumulative: 0,
      base_annual_rate: 8.50,
      senior_citizen_bonus: 0.50,
      min_tenure_months: 12,
      max_tenure_months: 120,
      min_amount: 50000,
      penalty_rate: 1.0,
      description: 'Annual interest payout to bank account with principal returned at tenure end. Premium annual rate.',
      tag: 'ANNUAL YIELD',
      badgeColor: 'bg-amber-50 text-amber-700 border-amber-200'
    },
    {
      id: 5,
      scheme_code: 'SCH-SMP-01',
      scheme_name: 'Standard Term Deposit (Simple)',
      compounding_frequency: 'simple',
      is_cumulative: 0,
      base_annual_rate: 7.50,
      senior_citizen_bonus: 0.50,
      min_tenure_months: 6,
      max_tenure_months: 36,
      min_amount: 10000,
      penalty_rate: 1.0,
      description: 'Standard simple interest paid at maturity or term completion. Predictable short to medium term returns.',
      tag: 'SHORT TERM',
      badgeColor: 'bg-slate-100 text-slate-700 border-slate-200'
    }
  ]);

  return (
    <div className="space-y-6 pb-12 animate-fadeIn">
      {/* Header */}
      <div className="bg-white rounded-xl border border-slate-200/90 shadow-xs p-5 md:p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl md:text-2xl font-bold tracking-tight text-slate-900">
              FD Scheme Catalog
            </h1>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200">
              {schemes.length} Active Schemes
            </span>
          </div>
          <p className="text-xs md:text-sm text-slate-500 mt-1">
            Standardized deposit products with pre-configured compounding rules and yield rates
          </p>
        </div>

        <button
          onClick={onOpenNewFD}
          className="inline-flex items-center gap-2 px-4 py-2 text-xs md:text-sm font-bold rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 shadow-sm transition cursor-pointer"
        >
          <PlusCircle className="w-4 h-4" />
          Book FD with Scheme
        </button>
      </div>

      {/* Schemes Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {schemes.map((s) => (
          <div 
            key={s.id}
            className="bg-white rounded-xl border border-slate-200/90 shadow-xs p-5 flex flex-col justify-between hover:border-indigo-300 hover:shadow-sm transition group"
          >
            <div>
              <div className="flex items-center justify-between gap-2 mb-3">
                <span className={`text-[11px] font-bold px-2 py-0.5 rounded border ${s.badgeColor}`}>
                  {s.tag}
                </span>
                <span className="text-xs font-mono font-bold text-slate-400">
                  {s.scheme_code}
                </span>
              </div>

              <h3 className="text-base font-bold text-slate-900 group-hover:text-indigo-600 transition">
                {s.scheme_name}
              </h3>
              <p className="text-xs text-slate-500 mt-2 line-clamp-2">
                {s.description}
              </p>

              {/* Rates Box */}
              <div className="my-4 p-3 bg-slate-50 rounded-lg border border-slate-100 flex items-center justify-between">
                <div>
                  <div className="text-[11px] font-semibold text-slate-400 uppercase">Regular Rate</div>
                  <div className="text-xl font-bold text-indigo-600">{s.base_annual_rate}% <span className="text-xs text-slate-500">p.a.</span></div>
                </div>
                <div className="text-right">
                  <div className="text-[11px] font-semibold text-amber-600 uppercase">+ Senior Citizen</div>
                  <div className="text-xl font-bold text-slate-800">+{s.senior_citizen_bonus}% <span className="text-xs text-slate-500">p.a.</span></div>
                </div>
              </div>

              {/* Spec Attributes */}
              <div className="space-y-2 text-xs text-slate-600">
                <div className="flex justify-between py-1 border-b border-slate-100">
                  <span className="text-slate-400">Compounding / Payout</span>
                  <span className="font-semibold text-slate-800 capitalize">
                    {s.compounding_frequency.replace('_', ' ')}
                  </span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-100">
                  <span className="text-slate-400">Tenure Range</span>
                  <span className="font-semibold text-slate-800">
                    {s.min_tenure_months} to {s.max_tenure_months} Months
                  </span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-100">
                  <span className="text-slate-400">Min. Deposit</span>
                  <span className="font-semibold text-slate-800">
                    {formatINR(s.min_amount)}
                  </span>
                </div>
                <div className="flex justify-between py-1">
                  <span className="text-slate-400">Premature Penalty</span>
                  <span className="font-semibold text-rose-600">
                    {s.penalty_rate}% rate deduction
                  </span>
                </div>
              </div>
            </div>

            <div className="mt-5 pt-4 border-t border-slate-100">
              <button
                onClick={onOpenNewFD}
                className="w-full inline-flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-bold rounded-lg bg-indigo-50 hover:bg-indigo-600 text-indigo-700 hover:text-white transition cursor-pointer"
              >
                Book with this Scheme <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
