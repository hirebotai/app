'use client';

import { useState } from 'react';
import { Plus, Pencil, Trash2, Megaphone, Rocket, Download, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { Card, Button, Badge } from '@/components/ui';
import { toast } from 'sonner';
import type { AppItem, Release, ReleaseStatus } from '../data';
import { uid } from '../data';
import { Field, Modal, Select, inputCls, textareaCls } from '../ui';

interface ReleasesPanelProps {
  apps: AppItem[];
  releases: Release[];
  setReleases: React.Dispatch<React.SetStateAction<Release[]>>;
  setApps: React.Dispatch<React.SetStateAction<AppItem[]>>;
}

interface ReleaseForm {
  appId: string;
  version: string;
  changelog: string;
  downloadUrl: string;
  fileSize: string;
  mandatory: boolean;
  status: ReleaseStatus;
}

export default function ReleasesPanel({ apps, releases, setReleases, setApps }: ReleasesPanelProps) {
  const [filterAppId, setFilterAppId] = useState('all');
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Release | null>(null);
  const [form, setForm] = useState<ReleaseForm>({
    appId: apps[0]?.id ?? '',
    version: '1.0.0',
    changelog: '',
    downloadUrl: '',
    fileSize: '42 MB',
    mandatory: false,
    status: 'draft',
  });

  const appName = (id: string) => apps.find((a) => a.id === id)?.name ?? 'Unknown app';

  const openCreate = () => {
    setForm({
      appId: apps[0]?.id ?? '',
      version: '1.0.0',
      changelog: '',
      downloadUrl: '',
      fileSize: '42 MB',
      mandatory: false,
      status: 'draft',
    });
    setEditing(null);
    setModalOpen(true);
  };

  const openEdit = (r: Release) => {
    setForm({
      appId: r.appId,
      version: r.version,
      changelog: r.changelog,
      downloadUrl: r.downloadUrl,
      fileSize: r.fileSize,
      mandatory: r.mandatory,
      status: r.status,
    });
    setEditing(r);
    setModalOpen(true);
  };

  const publishRelease = (release: Release, appId: string) => {
    const app = apps.find((a) => a.id === appId);
    setReleases((prev) =>
      prev.map((r) =>
        r.id === release.id
          ? { ...r, status: 'published', publishedAt: r.publishedAt ?? new Date().toISOString() }
          : r
      )
    );
    setApps((prev) =>
      prev.map((a) =>
        a.id === appId
          ? { ...a, latestVersion: release.version, downloadUrl: release.downloadUrl, status: 'published' }
          : a
      )
    );
    toast.success(
      `v${release.version} broadcast to all ${app ? app.name : 'app'} installs!`
    );
  };

  const handleSave = () => {
    if (!form.appId) {
      toast.error('Select an app for this release');
      return;
    }
    if (!form.version.trim()) {
      toast.error('Version number is required');
      return;
    }

    if (editing) {
      setReleases((prev) =>
        prev.map((r) =>
          r.id === editing.id
            ? {
                ...r,
                appId: form.appId,
                version: form.version.trim(),
                changelog: form.changelog,
                downloadUrl: form.downloadUrl,
                fileSize: form.fileSize,
                mandatory: form.mandatory,
                status: form.status,
              }
            : r
        )
      );
      toast.success(`Release v${form.version} updated`);
      if (form.status === 'published') {
        publishRelease(
          { ...editing, version: form.version.trim(), downloadUrl: form.downloadUrl, appId: form.appId },
          form.appId
        );
      }
    } else {
      const release: Release = {
        id: uid('rel'),
        appId: form.appId,
        version: form.version.trim(),
        changelog: form.changelog,
        downloadUrl: form.downloadUrl,
        fileSize: form.fileSize,
        mandatory: form.mandatory,
        status: form.status,
        publishedAt: form.status === 'published' ? new Date().toISOString() : null,
      };
      setReleases((prev) => [release, ...prev]);
      if (form.status === 'published') {
        publishRelease(release, form.appId);
      } else {
        toast.success(`Draft v${form.version} saved`);
      }
    }
    setModalOpen(false);
  };

  const handleDelete = (r: Release) => {
    if (!window.confirm(`Delete release v${r.version} for ${appName(r.appId)}?`)) return;
    setReleases((prev) => prev.filter((x) => x.id !== r.id));
    toast.success(`Release v${r.version} deleted`);
  };

  const filtered = releases.filter((r) => filterAppId === 'all' || r.appId === filterAppId);
  const sorted = [...filtered].sort((a, b) => {
    const pa = a.publishedAt ?? a.id;
    const pb = b.publishedAt ?? b.id;
    return pb.localeCompare(pa);
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Select value={filterAppId} onChange={setFilterAppId} className="w-64">
            <option value="all">All apps</option>
            {apps.map((a) => (
              <option key={a.id} value={a.id}>
                {a.name}
              </option>
            ))}
          </Select>
          <span className="text-xs font-mono text-surface-500 hidden sm:inline">
            {sorted.length} release{sorted.length === 1 ? '' : 's'}
          </span>
        </div>
        <Button size="sm" icon={<Plus className="w-4 h-4" />} onClick={openCreate}>
          Add Release
        </Button>
      </div>

      <div className="space-y-4">
        {sorted.length === 0 && (
          <Card className="p-8 text-center border-dashed border-surface-700 text-surface-500">
            No releases yet. Create a new release to ship an update.
          </Card>
        )}
        {sorted.map((r) => {
          const app = apps.find((a) => a.id === r.appId);
          const isLatest =
            app && app.latestVersion === r.version && r.status === 'published';
          return (
            <Card key={r.id} className="p-5 border-surface-800 bg-surface-900/60 space-y-4">
              <div className="flex items-start justify-between gap-4 flex-wrap">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-brand-500/20 to-fuchsia-500/20 border border-brand-500/30 text-brand-300 flex items-center justify-center">
                    <Rocket className="w-6 h-6" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-mono text-lg font-extrabold text-white">v{r.version}</span>
                      <Badge size="sm" variant={r.status === 'published' ? 'success' : 'warning'}>
                        {r.status}
                      </Badge>
                      {r.mandatory && (
                        <Badge size="sm" variant="danger" dot>
                          Mandatory
                        </Badge>
                      )}
                      {isLatest && (
                        <Badge size="sm" variant="brand" dot>
                          Latest
                        </Badge>
                      )}
                    </div>
                    <div className="text-[11px] font-mono text-surface-500 mt-1">
                      {app ? app.name : 'Unknown app'} · {r.fileSize}
                      {r.publishedAt && ` · published ${new Date(r.publishedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {r.status !== 'published' && (
                    <Button
                      size="sm"
                      icon={<Megaphone className="w-4 h-4" />}
                      onClick={() => publishRelease(r, r.appId)}
                    >
                      Broadcast
                    </Button>
                  )}
                  <Button variant="ghost" size="sm" icon={<Pencil className="w-3.5 h-3.5" />} onClick={() => openEdit(r)}>
                    Edit
                  </Button>
                  <Button variant="danger" size="sm" icon={<Trash2 className="w-3.5 h-3.5" />} onClick={() => handleDelete(r)}>
                    Delete
                  </Button>
                </div>
              </div>

              {r.changelog && (
                <div className="rounded-xl bg-surface-950 border border-surface-800 p-4">
                  <div className="text-[11px] font-mono font-bold uppercase tracking-wider text-surface-500 mb-2 flex items-center gap-2">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> Release Notes
                  </div>
                  <pre className="whitespace-pre-wrap text-xs text-surface-300 font-sans leading-relaxed">
                    {r.changelog}
                  </pre>
                </div>
              )}

              {r.downloadUrl && (
                <div className="flex items-center gap-2 text-xs font-mono text-surface-400">
                  <Download className="w-4 h-4 text-brand-400 shrink-0" />
                  <a
                    href={r.downloadUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="truncate hover:text-brand-300 underline-offset-2 hover:underline"
                  >
                    {r.downloadUrl}
                  </a>
                </div>
              )}
            </Card>
          );
        })}
      </div>

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editing ? `Edit v${editing.version}` : 'Add New Release'}
        subtitle="Ship a new version. Publishing broadcasts it to every installed app."
        width="max-w-xl"
        footer={
          <>
            <Button variant="ghost" size="sm" onClick={() => setModalOpen(false)}>
              Cancel
            </Button>
            <Button size="sm" onClick={handleSave}>
              {editing ? 'Save Release' : form.status === 'published' ? 'Add & Broadcast' : 'Save Draft'}
            </Button>
          </>
        }
      >
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label="App" hint="Which app this release belongs to.">
            <Select value={form.appId} onChange={(v) => setForm((f) => ({ ...f, appId: v }))}>
              {apps.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.name}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Version Number">
            <input
              value={form.version}
              onChange={(e) => setForm((f) => ({ ...f, version: e.target.value }))}
              placeholder="1.0.1"
              className={`${inputCls} font-mono`}
            />
          </Field>
          <Field label="Installer / Download URL">
            <input
              value={form.downloadUrl}
              onChange={(e) => setForm((f) => ({ ...f, downloadUrl: e.target.value }))}
              placeholder="https://hirebotai.in/Setup-1.0.1.exe"
              className={`${inputCls} font-mono`}
            />
          </Field>
          <Field label="File Size">
            <input
              value={form.fileSize}
              onChange={(e) => setForm((f) => ({ ...f, fileSize: e.target.value }))}
              placeholder="42 MB"
              className={`${inputCls} font-mono`}
            />
          </Field>
        </div>
        <Field label="Changelog / Release Notes">
          <textarea
            rows={4}
            value={form.changelog}
            onChange={(e) => setForm((f) => ({ ...f, changelog: e.target.value }))}
            placeholder={"Fixed audio loopback buffer issue.\nImproved response speed."}
            className={textareaCls}
          />
        </Field>
        <div className="flex flex-col sm:flex-row gap-4">
          <label className="flex items-center gap-2 text-sm text-surface-200 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={form.mandatory}
              onChange={(e) => setForm((f) => ({ ...f, mandatory: e.target.checked }))}
              className="accent-brand-500 w-4 h-4"
            />
            Force this update (mandatory)
          </label>
          <label className="flex items-center gap-2 text-sm text-surface-200 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={form.status === 'published'}
              onChange={(e) =>
                setForm((f) => ({ ...f, status: e.target.checked ? 'published' : 'draft' }))
              }
              className="accent-brand-500 w-4 h-4"
            />
            Publish & broadcast immediately
          </label>
        </div>
        {form.status === 'published' && (
          <div className="flex items-center gap-2 p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            Publishing will set v{form.version || '?'} as the live version and prompt all installed apps to update.
          </div>
        )}
      </Modal>
    </div>
  );
}
