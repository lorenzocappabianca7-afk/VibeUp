import { isValidInvite } from "@/server/repositories/contest";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { isSupabaseConfigured } from "@/lib/supabase/env";

const SIGNUPS = "waitlist_signups";
const CONSENTS = "consent_log";
const DEMOS = "demo_submissions";
const PAGE_SIZE = 50;

const SIGNUP_LIST_COLUMNS =
  "id, created_at, first_name, last_name, username, email, phone, birth_year, high_school, dream_venue, locale, vibeup_code, referred_by_code, email_verified_at, welcome_email_sent_at, consent_privacy_at, consent_rules_at, consent_marketing, contest_excluded";

export type DemoStatus = "none" | "entered" | "completed";

export interface CommunitySignupRow {
  id: string;
  createdAt: string;
  firstName: string;
  lastName: string;
  username: string;
  email: string;
  phone: string;
  birthYear: number | null;
  highSchool: string;
  dreamVenue: string;
  locale: "it" | "en";
  vibeupCode: string;
  referredByCode: string;
  referredByUsername: string;
  validInvites: number;
  verified: boolean;
  welcomeEmailSent: boolean;
  consentPrivacy: boolean;
  consentRules: boolean;
  consentMarketing: boolean;
  demoStatus: DemoStatus;
  demoRating: number | null;
}

export interface CommunityFilters {
  q: string;
  verified: "all" | "yes" | "no";
  school: string;
  venue: string;
  marketing: "all" | "yes" | "no";
  demo: "all" | DemoStatus;
  locale: "all" | "it" | "en";
  sort: string;
  dir: "asc" | "desc";
  page: number;
}

type SignupDb = {
  id: string;
  created_at: string;
  first_name: string;
  last_name: string;
  username: string;
  email: string;
  phone: string | null;
  birth_year: number | null;
  high_school: string | null;
  dream_venue: string | null;
  locale: string | null;
  vibeup_code: string | null;
  referred_by_code: string | null;
  email_verified_at: string | null;
  welcome_email_sent_at: string | null;
  consent_privacy_at: string | null;
  consent_rules_at: string | null;
  consent_marketing: boolean;
  contest_excluded: boolean | null;
};

type DemoDb = {
  id: string;
  payload: Record<string, unknown> | null;
  created_at: string;
  updated_at: string;
};

export interface DemoSummary {
  id: string;
  signupId: string;
  email: string;
  name: string;
  createdAt: string;
  updatedAt: string;
  status: DemoStatus;
  lastStep: string;
  lastStepAt: string | null;
  criteria: Record<string, unknown> | null;
  chosenLocation: string;
  customVenue: string;
  rating: number | null;
  wouldUse: boolean | null;
  durationMs: number | null;
  steps: Record<string, string | null>;
}

function admin() {
  if (!isSupabaseConfigured()) return null;
  return getSupabaseAdmin();
}

function romeDay(iso: string) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Rome",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date(iso));
}

function asText(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : "";
}

