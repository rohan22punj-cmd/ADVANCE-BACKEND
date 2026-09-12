import { cn } from '../../lib/utils';

function Card({ className, ...props }) {
  return <div className={cn('rounded-lg border border-slate-800 bg-slate-900/70 shadow-sm', className)} {...props} />;
}
function CardHeader({ className, ...props }) { return <div className={cn('flex flex-col gap-1 p-5', className)} {...props} />; }
function CardTitle({ className, ...props }) { return <h3 className={cn('text-base font-semibold text-slate-100', className)} {...props} />; }
function CardContent({ className, ...props }) { return <div className={cn('p-5 pt-0', className)} {...props} />; }

export { Card, CardHeader, CardTitle, CardContent };
