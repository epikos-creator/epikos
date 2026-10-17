// Server-side Stripe plumbing: webhook handler + subscription persistence.
//
// This module is intentionally framework-agnostic: it is a plain server module
// (no React, no createServerFn) that is wired into the app's request entry
// points (serve.ts and vercel-entry.ts) at POST /api/stripe-webhook.
//
// Why an entry-point route rather than a TanStack API route file? This version
// of TanStack Start (1.168.x) ships no createAPIFileRoute / raw-route support,
// and server functions consume the JSON request body before their handler runs —
// so a webhook that must verify a Stripe signature over the EXACT raw bytes
// cannot be implemented as a createServerFn. Intercepting the path at the entry
// point is the only way to read `request.text()` verbatim.
//
// Graceful degradation: no env vars are required to build or serve. With
// STRIPE_WEBHOOK_SECRET unset the endpoint answers 503 and logs a warning;
// with DATABASE_URL unset every DB write is a logged no-op. Nothing here
// crashes at startup.
import Stripe from "stripe";
import { sql } from "../db";

export const STRIPE_WEBHOOK_PATH = "/api/stripe-webhook";

/**
 * Map Stripe price IDs to app tiers.
 *
 * ── PLACEHOLDER ──────────────────────────────────────────────────────────────
 * No real Stripe price IDs exist yet — the Stripe account is not connected.
 * Real price IDs look like `price_1Qx...`; DO NOT invent them. When the account
 * is connected, either:
 *   1. set STRIPE_PRICE_CREATOR / STRIPE_PRICE_STUDIO env vars to the real
 *      Creator/Studio price IDs, or
 *   2. replace the placeholder keys below with the real IDs.
 * Unmapped prices are stored with plan = NULL and skipped for tier gating.
 * ─────────────────────────────────────────────────────────────────────────────
 */
const DEFAULT_PRICE_TO_TIER: Record<string, "creator" | "studio"> = {
  // price_creator_monthly: "creator", // ← real Creator price id goes here
  // price_studio_monthly: "studio", //   ← real Studio price id goes here
};

function priceIdToTier(priceId: string | null | undefined): "creator" | "studio" | null {
  if (!priceId) return null;
  if (priceId === process.env.STRIPE_PRICE_CREATOR) return "creator";
  if (priceId === process.env.STRIPE_PRICE_STUDIO) return "studio";
  return DEFAULT_PRICE_TO_TIER[priceId] ?? null;
}

// ── subscriptions table (idempotent, mirrors free_tier_usage style) ──────────

export async function ensureSubscriptionsTable(): Promise<void> {
  await sql()`CREATE TABLE IF NOT EXISTS subscriptions (
    id SERIAL PRIMARY KEY,
    stripe_customer_id TEXT,
    stripe_subscription_id TEXT UNIQUE,
    plan TEXT,
    status TEXT,
    current_period_end TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
  )`;
}

export interface SubscriptionRow {
  id: number;
  stripe_customer_id: string | null;
  stripe_subscription_id: string | null;
  plan: string | null;
  status: string | null;
  current_period_end: string | null;
}

/**
 * Upsert a subscription row. Graceful when DATABASE_URL is unset: logs and
 * returns without writing (the webhook still answers 200 so Stripe does not
 * retry forever).
 */
export async function upsertSubscription(input: {
  stripeCustomerId: string;
  stripeSubscriptionId: string;
  plan: string | null;
  status: string | null;
  currentPeriodEnd: string | null; // ISO string, or null
}): Promise<void> {
  if (!process.env.DATABASE_URL) {
    console.warn(
      "[stripe] DATABASE_URL not set — skipping subscription upsert",
    );
    return;
  }
  await ensureSubscriptionsTable();
  await sql()`INSERT INTO subscriptions
      (stripe_customer_id, stripe_subscription_id, plan, status, current_period_end)
    VALUES (${input.stripeCustomerId}, ${input.stripeSubscriptionId}, ${input.plan}, ${input.status}, ${input.currentPeriodEnd})
    ON CONFLICT (stripe_subscription_id)
    DO UPDATE SET
      stripe_customer_id = EXCLUDED.stripe_customer_id,
      plan = COALESCE(EXCLUDED.plan, subscriptions.plan),
      status = EXCLUDED.status,
      current_period_end = EXCLUDED.current_period_end,
      updated_at = NOW()`;
}

/**
 * Read a customer's current subscription row (most recent first).
 * Returns null when DATABASE_URL is unset or nothing is stored.
 */
export async function getSubscriptionForCustomer(
  stripeCustomerId: string,
): Promise<SubscriptionRow | null> {
  if (!process.env.DATABASE_URL) {
    console.warn(
      "[stripe] DATABASE_URL not set — returning no subscription state",
    );
    return null;
  }
  await ensureSubscriptionsTable();
  const rows =
    await sql()`SELECT id, stripe_customer_id, stripe_subscription_id, plan, status,
        current_period_end
      FROM subscriptions
      WHERE stripe_customer_id = ${stripeCustomerId}
      ORDER BY updated_at DESC
      LIMIT 1`;
  if (rows.length === 0) return null;
  const r = rows[0] as Record<string, unknown>;
  return {
    id: Number(r.id),
    stripe_customer_id: (r.stripe_customer_id as string | null) ?? null,
    stripe_subscription_id: (r.stripe_subscription_id as string | null) ?? null,
    plan: (r.plan as string | null) ?? null,
    status: (r.status as string | null) ?? null,
    current_period_end: r.current_period_end
      ? String(r.current_period_end)
      : null,
  };
}

/**
 * Mark a subscription cancelled (soft delete — keeps history).
 */
