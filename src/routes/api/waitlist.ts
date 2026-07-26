import { createServerFn } from "@tanstack/react-start";
import { sql } from "~/db";

export const submitWaitlist = createServerFn()
  .validator((data: unknown) => {
    const { email } = data as { email?: string };
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      throw new Error("Invalid email");
    }
    return { email };
  })
  .handler(async ({ data }) => {
    try {
      await sql()`CREATE TABLE IF NOT EXISTS waitlist (id SERIAL PRIMARY KEY, email TEXT NOT NULL UNIQUE, created_at TIMESTAMPTZ DEFAULT NOW())`;
      await sql()`INSERT INTO waitlist (email) VALUES (${data.email})`;
      return { success: true, message: "You're on the list!" };
    } catch (e: any) {
      if (e?.message?.includes("duplicate key") || e?.code === "23505") {
        return { success: false, error: "You're already on the list!" };
      }
      return { success: false, error: "Something went wrong" };
    }
  });
