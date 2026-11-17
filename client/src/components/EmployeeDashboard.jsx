import React, { useState, useEffect } from 'react';
import { 
  Users, 
  PlusCircle, 
  Clock, 
  CheckCircle2, 
  XCircle, 
  AlertCircle, 
  Calculator, 
  FileCheck2, 
  CreditCard, 
  Search, 
  RefreshCw, 
  ArrowRight,
  Eye,
  FileText,
  Building2,
  Calendar
} from 'lucide-react';
import { formatINR, formatDate, apiRequest } from '../utils';

export default function EmployeeDashboard({ 
  user,
  permissions = {},
  onNavigate,
  onOpenNewFD,
  onOpenCustomerModal
}) {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState('ALL');
  const [selectedReq, setSelectedReq] = useState(null);

  const fetchMyRequests = async () => {
    try {
      setLoading(true);
      const res = await apiRequest('/approvals');
      if (res.success) {
        setRequests(res.data || []);
      }
    } catch (err) {
      console.error('Failed to fetch employee requests:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMyRequests();
  }, []);

  const pendingCount = requests.filter(r => r.status === 'PENDING_APPROVAL').length;
  const approvedCount = requests.filter(r => r.status === 'APPROVED').length;
  const rejectedCount = requests.filter(r => r.status === 'REJECTED').length;

  const filtered = requests.filter(r => {
    if (filterStatus === 'ALL') return true;
    return r.status === filterStatus;
  });

  return (
    <div className="space-y-6 pb-12 animate-fadeIn">
      {/* Policy Restriction Banner */}
      {permissions && Object.keys(permissions).length > 0 && Object.values(permissions).some(v => v === false) && (
        <div id="staff-restricted-notice-banner" className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-start gap-3 shadow-xs">
          <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
          <div className="text-xs md:text-sm text-amber-800">
            <span className="font-bold">Staff Access Notice:</span> Super Admin has customized your function permissions. Certain operations are currently restricted. Contact your Super Administrator if you require elevated privileges.
          </div>
        </div>
      )}

      {/* 1. Header Banner */}
      <div className="bg-[#082e20] rounded-2xl border border-[#1a5d43] shadow-md p-5 md:p-6 text-white flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-xl md:text-2xl font-bold tracking-tight text-white">
              Maker Operations Desk
            </h1>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-500/20 text-[#FBBF24] border border-[#D4AF37]/40">
              Data Entry & Verification
            </span>
          </div>
          <p className="text-xs md:text-sm text-emerald-200 mt-1">
            Logged in as <strong className="text-[#FBBF24]">{user?.full_name || 'Staff Maker'}</strong> • Dual-Control Maker-Checker Architecture
          </p>
        </div>

        {/* Maker Action Buttons */}
        <div className="flex items-center gap-2.5 flex-wrap">
          <button
            onClick={() => onNavigate && onNavigate('calculator')}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs md:text-sm font-semibold rounded-lg bg-[#062319] text-emerald-200 hover:bg-[#0a3d2b] transition border border-[#1a5d43] cursor-pointer"
          >
            <Calculator className="w-4 h-4 text-[#D4AF37]" />
            FD Calculator
          </button>

          <button
            id="employee-btn-customer-kyc"
            onClick={() => onNavigate && onNavigate('customers')}
            disabled={permissions.cust_registration === false}
            title={permissions.cust_registration === false ? 'Customer Registration disabled by Super Admin' : '+ Customer KYC'}
            className={`inline-flex items-center gap-1.5 px-3.5 py-2 text-xs md:text-sm font-semibold rounded-lg border transition ${
              permissions.cust_registration === false
                ? 'bg-slate-800/40 text-slate-500 border-slate-800 cursor-not-allowed opacity-60'
                : 'bg-[#062319] text-emerald-200 hover:bg-[#0a3d2b] border-[#1a5d43] cursor-pointer'
            }`}
          >
            <Users className="w-4 h-4 text-[#D4AF37]" />
            + Customer KYC
          </button>

          <button
            id="employee-btn-new-fd"
            onClick={onOpenNewFD}
            disabled={permissions.fd_creation === false}
            title={permissions.fd_creation === false ? 'FD Creation disabled by Super Admin' : 'Submit New FD Entry'}
            className={`inline-flex items-center gap-2 px-4 py-2 text-xs md:text-sm font-bold rounded-lg shadow-sm transition ${
              permissions.fd_creation === false
                ? 'bg-slate-800 text-slate-500 border border-slate-700 cursor-not-allowed opacity-60'
                : 'bg-[#D4AF37] text-[#062319] hover:bg-[#C59B27] cursor-pointer'
            }`}
          >
            <PlusCircle className="w-4 h-4" />
            Submit New FD Entry
          </button>
        </div>
      </div>

      {/* 2. Maker KPI Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        
        {/* Card 1: Pending My Approvals */}
        <div className="bg-white rounded-xl border border-slate-200/90 p-5 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Awaiting Checker</span>
            <div className="w-10 h-10 rounded-lg bg-amber-50 border border-amber-100 flex items-center justify-center text-amber-600">
              <Clock className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-bold tracking-tight text-slate-900">{pendingCount}</div>
            <div className="text-xs text-amber-700 bg-amber-50 px-2 py-0.5 rounded inline-block mt-2 font-medium">
              Under Admin Review
            </div>
          </div>
        </div>

        {/* Card 2: Approved Entries */}
        <div className="bg-white rounded-xl border border-slate-200/90 p-5 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Approved & Executed</span>
            <div className="w-10 h-10 rounded-lg bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-600">
              <CheckCircle2 className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-bold tracking-tight text-slate-900">{approvedCount}</div>
            <div className="text-xs text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded inline-block mt-2 font-medium">
              Live in Database
            </div>
          </div>
        </div>

        {/* Card 3: Rejected Entries */}
        <div className="bg-white rounded-xl border border-slate-200/90 p-5 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Returned / Rejected</span>
            <div className="w-10 h-10 rounded-lg bg-rose-50 border border-rose-100 flex items-center justify-center text-rose-600">
              <XCircle className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-bold tracking-tight text-slate-900">{rejectedCount}</div>
            <div className="text-xs text-rose-700 bg-rose-50 px-2 py-0.5 rounded inline-block mt-2 font-medium">
              Requires Correction
            </div>
          </div>
        </div>

        {/* Card 4: Total Submissions */}
        <div className="bg-white rounded-xl border border-slate-200/90 p-5 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Total Submissions</span>
            <div className="w-10 h-10 rounded-lg bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600">
              <FileCheck2 className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-bold tracking-tight text-slate-900">{requests.length}</div>
            <div className="text-xs text-slate-500 mt-2">
              Lifetime Maker audit trail
            </div>
          </div>
        </div>

      </div>

      {/* 3. Submissions Pipeline Table */}
      <div className="bg-white rounded-xl border border-slate-200/90 shadow-xs overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex items-center justify-between gap-4 flex-wrap bg-slate-50/50">
          <div className="flex items-center gap-1.5 flex-wrap">
            {['ALL', 'PENDING_APPROVAL', 'APPROVED', 'REJECTED'].map(st => (
              <button
                key={st}
                onClick={() => setFilterStatus(st)}
                className={`text-xs px-3 py-1.5 rounded-lg font-semibold transition cursor-pointer ${
                  filterStatus === st 
                    ? 'bg-indigo-600 text-white shadow-xs' 
                    : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
                }`}
              >
                {st.replace('_', ' ')}
              </button>
            ))}
          </div>

          <button
            onClick={fetchMyRequests}
            className="p-1.5 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg border border-slate-200 transition"
            title="Refresh submissions"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-100 text-slate-500 uppercase tracking-wider font-semibold bg-slate-50/30">
                <th className="p-4">Request No</th>
                <th className="p-4">Type</th>
                <th className="p-4">Customer</th>
                <th className="p-4">Proposed Amount</th>
                <th className="p-4">Submitted On</th>
                <th className="p-4">Status</th>
                <th className="p-4">Checker Remarks</th>
                <th className="p-4 text-right">View</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan="8" className="p-8 text-center text-slate-400">
                    No submissions found matching filter '{filterStatus}'.
                  </td>
                </tr>
              ) : (
                filtered.map(r => (
                  <tr key={r.id} className="hover:bg-slate-50 transition">
                    <td className="p-4 font-mono font-bold text-slate-900">{r.request_number}</td>
                    <td className="p-4">
                      <span className="font-semibold px-2 py-0.5 rounded bg-slate-100 text-slate-800 text-[11px]">
                        {r.request_type.replace('_', ' ')}
                      </span>
                    </td>
                    <td className="p-4">
                      <div className="font-bold text-slate-800">{r.customer_name || 'N/A'}</div>
                      <div className="text-[10px] text-slate-400">{r.customer_phone || ''}</div>
                    </td>
                    <td className="p-4 font-bold text-indigo-600">
                      {r.proposed_amount ? formatINR(r.proposed_amount) : '—'}
                    </td>
                    <td className="p-4 text-slate-500">{formatDate(r.created_at)}</td>
                    <td className="p-4">
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded border inline-flex items-center gap-1 ${
                        r.status === 'APPROVED' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                        r.status === 'REJECTED' ? 'bg-rose-50 text-rose-700 border-rose-200' :
                        'bg-amber-50 text-amber-700 border-amber-200'
                      }`}>
                        {r.status === 'APPROVED' && <CheckCircle2 className="w-3 h-3 text-emerald-600" />}
                        {r.status === 'REJECTED' && <XCircle className="w-3 h-3 text-rose-600" />}
                        {r.status === 'PENDING_APPROVAL' && <Clock className="w-3 h-3 text-amber-600" />}
                        {r.status.replace('_', ' ')}
                      </span>
                    </td>
                    <td className="p-4 text-slate-500 max-w-xs truncate" title={r.decision_remarks}>
                      {r.decision_remarks || '—'}
                    </td>
                    <td className="p-4 text-right">
                      <button
                        onClick={() => setSelectedReq(r)}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 transition cursor-pointer"
                        title="View Submission Details"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Submission Detail Modal */}
      {selectedReq && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-lg w-full p-6 text-xs animate-fadeIn">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div>
                <span className="font-mono font-bold text-indigo-600">{selectedReq.request_number}</span>
                <h3 className="text-sm font-bold text-slate-900 mt-0.5">
                  Submission Details ({selectedReq.request_type.replace('_', ' ')})
                </h3>
              </div>
              <button
                onClick={() => setSelectedReq(null)}
                className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg"
              >
                ✕
              </button>
            </div>

            <div className="my-4 space-y-2.5">
              <div className="flex justify-between py-1 border-b border-slate-100">
                <span className="text-slate-400">Customer:</span>
                <span className="font-bold text-slate-800">{selectedReq.customer_name || 'N/A'}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-100">
                <span className="text-slate-400">Proposed Amount:</span>
                <span className="font-bold text-indigo-600">{formatINR(selectedReq.proposed_amount)}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-100">
                <span className="text-slate-400">Submission Status:</span>
                <span className="font-bold">{selectedReq.status}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-100">
                <span className="text-slate-400">Checker Remarks:</span>
                <span className="font-medium text-slate-700">{selectedReq.decision_remarks || 'Pending verification'}</span>
              </div>

              {/* JSON Payload preview */}
              <div className="mt-3">
                <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                  Submitted Parameters
                </div>
                <pre className="p-3 bg-slate-50 rounded-lg border border-slate-200 text-[11px] font-mono overflow-x-auto max-h-40">
                  {JSON.stringify(selectedReq.request_data, null, 2)}
                </pre>
              </div>
            </div>

            <div className="pt-3 border-t border-slate-100 text-right">
              <button
                onClick={() => setSelectedReq(null)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-lg transition"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
