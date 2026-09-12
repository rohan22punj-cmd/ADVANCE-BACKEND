const API_URL = (import.meta.env.VITE_API_URL || '/api').replace(/\/$/, '');

export class ApiError extends Error {
  constructor(message, status, data) {
    super(message);
    this.status = status;
    this.data = data;
  }
}

async function request(path, options = {}) {
  const response = await fetch(`${API_URL}${path}`, {
    credentials: 'include',
    headers: { 'Content-Type': 'application/json', ...options.headers },
    ...options
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    if (response.status === 401) {
      window.dispatchEvent(new Event('ledger:unauthorized'));
    }
    throw new ApiError(data.message || 'Something went wrong. Please try again.', response.status, data);
  }
  return data;
}

export const api = {
  register: (body) => request('/auth/register', { method: 'POST', body: JSON.stringify(body) }),
  login: (body) => request('/auth/login', { method: 'POST', body: JSON.stringify(body) }),
  logout: () => request('/auth/logout', { method: 'POST' }),
  accounts: () => request('/accounts'),
  createAccount: (currency) => request('/accounts', { method: 'POST', body: JSON.stringify({ currency }) }),
  balance: (accountId) => request(`/accounts/${accountId}`),
  transfer: (body) => request('/transactions', { method: 'POST', body: JSON.stringify(body) }),
  demoFund: (accountId) => request('/demo/fund', { method: 'POST', body: JSON.stringify({ accountId }) }),
  transactions: ({ accountId, page = 1, limit = 10, status }) => {
    const params = new URLSearchParams({ accountId, page: String(page), limit: String(limit) });
    if (status) params.set('status', status);
    return request(`/transactions?${params}`);
  }
};
