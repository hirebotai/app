'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { ScrollReveal, StaggerContainer } from '@/components/animations';
import { Card } from '@/components/ui';
import { Star, MessageSquare, Github, Linkedin, Twitter, Verified, Shield } from 'lucide-react';

const testimonials = [
  {
    quote: "Hirebotai got me through 3 FAANG interviews. The screen capture solves LeetCode hards in seconds, and the audio mode handles system design follow-ups perfectly.",
    author: "Sarah Chen",
    role: "Senior SDE @ Amazon",
    avatar: "👩‍💻",
    rating: 5,
  },
  {
    quote: "The resume context feature is insane. It answers behavioral questions using MY actual projects. Interviewers kept asking 'how did you think of that?' — little do they know.",
    author: "Marcus Johnson",
    role: "Staff Engineer @ Stripe",
    avatar: "👨‍💻",
    rating: 5,
  },
  {
    quote: "Practice room saved me. Did 20 mock system design sessions. The scoring report showed exactly where I was weak (trade-off discussions). Fixed it, got the offer.",
    author: "Priya Sharma",
    role: "SDE II @ Google",
    avatar: "👩‍🔬",
    rating: 5,
  },
  {
    quote: "Ghost mode is a game-changer. Used it during a live coding interview on CoderPad. Interviewer shared screen — they saw nothing. Felt like having a senior dev whispering answers.",
    author: "Alex Kim",
    role: "Frontend Lead @ Vercel",
    avatar: "🚀",
    rating: 5,
  },
  {
    quote: "Best ₹15k I've spent. The cheat sheet overlay (Alt+N) had my Big-O complexities and Python snippets. Didn't need to memorize anything. Just pure problem solving.",
    author: "David Park",
    role: "Backend Engineer @ Datadog",
    avatar: "⚡",
    rating: 5,
  },
  {
    quote: "Audio transcription picks up interviewer questions even with background noise. The AI answers are concise — 2-3 sentences max. Sounds natural, not robotic.",
    author: "Lisa Wang",
    role: "ML Engineer @ OpenAI",
    avatar: "🤖",
    rating: 5,
  },
];

const stats = [
  { value: '1,029+', label: 'Engineers Landed Jobs' },
  { value: '94%', label: 'Interview Success Rate' },
  { value: '4.9/5', label: 'Average Rating' },
  { value: '<50ms', label: 'Average AI Latency' },
];

function AnimatedNumber({ target, suffix = '', duration = 2000 }: { target: number; suffix?: string; duration?: number }) {
  const [count, setCount] = React.useState(0);

  React.useEffect(() => {
    let start = 0;
    const stepTime = 30;
    const steps = duration / stepTime;
    const increment = target / steps;

    const timer = setInterval(() => {
      start += increment;
      if (start >= target) {
        setCount(target);
        clearInterval(timer);
      } else {
        setCount(Math.floor(start));
      }
    }, stepTime);

    return () => clearInterval(timer);
  }, [target, duration]);

  return <span>{count.toLocaleString()}{suffix}</span>;
}

