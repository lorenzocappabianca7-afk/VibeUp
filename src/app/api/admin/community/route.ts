import { canAccessAdminCatalog } from "@/lib/admin-access";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { getSupabaseServer } from "@/lib/supabase/server";
import { getProfileRole } from "@/server/repositories/bookings";
import {
  demosToCsv,
  loadCommunityDemos,
  loadCommunityOverview,
  loadCommunityPerson,
  loadCommunitySignups,
  parseCommunityFilters,
  signupsToCsv,
} from "@/server/repositories/community-admin";
import { eraseSignupById } from "@/server/repositories/privacy";
import {
  listRealInterest,
  updateRealInterestStatus,
  type RealInterestStatus,
} from "@/server/repositories/real-interest";
import { rateLimit } from "@/server/http/rate-limit";
import { isUuid } from "@/server/launch/request";
import { NextResponse, type NextRequest } from "next/server";

export const runtime = "nodejs";

async function requireAdmin(request: NextRequest) {
  const limited = rateLimit(request, {
    scope: "admin-community",
    limit: 60,
    windowMs: 60_000,
  });
  if (limited) return { ok: false as const, response: limited };
  if (!isSupabaseConfigured()) {
    return {
      ok: false as const,
      response: NextResponse.json({ error: "Supabase non configurato." }, { status: 503 }),
    };
  }
  const supabase = await getSupabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return {
      ok: false as const,
      response: NextResponse.json({ error: "Accedi per continuare." }, { status: 401 }),
    };
  }
  const role = await getProfileRole(user.id);
  if (!canAccessAdminCatalog(user.email ?? "", role as "admin" | null)) {
    return {
      ok: false as const,
      response: NextResponse.json({ error: "Accesso non autorizzato." }, { status: 403 }),
    };
  }
  return { ok: true as const };
}

export async function GET(request: NextRequest) {
  const auth = await requireAdmin(request);
  if (!auth.ok) return auth.response;
  const view = request.nextUrl.searchParams.get("view") || "overview";
  const format = request.nextUrl.searchParams.get("format");
  try {
    if (view === "overview") {
      const data = await loadCommunityOverview();
      return NextResponse.json(data, { headers: { "Cache-Control": "no-store" } });
    }
    if (view === "signups") {
      const filters = parseCommunityFilters(request.nextUrl.searchParams);
      const data = await loadCommunitySignups(filters, format === "csv");
      if (format === "csv") {
        return new NextResponse(signupsToCsv(data.rows), {
          headers: {
            "Content-Type": "text/csv; charset=utf-8",
            "Content-Disposition": "attachment; filename=\"vibeup-iscritti.csv\"",
            "Cache-Control": "no-store",
          },
        });
      }
      return NextResponse.json(data, { headers: { "Cache-Control": "no-store" } });
    }
    if (view === "person") {
      const id = request.nextUrl.searchParams.get("id") || "";
      if (!isUuid(id)) {
        return NextResponse.json({ error: "Iscritto non valido." }, { status: 422 });
      }
      const data = await loadCommunityPerson(id);
      if (!data) return NextResponse.json({ error: "Iscritto non trovato." }, { status: 404 });
      return NextResponse.json(data, { headers: { "Cache-Control": "no-store" } });
    }
    if (view === "real-interest") {
      const status = request.nextUrl.searchParams.get("status") || "all";
      const allowed = status === "nuova" || status === "contattato" || status === "chiusa" ? status : "all";
      const rows = await listRealInterest(allowed);
      if (format === "csv") {
        return new NextResponse(realInterestToCsv(rows), {
          headers: {
            "Content-Type": "text/csv; charset=utf-8",
            "Content-Disposition": "attachment; filename=\"vibeup-richieste-reali.csv\"",
            "Cache-Control": "no-store",
          },
        });
      }
      return NextResponse.json({ rows }, { headers: { "Cache-Control": "no-store" } });
    }
    if (view === "demos") {
      const page = Math.max(1, Number(request.nextUrl.searchParams.get("page")) || 1);
      const data = await loadCommunityDemos(page, format === "csv");
      if (format === "csv") {
        return new NextResponse(demosToCsv(data.rows), {
          headers: {
            "Content-Type": "text/csv; charset=utf-8",
            "Content-Disposition": "attachment; filename=\"vibeup-demo.csv\"",
            "Cache-Control": "no-store",
          },
        });
      }
      return NextResponse.json(data, { headers: { "Cache-Control": "no-store" } });
    }
    return NextResponse.json({ error: "Vista non valida." }, { status: 404 });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Lettura non riuscita." },
      { status: 500 },
    );
  }
}

function realInterestToCsv(rows: Awaited<ReturnType<typeof listRealInterest>>) {
  const cell = (value: string | number) => `"${String(value).replace(/"/g, '""')}"`;
  const header = ["Data", "Nome", "Contatto", "Canale", "Location", "Data festa", "Invitati", "Stato"];
  const lines = rows.map((row) =>
    [row.createdAt, row.name, row.contact, row.channel, row.location, row.partyDate, row.guestCount, row.status]
      .map(cell)
      .join(","),
  );
  return `\uFEFF${header.map(cell).join(",")}\n${lines.join("\n")}`;
}

export async function PATCH(request: NextRequest) {
  const auth = await requireAdmin(request);
  if (!auth.ok) return auth.response;
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "JSON non valido." }, { status: 400 });
  }
  const record = body && typeof body === "object" ? (body as { id?: unknown; status?: unknown }) : {};
  const id = typeof record.id === "string" ? record.id : "";
  const status = typeof record.status === "string" ? record.status : "";
  if (!isUuid(id) || (status !== "nuova" && status !== "contattato" && status !== "chiusa")) {
    return NextResponse.json({ error: "Richiesta non valida." }, { status: 422 });
  }
  try {
    const updated = await updateRealInterestStatus(id, status as RealInterestStatus);
    if (!updated) return NextResponse.json({ error: "Richiesta non trovata." }, { status: 404 });
    return NextResponse.json({ ok: true }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Aggiornamento non riuscito." },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest) {
  const auth = await requireAdmin(request);
  if (!auth.ok) return auth.response;
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "JSON non valido." }, { status: 400 });
  }
  const record = body && typeof body === "object" ? (body as { signupId?: unknown }) : {};
  const signupId = typeof record.signupId === "string" ? record.signupId : "";
  if (!isUuid(signupId)) {
    return NextResponse.json({ error: "Iscritto non valido." }, { status: 422 });
  }
  try {
    const result = await eraseSignupById(signupId);
    if (!result.ok) {
      const status = result.error === "not_found" ? 404 : 503;
      return NextResponse.json({ error: "Cancellazione non riuscita." }, { status });
    }
    return NextResponse.json({ ok: true }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Cancellazione non riuscita." },
      { status: 500 },
    );
  }
}
