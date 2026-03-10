import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(amount: number, currency: string): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

export function formatDate(date: string): string {
  return new Date(date).toLocaleDateString('en-US', {
    year: 'numeric', month: 'short', day: 'numeric',
  });
}

export function formatDateTime(date: string): string {
  return new Date(date).toLocaleDateString('en-US', {
    year: 'numeric', month: 'short', day: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

export function generateId(): string {
  return Math.random().toString(36).substring(2, 15) + Date.now().toString(36);
}

export function providerColor(provider: string): string {
  return provider === 'uber' ? 'bg-black text-white' : 'bg-emerald-600 text-white';
}

export function providerLabel(provider: string): string {
  return provider === 'uber' ? 'Uber' : 'Bolt';
}

export function confidenceColor(confidence: number): string {
  if (confidence >= 0.9) return 'text-emerald-600';
  if (confidence >= 0.7) return 'text-amber-600';
  return 'text-red-500';
}

export function statusVariant(status: string): 'default' | 'secondary' | 'destructive' | 'warning' | 'success' {
  switch (status) {
    case 'parsed': return 'success';
    case 'review': return 'warning';
    case 'failed': return 'destructive';
    case 'duplicate': return 'secondary';
    default: return 'default';
  }
}

export function tagsToArray(csv: string): string[] {
  return csv ? csv.split(',').map(t => t.trim()).filter(Boolean) : [];
}

export function tagsToCSV(tags: string[]): string {
  return tags.join(',');
}
