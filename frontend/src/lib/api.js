let base = (import.meta.env.VITE_API_URL || '').replace(/\/$/, '');
if (!base) base = '/api';
else if (!base.endsWith('/api')) base = `${base}/api`;
const API_URL = base;

const TOKEN_KEY = 'ledger_access_token';
const USER_KEY = 'ledger_user';

function getToken() {
  return localStorage.getItem(TOKEN_KEY);
}

function setToken(token) {
  if (token) localStorage.setItem(TOKEN_KEY, token);
  else localStorage.removeItem(TOKEN_KEY);
}

function getUser() {
  const raw = localStorage.getItem(USER_KEY);
  try { return raw ? JSON.parse(raw) : null; } catch { return null; }
}

function setUser(user) {
  if (user) localStorage.setItem(USER_KEY, JSON.stringify(user));
  else localStorage.removeItem(USER_KEY);
}

export { getUser };

export class ApiError extends Error {
  constructor(message, status, data) {
    super(message);
    this.status = status;
    this.data = data;
  }
}

async function request(path, options = {}) {
  const url = `${API_URL}${path}`;
  const token = getToken();
  const headers = { 'Content-Type': 'application/json', ...options.headers };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const response = await fetch(url, {
    ...options,
    headers
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    if (response.status === 401) {
      setToken(null);
      window.dispatchEvent(new Event('ledger:unauthorized'));
    }
    throw new ApiError(data.message || 'Something went wrong. Please try again.', response.status, data);
  }
  return data;
}

export const api = {
  register: async (body) => {
    const data = await request('/auth/register', { method: 'POST', body: JSON.stringify(body) });
    if (data.accessToken) setToken(data.accessToken);
    if (data.user) setUser(data.user);
    return data;
  },
  login: async (body) => {
    const data = await request('/auth/login', { method: 'POST', body: JSON.stringify(body) });
    if (data.accessToken) setToken(data.accessToken);
    if (data.user) setUser(data.user);
    return data;
  },
  logout: () => {
    setToken(null);
    setUser(null);
    return request('/auth/logout', { method: 'POST' });
  },
  accounts: () => request('/accounts'),
  createAccount: (currency) => request('/accounts', { method: 'POST', body: JSON.stringify({ currency }) }),
  balance: (accountId) => request(`/accounts/${accountId}`),
  lookupAccount: (accountId) => request(`/accounts/lookup/${accountId}`),
  transfer: (body) => request('/transactions', { method: 'POST', body: JSON.stringify(body) }),
  demoFund: (accountId) => request('/demo/fund', { method: 'POST', body: JSON.stringify({ accountId }) }),
  reverseTransaction: (transactionId, body) => request(`/transactions/${transactionId}/reverse`, { method: 'POST', body: JSON.stringify(body) }),
  transactions: ({ accountId, page = 1, limit = 10, status } = {}) => {
    const params = new URLSearchParams();
    params.set('page', String(page));
    params.set('limit', String(limit));
    if (accountId) params.set('accountId', accountId);
    if (status) params.set('status', status);
    return request(`/transactions?${params.toString()}`);
  }
};
