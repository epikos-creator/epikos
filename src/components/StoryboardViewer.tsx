"use client";

import { useRef, useState, useEffect } from "react";
import type { Script, Scene } from "~/routes/api/generate-script";

interface StoryboardViewerProps {
  script: Script;
}

/* ── Map scene number to one of the 6 generated images (cycles) ── */
function sceneImage(sceneNumber: number): string {
  const idx = ((sceneNumber - 1) % 6) + 1;
  return `/images/odyssey-${idx}.png`;
}

/* ── Truncate long descriptions for the card ── */
function shortDesc(text: string, maxLen = 90): string {
  if (text.length <= maxLen) return text;
  return text.slice(0, maxLen).replace(/\s+\S*$/, "") + "…";
}

export function StoryboardViewer({ script }: StoryboardViewerProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(true);

  const checkScroll = () => {
    const el = scrollRef.current;
    if (!el) return;
    setCanScrollLeft(el.scrollLeft > 4);
    setCanScrollRight(el.scrollLeft + el.clientWidth < el.scrollWidth - 4);
  };

  useEffect(() => {
    checkScroll();
    const el = scrollRef.current;
    if (!el) return;
    el.addEventListener("scroll", checkScroll, { passive: true });
    return () => el.removeEventListener("scroll", checkScroll);
  }, []);

  const scroll = (dir: "left" | "right") => {
    const el = scrollRef.current;
    if (!el) return;
    el.scrollBy({ left: dir === "left" ? -360 : 360, behavior: "smooth" });
  };

  return (
    <div className="storyboard-wrapper mx-auto mt-10 max-w-6xl">
      {/* ── Section header ── */}
      <div className="mb-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-gold/15 font-heading text-xs font-bold text-gold">
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 10.5l4.72-4.72a.75.75 0 011.28.53v11.38a.75.75 0 01-1.28.53l-4.72-4.72M4.5 18.75h9a2.25 2.25 0 002.25-2.25v-9a2.25 2.25 0 00-2.25-2.25h-9A2.25 2.25 0 002.25 7.5v9a2.25 2.25 0 002.25 2.25z" />
            </svg>
          </span>
          <div>
            <span className="font-heading text-xs font-semibold tracking-[0.2em] text-gold uppercase">
              Visual Storyboard
            </span>
            <p className="text-xs text-gray-500">{script.scenes.length} scenes • Scroll to explore</p>
          </div>
        </div>

        {/* Scroll arrows */}
        <div className="hidden gap-1 sm:flex">
          <button
            onClick={() => scroll("left")}
            disabled={!canScrollLeft}
            className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-gray-700 text-gray-400 transition-all hover:border-gold/50 hover:text-gold disabled:opacity-30 disabled:cursor-not-allowed"
            aria-label="Scroll left"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <button
            onClick={() => scroll("right")}
            disabled={!canScrollRight}
            className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-gray-700 text-gray-400 transition-all hover:border-gold/50 hover:text-gold disabled:opacity-30 disabled:cursor-not-allowed"
            aria-label="Scroll right"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </div>
      </div>

      {/* ── Film strip track ── */}
      <div className="relative">
        {/* Left fade gradient */}
        <div className="pointer-events-none absolute left-0 top-0 z-10 h-full w-12 bg-gradient-to-r from-navy to-transparent sm:w-16" />
        {/* Right fade gradient */}
        <div className="pointer-events-none absolute right-0 top-0 z-10 h-full w-12 bg-gradient-to-r from-transparent to-navy sm:w-16" />

        {/* Scrollable film strip */}
        <div
          ref={scrollRef}
          className="storyboard-track flex gap-4 overflow-x-auto pb-4 scroll-smooth"
          style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
        >
          {script.scenes.map((scene) => (
            <StoryboardCard key={scene.scene_number} scene={scene} />
          ))}
        </div>
      </div>

      {/* ── Bottom info ── */}
      <div className="mt-4 flex flex-wrap items-center justify-between gap-2 text-xs text-gray-600">
        <span>🎬 Phase 2 preview — scene generation and voice acting coming next</span>
        <span className="font-mono">{script.duration_estimate}</span>
      </div>

      {/* Inline style for hiding scrollbar on WebKit */}
      <style>{`
        .storyboard-track::-webkit-scrollbar { display: none; }
      `}</style>
    </div>
  );
}

/* ── Individual storyboard card ── */

