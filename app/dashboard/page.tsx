'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { useSession } from '@/lib/hooks/useSession';
import { isSupabaseConfigured } from '@/lib/supabase/env';
import { Button, Card, CardHeader, CardTitle, CardDescription, CardContent, Badge } from '@/components/ui';
import { toast } from 'sonner';
import {
  LogOut,
  Download,
  KeyRound,
  Mail,
  Loader2,
  ArrowRight,
  ShieldCheck,
  Cpu,
  CalendarClock,
  Layers,
  CircleCheck,
} from 'lucide-react';

interface License {
  id: string;
  license_key: string;
  plan_type: string;
  status: string;
  hwid: string | null;
  activated_at: string | null;
  expires_at: string | null;
  created_at: string;
}

const planLabels: Record<string, string> = {
  trial: 'Free Trial',
  monthly: 'Monthly Pro',
  yearly: 'Yearly Pro',
  lifetime: 'Lifetime Pro',
};

const statusVariant = (status: string) => {
  if (status === 'active') return 'success';
  if (status === 'revoked') return 'danger';
  return 'warning';
};

function formatDate(value: string | null) {
  if (!value) return '—';
  return new Date(value).toLocaleDateString('en-IN', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

export default function DashboardPage() {
  const router = useRouter();
  const { user, loading } = useSession();
  const [licenses, setLicenses] = useState<License[]>([]);
  const [licensesLoading, setLicensesLoading] = useState(false);
  const [licensesError, setLicensesError] = useState<string | null>(null);

  useEffect(() => {
    if (!loading && !user) {
      router.replace('/login');
    }
  }, [loading, user, router]);

  useEffect(() => {
    if (!user || !isSupabaseConfigured()) return;

    let active = true;
    setLicensesLoading(true);
    setLicensesError(null);

    createClient()
      .from('licenses')
      .select('*')
      .order('created_at', { ascending: false })
      .then(({ data, error }) => {
        if (!active) return;
        if (error) {
          const tableMissing =
            error.code === '42P01' || error.message.includes('Could not find the table');
          if (tableMissing) {
            console.warn('Licenses table is not set up yet:', error.message);
            setLicenses([]);
          } else {
            console.error('Failed to load licenses:', error);
            setLicensesError(
              'We couldn\u2019t load your license keys right now. Please try again in a moment, or email hello@hirebotai.in and we\u2019ll help you right away.'
            );
          }
        } else {
          setLicenses((data as License[]) ?? []);
        }
        setLicensesLoading(false);
      });

    return () => {
      active = false;
    };
  }, [user]);

  const handleSignOut = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    toast.success('Signed out successfully');
    router.push('/');
    router.refresh();
  };

  if (loading || !user) {
    return (
      <div className="min-h-screen bg-surface-950 text-surface-50 flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-8 h-8 text-brand-400 animate-spin" />
          <p className="font-mono text-sm text-surface-400">Loading your account...</p>
        </div>
      </div>
    );
  }

  const meta = (user.user_metadata as { name?: string } | null) ?? {};
  const displayName = meta.name?.trim() || user.email?.split('@')[0] || 'there';
  const initial = (displayName[0] || 'U').toUpperCase();

  const activeLicenses = licenses.filter((l) => l.status === 'active');
  const currentPlan =
    licenses.length > 0 ? planLabels[licenses[0].plan_type] ?? licenses[0].plan_type : 'No license yet';
  const futureExpiry = licenses
    .map((l) => l.expires_at)
    .filter((d): d is string => !!d && new Date(d).getTime() > Date.now())
    .sort((a, b) => new Date(a).getTime() - new Date(b).getTime())[0];

  const stats = [
    {
      label: 'Total Licenses',
      value: String(licenses.length),
      icon: Layers,
      glow: 'text-brand-400',
      ring: 'border-brand-500/40',
    },
    {
      label: 'Active Licenses',
      value: String(activeLicenses.length),
      icon: CircleCheck,
      glow: 'text-green-400',
      ring: 'border-green-500/40',
    },
    {
      label: 'Current Plan',
      value: currentPlan,
      icon: ShieldCheck,
      glow: 'text-fuchsia-400',
      ring: 'border-fuchsia-500/40',
    },
    {
      label: 'Next Expiry',
      value: formatDate(futureExpiry),
      icon: CalendarClock,
      glow: 'text-amber-400',
      ring: 'border-amber-500/40',
    },
  ];

  return (
    <div className="relative min-h-screen bg-surface-950 text-surface-50 pb-24 overflow-hidden">
      {/* Decorative background */}
      <div className="pointer-events-none absolute inset-0 bg-grid opacity-40" />
      <div className="pointer-events-none absolute -top-48 -right-40 h-[28rem] w-[28rem] rounded-full bg-brand-500/15 blur-3xl" />
      <div className="pointer-events-none absolute top-40 -left-48 h-[26rem] w-[26rem] rounded-full bg-fuchsia-500/10 blur-3xl" />
      <div className="pointer-events-none absolute bottom-0 right-1/4 h-72 w-72 rounded-full bg-accent-green/5 blur-3xl" />

      <div className="relative mx-auto max-w-5xl px-4 sm:px-6 lg:px-8 pt-12">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 mb-10">
          <div className="flex items-center gap-4">
            <div className="h-14 w-14 shrink-0 rounded-2xl bg-gradient-to-br from-brand-500/25 to-fuchsia-500/25 border border-brand-500/40 flex items-center justify-center font-mono font-bold text-xl text-brand-300 shadow-glow">
              {initial}
            </div>
            <div className="min-w-0">
              <p className="font-mono text-[11px] tracking-[0.22em] text-brand-400 uppercase mb-1">
                Customer Portal
              </p>
              <h1 className="text-2xl sm:text-3xl font-bold font-mono text-white tracking-tight truncate">
                Welcome back, {displayName}
              </h1>
              <p className="mt-1.5 text-surface-400 text-sm flex items-center gap-2 truncate">
                <Mail className="w-4 h-4 shrink-0 text-brand-400" />
                <span className="truncate">{user.email}</span>
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3 shrink-0">
            <Button
              variant="outline"
              size="sm"
              icon={<Download className="w-4 h-4" />}
              onClick={() => router.push('/download')}
            >
              Download
            </Button>
            <Button variant="ghost" size="sm" icon={<LogOut className="w-4 h-4" />} onClick={handleSignOut}>
              Log Out
            </Button>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {stats.map((s) => (
            <Card key={s.label} className={`border ${s.ring} bg-surface-900/50`}>
              <div className="flex items-center gap-3">
                <div
                  className={`h-11 w-11 shrink-0 rounded-xl flex items-center justify-center bg-white/[0.03] border border-white/10 ${s.glow}`}
                >
                  <s.icon className="w-5 h-5" />
                </div>
                <div className="min-w-0">
                  <p className="text-[11px] font-mono uppercase tracking-widest text-surface-500 truncate">
                    {s.label}
                  </p>
                  <p className="text-lg font-bold font-mono text-surface-100 truncate">{s.value}</p>
                </div>
              </div>
            </Card>
          ))}
        </div>

        {/* Licenses */}
        <Card variant="elevated" className="mb-8">
          <CardHeader className="flex sm:flex-row sm:items-center sm:justify-between gap-2">
            <div>
              <CardTitle className="flex items-center gap-2">
                <KeyRound className="w-5 h-5 text-brand-400" />
                Your License Keys
              </CardTitle>
              <CardDescription>
                Your active and past Hirebotai licenses. Bind a key on your device to activate it.
              </CardDescription>
            </div>
            {licenses.length > 0 && (
              <Badge variant="brand" size="sm">
                {licenses.length} total
              </Badge>
            )}
          </CardHeader>
          <CardContent>
            {!isSupabaseConfigured() ? (
              <div className="text-sm text-surface-400 bg-surface-900/60 border border-surface-800 rounded-xl p-4">
                Accounts are not configured yet. Please contact{' '}
                <a href="mailto:hello@hirebotai.in" className="text-brand-400 hover:underline">
                  hello@hirebotai.in
                </a>{' '}
                for help.
              </div>
            ) : licensesLoading ? (
              <div className="flex items-center justify-center py-10">
                <Loader2 className="w-6 h-6 text-brand-400 animate-spin" />
              </div>
            ) : licensesError ? (
              <div className="text-sm text-amber-400 bg-amber-500/10 border border-amber-500/30 rounded-xl p-4">
                {licensesError}
              </div>
            ) : licenses.length === 0 ? (
              <div className="text-sm text-surface-400 bg-surface-900/60 border border-surface-800 rounded-xl p-8 text-center space-y-3">
                <KeyRound className="w-8 h-8 text-surface-600 mx-auto" />
                <p className="font-mono text-surface-300">You don&apos;t have any license keys yet.</p>
                <p>Grab a Pro plan to unlock every feature and bind it to your device.</p>
                <Link href="/pricing" className="inline-flex">
                  <Button variant="primary" size="sm">
                    Get a License
                    <ArrowRight className="w-4 h-4 ml-1.5" />
                  </Button>
                </Link>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead>
                    <tr className="border-b border-surface-800 text-xs font-mono uppercase tracking-widest text-surface-500">
                      <th className="py-3 pr-4">License Key</th>
                      <th className="py-3 pr-4">Plan</th>
                      <th className="py-3 pr-4">Status</th>
                      <th className="py-3 pr-4">Expires</th>
                      <th className="py-3">Activated</th>
                    </tr>
                  </thead>
                  <tbody>
                    {licenses.map((license) => (
                      <tr
                        key={license.id}
                        className="border-b border-surface-800/60 last:border-0 hover:bg-white/[0.02] transition-colors"
                      >
                        <td className="py-3 pr-4">
                          <span className="font-mono text-xs text-brand-300">{license.license_key}</span>
                        </td>
                        <td className="py-3 pr-4">
                          <Badge variant="default" size="sm">
                            {planLabels[license.plan_type] ?? license.plan_type}
                          </Badge>
                        </td>
                        <td className="py-3 pr-4">
                          <Badge variant={statusVariant(license.status)} size="sm" dot>
                            {license.status}
                          </Badge>
                        </td>
                        <td className="py-3 pr-4 text-surface-400">{formatDate(license.expires_at)}</td>
                        <td className="py-3 text-surface-400">
                          {license.hwid ? (
                            <span className="inline-flex items-center gap-1.5 text-green-400">
                              <Cpu className="w-3.5 h-3.5" />
                              {formatDate(license.activated_at)}
                            </span>
                          ) : (
                            <span className="text-surface-500">Not activated</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Quick links */}
        <div className="grid sm:grid-cols-3 gap-4">
          <Link href="/pricing">
            <Card hover className="h-full bg-surface-900/50">
              <CardHeader className="mb-2">
                <CardTitle className="text-base flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-brand-400" />
                  Upgrade Plan
                </CardTitle>
              </CardHeader>
              <p className="text-sm text-surface-400">Switch to a monthly, yearly or lifetime Pro license.</p>
            </Card>
          </Link>
          <Link href="/download">
            <Card hover className="h-full bg-surface-900/50">
              <CardHeader className="mb-2">
                <CardTitle className="text-base flex items-center gap-2">
                  <Download className="w-4 h-4 text-brand-400" />
                  Download App
                </CardTitle>
              </CardHeader>
              <p className="text-sm text-surface-400">Get the latest Hirebotai desktop build for Windows.</p>
            </Card>
          </Link>
          <Link href="/instructions">
            <Card hover className="h-full bg-surface-900/50">
              <CardHeader className="mb-2">
                <CardTitle className="text-base flex items-center gap-2">
                  <Cpu className="w-4 h-4 text-brand-400" />
                  Activate Device
                </CardTitle>
              </CardHeader>
              <p className="text-sm text-surface-400">Learn how to bind your license key to this PC.</p>
            </Card>
          </Link>
        </div>
      </div>
    </div>
  );
}
