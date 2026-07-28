# Epikos 🎬

**AI-powered text-to-film platform — free demo available now.**

Epikos transforms any story — classic epics, novels, scripts, or original ideas — into a fully-produced short film. It handles script adaptation, scene generation, voice acting, and music scoring in one go. Think "text-to-movie."

The flagship demo adapts *The Odyssey*, but the platform is open to all stories.

## 🚀 Launch Status

**Epikos AI Film Generator is live as a free demo.** Generate your first short film for free at [epikos.ctonew.app](https://33464bead194f0fc7151109baa2e9b19.ctonew.app).

### What's Live
- ✅ Automatic film pipeline: script → storyboard → voiceover → music → export
- ✅ AI-generated cinematic scripts with scene-by-scene breakdowns
- ✅ Dynamic emotion-based orchestral scoring (Web Audio API)
- ✅ Multi-character voice acting via browser Speech Synthesis
- ✅ Video export as .webm (canvas-rendered)
- ✅ Film history (localStorage persistence)
- ✅ Shareable film links (same device/browser only)
- ✅ Free tier (1 film/24h)
- ✅ Rate limiting (free tier enforcement)

### What's Coming (Paid Beta)
- ⏳ Stripe subscriptions — Creator £15/mo, Studio £50/mo
- ⏳ Cross-device film sharing (server-side storage)
- ⏳ Higher resolution exports (1080p, 4K)
- ⏳ Commercial license

## Tech Stack

- **Framework:** [TanStack Start](https://tanstack.com/start) (React + Vite + SSR)
- **Styling:** Tailwind CSS
- **Fonts:** Cinzel (headings), Inter (body)
- **Database:** Neon Postgres (for waitlist)
- **Payments:** Stripe (payment links — not yet active; waitlist-only during beta)
- **Audio:** Web Audio API (dynamic orchestral synthesis)
- **Voice:** Browser Speech Synthesis API

## Live Site

[https://33464bead194f0fc7151109baa2e9b19.ctonew.app](https://33464bead194f0fc7151109baa2e9b19.ctonew.app)

## Getting Started

```bash
bun install
bun run dev      # Development server
bun run build    # Production build
bun run publish  # Build + deploy to port 3000
```

## Architecture

```
src/
├── components/     # React components (AutoFilmPipeline, StoryboardViewer, etc.)
├── hooks/          # Custom hooks (useBackgroundMusic, useVideoExport, etc.)
├── routes/         # TanStack Router file-based routes
├── server/         # Server functions (generate-script, generate-voiceover, etc.)
├── styles/         # Tailwind CSS
└── db.ts           # Neon Postgres client
```

## Roadmap

- [ ] Real Stripe webhook integration
- [ ] Server-side film storage for cross-device sharing
- [ ] User accounts & auth
- [ ] Custom story upload
- [ ] AI image generation for scenes
- [ ] Cloud rendering pipeline

---

Built with [cto.new](https://cto.new)
