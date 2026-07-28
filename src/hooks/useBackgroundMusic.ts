"use client";

import { useRef, useCallback, useEffect } from "react";

/**
 * Emotion types that drive musical variation.
 */
export type MusicEmotion = "epic" | "tense" | "calm" | "triumphant" | "sad" | "mysterious";

/**
 * Detect emotion from scene description keywords.
 */
export function detectEmotion(text: string): MusicEmotion {
  const lower = text.toLowerCase();
  if (/battle|fight|clash|war|strike|attack|charge|fury|rage/i.test(lower)) return "epic";
  if (/dark|shadow|fear|monster|danger|threat|creep|horror|terror/i.test(lower)) return "tense";
  if (/peace|calm|gentle|soft|quiet|serene|rest|sleep|dawn/i.test(lower)) return "calm";
  if (/victory|triumph|glory|win|crown|hero|celebrat|honor/i.test(lower)) return "triumphant";
  if (/sad|loss|grief|weep|tear|mourn|death|farewell|goodbye/i.test(lower)) return "sad";
  if (/mystery|secret|unknown|strange|ancient|riddle|prophecy|oracle/i.test(lower)) return "mysterious";
  return "epic"; // default
}

interface OscillatorDef {
  hz: number;
  detune: number;
  type: OscillatorType;
  gain: number;
}

/**
 * Musical presets per emotion — different chord progressions and timbres.
 */
const EMOTION_PRESETS: Record<MusicEmotion, { oscillators: OscillatorDef[]; masterGain: number; lfoCount: number; lfoBaseFreq: number }> = {
  epic: {
    // D minor — bold, heroic, driven
    oscillators: [
      { hz: 73.42, detune: 0, type: "sine", gain: 0.35 },
      { hz: 146.83, detune: 3, type: "triangle", gain: 0.22 },
      { hz: 174.61, detune: -2, type: "sine", gain: 0.16 },
      { hz: 220.00, detune: 0, type: "triangle", gain: 0.13 },
      { hz: 293.66, detune: 5, type: "sine", gain: 0.08 },
      { hz: 349.23, detune: -4, type: "sine", gain: 0.05 },
    ],
    masterGain: 0.12,
    lfoCount: 3,
    lfoBaseFreq: 0.08,
  },
  tense: {
    // Diminished cluster — unsettling, suspenseful
    oscillators: [
      { hz: 69.30, detune: 0, type: "sawtooth", gain: 0.12 },
      { hz: 138.59, detune: -5, type: "triangle", gain: 0.10 },
      { hz: 164.81, detune: 2, type: "sine", gain: 0.08 },
      { hz: 207.65, detune: -8, type: "sawtooth", gain: 0.06 },
      { hz: 277.18, detune: 0, type: "triangle", gain: 0.04 },
    ],
    masterGain: 0.08,
    lfoCount: 4,
    lfoBaseFreq: 0.15,
  },
  calm: {
    // F major — warm, peaceful
    oscillators: [
      { hz: 87.31, detune: 0, type: "sine", gain: 0.25 },
      { hz: 174.61, detune: 3, type: "sine", gain: 0.15 },
      { hz: 220.00, detune: -2, type: "triangle", gain: 0.10 },
      { hz: 261.63, detune: 0, type: "sine", gain: 0.08 },
      { hz: 349.23, detune: 5, type: "sine", gain: 0.05 },
    ],
    masterGain: 0.09,
    lfoCount: 2,
    lfoBaseFreq: 0.05,
  },
  triumphant: {
    // D major — bright, victorious
    oscillators: [
      { hz: 73.42, detune: 0, type: "triangle", gain: 0.30 },
      { hz: 146.83, detune: 2, type: "sine", gain: 0.20 },
      { hz: 185.00, detune: 0, type: "triangle", gain: 0.14 }, // F#
      { hz: 220.00, detune: -3, type: "sine", gain: 0.12 },
      { hz: 293.66, detune: 0, type: "triangle", gain: 0.08 },
      { hz: 370.00, detune: 2, type: "sine", gain: 0.05 }, // F#5
    ],
    masterGain: 0.14,
    lfoCount: 3,
    lfoBaseFreq: 0.10,
  },
  sad: {
    // A minor — melancholic, reflective
    oscillators: [
      { hz: 110.00, detune: 0, type: "sine", gain: 0.28 },
      { hz: 220.00, detune: -5, type: "triangle", gain: 0.16 },
      { hz: 261.63, detune: 0, type: "sine", gain: 0.10 },
      { hz: 329.63, detune: -3, type: "triangle", gain: 0.07 },
      { hz: 440.00, detune: 0, type: "sine", gain: 0.04 },
    ],
    masterGain: 0.08,
    lfoCount: 2,
    lfoBaseFreq: 0.04,
  },
  mysterious: {
    // Whole-tone scale — ethereal, otherworldly
    oscillators: [
      { hz: 98.00, detune: 0, type: "sine", gain: 0.18 },
      { hz: 196.00, detune: 5, type: "triangle", gain: 0.12 },
      { hz: 246.94, detune: -3, type: "sine", gain: 0.08 },
      { hz: 311.13, detune: 0, type: "triangle", gain: 0.06 },
      { hz: 392.00, detune: 8, type: "sine", gain: 0.04 },
    ],
    masterGain: 0.07,
    lfoCount: 5,
    lfoBaseFreq: 0.12,
  },
};

