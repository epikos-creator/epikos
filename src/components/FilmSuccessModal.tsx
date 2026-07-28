"use client";

import { useState, useCallback } from "react";
import type { Script } from "~/server/generate-script";

interface FilmSuccessModalProps {
  script: Script;
  onClose: () => void;
  isPaid: boolean;
}

/**
 * Success/launch modal shown after the first film is generated.
 * Includes social sharing buttons and an honest note about paid plans.
 *
 * HOTFIX: Paid plans are disabled — upgrade CTA now points to waitlist.
 * Sharing is same-device only (localStorage-based).
 */
export function FilmSuccessModal({ script, onClose, isPaid }: FilmSuccessModalProps) {
  const [copied, setCopied] = useState(false);
  const [shareUrl, setShareUrl] = useState<string>("");

  // Generate share URL on mount
  useState(() => {
    const filmData = {
      title: script.title,
      logline: script.logline,
      scenes: script.scenes,
      duration_estimate: script.duration_estimate,
    };
    const json = JSON.stringify(filmData);
    const hash = btoa(encodeURIComponent(json));
    try {
      localStorage.setItem(`epikos_shared_${hash.slice(0, 16)}`, json);
    } catch { /* ignore */ }
    setShareUrl(`${window.location.origin}/view?f=${hash.slice(0, 32)}`);
  });

  const handleCopyLink = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      const input = document.createElement("input");
      input.value = shareUrl;
      document.body.appendChild(input);
      input.select();
      document.execCommand("copy");
      document.body.removeChild(input);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    }
  }, [shareUrl]);

  const shareText = encodeURIComponent(
    `🎬 I just turned a story into a short film with Epikos AI! Check out "${script.title}" — ${script.scenes.length} scenes, ${script.duration_estimate}.`
  );

  const twitterUrl = `https://twitter.com/intent/tweet?text=${shareText}&url=${encodeURIComponent(shareUrl)}`;
  const facebookUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
      <div className="relative w-full max-w-lg rounded-2xl border border-gold/20 bg-navy p-8 shadow-2xl shadow-gold/10 animate-[modal-slide-up_0.4s_ease-out]">
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute right-4 top-4 text-gray-500 hover:text-gold transition-colors"
        >
          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        {/* Celebration icon */}
        <div className="mb-4 flex justify-center">
          <div className="flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-br from-gold/20 to-gold/5 ring-1 ring-gold/30">
            <svg className="h-10 w-10 text-gold" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.455 2.456L21.75 6l-1.036.259a3.375 3.375 0 00-2.455 2.456z" />
            </svg>
          </div>
        </div>

        {/* Title */}
        <h2 className="text-center font-heading text-2xl font-bold text-white">
          🎬 Your Film Is Ready!
        </h2>
        <p className="mt-2 text-center text-sm text-gray-400">
          <strong className="text-gold">{script.title}</strong> — {script.scenes.length} scenes, {script.duration_estimate}
        </p>

        {/* Film stats */}
        <div className="mt-5 grid grid-cols-3 gap-3">
          <div className="rounded-xl border border-gray-800 bg-white/[0.03] p-3 text-center">
            <p className="font-heading text-xl font-bold text-gold">{script.scenes.length}</p>
            <p className="text-[10px] text-gray-500 uppercase tracking-wider">Scenes</p>
          </div>
          <div className="rounded-xl border border-gray-800 bg-white/[0.03] p-3 text-center">
            <p className="font-heading text-xl font-bold text-gold">{script.duration_estimate}</p>
            <p className="text-[10px] text-gray-500 uppercase tracking-wider">Duration</p>
          </div>
          <div className="rounded-xl border border-gray-800 bg-white/[0.03] p-3 text-center">
            <p className="font-heading text-xl font-bold text-gold">
              {script.scenes.reduce((sum, s) => sum + s.dialogue.length, 0)}
            </p>
            <p className="text-[10px] text-gray-500 uppercase tracking-wider">Lines</p>
          </div>
        </div>

        {/* Social sharing */}
        <div className="mt-6">
          <p className="text-center text-xs font-semibold tracking-[0.15em] text-gray-400 uppercase">
            Share Your Film
          </p>
          <div className="mt-3 flex items-center justify-center gap-3">
            {/* Twitter/X */}
            <a
              href={twitterUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex h-10 w-10 items-center justify-center rounded-full bg-white/[0.08] text-white transition-all hover:bg-[#1DA1F2]/20 hover:text-[#1DA1F2]"
              title="Share on X (Twitter)"
            >
              <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24">
                <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
              </svg>
            </a>
            {/* Facebook */}
            <a
              href={facebookUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex h-10 w-10 items-center justify-center rounded-full bg-white/[0.08] text-white transition-all hover:bg-[#1877F2]/20 hover:text-[#1877F2]"
              title="Share on Facebook"
            >
              <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24">
                <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
              </svg>
            </a>
            {/* Copy link */}
            <button
              onClick={handleCopyLink}
              className="flex h-10 w-10 items-center justify-center rounded-full bg-white/[0.08] text-white transition-all hover:bg-gold/20 hover:text-gold"
              title="Copy link"
            >
              {copied ? (
                <svg className="h-5 w-5 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                </svg>
              ) : (
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13.19 8.688a4.5 4.5 0 011.242 7.244l-4.5 4.5a4.5 4.5 0 01-6.364-6.364l1.757-1.757m13.35-.622l1.757-1.757a4.5 4.5 0 00-6.364-6.364l-4.5 4.5a4.5 4.5 0 001.242 7.244" />
                </svg>
              )}
            </button>
          </div>
          {copied && (
            <p className="mt-2 text-center text-xs text-green-400 animate-pulse">
              Link copied!
            </p>
          )}
          <p className="mt-2 text-center text-[10px] text-gray-600">
            ⚠️ Film links only work on this device/browser — cross-device sharing coming soon.
          </p>
        </div>

        {/* Upgrade CTA (only for free users) — waitlist, not Stripe */}
        {!isPaid && (
          <div className="mt-6 rounded-xl border border-gold/20 bg-gold/[0.05] p-5">
            <div className="flex items-center gap-3 mb-3">
              <svg className="h-5 w-5 text-gold shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M11.48 3.499a.562.562 0 011.04 0l2.125 5.111a.563.563 0 00.475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 00-.182.557l1.285 5.385a.562.562 0 01-.84.61l-4.725-2.885a.563.563 0 00-.586 0L6.982 20.54a.562.562 0 01-.84-.61l1.285-5.386a.562.562 0 00-.182-.557l-4.204-3.602a.563.563 0 01.321-.988l5.518-.442a.563.563 0 00.475-.345L11.48 3.5z" />
              </svg>
              <p className="text-sm font-semibold text-white">
                You're on the Free plan
              </p>
            </div>
            <p className="text-sm text-gray-400 mb-4">
              Paid plans are coming soon — unlock unlimited films, remove watermarks, and get 1080p or 4K exports.
            </p>
            <a
              href="#waitlist"
              className="block w-full rounded-full bg-gold px-4 py-2.5 text-center font-heading text-xs font-bold tracking-wider text-navy uppercase transition hover:bg-gold/90"
            >
              Join Paid Beta Waitlist
            </a>
          </div>
        )}

        {/* Continue button */}
        <button
          onClick={onClose}
          className="mt-5 w-full rounded-full border border-gray-700 px-6 py-3 font-heading text-sm font-bold tracking-wider text-gray-300 uppercase transition hover:border-gold/40 hover:text-gold"
        >
          Continue Exploring
        </button>
      </div>
    </div>
  );
}
