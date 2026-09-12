import { cn } from '../../lib/utils';

const tones = {
  active: 'border-emerald-400/20 bg-emerald-400/10 text-emerald-300',
  frozen: 'border-amber-400/20 bg-amber-400/10 text-amber-300',
  closed: 'border-slate-600 bg-slate-800 text-slate-400',
  pending: 'border-amber-400/20 bg-amber-400/10 text-amber-300',
  completed: 'border-emerald-400/20 bg-emerald-400/10 text-emerald-300',
  failed: 'border-rose-400/20 bg-rose-400/10 text-rose-300',
  reversed: 'border-slate-600 bg-slate-800 text-slate-400'
};

function Badge({ status, className, children }) {
  return <span className={cn('inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-semibold capitalize', tones[status] || tones.closed, className)}>{children || status}</span>;
}

export { Badge };
