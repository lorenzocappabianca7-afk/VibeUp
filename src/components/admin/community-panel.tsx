"use client";

import { AdminSectionLinks } from "@/components/admin/admin-section-links";
import { Button } from "@/components/ui/button";
import { FieldLabel } from "@/components/ui/form-fields";
import { GUEST_USER, useAppState } from "@/context/app-state-context";
import { ADMIN_CATALOG_EMAIL } from "@/lib/admin-access";
import { cn } from "@/lib/utils";
import { Lock, X } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useState, type FormEvent, type ReactNode } from "react";

type TabId = "panoramica" | "iscritti" | "demo" | "gara";

type SignupRow = {
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
  demoStatus: "none" | "entered" | "completed";
  demoRating: number | null;
};

type Overview = {
  totals: {
    signups: number;
    verified: number;
    today: number;
    week: number;
    demoEntered: number;
    demoCompleted: number;
    averageRating: number | null;
    eighteenthYesRate: number | null;
  };
  funnel: { label: string; count: number; percent: number | null }[];
  perDay: { day: string; count: number }[];
  schools: { name: string; count: number }[];
  venues: { name: string; count: number }[];
  locations: { name: string; count: number }[];
  locales: { name: string; count: number }[];
};

type DemoRow = {
  id: string;
  signupId: string;
  email: string;
  name: string;
  createdAt: string;
  lastStep: string;
  lastStepAt: string | null;
  criteria: Record<string, unknown> | null;
  chosenLocation: string;
  rating: number | null;
  wouldUse: boolean | null;
  durationMs: number | null;
  steps: Record<string, string | null>;
};

type Person = {
  signup: SignupRow;
  confirmedAt: string | null;
  consents: { kind: string; granted: boolean; version: string; at: string }[];
  inviter: { code: string; username: string } | null;
  invitees: { username: string; firstName: string; verified: boolean; createdAt: string }[];
  demos: DemoRow[];
};

type LeaderRow = SignupRow & {
  position: number | null;
  excluded: boolean;
  excludedReason: string | null;
  excludedAt: string | null;
  flags: string[];
  lastInviteAt: string | null;
};

const TABS: { id: TabId; label: string }[] = [
  { id: "panoramica", label: "Panoramica" },
  { id: "iscritti", label: "Iscritti" },
  { id: "demo", label: "Demo" },
  { id: "gara", label: "Gara inviti" },
];

const inputClass =
  "w-full rounded-[14px] border border-white/10 bg-background px-3 py-2 text-sm text-primary-black focus:border-brand-teal focus:outline-none";

function tabFrom(value: string | null): TabId {
  if (value === "iscritti" || value === "demo" || value === "gara") return value;
  return "panoramica";
}

