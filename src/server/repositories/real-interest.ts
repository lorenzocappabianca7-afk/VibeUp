import { LEGAL_VERSIONS } from "@/content/legal";
import { maskEmail, maskPhone } from "@/lib/demo/contact-mask";
import { isCustomVenueId } from "@/lib/demo/custom-venue";
import { isUuid } from "@/server/launch/request";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { isSupabaseConfigured } from "@/lib/supabase/env";

const TABLE = "real_interest_requests";
const SIGNUPS = "waitlist_signups";
const CONSENTS = "consent_log";

export type RealInterestChannel = "whatsapp" | "email";
export type RealInterestStatus = "nuova" | "contattato" | "chiusa";

export type RealInterestError =
  | "invalid"
  | "not_found"
  | "consent_required"
  | "phone_missing"
  | "already"
  | "unavailable";

type SignupContact = {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  phone: string | null;
  email_verified_at: string | null;
};

function admin() {
  if (!isSupabaseConfigured()) return null;
  return getSupabaseAdmin();
}

function isUniqueViolation(error: { code?: string; message?: string }) {
  return error.code === "23505" || /duplicate key/i.test(error.message ?? "");
}

export async function readSignupContact(signupId: string) {
  const client = admin();
  if (!client || !isUuid(signupId)) return null;
  const { data, error } = await client
    .from(SIGNUPS)
    .select("id, first_name, last_name, email, phone, email_verified_at")
    .eq("id", signupId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  const row = data as SignupContact | null;
  if (!row?.email_verified_at) return null;
  return row;
}

export function maskedSignupContact(row: Pick<SignupContact, "email" | "phone">) {
  return {
    phoneMasked: maskPhone(row.phone ?? ""),
    emailMasked: maskEmail(row.email),
  };
}

export async function saveRealInterest(input: {
  signupId: string;
  locationId: string;
  locationName: string;
  partyDate: string;
  guestCount: number;
  channel: RealInterestChannel;
  consent: boolean;
  ipHash: string | null;
  userAgent: string | null;
}): Promise<{ ok: true; id: string } | { ok: false; error: RealInterestError }> {
  const client = admin();
  if (!client) return { ok: false, error: "unavailable" };
  if (!input.consent) return { ok: false, error: "consent_required" };
  if (input.channel !== "whatsapp" && input.channel !== "email") {
    return { ok: false, error: "invalid" };
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(input.partyDate)) return { ok: false, error: "invalid" };
  if (!Number.isInteger(input.guestCount) || input.guestCount < 1 || input.guestCount > 9999) {
    return { ok: false, error: "invalid" };
  }
  const locationName = input.locationName.trim().replace(/\s+/g, " ");
  if (locationName.length < 2 || locationName.length > 120) return { ok: false, error: "invalid" };
  const locationId = isCustomVenueId(input.locationId) ? null : input.locationId.trim() || null;

  const signup = await readSignupContact(input.signupId);
  if (!signup) return { ok: false, error: "not_found" };
  const contact = input.channel === "whatsapp" ? (signup.phone ?? "").trim() : signup.email.trim();
  if (input.channel === "whatsapp" && !contact) return { ok: false, error: "phone_missing" };
  if (!contact) return { ok: false, error: "invalid" };

  const version =
    input.channel === "whatsapp" ? LEGAL_VERSIONS.realInterestWhatsapp : LEGAL_VERSIONS.realInterestEmail;
  const now = new Date().toISOString();
  const { data, error } = await client
    .from(TABLE)
    .insert({
      signup_id: signup.id,
      location_id: locationId,
      location_name: locationName,
      party_date: input.partyDate,
      guest_count: input.guestCount,
      channel: input.channel,
      contact_value: contact,
      consent_at: now,
      consent_text_version: version,
      status: "nuova",
    })
    .select("id")
    .single();
  if (error) {
    if (isUniqueViolation(error)) return { ok: false, error: "already" };
    throw new Error(error.message);
  }
  const { error: consentError } = await client.from(CONSENTS).insert({
    signup_id: signup.id,
    kind: "real_interest",
    granted: true,
    text_version: version,
    ip_hash: input.ipHash,
    user_agent: input.userAgent,
  });
  if (consentError) throw new Error(consentError.message);
  return { ok: true, id: (data as { id: string }).id };
}

export type RealInterestRow = {
  id: string;
  createdAt: string;
  signupId: string;
  name: string;
  contact: string;
  channel: RealInterestChannel;
  location: string;
  partyDate: string;
  guestCount: number;
  status: RealInterestStatus;
};

type InterestDb = {
  id: string;
  created_at: string;
  signup_id: string;
  location_name: string;
  party_date: string;
  guest_count: number;
  channel: RealInterestChannel;
  contact_value: string;
  status: RealInterestStatus;
  waitlist_signups?: { first_name: string; last_name: string } | { first_name: string; last_name: string }[] | null;
};

function mapInterest(row: InterestDb): RealInterestRow {
  const joined = Array.isArray(row.waitlist_signups) ? row.waitlist_signups[0] : row.waitlist_signups;
  const name = joined ? `${joined.first_name} ${joined.last_name}`.trim() : "";
  return {
    id: row.id,
    createdAt: row.created_at,
    signupId: row.signup_id,
    name,
    contact: row.contact_value,
    channel: row.channel,
    location: row.location_name,
    partyDate: row.party_date,
    guestCount: row.guest_count,
    status: row.status,
  };
}

export async function countNewRealInterest() {
  const client = admin();
  if (!client) return 0;
  const { count, error } = await client
    .from(TABLE)
    .select("id", { count: "exact", head: true })
    .eq("status", "nuova");
  if (error) throw new Error(error.message);
  return count ?? 0;
}

export async function listRealInterest(status?: RealInterestStatus | "all") {
  const client = admin();
  if (!client) return [];
  let query = client
    .from(TABLE)
    .select("id, created_at, signup_id, location_name, party_date, guest_count, channel, contact_value, status, waitlist_signups(first_name, last_name)")
    .order("created_at", { ascending: false })
    .limit(500);
  if (status && status !== "all") query = query.eq("status", status);
  const { data, error } = await query;
  if (error) throw new Error(error.message);
  return ((data ?? []) as InterestDb[]).map(mapInterest);
}

export async function listRealInterestForSignup(signupId: string) {
  const client = admin();
  if (!client || !isUuid(signupId)) return [];
  const { data, error } = await client
    .from(TABLE)
    .select("id, created_at, signup_id, location_name, party_date, guest_count, channel, contact_value, status")
    .eq("signup_id", signupId)
    .order("created_at", { ascending: false });
  if (error) throw new Error(error.message);
  return ((data ?? []) as InterestDb[]).map(mapInterest);
}

export async function updateRealInterestStatus(id: string, status: RealInterestStatus) {
  const client = admin();
  if (!client || !isUuid(id)) return false;
  if (status !== "nuova" && status !== "contattato" && status !== "chiusa") return false;
  const { data, error } = await client.from(TABLE).update({ status }).eq("id", id).select("id").maybeSingle();
  if (error) throw new Error(error.message);
  return Boolean(data);
}
