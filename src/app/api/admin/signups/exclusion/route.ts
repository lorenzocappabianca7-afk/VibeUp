import { canAccessAdminCatalog } from "@/lib/admin-access";
import { getSupabaseServer } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { setContestExclusion } from "@/server/repositories/contest";
import { getProfileRole } from "@/server/repositories/bookings";
import { isUuid } from "@/server/launch/request";
import { rateLimit } from "@/server/http/rate-limit";
import { NextResponse, type NextRequest } from "next/server";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  const limited = rateLimit(request, {
    scope: "admin-signups-exclusion",
    limit: 30,
    windowMs: 60_000,
  });
  if (limited) return limited;
  if (!isSupabaseConfigured()) {
    return NextResponse.json({ error: "Supabase non configurato." }, { status: 503 });
  }

  const supabase = await getSupabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Accedi per continuare." }, { status: 401 });
  }
  const role = await getProfileRole(user.id);
  if (!canAccessAdminCatalog(user.email ?? "", role as "admin" | null)) {
    return NextResponse.json({ error: "Accesso non autorizzato." }, { status: 403 });
  }

  const body = (await request.json().catch(() => null)) as {
    signupId?: string;
    excluded?: boolean;
    reason?: string;
  } | null;
  const signupId = body?.signupId?.trim() ?? "";
  if (!isUuid(signupId) || typeof body?.excluded !== "boolean") {
    return NextResponse.json({ error: "Dati non validi." }, { status: 400 });
  }

  try {
    const result = await setContestExclusion(signupId, body.excluded, body.reason ?? "");
    if (!result.ok) {
      const message = result.error === "reason"
        ? "Scrivi un motivo, almeno 3 caratteri."
        : result.error === "not_found"
          ? "Iscrizione non trovata."
          : "Operazione non disponibile.";
      return NextResponse.json({ error: message }, { status: result.error === "reason" ? 400 : 404 });
    }
    return NextResponse.json({ ok: true }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Salvataggio non riuscito." },
      { status: 500 },
    );
  }
}
