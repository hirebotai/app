'use client';

import { useState } from 'react';
import { Plus, Pencil, Trash2, Archive, Globe, Monitor, Smartphone, Package, Rocket, Search } from 'lucide-react';
import { Card, Button, Badge } from '@/components/ui';
import { toast } from 'sonner';
import type { AppItem, AppStatus, Platform, Release } from '../data';
import { uid, slugify } from '../data';
import { Field, Modal, Select, inputCls, textareaCls } from '../ui';

interface AppsPanelProps {
  apps: AppItem[];
  setApps: React.Dispatch<React.SetStateAction<AppItem[]>>;
  releases: Release[];
}

interface AppForm {
  name: string;
  slug: string;
  platform: Platform;
  color: string;
  tagline: string;
  description: string;
  websiteUrl: string;
  latestVersion: string;
  downloadUrl: string;
  status: AppStatus;
}

const emptyForm: AppForm = {
  name: '',
  slug: '',
  platform: 'windows',
  color: '#00e5ff',
  tagline: '',
  description: '',
  websiteUrl: '',
  latestVersion: '1.0.0',
  downloadUrl: '',
  status: 'draft',
};

const COLORS = ['#00e5ff', '#ff00c8', '#00ff9d', '#ffd166', '#38bdf8', '#e879f9', '#ff4d6d', '#a78bfa'];

const PLATFORM_ICON: Record<Platform, React.ComponentType<{ className?: string }>> = {
  windows: Monitor,
  macos: Monitor,
  web: Globe,
  android: Smartphone,
  ios: Smartphone,
};

