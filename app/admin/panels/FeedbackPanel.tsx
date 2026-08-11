'use client';

import { useCallback, useEffect, useState } from 'react';
import {
  MessageSquare,
  RefreshCw,
  Plus,
  Trash2,
  Search,
  Bug,
  Inbox,
  Wrench,
  Clock,
  AlertTriangle,
} from 'lucide-react';
import { Card, Button, Badge } from '@/components/ui';
import { toast } from 'sonner';
import { formatRelativeTime, cn } from '@/lib/utils';
import { seedFeedback, uid, type FeedbackCategory, type FeedbackItem, type FeedbackStatus } from '../data';
import { Field, Modal, Select, inputCls, textareaCls } from '../ui';

const STATUS_BADGE: Record<FeedbackStatus, { label: string; variant: 'danger' | 'info' | 'success' | 'default' }> = {
  new: { label: 'New', variant: 'danger' },
  'in-progress': { label: 'In Progress', variant: 'info' },
  resolved: { label: 'Resolved', variant: 'success' },
  closed: { label: 'Closed', variant: 'default' },
};

const CATEGORY_BADGE: Record<FeedbackCategory, { label: string; variant: 'danger' | 'brand' | 'info' | 'warning' }> = {
  bug: { label: 'Bug', variant: 'danger' },
  feature: { label: 'Feature', variant: 'brand' },
  question: { label: 'Question', variant: 'info' },
  other: { label: 'Other', variant: 'warning' },
};

const STATUS_OPTIONS: FeedbackStatus[] = ['new', 'in-progress', 'resolved', 'closed'];

