import { randomInt } from "crypto";
import { isUuid } from "@/server/launch/request";
import { parseSiteLocale, type DemoLanguage } from "@/lib/demo/language";
import { ensureDemoAccessToken } from "@/server/launch/demo-access";
import { isTesterEmail } from "@/server/launch/testers";
import { eraseSignupById } from "@/server/repositories/privacy";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import {
  CODE_ALPHABET,
  cleanDreamVenue,
  isAtLeast14OnDate,
  isE164,
  isEmailAddress,
  isHighSchool,
  isPersonName,
  isVibeUpCode,
  normalizeCode,
  normalizeEmail,
  USERNAME_RE,
} from "@/lib/launch/fields";
import { LEGAL_VERSIONS } from "@/content/legal";
import {
  CODE_MAX_ATTEMPTS,
  confirmTokenMatches,
  createConfirmToken,
  createVerificationCode,
  hashConfirmToken,
  hashVerificationCode,
  RESEND_WAIT_MS,
  verificationCodesMatch,
  verificationTtlMs,
} from "@/server/launch/code-mail";

const SIGNUPS = "waitlist_signups";
const CODES = "waitlist_email_codes";

export type WaitlistError =
  | "invalid"
  | "too_young"
  | "username_taken"
  | "email_taken"
  | "phone_taken"
  | "own_code"
  | "unavailable"
  | "not_found"
  | "expired"
  | "locked"
  | "mismatch"
  | "replaced"
  | "wait";

export type WaitlistDraft = {
  firstName: string;
  lastName: string;
  email: string;
  birthDate: string;
  highSchool: string;
  dreamVenue: string | null;
  dreamVenueUndecided: boolean;
  referralCode: string | null;
  consentMarketing: boolean;
  ipHash: string | null;
  locale?: DemoLanguage;
};

type SignupRow = {
  id: string;
  email: string;
  username: string;
  phone: string;
  vibeup_code: string | null;
  email_verified_at: string | null;
  first_name: string;
};

type CodeRow = {
  signup_id: string;
  code_hash: string;
  expires_at: string;
  attempts: number;
  sent_at: string;
};

function unavailable() {
  return { ok: false as const, error: "unavailable" as const };
}

function admin() {
  if (!isSupabaseConfigured()) return null;
  return getSupabaseAdmin();
}

function isUniqueViolation(error: { code?: string; message?: string }) {
  return error.code === "23505" || /duplicate key/i.test(error.message ?? "");
}

function uniqueField(error: { message?: string }): WaitlistError {
  const message = error.message ?? "";
  if (/username/i.test(message)) return "username_taken";
  if (/phone/i.test(message)) return "phone_taken";
  return "email_taken";
}

function escapeLike(value: string) {
  return value.replace(/[\\%_]/g, (char) => `\\${char}`);
}

export async function isUsernameAvailable(username: string, exceptId?: string) {
  const client = admin();
  if (!client) return null;
  const name = username.trim();
  if (!USERNAME_RE.test(name)) return false;
  let query = client
    .from(SIGNUPS)
    .select("id, email_verified_at")
    .ilike("username", escapeLike(name))
    .limit(5);
  if (exceptId) query = query.neq("id", exceptId);
  const { data, error } = await query;
  if (error) throw new Error(error.message);
  const rows = (data ?? []) as { id: string; email_verified_at: string | null }[];
  if (rows.some((row) => row.email_verified_at)) return false;
  for (const row of rows) {
    await deleteUnverifiedSignup(row.id);
  }
  return true;
}

async function deleteUnverifiedSignup(signupId: string) {
  const client = admin();
  if (!client || !isUuid(signupId)) return false;
  const { data, error } = await client
    .from(SIGNUPS)
    .delete()
    .eq("id", signupId)
    .is("email_verified_at", null)
    .select("id");
  if (error) throw new Error(error.message);
  return (data ?? []).length > 0;
}

