import React, { useState, useEffect } from 'react';
import { Settings as SettingsIcon, Building2, Save, CheckCircle, Shield } from 'lucide-react';
import { apiRequest } from '../utils';

export default function Settings() {
  const [settings, setSettings] = useState({
    company_name: '',
    company_tagline: '',
    phone: '',
    email: '',
    address: '',
    license_no: '',
    senior_bonus_rate: '0.50',
    default_penalty_rate: '1.00',
    terms_conditions: ''
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        setLoading(true);
        const res = await apiRequest('/settings');
        setSettings(prev => ({ ...prev, ...(res.settings || {}) }));
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchSettings();
  }, []);

  const handleSave = async (e) => {
    e.preventDefault();
    try {
      setSaving(true);
      await apiRequest('/settings', {
        method: 'POST',
        body: JSON.stringify({ settings })
      });
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (err) {
      alert('Error saving settings: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="py-20 text-center">
        <div className="inline-block w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Organization & CRM Settings</h1>
          <p className="text-sm text-slate-500 mt-0.5">
            FD Certificates, Receipts aur calculations ke branding parameters
          </p>
        </div>

        {success && (
          <div className="flex items-center gap-2 text-emerald-700 bg-emerald-50 border border-emerald-200 px-3 py-1.5 rounded-xl text-xs font-bold animate-fade-in">
            <CheckCircle className="w-4 h-4" />
            Settings Saved!
          </div>
        )}
      </div>

      <form onSubmit={handleSave} className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 shadow-sm space-y-6">
        
        {/* Company Identity */}
        <div>
          <h3 className="text-xs font-bold uppercase tracking-wider text-indigo-600 mb-4 flex items-center gap-2">
            <Building2 className="w-4 h-4" />
            Company Details (Appears on FD Certificates & Receipts)
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div>
              <label className="block font-semibold text-slate-600 mb-1">Company / Organization Name</label>
              <input
                type="text"
                value={settings.company_name}
                onChange={(e) => setSettings({ ...settings, company_name: e.target.value })}
                className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-800"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-600 mb-1">Tagline / Subheading</label>
              <input
                type="text"
                value={settings.company_tagline}
                onChange={(e) => setSettings({ ...settings, company_tagline: e.target.value })}
                className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl font-medium text-slate-800"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-600 mb-1">Official Phone Number</label>
              <input
                type="text"
                value={settings.phone}
                onChange={(e) => setSettings({ ...settings, phone: e.target.value })}
                className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-800"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-600 mb-1">Official Email</label>
              <input
                type="text"
                value={settings.email}
                onChange={(e) => setSettings({ ...settings, email: e.target.value })}
                className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-800"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="block font-semibold text-slate-600 mb-1">Registered Office Address</label>
              <input
                type="text"
                value={settings.address}
                onChange={(e) => setSettings({ ...settings, address: e.target.value })}
                className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-800"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-600 mb-1">License / Reg. Number</label>
              <input
                type="text"
                value={settings.license_no}
                onChange={(e) => setSettings({ ...settings, license_no: e.target.value })}
                className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl font-mono text-slate-800"
              />
            </div>
          </div>
        </div>

        {/* Calculation Parameters */}
        <div className="pt-4 border-t border-slate-100">
          <h3 className="text-xs font-bold uppercase tracking-wider text-indigo-600 mb-4 flex items-center gap-2">
            <Shield className="w-4 h-4" />
            Default Rate Policies
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div>
              <label className="block font-semibold text-slate-600 mb-1">Senior Citizen Bonus Rate (% extra)</label>
              <input
                type="number"
                step="0.05"
                value={settings.senior_bonus_rate}
                onChange={(e) => setSettings({ ...settings, senior_bonus_rate: e.target.value })}
                className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl font-bold"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-600 mb-1">Default Premature Penalty (% deduction)</label>
              <input
                type="number"
                step="0.05"
                value={settings.default_penalty_rate}
                onChange={(e) => setSettings({ ...settings, default_penalty_rate: e.target.value })}
                className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl font-bold"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="block font-semibold text-slate-600 mb-1">Receipt Terms & Conditions</label>
              <textarea
                rows="4"
                value={settings.terms_conditions}
                onChange={(e) => setSettings({ ...settings, terms_conditions: e.target.value })}
                className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl font-sans text-xs leading-relaxed"
              ></textarea>
            </div>
          </div>
        </div>

        <div className="pt-4 border-t border-slate-100 flex justify-end">
          <button
            type="submit"
            disabled={saving}
            className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl shadow-lg shadow-indigo-600/30 transition flex items-center gap-2 text-xs cursor-pointer disabled:opacity-50"
          >
            <Save className="w-4 h-4" />
            {saving ? 'Saving...' : 'Save Settings'}
          </button>
        </div>

      </form>
    </div>
  );
}
