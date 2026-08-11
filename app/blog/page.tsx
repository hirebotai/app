import type { Metadata } from 'next';
import Link from 'next/link';
import { posts, formatDate } from './posts';
import { ArrowRight, Calendar, Clock } from 'lucide-react';

export const metadata: Metadata = {
  title: 'Blog — Coding Interview Prep, Cheat Sheets & Guides',
  description:
    'Practical guides for developers: coding interview preparation, Big-O cheat sheets, system design frameworks and interview tips from the Hirebotai team.',
  alternates: { canonical: 'https://hirebotai.in/blog' },
  openGraph: {
    title: 'Blog — Coding Interview Prep, Cheat Sheets & Guides',
    description:
      'Practical coding interview prep, Big-O cheat sheets and system design guides.',
    url: 'https://hirebotai.in/blog',
  },
};

export default function BlogPage() {
  return (
    <div className="min-h-screen bg-surface-950 text-surface-50 pt-10 pb-24 px-4 sm:px-6 lg:px-8">
      <div className="max-w-5xl mx-auto">
        <header className="text-center space-y-4 mb-12">
          <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-brand-500/10 border border-brand-500/20 text-brand-400 text-xs font-mono font-semibold uppercase tracking-wider">
            Blog
          </span>
          <h1 className="text-3xl sm:text-4xl font-bold font-mono text-white tracking-tight">
            Interview Prep Guides & Cheat Sheets
          </h1>
          <p className="max-w-2xl mx-auto text-surface-400 text-base">
            Practical, no-fluff engineering content to help you prepare for technical interviews.
          </p>
        </header>

        <div className="grid md:grid-cols-2 gap-6">
          {posts.map((post) => (
            <Link
              key={post.slug}
              href={`/blog/${post.slug}`}
              className="group rounded-2xl border border-surface-800 bg-surface-900/50 backdrop-blur-sm p-6 hover:border-brand-500/40 hover:shadow-glow transition-all"
            >
              <div className="flex items-center gap-3 mb-3">
                <span className="px-2.5 py-1 rounded-full bg-brand-500/10 border border-brand-500/20 text-brand-400 text-xs font-mono">
                  {post.category}
                </span>
                <span className="flex items-center gap-1 text-xs text-surface-500">
                  <Clock className="w-3 h-3" />
                  {post.readTime}
                </span>
              </div>
              <h2 className="text-xl font-bold text-white leading-snug mb-2 group-hover:text-brand-300 transition-colors">
                {post.title}
              </h2>
              <p className="text-sm text-surface-400 leading-relaxed mb-4">{post.description}</p>
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-1 text-xs text-surface-500">
                  <Calendar className="w-3 h-3" />
                  {formatDate(post.date)}
                </span>
                <span className="inline-flex items-center gap-1 text-sm font-mono text-brand-400">
                  Read
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
                </span>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
