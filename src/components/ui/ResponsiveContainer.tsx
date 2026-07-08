/**
 * Responsive Container Component
 * Provides consistent padding and spacing across all pages
 */

import { ReactNode } from 'react';
import { clsx } from 'clsx';

interface ResponsiveContainerProps {
  children: ReactNode;
  className?: string;
  maxWidth?: 'sm' | 'md' | 'lg' | 'xl' | '2xl' | '7xl' | 'full';
  padding?: 'none' | 'sm' | 'md' | 'lg';
}

const maxWidthClasses = {
  sm: 'max-w-sm',
  md: 'max-w-md',
  lg: 'max-w-lg',
  xl: 'max-w-xl',
  '2xl': 'max-w-2xl',
  '7xl': 'max-w-7xl',
  full: 'max-w-full',
};

const paddingClasses = {
  none: '',
  sm: 'p-2 sm:p-3 md:p-4',
  md: 'p-3 sm:p-4 md:p-6',
  lg: 'p-4 sm:p-6 md:p-8',
};

export function ResponsiveContainer({
  children,
  className,
  maxWidth = '7xl',
  padding = 'md',
}: ResponsiveContainerProps) {
  return (
    <div
      className={clsx(
        'w-full mx-auto',
        maxWidthClasses[maxWidth],
        paddingClasses[padding],
        className
      )}
    >
      {children}
    </div>
  );
}

/**
 * Responsive Grid Component
 * Auto-adapts grid columns based on screen size
 */
interface ResponsiveGridProps {
  children: ReactNode;
  className?: string;
  cols?: {
    sm?: number;
    md?: number;
    lg?: number;
    xl?: number;
  };
  gap?: 'sm' | 'md' | 'lg';
}

const gapClasses = {
  sm: 'gap-2 sm:gap-3 md:gap-4',
  md: 'gap-3 sm:gap-4 md:gap-6',
  lg: 'gap-4 sm:gap-6 md:gap-8',
};

export function ResponsiveGrid({
  children,
  className,
  cols = { sm: 1, md: 2, lg: 3, xl: 3 },
  gap = 'md',
}: ResponsiveGridProps) {
  const gridCols = clsx(
    'grid',
    cols.sm && `grid-cols-${cols.sm}`,
    cols.md && `md:grid-cols-${cols.md}`,
    cols.lg && `lg:grid-cols-${cols.lg}`,
    cols.xl && `xl:grid-cols-${cols.xl}`,
  );

  return (
    <div className={clsx(gridCols, gapClasses[gap], className)}>
      {children}
    </div>
  );
}
