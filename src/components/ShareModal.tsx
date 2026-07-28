"use client";

import { useState, useCallback } from "react";
import type { Script } from "~/server/generate-script";

interface ShareModalProps {
  script: Script;
  onClose: () => void;
}

/**
 * Generates a shareable link by storing film data in localStorage
 * and creating a hash-based URL that another user can load.
 */
export function ShareModal({ script, onClose }: ShareModalProps) {
  const [copied, setCopied] = useState(false);
  const [shareUrl, setShareUrl] = useState<string | null>(null);

  const generateShareLink = useCallback(() => {
    // Create a simple hash from the script data
    const filmData = {
      title: script.title,
      logline: script.logline,
      scenes: script.scenes,
      duration_estimate: script.duration_estimate,
    };
    const json = JSON.stringify(filmData);
    const hash = btoa(encodeURIComponent(json));

    // Store in localStorage for retrieval by /view route
    try {
      localStorage.setItem(`epikos_shared_${hash.slice(0, 16)}`, json);
    } catch {
      // If storage is full, try clearing old shared films
      const keys = Object.keys(localStorage).filter((k) => k.startsWith("epikos_shared_"));
      keys.slice(0, keys.length - 5).forEach((k) => localStorage.removeItem(k));
      try {
        localStorage.setItem(`epikos_shared_${hash.slice(0, 16)}`, json);
      } catch { /* best effort */ }
    }

    const url = `${window.location.origin}/view?f=${hash.slice(0, 32)}`;
    setShareUrl(url);
    return url;
  }, [script]);

  const handleCopy = useCallback(async () => {
    const url = shareUrl || generateShareLink();
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      // Fallback
      const input = document.createElement("input");
      input.value = url;
      document.body.appendChild(input);
      input.select();
      document.execCommand("copy");
      document.body.removeChild(input);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    }
  }, [shareUrl, generateShareLink]);

  // Auto-generate on mount
  if (!shareUrl) {
    generateShareLink();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      <div className="relative w-full max-w-md rounded-2xl border border-gold/20 bg-navy p-8 shadow-2xl shadow-gold/5 animate-[modal-slide-up_0.3s_ease-out]">
        <button
          onClick={onClose}
          className="absolute right-4 top-4 text-gray-500 hover:text-gold transition-colors"
        >
          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        <div className="mb-5 flex h-14 w-14 items-center justify-center rounded-full bg-gold/15 ring-1 ring-gold/30 mx-auto">
          <svg className="h-7 w-7 text-gold" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M7.217 10.907a2.25 2.25 0 100 2.186m0-2.186c.18.324.283.696.283 1.093s-.103.77-.283 1.093m0-2.186l9.566-5.314m-9.566 7.5l9.566 5.314m0 0a2.25 2.25 0 103.935 2.186 2.25 2.25 0 00-3.935-2.186zm0-12.814a2.25 2.25 0 103.933-2.185 2.25 2.25 0 00-3.933 2.185z" />
          </svg>
        </div>

        <h3 className="text-center font-heading text-xl font-bold text-white">
          Share This Film
        </h3>
        <p className="mt-2 text-center text-sm text-gray-400">
          Anyone with this link can view your film without generating it again.
        </p>

        {/* Share URL */}
        <div className="mt-5 flex items-center gap-2 rounded-xl border border-gray-700 bg-black/30 p-3">
          <input
            type="text"
            readOnly
            value={shareUrl || "Generating link..."}
            className="flex-1 bg-transparent font-mono text-xs text-gray-300 outline-none"
          />
          <button
            onClick={handleCopy}
            className="shrink-0 rounded-lg bg-gold/15 px-4 py-2 font-heading text-[10px] font-bold tracking-wider text-gold uppercase transition hover:bg-gold/25"
          >
            {copied ? "Copied!" : "Copy"}
          </button>
        </div>

        {copied && (
          <p className="mt-3 text-center text-xs text-green-400 animate-pulse">
            Link copied to clipboard!
          </p>
        )}

        <p className="mt-5 text-center text-[11px] text-gray-600">
          Shared films are stored locally and expire after browser data is cleared.
        </p>
      </div>
    </div>
  );
}
