import { NextResponse, type NextRequest } from "next/server";
import {
  isPasswordResetEmailConfigured,
  sendPasswordResetEmail,
} from "@/lib/email/send-password-reset-email";
import { getSiteUrl } from "@/lib/site";
import { sanitizeEmail } from "@/lib/security/sanitize";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { rejectLargeRequest, REQUEST_LIMITS } from "@/server/http/request-limits";

export const runtime = "nodejs";

/**
 * Always returns a generic success to the client when the request is well-formed,
 * so we never reveal whether an email is registered.
 */
export async function POST(request: NextRequest) {
  const tooLarge = rejectLargeRequest(request, REQUEST_LIMITS.quoteBodyBytes);
  if (tooLarge) return tooLarge;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Richiesta non valida." }, { status: 400 });
  }

  const payload =
    body && typeof body === "object" ? (body as Record<string, unknown>) : {};
  const email = sanitizeEmail(String(payload.email ?? ""));

  if (!email || !email.includes("@")) {
    return NextResponse.json({ error: "Email non valida." }, { status: 400 });
  }

  if (!isSupabaseConfigured()) {
    return NextResponse.json(
      { error: "Autenticazione non configurata." },
      { status: 503 },
    );
  }

  if (!isPasswordResetEmailConfigured()) {
    return NextResponse.json(
      {
        error:
          "Invio email non configurato. Imposta RESEND_API_KEY su Vercel.",
      },
      { status: 503 },
    );
  }

  const site = getSiteUrl().replace(/\/$/, "");
  const redirectTo = `${site}/auth/callback?next=${encodeURIComponent("/reset-password")}`;

  try {
    const admin = getSupabaseAdmin();
    const { data, error } = await admin.auth.admin.generateLink({
      type: "recovery",
      email,
      options: { redirectTo },
    });

    if (error || !data?.properties?.action_link) {
      // Unknown email / rate limit / etc. — do not leak details to the client.
      console.warn(
        "[send-password-reset] generateLink:",
        error?.message ?? "missing action_link",
      );
      return NextResponse.json({ ok: true });
    }

    // Force callback + next so the user lands on /reset-password even if
    // Supabase drops query params from an allowlisted redirect.
    let resetUrl = data.properties.action_link;
    try {
      const link = new URL(resetUrl);
      link.searchParams.set("redirect_to", redirectTo);
      resetUrl = link.toString();
    } catch {
      /* keep original */
    }

    const sent = await sendPasswordResetEmail({
      to: email,
      resetUrl,
    });

    if (!sent.ok) {
      console.error("[send-password-reset] resend:", sent.error);
      return NextResponse.json({ error: sent.error }, { status: 503 });
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("[send-password-reset]", error);
    // Still opaque to the client when possible; SMTP misconfig is actionable.
    return NextResponse.json(
      { error: "Non sono riuscito a inviare l’email di recupero." },
      { status: 500 },
    );
  }
}
