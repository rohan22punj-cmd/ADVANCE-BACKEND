const API_URL = (import.meta.env.VITE_API_URL || '/api').replace(/\/$/, '');

export class ApiError extends Error {
  constructor(message, status, data) {
    super(message);
    this.status = status;
    this.data = data;
  }
}

async function request(path, options = {}) {
  const url = `${API_URL}${path}`;
  // #region agent log
  fetch('http://127.0.0.1:7896/ingest/2b2c0b13-d65c-462e-b0c9-28761c706c36',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'a58762'},body:JSON.stringify({sessionId:'a58762',location:'api.js:request:start',message:'API request start',data:{url,method:options.method||'GET',apiUrl:API_URL},timestamp:Date.now(),hypothesisId:'D-E',runId:'pre-fix'})}).catch(()=>{});
  // #endregion
  const response = await fetch(url, {
    credentials: 'include',
    headers: { 'Content-Type': 'application/json', ...options.headers },
    ...options
  });

  const data = await response.json().catch(() => ({}));
  // #region agent log
  fetch('http://127.0.0.1:7896/ingest/2b2c0b13-d65c-462e-b0c9-28761c706c36',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'a58762'},body:JSON.stringify({sessionId:'a58762',location:'api.js:request:response',message:'API request response',data:{url,status:response.status,ok:response.ok,message:data?.message,setCookie:response.headers.get('set-cookie')!=null},timestamp:Date.now(),hypothesisId:'C-D-E',runId:'pre-fix'})}).catch(()=>{});
  // #endregion
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
