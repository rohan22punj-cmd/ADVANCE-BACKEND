import { cva } from 'class-variance-authority';
import { cn } from '../../lib/utils';

const buttonVariants = cva(
  'inline-flex h-10 items-center justify-center gap-2 rounded-md px-4 text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400 disabled:pointer-events-none disabled:opacity-50',
  {
    variants: {
      variant: {
        default: 'bg-cyan-400 text-slate-950 hover:bg-cyan-300',
        secondary: 'bg-slate-800 text-slate-100 hover:bg-slate-700',
        outline: 'border border-slate-700 bg-transparent text-slate-200 hover:bg-slate-800',
        ghost: 'text-slate-400 hover:bg-slate-800 hover:text-slate-100',
        destructive: 'bg-rose-500 text-white hover:bg-rose-400'
      },
      size: { default: '', sm: 'h-8 px-3 text-xs', icon: 'h-10 w-10 px-0' }
    },
    defaultVariants: { variant: 'default', size: 'default' }
  }
);

function Button({ className, variant, size, type = 'button', ...props }) {
  return <button type={type} className={cn(buttonVariants({ variant, size }), className)} {...props} />;
}

export { Button, buttonVariants };
