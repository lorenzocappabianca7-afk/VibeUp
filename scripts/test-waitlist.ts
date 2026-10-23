import { createHash } from "node:crypto";
import fs from "node:fs";
import pg from "pg";
import { inviteCountsForContest } from "../src/config/contest";
import { isDemoAccessOpen } from "../src/config/demo-access";

const BASE = "http://127.0.0.1:3000";
const CODE_RE = /^VU-[ABCDEFGHJKMNPQRSTUVWXYZ23456789]{5}$/;
const EMAILS = [
  "test+a@vibeupevents.com",
  "test+b@vibeupevents.com",
  "test+selfphone@vibeupevents.com",
  "test+disp@mailinator.com",
  "test+dupemail@vibeupevents.com",
  "test+dupphone@vibeupevents.com",
  "test+dupuser@vibeupevents.com",
  "test+young@vibeupevents.com",
  "test+expired@vibeupevents.com",
  "test+wrong@vibeupevents.com",
  "test+locked@vibeupevents.com",
  "test+noref@vibeupevents.com",
  "test+privacy@vibeupevents.com",
];
const USERNAMES = [
  "testusera",
  "testuserb",
  "testselfph",
  "testdisp",
  "testdupem",
  "testdupph",
  "testdupus",
  "testyoung1",
  "testexp1",
  "testwrong1",
  "testlock1",
  "testnoref",
  "testpriv1",
];

type Check = { name: string; ok: boolean; detail: string };
const checks: Check[] = [];

function loadEnv(path: string) {
  const text = fs.readFileSync(path, "utf8");
  for (const line of text.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#") || !trimmed.includes("=")) continue;
    const eq = trimmed.indexOf("=");
    const key = trimmed.slice(0, eq).trim();
    let value = trimmed.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    process.env[key] = value;
  }
}

function redact(value: unknown) {
  return String(value)
    .replace(/postgres(?:ql)?:\/\/\S+/gi, "[redacted]")
    .replace(/(password|pwd)=([^\s&]+)/gi, "$1=[redacted]");
}

function record(name: string, ok: boolean, detail: string) {
  checks.push({ name, ok, detail });
  console.log(`${ok ? "PASS" : "FAIL"} ${name} — ${detail}`);
}

function hashCode(code: string) {
  const pepper = process.env.WAITLIST_CODE_PEPPER?.trim() ?? "";
  if (pepper.length < 32) throw new Error("MISSING_WAITLIST_CODE_PEPPER");
  return createHash("sha256").update(`${pepper}:${code}`).digest("hex");
}

let ip = 20;
function nextIp() {
  ip += 1;
  return `203.0.113.${ip}`;
}

async function post(path: string, body: Record<string, unknown>, ip = nextIp()) {
  const response = await fetch(`${BASE}${path}`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-forwarded-for": ip,
    },
    body: JSON.stringify(body),
  });
  const data = (await response.json().catch(() => null)) as Record<string, unknown> | null;
  return { status: response.status, data };
}

function signupBody(input: {
  email: string;
  username: string;
  phone: string;
  referralCode?: string;
  firstName?: string;
  birthYear?: number;
  highSchool?: string;
}) {
  return {
    firstName: input.firstName ?? "Test",
    lastName: "Waitlist",
    username: input.username,
    email: input.email,
    phonePrefix: "+39",
    phoneNational: input.phone,
    birthYear: input.birthYear ?? 2008,
    highSchool: input.highSchool ?? "Liceo Test",
    dreamVenue: "Locale Test",
    referralCode: input.referralCode ?? "",
    consentPrivacy: true,
    consentRules: true,
    consentMarketing: false,
  };
}

async function recoverPrivacyCode(client: pg.Client, email: string) {
  const found = await client.query<{ code_hash: string }>(
    "select code_hash from public.waitlist_privacy_codes where lower(email) = $1",
    [email],
  );
  const hash = found.rows[0]?.code_hash;
  if (!hash) throw new Error("nessun codice privacy");
  for (let i = 0; i < 1_000_000; i += 1) {
    const code = String(i).padStart(6, "0");
    if (hashCode(code) === hash) return code;
  }
  throw new Error("codice privacy non ricostruibile");
}

