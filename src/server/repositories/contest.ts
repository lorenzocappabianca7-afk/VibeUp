import { contestConfig, inviteCountsForContest } from "@/config/contest";
import { isDisposableEmail } from "@/config/disposable-email-domains";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { listDemoSubmissions } from "@/server/repositories/demo";

const SIGNUPS = "waitlist_signups";
const EXCLUSIONS = "waitlist_contest_exclusions";

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
  welcome_email_sent_at: string | null;
  consent_marketing: boolean;
  contest_excluded: boolean;
  ip_hash: string | null;
  created_at: string;
};

const SIGNUP_COLUMNS =
  "id, first_name, last_name, username, email, phone, birth_year, high_school, dream_venue, vibeup_code, referred_by_code, email_verified_at, welcome_email_sent_at, consent_marketing, contest_excluded, ip_hash, created_at";

function admin() {
  if (!isSupabaseConfigured()) return null;
  return getSupabaseAdmin();
}

async function fetchAllSignups(): Promise<SignupRow[]> {
  const client = admin();
  if (!client) return [];
  const pageSize = 1000;
  const rows: SignupRow[] = [];
  for (let from = 0; ; from += pageSize) {
    const { data, error } = await client
      .from(SIGNUPS)
      .select(SIGNUP_COLUMNS)
      .order("created_at", { ascending: true })
      .range(from, from + pageSize - 1);
    if (error) throw new Error(error.message);
    const page = (data ?? []) as SignupRow[];
    rows.push(...page);
    if (page.length < pageSize) break;
  }
  return rows;
}

function burstIds(
  rows: { id: string; at: number; key: string }[],
  windowMs: number,
  limit: number,
) {
  const groups = new Map<string, { id: string; at: number }[]>();
  for (const row of rows) {
    if (!row.key) continue;
    const list = groups.get(row.key) ?? [];
    list.push({ id: row.id, at: row.at });
    groups.set(row.key, list);
  }
  const flagged = new Set<string>();
  for (const list of groups.values()) {
    list.sort((a, b) => a.at - b.at);
    let start = 0;
    for (let end = 0; end < list.length; end += 1) {
      while (list[end].at - list[start].at > windowMs) start += 1;
      if (end - start + 1 > limit) {
        for (let index = start; index <= end; index += 1) flagged.add(list[index].id);
      }
    }
  }
  return flagged;
}

export function isValidInvite(
  invitee: Pick<SignupRow, "email" | "phone" | "email_verified_at" | "contest_excluded">,
  inviter: Pick<SignupRow, "email" | "phone">,
) {
  if (!inviteCountsForContest(invitee.email_verified_at)) return false;
  if (invitee.contest_excluded) return false;
  if (isDisposableEmail(invitee.email)) return false;
  if (invitee.email.trim().toLowerCase() === inviter.email.trim().toLowerCase()) return false;
  if (invitee.phone === inviter.phone) return false;
  return true;
}

function inviteStats(rows: SignupRow[]) {
  const byCode = new Map<string, SignupRow>();
  for (const row of rows) {
    if (row.vibeup_code) byCode.set(row.vibeup_code, row);
  }
  const stats = new Map<string, { count: number; lastAt: string | null }>();
  for (const row of rows) {
    if (!row.referred_by_code) continue;
    const inviter = byCode.get(row.referred_by_code);
    if (!inviter) continue;
    if (!isValidInvite(row, inviter)) continue;
    const current = stats.get(inviter.id) ?? { count: 0, lastAt: null };
    current.count += 1;
    const at = row.email_verified_at;
    if (at && (!current.lastAt || at > current.lastAt)) current.lastAt = at;
    stats.set(inviter.id, current);
  }
  return stats;
}