function asTime(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function asRating(value: unknown) {
  const rating = typeof value === "number" ? value : Number(value);
  if (!Number.isInteger(rating) || rating < 1 || rating > 5) return null;
  return rating;
}

function locationName(value: unknown) {
  if (!value || typeof value !== "object" || !("name" in value)) return "";
  const row = value as { id?: unknown; name?: unknown };
  if (row.id === "custom-venue") return "";
  return asText(row.name);
}

function chosenName(payload: Record<string, unknown>) {
  return locationName(payload.chosenLocation) || locationName(payload.bookedLocation);
}

function customVenueName(payload: Record<string, unknown>) {
  const raw = payload.custom_venue;
  if (!raw || typeof raw !== "object") return "";
  const row = raw as { name?: unknown; nome?: unknown };
  return asText(row.name ?? row.nome);
}

const STEP_ORDER = [
  ["rating", "Valutazione", "stepRatingAt"],
  ["event", "Evento visto", "stepEventAt"],
  ["request", "Richiesta inviata", "stepRequestAt"],
  ["location", "Location scelta", "stepLocationAt"],
  ["criteria", "Criteri festa", "stepCriteriaAt"],
  ["entered", "Ingresso", "stepEnteredAt"],
] as const;

export function summarizeDemo(row: DemoDb): DemoSummary {
  const payload = row.payload ?? {};
  const steps: Record<string, string | null> = {
    stepEnteredAt: asTime(payload.stepEnteredAt) ?? asTime(payload.sessionCreatedAt),
    stepCriteriaAt: asTime(payload.stepCriteriaAt),
    stepLocationAt:
      asTime(payload.stepLocationAt) ??
      (chosenName(payload) ? asTime(payload.sessionCreatedAt) ?? row.created_at : null),
    stepRequestAt:
      asTime(payload.stepRequestAt) ??
      (payload.bookingConfirmed === true ? asTime(payload.bookingConfirmedAt) : null),
    stepEventAt: asTime(payload.stepEventAt),
    stepRatingAt: asTime(payload.stepRatingAt) ?? asTime(payload.completedAt),
  };
  let lastStep = "Ingresso";
  let lastStepAt = steps.stepEnteredAt;
  for (const [, label, key] of STEP_ORDER) {
    const at = steps[key];
    if (at) {
      lastStep = label;
      lastStepAt = at;
      break;
    }
  }
  const rating = asRating(payload.rating);
  const completed = payload.completed === true || rating != null;
  const entered = Boolean(steps.stepEnteredAt || row.created_at);
  const start = Date.parse(steps.stepEnteredAt ?? row.created_at);
  const end = Date.parse(lastStepAt ?? row.updated_at);
  const criteria =
    payload.partyCriteria && typeof payload.partyCriteria === "object"
      ? (payload.partyCriteria as Record<string, unknown>)
      : null;
  return {
    id: row.id,
    signupId: asText(payload.signup_id),
    email: asText(payload.email).toLowerCase(),
    name: [asText(payload.firstName), asText(payload.lastName)].filter(Boolean).join(" "),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    status: completed ? "completed" : entered ? "entered" : "none",
    lastStep,
    lastStepAt,
    criteria,
    chosenLocation: chosenName(payload),
    customVenue: customVenueName(payload),
    rating,
    wouldUse: typeof payload.wouldUseForEighteenth === "boolean" ? payload.wouldUseForEighteenth : null,
    durationMs: Number.isFinite(start) && Number.isFinite(end) && end >= start ? end - start : null,
    steps,
  };
}

async function loadDemos(): Promise<DemoSummary[]> {
  const client = admin();
  if (!client) return [];
  const rows: DemoDb[] = [];
  for (let from = 0; ; from += 500) {
    const { data, error } = await client
      .from(DEMOS)
      .select("id, payload, created_at, updated_at")
      .order("created_at", { ascending: false })
      .range(from, from + 499);
    if (error) throw new Error(error.message);
    const page = (data ?? []) as DemoDb[];
    rows.push(...page);
    if (page.length < 500) break;
  }
  return attachSignupNames(rows.map(summarizeDemo));
}

async function attachSignupNames(demos: DemoSummary[]) {
  const client = admin();
  if (!client || demos.length === 0) return demos;
  const byId = new Map<string, { id: string; name: string; email: string }>();
  const byEmail = new Map<string, { id: string; name: string; email: string }>();
  async function pull(column: "id" | "email", values: string[]) {
    for (let index = 0; index < values.length; index += 200) {
      const slice = values.slice(index, index + 200);
      if (slice.length === 0) continue;
      const { data, error } = await client!
        .from(SIGNUPS)
        .select("id, first_name, last_name, email")
        .in(column, slice);
      if (error) throw new Error(error.message);
      for (const row of (data ?? []) as {
        id: string;
        first_name: string;
        last_name: string;
        email: string;
      }[]) {
        const card = {
          id: row.id,
          name: [row.first_name, row.last_name].filter(Boolean).join(" "),
          email: row.email.toLowerCase(),
        };
        byId.set(card.id, card);
        byEmail.set(card.email, card);
      }
    }
  }
  await pull(
    "id",
    [...new Set(demos.map((demo) => demo.signupId).filter(Boolean))],
  );
  await pull(
    "email",
    [...new Set(demos.filter((demo) => !demo.signupId && demo.email).map((demo) => demo.email))],
  );
  return demos.map((demo) => {
    const card = (demo.signupId ? byId.get(demo.signupId) : undefined) ?? byEmail.get(demo.email);
    if (!card) return demo;
    return {
      ...demo,
      signupId: demo.signupId || card.id,
      name: demo.name || card.name,
      email: demo.email || card.email,
    };
  });
}

function bestDemo(list: DemoSummary[]) {
  return [...list].sort((a, b) => {
    const rank = (item: DemoSummary) => (item.status === "completed" ? 2 : item.status === "entered" ? 1 : 0);
    if (rank(b) !== rank(a)) return rank(b) - rank(a);
    return (b.lastStepAt ?? b.createdAt).localeCompare(a.lastStepAt ?? a.createdAt);
  })[0];
}

function topCounts(values: string[], limit = 8) {
  const counts = new Map<string, number>();
  for (const value of values) {
    const name = value.trim();
    if (!name) continue;
    const key = name.toLocaleLowerCase("it");
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  return [...counts.entries()]
    .map(([key, count]) => ({
      name: values.find((item) => item.trim().toLocaleLowerCase("it") === key)?.trim() || key,
      count,
    }))
    .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name, "it"))
    .slice(0, limit);
}

