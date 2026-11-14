export const getDefaultServerUrl = () => {
  const saved = localStorage.getItem('pralaad_server_url');
  if (saved && !saved.includes('trycloudflare.com') && !saved.includes('loca.lt')) {
    return saved.replace(/\/$/, '');
  }
  // Clear any old obsolete tunnel URL from previous session
  if (saved) {
    localStorage.removeItem('pralaad_server_url');
  }

  // If running inside Native Android App (Capacitor WebView)
  if (window.Capacitor || window.location.protocol === 'capacitor:' || window.location.protocol === 'file:') {
    return 'https://pralaad-fd-crm.onrender.com';
  }

  // In regular web browser (localhost or onrender.com) use relative /api
  return '';
};

export const getApiBase = () => {
  const base = getDefaultServerUrl();
  return base ? `${base}/api` : '/api';
};

export const API_BASE = getApiBase();

export function formatINR(val) {
  if (val === null || val === undefined || isNaN(val)) return '₹0';
  return '₹' + Number(val).toLocaleString('en-IN', {
    maximumFractionDigits: 2,
    minimumFractionDigits: 0
  });
}

export function formatDate(dateString) {
  if (!dateString) return '-';
  const d = new Date(dateString);
  if (isNaN(d.getTime())) return dateString;
  return d.toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric'
  });
}

export async function apiRequest(endpoint, options = {}) {
  const token = localStorage.getItem('pralaad_fd_token');
  const headers = {
    'Content-Type': 'application/json',
    ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
    ...(options.headers || {})
  };

  const response = await fetch(`${getApiBase()}${endpoint}`, {
    ...options,
    headers
  });

  if (response.status === 401) {
    localStorage.removeItem('pralaad_fd_token');
    localStorage.removeItem('pralaad_fd_user');
    window.location.reload();
    throw new Error('Session expired. Please login again.');
  }

  let data;
  const contentType = response.headers.get('content-type') || '';
  if (contentType.includes('application/json')) {
    data = await response.json();
  } else {
    const text = await response.text();
    data = { success: false, message: text || `Server error (${response.status})` };
  }

  if (!response.ok) {
    throw new Error(data.message || `Request failed with status ${response.status}`);
  }
  return data;
}

export const COMPOUNDING_OPTIONS = [
  { value: 'quarterly', label: 'Quarterly Compounding (Indian Standard Cumulative)', cumulative: true },
  { value: 'monthly', label: 'Monthly Compounding (Cumulative)', cumulative: true },
  { value: 'half_yearly', label: 'Half-Yearly Compounding (Cumulative)', cumulative: true },
  { value: 'yearly', label: 'Yearly Compounding (Cumulative)', cumulative: true },
  { value: 'simple', label: 'Simple Interest at Maturity', cumulative: true },
  { value: 'payout_monthly', label: 'Monthly Interest Payout (Non-Cumulative / Pension)', cumulative: false },
  { value: 'payout_quarterly', label: 'Quarterly Interest Payout (Non-Cumulative)', cumulative: false },
  { value: 'payout_half_yearly', label: 'Half-Yearly Interest Payout (Non-Cumulative)', cumulative: false },
  { value: 'payout_annual', label: 'Annual Interest Payout (Non-Cumulative)', cumulative: false }
];
