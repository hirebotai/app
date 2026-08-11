'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui';
import { toast } from 'sonner';
import { createClient } from '@/lib/supabase/client';
import { useSession } from '@/lib/hooks/useSession';
import { Menu, X, Download, Sparkles, User, LogOut } from 'lucide-react';

const navigation = [
  { name: 'Home', href: '/' },
  { name: 'How It Works', href: '/instructions' },
  { name: 'Features', href: '/features' },
  { name: 'Pricing', href: '/pricing' },
  { name: 'Download', href: '/download' },
  { name: 'Support', href: '/support' },
];

export function Header() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const { user, loading } = useSession();
  const router = useRouter();

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const handleSignOut = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    toast.success('Signed out successfully');
    router.push('/');
    router.refresh();
  };

  const accountButton = loading ? null : user ? (
    <div className="flex items-center gap-2">
      <Link href="/dashboard" className="hidden sm:inline-flex">
        <Button variant="ghost" size="sm" icon={<User className="w-4 h-4" />}>
          Account
        </Button>
      </Link>
      <button
        onClick={handleSignOut}
        className="hidden sm:inline-flex items-center justify-center px-3 py-1.5 rounded-lg text-xs font-mono text-surface-300 hover:text-white hover:bg-surface-800/60 border border-transparent hover:border-surface-700 transition-colors"
        aria-label="Sign out"
      >
        <LogOut className="w-4 h-4 mr-1.5" />
        Log Out
      </button>
    </div>
  ) : (
    <Link href="/login" className="hidden sm:inline-flex">
      <Button variant="ghost" size="sm">
        Log In
      </Button>
    </Link>
  );

  return (
    <header
      className={cn(
        'fixed top-0 left-0 right-0 z-50 transition-all duration-300',
        scrolled
          ? 'bg-surface-950/85 backdrop-blur-md border-b border-white/10'
          : 'bg-transparent border-b border-transparent'
      )}
    >
      <div className={cn('h-px w-full bg-gradient-to-r from-transparent via-brand-500/60 to-transparent transition-opacity duration-300', scrolled ? 'opacity-100' : 'opacity-0')} />
      <nav className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8" aria-label="Main navigation">
        <div className="flex h-16 items-center justify-between">
          <div className="flex items-center gap-10">
            <Link href="/" className="flex items-center group py-1" aria-label="Hirebotai Home">
              <img
                src="/logo.png"
                alt="Hirebotai Logo"
                className="w-[90px] h-[90px] sm:w-[108px] sm:h-[108px] object-contain animate-float drop-shadow-[0_0_28px_rgba(0,229,255,0.8)] group-hover:scale-105 transition-transform duration-200 -mr-6 sm:-mr-8"
              />
              <span className="font-mono text-lg sm:text-xl font-bold uppercase tracking-widest text-white group-hover:text-brand-300 transition-colors">
                HIREBOT<span className="text-brand-400">AI</span>
              </span>
            </Link>

            <div className="hidden md:flex items-center gap-7">
              {navigation.map((item) => (
                <Link
                  key={item.name}
                  href={item.href}
                  className="font-mono text-xs uppercase tracking-widest text-surface-400 hover:text-brand-400 transition-colors"
                >
                  {item.name}
                </Link>
              ))}
            </div>
          </div>

          <div className="flex items-center gap-3">
            {accountButton}

            <Link href="/download" className="hidden sm:inline-flex">
              <Button variant="outline" size="sm" icon={<Download className="w-4 h-4" />}>
                Download
              </Button>
            </Link>

            <button
              className="md:hidden p-2 rounded-lg bg-surface-900/60 border border-surface-700 text-surface-300 hover:text-brand-400"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              aria-expanded={mobileMenuOpen}
              aria-controls="mobile-menu"
              aria-label="Toggle menu"
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {mobileMenuOpen && (
          <div id="mobile-menu" className="md:hidden py-4 border-t border-surface-800 animate-slide-down">
            <div className="flex flex-col gap-4">
              {navigation.map((item) => (
                <Link
                  key={item.name}
                  href={item.href}
                  className="font-mono text-sm uppercase tracking-widest text-surface-300 hover:text-brand-400 px-2 py-2 rounded-lg hover:bg-surface-800/50 transition-colors"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  {item.name}
                </Link>
              ))}
              <div className="flex flex-col gap-2 pt-4 border-t border-surface-800">
                {loading ? null : user ? (
                  <>
                    <Link href="/dashboard" onClick={() => setMobileMenuOpen(false)}>
                      <Button variant="ghost" className="w-full justify-start" icon={<User className="w-4 h-4" />}>
                        Account
                      </Button>
                    </Link>
                    <button
                      onClick={() => {
                        setMobileMenuOpen(false);
                        handleSignOut();
                      }}
                      className="w-full flex items-center justify-start gap-2 px-4 py-2.5 rounded-lg text-sm font-mono text-surface-300 hover:text-white hover:bg-surface-800/60 transition-colors"
                    >
                      <LogOut className="w-4 h-4" />
                      Log Out
                    </button>
                  </>
                ) : (
                  <Link href="/login" onClick={() => setMobileMenuOpen(false)}>
                    <Button variant="ghost" className="w-full justify-start">
                      Log In
                    </Button>
                  </Link>
                )}
                <Link href="/download" onClick={() => setMobileMenuOpen(false)}>
                  <Button variant="outline" className="w-full justify-start" icon={<Download className="w-4 h-4" />}>
                    Download
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        )}
      </nav>
    </header>
  );
}