function suggestedVenueCounts(values: string[]) {
  const counts = new Map<string, { name: string; count: number }>();
  for (const value of values) {
    const name = value.trim().replace(/\s+/g, " ");
    if (!name) continue;
    const key = name.toLocaleLowerCase("it");
    const current = counts.get(key);
    if (current) current.count += 1;
    else counts.set(key, { name, count: 1 });
  }
  return [...counts.values()].sort(
    (a, b) => b.count - a.count || a.name.localeCompare(b.name, "it"),
  );
}

function percent(part: number, total: number) {
  if (total <= 0) return null;
  return Math.round((part / total) * 1000) / 10;
}

export async function loadCommunityOverview() {
  const client = admin();
  if (!client) throw new Error("Supabase non configurato.");
  const slim: { created_at: string; email_verified_at: string | null; high_school: string | null; dream_venue: string | null; locale: string | null; id: string; email: string }[] = [];
  for (let from = 0; ; from += 1000) {
    const { data, error } = await client
      .from(SIGNUPS)
      .select("id, email, created_at, email_verified_at, high_school, dream_venue, locale")
      .range(from, from + 999);
    if (error) throw new Error(error.message);
    const page = (data ?? []) as typeof slim;
    slim.push(...page);
    if (page.length < 1000) break;
  }
  const demos = await loadDemos();
  const today = romeDay(new Date().toISOString());
  const weekStart = new Date();
  weekStart.setDate(weekStart.getDate() - 6);
  const weekDay = romeDay(weekStart.toISOString());
  const verifiedRows = slim.filter((row) => row.email_verified_at);
  const verifiedIds = new Set(verifiedRows.map((row) => row.id));
  const emailToId = new Map(slim.map((row) => [row.email.toLowerCase(), row.id]));

  function signupIdOf(demo: DemoSummary) {
    if (demo.signupId && verifiedIds.has(demo.signupId)) return demo.signupId;
    if (demo.signupId) return demo.signupId;
    return emailToId.get(demo.email) ?? "";
  }

  const reached = {
    entered: new Set<string>(),
    criteria: new Set<string>(),
    location: new Set<string>(),
    request: new Set<string>(),
    event: new Set<string>(),
    rating: new Set<string>(),
  };
  for (const demo of demos) {
    const id = signupIdOf(demo);
    if (!id || !verifiedIds.has(id)) continue;
    if (demo.steps.stepEnteredAt) reached.entered.add(id);
    if (demo.steps.stepCriteriaAt) reached.criteria.add(id);
    if (demo.steps.stepLocationAt || demo.chosenLocation || demo.customVenue) reached.location.add(id);
    if (demo.steps.stepRequestAt) reached.request.add(id);
    if (demo.steps.stepEventAt) reached.event.add(id);
    if (demo.steps.stepRatingAt || demo.rating != null) reached.rating.add(id);
  }

  const dayKeys: string[] = [];
  for (let offset = 29; offset >= 0; offset -= 1) {
    const day = new Date();
    day.setDate(day.getDate() - offset);
    dayKeys.push(romeDay(day.toISOString()));
  }
  const perDay = new Map(dayKeys.map((day) => [day, 0]));
  for (const row of slim) {
    const day = romeDay(row.created_at);
    if (perDay.has(day)) perDay.set(day, (perDay.get(day) ?? 0) + 1);
  }

  const ratings = demos.map((demo) => demo.rating).filter((rating): rating is number => rating != null);
  const answered = demos.filter((demo) => demo.wouldUse != null);
  const yes = answered.filter((demo) => demo.wouldUse === true).length;
  const locations = demos.map((demo) => demo.chosenLocation).filter(Boolean);
  const verified = verifiedRows.length;

  const funnel = [
    ["Iscritti verificati", verified],
    ["Entrati nella demo", reached.entered.size],
    ["Criteri festa applicati", reached.criteria.size],
    ["Location scelta", reached.location.size],
    ["Richiesta inviata", reached.request.size],
    ["Evento visto", reached.event.size],
    ["Valutazione inviata", reached.rating.size],
  ] as const;

  return {
    totals: {
      signups: slim.length,
      verified,
      today: slim.filter((row) => romeDay(row.created_at) === today).length,
      week: slim.filter((row) => romeDay(row.created_at) >= weekDay).length,
      demoEntered: demos.filter((demo) => demo.steps.stepEnteredAt).length,
      demoCompleted: demos.filter((demo) => demo.status === "completed").length,
      averageRating:
        ratings.length > 0
          ? Math.round((ratings.reduce((sum, rating) => sum + rating, 0) / ratings.length) * 10) / 10
          : null,
      eighteenthYesRate: percent(yes, answered.length),
    },
    funnel: funnel.map(([label, count]) => ({
      label,
      count,
      percent: percent(count, verified),
    })),
    perDay: dayKeys.map((day) => ({ day, count: perDay.get(day) ?? 0 })),
    schools: topCounts(slim.map((row) => row.high_school ?? "")),
    venues: topCounts(slim.map((row) => row.dream_venue ?? "")),
    locations: topCounts(locations),
    suggestedVenues: suggestedVenueCounts(demos.map((demo) => demo.customVenue)),
    locales: [
      { name: "Italiano", count: slim.filter((row) => (row.locale ?? "it") !== "en").length },
      { name: "English", count: slim.filter((row) => row.locale === "en").length },
    ],
  };
}

