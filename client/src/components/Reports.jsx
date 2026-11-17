import React, { useState } from 'react';
import { 
  BarChart3, 
  FileSpreadsheet, 
  Download, 
  Calendar, 
  TrendingUp, 
  Users, 
  FileText, 
  CheckCircle2,
  PieChart as PieIcon,
  Filter
} from 'lucide-react';
import { formatINR } from '../utils';

export default function Reports() {
  const [selectedReport, setSelectedReport] = useState('MATURITY_SCHEDULE');

  const reportList = [
    {
      id: 'MATURITY_SCHEDULE',
      title: 'Maturity & Cash Outflow Forecast Report',
      description: 'Comprehensive month-wise schedule of maturing deposits, principal redemptions and interest commitments.',
      category: 'Liquidity Planning'
    },
    {
      id: 'INTEREST_PROJECTION',
      title: 'Interest Servicing & Accrual Audit Report',
      description: 'Breakdown of interest obligations accrued vs paid across all compounding modes and payout schemes.',
      category: 'Accounting'
    },
    {
      id: 'CUSTOMER_PORTFOLIO',
      title: 'Customer Portfolio Summary & KYC Status',
      description: 'Customer-wise active investments, nominee details, bank accounts and PAN/Aadhaar compliance audit.',
      category: 'Customer CRM'
    },
    {
      id: 'TRANSACTIONS_AUDIT',
      title: 'Double-Entry Transactions Ledger Audit',
      description: 'Complete journal of balanced debit/credit entries, reversals and bank transfer reference numbers.',
      category: 'Compliance'
    }
  ];

  return (
    <div className="space-y-6 pb-12 animate-fadeIn">
      {/* Header */}
      <div className="bg-white rounded-xl border border-slate-200/90 shadow-xs p-5 md:p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl md:text-2xl font-bold tracking-tight text-slate-900">
              Reports & Financial Analytics
            </h1>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200">
              Audit Ready
            </span>
          </div>
          <p className="text-xs md:text-sm text-slate-500 mt-1">
            Export compliant financial schedules, liability disclosures and customer investment statements
          </p>
        </div>

        <button 
          onClick={() => window.print()}
          className="inline-flex items-center gap-2 px-4 py-2 text-xs md:text-sm font-bold rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 shadow-sm transition cursor-pointer"
        >
          <Download className="w-4 h-4" />
          Print / Export Current Report
        </button>
      </div>

      {/* Report Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {reportList.map(r => (
          <div
            key={r.id}
            onClick={() => setSelectedReport(r.id)}
            className={`p-5 rounded-xl border transition cursor-pointer flex flex-col justify-between ${
              selectedReport === r.id 
                ? 'bg-indigo-50/50 border-indigo-500 ring-2 ring-indigo-500/20 shadow-xs' 
                : 'bg-white border-slate-200 hover:border-slate-300'
            }`}
          >
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-slate-100 text-slate-700 uppercase">
                  {r.category}
                </span>
                {selectedReport === r.id && (
                  <span className="text-xs font-bold text-indigo-600 flex items-center gap-1">
                    <CheckCircle2 className="w-4 h-4" /> Selected
                  </span>
                )}
              </div>
              <h3 className="text-sm font-bold text-slate-900">{r.title}</h3>
              <p className="text-xs text-slate-500 mt-1">{r.description}</p>
            </div>

            <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-indigo-600 font-semibold">
              <span>Generate Audit Sheet</span>
              <span>PDF / Excel Format</span>
            </div>
          </div>
        ))}
      </div>

      {/* Report Data Preview Container */}
      <div className="bg-white rounded-xl border border-slate-200/90 shadow-xs p-5 md:p-6">
        <div className="flex items-center justify-between border-b border-slate-100 pb-4 mb-4">
          <div>
            <h3 className="text-sm font-bold text-slate-900">
              Audit Data Preview: {reportList.find(r => r.id === selectedReport)?.title}
            </h3>
            <p className="text-xs text-slate-500">Live verified database snapshot across all active portfolios</p>
          </div>
          <button 
            onClick={() => window.print()}
            className="px-3 py-1.5 text-xs font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg transition"
          >
            Export Sheet
          </button>
        </div>

        <div className="p-8 text-center bg-slate-50 rounded-xl border border-dashed border-slate-200 text-xs text-slate-500">
          <FileSpreadsheet className="w-10 h-10 text-slate-400 mx-auto mb-2" />
          <p className="font-semibold text-slate-700">Financial Report Ready for Generation</p>
          <p className="mt-1">All data columns are formatted according to standard Indian accounting disclosures.</p>
        </div>
      </div>
    </div>
  );
}
