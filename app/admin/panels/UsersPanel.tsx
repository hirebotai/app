'use client';

import { useState } from 'react';
import { Search, Ban, CheckCircle2, Trash2, RefreshCw } from 'lucide-react';
import { Card, Button, Badge } from '@/components/ui';
import { formatRelativeTime, getInitials } from '@/lib/utils';
import type { UserItem, UserStatus } from '../data';
import { Select, inputCls } from '../ui';

interface UsersPanelProps {
  users: UserItem[];
  onToggle: (user: UserItem) => void;
  onDelete: (user: UserItem) => void;
  onRefresh: () => void;
}

function trialTimeLeft(trialStart: number): string {
  const remaining = 3 * 24 * 60 * 60 * 1000 - (Date.now() - trialStart);
  if (remaining <= 0) return '0h';
  const h = Math.floor(remaining / 3600000);
  const m = Math.floor((remaining % 3600000) / 60000);
  return `${h}h ${m}m`;
}

export default function UsersPanel({ users, onToggle, onDelete, onRefresh }: UsersPanelProps) {
  const [query, setQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | UserStatus>('all');

  const toggleStatus = (u: UserItem) => onToggle(u);

  const remove = (u: UserItem) => {
    if (!window.confirm(`Delete user ${u.email}? This cannot be undone.`)) return;
    onDelete(u);
  };

  const filtered = users.filter((u) => {
    if (statusFilter !== 'all' && u.status !== statusFilter) return false;
    const q = query.trim().toLowerCase();
    if (!q) return true;
    return (
      u.email.toLowerCase().includes(q) ||
      (u.name?.toLowerCase().includes(q) ?? false) ||
      u.plan.toLowerCase().includes(q)
    );
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[200px] max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-surface-500" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search users..."
            className={`${inputCls} pl-9`}
          />
        </div>
        <Select value={statusFilter} onChange={(v) => setStatusFilter(v as 'all' | UserStatus)} className="w-40">
          <option value="all">All users</option>
          <option value="active">Active</option>
          <option value="suspended">Suspended</option>
        </Select>
        <Button variant="ghost" size="sm" icon={<RefreshCw className="w-4 h-4" />} onClick={onRefresh}>
          Refresh
        </Button>
      </div>

      <Card className="p-0 overflow-hidden border-surface-800 bg-surface-900/60">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-[11px] font-mono font-bold uppercase tracking-wider text-surface-500 border-b border-surface-800">
                <th className="px-4 py-3">User</th>
                <th className="px-4 py-3">Plan</th>
                <th className="px-4 py-3">Trial</th>
                <th className="px-4 py-3">HWID</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Joined</th>
                <th className="px-4 py-3">Last Active</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-surface-800/70">
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={8} className="px-4 py-10 text-center text-surface-500">
                    No users match your filters.
                  </td>
                </tr>
              )}
              {filtered.map((u) => (
                <tr key={u.id} className="hover:bg-surface-950/50 transition-colors">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-lg bg-brand-500/10 border border-brand-500/20 text-brand-300 text-xs font-mono font-bold flex items-center justify-center shrink-0">
                        {getInitials(u.name || u.email)}
                      </div>
                      <div className="min-w-0">
                        <div className="font-medium text-surface-100 truncate">{u.name || '—'}</div>
                        <div className="text-xs text-surface-500 truncate">{u.email}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <Badge size="sm" variant={u.plan.toLowerCase().includes('lifetime') ? 'brand' : u.plan.toLowerCase().includes('trial') ? 'default' : 'info'}>
                      {u.plan}
                    </Badge>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-col gap-1">
                      {u.trialStart ? (
                        <>
                          <Badge
                            size="sm"
                            variant={u.trialActive ? 'info' : 'danger'}
                            dot={u.trialActive}
                          >
                            {u.trialActive ? 'In trial' : 'Trial over'}
                          </Badge>
                          {u.trialActive && (
                            <span className="text-[10px] font-mono text-surface-500">
                              {trialTimeLeft(u.trialStart)} left
                            </span>
                          )}
                        </>
                      ) : (
                        <span className="text-xs text-surface-600">—</span>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    {u.hwid ? (
                      <span className="text-xs font-mono text-surface-400" title={u.hwid}>
                        {u.hwid.length > 18 ? `${u.hwid.slice(0, 18)}…` : u.hwid}
                      </span>
                    ) : (
                      <span className="text-xs text-surface-600">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <Badge size="sm" variant={u.status === 'active' ? 'success' : 'danger'} dot>
                      {u.status}
                    </Badge>
                  </td>
                  <td className="px-4 py-3 text-xs font-mono text-surface-400">
                    {formatRelativeTime(u.joined)}
                  </td>
                  <td className="px-4 py-3 text-xs font-mono text-surface-400">
                    {formatRelativeTime(u.lastActive)}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-1">
                      <Button
                        variant={u.status === 'suspended' ? 'ghost' : 'ghost'}
                        size="sm"
                        icon={
                          u.status === 'suspended' ? (
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                          ) : (
                            <Ban className="w-3.5 h-3.5 text-amber-400" />
                          )
                        }
                        onClick={() => toggleStatus(u)}
                      >
                        {u.status === 'suspended' ? 'Activate' : 'Suspend'}
                      </Button>
                      <Button
                        variant="danger"
                        size="sm"
                        icon={<Trash2 className="w-3.5 h-3.5" />}
                        onClick={() => remove(u)}
                      >
                        Delete
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