export async function searchVenueNames(query: string) {
  const client = admin();
  if (!client) return [];
  const q = query.trim();
  if (q.length < 2) return [];
  const { data, error } = await client
    .from("listings")
    .select("name")
    .eq("kind", "location")
    .eq("status", "published")
    .ilike("name", `%${escapeLike(q)}%`)
    .limit(8);
  if (error) throw new Error(error.message);
  return (data ?? [])
    .map((row) => (typeof row.name === "string" ? row.name.trim() : ""))
    .filter(Boolean);
}

export async function referralExists(code: string) {
  const client = admin();
  if (!client) return null;
  const normalized = normalizeCode(code);
  if (!isVibeUpCode(normalized)) return false;
  const { data, error } = await client
    .from(SIGNUPS)
    .select("id")
    .eq("vibeup_code", normalized)
    .not("email_verified_at", "is", null)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return Boolean(data);
}

function validateDraft(draft: WaitlistDraft): WaitlistError | null {
  if (!isPersonName(draft.firstName) || !isPersonName(draft.lastName)) return "invalid";
  if (!isEmailAddress(draft.email)) return "invalid";
  if (!isAtLeast14OnDate(draft.birthDate)) return "too_young";
  if (draft.dreamVenueUndecided) return null;
  const venue = cleanDreamVenue(draft.dreamVenue ?? "");
  if (!venue || venue !== (draft.dreamVenue ?? "").trim().replace(/\s+/g, " ")) return "invalid";
  return null;
}

/** A finished tester signup is removed, with the same erasure as a privacy request. */
async function releaseVerifiedTesterSignup(existing: SignupRow | null, email: string) {
  if (!existing?.email_verified_at || !isTesterEmail(email)) return existing;
  const erased = await eraseSignupById(existing.id);
  if (!erased.ok) return "unavailable" as const;
  return null;
}

async function findByEmail(email: string) {
  const client = admin();
  if (!client) return null;
  const { data, error } = await client
    .from(SIGNUPS)
    .select("id, email, username, phone, vibeup_code, email_verified_at, first_name")
    .eq("email", normalizeEmail(email))
    .maybeSingle();
  if (error) throw new Error(error.message);
  return (data as SignupRow | null) ?? null;
}

export async function readSignupEmail(signupId: string) {
  const client = admin();
  if (!client || !isUuid(signupId)) return null;
  const { data, error } = await client.from(SIGNUPS).select("email").eq("id", signupId).maybeSingle();
  if (error) throw new Error(error.message);
  const email = (data as { email?: string } | null)?.email;
  return typeof email === "string" ? email : null;
}

/** Name, username and email only. The profile and consents come later. */
export async function readSignupLocale(signupId: string): Promise<DemoLanguage> {
  return (await readSignupLocaleChoice(signupId)) ?? "it";
}

/** Null when the row is missing, so a guess does not override the browser language. */
export async function readSignupLocaleChoice(signupId: string): Promise<DemoLanguage | null> {
  const client = admin();
  if (!client || !isUuid(signupId)) return null;
  const { data, error } = await client.from(SIGNUPS).select("locale").eq("id", signupId).maybeSingle();
  if (error || !data) return null;
  const locale = (data as { locale?: string }).locale;
  return locale === "en" || locale === "it" ? locale : null;
}

export async function updateSignupLocale(signupId: string, locale: DemoLanguage) {
  const client = admin();
  if (!client || !isUuid(signupId)) return false;
  const { error } = await client.from(SIGNUPS).update({ locale }).eq("id", signupId);
  return !error;
}

