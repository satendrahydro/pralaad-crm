import React, { useState, useEffect } from 'react';
import { 
  ShieldCheck, 
  Search, 
  RotateCw, 
  User, 
  Clock, 
  FileSpreadsheet, 
  Download, 
  AlertTriangle, 
  CheckCircle2, 
  Filter, 
  Lock,
  Layers,
  ArrowRight
} from 'lucide-react';
import { apiRequest, formatDate } from '../utils';
import { exportToExcel } from '../utils/excelExport';

export default function AuditTrailView() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterAction, setFilterAction] = useState('ALL');

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const q = search ? `?search=${encodeURIComponent(search.trim())}` : '';
      const res = await apiRequest(`/audit-logs${q}`);
      if (res && res.success) {
        setLogs(res.logs || []);
      }
    } catch (err) {
      console.error('Failed to fetch audit logs:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, [search]);

  const filteredLogs = logs.filter(log => {
    if (filterAction === 'ALL') return true;
    return log.action === filterAction;
  });

  const handleExportExcel = () => {
    if (!filteredLogs.length) return alert('No audit records to export');
    const rows = filteredLogs.map(l => ({
      'Log ID': l.id,
      'Timestamp': l.created_at,
      'Staff / Agent Name': l.full_name || l.username || 'System',
      'Role': l.role || 'Staff',
      'Agent Code': l.agent_code || '—',
      'Action Taken': l.action,
      'Target Entity': `${l.entity_type || ''} #${l.entity_id || ''}`,
      'Audit Details': l.details,
      'IP Address': l.ip_address || '127.0.0.1'
    }));
    exportToExcel(rows, 'AntiFraud_Audit_Trail_Report', 'Audit Trail');
  };

  const handleExportCSV = () => {
    if (!filteredLogs.length) return alert('No audit records to export');
    const headers = ['Log ID', 'Timestamp', 'Staff Name', 'Role', 'Agent Code', 'Action', 'Target Entity', 'Details', 'IP Address'];
    const rows = filteredLogs.map(l => [
      l.id,
      `"${l.created_at || ''}"`,
      `"${l.full_name || l.username || ''}"`,
      `"${l.role || ''}"`,
      `"${l.agent_code || ''}"`,
      `"${l.action || ''}"`,
      `"${l.entity_type || ''} ${l.entity_id || ''}"`,
      `"${(l.details || '').replace(/"/g, '""')}"`,
      `"${l.ip_address || ''}"`
    ]);
    const csvContent = 'data:text/csv;charset=utf-8,\uFEFF' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const link = document.createElement('a');
    link.href = encodeURI(csvContent);
    link.download = `AntiFraud_Audit_Trail_${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const actionsList = ['ALL', ...Array.from(new Set(logs.map(l => l.action).filter(Boolean)))];

  return (
    <div className="space-y-5 animate-fadeIn">
      {/* 1. Header Banner */}
      <div className="bg-white rounded-2xl p-5 border border-slate-200/90 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-rose-50 text-rose-700 border border-rose-200 flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5" />
              एंटी-फ्रॉड / धांधली-रोधी लॉग्स
            </span>
            <span className="text-xs text-slate-400 font-semibold">{filteredLogs.length} Records</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight mt-1">
            Agent & Staff Action Audit Trail (कार्य लॉग्स)
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            हर कर्मचारी व एजेंट द्वारा की गई हर एंट्री, बदलाव, विथड्रॉल व अप्रूवल का अपरिवर्तनीय डिजिटल प्रमाण
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* Dual Export: Excel (.xlsx) & CSV */}
          <div className="flex items-center rounded-xl border border-slate-200 bg-slate-100 p-0.5 shadow-2xs">
            <button
              onClick={handleExportExcel}
              className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg text-xs flex items-center gap-1.5 transition cursor-pointer shadow-xs active:scale-95"
              title="Export Audit Trail to Microsoft Excel (.xlsx)"
            >
              <FileSpreadsheet className="w-3.5 h-3.5 text-white" />
              <span>Excel (.xlsx)</span>
            </button>
            <button
              onClick={handleExportCSV}
              className="px-2.5 py-1.5 hover:bg-slate-200 text-slate-700 font-bold rounded-lg text-xs flex items-center gap-1 transition cursor-pointer"
              title="Export to CSV"
            >
              <Download className="w-3.5 h-3.5 text-slate-500" />
              <span>CSV</span>
            </button>
          </div>

          <button
            onClick={fetchLogs}
            className="p-2 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-xl border border-slate-200 transition cursor-pointer"
            title="Refresh Logs"
          >
            <RotateCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* 2. Filters & Search Box */}
      <div className="bg-white rounded-2xl border border-slate-200/90 p-3.5 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3 pointer-events-none" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by Agent name, ID, Account No or Action..."
            className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-rose-500/30 focus:border-rose-500 transition"
          />
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs font-bold text-slate-500">Action Filter:</span>
          <select
            value={filterAction}
            onChange={(e) => setFilterAction(e.target.value)}
            className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-rose-500/30"
          >
            {actionsList.map(act => (
              <option key={act} value={act}>{act}</option>
            ))}
          </select>
        </div>
      </div>

      {/* 3. Audit Log Entries Table */}
      <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs overflow-hidden">
        {loading ? (
          <div className="py-20 text-center">
            <div className="inline-block w-8 h-8 border-4 border-rose-600 border-t-transparent rounded-full animate-spin"></div>
            <p className="text-xs text-slate-400 mt-2 font-medium">Loading Tamper-Proof Audit Trail...</p>
          </div>
        ) : filteredLogs.length === 0 ? (
          <div className="py-16 text-center text-slate-400">
            <ShieldCheck className="w-12 h-12 mx-auto text-slate-300 mb-2" />
            <p className="text-sm font-bold text-slate-700">No Audit Records Found</p>
            <p className="text-xs text-slate-400 mt-1">Actions performed by staff and agents will automatically record here.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold uppercase tracking-wider text-[11px]">
                <tr>
                  <th className="py-3 px-4">Timestamp & IP</th>
                  <th className="py-3 px-4">Staff / Agent (कर्ता)</th>
                  <th className="py-3 px-4">Action Type</th>
                  <th className="py-3 px-4">Target Entity</th>
                  <th className="py-3 px-4">Full Description (विस्तृत विवरण)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredLogs.map((log) => {
                  const isApproval = log.action?.includes('APPROV');
                  const isProposal = log.action?.includes('PROPOSAL') || log.action?.includes('SUBMIT');
                  const isWithdrawal = log.action?.includes('WITHDRAWAL');

                  return (
                    <tr key={log.id} className="hover:bg-slate-50/80 transition">
                      <td className="py-3 px-4 whitespace-nowrap">
                        <div className="font-mono text-slate-800 font-bold text-xs">{formatDate(log.created_at)}</div>
                        <div className="text-[10px] text-slate-400 font-mono flex items-center gap-1 mt-0.5">
                          <Clock className="w-3 h-3" />
                          <span>{log.created_at ? new Date(log.created_at).toLocaleTimeString('en-IN') : '—'}</span>
                          <span className="text-slate-300">•</span>
                          <span>IP: {log.ip_address || '127.0.0.1'}</span>
                        </div>
                      </td>

                      <td className="py-3 px-4">
                        <div className="font-bold text-slate-900 flex items-center gap-1.5">
                          <User className="w-3.5 h-3.5 text-slate-400" />
                          <span>{log.full_name || log.username || 'System User'}</span>
                        </div>
                        <div className="text-[10px] text-slate-500 mt-0.5">
                          <span className="capitalize font-semibold text-amber-700">{log.role || 'Staff'}</span>
                          {log.agent_code && <span className="ml-1 text-slate-400">({log.agent_code})</span>}
                        </div>
                      </td>

                      <td className="py-3 px-4 whitespace-nowrap">
                        <span className={`inline-flex items-center gap-1 text-[10px] font-black px-2 py-0.5 rounded-full ${
                          isApproval ? 'bg-emerald-100 text-emerald-800 border border-emerald-200' :
                          isProposal ? 'bg-blue-100 text-blue-800 border border-blue-200' :
                          isWithdrawal ? 'bg-rose-100 text-rose-800 border border-rose-200' :
                          'bg-slate-100 text-slate-800 border border-slate-200'
                        }`}>
                          {log.action}
                        </span>
                      </td>

                      <td className="py-3 px-4 whitespace-nowrap">
                        <span className="font-mono font-bold text-slate-800 text-xs bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                          {log.entity_id || log.entity_type || 'General'}
                        </span>
                      </td>

                      <td className="py-3 px-4 text-slate-700 leading-relaxed max-w-md">
                        {log.details || '—'}
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