export async function countValidInvitesForCode(code: string) {
  const client = admin();
  if (!client || !code) return 0;
  const { data: owner, error: ownerError } = await client
    .from(SIGNUPS)
    .select("email, phone")
    .eq("vibeup_code", code)
    .maybeSingle();
  if (ownerError) throw new Error(ownerError.message);
  if (!owner) return 0;
  const { data, error } = await client
    .from(SIGNUPS)
    .select("email, phone, email_verified_at, contest_excluded")
    .eq("referred_by_code", code);
  if (error) {
    if (!/contest_excluded/i.test(error.message)) throw new Error(error.message);
    const retry = await client
      .from(SIGNUPS)
      .select("email, phone, email_verified_at")
      .eq("referred_by_code", code);
    if (retry.error) throw new Error(retry.error.message);
    const inviter = owner as { email: string; phone: string };
    return ((retry.data ?? []) as SignupRow[]).filter((row) =>
      isValidInvite({ ...row, contest_excluded: false }, inviter),
    ).length;
  }
  const inviter = owner as { email: string; phone: string };
  return ((data ?? []) as SignupRow[]).filter((row) => isValidInvite(row, inviter)).length;
}

function romeDay(iso: string) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Rome",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date(iso));
}

function topNames(values: string[], limit = 8) {
  const counts = new Map<string, { name: string; count: number }>();
  for (const value of values) {
    const name = value.trim();
    if (name.length < 2) continue;
    const key = name.toLowerCase();
    const current = counts.get(key) ?? { name, count: 0 };
    current.count += 1;
    counts.set(key, current);
  }
  return [...counts.values()].sort((a, b) => b.count - a.count || a.name.localeCompare(b.name, "it")).slice(0, limit);
}

function lastDays(count: number) {
  const days: string[] = [];
  const now = new Date();
  for (let offset = count - 1; offset >= 0; offset -= 1) {
    const day = new Date(now.getTime() - offset * 24 * 60 * 60 * 1000);
    days.push(romeDay(day.toISOString()));
  }
  return days;
}

