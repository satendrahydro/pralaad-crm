import React, { useState } from 'react';
import { 
  Building2, 
  PlusCircle, 
  MapPin, 
  Phone, 
  Mail,
  ShieldCheck, 
  CheckCircle2, 
  Users, 
  Wallet,
  Settings,
  Calendar
} from 'lucide-react';
import { formatINR } from '../utils';

export default function BranchManagement() {
  const [branches] = useState([
    {
      id: 1,
      branch_code: 'BHR001',
      branch_name: 'MAIN BRANCH',
      city: 'BIJNOR',
      state: 'Uttar Pradesh',
      pin: '246701',
      address: 'Vedic Vihar, Civil Line-I, Near Ayushman Hospital Opp. Andhra Bank, Kiratpur Road, Bijnor',
      contact_phone: '+91 98375 54433',
      contact_email: 'prahlad121980@gmail.com',
      is_active: 1,
      customer_count: 9,
      opening_date: '12 June 2019'
    },
    {
      id: 2,
      branch_code: 'BRH003',
      branch_name: 'TARPL SAVING',
      city: 'BIJNOR',
      state: 'Uttar Pradesh',
      pin: '246701',
      address: 'TARPL Civil Line-I, Vedik Vihar, Near Rathi Medical Store, Bijnor',
      contact_phone: '+91 92191 25557',
      contact_email: 'pradeepnp1981@gmail.com',
      is_active: 1,
      customer_count: 1,
      opening_date: '28 January 2020'
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
              {branches.length} Operational Branches
            </span>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200">
              Bijnor, Uttar Pradesh
            </span>
          </div>
          <p className="text-xs md:text-sm text-slate-500 mt-1">
            Taranganjali Private Limited अधिकृत शाखाएं व नोडल संपर्क विवरण
          </p>
        </div>
      </div>

      {/* Branches Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {branches.map((b) => (
          <div 
            key={b.id}
            className="bg-white rounded-xl border border-slate-200 shadow-xs p-5 flex flex-col justify-between hover:border-emerald-300 hover:shadow-sm transition"
          >
            <div>
              <div className="flex items-center justify-between gap-2 mb-3">
                <div className="flex items-center gap-2">
                  <div className="p-2 bg-emerald-50 rounded-lg text-emerald-700">
                    <Building2 className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-slate-900">{b.branch_name}</h3>
                    <span className="text-xs font-mono font-semibold text-slate-500">
                      Code: {b.branch_code}
                    </span>
                  </div>
                </div>

                <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full"></span>
                  Active Branch
                </span>
              </div>

              {/* Address Box */}
              <div className="my-3 p-3 bg-slate-50 rounded-lg border border-slate-100 text-xs text-slate-600 space-y-1.5">
                <p className="flex items-start gap-1.5">
                  <MapPin className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
                  <span>{b.address}, {b.city}, {b.state} - {b.pin}</span>
                </p>
                <p className="flex items-center gap-1.5">
                  <Phone className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                  <span className="font-semibold text-slate-800">{b.contact_phone}</span>
                </p>
                <p className="flex items-center gap-1.5">
                  <Mail className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                  <span className="text-indigo-600">{b.contact_email}</span>
                </p>
              </div>

              {/* Key Stats */}
              <div className="grid grid-cols-2 gap-3 text-xs pt-2">
                <div className="p-2.5 bg-indigo-50/50 rounded-lg border border-indigo-100/60">
                  <div className="text-[10px] font-semibold text-indigo-700 uppercase">Customers Enrolled</div>
                  <div className="text-lg font-bold text-indigo-900">{b.customer_count} Members</div>
                </div>
                <div className="p-2.5 bg-amber-50/50 rounded-lg border border-amber-100/60">
                  <div className="text-[10px] font-semibold text-amber-700 uppercase flex items-center gap-1">
                    <Calendar className="w-3 h-3" /> Opening Date
                  </div>
                  <div className="text-xs font-bold text-slate-800 mt-1">{b.opening_date}</div>
                </div>
              </div>
            </div>

            <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
              <span className="flex items-center gap-1 text-emerald-700 font-medium">
                <ShieldCheck className="w-3.5 h-3.5" /> Direct Branch Node
              </span>
              <span className="font-mono text-[11px] text-slate-400">TARPL Bijnor</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