export async function startEmailSignup(input: {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  ipHash: string | null;
  locale?: DemoLanguage;
}): Promise<{ ok: true; id: string; firstName: string } | { ok: false; error: WaitlistError }> {
  const client = admin();
  if (!client) return unavailable();
  if (!isPersonName(input.firstName) || !isPersonName(input.lastName)) return { ok: false, error: "invalid" };
  const email = normalizeEmail(input.email);
  if (!isEmailAddress(email)) return { ok: false, error: "invalid" };
  if (!isE164(input.phone)) return { ok: false, error: "invalid" };

  const found = await findByEmail(email);
  const existing = await releaseVerifiedTesterSignup(found, email);
  if (existing === "unavailable") return unavailable();
  if (existing?.email_verified_at) return { ok: false, error: "email_taken" };

  const { data: phoneOwner, error: phoneError } = await client
    .from(SIGNUPS)
    .select("id, email_verified_at")
    .eq("phone", input.phone)
    .limit(5);
  if (phoneError) throw new Error(phoneError.message);
  for (const row of (phoneOwner ?? []) as { id: string; email_verified_at: string | null }[]) {
    if (row.id === existing?.id) continue;
    if (row.email_verified_at) return { ok: false, error: "phone_taken" };
    await deleteUnverifiedSignup(row.id);
  }

  const payload = {
    first_name: input.firstName.trim(),
    last_name: input.lastName.trim(),
    email,
    phone: input.phone,
    ip_hash: input.ipHash,
    locale: parseSiteLocale(input.locale),
    email_confirmed_at: null as string | null,
    ...(isTesterEmail(email) ? { is_tester: true } : {}),
  };

  if (existing) {
    const { error } = await client.from(SIGNUPS).update(payload).eq("id", existing.id);
    if (error) {
      if (isUniqueViolation(error)) return { ok: false, error: uniqueField(error) };
      throw new Error(error.message);
    }
    return { ok: true, id: existing.id, firstName: payload.first_name };
  }

  const { data, error } = await client.from(SIGNUPS).insert(payload).select("id").single();
  if (error) {
    if (isUniqueViolation(error)) return { ok: false, error: uniqueField(error) };
    throw new Error(error.message);
  }
  return { ok: true, id: (data as { id: string }).id, firstName: payload.first_name };
}

export async function savePendingSignup(
  draft: WaitlistDraft,
): Promise<{ ok: true; id: string; firstName: string } | { ok: false; error: WaitlistError }> {
  const client = admin();
  if (!client) return unavailable();
  const problem = validateDraft(draft);
  if (problem) return { ok: false, error: problem };

  const email = normalizeEmail(draft.email);
  const found = await findByEmail(email);
  const existing = await releaseVerifiedTesterSignup(found, email);
  if (existing === "unavailable") return unavailable();

  let referred: string | null = null;
  if (draft.referralCode && client) {
    const code = normalizeCode(draft.referralCode);
    if (isVibeUpCode(code)) {
      const { data: ref, error: refError } = await client
        .from(SIGNUPS)
        .select("id, email, username, phone, vibeup_code")
        .eq("vibeup_code", code)
        .not("email_verified_at", "is", null)
        .maybeSingle();
      if (refError) throw new Error(refError.message);
      if (ref) {
        const owner = ref as {
          id: string;
          email: string;
          username: string | null;
          phone: string | null;
          vibeup_code: string;
        };
        const samePerson = owner.email === email || owner.id === existing?.id;
        if (samePerson) return { ok: false, error: "own_code" };
        referred = owner.vibeup_code;
      }
    }
  }

  if (existing?.email_verified_at) return { ok: false, error: "email_taken" };

  const birthday = draft.birthDate;
  const now = new Date().toISOString();
  const payload = {
    first_name: draft.firstName.trim(),
    last_name: draft.lastName.trim(),
    email,
    birth_date: birthday,
    birth_year: Number(birthday.slice(0, 4)),
    referred_by_code: referred,
    dream_venue: draft.dreamVenueUndecided ? null : draft.dreamVenue,
    dream_venue_undecided: draft.dreamVenueUndecided === true,
    consent_privacy_at: now,
    consent_rules_at: now,
    consent_marketing: draft.consentMarketing,
    ip_hash: draft.ipHash,
    locale: parseSiteLocale(draft.locale),
    ...(isTesterEmail(email) ? { is_tester: true } : {}),
  };

  if (existing) {
    const { error } = await client.from(SIGNUPS).update(payload).eq("id", existing.id);
    if (error) {
      if (isUniqueViolation(error)) return { ok: false, error: uniqueField(error) };
      throw new Error(error.message);
    }
    return { ok: true, id: existing.id, firstName: payload.first_name };
  }

  const { data, error } = await client
    .from(SIGNUPS)
    .insert(payload)
    .select("id")
    .single();
  if (error) {
    if (isUniqueViolation(error)) return { ok: false, error: uniqueField(error) };
    throw new Error(error.message);
  }
  return { ok: true, id: (data as { id: string }).id, firstName: payload.first_name };
}

