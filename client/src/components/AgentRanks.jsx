import React, { useState, useEffect } from 'react';
import { 
  Award, 
  Plus, 
  Search, 
  RotateCw, 
  Eye, 
  Edit2, 
  Trash2, 
  X, 
  Check, 
  ShieldCheck, 
  Users, 
  TrendingUp, 
  DollarSign, 
  Building2, 
  Percent, 
  Sliders, 
  ChevronRight,
  UserCheck,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';
import { formatINR, apiRequest } from '../utils';

export default function AgentRanks({ onOpenAgentsDirectory }) {
  const [ranks, setRanks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [entriesPerPage, setEntriesPerPage] = useState(50);
  
  // Modals state
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [editingRank, setEditingRank] = useState(null);
  const [viewAssociatesModal, setViewAssociatesModal] = useState(null);
  const [associatesList, setAssociatesList] = useState([]);
  const [associatesLoading, setAssociatesLoading] = useState(false);

  // Form state
  const [formName, setFormName] = useState('');
  const [formDisplayPos, setFormDisplayPos] = useState(1);
  const [formRankPos, setFormRankPos] = useState(1);
  const [formCommPct, setFormCommPct] = useState(5.0);
  const [formCollectionComm, setFormCollectionComm] = useState(true);
  const [formMinTarget, setFormMinTarget] = useState(0);
  const [formDesc, setFormDesc] = useState('');

  const fetchRanks = async () => {
    try {
      setLoading(true);
      const res = await apiRequest('/agent-ranks');
      if (res.success && res.ranks) {
        setRanks(res.ranks);
      }
    } catch (e) {
      console.error('Error fetching agent ranks:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRanks();
  }, []);

  const handleOpenAddModal = () => {
    setEditingRank(null);
    setFormName('');
    const maxPos = ranks.length > 0 ? Math.max(...ranks.map(r => r.display_position || 1)) + 1 : 1;
    setFormDisplayPos(maxPos);
    setFormRankPos(maxPos);
    setFormCommPct(5.0);
    setFormCollectionComm(true);
    setFormMinTarget(0);
    setFormDesc('');
    setAddModalOpen(true);
  };

  const handleOpenEditModal = (rank) => {
    setEditingRank(rank);
    setFormName(rank.name);
    setFormDisplayPos(rank.display_position);
    setFormRankPos(rank.rank_position);
    setFormCommPct(rank.commission_percentage || 5.0);
    setFormCollectionComm(Boolean(rank.collection_charge_commission));
    setFormMinTarget(rank.min_target || 0);
    setFormDesc(rank.description || '');
    setAddModalOpen(true);
  };

  const handleSaveRank = async (e) => {
    e.preventDefault();
    try {
      if (editingRank) {
        const res = await apiRequest(`/agent-ranks/${editingRank.id}`, {
          method: 'PUT',
          body: JSON.stringify({
            name: formName,
            display_position: formDisplayPos,
            rank_position: formRankPos,
            commission_percentage: formCommPct,
            collection_charge_commission: formCollectionComm ? 1 : 0,
            min_target: formMinTarget,
            description: formDesc
          })
        });
        if (res.success) {
          alert('Rank updated successfully');
          setAddModalOpen(false);
          fetchRanks();
        }
      } else {
        const res = await apiRequest('/agent-ranks', {
          method: 'POST',
          body: JSON.stringify({
            name: formName,
            display_position: formDisplayPos,
            rank_position: formRankPos,
            commission_percentage: formCommPct,
            collection_charge_commission: formCollectionComm ? 1 : 0,
            min_target: formMinTarget,
            description: formDesc
          })
        });
        if (res.success) {
          alert('New rank created successfully');
          setAddModalOpen(false);
          fetchRanks();
        }
      }
    } catch (err) {
      alert('Error saving rank: ' + err.message);
    }
  };

  const handleToggleCommission = async (rank) => {
    try {
      const res = await apiRequest(`/agent-ranks/${rank.id}/toggle-commission`, {
        method: 'PATCH'
      });
      if (res.success) {
        setRanks(ranks.map(r => r.id === rank.id ? { ...r, collection_charge_commission: res.collection_charge_commission } : r));
      }
    } catch (err) {
      alert('Error updating commission: ' + err.message);
    }
  };

  const handleDeleteRank = async (rank) => {
    if (rank.associates_count > 0) {
      return alert(`Cannot delete '${rank.name}'. It has ${rank.associates_count} active associates assigned. Reassign them first.`);
    }
    if (!window.confirm(`Are you sure you want to delete rank '${rank.name}'?`)) return;

    try {
      const res = await apiRequest(`/agent-ranks/${rank.id}`, { method: 'DELETE' });
      if (res.success) {
        alert(res.message);
        fetchRanks();
      }
    } catch (err) {
      alert('Error deleting rank: ' + err.message);
    }
  };

  const handleOpenAssociates = async (rank) => {
    setViewAssociatesModal(rank);
    try {
      setAssociatesLoading(true);
      const res = await apiRequest(`/agent-ranks/${rank.id}/associates`);
      if (res.success && res.associates) {
        setAssociatesList(res.associates);
      }
    } catch (err) {
      console.error('Error loading associates:', err);
    } finally {
      setAssociatesLoading(false);
    }
  };

  const filteredRanks = ranks.filter(r => 
    r.name.toLowerCase().includes(search.toLowerCase()) ||
    String(r.rank_position).includes(search) ||
    String(r.display_position).includes(search)
  );

  const displayedRanks = filteredRanks.slice(0, entriesPerPage);
  const totalAssociatesCount = ranks.reduce((acc, r) => acc + (r.associates_count || 0), 0);

  return (
    <div className="space-y-6 animate-fadeIn pb-16">
      
      {/* 1. Header Bar */}
      <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-amber-50 rounded-lg border border-amber-200 text-amber-700">
              <Award className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
                Associate/ Advisor Ranks
                <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                  {ranks.length} Defined Levels
                </span>
              </h1>
              <p className="text-xs text-slate-500 mt-0.5">
                Hierarchical commission architecture, advisor ranks, and field collection permissions
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={fetchRanks}
            className="p-2 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg border border-slate-200 transition cursor-pointer"
            title="Refresh"
          >
            <RotateCw className="w-4 h-4" />
          </button>

          <button
            onClick={handleOpenAddModal}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-xs font-bold shadow-xs transition cursor-pointer"
          >
            <Plus className="w-4 h-4" /> Add New Rank
          </button>
        </div>
      </div>

      {/* 2. KPI Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs">
          <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Hierarchy Levels</div>
          <div className="text-2xl font-black text-slate-900 mt-1">{ranks.length}</div>
          <div className="text-[11px] text-emerald-600 font-medium mt-0.5">Tier 1 to Tier {ranks.length}</div>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs">
          <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Field Associates</div>
          <div className="text-2xl font-black text-blue-700 mt-1">{totalAssociatesCount}</div>
          <div className="text-[11px] text-slate-500 font-medium mt-0.5">16 Active Advisors in Bijnor</div>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs">
          <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Commission Status</div>
          <div className="text-2xl font-black text-emerald-600 mt-1">100%</div>
          <div className="text-[11px] text-slate-500 font-medium mt-0.5">Collection Charge Enabled</div>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs">
          <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Top Executive Tier</div>
          <div className="text-base font-bold text-slate-900 mt-2 truncate">Branch manager</div>
          <div className="text-[11px] text-slate-400 font-medium">Position 1 · 12.0% Override</div>
        </div>
      </div>

      {/* 3. Search & Entries Controls */}
      <div className="bg-white rounded-xl border border-slate-200 p-3 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-xs text-slate-600">
          <span>Show</span>
          <select
            value={entriesPerPage}
            onChange={(e) => setEntriesPerPage(Number(e.target.value))}
            className="border border-slate-200 rounded-lg px-2 py-1 bg-slate-50 text-xs font-semibold focus:outline-none"
          >
            <option value={10}>10</option>
            <option value={25}>25</option>
            <option value={50}>50</option>
            <option value={100}>100</option>
          </select>
          <span>entries</span>
        </div>

        <div className="relative flex-1 max-w-xs">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5 pointer-events-none" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search:"
            className="w-full text-xs pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:border-slate-800 transition"
          />
        </div>
      </div>

      {/* 4. Table matching Hubco's exact headers & structure */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#f59e0b] text-white font-bold tracking-wider uppercase text-[11px]">
              <tr>
                <th className="py-3 px-4">NAME</th>
                <th className="py-3 px-4 text-center">DISPLAY POSITION</th>
                <th className="py-3 px-4 text-center">RANK POSITION</th>
                <th className="py-3 px-4 text-center">COLLECTION CHARGE COMMISSION ENABLE</th>
                <th className="py-3 px-4 text-center">ASSOCIATES</th>
                <th className="py-3 px-4 text-center">ACTIONS</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan="6" className="py-12 text-center text-slate-400">Loading advisor ranks...</td>
                </tr>
              ) : displayedRanks.length === 0 ? (
                <tr>
                  <td colSpan="6" className="py-12 text-center text-slate-400">No ranks found.</td>
                </tr>
              ) : (
                displayedRanks.map((rank) => (
                  <tr key={rank.id} className="hover:bg-amber-50/30 transition">
                    <td className="py-3 px-4">
                      <div className="font-bold text-slate-800 text-sm flex items-center gap-2">
                        {rank.name}
                        {rank.name === 'ADVISOR' && (
                          <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-200">
                            Primary Mobilizer
                          </span>
                        )}
                      </div>
                      <div className="text-[11px] text-slate-400 mt-0.5">
                        Base Commission: <span className="font-semibold text-slate-700">{rank.commission_percentage}%</span>
                        {rank.description ? ` • ${rank.description}` : ''}
                      </div>
                    </td>

                    <td className="py-3 px-4 text-center font-bold text-slate-700 font-mono text-sm">
                      {rank.display_position}
                    </td>

                    <td className="py-3 px-4 text-center font-bold text-slate-700 font-mono text-sm">
                      {rank.rank_position}
                    </td>

                    <td className="py-3 px-4 text-center">
                      <button
                        onClick={() => handleToggleCommission(rank)}
                        title="Click to toggle collection charge commission"
                        className={`px-3 py-1 rounded text-xs font-bold transition cursor-pointer inline-flex items-center gap-1 ${
                          rank.collection_charge_commission
                            ? 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs'
                            : 'bg-rose-100 hover:bg-rose-200 text-rose-700'
                        }`}
                      >
                        {rank.collection_charge_commission ? (
                          <>
                            <Check className="w-3.5 h-3.5" /> Yes
                          </>
                        ) : (
                          'No'
                        )}
                      </button>
                    </td>

                    <td className="py-3 px-4 text-center">
                      <button
                        onClick={() => handleOpenAssociates(rank)}
                        className={`px-3 py-1 rounded-full text-xs font-bold transition cursor-pointer inline-flex items-center gap-1 ${
                          rank.associates_count > 0 
                            ? 'bg-blue-50 text-blue-700 border border-blue-200 hover:bg-blue-100'
                            : 'bg-slate-100 text-slate-500'
                        }`}
                        title={rank.associates_count > 0 ? 'Click to view associates list' : 'No associates currently'}
                      >
                        <Users className="w-3.5 h-3.5" />
                        <span>{rank.associates_count}</span>
                      </button>
                    </td>

                    <td className="py-3 px-4 text-center">
                      <div className="inline-flex items-center gap-1.5">
                        <button
                          onClick={() => handleOpenAssociates(rank)}
                          className="p-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded transition cursor-pointer"
                          title="View Associates"
                        >
                          <Eye className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleOpenEditModal(rank)}
                          className="p-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded border border-blue-200 transition cursor-pointer"
                          title="Edit Rank"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleDeleteRank(rank)}
                          className="p-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 rounded border border-rose-200 transition cursor-pointer"
                          title="Delete Rank"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Footer info & pagination */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between text-xs text-slate-500 gap-2">
          <div>
            Showing 1 to {displayedRanks.length} of {filteredRanks.length} entries
          </div>
          <div className="flex items-center gap-1">
            <button className="px-2.5 py-1 bg-white border border-slate-200 rounded text-slate-400 cursor-not-allowed">
              Previous
            </button>
            <button className="px-2.5 py-1 bg-blue-600 text-white font-bold rounded">
              1
            </button>
            <button className="px-2.5 py-1 bg-white border border-slate-200 rounded text-slate-400 cursor-not-allowed">
              Next
            </button>
          </div>
        </div>
      </div>

      {/* 5. Add / Edit Rank Modal */}
      {addModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-lg w-full p-6 animate-fadeIn relative">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <Award className="w-5 h-5 text-amber-600" />
                <h3 className="text-base font-bold text-slate-900">
                  {editingRank ? `Edit Rank: ${editingRank.name}` : 'Create New Advisor Rank'}
                </h3>
              </div>
              <button
                onClick={() => setAddModalOpen(false)}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveRank} className="mt-4 space-y-4 text-xs">
              <div>
                <label className="font-semibold text-slate-700 block mb-1">Rank / Designation Name *</label>
                <input
                  type="text"
                  required
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  placeholder="e.g. Chief Business Officer, Cluster Advisor"
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:border-slate-800"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Display Position *</label>
                  <input
                    type="number"
                    min="1"
                    required
                    value={formDisplayPos}
                    onChange={(e) => setFormDisplayPos(Number(e.target.value))}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:border-slate-800 font-mono"
                  />
                </div>

                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Rank Hierarchy Level *</label>
                  <input
                    type="number"
                    min="1"
                    required
                    value={formRankPos}
                    onChange={(e) => setFormRankPos(Number(e.target.value))}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:border-slate-800 font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Base Commission (%)</label>
                  <input
                    type="number"
                    step="0.1"
                    min="0"
                    max="100"
                    value={formCommPct}
                    onChange={(e) => setFormCommPct(Number(e.target.value))}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:border-slate-800 font-mono"
                  />
                </div>

                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Min Business Target (₹)</label>
                  <input
                    type="number"
                    min="0"
                    value={formMinTarget}
                    onChange={(e) => setFormMinTarget(Number(e.target.value))}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:border-slate-800 font-mono"
                  />
                </div>
              </div>

              <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between">
                <div>
                  <div className="font-semibold text-slate-800">Collection Charge Commission</div>
                  <div className="text-[11px] text-slate-500">Allow associates in this rank to earn daily collection & renewal charges</div>
                </div>
                <input
                  type="checkbox"
                  checked={formCollectionComm}
                  onChange={(e) => setFormCollectionComm(e.target.checked)}
                  className="w-4 h-4 text-emerald-600 rounded cursor-pointer"
                />
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">Description / Notes</label>
                <textarea
                  rows="2"
                  value={formDesc}
                  onChange={(e) => setFormDesc(e.target.value)}
                  placeholder="Optional rank responsibilities and territory jurisdiction..."
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:border-slate-800"
                ></textarea>
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
                  {editingRank ? 'Save Changes' : 'Create Rank'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 6. Rank Associates List Modal */}
      {viewAssociatesModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-4xl w-full p-6 animate-fadeIn relative max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-700 font-black">
                  {viewAssociatesModal.rank_position}
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                    {viewAssociatesModal.name} — Associates Directory
                    <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200">
                      {associatesList.length} Associates
                    </span>
                  </h3>
                  <p className="text-xs text-slate-500">
                    Field advisors and agents currently assigned to this rank tier
                  </p>
                </div>
              </div>

              <button
                onClick={() => setViewAssociatesModal(null)}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="py-4 overflow-y-auto flex-1">
              {associatesLoading ? (
                <div className="py-12 text-center text-slate-400">Loading associates...</div>
              ) : associatesList.length === 0 ? (
                <div className="py-12 text-center text-slate-400">
                  No associates registered in this rank yet.
                </div>
              ) : (
                <div className="border border-slate-200 rounded-xl overflow-hidden">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold">
                      <tr>
                        <th className="py-2.5 px-3">Agent Code</th>
                        <th className="py-2.5 px-3">Associate Name</th>
                        <th className="py-2.5 px-3">Contact</th>
                        <th className="py-2.5 px-3">Assigned Branch</th>
                        <th className="py-2.5 px-3 text-right">Business Collected</th>
                        <th className="py-2.5 px-3 text-right">Commission Earned</th>
                        <th className="py-2.5 px-3 text-center">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {associatesList.map((a) => (
                        <tr key={a.id} className="hover:bg-slate-50/60">
                          <td className="py-2.5 px-3 font-mono font-bold text-slate-900">{a.agent_code}</td>
                          <td className="py-2.5 px-3 font-semibold text-slate-800">{a.full_name}</td>
                          <td className="py-2.5 px-3 text-slate-600 font-mono">{a.phone}</td>
                          <td className="py-2.5 px-3 text-slate-700">{a.branch_name || 'Bijnor Branch'}</td>
                          <td className="py-2.5 px-3 text-right font-bold text-slate-900">{formatINR(a.total_business_collected)}</td>
                          <td className="py-2.5 px-3 text-right font-black text-emerald-700">{formatINR(a.total_commission_paid)}</td>
                          <td className="py-2.5 px-3 text-center">
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                              {a.status}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            <div className="pt-3 border-t border-slate-100 flex justify-end">
              <button
                onClick={() => setViewAssociatesModal(null)}
                className="px-4 py-2 bg-slate-900 text-white rounded-lg text-xs font-semibold"
              >
                Close Directory
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
