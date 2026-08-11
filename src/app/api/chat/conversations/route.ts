import { NextResponse, type NextRequest } from "next/server";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { getSupabaseServer } from "@/lib/supabase/server";
import { rateLimit } from "@/server/http/rate-limit";
import { rejectLargeRequest } from "@/server/http/request-limits";
import {
  ensureConversation,
  ensureProviderParticipant,
  ensureUserParticipant,
  listInboxForUser,
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
    scope: "chat-conversations-get",
    limit: 60,
    windowMs: 60_000,
  });
  if (limited) return limited;

  const auth = await requireUser();
  if ("error" in auth && auth.error) return auth.error;

  try {
    const conversations = await listInboxForUser(auth.user!.id);
    return NextResponse.json({
      ok: true,
      configured: true,
      conversations,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Caricamento chat fallito.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const limited = rateLimit(request, {
    scope: "chat-conversations-post",
    limit: 30,
    windowMs: 60_000,
  });
  if (limited) return limited;

  const tooLarge = rejectLargeRequest(request, 32 * 1024);
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
  const locationId =
    typeof payload.locationId === "string" ? payload.locationId.trim() : "";
  const serviceId =
    typeof payload.serviceId === "string" ? payload.serviceId.trim() : "";
  const displayName =
    typeof payload.displayName === "string" ? payload.displayName.trim() : "";
  const category =
    typeof payload.category === "string" ? payload.category.trim() : undefined;

  if ((!locationId && !serviceId) || !displayName) {
    return NextResponse.json(
      { error: "Serve locationId o serviceId e displayName." },
      { status: 400 },
    );
  }

  try {
    const userName =
      (typeof auth.user!.user_metadata?.display_name === "string" &&
        auth.user!.user_metadata.display_name) ||
      auth.user!.email ||
      "Utente VibeUp";

    const userParticipantId = await ensureUserParticipant({
      userId: auth.user!.id,
      displayName: userName,
    });
    const providerParticipantId = await ensureProviderParticipant({
      displayName,
      locationId: locationId || undefined,
      serviceId: serviceId || undefined,
      category,
    });
    const conversation = await ensureConversation({
      userParticipantId,
      providerParticipantId,
      locationId: locationId || undefined,
      serviceId: serviceId || undefined,
      subject: displayName,
    });

    return NextResponse.json({
      ok: true,
      configured: true,
      conversationId: conversation.id,
      created: conversation.created,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Apertura chat fallita.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
