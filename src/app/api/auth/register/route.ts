import { NextResponse, type NextRequest } from "next/server";
import { sendAccountActivationEmail } from "@/lib/email/send-activation-email";
import { isTransactionalEmailConfigured } from "@/lib/email/mailer";
import { getSiteUrl } from "@/lib/site";
import { sanitizeEmail, sanitizePlainText } from "@/lib/security/sanitize";
import { validateNewPassword } from "@/lib/auth/password";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { rejectLargeRequest, REQUEST_LIMITS } from "@/server/http/request-limits";
import type { AppRole } from "@/lib/auth/supabase-auth";

export const runtime = "nodejs";

function rewriteRedirect(actionLink: string, redirectTo: string) {
  try {
    const link = new URL(actionLink);
    link.searchParams.set("redirect_to", redirectTo);
    return link.toString();
  } catch {
    return actionLink;
  }
}

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
  const password = String(payload.password ?? "");
  const displayName = sanitizePlainText(String(payload.displayName ?? ""), 80);
  const phone = sanitizePlainText(String(payload.phone ?? ""), 32);
  const roleRaw = String(payload.role ?? "consumer");
  const role: Exclude<AppRole, "guest" | "admin"> =
    roleRaw === "business" ? "business" : "consumer";

  if (!email || !email.includes("@")) {
    return NextResponse.json({ error: "Email non valida." }, { status: 400 });
  }

  const passwordError = validateNewPassword(password, password);
  if (passwordError) {
    return NextResponse.json({ error: passwordError }, { status: 400 });
  }

  if (!isSupabaseConfigured()) {
    return NextResponse.json(
      { error: "Autenticazione non configurata." },
      { status: 503 },
    );
  }

  if (!isTransactionalEmailConfigured()) {
    return NextResponse.json(
      {
        error: "Invio email non configurato. Imposta RESEND_API_KEY su Vercel.",
      },
      { status: 503 },
    );
  }

  const site = getSiteUrl();
  const redirectTo = `${site}/auth/callback`;

  try {
    const admin = getSupabaseAdmin();
    const { data, error } = await admin.auth.admin.generateLink({
      type: "signup",
      email,
      password,
      options: {
        redirectTo,
        data: {
          display_name: displayName || email.split("@")[0],
          role,
          phone,
        },
      },
    });

    if (error || !data?.properties?.action_link) {
      const message = (error?.message ?? "").toLowerCase();
      if (message.includes("already") || message.includes("registered")) {
        return NextResponse.json(
          { error: "Esiste già un account con questa email. Usa Accedi." },
          { status: 409 },
        );
      }
      console.warn("[register] generateLink:", error?.message ?? "missing link");
      return NextResponse.json(
        { error: "Non sono riuscito a creare l’account. Riprova." },
        { status: 400 },
      );
    }

    const userId = data.user?.id;
    if (userId && phone) {
      await admin
        .from("profiles")
        .update({
          phone,
          display_name: displayName || email.split("@")[0],
          role,
        })
        .eq("id", userId);
    }

    const activateUrl = rewriteRedirect(
      data.properties.action_link,
      redirectTo,
    );
    const sent = await sendAccountActivationEmail({
      to: email,
      name: displayName || email.split("@")[0] || "ciao",
      activateUrl,
    });

    if (!sent.ok) {
      console.error("[register] smtp:", sent.error);
      return NextResponse.json({ error: sent.error }, { status: 503 });
    }

    return NextResponse.json({
      ok: true,
      needsEmailActivation: true,
      email,
      name: displayName || email.split("@")[0],
    });
  } catch (error) {
    console.error("[register]", error);
    return NextResponse.json(
      { error: "Non sono riuscito a creare l’account." },
      { status: 500 },
    );
  }
}