export default function AppsPanel({ apps, setApps, releases }: AppsPanelProps) {
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<AppItem | null>(null);
  const [form, setForm] = useState<AppForm>(emptyForm);
  const [query, setQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | AppStatus>('all');

  const openCreate = () => {
    setForm(emptyForm);
    setEditing(null);
    setModalOpen(true);
  };

  const openEdit = (app: AppItem) => {
    setForm({
      name: app.name,
      slug: app.slug,
      platform: app.platform,
      color: app.color,
      tagline: app.tagline,
      description: app.description,
      websiteUrl: app.websiteUrl,
      latestVersion: app.latestVersion,
      downloadUrl: app.downloadUrl,
      status: app.status,
    });
    setEditing(app);
    setModalOpen(true);
  };

  const handleSave = () => {
    if (!form.name.trim()) {
      toast.error('App name is required');
      return;
    }
    const slug = form.slug.trim() || slugify(form.name);
    if (editing) {
      setApps((prev) =>
        prev.map((a) =>
          a.id === editing.id
            ? { ...a, ...form, slug, name: form.name.trim() }
            : a
        )
      );
      toast.success(`App "${form.name}" updated`);
    } else {
      const app: AppItem = {
        id: uid('app'),
        name: form.name.trim(),
        slug,
        platform: form.platform,
        color: form.color,
        tagline: form.tagline,
        description: form.description,
        websiteUrl: form.websiteUrl,
        latestVersion: form.latestVersion,
        downloadUrl: form.downloadUrl,
        totalDownloads: 0,
        status: form.status,
        createdAt: new Date().toISOString(),
      };
      setApps((prev) => [app, ...prev]);
      toast.success(`New app "${form.name}" added to catalog`);
    }
    setModalOpen(false);
  };

  const handleDelete = (app: AppItem) => {
    if (!window.confirm(`Delete app "${app.name}"? Its releases will be removed too.`)) return;
    setApps((prev) => prev.filter((a) => a.id !== app.id));
    toast.success(`App "${app.name}" deleted`);
  };

  const toggleArchive = (app: AppItem) => {
    const next = app.status === 'archived' ? 'published' : 'archived';
    setApps((prev) => prev.map((a) => (a.id === app.id ? { ...a, status: next } : a)));
    toast.success(`App "${app.name}" ${next === 'archived' ? 'archived' : 'restored'}`);
  };

  const filtered = apps.filter((a) => {
    if (statusFilter !== 'all' && a.status !== statusFilter) return false;
    const q = query.trim().toLowerCase();
    if (!q) return true;
    return (
      a.name.toLowerCase().includes(q) ||
      a.slug.toLowerCase().includes(q) ||
      a.platform.toLowerCase().includes(q)
    );
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex flex-col sm:flex-row gap-3 flex-1">
          <div className="relative flex-1 max-w-xs">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-surface-500" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search apps..."
              className={`${inputCls} pl-9`}
            />
          </div>
          <Select value={statusFilter} onChange={(v) => setStatusFilter(v as 'all' | AppStatus)} className="w-40">
            <option value="all">All statuses</option>
            <option value="published">Published</option>
            <option value="draft">Draft</option>
            <option value="archived">Archived</option>
          </Select>
        </div>
        <Button size="sm" icon={<Plus className="w-4 h-4" />} onClick={openCreate}>
          Add New App
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {filtered.length === 0 && (
          <Card className="p-8 text-center border-dashed border-surface-700 col-span-full text-surface-500">
            No apps match. Add your first app to get started.
          </Card>
        )}
        {filtered.map((app) => {
          const Icon = PLATFORM_ICON[app.platform];
          const releaseCount = releases.filter((r) => r.appId === app.id).length;
          return (
            <Card key={app.id} className="p-5 border-surface-800 bg-surface-900/60 space-y-4">
              <div className="flex items-start gap-4">
                <div
                  className="w-12 h-12 rounded-xl flex items-center justify-center text-lg font-bold font-mono shrink-0"
                  style={{
                    background: `${app.color}22`,
                    border: `1px solid ${app.color}55`,
                    color: app.color,
                  }}
                >
                  {app.name.replace('Hirebotai for ', '').slice(0, 2).toUpperCase()}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="font-semibold text-surface-100 truncate">{app.name}</h3>
                    <Badge size="sm" variant={app.status === 'published' ? 'success' : app.status === 'draft' ? 'warning' : 'default'}>
                      {app.status}
                    </Badge>
                  </div>
                  <div className="text-[11px] font-mono text-surface-500 mt-0.5">{app.slug}</div>
                  <p className="text-xs text-surface-400 mt-1 line-clamp-2">{app.description}</p>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2 text-[11px] font-mono text-surface-400">
                <span className="inline-flex items-center gap-1 px-2 py-1 rounded bg-surface-950 border border-surface-800">
                  <Icon className="w-3.5 h-3.5 text-brand-400" /> {app.platform}
                </span>
                <span className="inline-flex items-center gap-1 px-2 py-1 rounded bg-surface-950 border border-surface-800">
                  <Rocket className="w-3.5 h-3.5 text-fuchsia-400" /> v{app.latestVersion}
                </span>
                <span className="inline-flex items-center gap-1 px-2 py-1 rounded bg-surface-950 border border-surface-800">
                  <Package className="w-3.5 h-3.5 text-amber-400" /> {releaseCount} release{releaseCount === 1 ? '' : 's'}
                </span>
                <span className="inline-flex items-center gap-1 px-2 py-1 rounded bg-surface-950 border border-surface-800">
                  <Smartphone className="w-3.5 h-3.5 text-sky-400" /> {app.totalDownloads.toLocaleString('en-IN')} DLs
                </span>
              </div>

              <div className="flex items-center gap-2 pt-3 border-t border-surface-800">
                <Button variant="ghost" size="sm" icon={<Pencil className="w-3.5 h-3.5" />} onClick={() => openEdit(app)}>
                  Edit
                </Button>
                <Button variant="ghost" size="sm" icon={<Archive className="w-3.5 h-3.5" />} onClick={() => toggleArchive(app)}>
                  {app.status === 'archived' ? 'Restore' : 'Archive'}
                </Button>
                <Button variant="danger" size="sm" className="ml-auto" icon={<Trash2 className="w-3.5 h-3.5" />} onClick={() => handleDelete(app)}>
                  Delete
                </Button>
              </div>
            </Card>
          );
        })}
      </div>

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editing ? `Edit ${editing.name}` : 'Add New App'}
        subtitle="Register a new product/installer in your app catalog."
        width="max-w-xl"
        footer={
          <>
            <Button variant="ghost" size="sm" onClick={() => setModalOpen(false)}>
              Cancel
            </Button>
            <Button size="sm" onClick={handleSave}>
              {editing ? 'Save Changes' : 'Add App'}
            </Button>
          </>
        }
      >
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label="App Name">
            <input
              value={form.name}
              onChange={(e) => {
                const name = e.target.value;
                setForm((f) => ({ ...f, name, slug: slugify(name) }));
              }}
              placeholder="Hirebotai for Windows"
              className={inputCls}
            />
          </Field>
          <Field label="Slug">
            <input
              value={form.slug}
              onChange={(e) => setForm((f) => ({ ...f, slug: slugify(e.target.value) }))}
              placeholder="hirebotai-windows"
              className={`${inputCls} font-mono`}
            />
          </Field>
          <Field label="Platform">
            <Select value={form.platform} onChange={(v) => setForm((f) => ({ ...f, platform: v as Platform }))}>
              <option value="windows">Windows</option>
              <option value="macos">macOS</option>
              <option value="web">Web</option>
              <option value="android">Android</option>
              <option value="ios">iOS</option>
            </Select>
          </Field>
          <Field label="Status">
            <Select value={form.status} onChange={(v) => setForm((f) => ({ ...f, status: v as AppStatus }))}>
              <option value="draft">Draft</option>
              <option value="published">Published</option>
              <option value="archived">Archived</option>
            </Select>
          </Field>
          <Field label="Tagline">
            <input
              value={form.tagline}
              onChange={(e) => setForm((f) => ({ ...f, tagline: e.target.value }))}
              placeholder="AI interview assistant for Windows"
              className={inputCls}
            />
          </Field>
          <Field label="Latest Version">
            <input
              value={form.latestVersion}
              onChange={(e) => setForm((f) => ({ ...f, latestVersion: e.target.value }))}
              placeholder="1.0.0"
              className={`${inputCls} font-mono`}
            />
          </Field>
          <Field label="Website URL" hint="Where users can find this app.">
            <input
              value={form.websiteUrl}
              onChange={(e) => setForm((f) => ({ ...f, websiteUrl: e.target.value }))}
              placeholder="https://hirebotai.in"
              className={`${inputCls} font-mono`}
            />
          </Field>
          <Field label="Download URL">
            <input
              value={form.downloadUrl}
              onChange={(e) => setForm((f) => ({ ...f, downloadUrl: e.target.value }))}
              placeholder="https://hirebotai.in/Setup.exe"
              className={`${inputCls} font-mono`}
            />
          </Field>
        </div>
        <Field label="Accent Color">
          <div className="flex flex-wrap gap-2">
            {COLORS.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => setForm((f) => ({ ...f, color: c }))}
                className={`w-8 h-8 rounded-lg transition-transform ${form.color === c ? 'ring-2 ring-white scale-110' : 'hover:scale-105'}`}
                style={{ backgroundColor: c }}
                aria-label={`Color ${c}`}
              />
            ))}
          </div>
        </Field>
        <Field label="Description">
          <textarea
            rows={3}
            value={form.description}
            onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
            placeholder="Short description of what this app does."
            className={textareaCls}
          />
        </Field>
      </Modal>
    </div>
  );
}
