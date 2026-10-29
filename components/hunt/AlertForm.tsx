"use client";

import { useState } from "react";
import { track } from "@/lib/track";

// The two emails a nonresident applicant wants: a reminder before the elk
// deadline and a note the day results post.
export default function AlertForm({ where }: { where: string }) {
  const [email, setEmail] = useState("");
  const [state, setState] = useState<"idle" | "sending" | "done" | "error">("idle");
  const [error, setError] = useState("");
  const id = `alerts-${where.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`;

  const submit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setState("sending");
    const company = (new FormData(e.currentTarget).get("company") as string) ?? "";
    try {
      const res = await fetch("/api/alerts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, company }),
      });
      const out = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(out.error ?? "Signup didn't go through. Try again in a minute.");
      track("email_signup", { where });
      setState("done");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Signup didn't go through. Try again in a minute.");
      setState("error");
    }
  };

  return (
    <aside className="hs-alerts" id="alerts">
      <div>
        <div className="kicker">Draw-season alerts</div>
        <p>
          One email before nonresident elk applications close, and one the day draw results post. Nothing else, and
          you can unsubscribe from either.
        </p>
      </div>
      {state === "done" ? (
        <p className="hs-alerts-done" role="status">
          You&apos;re on the list. Watch for the deadline reminder in January.
        </p>
      ) : (
        <form onSubmit={submit}>
          <label htmlFor={id} className="sr-only">
            Email address
          </label>
          <input
            id={id}
            type="email"
            required
            autoComplete="email"
            placeholder="you@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          {/* Hidden from people; bots fill it in. */}
          <input type="text" name="company" tabIndex={-1} autoComplete="off" aria-hidden="true" className="hs-hp" />
          <button type="submit" className="hs-btn dark" disabled={state === "sending"}>
            {state === "sending" ? "Signing up…" : "Email me"}
          </button>
          {state === "error" && (
            <p className="hs-alerts-err" role="alert">
              {error}
            </p>
          )}
        </form>
      )}
    </aside>
  );
}
