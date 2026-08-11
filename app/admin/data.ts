'use client';

import { useEffect, useRef, useState } from 'react';

export type SectionId = 'overview' | 'apps' | 'releases' | 'licenses' | 'coupons' | 'users' | 'feedback';

export type Platform = 'windows' | 'macos' | 'web' | 'android' | 'ios';
export type AppStatus = 'published' | 'draft' | 'archived';
export type ReleaseStatus = 'published' | 'draft';
export type PlanType = 'trial' | 'monthly' | 'yearly' | 'lifetime';
export type LicenseStatus = 'active' | 'revoked' | 'expired';
export type UserStatus = 'active' | 'suspended';

export interface AppItem {
  id: string;
  name: string;
  slug: string;
  platform: Platform;
  color: string;
  tagline: string;
  description: string;
  websiteUrl: string;
  latestVersion: string;
  downloadUrl: string;
  totalDownloads: number;
  status: AppStatus;
  createdAt: string;
}

export interface Release {
  id: string;
  appId: string;
  version: string;
  changelog: string;
  downloadUrl: string;
  fileSize: string;
  mandatory: boolean;
  status: ReleaseStatus;
  publishedAt: string | null;
}

export interface Coupon {
  id: string;
  code: string;
  discountPercent: number;
  maxUses: number;
  used: number;
  active: boolean;
  expiresAt: string | null;
  applicablePlans: string[];
  createdAt: string;
}

export interface LicenseItem {
  id: string;
  key: string;
  email: string;
  plan: PlanType;
  status: LicenseStatus;
  device: string | null;
  activatedAt: string | null;
  expiresAt: string | null;
  createdAt: string;
}

export interface UserItem {
  id: string;
  email: string;
  name: string;
  plan: string;
  status: UserStatus;
  joined: string;
  lastActive: string;
  trialStart: number | null;
  trialActive: boolean;
  hwid: string | null;
}

export type FeedbackCategory = 'bug' | 'feature' | 'question' | 'other';
export type FeedbackStatus = 'new' | 'in-progress' | 'resolved' | 'closed';

export interface FeedbackItem {
  id: string;
  name: string;
  email: string;
  subject: string;
  message: string;
  category: FeedbackCategory;
  app_version: string;
  status: FeedbackStatus;
  created_at: string;
}

export const ADMIN_BACKUP_KEY = 'hirebotai_admin_backup_v1';

export function uid(prefix: string): string {
  return `${prefix}_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 7)}`;
}

export function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

