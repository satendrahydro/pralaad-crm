import React from 'react';
import { X, Globe, Mail, Code2, ShieldCheck, Phone } from 'lucide-react';

/**
 * Discreet software developer / technical vendor Contact Us modal.
 * Shown only from the Login/Logout footer and Profile menu — never on customer receipts or invoices.
 */
export default function DeveloperContactModal({ isOpen, onClose, contactPhone = '' }) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-xs flex justify-center items-center p-4 z-[240]">
      <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl border border-slate-200 overflow-hidden animate-fadeIn">
        <div className="px-5 py-4 bg-[#082e20] text-white flex items-center justify-between border-b border-emerald-800">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-[#D4AF37] text-[#062319] flex items-center justify-center font-black">
              <Code2 className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold tracking-tight">CraftedReach — Technical Support</h3>
              <p className="text-[11px] text-emerald-200">CRM Software Developer &amp; Maintenance Partner</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-emerald-200 hover:text-white hover:bg-white/10 transition cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-5 space-y-3.5 text-xs text-slate-700">
          <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-slate-500 font-medium">Developed By:</span>
              <span className="font-bold text-slate-900">CraftedReach (Satendra)</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-500 font-medium flex items-center gap-1.5">
                <Mail className="w-3.5 h-3.5 text-indigo-600" /> Support Email:
              </span>
              <a
                href="mailto:satendra@craftedreach.com"
                className="font-semibold text-indigo-700 hover:underline"
              >
                satendra@craftedreach.com
              </a>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-500 font-medium flex items-center gap-1.5">
                <Globe className="w-3.5 h-3.5 text-emerald-600" /> Website:
              </span>
              <a
                href="https://craftedreach.com"
                target="_blank"
                rel="noreferrer"
                className="font-semibold text-emerald-700 hover:underline"
              >
                craftedreach.com
              </a>
            </div>
            {contactPhone && (
              <div className="flex items-center justify-between">
                <span className="text-slate-500 font-medium flex items-center gap-1.5">
                  <Phone className="w-3.5 h-3.5 text-teal-600" /> Phone / WhatsApp:
                </span>
                <span className="font-mono font-bold text-slate-900">{contactPhone}</span>
              </div>
            )}
          </div>

          <div className="p-3 rounded-xl bg-emerald-50/70 border border-emerald-200 flex items-start gap-2 text-[11px] text-emerald-900">
            <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
            <span>
              For software licensing, custom banking modules, cloud hosting, or technical AMC support, reach out to CraftedReach. All customer receipts &amp; FD certificates remain 100% branded to your organization.
            </span>
          </div>

          <div className="flex justify-end pt-1">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-[#082e20] hover:bg-[#0a3d2b] text-white font-bold text-xs cursor-pointer"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
