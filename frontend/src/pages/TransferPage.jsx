import { useEffect, useMemo, useState } from 'react';
import { ArrowRight, Send } from 'lucide-react';
import { useSearchParams } from 'react-router-dom';
import { toast } from 'sonner';
import { api } from '../lib/api';
import { useLedger } from '../App';
import { formatMoney, shortId } from '../lib/utils';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Input, Label, Select } from '../components/ui/input';

export function TransferPage() {
  const { refreshAccounts } = useLedger();
  const [searchParams] = useSearchParams();
  const [accounts, setAccounts] = useState([]);
  const [balances, setBalances] = useState({});
  const [form, setForm] = useState({ fromAccountId: '', toAccountId: '', amount: '' });
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => { (async () => {
    try {
      const { accounts: list } = await api.accounts();
      const balanceList = await Promise.all(list.map(account => api.balance(account._id)));
      setAccounts(list); setBalances(Object.fromEntries(balanceList.map(balance => [balance.accountId, balance.balance])));
      const requestedSource = searchParams.get('from');
      if (list.some(account => account._id === requestedSource)) {
        setForm(current => ({ ...current, fromAccountId: requestedSource }));
      }
    } catch (requestError) { setError(requestError.message); }
  })(); }, []);

  const source = useMemo(() => accounts.find(account => account._id === form.fromAccountId), [accounts, form.fromAccountId]);
  const destinationOptions = accounts.filter(account => account._id !== form.fromAccountId && account.currency === source?.currency);

  async function submit(event) {
    event.preventDefault(); setError(''); setBusy(true);
    try {
      const idempotencyKey = crypto.randomUUID();
      await api.transfer({ ...form, amount: Number(form.amount), idempotencyKey });
      toast.success('Transfer completed and recorded in the ledger.');
      setForm({ fromAccountId: '', toAccountId: '', amount: '' });
      refreshAccounts();
    } catch (requestError) { setError(requestError.message); }
    finally { setBusy(false); }
  }

  const accountLabel = account => `${account.currency} - ${shortId(account._id)}${balances[account._id] !== undefined ? ` (${formatMoney(balances[account._id], account.currency)})` : ''}`;

  return <div className="mx-auto max-w-2xl"><section className="mb-8"><p className="mb-2 text-sm font-medium text-cyan-300">Move money</p><h1 className="text-3xl font-semibold tracking-tight text-white">Create a transfer</h1><p className="mt-2 text-sm text-slate-400">Every completed transfer writes one debit and one credit entry.</p></section>
    <Card><CardHeader><CardTitle>Transfer details</CardTitle></CardHeader><CardContent><form onSubmit={submit} className="space-y-5"><div className="space-y-2"><Label htmlFor="from">From account</Label><Select id="from" required value={form.fromAccountId} onChange={event => setForm({ ...form, fromAccountId: event.target.value, toAccountId: '' })}><option value="">Select source account</option>{accounts.filter(account => account.status === 'active').map(account => <option key={account._id} value={account._id}>{accountLabel(account)}</option>)}</Select></div><div className="flex justify-center text-slate-600"><ArrowRight size={18} /></div><div className="space-y-2"><Label htmlFor="to">To account</Label><Select id="to" required disabled={!source} value={form.toAccountId} onChange={event => setForm({ ...form, toAccountId: event.target.value })}><option value="">Select destination account</option>{destinationOptions.filter(account => account.status === 'active').map(account => <option key={account._id} value={account._id}>{accountLabel(account)}</option>)}</Select>{source && destinationOptions.length === 0 && <p className="text-xs text-amber-300">No other active {source.currency} account is available to receive this transfer.</p>}</div><div className="space-y-2"><Label htmlFor="amount">Amount</Label><Input id="amount" required min="0.01" step="0.01" type="number" inputMode="decimal" value={form.amount} onChange={event => setForm({ ...form, amount: event.target.value })} placeholder="0.00" /></div>{error && <p role="alert" className="rounded-md border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-sm text-rose-300">{error}</p>}<Button type="submit" className="w-full" disabled={busy || !form.toAccountId}>{busy ? 'Sending transfer...' : 'Send transfer'}<Send size={16} /></Button></form></CardContent></Card>
  </div>;
}
