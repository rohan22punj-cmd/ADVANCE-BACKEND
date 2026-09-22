import { cn } from '../../lib/utils';

function Input({ className, ...props }) {
  return <input className={cn('flex h-11 w-full rounded-md border border-banking-border bg-white px-3 text-sm text-banking-text outline-none placeholder:text-banking-textLight focus:border-primary focus:ring-2 focus:ring-primary/15 disabled:cursor-not-allowed disabled:opacity-50 disabled:bg-banking-bg', className)} {...props} />;
}

function Select({ className, ...props }) {
  return <select className={cn('flex h-11 w-full rounded-md border border-banking-border bg-white px-3 text-sm text-banking-text outline-none focus:border-primary focus:ring-2 focus:ring-primary/15', className)} {...props}>{children}</select>;
}

function Label({ className, ...props }) {
  return <label className={cn('block mb-1.5 text-sm font-medium text-banking-text', className)} {...props} />;
}

export { Input, Select, Label };