function StoryboardCard({ scene }: { scene: Scene }) {
  const [imgError, setImgError] = useState(false);

  return (
    <div className="storyboard-card group relative w-[280px] shrink-0 sm:w-[320px]">
      {/* Film sprocket holes — top */}
      <div className="sprocket-top mb-1 flex gap-[6px] px-1">
        {Array.from({ length: 32 }).map((_, i) => (
          <span key={i} className="sprocket-dot block h-[6px] w-[6px] shrink-0 rounded-sm bg-navy" />
        ))}
      </div>

      {/* ── Main card body ── */}
      <div className="relative overflow-hidden rounded-lg border border-gray-800 bg-white/[0.02] transition-all duration-300 group-hover:border-gold/30 group-hover:bg-white/[0.04] group-hover:shadow-lg group-hover:shadow-gold/5">
        {/* Thumbnail */}
        <div className="relative aspect-video w-full overflow-hidden bg-navy">
          {!imgError ? (
            <img
              src={sceneImage(scene.scene_number)}
              alt={`Scene ${scene.scene_number}: ${scene.location}`}
              className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
              loading="lazy"
              onError={() => setImgError(true)}
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-gold/[0.08] to-transparent">
              <span className="font-heading text-5xl font-bold text-gold/20">
                {scene.scene_number}
              </span>
            </div>
          )}

          {/* Overlay gradient */}
          <div className="absolute inset-0 bg-gradient-to-t from-navy/80 via-transparent to-transparent" />

          {/* Scene number badge */}
          <span className="absolute left-2.5 top-2.5 inline-flex h-7 w-7 items-center justify-center rounded-md bg-navy/80 font-heading text-xs font-bold text-gold backdrop-blur-sm ring-1 ring-gold/20">
            {scene.scene_number}
          </span>

          {/* Play button overlay */}
          <button
            className="absolute bottom-2.5 right-2.5 inline-flex h-8 w-8 items-center justify-center rounded-full bg-gold/20 text-gold opacity-0 backdrop-blur-sm transition-all duration-300 group-hover:opacity-100 hover:bg-gold/40 hover:scale-110"
            title="Play voiceover (coming soon)"
            aria-label="Play voiceover"
          >
            <svg className="h-3.5 w-3.5" fill="currentColor" viewBox="0 0 24 24">
              <path d="M8 5v14l11-7z" />
            </svg>
          </button>
        </div>

        {/* Card info */}
        <div className="p-3.5">
          {/* Location */}
          <span className="block font-heading text-[10px] font-semibold tracking-[0.15em] text-gold uppercase">
            {scene.location}
          </span>

          {/* Scene description */}
          <p className="mt-1.5 text-xs leading-relaxed text-gray-400 line-clamp-2">
            {shortDesc(scene.visual_description)}
          </p>

          {/* Dialogue count / Voice indicator */}
          <div className="mt-2 flex items-center gap-2">
            {scene.dialogue.length > 0 && (
              <span className="inline-flex items-center gap-1 rounded-full bg-gold/10 px-2 py-0.5 text-[10px] font-medium text-gold/80">
                <svg className="h-2.5 w-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19.114 5.636a9 9 0 010 12.728M16.463 8.288a5.25 5.25 0 010 7.424M6.75 8.25l4.72-4.72a.75.75 0 011.28.53v15.88a.75.75 0 01-1.28.53l-4.72-4.72H4.51c-.88 0-1.704-.507-1.938-1.354A9.009 9.009 0 012.25 12c0-.83.112-1.633.322-2.396C2.806 8.756 3.63 8.25 4.51 8.25H6.75z" />
                </svg>
                {scene.dialogue.length} line{scene.dialogue.length !== 1 ? "s" : ""}
              </span>
            )}
            <span className="text-[10px] text-gray-600">Voice coming soon</span>
          </div>
        </div>
      </div>

      {/* Film sprocket holes — bottom */}
      <div className="sprocket-bottom mt-1 flex gap-[6px] px-1">
        {Array.from({ length: 32 }).map((_, i) => (
          <span key={i} className="sprocket-dot block h-[6px] w-[6px] shrink-0 rounded-sm bg-navy" />
        ))}
      </div>

      {/* Reel connector line to next card */}
      <div className="absolute -right-4 top-1/2 hidden h-px w-4 bg-gold/10 sm:block" />

      {/* Film grain overlay on card */}
      <div className="pointer-events-none absolute inset-0 rounded-lg opacity-[0.03] mix-blend-overlay"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.8' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E")`,
        }}
      />
    </div>
  );
}
