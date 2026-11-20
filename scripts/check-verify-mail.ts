import { readFileSync } from "node:fs";
import { randomBytes } from "node:crypto";
import { Webhook } from "standardwebhooks";
import { NextRequest } from "next/server.js";

for (const line of readFileSync(new URL("../.env.local", import.meta.url), "utf8").split("\n")) {
  const trimmed = line.trim();
  if (!trimmed || trimmed.startsWith("#")) continue;
  const eq = trimmed.indexOf("=");
  if (eq < 0) continue;
  const key = trimmed.slice(0, eq);
  let value = trimmed.slice(eq + 1);
  if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
    value = value.slice(1, -1);
  }
  if (!process.env[key]) process.env[key] = value;
}

const addresses = [
  "test+mailhint@vibeupevents.com",
  "test+mailcode@vibeupevents.com",
  "test+maillink@vibeupevents.com",
  "test+mailold@vibeupevents.com",
  "test+mailphone@vibeupevents.com",
  "test+mailphone2@vibeupevents.com",
  "test+maillang@vibeupevents.com",
  "test+mailhook@vibeupevents.com",
  "test+mailnomx@vibeupevents.com",
];
const cleanupEmails = [...addresses, "persona@no-mx-vibeup.invalid"];
process.env.TESTER_EMAILS = addresses.join(",");
process.env.RESEND_WEBHOOK_SECRET = `whsec_${randomBytes(24).toString("base64")}`;

const { suggestEmail } = await import("../src/lib/launch/email-hint.ts");
const { domainHasMx } = await import("../src/server/launch/mx.ts");
const { signupCopy } = await import("../src/content/signup.ts");
const signupRoute = await import("../src/app/api/launch/signup/route.ts");
const resendRoute = await import("../src/app/api/launch/resend/route.ts");
const verifyRoute = await import("../src/app/api/launch/verify/route.ts");
const confirmRoute = await import("../src/app/api/launch/confirm/route.ts");
const webhookRoute = await import("../src/app/api/webhooks/resend/route.ts");
const { getSupabaseAdmin } = await import("../src/lib/supabase/admin.ts");

const checks: string[] = [];

function pass(name: string) {
  checks.push(`ok ${name}`);
}

function fail(name: string, detail: string) {
  checks.push(`FAIL ${name}: ${detail}`);
}

function assert(name: string, condition: boolean, detail = "unexpected") {
  if (condition) pass(name);
  else fail(name, detail);
}

const hints: [string, string][] = [
  ["nome@gnail.com", "nome@gmail.com"],
  ["nome@gmial.com", "nome@gmail.com"],
  ["nome@gmail.co", "nome@gmail.com"],
  ["nome@hotmial.com", "nome@hotmail.com"],
  ["nome@iclod.com", "nome@icloud.com"],
];
for (const [input, expected] of hints) {
  assert(`hint ${input.split("@")[1]}`, suggestEmail(input) === expected, String(suggestEmail(input)));
}
assert("known domain has no hint", suggestEmail("nome@gmail.com") === null);

const gmailMx = await domainHasMx("gmail.com");
const missingMx = await domainHasMx("no-mx-vibeup.invalid");
assert("gmail has mx", gmailMx === true, String(gmailMx));
assert("missing domain has no mx", missingMx === false, String(missingMx));

assert(
  "replaced copy",
  signupCopy.codeReplaced === "Questo codice non è più valido, usa l’ultimo che ti abbiamo mandato",
);

function request(url: string, body: unknown) {
  return new NextRequest(url, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-forwarded-for": "203.0.113.40",
    },
    body: JSON.stringify(body),
  });
}

async function readJson(response: Response) {
  return (await response.json()) as Record<string, unknown>;
}

async function signup(email: string, phone: string, locale = "it") {
  const response = await signupRoute.POST(
    request("http://localhost/api/launch/signup", {
      firstName: "Mario",
      lastName: "Rossi",
      email,
      phonePrefix: "+39",
      phoneNational: phone,
      locale,
    }),
  );
  const data = await readJson(response);
  return { status: response.status, data };
}

function preview() {
  return readFileSync(new URL("../.tmp/emails/verify-preview.html", import.meta.url), "utf8");
}

function codeFromPreview() {
  const match = preview().match(/letter-spacing:6px[^>]*>(\d{6})</);
  return match?.[1] ?? "";
}

