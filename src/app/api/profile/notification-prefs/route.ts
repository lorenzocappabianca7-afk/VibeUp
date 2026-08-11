import { NextResponse, type NextRequest } from "next/server";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { getSupabaseServer } from "@/lib/supabase/server";
import { rateLimit } from "@/server/http/rate-limit";
import { rejectLargeRequest } from "@/server/http/request-limits";
import {
  normalizeManagerNotificationPrefs,
  validateManagerNotificationPrefs,
  type ManagerNotificationPrefs,
} from "@/types/manager-notification-prefs";

export const runtime = "nodejs";

function rowToPrefs(row: {
  notification_channel?: string | null;
  notification_whatsapp_number?: string | null;
  notification_email?: string | null;
}): ManagerNotificationPrefs {
  return normalizeManagerNotificationPrefs({
    channel:
      row.notification_channel === "whatsapp" ||
      row.notification_channel === "email"
        ? row.notification_channel
        : "email",
    whatsappNumber: row.notification_whatsapp_number ?? null,
    email: row.notification_email ?? null,
  });
}

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
        { error: "Accedi per continuare.", configured: true },
        { status: 401 },
      ),
    };
  }

  return { user, supabase };
}

export async function GET(request: NextRequest) {
  const limited = rateLimit(request, {
    scope: "profile-notification-prefs-get",
    limit: 60,
    windowMs: 60_000,
  });
  if (limited) return limited;

  const auth = await requireUser();
  if ("error" in auth && auth.error) return auth.error;

  const { data, error } = await auth.supabase!
    .from("profiles")
    .select(
      "notification_channel, notification_whatsapp_number, notification_email",
    )
    .eq("id", auth.user!.id)
    .maybeSingle();

  if (error) {
    return NextResponse.json(
      { error: error.message, configured: true },
      { status: 500 },
    );
  }

  return NextResponse.json({
    ok: true,
    configured: true,
    prefs: rowToPrefs(data ?? {}),
  });
}

export async function PATCH(request: NextRequest) {
  const limited = rateLimit(request, {
    scope: "profile-notification-prefs-patch",
    limit: 30,
    windowMs: 60_000,
  });
  if (limited) return limited;

  const tooLarge = rejectLargeRequest(request, 8 * 1024);
  if (tooLarge) return tooLarge;

  const auth = await requireUser();
  if ("error" in auth && auth.error) return auth.error;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "JSON non valido." }, { status: 400 });
  }

  const raw =
    body && typeof body === "object" ? (body as Record<string, unknown>) : {};
  const validated = validateManagerNotificationPrefs({
    channel:
      raw.channel === "whatsapp" || raw.channel === "email"
        ? raw.channel
        : undefined,
    whatsappNumber:
      typeof raw.whatsappNumber === "string" ? raw.whatsappNumber : null,
    email: typeof raw.email === "string" ? raw.email : null,
  });

  if (!validated.ok) {
    return NextResponse.json({ error: validated.error }, { status: 400 });
  }

  const { data, error } = await auth.supabase!
    .from("profiles")
    .update({
      notification_channel: validated.prefs.channel,
      notification_whatsapp_number: validated.prefs.whatsappNumber,
      notification_email: validated.prefs.email,
      updated_at: new Date().toISOString(),
    })
    .eq("id", auth.user!.id)
    .select(
      "notification_channel, notification_whatsapp_number, notification_email",
    )
    .maybeSingle();

  if (error) {
    return NextResponse.json(
      { error: error.message, configured: true },
      { status: 500 },
    );
  }

  return NextResponse.json({
    ok: true,
    configured: true,
    prefs: data ? rowToPrefs(data) : validated.prefs,
  });
}
