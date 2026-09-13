import { isDemoMode } from "@/lib/demo/mode";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import type { DemoSubmission, DemoSubmissionPayload } from "@/types/demo";

const TABLE = "demo_submissions";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

interface DemoSubmissionRow {
  id: string;
  payload: DemoSubmissionPayload | null;
  created_at: string;
  updated_at: string;
}

function mapRow(row: DemoSubmissionRow): DemoSubmission {
  return {
    id: row.id,
    payload: row.payload ?? {},
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function requireDemoWrite() {
  if (!isDemoMode()) return null;
  if (!isSupabaseConfigured()) {
    throw new Error("Supabase non configurato.");
  }
  return getSupabaseAdmin();
}

/** Inserts only into `demo_submissions`. No-op when demo mode is off. */
export async function createDemoSubmission(
  payload: DemoSubmissionPayload = {},
): Promise<DemoSubmission | null> {
  const admin = requireDemoWrite();
  if (!admin) return null;

  const { data, error } = await admin
    .from(TABLE)
    .insert({ payload })
    .select("id, payload, created_at, updated_at")
    .single();

  if (error) throw new Error(error.message);
  if (!data) return null;
  return mapRow(data as DemoSubmissionRow);
}

/** Merges `patch` into the existing jsonb payload. No-op when demo mode is off. */
export async function patchDemoSubmission(
  id: string,
  patch: DemoSubmissionPayload = {},
): Promise<DemoSubmission | null> {
  if (!UUID_RE.test(id)) {
    throw new Error("ID demo non valido.");
  }

  const admin = requireDemoWrite();
  if (!admin) return null;

  const { data: current, error: readError } = await admin
    .from(TABLE)
    .select("id, payload, created_at, updated_at")
    .eq("id", id)
    .maybeSingle();

  if (readError) throw new Error(readError.message);
  if (!current) return null;

  const row = current as DemoSubmissionRow;
  const payload = { ...(row.payload ?? {}), ...patch };

  const { data, error } = await admin
    .from(TABLE)
    .update({ payload })
    .eq("id", id)
    .select("id, payload, created_at, updated_at")
    .single();

  if (error) throw new Error(error.message);
  if (!data) return null;
  return mapRow(data as DemoSubmissionRow);
}

/** Admin read of isolated demo rows. Does not touch profiles/bookings. */
export async function listDemoSubmissions(): Promise<DemoSubmission[]> {
  if (!isSupabaseConfigured()) {
    throw new Error("Supabase non configurato.");
  }

  const { data, error } = await getSupabaseAdmin()
    .from(TABLE)
    .select("id, payload, created_at, updated_at")
    .order("created_at", { ascending: false });

  if (error) throw new Error(error.message);
  return ((data ?? []) as DemoSubmissionRow[]).map(mapRow);
}
