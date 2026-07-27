"use client";

import { useState, useEffect, useCallback } from "react";

const STORAGE_KEY = "epikos_subscription";

export type PlanTier = "free" | "creator" | "studio";

export interface SubscriptionState {
  plan: PlanTier;
  status: "active" | "inactive" | "trialing";
  expiresAt?: string;
  customerId?: string;
}

/**
 * Mock subscription system.
 * In production, this would call Stripe API to verify subscription status.
 * For now, we simulate via localStorage flag + manual activation.
 */
const MOCK_SUBSCRIPTIONS: Record<string, SubscriptionState> = {
  creator: { plan: "creator", status: "active", customerId: "cus_mock_creator" },
  studio: { plan: "studio", status: "active", customerId: "cus_mock_studio" },
};

export function getStoredSubscription(): SubscriptionState | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as SubscriptionState;
  } catch {
    return null;
  }
}

export function setMockSubscription(plan: PlanTier): void {
  const sub = MOCK_SUBSCRIPTIONS[plan];
  if (sub) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(sub));
  }
}

export function clearSubscription(): void {
  localStorage.removeItem(STORAGE_KEY);
}

export function useSubscription() {
  const [subscription, setSubscription] = useState<SubscriptionState | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const sub = getStoredSubscription();
    setSubscription(sub);
    setLoading(false);
  }, []);

  const activatePlan = useCallback((plan: PlanTier) => {
    setMockSubscription(plan);
    setSubscription(MOCK_SUBSCRIPTIONS[plan]);
  }, []);

  const deactivate = useCallback(() => {
    clearSubscription();
    setSubscription(null);
  }, []);

  const isPaid = subscription?.status === "active" && (subscription.plan === "creator" || subscription.plan === "studio");
  const plan = subscription?.plan ?? "free";

  return { subscription, loading, isPaid, plan, activatePlan, deactivate };
}

/**
 * Stripe payment links — real products already configured in Stripe.
 */
export const STRIPE_LINKS = {
  creator: "https://buy.stripe.com/4gM14n3hw6Na0ojdap5AQ00",
  studio: "https://buy.stripe.com/bJebJ119o2wU1sn1rH5AQ01",
};
