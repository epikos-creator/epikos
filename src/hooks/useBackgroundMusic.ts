"use client";

import { useRef, useCallback, useEffect } from "react";

/**
 * Web Audio API epic orchestral background music generator.
 * Uses layered oscillators to create a cinematic drone/chord progression
 * that plays during film playback.
 */
export function useBackgroundMusic() {
  const ctxRef = useRef<AudioContext | null>(null);
  const masterGainRef = useRef<GainNode | null>(null);
  const oscillatorsRef = useRef<OscillatorNode[]>([]);
  const lfoRefs = useRef<OscillatorNode[]>([]);
  const isPlayingRef = useRef(false);

  const initContext = useCallback(() => {
    if (ctxRef.current && ctxRef.current.state !== "closed") return ctxRef.current;
    const ctx = new AudioContext();
    ctxRef.current = ctx;

    // Master gain for fade in/out
    const masterGain = ctx.createGain();
    masterGain.gain.value = 0;
    masterGain.connect(ctx.destination);
    masterGainRef.current = masterGain;

    return ctx;
  }, []);

  const start = useCallback(() => {
    const ctx = initContext();
    if (isPlayingRef.current) return;

    // Resume context if suspended
    if (ctx.state === "suspended") ctx.resume();

    const masterGain = masterGainRef.current!;
    const now = ctx.currentTime;

    // Fade in
    masterGain.gain.cancelScheduledValues(now);
    masterGain.gain.setValueAtTime(0, now);
    masterGain.gain.linearRampToValueAtTime(0.12, now + 1.5);

    // ── Epic orchestral drone: D minor chord (D2, D3, F3, A3, D4) ──
    // Using sine + triangle waves for a warm, rich timbre

    const freqs = [
      { hz: 73.42, detune: 0, type: "sine" as OscillatorType, gain: 0.35 },       // D2 - deep bass
      { hz: 146.83, detune: 3, type: "triangle" as OscillatorType, gain: 0.2 },    // D3
      { hz: 174.61, detune: -2, type: "sine" as OscillatorType, gain: 0.15 },      // F3
      { hz: 220.00, detune: 0, type: "triangle" as OscillatorType, gain: 0.12 },   // A3
      { hz: 293.66, detune: 5, type: "sine" as OscillatorType, gain: 0.08 },       // D4
      { hz: 349.23, detune: -4, type: "sine" as OscillatorType, gain: 0.05 },      // F4 - subtle shimmer
    ];

    const oscillators: OscillatorNode[] = [];

    for (const f of freqs) {
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
    }

    // ── Slow LFO modulation for organic movement ──
    for (let i = 0; i < 3; i++) {
      const lfo = ctx.createOscillator();
      lfo.type = "sine";
      lfo.frequency.value = 0.08 + i * 0.04; // Very slow, slightly different rates

      const lfoGain = ctx.createGain();
      lfoGain.gain.value = 1.5 + i * 0.5;

      lfo.connect(lfoGain);
      // Modulate a couple of the oscillators' frequency slightly
      if (oscillators[i + 1]) {
        lfoGain.connect(oscillators[i + 1].frequency);
      }
      lfo.start(now);
      lfoRefs.current.push(lfo);
    }

    oscillatorsRef.current = oscillators;
    isPlayingRef.current = true;
  }, [initContext]);

  const stop = useCallback(() => {
    if (!isPlayingRef.current) return;

    const ctx = ctxRef.current;
    const masterGain = masterGainRef.current;
    if (!ctx || !masterGain) return;

    const now = ctx.currentTime;
    // Fade out
    masterGain.gain.cancelScheduledValues(now);
    masterGain.gain.setValueAtTime(masterGain.gain.value, now);
    masterGain.gain.linearRampToValueAtTime(0, now + 1.0);

    // Stop oscillators after fade
    const stopTime = now + 1.1;
    for (const osc of oscillatorsRef.current) {
      osc.stop(stopTime);
    }
    for (const lfo of lfoRefs.current) {
      lfo.stop(stopTime);
    }
    oscillatorsRef.current = [];
    lfoRefs.current = [];
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

    const now = ctx.currentTime;
    masterGain.gain.cancelScheduledValues(now);
    masterGain.gain.setValueAtTime(0, now);
    masterGain.gain.linearRampToValueAtTime(0.12, now + 0.8);
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

  return { start, stop, pause, resume, isPlaying: isPlayingRef };
}
