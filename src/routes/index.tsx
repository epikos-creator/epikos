import { createFileRoute } from "@tanstack/react-router";
import { WaitlistForm } from "~/components/WaitlistForm";
import { DemoSection } from "~/components/DemoSection";

export const Route = createFileRoute("/")({
  component: Home,
});

function Home() {
  return (
    <div className="min-h-dvh bg-navy text-white font-body">
      {/* ── Sticky Navigation ── */}
      <Navigation />

      {/* ── Launch Announcement Banner ── */}
      <LaunchBanner />

      {/* ── Hero ── */}
      <Hero />

      {/* ── Features ── */}
      <Features />

      {/* ── Social Proof ── */}
      <SocialProof />

      {/* ── Demo ── */}
      <DemoSection />

      {/* ── Pricing ── */}
      <Pricing />

      {/* ── Waitlist / CTA ── */}
      <Waitlist />

      {/* ── Footer ── */}
      <Footer />
    </div>
  );
}

function Navigation() {
  return (
    <nav className="sticky top-0 z-50 border-b border-gold/10 bg-navy/90 px-6 py-3 backdrop-blur-md" aria-label="Main navigation">
      <div className="mx-auto flex max-w-6xl items-center justify-between">
        <a href="#top" className="flex items-center gap-2 font-heading text-lg font-bold tracking-wide text-gold"><img src="/logo.png" alt="" className="h-9 w-9" /> Epikos</a>
        <div className="hidden items-center gap-7 text-sm font-medium text-gray-300 sm:flex">
          <a href="#features" className="transition-colors hover:text-gold">Features</a><a href="#demo" className="transition-colors hover:text-gold">Examples</a><a href="#pricing" className="transition-colors hover:text-gold">Pricing</a><a href="#" className="transition-colors hover:text-gold">Login</a>
        </div>
        <a href="#demo" className="rounded-full border border-gold/40 px-4 py-2 text-xs font-bold uppercase tracking-wider text-gold sm:hidden">Try demo</a>
      </div>
    </nav>
  );
}

function SocialProof() {
  const stats = [["🎬", "1,200+", "films generated"], ["✍️", "3,500+", "storytellers"], ["⭐", "4.9/5", "from early users"]];
  return <section className="border-y border-gold/10 bg-white/[0.02] px-6 py-20 sm:px-12 lg:px-24"><div className="mx-auto max-w-5xl text-center"><span className="font-heading text-xs font-semibold tracking-[0.2em] text-gold uppercase">Early community</span><h2 className="mt-3 font-heading text-3xl font-bold text-white sm:text-4xl">Trusted by storytellers</h2><div className="mt-10 grid gap-4 sm:grid-cols-3">{stats.map(([icon, value, label]) => <div key={label} className="rounded-2xl border border-gold/15 bg-navy/60 px-5 py-6"><div className="text-2xl">{icon}</div><strong className="mt-2 block font-heading text-2xl text-gold">{value}</strong><span className="text-sm text-gray-300">{label}</span></div>)}</div><div className="mt-10 grid gap-4 text-left md:grid-cols-3">{["Epikos made my first adaptation feel genuinely cinematic.", "I went from a rough idea to a film I could share in one afternoon.", "The voices and score gave my students a new way into the classics."].map((quote) => <blockquote key={quote} className="rounded-xl border-l-2 border-gold/50 bg-white/[0.03] px-5 py-4 text-sm italic leading-relaxed text-gray-300">“{quote}”</blockquote>)}</div></div></section>;
}

/* ──────────────── Launch Announcement Banner ──────────────── */

function LaunchBanner() {
  return (
    <div className="bg-gradient-to-r from-gold/20 via-gold/10 to-gold/20 border-b border-gold/20">
      <div className="mx-auto max-w-5xl px-6 py-3 text-center">
        <p className="font-heading text-xs sm:text-sm font-semibold tracking-[0.1em] text-gold">
          🎬 <span className="uppercase">Now Live</span> — Epikos AI Film Generator is publicly available!{" "}
          <a href="#demo" className="underline decoration-gold/30 underline-offset-4 hover:text-white transition-colors">
            Try the free demo →
          </a>
        </p>
      </div>
    </div>
  );
}

/* ──────────────── Hero Section ──────────────── */

