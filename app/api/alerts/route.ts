import { NextResponse } from "next/server";

// Signs a reader up for the draw-season emails: one before the nonresident
// elk deadline, one on results day. The address goes to a Resend segment
// and nowhere else; broadcasts are sent from Resend.

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function POST(req: Request) {
  const key = process.env.RESEND_API_KEY;
  const segment = process.env.RESEND_SEGMENT_ID;
  if (!key || !segment) return NextResponse.json({ error: "Alerts are not set up yet." }, { status: 503 });

  let body: { email?: unknown; company?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Send an email address." }, { status: 400 });
  }
  // A field people never see: anything in it came from a bot. Look successful so it moves on.
  if (typeof body.company === "string" && body.company) return NextResponse.json({ ok: true });
  const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
  if (email.length > 254 || !EMAIL.test(email)) {
    return NextResponse.json({ error: "That doesn't look like an email address." }, { status: 400 });
  }

  const res = await fetch("https://api.resend.com/contacts", {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({ email, unsubscribed: false, segments: [{ id: segment }] }),
  });
  if (res.ok) return NextResponse.json({ ok: true });
  const detail = await res.text();
  // Signing up twice is still signed up.
  if (res.status === 409 || /already exists/i.test(detail)) return NextResponse.json({ ok: true });
  console.error("Resend contact signup failed:", res.status, detail.slice(0, 300));
  return NextResponse.json({ error: "Signup didn't go through. Try again in a minute." }, { status: 502 });
}
