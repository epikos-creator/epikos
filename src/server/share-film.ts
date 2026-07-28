import { createServerFn } from "@tanstack/react-start";
import { sql } from "~/db";
import type { Script, Scene } from "~/server/generate-script";

// Re-export Script type for consumers
export type { Script, Scene };

// ── Validation constants ──

const MAX_TITLE_LEN = 200;
const MAX_LOGLINE_LEN = 600;
const MAX_SCENES = 20;
const MAX_LOCATION_LEN = 200;
const MAX_VISUAL_DESC_LEN = 2000;
const MAX_DIALOGUE_LINES = 30;
const MAX_CHARACTER_LEN = 100;
const MAX_LINE_LEN = 500;
const MAX_CINEMATIC_NOTES_LEN = 1000;
const MAX_DURATION_LEN = 50;
// Soft limit on total JSON payload (before stringification, ~50KB)
const MAX_PAYLOAD_BYTES = 50_000;

// ── Validation helper ──

function validateScript(data: unknown): Script {
  const s = data as Record<string, unknown>;

  if (typeof s?.title !== "string" || s.title.length === 0 || s.title.length > MAX_TITLE_LEN) {
    throw new Error("Invalid title");
  }
  if (typeof s?.logline !== "string" || s.logline.length === 0 || s.logline.length > MAX_LOGLINE_LEN) {
    throw new Error("Invalid logline");
  }
  if (typeof s?.duration_estimate !== "string" || s.duration_estimate.length > MAX_DURATION_LEN) {
    throw new Error("Invalid duration estimate");
  }
  if (!Array.isArray(s?.scenes) || s.scenes.length === 0 || s.scenes.length > MAX_SCENES) {
    throw new Error("Scenes must be a non-empty array with at most 20 entries");
  }

  const scenes: Scene[] = [];
  for (let i = 0; i < s.scenes.length; i++) {
    const scene = s.scenes[i] as Record<string, unknown>;
    if (typeof scene?.scene_number !== "number" || scene.scene_number < 1) {
      throw new Error(`Scene ${i + 1}: invalid scene_number`);
    }
    if (typeof scene?.location !== "string" || scene.location.length === 0 || scene.location.length > MAX_LOCATION_LEN) {
      throw new Error(`Scene ${i + 1}: invalid location`);
    }
    if (typeof scene?.visual_description !== "string" || scene.visual_description.length === 0 || scene.visual_description.length > MAX_VISUAL_DESC_LEN) {
      throw new Error(`Scene ${i + 1}: invalid visual_description`);
    }
    if (typeof scene?.cinematic_notes !== "string" || scene.cinematic_notes.length > MAX_CINEMATIC_NOTES_LEN) {
      throw new Error(`Scene ${i + 1}: invalid cinematic_notes`);
    }
    if (!Array.isArray(scene?.dialogue)) {
      throw new Error(`Scene ${i + 1}: dialogue must be an array`);
    }
    if (scene.dialogue.length > MAX_DIALOGUE_LINES) {
      throw new Error(`Scene ${i + 1}: too many dialogue lines`);
    }

    const dialogue: Array<{ character: string; line: string }> = [];
    for (let j = 0; j < scene.dialogue.length; j++) {
      const d = scene.dialogue[j] as Record<string, unknown>;
      if (typeof d?.character !== "string" || d.character.length === 0 || d.character.length > MAX_CHARACTER_LEN) {
        throw new Error(`Scene ${i + 1}, dialogue ${j + 1}: invalid character`);
      }
      if (typeof d?.line !== "string" || d.line.length === 0 || d.line.length > MAX_LINE_LEN) {
        throw new Error(`Scene ${i + 1}, dialogue ${j + 1}: invalid line`);
      }
      dialogue.push({ character: d.character, line: d.line });
    }
    scenes.push({
      scene_number: scene.scene_number,
      location: scene.location,
      visual_description: scene.visual_description,
      dialogue,
      cinematic_notes: scene.cinematic_notes,
    });
  }

  const script: Script = {
    title: s.title,
    logline: s.logline,
    scenes,
    duration_estimate: s.duration_estimate,
  };

  // Size check on the serialized payload
  const json = JSON.stringify(script);
  if (json.length > MAX_PAYLOAD_BYTES) {
    throw new Error("Film data is too large to share");
  }

  return script;
}

// ── Utility: generate a short share ID ──

function generateShareId(): string {
  // 16 random URL-safe characters (~95 bits of entropy)
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_";
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  let id = "";
  for (let i = 0; i < 16; i++) {
    id += chars[bytes[i] % chars.length];
  }
  return id;
}

// ── Server functions ──

/**
 * Create a shared film record in the database.
 * Returns a stable `shareId` that can be used to retrieve the film from any device.
 */
export const createSharedFilm = createServerFn()
  .validator((data: unknown) => {
    const validated = validateScript(data);
    return validated;
  })
  .handler(async ({ data: script }) => {
    const shareId = generateShareId();

    try {
      await sql()`CREATE TABLE IF NOT EXISTS shared_films (
        share_id TEXT PRIMARY KEY,
        title TEXT NOT NULL,
        logline TEXT NOT NULL,
        scenes JSONB NOT NULL,
        duration_estimate TEXT NOT NULL,
        created_at TIMESTAMPTZ DEFAULT NOW()
      )`;

      await sql()`INSERT INTO shared_films (share_id, title, logline, scenes, duration_estimate)
        VALUES (${shareId}, ${script.title}, ${script.logline}, ${JSON.stringify(script.scenes)}, ${script.duration_estimate})`;

      return { shareId };
    } catch (err) {
      console.error("Failed to create shared film:", err);
      throw new Error("Failed to save shared film. Please try again.");
    }
  });

/**
 * Fetch a shared film by its share ID.
 * Returns the film data or null if not found.
 */
export const getSharedFilm = createServerFn()
  .validator((data: unknown) => {
    const { shareId } = data as { shareId?: string };
    if (!shareId || typeof shareId !== "string" || shareId.length === 0) {
      throw new Error("Invalid share ID");
    }
    // Sanitize: only allow URL-safe characters, max 32 chars
    if (!/^[A-Za-z0-9\-_]{1,32}$/.test(shareId)) {
      throw new Error("Invalid share ID format");
    }
    return { shareId };
  })
  .handler(async ({ data }) => {
    try {
      const rows = await sql()`SELECT share_id, title, logline, scenes, duration_estimate, created_at
        FROM shared_films
        WHERE share_id = ${data.shareId}
        LIMIT 1`;

      if (rows.length === 0) {
        return { found: false as const, film: null };
      }

      const row = rows[0] as Record<string, unknown>;
      const film: Script = {
        title: row.title as string,
        logline: row.logline as string,
        scenes: row.scenes as Scene[],
        duration_estimate: row.duration_estimate as string,
      };

      return { found: true as const, film };
    } catch (err) {
      console.error("Failed to fetch shared film:", err);
      throw new Error("Failed to load shared film. Please try again.");
    }
  });
