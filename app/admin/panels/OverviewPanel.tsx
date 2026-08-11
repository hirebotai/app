'use client';

import {
  DollarSign,
  Users,
  Download,
  KeyRound,
  Plus,
  Megaphone,
  Tag,
  Rocket,
  Sparkles,
  TrendingUp,
  ArrowUpRight,
} from 'lucide-react';
import { Card, Button, Badge } from '@/components/ui';
import { formatRelativeTime } from '@/lib/utils';
import type { AppItem, Release, Coupon, LicenseItem, UserItem, SectionId } from '../data';

interface OverviewProps {
  apps: AppItem[];
  releases: Release[];
  coupons: Coupon[];
  licenses: LicenseItem[];
  users: UserItem[];
  onNavigate: (s: SectionId) => void;
}

const PRICES: Record<string, number> = { monthly: 499, yearly: 4999, lifetime: 9999 };
const BARS = [32, 48, 40, 58, 52, 70, 64, 84, 76, 96];

export default function OverviewPanel({
  apps,
  releases,
  coupons,
  licenses,
  users,
  onNavigate,
}: OverviewProps) {
  const revenue = licenses.reduce((s, l) => s + (PRICES[l.plan] ?? 0), 0);
  const paidCount = licenses.filter((l) => l.plan !== 'trial' && l.status === 'active').length;
  const monthly = licenses.filter((l) => l.plan === 'monthly').length;
  const yearly = licenses.filter((l) => l.plan === 'yearly').length;
  const lifetime = licenses.filter((l) => l.plan === 'lifetime').length;
  const downloads = apps.reduce((s, a) => s + a.totalDownloads, 0);
  const publishedApps = apps.filter((a) => a.status === 'published').length;
  const activeCoupons = coupons.filter((c) => c.active).length;
  const publishedReleases = releases.filter((r) => r.status === 'published').length;
  const appName = (id: string) => apps.find((a) => a.id === id)?.name ?? 'Unknown app';

  const recentReleases = [...releases]
    .filter((r) => r.status === 'published')
    .sort((a, b) => (b.publishedAt ?? '').localeCompare(a.publishedAt ?? ''))
    .slice(0, 5);
  const recentLicenses = [...licenses]
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .slice(0, 5);

  const stats = [
    {
      label: 'Total Revenue',
      value: `₹${revenue.toLocaleString('en-IN')}`,
      sub: '+24% this week',
      icon: DollarSign,
      color: 'text-emerald-400',
      spark: true,
    },
    {
      label: 'Paid Subscribers',
      value: String(paidCount),
      sub: `${monthly} Monthly • ${yearly} Yearly • ${lifetime} Lifetime`,
      icon: Users,
      color: 'text-brand-400',
      spark: false,
    },
    {
      label: 'App Installations',
      value: downloads.toLocaleString('en-IN'),
      sub: `${publishedApps} published app${publishedApps === 1 ? '' : 's'} live`,
      icon: Download,
      color: 'text-sky-400',
      spark: false,
    },
    {
      label: 'Licenses Issued',
      value: String(licenses.length),
      sub: `${users.length} registered users`,
      icon: KeyRound,
      color: 'text-purple-400',
      spark: false,
    },
  ];

  const quickActions = [
    { label: 'Add New App', icon: Plus, target: 'apps' as SectionId, color: 'text-brand-400' },
    { label: 'Broadcast Update', icon: Megaphone, target: 'releases' as SectionId, color: 'text-fuchsia-400' },
    { label: 'Generate License', icon: KeyRound, target: 'licenses' as SectionId, color: 'text-amber-400' },
    { label: 'Create Coupon', icon: Tag, target: 'coupons' as SectionId, color: 'text-emerald-400' },
  ];

  return (
    <div className="space-y-8">
      {/* Stats cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-5">
        {stats.map((s) => (
          <Card key={s.label} className="p-6 border-surface-800 bg-surface-900/60 space-y-3">
            <div className="flex items-center justify-between text-surface-400">
              <span className="text-[11px] font-mono font-bold uppercase tracking-wider">
                {s.label}
              </span>
              <s.icon className={`w-5 h-5 ${s.color}`} />
            </div>
            <div className="text-3xl font-extrabold font-mono text-white">{s.value}</div>
            <div className="flex items-center justify-between">
              <p
                className={`text-xs font-mono ${s.color === 'text-emerald-400' ? 'text-emerald-400' : 'text-surface-400'}`}
              >
                {s.sub}
              </p>
              {s.spark && (
                <div className="flex items-end gap-0.5 h-6">
                  {BARS.map((b, i) => (
                    <span
                      key={i}
                      className="w-1.5 rounded-sm bg-emerald-400/60"
                      style={{ height: `${b}%` }}
                    />
                  ))}
                </div>
              )}
            </div>
          </Card>
        ))}
      </div>

      {/* Secondary chips */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: 'Active Coupons', value: activeCoupons, icon: Tag, color: 'text-amber-400' },
          { label: 'Published Releases', value: publishedReleases, icon: Rocket, color: 'text-fuchsia-400' },
          { label: 'Apps in Catalog', value: apps.length, icon: Sparkles, color: 'text-brand-400' },
          { label: 'Registered Users', value: users.length, icon: Users, color: 'text-sky-400' },
        ].map((c) => (
          <div
            key={c.label}
            className="flex items-center gap-3 p-4 rounded-xl border border-surface-800 bg-surface-900/40"
          >
            <c.icon className={`w-5 h-5 ${c.color}`} />
            <div>
              <div className="font-mono text-xl font-bold text-white">{c.value}</div>
              <div className="text-[11px] font-mono uppercase tracking-wider text-surface-500">
                {c.label}
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Recent releases */}
        <Card className="p-6 border-surface-800 bg-surface-900/60 lg:col-span-1">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-mono text-sm font-bold text-white flex items-center gap-2">
              <Rocket className="w-4 h-4 text-brand-400" /> Latest Releases
            </h2>
            <button
              onClick={() => onNavigate('releases')}
              className="text-xs text-brand-400 hover:text-brand-300 flex items-center gap-1"
            >
              Manage <ArrowUpRight className="w-3.5 h-3.5" />
            </button>
          </div>
          <div className="space-y-3">
            {recentReleases.length === 0 && (
              <p className="text-xs text-surface-500">No releases published yet.</p>
            )}
            {recentReleases.map((r) => (
              <div
                key={r.id}
                className="flex items-center gap-3 p-3 rounded-xl bg-surface-950 border border-surface-800"
              >
                <div className="w-9 h-9 rounded-lg bg-brand-500/10 border border-brand-500/20 text-brand-400 flex items-center justify-center text-xs font-mono font-bold shrink-0">
                  v{r.version.split('.')[0]}.{r.version.split('.')[1]}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-semibold text-surface-100 truncate">
                    {appName(r.appId)}
                  </div>
                  <div className="text-[11px] font-mono text-surface-500">
                    v{r.version} · {r.publishedAt ? formatRelativeTime(r.publishedAt) : 'draft'}
                  </div>
                </div>
                {r.mandatory && <Badge size="sm" variant="warning">Mandatory</Badge>}
              </div>
            ))}
          </div>
        </Card>

        {/* Recent licenses */}
        <Card className="p-6 border-surface-800 bg-surface-900/60 lg:col-span-1">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-mono text-sm font-bold text-white flex items-center gap-2">
              <KeyRound className="w-4 h-4 text-amber-400" /> Recent Licenses
            </h2>
            <button
              onClick={() => onNavigate('licenses')}
              className="text-xs text-brand-400 hover:text-brand-300 flex items-center gap-1"
            >
              Manage <ArrowUpRight className="w-3.5 h-3.5" />
            </button>
          </div>
          <div className="space-y-3">
            {recentLicenses.length === 0 && (
              <p className="text-xs text-surface-500">No licenses issued yet.</p>
            )}
            {recentLicenses.map((l) => (
              <div
                key={l.id}
                className="flex items-center gap-3 p-3 rounded-xl bg-surface-950 border border-surface-800"
              >
                <div className="w-9 h-9 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center text-[10px] font-mono font-bold shrink-0 uppercase">
                  {l.plan.slice(0, 4)}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-semibold text-surface-100 truncate">{l.email}</div>
                  <div className="text-[11px] font-mono text-surface-500">
                    {l.key.slice(0, 14)}… · {formatRelativeTime(l.createdAt)}
                  </div>
                </div>
                <Badge
                  size="sm"
                  variant={l.status === 'active' ? 'success' : l.status === 'expired' ? 'warning' : 'danger'}
                >
                  {l.status}
                </Badge>
              </div>
            ))}
          </div>
        </Card>

        {/* Quick actions */}
        <Card className="p-6 border-surface-800 bg-surface-900/60 lg:col-span-1">
          <h2 className="font-mono text-sm font-bold text-white flex items-center gap-2 mb-4">
            <TrendingUp className="w-4 h-4 text-emerald-400" /> Quick Actions
          </h2>
          <div className="space-y-3">
            {quickActions.map((qa) => (
              <button
                key={qa.label}
                onClick={() => onNavigate(qa.target)}
                className="w-full flex items-center gap-3 p-3.5 rounded-xl bg-surface-950 border border-surface-800 hover:border-brand-500/40 hover:bg-surface-900 transition-all text-left group"
              >
                <div className="w-9 h-9 rounded-lg bg-surface-800 flex items-center justify-center">
                  <qa.icon className={`w-5 h-5 ${qa.color}`} />
                </div>
                <span className="text-sm font-semibold text-surface-100 group-hover:text-brand-300 flex-1">
                  {qa.label}
                </span>
                <ArrowUpRight className="w-4 h-4 text-surface-500 group-hover:text-brand-400" />
              </button>
            ))}
            <Button variant="outline" size="sm" fullWidth onClick={() => onNavigate('overview')}>
              <Sparkles className="w-4 h-4 mr-1" /> Open Command Center
            </Button>
          </div>
        </Card>
      </div>
    </div>
  );
}
