'use client';

import { clsx } from 'clsx';
import { forwardRef } from 'react';

interface InputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'prefix'> {
  label?:string; error?:string; hint?:string;
  prefix?:React.ReactNode; suffix?:React.ReactNode; containerClassName?:string;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, hint, prefix, suffix, containerClassName, className, ...props }, ref) => (
    <div className={clsx('flex flex-col gap-1.5', containerClassName)}>
      {label && <label className="text-[#6B8A99] text-xs font-medium uppercase tracking-wider">{label}</label>}
      <div className="relative flex items-center">
        {prefix && <div className="absolute left-3 flex items-center pointer-events-none text-[#6B8A99]">{prefix}</div>}
        <input ref={ref} className={clsx(
          'w-full bg-[#0A1520] border rounded-xl text-white placeholder-[#3D5A6A]',
          'transition-all duration-150 h-11 px-4 text-sm sm:text-sm outline-none',
          'min-h-[48px] text-base sm:text-sm',
          'focus:ring-2',
          error
            ? 'border-[#EF4444]/50 focus:border-[#EF4444] focus:ring-[#EF4444]/15'
            : 'border-[#1B2A32] hover:border-[#253C48] focus:border-[#14B8A6]/50 focus:ring-[#14B8A6]/10',
          prefix && 'pl-10', suffix && 'pr-10', className
        )} {...props} />
        {suffix && <div className="absolute right-3 flex items-center pointer-events-none text-[#6B8A99]">{suffix}</div>}
      </div>
      {error && <p className="text-[#EF4444] text-xs">{error}</p>}
      {hint && !error && <p className="text-[#3D5A6A] text-xs">{hint}</p>}
    </div>
  )
);
Input.displayName = 'Input';

export function NumberInput({ value, onChange, symbol, label, usdValue, balance, onMax, max }: {
  value:string; onChange:(v:string)=>void; symbol?:string; max?:number;
  label?:string; usdValue?:string; balance?:string; onMax?:()=>void;
}) {
  return (
    <div className="bg-[#0A1520] border border-[#1B2A32] rounded-xl p-4 hover:border-[#253C48] transition-all focus-within:border-[#14B8A6]/40">
      <div className="flex items-center justify-between mb-2">
        <span className="text-[#6B8A99] text-xs">{label}</span>
        {balance && (
          <div className="flex items-center gap-1.5">
            <span className="text-[#3D5A6A] text-xs">Balance: {balance}</span>
            {onMax && <button onClick={onMax} className="text-[#2dd4bf] text-xs font-semibold hover:text-[#14B8A6]">MAX</button>}
          </div>
        )}
      </div>
      <div className="flex items-center gap-3">
        <input type="number" value={value} onChange={e => onChange(e.target.value)} placeholder="0.0" max={max}
          className="flex-1 w-full bg-transparent text-white text-xl sm:text-2xl font-semibold placeholder-[#1B2A32] outline-none min-w-0 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none" />
        {symbol && (
          <div className="flex items-center gap-1.5 bg-[#162535] border border-[#253C48] rounded-lg px-3 py-2 shrink-0">
            <span className="text-white text-sm font-semibold">{symbol}</span>
          </div>
        )}
      </div>
      {usdValue && <p className="text-[#3D5A6A] text-xs mt-1.5">≈ {usdValue}</p>}
    </div>
  );
}
