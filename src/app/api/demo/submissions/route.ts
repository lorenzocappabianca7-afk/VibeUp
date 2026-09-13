import { canAccessAdminCatalog } from "@/lib/admin-access";
import { isDemoMode } from "@/lib/demo/mode";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { getSupabaseServer } from "@/lib/supabase/server";
import { sendDemoThanksIfCompleted } from "@/lib/demo/send-thanks-email";
import {
  createDemoSubmission,
  listDemoSubmissions,
  patchDemoSubmission,
} from "@/server/repositories/demo";
import { getProfileRole } from "@/server/repositories/bookings";
import { rateLimit } from "@/server/http/rate-limit";
import { rejectLargeRequest } from "@/server/http/request-limits";
import type { DemoSubmissionPayload } from "@/types/demo";
import { after, NextResponse, type NextRequest } from "next/server";

export const runtime = "nodejs";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export async function GET(request: NextRequest) {
  const limited = rateLimit(request, {
    scope: "demo-submissions-get",
    limit: 40,
    windowMs: 60_000,
  });
  if (limited) return limited;

  if (!isSupabaseConfigured()) {
    return NextResponse.json(
      { error: "Supabase non configurato." },
      { status: 503 },
    );
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
    const data = await listDemoSubmissions();
    return NextResponse.json(
      { data },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Lettura demo non riuscita.",
      },
      { status: 500 },
    );
  }
}

function isPayload(value: unknown): value is DemoSubmissionPayload {
  return !!value && typeof value === "object" && !Array.isArray(value);
}

export async function POST(request: NextRequest) {
  if (!isDemoMode()) {
    return NextResponse.json({ error: "Not found." }, { status: 404 });
  }

  const limited = rateLimit(request, {
    scope: "demo-submissions",
    limit: 40,
    windowMs: 60_000,
  });
  if (limited) return limited;

  const tooLarge = rejectLargeRequest(request, 32 * 1024);
  if (tooLarge) return tooLarge;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "JSON non valido." }, { status: 400 });
  }

  const record = body && typeof body === "object" ? (body as Record<string, unknown>) : {};
  const payload = record.payload === undefined ? {} : record.payload;
  if (!isPayload(payload)) {
    return NextResponse.json(
      { error: "Payload demo non valido." },
      { status: 422 },
    );
  }

  const id = typeof record.id === "string" ? record.id.trim() : "";
  if (id && !UUID_RE.test(id)) {
    return NextResponse.json({ error: "ID demo non valido." }, { status: 422 });
  }

  try {
    const data = id
      ? await patchDemoSubmission(id, payload)
      : await createDemoSubmission(payload);

    if (!data) {
      return NextResponse.json(
        { error: id ? "Invio demo non trovato." : "Salvataggio demo non riuscito." },
        { status: id ? 404 : 500 },
      );
    }

    if (payload.completed === true) {
      const sendThanks = () =>
        sendDemoThanksIfCompleted(data).catch((error) => {
          console.error("[demo-thanks]", error);
        });
      try {
        after(sendThanks);
      } catch {
        void sendThanks();
      }
    }

    return NextResponse.json(
      { data },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Salvataggio demo non riuscito.",
      },
      { status: 500 },
    );
  }
}
