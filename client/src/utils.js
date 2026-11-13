export const getDefaultServerUrl = () => {
  const saved = localStorage.getItem('pralaad_server_url');
  if (saved) return saved.replace(/\/$/, '');
  // Global Live Cloud Tunnel (Works everywhere on Mobile Data & Wi-Fi)
  return 'https://reduces-newspapers-works-percent.trycloudflare.com';
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

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.message || 'Something went wrong');
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
