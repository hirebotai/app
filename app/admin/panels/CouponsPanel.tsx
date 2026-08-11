'use client';

import { useState } from 'react';
import { Plus, Trash2, Tag, CalendarClock, RefreshCw } from 'lucide-react';
import { Card, Button, Badge } from '@/components/ui';
import { toast } from 'sonner';
import type { Coupon } from '../data';
import { Field, inputCls } from '../ui';
import { cn } from '@/lib/utils';

const PLAN_OPTIONS: { value: string; label: string }[] = [
  { value: 'monthly', label: 'Monthly' },
  { value: 'yearly', label: 'Yearly' },
  { value: 'lifetime', label: 'Lifetime' },
];

interface CouponsPanelProps {
  coupons: Coupon[];
  onCreate: (data: { code: string; discountPercent: number; maxUses: number; expiresAt: string | null; applicablePlans: string[] }) => void;
  onToggle: (id: string, active: boolean) => void;
  onDelete: (id: string) => void;
  onRefresh: () => void;
}

export default function CouponsPanel({ coupons, onCreate, onToggle, onDelete, onRefresh }: CouponsPanelProps) {
  const [code, setCode] = useState('');
  const [discount, setDiscount] = useState('');
  const [maxUses, setMaxUses] = useState('100');
  const [expires, setExpires] = useState('');
  const [plans, setPlans] = useState<string[]>(PLAN_OPTIONS.map((p) => p.value));

  const togglePlan = (value: string) => {
    setPlans((prev) => (prev.includes(value) ? prev.filter((p) => p !== value) : [...prev, value]));
  };

  const create = (e: React.FormEvent) => {
    e.preventDefault();
    const c = code.trim().toUpperCase();
    const d = Number(discount);
    const m = Number(maxUses);
    if (!c) {
      toast.error('Enter a coupon code');
      return;
    }
    if (!d || d < 1 || d > 100) {
      toast.error('Discount must be 1–100%');
      return;
    }
    if (!m || m < 1) {
      toast.error('Max uses must be at least 1');
      return;
    }
    if (plans.length === 0) {
      toast.error('Tick at least one plan this coupon can be used on');
      return;
    }
    onCreate({
      code: c,
      discountPercent: d,
      maxUses: m,
      expiresAt: expires ? new Date(expires).toISOString() : null,
      applicablePlans: plans,
    });
    setCode('');
    setDiscount('');
    setMaxUses('100');
    setExpires('');
    setPlans(PLAN_OPTIONS.map((p) => p.value));
  };

  const toggle = (coupon: Coupon) => {
    onToggle(coupon.id, !coupon.active);
  };

  const remove = (coupon: Coupon) => {
    if (!window.confirm(`Delete coupon ${coupon.code}?`)) return;
    onDelete(coupon.id);
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
      {/* Create form */}
      <Card className="p-6 border-surface-800 bg-surface-900/60 h-fit lg:sticky lg:top-20 space-y-5">
        <div className="flex items-center gap-2">
          <Tag className="w-5 h-5 text-amber-400" />
          <h2 className="font-mono text-lg font-bold text-white">Create Coupon</h2>
        </div>
        <form onSubmit={create} className="space-y-4">
          <Field label="Coupon Code">
            <input
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              placeholder="LAUNCH50"
              className={`${inputCls} font-mono uppercase`}
            />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Discount %">
              <input
                type="number"
                min={1}
                max={100}
                value={discount}
                onChange={(e) => setDiscount(e.target.value)}
                placeholder="50"
                className={`${inputCls} font-mono`}
              />
            </Field>
            <Field label="Max Uses">
              <input
                type="number"
                min={1}
                value={maxUses}
                onChange={(e) => setMaxUses(e.target.value)}
                placeholder="100"
                className={`${inputCls} font-mono`}
              />
            </Field>
          </div>
          <Field label="Expiry Date" hint="Leave empty for no expiry.">
            <input
              type="date"
              value={expires}
              onChange={(e) => setExpires(e.target.value)}
              className={`${inputCls} font-mono`}
            />
          </Field>
          <Field label="Valid On" hint="Tick every plan this coupon can be used for.">
            <div className="flex flex-wrap gap-2">
              {PLAN_OPTIONS.map((p) => {
                const active = plans.includes(p.value);
                return (
                  <label
                    key={p.value}
                    className={cn(
                      'flex items-center gap-2 px-3 py-2 rounded-lg border cursor-pointer select-none text-sm font-mono transition-colors',
                      active
                        ? 'border-brand-500/50 bg-brand-500/10 text-brand-300'
                        : 'border-surface-700 text-surface-400 hover:border-surface-600'
                    )}
                  >
                    <input
                      type="checkbox"
                      checked={active}
                      onChange={() => togglePlan(p.value)}
                      className="accent-brand-500"
                    />
                    {p.label}
                  </label>
                );
              })}
            </div>
          </Field>
          <Button type="submit" size="sm" fullWidth icon={<Plus className="w-4 h-4" />}>
            Create Coupon
          </Button>
        </form>
      </Card>

      {/* Coupon list */}
      <div className="lg:col-span-2 space-y-4">
        <div className="flex items-center justify-between">
          <div className="text-[11px] font-mono font-bold uppercase tracking-wider text-surface-500">
            {coupons.length} coupon{coupons.length === 1 ? '' : 's'}
          </div>
          <Button variant="ghost" size="sm" icon={<RefreshCw className="w-3.5 h-3.5" />} onClick={onRefresh}>
            Refresh
          </Button>
        </div>
        {coupons.length === 0 && (
          <Card className="p-8 text-center border-dashed border-surface-700 text-surface-500">
            No coupons yet. Create your first promo code.
          </Card>
        )}
        {coupons.map((c) => {
          const pct = Math.round((c.used / c.maxUses) * 100);
          const expired = c.expiresAt ? new Date(c.expiresAt).getTime() < Date.now() : false;
          return (
            <Card key={c.id} className="p-5 border-surface-800 bg-surface-900/60 space-y-3">
              <div className="flex items-start justify-between gap-3 flex-wrap">
                <div className="flex items-center gap-3">
                  <span className="px-3 py-1.5 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-300 font-mono text-sm font-bold">
                    {c.code}
                  </span>
                  <span className="font-mono text-sm text-surface-200">{c.discountPercent}% OFF</span>
                </div>
                <div className="flex items-center gap-2">
                  <Badge size="sm" variant={c.active && !expired ? 'success' : 'default'} dot>
                    {c.active && !expired ? 'Active' : expired ? 'Expired' : 'Disabled'}
                  </Badge>
                  <Button variant="ghost" size="sm" onClick={() => toggle(c)}>
                    {c.active ? 'Disable' : 'Enable'}
                  </Button>
                  <Button variant="danger" size="sm" icon={<Trash2 className="w-3.5 h-3.5" />} onClick={() => remove(c)}>
                    Delete
                  </Button>
                </div>
              </div>

              <div className="flex items-center gap-2 flex-wrap text-[11px] font-mono">
                <span className="text-surface-500">Valid on:</span>
                {(c.applicablePlans?.length ? c.applicablePlans : ['monthly', 'yearly', 'lifetime']).map((p) => (
                  <span
                    key={p}
                    className="px-2 py-0.5 rounded-md bg-surface-800 border border-surface-700 text-surface-300 capitalize"
                  >
                    {p}
                  </span>
                ))}
              </div>

              <div>
                <div className="flex items-center justify-between text-[11px] font-mono text-surface-500 mb-1">
                  <span>
                    {c.used} / {c.maxUses} uses
                  </span>
                  <span>{pct}%</span>
                </div>
                <div className="h-1.5 rounded-full bg-surface-800 overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-amber-400 to-amber-500 transition-all"
                    style={{ width: `${Math.min(pct, 100)}%` }}
                  />
                </div>
              </div>

              <div className="flex items-center gap-4 text-[11px] font-mono text-surface-500">
                <span className="inline-flex items-center gap-1">
                  <CalendarClock className="w-3.5 h-3.5" />
                  {c.expiresAt
                    ? `Expires ${new Date(c.expiresAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`
                    : 'No expiry'}
                </span>
                <span>Created {new Date(c.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
