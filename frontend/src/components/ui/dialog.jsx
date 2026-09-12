import { X } from 'lucide-react';
import { cn } from '../../lib/utils';

function Dialog({ open, onClose, children }) {
  if (!open) return null;
  return <div className="fixed inset-0 z-50 grid place-items-center bg-slate-950/80 p-4" role="dialog" aria-modal="true">
    <button className="absolute inset-0 cursor-default" aria-label="Close dialog" onClick={onClose} />
    <div className="relative z-10 w-full max-w-md rounded-lg border border-slate-700 bg-slate-900 p-6 shadow-2xl">{children}</div>
  </div>;
}
function DialogHeader({ className, ...props }) { return <div className={cn('mb-5 flex items-start justify-between', className)} {...props} />; }
function DialogTitle({ className, ...props }) { return <h2 className={cn('text-lg font-semibold text-slate-100', className)} {...props} />; }
function DialogClose({ onClick }) { return <button aria-label="Close" onClick={onClick} className="text-slate-400 hover:text-slate-100"><X size={20} /></button>; }

export { Dialog, DialogHeader, DialogTitle, DialogClose };
