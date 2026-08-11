'use client';

import React from 'react';

export const inputCls =
  'w-full bg-surface-950 border border-surface-700 rounded-xl py-2 px-3 text-sm text-white placeholder:text-surface-600 focus:outline-none focus:border-brand-400 transition-colors';

export const selectCls = `${inputCls} appearance-none pr-8`;

export const textareaCls = `${inputCls} resize-none`;

export function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <label className="block text-[11px] font-mono font-bold uppercase tracking-wider text-surface-400">
        {label}
      </label>
      {children}
      {hint && <p className="text-[11px] text-surface-500">{hint}</p>}
    </div>
  );
}

export function Modal({
  open,
  onClose,
  title,
  subtitle,
  children,
  footer,
  width = 'max-w-lg',
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  width?: string;
}) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={onClose} />
      <div
        className={`relative w-full ${width} max-h-[88vh] overflow-y-auto rounded-2xl border border-brand-500/30 bg-surface-900 p-6 space-y-5 shadow-2xl`}
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <h3 className="font-mono text-lg font-bold text-white">{title}</h3>
            {subtitle && <p className="text-xs text-surface-400 mt-1">{subtitle}</p>}
          </div>
          <button
            onClick={onClose}
            className="text-surface-400 hover:text-white text-lg leading-none shrink-0"
          >
            ✕
          </button>
        </div>
        {children}
        {footer && (
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-surface-800">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}

export function Select({
  value,
  onChange,
  children,
  className,
}: {
  value: string;
  onChange: (v: string) => void;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className="relative">
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={`${selectCls} ${className ?? ''}`}
      >
        {children}
      </select>
      <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-surface-500 text-xs">
        ▾
      </span>
    </div>
  );
}
