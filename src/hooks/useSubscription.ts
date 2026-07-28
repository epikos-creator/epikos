"use client";

import { useState, useEffect, useCallback } from "react";

const STORAGE_KEY = "epikos_subscription";
const CHECKOUT_KEY = "epikos_checkout_session";

export type PlanTier = "free" | "creator" | "studio";

export interface SubscriptionState {
  plan: PlanTier;
  status: "active" | "inactive" | "trialing" | "past_due";
  expiresAt?: string;
  customerId?: string;
  subscriptionId?: string;
  currentPeriodEnd?: string;
  activatedAt?: string;
}

export interface CheckoutSession {
  id: string;
  plan: PlanTier;
  status: "pending" | "completed" | "expired";
  createdAt: string;
  expiresAt: string;
}

/**
 * HOTFIX: Subscriptions are currently disabled.
 *
 * The Stripe payment links were published before server-side webhook
 * verification was built. To avoid taking payments we cannot fulfill,
 * all subscription activation paths are disabled and the app always
 * operates in free-tier mode.
 *
 * TODO (next sprint): Build real Stripe webhook handler + server-side
 * subscription verification, then re-enable paid tier paths.
 */

/** ── helpers (kept for future re-enablement) ── */

function genId(prefix: string): string {
  return `${prefix}_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;
}

export function createCheckoutSession(plan: PlanTier): CheckoutSession {
  const session: CheckoutSession = {
    id: genId("cs"),
    plan,
    status: "pending",
    createdAt: new Date().toISOString(),
    expiresAt: new Date(Date.now() + 30 * 60 * 1000).toISOString(),
  };
  if (typeof window !== "undefined") {
    localStorage.setItem(CHECKOUT_KEY, JSON.stringify(session));
  }
  return session;
}

export function getCheckoutSession(): CheckoutSession | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(CHECKOUT_KEY);
    if (!raw) return null;
    const session = JSON.parse(raw) as CheckoutSession;
    if (new Date(session.expiresAt) < new Date()) {
      localStorage.removeItem(CHECKOUT_KEY);
      return null;
    }
    return session;
  } catch {
    return null;
  }
}

export function activateFromCheckout(): SubscriptionState | null {
  // DISABLED — no-op for launch integrity
  return null;
}

export function getStoredSubscription(): SubscriptionState | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const sub = JSON.parse(raw) as SubscriptionState;
    if (sub.currentPeriodEnd && new Date(sub.currentPeriodEnd) < new Date()) {
      sub.status = "past_due";
      localStorage.setItem(STORAGE_KEY, JSON.stringify(sub));
    }
    return sub;
  } catch {
    return null;
  }
}

/** No-op: subscriptions disabled */
export function setMockSubscription(_plan: PlanTier): void {
  // DISABLED — no-op for launch integrity
}

/** No-op: subscriptions disabled */
export function clearSubscription(): void {
  // DISABLED — no-op for launch integrity
}

/** React hook — always returns free-tier state while paid subs are disabled */
export function useSubscription() {
  const [subscription, setSubscription] = useState<SubscriptionState | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Still read stored state (so if someone had a mock sub from before,
    // we don't crash), but we ignore it for gating purposes.
    const sub = getStoredSubscription();
    setSubscription(sub);
    setLoading(false);
  }, []);

  // DISABLED: always returns false while payments are not live
  const handlePostCheckout = useCallback(async (_plan: PlanTier) => {
    return null;
  }, []);

  // DISABLED: no-op
  const activatePlan = useCallback((_plan: PlanTier) => {
    // no-op
  }, []);

  // DISABLED: no-op
  const deactivate = useCallback(() => {
    // no-op
  }, []);

  // Always free tier for now
  const isPaid = false;
  const plan: PlanTier = "free";

  return {
    subscription,
    loading,
    activating: false,
    isPaid,
    plan,
    activatePlan,
    deactivate,
    handlePostCheckout,
  };
}

/**
 * Stripe payment links — currently disabled.
 * When server-side webhook verification is complete, re-enable these
 * and restore the subscription activation flow.
 */
export const STRIPE_LINKS: Record<string, string | null> = {
  creator: null, // DISABLED — was https://buy.stripe.com/...
  studio: null,  // DISABLED — was https://buy.stripe.com/...
};
