import { createServerFn } from "@tanstack/react-start";

/**
 * Analytics endpoint — receives client-side event data.
 * In production, this would forward to a real analytics service.
 * For now, logs to server console.
 */
export const receiveAnalytics = createServerFn()
  .validator((data: unknown) => {
    const { event, category, properties, timestamp } = data as {
      event: string;
      category: string;
      properties?: Record<string, unknown>;
      timestamp: string;
    };
    return { event, category, properties, timestamp };
  })
  .handler(async ({ data }) => {
    console.log(
      `[Analytics] ${data.category}/${data.event}`,
      data.properties ? JSON.stringify(data.properties) : "",
      `@ ${data.timestamp}`
    );
    return { received: true };
  });