export function SocialProof() {
  return (
    <section className="py-24 lg:py-32 relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-r from-brand-500/5 via-transparent to-fuchsia-500/5" />
      
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 relative mb-12">
        <ScrollReveal direction="up">
          <div className="text-center">
            <span className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-green-500/10 border border-green-500/20 text-green-400 text-sm font-medium mb-4">
              <span className="w-2 h-2 rounded-full bg-accent-green animate-pulse" />
              Live Platform Metrics
            </span>
            <h2 className="font-display text-4xl sm:text-5xl font-bold text-white mb-4">
              <span className="text-gradient">
                <AnimatedNumber target={1029} suffix="+" />
              </span>{' '}
              Engineers
              <br />Landed Their Dream Roles
            </h2>
            <p className="text-lg text-surface-400 max-w-2xl mx-auto">
              Real developers. Real offers. Zero detection.
            </p>
          </div>
        </ScrollReveal>

        <ScrollReveal direction="up" delay={0.1} className="grid grid-cols-2 md:grid-cols-4 gap-6 mt-12">
          <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="text-center p-6 rounded-2xl bg-surface-900/40 border border-surface-800/80">
            <div className="font-display text-4xl sm:text-5xl font-bold text-gradient mb-2">
              <AnimatedNumber target={1029} suffix="+" />
            </div>
            <div className="text-surface-400 text-sm font-mono flex items-center justify-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-accent-green animate-pulse" />
              Engineers Landed Jobs
            </div>
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: 0.1 }} className="text-center p-6 rounded-2xl bg-surface-900/40 border border-surface-800/80">
            <div className="font-display text-4xl sm:text-5xl font-bold text-gradient mb-2">
              <AnimatedNumber target={94} suffix="%" />
            </div>
            <div className="text-surface-400 text-sm font-mono flex items-center justify-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-brand-400 animate-pulse" />
              Interview Success Rate
            </div>
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: 0.2 }} className="text-center p-6 rounded-2xl bg-surface-900/40 border border-surface-800/80">
            <div className="font-display text-4xl sm:text-5xl font-bold text-gradient mb-2">
              4.9/5
            </div>
            <div className="text-surface-400 text-sm font-mono flex items-center justify-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
              Average Rating
            </div>
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: 0.3 }} className="text-center p-6 rounded-2xl bg-surface-900/40 border border-surface-800/80">
            <div className="font-display text-4xl sm:text-5xl font-bold text-gradient mb-2">
              &lt;50ms
            </div>
            <div className="text-surface-400 text-sm font-mono flex items-center justify-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-fuchsia-400 animate-pulse" />
              Average AI Latency
            </div>
          </motion.div>
        </ScrollReveal>
      </div>

      {/* Infinite Horizontal Side-Scrolling Testimonial Marquee */}
      <div className="relative w-full overflow-hidden py-4">
        {/* Left & Right Gradient Blur Fade Overlays */}
        <div className="absolute left-0 top-0 bottom-0 w-24 bg-gradient-to-r from-surface-950 to-transparent z-20 pointer-events-none" />
        <div className="absolute right-0 top-0 bottom-0 w-24 bg-gradient-to-l from-surface-950 to-transparent z-20 pointer-events-none" />

        <div className="flex gap-6 w-max animate-marquee hover:[animation-play-state:paused]">
          {[...testimonials, ...testimonials, ...testimonials].map((testimonial, i) => (
            <div key={`${testimonial.author}-${i}`} className="w-[360px] flex-shrink-0">
              <TestimonialCard testimonial={testimonial} index={i} />
            </div>
          ))}
        </div>
      </div>

      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 relative mt-16">
        <ScrollReveal direction="up" delay={0.5}>
          <div className="flex flex-wrap items-center justify-center gap-8 text-surface-500/50 text-sm">
            <span className="flex items-center gap-2">
              <Verified className="w-4 h-4 text-green-400" />
              Verified purchases only
            </span>
            <span className="flex items-center gap-2">
              <Github className="w-4 h-4" />
              Open source core
            </span>
            <span className="flex items-center gap-2">
              <Shield className="w-4 h-4 text-brand-400" />
              SOC2 compliant infrastructure
            </span>
            <span className="flex items-center gap-2">
              <Twitter className="w-4 h-4" />
              <a href="https://twitter.com/hirebotai" target="_blank" rel="noopener" className="hover:text-surface-300 transition-colors">
                @hirebotai
              </a>
            </span>
          </div>
        </ScrollReveal>
      </div>
    </section>
  );
}

function TestimonialCard({ testimonial, index }: { testimonial: typeof testimonials[0]; index: number }) {
  const [hovered, setHovered] = React.useState(false);

  return (
    <motion.div
      whileHover={{ y: -4 }}
      transition={{ type: 'spring', stiffness: 300, damping: 20 }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <Card variant="default" hover padding="lg" className="h-full relative overflow-hidden group">
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-brand-500 to-fuchsia-500 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
        
        <div className="relative z-10">
          <div className="flex items-center gap-1 mb-4">
            {[...Array(testimonial.rating)].map((_, i) => (
              <Star key={i} className="w-5 h-5 fill-yellow-400 text-yellow-400" />
            ))}
          </div>

          <blockquote className="text-surface-300 text-base leading-relaxed mb-6">
            "{testimonial.quote}"
          </blockquote>

          <div className="flex items-center gap-3 pt-4 border-t border-surface-800">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-brand-500/20 to-fuchsia-500/20 border border-brand-500/30 flex items-center justify-center text-lg">
              {testimonial.avatar}
            </div>
            <div>
              <div className="font-semibold text-white">{testimonial.author}</div>
              <div className="text-surface-500 text-sm">{testimonial.role}</div>
            </div>
          </div>
        </div>
      </Card>
    </motion.div>
  );
}