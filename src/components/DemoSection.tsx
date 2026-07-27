"use client";

import { useState } from "react";
import { generateScript } from "~/routes/api/generate-script";
import type { Script } from "~/routes/api/generate-script";
import { StoryboardViewer } from "~/components/StoryboardViewer";

export function DemoSection() {
  const [prompt, setPrompt] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "done" | "error">("idle");
  const [script, setScript] = useState<Script | null>(null);
  const [error, setError] = useState("");

  const handleGenerate = async () => {
    setStatus("loading");
    setError("");
    setScript(null);

    try {
      const result = await generateScript({ data: { prompt } });
      setScript(result);
      setStatus("done");
    } catch (err: any) {
      setError(err?.message || "Something went wrong. Try again.");
      setStatus("error");
    }
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
          Click below to generate a cinematic script from{" "}
          <em className="text-gold not-italic">The Odyssey</em> — Odysseus versus the
          Cyclops, adapted by AI into a full film breakdown. Or type your own story
          idea.
        </p>
      </div>

      {/* Input + Button */}
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
                Generate The Odyssey Demo
                <svg
                  className="h-4 w-4 transition-transform group-hover:translate-x-0.5"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M13 7l5 5m0 0l-5 5m5-5H6"
                  />
                </svg>
              </>
            )}
          </button>
        </div>

        {/* Loading Progress */}
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

        {/* Error state */}
        {status === "error" && (
          <div className="mt-6 rounded-xl border border-red-500/20 bg-red-500/5 p-4 text-center text-sm text-red-400">
            {error}
          </div>
        )}
      </div>

      {/* Script output */}
      {status === "done" && script && (
        <>
          <ScriptDisplay script={script} />
          <StoryboardViewer script={script} />
        </>
      )}
    </section>
  );
}

/* ── Spinner ── */

function Spinner() {
  return (
    <svg
      className="h-4 w-4 animate-spin"
      fill="none"
      viewBox="0 0 24 24"
    >
      <circle
        className="opacity-25"
        cx="12"
        cy="12"
        r="10"
        stroke="currentColor"
        strokeWidth="4"
      />
      <path
        className="opacity-75"
        fill="currentColor"
        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
      />
    </svg>
  );
}

/* ── Script Display ── */

function ScriptDisplay({ script }: { script: Script }) {
  return (
    <div className="mx-auto mt-12 max-w-4xl">
      {/* Title card */}
      <div className="relative overflow-hidden rounded-2xl border border-gold/20 bg-gradient-to-br from-gold/[0.06] to-transparent p-8 sm:p-12">
        {/* Decorative accents */}
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

      {/* Scenes */}
      <div className="mt-8 space-y-6">
        {script.scenes.map((scene) => (
          <div
            key={scene.scene_number}
            className="script-scene-card group rounded-xl border border-gray-800 bg-white/[0.02] p-6 transition-all duration-300 hover:border-gold/20 hover:bg-white/[0.04] sm:p-8"
          >
            {/* Scene header */}
            <div className="mb-5 flex flex-wrap items-center gap-3">
              <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-gold/15 font-heading text-sm font-bold text-gold">
                {scene.scene_number}
              </span>
              <span className="font-heading text-sm font-semibold tracking-wider text-gold uppercase">
                {scene.location}
              </span>
            </div>

            {/* Visual description */}
            <div className="mb-5">
              <span className="mb-2 block font-heading text-xs font-semibold tracking-widest text-gray-500 uppercase">
                Visual Description
              </span>
              <p className="text-sm leading-relaxed text-gray-300">
                {scene.visual_description}
              </p>
            </div>

            {/* Dialogue */}
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

            {/* Cinematic notes */}
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

      {/* Bottom CTA */}
      <div className="mt-10 text-center">
        <p className="text-sm text-gray-500">
          This is Phase 1 — script adaptation. Future phases will add scene generation,
          voice acting, and music scoring.
        </p>
      </div>
    </div>
  );
}
