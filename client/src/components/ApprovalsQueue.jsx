import React, { useState, useEffect } from 'react';
import { 
  ShieldCheck, 
  CheckCircle2, 
  XCircle, 
  Clock, 
  AlertCircle, 
  Eye, 
  RefreshCw, 
  Search, 
  Filter, 
  FileCheck2, 
  ArrowRight,
  User,
  Building2,
  Calendar
} from 'lucide-react';
import { formatINR, formatDate, apiRequest } from '../utils';

export default function ApprovalsQueue({ onApproved }) {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState('PENDING_APPROVAL');
  const [selectedReq, setSelectedReq] = useState(null);
  const [rejectionModalOpen, setRejectionModalOpen] = useState(false);
  const [rejectionReason, setRejectionReason] = useState('');
  const [processingId, setProcessingId] = useState(null);

  const fetchRequests = async () => {
    try {
      setLoading(true);
      const res = await apiRequest('/approvals');
      if (res.success) {
        setRequests(res.data || []);
      }
    } catch (err) {
      console.error('Failed to fetch approvals:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRequests();
  }, []);

  const handleApprove = async (id) => {
    if (!window.confirm('Are you sure you want to AUTHORIZE and EXECUTE this financial transaction into the live database?')) {
      return;
    }

    try {
      setProcessingId(id);
      const res = await apiRequest(`/approvals/${id}/approve`, {
        method: 'POST',
        body: JSON.stringify({ decision_remarks: 'Authorized and approved by Administrator (Checker)' })
      });

      if (res.success) {
        alert(res.message);
        fetchRequests();
        if (onApproved) onApproved();
      } else {
        alert('Approval failed: ' + res.message);
      }
    } catch (err) {
      alert('Network error approving request: ' + err.message);
    } finally {
      setProcessingId(null);
    }
  };

  const handleOpenReject = (req) => {
    setSelectedReq(req);
    setRejectionReason('');
    setRejectionModalOpen(true);
  };

  const handleConfirmReject = async () => {
    if (!rejectionReason.trim()) {
      alert('Please provide a reason for returning/rejecting this submission.');
      return;
    }

    try {
      setProcessingId(selectedReq.id);
      const res = await apiRequest(`/approvals/${selectedReq.id}/reject`, {
        method: 'POST',
        body: JSON.stringify({ reason: rejectionReason })
      });

      if (res.success) {
        alert('Submission has been rejected with feedback to the maker.');
        setRejectionModalOpen(false);
        fetchRequests();
      } else {
        alert('Rejection failed: ' + res.message);
      }
    } catch (err) {
      alert('Network error: ' + err.message);
    } finally {
      setProcessingId(null);
    }
  };

  const pendingList = requests.filter(r => r.status === 'PENDING_APPROVAL');
  const filtered = requests.filter(r => {
    if (filterStatus === 'ALL') return true;
    return r.status === filterStatus;
  });

  return (
    <div className="space-y-6 pb-12 animate-fadeIn">
      {/* Header */}
      <div className="bg-white rounded-xl border border-slate-200/90 shadow-xs p-5 md:p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl md:text-2xl font-bold tracking-tight text-slate-900">
              Maker-Checker Authorization Queue
            </h1>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200 flex items-center gap-1">
              <ShieldCheck className="w-3.5 h-3.5 text-indigo-600" />
              Checker Authority
            </span>
          </div>
          <p className="text-xs md:text-sm text-slate-500 mt-1">
            Review proposed deposit entries, interest payouts, and settlements submitted by branch employees
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={fetchRequests}
            className="p-2 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg border border-slate-200 transition"
            title="Refresh Queue"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="bg-white rounded-xl border border-slate-200/90 shadow-xs overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex items-center justify-between gap-4 flex-wrap bg-slate-50/50">
          <div className="flex items-center gap-1.5 flex-wrap">
            {['PENDING_APPROVAL', 'ALL', 'APPROVED', 'REJECTED'].map(st => (
              <button
                key={st}
                onClick={() => setFilterStatus(st)}
                className={`text-xs px-3 py-1.5 rounded-lg font-semibold transition cursor-pointer flex items-center gap-1.5 ${
                  filterStatus === st 
                    ? 'bg-indigo-600 text-white shadow-xs' 
                    : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
                }`}
              >
                <span>{st.replace('_', ' ')}</span>
                {st === 'PENDING_APPROVAL' && pendingList.length > 0 && (
                  <span className="bg-rose-500 text-white text-[10px] font-bold px-1.5 py-0.2 rounded-full">
                    {pendingList.length}
                  </span>
                )}
              </button>
            ))}
          </div>

          <div className="text-xs text-slate-500">
            Total Submissions: <strong className="text-slate-800">{requests.length}</strong>
          </div>
        </div>

        {/* Queue Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-100 text-slate-500 uppercase tracking-wider font-semibold bg-slate-50/30">
                <th className="p-4">Request No</th>
                <th className="p-4">Type</th>
                <th className="p-4">Submitted By (Maker)</th>
                <th className="p-4">Customer</th>
                <th className="p-4">Proposed Amount</th>
                <th className="p-4">Date</th>
                <th className="p-4">Status</th>
                <th className="p-4 text-right">Decision Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan="8" className="p-8 text-center text-slate-400">
                    No submissions currently found in status '{filterStatus.replace('_', ' ')}'.
                  </td>
                </tr>
              ) : (
                filtered.map(r => (
                  <tr key={r.id} className="hover:bg-slate-50 transition">
                    <td className="p-4 font-mono font-bold text-slate-900">{r.request_number}</td>
                    <td className="p-4">
                      {r.request_type === 'PROFILE_CORRECTION' ? (
                        <span className="font-bold px-2.5 py-1 rounded-full bg-purple-100 text-purple-900 border border-purple-200 text-[10px] uppercase tracking-wide">
                          ✏️ Profile Correction
                        </span>
                      ) : (
                        <span className="font-semibold px-2 py-0.5 rounded bg-slate-100 text-slate-800 text-[11px]">
                          {r.request_type.replace('_', ' ')}
                        </span>
                      )}
                    </td>
                    <td className="p-4">
                      <div className="font-bold text-slate-800">
                        {r.request_type === 'PROFILE_CORRECTION' ? (
                          <span className="text-emerald-700 font-bold">Client Mobile App</span>
                        ) : (
                          r.maker_name || r.maker_username || 'Staff Maker'
                        )}
                      </div>
                      <div className="text-[10px] text-slate-400">
                        {r.request_type === 'PROFILE_CORRECTION' ? 'Customer Self-Service' : 'Branch Staff'}
                      </div>
                    </td>
                    <td className="p-4">
                      <div className="font-bold text-slate-800">
                        {r.customer_name || r.request_data?.customer_name || 'N/A'}
                      </div>
                      <div className="text-[10px] text-slate-500 font-mono">
                        {r.request_data?.customer_code || r.customer_phone || ''}
                      </div>
                    </td>
                    <td className="p-4">
                      {r.request_type === 'PROFILE_CORRECTION' ? (
                        <div className="space-y-1">
                          <div className="text-[11px] font-bold text-slate-800 flex items-center gap-1">
                            <span className="text-purple-700 font-black">Field:</span> {r.request_data?.field_label || r.request_data?.field}
                          </div>
                          <div className="flex items-center gap-1.5 text-[11px] flex-wrap">
                            <span className="px-1.5 py-0.5 rounded bg-rose-50 text-rose-700 border border-rose-200 line-through">
                              {r.request_data?.old_value || '(empty)'}
                            </span>
                            <span className="text-slate-400 font-bold text-xs">➔</span>
                            <span className="px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-800 border border-emerald-200 font-bold">
                              {r.request_data?.new_value}
                            </span>
                          </div>
                          {r.request_data?.reason && (
                            <div className="text-[10px] text-slate-500 italic max-w-xs truncate" title={r.request_data.reason}>
                              कारण: {r.request_data.reason}
                            </div>
                          )}
                        </div>
                      ) : (
                        <span className="font-bold text-indigo-600">
                          {r.proposed_amount ? formatINR(r.proposed_amount) : '—'}
                        </span>
                      )}
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
                    <td className="p-4 text-right">
                      {r.status === 'PENDING_APPROVAL' ? (
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => handleApprove(r.id)}
                            disabled={processingId === r.id}
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-emerald-50 hover:bg-emerald-600 hover:text-white text-emerald-700 font-bold transition cursor-pointer"
                            title="Authorize & Execute"
                          >
                            <CheckCircle2 className="w-3.5 h-3.5" /> Approve
                          </button>
                          <button
                            onClick={() => handleOpenReject(r)}
                            disabled={processingId === r.id}
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-rose-50 hover:bg-rose-600 hover:text-white text-rose-700 font-bold transition cursor-pointer"
                            title="Return with Feedback"
                          >
                            <XCircle className="w-3.5 h-3.5" /> Reject
                          </button>
                        </div>
                      ) : (
                        <span className="text-slate-400 text-[11px] italic">
                          Decided by {r.checker_name || 'Admin'}
                        </span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Rejection Modal */}
      {rejectionModalOpen && selectedReq && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6 text-xs animate-fadeIn">
            <h3 className="text-base font-bold text-slate-900 mb-1">
              Return / Reject Submission ({selectedReq.request_number})
            </h3>
            <p className="text-xs text-slate-500 mb-4">
              Provide specific reason or correction needed for the maker ({selectedReq.maker_name}).
            </p>

            <textarea
              rows={4}
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
              placeholder="e.g. Rate does not match scheme policy, customer PAN unverified, etc..."
              className="w-full p-3 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:border-rose-500 text-xs"
            />

            <div className="mt-5 flex items-center justify-end gap-2.5">
              <button
                onClick={() => setRejectionModalOpen(false)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-lg transition"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmReject}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-lg transition shadow-xs"
              >
                Confirm Rejection
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
