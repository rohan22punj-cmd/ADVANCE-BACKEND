import { cn } from '../../lib/utils';

function Card({ className, ...props }) {
  return <div className={cn('rounded-lg border border-banking-border bg-banking-card shadow-card', className)} {...props} />;
}

function CardHeader({ className, ...props }) {
  return <div className={cn('px-5 py-4 border-b border-banking-border', className)} {...props} />;
}

function CardTitle({ className, ...props }) {
  return <h3 className={cn('font-heading text-lg font-semibold text-banking-text', className)} {...props} />;
}

function CardContent({ className, ...props }) {
  return <div className={cn('p-5', className)} {...props} />;
}

export { Card, CardHeader, CardTitle, CardContent };