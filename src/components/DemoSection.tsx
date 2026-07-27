"use client";

import { useState } from "react";
import { generateScript } from "~/routes/api/generate-script";
import type { Script } from "~/routes/api/generate-script";
import { StoryboardViewer } from "~/components/StoryboardViewer";
import { AutoFilmPipeline } from "~/components/AutoFilmPipeline";
import { FilmHistory, type SavedFilm } from "~/components/FilmHistory";

export function DemoSection() {
  const [prompt, setPrompt] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "done" | "error">("idle");
  const [script, setScript] = useState<Script | null>(null);
  const [error, setError] = useState("");
  const [autoMode, setAutoMode] = useState(false);
  const [savedFilm, setSavedFilm] = useState<SavedFilm | null>(null);

  const handleGenerate = async () => {
    setStatus("loading");
    setError("");
    setScript(null);
    setAutoMode(false);
    setSavedFilm(null);

    try {
      const result = await generateScript({ data: { prompt } });
      setScript(result);
      setStatus("done");
    } catch (err: any) {
      setError(err?.message || "Something went wrong. Try again.");
      setStatus("error");
    }
  };

  const handleAutoMode = () => {
    setAutoMode(true);
    setError("");
    setScript(null);
    setStatus("idle");
    setSavedFilm(null);
  };

  const handleSelectFilm = (film: SavedFilm) => {
    setSavedFilm(film);
    setAutoMode(true);
    setError("");
    setScript(null);
    setStatus("idle");
  };

  const isLoading = status === "loading";

  return (
    <section id="demo" className="px-6 py-24 sm:px-12 lg:px-24">
      {/* Section header */}
      <div className="mx-auto max-w-2xl text-center">
        <span className="font-heading text-xs font-semibold tracking-[0.2em] text-gold uppercase">
          Live Demo
        </span>
        <h2 className="mt-3 font-heading text-3xl font-bold text-white sm:text-4xl">
          See the <span className="text-gold">magic</span>
        </h2>
        <p className="mt-4 text-gray-400">
          Click below to generate a cinematic short film from{" "}
          <em className="text-gold not-italic">The Odyssey</em> — Odysseus versus the
          Cyclops, adapted by AI into a full film with orchestral score, voice acting, and video export.
        </p>
      </div>

      {/* ── Auto Film Pipeline Button ── */}
      {!autoMode && status !== "done" && (
        <div className="mx-auto mt-8 max-w-xl text-center">
          <button
            type="button"
            onClick={handleAutoMode}
            className="group relative inline-flex items-center gap-3 overflow-hidden rounded-full bg-gradient-to-r from-gold via-gold/90 to-gold px-10 py-5 font-heading text-sm font-bold tracking-widest text-navy uppercase shadow-lg shadow-gold/25 transition-all duration-300 hover:shadow-xl hover:shadow-gold/40 hover:scale-[1.02] active:scale-[0.98]"
          >
            <div className="absolute inset-0 -translate-x-full animate-[shimmer_2.5s_infinite] bg-gradient-to-r from-transparent via-white/20 to-transparent" />
            <svg className="relative h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.455 2.456L21.75 6l-1.036.259a3.375 3.375 0 00-2.455 2.456z" />
            </svg>
            <span className="relative">Generate Full Automatic Film</span>
            <svg className="relative h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.455 2.456L21.75 6l-1.036.259a3.375 3.375 0 00-2.455 2.456z" />
            </svg>
          </button>
          <p className="mt-3 text-xs text-gray-600">
            One click — script, storyboard, orchestral score, voices, and film. No input needed.
          </p>
        </div>
      )}

      {/* ── Auto Film Pipeline ── */}
      {autoMode && (
        <AutoFilmPipeline
          onClose={() => {
            setAutoMode(false);
            setSavedFilm(null);
          }}
          savedFilm={savedFilm}
        />
      )}

      {/* ── Film History ── */}
      {!autoMode && status !== "done" && (
        <FilmHistory onSelect={handleSelectFilm} activeFilmId={savedFilm?.id} />
      )}

      {/* ── Manual flow below ── */}
      {!autoMode && (
        <>
          <div className="mx-auto mt-10 max-w-xl">
            <div className="flex flex-col gap-3 sm:flex-row">
              <input
                type="text"
                placeholder="Try your own prompt or leave empty for The Odyssey..."
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                disabled={isLoading}
                className="flex-1 rounded-full border border-gray-700 bg-white/10 px-5 py-3.5 text-white placeholder-gray-500 outline-none transition focus:border-gold focus:ring-1 focus:ring-gold disabled:opacity-50"
              />
              <button
                type="button"
                disabled={isLoading}
                onClick={handleGenerate}
                className="group inline-flex items-center justify-center gap-2 rounded-full bg-gold px-8 py-3.5 font-heading text-sm font-bold tracking-widest text-navy uppercase transition-all hover:bg-gold/90 hover:shadow-lg hover:shadow-gold/30 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoading ? (
                  <>
                    <Spinner />
                    Generating...
                  </>
                ) : (
                  <>
                    Generate Script
                    <svg
                      className="h-4 w-4 transition-transform group-hover:translate-x-0.5"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth={2}
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" />
                    </svg>
                  </>
                )}
              </button>
            </div>

            {isLoading && (
              <div className="mt-6 text-center">
                <div className="mx-auto h-1 w-full max-w-md overflow-hidden rounded-full bg-gray-800">
                  <div className="h-full animate-pulse rounded-full bg-gold/60" style={{ width: "60%" }} />
                </div>
                <p className="mt-3 text-sm text-gray-400">
                  Adapting story into cinematic script...
                </p>
              </div>
            )}

            {status === "error" && (
              <div className="mt-6 rounded-xl border border-red-500/20 bg-red-500/5 p-4 text-center text-sm text-red-400">
                {error}
              </div>
            )}
          </div>

          {status === "done" && script && (
            <>
              <ScriptDisplay script={script} onAutoMode={handleAutoMode} />
              <StoryboardViewer script={script} />
            </>
          )}
        </>
      )}
    </section>
  );
}

