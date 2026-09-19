import { X } from 'lucide-react';
import { cn } from '../../lib/utils';

function Dialog({ open, onClose, children }) {
  if (!open) return null;
  return <div className="fixed inset-0 z-50 grid place-items-center bg-black/30 p-4" role="dialog" aria-modal="true">
    <button className="absolute inset-0 cursor-default" aria-label="Close dialog" onClick={onClose} />
    <div className="relative z-10 w-full max-w-md rounded-lg border border-banking-border bg-white p-6 shadow-cardHover">{children}</div>
  </div>;
}

function DialogHeader({ className, ...props }) { return <div className={cn('mb-5 flex items-start justify-between', className)} {...props} />; }
function DialogTitle({ className, ...props }) { return <h2 className={cn('font-heading text-lg font-semibold text-banking-text', className)} {...props} />; }
function DialogClose({ onClick }) { return <button aria-label="Close" onClick={onClick} className="text-banking-textLight hover:text-banking-text"><X size={20} /></button>; }

export { Dialog, DialogHeader, DialogTitle, DialogClose };