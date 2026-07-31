"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import type { Script, Scene } from "~/server/generate-script";
import { generateScript } from "~/server/generate-script";
import type { VoiceProfile } from "~/server/generate-voiceover";
import { useBackgroundMusic, detectEmotion, type MusicEmotion } from "~/hooks/useBackgroundMusic";
import { useVideoExport } from "~/hooks/useVideoExport";
import { saveFilm, type SavedFilm } from "~/components/FilmHistory";
import { canGenerateFreeFilm, recordFreeFilmGeneration, checkFreeTierLimit, recordFreeTierUsage } from "~/hooks/useFreeTier";
import { useSubscription } from "~/hooks/useSubscription";
import { useAnalytics } from "~/hooks/useAnalytics";
import { UpgradePrompt } from "~/components/UpgradePrompt";
import { ShareModal } from "~/components/ShareModal";
import { FilmSuccessModal } from "~/components/FilmSuccessModal";

/* ── Pipeline stages ── */
type PipelineStage =
  | "idle"
  | "script"
  | "visuals"
  | "voiceovers"
  | "music"
  | "rendering"
  | "complete";

const STAGE_LABELS: Record<PipelineStage, string> = {
  idle: "",
  script: "Generating Cinematic Script",
  visuals: "Creating Storyboard & Visuals",
  voiceovers: "Generating Voiceovers (all scenes)",
  music: "Composing Original Score",
  rendering: "Rendering Final Film",
  complete: "Film Complete",
};

const STAGE_DURATIONS: Record<PipelineStage, number> = {
  idle: 0,
  script: 1800,
  visuals: 2200,
  voiceovers: 2800,
  music: 1800,
  rendering: 2400,
  complete: 0,
};

/* ── Voice profiles ── */
const DEFAULT_VOICE_PROFILES: Record<string, VoiceProfile> = {
  ODYSSEUS: { character: "Odysseus", pitch: 0.85, rate: 0.95, volume: 1.0 },
  POLYPHEMUS: { character: "Polyphemus", pitch: 0.45, rate: 0.75, volume: 1.0 },
  EURYLOCHUS: { character: "Eurylochus", pitch: 1.0, rate: 1.0, volume: 0.9 },
  EURYMACHUS: { character: "Eurymachus", pitch: 1.15, rate: 1.05, volume: 0.85 },
  "CYCLOPS VOICES": { character: "Cyclops Voices", pitch: 0.55, rate: 0.85, volume: 0.7 },
  "NARRATOR (V.O.)": { character: "Narrator", pitch: 1.0, rate: 0.95, volume: 1.0 },
};

/* ── Scene image mapper ── */
function sceneImage(sceneNumber: number): string {
  const idx = ((sceneNumber - 1) % 6) + 1;
  return `/images/odyssey-${idx}.png`;
}

/* ── Pick voice from browser ── */
function pickVoice(targetPitch: number): SpeechSynthesisVoice | null {
  if (typeof window === "undefined" || !window.speechSynthesis) return null;
  const voices = window.speechSynthesis.getVoices();
  if (voices.length === 0) return null;
  const english = voices.filter((v) => v.lang.startsWith("en"));
  const pool = english.length > 0 ? english : voices;
  const sorted = [...pool].sort((a, b) => {
    const ha = [...a.voiceURI].reduce((s, c) => s + c.charCodeAt(0), 0);
    const hb = [...b.voiceURI].reduce((s, c) => s + c.charCodeAt(0), 0);
    return (ha % 100) - (hb % 100);
  });
  const fraction = (targetPitch - 0.45) / 0.7;
  const clamped = Math.max(0, Math.min(1, fraction));
  const idx = Math.floor(clamped * (sorted.length - 1));
  return sorted[idx] ?? sorted[0];
}

/* ── Props ── */
interface AutoFilmPipelineProps {
  onClose: () => void;
  savedFilm?: SavedFilm | null;
}

