import { createFileRoute } from "@tanstack/react-router";
import { WaitlistForm } from "~/components/WaitlistForm";

export const Route = createFileRoute("/")({
  component: Home,
});

function Home() {
  return (
    <div className="min-h-dvh bg-navy text-white font-body">
      {/* ── Hero ── */}
      <Hero />

      {/* ── Features ── */}
      <Features />

      {/* ── Pricing ── */}
      <Pricing />

      {/* ── Waitlist / CTA ── */}
      <Waitlist />

      {/* ── Footer ── */}
      <Footer />
    </div>
  );
}

/* ──────────────── Hero Section ──────────────── */

function Hero() {
  return (
    <section className="flex min-h-dvh flex-col items-center justify-center px-6 text-center">
      {/* Logo */}
      <img
        src="/logo.png"
        alt="Epikos"
        className="mb-10 h-28 w-28 sm:h-36 sm:w-36"
      />

      {/* Headline */}
      <h1 className="font-heading text-4xl font-bold tracking-wide text-gold sm:text-6xl lg:text-7xl">
        Story into Cinema
      </h1>

      {/* Subheadline */}
      <p className="mt-6 max-w-xl text-lg text-gray-300 sm:text-xl">
        AI that transforms any story — from <em>The Odyssey</em> to your
        original idea — into a fully-produced short film.
      </p>

      {/* CTA Button */}
      <a
        href="#waitlist"
        className="mt-10 inline-block rounded-full bg-gold px-8 py-4 font-heading text-sm font-bold tracking-widest text-navy uppercase transition-all hover:bg-gold/80 hover:shadow-lg hover:shadow-gold/30"
      >
        Join the Waitlist
      </a>
    </section>
  );
}

/* ──────────────── Features Section ──────────────── */

const features = [
  {
    title: "Script Adaptation",
    description:
      "AI reads your story and crafts a cinematic screenplay — preserving the soul of the original while shaping it for the screen.",
    icon: (
      <svg
        className="h-10 w-10 text-gold"
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
    description:
      "Every scene rendered as stunning AI-generated visuals — rich environments, expressive characters, and cinematic composition.",
    icon: (
      <svg
        className="h-10 w-10 text-gold"
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
    title: "Voice & Score",
    description:
      "Professional voice acting and an original music score — all AI-generated — bringing emotional depth to every moment.",
    icon: (
      <svg
        className="h-10 w-10 text-gold"
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
    <section className="px-6 py-24 sm:px-12 lg:px-24">
      <h2 className="font-heading text-center text-3xl font-bold text-gold sm:text-4xl">
        How It Works
      </h2>
      <p className="mx-auto mt-4 max-w-lg text-center text-gray-400">
        Three pillars that turn any story into a cinematic experience.
      </p>

      <div className="mx-auto mt-16 grid max-w-6xl gap-10 sm:grid-cols-2 lg:grid-cols-3">
        {features.map((f) => (
          <div
            key={f.title}
            className="rounded-xl border border-gray-800 bg-white/5 p-8 text-center transition hover:border-gold/40 hover:bg-white/[0.07]"
          >
            <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-full bg-gold/10">
              {f.icon}
            </div>
            <h3 className="font-heading text-xl font-semibold text-white">
              {f.title}
            </h3>
            <p className="mt-3 text-sm leading-relaxed text-gray-400">
              {f.description}
            </p>
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
    features: ["1 short film per month", "Up to 3 minutes", "Watermarked output"],
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
    href: "https://buy.stripe.com/4gM14n3hw6Na0ojdap5AQ00",
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
    href: "https://buy.stripe.com/bJebJ119o2wU1sn1rH5AQ01",
  },
];

function Pricing() {
  return (
    <section className="px-6 py-24 sm:px-12 lg:px-24">
      <h2 className="font-heading text-center text-3xl font-bold text-gold sm:text-4xl">
        Plans
      </h2>
      <p className="mx-auto mt-4 max-w-lg text-center text-gray-400">
        Start free, upgrade when you're ready.
      </p>

      <div className="mx-auto mt-16 grid max-w-5xl gap-8 sm:grid-cols-2 lg:grid-cols-3">
        {plans.map((plan) => (
          <div
            key={plan.name}
            className={`relative flex flex-col rounded-xl border p-8 ${
              plan.highlight
                ? "border-gold bg-gold/5 shadow-lg shadow-gold/10"
                : "border-gray-800 bg-white/5"
            }`}
          >
            {plan.highlight && (
              <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-gold px-4 py-1 font-heading text-xs font-bold tracking-widest text-navy uppercase">
                Most Popular
              </span>
            )}

            <h3 className="font-heading text-xl font-semibold text-white">
              {plan.name}
            </h3>
            <div className="mt-4">
              <span className="font-heading text-4xl font-bold text-gold">
                {plan.price}
              </span>
              <span className="text-gray-400">{plan.period}</span>
            </div>
            <p className="mt-1 text-sm font-medium text-gray-300">
              {plan.films}
            </p>
            <p className="text-sm text-gray-400">{plan.quality}</p>

            <ul className="mt-6 flex-1 space-y-3 border-t border-gray-800 pt-6">
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
              className={`mt-8 block rounded-full px-6 py-3 text-center font-heading text-sm font-bold tracking-widest uppercase transition ${
                plan.highlight
                  ? "bg-gold text-navy hover:bg-gold/80"
                  : "border border-gold text-gold hover:bg-gold/10"
              }`}
            >
              Get Started
            </a>
          </div>
        ))}
      </div>
    </section>
  );
}

/* ──────────────── Waitlist Section ──────────────── */

function Waitlist() {
  return (
    <section
      id="waitlist"
      className="px-6 py-24 sm:px-12 lg:px-24"
    >
      <div className="mx-auto max-w-xl rounded-2xl border border-gold/30 bg-gold/5 px-8 py-14 text-center">
        <h2 className="font-heading text-3xl font-bold text-gold sm:text-4xl">
          Get Early Access
        </h2>
        <p className="mt-4 text-gray-400">
          Be first to turn your stories into films.
        </p>

        <WaitlistForm />
      </div>
    </section>
  );
}

/* ──────────────── Footer ──────────────── */

function Footer() {
  return (
    <footer className="border-t border-gray-800 px-6 py-8 text-center text-sm text-gray-500">
      <p>
        &copy; 2026 Epikos. Built with{" "}
        <a
          href="https://cto.new"
          target="_blank"
          rel="noopener noreferrer"
          className="text-gold underline hover:text-gold/80"
        >
          cto.new
        </a>
      </p>
    </footer>
  );
}