function formatWhen(value: string | null) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return new Intl.DateTimeFormat("it-IT", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

function formatDay(value: string) {
  return new Intl.DateTimeFormat("it-IT", { day: "numeric", month: "short" }).format(
    new Date(`${value}T12:00:00`),
  );
}

function demoLabel(status: SignupRow["demoStatus"]) {
  if (status === "completed") return "Completata";
  if (status === "entered") return "Entrato";
  return "Non entrato";
}

function minutes(ms: number | null) {
  if (ms == null) return "—";
  const mins = Math.max(0, Math.round(ms / 60000));
  return mins < 1 ? "< 1 min" : `${mins} min`;
}

function criteriaText(criteria: Record<string, unknown> | null) {
  if (!criteria) return "—";
  const dates = Array.isArray(criteria.dates) ? criteria.dates.join(", ") : "";
  const guests = criteria.guestCount ? `${criteria.guestCount} ospiti` : "";
  const budget =
    criteria.budgetMin || criteria.budgetMax
      ? `${criteria.budgetMin ?? "?"}–${criteria.budgetMax ?? "?"} €`
      : "";
  const text = typeof criteria.freeText === "string" ? criteria.freeText : "";
  const line = [dates, guests, budget, text].filter(Boolean).join(" · ");
  return line || "—";
}

function yesNo(value: boolean | null) {
  if (value == null) return "—";
  return value ? "Sì" : "No";
}

export function CommunityPanel() {
  const params = useSearchParams();
  const router = useRouter();
  const tab = tabFrom(params.get("tab"));
  const { createAccount, currentUser, isGuest, isStorageHydrated, switchAccount } = useAppState();
  const [email, setEmail] = useState(ADMIN_CATALOG_EMAIL);
  const [password, setPassword] = useState("");
  const [loginError, setLoginError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [gate, setGate] = useState<"checking" | "login" | "denied" | "ready">("checking");
  const [error, setError] = useState("");

  const mayTry = isStorageHydrated && !isGuest && currentUser.role === "admin";

  const checkAccess = useCallback(async () => {
    const response = await fetch("/api/admin/community?view=overview", { cache: "no-store" });
    if (response.status === 401) return "login" as const;
    if (response.status === 403) return "denied" as const;
    if (!response.ok) {
      const body = (await response.json().catch(() => null)) as { error?: string } | null;
      throw new Error(body?.error || "Caricamento non riuscito.");
    }
    return "ready" as const;
  }, []);

  useEffect(() => {
    if (!isStorageHydrated) return;
    if (!mayTry) {
      setGate(isGuest ? "login" : "denied");
      return;
    }
    let cancelled = false;
    setGate("checking");
    void checkAccess()
      .then((next) => {
        if (!cancelled) setGate(next);
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Caricamento non riuscito.");
          setGate("denied");
        }
      });
    return () => {
      cancelled = true;
    };
  }, [checkAccess, isGuest, isStorageHydrated, mayTry]);

  async function handleLogin(event: FormEvent) {
    event.preventDefault();
    if (submitting) return;
    setSubmitting(true);
    setLoginError("");
    const result = await createAccount({
      name: "Admin",
      email: email.trim().toLowerCase(),
      password,
      mode: "login",
    });
    setSubmitting(false);
    if (!result.ok) {
      setLoginError(result.error);
      return;
    }
    setPassword("");
  }

  function openTab(next: TabId) {
    router.replace(next === "panoramica" ? "/admin/demo" : `/admin/demo?tab=${next}`);
  }

  if (!isStorageHydrated || gate === "checking") {
    return <Shell><p className="text-sm text-primary-black/50">Caricamento…</p></Shell>;
  }

  if (gate !== "ready") {
    return (
      <Shell>
        <div className="mx-auto max-w-md rounded-[28px] border border-white/10 bg-surface p-6">
          <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/10 text-primary-black">
            <Lock className="h-5 w-5" aria-hidden />
          </span>
          <h1 className="mt-4 font-[family-name:var(--font-brand)] text-[28px] font-bold text-primary-black">
            Dati community
          </h1>
          <p className="mt-2 text-sm leading-relaxed text-primary-black/60">
            Pagina riservata. Entra con un account admin il cui indirizzo è in ADMIN_EMAILS.
          </p>
          {gate === "denied" ? (
            <p className="mt-4 rounded-2xl bg-brand-pink/15 px-3 py-2 text-sm text-brand-pink">
              {error || "Questo account non può aprire il pannello."}
            </p>
          ) : null}
          <form className="mt-6 space-y-4" onSubmit={(event) => void handleLogin(event)}>
            <div>
              <FieldLabel htmlFor="community-email">Email</FieldLabel>
              <input id="community-email" type="email" autoComplete="username" value={email} onChange={(event) => setEmail(event.target.value)} className={inputClass} required />
            </div>
            <div>
              <FieldLabel htmlFor="community-password">Password</FieldLabel>
              <input id="community-password" type="password" autoComplete="current-password" value={password} onChange={(event) => setPassword(event.target.value)} className={inputClass} required />
            </div>
            {loginError ? <p className="text-sm font-medium text-brand-pink">{loginError}</p> : null}
            <Button type="submit" className="h-[50px] w-full rounded-[14px] text-[17px]" disabled={submitting || !password}>
              {submitting ? "Accesso…" : "Entra"}
            </Button>
          </form>
        </div>
      </Shell>
    );
  }

  return (
    <Shell>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <AdminSectionLinks current="demo" />
          <h1 className="mt-3 font-[family-name:var(--font-brand)] text-[32px] font-bold leading-none text-primary-black">
            Dati community
          </h1>
        </div>
        <Button type="button" variant="outline" className="min-h-11 px-3" onClick={() => switchAccount(GUEST_USER.id)}>
          Esci
        </Button>
      </div>
      <div className="mt-5 flex gap-2 overflow-x-auto pb-1">
        {TABS.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => openTab(item.id)}
            className={cn(
              "min-h-11 shrink-0 rounded-full px-4 text-sm font-semibold",
              tab === item.id ? "bg-brand-pink text-ink-inverse" : "bg-surface text-primary-black/70",
            )}
          >
            {item.label}
          </button>
        ))}
      </div>
      {tab === "panoramica" ? <OverviewTab /> : null}
      {tab === "iscritti" ? <SignupsTab /> : null}
      {tab === "demo" ? <DemosTab /> : null}
      {tab === "gara" ? <ContestTab /> : null}
    </Shell>
  );
}