const SORTS: Record<string, string> = {
  createdAt: "created_at",
  firstName: "first_name",
  lastName: "last_name",
  username: "username",
  email: "email",
  phone: "phone",
  birthYear: "birth_year",
  highSchool: "high_school",
  dreamVenue: "dream_venue",
  locale: "locale",
  vibeupCode: "vibeup_code",
  referredByCode: "referred_by_code",
};

function cleanLike(value: string) {
  return value.trim().replace(/[%_,.()]/g, "").slice(0, 80);
}

export function parseCommunityFilters(search: URLSearchParams): CommunityFilters {
  const verified = search.get("verified");
  const marketing = search.get("marketing");
  const demo = search.get("demo");
  const locale = search.get("locale");
  const sort = search.get("sort") || "createdAt";
  const dir = search.get("dir") === "asc" ? "asc" : "desc";
  const page = Math.max(1, Number(search.get("page")) || 1);
  return {
    q: (search.get("q") || "").trim().slice(0, 80),
    verified: verified === "yes" || verified === "no" ? verified : "all",
    school: (search.get("school") || "").trim().slice(0, 80),
    venue: (search.get("venue") || "").trim().slice(0, 80),
    marketing: marketing === "yes" || marketing === "no" ? marketing : "all",
    demo: demo === "none" || demo === "entered" || demo === "completed" ? demo : "all",
    locale: locale === "it" || locale === "en" ? locale : "all",
    sort: SORTS[sort] ? sort : "createdAt",
    dir,
    page,
  };
}

async function inviteCounts(codes: string[]) {
  const counts = new Map<string, number>();
  const client = admin();
  if (!client || codes.length === 0) return counts;
  const { data: owners, error: ownerError } = await client
    .from(SIGNUPS)
    .select("vibeup_code, email, phone")
    .in("vibeup_code", codes);
  if (ownerError) throw new Error(ownerError.message);
  const inviters = new Map<string, { email: string; phone: string | null }>();
  for (const owner of (owners ?? []) as { vibeup_code: string | null; email: string; phone: string | null }[]) {
    if (owner.vibeup_code) inviters.set(owner.vibeup_code, owner);
  }
  const { data, error } = await client
    .from(SIGNUPS)
    .select("referred_by_code, email, phone, email_verified_at, contest_excluded")
    .in("referred_by_code", codes);
  if (error) throw new Error(error.message);
  for (const row of (data ?? []) as {
    referred_by_code: string | null;
    email: string;
    phone: string | null;
    email_verified_at: string | null;
    contest_excluded: boolean | null;
  }[]) {
    if (!row.referred_by_code) continue;
    const inviter = inviters.get(row.referred_by_code);
    if (!inviter) continue;
    if (
      !isValidInvite(
        {
          email: row.email,
          phone: row.phone,
          email_verified_at: row.email_verified_at,
          contest_excluded: Boolean(row.contest_excluded),
        },
        inviter,
      )
    ) {
      continue;
    }
    counts.set(row.referred_by_code, (counts.get(row.referred_by_code) ?? 0) + 1);
  }
  return counts;
}

