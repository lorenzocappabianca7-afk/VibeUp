import { NextResponse, type NextRequest } from "next/server";
import { buildActivationUrl } from "@/lib/auth/activation";
import {
  isActivationEmailConfigured,
  sendAccountActivationEmail,
} from "@/lib/email/send-activation-email";
import { sanitizeEmail, sanitizePlainText } from "@/lib/security/sanitize";
import { rejectLargeRequest, REQUEST_LIMITS } from "@/server/http/request-limits";

export const runtime = "nodejs";

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
  const name = sanitizePlainText(String(payload.name ?? ""), 80);
  const token = sanitizePlainText(String(payload.token ?? ""), 128).replace(
    /[^a-f0-9]/gi,
    "",
  );

  if (!email || !email.includes("@")) {
    return NextResponse.json(
      { error: "Email non valida." },
      { status: 400 },
    );
  }
  if (token.length < 32) {
    return NextResponse.json(
      { error: "Token di attivazione non valido." },
      { status: 400 },
    );
  }
  if (!isActivationEmailConfigured()) {
    return NextResponse.json(
      {
        error:
          "Invio email non configurato. Aggiungi GMAIL_APP_PASSWORD nelle variabili d’ambiente.",
      },
      { status: 503 },
    );
  }

  try {
    const result = await sendAccountActivationEmail({
      to: email,
      name: name || email.split("@")[0] || "ciao",
      activateUrl: buildActivationUrl(token),
    });

    if (!result.ok) {
      return NextResponse.json({ error: result.error }, { status: 503 });
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("[send-activation]", error);
    return NextResponse.json(
      { error: "Non sono riuscito a inviare l’email di attivazione." },
      { status: 500 },
    );
  }
}
