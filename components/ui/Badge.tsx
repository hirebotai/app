'use client';

import { forwardRef, HTMLAttributes } from 'react';
import { cn } from '@/lib/utils';

interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  variant?: 'default' | 'success' | 'warning' | 'danger' | 'info' | 'brand';
  size?: 'sm' | 'md' | 'lg';
  dot?: boolean;
}

export const Badge = forwardRef<HTMLSpanElement, BadgeProps>(
  ({ children, variant = 'default', size = 'md', dot = false, className, ...props }, ref) => {
    const variants = {
      default: 'bg-surface-700 text-surface-300 border border-surface-600',
      success: 'bg-green-500/15 text-green-400 border border-green-500/30',
      warning: 'bg-amber-500/15 text-amber-400 border border-amber-500/30',
      danger: 'bg-red-500/15 text-red-400 border border-red-500/30',
      info: 'bg-blue-500/15 text-blue-400 border border-blue-500/30',
      brand: 'bg-brand-500/15 text-brand-400 border border-brand-500/40',
    };

    const sizes = {
      sm: 'px-2 py-0.5 text-xs gap-1',
      md: 'px-3 py-1 text-sm gap-1.5',
      lg: 'px-4 py-1.5 text-base gap-2',
    };

    const dotColors = {
      default: 'bg-surface-400',
      success: 'bg-green-400',
      warning: 'bg-amber-400',
      danger: 'bg-red-400',
      info: 'bg-blue-400',
      brand: 'bg-brand-400',
    };

    return (
      <span
        ref={ref}
        className={cn(
          'inline-flex items-center font-semibold rounded-full border transition-colors',
          variants[variant],
          sizes[size],
          className
        )}
        {...props}
      >
        {dot && <span className={cn('rounded-full', dotColors[variant], size === 'sm' && 'h-1.5 w-1.5', size === 'md' && 'h-2 w-2', size === 'lg' && 'h-2.5 w-2.5')} />}
        {children}
      </span>
    );
  }
);

Badge.displayName = 'Badge';