function Shell({ children }: { children: ReactNode }) {
  return (
    <div className="mx-auto box-border min-h-dvh w-full max-w-6xl bg-background px-4 py-6 sm:px-6">
      {children}
    </div>
  );
}

function OverviewTab() {
  const [data, setData] = useState<Overview | null>(null);
  const [error, setError] = useState("");
  useEffect(() => {
    let cancelled = false;
    void fetch("/api/admin/community?view=overview", { cache: "no-store" })
      .then(async (response) => {
        const body = (await response.json()) as Overview & { error?: string };
        if (!response.ok) throw new Error(body.error || "Caricamento non riuscito.");
        if (!cancelled) setData(body);
      })
      .catch((err: unknown) => {
        if (!cancelled) setError(err instanceof Error ? err.message : "Caricamento non riuscito.");
      });
    return () => {
      cancelled = true;
    };
  }, []);
  if (error) return <p className="mt-6 text-sm text-brand-pink">{error}</p>;
  if (!data) return <p className="mt-6 text-sm text-primary-black/50">Caricamento…</p>;
  const cards = [
    ["Iscritti", String(data.totals.signups)],
    ["Verificati", String(data.totals.verified)],
    ["Oggi", String(data.totals.today)],
    ["Ultimi 7 giorni", String(data.totals.week)],
    ["Entrati in demo", String(data.totals.demoEntered)],
    ["Demo completate", String(data.totals.demoCompleted)],
    ["Voto medio", data.totals.averageRating == null ? "—" : String(data.totals.averageRating)],
    ["La useresti per il 18", data.totals.eighteenthYesRate == null ? "—" : `${data.totals.eighteenthYesRate}%`],
  ];
  const maxDay = Math.max(1, ...data.perDay.map((day) => day.count));
  return (
    <div className="mt-6 space-y-8">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {cards.map(([label, value]) => (
          <div key={label} className="rounded-2xl border border-white/10 bg-surface p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-primary-black/45">{label}</p>
            <p className="mt-1 font-[family-name:var(--font-brand)] text-2xl font-bold">{value}</p>
          </div>
        ))}
      </div>
      <section>
        <h2 className="font-[family-name:var(--font-brand)] text-lg font-bold">Imbuto</h2>
        <ol className="mt-3 space-y-2">
          {data.funnel.map((step) => (
            <li key={step.label} className="grid grid-cols-[minmax(0,1fr)_auto_auto] items-center gap-3 text-sm">
              <span>{step.label}</span>
              <span className="font-bold tabular-nums">{step.count}</span>
              <span className="w-14 text-right text-primary-black/45">{step.percent == null ? "—" : `${step.percent}%`}</span>
            </li>
          ))}
        </ol>
      </section>
      <section>
        <h2 className="font-[family-name:var(--font-brand)] text-lg font-bold">Iscrizioni per giorno</h2>
        <div className="mt-3 flex h-40 items-end gap-1 overflow-x-auto">
          {data.perDay.map((day) => (
            <div key={day.day} className="flex w-8 shrink-0 flex-col items-center justify-end gap-1">
              <span className="text-[10px] text-primary-black/50">{day.count}</span>
              <div className="w-full rounded-t bg-brand-pink" style={{ height: `${Math.max(4, (day.count / maxDay) * 100)}px` }} />
              <span className="text-[10px] text-primary-black/45">{formatDay(day.day)}</span>
            </div>
          ))}
        </div>
      </section>
      <div className="grid gap-6 sm:grid-cols-2">
        <RankList title="Licei più citati" rows={data.schools} />
        <RankList title="Locali sognati" rows={data.venues} />
        <RankList title="Location più scelte in demo" rows={data.locations} />
        <RankList title="Lingua" rows={data.locales} />
      </div>
    </div>
  );
}

