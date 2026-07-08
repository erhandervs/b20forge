'use client';

import { clsx } from 'clsx';

interface CardProps {
  children: React.ReactNode; className?: string;
  hover?: boolean; padding?: 'none'|'sm'|'md'|'lg'; onClick?: () => void;
}

const paddingClasses = { none:'', sm:'p-3', md:'p-4', lg:'p-6' };

export function Card({ children, className, hover=false, padding='md', onClick }: CardProps) {
  return (
    <div onClick={onClick} className={clsx(
      'bg-[#111B22] border border-[#1B2A32] rounded-2xl transition-all duration-200',
      hover && 'hover:bg-[#152028] hover:border-[#253C48] cursor-pointer',
      onClick && 'cursor-pointer',
      paddingClasses[padding], className
    )}>{children}</div>
  );
}

export function StatCard({ label, value, change, sub, icon, color='teal' }: {
  label:string; value:string; change?:string; sub?:string;
  icon?:React.ReactNode; color?:'teal'|'green'|'red'|'purple'|'yellow';
}) {
  const cm = {
    teal:   { bg:'bg-[#14B8A6]/10', text:'text-[#2dd4bf]',  border:'border-[#14B8A6]/20' },
    green:  { bg:'bg-[#10B981]/10', text:'text-[#10B981]',  border:'border-[#10B981]/20' },
    red:    { bg:'bg-[#EF4444]/10', text:'text-[#EF4444]',  border:'border-[#EF4444]/20' },
    purple: { bg:'bg-[#A855F7]/10', text:'text-[#A855F7]',  border:'border-[#A855F7]/20' },
    yellow: { bg:'bg-[#F59E0B]/10', text:'text-[#F59E0B]',  border:'border-[#F59E0B]/20' },
  };
  const c = cm[color] ?? cm['teal'];
  const isPos = change?.startsWith('+');
  const isNeg = change?.startsWith('-');

  return (
    <div className="bg-[#111B22] border border-[#1B2A32] rounded-2xl p-4 sm:p-5 hover:border-[#253C48] transition-all duration-200">
      <div className="flex items-start justify-between mb-3">
        <p className="text-[#3D5A6A] text-xs font-medium uppercase tracking-wider">{label}</p>
        {icon && (
          <div className={clsx('w-8 h-8 rounded-lg flex items-center justify-center border shrink-0', c.bg, c.border)}>
            <span className={clsx('w-4 h-4', c.text)}>{icon}</span>
          </div>
        )}
      </div>
      <p className="text-white text-xl sm:text-2xl font-bold tracking-tight mb-1">{value}</p>
      <div className="flex items-center gap-2 flex-wrap">
        {change && (
          <span className={clsx('text-xs font-semibold px-1.5 py-0.5 rounded-md',
            isPos && 'text-[#10B981] bg-[#10B981]/10',
            isNeg && 'text-[#EF4444] bg-[#EF4444]/10',
            !isPos && !isNeg && 'text-[#6B8A99]'
          )}>{change}</span>
        )}
        {sub && <span className="text-[#3D5A6A] text-xs">{sub}</span>}
      </div>
    </div>
  );
}
