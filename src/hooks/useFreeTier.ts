"use client";

const STORAGE_KEY = "epikos_free_tier";
const COOLDOWN_MS = 24 * 60 * 60 * 1000; // 24 hours

interface FreeTierState {
  lastGeneratedAt: number | null;
  filmsGeneratedToday: number;
  dateKey: string; // YYYY-MM-DD
}

function getTodayKey(): string {
  return new Date().toISOString().slice(0, 10);
}

export function getFreeTierState(): FreeTierState {
  if (typeof window === "undefined")
    return { lastGeneratedAt: null, filmsGeneratedToday: 0, dateKey: getTodayKey() };

  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return { lastGeneratedAt: null, filmsGeneratedToday: 0, dateKey: getTodayKey() };
    }
    const state = JSON.parse(raw) as FreeTierState;
    const today = getTodayKey();
    // Reset counter if it's a new day
    if (state.dateKey !== today) {
      const reset: FreeTierState = {
        lastGeneratedAt: state.lastGeneratedAt,
        filmsGeneratedToday: 0,
        dateKey: today,
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(reset));
      return reset;
    }
    return state;
  } catch {
    return { lastGeneratedAt: null, filmsGeneratedToday: 0, dateKey: getTodayKey() };
  }
}

export function recordFreeFilmGeneration(): void {
  if (typeof window === "undefined") return;
  const state = getFreeTierState();
  state.lastGeneratedAt = Date.now();
  state.filmsGeneratedToday++;
  state.dateKey = getTodayKey();
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    /* ignore */
  }
}

/**
 * Check if user can generate a film under the free tier.
 *
 * HOTFIX: Always enforces free-tier rules. The previous code
 * had a bug where it checked `localStorage.getItem("epikos_subscription") === "active"`
 * — but the stored value is JSON, so that string comparison always failed.
 * Since paid subscriptions are disabled for launch integrity (no server-side
 * webhook verification), we simply always enforce the 1-film/24h limit.
 */
export function canGenerateFreeFilm(): {
  allowed: boolean;
  reason?: string;
  remainingCooldown?: number;
} {
  const state = getFreeTierState();

  if (state.filmsGeneratedToday >= 1) {
    // Check if 24h cooldown has passed since last generation
    if (state.lastGeneratedAt && Date.now() - state.lastGeneratedAt < COOLDOWN_MS) {
      const remaining = COOLDOWN_MS - (Date.now() - state.lastGeneratedAt);
      const hours = Math.ceil(remaining / (60 * 60 * 1000));
      return {
        allowed: false,
        reason: `Free tier limited to 1 film per 24 hours. Next film available in ~${hours}h.`,
        remainingCooldown: remaining,
      };
    }
    // Cooldown passed — allow another
    return { allowed: true };
  }

  return { allowed: true };
}

export function formatCooldown(ms: number): string {
  const hours = Math.floor(ms / (60 * 60 * 1000));
  const minutes = Math.floor((ms % (60 * 60 * 1000)) / (60 * 1000));
  if (hours > 0) return `${hours}h ${minutes}m`;
  return `${minutes}m`;
}
