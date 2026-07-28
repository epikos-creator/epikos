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
 * Simulated Stripe integration.
 * 
 * Flow:
 * 1. User clicks Stripe payment link → opens in new tab
 * 2. On return, user clicks "I've Subscribed" → creates simulated checkout session
 * 3. After a short delay (simulating webhook), subscription activates
 * 
 * In production, replace activateFromCheckout() with a real Stripe webhook handler
 * that listens for checkout.session.completed events.
 */

/** Generate a realistic-looking ID */
function genId(prefix: string): string {
  return `${prefix}_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;
}

/** Store a checkout session */
export function createCheckoutSession(plan: PlanTier): CheckoutSession {
  const session: CheckoutSession = {
    id: genId("cs"),
    plan,
    status: "pending",
    createdAt: new Date().toISOString(),
    expiresAt: new Date(Date.now() + 30 * 60 * 1000).toISOString(), // 30 min expiry
  };
  if (typeof window !== "undefined") {
    localStorage.setItem(CHECKOUT_KEY, JSON.stringify(session));
  }
  return session;
}

/** Get stored checkout session */
export function getCheckoutSession(): CheckoutSession | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(CHECKOUT_KEY);
    if (!raw) return null;
    const session = JSON.parse(raw) as CheckoutSession;
    // Auto-expire old sessions
    if (new Date(session.expiresAt) < new Date()) {
      localStorage.removeItem(CHECKOUT_KEY);
      return null;
    }
    return session;
  } catch {
    return null;
  }
}

/** Simulate Stripe webhook: complete checkout → activate subscription */
export function activateFromCheckout(): SubscriptionState | null {
  const session = getCheckoutSession();
  if (!session) return null;

  const now = new Date();
  const periodEnd = new Date(now);
  periodEnd.setMonth(periodEnd.getMonth() + 1);

  const sub: SubscriptionState = {
    plan: session.plan,
    status: "active",
    customerId: genId("cus"),
    subscriptionId: genId("sub"),
    currentPeriodEnd: periodEnd.toISOString(),
    activatedAt: now.toISOString(),
  };

  // Update checkout session status
  session.status = "completed";
  if (typeof window !== "undefined") {
    localStorage.setItem(CHECKOUT_KEY, JSON.stringify(session));
    localStorage.setItem(STORAGE_KEY, JSON.stringify(sub));
  }

  return sub;
}

/** Get stored subscription */
export function getStoredSubscription(): SubscriptionState | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const sub = JSON.parse(raw) as SubscriptionState;
    // Check if subscription period has ended
    if (sub.currentPeriodEnd && new Date(sub.currentPeriodEnd) < new Date()) {
      sub.status = "past_due";
      localStorage.setItem(STORAGE_KEY, JSON.stringify(sub));
    }
    return sub;
  } catch {
    return null;
  }
}

/** Manually trigger a subscription (for dev/testing) */
export function setMockSubscription(plan: PlanTier): void {
  const now = new Date();
  const periodEnd = new Date(now);
  periodEnd.setMonth(periodEnd.getMonth() + 1);

  const sub: SubscriptionState = {
    plan,
    status: "active",
    customerId: genId("cus"),
    subscriptionId: genId("sub"),
    currentPeriodEnd: periodEnd.toISOString(),
    activatedAt: now.toISOString(),
  };
  if (typeof window !== "undefined") {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(sub));
  }
}

/** Clear subscription (cancel) */
export function clearSubscription(): void {
  if (typeof window !== "undefined") {
    localStorage.removeItem(STORAGE_KEY);
    localStorage.removeItem(CHECKOUT_KEY);
  }
}

/** React hook for subscription state */
export function useSubscription() {
  const [subscription, setSubscription] = useState<SubscriptionState | null>(null);
  const [loading, setLoading] = useState(true);
  const [activating, setActivating] = useState(false);

  useEffect(() => {
    const sub = getStoredSubscription();
    setSubscription(sub);
    setLoading(false);
  }, []);

  /** Called after user completes Stripe checkout in external tab */
  const handlePostCheckout = useCallback(async (plan: PlanTier) => {
    setActivating(true);
    // Create a simulated checkout session (in prod, this would be a server call)
    createCheckoutSession(plan);

    // Simulate webhook delay (1-3 seconds)
    const delay = 1000 + Math.random() * 2000;
    await new Promise((r) => setTimeout(r, delay));

    const sub = activateFromCheckout();
    if (sub) {
      setSubscription(sub);
    }
    setActivating(false);
    return sub;
  }, []);

  const activatePlan = useCallback((plan: PlanTier) => {
    setMockSubscription(plan);
    const sub = getStoredSubscription();
    setSubscription(sub);
  }, []);

  const deactivate = useCallback(() => {
    clearSubscription();
    setSubscription(null);
  }, []);

  const isPaid =
    subscription?.status === "active" &&
    (subscription.plan === "creator" || subscription.plan === "studio");
  const plan = subscription?.plan ?? "free";

  return {
    subscription,
    loading,
    activating,
    isPaid,
    plan,
    activatePlan,
    deactivate,
    handlePostCheckout,
  };
}

/**
 * Real Stripe payment links.
 */
export const STRIPE_LINKS = {
  creator: "https://buy.stripe.com/4gM14n3hw6Na0ojdap5AQ00",
  studio: "https://buy.stripe.com/bJebJ119o2wU1sn1rH5AQ01",
};
