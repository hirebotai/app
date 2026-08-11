import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { posts, getPost, formatDate } from '../posts';
import { JsonLd } from '@/components/seo/JsonLd';
import { Calendar, Clock, ArrowLeft } from 'lucide-react';

interface PostPageProps {
  params: { slug: string };
}

export function generateStaticParams() {
  return posts.map((post) => ({ slug: post.slug }));
}

export function generateMetadata({ params }: PostPageProps): Metadata {
  const post = getPost(params.slug);
  if (!post) return {};

  return {
    title: post.title,
    description: post.description,
    alternates: { canonical: `https://hirebotai.in/blog/${post.slug}` },
    openGraph: {
      title: post.title,
      description: post.description,
      url: `https://hirebotai.in/blog/${post.slug}`,
      type: 'article',
      publishedTime: post.date,
    },
  };
}

export default function BlogPostPage({ params }: PostPageProps) {
  const post = getPost(params.slug);
  if (!post) notFound();

  return (
    <div className="min-h-screen bg-surface-950 text-surface-50 pt-10 pb-24 px-4 sm:px-6 lg:px-8">
      <JsonLd
        data={{
          '@context': 'https://schema.org',
          '@type': 'BlogPosting',
          headline: post.title,
          description: post.description,
          datePublished: post.date,
          author: { '@type': 'Organization', name: 'Hirebotai' },
          publisher: {
            '@type': 'Organization',
            name: 'Hirebotai',
            logo: { '@type': 'ImageObject', url: 'https://hirebotai.in/logo.png' },
          },
          mainEntityOfPage: `https://hirebotai.in/blog/${post.slug}`,
        }}
      />

      <article className="max-w-3xl mx-auto">
        <Link
          href="/blog"
          className="inline-flex items-center gap-1.5 text-sm text-surface-400 hover:text-brand-400 transition-colors mb-8"
        >
          <ArrowLeft className="w-4 h-4" />
          All articles
        </Link>

        <header className="mb-10">
          <div className="flex items-center gap-3 mb-4">
            <span className="px-2.5 py-1 rounded-full bg-brand-500/10 border border-brand-500/20 text-brand-400 text-xs font-mono">
              {post.category}
            </span>
            <span className="flex items-center gap-1 text-xs text-surface-500">
              <Calendar className="w-3 h-3" />
              {formatDate(post.date)}
            </span>
            <span className="flex items-center gap-1 text-xs text-surface-500">
              <Clock className="w-3 h-3" />
              {post.readTime}
            </span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-bold font-mono text-white tracking-tight leading-tight mb-4">
            {post.title}
          </h1>
          <p className="text-lg text-surface-400 leading-relaxed">{post.description}</p>
        </header>

        <div className="space-y-10">
          {post.sections.map((section, i) => (
            <section key={i}>
              {section.title && (
                <h2 className="text-2xl font-bold font-mono text-white mb-4">{section.title}</h2>
              )}
              <div className="space-y-4 text-surface-300 text-base leading-relaxed">
                {section.blocks.map((block, j) => {
                  if (block.kind === 'p') {
                    return <p key={j}>{block.text}</p>;
                  }
                  if (block.kind === 'list') {
                    return (
                      <ul key={j} className="list-disc list-inside space-y-2 text-surface-300">
                        {block.items?.map((item, k) => (
                          <li key={k}>{item}</li>
                        ))}
                      </ul>
                    );
                  }
                  return (
                    <pre
                      key={j}
                      className="rounded-xl border border-surface-800 bg-surface-950 p-5 overflow-x-auto text-sm font-mono text-brand-200 leading-relaxed"
                    >
                      <code>{block.code}</code>
                    </pre>
                  );
                })}
              </div>
            </section>
          ))}
        </div>

        <div className="mt-16 pt-8 border-t border-surface-800 flex items-center justify-between">
          <Link href="/blog" className="text-sm text-surface-400 hover:text-brand-400 transition-colors">
            ← Back to blog
          </Link>
          <Link href="/pricing" className="text-sm text-brand-400 hover:underline">
            Practice with Hirebotai →
          </Link>
        </div>
      </article>
    </div>
  );
}
