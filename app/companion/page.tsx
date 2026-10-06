'use client';

import { useEffect, useState, useRef } from 'react';

export default function CompanionPage() {
  const [pcUrl, setPcUrl] = useState<string>('');
  const [isConnected, setIsConnected] = useState<boolean>(false);
  const [status, setStatus] = useState<string>('Ready');
  const [answer, setAnswer] = useState<string>('Ready for problem capture. Type below or snap on PC...');
  const [transcription, setTranscription] = useState<string>('Listening...');
  const [promptInput, setPromptInput] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [copied, setCopied] = useState<boolean>(false);
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isStandalone, setIsStandalone] = useState<boolean>(false);
  const [showIpModal, setShowIpModal] = useState<boolean>(false);
  const [customIp, setCustomIp] = useState<string>('');
  const evtSourceRef = useRef<EventSource | null>(null);

  // Initialize target PC URL from hash or localStorage
  useEffect(() => {
    let initialUrl = '';
    const hash = window.location.hash.replace(/^#/, '').trim();
    if (hash.startsWith('http')) {
      initialUrl = hash.replace(/\/+$/, '');
      try {
        localStorage.setItem('hirebot_companion_pc_url', initialUrl);
      } catch (e) {}
    } else {
      try {
        initialUrl = localStorage.getItem('hirebot_companion_pc_url') || '';
      } catch (e) {}
    }

    if (initialUrl) {
      setPcUrl(initialUrl);
    }

    // Check PWA display mode
    const standaloneMode =
      window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as any).standalone === true;
    setIsStandalone(standaloneMode);

    // Register Service Worker for PWA
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js').catch(() => {});
    }

    // Capture beforeinstallprompt event for 1-tap install
    const handleBeforeInstall = (e: any) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstall);
    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
    };
  }, []);

  // Connect to PC EventSource / Polling when pcUrl is known
  useEffect(() => {
    if (!pcUrl) return;

    if (evtSourceRef.current) {
      evtSourceRef.current.close();
    }

    let isSubscribed = true;

    // Set up SSE stream
    try {
      const sse = new EventSource(`${pcUrl}/api/stream`);
      evtSourceRef.current = sse;

      sse.onopen = () => {
        if (!isSubscribed) return;
        setIsConnected(true);
        setStatus('Live Connected');
      };

      sse.addEventListener('init', (e: any) => {
        if (!isSubscribed) return;
        try {
          const data = JSON.parse(e.data);
          if (data.answer) setAnswer(data.answer);
          if (data.transcription) setTranscription(data.transcription);
          if (data.status) setStatus(data.status);
        } catch (err) {}
      });

      sse.addEventListener('answer', (e: any) => {
        if (!isSubscribed) return;
        try {
          const data = JSON.parse(e.data);
          if (data.answer) setAnswer(data.answer);
        } catch (err) {}
      });

      sse.addEventListener('transcription', (e: any) => {
        if (!isSubscribed) return;
        try {
          const data = JSON.parse(e.data);
          if (data.transcription) setTranscription(data.transcription);
        } catch (err) {}
      });

      sse.addEventListener('status', (e: any) => {
        if (!isSubscribed) return;
        try {
          const data = JSON.parse(e.data);
          if (data.status) setStatus(data.status);
        } catch (err) {}
      });

      sse.onerror = () => {
        if (!isSubscribed) return;
        setIsConnected(false);
        setStatus('Connecting...');
      };
    } catch (e) {
      setIsConnected(false);
    }

    return () => {
      isSubscribed = false;
      if (evtSourceRef.current) {
        evtSourceRef.current.close();
      }
    };
  }, [pcUrl]);

  // 1-Tap Native Install Handler
  const handleInstallClick = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const choice = await deferredPrompt.userChoice;
      if (choice?.outcome === 'accepted') {
        setDeferredPrompt(null);
      }
    } else {
      alert('To add this app to your home screen, tap the Chrome menu (⋮) and select "Install app" or "Add to Home screen".');
    }
  };

  const handleSendPrompt = async () => {
    if (!promptInput.trim() || !pcUrl) return;
    setIsSubmitting(true);
    setStatus('Solving prompt from phone...');
    try {
      const res = await fetch(`${pcUrl}/api/prompt`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: promptInput }),
      });
      const data = await res.json();
      if (data.answer) {
        setAnswer(data.answer);
      }
      setPromptInput('');
    } catch (e) {
      alert('Could not send prompt to PC. Make sure PC and phone are on the same Wi-Fi.');
    } finally {
      setIsSubmitting(false);
      setStatus('Live Connected');
    }
  };

  const handlePushText = async () => {
    if (!promptInput.trim() || !pcUrl) return;
    try {
      await fetch(`${pcUrl}/api/push_text`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: promptInput }),
      });
      setAnswer(promptInput);
      setPromptInput('');
    } catch (e) {
      alert('Push failed. Verify PC connection.');
    }
  };

  const handleAction = async (actionName: string) => {
    if (!pcUrl) return;
    try {
      await fetch(`${pcUrl}/api/action`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: actionName }),
      });
    } catch (e) {}
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(answer).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const handleSaveCustomIp = () => {
    if (!customIp.trim()) return;
    let formatted = customIp.trim();
    if (!formatted.startsWith('http')) {
      formatted = `http://${formatted}:8765`;
    }
    setPcUrl(formatted);
    try {
      localStorage.setItem('hirebot_companion_pc_url', formatted);
    } catch (e) {}
    setShowIpModal(false);
  };

  return (
    <div className="min-h-screen bg-[#030508] text-[#F1F5F9] font-sans p-3 max-w-lg mx-auto flex flex-col justify-between">
      {/* Top Header */}
      <header className="sticky top-0 z-50 flex items-center justify-between p-3.5 bg-[#070B14]/90 border border-[#1E293B] rounded-2xl backdrop-blur-md mb-3 shadow-lg">
        <div className="flex items-center gap-2.5">
          <img
            src="/logo.png"
            alt="HireBot AI"
            className="w-11 h-11 object-contain drop-shadow-[0_0_8px_rgba(56,189,248,0.45)]"
          />
          <div className="flex flex-col">
            <span className="text-[17px] font-black tracking-wide text-white leading-tight">
              HIREBOT AI
            </span>
            <div className="flex items-center gap-1.5 mt-0.5">
              <span className="text-[9px] font-extrabold px-2 py-0.5 rounded-full border border-sky-400/80 text-sky-400 bg-sky-400/10 tracking-wider">
                COMPANION
              </span>
              {isStandalone && (
                <span className="text-[9px] font-extrabold px-2 py-0.5 rounded-full border border-emerald-400/80 text-emerald-400 bg-emerald-400/15 tracking-wider">
                  📱 APP
                </span>
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {!isStandalone && (
            <button
              onClick={handleInstallClick}
              className="bg-gradient-to-r from-sky-500 to-blue-600 hover:from-sky-400 hover:to-blue-500 text-white font-extrabold text-xs px-3 py-1.5 rounded-full border border-sky-400/50 shadow-[0_0_12px_rgba(14,165,233,0.4)] flex items-center gap-1 active:scale-95 transition-transform"
            >
              📲 Add to Phone
            </button>
          )}

          <div
            onClick={() => setShowIpModal(true)}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white/[0.04] border border-white/10 text-[11px] font-bold cursor-pointer"
          >
            <span
              className={`w-2 h-2 rounded-full ${
                isConnected ? 'bg-emerald-400 shadow-[0_0_8px_#34d399]' : 'bg-amber-400 shadow-[0_0_8px_#f59e0b]'
              }`}
            />
            <span className={isConnected ? 'text-emerald-300' : 'text-amber-300'}>
              {isConnected ? 'Live' : 'Connect'}
            </span>
          </div>
        </div>
      </header>

      {/* Prominent 1-Tap Install Banner */}
      {!isStandalone && (
        <div className="mb-3 p-3 rounded-xl bg-gradient-to-r from-sky-500/15 via-blue-600/10 to-indigo-600/15 border border-sky-500/30 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <span className="text-2xl">📲</span>
            <div>
              <div className="text-xs font-bold text-white">Add App to Home Screen</div>
              <div className="text-[10px] text-slate-400">1 tap shortcut • Never scan QR again</div>
            </div>
          </div>
          <button
            onClick={handleInstallClick}
            className="bg-sky-500 hover:bg-sky-400 text-white font-bold text-xs px-3 py-1.5 rounded-lg active:scale-95 transition-transform shadow-md"
          >
            Add
          </button>
        </div>
      )}

      {/* Disconnected Notice */}
      {!isConnected && (
        <div className="mb-3 p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-between text-xs text-amber-200">
          <span>⚠️ Connecting to PC...</span>
          <button
            onClick={() => setShowIpModal(true)}
            className="underline font-bold text-amber-300 hover:text-white"
          >
            Change IP
          </button>
        </div>
      )}

      {/* Remote Control Bar */}
      <div className="grid grid-cols-3 gap-2 mb-3">
        <button
          onClick={() => handleAction('capture')}
          className="p-2.5 rounded-xl bg-[#070B14] border border-[#1E293B] hover:border-sky-500/50 text-xs font-bold text-slate-200 active:scale-95 transition-all flex items-center justify-center gap-1.5"
        >
          📸 Snap PC
        </button>
        <button
          onClick={() => handleAction('type')}
          className="p-2.5 rounded-xl bg-[#070B14] border border-[#1E293B] hover:border-sky-500/50 text-xs font-bold text-slate-200 active:scale-95 transition-all flex items-center justify-center gap-1.5"
        >
          ⌨️ Auto-Type
        </button>
        <button
          onClick={() => handleAction('clear')}
          className="p-2.5 rounded-xl bg-[#070B14] border border-[#1E293B] hover:border-sky-500/50 text-xs font-bold text-slate-200 active:scale-95 transition-all flex items-center justify-center gap-1.5"
        >
          🧹 Clear
        </button>
      </div>

      {/* Prompt Input Box */}
      <div className="p-3 bg-[#070B14] border border-[#1E293B] rounded-2xl mb-3 shadow-md">
        <textarea
          value={promptInput}
          onChange={(e) => setPromptInput(e.target.value)}
          placeholder="Type interview question or paste code here..."
          rows={3}
          className="w-full bg-[#020407] border border-[#1E293B] rounded-xl p-2.5 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-sky-500 resize-none"
        />
        <div className="flex gap-2 mt-2">
          <button
            onClick={handlePushText}
            className="flex-1 py-2 rounded-xl bg-white/[0.05] hover:bg-white/[0.09] border border-white/10 text-xs font-bold text-slate-300 active:scale-95 transition-transform"
          >
            📋 Push to HUD
          </button>
          <button
            disabled={isSubmitting}
            onClick={handleSendPrompt}
            className="flex-1 py-2 rounded-xl bg-gradient-to-r from-sky-500 to-blue-600 hover:from-sky-400 hover:to-blue-500 text-xs font-bold text-white shadow-[0_0_10px_rgba(14,165,233,0.3)] active:scale-95 transition-transform"
          >
            {isSubmitting ? 'Solving...' : '⚡ Ask AI'}
          </button>
        </div>
      </div>

      {/* Transcription Banner */}
      <div className="p-2.5 bg-gradient-to-r from-purple-500/10 to-indigo-500/10 border border-purple-500/25 rounded-xl mb-3 text-xs flex items-start gap-2">
        <span className="font-bold text-purple-300 whitespace-nowrap">🎙️ Interviewer:</span>
        <span className="text-slate-300 font-mono text-[11px] leading-relaxed break-words">
          {transcription}
        </span>
      </div>

      {/* Solution Main Card */}
      <div className="flex-1 min-h-[220px] p-3.5 bg-[#070B14] border border-[#1E293B] rounded-2xl flex flex-col mb-3 shadow-md">
        <div className="flex items-center justify-between pb-2 mb-2 border-b border-[#1E293B]/70">
          <span className="text-xs font-black tracking-wider text-sky-400 uppercase">
            ⚡ Solution / Response
          </span>
          <button
            onClick={handleCopy}
            className="text-[11px] font-bold px-2 py-1 rounded-lg bg-white/[0.05] border border-white/10 text-slate-300 hover:text-white active:scale-95 transition-transform"
          >
            {copied ? '✓ Copied' : '📋 Copy'}
          </button>
        </div>
        <div className="flex-1 overflow-y-auto text-xs leading-relaxed text-slate-200 font-mono whitespace-pre-wrap bg-[#020407] p-3 rounded-xl border border-[#1E293B]/50">
          {answer}
        </div>
      </div>

      {/* Footer */}
      <footer className="text-center text-[10px] text-slate-500 py-1">
        🔒 Encrypted Local Network Stream • Direct Companion Sync
      </footer>

      {/* Change IP Modal */}
      {showIpModal && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4">
          <div className="bg-[#070B14] border border-[#1E293B] rounded-2xl p-4 w-full max-w-xs shadow-2xl">
            <h3 className="text-sm font-bold text-white mb-2">⚙️ Connect to PC</h3>
            <p className="text-xs text-slate-400 mb-3">
              Enter your PC IP address (e.g. 192.168.1.15):
            </p>
            <input
              type="text"
              value={customIp}
              onChange={(e) => setCustomIp(e.target.value)}
              placeholder="e.g. 192.168.1.15"
              className="w-full bg-[#020407] border border-[#1E293B] rounded-lg p-2 text-xs text-white mb-3 focus:outline-none focus:border-sky-500"
            />
            <div className="flex gap-2">
              <button
                onClick={() => setShowIpModal(false)}
                className="flex-1 py-1.5 rounded-lg bg-white/[0.06] text-xs font-bold text-slate-300"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveCustomIp}
                className="flex-1 py-1.5 rounded-lg bg-sky-500 text-xs font-bold text-white shadow-md"
              >
                Connect
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
