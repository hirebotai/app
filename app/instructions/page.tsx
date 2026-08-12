import React from 'react';
import Link from 'next/link';
import type { Metadata } from 'next';
import { 
  Play, 
  CheckCircle2, 
  XCircle, 
  AlertTriangle, 
  Keyboard, 
  Monitor, 
  EyeOff, 
  ShieldCheck, 
  Sparkles,
  HelpCircle
} from 'lucide-react';
import { Button } from '@/components/ui';

export const metadata: Metadata = {
  title: 'How Hirebotai Works — Setup Guide, Hotkeys & Best Practices',
  description:
    'Complete Hirebotai setup guide: install, add API keys, hotkey reference (Alt+S, Alt+Q, Alt+A and more), screen capture solving, stealth HUD and best practices.',
  alternates: { canonical: 'https://hirebotai.in/instructions' },
  openGraph: {
    title: 'How Hirebotai Works — Setup Guide, Hotkeys & Best Practices',
    description:
      'Install, add API keys, use hotkeys like Alt+S for screen capture solving, and follow best practices.',
    url: 'https://hirebotai.in/instructions',
  },
};

export default function InstructionsPage() {
  return (
    <div className="min-h-screen bg-surface-950 text-surface-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-5xl mx-auto space-y-16">
        
        {/* Header Title */}
        <div className="text-center space-y-4">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-brand-500/10 border border-brand-500/20 text-brand-400 text-xs font-mono font-semibold uppercase tracking-wider">
            <Sparkles className="w-3.5 h-3.5" /> Official App Guide
          </div>
          <h1 className="text-3xl sm:text-5xl font-extrabold tracking-tight text-white font-mono">
            HOW HIREBOTAI WORKS
          </h1>
          <p className="max-w-2xl mx-auto text-surface-400 text-base sm:text-lg">
            Essential setup guide, key features, exact hotkeys, dos and don&apos;ts, and video walkthrough.
          </p>
        </div>

        {/* Video Tutorial Section */}
        <div className="relative rounded-2xl overflow-hidden border border-brand-500/30 bg-surface-900/80 shadow-[0_0_50px_rgba(0,229,255,0.15)] p-4 sm:p-6 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-white font-mono font-bold text-lg">
              <Play className="w-5 h-5 text-brand-400 fill-brand-400" /> Complete Video Walkthrough
            </div>
            <span className="text-xs font-mono text-surface-400 bg-surface-800 px-2.5 py-1 rounded-full">
              HD Tutorial
            </span>
          </div>

          <div className="relative w-full aspect-video rounded-xl overflow-hidden bg-black/60 border border-surface-700/60 flex items-center justify-center group">
            {/* Embedded YouTube Player Placeholder - Update src with your YouTube embed URL */}
            <iframe
              className="w-full h-full border-0"
              src="https://www.youtube.com/embed/dQw4w9WgXcQ"
              title="Hirebotai Complete How-To Guide Video"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
              allowFullScreen
            />
          </div>
          <p className="text-xs text-center text-surface-400 font-mono">
            Watch the video above to see visual screen captures (`Alt+S`), stealth mode (`Alt+Q`), and audio loopback (`Alt+A`) in real-time.
          </p>
        </div>

        {/* How It Works - Core Flow */}
        <div className="space-y-8">
          <h2 className="text-2xl font-bold font-mono text-white flex items-center gap-2">
            <Monitor className="w-6 h-6 text-brand-400" /> Core How-It-Works Workflow
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="p-6 rounded-xl bg-surface-900/60 border border-surface-800 space-y-3">
              <div className="w-10 h-10 rounded-lg bg-brand-500/10 border border-brand-500/20 text-brand-400 font-mono font-bold flex items-center justify-center text-lg">
                1
              </div>
              <h3 className="font-bold text-white text-base font-mono">Launch App &amp; Add API Keys</h3>
              <p className="text-surface-400 text-sm leading-relaxed">
                Open `Hirebotai.exe`. Go to the <strong>API Keys</strong> page in the dashboard and enter your free OpenRouter or Gemini Key (for Vision screen captures) and Groq Key (for Audio).
              </p>
            </div>

            <div className="p-6 rounded-xl bg-surface-900/60 border border-surface-800 space-y-3">
              <div className="w-10 h-10 rounded-lg bg-brand-500/10 border border-brand-500/20 text-brand-400 font-mono font-bold flex items-center justify-center text-lg">
                2
              </div>
              <h3 className="font-bold text-white text-base font-mono">Press Hotkey to Solve</h3>
              <p className="text-surface-400 text-sm leading-relaxed">
                When a coding question or MCQ appears on your screen during an exam or interview, press <strong>Alt + S</strong>. The app captures your screen and displays the solution in the stealth HUD.
              </p>
            </div>

            <div className="p-6 rounded-xl bg-surface-900/60 border border-surface-800 space-y-3">
              <div className="w-10 h-10 rounded-lg bg-brand-500/10 border border-brand-500/20 text-brand-400 font-mono font-bold flex items-center justify-center text-lg">
                3
              </div>
              <h3 className="font-bold text-white text-base font-mono">Stealth HUD Protection</h3>
              <p className="text-surface-400 text-sm leading-relaxed">
                The floating HUD uses <strong>Windows WDA_EXCLUDEFROMCAPTURE</strong> protection. It is 100% invisible to screen shares (Zoom, Google Meet, Teams, Discord).
              </p>
            </div>
          </div>
        </div>

        {/* Hotkeys Quick Reference */}
        <div className="p-6 sm:p-8 rounded-2xl bg-surface-900/80 border border-surface-800 space-y-6">
          <h2 className="text-2xl font-bold font-mono text-white flex items-center gap-2">
            <Keyboard className="w-6 h-6 text-brand-400" /> Hotkey Cheat Sheet
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm font-mono">
             <div className="p-4 rounded-xl bg-surface-950/80 border border-surface-800 flex items-center justify-between">
               <div>
                 <div className="text-white font-bold">Alt + O</div>
                 <div className="text-surface-400 text-xs mt-0.5">Start Engine / Activate HUD</div>
               </div>
               <span className="px-2 py-1 rounded bg-emerald-500/20 text-emerald-300 text-xs">Engine</span>
             </div>

             <div className="p-4 rounded-xl bg-surface-950/80 border border-surface-800 flex items-center justify-between">
               <div>
                 <div className="text-white font-bold">Alt + E</div>
                 <div className="text-surface-400 text-xs mt-0.5">Exit Application</div>
               </div>
               <span className="px-2 py-1 rounded bg-red-500/20 text-red-300 text-xs">Exit</span>
             </div>

             <div className="p-4 rounded-xl bg-surface-950/80 border border-surface-800 flex items-center justify-between">
               <div>
                 <div className="text-white font-bold">Alt + S</div>
                 <div className="text-surface-400 text-xs mt-0.5">Screen Capture &amp; Auto-Solve</div>
               </div>
               <span className="px-2 py-1 rounded bg-brand-500/20 text-brand-300 text-xs">Primary</span>
             </div>

             <div className="p-4 rounded-xl bg-surface-950/80 border border-surface-800 flex items-center justify-between">
               <div>
                 <div className="text-white font-bold">Alt + Q</div>
                 <div className="text-surface-400 text-xs mt-0.5">Stealth Search / Follow-up Query</div>
               </div>
               <span className="px-2 py-1 rounded bg-purple-500/20 text-purple-300 text-xs">Follow-up</span>
             </div>

             <div className="p-4 rounded-xl bg-surface-950/80 border border-surface-800 flex items-center justify-between">
               <div>
                 <div className="text-white font-bold">Alt + A</div>
                 <div className="text-surface-400 text-xs mt-0.5">Toggle Live Audio Listening</div>
               </div>
               <span className="px-2 py-1 rounded bg-blue-500/20 text-blue-300 text-xs">Audio</span>
             </div>

             <div className="p-4 rounded-xl bg-surface-950/80 border border-surface-800 flex items-center justify-between">
               <div>
                 <div className="text-white font-bold">Alt + C</div>
                 <div className="text-surface-400 text-xs mt-0.5">Clear History &amp; Start New Chat</div>
               </div>
               <span className="px-2 py-1 rounded bg-red-500/20 text-red-300 text-xs">Clear</span>
             </div>

             <div className="p-4 rounded-xl bg-surface-950/80 border border-surface-800 flex items-center justify-between">
               <div>
                 <div className="text-white font-bold">Alt + H</div>
                 <div className="text-surface-400 text-xs mt-0.5">Hide / Show Floating HUD</div>
               </div>
               <span className="px-2 py-1 rounded bg-surface-800 text-surface-300 text-xs">Toggle</span>
             </div>

             <div className="p-4 rounded-xl bg-surface-950/80 border border-surface-800 flex items-center justify-between">
               <div>
                 <div className="text-white font-bold">Alt + T</div>
                 <div className="text-surface-400 text-xs mt-0.5">Toggle Click-Through Ghost Mode</div>
               </div>
               <span className="px-2 py-1 rounded bg-surface-800 text-surface-300 text-xs">Ghost</span>
             </div>
          </div>
        </div>

        {/* Dos & Don'ts Rules */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* WHAT TO DO */}
          <div className="p-6 rounded-2xl bg-emerald-950/20 border border-emerald-500/30 space-y-4">
            <h3 className="text-xl font-bold font-mono text-emerald-400 flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5" /> What You SHOULD Do
            </h3>
            <ul className="space-y-3 text-sm text-surface-300">
               <li className="flex items-start gap-2">
                 <span className="text-emerald-400 font-bold">•</span>
                 <span>Press <strong>Alt + O</strong> to start the stealth engine and activate the HUD before you begin.</span>
               </li>
               <li className="flex items-start gap-2">
                 <span className="text-emerald-400 font-bold">•</span>
                 <span>Keep the question and code text clearly visible on your main screen before pressing <strong>Alt + S</strong>.</span>
               </li>
               <li className="flex items-start gap-2">
                 <span className="text-emerald-400 font-bold">•</span>
                 <span>Use <strong>Alt + C</strong> to clear chat memory whenever you start a completely new problem.</span>
               </li>
               <li className="flex items-start gap-2">
                 <span className="text-emerald-400 font-bold">•</span>
                 <span>Use <strong>Alt + Q</strong> when asking follow-up questions about the code currently in memory (e.g. &quot;convert to Java&quot;).</span>
               </li>
               <li className="flex items-start gap-2">
                 <span className="text-emerald-400 font-bold">•</span>
                 <span>Press <strong>Alt + E</strong> to safely exit the app when you are done.</span>
               </li>
               <li className="flex items-start gap-2">
                 <span className="text-emerald-400 font-bold">•</span>
                 <span>Test your setup in the <strong>Practice Room</strong> inside the app before joining live exams or interviews.</span>
               </li>
            </ul>
          </div>

          {/* WHAT NOT TO DO */}
          <div className="p-6 rounded-2xl bg-rose-950/20 border border-rose-500/30 space-y-4">
            <h3 className="text-xl font-bold font-mono text-rose-400 flex items-center gap-2">
              <XCircle className="w-5 h-5" /> What You SHOULD NOT Do
            </h3>
            <ul className="space-y-3 text-sm text-surface-300">
              <li className="flex items-start gap-2">
                <span className="text-rose-400 font-bold">•</span>
                <span><strong>DO NOT</strong> minimize the app window or cover the question with other windows before pressing <strong>Alt + S</strong>.</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-rose-400 font-bold">•</span>
                <span><strong>DO NOT</strong> attempt to use text-only AI models (like plain Groq) for visual screenshot solves without an OpenRouter or Gemini key.</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-rose-400 font-bold">•</span>
                <span><strong>DO NOT</strong> share your <code>SA-XXXX-XXXX</code> license key with other devices. Licenses are bound to 1 PC.</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-rose-400 font-bold">•</span>
                <span><strong>DO NOT</strong> spam hotkey captures repeatedly within 2 seconds (a 2s cooldown protects against API rate limits).</span>
              </li>
            </ul>
          </div>
        </div>

        {/* CTA Footer */}
        <div className="text-center p-8 rounded-2xl bg-surface-900/60 border border-surface-800 space-y-4">
          <h3 className="text-xl font-bold font-mono text-white">Ready to start?</h3>
          <p className="text-surface-400 text-sm max-w-md mx-auto">
            Download the Windows application and enter your license key to unlock instant screen capture solving.
          </p>
          <div className="flex items-center justify-center gap-4 pt-2">
            <Link href="/download">
              <Button size="lg">Download Windows App</Button>
            </Link>
            <Link href="/pricing">
              <Button variant="outline" size="lg">View Pricing &amp; License</Button>
            </Link>
          </div>
        </div>

      </div>
    </div>
  );
}