/**
 * Web Audio API cinematic background music generator.
 * Supports multiple emotion presets and smooth transitions between them.
 */
export function useBackgroundMusic() {
  const ctxRef = useRef<AudioContext | null>(null);
  const masterGainRef = useRef<GainNode | null>(null);
  const oscillatorsRef = useRef<OscillatorNode[]>([]);
  const gainNodesRef = useRef<GainNode[]>([]);
  const lfoRefs = useRef<OscillatorNode[]>([]);
  const lfoGainRefs = useRef<GainNode[]>([]);
  const isPlayingRef = useRef(false);
  const currentEmotionRef = useRef<MusicEmotion>("epic");

  const initContext = useCallback(() => {
    if (ctxRef.current && ctxRef.current.state !== "closed") return ctxRef.current;
    const ctx = new AudioContext();
    ctxRef.current = ctx;

    const masterGain = ctx.createGain();
    masterGain.gain.value = 0;
    masterGain.connect(ctx.destination);
    masterGainRef.current = masterGain;

    return ctx;
  }, []);

  /** Stop all current oscillators and LFOs */
  const stopAllOscillators = useCallback(() => {
    const ctx = ctxRef.current;
    if (!ctx) return;

    const now = ctx.currentTime;

    for (const osc of oscillatorsRef.current) {
      try { osc.stop(now); } catch (_) {}
    }
    for (const lfo of lfoRefs.current) {
      try { lfo.stop(now); } catch (_) {}
    }
    oscillatorsRef.current = [];
    gainNodesRef.current = [];
    lfoRefs.current = [];
    lfoGainRefs.current = [];
  }, []);

  /** Start playing with a specific emotion preset */
  const start = useCallback((emotion?: MusicEmotion) => {
    const ctx = initContext();
    const presetEmotion = emotion || currentEmotionRef.current || "epic";
    currentEmotionRef.current = presetEmotion;

    // Stop any existing playback
    if (isPlayingRef.current) {
      stopAllOscillators();
    }

    if (ctx.state === "suspended") ctx.resume();

    const masterGain = masterGainRef.current!;
    const preset = EMOTION_PRESETS[presetEmotion];
    const now = ctx.currentTime;

    // Fade in
    masterGain.gain.cancelScheduledValues(now);
    masterGain.gain.setValueAtTime(0, now);
    masterGain.gain.linearRampToValueAtTime(preset.masterGain, now + 1.5);

    const oscillators: OscillatorNode[] = [];
    const gainNodes: GainNode[] = [];

    for (const f of preset.oscillators) {
      const osc = ctx.createOscillator();
      osc.type = f.type;
      osc.frequency.value = f.hz;
      osc.detune.value = f.detune;

      const gainNode = ctx.createGain();
      gainNode.gain.value = f.gain;

      osc.connect(gainNode);
      gainNode.connect(masterGain);
      osc.start(now);
      oscillators.push(osc);
      gainNodes.push(gainNode);
    }

    // LFO modulation for organic movement
    const lfos: OscillatorNode[] = [];
    const lfoGains: GainNode[] = [];
    for (let i = 0; i < preset.lfoCount; i++) {
      const lfo = ctx.createOscillator();
      lfo.type = "sine";
      lfo.frequency.value = preset.lfoBaseFreq + i * (preset.lfoBaseFreq * 0.5);

      const lfoGain = ctx.createGain();
      lfoGain.gain.value = 1.5 + i * 0.5;

      lfo.connect(lfoGain);
      if (oscillators[i + 1]) {
        lfoGain.connect(oscillators[i + 1].frequency);
      }
      lfo.start(now);
      lfos.push(lfo);
      lfoGains.push(lfoGain);
    }

    oscillatorsRef.current = oscillators;
    gainNodesRef.current = gainNodes;
    lfoRefs.current = lfos;
    lfoGainRefs.current = lfoGains;
    isPlayingRef.current = true;
  }, [initContext, stopAllOscillators]);

  /** Crossfade to a new emotion preset */
  const transitionTo = useCallback((emotion: MusicEmotion, durationMs: number = 2000) => {
    const ctx = ctxRef.current;
    const masterGain = masterGainRef.current;
    if (!ctx || !masterGain || !isPlayingRef.current) {
      // Not playing — just start fresh
      start(emotion);
      return;
    }

    const now = ctx.currentTime;
    const durationSec = durationMs / 1000;

    // Fade out current
    masterGain.gain.cancelScheduledValues(now);
    masterGain.gain.setValueAtTime(masterGain.gain.value, now);
    masterGain.gain.linearRampToValueAtTime(0, now + durationSec * 0.5);

    // Schedule new preset after fade-out
    const newPreset = EMOTION_PRESETS[emotion];
    currentEmotionRef.current = emotion;

    // Schedule stop of old oscillators
    const stopTime = now + durationSec * 0.5 + 0.05;
    for (const osc of oscillatorsRef.current) {
      try { osc.stop(stopTime); } catch (_) {}
    }
    for (const lfo of lfoRefs.current) {
      try { lfo.stop(stopTime); } catch (_) {}
    }

    // Create new oscillators starting at crossfade midpoint
    const newStart = now + durationSec * 0.4;
    const newOscillators: OscillatorNode[] = [];
    const newGainNodes: GainNode[] = [];

    for (const f of newPreset.oscillators) {
      const osc = ctx.createOscillator();
      osc.type = f.type;
      osc.frequency.value = f.hz;
      osc.detune.value = f.detune;

      const gainNode = ctx.createGain();
      gainNode.gain.setValueAtTime(0, newStart);
      gainNode.gain.linearRampToValueAtTime(f.gain, newStart + durationSec * 0.5);

      osc.connect(gainNode);
      gainNode.connect(masterGain);
      osc.start(newStart);
      osc.stop(newStart + 60); // Safety stop after 60s
      newOscillators.push(osc);
      newGainNodes.push(gainNode);
    }

    // New LFOs
    const newLfos: OscillatorNode[] = [];
    const newLfoGains: GainNode[] = [];
    for (let i = 0; i < newPreset.lfoCount; i++) {
      const lfo = ctx.createOscillator();
      lfo.type = "sine";
      lfo.frequency.value = newPreset.lfoBaseFreq + i * (newPreset.lfoBaseFreq * 0.5);

      const lfoGain = ctx.createGain();
      lfoGain.gain.value = 1.5 + i * 0.5;

      lfo.connect(lfoGain);
      if (newOscillators[i + 1]) {
        lfoGain.connect(newOscillators[i + 1].frequency);
      }
      lfo.start(newStart);
      lfo.stop(newStart + 60);
      newLfos.push(lfo);
      newLfoGains.push(lfoGain);
    }

    // Fade master back in
    masterGain.gain.linearRampToValueAtTime(newPreset.masterGain, now + durationSec);

    // Replace refs after transition
    setTimeout(() => {
      oscillatorsRef.current = newOscillators;
      gainNodesRef.current = newGainNodes;
      lfoRefs.current = newLfos;
      lfoGainRefs.current = newLfoGains;
    }, durationMs);
  }, [start]);

  const stop = useCallback(() => {
    if (!isPlayingRef.current) return;

    const ctx = ctxRef.current;
    const masterGain = masterGainRef.current;
    if (!ctx || !masterGain) return;

    const now = ctx.currentTime;
    masterGain.gain.cancelScheduledValues(now);
    masterGain.gain.setValueAtTime(masterGain.gain.value, now);
    masterGain.gain.linearRampToValueAtTime(0, now + 1.0);

    const stopTime = now + 1.1;
    for (const osc of oscillatorsRef.current) {
      try { osc.stop(stopTime); } catch (_) {}
    }
    for (const lfo of lfoRefs.current) {
      try { lfo.stop(stopTime); } catch (_) {}
    }
    oscillatorsRef.current = [];
    gainNodesRef.current = [];
    lfoRefs.current = [];
    lfoGainRefs.current = [];
    isPlayingRef.current = false;
  }, []);

  const pause = useCallback(() => {
    if (!isPlayingRef.current) return;
    const ctx = ctxRef.current;
    const masterGain = masterGainRef.current;
    if (!ctx || !masterGain) return;

    const now = ctx.currentTime;
    masterGain.gain.cancelScheduledValues(now);
    masterGain.gain.setValueAtTime(masterGain.gain.value, now);
    masterGain.gain.linearRampToValueAtTime(0, now + 0.5);
    isPlayingRef.current = false;
  }, []);

  const resume = useCallback(() => {
    const ctx = ctxRef.current;
    const masterGain = masterGainRef.current;
    if (!ctx || !masterGain) return;
    if (isPlayingRef.current) return;

    if (ctx.state === "suspended") ctx.resume();

    const preset = EMOTION_PRESETS[currentEmotionRef.current];
    const now = ctx.currentTime;
    masterGain.gain.cancelScheduledValues(now);
    masterGain.gain.setValueAtTime(0, now);
    masterGain.gain.linearRampToValueAtTime(preset.masterGain, now + 0.8);
    isPlayingRef.current = true;
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      const ctx = ctxRef.current;
      if (ctx) {
        for (const osc of oscillatorsRef.current) {
          try { osc.stop(); } catch (_) {}
        }
        for (const lfo of lfoRefs.current) {
          try { lfo.stop(); } catch (_) {}
        }
        ctx.close().catch(() => {});
      }
    };
  }, []);

  return { start, stop, pause, resume, transitionTo, isPlaying: isPlayingRef, currentEmotion: currentEmotionRef };
}