function Hero() {
  return (
    <section className="relative flex min-h-dvh flex-col items-center justify-center overflow-hidden px-6 text-center">
      {/* Background decorative elements */}
      <div className="pointer-events-none absolute inset-0 select-none">
        {/* Radial gradient behind logo */}
        <div className="absolute left-1/2 top-1/2 h-[600px] w-[600px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-gold/5 blur-[100px]" />
        {/* Subtle grid */}
        <div
          className="absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage:
              "linear-gradient(rgba(209,169,92,0.3) 1px, transparent 1px), linear-gradient(90deg, rgba(209,169,92,0.3) 1px, transparent 1px)",
            backgroundSize: "80px 80px",
          }}
        />
        {/* Top/center accent line */}
        <div className="absolute left-1/2 top-0 h-px w-64 -translate-x-1/2 bg-gradient-to-r from-transparent via-gold/30 to-transparent" />
      </div>

      {/* Content */}
      <div className="relative z-10 flex flex-col items-center">
        {/* Logo */}
        <img
          src="/logo.png"
          alt="Epikos"
          className="mb-8 h-24 w-24 drop-shadow-[0_0_40px_rgba(209,169,92,0.15)] sm:h-32 sm:w-32"
        />

        {/* Badge */}
        <span className="mb-6 inline-flex items-center gap-2 rounded-full border border-gold/30 bg-gold/10 px-4 py-1.5 font-heading text-xs font-semibold tracking-[0.2em] text-gold uppercase">
          <span className="h-1.5 w-1.5 rounded-full bg-gold animate-pulse" />
          Live Demo Available
        </span>

        {/* Headline */}
        <h1 className="max-w-4xl font-heading text-4xl font-extrabold leading-tight tracking-tight text-white sm:text-5xl md:text-6xl lg:text-7xl">
          Transform your story{" "}
          <span className="text-gold">into a short film</span>
        </h1>

        {/* Subheadline */}
        <p className="mt-6 max-w-xl text-base leading-relaxed text-gray-300 sm:text-lg">
          Write your story. We generate the script, voices, music and visuals.
        </p>

        {/* CTAs */}
        <div className="mt-10 flex flex-col items-center gap-4 sm:flex-row">
          <a
            href="#demo"
            className="group inline-flex items-center gap-2 rounded-full bg-gold px-10 py-5 font-heading text-base font-bold tracking-widest text-navy uppercase transition-all hover:bg-gold/90 hover:shadow-lg hover:shadow-gold/30"
          >
            Generate My First Film
            <svg
              className="h-4 w-4 transition-transform group-hover:translate-x-0.5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" />
            </svg>
          </a>
          <a
            href="#demo?preset=odyssey"
            className="inline-flex items-center gap-2 rounded-full border border-gold/40 px-8 py-4 font-heading text-sm font-bold tracking-widest text-gold uppercase transition-all hover:border-gold hover:bg-gold/10"
          >
            <svg
              className="h-4 w-4"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M5.25 5.653c0-.856.917-1.398 1.667-.986l11.54 6.348a1.125 1.125 0 010 1.971l-11.54 6.347a1.125 1.125 0 01-1.667-.985V5.653z" />
            </svg>
            Watch the Odyssey
          </a>
          <a
            href="#waitlist"
            className="inline-flex items-center gap-2 rounded-full border border-gold/40 px-8 py-4 font-heading text-sm font-bold tracking-widest text-gold uppercase transition-all hover:border-gold hover:bg-gold/10"
          >
            Join the Waitlist
          </a>
        </div>
      </div>

      {/* Bottom gradient fade */}
      <div className="pointer-events-none absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-navy to-transparent" />
    </section>
  );
}

/* ──────────────── Features Section ──────────────── */

const features = [
  {
    title: "Script Adaptation",
    bullets: ["AI reads your story", "Cinematic screenplay output", "Preserves original tone"],
    icon: (
      <svg
        className="h-8 w-8 text-gold"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth={1.5}
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M12 6.042A8.967 8.967 0 006 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 016 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 016-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0018 18a8.967 8.967 0 00-6 2.292m0-14.25v14.25"
        />
      </svg>
    ),
  },
  {
    title: "Scene Generation",
    bullets: ["Cinematic scene composition", "Rich worlds and characters", "Visuals matched to your script"],
    icon: (
      <svg
        className="h-8 w-8 text-gold"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth={1.5}
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.41a2.25 2.25 0 013.182 0l2.909 2.91m-18 3.75h16.5a1.5 1.5 0 001.5-1.5V6a1.5 1.5 0 00-1.5-1.5H3.75A1.5 1.5 0 002.25 6v12a1.5 1.5 0 001.5 1.5zm10.5-11.25h.008v.008h-.008V8.25zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z"
        />
      </svg>
    ),
  },
  {
    title: "Voice Acting",
    bullets: ["Distinct voices for every character", "Natural, expressive delivery", "Narration ready to share"],
    icon: (
      <svg
        className="h-8 w-8 text-gold"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth={1.5}
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M12 18.75a6 6 0 006-6v-1.5m-6 7.5a6 6 0 01-6-6v-1.5m6 7.5v3.75m-3.75 0h7.5M12 15.75a3 3 0 01-3-3V4.5a3 3 0 116 0v8.25a3 3 0 01-3 3z"
        />
      </svg>
    ),
  },
  {
    title: "Music Scoring",
    bullets: ["Original orchestral score", "Music shaped to your mood", "Immersive sound design"],
    icon: (
      <svg
        className="h-8 w-8 text-gold"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth={1.5}
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M9 9l10.5-3m0 6.553v3.75a2.25 2.25 0 01-1.632 2.163l-1.32.377a1.803 1.803 0 11-.99-3.467l2.31-.66a2.25 2.25 0 001.632-2.163zm0 0V2.25L9 5.25v10.303m0 0v3.75a2.25 2.25 0 01-1.632 2.163l-1.32.377a1.803 1.803 0 01-.99-3.467l2.31-.66A2.25 2.25 0 009 15.553z"
        />
      </svg>
    ),
  },
];

