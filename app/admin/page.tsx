'use client';

import { useRef, useState, useEffect } from 'react';
import Link from 'next/link';
import {
  LayoutDashboard,
  Boxes,
  Rocket,
  KeyRound,
  Tag,
  Users,
  Sparkles,
  ExternalLink,
  RotateCcw,
  DownloadCloud,
  UploadCloud,
  MessageSquare,
  type LucideIcon,
} from 'lucide-react';
import { Button } from '@/components/ui';
import { toast } from 'sonner';
import {
  usePersistentState,
  type SectionId,
  type AppItem,
  type Release,
  type Coupon,
  type LicenseItem,
  type UserItem,
  type PlanType,
} from './data';
import { cn } from '@/lib/utils';
import OverviewPanel from './panels/OverviewPanel';
import AppsPanel from './panels/AppsPanel';
import ReleasesPanel from './panels/ReleasesPanel';
import LicensesPanel from './panels/LicensesPanel';
import CouponsPanel from './panels/CouponsPanel';
import UsersPanel from './panels/UsersPanel';
import FeedbackPanel from './panels/FeedbackPanel';

const NAV: { id: SectionId; label: string; icon: LucideIcon }[] = [
  { id: 'overview', label: 'Overview', icon: LayoutDashboard },
  { id: 'apps', label: 'Apps', icon: Boxes },
  { id: 'releases', label: 'Updates', icon: Rocket },
  { id: 'licenses', label: 'Licenses', icon: KeyRound },
  { id: 'coupons', label: 'Coupons', icon: Tag },
  { id: 'users', label: 'Users', icon: Users },
  { id: 'feedback', label: 'Feedback', icon: MessageSquare },
];

interface BackupPayload {
  apps: AppItem[];
  releases: Release[];
  coupons: Coupon[];
  licenses: LicenseItem[];
  users: UserItem[];
}

function mapServerCoupon(r: any): Coupon {
  return {
    id: r.id,
    code: r.code,
    discountPercent: r.discount_percent,
    maxUses: r.max_uses,
    used: r.used,
    active: r.active,
    expiresAt: r.expires_at,
    applicablePlans: r.applicable_plans ?? ['monthly', 'yearly', 'lifetime'],
    createdAt: r.created_at,
  };
}

function mapServerLicense(r: any): LicenseItem {
  return {
    id: r.id,
    key: r.license_key,
    email: r.email || '—',
    plan: r.plan_type,
    status: r.status,
    device: r.hwid,
    activatedAt: r.activated_at,
    expiresAt: r.expires_at,
    createdAt: r.created_at,
  };
}

function mapServerUser(r: any): UserItem {
  return {
    id: r.id,
    email: r.email,
    name: r.name,
    plan: r.plan,
    status: r.status,
    joined: r.joined,
    lastActive: r.lastActive,
    trialStart: r.trialStart ?? null,
    trialActive: r.trialActive ?? false,
    hwid: r.hwid ?? null,
  };
}

