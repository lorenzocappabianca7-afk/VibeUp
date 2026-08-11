import { NextResponse, type NextRequest } from "next/server";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { getSupabaseServer } from "@/lib/supabase/server";
import { rateLimit } from "@/server/http/rate-limit";
import {
  limitText,
  rejectLargeRequest,
  REQUEST_LIMITS,
} from "@/server/http/request-limits";
import {
  listMessagesForUser,
  sendInAppMessage,
} from "@/server/repositories/chat";

export const runtime = "nodejs";

async function requireUser() {
  if (!isSupabaseConfigured()) {
    return {
      error: NextResponse.json(
        { error: "Supabase non configurato.", configured: false },
        { status: 503 },
      ),
    };
  }
  const supabase = await getSupabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return {
      error: NextResponse.json(
        { error: "Accedi per usare i messaggi.", configured: true },
        { status: 401 },
      ),
    };
  }
  return { user };
}

export async function GET(request: NextRequest) {
  const limited = rateLimit(request, {
    scope: "chat-messages-get",
    limit: 90,
    windowMs: 60_000,
  });
  if (limited) return limited;

  const auth = await requireUser();
  if ("error" in auth && auth.error) return auth.error;

  const conversationId = request.nextUrl.searchParams.get("conversationId")?.trim();
  if (!conversationId) {
    return NextResponse.json(
      { error: "conversationId richiesto." },
      { status: 400 },
    );
  }

  try {
    const messages = await listMessagesForUser({
      userId: auth.user!.id,
      conversationId,
    });
    return NextResponse.json({ ok: true, messages });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Caricamento messaggi fallito.";
    const status = message.includes("autorizz") ? 403 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}

/** In-app send (persists to Supabase). WhatsApp bridge remains optional later. */
export async function POST(request: NextRequest) {
  const limited = rateLimit(request, {
    scope: "chat-messages-post-inapp",
    limit: 40,
    windowMs: 60_000,
  });
  if (limited) return limited;

  const tooLarge = rejectLargeRequest(request, REQUEST_LIMITS.quoteBodyBytes);
  if (tooLarge) return tooLarge;

  const auth = await requireUser();
  if ("error" in auth && auth.error) return auth.error;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "JSON non valido." }, { status: 400 });
  }

  const payload =
    body && typeof body === "object" ? (body as Record<string, unknown>) : {};
  const conversationId =
    typeof payload.conversationId === "string"
      ? payload.conversationId.trim()
      : "";
  const text =
    typeof payload.body === "string"
      ? limitText(payload.body, REQUEST_LIMITS.chatMessageChars)
      : "";

  if (!conversationId || !text) {
    return NextResponse.json(
      { error: "Messaggio chat non valido." },
      { status: 422 },
    );
  }

  try {
    const message = await sendInAppMessage({
      userId: auth.user!.id,
      conversationId,
      body: text,
    });
    return NextResponse.json({ ok: true, message });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Invio messaggio fallito.";
    const status = message.includes("autorizz") ? 403 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
