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
  cleanVenue,
  isAtLeast14OnDate,
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
  createVerificationCode,
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
  | "wait";

export type WaitlistDraft = {
  firstName: string;
  lastName: string;
  email: string;
  birthDate: string;
  highSchool: string;
  dreamVenue: string | null;
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
  let query = client.from(SIGNUPS).select("id").ilike("username", escapeLike(name)).limit(1);
  if (exceptId) query = query.neq("id", exceptId);
  const { data, error } = await query;
  if (error) throw new Error(error.message);
  return (data ?? []).length === 0;
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
  const client = admin();
  if (!client || !isUuid(signupId)) return "it";
  const { data, error } = await client.from(SIGNUPS).select("locale").eq("id", signupId).maybeSingle();
  if (error) return "it";
  return parseSiteLocale((data as { locale?: string } | null)?.locale);
}

export async function startEmailSignup(input: {
  firstName: string;
  lastName: string;
  email: string;
  ipHash: string | null;
  locale?: DemoLanguage;
}): Promise<{ ok: true; id: string; firstName: string } | { ok: false; error: WaitlistError }> {
  const client = admin();
  if (!client) return unavailable();
  if (!isPersonName(input.firstName) || !isPersonName(input.lastName)) return { ok: false, error: "invalid" };
  const email = normalizeEmail(input.email);
  if (!isEmailAddress(email)) return { ok: false, error: "invalid" };

  const found = await findByEmail(email);
  const existing = await releaseVerifiedTesterSignup(found, email);
  if (existing === "unavailable") return unavailable();
  if (existing?.email_verified_at) return { ok: false, error: "email_taken" };

  const payload = {
    first_name: input.firstName.trim(),
    last_name: input.lastName.trim(),
    email,
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
  const venue = cleanVenue(input.dreamVenue);
  const patch: { high_school?: string; dream_venue?: string } = {};
  if (school) {
    if (!isHighSchool(school)) return { ok: false, error: "invalid" };
    patch.high_school = school;
  }
  if (venue) {
    if (venue.length < 2) return { ok: false, error: "invalid" };
    patch.dream_venue = venue;
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
  | { ok: true; code: string; email: string; firstName: string; sentAt: string }
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
    .select("sent_at")
    .eq("signup_id", signupId)
    .maybeSingle();
  if (codeError) throw new Error(codeError.message);
  if (options?.enforceWait && current?.sent_at) {
    const elapsed = Date.now() - new Date(current.sent_at as string).getTime();
    if (elapsed < RESEND_WAIT_MS) {
      return {
        ok: false,
        error: "wait",
        retryAfter: Math.ceil((RESEND_WAIT_MS - elapsed) / 1000),
      };
    }
  }

  const code = createVerificationCode();
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
      expires_at: expiresAt,
      attempts: 0,
      sent_at: sentAt,
    },
    { onConflict: "signup_id" },
  );
  if (upsertError) throw new Error(upsertError.message);
  return { ok: true, code, email: row.email, firstName: row.first_name, sentAt };
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
    .select("signup_id, code_hash, expires_at, attempts, sent_at")
    .eq("signup_id", signupId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) return { ok: false, error: "not_found" };
  const row = data as CodeRow;
  if (row.attempts >= CODE_MAX_ATTEMPTS) return { ok: false, error: "locked" };
  if (new Date(row.expires_at).getTime() <= Date.now()) {
    await client.from(CODES).delete().eq("signup_id", signupId);
    return { ok: false, error: "expired" };
  }
  if (!verificationCodesMatch(row.code_hash, digits)) {
    await client
      .from(CODES)
      .update({ attempts: row.attempts + 1 })
      .eq("signup_id", signupId);
    if (row.attempts + 1 >= CODE_MAX_ATTEMPTS) return { ok: false, error: "locked" };
    return { ok: false, error: "mismatch" };
  }

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