async function usernamesForCodes(codes: string[]) {
  const names = new Map<string, string>();
  const client = admin();
  if (!client || codes.length === 0) return names;
  const { data, error } = await client
    .from(SIGNUPS)
    .select("username, vibeup_code")
    .in("vibeup_code", codes);
  if (error) throw new Error(error.message);
  for (const row of (data ?? []) as { username: string; vibeup_code: string | null }[]) {
    if (row.vibeup_code) names.set(row.vibeup_code, row.username);
  }
  return names;
}

function mapSignup(
  row: SignupDb,
  names: Map<string, string>,
  invites: Map<string, number>,
  demo: DemoSummary | undefined,
): CommunitySignupRow {
  return {
    id: row.id,
    createdAt: row.created_at,
    firstName: row.first_name,
    lastName: row.last_name,
    username: row.username,
    email: row.email,
    phone: row.phone ?? "",
    birthYear: row.birth_year,
    highSchool: row.high_school ?? "",
    dreamVenue: row.dream_venue ?? "",
    locale: row.locale === "en" ? "en" : "it",
    vibeupCode: row.vibeup_code ?? "",
    referredByCode: row.referred_by_code ?? "",
    referredByUsername: row.referred_by_code ? names.get(row.referred_by_code) ?? "" : "",
    validInvites: row.vibeup_code ? invites.get(row.vibeup_code) ?? 0 : 0,
    verified: Boolean(row.email_verified_at),
    welcomeEmailSent: Boolean(row.welcome_email_sent_at),
    consentPrivacy: Boolean(row.consent_privacy_at),
    consentRules: Boolean(row.consent_rules_at),
    consentMarketing: row.consent_marketing,
    demoStatus: demo?.status ?? "none",
    demoRating: demo?.rating ?? null,
  };
}

async function demoBySignup(ids: string[], emails: string[]) {
  const demos = await loadDemos();
  const byId = new Map<string, DemoSummary[]>();
  const byEmail = new Map<string, DemoSummary[]>();
  for (const demo of demos) {
    if (demo.signupId) {
      const list = byId.get(demo.signupId) ?? [];
      list.push(demo);
      byId.set(demo.signupId, list);
    }
    if (demo.email) {
      const list = byEmail.get(demo.email) ?? [];
      list.push(demo);
      byEmail.set(demo.email, list);
    }
  }
  const result = new Map<string, DemoSummary>();
  ids.forEach((id, index) => {
    const own = byId.get(id) ?? [];
    const mailed = byEmail.get(emails[index] ?? "") ?? [];
    const best = bestDemo([...own, ...mailed]);
    if (best) result.set(id, best);
  });
  return { result, demos, byId, byEmail };
}

