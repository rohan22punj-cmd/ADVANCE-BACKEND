import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs) {
  return twMerge(clsx(inputs));
}

export function formatMoney(amount, currency = 'USD') {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    minimumFractionDigits: 2
  }).format(Number(amount || 0));
}

export function shortId(id) {
  return id ? `${id.slice(0, 6)}...${id.slice(-4)}` : 'Unknown account';
}
