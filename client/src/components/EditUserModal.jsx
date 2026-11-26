import React, { useState, useEffect } from 'react';
import { X, Pencil, User, Phone, Shield } from 'lucide-react';
import { apiRequest } from '../utils';

/**
 * Shared Edit Staff / Super Admin Profile Modal used across Settings and UserManagement
 * so Super Admin can directly rename Full Name, Username, Phone, or Role without creating a new account.
 */
export default function EditUserModal({ isOpen, user, isSelf = false, onClose, onSaved }) {
  const [fullName, setFullName] = useState('');
  const [username, setUsername] = useState('');
  const [phone, setPhone] = useState('');
  const [role, setRole] = useState('employee');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (isOpen && user) {
      setFullName(user.full_name || '');
      setUsername(user.username || '');
      setPhone(user.phone || '');
      setRole(user.role || 'employee');
    }
  }, [isOpen, user]);

  if (!isOpen || !user) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!fullName.trim() || !username.trim()) {
      alert('Full Name and Username are required.');
      return;
    }

    try {
      setSaving(true);
      const res = await apiRequest(`/users/${user.id}`, {
        method: 'PUT',
        body: JSON.stringify({
          full_name: fullName.trim(),
          username: username.trim().toLowerCase(),
          phone: phone.trim(),
          role
        })
      });

      if (res.user && isSelf) {
        localStorage.setItem('pralaad_fd_user', JSON.stringify(res.user));
        if (res.token) {
          localStorage.setItem('pralaad_fd_token', res.token);
        }
        window.dispatchEvent(new CustomEvent('pralaad_user_updated', { detail: res.user }));
      }

      if (onSaved) onSaved(res);
      if (onClose) onClose();
    } catch (err) {
      alert('Failed to update profile: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-xs flex justify-center items-start pt-16 pb-10 p-4 z-[200] overflow-y-auto">
      <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 animate-fadeIn">
        <div className="flex justify-between items-center mb-4 pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-purple-100 text-purple-700 flex items-center justify-center font-bold">
              <Pencil className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-slate-900 text-sm">
                Edit Profile ({user.role === 'admin' ? 'Super Admin' : 'Staff'})
              </h3>
              <p className="text-[11px] text-slate-500">
                नाम, यूज़रनेम व मोबाइल नंबर बदलें
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 p-1 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3.5 text-xs">
          <div>
            <label className="block font-semibold text-slate-700 mb-1">Full Name (पूरा नाम) *</label>
            <div className="relative">
              <User className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                required
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="e.g. Satendra"
                className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-900 focus:bg-white focus:ring-2 focus:ring-indigo-600"
              />
            </div>
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">Username / Login ID *</label>
            <input
              type="text"
              required
              value={username}
              onChange={(e) => setUsername(e.target.value.toLowerCase().replace(/\s+/g, ''))}
              placeholder="e.g. satendra"
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-mono text-xs font-bold text-slate-900 focus:bg-white focus:ring-2 focus:ring-indigo-600"
            />
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">Mobile Number</label>
            <div className="relative">
              <Phone className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="e.g. 9876543210"
                className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-medium focus:bg-white focus:ring-2 focus:ring-indigo-600"
              />
            </div>
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1 flex items-center gap-1.5">
              <Shield className="w-3.5 h-3.5 text-purple-600" />
              System Role
            </label>
            <select
              value={role}
              disabled={isSelf}
              onChange={(e) => setRole(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-semibold text-slate-800 disabled:opacity-60"
            >
              <option value="employee">Staff Member (Maker)</option>
              <option value="admin">Super Admin (Checker &amp; Owner)</option>
            </select>
            {isSelf && (
              <p className="text-[10px] text-slate-400 mt-1">
                सुरक्षा के लिए आप अपना सक्रिय Super Admin रोल डाउनग्रेड नहीं कर सकते।
              </p>
            )}
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 font-semibold text-slate-600 hover:bg-slate-100 rounded-xl cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl shadow-md transition cursor-pointer disabled:opacity-50"
            >
              {saving ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
