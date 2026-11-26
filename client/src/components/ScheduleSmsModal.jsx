import React, { useState } from 'react';
import { X, MessageSquare, Send, CheckCircle2, Users, Calendar } from 'lucide-react';
import { apiRequest } from '../utils';
import DateInput from './DateInput';

export default function ScheduleSmsModal({ isOpen, onClose }) {
  const [audience, setAudience] = useState('ALL_MEMBERS');
  const [template, setTemplate] = useState('PAYMENT_REMINDER');
  const [customText, setCustomText] = useState('Dear Member, your monthly deposit installment is due this week. Please deposit via your center advisor or branch.');
  const [scheduledDate, setScheduledDate] = useState(new Date().toISOString().split('T')[0]);
  const [loading, setLoading] = useState(false);
  const [statusMsg, setStatusMsg] = useState('');

  if (!isOpen) return null;

  const handleTemplateChange = (t) => {
    setTemplate(t);
    if (t === 'PAYMENT_REMINDER') {
      setCustomText('Dear Member, your monthly installment of ₹[AMOUNT] for account [ACC_NO] is due on [DUE_DATE]. - TARANGANJALI PRIVATE LIMITED');
    } else if (t === 'MATURITY_ALERT') {
      setCustomText('Dear Customer, your Fixed Deposit [FD_NO] will mature on [DATE]. Maturity payout of ₹[AMOUNT] is ready. - TARPL');
    } else if (t === 'CENTER_MEETING') {
      setCustomText('Notice: Weekly center collection meeting will be held at [TIME] at [CENTER_NAME]. Please attend with your passbook. - TARPL');
    } else {
      setCustomText('');
    }
  };

  const handleSend = async (e) => {
    e.preventDefault();
    setLoading(true);
    setStatusMsg('');

    try {
      const res = await apiRequest('/accounting/schedule-sms', {
        method: 'POST',
        body: JSON.stringify({
          audience,
          message_template: customText,
          scheduled_time: scheduledDate
        })
      });

      if (res && res.success) {
        setStatusMsg(res.message);
        setTimeout(() => {
          onClose();
        }, 1500);
      }
    } catch (err) {
      setStatusMsg(err.message || 'Failed to schedule SMS broadcast.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[200] flex justify-center items-start pt-16 pb-10 p-4 bg-slate-950/80 backdrop-blur-xs overflow-y-auto animate-fadeIn">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 bg-emerald-700 text-white flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <MessageSquare className="w-5 h-5 text-emerald-300" />
            <div>
              <h2 className="text-base font-black tracking-tight">Schedule SMS Broadcast</h2>
              <p className="text-[11px] text-emerald-200">DLT & Telecom Compliant Notification Dispatch</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-white/10 transition">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <form onSubmit={handleSend} className="p-6 space-y-4">
          {statusMsg && (
            <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-xs flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>{statusMsg}</span>
            </div>
          )}

          <div>
            <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">Target Audience</label>
            <select
              value={audience}
              onChange={(e) => setAudience(e.target.value)}
              className="w-full text-xs p-2.5 rounded-xl border border-slate-300 font-semibold text-slate-800"
            >
              <option value="ALL_MEMBERS">All Active Members & Depositors (1,690)</option>
              <option value="OVERDUE_COLLECTIONS">Members with Overdue Installments (5 accounts)</option>
              <option value="MATURING_THIS_MONTH">Depositors with FD Maturing This Month</option>
              <option value="ALL_ADVISORS">Field Associates & Advisors (16)</option>
              <option value="VEDIK_VIHAR_CENTER">Center: CEN001 - Vedik Vihar Group</option>
            </select>
          </div>

          <div>
            <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">SMS Template</label>
            <div className="grid grid-cols-3 gap-1.5 text-xs">
              {['PAYMENT_REMINDER', 'MATURITY_ALERT', 'CENTER_MEETING'].map(t => (
                <button
                  key={t}
                  type="button"
                  onClick={() => handleTemplateChange(t)}
                  className={`py-1.5 px-2 rounded-lg text-center font-bold text-[10px] transition ${
                    template === t ? 'bg-emerald-100 text-emerald-900 border border-emerald-300' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  {t.replace('_', ' ')}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">SMS Message Body</label>
            <textarea
              rows={3}
              value={customText}
              onChange={(e) => setCustomText(e.target.value)}
              className="w-full text-xs p-2.5 rounded-xl border border-slate-300 text-slate-800 font-medium"
              required
            />
            <span className="text-[10px] text-slate-400 block text-right mt-1">
              Characters: {customText.length} (1 SMS credit per 160 characters)
            </span>
          </div>

          <div>
            <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">Dispatch Date</label>
            <DateInput
              value={scheduledDate}
              onChange={(e) => setScheduledDate(e.target.value)}
              className="w-full text-xs p-2.5 rounded-xl border border-slate-300 font-semibold text-slate-800"
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl border border-slate-300 text-xs font-semibold text-slate-700 hover:bg-slate-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="inline-flex items-center gap-1.5 px-5 py-2 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs shadow-sm disabled:opacity-50"
            >
              <Send className="w-3.5 h-3.5" />
              <span>{loading ? 'Scheduling...' : 'Dispatch Broadcast'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