function Spinner() {
  return (
    <svg className="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
    </svg>
  );
}

function ScriptDisplay({ script, onAutoMode }: { script: Script; onAutoMode: () => void }) {
  return (
    <div className="mx-auto mt-12 max-w-4xl">
      <div className="relative overflow-hidden rounded-2xl border border-gold/20 bg-gradient-to-br from-gold/[0.06] to-transparent p-8 sm:p-12">
        <div className="absolute left-0 top-0 h-px w-24 bg-gradient-to-r from-gold/40 to-transparent" />
        <div className="absolute left-0 top-0 h-24 w-px bg-gradient-to-b from-gold/40 to-transparent" />
        <div className="absolute bottom-0 right-0 h-px w-24 bg-gradient-to-l from-gold/40 to-transparent" />
        <div className="absolute bottom-0 right-0 h-24 w-px bg-gradient-to-t from-gold/40 to-transparent" />

        <div className="flex flex-col gap-6 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <span className="font-heading text-xs font-semibold tracking-[0.2em] text-gold uppercase">
              Generated Script
            </span>
            <h3 className="mt-2 font-heading text-3xl font-bold text-white sm:text-4xl">
              {script.title}
            </h3>
          </div>
          <span className="inline-flex shrink-0 items-center gap-1.5 self-start rounded-full border border-gold/30 bg-gold/10 px-4 py-1.5 font-heading text-xs font-semibold tracking-wider text-gold uppercase">
            <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            {script.duration_estimate}
          </span>
        </div>

        <p className="mt-4 max-w-2xl text-lg italic leading-relaxed text-gray-300">
          {script.logline}
        </p>
      </div>

      <div className="mt-8 space-y-6">
        {script.scenes.map((scene) => (
          <div
            key={scene.scene_number}
            className="script-scene-card group rounded-xl border border-gray-800 bg-white/[0.02] p-6 transition-all duration-300 hover:border-gold/20 hover:bg-white/[0.04] sm:p-8"
          >
            <div className="mb-5 flex flex-wrap items-center gap-3">
              <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-gold/15 font-heading text-sm font-bold text-gold">
                {scene.scene_number}
              </span>
              <span className="font-heading text-sm font-semibold tracking-wider text-gold uppercase">
                {scene.location}
              </span>
            </div>

            <div className="mb-5">
              <span className="mb-2 block font-heading text-xs font-semibold tracking-widest text-gray-500 uppercase">
                Visual Description
              </span>
              <p className="text-sm leading-relaxed text-gray-300">
                {scene.visual_description}
              </p>
            </div>

            {scene.dialogue.length > 0 && (
              <div className="mb-5">
                <span className="mb-3 block font-heading text-xs font-semibold tracking-widest text-gray-500 uppercase">
                  Dialogue
                </span>
                <div className="space-y-3 rounded-lg bg-navy/50 p-4">
                  {scene.dialogue.map((d, i) => (
                    <div key={i} className="flex flex-col sm:flex-row sm:gap-3">
                      <span className="shrink-0 font-heading text-xs font-bold tracking-wider text-gold sm:w-36">
                        {d.character}
                      </span>
                      <span className="text-sm italic leading-relaxed text-gray-200">
                        "{d.line}"
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div>
              <span className="mb-2 block font-heading text-xs font-semibold tracking-widest text-gray-500 uppercase">
                Cinematic Notes
              </span>
              <p className="text-xs leading-relaxed text-gray-500">
                {scene.cinematic_notes}
              </p>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-10 text-center">
        <p className="text-sm text-gray-500">
          Prefer the full cinematic experience?{" "}
          <button
            type="button"
            onClick={onAutoMode}
            className="text-gold underline decoration-gold/30 underline-offset-4 transition hover:text-gold/80"
          >
            Watch as a Film
          </button>
        </p>
      </div>
    </div>
  );
}
