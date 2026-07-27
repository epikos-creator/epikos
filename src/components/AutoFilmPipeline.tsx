"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import type { Script, Scene } from "~/routes/api/generate-script";
import { generateScript } from "~/routes/api/generate-script";
import type { VoiceProfile } from "~/routes/api/generate-voiceover";

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

/* ── Voice profiles matching existing defaults ── */
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
}

/* ── Main pipeline ── */
export function AutoFilmPipeline({ onClose }: AutoFilmPipelineProps) {
  const [stage, setStage] = useState<PipelineStage>("script");
  const [stageProgress, setStageProgress] = useState(0);
  const [script, setScript] = useState<Script | null>(null);
  const [error, setError] = useState("");
  const [currentSceneIdx, setCurrentSceneIdx] = useState(0);
  const [playerState, setPlayerState] = useState<"idle" | "playing" | "paused" | "done">("idle");
  const [playerLineIdx, setPlayerLineIdx] = useState(-1);
  const [imgErrors, setImgErrors] = useState<Set<number>>(new Set());
  
  const stageIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const synthRef = useRef<SpeechSynthesis | null>(null);
  const playingRef = useRef(false);
  const pausedRef = useRef(false);

  /* ── Stage 1: Generate script ── */
  useEffect(() => {
    const state = { cancelled: false };
    
    async function runPipeline() {
      // Stage 1: Script
      setStage("script");
      await simulateProgress("script", state);
      if (state.cancelled) return;
      
      try {
        const result = await generateScript({ data: { prompt: "" } });
        if (state.cancelled) return;
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
      
      // Stage 4: Music
      setStage("music");
      await simulateProgress("music", state);
      if (state.cancelled) return;
      
      // Stage 5: Rendering
      setStage("rendering");
      await simulateProgress("rendering", state);
      if (state.cancelled) return;
      
      // Complete
      setStage("complete");
      // Small delay before starting auto-play
      await new Promise((r) => setTimeout(r, 600));
      if (!state.cancelled) {
        setPlayerState("playing");
      }
    }
    
    runPipeline();
    
    return () => {
      state.cancelled = true;
      if (stageIntervalRef.current) clearInterval(stageIntervalRef.current);
      if (synthRef.current) synthRef.current.cancel();
    };
  }, []);

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
    if (playerState !== "playing" || !script) return;
    
    playingRef.current = true;
    pausedRef.current = false;
    
    const scenes = script.scenes;
    
    async function playAllScenes() {
      for (let sIdx = currentSceneIdx; sIdx < scenes.length; sIdx++) {
        if (!playingRef.current) break;
        setCurrentSceneIdx(sIdx);
        
        const scene = scenes[sIdx];
        setPlayerLineIdx(-1);
        
        // Brief pause between scenes
        if (sIdx > 0) {
          await sleep(800);
        }
        if (!playingRef.current) break;
        
        // Play dialogue lines
        if (scene.dialogue.length > 0) {
          await playSceneDialogue(scene);
        } else {
          // No dialogue — just hold the frame
          await sleep(2500);
        }
        
        if (!playingRef.current) break;
        if (pausedRef.current) return;
      }
      
      if (playingRef.current) {
        setPlayerState("done");
        setCurrentSceneIdx(scenes.length - 1);
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

  const handlePlayPause = useCallback(() => {
    if (playerState === "playing") {
      pausedRef.current = true;
      if (synthRef.current) synthRef.current.cancel();
      setPlayerState("paused");
    } else if (playerState === "paused") {
      pausedRef.current = false;
      setPlayerState("playing");
    }
  }, [playerState]);

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
    setTimeout(() => setPlayerState("playing"), 500);
  }, []);

  /* ── Pipeline progress UI ── */
  if (stage !== "complete") {
    return (
      <div className="auto-film-pipeline relative mx-auto mt-8 max-w-2xl animate-[storyboard-fade-in_0.4s_ease-out]">
        {/* Pipeline card */}
        <div className="relative overflow-hidden rounded-2xl border border-gold/20 bg-gradient-to-br from-gold/[0.08] to-navy/80 p-8 sm:p-10 backdrop-blur-sm">
          {/* Decorative accents */}
          <div className="absolute left-0 top-0 h-px w-24 bg-gradient-to-r from-gold/40 to-transparent" />
          <div className="absolute left-0 top-0 h-24 w-px bg-gradient-to-b from-gold/40 to-transparent" />
          <div className="absolute bottom-0 right-0 h-px w-24 bg-gradient-to-l from-gold/40 to-transparent" />
          <div className="absolute bottom-0 right-0 h-24 w-px bg-gradient-to-t from-gold/40 to-transparent" />

          {/* Title */}
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
              <p className="text-xs text-gray-400">
                {error ? error : "AI-powered pipeline — sit back and watch the magic"}
              </p>
            </div>
          </div>

          {error ? (
            <div className="text-center">
              <p className="mb-4 text-sm text-red-400">{error}</p>
              <button
                onClick={onClose}
                className="rounded-full border border-gold/40 px-6 py-2.5 font-heading text-xs font-bold tracking-wider text-gold uppercase transition hover:bg-gold/10"
              >
                Try Again
              </button>
            </div>
          ) : (
            <>
              {/* Stage indicator */}
              <div className="mb-3">
                <span className="font-heading text-xs font-semibold tracking-[0.2em] text-gold uppercase">
                  {STAGE_LABELS[stage]}
                </span>
              </div>

              {/* Cinematic progress bar */}
              <div className="relative h-2 overflow-hidden rounded-full bg-gray-800">
                <div
                  className="absolute inset-y-0 left-0 rounded-full bg-gradient-to-r from-gold/70 via-gold to-gold/70 animate-pulse"
                  style={{ width: `${Math.round(stageProgress * 100)}%`, transition: "width 0.3s ease-out" }}
                />
                {/* Shimmer effect */}
                <div
                  className="absolute inset-y-0 w-16 bg-gradient-to-r from-transparent via-white/20 to-transparent"
                  style={{
                    left: `${Math.round(stageProgress * 100) - 4}%`,
                    transition: "left 0.3s ease-out",
                  }}
                />
              </div>

              {/* Stage dots */}
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
                              : "bg-gray-800 text-gray-600"
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
                          isCurrent ? "text-gold" : isComplete ? "text-gold/60" : "text-gray-600"
                        }`}
                      >
                        {s === "script" ? "Script" : s === "visuals" ? "Visuals" : s === "voiceovers" ? "Voices" : s === "music" ? "Music" : "Render"}
                      </span>
                    </div>
                  );
                })}
              </div>

              {/* Particle effects - floating particles */}
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

        <style>{`
          @keyframes particle-float {
            0%, 100% { transform: translateY(0) translateX(0); opacity: 0.3; }
            50% { transform: translateY(-8px) translateX(4px); opacity: 0.7; }
          }
        `}</style>
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

  return (
    <div className="auto-film-player relative mx-auto mt-8 max-w-5xl animate-[storyboard-fade-in_0.5s_ease-out]">
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
          <span className="font-mono text-[10px] text-gray-500">{script.duration_estimate}</span>
        </div>

        {/* Main screen */}
        <div className="relative aspect-video w-full bg-navy overflow-hidden">
          {/* Scene image */}
          {!imgErrors.has(currentScene.scene_number) ? (
            <img
              src={sceneImg}
              alt={`Scene ${currentScene.scene_number}: ${currentScene.location}`}
              className={`h-full w-full object-cover transition-all duration-700 ${isPlaying ? "scale-105" : "scale-100"}`}
              onError={() => setImgErrors((prev) => new Set(prev).add(currentScene.scene_number))}
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-gold/[0.06] to-navy">
              <span className="font-heading text-7xl font-bold text-gold/15">{currentScene.scene_number}</span>
            </div>
          )}

          {/* Vignette overlay */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-black/30" />

          {/* Scene info overlay */}
          <div className="absolute bottom-0 left-0 right-0 p-6">
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

          {/* Dialogue overlay */}
          {isPlaying && playerLineIdx >= 0 && playerLineIdx < currentScene.dialogue.length && (
            <div className="absolute left-0 right-0 top-6 flex justify-center">
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
            <div className="absolute inset-0 flex items-center justify-center bg-black/40 backdrop-blur-sm">
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
            <div className="absolute inset-0 flex items-center justify-center bg-black/50 backdrop-blur-sm">
              <div className="flex flex-col items-center gap-4 text-center">
                <div className="flex h-16 w-16 items-center justify-center rounded-full bg-gold/20 ring-1 ring-gold/40">
                  <svg className="h-8 w-8 text-gold" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                  </svg>
                </div>
                <div>
                  <h4 className="font-heading text-xl font-bold text-white">Film Complete</h4>
                  <p className="mt-1 text-sm text-gray-400">
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
                    onClick={onClose}
                    className="inline-flex items-center gap-2 rounded-full border border-gold/40 px-6 py-3 font-heading text-sm font-bold tracking-wider text-gold uppercase transition hover:bg-gold/10"
                  >
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182" />
                    </svg>
                    Remix / Generate Again
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Controls bar */}
        <div className="flex items-center gap-3 border-t border-gold/10 px-4 py-3">
          {/* Play/Pause */}
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

          {/* Prev scene */}
          <button
            onClick={handlePrevScene}
            disabled={currentSceneIdx === 0}
            className="inline-flex h-8 w-8 items-center justify-center rounded-full text-gray-400 transition hover:text-gold hover:bg-gold/10 disabled:opacity-30 disabled:cursor-not-allowed"
            title="Previous Scene"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 5.25l-8.25 6.75L21 18.75M3 5.25v13.5" />
            </svg>
          </button>

          {/* Next scene */}
          <button
            onClick={handleNextScene}
            disabled={currentSceneIdx >= script.scenes.length - 1}
            className="inline-flex h-8 w-8 items-center justify-center rounded-full text-gray-400 transition hover:text-gold hover:bg-gold/10 disabled:opacity-30 disabled:cursor-not-allowed"
            title="Next Scene"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 5.25l8.25 6.75L3 18.75M21 5.25v13.5" />
            </svg>
          </button>

          {/* Scene progress */}
          <div className="flex-1 mx-2">
            <div className="flex items-center gap-2">
              <span className="font-mono text-[10px] text-gray-500">
                Scene {currentScene.scene_number}/{script.scenes.length}
              </span>
              <div className="flex-1 h-1.5 rounded-full bg-gray-800 overflow-hidden">
                <div
                  className="h-full rounded-full bg-gold transition-all duration-500"
                  style={{ width: `${(currentSceneIdx / Math.max(script.scenes.length - 1, 1)) * 100}%` }}
                />
              </div>
            </div>
            {/* Scene dots */}
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

          {/* Status */}
          <span className={`font-mono text-[10px] ${
            isPlaying ? "text-gold animate-pulse" : isDone ? "text-gold/60" : "text-gray-500"
          }`}>
            {isPlaying ? "▶ LIVE" : isPaused ? "⏸ PAUSED" : isDone ? "✓ DONE" : ""}
          </span>
        </div>

        {/* Bottom action bar */}
        <div className="flex items-center justify-between border-t border-gold/10 px-4 py-3">
          <div className="flex items-center gap-2 text-[10px] text-gray-500">
            <svg className="h-3 w-3 text-gold/50" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 9l10.5-3m0 6.553v3.75a2.25 2.25 0 01-1.632 2.163l-1.32.377a1.803 1.803 0 11-.99-3.467l2.31-.66a2.25 2.25 0 001.632-2.163zm0 0V2.25L9 5.25v10.303m0 0v3.75a2.25 2.25 0 01-1.632 2.163l-1.32.377a1.803 1.803 0 01-.99-3.467l2.31-.66A2.25 2.25 0 009 15.553z" />
            </svg>
            AI-generated score &bull; Web Speech voices
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                // Download: create a text export of the script
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
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
              </svg>
              Download Film
            </button>
            <button
              onClick={onClose}
              className="inline-flex items-center gap-1.5 rounded-full bg-gold/10 px-4 py-2 font-heading text-[10px] font-bold tracking-wider text-gold uppercase transition hover:bg-gold/20"
            >
              <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182" />
              </svg>
              Remix / Generate Again
            </button>
          </div>
        </div>
      </div>

      {/* Inline style for particle animations */}
      <style>{`
        @keyframes particle-float {
          0%, 100% { transform: translateY(0) translateX(0); opacity: 0.3; }
          50% { transform: translateY(-8px) translateX(4px); opacity: 0.7; }
        }
      `}</style>
    </div>
  );
}

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}
