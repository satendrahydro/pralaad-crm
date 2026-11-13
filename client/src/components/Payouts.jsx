import React, { useState, useEffect } from 'react';
import { 
  CalendarDays, 
  CheckCircle2, 
  Clock, 
  CreditCard, 
  Search, 
  Building2,
  Check
} from 'lucide-react';
import { formatINR, formatDate, apiRequest } from '../utils';

export default function Payouts() {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('PENDING'); // 'PENDING' | 'PAID' | 'ALL'

  const fetchPayouts = async () => {
    try {
      setLoading(true);
      const res = await apiRequest('/analytics/dashboard');
      // res.data.pendingPayouts
      setData(res.data.pendingPayouts || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPayouts();
  }, []);

  const handleMarkPaid = async (scheduleId) => {
    const ref = prompt('Enter Bank Transaction / NEFT / UTR Reference:', 'NEFT-' + Date.now());
    if (!ref) return;

    try {
      await apiRequest(`/fds/schedule/${scheduleId}/mark-paid`, {
        method: 'POST',
        body: JSON.stringify({
          payment_reference: ref,
          paid_date: new Date().toISOString().split('T')[0]
        })
      });
      alert('Payout recorded successfully.');
      fetchPayouts();
    } catch (err) {
      alert('Error updating payout: ' + err.message);
    }
  };

  const totalDue = data.reduce((acc, curr) => acc + (curr.payout_amount || 0), 0);

  return (
    <div className="space-y-6">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Interest Payout Register</h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Non-cumulative FDs ka monthly/quarterly interest payout calendar aur bank transfer record
          </p>
        </div>

        <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl text-right">
          <span className="text-[10px] uppercase font-bold text-emerald-700 block">Total Due Next 30 Days</span>
          <span className="text-xl font-black text-emerald-800">{formatINR(totalDue)}</span>
        </div>
      </div>

      {/* Payouts Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-4 bg-slate-50 border-b border-slate-200 flex justify-between items-center text-xs font-semibold">
          <span className="text-slate-800">Pending Periodic Interest Disbursements</span>
          <span className="text-slate-500">{data.length} Records</span>
        </div>

        {loading ? (
          <div className="py-20 text-center">
            <div className="inline-block w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
          </div>
        ) : data.length === 0 ? (
          <div className="py-16 text-center text-slate-400">
            <CalendarDays className="w-12 h-12 mx-auto stroke-1 mb-2 opacity-50" />
            <p className="font-semibold text-slate-700 text-sm">Koi pending payout nahi hai</p>
            <p className="text-xs mt-1">Sabhi non-cumulative payouts up-to-date hain.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-600 uppercase font-bold border-b border-slate-100">
                <tr>
                  <th className="py-3 px-4">Due Date</th>
                  <th className="py-3 px-4">FD Number</th>
                  <th className="py-3 px-4">Depositor Name</th>
                  <th className="py-3 px-4">Beneficiary Bank Details</th>
                  <th className="py-3 px-4 text-right">Payout Amount</th>
                  <th className="py-3 px-4 text-center">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                {data.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-50/80 transition">
                    <td className="py-3 px-4">
                      <span className="font-bold text-rose-700 block">{formatDate(item.payout_date)}</span>
                      <span className="text-[10px] text-slate-400">Period #{item.period_no}</span>
                    </td>

                    <td className="py-3 px-4 font-bold text-indigo-600">
                      {item.fd_number}
                    </td>

                    <td className="py-3 px-4 font-bold text-slate-900">
                      {item.customer_name}
                    </td>

                    <td className="py-3 px-4">
                      <div className="text-slate-800 font-semibold">{item.bank_name || 'Bank Not Added'}</div>
                      <div className="text-[11px] text-slate-500 font-mono">
                        A/c: {item.account_no || '-'} | IFSC: {item.ifsc_code || '-'}
                      </div>
                    </td>

                    <td className="py-3 px-4 text-right font-black text-emerald-700 text-sm">
                      {formatINR(item.payout_amount)}
                    </td>

                    <td className="py-3 px-4 text-center">
                      <button
                        onClick={() => handleMarkPaid(item.id)}
                        className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs shadow-sm transition flex items-center gap-1 mx-auto cursor-pointer"
                      >
                        <Check className="w-3.5 h-3.5" />
                        Mark as Paid
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

    </div>
  );
}