/** Optional school and venue, saved after the signup is already complete. */
export async function saveSignupDetails(
  signupId: string,
  input: { highSchool: string; dreamVenue: string },
): Promise<{ ok: true } | { ok: false; error: WaitlistError }> {
  const client = admin();
  if (!client || !isUuid(signupId)) return { ok: false, error: "invalid" };
  const school = input.highSchool.trim();
  const venue = cleanDreamVenue(input.dreamVenue);
  const patch: { high_school?: string; dream_venue?: string; dream_venue_undecided?: boolean } = {};
  if (school) {
    if (!isHighSchool(school)) return { ok: false, error: "invalid" };
    patch.high_school = school;
  }
  if (input.dreamVenue.trim()) {
    if (!venue) return { ok: false, error: "invalid" };
    patch.dream_venue = venue;
    patch.dream_venue_undecided = false;
  }
  if (!patch.high_school && !patch.dream_venue) return { ok: false, error: "invalid" };
  const { data, error } = await client
    .from(SIGNUPS)
    .update(patch)
    .eq("id", signupId)
    .not("email_verified_at", "is", null)
    .select("id")
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) return { ok: false, error: "not_found" };
  return { ok: true };
}

/** Append-only. A later revocation inserts another row; it does not update this one. */
export async function recordConsents(input: {
  signupId: string;
  marketing: boolean;
  ipHash: string | null;
  userAgent: string | null;
}) {
  const client = admin();
  if (!client) return unavailable();
  const rows = [
    { kind: "privacy", granted: true, text_version: LEGAL_VERSIONS.privacy },
    { kind: "rules", granted: true, text_version: LEGAL_VERSIONS.rules },
    { kind: "marketing", granted: input.marketing, text_version: LEGAL_VERSIONS.marketing },
  ].map((row) => ({
    signup_id: input.signupId,
    kind: row.kind,
    granted: row.granted,
    text_version: row.text_version,
    ip_hash: input.ipHash,
    user_agent: input.userAgent,
  }));
  const { error } = await client.from("consent_log").insert(rows);
  if (error) throw new Error(error.message);
  return { ok: true as const };
}

export async function issueEmailCode(
  signupId: string,
  options?: { enforceWait?: boolean },
): Promise<
  | { ok: true; code: string; confirmToken: string; email: string; firstName: string; sentAt: string }
  | { ok: false; error: WaitlistError; retryAfter?: number }
> {
  const client = admin();
  if (!client) return unavailable();
  const { data: signup, error } = await client
    .from(SIGNUPS)
    .select("id, email, first_name, email_verified_at")
    .eq("id", signupId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!signup) return { ok: false, error: "not_found" };
  const row = signup as SignupRow;
  if (row.email_verified_at) return { ok: false, error: "email_taken" };

  const { data: current, error: codeError } = await client
    .from(CODES)
    .select("sent_at, code_hash")
    .eq("signup_id", signupId)
    .maybeSingle();
  if (codeError) throw new Error(codeError.message);
  const currentCode = current as { sent_at?: string; code_hash?: string } | null;
  if (options?.enforceWait && currentCode?.sent_at) {
    const elapsed = Date.now() - new Date(currentCode.sent_at).getTime();
    if (elapsed < RESEND_WAIT_MS) {
      return {
        ok: false,
        error: "wait",
        retryAfter: Math.ceil((RESEND_WAIT_MS - elapsed) / 1000),
      };
    }
  }

  const code = createVerificationCode();
  const confirmToken = createConfirmToken();
  const sentAt = new Date().toISOString();
  const expiresAt = new Date(Date.now() + verificationTtlMs()).toISOString();
  const { error: clearError } = await client
    .from(SIGNUPS)
    .update({ email_confirmed_at: null })
    .eq("id", signupId);
  if (clearError) throw new Error(clearError.message);
  const { error: upsertError } = await client.from(CODES).upsert(
    {
      signup_id: signupId,
      code_hash: hashVerificationCode(code),
      previous_code_hash: currentCode?.code_hash ?? null,
      confirm_token_hash: hashConfirmToken(confirmToken),
      expires_at: expiresAt,
      attempts: 0,
      sent_at: sentAt,
    },
    { onConflict: "signup_id" },
  );
  if (upsertError) throw new Error(upsertError.message);
  return { ok: true, code, confirmToken, email: row.email, firstName: row.first_name, sentAt };
}

