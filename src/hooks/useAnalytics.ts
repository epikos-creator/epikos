"use client";

import { useCallback } from "react";

const ANALYTICS_ENDPOINT = "/api/analytics"; // future endpoint

interface AnalyticsEvent {
  event: string;
  category: "film" | "subscription" | "engagement" | "export" | "share";
  properties?: Record<string, string | number | boolean>;
  timestamp: string;
}

/**
 * Simple client-side analytics tracker.
 * Logs to console and optionally POSTs to an endpoint.
 */
export function useAnalytics() {
  const track = useCallback(
    (event: string, category: AnalyticsEvent["category"], properties?: Record<string, string | number | boolean>) => {
      const payload: AnalyticsEvent = {
        event,
        category,
        properties,
        timestamp: new Date().toISOString(),
      };

      // Always log to console
      console.log(
        `%c[Epikos Analytics]%c ${event}`,
        "color: #d1a95c; font-weight: bold;",
        "color: #999;",
        payload
      );

      // Fire-and-forget to endpoint if available
      try {
        if (navigator.sendBeacon) {
          navigator.sendBeacon(
            ANALYTICS_ENDPOINT,
            JSON.stringify(payload)
          );
        } else {
          fetch(ANALYTICS_ENDPOINT, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
            keepalive: true,
          }).catch(() => {});
        }
      } catch {
        // Silently fail — analytics is non-critical
      }
    },
    []
  );

  return { track };
}