export async function loadCommunitySignups(filters: CommunityFilters, all: boolean) {
  const client = admin();
  if (!client) throw new Error("Supabase non configurato.");
  let query = client.from(SIGNUPS).select(SIGNUP_LIST_COLUMNS, { count: "exact" });
  if (filters.verified === "yes") query = query.not("email_verified_at", "is", null);
  if (filters.verified === "no") query = query.is("email_verified_at", null);
  if (filters.marketing === "yes") query = query.eq("consent_marketing", true);
  if (filters.marketing === "no") query = query.eq("consent_marketing", false);
  if (filters.locale !== "all") query = query.eq("locale", filters.locale);
  const school = cleanLike(filters.school);
  const venue = cleanLike(filters.venue);
  const q = cleanLike(filters.q);
  if (school) query = query.ilike("high_school", `%${school}%`);
  if (venue) query = query.ilike("dream_venue", `%${venue}%`);
  if (q) {
    query = query.or(
      [
        `first_name.ilike.%${q}%`,
        `last_name.ilike.%${q}%`,
        `username.ilike.%${q}%`,
        `email.ilike.%${q}%`,
        `phone.ilike.%${q}%`,
        `vibeup_code.ilike.%${q}%`,
        `high_school.ilike.%${q}%`,
        `dream_venue.ilike.%${q}%`,
      ].join(","),
    );
  }
  if (filters.demo !== "all") {
    const demos = await loadDemos();
    const linked = new Set(demos.map((demo) => demo.signupId).filter(Boolean));
    const emails = [...new Set(demos.map((demo) => demo.email).filter(Boolean))];
    if (emails.length > 0) {
      const { data: matched, error: matchError } = await client
        .from(SIGNUPS)
        .select("id")
        .in("email", emails);
      if (matchError) throw new Error(matchError.message);
      for (const item of (matched ?? []) as { id: string }[]) linked.add(item.id);
    }
    if (filters.demo === "none") {
      if (linked.size > 0) query = query.not("id", "in", `(${[...linked].join(",")})`);
    } else {
      const ids = [
        ...new Set(
          demos
            .filter((demo) => demo.status === filters.demo)
            .flatMap((demo) => (demo.signupId ? [demo.signupId] : [])),
        ),
      ];
      if (ids.length === 0) {
        return { rows: [] as CommunitySignupRow[], total: 0, page: filters.page, pageSize: PAGE_SIZE };
      }
      query = query.in("id", ids);
    }
  }
  const column = SORTS[filters.sort] ?? "created_at";
  query = query.order(column, { ascending: filters.dir === "asc" });
  const from = all ? 0 : (filters.page - 1) * PAGE_SIZE;
  const to = all ? 4999 : from + PAGE_SIZE - 1;
  const { data, error, count } = await query.range(from, to);
  if (error) throw new Error(error.message);
  const page = (data ?? []) as SignupDb[];
  const [names, invites, demoMap] = await Promise.all([
    usernamesForCodes(page.map((row) => row.referred_by_code).filter((code): code is string => Boolean(code))),
    inviteCounts(page.map((row) => row.vibeup_code).filter((code): code is string => Boolean(code))),
    demoBySignup(
      page.map((row) => row.id),
      page.map((row) => row.email.toLowerCase()),
    ),
  ]);
  return {
    rows: page.map((row) => mapSignup(row, names, invites, demoMap.result.get(row.id))),
    total: count ?? page.length,
    page: filters.page,
    pageSize: PAGE_SIZE,
  };
}

export function signupsToCsv(rows: CommunitySignupRow[]) {
  const header = [
    "Data",
    "Nome",
    "Cognome",
    "Username",
    "Email",
    "Telefono",
    "Anno di nascita",
    "Liceo",
    "Locale desiderato",
    "Lingua",
    "VibeUpcode",
    "Invitato da codice",
    "Invitato da username",
    "Inviti validi",
    "Email verificata",
    "Mail di benvenuto",
    "Consenso privacy",
    "Consenso regolamento",
    "Consenso marketing",
    "Stato demo",
    "Voto demo",
  ];
  const cell = (value: string) => `"${value.replaceAll('"', '""')}"`;
  const lines = rows.map((row) =>
    [
      row.createdAt,
      row.firstName,
      row.lastName,
      row.username,
      row.email,
      row.phone,
      row.birthYear == null ? "" : String(row.birthYear),
      row.highSchool,
      row.dreamVenue,
      row.locale,
      row.vibeupCode,
      row.referredByCode,
      row.referredByUsername,
      String(row.validInvites),
      row.verified ? "sì" : "no",
      row.welcomeEmailSent ? "sì" : "no",
      row.consentPrivacy ? "sì" : "no",
      row.consentRules ? "sì" : "no",
      row.consentMarketing ? "sì" : "no",
      row.demoStatus === "completed" ? "completata" : row.demoStatus === "entered" ? "entrato" : "non entrato",
      row.demoRating == null ? "" : String(row.demoRating),
    ]
      .map(cell)
      .join(","),
  );
  return `\uFEFF${header.map(cell).join(",")}\n${lines.join("\n")}`;
}