function RankList({ title, rows }: { title: string; rows: { name: string; count: number }[] }) {
  return (
    <section>
      <h2 className="font-[family-name:var(--font-brand)] text-lg font-bold">{title}</h2>
      {rows.length === 0 ? <p className="mt-2 text-sm text-primary-black/45">Nessun dato.</p> : (
        <ol className="mt-2 space-y-1 text-sm">
          {rows.map((row) => (
            <li key={row.name} className="flex justify-between gap-3">
              <span className="min-w-0 truncate">{row.name}</span>
              <span className="text-primary-black/45">{row.count}</span>
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}

function SignupsTab() {
  const [rows, setRows] = useState<SignupRow[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [q, setQ] = useState("");
  const [verified, setVerified] = useState("all");
  const [school, setSchool] = useState("");
  const [venue, setVenue] = useState("");
  const [marketing, setMarketing] = useState("all");
  const [demo, setDemo] = useState("all");
  const [locale, setLocale] = useState("all");
  const [sort, setSort] = useState("createdAt");
  const [dir, setDir] = useState<"asc" | "desc">("desc");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [person, setPerson] = useState<Person | null>(null);
  const [personId, setPersonId] = useState("");
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [reload, setReload] = useState(0);
  const [qInput, setQInput] = useState("");
  const [schoolInput, setSchoolInput] = useState("");
  const [venueInput, setVenueInput] = useState("");

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setPage(1);
      setQ(qInput);
      setSchool(schoolInput);
      setVenue(venueInput);
    }, 300);
    return () => window.clearTimeout(timer);
  }, [qInput, schoolInput, venueInput]);

  const queryString = useCallback(() => {
    const search = new URLSearchParams({
      view: "signups",
      page: String(page),
      q,
      verified,
      school,
      venue,
      marketing,
      demo,
      locale,
      sort,
      dir,
    });
    return search.toString();
  }, [demo, dir, locale, marketing, page, q, school, sort, venue, verified]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    void fetch(`/api/admin/community?${queryString()}`, { cache: "no-store" })
      .then(async (response) => {
        const body = (await response.json()) as { rows?: SignupRow[]; total?: number; error?: string };
        if (!response.ok) throw new Error(body.error || "Caricamento non riuscito.");
        if (!cancelled) {
          setRows(body.rows ?? []);
          setTotal(body.total ?? 0);
        }
      })
      .catch((err: unknown) => {
        if (!cancelled) setError(err instanceof Error ? err.message : "Caricamento non riuscito.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [queryString, reload]);

  function toggleSort(column: string) {
    setPage(1);
    if (sort === column) setDir((current) => (current === "asc" ? "desc" : "asc"));
    else {
      setSort(column);
      setDir("asc");
    }
  }

  async function openPerson(id: string) {
    setPersonId(id);
    setConfirmDelete(false);
    const response = await fetch(`/api/admin/community?view=person&id=${id}`, { cache: "no-store" });
    const body = (await response.json()) as Person & { error?: string };
    if (!response.ok) {
      setError(body.error || "Scheda non disponibile.");
      return;
    }
    setPerson(body);
  }

  async function removePerson() {
    if (!person || deleting) return;
    setDeleting(true);
    const response = await fetch("/api/admin/community", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ signupId: person.signup.id }),
    });
    setDeleting(false);
    if (!response.ok) {
      const body = (await response.json().catch(() => null)) as { error?: string } | null;
      setError(body?.error || "Cancellazione non riuscita.");
      return;
    }
    setPerson(null);
    setPage(1);
    setReload((current) => current + 1);
  }

  async function downloadCsv() {
    const search = new URLSearchParams(queryString());
    search.set("format", "csv");
    search.delete("page");
    const response = await fetch(`/api/admin/community?${search.toString()}`, { cache: "no-store" });
    if (!response.ok) return;
    const blob = await response.blob();
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "vibeup-iscritti.csv";
    link.click();
    URL.revokeObjectURL(url);
  }

  const pages = Math.max(1, Math.ceil(total / 50));
  const columns: [string, string][] = [
    ["createdAt", "Data"],
    ["firstName", "Nome"],
    ["lastName", "Cognome"],
    ["username", "Username"],
    ["email", "Email"],
    ["phone", "Telefono"],
    ["birthYear", "Anno"],
    ["highSchool", "Liceo"],
    ["dreamVenue", "Locale"],
    ["locale", "Lingua"],
    ["vibeupCode", "Codice"],
    ["referredByCode", "Invitato da"],
  ];

  return (
    <div className="mt-6">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <input value={qInput} onChange={(event) => setQInput(event.target.value)} placeholder="Cerca" className={inputClass} aria-label="Cerca iscritti" />
        <select value={verified} onChange={(event) => { setPage(1); setVerified(event.target.value); }} className={inputClass} aria-label="Verificati">
          <option value="all">Verifica: tutti</option>
          <option value="yes">Verificati</option>
          <option value="no">Non verificati</option>
        </select>
        <select value={marketing} onChange={(event) => { setPage(1); setMarketing(event.target.value); }} className={inputClass} aria-label="Marketing">
          <option value="all">Marketing: tutti</option>
          <option value="yes">Con marketing</option>
          <option value="no">Senza marketing</option>
        </select>
        <select value={demo} onChange={(event) => { setPage(1); setDemo(event.target.value); }} className={inputClass} aria-label="Stato demo">
          <option value="all">Demo: tutti</option>
          <option value="none">Non entrato</option>
          <option value="entered">Entrato</option>
          <option value="completed">Completata</option>
        </select>
        <select value={locale} onChange={(event) => { setPage(1); setLocale(event.target.value); }} className={inputClass} aria-label="Lingua">
          <option value="all">Lingua: tutte</option>
          <option value="it">Italiano</option>
          <option value="en">English</option>
        </select>
        <input value={schoolInput} onChange={(event) => setSchoolInput(event.target.value)} placeholder="Liceo" className={inputClass} aria-label="Filtro liceo" />
        <input value={venueInput} onChange={(event) => setVenueInput(event.target.value)} placeholder="Locale desiderato" className={inputClass} aria-label="Filtro locale" />
        <Button type="button" variant="outline" className="min-h-11" onClick={() => void downloadCsv()}>
          Esporta CSV
        </Button>
      </div>
      {error ? <p className="mt-3 text-sm text-brand-pink">{error}</p> : null}
      {loading ? <p className="mt-4 text-sm text-primary-black/50">Caricamento…</p> : null}
      <div className="mt-4 overflow-x-auto rounded-2xl border border-white/10">
        <table className="min-w-[1400px] w-full text-left text-sm">
          <thead className="bg-surface text-xs uppercase tracking-wide text-primary-black/50">
            <tr>
              {columns.map(([id, label]) => (
                <th key={id} className="px-3 py-2 font-semibold">
                  <button type="button" className="min-h-11" onClick={() => toggleSort(id)}>
                    {label}{sort === id ? (dir === "asc" ? " ↑" : " ↓") : ""}
                  </button>
                </th>
              ))}
              <th className="px-3 py-2 font-semibold">Inviti</th>
              <th className="px-3 py-2 font-semibold">Verifica</th>
              <th className="px-3 py-2 font-semibold">Benvenuto</th>
              <th className="px-3 py-2 font-semibold">Consensi</th>
              <th className="px-3 py-2 font-semibold">Demo</th>
              <th className="px-3 py-2 font-semibold">Voto</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.id} className="cursor-pointer border-t border-white/10 hover:bg-white/[0.03]" onClick={() => void openPerson(row.id)}>
                <td className="px-3 py-2 whitespace-nowrap">{formatWhen(row.createdAt)}</td>
                <td className="px-3 py-2">{row.firstName}</td>
                <td className="px-3 py-2">{row.lastName}</td>
                <td className="px-3 py-2">{row.username}</td>
                <td className="px-3 py-2">{row.email}</td>
                <td className="px-3 py-2 whitespace-nowrap">{row.phone || "—"}</td>
                <td className="px-3 py-2">{row.birthYear ?? "—"}</td>
                <td className="px-3 py-2">{row.highSchool || "—"}</td>
                <td className="px-3 py-2">{row.dreamVenue || "—"}</td>
                <td className="px-3 py-2 uppercase">{row.locale}</td>
                <td className="px-3 py-2">{row.vibeupCode || "—"}</td>
                <td className="px-3 py-2">{row.referredByCode ? `${row.referredByCode}${row.referredByUsername ? ` · @${row.referredByUsername}` : ""}` : "—"}</td>
                <td className="px-3 py-2">{row.validInvites}</td>
                <td className="px-3 py-2">{row.verified ? "Sì" : "No"}</td>
                <td className="px-3 py-2">{row.welcomeEmailSent ? "Sì" : "No"}</td>
                <td className="px-3 py-2">{`${row.consentPrivacy ? "P" : "–"} ${row.consentRules ? "R" : "–"} ${row.consentMarketing ? "M" : "–"}`}</td>
                <td className="px-3 py-2">{demoLabel(row.demoStatus)}</td>
                <td className="px-3 py-2">{row.demoRating ?? "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="mt-3 flex items-center justify-between text-sm">
        <span className="text-primary-black/50">{total} iscritti</span>
        <div className="flex gap-2">
          <Button type="button" variant="outline" className="min-h-11" disabled={page <= 1} onClick={() => setPage((current) => current - 1)}>Indietro</Button>
          <span className="self-center">{page}/{pages}</span>
          <Button type="button" variant="outline" className="min-h-11" disabled={page >= pages} onClick={() => setPage((current) => current + 1)}>Avanti</Button>
        </div>
      </div>
      {person && personId ? (
        <aside className="fixed inset-y-0 right-0 z-40 flex w-full max-w-md flex-col overflow-y-auto border-l border-white/10 bg-surface p-5 shadow-2xl">
          <div className="flex items-start justify-between gap-3">
            <h2 className="font-[family-name:var(--font-brand)] text-xl font-bold">
              {person.signup.firstName} {person.signup.lastName}
            </h2>
            <button type="button" className="flex h-11 w-11 items-center justify-center rounded-full bg-background" onClick={() => setPerson(null)} aria-label="Chiudi scheda">
              <X className="h-4 w-4" />
            </button>
          </div>
          <dl className="mt-4 space-y-2 text-sm">
            {[
              ["Username", person.signup.username],
              ["Email", person.signup.email],
              ["Telefono", person.signup.phone || "—"],
              ["Anno", person.signup.birthYear == null ? "—" : String(person.signup.birthYear)],
              ["Liceo", person.signup.highSchool || "—"],
              ["Locale desiderato", person.signup.dreamVenue || "—"],
              ["Lingua", person.signup.locale.toUpperCase()],
              ["VibeUpcode", person.signup.vibeupCode || "—"],
              ["Iscritto", formatWhen(person.signup.createdAt)],
              ["Email confermata", formatWhen(person.confirmedAt)],
              ["Benvenuto", person.signup.welcomeEmailSent ? "Inviata" : "No"],
            ].map(([label, value]) => (
              <div key={label} className="flex justify-between gap-3">
                <dt className="text-primary-black/45">{label}</dt>
                <dd className="text-right">{value}</dd>
              </div>
            ))}
          </dl>
          <h3 className="mt-6 text-sm font-bold">Consensi</h3>
          <ul className="mt-2 space-y-1 text-sm">
            {person.consents.length === 0 ? <li className="text-primary-black/45">Nessun consenso registrato.</li> : person.consents.map((item) => (
              <li key={`${item.kind}-${item.at}`}>{item.kind} · {item.granted ? "sì" : "no"} · {item.version} · {formatWhen(item.at)}</li>
            ))}
          </ul>
          <h3 className="mt-6 text-sm font-bold">Inviti</h3>
          <p className="mt-1 text-sm">Invitato da {person.inviter ? `${person.inviter.code}${person.inviter.username ? ` · @${person.inviter.username}` : ""}` : "—"}</p>
          <ul className="mt-2 space-y-1 text-sm">
            {person.invitees.length === 0 ? <li className="text-primary-black/45">Nessun invito valido.</li> : person.invitees.map((item) => (
              <li key={item.username}>@{item.username} · {item.firstName} · {formatWhen(item.createdAt)}</li>
            ))}
          </ul>
          <h3 className="mt-6 text-sm font-bold">Percorso demo</h3>
          {person.demos.length === 0 ? <p className="mt-2 text-sm text-primary-black/45">Non è entrato nella demo.</p> : person.demos.map((demo) => (
            <div key={demo.id} className="mt-3 rounded-2xl bg-background p-3 text-sm">
              <p>{demo.lastStep} · {formatWhen(demo.lastStepAt)}</p>
              <p className="mt-1 text-primary-black/60">Criteri: {criteriaText(demo.criteria)}</p>
              <p className="mt-1">Location: {demo.chosenLocation || "—"}</p>
              <p className="mt-1">Voto {demo.rating ?? "—"} · 18esimo {yesNo(demo.wouldUse)} · {minutes(demo.durationMs)}</p>
              <ul className="mt-2 space-y-1 text-xs text-primary-black/55">
                {Object.entries({
                  Ingresso: demo.steps.stepEnteredAt,
                  Criteri: demo.steps.stepCriteriaAt,
                  Location: demo.steps.stepLocationAt,
                  Richiesta: demo.steps.stepRequestAt,
                  Evento: demo.steps.stepEventAt,
                  Valutazione: demo.steps.stepRatingAt,
                }).map(([label, at]) => <li key={label}>{label}: {formatWhen(at)}</li>)}
              </ul>
            </div>
          ))}
          {confirmDelete ? (
            <div className="mt-6 rounded-2xl border border-brand-pink/40 p-3">
              <p className="text-sm">Elimina tutti i dati di {person.signup.firstName}? L’iscrizione, i codici e i consensi vengono cancellati come da richiesta privacy.</p>
              <div className="mt-3 flex gap-2">
                <Button type="button" className="min-h-11 bg-brand-pink text-ink-inverse" disabled={deleting} onClick={() => void removePerson()}>
                  {deleting ? "Elimino…" : "Elimina dati"}
                </Button>
                <Button type="button" variant="outline" className="min-h-11" onClick={() => setConfirmDelete(false)}>Annulla</Button>
              </div>
            </div>
          ) : (
            <Button type="button" variant="outline" className="mt-6 min-h-11" onClick={() => setConfirmDelete(true)}>
              Elimina dati
            </Button>
          )}
        </aside>
      ) : null}
    </div>
  );
}

function DemosTab() {
  const [rows, setRows] = useState<DemoRow[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [error, setError] = useState("");
  useEffect(() => {
    let cancelled = false;
    void fetch(`/api/admin/community?view=demos&page=${page}`, { cache: "no-store" })
      .then(async (response) => {
        const body = (await response.json()) as { rows?: DemoRow[]; total?: number; error?: string };
        if (!response.ok) throw new Error(body.error || "Caricamento non riuscito.");
        if (!cancelled) {
          setRows(body.rows ?? []);
          setTotal(body.total ?? 0);
        }
      })
      .catch((err: unknown) => {
        if (!cancelled) setError(err instanceof Error ? err.message : "Caricamento non riuscito.");
      });
    return () => {
      cancelled = true;
    };
  }, [page]);
  async function downloadCsv() {
    const response = await fetch("/api/admin/community?view=demos&format=csv", { cache: "no-store" });
    if (!response.ok) return;
    const blob = await response.blob();
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "vibeup-demo.csv";
    link.click();
    URL.revokeObjectURL(url);
  }
  const pages = Math.max(1, Math.ceil(total / 50));
  return (
    <div className="mt-6">
      <Button type="button" variant="outline" className="min-h-11" onClick={() => void downloadCsv()}>Esporta CSV</Button>
      {error ? <p className="mt-3 text-sm text-brand-pink">{error}</p> : null}
      <div className="mt-4 overflow-x-auto rounded-2xl border border-white/10">
        <table className="min-w-[980px] w-full text-left text-sm">
          <thead className="bg-surface text-xs uppercase tracking-wide text-primary-black/50">
            <tr>
              {["Data", "Nome / email", "Ultimo passo", "Criteri", "Location", "Voto", "18esimo", "Tempo"].map((label) => (
                <th key={label} className="px-3 py-2 font-semibold">{label}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.id} className="border-t border-white/10">
                <td className="px-3 py-2 whitespace-nowrap">{formatWhen(row.createdAt)}</td>
                <td className="px-3 py-2">{row.name || "—"}<br />{row.email || row.signupId || "—"}</td>
                <td className="px-3 py-2">{row.lastStep}<br /><span className="text-xs text-primary-black/45">{formatWhen(row.lastStepAt)}</span></td>
                <td className="px-3 py-2">{criteriaText(row.criteria)}</td>
                <td className="px-3 py-2">{row.chosenLocation || "—"}</td>
                <td className="px-3 py-2">{row.rating ?? "—"}</td>
                <td className="px-3 py-2">{yesNo(row.wouldUse)}</td>
                <td className="px-3 py-2">{minutes(row.durationMs)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="mt-3 flex items-center justify-between text-sm">
        <span className="text-primary-black/50">{total} sessioni</span>
        <div className="flex gap-2">
          <Button type="button" variant="outline" className="min-h-11" disabled={page <= 1} onClick={() => setPage((current) => current - 1)}>Indietro</Button>
          <span className="self-center">{page}/{pages}</span>
          <Button type="button" variant="outline" className="min-h-11" disabled={page >= pages} onClick={() => setPage((current) => current + 1)}>Avanti</Button>
        </div>
      </div>
    </div>
  );
}

function ContestTab() {
  const [rows, setRows] = useState<LeaderRow[]>([]);
  const [error, setError] = useState("");
  const [pending, setPending] = useState<{ row: LeaderRow; excluded: boolean } | null>(null);
  const [reason, setReason] = useState("");
  const [saving, setSaving] = useState(false);

  async function load() {
    const response = await fetch("/api/admin/signups", { cache: "no-store" });
    const body = (await response.json()) as { leaderboard?: LeaderRow[]; error?: string };
    if (!response.ok) throw new Error(body.error || "Caricamento non riuscito.");
    setRows(body.leaderboard ?? []);
  }

  useEffect(() => {
    let cancelled = false;
    void load().catch((err: unknown) => {
      if (!cancelled) setError(err instanceof Error ? err.message : "Caricamento non riuscito.");
    });
    return () => {
      cancelled = true;
    };
  }, []);

  async function save(event: FormEvent) {
    event.preventDefault();
    if (!pending || saving) return;
    setSaving(true);
    setError("");
    const response = await fetch("/api/admin/signups/exclusion", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ signupId: pending.row.id, excluded: pending.excluded, reason }),
    });
    setSaving(false);
    const body = (await response.json().catch(() => null)) as { error?: string } | null;
    if (!response.ok) {
      setError(body?.error || "Salvataggio non riuscito.");
      return;
    }
    setPending(null);
    setReason("");
    await load();
  }

  return (
    <div className="mt-6">
      <p className="text-sm text-primary-black/60">Chi viene escluso resta iscritto e non conta più in classifica. Le segnalazioni arrivano dalle regole antifrode già attive.</p>
      {error ? <p className="mt-3 text-sm text-brand-pink">{error}</p> : null}
      <div className="mt-4 overflow-x-auto rounded-2xl border border-white/10">
        <table className="min-w-[860px] w-full text-left text-sm">
          <thead className="bg-surface text-xs uppercase tracking-wide text-primary-black/50">
            <tr>
              {["Pos.", "Username", "Nome", "Inviti", "Ultimo invito", "Segnalazioni", "Gara"].map((label) => (
                <th key={label} className="px-3 py-2 font-semibold">{label}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.id} className="border-t border-white/10">
                <td className="px-3 py-2">{row.position ?? "—"}</td>
                <td className="px-3 py-2">{row.username}</td>
                <td className="px-3 py-2">{row.firstName} {row.lastName}</td>
                <td className="px-3 py-2">{row.validInvites}</td>
                <td className="px-3 py-2">{formatWhen(row.lastInviteAt)}</td>
                <td className="px-3 py-2 text-brand-pink">{row.flags.join(" · ") || "—"}</td>
                <td className="px-3 py-2">
                  <button type="button" className="min-h-11 font-semibold underline-offset-4 hover:underline" onClick={() => { setPending({ row, excluded: !row.excluded }); setReason(""); }}>
                    {row.excluded ? "Riammetti" : "Escludi"}
                  </button>
                  {row.excluded && row.excludedReason ? <p className="mt-1 max-w-[220px] text-xs text-primary-black/50">{row.excludedReason} · {formatWhen(row.excludedAt)}</p> : null}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {pending ? (
        <form className="fixed inset-x-4 bottom-4 z-30 mx-auto max-w-lg rounded-2xl border border-white/10 bg-background p-4 shadow-xl" onSubmit={(event) => void save(event)}>
          <p className="text-sm font-bold">{pending.excluded ? "Escludi" : "Riammetti"} @{pending.row.username}</p>
          <p className="mt-1 text-xs text-primary-black/55">Il motivo è obbligatorio e resta salvato con la data.</p>
          <textarea value={reason} onChange={(event) => setReason(event.target.value)} required minLength={3} maxLength={400} rows={3} className={`${inputClass} mt-3`} placeholder="Motivo" />
          <div className="mt-3 flex gap-2">
            <Button type="submit" className="min-h-11" disabled={saving || reason.trim().length < 3}>{saving ? "Salvo…" : "Conferma"}</Button>
            <Button type="button" variant="outline" className="min-h-11" onClick={() => setPending(null)}>Annulla</Button>
          </div>
        </form>
      ) : null}
    </div>
  );
}