function makeVibeUpCode() {
  let body = "";
  for (let index = 0; index < 5; index += 1) {
    body += CODE_ALPHABET[randomInt(0, CODE_ALPHABET.length)];
  }
  return `VU-${body}`;
}

async function assignVibeUpCode(signupId: string): Promise<
  | { ok: true; vibeupCode: string; email: string; firstName: string; welcomePending: boolean }
  | { ok: false; error: WaitlistError }
> {
  const client = admin();
  if (!client) return unavailable();
  const { data: signup, error: signupError } = await client
    .from(SIGNUPS)
    .select("id, email, first_name, referred_by_code, email_verified_at, vibeup_code, welcome_email_sent_at")
    .eq("id", signupId)
    .maybeSingle();
  if (signupError) throw new Error(signupError.message);
  if (!signup) return { ok: false, error: "not_found" };
  const current = signup as {
    id: string;
    email: string;
    first_name: string;
    referred_by_code: string | null;
    email_verified_at: string | null;
    vibeup_code: string | null;
    welcome_email_sent_at: string | null;
  };
  if (current.email_verified_at && current.vibeup_code) {
    return {
      ok: true,
      vibeupCode: current.vibeup_code,
      email: current.email,
      firstName: current.first_name,
      welcomePending: !current.welcome_email_sent_at,
    };
  }

  let vibeupCode = "";
  let writes = 0;
  let spins = 0;
  while (writes < 5 && !vibeupCode && spins < 20) {
    spins += 1;
    const next = makeVibeUpCode();
    if (next === current.referred_by_code) continue;
    const { data: taken, error: takenError } = await client
      .from(SIGNUPS)
      .select("id")
      .eq("vibeup_code", next)
      .maybeSingle();
    if (takenError) throw new Error(takenError.message);
    if (taken) {
      writes += 1;
      continue;
    }
    const { data: saved, error: updateError } = await client
      .from(SIGNUPS)
      .update({
        vibeup_code: next,
        email_verified_at: new Date().toISOString(),
      })
      .eq("id", signupId)
      .is("email_verified_at", null)
      .select("id")
      .maybeSingle();
    if (updateError) {
      if (!isUniqueViolation(updateError)) throw new Error(updateError.message);
      writes += 1;
      continue;
    }
    if (!saved) {
      const again = await client.from(SIGNUPS).select("vibeup_code").eq("id", signupId).maybeSingle();
      const existing = (again.data as { vibeup_code: string | null } | null)?.vibeup_code;
      if (existing) vibeupCode = existing;
      break;
    }
    vibeupCode = next;
  }
  if (!vibeupCode) {
    console.error(`[welcome] impossibile assegnare un VibeUpcode univoco a ${signupId} dopo 5 tentativi`);
    return unavailable();
  }
  return {
    ok: true,
    vibeupCode,
    email: current.email,
    firstName: current.first_name,
    welcomePending: true,
  };
}

export async function verifyEmailCode(
  signupId: string,
  code: string,
): Promise<
  | {
      ok: true;
      vibeupCode: string;
      email: string;
      firstName: string;
      welcomePending: boolean;
      confirmed: boolean;
    }
  | { ok: false; error: WaitlistError }
