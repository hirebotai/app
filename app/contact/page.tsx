import type { Metadata } from 'next';
import { PageLayout, ProseSection } from '@/components/content/PageLayout';
import { Mail, MessageCircle, Github, Twitter } from 'lucide-react';

export const metadata: Metadata = {
  title: 'Contact Hirebotai — We Read Every Message',
  description:
    'Contact the Hirebotai team for support, sales, partnerships or press. Email us at hello@hirebotai.in or reach out on Twitter, GitHub and Discord.',
  alternates: { canonical: 'https://hirebotai.in/contact' },
  openGraph: {
    title: 'Contact Hirebotai',
    description: 'Get in touch with the Hirebotai team for support, partnerships or press.',
    url: 'https://hirebotai.in/contact',
  },
};

const channels = [
  {
    icon: Mail,
    label: 'Email',
    value: 'hello@hirebotai.in',
    href: 'mailto:hello@hirebotai.in',
    note: 'For sales, partnerships, press and general questions. We reply within 24 hours.',
  },
  {
    icon: MessageCircle,
    label: 'Discord',
    value: 'discord.gg/hirebotai',
    href: 'https://discord.gg/hirebotai',
    note: 'Join the community for tips, product chat and the fastest community support.',
  },
  {
    icon: Twitter,
    label: 'Twitter',
    value: '@hirebotai',
    href: 'https://twitter.com/hirebotai',
    note: 'Product updates, release announcements and behind-the-scenes.',
  },
  {
    icon: Github,
    label: 'GitHub',
    value: 'github.com/hirebotai',
    href: 'https://github.com/hirebotai',
    note: 'Track issues and follow development of the open-source core.',
  },
];

export default function ContactPage() {
  return (
    <PageLayout
      badge="Contact"
      title="Talk to the Hirebotai Team"
      subtitle="Whether it's support, a feature idea or a partnership — we read everything."
    >
      <div className="grid sm:grid-cols-2 gap-5">
        {channels.map((channel) => (
          <a
            key={channel.label}
            href={channel.href}
            target={channel.href.startsWith('http') ? '_blank' : undefined}
            rel={channel.href.startsWith('http') ? 'noopener noreferrer' : undefined}
            className="group rounded-2xl border border-surface-800 bg-surface-900/50 backdrop-blur-sm p-6 hover:border-brand-500/40 hover:shadow-glow transition-all"
          >
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-xl bg-surface-900/80 border border-surface-700 flex items-center justify-center">
                <channel.icon className="w-5 h-5 text-brand-400" />
              </div>
              <div>
                <div className="font-bold text-white">{channel.label}</div>
                <div className="text-sm text-brand-400 font-mono">{channel.value}</div>
              </div>
            </div>
            <p className="text-sm text-surface-400 leading-relaxed">{channel.note}</p>
          </a>
        ))}
      </div>

      <ProseSection title="Support-First Questions?">
        <p>
          For fast answers about setup, license activation, hotkeys and troubleshooting, head to
          our <a href="/support" className="text-brand-400 hover:underline">Support page</a> and
          the <a href="/docs" className="text-brand-400 hover:underline">Documentation</a>. Our
          FAQ covers the most common questions.
        </p>
      </ProseSection>
    </PageLayout>
  );
}