function tokenFromPreview() {
  const match = preview().match(/\/api\/launch\/confirm\?id=([^&"']+)&amp;t=([^"']+)/);
  if (!match) return null;
  return { id: decodeURIComponent(match[1]), token: decodeURIComponent(match[2]) };
}

const admin = getSupabaseAdmin();
if (!admin) {
  console.error("no admin client");
  process.exit(1);
}

try {
  const upper = await signup("  Test+MailHint@VibeUpEvents.com  ", "3330001181");
  assert("uppercase signup sends", upper.status === 200 && typeof upper.data.signupId === "string", String(upper.status));

  const noMx = await signup("persona@no-mx-vibeup.invalid", "3330001182");
  assert("no mx rejected", noMx.status === 400 && noMx.data.error === "no_mx", `${noMx.status} ${String(noMx.data.error)}`);

  const coded = await signup(addresses[1], "3330001183");
  const firstCode = codeFromPreview();
  assert("code issued", coded.status === 200 && firstCode.length === 6, String(coded.status));
  const verified = await verifyRoute.POST(
    request("http://localhost/api/launch/verify", { signupId: coded.data.signupId, code: firstCode }),
  );
  const verifiedBody = await readJson(verified);
  assert("code confirms once", verified.status === 200 && verifiedBody.confirmed === true, String(verified.status));
  const verifiedAgain = await verifyRoute.POST(
    request("http://localhost/api/launch/verify", { signupId: coded.data.signupId, code: firstCode }),
  );
  const againBody = await readJson(verifiedAgain);
  assert("code cannot repeat", verifiedAgain.status === 404 && againBody.error === "not_found", String(againBody.error));

  const linked = await signup(addresses[2], "3330001184");
  const link = tokenFromPreview();
  assert("confirm link present", linked.status === 200 && link !== null && link.id === linked.data.signupId, "missing link");
  if (link) {
    const opened = await confirmRoute.GET(
      new NextRequest(`http://localhost/api/launch/confirm?id=${encodeURIComponent(link.id)}&t=${encodeURIComponent(link.token)}`),
    );
    const location = opened.headers.get("location") ?? "";
    assert("link confirms", opened.status === 307 && location.includes("confirm=continue"), `${opened.status}`);
    const openedAgain = await confirmRoute.GET(
      new NextRequest(`http://localhost/api/launch/confirm?id=${encodeURIComponent(link.id)}&t=${encodeURIComponent(link.token)}`),
    );
    const again = openedAgain.headers.get("location") ?? "";
    assert("link does not verify twice", openedAgain.status === 307 && again.includes("confirm=continue"), again);
  }

  const expiring = await signup(addresses[8], "3330001189");
  const expiringLink = tokenFromPreview();
  if (expiringLink && expiring.status === 200) {
    await admin.from("waitlist_email_codes").update({ expires_at: new Date(Date.now() - 1000).toISOString() }).eq("signup_id", expiringLink.id);
    const expired = await confirmRoute.GET(
      new NextRequest(`http://localhost/api/launch/confirm?id=${encodeURIComponent(expiringLink.id)}&t=${encodeURIComponent(expiringLink.token)}`),
    );
    const expiredLocation = expired.headers.get("location") ?? "";
    assert("expired link is rejected", expired.status === 307 && expiredLocation.includes("confirm=expired"), expiredLocation);
  } else {
    fail("expired link is rejected", "missing link");
  }

  const stale = await signup(addresses[3], "3330001185");
  const oldCode = codeFromPreview();
  const resent = await resendRoute.POST(
    request("http://localhost/api/launch/resend", { signupId: stale.data.signupId, locale: "it" }),
  );
  const resentBody = await readJson(resent);
  const newCode = codeFromPreview();
  assert("resend sends a new code", resent.status === 200 && newCode.length === 6 && newCode !== oldCode, String(resentBody.error || resent.status));
  const staleTry = await verifyRoute.POST(
    request("http://localhost/api/launch/verify", { signupId: stale.data.signupId, code: oldCode }),
  );
  const staleBody = await readJson(staleTry);
  assert("old code rejected", staleTry.status === 400 && staleBody.error === "replaced", String(staleBody.error));

  const blocked = await signup(addresses[4], "3330001186");
  const retried = await signup(addresses[5], "3330001186");
  assert(
    "unverified phone can sign up again",
    blocked.status === 200 && retried.status === 200 && retried.data.error !== "phone_taken",
    `${blocked.status} ${retried.status} ${String(retried.data.error)}`,
  );

  const lang = await signup(addresses[6], "3330001187", "it");
  assert("first mail is italian", lang.status === 200 && preview().includes("Conferma la mia email"), String(lang.status));
  const langResend = await resendRoute.POST(
    request("http://localhost/api/launch/resend", { signupId: lang.data.signupId, locale: "en" }),
  );
  assert("resend follows the new language", langResend.status === 200 && preview().includes("Confirm my email"), String(langResend.status));

  const hooked = await signup(addresses[7], "3330001188");
  const secret = process.env.RESEND_WEBHOOK_SECRET ?? "";
  const payload = JSON.stringify({
    type: "email.bounced",
    created_at: new Date().toISOString(),
    data: {
      email_id: "email_test_bounce",
      created_at: new Date().toISOString(),
      from: "VibeUp <info@vibeupevents.com>",
      to: ["hidden"],
      subject: "Il tuo codice VibeUp",
      tags: { signup: hooked.data.signupId },
    },
  });
  const msgId = "msg_test_verify";
  const timestamp = new Date();
  const signature = new Webhook(secret).sign(msgId, timestamp, payload);
  const good = await webhookRoute.POST(
    new NextRequest("http://localhost/api/webhooks/resend", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "svix-id": msgId,
        "svix-timestamp": String(Math.floor(timestamp.getTime() / 1000)),
        "svix-signature": signature,
      },
      body: payload,
    }),
  );
  assert("valid webhook accepted", good.status === 200, String(good.status));
  const { data: mailRow } = await admin
    .from("waitlist_signups")
    .select("verify_mail_status")
    .eq("id", String(hooked.data.signupId))
    .maybeSingle();
  assert(
    "webhook stores bounce",
    (mailRow as { verify_mail_status?: string } | null)?.verify_mail_status === "bounced",
    String((mailRow as { verify_mail_status?: string } | null)?.verify_mail_status),
  );
  const bad = await webhookRoute.POST(
    new NextRequest("http://localhost/api/webhooks/resend", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "svix-id": msgId,
        "svix-timestamp": String(Math.floor(Date.now() / 1000)),
        "svix-signature": "v1,not-a-real-signature",
      },
      body: payload,
    }),
  );
  assert("bad webhook signature rejected", bad.status === 400, String(bad.status));

  const { data: leftoverRows } = await admin.from("waitlist_signups").select("id, email").in("email", cleanupEmails);
  const ids = ((leftoverRows ?? []) as { id: string }[]).map((row) => row.id);
  if (ids.length > 0) {
    await admin.from("waitlist_signups").delete().in("id", ids);
  }
  const { data: demos } = await admin.from("demo_submissions").select("id, payload");
  const demoIds = ((demos ?? []) as { id: string; payload: unknown }[])
    .filter((row) => ids.some((id) => JSON.stringify(row.payload ?? "").includes(id)))
    .map((row) => row.id);
  if (demoIds.length > 0) await admin.from("demo_submissions").delete().in("id", demoIds);
  const { count } = await admin
    .from("waitlist_signups")
    .select("id", { count: "exact", head: true })
    .in("email", cleanupEmails);
  assert("test rows removed", count === 0, String(count));

  const { data: openRows } = await admin
    .from("waitlist_signups")
    .select("email, verify_mail_status, email_verified_at")
    .is("email_verified_at", null);
  const open = (openRows ?? []) as { email: string; verify_mail_status: string | null }[];
  const domains = new Map<string, number>();
  let bounced = 0;
  const known = new Set([
    "gmail.com",
    "googlemail.com",
    "hotmail.com",
    "hotmail.it",
    "outlook.com",
    "outlook.it",
    "live.com",
    "live.it",
    "libero.it",
    "icloud.com",
    "me.com",
    "yahoo.com",
    "yahoo.it",
    "virgilio.it",
  ]);
  const suspicious = new Map<string, number>();
  for (const row of open) {
    const domain = row.email.split("@")[1] ?? "missing";
    domains.set(domain, (domains.get(domain) ?? 0) + 1);
    if (!known.has(domain)) suspicious.set(domain, (suspicious.get(domain) ?? 0) + 1);
    if (row.verify_mail_status === "bounced" || row.verify_mail_status === "complained") bounced += 1;
  }
  console.log(`unverified ${open.length}`);
  console.log(`bounced_unverified ${bounced}`);
  console.log(
    `domains ${[...domains.entries()].map(([domain, count]) => `${domain}:${count}`).join(" ")}`,
  );
  console.log(
    `suspicious ${[...suspicious.entries()].map(([domain, count]) => `${domain}:${count}`).join(" ") || "none"}`,
  );
} finally {
  const { data: leftoverRows } = await admin.from("waitlist_signups").select("id").in("email", cleanupEmails);
  const ids = ((leftoverRows ?? []) as { id: string }[]).map((row) => row.id);
  if (ids.length > 0) await admin.from("waitlist_signups").delete().in("id", ids);
}

console.log(checks.join("\n"));
if (checks.some((line) => line.startsWith("FAIL"))) process.exit(1);
