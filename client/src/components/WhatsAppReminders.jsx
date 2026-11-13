import React, { useState, useEffect } from 'react';
import { 
  MessageSquare, 
  Send, 
  Clock, 
  CheckCircle2, 
  AlertCircle, 
  Copy, 
  ExternalLink, 
  Settings, 
  ShieldCheck, 
  Calendar, 
  Smartphone,
  RefreshCw,
  Sparkles,
  Check
} from 'lucide-react';
import { formatINR, formatDate, apiRequest } from '../utils';

export default function WhatsAppReminders({ onViewFD }) {
  const [reminders, setReminders] = useState([]);
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [days, setDays] = useState(3);
  const [activeTab, setActiveTab] = useState('due'); // 'due' | 'logs' | 'settings'

  // Settings state
  const [settingsData, setSettingsData] = useState({
    whatsapp_reminder_days: 3,
    whatsapp_auto_send: true,
    whatsapp_provider: 'whatsapp_web',
    whatsapp_api_token: '',
    whatsapp_instance_id: '',
    whatsapp_payout_template: '',
    whatsapp_maturity_template: ''
  });
  const [savingSettings, setSavingSettings] = useState(false);
  const [copiedId, setCopiedId] = useState(null);

  const fetchReminders = async () => {
    try {
      setLoading(true);
      const res = await apiRequest(`/whatsapp/due?days=${days}`);
      setReminders(res.reminders || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const fetchLogs = async () => {
    try {
      const res = await apiRequest('/whatsapp/logs');
      setLogs(res.logs || []);
    } catch (err) {
      console.error(err);
    }
  };

  const fetchSettings = async () => {
    try {
      const res = await apiRequest('/settings');
      if (res.settings) {
        setSettingsData({
          whatsapp_reminder_days: parseInt(res.settings.whatsapp_reminder_days) || 3,
          whatsapp_auto_send: res.settings.whatsapp_auto_send === '1',
          whatsapp_provider: res.settings.whatsapp_provider || 'whatsapp_web',
          whatsapp_api_token: res.settings.whatsapp_api_token || '',
          whatsapp_instance_id: res.settings.whatsapp_instance_id || '',
          whatsapp_payout_template: res.settings.whatsapp_payout_template || '',
          whatsapp_maturity_template: res.settings.whatsapp_maturity_template || ''
        });
      }
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchReminders();
    fetchLogs();
    fetchSettings();
  }, [days]);

  // Direct 1-Click Send on WhatsApp
  const handleSendWhatsApp = async (item) => {
    // Open WhatsApp Web or Mobile WhatsApp
    window.open(item.wa_link, '_blank');

    // Log in DB as sent
    try {
      await apiRequest('/whatsapp/log-dispatch', {
        method: 'POST',
        body: JSON.stringify({
          customer_id: item.customer_id,
          fd_id: item.fd_id,
          schedule_id: item.schedule_id,
          recipient_phone: item.customer_phone,
          customer_name: item.customer_name,
          reminder_type: item.type,
          due_date: item.due_date,
          days_before: days,
          message_text: item.message,
          status: 'SENT'
        })
      });
      fetchReminders();
      fetchLogs();
    } catch (err) {
      console.error('Error logging WhatsApp dispatch', err);
    }
  };

  const handleCopy = (text, id) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleSaveSettings = async (e) => {
    e.preventDefault();
    try {
      setSavingSettings(true);
      await apiRequest('/whatsapp/settings', {
        method: 'POST',
        body: JSON.stringify(settingsData)
      });
      alert('WhatsApp Reminder settings saved successfully!');
      fetchReminders();
    } catch (err) {
      alert('Error saving settings: ' + err.message);
    } finally {
      setSavingSettings(false);
    }
  };

  return (
    <div className="space-y-6">
      
      {/* Top Banner */}
      <div className="bg-gradient-to-r from-emerald-900 via-teal-900 to-slate-900 rounded-3xl p-6 text-white shadow-xl flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/30 text-emerald-200 text-xs font-semibold mb-2 backdrop-blur-sm">
            <MessageSquare className="w-3.5 h-3.5 text-emerald-400" />
            3 Days Advance WhatsApp Notification Engine
          </div>
          <h1 className="text-2xl font-bold tracking-tight">WhatsApp Reminders & Alerts</h1>
          <p className="text-emerald-200 text-xs mt-1">
            Maturity aur next installment / interest payout se 3 din pehle client ko WhatsApp par automated reminder bhejein
          </p>
        </div>

        {/* Tab Controls */}
        <div className="flex bg-white/10 p-1 rounded-xl text-xs font-semibold backdrop-blur-md">
          <button
            onClick={() => setActiveTab('due')}
            className={`px-3.5 py-1.5 rounded-lg transition cursor-pointer ${
              activeTab === 'due' ? 'bg-emerald-500 text-white shadow-sm' : 'text-slate-200 hover:text-white'
            }`}
          >
            Due Reminders ({reminders.length})
          </button>
          <button
            onClick={() => setActiveTab('logs')}
            className={`px-3.5 py-1.5 rounded-lg transition cursor-pointer ${
              activeTab === 'logs' ? 'bg-emerald-500 text-white shadow-sm' : 'text-slate-200 hover:text-white'
            }`}
          >
            Delivery History
          </button>
          <button
            onClick={() => setActiveTab('settings')}
            className={`px-3.5 py-1.5 rounded-lg transition cursor-pointer flex items-center gap-1 ${
              activeTab === 'settings' ? 'bg-emerald-500 text-white shadow-sm' : 'text-slate-200 hover:text-white'
            }`}
          >
            <Settings className="w-3 h-3" />
            Settings & Templates
          </button>
        </div>
      </div>

      {activeTab === 'due' && (
        <div className="space-y-4">
          
          {/* Days Filter Bar */}
          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-slate-700">Reminder Timing:</span>
              <div className="flex gap-1.5">
                {[
                  { d: 3, label: '3 Days Before (Recommended)' },
                  { d: 5, label: '5 Days Before' },
                  { d: 7, label: '7 Days Before' },
                  { d: 1, label: 'Tomorrow' }
                ].map(opt => (
                  <button
                    key={opt.d}
                    onClick={() => setDays(opt.d)}
                    className={`text-xs px-3 py-1.5 rounded-xl font-semibold transition cursor-pointer ${
                      days === opt.d
                        ? 'bg-emerald-600 text-white shadow-sm'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            <button
              onClick={fetchReminders}
              className="p-2 hover:bg-slate-100 text-slate-500 rounded-xl transition cursor-pointer text-xs flex items-center gap-1 font-semibold"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              Refresh
            </button>
          </div>

          {/* Reminders List */}
          {loading ? (
            <div className="py-20 text-center">
              <div className="inline-block w-8 h-8 border-4 border-emerald-600 border-t-transparent rounded-full animate-spin"></div>
            </div>
          ) : reminders.length === 0 ? (
            <div className="bg-white rounded-3xl p-12 text-center border border-slate-200 text-slate-400">
              <CheckCircle2 className="w-12 h-12 mx-auto stroke-1 text-emerald-500 mb-2" />
              <p className="font-bold text-slate-800 text-base">Sabhi Reminders Up-To-Date Hain!</p>
              <p className="text-xs text-slate-400 mt-1">
                Agale {days} dino me koi pending interest installment ya maturity schedule nahi hai.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {reminders.map((item, idx) => (
                <div 
                  key={idx}
                  className="bg-white rounded-3xl border border-slate-200 p-5 shadow-sm hover:shadow-md transition flex flex-col justify-between"
                >
                  <div>
                    {/* Header */}
                    <div className="flex justify-between items-start mb-3">
                      <div>
                        <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${
                          item.type === 'MATURITY_DUE' 
                            ? 'bg-rose-100 text-rose-800' 
                            : 'bg-blue-100 text-blue-800'
                        }`}>
                          {item.title}
                        </span>
                        <h3 className="font-bold text-slate-900 text-base mt-1">
                          {item.customer_name}
                        </h3>
                        <p className="text-xs text-slate-500 font-mono">
                          {item.customer_phone} • {item.fd_number}
                        </p>
                      </div>

                      <div className="text-right">
                        <span className="text-[10px] text-slate-400 block font-bold uppercase">Amount</span>
                        <span className="text-base font-black text-emerald-700">
                          {formatINR(item.amount)}
                        </span>
                      </div>
                    </div>

                    {/* Due Date Alert */}
                    <div className="p-2.5 bg-amber-50 rounded-xl border border-amber-200 flex items-center justify-between text-xs mb-3">
                      <span className="text-amber-800 font-semibold flex items-center gap-1.5">
                        <Clock className="w-3.5 h-3.5 text-amber-600" />
                        Due Date: <strong>{formatDate(item.due_date)}</strong>
                      </span>
                      <span className="text-[10px] font-bold text-amber-700 bg-amber-200/60 px-2 py-0.5 rounded">
                        Due in {days} Days
                      </span>
                    </div>

                    {/* Message Preview */}
                    <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs text-slate-700 font-sans whitespace-pre-line leading-relaxed mb-4 max-h-36 overflow-y-auto">
                      {item.message}
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
                    <button
                      onClick={() => handleCopy(item.message, idx)}
                      className="text-xs font-semibold text-slate-500 hover:text-slate-800 flex items-center gap-1 transition cursor-pointer"
                    >
                      {copiedId === idx ? (
                        <>
                          <Check className="w-3.5 h-3.5 text-emerald-600" />
                          <span className="text-emerald-600 font-bold">Copied!</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3.5 h-3.5" />
                          Copy Text
                        </>
                      )}
                    </button>

                    <button
                      onClick={() => handleSendWhatsApp(item)}
                      className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs shadow-md shadow-emerald-600/30 transition flex items-center gap-2 cursor-pointer"
                    >
                      <Send className="w-3.5 h-3.5" />
                      Send on WhatsApp
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

        </div>
      )}

      {/* Delivery Logs Tab */}
      {activeTab === 'logs' && (
        <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="p-4 bg-slate-50 border-b border-slate-200 flex justify-between items-center text-xs font-semibold">
            <span className="text-slate-800">WhatsApp Delivery History & Logs</span>
            <span className="text-slate-500">{logs.length} Sent Records</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-100 text-slate-600 uppercase font-semibold">
                <tr>
                  <th className="py-3 px-4">Sent Time</th>
                  <th className="py-3 px-4">Client Name</th>
                  <th className="py-3 px-4">Phone Number</th>
                  <th className="py-3 px-4">Reminder Type</th>
                  <th className="py-3 px-4">Due Date</th>
                  <th className="py-3 px-4 text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                {logs.length === 0 ? (
                  <tr>
                    <td colSpan="6" className="py-12 text-center text-slate-400">
                      Abhi tak koi WhatsApp reminder dispatch nahi kiya gaya hai.
                    </td>
                  </tr>
                ) : (
                  logs.map((log) => (
                    <tr key={log.id} className="hover:bg-slate-50">
                      <td className="py-3 px-4 text-slate-500">{formatDate(log.sent_at)}</td>
                      <td className="py-3 px-4 font-bold text-slate-800">{log.customer_name}</td>
                      <td className="py-3 px-4 font-mono text-slate-700">{log.recipient_phone}</td>
                      <td className="py-3 px-4">
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-indigo-50 text-indigo-700">
                          {log.reminder_type}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-slate-700">{formatDate(log.due_date)}</td>
                      <td className="py-3 px-4 text-center">
                        <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full">
                          <Check className="w-3 h-3" /> {log.status}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Templates & Settings Tab */}
      {activeTab === 'settings' && (
        <form onSubmit={handleSaveSettings} className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 shadow-sm space-y-6">
          <div className="border-b border-slate-100 pb-4">
            <h2 className="text-lg font-bold text-slate-900">WhatsApp Notification Settings</h2>
            <p className="text-xs text-slate-500">Configure reminder lead time, message wording and gateway integration</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div>
              <label className="block font-semibold text-slate-600 mb-1">
                Days Before Due Date to Send Reminder (दिन पहले)
              </label>
              <input
                type="number"
                min="1"
                max="30"
                value={settingsData.whatsapp_reminder_days}
                onChange={(e) => setSettingsData({ ...settingsData, whatsapp_reminder_days: parseInt(e.target.value) || 3 })}
                className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-800"
              />
              <p className="text-[11px] text-slate-400 mt-1">Default 3 din set hai</p>
            </div>

            <div>
              <label className="block font-semibold text-slate-600 mb-1">
                WhatsApp Dispatch Gateway Mode
              </label>
              <select
                value={settingsData.whatsapp_provider}
                onChange={(e) => setSettingsData({ ...settingsData, whatsapp_provider: e.target.value })}
                className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl font-semibold cursor-pointer"
              >
                <option value="whatsapp_web">WhatsApp Web / App (1-Click Instant - No Cost)</option>
                <option value="meta_api">Meta WhatsApp Cloud API (Automated)</option>
                <option value="ultramsg">UltraMsg / Third Party Gateway (Automated)</option>
              </select>
            </div>

            {settingsData.whatsapp_provider !== 'whatsapp_web' && (
              <>
                <div>
                  <label className="block font-semibold text-slate-600 mb-1">API Token / Secret Key</label>
                  <input
                    type="password"
                    value={settingsData.whatsapp_api_token}
                    onChange={(e) => setSettingsData({ ...settingsData, whatsapp_api_token: e.target.value })}
                    className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl font-mono"
                    placeholder="Enter API token"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-600 mb-1">Instance ID / Phone Number ID</label>
                  <input
                    type="text"
                    value={settingsData.whatsapp_instance_id}
                    onChange={(e) => setSettingsData({ ...settingsData, whatsapp_instance_id: e.target.value })}
                    className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl font-mono"
                    placeholder="e.g. instance12345"
                  />
                </div>
              </>
            )}

            {/* Template 1: Payout Reminder */}
            <div className="sm:col-span-2">
              <label className="block font-semibold text-slate-600 mb-1">
                Interest Payout / Installment Reminder Template (Hindi / English)
              </label>
              <textarea
                rows="5"
                value={settingsData.whatsapp_payout_template}
                onChange={(e) => setSettingsData({ ...settingsData, whatsapp_payout_template: e.target.value })}
                className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl font-sans text-xs leading-relaxed"
              ></textarea>
              <p className="text-[11px] text-slate-400 mt-1">
                Available tags: <code className="bg-slate-100 px-1 py-0.5 rounded">{'{CUSTOMER_NAME}'}</code>, <code className="bg-slate-100 px-1 py-0.5 rounded">{'{FD_NUMBER}'}</code>, <code className="bg-slate-100 px-1 py-0.5 rounded">{'{AMOUNT}'}</code>, <code className="bg-slate-100 px-1 py-0.5 rounded">{'{DUE_DATE}'}</code>, <code className="bg-slate-100 px-1 py-0.5 rounded">{'{BANK_NAME}'}</code>, <code className="bg-slate-100 px-1 py-0.5 rounded">{'{COMPANY_PHONE}'}</code>
              </p>
            </div>

            {/* Template 2: Maturity Reminder */}
            <div className="sm:col-span-2">
              <label className="block font-semibold text-slate-600 mb-1">
                FD Maturity Reminder Template (3 Din Pehle)
              </label>
              <textarea
                rows="5"
                value={settingsData.whatsapp_maturity_template}
                onChange={(e) => setSettingsData({ ...settingsData, whatsapp_maturity_template: e.target.value })}
                className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl font-sans text-xs leading-relaxed"
              ></textarea>
            </div>
          </div>

          <div className="pt-4 border-t border-slate-100 flex justify-end">
            <button
              type="submit"
              disabled={savingSettings}
              className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl shadow-lg shadow-emerald-600/30 transition text-xs cursor-pointer disabled:opacity-50"
            >
              {savingSettings ? 'Saving...' : 'Save WhatsApp Configuration'}
            </button>
          </div>
        </form>
      )}

    </div>
  );
}
