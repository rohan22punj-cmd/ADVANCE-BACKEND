import { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { ChevronLeft, ChevronRight, ReceiptText, Copy, Check, Filter, ShieldCheck, ArrowUpRight, ArrowDownLeft, Info, Search, Calendar, DollarSign, X } from 'lucide-react';
import { toast } from 'sonner';
import { api } from '../lib/api';
import { useLedger } from '../App';
import { formatMoney, shortId } from '../lib/utils';
import { Badge } from '../components/ui/badge';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Input, Label, Select } from '../components/ui/input';

function TransactionCard({ transaction, selectedAccount, currentAccountObj, copyText, copiedId }) {
  const fromAccId = String(transaction.fromAccount?._id || transaction.fromAccount);
  const toAccId = String(transaction.toAccount?._id || transaction.toAccount);
  const isOutgoing = fromAccId === selectedAccount;
  const isReversal = transaction.type === 'reversal';
  const counterpartyId = isOutgoing ? toAccId : fromAccId;
  const currency = currentAccountObj?.currency || 'INR';

  return (
    <Card className="border-banking-border hover:bg-banking-bg transition-colors">
      <CardContent className="p-4 space-y-3">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className={`grid h-6 w-6 place-items-center rounded-full text-xs font-bold ${
                isOutgoing
                  ? 'bg-debit-light text-debit border border-debit/30'
                  : 'bg-success-light text-success border border-success/30'
              }`}>
                {isOutgoing ? <ArrowUpRight size={13} /> : <ArrowDownLeft size={13} />}
              </span>
              <p className="text-xs font-medium text-banking-text">
                {isOutgoing ? 'Debit (Outgoing)' : 'Credit (Incoming)'}
              </p>
            </div>
            <p className="mt-1 font-mono text-[11px] text-banking-textLight">{shortId(counterpartyId)}</p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <span className={`font-semibold text-sm tabular-nums ${isOutgoing ? 'text-banking-text' : 'text-success'}`}>
              {isOutgoing ? '−' : '+'}{formatMoney(transaction.amount, currency)}
            </span>
            <Badge status={transaction.status} />
          </div>
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 pt-2 border-t border-banking-border text-[11px] text-banking-textLight">
          <div className="flex items-center gap-2">
            <Calendar size={12} />
            <span className="font-mono">
              {new Date(transaction.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
            </span>
            <span className="hidden sm:inline">•</span>
            <span className="font-mono">{new Date(transaction.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="font-mono truncate max-w-[140px]" title={transaction.idempotencyKey}>Key: {shortId(transaction.idempotencyKey)}</span>
            <button
              type="button"
              onClick={() => copyText(transaction._id, transaction._id)}
              className="text-banking-textLight hover:text-primary"
              title="Copy Transaction ID"
            >
              {copiedId === transaction._id ? <Check size={12} className="text-success" /> : <Copy size={12} />}
            </button>
          </div>
        </div>

        <div className="flex items-center justify-between pt-1 text-[11px] text-banking-textLight">
          <span className="font-mono text-banking-textMuted">{shortId(transaction._id)}</span>
          {transaction.status === 'reversed' ? (
            <span className="italic">Reversed</span>
          ) : (
            <span>—</span>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

export function TransactionsPage() {
  const { refreshAccounts } = useLedger();
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();

  const [accounts, setAccounts] = useState([]);
  const [selectedAccount, setSelectedAccount] = useState('');
  const [status, setStatus] = useState('');
  const [page, setPage] = useState(1);
  const [data, setData] = useState({ transactions: [], pagination: {} });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [copiedId, setCopiedId] = useState(null);

  // New filter states
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [minAmount, setMinAmount] = useState('');
  const [maxAmount, setMaxAmount] = useState('');
  const [type, setType] = useState('');
  const [search, setSearch] = useState('');

  // Sync URL query params to state on mount
  useEffect(() => {
    setStatus(searchParams.get('status') || '');
    setStartDate(searchParams.get('startDate') || '');
    setEndDate(searchParams.get('endDate') || '');
    setMinAmount(searchParams.get('minAmount') || '');
    setMaxAmount(searchParams.get('maxAmount') || '');
    setType(searchParams.get('type') || '');
    setSearch(searchParams.get('search') || '');
    const pg = searchParams.get('page');
    if (pg) setPage(parseInt(pg, 10));
  }, [searchParams]);

  // Helper to update URL without full reload
  function updateURL(params) {
    const newParams = new URLSearchParams(searchParams);
    Object.entries(params).forEach(([key, value]) => {
      if (value === '' || value === undefined || value === null) {
        newParams.delete(key);
      } else {
        newParams.set(key, value);
      }
    });
    // reset page to 1 when filters change (except page param)
    if (params.page === undefined) newParams.set('page', '1');
    setSearchParams(newParams, { replace: true });
  }

  useEffect(() => {
    api.accounts()
      .then(({ accounts: list }) => {
        setAccounts(list);
        if (list.length > 0) {
          const initial = searchParams.get('accountId') || list[0]._id;
          setSelectedAccount(initial);
        } else {
          setLoading(false);
        }
      })
      .catch(requestError => {
        setError(requestError.message);
        setLoading(false);
      });
  }, []);

  async function loadTransactions() {
    if (!selectedAccount) return;
    setLoading(true);
    setError('');
    try {
      const res = await api.transactions({
        accountId: selectedAccount,
        page,
        limit: 20,
        status: status || undefined,
        startDate: startDate || undefined,
        endDate: endDate || undefined,
        minAmount: minAmount || undefined,
        maxAmount: maxAmount || undefined,
        type: type || undefined,
        search: search || undefined
      });
      setData(res);
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadTransactions();
  }, [selectedAccount, page, status, startDate, endDate, minAmount, maxAmount, type, search]);

  function changeAccount(value) {
    setSelectedAccount(value);
    updateURL({ accountId: value, page: 1 });
  }

  function changeStatus(value) {
    setStatus(value);
    updateURL({ status: value, page: 1 });
  }

  function changePage(newPage) {
    setPage(newPage);
    updateURL({ page: newPage });
  }

  function handleFilterChange(key, value) {
    const params = { [key]: value };
    if (key === 'startDate') setStartDate(value);
    else if (key === 'endDate') setEndDate(value);
    else if (key === 'minAmount') setMinAmount(value);
    else if (key === 'maxAmount') setMaxAmount(value);
    else if (key === 'type') setType(value);
    else if (key === 'search') setSearch(value);
    updateURL({ ...params, page: 1 });
  }

  function clearFilters() {
    setStatus('');
    setStartDate('');
    setEndDate('');
    setMinAmount('');
    setMaxAmount('');
    setType('');
    setSearch('');
    updateURL({ status: '', startDate: '', endDate: '', minAmount: '', maxAmount: '', type: '', search: '', page: 1 });
  }

  function copyText(text, id) {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    toast.success('Copied to clipboard');
    setTimeout(() => setCopiedId(null), 2000);
  }

  const pagination = data.pagination || {};
  const currentAccountObj = accounts.find(a => a._id === selectedAccount);

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="font-heading text-2xl font-bold text-banking-text">Transaction History</h1>
          <p className="mt-1 text-sm text-banking-textMuted">Comprehensive, verifiable journal of every credit, debit, and double-entry reversal</p>
        </div>
      </div>

      {/* Account & Filter Controls */}
      <Card className="hover:shadow-cardHover transition-shadow">
        <CardContent className="p-5">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-6">
            {/* Account Selector */}
            <div className="space-y-1.5">
              <Label htmlFor="history-account">Target Account</Label>
              <Select
                id="history-account"
                value={selectedAccount}
                onChange={event => changeAccount(event.target.value)}
              >
                {accounts.map(account => (
                  <option key={account._id} value={account._id}>
                    {account.currency} — {shortId(account._id)}
                  </option>
                ))}
              </Select>
            </div>

            {/* Status Selector */}
            <div className="space-y-1.5">
              <Label htmlFor="history-status">Filter by Status</Label>
              <Select
                id="history-status"
                value={status}
                onChange={event => { setStatus(event.target.value); updateURL({ status: event.target.value, page: 1 }); }}
              >
                <option value="">All Statuses</option>
                <option value="completed">Completed (Committed)</option>
                <option value="reversed">Reversed (Offset)</option>
                <option value="pending">Pending</option>
                <option value="failed">Failed</option>
              </Select>
            </div>

            {/* Date Range */}
            <div className="space-y-1.5 sm:col-span-2 lg:col-span-2">
              <Label htmlFor="history-startDate">From Date</Label>
              <Input
                id="history-startDate"
                type="date"
                value={startDate}
                onChange={e => { setStartDate(e.target.value); updateURL({ startDate: e.target.value, page: 1 }); }}
                className="bg-white border-banking-border"
              />
            </div>
            <div className="space-y-1.5 sm:col-span-2 lg:col-span-2">
              <Label htmlFor="history-endDate">To Date</Label>
              <Input
                id="history-endDate"
                type="date"
                value={endDate}
                onChange={e => { setEndDate(e.target.value); updateURL({ endDate: e.target.value, page: 1 }); }}
                className="bg-white border-banking-border"
              />
            </div>

            {/* Amount Range */}
            <div className="space-y-1.5 sm:col-span-2 lg:col-span-2">
              <Label htmlFor="history-minAmount">Min Amount</Label>
              <Input
                id="history-minAmount"
                type="number"
                step="0.01"
                min="0"
                placeholder="0.00"
                value={minAmount}
                onChange={e => { setMinAmount(e.target.value); updateURL({ minAmount: e.target.value, page: 1 }); }}
                className="bg-white border-banking-border"
              />
            </div>
            <div className="space-y-1.5 sm:col-span-2 lg:col-span-2">
              <Label htmlFor="history-maxAmount">Max Amount</Label>
              <Input
                id="history-maxAmount"
                type="number"
                step="0.01"
                min="0"
                placeholder="999999"
                value={maxAmount}
                onChange={e => { setMaxAmount(e.target.value); updateURL({ maxAmount: e.target.value, page: 1 }); }}
                className="bg-white border-banking-border"
              />
            </div>

            {/* Type Filter */}
            <div className="space-y-1.5">
              <Label htmlFor="history-type">Direction</Label>
              <Select
                id="history-type"
                value={type}
                onChange={e => { setType(e.target.value); updateURL({ type: e.target.value, page: 1 }); }}
              >
                <option value="">All</option>
                <option value="incoming">Incoming (Credit)</option>
                <option value="outgoing">Outgoing (Debit)</option>
              </Select>
            </div>

            {/* Search */}
            <div className="space-y-1.5 sm:col-span-2 lg:col-span-2 flex items-end">
              <Label htmlFor="history-search" className="mb-1.5">Search Recipient</Label>
              <div className="relative w-full">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-banking-textMuted" size={18} />
                <Input
                  id="history-search"
                  type="text"
                  placeholder="Account ID or name..."
                  value={search}
                  onChange={e => { setSearch(e.target.value); updateURL({ search: e.target.value, page: 1 }); }}
                  className="pl-10 bg-white border-banking-border"
                />
                {search && (
                  <button
                    type="button"
                    onClick={() => { setSearch(''); updateURL({ search: '', page: 1 }); }}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-banking-textMuted hover:text-primary"
                    aria-label="Clear search"
                  >
                    <X size={18} />
                  </button>
                )}
              </div>
            </div>

            {/* Clear Filters */}
            <div className="flex items-end">
              <Button variant="outline" size="sm" onClick={clearFilters} className="w-full">
                <Filter className="mr-1.5" size={14} />
                Clear Filters
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Main Table / State */}
      <Card className="overflow-hidden hover:shadow-cardHover transition-shadow">
        <CardHeader className="border-b border-banking-border">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <CardTitle className="text-lg">Transactions for {currentAccountObj ? `${currentAccountObj.currency} — ${shortId(currentAccountObj._id)}` : 'Account'}</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {error ? (
            <div className="m-5 p-4 rounded-md border border-debit/30 bg-debit-light text-sm text-debit">
              {error}
            </div>
          ) : loading ? (
            <div className="p-6 space-y-3">
              {[1, 2, 3, 4, 5].map(i => (
                <div key={i} className="h-10 animate-pulse rounded-md border-banking-border bg-banking-bg" />
              ))}
            </div>
          ) : data.transactions.length === 0 ? (
            <div className="flex min-h-64 flex-col items-center justify-center p-8 text-center">
              <div className="grid h-12 w-12 place-items-center rounded-lg border-banking-border bg-banking-bg text-banking-textLight mb-3">
                <ReceiptText size={24} />
              </div>
              <p className="font-medium text-banking-text">No transactions found</p>
              <p className="mt-1 text-sm text-banking-textLight max-w-sm">
                Activity for account <span className="font-mono text-banking-textMuted">{shortId(selectedAccount)}</span> will appear here once transfers are executed.
              </p>
            </div>
          ) : (
            <>
              {/* Mobile Card Layout */}
              <div className="block md:hidden p-4 space-y-3">
                {data.transactions.map(transaction => (
                  <TransactionCard
                    key={transaction._id}
                    transaction={transaction}
                    selectedAccount={selectedAccount}
                    currentAccountObj={currentAccountObj}
                    copyText={copyText}
                    copiedId={copiedId}
                  />
                ))}
              </div>

              {/* Desktop Table Layout */}
              <div className="hidden md:block overflow-x-auto">
                <table className="w-full min-w-[700px] text-left text-sm">
                  <thead className="bg-banking-bg border-b border-banking-border text-xs uppercase tracking-wider text-banking-textMuted">
                    <tr>
                      <th className="px-5 py-3.5 font-medium">Date & Time</th>
                      <th className="px-5 py-3.5 font-medium">Transaction ID</th>
                      <th className="px-5 py-3.5 font-medium">Type & Counterparty</th>
                      <th className="px-5 py-3.5 font-medium text-right">Amount</th>
                      <th className="px-5 py-3.5 font-medium text-center">Status</th>
                      <th className="px-5 py-3.5 font-medium text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-banking-border">
                    {data.transactions.map(transaction => {
                      const fromAccId = String(transaction.fromAccount?._id || transaction.fromAccount);
                      const toAccId = String(transaction.toAccount?._id || transaction.toAccount);
                      const isOutgoing = fromAccId === selectedAccount;
                      const isReversal = transaction.type === 'reversal';
                      const counterpartyId = isOutgoing ? toAccId : fromAccId;
                      const currency = currentAccountObj?.currency || 'INR';

                      return (
                        <tr
                          key={transaction._id}
                          className="transition-colors hover:bg-banking-bg text-banking-text"
                        >
                          {/* Date */}
                          <td className="px-5 py-4 text-xs text-banking-textMuted whitespace-nowrap">
                            <p className="font-medium text-banking-text">
                              {new Date(transaction.createdAt).toLocaleDateString(undefined, {
                                month: 'short',
                                day: 'numeric',
                                year: 'numeric'
                              })}
                            </p>
                            <p className="text-[10px] text-banking-textLight font-mono">
                              {new Date(transaction.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </p>
                          </td>

                          {/* Tx ID & Idempotency Key */}
                          <td className="px-5 py-4">
                            <div className="flex items-center gap-1 font-mono text-xs text-banking-textMuted">
                              <span>{shortId(transaction._id)}</span>
                              <button
                                type="button"
                                onClick={() => copyText(transaction._id, transaction._id)}
                                className="text-banking-textLight hover:text-primary"
                                title="Copy Transaction ID"
                              >
                                {copiedId === transaction._id ? (
                                  <Check size={12} className="text-success" />
                                ) : (
                                  <Copy size={12} />
                                )}
                              </button>
                            </div>
                            <p className="text-[10px] text-banking-textLight font-mono truncate max-w-[140px]" title={transaction.idempotencyKey}>
                              Key: {shortId(transaction.idempotencyKey)}
                            </p>
                          </td>

                          {/* Flow & Counterparty */}
                          <td className="px-5 py-4">
                            <div className="flex items-center gap-2">
                              <span
                                className={`grid h-6 w-6 place-items-center rounded-full text-xs font-bold ${
                                  isOutgoing
                                    ? 'bg-debit-light text-debit border border-debit/30'
                                    : 'bg-success-light text-success border border-success/30'
                                }`}
                              >
                                {isOutgoing ? <ArrowUpRight size={13} /> : <ArrowDownLeft size={13} />}
                              </span>
                              <div>
                                <p className="text-xs font-medium text-banking-text">
                                  {isOutgoing ? 'Debit (Outgoing)' : 'Credit (Incoming)'}
                                </p>
                                <p className="font-mono text-[11px] text-banking-textLight">
                                  {shortId(counterpartyId)}
                                </p>
                              </div>
                            </div>
                          </td>

                          {/* Amount */}
                          <td className="px-5 py-4 text-right tabular-nums">
                            <span
                              className={`font-semibold text-sm ${
                                isOutgoing ? 'text-banking-text' : 'text-success'
                              }`}
                            >
                              {isOutgoing ? '−' : '+'}{formatMoney(transaction.amount, currency)}
                            </span>
                          </td>

                          {/* Status */}
                          <td className="px-5 py-4 text-center">
                            <Badge status={transaction.status} />
                          </td>

                          {/* Actions */}
                          <td className="px-5 py-4 text-right">
                            {transaction.status === 'reversed' ? (
                              <span className="text-[11px] text-banking-textLight italic">Reversed</span>
                            ) : (
                              <span className="text-[11px] text-banking-textLight">—</span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              <div className="flex items-center justify-between border-t border-banking-border px-5 py-4 bg-banking-bg">
                <p className="text-xs text-banking-textMuted">
                  Page <span className="font-medium text-banking-text">{pagination.page || 1}</span> of{' '}
                  <span className="font-medium text-banking-text">{Math.max(1, pagination.totalPages || 0)}</span>
                  <span className="hidden sm:inline"> ({pagination.total || 0} total records)</span>
                </p>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={!pagination.hasPrevPage}
                    onClick={() => changePage(pagination.page - 1)}
                    className="h-10 text-xs"
                  >
                    <ChevronLeft size={14} />
                    Previous
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={!pagination.hasNextPage}
                    onClick={() => changePage(pagination.page + 1)}
                    className="h-10 text-xs"
                  >
                    Next
                    <ChevronRight size={14} />
                  </Button>
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}