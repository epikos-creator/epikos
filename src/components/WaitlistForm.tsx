"use client";

import { useState } from "react";
import { submitWaitlist } from "~/routes/api/waitlist";

type Status = "idle" | "loading" | "success" | "error";

export function WaitlistForm() {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<Status>("idle");
  const [message, setMessage] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus("loading");
    setMessage("");

    try {
      const result = await submitWaitlist({ data: { email } });

      if (result.success) {
        setStatus("success");
        setMessage(result.message || "You're on the list!");
      } else {
        setStatus("error");
        setMessage(result.error || "Something went wrong");
      }
    } catch (err: any) {
      if (err?.message?.includes("Invalid email")) {
        setStatus("error");
        setMessage("Please enter a valid email");
      } else {
        setStatus("error");
        setMessage("Something went wrong");
      }
    }
  };

  const isLoading = status === "loading";
  const showInput = status !== "success";

  return (
    <div>
      {showInput ? (
        <form
          className="mt-8 flex flex-col gap-3 sm:flex-row"
          onSubmit={handleSubmit}
        >
          <input
            type="email"
            placeholder="you@example.com"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            disabled={isLoading}
            className="flex-1 rounded-full border border-gray-700 bg-white/10 px-5 py-3 text-white placeholder-gray-500 outline-none transition focus:border-gold focus:ring-1 focus:ring-gold disabled:opacity-50"
          />
          <button
            type="submit"
            disabled={isLoading}
            className="rounded-full bg-gold px-8 py-3 font-heading text-sm font-bold tracking-widest text-navy uppercase transition hover:bg-gold/80 hover:shadow-lg hover:shadow-gold/30 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? "Submitting..." : "Get Early Access"}
          </button>
        </form>
      ) : (
        <p className="mt-8 text-lg font-semibold text-gold">
          You're on the list! 🎬
        </p>
      )}

      {status === "error" && message && (
        <p className="mt-3 text-sm text-red-400">{message}</p>
      )}
    </div>
  );
}
