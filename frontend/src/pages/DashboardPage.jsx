import { useEffect, useState } from 'react';
import { CirclePlus, RefreshCw, WalletCards } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { api } from '../lib/api';
import { useLedger } from '../App';
import { formatMoney, shortId } from '../lib/utils';
import { Badge } from '../components/ui/badge';
import { Button } from '../components/ui/button';
import { Card, CardContent } from '../components/ui/card';
import { Dialog, DialogClose, DialogHeader, DialogTitle } from '../components/ui/dialog';
import { Label, Select } from '../components/ui/input';

const currencies = ['USD', 'EUR', 'GBP', 'INR', 'JPY', 'CAD', 'AUD'];

export function DashboardPage() {
    const { refreshVersion, refreshAccounts } = useLedger();
  const navigate = useNavigate();
  const [accounts, setAccounts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [currency, setCurrency] = useState('USD');
  const [creating, setCreating] = useState(false);

  async function loadAccounts() {
    setLoading(true); setError('');
    try {
      const { accounts: list } = await api.accounts();
      const balances = await Promise.all(list.map(account => api.balance(account._id)));
      setAccounts(list.map((account, index) => ({ ...account, ...balances[index] })));
    } catch (requestError) { setError(requestError.message); }
    finally { setLoading(false); }
  }

  useEffect(() => { loadAccounts(); }, [refreshVersion]);

  async function createAccount(event) {
    event.preventDefault(); setCreating(true);
    try {
      await api.createAccount(currency);
      toast.success(`${currency} account created.`);
      setModalOpen(false); refreshAccounts();
    } catch (requestError) { toast.error(requestError.message); }
    finally { setCreating(false); }
  }

  async function addDemoFunds(accountId) {
    try {
      await api.demoFund(accountId);
      toast.success('Added 1,000 in demo funds.');
      refreshAccounts();
    } catch (requestError) { toast.error(requestError.message); }
  }

  return <>
    <section className="mb-8 flex flex-wrap items-end justify-between gap-4">
      <div><p className="mb-2 text-sm font-medium text-cyan-300">Accounts</p><h1 className="text-3xl font-semibold tracking-tight text-white">Your money, in focus.</h1><p className="mt-2 text-sm text-slate-400">Balances are calculated directly from immutable ledger entries.</p></div>
      <div className="flex gap-2"><Button variant="outline" size="icon" onClick={loadAccounts} aria-label="Refresh balances"><RefreshCw size={17} /></Button><Button onClick={() => setModalOpen(true)}><CirclePlus size={17} />New account</Button></div>
    </section>
    {error && <div className="rounded-md border border-rose-500/30 bg-rose-500/10 p-4 text-sm text-rose-300">{error}</div>}
    {loading ? <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">{[1, 2, 3].map(item => <div key={item} className="h-44 animate-pulse rounded-lg border border-slate-800 bg-slate-900" />)}</div> : accounts.length === 0 ? <Card className="border-dashed"><CardContent className="flex min-h-64 flex-col items-center justify-center text-center"><WalletCards className="mb-4 text-slate-600" size={34} /><h2 className="font-semibold text-slate-200">No accounts yet</h2><p className="mt-1 max-w-sm text-sm text-slate-500">Create an account to begin viewing ledger-backed balances.</p><Button className="mt-5" onClick={() => setModalOpen(true)}>Create account</Button></CardContent></Card> :
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">{accounts.map(account => <Card key={account._id} className="group border-slate-800 bg-slate-900 transition-colors hover:border-slate-600"><CardContent className="p-5"><div className="mb-7 flex items-start justify-between"><div><p className="text-sm font-medium text-slate-400">{account.currency} account</p><p className="mt-1 font-mono text-xs text-slate-600">{shortId(account._id)}</p></div><Badge status={account.status} /></div><p className="text-3xl font-semibold tracking-tight text-white">{formatMoney(account.balance, account.currency)}</p><p className="mt-2 text-xs text-slate-500">Live balance</p><div className="mt-5 grid grid-cols-2 gap-2"><Button variant="secondary" onClick={() => addDemoFunds(account._id)}>Add demo funds</Button><Button variant="outline" onClick={() => navigate(`/transfer?from=${account._id}`)}>Make payment</Button></div></CardContent></Card>)}</div>}
    <Dialog open={modalOpen} onClose={() => setModalOpen(false)}><DialogHeader><div><DialogTitle>New account</DialogTitle><p className="mt-1 text-sm text-slate-400">Choose the account currency.</p></div><DialogClose onClick={() => setModalOpen(false)} /></DialogHeader><form onSubmit={createAccount} className="space-y-5"><div className="space-y-2"><Label htmlFor="currency">Currency</Label><Select id="currency" value={currency} onChange={event => setCurrency(event.target.value)}>{currencies.map(value => <option key={value}>{value}</option>)}</Select></div><div className="flex justify-end gap-2"><Button variant="outline" onClick={() => setModalOpen(false)}>Cancel</Button><Button type="submit" disabled={creating}>{creating ? 'Creating...' : 'Create account'}</Button></div></form></Dialog>
  </>;
}
