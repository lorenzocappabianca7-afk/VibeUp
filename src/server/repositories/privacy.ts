import { LEGAL_VERSIONS } from "@/content/legal";
import { normalizeEmail } from "@/lib/launch/fields";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import {
  CODE_MAX_ATTEMPTS,
  createVerificationCode,
  hashVerificationCode,
  marketingTokenMatches,
  RESEND_WAIT_MS,
  verificationCodesMatch,
  verificationTtlMs,
} from "@/server/launch/code-mail";

const SIGNUPS = "waitlist_signups";
const CONSENTS = "consent_log";
const CODES = "waitlist_privacy_codes";
const ANONYMOUS = "waitlist_anonymous_referrals";

type SignupRow = {
  id: string;
  first_name: string;
  last_name: string;
  username: string;
  email: string;
  phone: string;
  birth_year: number;
  high_school: string;
  dream_venue: string | null;
  vibeup_code: string | null;
  referred_by_code: string | null;
  email_verified_at: string | null;
  consent_privacy_at: string | null;
  consent_rules_at: string | null;
  consent_marketing: boolean;
  created_at: string;
};

type CodeRow = {
  email: string;
  code_hash: string;
  expires_at: string;
  attempts: number;
};

function admin() {
  if (!isSupabaseConfigured()) return null;
  return getSupabaseAdmin();
}

export async function issuePrivacyCode(email: string) {
  const client = admin();
  if (!client) return { ok: false as const, error: "unavailable" as const };
  const normalized = normalizeEmail(email);
  const { data, error } = await client
    .from(SIGNUPS)
    .select("id, email")
    .eq("email", normalized)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) return { ok: true as const, sent: false as const };

  const { data: current, error: currentError } = await client
    .from(CODES)
    .select("sent_at")
    .eq("email", normalized)
    .maybeSingle();
  if (currentError) throw new Error(currentError.message);
  if (current?.sent_at) {
    const elapsed = Date.now() - new Date(current.sent_at as string).getTime();
    if (elapsed < RESEND_WAIT_MS) return { ok: true as const, sent: false as const };
  }

  const code = createVerificationCode();
  const { error: upsertError } = await client.from(CODES).upsert(
    {
      email: normalized,
      code_hash: hashVerificationCode(code),
      expires_at: new Date(Date.now() + verificationTtlMs()).toISOString(),
      attempts: 0,
      sent_at: new Date().toISOString(),
    },
    { onConflict: "email" },
  );
  if (upsertError) throw new Error(upsertError.message);
  return {
    ok: true as const,
    sent: true as const,
    code,
    signupId: (data as { id: string }).id,
    email: normalized,
  };
}

async function readPrivacyCode(email: string, code: string) {
  const client = admin();
  if (!client) return { ok: false as const, error: "unavailable" as const };
  const normalized = normalizeEmail(email);
  const digits = code.replace(/\D/g, "");
  if (!/^\d{6}$/.test(digits)) return { ok: false as const, error: "mismatch" as const };

  const { data, error } = await client
    .from(CODES)
    .select("email, code_hash, expires_at, attempts")
    .eq("email", normalized)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) return { ok: false as const, error: "mismatch" as const };
  const row = data as CodeRow;
  if (row.attempts >= CODE_MAX_ATTEMPTS) return { ok: false as const, error: "locked" as const };
  if (new Date(row.expires_at).getTime() <= Date.now()) {
    await client.from(CODES).delete().eq("email", normalized);
    return { ok: false as const, error: "expired" as const };
  }
  if (!verificationCodesMatch(row.code_hash, digits)) {
    await client
      .from(CODES)
      .update({ attempts: row.attempts + 1 })
      .eq("email", normalized);
    if (row.attempts + 1 >= CODE_MAX_ATTEMPTS) return { ok: false as const, error: "locked" as const };
    return { ok: false as const, error: "mismatch" as const };
  }
  return { ok: true as const, email: normalized };
}

async function loadSignup(email: string) {
  const client = admin();
  if (!client) return null;
  const { data, error } = await client
    .from(SIGNUPS)
    .select(
      "id, first_name, last_name, username, email, phone, birth_year, high_school, dream_venue, vibeup_code, referred_by_code, email_verified_at, consent_privacy_at, consent_rules_at, consent_marketing, created_at",
    )
    .eq("email", email)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return (data as SignupRow | null) ?? null;
}

