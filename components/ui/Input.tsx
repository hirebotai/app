'use client';

import { forwardRef, InputHTMLAttributes, TextareaHTMLAttributes, useId } from 'react';
import { cn } from '@/lib/utils';

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  hint?: string;
  iconLeft?: React.ReactNode;
  iconRight?: React.ReactNode;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, hint, iconLeft, iconRight, className, id: providedId, ...props }, ref) => {
    const generatedId = useId();
    const id = providedId || generatedId;
    const errorId = `${id}-error`;
    const hintId = `${id}-hint`;

    return (
      <div className="w-full">
        {label && (
          <label htmlFor={id} className="block text-sm font-medium text-surface-300 mb-2">
            {label}
          </label>
        )}
        <div className="relative">
          {iconLeft && (
            <div className="absolute left-4 top-1/2 -translate-y-1/2 text-surface-500 pointer-events-none">
              {iconLeft}
            </div>
          )}
          <input
            ref={ref}
            id={id}
            className={cn(
              'w-full bg-surface-900/50 border rounded-xl px-4 py-3 text-surface-50 placeholder-surface-500 transition-all duration-200',
              'focus:outline-none focus:ring-2 focus:ring-brand-500/50 focus:border-transparent',
              'disabled:opacity-50 disabled:cursor-not-allowed',
              'hover:border-surface-600',
              iconLeft ? 'pl-12' : '',
              iconRight ? 'pr-12' : '',
              error
                ? 'border-red-500/50 focus:ring-red-500/50'
                : 'border-surface-700',
              className
            )}
            aria-invalid={error ? 'true' : 'false'}
            aria-describedby={error ? errorId : hint ? hintId : undefined}
            {...props}
          />
          {iconRight && (
            <div className="absolute right-4 top-1/2 -translate-y-1/2 text-surface-500 pointer-events-none">
              {iconRight}
            </div>
          )}
        </div>
        {error && (
          <p id={errorId} className="mt-1.5 text-sm text-red-400 flex items-center gap-1" role="alert">
            <svg className="h-3.5 w-3.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
            {error}
          </p>
        )}
        {hint && !error && (
          <p id={hintId} className="mt-1.5 text-sm text-surface-500">
            {hint}
          </p>
        )}
      </div>
    );
  }
);

Input.displayName = 'Input';

export const Textarea = forwardRef<HTMLTextAreaElement, Omit<TextareaHTMLAttributes<HTMLTextAreaElement>, 'ref'> & InputProps>(
  ({ label, error, hint, className, id: providedId, ...props }, ref) => {
    const generatedId = useId();
    const id = providedId || generatedId;
    const errorId = `${id}-error`;
    const hintId = `${id}-hint`;

    return (
      <div className="w-full">
        {label && (
          <label htmlFor={id} className="block text-sm font-medium text-surface-300 mb-2">
            {label}
          </label>
        )}
        <textarea
          ref={ref}
          id={id}
          className={cn(
            'w-full bg-surface-900/50 border rounded-xl px-4 py-3 text-surface-50 placeholder-surface-500 transition-all duration-200 resize-none',
            'focus:outline-none focus:ring-2 focus:ring-brand-500/50 focus:border-transparent',
            'disabled:opacity-50 disabled:cursor-not-allowed',
            'hover:border-surface-600',
            error
              ? 'border-red-500/50 focus:ring-red-500/50'
              : 'border-surface-700',
            className
          )}
          aria-invalid={error ? 'true' : 'false'}
          aria-describedby={error ? errorId : hint ? hintId : undefined}
          {...props}
        />
        {error && (
          <p id={errorId} className="mt-1.5 text-sm text-red-400 flex items-center gap-1" role="alert">
            <svg className="h-3.5 w-3.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
            {error}
          </p>
        )}
        {hint && !error && (
          <p id={hintId} className="mt-1.5 text-sm text-surface-500">
            {hint}
          </p>
        )}
      </div>
    );
  }
);
Textarea.displayName = 'Textarea';

export const Label = forwardRef<HTMLLabelElement, React.LabelHTMLAttributes<HTMLLabelElement>>(
  ({ className, ...props }, ref) => (
    <label
      ref={ref}
      className={cn('block text-sm font-medium text-surface-300 mb-2', className)}
      {...props}
    />
  )
);
Label.displayName = 'Label';