import React, { useState, useEffect } from 'react';
import { 
  Search, 
  Filter, 
  PlusCircle, 
  Printer, 
  Eye, 
  RotateCw, 
  AlertTriangle, 
  Download,
  Calendar,
  Layers,
  CheckCircle,
  X
} from 'lucide-react';
import { formatINR, formatDate, COMPOUNDING_OPTIONS, apiRequest } from '../utils';

export default function FDList({ 
  onOpenNewFD, 
  onViewFD, 
  onPrintCertificate,
  onPrematureClose,
  onRenewFD
}) {
  const [fds, setFds] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');

  const fetchFDs = async () => {
    try {
      setLoading(true);
      let query = `?status=${statusFilter}`;
      if (search) query += `&search=${encodeURIComponent(search)}`;
      const res = await apiRequest(`/fds${query}`);
      setFds(res.fds || []);
    } catch (err) {
      console.error('Error fetching FDs:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchFDs();
    }, 200);
    return () => clearTimeout(timer);
  }, [statusFilter, search]);

  const getStatusBadge = (status) => {
    switch (status) {
      case 'ACTIVE':
        return <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-800">ACTIVE</span>;
      case 'MATURED':
        return <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-blue-100 text-blue-800">MATURED</span>;
      case 'CLOSED_PREMATURE':
        return <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-rose-100 text-rose-800">PREMATURE CLOSED</span>;
      case 'RENEWED':
        return <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-purple-100 text-purple-800">RENEWED</span>;
      default:
        return <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-slate-100 text-slate-800">{status}</span>;
    }
  };

  return (
    <div className="space-y-6">
      
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Fixed Deposit Portfolio</h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Sabhi FDs ki list, maturity tracking, print receipts aur status management
          </p>
        </div>

        <button
          onClick={onOpenNewFD}
          className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-xl text-xs flex items-center gap-2 shadow-lg shadow-indigo-600/20 transition cursor-pointer"
        >
          <PlusCircle className="w-4 h-4" />
          Book New FD
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row gap-4 items-center justify-between">
        
        {/* Search */}
        <div className="relative w-full md:w-96">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by FD Number, Client Name or Phone..."
            className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white"
          />
        </div>

        {/* Status Filters */}
        <div className="flex items-center gap-1.5 overflow-x-auto w-full md:w-auto pb-1 md:pb-0">
          {['ALL', 'ACTIVE', 'MATURED', 'CLOSED_PREMATURE', 'RENEWED'].map((st) => (
            <button
              key={st}
              onClick={() => setStatusFilter(st)}
              className={`text-xs px-3 py-1.5 rounded-xl font-semibold transition cursor-pointer whitespace-nowrap ${
                statusFilter === st
                  ? 'bg-slate-900 text-white shadow-sm'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {st === 'ALL' ? 'All FDs' : st.replace('_', ' ')}
            </button>
          ))}
        </div>
      </div>

      {/* FD Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        {loading ? (
          <div className="py-20 text-center">
            <div className="inline-block w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
            <p className="text-xs text-slate-400 mt-2 font-medium">Loading FDs...</p>
          </div>
        ) : fds.length === 0 ? (
          <div className="py-20 text-center text-slate-400">
            <Layers className="w-12 h-12 mx-auto stroke-1 mb-2 opacity-50" />
            <p className="font-semibold text-slate-600 text-sm">No Fixed Deposits found</p>
            <p className="text-xs text-slate-400 mt-1">Try changing your search or filter</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-600 uppercase font-bold border-b border-slate-100">
                <tr>
                  <th className="py-3.5 px-4">FD Number</th>
                  <th className="py-3.5 px-4">Client</th>
                  <th className="py-3.5 px-4 text-right">Principal</th>
                  <th className="py-3.5 px-4 text-center">Rate</th>
                  <th className="py-3.5 px-4">Scheme / Type</th>
                  <th className="py-3.5 px-4">Start Date</th>
                  <th className="py-3.5 px-4">Maturity Date</th>
                  <th className="py-3.5 px-4 text-right">Maturity Value</th>
                  <th className="py-3.5 px-4 text-center">Status</th>
                  <th className="py-3.5 px-4 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                {fds.map((fd) => {
                  const schemeObj = COMPOUNDING_OPTIONS.find(o => o.value === fd.compounding_frequency);
                  const isNearMaturity = fd.status === 'ACTIVE' && new Date(fd.maturity_date) <= new Date(Date.now() + 30 * 86400000);

                  return (
                    <tr key={fd.id} className="hover:bg-slate-50/80 transition">
                      <td className="py-3.5 px-4">
                        <span className="font-bold text-indigo-600 block">{fd.fd_number}</span>
                        <span className="text-[10px] text-slate-400">{fd.customer_code}</span>
                      </td>

                      <td className="py-3.5 px-4">
                        <div className="font-bold text-slate-800">{fd.customer_name}</div>
                        <div className="text-[11px] text-slate-500">{fd.customer_phone}</div>
                      </td>

                      <td className="py-3.5 px-4 text-right font-black text-slate-900 text-sm">
                        {formatINR(fd.principal_amount)}
                      </td>

                      <td className="py-3.5 px-4 text-center">
                        <span className="font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded">
                          {fd.annual_rate}%
                        </span>
                        {fd.is_senior_citizen ? (
                          <span className="block text-[9px] font-bold text-amber-600 mt-0.5">Sr. Citizen</span>
                        ) : null}
                      </td>

                      <td className="py-3.5 px-4">
                        <span className="text-slate-700 font-medium block">
                          {fd.tenure_months} Months
                        </span>
                        <span className="text-[10px] text-slate-400 truncate block max-w-[140px]" title={schemeObj?.label}>
                          {schemeObj?.label || fd.compounding_frequency}
                        </span>
                      </td>

                      <td className="py-3.5 px-4 text-slate-600">
                        {formatDate(fd.start_date)}
                      </td>

                      <td className="py-3.5 px-4">
                        <span className={`font-semibold block ${isNearMaturity ? 'text-rose-600 font-bold' : 'text-slate-800'}`}>
                          {formatDate(fd.maturity_date)}
                        </span>
                        {isNearMaturity && (
                          <span className="text-[10px] bg-rose-50 text-rose-600 px-1.5 py-0.2 rounded font-bold">
                            Maturing Soon
                          </span>
                        )}
                      </td>

                      <td className="py-3.5 px-4 text-right font-black text-emerald-700 text-sm">
                        {formatINR(fd.maturity_amount)}
                        {!fd.is_cumulative && (
                          <span className="block text-[10px] text-amber-600 font-normal">
                            Payout: {formatINR(fd.payout_amount)}/period
                          </span>
                        )}
                      </td>

                      <td className="py-3.5 px-4 text-center">
                        {getStatusBadge(fd.status)}
                      </td>

                      <td className="py-3.5 px-4 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            title="View Full Ledger & Details"
                            onClick={() => onViewFD(fd.id)}
                            className="p-1.5 hover:bg-slate-100 text-slate-600 hover:text-indigo-600 rounded-lg transition cursor-pointer"
                          >
                            <Eye className="w-4 h-4" />
                          </button>

                          <button
                            title="Print FD Certificate / Receipt"
                            onClick={() => onPrintCertificate(fd.id)}
                            className="p-1.5 hover:bg-indigo-50 text-slate-600 hover:text-indigo-600 rounded-lg transition cursor-pointer"
                          >
                            <Printer className="w-4 h-4" />
                          </button>

                          {fd.status === 'ACTIVE' && (
                            <>
                              <button
                                title="Premature Withdrawal"
                                onClick={() => onPrematureClose(fd)}
                                className="p-1.5 hover:bg-rose-50 text-slate-600 hover:text-rose-600 rounded-lg transition cursor-pointer"
                              >
                                <AlertTriangle className="w-4 h-4" />
                              </button>

                              <button
                                title="Renew FD"
                                onClick={() => onRenewFD(fd)}
                                className="p-1.5 hover:bg-emerald-50 text-slate-600 hover:text-emerald-600 rounded-lg transition cursor-pointer"
                              >
                                <RotateCw className="w-4 h-4" />
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

    </div>
  );
}
