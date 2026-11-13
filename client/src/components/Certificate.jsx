import React, { useState, useEffect } from 'react';
import { 
  X, 
  Printer, 
  Building2, 
  ShieldCheck, 
  Award, 
  CheckCircle2 
} from 'lucide-react';
import { formatINR, formatDate, COMPOUNDING_OPTIONS, apiRequest } from '../utils';

export default function Certificate({ fdId, isOpen, onClose }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (isOpen && fdId) {
      const fetchCert = async () => {
        try {
          setLoading(true);
          const res = await apiRequest(`/fds/${fdId}`);
          setData(res);
        } catch (err) {
          console.error('Error fetching certificate:', err);
        } finally {
          setLoading(false);
        }
      };
      fetchCert();
    }
  }, [isOpen, fdId]);

  if (!isOpen) return null;

  const handlePrint = () => {
    window.print();
  };

  const { fd, companySettings = {} } = data || {};
  const schemeObj = COMPOUNDING_OPTIONS.find(o => o.value === fd?.compounding_frequency);

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto print:p-0 print:bg-white">
      
      {/* Outer Modal Container */}
      <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 max-w-4xl w-full p-6 sm:p-10 relative my-8 print:border-none print:shadow-none print:m-0 print:p-4">
        
        {/* Floating Action Buttons (Hidden on Print) */}
        <div className="flex justify-between items-center mb-6 pb-4 border-b border-slate-100 print:hidden">
          <div className="flex items-center gap-2 text-xs text-slate-500">
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
            Official Fixed Deposit Certificate & Deposit Receipt
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl text-xs flex items-center gap-2 shadow-md transition cursor-pointer"
            >
              <Printer className="w-4 h-4" />
              Print Certificate (Ctrl+P)
            </button>
            <button
              onClick={onClose}
              className="p-2 rounded-full hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {loading || !data ? (
          <div className="py-20 text-center">
            <div className="inline-block w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
            <p className="text-xs text-slate-400 mt-2 font-medium">Generating certificate...</p>
          </div>
        ) : (
          /* Printable Certificate Box */
          <div 
            id="printable-certificate" 
            className="border-4 border-double border-indigo-950 p-8 sm:p-10 rounded-2xl bg-gradient-to-b from-amber-50/20 via-white to-amber-50/20 relative"
          >
            {/* Watermark Background */}
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-5">
              <Building2 className="w-96 h-96 text-slate-900" />
            </div>

            {/* Header */}
            <div className="text-center border-b-2 border-indigo-900/30 pb-6 mb-6">
              <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-indigo-950 text-amber-400 mb-2">
                <Award className="w-7 h-7" />
              </div>
              <h1 className="text-2xl sm:text-3xl font-serif font-black tracking-wide text-indigo-950 uppercase">
                {companySettings.company_name || 'PRALAAD WEALTH & FINANCIAL SERVICES'}
              </h1>
              <p className="text-xs font-semibold text-slate-600 tracking-wider uppercase mt-1">
                {companySettings.company_tagline || 'Fixed Deposit & Investment Management'}
              </p>
              <p className="text-[11px] text-slate-500 mt-1">
                {companySettings.address} • Phone: {companySettings.phone} • Lic: {companySettings.license_no}
              </p>

              <div className="mt-4 inline-block px-6 py-1.5 bg-indigo-950 text-amber-300 font-serif font-bold text-sm tracking-widest uppercase rounded shadow-sm">
                FIXED DEPOSIT CERTIFICATE & RECEIPT
              </div>
            </div>

            {/* Cert Meta Numbers */}
            <div className="flex justify-between items-center text-xs text-slate-700 mb-6 bg-slate-50 p-3 rounded-lg border border-slate-200">
              <div>
                <strong>Deposit Receipt No:</strong> <span className="font-mono font-bold text-indigo-900">{fd.fd_number}</span>
              </div>
              <div>
                <strong>Issue Date:</strong> <span className="font-semibold">{formatDate(fd.start_date)}</span>
              </div>
              <div>
                <strong>Customer ID:</strong> <span className="font-mono font-bold">{fd.customer_code}</span>
              </div>
            </div>

            {/* Customer Details Block */}
            <div className="mb-6">
              <h3 className="text-xs font-bold uppercase tracking-wider text-indigo-950 border-b border-indigo-950/20 pb-1 mb-2">
                1. Depositor & Nominee Information
              </h3>
              <div className="grid grid-cols-2 gap-x-6 gap-y-2 text-xs">
                <div>
                  <span className="text-slate-500">Name of Depositor:</span>{' '}
                  <strong className="text-slate-900 text-sm">{fd.customer_name}</strong>
                </div>
                <div>
                  <span className="text-slate-500">Contact Number:</span>{' '}
                  <span className="text-slate-800 font-semibold">{fd.customer_phone}</span>
                </div>
                <div>
                  <span className="text-slate-500">Permanent Account No (PAN):</span>{' '}
                  <span className="font-mono font-bold text-slate-900">{fd.customer_pan || 'Not Provided'}</span>
                </div>
                <div>
                  <span className="text-slate-500">Aadhaar Reference:</span>{' '}
                  <span className="font-mono text-slate-800">{fd.customer_aadhaar || 'Not Provided'}</span>
                </div>
                <div className="col-span-2">
                  <span className="text-slate-500">Registered Address:</span>{' '}
                  <span className="text-slate-800">{fd.customer_address || 'As per record'}</span>
                </div>
                <div>
                  <span className="text-slate-500">Nominee Name:</span>{' '}
                  <strong className="text-slate-900">{fd.nominee_name || 'None'}</strong>
                </div>
                <div>
                  <span className="text-slate-500">Nominee Relationship:</span>{' '}
                  <span className="text-slate-800">{fd.nominee_relation || '-'}</span>
                </div>
              </div>
            </div>

            {/* Deposit Details Table */}
            <div className="mb-6">
              <h3 className="text-xs font-bold uppercase tracking-wider text-indigo-950 border-b border-indigo-950/20 pb-1 mb-2">
                2. Deposit & Maturity Terms
              </h3>
              <table className="w-full text-xs border border-slate-300">
                <tbody>
                  <tr className="bg-slate-50 border-b border-slate-200">
                    <td className="py-2.5 px-3 font-semibold text-slate-600 w-1/3">Principal Deposit Amount:</td>
                    <td className="py-2.5 px-3 font-black text-slate-900 text-base">{formatINR(fd.principal_amount)}</td>
                  </tr>
                  <tr className="border-b border-slate-200">
                    <td className="py-2 px-3 font-semibold text-slate-600">Rate of Interest:</td>
                    <td className="py-2 px-3 font-bold text-emerald-700">{fd.annual_rate}% per annum</td>
                  </tr>
                  <tr className="bg-slate-50 border-b border-slate-200">
                    <td className="py-2 px-3 font-semibold text-slate-600">Deposit Scheme / Frequency:</td>
                    <td className="py-2 px-3 text-slate-800 font-medium">{schemeObj?.label || fd.compounding_frequency}</td>
                  </tr>
                  <tr className="border-b border-slate-200">
                    <td className="py-2 px-3 font-semibold text-slate-600">Deposit Tenure:</td>
                    <td className="py-2 px-3 font-semibold text-slate-900">{fd.tenure_months} Months ({fd.tenure_days || 0} Days)</td>
                  </tr>
                  <tr className="bg-slate-50 border-b border-slate-200">
                    <td className="py-2 px-3 font-semibold text-slate-600">Deposit Effective Date:</td>
                    <td className="py-2 px-3 text-slate-800">{formatDate(fd.start_date)}</td>
                  </tr>
                  <tr className="border-b border-slate-200">
                    <td className="py-2 px-3 font-semibold text-slate-600">Maturity Date:</td>
                    <td className="py-2 px-3 font-bold text-rose-700">{formatDate(fd.maturity_date)}</td>
                  </tr>
                  <tr className="bg-indigo-50/70 border-b border-indigo-200">
                    <td className="py-3 px-3 font-bold text-indigo-950">Total Maturity Value:</td>
                    <td className="py-3 px-3 font-black text-indigo-950 text-lg">{formatINR(fd.maturity_amount)}</td>
                  </tr>
                  {!fd.is_cumulative && (
                    <tr className="bg-amber-50">
                      <td className="py-2 px-3 font-semibold text-amber-900">Periodic Interest Payout:</td>
                      <td className="py-2 px-3 font-bold text-amber-900">{formatINR(fd.payout_amount)} per period</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Repayment Bank Account Details */}
            <div className="mb-6 bg-slate-50/80 p-3 rounded-lg border border-slate-200 text-xs">
              <span className="font-bold text-slate-700 block mb-1">Repayment / Interest Bank Account:</span>
              <div className="grid grid-cols-3 gap-2 text-slate-600">
                <div>Bank: <strong className="text-slate-800">{fd.bank_name || 'N/A'}</strong></div>
                <div>A/c No: <strong className="font-mono text-slate-800">{fd.account_no || 'N/A'}</strong></div>
                <div>IFSC: <strong className="font-mono text-slate-800">{fd.ifsc_code || 'N/A'}</strong></div>
              </div>
            </div>

            {/* Terms and Signatures */}
            <div className="pt-4 border-t border-slate-200 text-[10px] text-slate-500 space-y-1">
              <p className="font-semibold text-slate-700">Terms & Conditions:</p>
              <p>1. This deposit receipt is issued subject to the Rules & Regulations of the Organization and statutory guidelines.</p>
              <p>2. Premature liquidation is permitted subject to a 1% interest rate penalty as prescribed.</p>
              <p>3. Maturity proceeds shall be credited directly to the registered bank account upon maturity date.</p>
            </div>

            {/* Signatures */}
            <div className="mt-12 flex justify-between items-end pt-6">
              <div className="text-center">
                <div className="w-36 border-b border-slate-400 mb-1"></div>
                <span className="text-[11px] font-semibold text-slate-600">Depositor Signature</span>
              </div>

              {/* Official Seal Mock */}
              <div className="w-24 h-24 rounded-full border-2 border-dashed border-indigo-900/40 flex flex-col items-center justify-center text-[9px] uppercase font-bold text-indigo-900 text-center rotate-[-12deg]">
                <span>OFFICIAL</span>
                <span>★ SEAL ★</span>
                <span>VERIFIED</span>
              </div>

              <div className="text-center">
                <div className="w-36 border-b border-slate-400 mb-1"></div>
                <span className="text-[11px] font-semibold text-slate-600">Authorized Signatory</span>
                <span className="text-[10px] block text-slate-400">{companySettings.company_name}</span>
              </div>
            </div>

          </div>
        )}

      </div>
    </div>
  );
}