export function generateLicenseKey(plan: PlanType): string {
  const chars = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ';
  const rand = (n: number) =>
    Array.from({ length: n }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
  const tag =
    plan === 'lifetime' ? 'LIFETIME' : plan === 'monthly' || plan === 'yearly' ? 'PRO' : 'TRIAL';
  return `SA-${tag}-${rand(16)}-${rand(4)}`;
}

const daysAgo = (n: number) => new Date(Date.now() - n * 86400000).toISOString();
const hoursAgo = (n: number) => new Date(Date.now() - n * 3600000).toISOString();
const daysFromNow = (n: number) => new Date(Date.now() + n * 86400000).toISOString();

export const seedApps: AppItem[] = [
  {
    id: 'app_win',
    name: 'Hirebotai for Windows',
    slug: 'hirebotai-windows',
    platform: 'windows',
    color: '#00e5ff',
    tagline: 'AI interview assistant for Windows',
    description:
      'Screen capture AI, live audio transcription and stealth HUD for Windows 10/11.',
    websiteUrl: 'https://hirebotai.in',
    latestVersion: '1.17.8.26',
    downloadUrl: 'https://github.com/hirebotai/app/releases/download/v1.17.8.26/HireBotAi_Windows.zip',
    totalDownloads: 342,
    status: 'published',
    createdAt: daysAgo(120),
  },
  {
    id: 'app_mac',
    name: 'Hirebotai for macOS',
    slug: 'hirebotai-macos',
    platform: 'macos',
    color: '#ff00c8',
    tagline: 'AI interview assistant for macOS',
    description: 'Native macOS build with the same stealth HUD and audio engine.',
    websiteUrl: 'https://hirebotai.in',
    latestVersion: '1.17.8.26',
    downloadUrl: 'https://github.com/hirebotai/app/releases/download/v1.17.8.26/HireBotAi_Mac.zip',
    totalDownloads: 87,
    status: 'published',
    createdAt: daysAgo(80),
  },
  {
    id: 'app_web',
    name: 'Hirebotai Web',
    slug: 'hirebotai-web',
    platform: 'web',
    color: '#ffd166',
    tagline: 'Browser companion dashboard',
    description: 'Account dashboard, license management and update feed for subscribers.',
    websiteUrl: 'https://hirebotai.in/dashboard',
    latestVersion: '2.4.0',
    downloadUrl: 'https://hirebotai.in',
    totalDownloads: 0,
    status: 'published',
    createdAt: daysAgo(45),
  },
];

export const seedReleases: Release[] = [
  {
    id: 'rel_1',
    appId: 'app_win',
    version: '1.17.8.26',
    changelog:
      'First production release.\nInterview Mode with resume-based answers and code rendering.\nLicense and trial system with HWID binding and 12-hour revalidation.\nLive update banner via API notice system.\nWindows installer with shortcuts, auto-start, and uninstaller.\nEngine access fully gated — no bypass via direct launch.',
    downloadUrl: 'https://github.com/hirebotai/app/releases/download/v1.17.8.26/HireBotAi_Windows.zip',
    fileSize: '85 MB',
    mandatory: false,
    status: 'published',
    publishedAt: daysAgo(0),
  },
  {
    id: 'rel_2',
    appId: 'app_win',
    version: '1.0.1',
    changelog: 'Fixed audio loopback buffer issue.\nImproved response speed.\nStealthTyper indentation fix.',
    downloadUrl: 'https://github.com/hirebotai/app/releases/download/v1.17.8.26/HireBotAi_Windows.zip',
    fileSize: '42 MB',
    mandatory: false,
    status: 'published',
    publishedAt: daysAgo(40),
  },
  {
    id: 'rel_3',
    appId: 'app_mac',
    version: '1.0.0',
    changelog: 'Initial macOS release.\nSilicon + Intel builds.',
    downloadUrl: 'https://github.com/hirebotai/app/releases/download/v1.17.8.26/HireBotAi_Mac.zip',
    fileSize: '48 MB',
    mandatory: true,
    status: 'published',
    publishedAt: daysAgo(20),
  },
  {
    id: 'rel_4',
    appId: 'app_web',
    version: '2.4.0',
    changelog: 'New download feed.\nFaster license sync.',
    downloadUrl: 'https://hirebotai.in/dashboard',
    fileSize: '—',
    mandatory: false,
    status: 'published',
    publishedAt: daysAgo(2),
  },
  {
    id: 'rel_5',
    appId: 'app_web',
    version: '2.3.0',
    changelog: 'Pricing page redesign.',
    downloadUrl: 'https://hirebotai.in/dashboard',
    fileSize: '—',
    mandatory: false,
    status: 'published',
    publishedAt: daysAgo(15),
  },
];

export const seedCoupons: Coupon[] = [
  {
    id: 'cp_1',
    code: 'LAUNCH50',
    discountPercent: 50,
    maxUses: 100,
    used: 18,
    active: true,
    expiresAt: daysFromNow(60),
    applicablePlans: ['monthly', 'yearly', 'lifetime'],
    createdAt: daysAgo(30),
  },
  {
    id: 'cp_2',
    code: 'EARLYBIRD',
    discountPercent: 30,
    maxUses: 50,
    used: 42,
    active: true,
    expiresAt: daysFromNow(20),
    applicablePlans: ['monthly', 'yearly'],
    createdAt: daysAgo(25),
  },
  {
    id: 'cp_3',
    code: 'BETA99',
    discountPercent: 10,
    maxUses: 200,
    used: 3,
    active: false,
    expiresAt: daysFromNow(90),
    applicablePlans: ['lifetime'],
    createdAt: daysAgo(12),
  },
];

export const seedLicenses: LicenseItem[] = [
  {
    id: 'lic_1',
    key: 'SA-PRO-A7F3K9L2M4N6P8Q1-R2X9',
    email: 'rohan@example.com',
    plan: 'monthly',
    status: 'active',
    device: 'MS-7C56-X1',
    activatedAt: daysAgo(10),
    expiresAt: daysFromNow(20),
    createdAt: daysAgo(10),
  },
  {
    id: 'lic_2',
    key: 'SA-LIFETIME-9C4E2D8F1A6B7C3D-5K7M',
    email: 'priya@example.com',
    plan: 'lifetime',
    status: 'active',
    device: 'MS-7C56-X2',
    activatedAt: daysAgo(60),
    expiresAt: null,
    createdAt: daysAgo(60),
  },
  {
    id: 'lic_3',
    key: 'SA-PRO-B2H5J8K1M4N7P3R6-T9W4',
    email: 'arjun@example.com',
    plan: 'yearly',
    status: 'active',
    device: null,
    activatedAt: null,
    expiresAt: daysFromNow(300),
    createdAt: daysAgo(5),
  },
  {
    id: 'lic_4',
    key: 'SA-TRIAL-K3L6M9N2P5Q8R1S4-V7X1',
    email: 'demo@example.com',
    plan: 'trial',
    status: 'active',
    device: 'MS-7C56-X3',
    activatedAt: daysAgo(1),
    expiresAt: daysFromNow(1),
    createdAt: daysAgo(1),
  },
  {
    id: 'lic_5',
    key: 'SA-PRO-C5D8E1F4G7H2J5K8-M3P6',
    email: 'sneha@example.com',
    plan: 'monthly',
    status: 'expired',
    device: 'MS-7C56-X4',
    activatedAt: daysAgo(40),
    expiresAt: daysAgo(5),
    createdAt: daysAgo(40),
  },
  {
    id: 'lic_6',
    key: 'SA-PRO-D2E5F8G1H4J7K2L5-N8Q3',
    email: 'vikram@example.com',
    plan: 'lifetime',
    status: 'revoked',
    device: 'MS-7C56-X5',
    activatedAt: daysAgo(20),
    expiresAt: null,
    createdAt: daysAgo(20),
  },
  {
    id: 'lic_7',
    key: 'SA-TRIAL-M4N7P2Q5R8S1T4U7-W9X2',
    email: 'test@example.com',
    plan: 'trial',
    status: 'expired',
    device: null,
    activatedAt: null,
    expiresAt: daysAgo(3),
    createdAt: daysAgo(4),
  },
];

export const seedUsers: UserItem[] = [
  { id: 'usr_1', email: 'rohan@example.com', name: 'Rohan Mehta', plan: 'Pro Monthly', status: 'active', joined: daysAgo(10), lastActive: hoursAgo(2), trialStart: null, trialActive: false, hwid: null },
  { id: 'usr_2', email: 'priya@example.com', name: 'Priya Sharma', plan: 'Lifetime Pro', status: 'active', joined: daysAgo(60), lastActive: hoursAgo(5), trialStart: null, trialActive: false, hwid: null },
  { id: 'usr_3', email: 'arjun@example.com', name: 'Arjun Nair', plan: 'Pro Yearly', status: 'active', joined: daysAgo(5), lastActive: hoursAgo(9), trialStart: null, trialActive: false, hwid: null },
  { id: 'usr_4', email: 'demo@example.com', name: 'Demo User', plan: 'Trial', status: 'active', joined: daysAgo(1), lastActive: hoursAgo(1), trialStart: Date.now() - 86400000, trialActive: true, hwid: null },
  { id: 'usr_5', email: 'sneha@example.com', name: 'Sneha Iyer', plan: 'Pro Monthly', status: 'suspended', joined: daysAgo(40), lastActive: daysAgo(6), trialStart: null, trialActive: false, hwid: null },
  { id: 'usr_6', email: 'vikram@example.com', name: 'Vikram Rao', plan: 'Lifetime Pro', status: 'suspended', joined: daysAgo(20), lastActive: daysAgo(9), trialStart: null, trialActive: false, hwid: null },
  { id: 'usr_7', email: 'test@example.com', name: 'Test Account', plan: 'Trial', status: 'active', joined: daysAgo(4), lastActive: daysAgo(2), trialStart: Date.now() - 5 * 86400000, trialActive: false, hwid: null },
];

export const seedFeedback: FeedbackItem[] = [
  {
    id: 'fb_1',
    name: 'Rohan Mehta',
    email: 'rohan@example.com',
    subject: 'HUD capture freezes on dual-monitor setup',
    message:
      'When the interviewer is on my secondary screen, Alt+S freezes and the answer never comes back. Works fine on the primary monitor. Windows 11, both monitors 144Hz.',
    category: 'bug',
    app_version: '1.0.1',
    status: 'new',
    created_at: hoursAgo(3),
  },
  {
    id: 'fb_2',
    name: 'Priya Sharma',
    email: 'priya@example.com',
    subject: 'Auto-typer skips indentation in Python',
    message:
      'In interview mode, when the StealthTyper types code after a newline, the leading spaces get doubled because the editor auto-indents. Please fix the indent detection.',
    category: 'bug',
    app_version: '1.0.1',
    status: 'in-progress',
    created_at: daysAgo(1),
  },
  {
    id: 'fb_3',
    name: 'Arjun Nair',
    email: 'arjun@example.com',
    subject: 'Dark theme for the dashboard',
    message:
      'The web dashboard is bright and hurts my eyes during late-night interviews. Would love a proper dark mode toggle.',
    category: 'feature',
    app_version: '',
    status: 'new',
    created_at: daysAgo(2),
  },
  {
    id: 'fb_4',
    name: 'Sneha Iyer',
    email: 'sneha@example.com',
    subject: 'Where do I find my license key after purchase?',
    message:
      'Paid via UPI but never got the email with the key. Checked spam too. Payment ID: pay_M8K2XW91.',
    category: 'question',
    app_version: '',
    status: 'resolved',
    created_at: daysAgo(4),
  },
  {
    id: 'fb_5',
    name: 'Vikram Rao',
    email: 'vikram@example.com',
    subject: 'macOS build ETA?',
    message:
      'Any timeline for the macOS release? My team is on Apple Silicon and really needs the loopback audio feature.',
    category: 'feature',
    app_version: '',
    status: 'closed',
    created_at: daysAgo(6),
  },
];

export function usePersistentState<T>(
  key: string,
  initial: T
): [T, React.Dispatch<React.SetStateAction<T>>] {
  const [state, setState] = useState<T>(initial);
  const hydrated = useRef(false);

  useEffect(() => {
    if (hydrated.current) return;
    hydrated.current = true;
    try {
      const raw = window.localStorage.getItem(key);
      if (raw) setState(JSON.parse(raw) as T);
    } catch {
      /* ignore corrupt state */
    }
  }, [key]);

  useEffect(() => {
    try {
      window.localStorage.setItem(key, JSON.stringify(state));
    } catch {
      /* ignore quota errors */
    }
  }, [key, state]);

  return [state, setState];
}