/* ── Main pipeline ── */
export function AutoFilmPipeline({ onClose, savedFilm }: AutoFilmPipelineProps) {
  const [stage, setStage] = useState<PipelineStage>(savedFilm ? "complete" : "script");
  const [stageProgress, setStageProgress] = useState(0);
  const [script, setScript] = useState<Script | null>(savedFilm ? { title: savedFilm.title, logline: savedFilm.logline, scenes: savedFilm.scenes, duration_estimate: savedFilm.duration_estimate } : null);
  const [error, setError] = useState("");
  const [currentSceneIdx, setCurrentSceneIdx] = useState(0);
  const [playerState, setPlayerState] = useState<"idle" | "titleCard" | "playing" | "paused" | "done" | "credits">(savedFilm ? "paused" : "idle");
  const [playerLineIdx, setPlayerLineIdx] = useState(-1);
  const [imgErrors, setImgErrors] = useState<Set<number>>(new Set());
  const [filmSaved, setFilmSaved] = useState(!!savedFilm);
  const [showVideoExport, setShowVideoExport] = useState(false);
  const [showUpgrade, setShowUpgrade] = useState(false);
  const [showShare, setShowShare] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [freeTierBlocked, setFreeTierBlocked] = useState(false);
  const [transitionScene, setTransitionScene] = useState<{ from: number; to: number } | null>(null);

  const { isPaid } = useSubscription();
  const { track } = useAnalytics();

  const stageIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const synthRef = useRef<SpeechSynthesis | null>(null);
  const playingRef = useRef(false);
  const pausedRef = useRef(false);
  const musicInitializedRef = useRef(false);

  const bgMusic = useBackgroundMusic();
  const videoExport = useVideoExport(script);

  /* ── Generate pipeline ── */
  useEffect(() => {
    if (savedFilm) return; // Skip pipeline for saved films

    const state = { cancelled: false };

    async function runPipeline() {
      // Check free tier limit — client first (instant), then server (authoritative)
      if (!isPaid) {
        const clientCheck = canGenerateFreeFilm();
        if (!clientCheck.allowed) {
          setFreeTierBlocked(true);
          setShowUpgrade(true);
          track("free_tier_blocked", "film", { reason: clientCheck.reason || "limit_reached" });
          return;
        }

        // Server-side check (authoritative — overrides client)
        try {
          const serverCheck = await checkFreeTierLimit();
          if (!serverCheck.allowed) {
            setFreeTierBlocked(true);
            setShowUpgrade(true);
            track("free_tier_blocked", "film", { reason: serverCheck.reason || "server_limit_reached" });
            return;
          }
        } catch {
          // If server check fails, fall through (permissive) — the client check already passed
          console.warn("Free tier server check unavailable — relying on client check");
        }
      }

      let generatedScript: Script | null = null;

      // Stage 1: Script
      setStage("script");
      await simulateProgress("script", state);
      if (state.cancelled) return;

      try {
        const result = await generateScript({ data: { prompt: "" } });
        if (state.cancelled) return;
        generatedScript = result;
        setScript(result);
      } catch (err: any) {
        if (!state.cancelled) setError(err?.message || "Failed to generate script");
        return;
      }

      // Stage 2: Visuals
      setStage("visuals");
      await simulateProgress("visuals", state);
      if (state.cancelled) return;

      // Stage 3: Voiceovers
      setStage("voiceovers");
      await simulateProgress("voiceovers", state);
      if (state.cancelled) return;

      // Stage 4: Music — now actually composes the score
      setStage("music");
      bgMusic.start();
      musicInitializedRef.current = true;
      await simulateProgress("music", state);
      if (state.cancelled) {
        bgMusic.stop();
        return;
      }

      // Stage 5: Rendering
      setStage("rendering");
      await simulateProgress("rendering", state);
      if (state.cancelled) return;

      // Complete
      setStage("complete");
      // Record free tier usage — both client (optimistic) and server (authoritative)
      if (!isPaid) {
        recordFreeFilmGeneration();
        recordFreeTierUsage().catch(() => {
          // Non-blocking — server recording failure shouldn't affect UX
          console.warn("Failed to record server-side free tier usage");
        });
        track("film_generated_free", "film", { scenes: generatedScript?.scenes.length ?? 0 });
      } else {
        track("film_generated_paid", "film", { scenes: generatedScript?.scenes.length ?? 0 });
      }
      // Save to localStorage
      if (generatedScript && !filmSaved) {
        saveFilm(generatedScript);
        setFilmSaved(true);
      }
      await new Promise((r) => setTimeout(r, 600));
      if (!state.cancelled) {
        setPlayerState("titleCard");
        // Show success modal after a short delay (let title card play first)
        setTimeout(() => setShowSuccess(true), 2000);
      }
    }

    runPipeline();

    return () => {
      state.cancelled = true;
      if (stageIntervalRef.current) clearInterval(stageIntervalRef.current);
      if (synthRef.current) synthRef.current.cancel();
      bgMusic.stop();
    };
  }, [savedFilm]);

  async function simulateProgress(stageKey: PipelineStage, state: { cancelled: boolean }): Promise<void> {
    const duration = STAGE_DURATIONS[stageKey];
    const steps = 30;
    const interval = duration / steps;

    return new Promise((resolve) => {
      let step = 0;
      stageIntervalRef.current = setInterval(() => {
        if (state.cancelled) {
          clearInterval(stageIntervalRef.current!);
          resolve();
          return;
        }
        step++;
        setStageProgress(Math.min(step / steps, 1));
        if (step >= steps) {
          clearInterval(stageIntervalRef.current!);
          setStageProgress(0);
          resolve();
        }
      }, interval);
    });
  }

  /* ── Auto-playback ── */
  useEffect(() => {
    if (!script) return;

    // Handle title card → playing transition
    if (playerState === "titleCard") {
      const timer = setTimeout(() => {
        setPlayerState("playing");
      }, 3500); // Show title card for 3.5 seconds
      return () => clearTimeout(timer);
    }

    if (playerState === "credits") {
      // Credits auto-advance to "done" after display
      const timer = setTimeout(() => {
        setPlayerState("done");
      }, 4000);
      return () => clearTimeout(timer);
    }

    if (playerState !== "playing" || !script) return;

    playingRef.current = true;
    pausedRef.current = false;

    // Start music for saved films that skip the pipeline
    if (savedFilm && !musicInitializedRef.current) {
      bgMusic.start();
      musicInitializedRef.current = true;
    } else {
      bgMusic.resume();
    }

    const scenes = script.scenes;

    async function playAllScenes() {
      for (let sIdx = currentSceneIdx; sIdx < scenes.length; sIdx++) {
        if (!playingRef.current) break;
        
        // Scene transition effect
        if (sIdx > 0) {
          setTransitionScene({ from: sIdx - 1, to: sIdx });
          await sleep(1200); // Transition duration
          setTransitionScene(null);
        }
        if (!playingRef.current) break;
        
        setCurrentSceneIdx(sIdx);

        const scene = scenes[sIdx];
        setPlayerLineIdx(-1);

        if (sIdx > 0 && !transitionScene) {
          await sleep(400);
        }
        if (!playingRef.current) break;

        if (scene.dialogue.length > 0) {
          await playSceneDialogue(scene);
        } else {
          await sleep(2500);
        }

        if (!playingRef.current) break;
        if (pausedRef.current) return;
      }

      if (playingRef.current) {
        setPlayerState("credits");
      }
    }

    playAllScenes();

    return () => {
      playingRef.current = false;
      if (synthRef.current) synthRef.current.cancel();
    };
  }, [playerState, script]);

  async function playSceneDialogue(scene: Scene): Promise<void> {
    const synth = window.speechSynthesis;
    synthRef.current = synth;

    for (let i = 0; i < scene.dialogue.length; i++) {
      if (!playingRef.current) return;
      if (pausedRef.current) return;

      const d = scene.dialogue[i];
      setPlayerLineIdx(i);

      await new Promise<void>((resolve) => {
        const key = d.character.toUpperCase().trim();
        const profile = DEFAULT_VOICE_PROFILES[key] ?? { character: d.character, pitch: 1.0, rate: 1.0, volume: 1.0 };

        const utterance = new SpeechSynthesisUtterance(d.line);
        const voice = pickVoice(profile.pitch);
        if (voice) utterance.voice = voice;
        utterance.pitch = profile.pitch;
        utterance.rate = profile.rate;
        utterance.volume = profile.volume;

        utterance.onend = () => resolve();
        utterance.onerror = () => resolve();

        synth.speak(utterance);
      });
    }
  }

  /* ── Playback controls ── */
  const handlePlayPause = useCallback(() => {
    if (playerState === "playing") {
      pausedRef.current = true;
      if (synthRef.current) synthRef.current.cancel();
      bgMusic.pause();
      setPlayerState("paused");
    } else if (playerState === "paused") {
      pausedRef.current = false;
      bgMusic.resume();
      setPlayerState("playing");
    }
  }, [playerState, bgMusic]);

  const handlePrevScene = useCallback(() => {
    if (!script) return;
    const wasPlaying = playerState === "playing";
    if (synthRef.current) synthRef.current.cancel();
    playingRef.current = false;
    const newIdx = Math.max(0, currentSceneIdx - 1);
    setCurrentSceneIdx(newIdx);
    setPlayerLineIdx(-1);
    if (wasPlaying) {
      setTimeout(() => setPlayerState("playing"), 300);
    } else {
      setPlayerState("paused");
    }
  }, [currentSceneIdx, playerState, script]);

  const handleNextScene = useCallback(() => {
    if (!script) return;
    const wasPlaying = playerState === "playing";
    if (synthRef.current) synthRef.current.cancel();
    playingRef.current = false;
    const newIdx = Math.min(script.scenes.length - 1, currentSceneIdx + 1);
    if (newIdx >= script.scenes.length - 1) {
      setCurrentSceneIdx(script.scenes.length - 1);
      setPlayerState("done");
    } else {
      setCurrentSceneIdx(newIdx);
      setPlayerLineIdx(-1);
      if (wasPlaying) {
        setTimeout(() => setPlayerState("playing"), 300);
      } else {
        setPlayerState("paused");
      }
    }
  }, [currentSceneIdx, playerState, script]);

  const handleRestart = useCallback(() => {
    if (synthRef.current) synthRef.current.cancel();
    playingRef.current = false;
    pausedRef.current = false;
    setCurrentSceneIdx(0);
    setPlayerLineIdx(-1);
    bgMusic.resume();
    setTimeout(() => setPlayerState("playing"), 500);
  }, [bgMusic]);

  /* ── Cleanup on close ── */
  const handleClose = useCallback(() => {
    bgMusic.stop();
    if (synthRef.current) synthRef.current.cancel();
    playingRef.current = false;
    onClose();
  }, [onClose, bgMusic]);

  /* ── Video Export UI ── */
  const handleExportVideo = useCallback(() => {
    if (playerState === "playing") {
      handlePlayPause(); // Pause first
    }
    setShowVideoExport(true);
  }, [playerState, handlePlayPause]);

  const startVideoExport = useCallback(async () => {
    await videoExport.exportVideo();
  }, [videoExport]);

  /* ── Pipeline progress UI ── */
  if (stage !== "complete") {
    return (
      <div className="auto-film-pipeline relative mx-auto mt-8 max-w-2xl animate-[storyboard-fade-in_0.4s_ease-out]">
        <div className="relative overflow-hidden rounded-2xl border border-gold/20 bg-gradient-to-br from-gold/[0.08] to-navy/80 p-8 sm:p-10 backdrop-blur-sm">
          <div className="absolute left-0 top-0 h-px w-24 bg-gradient-to-r from-gold/40 to-transparent" />
          <div className="absolute left-0 top-0 h-24 w-px bg-gradient-to-b from-gold/40 to-transparent" />
          <div className="absolute bottom-0 right-0 h-px w-24 bg-gradient-to-l from-gold/40 to-transparent" />
          <div className="absolute bottom-0 right-0 h-24 w-px bg-gradient-to-t from-gold/40 to-transparent" />

          <div className="mb-8 flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gold/15">
              <svg className="h-5 w-5 text-gold" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 10.5l4.72-4.72a.75.75 0 011.28.53v11.38a.75.75 0 01-1.28.53l-4.72-4.72M4.5 18.75h9a2.25 2.25 0 002.25-2.25v-9a2.25 2.25 0 00-2.25-2.25h-9A2.25 2.25 0 002.25 7.5v9a2.25 2.25 0 002.25 2.25z" />
              </svg>
            </div>
            <div>
              <h3 className="font-heading text-lg font-bold text-white">
                {error ? "Pipeline Error" : "Automatic Film Generation"}
              </h3>
              <p className="text-xs text-gray-300">
                {error ? error : "AI-powered pipeline — sit back and watch the magic"}
              </p>
            </div>
          </div>

          {error ? (
            <div className="text-center">
              <p className="mb-4 text-sm text-red-400">{error}</p>
              <button
                onClick={handleClose}
                className="rounded-full border border-gold/40 px-6 py-2.5 font-heading text-xs font-bold tracking-wider text-gold uppercase transition hover:bg-gold/10"
              >
                Try Again
              </button>
            </div>
          ) : (
            <>
              <div className="mb-3">
                <span className="font-heading text-xs font-semibold tracking-[0.2em] text-gold uppercase">
                  {STAGE_LABELS[stage]}
                </span>
              </div>

              <div className="relative h-2 overflow-hidden rounded-full bg-gray-800">
                <div
                  className="absolute inset-y-0 left-0 rounded-full bg-gradient-to-r from-gold/70 via-gold to-gold/70 animate-pulse"
                  style={{ width: `${Math.round(stageProgress * 100)}%`, transition: "width 0.3s ease-out" }}
                />
                <div
                  className="absolute inset-y-0 w-16 bg-gradient-to-r from-transparent via-white/20 to-transparent"
                  style={{ left: `${Math.round(stageProgress * 100) - 4}%`, transition: "left 0.3s ease-out" }}
                />
              </div>

              <div className="mt-6 flex items-center justify-between">
                {(["script", "visuals", "voiceovers", "music", "rendering"] as PipelineStage[]).map((s, i) => {
                  const stageOrder = ["script", "visuals", "voiceovers", "music", "rendering"];
                  const currentIdx = stageOrder.indexOf(stage);
                  const isComplete = currentIdx > i;
                  const isCurrent = currentIdx === i;

                  return (
                    <div key={s} className="flex flex-col items-center gap-1.5">
                      <div
                        className={`flex h-7 w-7 items-center justify-center rounded-full text-[10px] transition-all duration-500 ${
                          isComplete
                            ? "bg-gold text-navy"
                            : isCurrent
                              ? "bg-gold/30 text-gold ring-2 ring-gold/50"
                              : "bg-gray-800 text-gray-300"
                        }`}
                      >
                        {isComplete ? (
                          <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                          </svg>
                        ) : (
                          <span className="font-mono text-[10px] font-bold">{i + 1}</span>
                        )}
                      </div>
                      <span
                        className={`hidden text-[9px] font-semibold tracking-wider uppercase sm:block ${
                          isCurrent ? "text-gold" : isComplete ? "text-gold/60" : "text-gray-300"
                        }`}
                      >
                        {s === "script" ? "Script" : s === "visuals" ? "Visuals" : s === "voiceovers" ? "Voices" : s === "music" ? "Score" : "Render"}
                      </span>
                    </div>
                  );
                })}
              </div>

              {/* Music stage indicator — now real */}
              {stage === "music" && (
                <div className="mt-4 flex items-center justify-center gap-2 text-xs text-gold/60">
                  <span className="inline-block h-1.5 w-1.5 animate-pulse rounded-full bg-gold" />
                  Composing epic orchestral score via Web Audio API...
                </div>
              )}

              <div className="pointer-events-none absolute inset-0 overflow-hidden rounded-2xl">
                {Array.from({ length: 12 }).map((_, i) => (
                  <div
                    key={i}
                    className="absolute h-0.5 w-0.5 rounded-full bg-gold/40"
                    style={{
                      left: `${10 + Math.random() * 80}%`,
                      top: `${10 + Math.random() * 80}%`,
                      animation: `particle-float ${2 + Math.random() * 3}s ease-in-out ${Math.random() * 2}s infinite`,
                    }}
                  />
                ))}
              </div>
            </>
          )}
        </div>
      </div>
    );
  }

  /* ── Film player UI ── */
  if (!script) return null;

  const currentScene = script.scenes[currentSceneIdx] ?? script.scenes[0];
  const sceneImg = sceneImage(currentScene.scene_number);
  const isPlaying = playerState === "playing";
  const isDone = playerState === "done";
  const isPaused = playerState === "paused";
  const isTitleCard = playerState === "titleCard";
  const isCredits = playerState === "credits";

  return (
    <div className="auto-film-player relative mx-auto mt-8 max-w-5xl animate-[storyboard-fade-in_0.5s_ease-out]">
      {/* ── Video Export Modal ── */}
      {showVideoExport && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="relative w-full max-w-md rounded-2xl border border-gold/20 bg-navy p-8 shadow-2xl shadow-gold/5">
            <button
              onClick={() => { setShowVideoExport(false); videoExport.cancelExport(); }}
              className="absolute right-4 top-4 text-gray-300 hover:text-gold transition-colors"
            >
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>

            <h3 className="font-heading text-lg font-bold text-white">Export Film</h3>
            <p className="mt-2 text-sm text-gray-300">
              Render all {script.scenes.length} scenes into a cinematic .webm video file with scene transitions and audio.
            </p>

            {videoExport.exportState.status === "idle" && (
              <button
                onClick={startVideoExport}
                className="mt-6 w-full rounded-full bg-gold px-6 py-3.5 font-heading text-sm font-bold tracking-widest text-navy uppercase transition hover:bg-gold/90"
              >
                Start Rendering Video
              </button>
            )}

            {videoExport.exportState.status === "recording" && (
              <div className="mt-6">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs text-gold animate-pulse">Rendering frames...</span>
                  <span className="font-mono text-xs text-gray-300">{videoExport.exportState.progress}%</span>
                </div>
                <div className="h-2 rounded-full bg-gray-800 overflow-hidden">
                  <div
                    className="h-full rounded-full bg-gold transition-all duration-300"
                    style={{ width: `${videoExport.exportState.progress}%` }}
                  />
                </div>
                <button
                  onClick={videoExport.cancelExport}
                  className="mt-4 w-full rounded-full border border-gray-700 px-4 py-2 text-xs text-gray-300 hover:text-white transition"
                >
                  Cancel
                </button>
              </div>
            )}

            {videoExport.exportState.status === "done" && (
              <div className="mt-6 text-center">
                <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-green-500/20 mx-auto">
                  <svg className="h-7 w-7 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                  </svg>
                </div>
                <p className="text-sm text-gray-300">Film rendered successfully!</p>
                <button
                  onClick={() => { videoExport.downloadVideo(); setShowVideoExport(false); }}
                  className="mt-4 w-full rounded-full bg-gold px-6 py-3.5 font-heading text-sm font-bold tracking-widest text-navy uppercase transition hover:bg-gold/90"
                >
                  Download .webm Film
                </button>
              </div>
            )}

            {videoExport.exportState.status === "error" && (
              <div className="mt-6 text-center">
                <p className="text-sm text-red-400">{videoExport.exportState.error || "Export failed"}</p>
                <button
                  onClick={() => setShowVideoExport(false)}
                  className="mt-4 rounded-full border border-gray-700 px-4 py-2 text-xs text-gray-300"
                >
                  Close
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Upgrade Prompt ── */}
      {showUpgrade && (
        <UpgradePrompt
          onClose={() => setShowUpgrade(false)}
          reason={freeTierBlocked ? "You've used your free film for today. Upgrade to create unlimited films." : undefined}
        />
      )}

      {/* ── Share Modal ── */}
      {showShare && script && (
        <ShareModal
          script={script}
          onClose={() => setShowShare(false)}
        />
      )}

      {/* ── Success / Launch Modal ── */}
      {showSuccess && script && (
        <FilmSuccessModal
          script={script}
          onClose={() => setShowSuccess(false)}
          isPaid={isPaid}
        />
      )}

      {/* ── Film Player Card ── */}
      <div className="relative overflow-hidden rounded-2xl border border-gold/20 bg-black/40 backdrop-blur-sm">
        {/* Decorative top bar */}
        <div className="flex items-center gap-2 border-b border-gold/10 px-4 py-2.5">
          <div className="flex gap-1.5">
            <div className="h-2.5 w-2.5 rounded-full bg-red-500/70" />
            <div className="h-2.5 w-2.5 rounded-full bg-yellow-500/70" />
            <div className="h-2.5 w-2.5 rounded-full bg-green-500/70" />
          </div>
          <div className="flex-1 text-center">
            <span className="font-heading text-[10px] font-semibold tracking-[0.15em] text-gold/70 uppercase">
              Epikos Player — {script.title}
            </span>
          </div>
          <span className="font-mono text-[10px] text-gray-300">{script.duration_estimate}</span>
        </div>

        {/* Main screen */}
        <div className="relative aspect-video w-full bg-navy overflow-hidden">
          {/* ── Title Card ── */}
          {isTitleCard && (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-gradient-to-br from-navy via-navy to-navy/90 animate-[storyboard-fade-in_0.8s_ease-out] z-10">
              {/* Logo */}
              <img
                src="/logo.png"
                alt="Epikos"
                className="mb-6 h-20 w-20 drop-shadow-[0_0_60px_rgba(209,169,92,0.4)] animate-[storyboard-fade-in_0.6s_ease-out]"
              />
              {/* Badge */}
              <div className="mb-8 inline-flex items-center gap-2 rounded-full border border-gold/40 bg-gold/10 px-5 py-2 animate-[storyboard-fade-in_0.6s_ease-out_0.2s_both]">
                <span className="h-1.5 w-1.5 rounded-full bg-gold" />
                <span className="font-heading text-[10px] font-semibold tracking-[0.2em] text-gold uppercase">
                  Epikos Presents
                </span>
              </div>
              {/* Title */}
              <h2 className="font-heading text-4xl font-extrabold text-white text-center px-8 leading-tight animate-[storyboard-fade-in_0.6s_ease-out_0.4s_both] sm:text-5xl">
                The Odyssey
              </h2>
              <div className="mt-4 h-px w-24 bg-gradient-to-r from-transparent via-gold/60 to-transparent animate-[storyboard-fade-in_0.6s_ease-out_0.5s_both]" />
              <h3 className="mt-4 font-heading text-2xl font-bold text-gold animate-[storyboard-fade-in_0.6s_ease-out_0.6s_both] sm:text-3xl">
                {script.title}
              </h3>
              <p className="mt-6 max-w-md text-center text-sm italic text-gray-300 px-6 animate-[storyboard-fade-in_0.6s_ease-out_0.8s_both]">
                {script.logline}
              </p>
            </div>
          )}

          {/* ── End Credits ── */}
          {isCredits && (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-gradient-to-b from-black via-navy to-black animate-[storyboard-fade-in_0.6s_ease-out] z-10">
              <div className="text-center animate-[storyboard-fade-in_0.6s_ease-out_0.2s_both]">
                <img src="/logo.png" alt="Epikos" className="mx-auto mb-4 h-12 w-12 opacity-60" />
                <p className="font-heading text-xs font-semibold tracking-[0.2em] text-gold/60 uppercase">An Epikos Production</p>
                <h3 className="mt-4 font-heading text-2xl font-bold text-white">{script.title}</h3>
                <p className="mt-1 text-sm text-gray-300">Adapted from The Odyssey by Homer</p>
              </div>
              <div className="mt-8 w-full max-w-sm space-y-3 text-center animate-[storyboard-fade-in_0.6s_ease-out_0.5s_both]">
                <div className="h-px w-full bg-gradient-to-r from-transparent via-gold/20 to-transparent" />
                <p className="font-heading text-[10px] font-semibold tracking-[0.2em] text-gold/70 uppercase">Cast &amp; Crew</p>
                <div className="space-y-1.5 text-xs text-gray-300">
                  <p>Odysseus — AI Voice Synthesis</p>
                  <p>Polyphemus — AI Voice Synthesis</p>
                  <p>Original Score — Web Audio Orchestra</p>
                  <p>Directed by — Artificial Intelligence</p>
                </div>
                <div className="h-px w-full bg-gradient-to-r from-transparent via-gold/20 to-transparent" />
                <p className="mt-4 text-[11px] text-gray-300">
                  Created with{" "}
                  <span className="text-gold font-heading font-semibold tracking-wider">EPIKOS</span>
                  {" "}— AI-Powered Filmmaking
                </p>
                <p className="text-[10px] text-gray-300">{script.scenes.length} scenes · {script.duration_estimate}</p>
              </div>
            </div>
          )}

          {/* ── Scene Image ── */}
          {!isTitleCard && !isCredits && (
          !imgErrors.has(currentScene.scene_number) ? (
            <img
              src={sceneImg}
              alt={`Scene ${currentScene.scene_number}: ${currentScene.location}`}
              className={`h-full w-full object-cover transition-all duration-700 ${isPlaying ? "scale-105" : "scale-100"} ${transitionScene ? "opacity-20" : "opacity-100"}`}
              onError={() => setImgErrors((prev) => new Set(prev).add(currentScene.scene_number))}
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-gold/[0.06] to-navy">
              <span className="font-heading text-7xl font-bold text-gold/15">{currentScene.scene_number}</span>
            </div>
          ))}

          {/* Vignette overlay */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-black/30" />

          {/* Scene transition overlay */}
          {transitionScene && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/80 animate-[storyboard-fade-in_0.4s_ease-out] z-20">
              <div className="text-center">
                <div className="mx-auto mb-4 h-1 w-32 bg-gradient-to-r from-transparent via-gold/60 to-transparent rounded-full animate-pulse" />
                <span className="font-heading text-xs font-semibold tracking-[0.2em] text-gold uppercase">
                  Scene {transitionScene.to + 1}
                </span>
              </div>
            </div>
          )}

          {/* Music indicator */}
          {isPlaying && (
            <div className="absolute right-4 top-4 flex items-center gap-1.5 rounded-full bg-black/40 backdrop-blur-sm px-3 py-1.5 border border-gold/20 z-10">
              <svg className="h-3 w-3 text-gold" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 9l10.5-3m0 6.553v3.75a2.25 2.25 0 01-1.632 2.163l-1.32.377a1.803 1.803 0 11-.99-3.467l2.31-.66a2.25 2.25 0 001.632-2.163zm0 0V2.25L9 5.25v10.303m0 0v3.75a2.25 2.25 0 01-1.632 2.163l-1.32.377a1.803 1.803 0 01-.99-3.467l2.31-.66A2.25 2.25 0 009 15.553z" />
              </svg>
              <span className="font-mono text-[9px] text-gold/80 animate-pulse">SCORE</span>
            </div>
          )}

          {/* Scene info overlay */}
          {!isTitleCard && !isCredits && (
          <div className="absolute bottom-0 left-0 right-0 p-6 z-10">
            <div className="flex items-baseline gap-3">
              <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-gold/20 font-heading text-sm font-bold text-gold ring-1 ring-gold/30">
                {currentScene.scene_number}
              </span>
              <div>
                <span className="font-heading text-xs font-semibold tracking-wider text-gold uppercase">
                  {currentScene.location}
                </span>
                <p className="mt-1 text-sm leading-relaxed text-gray-200 line-clamp-2">
                  {currentScene.visual_description}
                </p>
              </div>
            </div>
          </div>
          )}

          {/* Dialogue overlay */}
          {isPlaying && playerLineIdx >= 0 && playerLineIdx < currentScene.dialogue.length && (
            <div className="absolute left-0 right-0 top-6 flex justify-center z-10">
              <div className="rounded-xl bg-black/60 backdrop-blur-md px-5 py-3 text-center border border-gold/20">
                <span className="block font-heading text-[10px] font-bold tracking-wider text-gold uppercase">
                  {currentScene.dialogue[playerLineIdx].character}
                </span>
                <p className="mt-1 text-sm italic leading-snug text-white">
                  &ldquo;{currentScene.dialogue[playerLineIdx].line}&rdquo;
                </p>
              </div>
            </div>
          )}

          {/* Paused overlay */}
          {isPaused && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/40 backdrop-blur-sm z-20">
              <div className="flex flex-col items-center gap-3">
                <svg className="h-12 w-12 text-gold/80" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M8 5v14l11-7z" />
                </svg>
                <span className="font-heading text-sm font-bold tracking-wider text-gold uppercase">Paused</span>
              </div>
            </div>
          )}

          {/* Done overlay */}
          {isDone && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/50 backdrop-blur-sm z-20">
              <div className="flex flex-col items-center gap-4 text-center">
                <div className="flex h-16 w-16 items-center justify-center rounded-full bg-gold/20 ring-1 ring-gold/40">
                  <svg className="h-8 w-8 text-gold" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                  </svg>
                </div>
                <div>
                  <h4 className="font-heading text-xl font-bold text-white">Film Complete</h4>
                  <p className="mt-1 text-sm text-gray-300">
                    {script.scenes.length} scenes &bull; {script.duration_estimate}
                  </p>
                </div>
                <div className="flex gap-3">
                  <button
                    onClick={handleRestart}
                    className="inline-flex items-center gap-2 rounded-full bg-gold px-6 py-3 font-heading text-sm font-bold tracking-wider text-navy uppercase transition hover:bg-gold/90 hover:shadow-lg hover:shadow-gold/30"
                  >
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182" />
                    </svg>
                    Replay Film
                  </button>
                  <button
                    onClick={handleExportVideo}
                    className="inline-flex items-center gap-2 rounded-full border border-gold/40 px-6 py-3 font-heading text-sm font-bold tracking-wider text-gold uppercase transition hover:bg-gold/10"
                  >
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
                    </svg>
                    Export Video
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Controls bar */}
        <div className="flex items-center gap-3 border-t border-gold/10 px-4 py-3">
          <button
            onClick={handlePlayPause}
            className="inline-flex h-9 w-9 items-center justify-center rounded-full text-gold transition hover:bg-gold/10"
            title={isPlaying ? "Pause" : "Play"}
          >
            {isPlaying ? (
              <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24">
                <rect x="6" y="4" width="4" height="16" rx="1" />
                <rect x="14" y="4" width="4" height="16" rx="1" />
              </svg>
            ) : (
              <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24">
                <path d="M8 5v14l11-7z" />
              </svg>
            )}
          </button>

          <button
            onClick={handlePrevScene}
            disabled={currentSceneIdx === 0}
            className="inline-flex h-8 w-8 items-center justify-center rounded-full text-gray-300 transition hover:text-gold hover:bg-gold/10 disabled:opacity-30 disabled:cursor-not-allowed"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 5.25l-8.25 6.75L21 18.75M3 5.25v13.5" />
            </svg>
          </button>

          <button
            onClick={handleNextScene}
            disabled={currentSceneIdx >= script.scenes.length - 1}
            className="inline-flex h-8 w-8 items-center justify-center rounded-full text-gray-300 transition hover:text-gold hover:bg-gold/10 disabled:opacity-30 disabled:cursor-not-allowed"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 5.25l8.25 6.75L3 18.75M21 5.25v13.5" />
            </svg>
          </button>

          <div className="flex-1 mx-2">
            <div className="flex items-center gap-2">
              <span className="font-mono text-[10px] text-gray-300">
                Scene {currentScene.scene_number}/{script.scenes.length}
              </span>
              <div className="flex-1 h-1.5 rounded-full bg-gray-800 overflow-hidden">
                <div
                  className="h-full rounded-full bg-gold transition-all duration-500"
                  style={{ width: `${(currentSceneIdx / Math.max(script.scenes.length - 1, 1)) * 100}%` }}
                />
              </div>
            </div>
            <div className="mt-1.5 flex justify-center gap-1">
              {script.scenes.map((_, i) => (
                <button
                  key={i}
                  onClick={() => {
                    if (synthRef.current) synthRef.current.cancel();
                    playingRef.current = false;
                    pausedRef.current = false;
                    setCurrentSceneIdx(i);
                    setPlayerLineIdx(-1);
                    setTimeout(() => setPlayerState("playing"), 300);
                  }}
                  className={`h-1.5 rounded-full transition-all duration-300 ${
                    i === currentSceneIdx
                      ? "w-4 bg-gold"
                      : i < currentSceneIdx
                        ? "w-1.5 bg-gold/40"
                        : "w-1.5 bg-gray-700 hover:bg-gray-500"
                  }`}
                  title={`Scene ${i + 1}`}
                />
              ))}
            </div>
          </div>

          <span className={`font-mono text-[10px] ${
            isPlaying ? "text-gold animate-pulse" : isDone ? "text-gold/60" : isTitleCard ? "text-gold/80" : isCredits ? "text-gold/60" : "text-gray-300"
          }`}>
            {isPlaying ? "▶ LIVE" : isPaused ? "⏸ PAUSED" : isTitleCard ? "🎬 TITLE" : isCredits ? "★ CREDITS" : isDone ? "✓ DONE" : ""}
          </span>
        </div>

        {/* Bottom action bar */}
        <div className="flex items-center justify-between border-t border-gold/10 px-4 py-3">
          <div className="flex items-center gap-2 text-[10px] text-gray-300">
            <svg className="h-3 w-3 text-gold/50" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 9l10.5-3m0 6.553v3.75a2.25 2.25 0 01-1.632 2.163l-1.32.377a1.803 1.803 0 11-.99-3.467l2.31-.66a2.25 2.25 0 001.632-2.163zm0 0V2.25L9 5.25v10.303m0 0v3.75a2.25 2.25 0 01-1.632 2.163l-1.32.377a1.803 1.803 0 01-.99-3.467l2.31-.66A2.25 2.25 0 009 15.553z" />
            </svg>
            Web Audio orchestral score &bull; Web Speech voices
          </div>
          <div className="flex items-center gap-2">
            {/* Share button */}
            <button
              onClick={() => { setShowShare(true); track("share_clicked", "share", { title: script.title }); }}
              className="inline-flex items-center gap-1.5 rounded-full border border-gold/30 px-4 py-2 font-heading text-[10px] font-bold tracking-wider text-gold uppercase transition hover:bg-gold/10"
            >
              <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M7.217 10.907a2.25 2.25 0 100 2.186m0-2.186c.18.324.283.696.283 1.093s-.103.77-.283 1.093m0-2.186l9.566-5.314m-9.566 7.5l9.566 5.314m0 0a2.25 2.25 0 103.935 2.186 2.25 2.25 0 00-3.935-2.186zm0-12.814a2.25 2.25 0 103.933-2.185 2.25 2.25 0 00-3.933 2.185z" />
              </svg>
              Share
            </button>
            {/* Export Video button */}
            <button
              onClick={handleExportVideo}
              className="inline-flex items-center gap-1.5 rounded-full bg-gold/15 px-4 py-2 font-heading text-[10px] font-bold tracking-wider text-gold uppercase transition hover:bg-gold/25"
            >
              <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
              </svg>
              Video
            </button>
            {/* Download script button */}
            <button
              onClick={() => {
                const text = script.scenes.map((s) =>
                  `SCENE ${s.scene_number}: ${s.location}\n${s.visual_description}\n\n` +
                  s.dialogue.map((d) => `${d.character}: "${d.line}"`).join("\n") +
                  `\n\nCinematic Notes: ${s.cinematic_notes}\n\n---\n`
                ).join("\n");
                const blob = new Blob([`${script.title}\n${script.logline}\n\n${text}`], { type: "text/plain" });
                const url = URL.createObjectURL(blob);
                const a = document.createElement("a");
                a.href = url;
                a.download = `${script.title.replace(/\s+/g, "_")}_script.txt`;
                a.click();
                URL.revokeObjectURL(url);
              }}
              className="inline-flex items-center gap-1.5 rounded-full border border-gold/30 px-4 py-2 font-heading text-[10px] font-bold tracking-wider text-gold uppercase transition hover:bg-gold/10"
            >
              <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
              </svg>
              Script
            </button>
            <button
              onClick={handleClose}
              className="inline-flex items-center gap-1.5 rounded-full bg-gold/10 px-4 py-2 font-heading text-[10px] font-bold tracking-wider text-gold uppercase transition hover:bg-gold/20"
            >
              <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182" />
              </svg>
              New Film
            </button>
          </div>
        </div>
      </div>

      {/* Saved indicator */}
      {filmSaved && (
        <div className="mt-3 text-center">
          <span className="inline-flex items-center gap-1.5 font-mono text-[10px] text-gold/50">
            <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
            </svg>
            Saved to your library
          </span>
        </div>
      )}
    </div>
  );
}

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}
