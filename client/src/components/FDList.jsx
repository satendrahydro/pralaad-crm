import React, { useState, useEffect, useRef } from 'react';
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
  X,
  MoreVertical,
  MessageSquare,
  ChevronDown,
  ArrowUpDown,
  Sparkles
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
  const [schemeFilter, setSchemeFilter] = useState('ALL');
  const [sortBy, setSortBy] = useState('newest'); // 'newest' | 'principal_desc' | 'maturity_asc' | 'rate_desc'

  const [activeRowMenu, setActiveRowMenu] = useState(null);
  const [schemeDropdownOpen, setSchemeDropdownOpen] = useState(false);
  const [sortDropdownOpen, setSortDropdownOpen] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 25;

  const schemeRef = useRef(null);
  const sortRef = useRef(null);
  const tableRef = useRef(null);

  const handleExportCSV = () => {
    if (!filteredAndSortedFDs.length) return alert('No records to export');
    const headers = ['FD Number', 'Customer Name', 'Customer Code', 'Phone', 'Principal', 'Annual Rate', 'Tenure Months', 'Maturity Amount', 'Maturity Date', 'Status'];
    const rows = filteredAndSortedFDs.map(fd => [
      `"${fd.fd_number || ''}"`,
      `"${fd.customer_name || ''}"`,
      `"${fd.customer_code || ''}"`,
      `"${fd.customer_phone || ''}"`,
      fd.principal_amount,
      fd.annual_rate,
      fd.tenure_months,
      fd.maturity_amount,
      `"${fd.maturity_date || ''}"`,
      `"${fd.status || ''}"`
    ]);
    const csvContent = 'data:text/csv;charset=utf-8,\uFEFF' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `FD_Portfolio_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Close dropdowns on outside click
  useEffect(() => {
    function handleClickOutside(event) {
      if (schemeRef.current && !schemeRef.current.contains(event.target)) {
        setSchemeDropdownOpen(false);
      }
      if (sortRef.current && !sortRef.current.contains(event.target)) {
        setSortDropdownOpen(false);
      }
      if (tableRef.current && !tableRef.current.contains(event.target)) {
        setActiveRowMenu(null);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

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

  const handleSendWhatsAppAlert = (fd) => {
    let phone = fd.customer_phone ? fd.customer_phone.replace(/[^0-9]/g, '') : '';
    if (phone.length === 10) phone = '91' + phone;

    const msg = `नमस्ते ${fd.customer_name} जी! 🙏\n\nआपकी Fixed Deposit (A/c No: *${fd.fd_number}*) का विवरण:\n\n💰 मूलधन (Principal): *${formatINR(fd.principal_amount)}*\n📈 ब्याज दर: *${fd.annual_rate}%*\n📅 परिपक्वता (Maturity): *${formatDate(fd.maturity_date)}*\n💵 परिपक्वता राशि: *${formatINR(fd.maturity_amount)}*\n\nकिसी भी सहायता या नवीनीकरण (Renewal) के लिए हमसे संपर्क करें।\n\nसादर,\nFixed Deposit & Wealth Management Desk`;
    window.open(`https://wa.me/${phone}?text=${encodeURIComponent(msg)}`, '_blank');
  };

  // Filter & Sort In-Memory
  const filteredAndSortedFDs = fds
    .filter(fd => {
      if (schemeFilter === 'ALL') return true;
      return fd.compounding_frequency === schemeFilter;
    })
    .sort((a, b) => {
      if (sortBy === 'principal_desc') return b.principal_amount - a.principal_amount;
      if (sortBy === 'maturity_asc') return new Date(a.maturity_date) - new Date(b.maturity_date);
      if (sortBy === 'rate_desc') return b.annual_rate - a.annual_rate;
      return b.id - a.id; // default newest
    });

  const getStatusBadge = (status) => {
    switch (status) {
      case 'ACTIVE':
        return (
          <span className="px-2.5 py-0.5 rounded-full text-[11px] font-black bg-emerald-100 text-emerald-800 inline-flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 animate-pulse"></span>
            ACTIVE
          </span>
        );
      case 'MATURED':
        return <span className="px-2.5 py-0.5 rounded-full text-[11px] font-black bg-blue-100 text-blue-800">MATURED</span>;
      case 'CLOSED_PREMATURE':
        return <span className="px-2.5 py-0.5 rounded-full text-[11px] font-black bg-rose-100 text-rose-800">LIQUIDATED</span>;
      case 'RENEWED':
        return <span className="px-2.5 py-0.5 rounded-full text-[11px] font-black bg-purple-100 text-purple-800">RENEWED</span>;
      default:
        return <span className="px-2.5 py-0.5 rounded-full text-[11px] font-black bg-slate-100 text-slate-800">{status}</span>;
    }
  };

  return (
    <div className="space-y-6 animate-dropdown">
      
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] uppercase font-black tracking-wider px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-700">
              Live Ledger
            </span>
            <span className="text-xs text-slate-400 font-semibold">{filteredAndSortedFDs.length} FDs Showing</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight mt-1">
            Fixed Deposit Portfolio
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            Complete account registers, compounding schemes, bond receipts & lifecycle actions
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            id="fd-export-csv-btn"
            onClick={handleExportCSV}
            className="px-3.5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs flex items-center gap-2 border border-slate-200 transition cursor-pointer"
            title="Export to CSV"
          >
            <Download className="w-4 h-4 text-indigo-600" />
            <span>Export CSV</span>
          </button>

          <button
            onClick={onOpenNewFD}
            className="px-4 py-2.5 bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-500 hover:to-indigo-600 text-white font-bold rounded-xl text-xs flex items-center gap-2 shadow-md shadow-indigo-600/30 transition-transform active:scale-95 cursor-pointer"
          >
            <PlusCircle className="w-4 h-4" />
            <span>Book New FD</span>
          </button>
        </div>
      </div>

      {/* Filter and Search Bar with Interactive Dropdowns */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-col lg:flex-row gap-3 items-center justify-between relative z-20">
        
        {/* Search */}
        <div className="relative w-full lg:w-80">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by FD No, Client, Phone..."
            className="w-full pl-10 pr-8 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition"
          />
          {search && (
            <button 
              onClick={() => setSearch('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Multi-Filters: Status, Scheme & Sort */}
        <div className="flex flex-wrap items-center gap-2 w-full lg:w-auto">
          
          {/* Status Tabs */}
          <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl text-xs font-bold overflow-x-auto">
            {['ALL', 'ACTIVE', 'MATURED', 'CLOSED_PREMATURE'].map((st) => (
              <button
                key={st}
                onClick={() => setStatusFilter(st)}
                className={`px-3 py-1.5 rounded-lg transition whitespace-nowrap cursor-pointer ${
                  statusFilter === st
                    ? 'bg-slate-900 text-white shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {st === 'ALL' ? 'All' : st === 'CLOSED_PREMATURE' ? 'Liquidated' : st}
              </button>
            ))}
          </div>

          {/* Scheme Dropdown */}
          <div className="relative" ref={schemeRef}>
            <button
              onClick={() => setSchemeDropdownOpen(!schemeDropdownOpen)}
              className="flex items-center gap-1.5 px-3 py-2 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 transition cursor-pointer"
            >
              <Filter className="w-3.5 h-3.5 text-indigo-600" />
              <span>
                {schemeFilter === 'ALL' ? 'All Schemes' : schemeFilter.replace('_', ' ')}
              </span>
              <ChevronDown className={`w-3.5 h-3.5 text-slate-400 transition-transform ${schemeDropdownOpen ? 'rotate-180' : ''}`} />
            </button>

            {schemeDropdownOpen && (
              <div className="absolute right-0 mt-2 w-52 bg-white rounded-xl shadow-2xl border border-slate-200 p-1.5 z-50 animate-dropdown text-xs ring-1 ring-black/10">
                <button
                  onClick={() => {
                    setSchemeFilter('ALL');
                    setSchemeDropdownOpen(false);
                  }}
                  className={`w-full text-left px-3 py-2 rounded-lg font-semibold flex items-center justify-between cursor-pointer ${
                    schemeFilter === 'ALL' ? 'bg-indigo-50 text-indigo-700 font-bold' : 'text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  <span>All Compounding Types</span>
                  {schemeFilter === 'ALL' && <CheckCircle className="w-3.5 h-3.5 text-indigo-600" />}
                </button>
                {COMPOUNDING_OPTIONS.map((opt) => (
                  <button
                    key={opt.value}
                    onClick={() => {
                      setSchemeFilter(opt.value);
                      setSchemeDropdownOpen(false);
                    }}
                    className={`w-full text-left px-3 py-2 rounded-lg font-semibold flex items-center justify-between cursor-pointer ${
                      schemeFilter === opt.value ? 'bg-indigo-50 text-indigo-700 font-bold' : 'text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    <span>{opt.label}</span>
                    {schemeFilter === opt.value && <CheckCircle className="w-3.5 h-3.5 text-indigo-600" />}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Sort Order Dropdown */}
          <div className="relative" ref={sortRef}>
            <button
              onClick={() => setSortDropdownOpen(!sortDropdownOpen)}
              className="flex items-center gap-1.5 px-3 py-2 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 transition cursor-pointer"
            >
              <ArrowUpDown className="w-3.5 h-3.5 text-indigo-600" />
              <span>
                {sortBy === 'newest' && 'Newest'}
                {sortBy === 'principal_desc' && 'Principal High'}
                {sortBy === 'maturity_asc' && 'Maturity Soon'}
                {sortBy === 'rate_desc' && 'Rate High'}
              </span>
              <ChevronDown className={`w-3.5 h-3.5 text-slate-400 transition-transform ${sortDropdownOpen ? 'rotate-180' : ''}`} />
            </button>

            {sortDropdownOpen && (
              <div className="absolute right-0 mt-2 w-48 bg-white rounded-xl shadow-2xl border border-slate-200 p-1.5 z-[60] animate-dropdown text-xs ring-1 ring-black/10">
                {[
                  { id: 'newest', label: 'Newest Booked' },
                  { id: 'principal_desc', label: 'Principal (Highest)' },
                  { id: 'maturity_asc', label: 'Maturity (Soonest)' },
                  { id: 'rate_desc', label: 'Interest Rate (Highest)' },
                ].map((item) => (
                  <button
                    key={item.id}
                    onClick={() => {
                      setSortBy(item.id);
                      setSortDropdownOpen(false);
                    }}
                    className={`w-full text-left px-3 py-2 rounded-lg font-semibold flex items-center justify-between cursor-pointer ${
                      sortBy === item.id ? 'bg-indigo-50 text-indigo-700 font-bold' : 'text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    <span>{item.label}</span>
                    {sortBy === item.id && <CheckCircle className="w-3.5 h-3.5 text-indigo-600" />}
                  </button>
                ))}
              </div>
            )}
          </div>

        </div>
      </div>

      {/* FD Table with Dropdown Actions */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden" ref={tableRef}>
        {loading ? (
          <div className="py-24 text-center">
            <div className="inline-block w-10 h-10 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
            <p className="text-xs text-slate-400 mt-2 font-bold animate-pulse">Fetching Fixed Deposits...</p>
          </div>
        ) : filteredAndSortedFDs.length === 0 ? (
          <div className="py-24 text-center text-slate-400">
            <Layers className="w-12 h-12 mx-auto stroke-1 mb-2 opacity-50" />
            <p className="font-bold text-slate-700 text-sm">No Fixed Deposits found</p>
            <p className="text-xs text-slate-400 mt-1">Try resetting search or filters</p>
          </div>
        ) : (
          <div className="overflow-x-auto min-h-[380px]">
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
                {filteredAndSortedFDs.slice((currentPage - 1) * pageSize, currentPage * pageSize).map((fd) => {
                  const schemeObj = COMPOUNDING_OPTIONS.find(o => o.value === fd.compounding_frequency);
                  const isNearMaturity = fd.status === 'ACTIVE' && new Date(fd.maturity_date) <= new Date(Date.now() + 30 * 86400000);

                  return (
                    <tr key={fd.id} className={`hover:bg-slate-50/80 transition table-row-hover ${activeRowMenu === fd.id ? 'relative z-30' : ''}`}>
                      <td className="py-3.5 px-4">
                        <span className="font-mono font-bold text-indigo-600 block">{fd.fd_number}</span>
                        <span className="text-[10px] text-slate-400 font-semibold">{fd.customer_code}</span>
                      </td>

                      <td className="py-3.5 px-4">
                        <div className="font-bold text-slate-800">{fd.customer_name}</div>
                        <div className="text-[11px] text-slate-500">{fd.customer_phone}</div>
                      </td>

                      <td className="py-3.5 px-4 text-right font-black text-slate-900 text-sm">
                        {formatINR(fd.principal_amount)}
                      </td>

                      <td className="py-3.5 px-4 text-center">
                        <span className="font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded">
                          {fd.annual_rate}%
                        </span>
                        {fd.is_senior_citizen ? (
                          <span className="block text-[9px] font-bold text-amber-600 mt-0.5">Sr. Citizen (+0.5%)</span>
                        ) : null}
                      </td>

                      <td className="py-3.5 px-4">
                        <span className="text-slate-700 font-semibold block">
                          {fd.tenure_months} Months
                        </span>
                        <span className="text-[10px] text-slate-400 truncate block max-w-[130px]" title={schemeObj?.label}>
                          {schemeObj?.label || fd.compounding_frequency}
                        </span>
                      </td>

                      <td className="py-3.5 px-4 text-slate-600">
                        {formatDate(fd.start_date)}
                      </td>

                      <td className="py-3.5 px-4">
                        <span className={`font-semibold block ${isNearMaturity ? 'text-rose-600 font-black' : 'text-slate-800'}`}>
                          {formatDate(fd.maturity_date)}
                        </span>
                        {isNearMaturity && (
                          <span className="text-[9px] bg-rose-100 text-rose-700 px-1.5 py-0.2 rounded font-black uppercase tracking-wider">
                            Maturing Soon
                          </span>
                        )}
                      </td>

                      <td className="py-3.5 px-4 text-right font-black text-emerald-700 text-sm">
                        {formatINR(fd.maturity_amount)}
                        {!fd.is_cumulative && (
                          <span className="block text-[10px] text-amber-600 font-semibold">
                            Payout: {formatINR(fd.payout_amount)}/mo
                          </span>
                        )}
                      </td>

                      <td className="py-3.5 px-4 text-center">
                        {getStatusBadge(fd.status)}
                      </td>

                      <td className="py-3.5 px-4 text-center relative">
                        <div className="flex items-center justify-center gap-1">
                          
                          {/* Quick View Button */}
                          <button
                            title="View Full Ledger"
                            onClick={() => onViewFD(fd.id)}
                            className="p-1.5 hover:bg-slate-100 text-slate-600 hover:text-indigo-600 rounded-lg transition cursor-pointer"
                          >
                            <Eye className="w-4 h-4" />
                          </button>

                          {/* Print Certificate */}
                          <button
                            title="Print Bond Certificate"
                            onClick={() => onPrintCertificate(fd.id)}
                            className="p-1.5 hover:bg-indigo-50 text-slate-600 hover:text-indigo-600 rounded-lg transition cursor-pointer"
                          >
                            <Printer className="w-4 h-4" />
                          </button>

                          {/* WhatsApp Alert Button */}
                          <button
                            title="Send WhatsApp Alert"
                            onClick={() => handleSendWhatsAppAlert(fd)}
                            className="p-1.5 hover:bg-emerald-50 text-slate-600 hover:text-emerald-600 rounded-lg transition cursor-pointer"
                          >
                            <MessageSquare className="w-4 h-4" />
                          </button>

                          {/* 3-Dot Interactive Actions Dropdown */}
                          <div className="relative">
                            <button
                              onClick={() => setActiveRowMenu(activeRowMenu === fd.id ? null : fd.id)}
                              className="p-1.5 hover:bg-slate-100 text-slate-500 hover:text-slate-900 rounded-lg transition cursor-pointer"
                            >
                              <MoreVertical className="w-4 h-4" />
                            </button>

                            {activeRowMenu === fd.id && (
                              <div className="absolute right-0 mt-1 w-48 bg-white rounded-xl shadow-2xl border border-slate-200 p-1.5 z-[100] text-left animate-dropdown text-xs ring-1 ring-black/10">
                                
                                <button
                                  onClick={() => {
                                    onViewFD(fd.id);
                                    setActiveRowMenu(null);
                                  }}
                                  className="w-full px-2.5 py-1.5 hover:bg-slate-50 rounded-lg text-slate-700 font-semibold flex items-center gap-2 cursor-pointer"
                                >
                                  <Eye className="w-3.5 h-3.5 text-indigo-600" />
                                  <span>View FD Passbook</span>
                                </button>

                                <button
                                  onClick={() => {
                                    onPrintCertificate(fd.id);
                                    setActiveRowMenu(null);
                                  }}
                                  className="w-full px-2.5 py-1.5 hover:bg-slate-50 rounded-lg text-slate-700 font-semibold flex items-center gap-2 cursor-pointer"
                                >
                                  <Printer className="w-3.5 h-3.5 text-blue-600" />
                                  <span>Print Certificate</span>
                                </button>

                                <button
                                  onClick={() => {
                                    handleSendWhatsAppAlert(fd);
                                    setActiveRowMenu(null);
                                  }}
                                  className="w-full px-2.5 py-1.5 hover:bg-emerald-50 text-emerald-700 rounded-lg font-semibold flex items-center gap-2 cursor-pointer"
                                >
                                  <MessageSquare className="w-3.5 h-3.5 text-emerald-600" />
                                  <span>Send WhatsApp</span>
                                </button>

                                {fd.status === 'ACTIVE' && (
                                  <>
                                    <div className="my-1 border-t border-slate-100"></div>

                                    <button
                                      onClick={() => {
                                        onRenewFD(fd);
                                        setActiveRowMenu(null);
                                      }}
                                      className="w-full px-2.5 py-1.5 hover:bg-purple-50 text-purple-700 rounded-lg font-semibold flex items-center gap-2 cursor-pointer"
                                    >
                                      <RotateCw className="w-3.5 h-3.5 text-purple-600" />
                                      <span>Renew FD</span>
                                    </button>

                                    <button
                                      onClick={() => {
                                        onPrematureClose(fd);
                                        setActiveRowMenu(null);
                                      }}
                                      className="w-full px-2.5 py-1.5 hover:bg-rose-50 text-rose-600 rounded-lg font-semibold flex items-center gap-2 cursor-pointer"
                                    >
                                      <AlertTriangle className="w-3.5 h-3.5 text-rose-500" />
                                      <span>Premature Close</span>
                                    </button>
                                  </>
                                )}

                              </div>
                            )}
                          </div>

                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Table Pagination Bar */}
        {!loading && filteredAndSortedFDs.length > 0 && (
          <div className="p-3 bg-slate-50 border-t border-slate-200 flex flex-wrap items-center justify-between gap-3 text-xs text-slate-600 font-semibold">
            <div>
              Showing {Math.min((currentPage - 1) * pageSize + 1, filteredAndSortedFDs.length)} to {Math.min(currentPage * pageSize, filteredAndSortedFDs.length)} of {filteredAndSortedFDs.length} FDs
            </div>
            <div className="flex items-center gap-2">
              <button
                id="fd-pagination-prev"
                disabled={currentPage === 1}
                onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                className="px-3 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed transition cursor-pointer font-bold"
              >
                Previous
              </button>
              <span className="font-bold text-slate-800">
                Page {currentPage} of {Math.max(1, Math.ceil(filteredAndSortedFDs.length / pageSize))}
              </span>
              <button
                id="fd-pagination-next"
                disabled={currentPage >= Math.ceil(filteredAndSortedFDs.length / pageSize)}
                onClick={() => setCurrentPage(prev => Math.min(Math.ceil(filteredAndSortedFDs.length / pageSize), prev + 1))}
                className="px-3 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed transition cursor-pointer font-bold"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>

    </div>
  );
}
