"use client";

import { useState, useRef, useCallback, useEffect } from "react";

export interface DialogueLine {
  character: string;
  line: string;
}

export interface VoiceProfile {
  character: string;
  pitch: number;
  rate: number;
  volume: number;
}

export type PlaybackState = "idle" | "generating" | "ready" | "playing" | "paused" | "done";

interface UseVoiceoverOptions {
  dialogue: DialogueLine[];
  voiceProfiles: VoiceProfile[];
  onLineChange?: (index: number) => void;
}

interface UseVoiceoverReturn {
  state: PlaybackState;
  currentLineIndex: number;
  totalLines: number;
  progress: number;
  play: () => void;
  pause: () => void;
  resume: () => void;
  stop: () => void;
  generate: () => Promise<void>;
}

/** Pick a voice from the available ones that best matches the desired pitch */
function pickVoice(targetPitch: number): SpeechSynthesisVoice | null {
  if (typeof window === "undefined" || !window.speechSynthesis) return null;
  const voices = window.speechSynthesis.getVoices();
  if (voices.length === 0) return null;

  // Prefer English voices
  const english = voices.filter((v) => v.lang.startsWith("en"));
  const pool = english.length > 0 ? english : voices;

  // Sort by proximity to target pitch (lower index = deeper voice approximation)
  // We use voice URI hash as a stable proxy
  const sorted = [...pool].sort((a, b) => {
    const ha = [...a.voiceURI].reduce((s, c) => s + c.charCodeAt(0), 0);
    const hb = [...b.voiceURI].reduce((s, c) => s + c.charCodeAt(0), 0);
    return (ha % 100) - (hb % 100);
  });

  // Map target pitch 0.45–1.15 to a position in the sorted array
  const fraction = (targetPitch - 0.45) / 0.7; // normalize to 0–1
  const clamped = Math.max(0, Math.min(1, fraction));
  const idx = Math.floor(clamped * (sorted.length - 1));
  return sorted[idx] ?? sorted[0];
}

export function useVoiceover({
  dialogue,
  voiceProfiles,
  onLineChange,
}: UseVoiceoverOptions): UseVoiceoverReturn {
  const [state, setState] = useState<PlaybackState>("idle");
  const [currentLineIndex, setCurrentLineIndex] = useState(-1);
  const synthRef = useRef<SpeechSynthesis | null>(null);
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);
  const pausedRef = useRef(false);
  const lineIndexRef = useRef(0);

  const totalLines = dialogue.length;
  const progress = totalLines > 0 ? currentLineIndex / totalLines : 0;

  // Build profile lookup
  const profileMap = useRef<Map<string, VoiceProfile>>(new Map());
  useEffect(() => {
    const map = new Map<string, VoiceProfile>();
    for (const p of voiceProfiles) {
      map.set(p.character.toUpperCase().trim(), p);
    }
    profileMap.current = map;
  }, [voiceProfiles]);

  const stop = useCallback(() => {
    if (synthRef.current) {
      synthRef.current.cancel();
    }
    pausedRef.current = false;
    lineIndexRef.current = 0;
    setCurrentLineIndex(-1);
    setState("ready");
  }, []);

  const speakLine = useCallback(
    (index: number): Promise<void> => {
      return new Promise((resolve) => {
        if (index >= dialogue.length) {
          resolve();
          return;
        }

        const synth = window.speechSynthesis;
        const d = dialogue[index];
        const key = d.character.toUpperCase().trim();
        const profile = profileMap.current.get(key);

        const utterance = new SpeechSynthesisUtterance(d.line);
        utteranceRef.current = utterance;

        // Assign voice
        if (profile) {
          const voice = pickVoice(profile.pitch);
          if (voice) utterance.voice = voice;
          utterance.pitch = profile.pitch;
          utterance.rate = profile.rate;
          utterance.volume = profile.volume;
        }

        setCurrentLineIndex(index);
        lineIndexRef.current = index;
        onLineChange?.(index);

        utterance.onend = () => {
          // Check if we were paused/cancelled during this utterance
          if (pausedRef.current) return;
          resolve();
        };

        utterance.onerror = () => {
          // Some errors are benign (cancelled)
          resolve();
        };

        synth.speak(utterance);
      });
    },
    [dialogue, onLineChange]
  );

  const playThrough = useCallback(async () => {
    if (!window.speechSynthesis) {
      console.warn("SpeechSynthesis not available");
      setState("ready");
      return;
    }

    synthRef.current = window.speechSynthesis;
    pausedRef.current = false;

    for (let i = lineIndexRef.current; i < dialogue.length; i++) {
      if (pausedRef.current) {
        // Paused mid-playback
        return;
      }
      await speakLine(i);
    }

    // All lines spoken
    if (!pausedRef.current) {
      setState("done");
      setCurrentLineIndex(-1);
      lineIndexRef.current = 0;
    }
  }, [dialogue.length, speakLine]);

  const play = useCallback(() => {
    lineIndexRef.current = 0;
    setState("playing");
    playThrough();
  }, [playThrough]);

  const pause = useCallback(() => {
    pausedRef.current = true;
    if (synthRef.current) {
      synthRef.current.cancel();
    }
    setState("paused");
  }, []);

  const resume = useCallback(() => {
    pausedRef.current = false;
    setState("playing");
    // Resume from the line after the current one (current was interrupted)
    const nextIdx = lineIndexRef.current + 1;
    if (nextIdx >= dialogue.length) {
      // Was on last line, restart from beginning
      lineIndexRef.current = 0;
      setCurrentLineIndex(-1);
    } else {
      lineIndexRef.current = nextIdx;
      setCurrentLineIndex(nextIdx - 1);
    }
    playThrough();
  }, [dialogue.length, playThrough]);

  // Simulate AI generation, then mark as ready
  const generate = useCallback(async () => {
    setState("generating");
    // Import the server function dynamically to avoid SSR issues
    const { generateVoiceover } = await import("~/server/generate-voiceover");
    const scene = {
      scene_number: 0,
      location: "",
      visual_description: "",
      dialogue,
      cinematic_notes: "",
    };
    try {
      await generateVoiceover({ data: { scene } });
    } catch {
      // Even if the server call fails, we can still use local TTS
    }
    setState("ready");
  }, [dialogue]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (synthRef.current) {
        synthRef.current.cancel();
      }
    };
  }, []);

  return {
    state,
    currentLineIndex,
    totalLines,
    progress,
    play,
    pause,
    resume,
    stop,
    generate,
  };
}
