import { createServerFn } from "@tanstack/react-start";
import { getRequestIP, getRequestHeader } from "@tanstack/react-start-server";
import crypto from "crypto";
import { sql } from "~/db";

const COOLDOWN_MS = 24 * 60 * 60 * 1000; // 24 hours

function getTodayKey(): string {
  return new Date().toISOString().slice(0, 10);
}

/**
 * Derive a stable anonymous fingerprint from the request's IP and User-Agent.
 * This isn't perfect (IPs change, shared IPs), but it's a reasonable
 * server-side gating mechanism that survives localStorage clearing.
 */
function deriveFingerprint(): string {
  const ip = getRequestIP({ xForwardedFor: true }) || "unknown";
  const userAgent = getRequestHeader("user-agent") || "unknown";
  return crypto.createHash("sha256").update(ip + userAgent).digest("hex");
}

/**
 * Ensure the free_tier_usage table exists (idempotent).
 */
async function ensureTable(): Promise<void> {
  await sql()`CREATE TABLE IF NOT EXISTS free_tier_usage (
    id SERIAL PRIMARY KEY,
    fingerprint TEXT NOT NULL,
    films_generated_today INTEGER DEFAULT 0,
    last_generated_at TIMESTAMPTZ,
    date_key TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT free_tier_usage_fingerprint_date_key UNIQUE (fingerprint, date_key)
  )`;
}

/**
 * Check whether the current user (by fingerprint) is allowed to generate
 * a film under the free tier.
 */
export const checkFreeTierLimit = createServerFn().handler(async () => {
  // Graceful degradation: if DATABASE_URL is not set, allow generation
  if (!process.env.DATABASE_URL) {
    console.warn(
      "free-tier: DATABASE_URL not set — allowing generation without server-side enforcement",
    );
    return { allowed: true };
  }

  const fingerprint = deriveFingerprint();
  const today = getTodayKey();

  try {
    await ensureTable();

    const rows =
      await sql()`SELECT films_generated_today, last_generated_at, date_key 
        FROM free_tier_usage 
        WHERE fingerprint = ${fingerprint}
        ORDER BY date_key DESC LIMIT 1`;

    if (rows.length === 0) {
      return { allowed: true };
    }

    const row = rows[0] as {
      films_generated_today: number;
      last_generated_at: string | null;
      date_key: string;
    };

    // If the date key is stale (different day), reset is implied
    if (row.date_key !== today) {
      return { allowed: true };
    }

    // Check 24h cooldown
    if (row.films_generated_today >= 1 && row.last_generated_at) {
      const lastGen = new Date(row.last_generated_at).getTime();
      const elapsed = Date.now() - lastGen;

      if (elapsed < COOLDOWN_MS) {
        const remaining = COOLDOWN_MS - elapsed;
        const hours = Math.ceil(remaining / (60 * 60 * 1000));
        return {
          allowed: false,
          reason: `Free tier limited to 1 film per 24 hours. Next film available in ~${hours}h.`,
          remainingCooldown: remaining,
        };
      }
    }

    return { allowed: true };
  } catch (err) {
    console.error("free-tier: checkFreeTierLimit failed:", err);
    // On error, be permissive — don't block the user
    return { allowed: true, reason: "Server check unavailable — allowing generation" };
  }
});

/**
 * Record a film generation for the current user (by fingerprint).
 * Uses upsert (ON CONFLICT) to handle new and existing rows.
 */
export const recordFreeTierUsage = createServerFn().handler(async () => {
  // Graceful degradation: if DATABASE_URL is not set, skip recording
  if (!process.env.DATABASE_URL) {
    console.warn(
      "free-tier: DATABASE_URL not set — skipping server-side usage recording",
    );
    return { success: true };
  }

  const fingerprint = deriveFingerprint();
  const today = getTodayKey();
  const now = new Date().toISOString();

  try {
    await ensureTable();

    await sql()`INSERT INTO free_tier_usage (fingerprint, films_generated_today, last_generated_at, date_key)
      VALUES (${fingerprint}, 1, ${now}, ${today})
      ON CONFLICT (fingerprint, date_key)
      DO UPDATE SET 
        films_generated_today = free_tier_usage.films_generated_today + 1,
        last_generated_at = ${now}`;

    return { success: true };
  } catch (err) {
    console.error("free-tier: recordFreeTierUsage failed:", err);
    return { success: true }; // Don't block on recording failure
  }
});
