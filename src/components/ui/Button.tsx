'use client';

import { forwardRef } from 'react';
import { clsx } from 'clsx';

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'success' | 'outline';
type Size    = 'xs' | 'sm' | 'md' | 'lg';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant; size?: Size; loading?: boolean;
  icon?: React.ReactNode; iconRight?: React.ReactNode; fullWidth?: boolean;
}

const variantClasses: Record<Variant, string> = {
  primary:   'bg-[#14B8A6] hover:bg-[#0d9488] text-white font-semibold border border-[#14B8A6]/60 hover:border-[#0d9488] shadow-sm',
  secondary: 'bg-[#111B22] hover:bg-[#162535] text-[#E2EAF0] border border-[#1B2A32] hover:border-[#253C48]',
  ghost:     'bg-transparent hover:bg-[#111B22] text-[#6B8A99] hover:text-[#E2EAF0] border border-transparent',
  danger:    'bg-[#EF4444]/10 hover:bg-[#EF4444]/20 text-[#EF4444] border border-[#EF4444]/25',
  success:   'bg-[#10B981]/10 hover:bg-[#10B981]/20 text-[#10B981] border border-[#10B981]/25',
  outline:   'bg-transparent hover:bg-[#111B22] text-[#E2EAF0] border border-[#1B2A32] hover:border-[#253C48]',
};

const sizeClasses: Record<Size, string> = {
  xs: 'h-7  px-3   text-xs  rounded-lg  gap-1.5',
  sm: 'h-8  px-3.5 text-sm  rounded-lg  gap-2',
  md: 'h-10 px-4   text-sm  rounded-xl  gap-2',
  lg: 'h-11 px-5   text-sm  rounded-xl  gap-2',
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ variant = 'primary', size = 'md', loading = false, icon, iconRight, fullWidth = false, className, children, disabled, ...props }, ref) => (
    <button ref={ref} disabled={disabled || loading}
      className={clsx(
        'inline-flex items-center justify-center transition-all duration-150 cursor-pointer select-none',
        'disabled:opacity-40 disabled:cursor-not-allowed disabled:pointer-events-none',
        'active:scale-[0.98] min-h-[44px] sm:min-h-[40px]',
        fullWidth ? 'w-full sm:w-auto' : 'sm:w-auto',
        variantClasses[variant], sizeClasses[size],
        fullWidth && 'w-full', className
      )} {...props}>
      {loading
        ? <svg className="animate-spin h-4 w-4 shrink-0" viewBox="0 0 24 24" fill="none">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
        : icon && <span className="shrink-0">{icon}</span>}
      {children && <span>{children}</span>}
      {iconRight && !loading && <span className="shrink-0 ml-auto">{iconRight}</span>}
    </button>
  )
);
Button.displayName = 'Button';
