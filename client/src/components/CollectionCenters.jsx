import React, { useState, useEffect } from 'react';
import { 
  Building, 
  Search, 
  RotateCw, 
  Plus, 
  MapPin, 
  Users, 
  Calendar, 
  Clock, 
  TrendingUp, 
  DollarSign, 
  X,
  ShieldCheck,
  CheckCircle2,
  Briefcase
} from 'lucide-react';
import { formatINR, apiRequest, getApiBase, onNumericInputChange } from '../utils';

export default function CollectionCenters() {
  const [centers, setCenters] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [totalCollected, setTotalCollected] = useState(0);
  const [totalMembers, setTotalMembers] = useState(0);

  // Modal
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [branches, setBranches] = useState([]);
  const [advisors, setAdvisors] = useState([]);
  const [formName, setFormName] = useState('');
  const [formBranchId, setFormBranchId] = useState('1');
  const [formAdvisorId, setFormAdvisorId] = useState('');
  const [formDay, setFormDay] = useState('DAILY');
  const [formTime, setFormTime] = useState('10:00 AM');
  const [formMembers, setFormMembers] = useState(25);

  const fetchCenters = async () => {
    try {
      setLoading(true);
      let q = '/collection-centers';
      if (search) q += `?search=${encodeURIComponent(search)}`;
      const res = await apiRequest(q);
      if (res.success && res.centers) {
        setCenters(res.centers);
        setTotalCollected(res.total_collected || 0);
        setTotalMembers(res.total_members || 0);
      }
    } catch (e) {
      console.error('Error fetching collection centers:', e);
    } finally {
      setLoading(false);
    }
  };

  const fetchMeta = async () => {
    try {
      const [brRes, advRes] = await Promise.all([
        fetch(`${getApiBase()}/branches`).then(r => r.json()),
        apiRequest('/agents/all-agents')
      ]);
      if (brRes.success) setBranches(brRes.branches || []);
      if (advRes.success) setAdvisors(advRes.agents || []);
    } catch (e) {}
  };

  useEffect(() => {
    fetchMeta();
  }, []);

  useEffect(() => {
    fetchCenters();
  }, [search]);

  const handleCreateCenter = async (e) => {
    e.preventDefault();
    try {
      const res = await apiRequest('/collection-centers', {
        method: 'POST',
        body: JSON.stringify({
          center_name: formName,
          branch_id: Number(formBranchId),
          advisor_id: formAdvisorId ? Number(formAdvisorId) : null,
          collection_day: formDay,
          meeting_time: formTime,
          total_members: Number(formMembers)
        })
      });

      if (res.success) {
        alert(res.message);
        setAddModalOpen(false);
        fetchCenters();
      }
    } catch (err) {
      alert('Error creating center: ' + err.message);
    }
  };

  return (
    <div className="space-y-6 animate-fadeIn pb-16">
      
      {/* 1. Header */}
      <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-emerald-50 rounded-lg border border-emerald-200 text-emerald-700">
              <Building className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
                Collection Centers & Groups
                <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                  {centers.length} Centers
                </span>
              </h1>
              <p className="text-xs text-slate-500 mt-0.5">
                Village / Mohalla collection points, field groups, and advisor meeting clusters
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={fetchCenters}
            className="p-2 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg border border-slate-200 transition cursor-pointer"
            title="Refresh"
          >
            <RotateCw className="w-4 h-4" />
          </button>

          <button
            onClick={() => {
              setFormName('');
              setFormMembers(25);
              setAddModalOpen(true);
            }}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-bold shadow-xs transition cursor-pointer"
          >
            <Plus className="w-4 h-4" /> Add Collection Center
          </button>
        </div>
      </div>

      {/* 2. Metrics Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
        <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs">
          <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Active Centers</div>
          <div className="text-2xl font-black text-slate-900 mt-1">{centers.length}</div>
          <div className="text-[11px] text-emerald-600 font-medium mt-0.5">Bijnor Rural & Urban Clusters</div>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs">
          <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Enrolled Members</div>
          <div className="text-2xl font-black text-blue-700 mt-1">{totalMembers}</div>
          <div className="text-[11px] text-slate-500 font-medium mt-0.5">Active Group Depositors</div>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs">
          <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Total Mobilized</div>
          <div className="text-2xl font-black text-emerald-700 mt-1">{formatINR(totalCollected)}</div>
          <div className="text-[11px] text-slate-500 font-medium mt-0.5">Cumulative Group Savings/FDs</div>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs">
          <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Collection Frequency</div>
          <div className="text-base font-bold text-slate-900 mt-2">Daily & Weekly</div>
          <div className="text-[11px] text-slate-400 font-medium">On-the-spot field receipt</div>
        </div>
      </div>

      {/* 3. Search */}
      <div className="bg-white rounded-xl border border-slate-200 p-3 shadow-xs">
        <div className="relative max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5 pointer-events-none" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by center name, code, or advisor..."
            className="w-full text-xs pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:border-slate-800 transition"
          />
        </div>
      </div>

      {/* 4. Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#f59e0b] text-white font-bold tracking-wider uppercase text-[11px]">
              <tr>
                <th className="py-3 px-4">Center Code</th>
                <th className="py-3 px-4">Center / Group Name</th>
                <th className="py-3 px-4">Operating Branch</th>
                <th className="py-3 px-4">Assigned Field Advisor</th>
                <th className="py-3 px-4 text-center">Collection Day</th>
                <th className="py-3 px-4 text-center">Meeting Time</th>
                <th className="py-3 px-4 text-center">Members</th>
                <th className="py-3 px-4 text-right">Total Mobilized</th>
                <th className="py-3 px-4 text-center">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan="9" className="py-12 text-center text-slate-400">Loading collection centers...</td>
                </tr>
              ) : centers.length === 0 ? (
                <tr>
                  <td colSpan="9" className="py-12 text-center text-slate-400">No collection centers found.</td>
                </tr>
              ) : (
                centers.map((c) => (
                  <tr key={c.id} className="hover:bg-amber-50/20 transition">
                    <td className="py-3 px-4 font-mono font-bold text-slate-900">{c.center_code}</td>
                    <td className="py-3 px-4">
                      <div className="font-bold text-slate-800 text-sm flex items-center gap-1.5">
                        <MapPin className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                        {c.center_name}
                      </div>
                    </td>
                    <td className="py-3 px-4 font-medium text-slate-700">{c.branch_name}</td>
                    <td className="py-3 px-4">
                      <div className="font-semibold text-slate-800">{c.advisor_name || 'Unassigned'}</div>
                      {c.agent_code && <div className="text-[11px] text-slate-400 font-mono">{c.agent_code}</div>}
                    </td>
                    <td className="py-3 px-4 text-center">
                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-200">
                        {c.collection_day}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-center font-mono text-slate-600">
                      {c.meeting_time}
                    </td>
                    <td className="py-3 px-4 text-center">
                      <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-slate-100 text-slate-700">
                        {c.total_members}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right font-black text-emerald-700 text-sm">
                      {formatINR(c.total_collected)}
                    </td>
                    <td className="py-3 px-4 text-center">
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                        {c.status}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* 5. Add Center Modal */}
      {addModalOpen && (
        <div className="fixed inset-0 z-[200] bg-slate-950/80 backdrop-blur-xs flex justify-center items-start pt-16 pb-10 p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-md w-full p-6 animate-fadeIn relative">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-base font-bold text-slate-900">Add Collection Center</h3>
              <button
                onClick={() => setAddModalOpen(false)}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateCenter} className="mt-4 space-y-4 text-xs">
              <div>
                <label className="font-semibold text-slate-700 block mb-1">Center / Group Name *</label>
                <input
                  type="text"
                  required
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  placeholder="e.g. Kotwali Mohalla Group, Mandawar Center"
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:border-slate-800"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Operating Branch</label>
                  <select
                    value={formBranchId}
                    onChange={(e) => setFormBranchId(e.target.value)}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none font-semibold"
                  >
                    {branches.map(b => (
                      <option key={b.id} value={b.id}>{b.branch_name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Assigned Field Advisor</label>
                  <select
                    value={formAdvisorId}
                    onChange={(e) => setFormAdvisorId(e.target.value)}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none font-semibold"
                  >
                    <option value="">Select Advisor</option>
                    {advisors.map(a => (
                      <option key={a.id} value={a.id}>{a.full_name} ({a.agent_code})</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Collection Frequency</label>
                  <select
                    value={formDay}
                    onChange={(e) => setFormDay(e.target.value)}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none"
                  >
                    <option value="DAILY">Daily Collection</option>
                    <option value="WEEKLY">Weekly</option>
                    <option value="MONTHLY">Monthly</option>
                  </select>
                </div>

                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Collection Time</label>
                  <input
                    type="text"
                    value={formTime}
                    onChange={(e) => setFormTime(e.target.value)}
                    placeholder="e.g. 10:00 AM"
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">Estimated Member Count</label>
                <input
                  type="number"
                  min="1"
                  value={formMembers}
                  onChange={(e) => onNumericInputChange(e, setFormMembers)}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none font-mono"
                />
              </div>

              <div className="flex items-center gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setAddModalOpen(false)}
                  className="flex-1 py-2.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-white font-bold shadow-xs cursor-pointer"
                >
                  Save Center
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
