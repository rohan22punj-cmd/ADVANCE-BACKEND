import { cn } from '../../lib/utils';

const tones = {
  active: 'border-success/30 bg-success-light text-success font-medium',
  frozen: 'border-accent-gold/30 bg-[#FEF9E7] text-accent-gold font-medium',
  closed: 'border-banking-border bg-banking-bg text-banking-textLight',
  pending: 'border-amber-400/30 bg-[#FEF9E7] text-amber-700 font-medium',
  completed: 'border-success/30 bg-success-light text-success font-medium',
  failed: 'border-debit/30 bg-debit-light text-debit font-medium',
  reversed: 'border-banking-border bg-banking-bg text-banking-textLight',
};

function Badge({ status, className, children }) {
  return <span className={cn('inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold capitalize', tones[status] || tones.closed, className)}>{children || status}</span>;
}

export { Badge };