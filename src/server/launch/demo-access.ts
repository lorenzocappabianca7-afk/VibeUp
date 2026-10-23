import { isDemoAccessOpen } from "@/config/demo-access";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { randomBytes } from "node:crypto";

const SIGNUPS = "waitlist_signups";
const TOKEN_RE = /^[A-Za-z0-9_-]{43,128}$/;

export function isDemoAccessToken(value: string) {
  return TOKEN_RE.test(value);
}

export function demoAccessPath(token: string) {
  return `/demo?t=${encodeURIComponent(token)}`;
}

export function demoAccessUrl(token: string, origin: string) {
  return `${origin.replace(/\/$/, "")}${demoAccessPath(token)}`;
}

function createDemoAccessToken() {
  return randomBytes(32).toString("base64url");
}

/** Opaque reusable token for this verified signup. The raw value is not the signup id. */
export async function ensureDemoAccessToken(signupId: string): Promise<string | null> {
  if (!isSupabaseConfigured() || !isDemoAccessOpen()) return null;
  const client = getSupabaseAdmin();
  const { data, error } = await client
    .from(SIGNUPS)
    .select("demo_access_token, email_verified_at")
    .eq("id", signupId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  const row = data as { demo_access_token: string | null; email_verified_at: string | null } | null;
  if (!row?.email_verified_at) return null;
  if (row.demo_access_token) return row.demo_access_token;

  for (let attempt = 0; attempt < 5; attempt += 1) {
    const token = createDemoAccessToken();
    const { data: saved, error: updateError } = await client
      .from(SIGNUPS)
      .update({ demo_access_token: token })
      .eq("id", signupId)
      .is("demo_access_token", null)
      .select("demo_access_token")
      .maybeSingle();
    if (!updateError && saved) {
      return (saved as { demo_access_token: string }).demo_access_token;
    }
    if (updateError && updateError.code !== "23505" && !/duplicate key/i.test(updateError.message)) {
      throw new Error(updateError.message);
    }
    const again = await client
      .from(SIGNUPS)
      .select("demo_access_token")
      .eq("id", signupId)
      .maybeSingle();
    const existing = (again.data as { demo_access_token: string | null } | null)?.demo_access_token;
    if (existing) return existing;
  }
  console.error(`[demo-access] impossibile creare il token per ${signupId}`);
  return null;
}

/** Signup id when the token matches a verified row and the public demo is still open. */
export async function findSignupIdByDemoToken(token: string): Promise<string | null> {
  if (!isDemoAccessToken(token) || !isDemoAccessOpen() || !isSupabaseConfigured()) return null;
  const { data, error } = await getSupabaseAdmin()
    .from(SIGNUPS)
    .select("id, email_verified_at")
    .eq("demo_access_token", token)
    .maybeSingle();
  if (error) throw new Error(error.message);
  const row = data as { id: string; email_verified_at: string | null } | null;
  if (!row?.email_verified_at) return null;
  return row.id;
}