> {
  const client = admin();
  if (!client) return unavailable();
  const digits = code.replace(/\D/g, "");
  if (!/^\d{6}$/.test(digits)) return { ok: false, error: "mismatch" };

  const { data, error } = await client
    .from(CODES)
    .select("signup_id, code_hash, previous_code_hash, confirm_token_hash, expires_at, attempts, sent_at")
    .eq("signup_id", signupId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) return { ok: false, error: "not_found" };
  const row = data as CodeRow & { previous_code_hash?: string | null };
  if (row.attempts >= CODE_MAX_ATTEMPTS) return { ok: false, error: "locked" };
  if (new Date(row.expires_at).getTime() <= Date.now()) {
    await client.from(CODES).delete().eq("signup_id", signupId);
    return { ok: false, error: "expired" };
  }
  if (row.previous_code_hash && verificationCodesMatch(row.previous_code_hash, digits)) {
    return { ok: false, error: "replaced" };
  }
  if (!verificationCodesMatch(row.code_hash, digits)) {
    await client
      .from(CODES)
      .update({ attempts: row.attempts + 1 })
      .eq("signup_id", signupId);
    if (row.attempts + 1 >= CODE_MAX_ATTEMPTS) return { ok: false, error: "locked" };
    return { ok: false, error: "mismatch" };
  }

  return finishEmailProof(signupId);
}

export async function confirmEmailToken(signupId: string, token: string) {
  const client = admin();
  if (!client || !isUuid(signupId) || !token) return { ok: false as const, error: "not_found" as const };
  const { data, error } = await client
    .from(CODES)
    .select("confirm_token_hash, expires_at")
    .eq("signup_id", signupId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) return { ok: false as const, error: "not_found" as const };
  const row = data as { confirm_token_hash: string | null; expires_at: string };
  if (!row.confirm_token_hash || !confirmTokenMatches(row.confirm_token_hash, token)) {
    return { ok: false as const, error: "mismatch" as const };
  }
  if (new Date(row.expires_at).getTime() <= Date.now()) {
    await client.from(CODES).delete().eq("signup_id", signupId);
    return { ok: false as const, error: "expired" as const };
  }
  return finishEmailProof(signupId);
}

async function finishEmailProof(signupId: string): Promise<
  | {
      ok: true;
      vibeupCode: string;
      email: string;
      firstName: string;
      welcomePending: boolean;
      confirmed: boolean;
    }
  | { ok: false; error: WaitlistError }
> {
  const client = admin();
  if (!client) return unavailable();
  const { data: signup, error: signupError } = await client
    .from(SIGNUPS)
    .select(
      "id, email, first_name, birth_date, consent_privacy_at, consent_rules_at, email_verified_at, vibeup_code, welcome_email_sent_at",
    )
    .eq("id", signupId)
    .maybeSingle();
  if (signupError) throw new Error(signupError.message);
  if (!signup) return { ok: false, error: "not_found" };
  const current = signup as {
    id: string;
    email: string;
    first_name: string;
    birth_date: string | null;
    consent_privacy_at: string | null;
    consent_rules_at: string | null;
    email_verified_at: string | null;
    vibeup_code: string | null;
    welcome_email_sent_at: string | null;
  };
  if (current.email_verified_at && current.vibeup_code) {
    await client.from(CODES).delete().eq("signup_id", signupId);
    await ensureDemoAccessToken(signupId).catch((tokenError: unknown) => {
      console.error("[demo-access] token non creato", tokenError instanceof Error ? tokenError.message : tokenError);
    });
    return {
      ok: true,
      vibeupCode: current.vibeup_code,
      email: current.email,
      firstName: current.first_name,
      welcomePending: !current.welcome_email_sent_at,
      confirmed: false,
    };
  }

  const profileReady = Boolean(current.birth_date && current.consent_privacy_at && current.consent_rules_at);
  if (!profileReady) {
    const { error: confirmError } = await client
      .from(SIGNUPS)
      .update({ email_confirmed_at: new Date().toISOString() })
      .eq("id", signupId);
    if (confirmError) throw new Error(confirmError.message);
    await client.from(CODES).delete().eq("signup_id", signupId);
    return {
      ok: true,
      vibeupCode: "",
      email: current.email,
      firstName: current.first_name,
      welcomePending: false,
      confirmed: true,
    };
  }

  const granted = await assignVibeUpCode(signupId);
  if (!granted.ok) return granted;
  await client.from(CODES).delete().eq("signup_id", signupId);
  await ensureDemoAccessToken(signupId).catch((tokenError: unknown) => {
    console.error("[demo-access] token non creato", tokenError instanceof Error ? tokenError.message : tokenError);
  });
  return { ...granted, confirmed: false };
}

