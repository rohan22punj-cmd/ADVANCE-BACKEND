import { useEffect, useState } from 'react';
import { CirclePlus, RefreshCw, WalletCards, Copy, Check, ArrowUpRight, PlusCircle, ShieldAlert, Zap, Layers, Coins, Home, CreditCard, History, TrendingUp } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { api } from '../lib/api';
import { useLedger } from '../App';
import { formatMoney, shortId } from '../lib/utils';
import { Badge } from '../components/ui/badge';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
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
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="font-heading text-2xl font-bold text-banking-text">Dashboard</h1>
          <p className="mt-1 text-sm text-banking-textMuted">Real-time balance aggregation from immutable ledger audit trails</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="secondary" size="sm" onClick={loadAccounts} disabled={loading} aria-label="Refresh balances">
            <RefreshCw size={15} className={loading ? 'animate-spin' : ''} />
            Refresh
          </Button>
          <Button onClick={() => setModalOpen(true)} size="sm">
            <CirclePlus size={16} />
            Create Account
          </Button>
        </div>
      </div>

      {/* Summary KPI Cards */}
      <div className="grid gap-4 sm:grid-cols-3">
        <Card className="border-l-4 border-accent-navy hover:shadow-cardHover transition-shadow">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-banking-textMuted">Total Active Accounts</span>
              <div className="p-2 rounded-full bg-blue-50 text-primary">
                <WalletCards size={20} />
              </div>
            </div>
            <p className="mt-2 font-heading text-3xl font-bold text-accent-navy">{accounts.length}</p>
            <p className="mt-1 text-xs text-banking-textLight">Separated by currency pools</p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-primary hover:shadow-cardHover transition-shadow">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-banking-textMuted">INR Ledger Balance</span>
              <div className="p-2 rounded-full bg-brand-light text-primary">
                <Coins size={20} />
              </div>
            </div>
            <p className="mt-2 font-heading text-3xl font-bold text-primary">{formatMoney(totalBalanceINR, 'INR')}</p>
            <p className="mt-1 text-xs text-banking-textLight">Aggregate sum of credits − debits</p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-success hover:shadow-cardHover transition-shadow">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-banking-textMuted">Consistency Guarantee</span>
              <div className="p-2 rounded-full bg-success-light">
                <span className="h-2 w-2 rounded-full bg-success animate-pulse" />
              </div>
            </div>
            <p className="mt-2 font-medium text-success">ACID + Fast Idempotency</p>
            <p className="mt-1 text-xs text-banking-textLight">High-concurrency contention protection</p>
          </CardContent>
        </Card>
      </div>

      {error && (
        <div className="rounded-md border border-debit/30 bg-debit-light p-4 text-sm text-debit flex items-center gap-3">
          <ShieldAlert size={18} />
          <span>{error}</span>
        </div>
      )}

      {/* Accounts Grid */}
      {loading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map(item => (
            <Card key={item} className="animate-pulse h-44 border-banking-border bg-banking-bg" />
          ))}
        </div>
      ) : accounts.length === 0 ? (
        <Card className="border-dashed border-banking-border bg-banking-bg">
          <CardContent className="flex min-h-64 flex-col items-center justify-center text-center p-8">
            <div className="grid h-14 w-14 place-items-center rounded-lg bg-primary-light text-primary mb-4">
              <WalletCards size={28} />
            </div>
            <h2 className="text-lg font-semibold text-banking-text">No accounts created yet</h2>
            <p className="mt-1 max-w-md text-sm text-banking-textMuted">
              Create your first financial account to start transferring funds, testing idempotency, and observing ACID ledger journal entries.
            </p>
            <Button className="mt-5" onClick={() => setModalOpen(true)}>
              <PlusCircle size={16} />
              Open Your First Account
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {accounts.map(account => (
            <Card
              key={account._id}
              className="overflow-hidden border-banking-border bg-white transition-shadow hover:shadow-cardHover"
            >
              <CardContent className="p-5 flex flex-col justify-between h-full">
                {/* Top Row: Currency & Status */}
                <div>
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-heading text-lg font-semibold text-banking-text">
                          {account.currency} Account
                        </span>
                        <span className="rounded bg-banking-bg px-2 py-0.5 text-[10px] font-medium text-banking-textMuted uppercase">
                          v{account.version || 0}
                        </span>
                      </div>
                      <div className="mt-1 flex items-center gap-1.5">
                        <span className="font-mono text-xs text-banking-textLight">{shortId(account._id)}</span>
                        <button
                          type="button"
                          onClick={() => copyAccountId(account._id)}
                          className="text-banking-textLight hover:text-primary transition-colors"
                          title="Copy Full Account ID"
                        >
                          {copiedId === account._id ? (
                            <Check size={13} className="text-success" />
                          ) : (
                            <Copy size={13} />
                          )}
                        </button>
                      </div>
                    </div>
                    <Badge status={account.status} />
                  </div>

                  {/* Balance Display */}
                  <div className="mt-5">
                    <p className="text-xs font-medium uppercase tracking-wider text-banking-textMuted">Available Balance</p>
                    <p className="mt-1 font-heading text-3xl font-bold text-banking-text tabular-nums">
                      {formatMoney(account.balance, account.currency)}
                    </p>
                    <p className="mt-1 text-[11px] text-banking-textLight">
                      Calculated from {account.currency} ledger entries
                    </p>
                  </div>
                </div>

                {/* Actions */}
                <div className="mt-5 grid grid-cols-2 gap-2 pt-4 border-t border-banking-border">
                  <Button
                    variant="secondary"
                    size="sm"
                    disabled={fundingId === account._id}
                    onClick={() => addDemoFunds(account._id, account.currency)}
                    className="text-xs"
                  >
                    {fundingId === account._id ? (
                      <span className="flex items-center gap-1.5">
                        <span className="h-3 w-3 animate-spin rounded-full border-2 border-success border-t-transparent" />
                        Adding...
                      </span>
                    ) : (
                      <span className="flex items-center gap-1">
                        <PlusCircle size={13} className="text-success" />
                        +1,000 Funds
                      </span>
                    )}
                  </Button>

                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => navigate(`/transfer?from=${account._id}`)}
                    className="text-xs"
                  >
                    <span>Transfer</span>
                    <ArrowUpRight size={13} />
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
            <DialogTitle>Create New Account</DialogTitle>
            <p className="mt-1 text-sm text-banking-textMuted">
              Choose the denomination currency for this new ledger account.
            </p>
          </div>
          <DialogClose onClick={() => setModalOpen(false)} />
        </DialogHeader>

        <form onSubmit={createAccount} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="currency">Currency</Label>
            <Select
              id="currency"
              value={currency}
              onChange={event => setCurrency(event.target.value)}
            >
              {currencies.map(curr => (
                <option key={curr.code} value={curr.code}>
                  {curr.code} — {curr.name}
                </option>
              ))}
            </Select>
            <p className="text-[11px] text-banking-textLight">
              Transfers are restricted to accounts within the same currency to maintain ledger invariants.
            </p>
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-banking-border">
            <Button variant="outline" size="sm" onClick={() => setModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" size="sm" disabled={creating}>
              {creating ? 'Creating...' : 'Open Account'}
            </Button>
          </div>
        </form>
      </Dialog>
    </div>
  );
}