export async function exportSignupData(email: string, code: string) {
  const check = await readPrivacyCode(email, code);
  if (!check.ok) return check;
  const signup = await loadSignup(check.email);
  if (!signup) return { ok: false as const, error: "mismatch" as const };
  const client = admin();
  if (!client) return { ok: false as const, error: "unavailable" as const };
  const { data, error } = await client
    .from(CONSENTS)
    .select("kind, granted, text_version, user_agent, created_at")
    .eq("signup_id", signup.id)
    .order("created_at", { ascending: true });
  if (error) throw new Error(error.message);
  return {
    ok: true as const,
    signupId: signup.id,
    export: {
      esportatoIl: new Date().toISOString(),
      iscrizione: {
        id: signup.id,
        nome: signup.first_name,
        cognome: signup.last_name,
        nomeUtente: signup.username,
        email: signup.email,
        telefono: signup.phone,
        annoDiNascita: signup.birth_year,
        liceo: signup.high_school,
        localeDesiderato: signup.dream_venue,
        vibeupCode: signup.vibeup_code,
        codiceAmico: signup.referred_by_code,
        emailVerificataIl: signup.email_verified_at,
        consensoPrivacyIl: signup.consent_privacy_at,
        consensoRegolamentoIl: signup.consent_rules_at,
        consensoMarketing: signup.consent_marketing,
        iscrittoIl: signup.created_at,
      },
      consensi: (data ?? []).map((row) => ({
        tipo: row.kind,
        accettato: row.granted,
        versione: row.text_version,
        browser: row.user_agent,
        il: row.created_at,
      })),
    },
  };
}

export async function deleteSignupData(email: string, code: string) {
  const check = await readPrivacyCode(email, code);
  if (!check.ok) return check;
  const client = admin();
  if (!client) return { ok: false as const, error: "unavailable" as const };
  const signup = await loadSignup(check.email);
  if (!signup) return { ok: false as const, error: "mismatch" as const };

  if (signup.vibeup_code) {
    const { count, error: countError } = await client
      .from(SIGNUPS)
      .select("id", { count: "exact", head: true })
      .eq("referred_by_code", signup.vibeup_code);
    if (countError) throw new Error(countError.message);
    const inviteCount = count ?? 0;
    if (inviteCount > 0) {
      const { error: ledgerError } = await client
        .from(ANONYMOUS)
        .insert({ invite_count: inviteCount });
      if (ledgerError) throw new Error(ledgerError.message);
      const { error: clearError } = await client
        .from(SIGNUPS)
        .update({ referred_by_code: null })
        .eq("referred_by_code", signup.vibeup_code);
      if (clearError) throw new Error(clearError.message);
    }
  }

  const { error: codeError } = await client.from(CODES).delete().eq("email", check.email);
  if (codeError) throw new Error(codeError.message);
  const { error: deleteError } = await client.from(SIGNUPS).delete().eq("id", signup.id);
  if (deleteError) throw new Error(deleteError.message);
  return { ok: true as const, signupId: signup.id };
}

export async function revokeMarketingConsent(
  signupId: string,
  token: string,
  meta: { ipHash: string | null; userAgent: string | null },
) {
  if (!marketingTokenMatches(signupId, token)) return { ok: false as const };
  const client = admin();
  if (!client) return { ok: false as const };
  const { data, error } = await client
    .from(SIGNUPS)
    .select("id, consent_marketing")
    .eq("id", signupId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) return { ok: false as const };
  const row = data as { id: string; consent_marketing: boolean };
  if (!row.consent_marketing) return { ok: true as const };
  const { error: updateError } = await client
    .from(SIGNUPS)
    .update({ consent_marketing: false })
    .eq("id", signupId);
  if (updateError) throw new Error(updateError.message);
  const { error: logError } = await client.from(CONSENTS).insert({
    signup_id: signupId,
    kind: "marketing",
    granted: false,
    text_version: LEGAL_VERSIONS.marketing,
    ip_hash: meta.ipHash,
    user_agent: meta.userAgent,
  });
  if (logError) throw new Error(logError.message);
  return { ok: true as const };
}