export async function loadCommunityPerson(signupId: string) {
  const client = admin();
  if (!client) throw new Error("Supabase non configurato.");
  const { data, error } = await client.from(SIGNUPS).select("*").eq("id", signupId).maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) return null;
  const row = data as SignupDb & {
    email_confirmed_at: string | null;
    consent_privacy_at: string | null;
    consent_rules_at: string | null;
  };
  const { data: consentData, error: consentError } = await client
    .from(CONSENTS)
    .select("kind, granted, text_version, created_at")
    .eq("signup_id", signupId)
    .order("created_at", { ascending: true });
  if (consentError) throw new Error(consentError.message);
  const names = row.referred_by_code ? await usernamesForCodes([row.referred_by_code]) : new Map<string, string>();
  let invitees: { username: string; firstName: string; verified: boolean; createdAt: string }[] = [];
  if (row.vibeup_code) {
    const { data: invited, error: inviteError } = await client
      .from(SIGNUPS)
      .select("username, first_name, email, phone, email_verified_at, created_at, contest_excluded")
      .eq("referred_by_code", row.vibeup_code)
      .order("created_at", { ascending: false })
      .limit(100);
    if (inviteError) throw new Error(inviteError.message);
    invitees = ((invited ?? []) as {
      username: string;
      first_name: string;
      email: string;
      phone: string | null;
      email_verified_at: string | null;
      created_at: string;
      contest_excluded: boolean | null;
    }[])
      .filter((item) =>
        isValidInvite(
          {
            email: item.email,
            phone: item.phone,
            email_verified_at: item.email_verified_at,
            contest_excluded: Boolean(item.contest_excluded),
          },
          { email: row.email, phone: row.phone },
        ),
      )
      .map((item) => ({
        username: item.username,
        firstName: item.first_name,
        verified: Boolean(item.email_verified_at),
        createdAt: item.created_at,
      }));
  }
  const demoMap = await demoBySignup([row.id], [row.email.toLowerCase()]);
  const sessions = [
    ...(demoMap.byId.get(row.id) ?? []),
    ...(demoMap.byEmail.get(row.email.toLowerCase()) ?? []),
  ];
  const unique = [...new Map(sessions.map((item) => [item.id, item])).values()];
  return {
    signup: mapSignup(
      row,
      names,
      await inviteCounts(row.vibeup_code ? [row.vibeup_code] : []),
      bestDemo(unique),
    ),
    confirmedAt: row.email_confirmed_at,
    consents: ((consentData ?? []) as { kind: string; granted: boolean; text_version: string; created_at: string }[]).map(
      (item) => ({
        kind: item.kind,
        granted: item.granted,
        version: item.text_version,
        at: item.created_at,
      }),
    ),
    inviter: row.referred_by_code
      ? { code: row.referred_by_code, username: names.get(row.referred_by_code) ?? "" }
      : null,
    invitees,
    demos: unique,
  };
}

export async function loadCommunityDemos(page: number, all = false) {
  const demos = await loadDemos();
  if (all) {
    return { rows: demos, total: demos.length, page: 1, pageSize: demos.length || PAGE_SIZE };
  }
  const from = (page - 1) * PAGE_SIZE;
  return {
    rows: demos.slice(from, from + PAGE_SIZE),
    total: demos.length,
    page,
    pageSize: PAGE_SIZE,
  };
}

export function demosToCsv(rows: DemoSummary[]) {
  const header = [
    "Data",
    "Nome",
    "Email",
    "Signup",
    "Ultimo passo",
    "Orario passo",
    "Criteri",
    "Location scelta",
    "Posto suggerito",
    "Voto",
    "Useresti per il 18",
    "Durata minuti",
  ];
  const cell = (value: string) => `"${value.replaceAll('"', '""')}"`;
  const lines = rows.map((row) => {
    const criteria = row.criteria
      ? [
          Array.isArray(row.criteria.dates) ? (row.criteria.dates as string[]).join(" ") : "",
          row.criteria.guestCount ? `${row.criteria.guestCount} ospiti` : "",
          row.criteria.budgetMin || row.criteria.budgetMax
            ? `${row.criteria.budgetMin ?? ""}-${row.criteria.budgetMax ?? ""}`
            : "",
          asText(row.criteria.freeText),
        ]
          .filter(Boolean)
          .join(" · ")
      : "";
    return [
      row.createdAt,
      row.name,
      row.email,
      row.signupId,
      row.lastStep,
      row.lastStepAt ?? "",
      criteria,
      row.chosenLocation,
      row.customVenue,
      row.rating == null ? "" : String(row.rating),
      row.wouldUse == null ? "" : row.wouldUse ? "sì" : "no",
      row.durationMs == null ? "" : String(Math.round(row.durationMs / 60000)),
    ]
      .map(cell)
      .join(",");
  });
  return `\uFEFF${header.map(cell).join(",")}\n${lines.join("\n")}`;
}

export { PAGE_SIZE };
