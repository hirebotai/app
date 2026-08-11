'use client';

import { useState } from 'react';
import { Plus, Copy, Ban, CheckCircle2, Timer, Trash2, Search, KeyRound, RefreshCw } from 'lucide-react';
import { Card, Button, Badge } from '@/components/ui';
import { toast } from 'sonner';
import type { LicenseItem, LicenseStatus, PlanType } from '../data';
import { Field, Modal, Select, inputCls } from '../ui';

interface LicensesPanelProps {
  licenses: LicenseItem[];
  onGenerate: (data: { email: string; planType: PlanType }) => void;
  onToggle: (license: LicenseItem) => void;
  onExtend: (license: LicenseItem) => void;
  onDelete: (license: LicenseItem) => void;
  onRefresh: () => void;
}

const PLAN_BADGE: Record<PlanType, { label: string; variant: 'brand' | 'success' | 'info' | 'default' }> = {
  lifetime: { label: 'Lifetime', variant: 'brand' },
  yearly: { label: 'Yearly', variant: 'info' },
  monthly: { label: 'Monthly', variant: 'success' },
  trial: { label: 'Trial', variant: 'default' },
};

export default function LicensesPanel({ licenses, onGenerate, onToggle, onExtend, onDelete, onRefresh }: LicensesPanelProps) {
  const [query, setQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | LicenseStatus>('all');
  const [planFilter, setPlanFilter] = useState<'all' | PlanType>('all');
  const [genOpen, setGenOpen] = useState(false);
  const [genEmail, setGenEmail] = useState('');
  const [genPlan, setGenPlan] = useState<PlanType>('monthly');

  const copyKey = async (key: string) => {
    try {
      await navigator.clipboard.writeText(key);
      toast.success('License key copied');
    } catch {
      toast.error('Clipboard not available');
    }
  };

  const generate = () => {
    if (!genEmail.trim() || !/^\S+@\S+\.\S+$/.test(genEmail.trim())) {
      toast.error('Enter a valid email for this license');
      return;
    }
    onGenerate({ email: genEmail.trim().toLowerCase(), planType: genPlan });
    setGenEmail('');
    setGenPlan('monthly');
    setGenOpen(false);
  };

  const revoke = (l: LicenseItem) => onToggle(l);

  const extend = (l: LicenseItem) => onExtend(l);

  const remove = (l: LicenseItem) => {
    if (!window.confirm(`Delete license ${l.key}?`)) return;
    onDelete(l);
  };

  const filtered = licenses.filter((l) => {
    if (statusFilter !== 'all' && l.status !== statusFilter) return false;
    if (planFilter !== 'all' && l.plan !== planFilter) return false;
    const q = query.trim().toLowerCase();
    if (!q) return true;
    return l.key.toLowerCase().includes(q) || l.email.toLowerCase().includes(q);
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex flex-col sm:flex-row gap-3 flex-1 flex-wrap">
          <div className="relative flex-1 min-w-[200px] max-w-xs">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-surface-500" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search key or email..."
              className={`${inputCls} pl-9 font-mono`}
            />
          </div>
          <Select value={statusFilter} onChange={(v) => setStatusFilter(v as 'all' | LicenseStatus)} className="w-36">
            <option value="all">Any status</option>
            <option value="active">Active</option>
            <option value="expired">Expired</option>
            <option value="revoked">Revoked</option>
          </Select>
          <Select value={planFilter} onChange={(v) => setPlanFilter(v as 'all' | PlanType)} className="w-36">
            <option value="all">Any plan</option>
            <option value="trial">Trial</option>
            <option value="monthly">Monthly</option>
            <option value="yearly">Yearly</option>
            <option value="lifetime">Lifetime</option>
          </Select>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" icon={<RefreshCw className="w-4 h-4" />} onClick={onRefresh}>
            Refresh
          </Button>
          <Button size="sm" icon={<Plus className="w-4 h-4" />} onClick={() => setGenOpen(true)}>
            Generate License
          </Button>
        </div>
      </div>

      <Card className="p-0 overflow-hidden border-surface-800 bg-surface-900/60">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-[11px] font-mono font-bold uppercase tracking-wider text-surface-500 border-b border-surface-800">
                <th className="px-4 py-3">License Key</th>
                <th className="px-4 py-3">Customer</th>
                <th className="px-4 py-3">Plan</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Device</th>
                <th className="px-4 py-3">Expires</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-surface-800/70">
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-4 py-10 text-center text-surface-500">
                    No licenses match your filters.
                  </td>
                </tr>
              )}
              {filtered.map((l) => (
                <tr key={l.id} className="hover:bg-surface-950/50 transition-colors">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs text-brand-300">{l.key}</span>
                      <button
                        onClick={() => copyKey(l.key)}
                        className="text-surface-500 hover:text-brand-400"
                        title="Copy key"
                      >
                        <Copy className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-surface-200">{l.email}</td>
                  <td className="px-4 py-3">
                    <Badge size="sm" variant={PLAN_BADGE[l.plan].variant}>
                      {PLAN_BADGE[l.plan].label}
                    </Badge>
                  </td>
                  <td className="px-4 py-3">
                    <Badge
                      size="sm"
                      variant={l.status === 'active' ? 'success' : l.status === 'expired' ? 'warning' : 'danger'}
                    >
                      {l.status}
                    </Badge>
                  </td>
                  <td className="px-4 py-3 font-mono text-xs text-surface-400">
                    {l.device ?? '—'}
                  </td>
                  <td className="px-4 py-3 font-mono text-xs text-surface-400">
                    {l.expiresAt
                      ? new Date(l.expiresAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
                      : 'Never'}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-1">
                      <button
                        onClick={() => revoke(l)}
                        title={l.status === 'revoked' ? 'Reactivate' : 'Revoke'}
                        className={`p-2 rounded-lg hover:bg-surface-800 ${l.status === 'revoked' ? 'text-emerald-400' : 'text-amber-400'}`}
                      >
                        {l.status === 'revoked' ? <CheckCircle2 className="w-4 h-4" /> : <Ban className="w-4 h-4" />}
                      </button>
                      <button
                        onClick={() => extend(l)}
                        title="Extend +30 days"
                        className="p-2 rounded-lg text-brand-400 hover:bg-surface-800"
                      >
                        <Timer className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => remove(l)}
                        title="Delete"
                        className="p-2 rounded-lg text-red-400 hover:bg-surface-800"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      <Modal
        open={genOpen}
        onClose={() => setGenOpen(false)}
        title="Generate License Key"
        subtitle="Creates a device-bound license for the customer's email."
        width="max-w-md"
        footer={
          <>
            <Button variant="ghost" size="sm" onClick={() => setGenOpen(false)}>
              Cancel
            </Button>
            <Button size="sm" icon={<KeyRound className="w-4 h-4" />} onClick={generate}>
              Generate Key
            </Button>
          </>
        }
      >
        <Field label="Customer Email">
          <input
            type="email"
            value={genEmail}
            onChange={(e) => setGenEmail(e.target.value)}
            placeholder="user@example.com"
            className={inputCls}
          />
        </Field>
        <Field label="Plan">
          <Select value={genPlan} onChange={(v) => setGenPlan(v as PlanType)}>
            <option value="monthly">Pro Monthly</option>
            <option value="yearly">Pro Yearly</option>
            <option value="lifetime">Lifetime Pro</option>
          </Select>
        </Field>
      </Modal>
    </div>
  );
}
