"use client";

import { useRef, useState, useEffect, useCallback } from "react";
import type { Script, Scene } from "~/server/generate-script";
import { useVoiceover } from "~/hooks/useVoiceover";
import type { VoiceProfile } from "~/server/generate-voiceover";

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
  return text.slice(0, maxLen).replace(/\s+\S*$/, "") + "\u2026";
}

/* ── Default voice profiles per character (used if API hasn't been called) ── */
const DEFAULT_VOICE_PROFILES: Record<string, VoiceProfile> = {
  ODYSSEUS: { character: "Odysseus", pitch: 0.85, rate: 0.95, volume: 1.0 },
  POLYPHEMUS: { character: "Polyphemus", pitch: 0.45, rate: 0.75, volume: 1.0 },
  EURYLOCHUS: { character: "Eurylochus", pitch: 1.0, rate: 1.0, volume: 0.9 },
  EURYMACHUS: { character: "Eurymachus", pitch: 1.15, rate: 1.05, volume: 0.85 },
  "CYCLOPS VOICES": { character: "Cyclops Voices", pitch: 0.55, rate: 0.85, volume: 0.7 },
  "NARRATOR (V.O.)": { character: "Narrator", pitch: 1.0, rate: 0.95, volume: 1.0 },
};

function resolveProfiles(dialogue: Array<{ character: string; line: string }>): VoiceProfile[] {
  const seen = new Set<string>();
  const profiles: VoiceProfile[] = [];
  for (const d of dialogue) {
    const key = d.character.toUpperCase().trim();
    if (!seen.has(key)) {
      seen.add(key);
      profiles.push(
        DEFAULT_VOICE_PROFILES[key] ?? {
          character: d.character,
          pitch: 1.0,
          rate: 1.0,
          volume: 1.0,
        }
      );
    }
  }
  return profiles;
}

export function StoryboardViewer({ script }: StoryboardViewerProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(true);
  const [generatingAll, setGeneratingAll] = useState(false);
  const [generatedScenes, setGeneratedScenes] = useState<Set<number>>(new Set());
  const [globalPlayingScene, setGlobalPlayingScene] = useState<number | null>(null);

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

  const handleGenerateAll = useCallback(async () => {
    setGeneratingAll(true);
    // Simulate AI generation for all scenes sequentially
    for (const scene of script.scenes) {
      await new Promise((r) => setTimeout(r, 400 + Math.random() * 600));
      setGeneratedScenes((prev) => new Set(prev).add(scene.scene_number));
    }
    setGeneratingAll(false);
  }, [script.scenes]);

  const generatedCount = generatedScenes.size;
  const totalScenes = script.scenes.length;
  const allGenerated = generatedCount === totalScenes;

  return (
    <div className="storyboard-wrapper mx-auto mt-10 max-w-6xl">
      {/* ── Section header ── */}
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
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
            <p className="text-xs text-gray-300">
              {script.scenes.length} scenes &bull; Phase 2 visuals + Phase 3 voice
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Generate All Voiceovers */}
          <button
            onClick={handleGenerateAll}
            disabled={generatingAll || allGenerated}
            className={`inline-flex items-center gap-2 rounded-full px-4 py-2 font-heading text-xs font-bold tracking-wider uppercase transition-all duration-300 ${
              allGenerated
                ? "bg-gold/10 text-gold/50 border border-gold/20 cursor-default"
                : generatingAll
                  ? "bg-gold/10 text-gold border border-gold/30 cursor-wait"
                  : "border border-gold/40 text-gold hover:bg-gold/10 hover:border-gold"
            }`}
          >
            {generatingAll ? (
              <>
                <Spinner />
                Generating {generatedCount}/{totalScenes}...
              </>
            ) : allGenerated ? (
              <>
                <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                </svg>
                All Voiceovers Ready
              </>
            ) : (
              <>
                <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19.114 5.636a9 9 0 010 12.728M16.463 8.288a5.25 5.25 0 010 7.424M6.75 8.25l4.72-4.72a.75.75 0 011.28.53v15.88a.75.75 0 01-1.28.53l-4.72-4.72H4.51c-.88 0-1.704-.507-1.938-1.354A9.009 9.009 0 012.25 12c0-.83.112-1.633.322-2.396C2.806 8.756 3.63 8.25 4.51 8.25H6.75z" />
                </svg>
                Generate All Voiceovers
              </>
            )}
          </button>

          {/* Scroll arrows */}
          <div className="hidden gap-1 sm:flex">
            <button
              onClick={() => scroll("left")}
              disabled={!canScrollLeft}
              className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-gray-700 text-gray-300 transition-all hover:border-gold/50 hover:text-gold disabled:opacity-30 disabled:cursor-not-allowed"
              aria-label="Scroll left"
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <button
              onClick={() => scroll("right")}
              disabled={!canScrollRight}
              className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-gray-700 text-gray-300 transition-all hover:border-gold/50 hover:text-gold disabled:opacity-30 disabled:cursor-not-allowed"
              aria-label="Scroll right"
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </div>
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
            <StoryboardCard
              key={scene.scene_number}
              scene={scene}
              isGenerated={generatedScenes.has(scene.scene_number)}
              isGlobalPlaying={globalPlayingScene === scene.scene_number}
              onPlayingChange={(playing) => {
                setGlobalPlayingScene(playing ? scene.scene_number : null);
              }}
            />
          ))}
        </div>
      </div>

      {/* ── Bottom info ── */}
      <div className="mt-4 flex flex-wrap items-center justify-between gap-2 text-xs text-gray-300">
        <span>
          🎬 Phase 3 live — voiceover playback via Web Speech API
          {allGenerated && " | All scenes voiced"}
        </span>
        <span className="font-mono">{script.duration_estimate}</span>
      </div>

      {/* Inline style for hiding scrollbar on WebKit */}
      <style>{`
        .storyboard-track::-webkit-scrollbar { display: none; }
      `}</style>
    </div>
  );
}

