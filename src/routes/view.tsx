import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import type { Script } from "~/server/generate-script";

export const Route = createFileRoute("/view")({
  component: SharedFilmView,
});

function SharedFilmView() {
  const [film, setFilm] = useState<Script | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const params = new URLSearchParams(window.location.search);
    const hash = params.get("f");
    if (!hash) {
      setError("No film ID provided.");
      setLoading(false);
      return;
    }

    const storageKey = `epikos_shared_${hash.slice(0, 16)}`;
    try {
      const raw = localStorage.getItem(storageKey);
      if (!raw) {
        setError("Film not found. It may have expired or the link is invalid.");
        setLoading(false);
        return;
      }
      const data = JSON.parse(raw);
      setFilm(data);
    } catch {
      setError("Failed to load film data.");
    }
    setLoading(false);
  }, []);

  if (loading) {
    return (
      <div className="min-h-dvh bg-navy text-white flex items-center justify-center">
        <div className="text-center">
          <div className="mx-auto mb-4 h-10 w-10 animate-spin rounded-full border-2 border-gold border-t-transparent" />
          <p className="font-heading text-sm text-gold">Loading shared film...</p>
        </div>
      </div>
    );
  }

  if (error || !film) {
    return (
      <div className="min-h-dvh bg-navy text-white flex items-center justify-center p-6">
        <div className="max-w-md text-center">
          <img src="/logo.png" alt="Epikos" className="mx-auto mb-6 h-16 w-16 opacity-50" />
          <h1 className="font-heading text-2xl font-bold text-white">Film Not Available</h1>
          <p className="mt-3 text-gray-400">{error || "This film could not be loaded."}</p>
          <a
            href="/"
            className="mt-6 inline-block rounded-full bg-gold px-6 py-3 font-heading text-sm font-bold tracking-wider text-navy uppercase"
          >
            Go to Epikos
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-dvh bg-navy text-white font-body">
      {/* Header */}
      <header className="border-b border-gold/10 px-6 py-4">
        <div className="mx-auto flex max-w-5xl items-center justify-between">
          <a href="/" className="flex items-center gap-3">
            <img src="/logo.png" alt="Epikos" className="h-8 w-8" />
            <span className="font-heading text-sm font-bold tracking-[0.15em] text-gold uppercase">Epikos</span>
          </a>
          <span className="font-mono text-[10px] text-gray-500">Shared Film</span>
        </div>
      </header>

      {/* Film Content */}
      <main className="mx-auto max-w-4xl px-6 py-12">
        {/* Title Card */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-2 mb-4 rounded-full border border-gold/20 bg-gold/10 px-4 py-1.5">
            <img src="/logo.png" alt="" className="h-4 w-4" />
            <span className="font-heading text-[10px] font-semibold tracking-[0.15em] text-gold uppercase">
              Epikos Presents
            </span>
          </div>
          <h1 className="font-heading text-4xl font-bold text-white sm:text-5xl">
            {film.title}
          </h1>
          <p className="mt-4 max-w-xl mx-auto text-lg italic text-gray-300 leading-relaxed">
            {film.logline}
          </p>
          <p className="mt-3 font-mono text-sm text-gold/60">
            {film.scenes.length} scenes · {film.duration_estimate}
          </p>
        </div>

        {/* Scenes */}
        <div className="space-y-8">
          {film.scenes.map((scene) => (
            <div
              key={scene.scene_number}
              className="overflow-hidden rounded-2xl border border-gray-800 bg-white/[0.02]"
            >
              {/* Scene image */}
              <div className="relative aspect-video w-full bg-navy/50">
                <img
                  src={`/images/odyssey-${((scene.scene_number - 1) % 6) + 1}.png`}
                  alt={`Scene ${scene.scene_number}`}
                  className="h-full w-full object-cover"
                  onError={(e) => {
                    (e.target as HTMLImageElement).style.display = "none";
                  }}
                />
                <div className="absolute inset-0 bg-gradient-to-t from-navy/80 via-transparent to-transparent" />
                {/* Scene number badge */}
                <div className="absolute left-4 top-4 flex h-10 w-10 items-center justify-center rounded-lg bg-gold/20 ring-1 ring-gold/30">
                  <span className="font-heading text-sm font-bold text-gold">
                    {scene.scene_number}
                  </span>
                </div>
                {/* Location */}
                <div className="absolute left-4 bottom-4">
                  <span className="font-heading text-xs font-semibold tracking-wider text-gold uppercase">
                    {scene.location}
                  </span>
                </div>
              </div>

              <div className="p-6">
                <p className="text-sm leading-relaxed text-gray-300">
                  {scene.visual_description}
                </p>

                {scene.dialogue.length > 0 && (
                  <div className="mt-5 space-y-3 rounded-lg bg-navy/50 p-4">
                    {scene.dialogue.map((d, i) => (
                      <div key={i} className="flex flex-col sm:flex-row sm:gap-3">
                        <span className="shrink-0 font-heading text-xs font-bold tracking-wider text-gold sm:w-36">
                          {d.character}
                        </span>
                        <span className="text-sm italic text-gray-200">
                          &ldquo;{d.line}&rdquo;
                        </span>
                      </div>
                    ))}
                  </div>
                )}

                <p className="mt-4 text-xs text-gray-500">
                  {scene.cinematic_notes}
                </p>
              </div>
            </div>
          ))}
        </div>

        {/* End credits */}
        <div className="mt-16 text-center">
          <div className="mx-auto mb-6 h-px w-32 bg-gradient-to-r from-transparent via-gold/30 to-transparent" />
          <p className="font-heading text-lg font-bold text-gold">Fin</p>
          <p className="mt-2 text-sm text-gray-500">Created with Epikos — AI-powered filmmaking</p>
          <a
            href="/"
            className="mt-6 inline-flex items-center gap-2 rounded-full bg-gold px-6 py-3 font-heading text-sm font-bold tracking-wider text-navy uppercase transition hover:bg-gold/90"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
            </svg>
            Create Your Own
          </a>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-gray-800/50 px-6 py-8 text-center text-sm text-gray-500">
        <p>&copy; 2026 Epikos. All rights reserved.</p>
      </footer>
    </div>
  );
}