export async function loadContestAdmin() {
  const rows = await fetchAllSignups();
  const client = admin();
  const exclusions = new Map<string, { excluded: boolean; reason: string; at: string }>();
  if (client) {
    const { data, error } = await client
      .from(EXCLUSIONS)
      .select("signup_id, excluded, reason, created_at")
      .order("created_at", { ascending: true });
    if (error) throw new Error(error.message);
    for (const row of (data ?? []) as {
      signup_id: string;
      excluded: boolean;
      reason: string;
      created_at: string;
    }[]) {
      exclusions.set(row.signup_id, {
        excluded: row.excluded,
        reason: row.reason,
        at: row.created_at,
      });
    }
  }

  const ipFlags = burstIds(
    rows
      .filter((row) => row.ip_hash)
      .map((row) => ({
        id: row.id,
        at: Date.parse(row.created_at),
        key: row.ip_hash ?? "",
      })),
    contestConfig.ipBurstWindowMs,
    contestConfig.ipBurstLimit,
  );
  const referralFlags = burstIds(
    rows
      .filter((row) => row.referred_by_code)
      .map((row) => ({
        id: row.id,
        at: Date.parse(row.created_at),
        key: row.referred_by_code ?? "",
      })),
    contestConfig.referralBurstWindowMs,
    contestConfig.referralBurstLimit,
  );
  const hotCodes = new Set<string>();
  for (const row of rows) {
    if (row.referred_by_code && referralFlags.has(row.id)) hotCodes.add(row.referred_by_code);
  }

  const invites = inviteStats(rows);

  function flagsFor(row: SignupRow) {
    const flags: string[] = [];
    if (isDisposableEmail(row.email)) flags.push("Email temporanea");
    if (ipFlags.has(row.id)) flags.push("Più di 5 iscrizioni dallo stesso IP in un'ora");
    if (row.referred_by_code && referralFlags.has(row.id)) {
      flags.push("Molte iscrizioni con lo stesso codice in pochi minuti");
    }
    if (row.vibeup_code && hotCodes.has(row.vibeup_code)) {
      flags.push("Il suo codice è stato usato a raffica");
    }
    return flags;
  }

  const signups = rows
    .map((row) => {
      const log = exclusions.get(row.id);
      return {
        id: row.id,
        firstName: row.first_name,
        lastName: row.last_name,
        username: row.username,
        email: row.email,
        phone: row.phone,
        birthYear: row.birth_year,
        highSchool: row.high_school,
        dreamVenue: row.dream_venue,
        vibeupCode: row.vibeup_code,
        referredByCode: row.referred_by_code,
        verified: Boolean(row.email_verified_at),
        emailVerifiedAt: row.email_verified_at,
        welcomeEmailSent: Boolean(row.welcome_email_sent_at),
        marketing: row.consent_marketing,
        createdAt: row.created_at,
        excluded: row.contest_excluded,
        excludedReason: log && log.excluded === row.contest_excluded ? log.reason : null,
        excludedAt: log && log.excluded === row.contest_excluded ? log.at : null,
        flags: flagsFor(row),
        validInvites: invites.get(row.id)?.count ?? 0,
        lastInviteAt: invites.get(row.id)?.lastAt ?? null,
      };
    })
    .reverse();

  const ranked = signups
    .filter((row) => row.verified && row.vibeupCode && !row.excluded)
    .sort((a, b) => {
      if (b.validInvites !== a.validInvites) return b.validInvites - a.validInvites;
      if (a.validInvites === 0) {
        return (a.emailVerifiedAt ?? "").localeCompare(b.emailVerifiedAt ?? "");
      }
      const last = (a.lastInviteAt ?? "").localeCompare(b.lastInviteAt ?? "");
      if (last !== 0) return last;
      return (a.emailVerifiedAt ?? "").localeCompare(b.emailVerifiedAt ?? "");
    });
  const leaderboard = [
    ...ranked.map((row, index) => ({ ...row, position: index + 1 })),
    ...signups
      .filter((row) => row.verified && row.vibeupCode && row.excluded)
      .map((row) => ({ ...row, position: null as number | null })),
  ];

  const dayKeys = lastDays(14);
  const dayCounts = new Map(dayKeys.map((day) => [day, 0]));
  for (const row of rows) {
    const day = romeDay(row.created_at);
    if (dayCounts.has(day)) dayCounts.set(day, (dayCounts.get(day) ?? 0) + 1);
  }

  let demoCompleted = 0;
  let demoRated = 0;
  let demoRatingSum = 0;
  try {
    const demos = await listDemoSubmissions();
    for (const demo of demos) {
      if (demo.payload.completed === true) demoCompleted += 1;
      const rating = typeof demo.payload.rating === "number" ? demo.payload.rating : Number(demo.payload.rating);
      if (demo.payload.completed === true && Number.isInteger(rating) && rating >= 1 && rating <= 5) {
        demoRated += 1;
        demoRatingSum += rating;
      }
    }
  } catch {
    demoCompleted = 0;
    demoRated = 0;
    demoRatingSum = 0;
  }

  return {
    signups,
    leaderboard,
    stats: {
      total: rows.length,
      verified: rows.filter((row) => row.email_verified_at).length,
      perDay: dayKeys.map((day) => ({ day, count: dayCounts.get(day) ?? 0 })),
      schools: topNames(rows.map((row) => row.high_school)),
      venues: topNames(rows.map((row) => row.dream_venue ?? "")),
      demoCompleted,
      demoAverageRating: demoRated > 0 ? Math.round((demoRatingSum / demoRated) * 10) / 10 : null,
      demoRated,
    },
  };
}

export async function setContestExclusion(signupId: string, excluded: boolean, reason: string) {
  const client = admin();
  if (!client) return { ok: false as const, error: "unavailable" as const };
  const clean = reason.trim();
  if (clean.length < 3 || clean.length > 400) return { ok: false as const, error: "reason" as const };
  const { data, error } = await client
    .from(SIGNUPS)
    .update({ contest_excluded: excluded })
    .eq("id", signupId)
    .select("id")
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) return { ok: false as const, error: "not_found" as const };
  const { error: logError } = await client.from(EXCLUSIONS).insert({
    signup_id: signupId,
    excluded,
    reason: clean,
  });
  if (logError) throw new Error(logError.message);
  return { ok: true as const };
}
