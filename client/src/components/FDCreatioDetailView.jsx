import React, { useState, useEffect } from 'react';
import { 
  ArrowLeft, 
  Save, 
  Lock, 
  MoreVertical, 
  Play, 
  Share2, 
  Paperclip, 
  Check, 
  X, 
  Printer, 
  RotateCw, 
  AlertTriangle, 
  Building2, 
  Calendar, 
  User, 
  CreditCard,
  CheckCircle2,
  Clock,
  Phone,
  Mail,
  Globe,
  MapPin,
  ExternalLink,
  ChevronDown,
  Search,
  Plus,
  RefreshCw,
  Sliders,
  DollarSign,
  TrendingUp,
  Receipt,
  ShieldCheck,
  FileText,
  Percent,
  Banknote
} from 'lucide-react';
import { formatINR, formatDate, COMPOUNDING_OPTIONS, apiRequest } from '../utils';

export default function FDCreatioDetailView({ 
  fdId, 
  onBack, 
  onPrintCertificate,
  onPrematureClose,
  onRenewFD 
}) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('OVERVIEW');
  const [confidenceScore, setConfidenceScore] = useState(85);
  const [tags, setTags] = useState(['Hot_Portfolio', 'Corporate_HNI', 'Auto_Compounding']);
  const [newTagInput, setNewTagInput] = useState('');
  const [addingTag, setAddingTag] = useState(false);
  const [nextStepCompleted, setNextStepCompleted] = useState(false);

  const fetchDetails = async () => {
    if (!fdId) return;
    try {
      setLoading(true);
      const res = await apiRequest(`/fds/${fdId}`);
      setData(res);
    } catch (err) {
      console.error('Error loading FD details', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDetails();
  }, [fdId]);

  const handleMarkSchedulePaid = async (scheduleId) => {
    try {
      await apiRequest(`/fds/schedule/${scheduleId}/mark-paid`, {
        method: 'POST',
        body: JSON.stringify({
          payment_reference: 'NEFT-' + Date.now(),
          paid_date: new Date().toISOString().split('T')[0]
        })
      });
      fetchDetails();
    } catch (err) {
      alert('Error updating schedule: ' + err.message);
    }
  };

  const handleAddTag = () => {
    if (newTagInput.trim() && !tags.includes(newTagInput.trim())) {
      setTags([...tags, newTagInput.trim()]);
      setNewTagInput('');
      setAddingTag(false);
    }
  };

  const handleRemoveTag = (tagToRemove) => {
    setTags(tags.filter(t => t !== tagToRemove));
  };

  if (loading || !data) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[70vh]">
        <div className="w-10 h-10 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mb-3"></div>
        <p className="text-sm font-semibold text-slate-700">Loading Creatio Entity View...</p>
        <p className="text-xs text-slate-400">Rendering Master Record, Chevrons & Financial Rails</p>
      </div>
    );
  }

  const { fd, schedules, transactions, scheme } = data;
  const customer = data.customer || {
    name: fd?.customer_name,
    customer_number: fd?.customer_code,
    phone: fd?.customer_phone,
    email: fd?.customer_email,
    pan: fd?.customer_pan,
    aadhaar: fd?.customer_aadhaar,
    address: fd?.customer_address,
    bank_name: fd?.bank_name,
    account_no: fd?.account_no,
    ifsc: fd?.ifsc_code,
    nominee: fd?.nominee_name,
    nominee_relation: fd?.nominee_relation
  };

  // Calculate status pipeline stage
  // Stages: 1. Application, 2. Document KYC, 3. Checker Approved, 4. Active Servicing, 5. Settled
  const getStageStatus = () => {
    if (fd.status === 'PENDING_APPROVAL') return 1;
    if (fd.status === 'CLOSED_PREMATURE' || fd.status === 'MATURED') return 5;
    return 4; // Active & Servicing
  };

  const currentStage = getStageStatus();

  // Metric calculation for tiles
  const startDate = new Date(fd.start_date);
  const now = new Date();
  const daysActive = Math.max(0, Math.floor((now - startDate) / (1000 * 60 * 60 * 24)));
  
  const pendingSchedules = schedules ? schedules.filter(s => s.status === 'PENDING') : [];
  const paidSchedules = schedules ? schedules.filter(s => s.status === 'PAID') : [];
  const nextPayoutDate = pendingSchedules.length > 0 ? pendingSchedules[0].due_date : fd.maturity_date;
  const daysToNextPayout = Math.max(0, Math.ceil((new Date(nextPayoutDate) - now) / (1000 * 60 * 60 * 24)));

  return (
    <div className="space-y-4 pb-20 animate-fadeIn">
      
      {/* ======================================================== */}
      {/* 1. CREATIO TOP ENTITY BREADCRUMB & ACTION BAR            */}
      {/* ======================================================== */}
      <div className="bg-white rounded-xl border border-slate-200/90 shadow-xs p-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
        
        {/* Left: Back Arrow, Title, Tags */}
        <div className="flex items-center gap-3 flex-wrap">
          <button
            onClick={onBack}
            className="p-1.5 rounded-lg text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition cursor-pointer"
            title="Back to List"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>

          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-xl font-bold text-slate-900 tracking-tight">
                {customer?.name || 'Customer Record'}
              </h1>
              <span className="text-sm font-semibold text-slate-400">•</span>
              <span className="text-sm font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-100">
                {fd.fd_number}
              </span>
              <span className="text-xs text-slate-500">
                ({scheme?.name || 'Fixed Deposit Scheme'})
              </span>
            </div>

            {/* Pill Tags */}
            <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
              {tags.map((tag, idx) => (
                <span 
                  key={idx}
                  className="inline-flex items-center gap-1 text-[11px] font-semibold bg-slate-100 text-slate-700 px-2 py-0.5 rounded-full border border-slate-200"
                >
                  {tag}
                  <button 
                    onClick={() => handleRemoveTag(tag)}
                    className="text-slate-400 hover:text-slate-600 cursor-pointer"
                  >
                    ×
                  </button>
                </span>
              ))}

              {addingTag ? (
                <div className="inline-flex items-center gap-1">
                  <input
                    type="text"
                    value={newTagInput}
                    onChange={(e) => setNewTagInput(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleAddTag()}
                    placeholder="tag name..."
                    autoFocus
                    className="text-[11px] px-2 py-0.5 bg-white border border-indigo-400 rounded-full focus:outline-none w-24"
                  />
                  <button 
                    onClick={handleAddTag} 
                    className="text-[10px] bg-indigo-600 text-white px-1.5 py-0.5 rounded-full font-bold cursor-pointer"
                  >
                    Add
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => setAddingTag(true)}
                  className="text-[11px] font-medium text-indigo-600 hover:text-indigo-800 hover:underline cursor-pointer"
                >
                  + Add tag
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Right Action Buttons */}
        <div className="flex items-center gap-2 flex-wrap">
          <button 
            onClick={() => onPrintCertificate && onPrintCertificate(fd.id)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold border border-slate-200 transition cursor-pointer"
          >
            <Printer className="w-3.5 h-3.5" /> Certificate
          </button>

          <button 
            onClick={() => onRenewFD && onRenewFD(fd)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold border border-slate-200 transition cursor-pointer"
          >
            <RotateCw className="w-3.5 h-3.5" /> Renew
          </button>

          {fd.status === 'ACTIVE' && (
            <button 
              onClick={() => onPrematureClose && onPrematureClose(fd)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 rounded-lg text-xs font-semibold border border-rose-200 transition cursor-pointer"
            >
              <AlertTriangle className="w-3.5 h-3.5" /> Premature Close
            </button>
          )}

          <button 
            onClick={fetchDetails}
            className="inline-flex items-center gap-1.5 px-4 py-1.5 bg-[#0066f5] hover:bg-blue-600 text-white rounded-lg text-xs font-bold transition shadow-xs cursor-pointer"
          >
            <Save className="w-3.5 h-3.5" /> Save Record
          </button>
        </div>
      </div>

      {/* ======================================================== */}
      {/* 2. CREATIO CHEVRON PROCESS PIPELINE STEPPER              */}
      {/* ======================================================== */}
      <div className="bg-white rounded-xl border border-slate-200/90 shadow-xs p-3">
        <div className="chevron-nav">
          <div className={`chevron-step ${currentStage >= 1 ? (currentStage === 1 ? 'active' : 'completed') : ''}`}>
            1. Qualification & Proposal
          </div>
          <div className={`chevron-step ${currentStage >= 2 ? (currentStage === 2 ? 'active' : 'completed') : ''}`}>
            2. KYC & Documentation
          </div>
          <div className={`chevron-step ${currentStage >= 3 ? (currentStage === 3 ? 'active' : 'completed') : ''}`}>
            3. Checker Authorization
          </div>
          <div className={`chevron-step ${currentStage >= 4 ? (currentStage === 4 ? 'active' : 'completed') : ''}`}>
            4. Active & Servicing
          </div>
          <div className={`chevron-step ${currentStage === 5 ? 'active' : ''}`}>
            5. Maturity & Settlement
          </div>
        </div>
      </div>

      {/* ======================================================== */}
      {/* 3. THREE-COLUMN CREATIO MASTER DETAIL LAYOUT             */}
      {/* ======================================================== */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">

        {/* -------------------------------------------------------- */}
        {/* LEFT COLUMN: Entity Facts & Customer Card (3 Cols)       */}
        {/* -------------------------------------------------------- */}
        <div className="lg:col-span-3 space-y-4">
          
          {/* Portfolio Health Gauge */}
          <div className="bg-white rounded-xl border border-slate-200/90 p-4 shadow-xs">
            <div className="flex items-center justify-between text-xs font-semibold text-slate-700">
              <span>Confidence / Health Level</span>
              <span className="text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded font-bold">
                {confidenceScore}%
              </span>
            </div>
            
            <input 
              type="range" 
              min="0" 
              max="100" 
              value={confidenceScore} 
              onChange={(e) => setConfidenceScore(Number(e.target.value))}
              className="w-full accent-indigo-600 mt-2 cursor-pointer"
            />

            <div className="flex justify-between text-[10px] text-slate-400 mt-1">
              <span>0</span>
              <span>50</span>
              <span>100</span>
            </div>

            <div className="mt-4 pt-4 border-t border-slate-100 space-y-2 text-xs">
              <div className="flex justify-between">
                <span className="text-slate-500">Contract Value</span>
                <span className="font-bold text-slate-900">{formatINR(fd.principal_amount)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Expected Maturity</span>
                <span className="font-semibold text-slate-700">{formatDate(fd.maturity_date)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Contract Rate</span>
                <span className="font-bold text-indigo-600">{fd.annual_rate}% p.a.</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Tenure</span>
                <span className="font-medium text-slate-700">{fd.tenure_months} Months</span>
              </div>
            </div>

            {/* Toggles */}
            <div className="mt-4 pt-3 border-t border-slate-100 space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-600 font-medium">Auto-Renew on Maturity</span>
                <input 
                  type="checkbox" 
                  defaultChecked={!!fd.auto_renew} 
                  className="rounded text-indigo-600 focus:ring-indigo-500" 
                />
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-600 font-medium">TDS Exemption 15G/15H</span>
                <input 
                  type="checkbox" 
                  defaultChecked={false} 
                  className="rounded text-indigo-600 focus:ring-indigo-500" 
                />
              </div>
            </div>

            {/* Predictive Scoring Bar */}
            <div className="mt-4 pt-3 border-t border-slate-100">
              <div className="flex justify-between text-xs font-semibold mb-1">
                <span className="text-slate-600">Predictive Scoring</span>
                <span className="text-indigo-600 font-bold">92%</span>
              </div>
              <div className="w-full bg-slate-100 rounded-full h-1.5">
                <div className="bg-indigo-600 h-1.5 rounded-full" style={{ width: '92%' }}></div>
              </div>
            </div>
          </div>

          {/* Contact Person Card */}
          <div className="bg-white rounded-xl border border-slate-200/90 p-4 shadow-xs space-y-3">
            <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
              Primary Depositor
            </div>

            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-800 font-bold flex items-center justify-center text-base border-2 border-emerald-300">
                {customer?.name ? customer.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase() : 'CU'}
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900 leading-tight">
                  {customer?.name || fd?.customer_name || 'Customer'}
                </h3>
                <p className="text-[11px] text-slate-500">
                  {customer?.customer_number || customer?.customer_code || fd?.customer_code || '—'} • India
                </p>
                <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-emerald-700 bg-emerald-50 px-1.5 py-0.2 rounded mt-1">
                  <CheckCircle2 className="w-3 h-3" /> KYC Verified
                </span>
              </div>
            </div>

            <div className="pt-2 border-t border-slate-100 space-y-2 text-xs">
              <div className="flex items-center gap-2 text-slate-600">
                <Phone className="w-3.5 h-3.5 text-slate-400" />
                <span>{customer?.phone || fd?.customer_phone || '—'}</span>
              </div>
              <div className="flex items-center gap-2 text-slate-600">
                <Mail className="w-3.5 h-3.5 text-slate-400" />
                <span className="truncate">{customer?.email || fd?.customer_email || '—'}</span>
              </div>
              <div className="flex items-center gap-2 text-slate-600">
                <CreditCard className="w-3.5 h-3.5 text-slate-400" />
                <span className="font-mono">PAN: {customer?.pan || customer?.pan_card || fd?.customer_pan || '—'}</span>
              </div>
              <div className="flex items-center gap-2 text-slate-600">
                <MapPin className="w-3.5 h-3.5 text-slate-400" />
                <span className="truncate">{customer?.address || fd?.customer_address || '—'}</span>
              </div>
            </div>
          </div>

        </div>

        {/* -------------------------------------------------------- */}
        {/* CENTER COLUMN: Tabs, Vibrant Stat Tiles & Data (6 Cols)  */}
        {/* -------------------------------------------------------- */}
        <div className="lg:col-span-6 space-y-4">
          
          {/* Tab Navigation */}
          <div className="bg-white rounded-xl border border-slate-200/90 shadow-xs px-2 py-1.5 flex items-center gap-1 overflow-x-auto">
            {['OVERVIEW', 'PROCESSING', 'INTEREST SCHEDULE', 'TRANSACTIONS', 'AUDIT LOGS'].map(tab => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-3 py-1.5 text-xs font-bold rounded-lg transition whitespace-nowrap cursor-pointer ${
                  activeTab === tab 
                    ? 'bg-indigo-600 text-white shadow-xs' 
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                }`}
              >
                {tab}
              </button>
            ))}
          </div>

          {/* 4 SOLID COLOR KPI TILES (CREATIO SIGNATURE) */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
            
            {/* Tile 1: Royal Blue */}
            <div className="bg-[#0066f5] text-white p-3.5 rounded-xl shadow-xs">
              <div className="text-[11px] font-medium opacity-90">Days active</div>
              <div className="text-2xl font-black mt-1 tracking-tight">{daysActive}</div>
              <div className="text-[10px] opacity-75 mt-0.5">Since start date</div>
            </div>

            {/* Tile 2: Deep Blue */}
            <div className="bg-[#0047ba] text-white p-3.5 rounded-xl shadow-xs">
              <div className="text-[11px] font-medium opacity-90">Days to next payout</div>
              <div className="text-2xl font-black mt-1 tracking-tight">{daysToNextPayout}</div>
              <div className="text-[10px] opacity-75 mt-0.5">{formatDate(nextPayoutDate)}</div>
            </div>

            {/* Tile 3: Vibrant Orange */}
            <div className="bg-[#f97316] text-white p-3.5 rounded-xl shadow-xs">
              <div className="text-[11px] font-medium opacity-90">Total interest</div>
              <div className="text-xl font-black mt-1 tracking-tight">
                {formatINR(fd.total_interest || (fd.maturity_amount - fd.principal_amount))}
              </div>
              <div className="text-[10px] opacity-75 mt-0.5">Yield on maturity</div>
            </div>

            {/* Tile 4: Vibrant Green */}
            <div className="bg-[#16a34a] text-white p-3.5 rounded-xl shadow-xs">
              <div className="text-[11px] font-medium opacity-90">Payouts serviced</div>
              <div className="text-2xl font-black mt-1 tracking-tight">
                {paidSchedules.length} <span className="text-xs font-normal opacity-80">of {schedules ? schedules.length : 0}</span>
              </div>
              <div className="text-[10px] opacity-75 mt-0.5">Tranches settled</div>
            </div>

          </div>

          {/* TAB 1: OVERVIEW */}
          {activeTab === 'OVERVIEW' && (
            <div className="bg-white rounded-xl border border-slate-200/90 p-5 shadow-xs space-y-6">
              
              {/* Key Form Metadata Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                <div>
                  <span className="text-slate-400 block mb-0.5">Deposit Scheme</span>
                  <span className="font-bold text-slate-800">{scheme?.name || 'Standard Cumulative'}</span>
                </div>
                <div>
                  <span className="text-slate-400 block mb-0.5">Compounding Mode</span>
                  <span className="font-bold text-slate-800">
                    {COMPOUNDING_OPTIONS.find(o => o.value === fd.compounding_frequency)?.label || fd.compounding_frequency}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 block mb-0.5">Start Date</span>
                  <span className="font-semibold text-slate-700">{formatDate(fd.start_date)}</span>
                </div>
                <div>
                  <span className="text-slate-400 block mb-0.5">Maturity Date</span>
                  <span className="font-semibold text-slate-700">{formatDate(fd.maturity_date)}</span>
                </div>
                <div>
                  <span className="text-slate-400 block mb-0.5">Nominee Name</span>
                  <span className="font-semibold text-slate-700">{fd.nominee_name || customer?.nominee_name || 'Not Designated'}</span>
                </div>
                <div>
                  <span className="text-slate-400 block mb-0.5">Nominee Relation</span>
                  <span className="font-semibold text-slate-700">{fd.nominee_relation || customer?.nominee_relation || 'Spouse'}</span>
                </div>
                <div>
                  <span className="text-slate-400 block mb-0.5">Payout Account</span>
                  <span className="font-mono text-slate-700">{customer?.bank_account_no || '50100234918234'}</span>
                </div>
                <div>
                  <span className="text-slate-400 block mb-0.5">Bank IFSC</span>
                  <span className="font-mono text-slate-700">{customer?.bank_ifsc || 'HDFC0000240'}</span>
                </div>
              </div>

              {/* Sub-Table 1: Interest Payout Tranches */}
              <div className="pt-4 border-t border-slate-100">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                      Interest Servicing Tranches ({schedules ? schedules.length : 0})
                    </span>
                    <button className="text-slate-400 hover:text-slate-600 cursor-pointer">
                      <RefreshCw className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                <div className="overflow-x-auto rounded-lg border border-slate-200">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-200">
                      <tr>
                        <th className="py-2 px-3">#</th>
                        <th className="py-2 px-3">Due Date</th>
                        <th className="py-2 px-3 text-right">Interest</th>
                        <th className="py-2 px-3 text-right">TDS (10%)</th>
                        <th className="py-2 px-3 text-right">Net Payable</th>
                        <th className="py-2 px-3 text-center">Status</th>
                        <th className="py-2 px-3 text-center">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {schedules && schedules.length > 0 ? (
                        schedules.map((s, idx) => (
                          <tr key={s.id} className="hover:bg-slate-50/80 transition">
                            <td className="py-2 px-3 text-slate-400 font-mono">{idx + 1}</td>
                            <td className="py-2 px-3 font-medium text-slate-800">{formatDate(s.due_date)}</td>
                            <td className="py-2 px-3 text-right font-semibold text-slate-700">{formatINR(s.interest_amount)}</td>
                            <td className="py-2 px-3 text-right text-slate-500">{formatINR(s.tds_amount || 0)}</td>
                            <td className="py-2 px-3 text-right font-bold text-emerald-700">
                              {formatINR(s.interest_amount - (s.tds_amount || 0))}
                            </td>
                            <td className="py-2 px-3 text-center">
                              {s.status === 'PAID' ? (
                                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                                  PAID
                                </span>
                              ) : (
                                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800">
                                  PENDING
                                </span>
                              )}
                            </td>
                            <td className="py-2 px-3 text-center">
                              {s.status === 'PENDING' && (
                                <button
                                  onClick={() => handleMarkSchedulePaid(s.id)}
                                  className="text-[11px] font-bold text-indigo-600 hover:text-indigo-800 cursor-pointer"
                                >
                                  Disburse
                                </button>
                              )}
                              {s.status === 'PAID' && (
                                <span className="text-[10px] font-mono text-slate-400">
                                  {s.payment_reference || 'NEFT'}
                                </span>
                              )}
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan="7" className="py-6 text-center text-slate-400">
                            No interest tranches scheduled (Cumulative maturity)
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

            </div>
          )}

          {/* TAB 2: TRANSACTIONS */}
          {activeTab === 'TRANSACTIONS' && (
            <div className="bg-white rounded-xl border border-slate-200/90 p-5 shadow-xs space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                  Dual-Entry Ledger Postings
                </h3>
                <span className="text-xs text-emerald-600 font-semibold bg-emerald-50 px-2 py-0.5 rounded border border-emerald-100">
                  Balanced (Δ = ₹0)
                </span>
              </div>

              <div className="overflow-x-auto rounded-lg border border-slate-200">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-200">
                    <tr>
                      <th className="py-2 px-3">Date</th>
                      <th className="py-2 px-3">Txn Ref</th>
                      <th className="py-2 px-3">Type</th>
                      <th className="py-2 px-3 text-right">Debit</th>
                      <th className="py-2 px-3 text-right">Credit</th>
                      <th className="py-2 px-3">Narration</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {transactions && transactions.length > 0 ? (
                      transactions.map(t => (
                        <tr key={t.id} className="hover:bg-slate-50">
                          <td className="py-2 px-3 text-slate-600">{formatDate(t.transaction_date)}</td>
                          <td className="py-2 px-3 font-mono font-medium text-slate-900">{t.transaction_number}</td>
                          <td className="py-2 px-3">
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-700">
                              {t.type}
                            </span>
                          </td>
                          <td className="py-2 px-3 text-right font-mono text-slate-700">{formatINR(t.total_debit)}</td>
                          <td className="py-2 px-3 text-right font-mono text-slate-700">{formatINR(t.total_credit)}</td>
                          <td className="py-2 px-3 text-slate-500 truncate max-w-xs">{t.narration}</td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan="6" className="py-6 text-center text-slate-400">
                          Initial booking transaction logged
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB 3: AUDIT LOGS */}
          {activeTab === 'AUDIT LOGS' && (
            <div className="bg-white rounded-xl border border-slate-200/90 p-5 shadow-xs space-y-3">
              <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                Immutable Audit Trail
              </h3>
              <div className="space-y-2 text-xs">
                <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 flex justify-between items-center">
                  <div>
                    <span className="font-bold text-slate-800">FD Contract Created & Approved</span>
                    <p className="text-slate-500 text-[11px]">Authorized by Checker Admin</p>
                  </div>
                  <span className="text-[11px] font-mono text-slate-400">{formatDate(fd.start_date)}</span>
                </div>
                <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 flex justify-between items-center">
                  <div>
                    <span className="font-bold text-slate-800">Double-Entry Booking Posted</span>
                    <p className="text-slate-500 text-[11px]">Ledger: Bank Debit, FD Liability Credit</p>
                  </div>
                  <span className="text-[11px] font-mono text-slate-400">{formatDate(fd.start_date)}</span>
                </div>
              </div>
            </div>
          )}

        </div>

        {/* -------------------------------------------------------- */}
        {/* RIGHT COLUMN: Next Steps & Activity Widget (3 Cols)      */}
        {/* -------------------------------------------------------- */}
        <div className="lg:col-span-3 space-y-4">
          
          <div className="bg-white rounded-xl border border-slate-200/90 p-4 shadow-xs">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-xs font-bold text-slate-800 tracking-tight">
                Next steps +
              </h3>
              <button className="text-slate-400 hover:text-slate-600 cursor-pointer">
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Next Step Activity Card */}
            <div className="mt-3 p-3.5 bg-slate-50 rounded-xl border border-slate-200 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-full bg-indigo-600 text-white flex items-center justify-center text-xs">
                    <Clock className="w-3.5 h-3.5" />
                  </div>
                  <span className="text-xs font-bold text-slate-900">
                    Quarterly Servicing
                  </span>
                </div>
                <ExternalLink className="w-3.5 h-3.5 text-slate-400" />
              </div>

              {nextStepCompleted ? (
                <div className="p-2.5 bg-emerald-50 border border-emerald-200 rounded-lg text-emerald-800 text-xs font-semibold flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" /> Activity Completed
                </div>
              ) : (
                <>
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-800">
                      Activity due
                    </span>
                    <span className="text-[11px] text-slate-500">
                      {formatDate(nextPayoutDate)}
                    </span>
                  </div>

                  <div className="text-xs text-slate-600 space-y-1 pt-1">
                    <p className="flex items-center gap-1.5">
                      <User className="w-3.5 h-3.5 text-slate-400" />
                      <span>{customer?.name}</span>
                    </p>
                    <p className="flex items-center gap-1.5">
                      <Building2 className="w-3.5 h-3.5 text-slate-400" />
                      <span>Treasury & Accounts Desk</span>
                    </p>
                  </div>

                  {/* Activity Buttons */}
                  <div className="flex items-center gap-2 pt-2 border-t border-slate-200/80">
                    <button 
                      onClick={() => alert('Activity deferred')}
                      className="flex-1 py-1.5 bg-white hover:bg-slate-100 text-slate-700 text-xs font-semibold rounded-lg border border-slate-200 transition cursor-pointer"
                    >
                      × Cancel
                    </button>
                    <button 
                      onClick={() => setNextStepCompleted(true)}
                      className="flex-1 py-1.5 bg-[#16a34a] hover:bg-emerald-700 text-white text-xs font-bold rounded-lg transition shadow-xs flex items-center justify-center gap-1 cursor-pointer"
                    >
                      <Check className="w-3.5 h-3.5" /> Complete
                    </button>
                  </div>
                </>
              )}
            </div>

            {/* Quick Actions Feed */}
            <div className="mt-4 pt-3 border-t border-slate-100 space-y-2">
              <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                Audit Timeline
              </div>
              <div className="text-xs text-slate-600 space-y-2">
                <div className="flex items-start gap-2">
                  <div className="w-2 h-2 rounded-full bg-indigo-600 mt-1 shrink-0"></div>
                  <div>
                    <span className="font-semibold text-slate-800">Certificate Printed</span>
                    <p className="text-[10px] text-slate-400">Physical receipt generated</p>
                  </div>
                </div>
                <div className="flex items-start gap-2">
                  <div className="w-2 h-2 rounded-full bg-emerald-600 mt-1 shrink-0"></div>
                  <div>
                    <span className="font-semibold text-slate-800">Maker-Checker Authorization</span>
                    <p className="text-[10px] text-slate-400">Ledger balanced and committed</p>
                  </div>
                </div>
              </div>
            </div>

          </div>

        </div>

      </div>

    </div>
  );
}