export async function cancelSubscription(
  stripeSubscriptionId: string,
): Promise<void> {
  if (!process.env.DATABASE_URL) {
    console.warn(
      "[stripe] DATABASE_URL not set — skipping subscription cancellation",
    );
    return;
  }
  await ensureSubscriptionsTable();
  await sql()`UPDATE subscriptions
    SET status = 'canceled', updated_at = NOW()
    WHERE stripe_subscription_id = ${stripeSubscriptionId}`;
}

// ── webhook handler ──────────────────────────────────────────────────────────

function jsonError(status: number, publicMessage: string): Response {
  return new Response(JSON.stringify({ error: publicMessage }), {
    status,
    headers: { "content-type": "application/json" },
  });
}

function ok(payload: Record<string, unknown>): Response {
  return new Response(JSON.stringify(payload), {
    status: 200,
    headers: { "content-type": "application/json" },
  });
}

function normalizeCustomer(
  customer: string | Stripe.Customer | Stripe.DeletedCustomer | null,
): string | null {
  if (typeof customer === "string") return customer;
  return customer?.id ?? null;
}

function subscriptionPlan(
  subscription: Stripe.Subscription,
): string | null {
  const priceId = subscription.items?.data?.[0]?.price?.id ?? null;
  return priceIdToTier(priceId);
}

/**
 * Period end lives on the subscription item in current Stripe API versions
 * (stripe SDK ^22 types removed it from Subscription itself).
 */
function subscriptionPeriodEnd(
  subscription: Stripe.Subscription,
): number | null {
  return subscription.items?.data?.[0]?.current_period_end ?? null;
}

function unixToIso(unixSeconds: number | null | undefined): string | null {
  if (unixSeconds === null || unixSeconds === undefined) return null;
  return new Date(unixSeconds * 1000).toISOString();
}

/**
 * Handle a POST to /api/stripe-webhook.
 *
 * - STRIPE_WEBHOOK_SECRET unset  → 503 (log warning; no internals leaked)
 * - bad/missing signature        → 400
 * - unhandled event type         → 200 (received; ignored)
 * - DB unavailable               → 200 with processed:false (logged)
 */
export async function handleStripeWebhook(request: Request): Promise<Response> {
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!webhookSecret) {
    console.warn(
      "[stripe-webhook] STRIPE_WEBHOOK_SECRET is not set — webhook processing is disabled. " +
        "Set STRIPE_WEBHOOK_SECRET (and STRIPE_SECRET_KEY) to enable it.",
    );
    return jsonError(503, "Webhook processing is not configured");
  }

  const signature = request.headers.get("stripe-signature");
  if (!signature) {
    console.warn("[stripe-webhook] rejected request with no Stripe-Signature header");
    return jsonError(400, "Bad request");
  }

  // Raw bytes — MUST be the exact request body for signature verification.
  const rawBody = await request.text();
  if (!rawBody) {
    console.warn("[stripe-webhook] rejected empty body");
    return jsonError(400, "Bad request");
  }

  let event: Stripe.Event;
  try {
    // constructEvent only needs an instance; the API key is unused for
    // signature verification but kept wired for future Stripe API calls.
    const stripe = new Stripe(
      process.env.STRIPE_SECRET_KEY ?? "sk_no_key_needed_for_verification",
    );
    event = stripe.webhooks.constructEvent(rawBody, signature, webhookSecret);
  } catch (error) {
    // Log details server-side; never echo them to the caller.
    console.error("[stripe-webhook] signature verification failed:", error);
    return jsonError(400, "Invalid signature");
  }

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        const subscriptionId = (session.subscription as string | null) ?? null;
        if (!subscriptionId) {
          // One-off payment (no subscription): nothing to record.
          break;
        }
        const customerId = normalizeCustomer(session.customer);
        // The session payload carries no period/price details; the following
        // customer.subscription.updated event fills those in authoritatively.
        const metadataPlan = session.metadata?.plan;
        const plan =
          metadataPlan === "creator" || metadataPlan === "studio" ? metadataPlan : null;
        await upsertSubscription({
          stripeCustomerId: customerId ?? "",
          stripeSubscriptionId: subscriptionId,
          plan,
          status: "active",
          currentPeriodEnd: null,
        });
        break;
      }
      case "customer.subscription.updated": {
        const subscription = event.data.object as Stripe.Subscription;
        const customerId = normalizeCustomer(subscription.customer);
        await upsertSubscription({
          stripeCustomerId: customerId ?? "",
          stripeSubscriptionId: subscription.id,
          plan: subscriptionPlan(subscription),
          status: subscription.status,
          currentPeriodEnd: unixToIso(subscriptionPeriodEnd(subscription)),
        });
        break;
      }
      case "customer.subscription.deleted": {
        const subscription = event.data.object as Stripe.Subscription;
        // Keep the row for history; mark cancelled, drop entitlement.
        await cancelSubscription(subscription.id);
        const customerId = normalizeCustomer(subscription.customer);
        await upsertSubscription({
          stripeCustomerId: customerId ?? "",
          stripeSubscriptionId: subscription.id,
          plan: subscriptionPlan(subscription),
          status: "canceled",
          currentPeriodEnd: unixToIso(subscriptionPeriodEnd(subscription)),
        });
        break;
      }
      default:
        // Unknown/unhandled event types: acknowledge so Stripe stops retrying.
        break;
    }
    return ok({ received: true });
  } catch (error) {
    // DB or processing failure: acknowledge (prevents infinite Stripe retries)
    // and log server-side. A follow-up subscription.updated event will retry
    // the state anyway.
    console.error("[stripe-webhook] event processing failed:", error);
    return ok({ received: true, processed: false });
  }
}