async function hitsLimit(
  path: string,
  body: Record<string, unknown> | ((index: number) => Record<string, unknown>),
  ip: string,
  limit: number,
) {
  let last = 0;
  for (let index = 0; index < limit + 1; index += 1) {
    const payload = typeof body === "function" ? body(index) : body;
    const result = await post(path, payload, ip);
    last = result.status;
    if (index < limit && result.status === 429) return false;
  }
  return last === 429;
}

async function recoverCode(client: pg.Client, signupId: string) {
  const found = await client.query<{ code_hash: string }>(
    "select code_hash from public.waitlist_email_codes where signup_id = $1",
    [signupId],
  );
  const hash = found.rows[0]?.code_hash;
  if (!hash) throw new Error("nessuna riga codice");
  for (let i = 0; i < 1_000_000; i += 1) {
    const code = String(i).padStart(6, "0");
    if (hashCode(code) === hash) return code;
  }
  throw new Error("codice non ricostruibile");
}

async function verify(client: pg.Client, signupId: string) {
  const code = await recoverCode(client, signupId);
  return post("/api/launch/verify", { signupId, code });
}

async function inviteCount(signupId: string) {
  const result = await post("/api/launch/status", { signupId });
  const count = result.data?.inviteCount;
  return {
    status: result.status,
    ok: result.data?.ok === true,
    count: typeof count === "number" ? count : null,
    code: typeof result.data?.vibeupCode === "string" ? result.data.vibeupCode : "",
  };
}

async function exclude(client: pg.Client, signupId: string, excluded: boolean, reason: string) {
  const clean = reason.trim();
  if (clean.length < 3 || clean.length > 400) throw new Error("reason");
  const updated = await client.query(
    "update public.waitlist_signups set contest_excluded = $1 where id = $2 returning id",
    [excluded, signupId],
  );
  if (updated.rowCount !== 1) throw new Error("not_found");
  await client.query(
    "insert into public.waitlist_contest_exclusions (signup_id, excluded, reason) values ($1, $2, $3)",
    [signupId, excluded, clean],
  );
}

async function cleanup(client: pg.Client) {
  await client.query(
    `delete from public.waitlist_privacy_codes
     where lower(email) = any($1::text[])
        or lower(email) like 'test+%@vibeupevents.com'
        or lower(email) like 'test+%@mailinator.com'`,
    [EMAILS],
  );
  await client.query(
    `delete from public.waitlist_signups
     where lower(email) = any($1::text[])
        or lower(username) = any($2::text[])
        or lower(email) like 'test+%@vibeupevents.com'
        or lower(email) like 'test+%@mailinator.com'`,
    [EMAILS, USERNAMES],
  );
}