export default function AdminDashboardPage() {
  const [section, setSection] = useState<SectionId>('overview');
  // No fake seed data: start empty. The v2 keys drop any previously-persisted
  // demo apps/updates (which showed fake "3 published apps / 5 updates").
  const [apps, setApps] = usePersistentState<AppItem[]>('hb_admin_apps_v2', []);
  const [releases, setReleases] = usePersistentState<Release[]>('hb_admin_releases_v2', []);
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [licenses, setLicenses] = useState<LicenseItem[]>([]);
  const [users, setUsers] = useState<UserItem[]>([]);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    async function load() {
      try {
        const [couponsRes, licensesRes, usersRes] = await Promise.all([
          fetch('/api/coupons'),
          fetch('/api/licenses'),
          fetch('/api/admin/users'),
        ]);
        const [couponsData, licensesData, usersData] = await Promise.all([
          couponsRes.json(),
          licensesRes.json(),
          usersRes.json(),
        ]);
        if (Array.isArray(couponsData.coupons)) setCoupons(couponsData.coupons.map(mapServerCoupon));
        if (Array.isArray(licensesData.licenses)) setLicenses(licensesData.licenses.map(mapServerLicense));
        if (Array.isArray(usersData.users)) setUsers(usersData.users.map(mapServerUser));
      } catch (err) {
        console.error('Failed to load admin data:', err);
      }
    }
    void load();
  }, []);

  const refreshCoupons = async () => {
    try {
      const res = await fetch('/api/coupons');
      const data = await res.json();
      if (res.ok && Array.isArray(data.coupons)) {
        setCoupons(data.coupons.map(mapServerCoupon));
      }
    } catch {
      toast.error('Could not refresh coupons. Check server logs.');
    }
  };

  const createCoupon = async (payload: { code: string; discountPercent: number; maxUses: number; expiresAt: string | null; applicablePlans: string[] }) => {
    try {
      const res = await fetch('/api/coupons', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to create coupon');
      if (Array.isArray(data.coupons)) setCoupons(data.coupons.map(mapServerCoupon));
      toast.success(`Coupon ${payload.code} created (${payload.discountPercent}% off)`);
    } catch (err: any) {
      toast.error(err.message || 'Failed to create coupon');
    }
  };

  const toggleCoupon = async (id: string, active: boolean) => {
    try {
      const res = await fetch(`/api/coupons/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ active }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to update coupon');
      if (Array.isArray(data.coupons)) setCoupons(data.coupons.map(mapServerCoupon));
      toast.success(`Coupon ${active ? 'activated' : 'deactivated'}`);
    } catch (err: any) {
      toast.error(err.message || 'Failed to update coupon');
    }
  };

  const deleteCoupon = async (id: string) => {
    try {
      const res = await fetch(`/api/coupons/${id}`, { method: 'DELETE' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to delete coupon');
      if (Array.isArray(data.coupons)) setCoupons(data.coupons.map(mapServerCoupon));
      toast.success('Coupon deleted');
    } catch (err: any) {
      toast.error(err.message || 'Failed to delete coupon');
    }
  };

  const refreshLicenses = async () => {
    try {
      const res = await fetch('/api/licenses');
      const data = await res.json();
      if (res.ok && Array.isArray(data.licenses)) {
        setLicenses(data.licenses.map(mapServerLicense));
      } else {
        toast.error(data.error || 'Could not refresh licenses');
      }
    } catch {
      toast.error('Could not refresh licenses. Check server logs.');
    }
  };

  const generateLicense = async (payload: { email: string; planType: PlanType }) => {
    try {
      const res = await fetch('/api/licenses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to create license');
      const lic = mapServerLicense(data.license);
      setLicenses((prev) => [lic, ...prev]);
      toast.success('License key generated');
      navigator.clipboard?.writeText(lic.key).catch(() => {});
    } catch (err: any) {
      toast.error(err.message || 'Failed to create license');
    }
  };

  const toggleLicense = async (l: LicenseItem) => {
    const next = l.status === 'revoked' ? 'active' : 'revoked';
    try {
      const res = await fetch(`/api/licenses/${l.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: next }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to update license');
      setLicenses((prev) => prev.map((x) => (x.id === l.id ? mapServerLicense(data.license) : x)));
      toast.success(next === 'revoked' ? 'License revoked' : 'License reactivated');
    } catch (err: any) {
      toast.error(err.message || 'Failed to update license');
    }
  };

  const extendLicense = async (l: LicenseItem) => {
    const base = l.expiresAt ? new Date(l.expiresAt).getTime() : Date.now();
    try {
      const res = await fetch(`/api/licenses/${l.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: 'active',
          expiresAt: new Date(base + 30 * 86400000).toISOString(),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to extend license');
      setLicenses((prev) => prev.map((x) => (x.id === l.id ? mapServerLicense(data.license) : x)));
      toast.success('License extended by 30 days');
    } catch (err: any) {
      toast.error(err.message || 'Failed to extend license');
    }
  };

  const deleteLicense = async (l: LicenseItem) => {
    try {
      const res = await fetch(`/api/licenses/${l.id}`, { method: 'DELETE' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to delete license');
      setLicenses((prev) => prev.filter((x) => x.id !== l.id));
      toast.success('License deleted');
    } catch (err: any) {
      toast.error(err.message || 'Failed to delete license');
    }
  };

  const refreshUsers = async () => {
    try {
      const res = await fetch('/api/admin/users');
      const data = await res.json();
      if (res.ok && Array.isArray(data.users)) {
        setUsers(data.users.map(mapServerUser));
      } else {
        toast.error(data.error || 'Could not refresh users');
      }
    } catch {
      toast.error('Could not refresh users. Check server logs.');
    }
  };

  const toggleUser = async (u: UserItem) => {
    const banned = u.status !== 'suspended';
    try {
      const res = await fetch(`/api/admin/users/${u.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ banned }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to update user');
      setUsers((prev) =>
        prev.map((x) => (x.id === u.id ? { ...x, status: banned ? 'suspended' : 'active' } : x))
      );
      toast.success(banned ? `${u.email} suspended` : `${u.email} reactivated`);
    } catch (err: any) {
      toast.error(err.message || 'Failed to update user');
    }
  };

  const deleteUser = async (u: UserItem) => {
    try {
      const res = await fetch(`/api/admin/users/${u.id}`, { method: 'DELETE' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to delete user');
      setUsers((prev) => prev.filter((x) => x.id !== u.id));
      toast.success(`User ${u.email} removed`);
    } catch (err: any) {
      toast.error(err.message || 'Failed to delete user');
    }
  };

  const handleReset = () => {
    if (!window.confirm('Clear apps & updates and reload live data?')) return;
    setApps([]);
    setReleases([]);
    refreshCoupons();
    refreshLicenses();
    refreshUsers();
    toast.success('Apps/updates cleared; live data reloaded');
  };

  const handleExport = () => {
    const payload: BackupPayload = { apps, releases, coupons, licenses, users };
    const blob = new Blob([JSON.stringify(payload, null, 2)], {
      type: 'application/json',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `hirebotai-admin-backup-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('Backup JSON downloaded');
  };

  const handleImport = async (file: File) => {
    try {
      const parsed = JSON.parse(await file.text()) as Partial<BackupPayload>;
      if (Array.isArray(parsed.apps)) setApps(parsed.apps);
      if (Array.isArray(parsed.releases)) setReleases(parsed.releases);
      toast.success('Apps & updates imported (licenses/coupons/users come from the database)');
    } catch {
      toast.error('Invalid backup file');
    }
  };

  const counts: Record<SectionId, number> = {
    overview: 0,
    apps: apps.length,
    releases: releases.length,
    licenses: licenses.length,
    coupons: coupons.length,
    users: users.length,
    feedback: 0,
  };

  return (
    <div className="min-h-screen bg-surface-950 text-surface-50">
      <div className="mx-auto max-w-[1400px] flex flex-col lg:flex-row gap-6 lg:gap-10 px-4 sm:px-6 lg:px-8 py-8 lg:py-10">
        {/* Sidebar / Tab nav */}
        <aside className="lg:w-60 flex-shrink-0">
          <div className="lg:sticky lg:top-20 space-y-5">
            <nav className="flex lg:flex-col gap-2 overflow-x-auto lg:overflow-visible pb-2 lg:pb-0 -mx-1 px-1 lg:mx-0 lg:px-0">
              {NAV.map((item) => {
                const active = section === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => setSection(item.id)}
                    className={cn(
                      'flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-mono font-semibold transition-all whitespace-nowrap',
                      active
                        ? 'bg-brand-500/15 text-brand-300 border border-brand-500/40 shadow-glow'
                        : 'text-surface-400 border border-transparent hover:text-surface-100 hover:bg-surface-900 hover:border-surface-800'
                    )}
                  >
                    <item.icon className="w-4 h-4" />
                    <span>{item.label}</span>
                    {counts[item.id] > 0 && (
                      <span
                        className={cn(
                          'ml-auto text-[10px] px-1.5 py-0.5 rounded-full font-mono',
                          active
                            ? 'bg-brand-500/20 text-brand-300'
                            : 'bg-surface-800 text-surface-500'
                        )}
                      >
                        {counts[item.id]}
                      </span>
                    )}
                  </button>
                );
              })}
            </nav>

            <div className="hidden lg:block p-4 rounded-2xl border border-surface-800 bg-surface-900/50">
              <div className="text-[11px] font-mono font-bold uppercase tracking-wider text-surface-500 mb-3">
                Data Tools
              </div>
              <div className="space-y-2">
                <Button
                  variant="secondary"
                  size="sm"
                  fullWidth
                  icon={<DownloadCloud className="w-4 h-4" />}
                  onClick={handleExport}
                >
                  Export Backup
                </Button>
                <Button
                  variant="secondary"
                  size="sm"
                  fullWidth
                  icon={<UploadCloud className="w-4 h-4" />}
                  onClick={() => fileRef.current?.click()}
                >
                  Import Backup
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  fullWidth
                  icon={<RotateCcw className="w-4 h-4" />}
                  onClick={handleReset}
                >
                  Reset Demo Data
                </Button>
              </div>
              <input
                ref={fileRef}
                type="file"
                accept="application/json"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) void handleImport(f);
                  e.target.value = '';
                }}
              />
            </div>
          </div>
        </aside>

        {/* Main content */}
        <main className="flex-1 min-w-0 space-y-8">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-surface-800 pb-6">
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-brand-500/10 border border-brand-500/20 text-brand-400 text-xs font-mono font-bold uppercase mb-2">
                <Sparkles className="w-3.5 h-3.5" /> Founder Admin Control Center
              </div>
              <h1 className="text-3xl font-extrabold font-mono text-white">
                Hirebotai Command Center
              </h1>
              <p className="text-surface-500 text-sm mt-1">
                Manage apps, releases, licenses, coupons &amp; users from one console.
              </p>
            </div>
            <div className="flex items-center gap-3">
              <Link href="/pricing">
                <Button variant="outline" size="sm">
                  <ExternalLink className="w-4 h-4 mr-2" /> View Live Site
                </Button>
              </Link>
              <Button variant="secondary" size="sm" onClick={handleExport}>
                <DownloadCloud className="w-4 h-4 mr-2" /> Backup
              </Button>
            </div>
          </div>

          {section === 'overview' && (
            <OverviewPanel
              apps={apps}
              releases={releases}
              coupons={coupons}
              licenses={licenses}
              users={users}
              onNavigate={setSection}
            />
          )}
          {section === 'apps' && <AppsPanel apps={apps} setApps={setApps} releases={releases} />}
          {section === 'releases' && (
            <ReleasesPanel
              apps={apps}
              releases={releases}
              setReleases={setReleases}
              setApps={setApps}
            />
          )}
          {section === 'licenses' && (
            <LicensesPanel
              licenses={licenses}
              onGenerate={generateLicense}
              onToggle={toggleLicense}
              onExtend={extendLicense}
              onDelete={deleteLicense}
              onRefresh={refreshLicenses}
            />
          )}
          {section === 'coupons' && (
            <CouponsPanel
              coupons={coupons}
              onCreate={createCoupon}
              onToggle={toggleCoupon}
              onDelete={deleteCoupon}
              onRefresh={refreshCoupons}
            />
          )}
          {section === 'users' && (
            <UsersPanel
              users={users}
              onToggle={toggleUser}
              onDelete={deleteUser}
              onRefresh={refreshUsers}
            />
          )}
          {section === 'feedback' && <FeedbackPanel />}
        </main>
      </div>
    </div>
  );
}
