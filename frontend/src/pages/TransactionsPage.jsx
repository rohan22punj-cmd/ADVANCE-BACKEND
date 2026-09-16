import { useEffect, useState } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  ReceiptText,
  RotateCcw,
  Copy,
  Check,
  Filter,
  ShieldCheck,
  ArrowUpRight,
  ArrowDownLeft,
  Info
} from 'lucide-react';
import { toast } from 'sonner';
import { api } from '../lib/api';
import { useLedger } from '../App';
import { formatMoney, shortId } from '../lib/utils';
import { Badge } from '../components/ui/badge';
import { Button } from '../components/ui/button';
import { Card, CardContent } from '../components/ui/card';
import { Dialog, DialogClose, DialogHeader, DialogTitle } from '../components/ui/dialog';
import { Input, Label, Select } from '../components/ui/input';

export function TransactionsPage() {
  const { refreshAccounts } = useLedger();
  const [accounts, setAccounts] = useState([]);
  const [selectedAccount, setSelectedAccount] = useState('');
  const [status, setStatus] = useState('');
  const [page, setPage] = useState(1);
  const [data, setData] = useState({ transactions: [], pagination: {} });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [copiedId, setCopiedId] = useState(null);

  // Reversal Modal State
  const [reversalModalOpen, setReversalModalOpen] = useState(false);
  const [targetTx, setTargetTx] = useState(null);
  const [reversalReason, setReversalReason] = useState('Customer requested reversal / cancellation');
  const [reversing, setReversing] = useState(false);

  useEffect(() => {
    api.accounts()
      .then(({ accounts: list }) => {
        setAccounts(list);
        if (list.length > 0) {
          setSelectedAccount(list[0]._id);
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
        limit: 10,
        status: status || undefined
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
  }, [selectedAccount, page, status]);

  function changeAccount(value) {
    setSelectedAccount(value);
    setPage(1);
  }

  function changeStatus(value) {
    setStatus(value);
    setPage(1);
  }

  function copyText(text, id) {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    toast.success('Copied to clipboard');
    setTimeout(() => setCopiedId(null), 2000);
  }

  function openReversal(transaction) {
    setTargetTx(transaction);
    setReversalReason('Accidental transfer / Customer cancellation');
    setReversalModalOpen(true);
  }

  async function handleConfirmReversal(event) {
    event.preventDefault();
    if (!targetTx) return;
    setReversing(true);
    try {
      const idempotencyKey = crypto.randomUUID();
      await api.reverseTransaction(targetTx._id, {
        reason: reversalReason,
        idempotencyKey
      });
      toast.success('Transaction reversed! Offset ledger entries recorded.');
      setReversalModalOpen(false);
      refreshAccounts();
      loadTransactions();
    } catch (requestError) {
      toast.error(requestError.message);
    } finally {
      setReversing(false);
    }
  }

  const pagination = data.pagination || {};
  const currentAccountObj = accounts.find(a => a._id === selectedAccount);

  return (
    <div className="space-y-6">
      {/* Header */}
      <section className="flex flex-wrap items-end justify-between gap-4 border-b border-slate-800/80 pb-5">
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-cyan-500/20 bg-cyan-500/10 px-2.5 py-0.5 text-xs font-semibold text-cyan-300">
              <ShieldCheck size={13} className="text-cyan-400" />
              Immutable Audit Trail
            </span>
          </div>
          <h1 className="text-3xl font-bold tracking-tight text-white">Transaction History</h1>
          <p className="mt-1 text-sm text-slate-400">
            A comprehensive, verifiable journal of every credit, debit, and double-entry reversal.
          </p>
        </div>
      </section>

      {/* Account & Filter Controls */}
      <Card className="border-slate-800/80 bg-slate-900/80 shadow-md">
        <CardContent className="p-5">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {/* Account Selector */}
            <div className="space-y-1.5">
              <Label htmlFor="history-account" className="text-xs text-slate-300">Target Account</Label>
              <Select
                id="history-account"
                value={selectedAccount}
                onChange={event => changeAccount(event.target.value)}
                className="bg-slate-950 border-slate-800 text-sm"
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
              <Label htmlFor="history-status" className="text-xs text-slate-300">Filter by Status</Label>
              <Select
                id="history-status"
                value={status}
                onChange={event => changeStatus(event.target.value)}
                className="bg-slate-950 border-slate-800 text-sm"
              >
                <option value="">All Statuses</option>
                <option value="completed">Completed (Committed)</option>
                <option value="reversed">Reversed (Offset)</option>
                <option value="pending">Pending</option>
                <option value="failed">Failed</option>
              </Select>
            </div>

            {/* Quick Helper Badge */}
            <div className="hidden lg:flex flex-col justify-end">
              <div className="rounded-lg border border-slate-800 bg-slate-950/40 p-2.5 text-xs text-slate-400 flex items-center gap-2">
                <Info size={15} className="text-cyan-400 flex-shrink-0" />
                <span>Reversals write new inverse ledger entries without modifying past records.</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Main Table / State */}
      <Card className="border-slate-800/80 bg-slate-900/80 shadow-xl overflow-hidden">
        <CardContent className="p-0">
          {error ? (
            <div className="p-6 text-sm text-rose-300 bg-rose-500/10 border border-rose-500/20 m-5 rounded-lg">
              {error}
            </div>
          ) : loading ? (
            <div className="p-6 space-y-4">
              {[1, 2, 3, 4, 5].map(i => (
                <div key={i} className="h-12 animate-pulse rounded-md bg-slate-800/40" />
              ))}
            </div>
          ) : data.transactions.length === 0 ? (
            <div className="flex min-h-64 flex-col items-center justify-center p-8 text-center">
              <div className="grid h-12 w-12 place-items-center rounded-xl bg-slate-800/60 text-slate-500 mb-3">
                <ReceiptText size={24} />
              </div>
              <p className="font-semibold text-slate-200">No transactions found</p>
              <p className="mt-1 text-xs text-slate-500 max-w-sm">
                Activity for account <span className="font-mono text-slate-400">{shortId(selectedAccount)}</span> will appear here once transfers are executed.
              </p>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[700px] text-left text-sm">
                  <thead className="border-b border-slate-800/80 bg-slate-950/50 text-[11px] uppercase tracking-wider text-slate-400">
                    <tr>
                      <th className="px-5 py-3.5 font-semibold">Date & Time</th>
                      <th className="px-5 py-3.5 font-semibold">Transaction ID</th>
                      <th className="px-5 py-3.5 font-semibold">Type & Counterparty</th>
                      <th className="px-5 py-3.5 font-semibold text-right">Amount</th>
                      <th className="px-5 py-3.5 font-semibold text-center">Status</th>
                      <th className="px-5 py-3.5 font-semibold text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60">
                    {data.transactions.map(transaction => {
                      const fromAccId = String(transaction.fromAccount?._id || transaction.fromAccount);
                      const toAccId = String(transaction.toAccount?._id || transaction.toAccount);
                      const isOutgoing = fromAccId === selectedAccount;
                      const isReversal = transaction.type === 'reversal';
                      const counterpartyId = isOutgoing ? toAccId : fromAccId;
                      const currency = currentAccountObj?.currency || 'INR';
                      const isEligibleForReversal =
                        isOutgoing &&
                        transaction.status === 'completed' &&
                        !isReversal &&
                        fromAccId !== toAccId;

                      return (
                        <tr
                          key={transaction._id}
                          className="transition-colors hover:bg-slate-800/30 text-slate-300"
                        >
                          {/* Date */}
                          <td className="px-5 py-4 text-xs text-slate-400 whitespace-nowrap">
                            <p className="font-medium text-slate-200">
                              {new Date(transaction.createdAt).toLocaleDateString(undefined, {
                                month: 'short',
                                day: 'numeric',
                                year: 'numeric'
                              })}
                            </p>
                            <p className="text-[10px] text-slate-500 font-mono">
                              {new Date(transaction.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </p>
                          </td>

                          {/* Tx ID & Idempotency Key */}
                          <td className="px-5 py-4">
                            <div className="flex items-center gap-1 font-mono text-xs text-slate-300">
                              <span>{shortId(transaction._id)}</span>
                              <button
                                type="button"
                                onClick={() => copyText(transaction._id, transaction._id)}
                                className="text-slate-500 hover:text-cyan-300"
                                title="Copy Transaction ID"
                              >
                                {copiedId === transaction._id ? (
                                  <Check size={12} className="text-emerald-400" />
                                ) : (
                                  <Copy size={12} />
                                )}
                              </button>
                            </div>
                            <p className="text-[10px] text-slate-500 font-mono truncate max-w-[140px]" title={transaction.idempotencyKey}>
                              Key: {shortId(transaction.idempotencyKey)}
                            </p>
                          </td>

                          {/* Flow & Counterparty */}
                          <td className="px-5 py-4">
                            <div className="flex items-center gap-2">
                              <span
                                className={`grid h-6 w-6 place-items-center rounded-full text-xs font-bold ${
                                  isOutgoing
                                    ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                                    : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                                }`}
                              >
                                {isOutgoing ? <ArrowUpRight size={13} /> : <ArrowDownLeft size={13} />}
                              </span>
                              <div>
                                <p className="text-xs font-medium text-slate-200">
                                  {isOutgoing ? 'Debit (Outgoing)' : 'Credit (Incoming)'}
                                </p>
                                <p className="font-mono text-[11px] text-slate-500">
                                  {shortId(counterpartyId)}
                                </p>
                              </div>
                            </div>
                          </td>

                          {/* Amount */}
                          <td className="px-5 py-4 text-right">
                            <span
                              className={`font-bold text-sm ${
                                isOutgoing ? 'text-slate-200' : 'text-emerald-400'
                              }`}
                            >
                              {isOutgoing ? '−' : '+'}{formatMoney(transaction.amount, currency)}
                            </span>
                          </td>

                          {/* Status */}
                          <td className="px-5 py-4 text-center">
                            <Badge status={transaction.status} />
                          </td>

                          {/* Actions (Reverse Button) */}
                          <td className="px-5 py-4 text-right">
                            {isEligibleForReversal ? (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => openReversal(transaction)}
                                className="h-7 px-2.5 text-xs text-amber-300 border-amber-400/30 bg-amber-400/5 hover:bg-amber-400/15 hover:border-amber-400/50"
                              >
                                <RotateCcw size={12} className="mr-1" />
                                Reverse
                              </Button>
                            ) : transaction.status === 'reversed' ? (
                              <span className="text-[11px] text-slate-500 italic">Reversed</span>
                            ) : (
                              <span className="text-[11px] text-slate-600">—</span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              <div className="flex items-center justify-between border-t border-slate-800/80 px-5 py-4 bg-slate-950/40">
                <p className="text-xs text-slate-400">
                  Page <span className="font-semibold text-white">{pagination.page || 1}</span> of{' '}
                  <span className="font-semibold text-white">{Math.max(1, pagination.totalPages || 0)}</span>
                  <span className="hidden sm:inline"> ({pagination.total || 0} total records)</span>
                </p>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={!pagination.hasPrevPage}
                    onClick={() => setPage(current => current - 1)}
                    className="h-8 text-xs border-slate-800"
                  >
                    <ChevronLeft size={14} />
                    Previous
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={!pagination.hasNextPage}
                    onClick={() => setPage(current => current + 1)}
                    className="h-8 text-xs border-slate-800"
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

      {/* Reversal Confirmation Dialog */}
      <Dialog open={reversalModalOpen} onClose={() => setReversalModalOpen(false)}>
        <DialogHeader>
          <div>
            <DialogTitle className="text-lg text-white flex items-center gap-2">
              <RotateCcw size={18} className="text-amber-400" />
              Reverse Transaction
            </DialogTitle>
            <p className="mt-1 text-xs text-slate-400">
              Double-entry offset: This creates inverse debit & credit journal entries without mutating past ledger records.
            </p>
          </div>
          <DialogClose onClick={() => setReversalModalOpen(false)} />
        </DialogHeader>

        {targetTx && (
          <form onSubmit={handleConfirmReversal} className="space-y-4">
            <div className="rounded-lg border border-slate-800 bg-slate-950/70 p-3 space-y-2 text-xs">
              <div className="flex justify-between">
                <span className="text-slate-400">Amount to Refund:</span>
                <span className="font-bold text-amber-300">
                  {formatMoney(targetTx.amount, currentAccountObj?.currency || 'INR')}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Original Transaction:</span>
                <span className="font-mono text-slate-300">{shortId(targetTx._id)}</span>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="reversal-reason" className="text-xs text-slate-300">Reason for Reversal</Label>
              <Input
                id="reversal-reason"
                required
                value={reversalReason}
                onChange={e => setReversalReason(e.target.value)}
                placeholder="e.g., Accidental duplicate payment"
                className="bg-slate-950 border-slate-800 text-sm"
              />
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-slate-800">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setReversalModalOpen(false)}
                className="text-xs border-slate-700"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                size="sm"
                disabled={reversing}
                className="text-xs bg-amber-400 text-slate-950 font-semibold hover:bg-amber-300"
              >
                {reversing ? 'Reversing...' : 'Execute Reversal'}
              </Button>
            </div>
          </form>
        )}
      </Dialog>
    </div>
  );
}
