import { canAccessAdminCatalog } from "@/lib/admin-access";
import { getSupabaseServer } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { loadContestAdmin } from "@/server/repositories/contest";
import { getProfileRole } from "@/server/repositories/bookings";
import { rateLimit } from "@/server/http/rate-limit";
import { NextResponse, type NextRequest } from "next/server";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  const limited = rateLimit(request, {
    scope: "admin-signups",
    limit: 40,
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

  try {
    const data = await loadContestAdmin();
    return NextResponse.json(data, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Lettura non riuscita.";
    const missing = /contest_excluded|waitlist_contest_exclusions/i.test(message);
    return NextResponse.json(
      {
        error: missing
          ? "Manca lo schema della gara. Esegui docs/CONTEST_SCHEMA.sql su Supabase."
          : message,
      },
      { status: 500 },
    );
  }
}