/* ── Spinner ── */

function Spinner() {
  return (
    <svg className="h-3.5 w-3.5 animate-spin" fill="none" viewBox="0 0 24 24">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
    </svg>
  );
}

/* ── Individual storyboard card ── */

interface StoryboardCardProps {
  scene: Scene;
  isGenerated: boolean;
  isGlobalPlaying: boolean;
  onPlayingChange: (playing: boolean) => void;
}

function StoryboardCard({ scene, isGenerated, isGlobalPlaying, onPlayingChange }: StoryboardCardProps) {
  const [imgError, setImgError] = useState(false);

  const voiceProfiles = resolveProfiles(scene.dialogue);
  const {
    state,
    currentLineIndex,
    totalLines,
    progress,
    play,
    pause,
    resume,
    stop: stopVo,
    generate,
  } = useVoiceover({
    dialogue: scene.dialogue,
    voiceProfiles,
    onLineChange: () => {},
  });

  // Sync global playing state
  useEffect(() => {
    if (state === "playing" && !isGlobalPlaying) {
      onPlayingChange(true);
    } else if (state !== "playing" && isGlobalPlaying) {
      onPlayingChange(false);
    }
  }, [state, isGlobalPlaying, onPlayingChange]);

  const hasDialogue = scene.dialogue.length > 0;
  const currentLine = currentLineIndex >= 0 && currentLineIndex < scene.dialogue.length
    ? scene.dialogue[currentLineIndex]
    : null;

  const handlePlayClick = async () => {
    if (!hasDialogue) return;

    if (state === "idle") {
      // First click: generate then play
      await generate();
      play();
    } else if (state === "ready" || state === "done") {
      play();
    } else if (state === "paused") {
      resume();
    } else if (state === "playing") {
      pause();
    }
  };

  const handleStop = (e: React.MouseEvent) => {
    e.stopPropagation();
    stopVo();
    onPlayingChange(false);
  };

  return (
    <div className={`storyboard-card group relative w-[280px] shrink-0 sm:w-[320px] ${state === "playing" ? "ring-1 ring-gold/40" : ""}`}>
      {/* Film sprocket holes — top */}
      <div className="sprocket-top mb-1 flex gap-[6px] px-1">
        {Array.from({ length: 32 }).map((_, i) => (
          <span key={i} className="sprocket-dot block h-[6px] w-[6px] shrink-0 rounded-sm bg-navy" />
        ))}
      </div>

      {/* ── Main card body ── */}
      <div className={`relative overflow-hidden rounded-lg border transition-all duration-300 ${
        state === "playing"
          ? "border-gold/60 bg-white/[0.06] shadow-lg shadow-gold/10"
          : "border-gray-800 bg-white/[0.02] group-hover:border-gold/30 group-hover:bg-white/[0.04] group-hover:shadow-lg group-hover:shadow-gold/5"
      }`}>
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

          {/* Voiceover status badge */}
          {state === "generating" && (
            <span className="absolute left-2.5 top-12 inline-flex items-center gap-1.5 rounded-md bg-navy/80 px-2 py-1 text-[10px] font-medium text-gold/80 backdrop-blur-sm ring-1 ring-gold/20">
              <Spinner />
              AI Voice...
            </span>
          )}

          {/* Play button overlay */}
          {hasDialogue && (
            <button
              onClick={handlePlayClick}
              disabled={state === "generating"}
              className={`absolute bottom-2.5 right-2.5 inline-flex items-center justify-center rounded-full backdrop-blur-sm transition-all duration-300 ${
                state === "playing"
                  ? "h-10 w-10 bg-gold/30 text-gold opacity-100 ring-1 ring-gold/50"
                  : state === "paused"
                    ? "h-10 w-10 bg-gold/20 text-gold opacity-100"
                    : "h-8 w-8 bg-gold/20 text-gold opacity-0 group-hover:opacity-100 hover:bg-gold/40 hover:scale-110"
              }`}
              title={
                state === "idle" ? "Generate & play voiceover" :
                state === "generating" ? "Generating voiceover..." :
                state === "playing" ? "Pause" :
                state === "paused" ? "Resume" :
                state === "done" ? "Replay" : "Play voiceover"
              }
              aria-label="Play voiceover"
            >
              {state === "generating" ? (
                <Spinner />
              ) : state === "playing" ? (
                <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24">
                  <rect x="6" y="4" width="4" height="16" rx="1" />
                  <rect x="14" y="4" width="4" height="16" rx="1" />
                </svg>
              ) : (
                <svg className="h-3.5 w-3.5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M8 5v14l11-7z" />
                </svg>
              )}
            </button>
          )}

          {/* Stop button (visible when playing/paused) */}
          {(state === "playing" || state === "paused") && (
            <button
              onClick={handleStop}
              className="absolute bottom-2.5 right-[calc(2.5rem+12px)] inline-flex h-8 w-8 items-center justify-center rounded-full bg-red-500/20 text-red-400 backdrop-blur-sm opacity-0 transition-all duration-300 group-hover:opacity-100 hover:bg-red-500/40 sm:right-[calc(2.5rem+8px)]"
              title="Stop"
              aria-label="Stop voiceover"
            >
              <svg className="h-3 w-3" fill="currentColor" viewBox="0 0 24 24">
                <rect x="4" y="4" width="16" height="16" rx="2" />
              </svg>
            </button>
          )}
        </div>

        {/* Card info */}
        <div className="p-3.5">
          {/* Location */}
          <span className="block font-heading text-[10px] font-semibold tracking-[0.15em] text-gold uppercase">
            {scene.location}
          </span>

          {/* Scene description */}
          <p className="mt-1.5 text-xs leading-relaxed text-gray-300 line-clamp-2">
            {shortDesc(scene.visual_description)}
          </p>

          {/* Waveform / Progress bar */}
          {(state === "playing" || state === "paused") && totalLines > 0 && (
            <div className="mt-2">
              <div className="mb-1 flex items-center justify-between">
                <span className="text-[10px] text-gold/70">
                  {state === "paused" ? "⏸ Paused" : "🔊 Playing"} &mdash; line {currentLineIndex + 1}/{totalLines}
                </span>
              </div>
              {/* Waveform bars */}
              <div className="flex h-6 items-end gap-[2px]">
                {Array.from({ length: Math.min(totalLines, 20) }).map((_, i) => {
                  const isPast = i < currentLineIndex;
                  const isCurrent = i === currentLineIndex;
                  const height = isCurrent
                    ? "100%"
                    : isPast
                      ? `${30 + Math.random() * 30}%`
                      : `${15 + Math.random() * 25}%`;
                  return (
                    <div
                      key={i}
                      className={`flex-1 rounded-t-sm transition-all duration-200 ${
                        isCurrent
                          ? "bg-gold animate-waveform-pulse"
                          : isPast
                            ? "bg-gold/40"
                            : "bg-gold/15"
                      }`}
                      style={{ height }}
                    />
                  );
                })}
              </div>
              {/* Progress bar */}
              <div className="mt-1.5 h-1 overflow-hidden rounded-full bg-gray-800">
                <div
                  className="h-full rounded-full bg-gold transition-all duration-300"
                  style={{ width: `${Math.round(progress * 100)}%` }}
                />
              </div>
            </div>
          )}

          {/* Current speaking line */}
          {state === "playing" && currentLine && (
            <div className="mt-2 rounded-md bg-gold/10 px-2 py-1.5">
              <p className="text-[10px] font-semibold text-gold">{currentLine.character}</p>
              <p className="text-[11px] italic leading-tight text-gray-200">
                &ldquo;{currentLine.line.length > 100 ? currentLine.line.slice(0, 100) + "\u2026" : currentLine.line}&rdquo;
              </p>
            </div>
          )}

          {/* Dialogue count / Voice indicator */}
          <div className="mt-2 flex items-center gap-2">
            {hasDialogue && (
              <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium transition-colors ${
                state === "playing"
                  ? "bg-gold/20 text-gold"
                  : "bg-gold/10 text-gold/80"
              }`}>
                <svg className="h-2.5 w-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19.114 5.636a9 9 0 010 12.728M16.463 8.288a5.25 5.25 0 010 7.424M6.75 8.25l4.72-4.72a.75.75 0 011.28.53v15.88a.75.75 0 01-1.28.53l-4.72-4.72H4.51c-.88 0-1.704-.507-1.938-1.354A9.009 9.009 0 012.25 12c0-.83.112-1.633.322-2.396C2.806 8.756 3.63 8.25 4.51 8.25H6.75z" />
                </svg>
                {scene.dialogue.length} line{scene.dialogue.length !== 1 ? "s" : ""}
              </span>
            )}
            <span className={`text-[10px] transition-colors ${
              state === "playing" ? "text-gold/70" :
              state === "done" ? "text-gold/50" :
              "text-gray-300"
            }`}>
              {state === "generating" ? "Generating..." :
               state === "playing" ? "Speaking..." :
               state === "paused" ? "Paused" :
               state === "done" ? "✓ Voiced" :
               isGenerated ? "Tap play" :
               "Tap play"}
            </span>
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