/** Profile and consents for an email that was already confirmed. Assigns the VibeUpcode. */
export async function finishConfirmedSignup(
  signupId: string,
  draft: WaitlistDraft,
  consent: { ipHash: string | null; userAgent: string | null },
): Promise<
  | { ok: true; id: string; firstName: string; email: string; vibeupCode: string; welcomePending: boolean }
  | { ok: false; error: WaitlistError }
> {
  const client = admin();
  if (!client) return unavailable();
  const problem = validateDraft(draft);
  if (problem) return { ok: false, error: problem };

  const { data, error } = await client
    .from(SIGNUPS)
    .select("id, email, first_name, email_confirmed_at, email_verified_at, vibeup_code, welcome_email_sent_at")
    .eq("id", signupId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) return { ok: false, error: "not_found" };
  const row = data as {
    id: string;
    email: string;
    first_name: string;
    email_confirmed_at: string | null;
    email_verified_at: string | null;
    vibeup_code: string | null;
    welcome_email_sent_at: string | null;
  };
  if (normalizeEmail(draft.email) !== row.email) return { ok: false, error: "invalid" };
  if (row.email_verified_at && row.vibeup_code) {
    return {
      ok: true,
      id: row.id,
      firstName: row.first_name,
      email: row.email,
      vibeupCode: row.vibeup_code,
      welcomePending: !row.welcome_email_sent_at,
    };
  }
  if (!row.email_confirmed_at) return { ok: false, error: "invalid" };

  const saved = await savePendingSignup(draft);
  if (!saved.ok) return saved;
  const logged = await recordConsents({
    signupId: saved.id,
    marketing: draft.consentMarketing,
    ipHash: consent.ipHash,
    userAgent: consent.userAgent,
  });
  if (!logged.ok) return unavailable();
  const granted = await assignVibeUpCode(saved.id);
  if (!granted.ok) return granted;
  return {
    ok: true,
    id: saved.id,
    firstName: granted.firstName,
    email: granted.email,
    vibeupCode: granted.vibeupCode,
    welcomePending: granted.welcomePending,
  };
}

export async function findVerifiedSignup(signupId: string) {
  const client = admin();
  if (!client || !isUuid(signupId)) return null;
  const { data, error } = await client
    .from(SIGNUPS)
    .select("id, email, first_name, phone, vibeup_code, email_verified_at")
    .eq("id", signupId)
    .not("email_verified_at", "is", null)
    .maybeSingle();
  if (error) throw new Error(error.message);
  const row = data as {
    id: string;
    email: string;
    first_name: string;
    phone: string;
    vibeup_code: string | null;
  } | null;
  if (!row?.vibeup_code) return null;
  return {
    id: row.id,
    email: row.email,
    firstName: row.first_name,
    phone: row.phone,
    vibeupCode: row.vibeup_code,
  };
}

const UNVERIFIED_TTL_MS = 7 * 24 * 60 * 60 * 1000;

