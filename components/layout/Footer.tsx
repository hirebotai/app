'use client';

import Link from 'next/link';
import { cn } from '@/lib/utils';
import { Sparkles, Github, Twitter, MessageCircle, Mail, ArrowRight, Terminal, Bot } from 'lucide-react';

const footerLinks = {
  product: [
    { name: 'Features', href: '/features' },
    { name: 'Pricing', href: '/pricing' },
    { name: 'Download', href: '/download' },
    { name: 'Support', href: '/support' },
  ],
  resources: [
    { name: 'How It Works', href: '/instructions' },
    { name: 'Documentation', href: '/docs' },
    { name: 'Blog', href: '/blog' },
    { name: 'Changelog', href: '/changelog' },
  ],
  company: [
    { name: 'About', href: '/about' },
    { name: 'Contact', href: '/contact' },
    { name: 'Customer Login', href: '/login' },
    { name: 'Hirebotai vs Parakeet', href: '/hirebotai-vs-parakeet-ai' },
  ],
  legal: [
    { name: 'Privacy Policy', href: '/legal/privacy' },
    { name: 'Terms of Service', href: '/legal/terms' },
    { name: 'EULA', href: '/legal/eula' },
    { name: 'Cookie Policy', href: '/legal/cookies' },
  ],
};

const socialLinks = [
  { name: 'Twitter', href: 'https://twitter.com/hirebotai', icon: Twitter },
  { name: 'GitHub', href: 'https://github.com/hirebotai', icon: Github },
  { name: 'Discord', href: 'https://discord.gg/hirebotai', icon: MessageCircle },
  { name: 'Email', href: 'mailto:hello@hirebotai.in', icon: Mail },
];

export function Footer() {
  return (
    <footer className="bg-surface-950 border-t border-surface-800">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-16 lg:py-20">
        <div className="xl:grid xl:grid-cols-3 xl:gap-8">
          <div className="space-y-8">
            <Link href="/" className="flex items-center group" aria-label="Hirebotai Home">
              <img
                src="/logo.png"
                alt="Hirebotai Logo"
                className="w-[90px] h-[90px] sm:w-[108px] sm:h-[108px] object-contain animate-float drop-shadow-[0_0_28px_rgba(0,229,255,0.8)] group-hover:scale-105 transition-transform duration-200 -mr-6 sm:-mr-8"
              />
              <span className="font-mono text-lg sm:text-xl font-bold uppercase tracking-widest text-white group-hover:text-brand-300 transition-colors">
                HIREBOT<span className="text-brand-400">AI</span>
              </span>
            </Link>
            <p className="text-surface-400 text-sm leading-relaxed max-w-xs">
              The stealth AI interview assistant that helps you ace technical interviews. Screen capture, audio transcription, and real-time answers — all invisible to screen sharing.
            </p>
            <div className="flex items-center gap-4">
              {socialLinks.map((item) => (
                <a
                  key={item.name}
                  href={item.href}
                  className="p-2 rounded-lg bg-surface-900/60 border border-surface-800 text-surface-400 hover:text-brand-400 hover:border-brand-500/40 hover:shadow-glow transition-all"
                  aria-label={item.name}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <item.icon className="w-5 h-5" />
                </a>
              ))}
            </div>
          </div>

          <div className="mt-12 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8 xl:col-span-2 xl:mt-0">
              <div>
                <h3 className="text-sm font-semibold text-surface-50 tracking-wider uppercase">Product</h3>
                <ul className="mt-4 space-y-3" role="list">
                  {footerLinks.product.map((link) => (
                    <li key={link.name}>
                      <Link
                        href={link.href}
                        className="text-sm text-surface-400 hover:text-brand-400 transition-colors flex items-center gap-2"
                      >
                        {link.name}
                        <ArrowRight className="w-3.5 h-3.5 opacity-0 group-hover:opacity-100 transition-opacity" />
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
              <div>
                <h3 className="text-sm font-semibold text-surface-50 tracking-wider uppercase">Resources</h3>
                <ul className="mt-4 space-y-3" role="list">
                  {footerLinks.resources.map((link) => (
                    <li key={link.name}>
                      <Link
                        href={link.href}
                        className="text-sm text-surface-400 hover:text-brand-400 transition-colors flex items-center gap-2"
                      >
                        {link.name}
                        <ArrowRight className="w-3.5 h-3.5 opacity-0 group-hover:opacity-100 transition-opacity" />
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
              <div>
                <h3 className="text-sm font-semibold text-surface-50 tracking-wider uppercase">Company</h3>
                <ul className="mt-4 space-y-3" role="list">
                  {footerLinks.company.map((link) => (
                    <li key={link.name}>
                      <Link
                        href={link.href}
                        className="text-sm text-surface-400 hover:text-brand-400 transition-colors flex items-center gap-2"
                      >
                        {link.name}
                        <ArrowRight className="w-3.5 h-3.5 opacity-0 group-hover:opacity-100 transition-opacity" />
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
              <div>
                <h3 className="text-sm font-semibold text-surface-50 tracking-wider uppercase">Legal</h3>
                <ul className="mt-4 space-y-3" role="list">
                  {footerLinks.legal.map((link) => (
                    <li key={link.name}>
                      <Link
                        href={link.href}
                        className="text-sm text-surface-400 hover:text-brand-400 transition-colors flex items-center gap-2"
                      >
                        {link.name}
                        <ArrowRight className="w-3.5 h-3.5 opacity-0 group-hover:opacity-100 transition-opacity" />
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
          </div>
        </div>

        <div className="mt-16 border-t border-surface-800 pt-8">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <p className="text-sm text-surface-500">
              © {new Date().getFullYear()} Hirebotai. All rights reserved.
            </p>
            <p className="text-sm text-surface-500">
              Made with {' '}
              <span className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                {' '} in India
              </span>
            </p>
          </div>
        </div>
      </div>
    </footer>
  );
}