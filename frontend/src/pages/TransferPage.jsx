import { useEffect, useMemo, useState } from 'react';
import {
  ArrowRight,
  Send,
  Zap,
  ShieldCheck,
  CheckCircle2,
  RefreshCw,
  Copy,
  Check,
  ReceiptText,
  AlertCircle
} from 'lucide-react';
import { useSearchParams, useNavigate } from 'react-router-dom';
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
  const navigate = useNavigate();

  const [accounts, setAccounts] = useState([]);
  const [balances, setBalances] = useState({});
  const [form, setForm] = useState({ fromAccountId: '', toAccountId: '', amount: '' });
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const [completedTx, setCompletedTx] = useState(null);
  const [copiedTxId, setCopiedTxId] = useState(false);
  const [currentIdempotencyKey, setCurrentIdempotencyKey] = useState(crypto.randomUUID());

  useEffect(() => {
    async function fetchAccounts() {
      setLoading(true);
      try {
        const { accounts: list } = await api.accounts();
        const balanceList = await Promise.all(list.map(account => api.balance(account._id)));
        setAccounts(list);
        setBalances(Object.fromEntries(balanceList.map(b => [b.accountId, b.balance])));

        const requestedSource = searchParams.get('from');
        if (list.some(account => account._id === requestedSource)) {
          setForm(current => ({ ...current, fromAccountId: requestedSource }));
        } else if (list.length > 0) {
          setForm(current => ({ ...current, fromAccountId: list[0]._id }));
        }
      } catch (requestError) {
        setError(requestError.message);
      } finally {
        setLoading(false);
      }
    }
    fetchAccounts();
  }, [searchParams]);

  const sourceAccount = useMemo(
    () => accounts.find(account => account._id === form.fromAccountId),
    [accounts, form.fromAccountId]
  );

  const destinationOptions = useMemo(
    () => accounts.filter(account => account._id !== form.fromAccountId && account.currency === sourceAccount?.currency),
    [accounts, form.fromAccountId, sourceAccount?.currency]
  );

  const sourceBalance = sourceAccount ? balances[sourceAccount._id] || 0 : 0;
  const numAmount = parseFloat(form.amount) || 0;
  const remainingSourceBalance = sourceBalance - numAmount;
  const isOverdrawn = numAmount > sourceBalance;

  async function submit(event) {
    event.preventDefault();
    if (isOverdrawn) {
      toast.error('Insufficient funds in source account');
      return;
    }
    setError('');
    setBusy(true);

    try {
      const idempotencyKey = currentIdempotencyKey;
      const res = await api.transfer({
        fromAccountId: form.fromAccountId,
        toAccountId: form.toAccountId,
        amount: Number(form.amount),
        idempotencyKey
      });

      toast.success('ACID Transfer completed and recorded in ledger.');
      setCompletedTx(res.transaction);
      refreshAccounts();
    } catch (requestError) {
      setError(requestError.message);
      toast.error(requestError.message);
      // Generate fresh idempotency key on error
      setCurrentIdempotencyKey(crypto.randomUUID());
    } finally {
      setBusy(false);
    }
  }

  function handleReset() {
    setCompletedTx(null);
    setForm(current => ({ ...current, toAccountId: '', amount: '' }));
    setCurrentIdempotencyKey(crypto.randomUUID());
  }

  function handleMaxAmount() {
    if (sourceBalance > 0) {
      setForm(current => ({ ...current, amount: String(sourceBalance) }));
    }
  }

  function handleQuickAmount(addValue) {
    const next = (parseFloat(form.amount) || 0) + addValue;
    if (next <= sourceBalance) {
      setForm(current => ({ ...current, amount: String(next) }));
    } else {
      setForm(current => ({ ...current, amount: String(sourceBalance) }));
    }
  }

  function copyTxId(id) {
    navigator.clipboard.writeText(id);
    setCopiedTxId(true);
    toast.success('Transaction ID copied to clipboard');
    setTimeout(() => setCopiedTxId(false), 2000);
  }

  const accountLabel = account =>
    `${account.currency} — ${shortId(account._id)} (Bal: ${formatMoney(balances[account._id] || 0, account.currency)})`;

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      {/* Header */}
      <section className="border-b border-slate-800/80 pb-5">
        <div className="flex items-center gap-2 mb-1.5">
          <span className="inline-flex items-center gap-1 rounded-full border border-cyan-500/20 bg-cyan-500/10 px-2.5 py-0.5 text-xs font-semibold text-cyan-300">
            <Zap size={13} className="text-cyan-400" />
            ACID Multi-Document Transfer
          </span>
        </div>
        <h1 className="text-3xl font-bold tracking-tight text-white">Execute Financial Transfer</h1>
        <p className="mt-1 text-sm text-slate-400">
          Every transfer atomically creates a Debit journal entry on sender and Credit journal entry on recipient under Redis mutex lock.
        </p>
      </section>

      {/* Success Receipt Card */}
      {completedTx ? (
        <Card className="border-emerald-500/30 bg-slate-900/90 shadow-2xl">
          <CardContent className="p-6 space-y-6">
            <div className="flex items-center gap-3">
              <div className="grid h-12 w-12 place-items-center rounded-xl bg-emerald-500/20 text-emerald-400">
                <CheckCircle2 size={26} />
              </div>
              <div>
                <h2 className="text-xl font-bold text-white">Transfer Completed Successfully</h2>
                <p className="text-xs text-slate-400">ACID multi-document transaction committed to WiredTiger replica set</p>
              </div>
            </div>

            <div className="rounded-lg border border-slate-800 bg-slate-950/70 p-4 space-y-3">
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-400">Transaction ID</span>
                <div className="flex items-center gap-1.5 font-mono text-slate-200">
                  <span>{completedTx._id}</span>
                  <button
                    type="button"
                    onClick={() => copyTxId(completedTx._id)}
                    className="text-slate-400 hover:text-cyan-300"
                  >
                    {copiedTxId ? <Check size={13} className="text-emerald-400" /> : <Copy size={13} />}
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-400">Transferred Amount</span>
                <span className="font-bold text-emerald-400 text-sm">
                  {formatMoney(completedTx.amount, sourceAccount?.currency || 'INR')}
                </span>
              </div>

              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-400">Idempotency Key</span>
                <span className="font-mono text-slate-400">{shortId(completedTx.idempotencyKey)}</span>
              </div>

              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-400">Status</span>
                <span className="inline-flex items-center rounded-full bg-emerald-500/10 px-2 py-0.5 text-xs font-semibold text-emerald-300 border border-emerald-500/20">
                  COMPLETED (2 Ledger Entries)
                </span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 pt-2">
              <Button
                variant="outline"
                onClick={handleReset}
                className="border-slate-700 text-slate-300 hover:bg-slate-800"
              >
                New Transfer
              </Button>
              <Button
                onClick={() => navigate('/transactions')}
                className="bg-cyan-400 text-slate-950 font-semibold hover:bg-cyan-300 flex items-center justify-center gap-1.5"
              >
                <ReceiptText size={16} />
                View in Activity
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        /* Transfer Form Card */
        <Card className="border-slate-800/80 bg-slate-900/80 shadow-xl">
          <CardHeader className="pb-4">
            <CardTitle className="text-lg text-slate-100">Transaction Parameters</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="space-y-4">
                <div className="h-10 animate-pulse rounded-md bg-slate-800/60" />
                <div className="h-10 animate-pulse rounded-md bg-slate-800/60" />
                <div className="h-10 animate-pulse rounded-md bg-slate-800/60" />
              </div>
            ) : accounts.length === 0 ? (
              <div className="text-center py-8 space-y-3">
                <AlertCircle className="mx-auto text-amber-400" size={32} />
                <p className="text-sm text-slate-300">No accounts found. Create accounts in Dashboard first.</p>
                <Button onClick={() => navigate('/dashboard')} size="sm">Go to Dashboard</Button>
              </div>
            ) : (
              <form onSubmit={submit} className="space-y-5">
                {/* From Account */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="from" className="text-xs text-slate-300">From Account (Source)</Label>
                    {sourceAccount && (
                      <span className="text-xs font-medium text-cyan-300">
                        Available: {formatMoney(sourceBalance, sourceAccount.currency)}
                      </span>
                    )}
                  </div>
                  <Select
                    id="from"
                    required
                    value={form.fromAccountId}
                    onChange={event => setForm({ ...form, fromAccountId: event.target.value, toAccountId: '' })}
                    className="bg-slate-950 border-slate-800 text-sm"
                  >
                    <option value="">Select source account</option>
                    {accounts.filter(acc => acc.status === 'active').map(acc => (
                      <option key={acc._id} value={acc._id}>
                        {accountLabel(acc)}
                      </option>
                    ))}
                  </Select>
                </div>

                {/* Arrow Divider */}
                <div className="flex justify-center text-slate-600">
                  <ArrowRight size={18} />
                </div>

                {/* To Account */}
                <div className="space-y-2">
                  <Label htmlFor="to" className="text-xs text-slate-300">To Account (Destination)</Label>
                  <Select
                    id="to"
                    required
                    disabled={!sourceAccount}
                    value={form.toAccountId}
                    onChange={event => setForm({ ...form, toAccountId: event.target.value })}
                    className="bg-slate-950 border-slate-800 text-sm disabled:opacity-50"
                  >
                    <option value="">Select destination account</option>
                    {destinationOptions.filter(acc => acc.status === 'active').map(acc => (
                      <option key={acc._id} value={acc._id}>
                        {accountLabel(acc)}
                      </option>
                    ))}
                  </Select>
                  {sourceAccount && destinationOptions.length === 0 && (
                    <p className="text-xs text-amber-400 bg-amber-400/10 p-2 rounded border border-amber-400/20">
                      ⚠️ You need another active {sourceAccount.currency} account to receive this transfer. Create one in Dashboard.
                    </p>
                  )}
                </div>

                {/* Amount */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="amount" className="text-xs text-slate-300">Amount ({sourceAccount?.currency || 'INR'})</Label>
                    {sourceBalance > 0 && (
                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => handleQuickAmount(50)}
                          className="rounded bg-slate-800 px-1.5 py-0.5 text-[10px] text-slate-300 hover:bg-slate-700"
                        >
                          +50
                        </button>
                        <button
                          type="button"
                          onClick={() => handleQuickAmount(100)}
                          className="rounded bg-slate-800 px-1.5 py-0.5 text-[10px] text-slate-300 hover:bg-slate-700"
                        >
                          +100
                        </button>
                        <button
                          type="button"
                          onClick={handleMaxAmount}
                          className="rounded bg-cyan-500/20 px-1.5 py-0.5 text-[10px] font-semibold text-cyan-300 hover:bg-cyan-500/30"
                        >
                          MAX
                        </button>
                      </div>
                    )}
                  </div>
                  <Input
                    id="amount"
                    required
                    min="0.01"
                    step="0.01"
                    type="number"
                    inputMode="decimal"
                    value={form.amount}
                    onChange={event => setForm({ ...form, amount: event.target.value })}
                    placeholder="0.00"
                    className={`bg-slate-950 border-slate-800 text-base font-semibold ${
                      isOverdrawn ? 'border-rose-500 focus:border-rose-500 text-rose-300' : ''
                    }`}
                  />
                  {numAmount > 0 && sourceAccount && (
                    <div className="flex justify-between text-[11px] pt-1 text-slate-400">
                      <span>Remaining balance after transfer:</span>
                      <span className={isOverdrawn ? 'text-rose-400 font-semibold' : 'text-slate-200'}>
                        {formatMoney(remainingSourceBalance, sourceAccount.currency)}
                      </span>
                    </div>
                  )}
                </div>

                {/* Idempotency & Concurrency Footnote */}
                <div className="rounded-lg border border-slate-800 bg-slate-950/50 p-3 space-y-1 text-xs text-slate-400">
                  <div className="flex items-center gap-2 text-cyan-300 font-medium">
                    <ShieldCheck size={15} />
                    <span>Double-Spend & Concurrency Guard</span>
                  </div>
                  <p className="text-[11px] text-slate-500">
                    Protected by Redis Mutex (<code className="text-slate-400">SET NX PX 5000</code>) and Idempotency key: <span className="font-mono text-slate-400">{shortId(currentIdempotencyKey)}</span>
                  </p>
                </div>

                {error && (
                  <p role="alert" className="rounded-md border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-xs text-rose-300">
                    {error}
                  </p>
                )}

                <Button
                  type="submit"
                  className="w-full bg-cyan-400 text-slate-950 font-semibold hover:bg-cyan-300"
                  disabled={busy || !form.toAccountId || !form.amount || isOverdrawn}
                >
                  {busy ? (
                    <span className="flex items-center gap-2">
                      <RefreshCw size={15} className="animate-spin" />
                      Acquiring Locks & Processing ACID Transaction...
                    </span>
                  ) : (
                    <span className="flex items-center gap-2">
                      Send {form.amount ? `${formatMoney(numAmount, sourceAccount?.currency || 'INR')}` : 'Transfer'}
                      <Send size={15} />
                    </span>
                  )}
                </Button>
              </form>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
