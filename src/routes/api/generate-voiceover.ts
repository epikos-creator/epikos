import { createServerFn } from "@tanstack/react-start";
import type { Scene } from "./generate-script";

// ── Character voice profiles ──

export interface VoiceProfile {
  character: string;
  pitch: number;   // 0–2 (default 1), lower = deeper
  rate: number;    // 0.1–10 (default 1), lower = slower
  volume: number;  // 0–1
}

export interface VoiceoverResult {
  scene_number: number;
  dialogue_count: number;
  estimated_duration_seconds: number;
  voice_profiles: VoiceProfile[];
  status: "generated";
}

// ── Built-in character voice map ──

const CHARACTER_VOICES: Record<string, VoiceProfile> = {
  ODYSSEUS:       { character: "Odysseus",      pitch: 0.85, rate: 0.95, volume: 1.0 },
  POLYPHEMUS:     { character: "Polyphemus",    pitch: 0.45, rate: 0.75, volume: 1.0 },
  EURYLOCHUS:     { character: "Eurylochus",    pitch: 1.0,  rate: 1.0,  volume: 0.9 },
  EURYMACHUS:     { character: "Eurymachus",    pitch: 1.15, rate: 1.05, volume: 0.85 },
  "CYCLOPS VOICES": { character: "Cyclops Voices", pitch: 0.55, rate: 0.85, volume: 0.7 },
  "NARRATOR (V.O.)": { character: "Narrator",   pitch: 1.0,  rate: 0.95, volume: 1.0 },
  PROMPT_CHARACTER:  { character: "Character",  pitch: 1.0,  rate: 1.0,  volume: 1.0 },
};

function resolveVoiceProfile(characterName: string): VoiceProfile {
  const key = characterName.toUpperCase().trim();
  if (CHARACTER_VOICES[key]) return { ...CHARACTER_VOICES[key] };
  if (CHARACTER_VOICES[characterName]) return { ...CHARACTER_VOICES[characterName] };
  // Fallback: derive from name hash for variety
  const hash = [...characterName].reduce((h, c) => h + c.charCodeAt(0), 0);
  const pitch = 0.7 + (hash % 70) / 100;  // 0.70–1.40
  const rate  = 0.8 + (hash % 50) / 100;  // 0.80–1.30
  return { character: characterName, pitch, rate, volume: 1.0 };
}

// ── Estimate duration from dialogue text ──

function estimateDuration(dialogue: Array<{ character: string; line: string }>): number {
  const totalChars = dialogue.reduce((sum, d) => sum + d.line.length, 0);
  // Rough estimate: ~15 chars per second of speech
  return Math.max(1, Math.round(totalChars / 15));
}

// ── Server function ──

export const generateVoiceover = createServerFn()
  .validator((data: unknown) => {
    const { scene } = data as { scene: Scene };
    if (!scene || typeof scene.scene_number !== "number") {
      throw new Error("Invalid scene data: scene_number required");
    }
    return { scene };
  })
  .handler(async ({ data }) => {
    const { scene } = data;

    // Simulate AI voice generation delay (varies by dialogue length)
    const delayMs = 800 + scene.dialogue.length * 200;
    await new Promise((resolve) => setTimeout(resolve, Math.min(delayMs, 2500)));

    const voiceProfiles: VoiceProfile[] = [];
    const seen = new Set<string>();

    for (const d of scene.dialogue) {
      const key = d.character.toUpperCase().trim();
      if (!seen.has(key)) {
        seen.add(key);
        voiceProfiles.push(resolveVoiceProfile(d.character));
      }
    }

    const result: VoiceoverResult = {
      scene_number: scene.scene_number,
      dialogue_count: scene.dialogue.length,
      estimated_duration_seconds: estimateDuration(scene.dialogue),
      voice_profiles: voiceProfiles,
      status: "generated",
    };

    return result;
  });

// ── Generate-all convenience ──

export const generateAllVoiceovers = createServerFn()
  .validator((data: unknown) => {
    const { scenes } = data as { scenes: Scene[] };
    if (!Array.isArray(scenes)) {
      throw new Error("Invalid data: scenes array required");
    }
    return { scenes };
  })
  .handler(async ({ data }) => {
    const results: VoiceoverResult[] = [];

    for (const scene of data.scenes) {
      const delayMs = 600 + scene.dialogue.length * 150;
      await new Promise((resolve) => setTimeout(resolve, Math.min(delayMs, 2000)));

      const voiceProfiles: VoiceProfile[] = [];
      const seen = new Set<string>();
      for (const d of scene.dialogue) {
        const key = d.character.toUpperCase().trim();
        if (!seen.has(key)) {
          seen.add(key);
          voiceProfiles.push(resolveVoiceProfile(d.character));
        }
      }

      results.push({
        scene_number: scene.scene_number,
        dialogue_count: scene.dialogue.length,
        estimated_duration_seconds: estimateDuration(scene.dialogue),
        voice_profiles: voiceProfiles,
        status: "generated",
      });
    }

    return results;
  });
