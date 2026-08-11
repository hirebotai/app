'use client';

import { Toaster as SonnerToaster, type ToasterProps } from 'sonner';

export function Toaster(props?: ToasterProps) {
  return (
    <SonnerToaster
      position="bottom-right"
      theme="dark"
      className="group"
      toastOptions={{
        classNames: {
          toast: 'group bg-surface-900 border border-surface-700 rounded-xl p-4 shadow-2xl',
          description: 'text-surface-400 text-sm',
          actionButton: 'bg-brand-600 hover:bg-brand-700 text-white',
          cancelButton: 'bg-surface-800 hover:bg-surface-700 text-surface-300',
          closeButton: 'text-surface-500 hover:text-surface-300',
          icon: 'text-brand-400',
        },
      }}
      {...props}
    />
  );
}

export { toast } from 'sonner';