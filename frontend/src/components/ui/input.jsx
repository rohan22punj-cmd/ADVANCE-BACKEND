import { cn } from '../../lib/utils';

function Input({ className, ...props }) {
  return <input className={cn('flex h-10 w-full rounded-md border border-slate-700 bg-slate-950 px-3 text-sm text-slate-100 outline-none placeholder:text-slate-500 focus:border-cyan-400 focus:ring-2 focus:ring-cyan-400/20 disabled:cursor-not-allowed disabled:opacity-50', className)} {...props} />;
}

function Select({ className, children, ...props }) {
  return <select className={cn('flex h-10 w-full rounded-md border border-slate-700 bg-slate-950 px-3 text-sm text-slate-100 outline-none focus:border-cyan-400 focus:ring-2 focus:ring-cyan-400/20', className)} {...props}>{children}</select>;
}

function Label({ className, ...props }) { return <label className={cn('text-sm font-medium text-slate-300', className)} {...props} />; }

export { Input, Select, Label };