async function main() {
  loadEnv("/Users/lorenzocappabianca/VibeUp/.env.local");
  if (!process.env.SUPABASE_DB_URL) throw new Error("MISSING_SUPABASE_DB_URL");
  const client = new pg.Client({
    connectionString: process.env.SUPABASE_DB_URL,
    ssl: { rejectUnauthorized: false },
  });
  await client.connect();
  const created: string[] = [];
  try {
    await cleanup(client);

    const signupA = await post(
      "/api/launch/signup",
      signupBody({ email: EMAILS[0], username: USERNAMES[0], phone: "3331110001" }),
    );
    const idA = typeof signupA.data?.signupId === "string" ? signupA.data.signupId : "";
    if (signupA.status !== 200 || !idA) {
      record("iscrizione A", false, `HTTP ${signupA.status} ${JSON.stringify(signupA.data)}`);
      return;
    }
    created.push(idA);
    const verifiedA = await verify(client, idA);
    const codeA = typeof verifiedA.data?.vibeupCode === "string" ? verifiedA.data.vibeupCode : "";
    const codeCount = codeA
      ? (
          await client.query<{ n: number }>(
            "select count(*)::int as n from public.waitlist_signups where vibeup_code = $1",
            [codeA],
          )
        ).rows[0].n
      : 0;
    record(
      "iscrizione A verificata",
      verifiedA.status === 200 && CODE_RE.test(codeA) && codeCount === 1,
      `HTTP ${verifiedA.status} codice ${codeA || "assente"} occorrenze ${codeCount}`,
    );
    if (!CODE_RE.test(codeA)) return;

    const consents = await client.query<{ kind: string; granted: boolean; text_version: string }>(
      `select kind, granted, text_version from public.consent_log where signup_id = $1`,
      [idA],
    );
    const consentOk = ["privacy", "rules", "marketing"].every((kind) => {
      const row = consents.rows.find((item) => item.kind === kind);
      if (!row) return false;
      const version =
        kind === "privacy" ? "privacy-v1" : kind === "rules" ? "rules-v1" : "marketing-v1";
      const granted = kind === "marketing" ? false : true;
      return row.granted === granted && row.text_version === version;
    });
    record(
      "consensi",
      consents.rows.length === 3 && consentOk,
      `righe ${consents.rows.length}`,
    );

    const welcomeRow = (
      await client.query<{ welcome_email_sent_at: string | null; demo_access_token: string | null }>(
        "select welcome_email_sent_at, demo_access_token from public.waitlist_signups where id = $1",
        [idA],
      )
    ).rows[0];
    const previewPath = "/Users/lorenzocappabianca/VibeUp/.tmp/emails/welcome-preview.html";
    const preview = fs.existsSync(previewPath) ? fs.readFileSync(previewPath, "utf8") : "";
    const welcomeOk =
      preview.includes("Ciao Test,") &&
      preview.includes(codeA) &&
      preview.includes("/demo?t=") &&
      preview.includes(welcomeRow?.demo_access_token ?? "missing-token") &&
      welcomeRow?.welcome_email_sent_at == null;
    record(
      "mail di benvenuto in anteprima",
      welcomeOk,
      `anteprima ${preview.includes(codeA) ? "con codice" : "senza codice"} link ${preview.includes("/demo?t=") ? "si" : "no"} inviata ${welcomeRow?.welcome_email_sent_at ? "si" : "no"}`,
    );

    const tokenA = welcomeRow?.demo_access_token ?? "";
    const accepted = tokenA
      ? await post("/api/launch/demo-access", { token: tokenA })
      : { status: 0, data: null };
    const fake = await post("/api/launch/demo-access", { token: "a".repeat(43) });
    const expiredGate = !isDemoAccessOpen(Date.parse("2027-02-01T00:00:00.000+01:00"));
    record(
      "token demo",
      accepted.status === 200 &&
        accepted.data?.ok === true &&
        accepted.data?.signupId === idA &&
        fake.status === 200 &&
        fake.data?.ok === false &&
        expiredGate,
      `valido ${String(accepted.data?.ok)} falso ${String(fake.data?.ok)} scaduto rifiutato ${expiredGate}`,
    );

    const beforeB = await inviteCount(idA);
    const signupB = await post(
      "/api/launch/signup",
      signupBody({
        email: EMAILS[1],
        username: USERNAMES[1],
        phone: "3331110002",
        referralCode: codeA,
        firstName: "Beta",
      }),
    );
    const idB = typeof signupB.data?.signupId === "string" ? signupB.data.signupId : "";
    if (idB) created.push(idB);
    const countBeforeVerify = idB ? await inviteCount(idA) : beforeB;
    record(
      "inviti prima della verifica di B",
      signupB.status === 200 &&
        Boolean(idB) &&
        countBeforeVerify.ok &&
        countBeforeVerify.count === 0,
      `signup B HTTP ${signupB.status} inviti ${countBeforeVerify.count}`,
    );
    if (!idB) return;

    const verifiedB = await verify(client, idB);
    const countAfterB = await inviteCount(idA);
    record(
      "inviti dopo la verifica di B",
      verifiedB.status === 200 && countAfterB.ok && countAfterB.count === 1,
      `verify HTTP ${verifiedB.status} inviti ${countAfterB.count}`,
    );

    const selfEmail = await post(
      "/api/launch/signup",
      signupBody({
        email: EMAILS[0],
        username: "testselfem",
        phone: "3331110006",
        referralCode: codeA,
      }),
    );
    record(
      "auto-invito stessa email",
      selfEmail.status === 409 && selfEmail.data?.error === "own_code",
      `HTTP ${selfEmail.status} ${String(selfEmail.data?.error ?? "")}`,
    );

    const selfPhone = await post(
      "/api/launch/signup",
      signupBody({
        email: EMAILS[2],
        username: USERNAMES[2],
        phone: "3331110001",
        referralCode: codeA,
      }),
    );
    record(
      "auto-invito stesso telefono",
      selfPhone.status === 409 && selfPhone.data?.error === "own_code",
      `HTTP ${selfPhone.status} ${String(selfPhone.data?.error ?? "")}`,
    );

    const disposable = await post(
      "/api/launch/signup",
      signupBody({
        email: EMAILS[3],
        username: USERNAMES[3],
        phone: "3331110003",
        referralCode: codeA,
      }),
    );
    const idD = typeof disposable.data?.signupId === "string" ? disposable.data.signupId : "";
    if (idD) created.push(idD);
    const verifiedD = idD ? await verify(client, idD) : { status: 0, data: null };
    const countAfterDisposable = await inviteCount(idA);
    record(
      "email temporanea non conta",
      disposable.status === 200 &&
        verifiedD.status === 200 &&
        countAfterDisposable.ok &&
        countAfterDisposable.count === 1,
      `signup HTTP ${disposable.status} verify HTTP ${verifiedD.status} inviti ${countAfterDisposable.count}`,
    );

    const dupEmail = await post(
      "/api/launch/signup",
      signupBody({ email: EMAILS[0], username: USERNAMES[4], phone: "3331110004" }),
    );
    record(
      "email già usata",
      dupEmail.status === 409 && dupEmail.data?.error === "email_taken",
      `HTTP ${dupEmail.status} ${String(dupEmail.data?.error ?? "")}`,
    );

    const dupPhone = await post(
      "/api/launch/signup",
      signupBody({ email: EMAILS[5], username: USERNAMES[5], phone: "3331110001" }),
    );
    record(
      "telefono già usato",
      dupPhone.status === 409 && dupPhone.data?.error === "phone_taken",
      `HTTP ${dupPhone.status} ${String(dupPhone.data?.error ?? "")}`,
    );

    const dupUser = await post(
      "/api/launch/signup",
      signupBody({ email: EMAILS[6], username: USERNAMES[0], phone: "3331110005" }),
    );
    record(
      "username già usato",
      dupUser.status === 409 && dupUser.data?.error === "username_taken",
      `HTTP ${dupUser.status} ${String(dupUser.data?.error ?? "")}`,
    );

    await exclude(client, idB, true, "test esclusione");
    const stillThere = await client.query<{ contest_excluded: boolean; email_verified_at: string | null }>(
      "select contest_excluded, email_verified_at from public.waitlist_signups where id = $1",
      [idB],
    );
    const logExcluded = await client.query<{ n: number }>(
      `select count(*)::int as n from public.waitlist_contest_exclusions
       where signup_id = $1 and excluded = true and reason = 'test esclusione' and created_at is not null`,
      [idB],
    );
    const countExcluded = await inviteCount(idA);
    record(
      "esclusione di B",
      stillThere.rows[0]?.contest_excluded === true &&
        Boolean(stillThere.rows[0]?.email_verified_at) &&
        logExcluded.rows[0].n === 1 &&
        countExcluded.count === 0,
      `escluso ${String(stillThere.rows[0]?.contest_excluded)} iscritto ${Boolean(stillThere.rows[0]?.email_verified_at)} log ${logExcluded.rows[0].n} inviti ${countExcluded.count}`,
    );

    await exclude(client, idB, false, "test riammissione");
    const countReadmitted = await inviteCount(idA);
    const logReadmit = await client.query<{ n: number }>(
      `select count(*)::int as n from public.waitlist_contest_exclusions
       where signup_id = $1 and excluded = false and reason = 'test riammissione'`,
      [idB],
    );
    record(
      "riammissione di B",
      logReadmit.rows[0].n === 1 && countReadmitted.count === 1,
      `log ${logReadmit.rows[0].n} inviti ${countReadmitted.count}`,
    );

    await client.query(
      "update public.waitlist_signups set email_verified_at = $2 where id = $1",
      [idB, "2027-06-01T12:00:00.000+02:00"],
    );
    const countAfterEnd = await inviteCount(idA);
    const stillCounts = inviteCountsForContest(
      "2026-06-01T12:00:00.000+02:00",
      Date.parse("2027-06-01T12:00:00.000+02:00"),
    );
    record(
      "inviti dopo la fine gara",
      countAfterEnd.ok && countAfterEnd.count === 0 && stillCounts,
      `verifica successiva alla scadenza: inviti ${countAfterEnd.count}; verifica precedente resta valida con data simulata ${stillCounts}`,
    );

    const young = await post(
      "/api/launch/signup",
      signupBody({
        email: EMAILS[7],
        username: USERNAMES[7],
        phone: "3331110011",
        birthYear: 2013,
      }),
    );
    const youngRows = await client.query<{ n: number }>(
      "select count(*)::int as n from public.waitlist_signups where lower(email) = $1",
      [EMAILS[7]],
    );
    record(
      "eta sotto i 14",
      (young.status === 400 || young.status === 409) &&
        young.data?.error === "too_young" &&
        youngRows.rows[0].n === 0,
      `HTTP ${young.status} ${String(young.data?.error ?? "")} righe ${youngRows.rows[0].n}`,
    );

    const noRef = await post(
      "/api/launch/signup",
      signupBody({
        email: EMAILS[11],
        username: USERNAMES[11],
        phone: "3331110012",
        referralCode: "VU-Q7W9K",
      }),
    );
    const noRefId = typeof noRef.data?.signupId === "string" ? noRef.data.signupId : "";
    if (noRefId) created.push(noRefId);
    const noRefRow = noRefId
      ? (
          await client.query<{ referred_by_code: string | null }>(
            "select referred_by_code from public.waitlist_signups where id = $1",
            [noRefId],
          )
        ).rows[0]
      : null;
    record(
      "codice amico inesistente",
      noRef.status === 200 && noRefRow?.referred_by_code == null,
      `HTTP ${noRef.status} referred ${noRefRow?.referred_by_code ?? "vuoto"}`,
    );

    const expiredSignup = await post(
      "/api/launch/signup",
      signupBody({ email: EMAILS[8], username: USERNAMES[8], phone: "3331110013" }),
    );
    const expiredId =
      typeof expiredSignup.data?.signupId === "string" ? expiredSignup.data.signupId : "";
    if (expiredId) created.push(expiredId);
    if (expiredId) {
      await client.query(
        "update public.waitlist_email_codes set expires_at = now() - interval '1 minute' where signup_id = $1",
        [expiredId],
      );
    }
    const expiredVerify = expiredId
      ? await post("/api/launch/verify", { signupId: expiredId, code: "123456" })
      : { status: 0, data: null };
    record(
      "codice email scaduto",
      expiredSignup.status === 200 &&
        expiredVerify.status === 400 &&
        expiredVerify.data?.error === "expired",
      `HTTP ${expiredVerify.status} ${String(expiredVerify.data?.error ?? "")}`,
    );

    const wrongSignup = await post(
      "/api/launch/signup",
      signupBody({ email: EMAILS[9], username: USERNAMES[9], phone: "3331110014" }),
    );
    const wrongId = typeof wrongSignup.data?.signupId === "string" ? wrongSignup.data.signupId : "";
    if (wrongId) created.push(wrongId);
    const wrongCode = wrongId ? await recoverCode(client, wrongId) : "";
    const wrongTry = wrongId
      ? await post("/api/launch/verify", {
          signupId: wrongId,
          code: wrongCode === "000000" ? "111111" : "000000",
        })
      : { status: 0, data: null };
    const wrongFixed = wrongId ? await verify(client, wrongId) : { status: 0, data: null };
    record(
      "codice email sbagliato",
      wrongTry.status === 400 &&
        wrongTry.data?.error === "mismatch" &&
        wrongFixed.status === 200,
      `sbagliato HTTP ${wrongTry.status} ${String(wrongTry.data?.error ?? "")} poi HTTP ${wrongFixed.status}`,
    );

    const lockedSignup = await post(
      "/api/launch/signup",
      signupBody({ email: EMAILS[10], username: USERNAMES[10], phone: "3331110015" }),
    );
    const lockedId =
      typeof lockedSignup.data?.signupId === "string" ? lockedSignup.data.signupId : "";
    if (lockedId) created.push(lockedId);
    const lockedReal = lockedId ? await recoverCode(client, lockedId) : "";
    let lockedStatus = 0;
    let lockedError = "";
    if (lockedId) {
      const bad = lockedReal === "222222" ? "333333" : "222222";
      for (let attempt = 0; attempt < 5; attempt += 1) {
        const result = await post("/api/launch/verify", { signupId: lockedId, code: bad });
        lockedStatus = result.status;
        lockedError = String(result.data?.error ?? "");
      }
    }
    const lockedRealTry = lockedId
      ? await post("/api/launch/verify", { signupId: lockedId, code: lockedReal })
      : { status: 0, data: null };
    record(
      "codice oltre 5 tentativi",
      lockedStatus === 400 &&
        lockedError === "locked" &&
        lockedRealTry.status === 400 &&
        lockedRealTry.data?.error === "locked",
      `quinto ${lockedStatus} ${lockedError} codice vero HTTP ${lockedRealTry.status} ${String(lockedRealTry.data?.error ?? "")}`,
    );

    const privacySignup = await post(
      "/api/launch/signup",
      signupBody({
        email: EMAILS[12],
        username: USERNAMES[12],
        phone: "3331110016",
        highSchool: "Liceo QwAudit991",
      }),
    );
    const privacyId =
      typeof privacySignup.data?.signupId === "string" ? privacySignup.data.signupId : "";
    if (privacyId) created.push(privacyId);
    const privacyVerified = privacyId ? await verify(client, privacyId) : { status: 0, data: null };
    const privacyToken = privacyId
      ? (
          await client.query<{ demo_access_token: string | null }>(
            "select demo_access_token from public.waitlist_signups where id = $1",
            [privacyId],
          )
        ).rows[0]?.demo_access_token ?? ""
      : "";
    const privacyOpen = privacyToken
      ? await post("/api/launch/demo-access", { token: privacyToken })
      : { status: 0, data: null };
    const privacyAsk = await post("/api/launch/privacy", { email: EMAILS[12] });
    const privacyCode = privacyId ? await recoverPrivacyCode(client, EMAILS[12]) : "";
    const schools = await fetch(
      `${BASE}/api/launch/schools?q=${encodeURIComponent("QwAudit991")}`,
    );
    const schoolBody = (await schools.json().catch(() => null)) as {
      suggestions?: string[];
    } | null;
    const exported = privacyCode
      ? await post("/api/launch/privacy/export", { email: EMAILS[12], code: privacyCode })
      : { status: 0, data: null };
    const exportBody = exported.data?.export as { iscrizione?: { email?: string } } | undefined;
    const removed = privacyCode
      ? await post("/api/launch/privacy/delete", { email: EMAILS[12], code: privacyCode })
      : { status: 0, data: null };
    const privacyClosed = privacyToken
      ? await post("/api/launch/demo-access", { token: privacyToken })
      : { status: 0, data: null };
    const privacyLeft = await client.query<{ n: number }>(
      "select count(*)::int as n from public.waitlist_signups where lower(email) = $1",
      [EMAILS[12]],
    );
    record(
      "export e cancellazione privacy",
      privacyVerified.status === 200 &&
        privacyOpen.data?.ok === true &&
        privacyAsk.status === 200 &&
        exported.status === 200 &&
        exportBody?.iscrizione?.email === EMAILS[12] &&
        removed.status === 200 &&
        removed.data?.ok === true &&
        privacyClosed.data?.ok === false &&
        privacyLeft.rows[0].n === 0,
      `export HTTP ${exported.status} delete HTTP ${removed.status} token dopo delete ${String(privacyClosed.data?.ok)} righe ${privacyLeft.rows[0].n}`,
    );

    const stranger = await post("/api/launch/status", { signupId: idA });
    const admin = await fetch(`${BASE}/api/admin/signups`);
    const demoList = await fetch(`${BASE}/api/demo/submissions`);
    const schoolLeak = (schoolBody?.suggestions ?? []).includes("Liceo QwAudit991");
    const statusLeak =
      stranger.data?.ok === true && typeof stranger.data?.demoPath === "string";
    record(
      "nessun dato di altri utenti",
      admin.status === 401 && demoList.status === 401 && !statusLeak && !schoolLeak,
      `admin ${admin.status} demo ${demoList.status} status demoPath ${statusLeak ? "presente" : "assente"} scuola pubblica ${schoolLeak ? "si" : "no"}`,
    );

    record(
      "rate limit iscrizione",
      await hitsLimit(
        "/api/launch/signup",
        (index) => ({
          email: `test+rlip${index}@vibeupevents.com`,
          consentPrivacy: false,
        }),
        "203.0.113.221",
        8,
      ),
      "nono tentativo",
    );
    record(
      "rate limit reinvio codice",
      await hitsLimit("/api/launch/resend", {}, "203.0.113.202", 6),
      "settimo tentativo",
    );
    record(
      "rate limit richiesta dati",
      await hitsLimit(
        "/api/launch/privacy",
        (index) => ({ email: `test+rl${index}@vibeupevents.com` }),
        "203.0.113.203",
        8,
      ),
      "nono tentativo",
    );
    record(
      "rate limit token demo",
      await hitsLimit(
        "/api/launch/demo-access",
        { token: "b".repeat(43) },
        "203.0.113.204",
        30,
      ),
      "31esimo tentativo",
    );

    const missingId = "11111111-1111-4111-8111-111111111111";
    const allowed = await inviteCount(idA);
    const denied = await post("/api/launch/status", { signupId: missingId });
    const demo = await fetch(`${BASE}/demo`, { redirect: "manual" });
    const location = demo.headers.get("location") ?? "";
    record(
      "accesso demo",
      allowed.ok &&
        allowed.code === codeA &&
        denied.status === 200 &&
        denied.data?.ok === false &&
        demo.status === 200 &&
        location === "",
      `A ok=${allowed.ok} codice=${allowed.code === codeA} id assente ok=${String(denied.data?.ok)} GET /demo ${demo.status} location=${location || "(nessuna)"}`,
    );
  } finally {
    await cleanup(client);
    const left = await client.query<{
      signups: number;
      consents: number;
      exclusions: number;
      tokens: number;
    }>(
      `select
         (select count(*)::int from public.waitlist_signups
           where lower(email) = any($1::text[])
              or lower(email) like 'test+%@vibeupevents.com'
              or lower(email) like 'test+%@mailinator.com'
              or lower(username) = any($2::text[])) as signups,
         (select count(*)::int from public.consent_log c
           where c.signup_id = any($3::uuid[])
              or c.signup_id in (
                select id from public.waitlist_signups
                where lower(email) like 'test+%'
              )) as consents,
         (select count(*)::int from public.waitlist_contest_exclusions e
           where e.signup_id = any($3::uuid[])) as exclusions,
         (select count(*)::int from public.waitlist_signups
           where demo_access_token is not null
             and (lower(email) like 'test+%@vibeupevents.com'
               or lower(email) like 'test+%@mailinator.com')) as tokens`,
      [EMAILS, USERNAMES, created.length ? created : ["00000000-0000-4000-8000-000000000000"]],
    );
    const row = left.rows[0];
    record(
      "pulizia dati di test",
      row.signups === 0 && row.consents === 0 && row.exclusions === 0 && row.tokens === 0,
      `iscrizioni ${row.signups} consensi ${row.consents} esclusioni ${row.exclusions} token ${row.tokens}`,
    );
    await client.end().catch(() => undefined);
  }
}

main()
  .then(() => {
    const failed = checks.filter((check) => !check.ok).length;
    console.log(`RESULT ${checks.length - failed}/${checks.length}`);
    process.exitCode = failed === 0 ? 0 : 1;
  })
  .catch((error) => {
    console.error("TEST_FAILED", redact(error instanceof Error ? error.message : error));
    process.exitCode = 1;
  });
