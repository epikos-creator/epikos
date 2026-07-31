"use client";

import { formatCooldown } from "~/hooks/useFreeTier";

interface UpgradePromptProps {
  onClose: () => void;
  reason?: string;
  remainingCooldown?: number;
}

export function UpgradePrompt({ onClose, reason, remainingCooldown }: UpgradePromptProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      <div className="relative w-full max-w-lg rounded-2xl border border-gold/20 bg-navy p-8 shadow-2xl shadow-gold/5 animate-[modal-slide-up_0.3s_ease-out]">
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute right-4 top-4 text-gray-300 hover:text-gold transition-colors"
        >
          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        {/* Icon */}
        <div className="mb-5 flex h-14 w-14 items-center justify-center rounded-full bg-gold/15 ring-1 ring-gold/30 mx-auto">
          <svg className="h-7 w-7 text-gold" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M11.48 3.499a.562.562 0 011.04 0l2.125 5.111a.563.563 0 00.475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 00-.182.557l1.285 5.385a.562.562 0 01-.84.61l-4.725-2.885a.563.563 0 00-.586 0L6.982 20.54a.562.562 0 01-.84-.61l1.285-5.386a.562.562 0 00-.182-.557l-4.204-3.602a.563.563 0 01.321-.988l5.518-.442a.563.563 0 00.475-.345L11.48 3.5z" />
          </svg>
        </div>

        <h3 className="text-center font-heading text-xl font-bold text-white">
          Free Tier Limit Reached
        </h3>

        {reason && (
          <p className="mt-3 text-center text-sm text-gray-300">
            {reason}
          </p>
        )}

        {remainingCooldown && (
          <p className="mt-2 text-center font-mono text-xs text-gold/70">
            Resets in {formatCooldown(remainingCooldown)}
          </p>
        )}

        <p className="mt-5 text-center text-sm text-gray-300">
          Paid plans are coming soon — unlock unlimited films, higher quality, and commercial rights.
        </p>

        {/* Plans preview (no payment links) */}
        <div className="mt-6 grid grid-cols-2 gap-4">
          {/* Creator — coming soon */}
          <div className="flex flex-col items-center rounded-xl border border-gold/20 bg-gold/[0.04] p-5 text-center opacity-90">
            <span className="font-heading text-sm font-bold text-gold">Creator</span>
            <span className="mt-1 font-heading text-3xl font-bold text-white">£15</span>
            <span className="text-xs text-gray-300">/month</span>
            <ul className="mt-3 space-y-1.5 text-left">
              {["10 films/month", "1080p · No watermark", "Priority rendering"].map((f) => (
                <li key={f} className="flex items-center gap-1.5 text-[11px] text-gray-300">
                  <svg className="h-3 w-3 shrink-0 text-gold/60" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                  </svg>
                  {f}
                </li>
              ))}
            </ul>
            <span className="mt-4 inline-block rounded-full border border-gold/30 px-5 py-2 font-heading text-[10px] font-bold tracking-wider text-gold/70 uppercase">
              Coming Soon
            </span>
          </div>

          {/* Studio — coming soon */}
          <div className="flex flex-col items-center rounded-xl border border-gold/20 bg-gold/[0.04] p-5 text-center opacity-90">
            <span className="font-heading text-sm font-bold text-gold">Studio</span>
            <span className="mt-1 font-heading text-3xl font-bold text-white">£50</span>
            <span className="text-xs text-gray-300">/month</span>
            <ul className="mt-3 space-y-1.5 text-left">
              {["Unlimited films", "4K · Commercial license", "Early access"].map((f) => (
                <li key={f} className="flex items-center gap-1.5 text-[11px] text-gray-300">
                  <svg className="h-3 w-3 shrink-0 text-gold/60" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                  </svg>
                  {f}
                </li>
              ))}
            </ul>
            <span className="mt-4 inline-block rounded-full border border-gold/30 px-5 py-2 font-heading text-[10px] font-bold tracking-wider text-gold/70 uppercase">
              Coming Soon
            </span>
          </div>
        </div>

        <p className="mt-5 text-center text-[11px] text-gray-300">
          Want early access?{" "}
          <a
            href="#waitlist"
            onClick={onClose}
            className="text-gold underline decoration-gold/20 underline-offset-4 hover:text-gold/80"
          >
            Join the paid beta waitlist
          </a>
          {" "}or{" "}
          <button
            onClick={onClose}
            className="text-gold underline decoration-gold/20 underline-offset-4 hover:text-gold/80"
          >
            stay on free
          </button>
        </p>
      </div>
    </div>
  );
}