export default function FeedbackPanel() {
  const [items, setItems] = useState<FeedbackItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [apiOk, setApiOk] = useState(true);
  const [query, setQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | FeedbackStatus>('all');
  const [categoryFilter, setCategoryFilter] = useState<'all' | FeedbackCategory>('all');
  const [addOpen, setAddOpen] = useState(false);

  // Manual add form
  const [fName, setFName] = useState('');
  const [fEmail, setFEmail] = useState('');
  const [fSubject, setFSubject] = useState('');
  const [fCategory, setFCategory] = useState<FeedbackCategory>('bug');
  const [fVersion, setFVersion] = useState('');
  const [fMessage, setFMessage] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/feedback');
      if (!res.ok) throw new Error('bad status');
      const data = (await res.json()) as { feedback?: FeedbackItem[] };
      setItems(data.feedback ?? []);
      setApiOk(true);
    } catch {
      setItems(seedFeedback);
      setApiOk(false);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const updateStatus = async (item: FeedbackItem, status: FeedbackStatus) => {
    const prev = items;
    setItems((cur) => cur.map((i) => (i.id === item.id ? { ...i, status } : i)));
    try {
      const res = await fetch('/api/feedback', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: item.id, status }),
      });
      if (!res.ok) throw new Error('bad status');
      toast.success(`Marked as ${STATUS_BADGE[status].label}`);
    } catch {
      setItems(prev);
      toast.error('Could not update status — Supabase API not configured');
    }
  };

  const remove = async (item: FeedbackItem) => {
    if (!window.confirm(`Delete feedback "${item.subject}"?`)) return;
    const prev = items;
    setItems((cur) => cur.filter((i) => i.id !== item.id));
    try {
      const res = await fetch('/api/feedback', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: item.id }),
      });
      if (!res.ok) throw new Error('bad status');
      toast.success('Feedback deleted');
    } catch {
      setItems(prev);
      toast.error('Could not delete — Supabase API not configured');
    }
  };

  const addFeedback = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fName.trim() || !/^\S+@\S+\.\S+$/.test(fEmail) || !fSubject.trim() || !fMessage.trim()) {
      toast.error('Name, valid email, subject and message are required');
      return;
    }
    const record = {
      name: fName.trim(),
      email: fEmail.trim().toLowerCase(),
      subject: fSubject.trim(),
      message: fMessage.trim(),
      category: fCategory,
      app_version: fVersion.trim(),
    };
    try {
      const res = await fetch('/api/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(record),
      });
      if (res.ok) {
        await load();
        toast.success('Feedback saved');
      } else {
        throw new Error('bad status');
      }
    } catch {
      const local: FeedbackItem = { ...record, id: uid('fb'), status: 'new', created_at: new Date().toISOString() };
      setItems((cur) => [local, ...cur]);
      setApiOk(false);
      toast.warning('API not configured — feedback saved locally only');
    }
    setFName('');
    setFEmail('');
    setFSubject('');
    setFCategory('bug');
    setFVersion('');
    setFMessage('');
    setAddOpen(false);
  };

  const counts = {
    new: items.filter((i) => i.status === 'new').length,
    'in-progress': items.filter((i) => i.status === 'in-progress').length,
    resolved: items.filter((i) => i.status === 'resolved').length,
  };

  const filtered = items.filter((i) => {
    if (statusFilter !== 'all' && i.status !== statusFilter) return false;
    if (categoryFilter !== 'all' && i.category !== categoryFilter) return false;
    const q = query.trim().toLowerCase();
    if (!q) return true;
    return (
      i.subject.toLowerCase().includes(q) ||
      i.message.toLowerCase().includes(q) ||
      i.email.toLowerCase().includes(q) ||
      i.name.toLowerCase().includes(q)
    );
  });

  return (
    <div className="space-y-6">
      {!apiOk && (
        <div className="flex items-center gap-2 p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs">
          <AlertTriangle className="w-4 h-4 shrink-0" />
          Supabase is not configured (no NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY). Showing sample feedback
          data — status changes and deletes will not persist.
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[
          { label: 'New', value: counts.new, icon: Inbox, color: 'text-red-400', variant: 'danger' as const },
          { label: 'In Progress', value: counts['in-progress'], icon: Wrench, color: 'text-sky-400', variant: 'info' as const },
          { label: 'Resolved', value: counts.resolved, icon: Clock, color: 'text-emerald-400', variant: 'success' as const },
        ].map((c) => (
          <div
            key={c.label}
            className="flex items-center gap-3 p-4 rounded-xl border border-surface-800 bg-surface-900/40"
          >
            <c.icon className={`w-5 h-5 ${c.color}`} />
            <div>
              <div className="font-mono text-xl font-bold text-white">{c.value}</div>
              <div className="text-[11px] font-mono uppercase tracking-wider text-surface-500">{c.label}</div>
            </div>
          </div>
        ))}
      </div>

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex flex-col sm:flex-row gap-3 flex-1 flex-wrap">
          <div className="relative flex-1 min-w-[200px] max-w-xs">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-surface-500" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search feedback..."
              className={`${inputCls} pl-9`}
            />
          </div>
          <Select value={statusFilter} onChange={(v) => setStatusFilter(v as 'all' | FeedbackStatus)} className="w-40">
            <option value="all">Any status</option>
            <option value="new">New</option>
            <option value="in-progress">In Progress</option>
            <option value="resolved">Resolved</option>
            <option value="closed">Closed</option>
          </Select>
          <Select value={categoryFilter} onChange={(v) => setCategoryFilter(v as 'all' | FeedbackCategory)} className="w-40">
            <option value="all">Any category</option>
            <option value="bug">Bug</option>
            <option value="feature">Feature</option>
            <option value="question">Question</option>
            <option value="other">Other</option>
          </Select>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="secondary" size="sm" icon={<RefreshCw className="w-4 h-4" />} onClick={() => void load()}>
            Refresh
          </Button>
          <Button size="sm" icon={<Plus className="w-4 h-4" />} onClick={() => setAddOpen(true)}>
            Add Feedback
          </Button>
        </div>
      </div>

      <div className="space-y-4">
        {loading && (
          <Card className="p-8 text-center border-dashed border-surface-700 text-surface-500">
            Loading feedback…
          </Card>
        )}
        {!loading && filtered.length === 0 && (
          <Card className="p-8 text-center border-dashed border-surface-700 text-surface-500">
            No feedback matches your filters. New submissions from the support page appear here.
          </Card>
        )}
        {filtered.map((item) => (
          <Card key={item.id} className="p-5 border-surface-800 bg-surface-900/60 space-y-3">
            <div className="flex items-start justify-between gap-4 flex-wrap">
              <div className="flex items-center gap-3 min-w-0">
                <div
                  className={cn(
                    'w-10 h-10 rounded-xl border flex items-center justify-center shrink-0',
                    item.category === 'bug'
                      ? 'bg-red-500/10 border-red-500/30 text-red-400'
                      : item.category === 'feature'
                        ? 'bg-brand-500/10 border-brand-500/30 text-brand-400'
                        : 'bg-sky-500/10 border-sky-500/30 text-sky-400'
                  )}
                >
                  {item.category === 'bug' ? (
                    <Bug className="w-5 h-5" />
                  ) : (
                    <MessageSquare className="w-5 h-5" />
                  )}
                </div>
                <div className="min-w-0">
                  <h3 className="font-semibold text-surface-100 truncate">{item.subject}</h3>
                  <div className="text-[11px] font-mono text-surface-500">
                    {item.name} &lt;{item.email}&gt;
                    {item.app_version && ` · v${item.app_version}`}
                    {` · ${formatRelativeTime(item.created_at)}`}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                <Badge size="sm" variant={CATEGORY_BADGE[item.category].variant}>
                  {CATEGORY_BADGE[item.category].label}
                </Badge>
                <Badge size="sm" variant={STATUS_BADGE[item.status].variant} dot>
                  {STATUS_BADGE[item.status].label}
                </Badge>
              </div>
            </div>

            <div className="rounded-xl bg-surface-950 border border-surface-800 p-4">
              <p className="text-sm text-surface-300 leading-relaxed whitespace-pre-wrap">{item.message}</p>
            </div>

            <div className="flex items-center gap-2 pt-1">
              <div className="w-40">
                <Select value={item.status} onChange={(v) => void updateStatus(item, v as FeedbackStatus)}>
                  {STATUS_OPTIONS.map((s) => (
                    <option key={s} value={s}>
                      {STATUS_BADGE[s].label}
                    </option>
                  ))}
                </Select>
              </div>
              <Button
                variant="danger"
                size="sm"
                className="ml-auto"
                icon={<Trash2 className="w-3.5 h-3.5" />}
                onClick={() => void remove(item)}
              >
                Delete
              </Button>
            </div>
          </Card>
        ))}
      </div>

      <Modal
        open={addOpen}
        onClose={() => setAddOpen(false)}
        title="Log Feedback Manually"
        subtitle="Add feedback received via email, Discord or phone."
        width="max-w-lg"
        footer={
          <>
            <Button variant="ghost" size="sm" onClick={() => setAddOpen(false)}>
              Cancel
            </Button>
            <Button size="sm" onClick={(e) => void addFeedback(e)}>
              Save Feedback
            </Button>
          </>
        }
      >
        <form onSubmit={addFeedback} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="Name">
              <input value={fName} onChange={(e) => setFName(e.target.value)} placeholder="Jane Doe" className={inputCls} />
            </Field>
            <Field label="Email">
              <input
                type="email"
                value={fEmail}
                onChange={(e) => setFEmail(e.target.value)}
                placeholder="jane@example.com"
                className={inputCls}
              />
            </Field>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="Subject">
              <input
                value={fSubject}
                onChange={(e) => setFSubject(e.target.value)}
                placeholder="HUD capture freezes"
                className={inputCls}
              />
            </Field>
            <Field label="Category">
              <Select value={fCategory} onChange={(v) => setFCategory(v as FeedbackCategory)}>
                <option value="bug">Bug</option>
                <option value="feature">Feature</option>
                <option value="question">Question</option>
                <option value="other">Other</option>
              </Select>
            </Field>
          </div>
          <Field label="App Version (optional)">
            <input
              value={fVersion}
              onChange={(e) => setFVersion(e.target.value)}
              placeholder="1.0.1"
              className={`${inputCls} font-mono`}
            />
          </Field>
          <Field label="Message">
            <textarea
              rows={4}
              value={fMessage}
              onChange={(e) => setFMessage(e.target.value)}
              placeholder="Describe the issue or request in detail."
              className={textareaCls}
            />
          </Field>
        </form>
      </Modal>
    </div>
  );
}
