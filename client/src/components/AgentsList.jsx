import React, { useState, useEffect } from 'react';
import { 
  Users, 
  Search, 
  RotateCw, 
  Filter, 
  Building2, 
  Award, 
  Phone, 
  Mail, 
  TrendingUp, 
  DollarSign, 
  Plus, 
  X,
  CheckCircle2,
  Calendar,
  Briefcase
} from 'lucide-react';
import { formatINR, formatDate, apiRequest, getApiBase } from '../utils';

export default function AgentsList({ onBackToRanks }) {
  const [agents, setAgents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedRank, setSelectedRank] = useState('ALL');
  const [ranks, setRanks] = useState([]);
  const [totalBusiness, setTotalBusiness] = useState(0);
  const [totalCommission, setTotalCommission] = useState(0);

  // New Agent Modal
  const [newAgentModal, setNewAgentModal] = useState(false);
  const [branches, setBranches] = useState([]);
  const [formName, setFormName] = useState('');
  const [formPhone, setFormPhone] = useState('');
  const [formEmail, setFormEmail] = useState('');
  const [formBranchId, setFormBranchId] = useState('1');
  const [formRankId, setFormRankId] = useState('6');
  const [formCommRate, setFormCommRate] = useState(5.0);

  const fetchAgents = async () => {
    try {
      setLoading(true);
      let q = '/agents/all-agents';
      const params = [];
      if (search) params.push(`search=${encodeURIComponent(search)}`);
      if (selectedRank !== 'ALL') params.push(`rank_id=${selectedRank}`);
      if (params.length > 0) q += `?${params.join('&')}`;

      const res = await apiRequest(q);
      if (res.success && res.agents) {
        setAgents(res.agents);
        setTotalBusiness(res.total_business || 0);
        setTotalCommission(res.total_commission || 0);
      }
    } catch (e) {
      console.error('Error fetching agents:', e);
    } finally {
      setLoading(false);
    }
  };

  const fetchMetadata = async () => {
    try {
      const [ranksRes, branchesRes] = await Promise.all([
        apiRequest('/agent-ranks'),
        fetch(`${getApiBase()}/branches`).then(r => r.json())
      ]);
      if (ranksRes.success) setRanks(ranksRes.ranks || []);
      if (branchesRes.success) setBranches(branchesRes.branches || []);
    } catch (e) {}
  };

  useEffect(() => {
    fetchMetadata();
  }, []);

  useEffect(() => {
    fetchAgents();
  }, [search, selectedRank]);

  const handleCreateAgent = async (e) => {
    e.preventDefault();
    try {
      const selectedB = branches.find(b => String(b.id) === String(formBranchId));
      const selectedR = ranks.find(r => String(r.id) === String(formRankId));

      const res = await apiRequest('/agents/create', {
        method: 'POST',
        body: JSON.stringify({
          full_name: formName,
          phone: formPhone,
          email: formEmail,
          branch_id: Number(formBranchId),
          branch_name: selectedB?.branch_name || 'MAIN BRANCH',
          rank_id: Number(formRankId),
          rank_name: selectedR?.name || 'ADVISOR',
          commission_rate: Number(formCommRate)
        })
      });

      if (res.success) {
        alert('Advisor enrolled successfully');
        setNewAgentModal(false);
        fetchAgents();
      }
    } catch (err) {
      alert('Error creating advisor: ' + err.message);
    }
  };

  return (
    <div className="space-y-6 animate-fadeIn pb-16">
      
      {/* 1. Header */}
      <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-teal-50 rounded-lg border border-teal-200 text-teal-700">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
                Field Associates & Advisors Directory
                <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-teal-50 text-teal-700 border border-teal-200">
                  {agents.length} Field Mobilizers
                </span>
              </h1>
              <p className="text-xs text-slate-500 mt-0.5">
                Roster of registered agents, business mobilization, collection commission, and branch mapping
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={fetchAgents}
            className="p-2 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg border border-slate-200 transition cursor-pointer"
            title="Refresh"
          >
            <RotateCw className="w-4 h-4" />
          </button>

          {onBackToRanks && (
            <button
              onClick={onBackToRanks}
              className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold border border-slate-200 transition cursor-pointer"
            >
              View Ranks Hierarchy
            </button>
          )}

          <button
            onClick={() => {
              setFormName('');
              setFormPhone('');
              setFormEmail('');
              setFormCommRate(5.0);
              setNewAgentModal(true);
            }}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-teal-700 hover:bg-teal-800 text-white rounded-lg text-xs font-bold shadow-xs transition cursor-pointer"
          >
            <Plus className="w-4 h-4" /> Enroll New Advisor
          </button>
        </div>
      </div>

      {/* 2. Metrics Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
        <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs">
          <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Total Active Advisors</div>
          <div className="text-2xl font-black text-slate-900 mt-1">{agents.length}</div>
          <div className="text-[11px] text-teal-700 font-medium mt-0.5">Across 4 Bijnor Branches</div>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs">
          <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Business Mobilized</div>
          <div className="text-2xl font-black text-slate-900 mt-1">{formatINR(totalBusiness)}</div>
          <div className="text-[11px] text-emerald-600 font-medium mt-0.5">Cumulative Deposit Intake</div>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs">
          <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Commission Disbursed</div>
          <div className="text-2xl font-black text-emerald-700 mt-1">{formatINR(totalCommission)}</div>
          <div className="text-[11px] text-slate-500 font-medium mt-0.5">Paid Field Commission</div>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs">
          <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Commission Payout</div>
          <div className="text-2xl font-black text-blue-700 mt-1">100%</div>
          <div className="text-[11px] text-slate-500 font-medium mt-0.5">Direct Bank NEFT / Cash</div>
        </div>
      </div>

      {/* 3. Search & Filter Bar */}
      <div className="bg-white rounded-xl border border-slate-200 p-3 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5 pointer-events-none" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by advisor name, agent code, phone..."
            className="w-full text-xs pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:border-slate-800 transition"
          />
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-500">Filter Rank:</span>
          <select
            value={selectedRank}
            onChange={(e) => setSelectedRank(e.target.value)}
            className="border border-slate-200 rounded-lg px-2.5 py-1.5 bg-slate-50 text-xs font-semibold focus:outline-none"
          >
            <option value="ALL">All Ranks ({ranks.length})</option>
            {ranks.map(r => (
              <option key={r.id} value={r.id}>{r.name} (Tier {r.rank_position})</option>
            ))}
          </select>
        </div>
      </div>

      {/* 4. Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold uppercase text-[11px]">
              <tr>
                <th className="py-3 px-4">Agent Code</th>
                <th className="py-3 px-4">Advisor Name</th>
                <th className="py-3 px-4">Designation Rank</th>
                <th className="py-3 px-4">Branch</th>
                <th className="py-3 px-4 text-right">Commission Rate</th>
                <th className="py-3 px-4 text-right">Total Business</th>
                <th className="py-3 px-4 text-right">Commission Paid</th>
                <th className="py-3 px-4 text-center">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan="8" className="py-12 text-center text-slate-400">Loading advisors directory...</td>
                </tr>
              ) : agents.length === 0 ? (
                <tr>
                  <td colSpan="8" className="py-12 text-center text-slate-400">No advisors found matching your criteria.</td>
                </tr>
              ) : (
                agents.map(a => (
                  <tr key={a.id} className="hover:bg-slate-50/70 transition">
                    <td className="py-3 px-4 font-mono font-bold text-slate-900">{a.agent_code}</td>
                    <td className="py-3 px-4">
                      <div className="font-semibold text-slate-800 text-sm">{a.full_name}</div>
                      <div className="text-[11px] text-slate-400 flex items-center gap-1">
                        <Phone className="w-3 h-3" /> {a.phone}
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <span className="inline-flex items-center gap-1 font-bold text-amber-800 bg-amber-50 px-2.5 py-0.5 rounded-full border border-amber-200 text-[11px]">
                        <Award className="w-3 h-3 text-amber-600" />
                        {a.rank_name}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-slate-700 font-medium">
                      <div className="flex items-center gap-1">
                        <Building2 className="w-3.5 h-3.5 text-slate-400" />
                        {a.branch_name}
                      </div>
                    </td>
                    <td className="py-3 px-4 text-right font-bold text-blue-700">
                      {a.commission_rate}%
                    </td>
                    <td className="py-3 px-4 text-right font-bold text-slate-900 text-sm">
                      {formatINR(a.total_business_collected)}
                    </td>
                    <td className="py-3 px-4 text-right font-black text-emerald-700 text-sm">
                      {formatINR(a.total_commission_paid)}
                    </td>
                    <td className="py-3 px-4 text-center">
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                        {a.status}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* 5. Enroll New Advisor Modal */}
      {newAgentModal && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-slate-950/75 backdrop-blur-xs">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-md overflow-hidden animate-fadeIn">
            <div className="px-5 py-4 bg-teal-800 text-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Users className="w-5 h-5 text-teal-200" />
                <h3 className="text-sm font-bold">Enroll New Field Advisor</h3>
              </div>
              <button
                type="button"
                onClick={() => setNewAgentModal(false)}
                className="p-1 rounded-lg hover:bg-white/15 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <form onSubmit={handleCreateAgent} className="p-5 space-y-3.5 text-xs">
              <div>
                <label className="block font-bold text-slate-700 uppercase mb-1">Full Name *</label>
                <input
                  type="text"
                  required
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  placeholder="e.g. Rajesh Verma"
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-600"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 uppercase mb-1">Phone *</label>
                  <input
                    type="tel"
                    required
                    value={formPhone}
                    onChange={(e) => setFormPhone(e.target.value)}
                    placeholder="9876543210"
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-600"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 uppercase mb-1">Commission %</label>
                  <input
                    type="number"
                    step="0.1"
                    min="0"
                    max="50"
                    value={formCommRate}
                    onChange={(e) => setFormCommRate(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-600"
                  />
                </div>
              </div>
              <div>
                <label className="block font-bold text-slate-700 uppercase mb-1">Email (Optional)</label>
                <input
                  type="email"
                  value={formEmail}
                  onChange={(e) => setFormEmail(e.target.value)}
                  placeholder="advisor@tarpl.com"
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-600"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 uppercase mb-1">Branch</label>
                  <select
                    value={formBranchId}
                    onChange={(e) => setFormBranchId(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl bg-white"
                  >
                    {branches.map(b => (
                      <option key={b.id} value={b.id}>{b.branch_name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block font-bold text-slate-700 uppercase mb-1">Designation Rank</label>
                  <select
                    value={formRankId}
                    onChange={(e) => setFormRankId(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl bg-white"
                  >
                    {ranks.map(r => (
                      <option key={r.id} value={r.id}>{r.name}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setNewAgentModal(false)}
                  className="px-4 py-2 rounded-xl font-semibold text-slate-600 hover:bg-slate-100 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl font-bold bg-teal-700 hover:bg-teal-800 text-white cursor-pointer"
                >
                  Enroll Advisor
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
