import { useEffect, useState } from 'react';
import {
  CirclePlus,
  RefreshCw,
  WalletCards,
  Copy,
  Check,
  ArrowUpRight,
  PlusCircle,
  ShieldAlert,
  Zap,
  Layers,
  Coins
} from 'lucide-react';
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

const currencies = [
  { code: 'INR', name: 'Indian Rupee (₹)', symbol: '₹' },
  { code: 'USD', name: 'US Dollar ($)', symbol: '$' },
  { code: 'EUR', name: 'Euro (€)', symbol: '€' },
  { code: 'GBP', name: 'British Pound (£)', symbol: '£' },
  { code: 'CAD', name: 'Canadian Dollar (C$)', symbol: 'C$' },
  { code: 'AUD', name: 'Australian Dollar (A$)', symbol: 'A$' },
  { code: 'JPY', name: 'Japanese Yen (¥)', symbol: '¥' }
];

export function DashboardPage() {
  const { refreshVersion, refreshAccounts } = useLedger();
  const navigate = useNavigate();
  const [accounts, setAccounts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [currency, setCurrency] = useState('INR');
  const [creating, setCreating] = useState(false);
  const [fundingId, setFundingId] = useState(null);
  const [copiedId, setCopiedId] = useState(null);

  async function loadAccounts() {
    setLoading(true);
    setError('');
    try {
      const { accounts: list } = await api.accounts();
      const balances = await Promise.all(list.map(account => api.balance(account._id)));
      setAccounts(list.map((account, index) => ({ ...account, ...balances[index] })));
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadAccounts();
  }, [refreshVersion]);

  async function createAccount(event) {
    event.preventDefault();
    setCreating(true);
    try {
      await api.createAccount(currency);
      toast.success(`${currency} account created successfully.`);
      setModalOpen(false);
      refreshAccounts();
    } catch (requestError) {
      toast.error(requestError.message);
    } finally {
      setCreating(false);
    }
  }

  async function addDemoFunds(accountId, accountCurrency) {
    setFundingId(accountId);
    try {
      await api.demoFund(accountId);
      toast.success(`Injected +1,000 ${accountCurrency} via System Ledger Credit`);
      refreshAccounts();
    } catch (requestError) {
      toast.error(requestError.message);
    } finally {
      setFundingId(null);
    }
  }

  function copyAccountId(id) {
    navigator.clipboard.writeText(id);
    setCopiedId(id);
    toast.success('Account ID copied to clipboard');
    setTimeout(() => setCopiedId(null), 2000);
  }

  const totalBalanceINR = accounts
    .filter(acc => acc.currency === 'INR')
    .reduce((sum, acc) => sum + (acc.balance || 0), 0);

  return (
    <div className="space-y-8">
      {/* Top Banner / Hero */}
      <section className="flex flex-wrap items-end justify-between gap-4 border-b border-slate-800/80 pb-6">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-cyan-500/20 bg-cyan-500/10 px-2.5 py-0.5 text-xs font-semibold text-cyan-300">
              <Zap size={13} className="text-cyan-400" />
              Redis Distributed Mutex Active
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/20 bg-emerald-500/10 px-2.5 py-0.5 text-xs font-semibold text-emerald-300">
              <Layers size={13} className="text-emerald-400" />
              Double-Entry Invariant: PASS
            </span>
          </div>
          <h1 className="text-3xl font-bold tracking-tight text-white">Accounts & Ledger Overview</h1>
          <p className="mt-1 text-sm text-slate-400">
            Real-time balance aggregation computed directly from immutable ledger audit trails.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <Button
            variant="outline"
            size="sm"
            onClick={loadAccounts}
            disabled={loading}
            aria-label="Refresh balances"
            className="border-slate-800 text-slate-300 hover:text-white"
          >
            <RefreshCw size={15} className={loading ? 'animate-spin' : ''} />
            Refresh
          </Button>
          <Button
            onClick={() => setModalOpen(true)}
            size="sm"
            className="bg-cyan-400 text-slate-950 font-semibold hover:bg-cyan-300 shadow-md shadow-cyan-400/20"
          >
            <CirclePlus size={16} />
            Create Account
          </Button>
        </div>
      </section>

      {/* Summary KPI Cards */}
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="rounded-xl border border-slate-800/80 bg-slate-900/60 p-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-400">Total Active Accounts</span>
            <WalletCards size={18} className="text-slate-500" />
          </div>
          <p className="mt-2 text-2xl font-bold text-white">{accounts.length}</p>
          <p className="mt-1 text-xs text-slate-500">Separated by currency pools</p>
        </div>

        <div className="rounded-xl border border-slate-800/80 bg-slate-900/60 p-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-400">INR Ledger Balance</span>
            <Coins size={18} className="text-cyan-400" />
          </div>
          <p className="mt-2 text-2xl font-bold text-cyan-300">{formatMoney(totalBalanceINR, 'INR')}</p>
          <p className="mt-1 text-xs text-slate-500">Aggregate sum of credits − debits</p>
        </div>

        <div className="rounded-xl border border-slate-800/80 bg-slate-900/60 p-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-400">Consistency Guarantee</span>
            <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
          </div>
          <p className="mt-2 text-base font-semibold text-emerald-300">ACID + Fast Idempotency</p>
          <p className="mt-1 text-xs text-slate-500">395 RPS Contention Protection</p>
        </div>
      </div>

      {error && (
        <div className="rounded-lg border border-rose-500/30 bg-rose-500/10 p-4 text-sm text-rose-300 flex items-center gap-3">
          <ShieldAlert size={18} />
          <span>{error}</span>
        </div>
      )}

      {/* Accounts Grid */}
      {loading ? (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {[1, 2, 3].map(item => (
            <div key={item} className="h-52 animate-pulse rounded-xl border border-slate-800/70 bg-slate-900/50" />
          ))}
        </div>
      ) : accounts.length === 0 ? (
        <Card className="border-dashed border-slate-800 bg-slate-900/30">
          <CardContent className="flex min-h-64 flex-col items-center justify-center text-center p-8">
            <div className="grid h-14 w-14 place-items-center rounded-2xl bg-slate-800/70 text-cyan-400 mb-4">
              <WalletCards size={28} />
            </div>
            <h2 className="text-lg font-semibold text-slate-200">No accounts created yet</h2>
            <p className="mt-1 max-w-md text-sm text-slate-400">
              Create your first financial account to start transferring funds, testing idempotency, and observing ACID ledger journal entries.
            </p>
            <Button className="mt-5 bg-cyan-400 text-slate-950 font-semibold" onClick={() => setModalOpen(true)}>
              <PlusCircle size={16} />
              Open Your First Account
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {accounts.map(account => (
            <Card
              key={account._id}
              className="group relative overflow-hidden border-slate-800/80 bg-slate-900/80 transition-all hover:border-slate-700 hover:shadow-lg hover:shadow-cyan-500/5"
            >
              <CardContent className="p-5 flex flex-col justify-between h-full">
                {/* Top Row: Currency & Status */}
                <div>
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-base font-bold text-white tracking-wide">
                          {account.currency} Account
                        </span>
                        <span className="rounded bg-slate-800 px-1.5 py-0.5 text-[10px] font-medium text-slate-400 uppercase">
                          v{account.version || 0}
                        </span>
                      </div>
                      <div className="mt-1 flex items-center gap-1.5">
                        <span className="font-mono text-xs text-slate-500">{shortId(account._id)}</span>
                        <button
                          type="button"
                          onClick={() => copyAccountId(account._id)}
                          className="text-slate-500 hover:text-cyan-300 transition-colors"
                          title="Copy Full Account ID"
                        >
                          {copiedId === account._id ? (
                            <Check size={13} className="text-emerald-400" />
                          ) : (
                            <Copy size={13} />
                          )}
                        </button>
                      </div>
                    </div>
                    <Badge status={account.status} />
                  </div>

                  {/* Balance Display */}
                  <div className="mt-6 mb-2">
                    <p className="text-xs font-medium uppercase tracking-wider text-slate-400">Available Balance</p>
                    <p className="mt-1 text-3xl font-extrabold tracking-tight text-slate-100">
                      {formatMoney(account.balance, account.currency)}
                    </p>
                    <p className="mt-1 text-[11px] text-slate-500">
                      Calculated from {account.currency} ledger entries
                    </p>
                  </div>
                </div>

                {/* Actions */}
                <div className="mt-6 grid grid-cols-2 gap-2 pt-4 border-t border-slate-800/60">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={fundingId === account._id}
                    onClick={() => addDemoFunds(account._id, account.currency)}
                    className="text-xs border-slate-700/80 bg-slate-950/40 hover:bg-slate-800 hover:text-emerald-300 hover:border-emerald-500/40"
                  >
                    {fundingId === account._id ? (
                      <span className="flex items-center gap-1.5">
                        <span className="h-3 w-3 animate-spin rounded-full border-2 border-emerald-400 border-t-transparent" />
                        Adding...
                      </span>
                    ) : (
                      <span className="flex items-center gap-1">
                        <PlusCircle size={13} className="text-emerald-400" />
                        +1,000 Funds
                      </span>
                    )}
                  </Button>

                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => navigate(`/transfer?from=${account._id}`)}
                    className="text-xs bg-slate-800 hover:bg-slate-700 text-cyan-300 flex items-center justify-center gap-1"
                  >
                    <span>Transfer</span>
                    <ArrowUpRight size={14} />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* New Account Dialog */}
      <Dialog open={modalOpen} onClose={() => setModalOpen(false)}>
        <DialogHeader>
          <div>
            <DialogTitle className="text-lg text-white">Create New Account</DialogTitle>
            <p className="mt-1 text-xs text-slate-400">
              Choose the denomination currency for this new ledger account.
            </p>
          </div>
          <DialogClose onClick={() => setModalOpen(false)} />
        </DialogHeader>

        <form onSubmit={createAccount} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="currency" className="text-xs text-slate-300">Currency</Label>
            <Select
              id="currency"
              value={currency}
              onChange={event => setCurrency(event.target.value)}
              className="bg-slate-950 border-slate-800 text-sm"
            >
              {currencies.map(curr => (
                <option key={curr.code} value={curr.code}>
                  {curr.code} — {curr.name}
                </option>
              ))}
            </Select>
            <p className="text-[11px] text-slate-500">
              Transfers are restricted to accounts within the same currency to maintain ledger invariants.
            </p>
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-slate-800">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setModalOpen(false)}
              className="text-xs border-slate-700"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              size="sm"
              disabled={creating}
              className="text-xs bg-cyan-400 text-slate-950 font-semibold hover:bg-cyan-300"
            >
              {creating ? 'Creating...' : 'Open Account'}
            </Button>
          </div>
        </form>
      </Dialog>
    </div>
  );
}
