'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Lock, LogIn, UserPlus } from 'lucide-react';
import { Button } from '@/components/ui';

export function AuthPromptModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const router = useRouter();

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [open, onClose]);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-[100] flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="auth-prompt-title"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <motion.div
            className="absolute inset-0 bg-black/70 backdrop-blur-sm"
            onClick={onClose}
          />

          <motion.div
            className="relative w-full max-w-md rounded-2xl border border-surface-700 bg-surface-900 shadow-2xl p-6 sm:p-8"
            initial={{ opacity: 0, scale: 0.95, y: 16 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 16 }}
            transition={{ duration: 0.2 }}
          >
            <button
              onClick={onClose}
              aria-label="Close"
              className="absolute right-4 top-4 text-surface-500 hover:text-surface-300 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="text-center space-y-4">
              <div className="mx-auto w-14 h-14 rounded-2xl bg-brand-500/10 border border-brand-500/30 flex items-center justify-center">
                <Lock className="w-7 h-7 text-brand-400" />
              </div>

              <div className="space-y-1.5">
                <h3 id="auth-prompt-title" className="font-display text-xl font-bold text-white">
                  Login Required
                </h3>
                <p className="text-sm text-surface-400">
                  Please log in or create a free account to continue with payment.
                </p>
              </div>
            </div>

            <div className="mt-7 space-y-3">
              <Button
                className="w-full py-3"
                icon={<LogIn className="w-4 h-4" />}
                onClick={() => router.push('/login')}
              >
                Log In
              </Button>
              <Button
                variant="outline"
                className="w-full py-3"
                icon={<UserPlus className="w-4 h-4" />}
                onClick={() => router.push('/login?mode=signup')}
              >
                Create an Account
              </Button>
            </div>

            <p className="mt-5 text-xs text-center text-surface-500">
              Your license key, active devices &amp; subscription are managed from your account.
            </p>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
