'use client';

import { clsx } from 'clsx';

type BadgeVariant = 'teal' | 'green' | 'red' | 'yellow' | 'purple' | 'gray' | 'blue' | 'base';

const variants: Record<BadgeVariant, string> = {
  teal:   'bg-[#14B8A6]/15 text-[#2dd4bf] border border-[#14B8A6]/25',
  blue:   'bg-[#14B8A6]/15 text-[#2dd4bf] border border-[#14B8A6]/25',
  base:   'bg-[#14B8A6]/15 text-[#2dd4bf] border border-[#14B8A6]/25',
  green:  'bg-[#10B981]/15 text-[#10B981] border border-[#10B981]/25',
  red:    'bg-[#EF4444]/15 text-[#EF4444] border border-[#EF4444]/25',
  yellow: 'bg-[#F59E0B]/15 text-[#F59E0B] border border-[#F59E0B]/25',
  purple: 'bg-[#A855F7]/15 text-[#A855F7] border border-[#A855F7]/25',
  gray:   'bg-[#1B2A32] text-[#6B8A99] border border-[#253C48]',
};

export function Badge({ children, variant = 'gray', dot = false, className }: {
  children: React.ReactNode; variant?: BadgeVariant; dot?: boolean; className?: string;
}) {
  return (
    <span className={clsx('inline-flex items-center gap-1.5 text-xs font-medium px-2 py-0.5 rounded-full', variants[variant], className)}>
      {dot && (
        <span className={clsx('w-1.5 h-1.5 rounded-full pulse-dot',
          variant === 'green'  ? 'bg-[#10B981]' :
          variant === 'red'    ? 'bg-[#EF4444]' : 'bg-[#2dd4bf]'
        )} />
      )}
      {children}
    </span>
  );
}

export function ChangeTag({ value }: { value: number }) {
  const positive = value >= 0;
  return (
    <span className={clsx('text-xs font-semibold px-1.5 py-0.5 rounded-md',
      positive ? 'text-[#10B981] bg-[#10B981]/10' : 'text-[#EF4444] bg-[#EF4444]/10'
    )}>
      {positive ? '+' : ''}{value.toFixed(2)}%
    </span>
  );
}
