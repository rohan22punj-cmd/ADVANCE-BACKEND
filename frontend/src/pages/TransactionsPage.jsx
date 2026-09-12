import { useEffect, useState } from 'react';
import { ChevronLeft, ChevronRight, ReceiptText } from 'lucide-react';
import { api } from '../lib/api';
import { formatMoney, shortId } from '../lib/utils';
import { Badge } from '../components/ui/badge';
import { Button } from '../components/ui/button';
import { Card, CardContent } from '../components/ui/card';
import { Label, Select } from '../components/ui/input';

export function TransactionsPage() {
  const [accounts, setAccounts] = useState([]);
  const [selectedAccount, setSelectedAccount] = useState('');
  const [status, setStatus] = useState('');
  const [page, setPage] = useState(1);
  const [data, setData] = useState({ transactions: [], pagination: {} });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => { api.accounts().then(({ accounts: list }) => { setAccounts(list); setSelectedAccount(list[0]?._id || ''); }).catch(requestError => { setError(requestError.message); setLoading(false); }); }, []);
  useEffect(() => {
    if (!selectedAccount) return;
    setLoading(true); setError('');
    api.transactions({ accountId: selectedAccount, page, limit: 10, status: status || undefined })
      .then(setData).catch(requestError => setError(requestError.message)).finally(() => setLoading(false));
  }, [selectedAccount, page, status]);

  function changeAccount(value) { setSelectedAccount(value); setPage(1); }
  function changeStatus(value) { setStatus(value); setPage(1); }
  const pagination = data.pagination || {};

  return <><section className="mb-8"><p className="mb-2 text-sm font-medium text-cyan-300">Audit trail</p><h1 className="text-3xl font-semibold tracking-tight text-white">Transaction history</h1><p className="mt-2 text-sm text-slate-400">A read-only view of completed and in-flight ledger activity.</p></section>
    <Card><CardContent className="p-5"><div className="mb-6 grid gap-4 sm:grid-cols-2"><div className="space-y-2"><Label htmlFor="history-account">Account</Label><Select id="history-account" value={selectedAccount} onChange={event => changeAccount(event.target.value)}>{accounts.map(account => <option key={account._id} value={account._id}>{account.currency} - {shortId(account._id)}</option>)}</Select></div><div className="space-y-2"><Label htmlFor="history-status">Status</Label><Select id="history-status" value={status} onChange={event => changeStatus(event.target.value)}><option value="">All statuses</option>{['pending', 'completed', 'failed', 'reversed'].map(value => <option key={value} value={value}>{value[0].toUpperCase() + value.slice(1)}</option>)}</Select></div></div>
        {error ? <div className="rounded-md border border-rose-500/30 bg-rose-500/10 p-4 text-sm text-rose-300">{error}</div> : loading ? <div className="h-72 animate-pulse rounded-md bg-slate-800/50" /> : data.transactions.length === 0 ? <div className="flex min-h-56 flex-col items-center justify-center text-center"><ReceiptText size={28} className="mb-3 text-slate-600" /><p className="font-medium text-slate-300">No transactions found</p><p className="mt-1 text-sm text-slate-500">Activity for this account will appear here.</p></div> : <><div className="overflow-x-auto"><table className="w-full min-w-[640px] text-left text-sm"><thead className="border-b border-slate-800 text-xs uppercase tracking-wide text-slate-500"><tr><th className="px-3 py-3 font-medium">Date</th><th className="px-3 py-3 font-medium">Amount</th><th className="px-3 py-3 font-medium">Counterparty</th><th className="px-3 py-3 font-medium">Status</th></tr></thead><tbody>{data.transactions.map(transaction => {
          const isOutgoing = String(transaction.fromAccount?._id || transaction.fromAccount) === selectedAccount;
          const counterparty = isOutgoing ? transaction.toAccount : transaction.fromAccount;
          const currency = (isOutgoing ? transaction.fromAccount : transaction.toAccount)?.currency || accounts.find(account => account._id === selectedAccount)?.currency || 'USD';
          return <tr key={transaction._id} className="border-b border-slate-800/70 last:border-0"><td className="px-3 py-4 text-slate-400">{new Date(transaction.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}</td><td className={`px-3 py-4 font-semibold ${isOutgoing ? 'text-slate-200' : 'text-emerald-300'}`}>{isOutgoing ? '-' : '+'}{formatMoney(transaction.amount, currency)}</td><td className="px-3 py-4"><p className="font-mono text-xs text-slate-300">{shortId(counterparty?._id || counterparty)}</p><p className="mt-1 text-xs text-slate-600">{isOutgoing ? 'Outgoing' : 'Incoming'}</p></td><td className="px-3 py-4"><Badge status={transaction.status} /></td></tr>;
        })}</tbody></table></div><div className="mt-5 flex items-center justify-between"><p className="text-sm text-slate-500">Page {pagination.page || 1} of {Math.max(1, pagination.totalPages || 0)} <span className="hidden sm:inline">- {pagination.total || 0} total</span></p><div className="flex gap-2"><Button variant="outline" size="sm" disabled={!pagination.hasPrevPage} onClick={() => setPage(current => current - 1)}><ChevronLeft size={16} />Previous</Button><Button variant="outline" size="sm" disabled={!pagination.hasNextPage} onClick={() => setPage(current => current + 1)}>Next<ChevronRight size={16} /></Button></div></div></>}
      </CardContent></Card>
  </>;
}
