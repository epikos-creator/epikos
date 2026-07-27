"use client";

import { useState, useEffect } from "react";
import type { Script } from "~/routes/api/generate-script";

export interface SavedFilm {
  id: string;
  title: string;
  logline: string;
  scenes: Script["scenes"];
  duration_estimate: string;
  createdAt: string;
  thumbnailScene: number;
}

const STORAGE_KEY = "epikos_films";

export function loadFilms(): SavedFilm[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as SavedFilm[];
  } catch {
    return [];
  }
}

export function saveFilm(script: Script): SavedFilm {
  const films = loadFilms();
  const film: SavedFilm = {
    id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
    title: script.title,
    logline: script.logline,
    scenes: script.scenes,
    duration_estimate: script.duration_estimate,
    createdAt: new Date().toISOString(),
    thumbnailScene: script.scenes[0]?.scene_number ?? 1,
  };
  films.unshift(film); // newest first
  // Keep max 20 films
  const trimmed = films.slice(0, 20);
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(trimmed));
  } catch {
    // Storage full — keep most recent 5
    localStorage.setItem(STORAGE_KEY, JSON.stringify(films.slice(0, 5)));
  }
  return film;
}

export function deleteFilm(id: string): void {
  const films = loadFilms().filter((f) => f.id !== id);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(films));
}

interface FilmHistoryProps {
  onSelect: (film: SavedFilm) => void;
  activeFilmId?: string;
}

export function FilmHistory({ onSelect, activeFilmId }: FilmHistoryProps) {
  const [films, setFilms] = useState<SavedFilm[]>([]);

  useEffect(() => {
    setFilms(loadFilms());
  }, []);

  if (films.length === 0) return null;

  const sceneImage = (sceneNumber: number) => {
    const idx = ((sceneNumber - 1) % 6) + 1;
    return `/images/odyssey-${idx}.png`;
  };

  return (
    <div className="mx-auto mt-16 max-w-5xl">
      <div className="mb-6 flex items-center gap-3">
        <svg className="h-5 w-5 text-gold/60" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <h3 className="font-heading text-sm font-semibold tracking-[0.15em] text-gold/80 uppercase">
          Previous Films
        </h3>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {films.map((film) => (
          <button
            key={film.id}
            type="button"
            onClick={() => onSelect(film)}
            className={`group relative overflow-hidden rounded-xl border text-left transition-all duration-300 ${
              film.id === activeFilmId
                ? "border-gold bg-gold/[0.08] ring-1 ring-gold/30"
                : "border-gray-800 bg-white/[0.02] hover:border-gold/30 hover:bg-white/[0.04]"
            }`}
          >
            {/* Thumbnail */}
            <div className="relative aspect-video w-full overflow-hidden">
              <img
                src={sceneImage(film.thumbnailScene)}
                alt={film.title}
                className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />
              {/* Play icon overlay */}
              <div className="absolute inset-0 flex items-center justify-center opacity-0 transition-opacity group-hover:opacity-100">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gold/80 text-navy">
                  <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M8 5v14l11-7z" />
                  </svg>
                </div>
              </div>
            </div>

            {/* Info */}
            <div className="p-4">
              <h4 className="font-heading text-sm font-bold text-white truncate">
                {film.title}
              </h4>
              <p className="mt-1 text-[11px] leading-relaxed text-gray-400 line-clamp-2">
                {film.logline}
              </p>
              <div className="mt-3 flex items-center justify-between">
                <span className="font-mono text-[10px] text-gray-500">
                  {film.scenes.length} scenes · {film.duration_estimate}
                </span>
                <span className="font-mono text-[10px] text-gray-600">
                  {new Date(film.createdAt).toLocaleDateString()}
                </span>
              </div>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
