import { cva } from 'class-variance-authority';
import { cn } from '../../lib/utils';

const buttonVariants = cva(
  'inline-flex h-11 items-center justify-center gap-2 rounded-md px-4 text-sm font-medium transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary disabled:pointer-events-none disabled:opacity-50',
  {
    variants: {
      variant: {
        primary: 'bg-primary text-white hover:bg-primary-hover shadow-sm hover:shadow-md',
        secondary: 'bg-white text-primary border border-primary hover:bg-primary-light',
        outline: 'border border-banking-border bg-white text-banking-text hover:bg-banking-bg',
        ghost: 'text-banking-text hover:bg-banking-bg',
        destructive: 'bg-debit text-white hover:bg-[#A82020] shadow-sm',
      },
      size: { default: '', sm: 'h-10 px-3 text-xs', lg: 'h-12 px-6 text-base', icon: 'h-11 w-11 px-0' }
    },
    defaultVariants: { variant: 'primary', size: 'default' }
  }
);

function Button({ className, variant, size, type = 'button', ...props }) {
  return <button type={type} className={cn(buttonVariants({ variant, size }), className)} {...props} />;
}

export { Button, buttonVariants };