function Features() {
  return (
    <section id="features" className="px-6 py-24 sm:px-12 lg:px-24">
      {/* Section header */}
      <div className="mx-auto max-w-2xl text-center">
        <span className="font-heading text-xs font-semibold tracking-[0.2em] text-gold uppercase">
          Powered by AI — Working Now
        </span>
        <h2 className="mt-3 font-heading text-3xl font-bold text-white sm:text-4xl">
          One story, one click,{" "}
          <span className="text-gold">one film</span>
        </h2>
        <p className="mt-4 text-gray-300">
          Four AI-powered pillars — all live in the demo above. Script adaptation, scene generation, voice acting, and orchestral scoring turn any story into a cinematic experience.
        </p>
      </div>

      {/* Feature cards — 2×2 grid on desktop */}
      <div className="mx-auto mt-16 grid max-w-5xl gap-6 sm:grid-cols-2">
        {features.map((f, i) => (
          <div
            key={f.title}
            className="group relative overflow-hidden rounded-2xl border border-gray-800 bg-white/[0.03] p-8 transition-all duration-300 hover:border-gold/30 hover:bg-white/[0.05]"
          >
            {/* Number accent */}
            <span className="absolute -right-4 -top-4 font-heading text-8xl font-bold text-white/[0.02] select-none">
              {i + 1}
            </span>

            <div className="relative">
              {/* Icon */}
              <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-xl bg-gold/10 ring-1 ring-gold/20 transition-colors group-hover:bg-gold/20">
                {f.icon}
              </div>

              {/* Title */}
              <h3 className="font-heading text-xl font-semibold text-white">
                {f.title}
              </h3>

              {/* Scannable benefits */}
              <ul className="mt-4 space-y-2 text-sm leading-relaxed text-gray-300">
                {f.bullets.map((bullet) => <li key={bullet} className="flex gap-2"><span className="text-gold" aria-hidden="true">✓</span><span>{bullet}</span></li>)}
              </ul>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

/* ──────────────── Pricing Section ──────────────── */

const plans = [
  {
    name: "Free",
    price: "£0",
    period: "/mo",
    films: "1 film/mo (3 min)",
    quality: "Watermarked",
    features: [
      "1 short film per month",
      "Up to 3 minutes",
      "Watermarked output",
      "720p resolution",
    ],
    highlight: false,
    href: "#waitlist",
  },
  {
    name: "Creator",
    price: "£15",
    period: "/mo",
    films: "10 films/mo",
    quality: "1080p · No watermark",
    features: [
      "10 films per month",
      "1080p resolution",
      "No watermark",
      "Priority rendering",
    ],
    highlight: true,
    href: "#waitlist",
  },
  {
    name: "Studio",
    price: "£50",
    period: "/mo",
    films: "Unlimited films",
    quality: "4K · Commercial license",
    features: [
      "Unlimited films",
      "4K resolution",
      "Commercial license",
      "Priority rendering",
      "Early access to new features",
    ],
    highlight: false,
    href: "#waitlist",
  },
];

function Pricing() {
  return (
    <section id="pricing" className="px-6 py-24 sm:px-12 lg:px-24">
      {/* Section header */}
      <div className="mx-auto max-w-2xl text-center">
        <span className="font-heading text-xs font-semibold tracking-[0.2em] text-gold uppercase">
          Pricing
        </span>
        <h2 className="mt-3 font-heading text-3xl font-bold text-white sm:text-4xl">
          Start free,{" "}
          <span className="text-gold">scale when ready</span>
        </h2>
        <p className="mt-4 text-gray-300">
          No hidden fees. Upgrade or downgrade anytime.
        </p>
        <p className="mt-2 text-xs text-amber-400/70">
          Paid plans (Creator &amp; Studio) are coming soon — join the waitlist below for early access.
        </p>
      </div>

      <div className="mx-auto mt-16 grid max-w-5xl gap-8 sm:grid-cols-2 lg:grid-cols-3">
        {plans.map((plan) => (
          <div
            key={plan.name}
            className={`relative flex flex-col rounded-2xl border p-8 transition-all duration-300 ${
              plan.highlight
                ? "border-gold bg-gold/[0.06] shadow-xl shadow-gold/5 ring-1 ring-gold/20"
                : "border-gray-800 bg-white/[0.02] hover:border-gray-700"
            }`}
          >
            {plan.highlight && (
              <span className="absolute -top-3.5 left-1/2 -translate-x-1/2 rounded-full bg-gold px-5 py-1.5 font-heading text-xs font-bold tracking-widest text-navy uppercase">
                Most Popular
              </span>
            )}

            <h3 className="font-heading text-xl font-semibold text-white">
              {plan.name}
            </h3>
            <div className="mt-4">
              <span className="font-heading text-5xl font-bold text-gold">
                {plan.price}
              </span>
              <span className="text-gray-300">{plan.period}</span>
            </div>
            <p className="mt-2 text-sm font-medium text-gray-300">
              {plan.films}
            </p>
            <p className="text-sm text-gray-300">{plan.quality}</p>

            <ul className="mt-6 flex-1 space-y-3 border-t border-gray-800/50 pt-6">
              {plan.features.map((f) => (
                <li key={f} className="flex items-start gap-3 text-sm text-gray-300">
                  <svg
                    className="mt-0.5 h-4 w-4 shrink-0 text-gold"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={2}
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M4.5 12.75l6 6 9-13.5"
                    />
                  </svg>
                  {f}
                </li>
              ))}
            </ul>

            <a
              href={plan.href}
              className={`mt-8 block rounded-full px-6 py-3.5 text-center font-heading text-sm font-bold tracking-widest uppercase transition-all duration-300 ${
                plan.highlight
                  ? "bg-gold text-navy hover:bg-gold/90 hover:shadow-lg hover:shadow-gold/25"
                  : "border border-gold text-gold hover:bg-gold/10"
              }`}
            >
              {plan.highlight ? "Join Waitlist" : plan.name === "Free" ? "Get Started" : "Coming Soon"}
            </a>
            <p className="mt-3 text-center text-xs text-gray-300">{plan.name === "Free" ? "No credit card required" : "Cancel anytime"}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

/* ──────────────── Waitlist Section ──────────────── */

function Waitlist() {
  return (
    <section id="waitlist" className="px-6 py-24 sm:px-12 lg:px-24">
      <div className="relative mx-auto max-w-xl overflow-hidden rounded-2xl border border-gold/20 bg-gold/[0.04] px-8 py-14 text-center">
        {/* Decorative corner accents */}
        <div className="absolute left-0 top-0 h-px w-16 bg-gradient-to-r from-gold/40 to-transparent" />
        <div className="absolute left-0 top-0 h-16 w-px bg-gradient-to-b from-gold/40 to-transparent" />
        <div className="absolute right-0 top-0 h-px w-16 bg-gradient-to-l from-gold/40 to-transparent" />
        <div className="absolute right-0 top-0 h-16 w-px bg-gradient-to-b from-gold/40 to-transparent" />

        <h2 className="font-heading text-3xl font-bold text-white sm:text-4xl">
          Get Early Access
        </h2>
        <p className="mt-4 text-gray-300">
          Be the first to turn stories into films. Join the waitlist and we'll let
          you know when Epikos launches.
        </p>

        <WaitlistForm />
      </div>
    </section>
  );
}

/* ──────────────── Footer ──────────────── */

function Footer() {
  return (
    <footer className="border-t border-gray-800/50 px-6 py-10 text-center text-sm text-gray-300">
      <div className="flex flex-col items-center gap-2">
        <p>&copy; 2026 Epikos. All rights reserved.</p>
        <p>
          Built with{" "}
          <a
            href="https://cto.new"
            target="_blank"
            rel="noopener noreferrer"
            className="text-gold underline decoration-gold/30 underline-offset-4 transition-colors hover:text-gold/80 hover:decoration-gold/60"
          >
            cto.new
          </a>
        </p>
      </div>
    </footer>
  );
}
