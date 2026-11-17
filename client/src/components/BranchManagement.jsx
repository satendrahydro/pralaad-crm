import React, { useState } from 'react';
import { 
  Building2, 
  PlusCircle, 
  MapPin, 
  Phone, 
  ShieldCheck, 
  CheckCircle2, 
  Users, 
  Wallet,
  Settings
} from 'lucide-react';
import { formatINR } from '../utils';

export default function BranchManagement() {
  const [branches] = useState([
    {
      id: 1,
      branch_code: 'DEL-HQ',
      branch_name: 'Main Branch - Delhi NCR',
      city: 'New Delhi',
      state: 'Delhi',
      address: 'Barakhamba Road, Connaught Place',
      contact_phone: '+91 11 4567 8900',
      ifsc_prefix: 'HDFC0001234',
      is_active: 1,
      customer_count: 4,
      total_deposits: 1750000
    },
    {
      id: 2,
      branch_code: 'NOI-01',
      branch_name: 'Noida Wealth Desk',
      city: 'Noida',
      state: 'Uttar Pradesh',
      address: 'Sector 62, Electronic City',
      contact_phone: '+91 120 4987 654',
      ifsc_prefix: 'ICIC0005678',
      is_active: 1,
      customer_count: 0,
      total_deposits: 0
    },
    {
      id: 3,
      branch_code: 'GUR-02',
      branch_name: 'Gurgaon Corporate Hub',
      city: 'Gurugram',
      state: 'Haryana',
      address: 'DLF CyberCity, Phase 2',
      contact_phone: '+91 124 4123 789',
      ifsc_prefix: 'UTIB0009876',
      is_active: 1,
      customer_count: 0,
      total_deposits: 0
    }
  ]);

  return (
    <div className="space-y-6 pb-12 animate-fadeIn">
      {/* Header */}
      <div className="bg-white rounded-xl border border-slate-200/90 shadow-xs p-5 md:p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl md:text-2xl font-bold tracking-tight text-slate-900">
              Branch Network Management
            </h1>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
              Multi-Branch Ready
            </span>
          </div>
          <p className="text-xs md:text-sm text-slate-500 mt-1">
            Configure branch hierarchy, operational desks, IFSC prefixes and location mappings
          </p>
        </div>

        <button 
          onClick={() => alert('New Branch setup modal will be activated in Stage 4/Settings.')}
          className="inline-flex items-center gap-2 px-4 py-2 text-xs md:text-sm font-bold rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 shadow-sm transition cursor-pointer"
        >
          <PlusCircle className="w-4 h-4" />
          Add New Branch
        </button>
      </div>

      {/* Branch Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {branches.map(b => (
          <div 
            key={b.id}
            className="bg-white rounded-xl border border-slate-200/90 shadow-xs p-5 flex flex-col justify-between hover:border-indigo-300 hover:shadow-sm transition"
          >
            <div>
              <div className="flex items-center justify-between gap-2 mb-3">
                <span className="font-mono text-xs font-bold bg-slate-100 text-slate-700 px-2 py-0.5 rounded border border-slate-200">
                  {b.branch_code}
                </span>
                <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span> Active Desk
                </span>
              </div>

              <h3 className="text-base font-bold text-slate-900">{b.branch_name}</h3>
              <p className="text-xs text-slate-500 mt-1 flex items-center gap-1">
                <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                {b.address}, {b.city}
              </p>
              <p className="text-xs text-slate-500 mt-1 flex items-center gap-1">
                <Phone className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                {b.contact_phone}
              </p>

              <div className="mt-4 p-3 bg-slate-50 rounded-lg border border-slate-100 space-y-2 text-xs">
                <div className="flex justify-between">
                  <span className="text-slate-400">Assigned Customers</span>
                  <span className="font-bold text-slate-800">{b.customer_count}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Total FD Portfolio</span>
                  <span className="font-bold text-indigo-600">{formatINR(b.total_deposits)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">IFSC Prefix</span>
                  <span className="font-mono text-slate-700">{b.ifsc_prefix}</span>
                </div>
              </div>
            </div>

            <div className="mt-5 pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
              <span className="text-slate-400">Status: Operational</span>
              <button 
                onClick={() => alert(`Configuring ${b.branch_name}`)}
                className="font-semibold text-indigo-600 hover:text-indigo-800 transition cursor-pointer"
              >
                Configure Desk →
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