/** Drop expired email codes and signups that never finished within 7 days. */
export async function purgeWaitlistRetention() {
  const client = admin();
  if (!client) return null;
  const now = new Date().toISOString();
  const cutoff = new Date(Date.now() - UNVERIFIED_TTL_MS).toISOString();

  const codes = await client.from(CODES).delete().lt("expires_at", now).select("signup_id");
  if (codes.error) throw new Error(codes.error.message);

  const privacy = await client
    .from("waitlist_privacy_codes")
    .delete()
    .lt("expires_at", now)
    .select("email");
  if (privacy.error) throw new Error(privacy.error.message);

  const signups = await client
    .from(SIGNUPS)
    .delete()
    .is("email_verified_at", null)
    .lt("created_at", cutoff)
    .select("id");
  if (signups.error) throw new Error(signups.error.message);

  return {
    expiredCodes: codes.data?.length ?? 0,
    expiredPrivacyCodes: privacy.data?.length ?? 0,
    unverifiedSignups: signups.data?.length ?? 0,
  };
}

export type VerifyMailStatus = "sent" | "delivered" | "bounced" | "complained" | "delayed" | "error";

export async function recordVerifyMail(signupId: string, status: VerifyMailStatus, mailId: string | null) {
  const client = admin();
  if (!client || !isUuid(signupId)) return;
  await client
    .from(SIGNUPS)
    .update({
      verify_mail_status: status,
      verify_mail_id: mailId,
      verify_mail_at: new Date().toISOString(),
    })
    .eq("id", signupId);
}

export async function readVerifyMail(signupId: string) {
  const client = admin();
  if (!client || !isUuid(signupId)) return null;
  const { data, error } = await client
    .from(SIGNUPS)
    .select("verify_mail_status")
    .eq("id", signupId)
    .maybeSingle();
  if (error || !data) return null;
  const status = (data as { verify_mail_status?: string | null }).verify_mail_status ?? null;
  return status;
}

export async function applyVerifyMailEvent(input: {
  mailId: string;
  signupId?: string | null;
  status: VerifyMailStatus;
}) {
  const client = admin();
  if (!client) return false;
  const patch = {
    verify_mail_status: input.status,
    verify_mail_at: new Date().toISOString(),
  };
  if (input.mailId) {
    const byId = await client.from(SIGNUPS).update(patch).eq("verify_mail_id", input.mailId).select("id");
    if (!byId.error && (byId.data ?? []).length > 0) return true;
  }
  if (input.signupId && isUuid(input.signupId)) {
    const bySignup = await client.from(SIGNUPS).update(patch).eq("id", input.signupId).select("id");
    return !bySignup.error && (bySignup.data ?? []).length > 0;
  }
  return false;
}

export async function readPendingSignup(signupId: string) {
  const client = admin();
  if (!client || !isUuid(signupId)) return null;
  const { data, error } = await client
    .from(SIGNUPS)
    .select("id, first_name, last_name, email, phone, email_confirmed_at, email_verified_at, vibeup_code")
    .eq("id", signupId)
    .maybeSingle();
  if (error || !data) return null;
  const row = data as {
    id: string;
    first_name: string;
    last_name: string;
    email: string;
    phone: string | null;
    email_confirmed_at: string | null;
    email_verified_at: string | null;
    vibeup_code: string | null;
  };
  if (row.email_verified_at && row.vibeup_code) {
    return { stage: "done" as const, id: row.id, firstName: row.first_name, code: row.vibeup_code, email: row.email };
  }
  const { data: code } = await client.from(CODES).select("expires_at, sent_at").eq("signup_id", signupId).maybeSingle();
  const expires = code ? new Date((code as { expires_at: string }).expires_at).getTime() : 0;
  if (row.email_confirmed_at) {
    return {
      stage: "continue" as const,
      id: row.id,
      firstName: row.first_name,
      lastName: row.last_name,
      email: row.email,
      phone: row.phone ?? "",
    };
  }
  if (!code || expires <= Date.now()) {
    return {
      stage: "hold" as const,
      id: row.id,
      firstName: row.first_name,
      lastName: row.last_name,
      email: row.email,
      phone: row.phone ?? "",
    };
  }
  return {
    stage: "code" as const,
    id: row.id,
    firstName: row.first_name,
    lastName: row.last_name,
    email: row.email,
    phone: row.phone ?? "",
    sentAt: (code as { sent_at: string }).sent_at,
  };
}
