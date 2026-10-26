"use client";

import { AdminSectionLinks } from "@/components/admin/admin-section-links";
import { Button } from "@/components/ui/button";
import { FieldLabel } from "@/components/ui/form-fields";
import { GUEST_USER, useAppState } from "@/context/app-state-context";
import { ADMIN_CATALOG_EMAIL, canAccessAdminCatalog } from "@/lib/admin-access";
import { APP_SHELL_WIDTH_CLASS, cn } from "@/lib/utils";
import { Lock } from "lucide-react";
import { useEffect, useMemo, useState, type FormEvent } from "react";

type SignupRow = {
  id: string;
  firstName: string;
  lastName: string;
  username: string;
  email: string;
  phone: string;
  birthYear: number | null;
  highSchool: string;
  dreamVenue: string | null;
  vibeupCode: string | null;
  referredByCode: string | null;
  verified: boolean;
  emailVerifiedAt: string | null;
  welcomeEmailSent: boolean;
  marketing: boolean;
  createdAt: string;
  excluded: boolean;
  excludedReason: string | null;
  excludedAt: string | null;
  flags: string[];
  validInvites: number;
  lastInviteAt: string | null;
};

type LeaderRow = SignupRow & { position: number | null };

type Snapshot = {
  signups: SignupRow[];
  leaderboard: LeaderRow[];
  stats: {
    total: number;
    verified: number;
    perDay: { day: string; count: number }[];
    schools: { name: string; count: number }[];
    venues: { name: string; count: number }[];
    demoCompleted: number;
    demoAverageRating: number | null;
    demoRated: number;
  };
};

const inputClassName =
  "w-full rounded-xl border border-primary-black/10 bg-background px-3 py-2 text-sm text-primary-black placeholder:text-primary-black/40 focus:border-brand-teal focus:outline-none focus:ring-2 focus:ring-brand-teal/20";

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
  const date = new Date(`${value}T12:00:00`);
  return new Intl.DateTimeFormat("it-IT", { day: "numeric", month: "short" }).format(date);
}

function csvCell(value: string) {
  return `"${value.replaceAll('"', '""')}"`;
}

function downloadCsv(rows: SignupRow[]) {
  const header = [
    "Nome",
    "Cognome",
    "Username",
    "Email",
    "Telefono",
    "Anno",
    "Liceo",
    "Locale",
    "Codice",
    "Invitato da",
    "Verificato",
    "Mail di benvenuto",
    "Marketing",
    "Inviti validi",
    "Escluso",
    "Motivo esclusione",
    "Segnalazioni",
    "Iscritto il",
  ];
  const lines = rows.map((row) =>
    [
      row.firstName,
      row.lastName,
      row.username,
      row.email,
      row.phone,
      String(row.birthYear ?? ""),
      row.highSchool,
      row.dreamVenue ?? "",
      row.vibeupCode ?? "",
      row.referredByCode ?? "",
      row.verified ? "sì" : "no",
      row.welcomeEmailSent ? "sì" : "no",
      row.marketing ? "sì" : "no",
      String(row.validInvites),
      row.excluded ? "sì" : "no",
      row.excludedReason ?? "",
      row.flags.join("; "),
      row.createdAt,
    ]
      .map(csvCell)
      .join(","),
  );
  const blob = new Blob([`\uFEFF${header.map(csvCell).join(",")}\n${lines.join("\n")}`], {
    type: "text/csv;charset=utf-8",
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = "vibeup-iscrizioni.csv";
  link.click();
  URL.revokeObjectURL(url);
}

export function SignupsPanel() {
  const { createAccount, currentUser, isGuest, isStorageHydrated, switchAccount } = useAppState();
  const allowed = canAccessAdminCatalog(currentUser.email, currentUser.role);
  const [data, setData] = useState<Snapshot | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<"list" | "rank" | "stats">("list");
  const [query, setQuery] = useState("");
  const [verified, setVerified] = useState<"all" | "yes" | "no">("all");
  const [school, setSchool] = useState("");
  const [venue, setVenue] = useState("");
  const [marketing, setMarketing] = useState<"all" | "yes" | "no">("all");
  const [email, setEmail] = useState(ADMIN_CATALOG_EMAIL);
  const [password, setPassword] = useState("");
  const [loginError, setLoginError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [pending, setPending] = useState<{ row: LeaderRow; excluded: boolean } | null>(null);
  const [reason, setReason] = useState("");
  const [actionError, setActionError] = useState("");
  const [saving, setSaving] = useState(false);

  async function load() {
    const response = await fetch("/api/admin/signups", { cache: "no-store" });
    const body = (await response.json().catch(() => null)) as (Snapshot & { error?: string }) | null;
    if (!response.ok) throw new Error(body?.error || "Caricamento non riuscito.");
    if (!body?.signups || !body.leaderboard || !body.stats) {
      throw new Error("Risposta non valida.");
    }
    setData(body);
  }

  useEffect(() => {
    if (!allowed) return;
    let cancelled = false;
    const timer = window.setTimeout(() => {
      setLoading(true);
      setError("");
      void load()
        .catch((err: unknown) => {
          if (!cancelled) setError(err instanceof Error ? err.message : "Caricamento non riuscito.");
        })
        .finally(() => {
          if (!cancelled) setLoading(false);
        });
    }, 0);
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [allowed]);

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    const schoolNeedle = school.trim().toLowerCase();
    const venueNeedle = venue.trim().toLowerCase();
    return (data?.signups ?? []).filter((row) => {
      if (verified === "yes" && !row.verified) return false;
      if (verified === "no" && row.verified) return false;
      if (marketing === "yes" && !row.marketing) return false;
      if (marketing === "no" && row.marketing) return false;
      if (schoolNeedle && !(row.highSchool ?? "").toLowerCase().includes(schoolNeedle)) return false;
      if (venueNeedle && !(row.dreamVenue ?? "").toLowerCase().includes(venueNeedle)) return false;
      if (!needle) return true;
      const haystack = [
        row.firstName,
        row.lastName,
        row.username,
        row.email,
        row.phone,
        row.vibeupCode ?? "",
        row.highSchool,
        row.dreamVenue ?? "",
      ]
        .join(" ")
        .toLowerCase();
      return haystack.includes(needle);
    });
  }, [data, marketing, query, school, venue, verified]);

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

  async function saveExclusion(event: FormEvent) {
    event.preventDefault();
    if (!pending || saving) return;
    setSaving(true);
    setActionError("");
    try {
      const response = await fetch("/api/admin/signups/exclusion", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          signupId: pending.row.id,
          excluded: pending.excluded,
          reason,
        }),
      });
      const body = (await response.json().catch(() => null)) as { error?: string } | null;
      if (!response.ok) throw new Error(body?.error || "Salvataggio non riuscito.");
      setPending(null);
      setReason("");
      await load();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "Salvataggio non riuscito.");
    } finally {
      setSaving(false);
    }
  }

  if (!isStorageHydrated) {
    return (
      <div className={cn("mx-auto box-border min-h-dvh bg-background px-4 py-10", APP_SHELL_WIDTH_CLASS)}>
        <p className="text-sm text-primary-black/50">Caricamento…</p>
      </div>
    );
  }

  if (!allowed) {
    return (
      <div className={cn("mx-auto box-border flex min-h-dvh items-center bg-background px-4 py-10", APP_SHELL_WIDTH_CLASS)}>
        <div className="w-full rounded-[2rem] border border-primary-black/10 bg-primary-black/[0.02] p-6">
          <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/12 text-primary-black">
            <Lock className="h-5 w-5" aria-hidden />
          </span>
          <h1 className="mt-4 text-2xl font-black text-primary-black">Iscrizioni</h1>
          <p className="mt-2 text-sm text-primary-black/60">
            Pagina riservata. Accedi con l’account admin per vedere le iscrizioni e la gara inviti.
          </p>
          {!isGuest ? (
            <p className="mt-4 rounded-2xl bg-brand-pink/12 px-3 py-2 text-sm text-brand-pink">
              L’account con cui sei connesso non può aprire questo pannello.
            </p>
          ) : null}
          <form className="mt-6 space-y-4" onSubmit={(event) => void handleLogin(event)}>
            <div>
              <FieldLabel htmlFor="signups-email">Email</FieldLabel>
              <input
                id="signups-email"
                type="email"
                autoComplete="username"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                className={inputClassName}
                required
              />
            </div>
            <div>
              <FieldLabel htmlFor="signups-password">Password</FieldLabel>
              <input
                id="signups-password"
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                className={inputClassName}
                required
              />
            </div>
            {loginError ? <p className="text-sm font-medium text-brand-pink">{loginError}</p> : null}
            <Button type="submit" className="w-full" disabled={submitting || !password}>
              {submitting ? "Accesso…" : "Entra"}
            </Button>
          </form>
        </div>
      </div>
    );
  }

  const maxDay = Math.max(1, ...(data?.stats.perDay.map((day) => day.count) ?? [1]));

  return (
    <div className={cn("mx-auto box-border min-h-dvh bg-background px-4 py-6", APP_SHELL_WIDTH_CLASS)}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <AdminSectionLinks current="demo" />
          <h1 className="mt-3 text-2xl font-black text-primary-black">Iscrizioni</h1>
          <p className="mt-1 text-sm text-primary-black/60">
            Community, gara inviti e segnalazioni. Chi viene escluso resta iscritto e non conta più in classifica.
          </p>
        </div>
        <Button type="button" variant="outline" className="px-3 py-2 text-xs" onClick={() => switchAccount(GUEST_USER.id)}>
          Esci
        </Button>
      </div>

      <div className="mt-5 flex flex-wrap gap-2">
        {(
          [
            ["list", "Iscrizioni"],
            ["rank", "Classifica"],
            ["stats", "Statistiche"],
          ] as const
        ).map(([id, label]) => (
          <button
            key={id}
            type="button"
            onClick={() => setTab(id)}
            className={cn(
              "rounded-full px-4 py-2 text-sm font-semibold",
              tab === id ? "bg-primary-black text-background" : "bg-primary-black/[0.06] text-primary-black/70",
            )}
          >
            {label}
          </button>
        ))}
      </div>

      {loading ? <p className="mt-6 text-sm text-primary-black/50">Caricamento…</p> : null}
      {error ? <p className="mt-6 text-sm font-medium text-brand-pink">{error}</p> : null}

      {data && tab === "list" ? (
        <div className="mt-5">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Cerca nome, email, codice"
              className={inputClassName}
              aria-label="Cerca iscrizioni"
            />
            <select
              value={verified}
              onChange={(event) => setVerified(event.target.value as "all" | "yes" | "no")}
              className={inputClassName}
              aria-label="Filtro verifica"
            >
              <option value="all">Tutti</option>
              <option value="yes">Verificati</option>
              <option value="no">Non verificati</option>
            </select>
            <select
              value={marketing}
              onChange={(event) => setMarketing(event.target.value as "all" | "yes" | "no")}
              className={inputClassName}
              aria-label="Filtro marketing"
            >
              <option value="all">Marketing: tutti</option>
              <option value="yes">Con consenso marketing</option>
              <option value="no">Senza consenso marketing</option>
            </select>
            <input
              value={school}
              onChange={(event) => setSchool(event.target.value)}
              placeholder="Liceo"
              className={inputClassName}
              aria-label="Filtro liceo"
            />
            <input
              value={venue}
              onChange={(event) => setVenue(event.target.value)}
              placeholder="Locale desiderato"
              className={inputClassName}
              aria-label="Filtro locale"
            />
            <Button type="button" variant="outline" onClick={() => downloadCsv(filtered)}>
              Esporta CSV ({filtered.length})
            </Button>
          </div>
          <div className="mt-4 overflow-x-auto rounded-2xl border border-primary-black/10">
            <table className="min-w-[920px] w-full text-left text-sm">
              <thead className="bg-primary-black/[0.04] text-xs uppercase tracking-wide text-primary-black/50">
                <tr>
                  <th className="px-3 py-2 font-semibold">Nome</th>
                  <th className="px-3 py-2 font-semibold">Username</th>
                  <th className="px-3 py-2 font-semibold">Email</th>
                  <th className="px-3 py-2 font-semibold">Liceo</th>
                  <th className="px-3 py-2 font-semibold">Locale</th>
                  <th className="px-3 py-2 font-semibold">Verifica</th>
                  <th className="px-3 py-2 font-semibold">Benvenuto</th>
                  <th className="px-3 py-2 font-semibold">Marketing</th>
                  <th className="px-3 py-2 font-semibold">Segnalazioni</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((row) => (
                  <tr key={row.id} className="border-t border-primary-black/8">
                    <td className="px-3 py-2">
                      {row.firstName} {row.lastName}
                    </td>
                    <td className="px-3 py-2">{row.username}</td>
                    <td className="px-3 py-2">{row.email}</td>
                    <td className="px-3 py-2">{row.highSchool}</td>
                    <td className="px-3 py-2">{row.dreamVenue || "—"}</td>
                    <td className="px-3 py-2">{row.verified ? "Sì" : "No"}</td>
                    <td className="px-3 py-2">{row.welcomeEmailSent ? "Sì" : "No"}</td>
                    <td className="px-3 py-2">{row.marketing ? "Sì" : "No"}</td>
                    <td className="px-3 py-2 text-brand-pink">{row.flags.join(" · ") || "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : null}

      {data && tab === "rank" ? (
        <div className="mt-5 overflow-x-auto rounded-2xl border border-primary-black/10">
          <table className="min-w-[860px] w-full text-left text-sm">
            <thead className="bg-primary-black/[0.04] text-xs uppercase tracking-wide text-primary-black/50">
              <tr>
                <th className="px-3 py-2 font-semibold">Pos.</th>
                <th className="px-3 py-2 font-semibold">Username</th>
                <th className="px-3 py-2 font-semibold">Nome</th>
                <th className="px-3 py-2 font-semibold">Inviti</th>
                <th className="px-3 py-2 font-semibold">Ultimo invito</th>
                <th className="px-3 py-2 font-semibold">Segnalazioni</th>
                <th className="px-3 py-2 font-semibold">Gara</th>
              </tr>
            </thead>
            <tbody>
              {data.leaderboard.map((row) => (
                <tr key={row.id} className="border-t border-primary-black/8">
                  <td className="px-3 py-2">{row.position ?? "—"}</td>
                  <td className="px-3 py-2">{row.username}</td>
                  <td className="px-3 py-2">
                    {row.firstName} {row.lastName}
                  </td>
                  <td className="px-3 py-2">{row.validInvites}</td>
                  <td className="px-3 py-2">{formatWhen(row.lastInviteAt)}</td>
                  <td className="px-3 py-2 text-brand-pink">{row.flags.join(" · ") || "—"}</td>
                  <td className="px-3 py-2">
                    <button
                      type="button"
                      className="font-semibold underline-offset-4 hover:underline"
                      onClick={() => {
                        setPending({ row, excluded: !row.excluded });
                        setReason("");
                        setActionError("");
                      }}
                    >
                      {row.excluded ? "Riammetti" : "Escludi"}
                    </button>
                    {row.excluded && row.excludedReason ? (
                      <p className="mt-1 max-w-[220px] text-xs text-primary-black/50">
                        {row.excludedReason} · {formatWhen(row.excludedAt)}
                      </p>
                    ) : null}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}

      {data && tab === "stats" ? (
        <div className="mt-5 space-y-6">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {[
              ["Iscritti", String(data.stats.total)],
              ["Verificati", String(data.stats.verified)],
              ["Demo completate", String(data.stats.demoCompleted)],
              [
                "Voto medio demo",
                data.stats.demoAverageRating === null ? "—" : String(data.stats.demoAverageRating),
              ],
            ].map(([label, value]) => (
              <div key={label} className="rounded-2xl border border-primary-black/10 p-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-primary-black/45">{label}</p>
                <p className="mt-1 text-2xl font-black">{value}</p>
              </div>
            ))}
          </div>
          <div>
            <h2 className="text-sm font-bold">Iscritti al giorno</h2>
            <div className="mt-3 flex h-36 items-end gap-1">
              {data.stats.perDay.map((day) => (
                <div key={day.day} className="flex min-w-0 flex-1 flex-col items-center justify-end gap-1">
                  <span className="text-[10px] text-primary-black/50">{day.count}</span>
                  <div
                    className="w-full rounded-t bg-brand-pink"
                    style={{ height: `${Math.max(4, (day.count / maxDay) * 96)}px` }}
                  />
                  <span className="text-[10px] text-primary-black/45">{formatDay(day.day)}</span>
                </div>
              ))}
            </div>
          </div>
          <div className="grid gap-6 sm:grid-cols-2">
            <NameList title="Licei più citati" rows={data.stats.schools} />
            <NameList title="Locali desiderati" rows={data.stats.venues} />
          </div>
        </div>
      ) : null}

      {pending ? (
        <form
          className="fixed inset-x-4 bottom-4 z-30 mx-auto max-w-lg rounded-2xl border border-primary-black/10 bg-background p-4 shadow-xl"
          onSubmit={(event) => void saveExclusion(event)}
        >
          <p className="text-sm font-bold">
            {pending.excluded ? "Escludi" : "Riammetti"} @{pending.row.username}
          </p>
          <p className="mt-1 text-xs text-primary-black/55">
            Il motivo è obbligatorio e resta salvato con la data. L’iscrizione non viene cancellata.
          </p>
          <textarea
            value={reason}
            onChange={(event) => setReason(event.target.value)}
            required
            minLength={3}
            maxLength={400}
            rows={3}
            className={`${inputClassName} mt-3`}
            placeholder="Motivo"
          />
          {actionError ? <p className="mt-2 text-sm text-brand-pink">{actionError}</p> : null}
          <div className="mt-3 flex gap-2">
            <Button type="submit" disabled={saving || reason.trim().length < 3}>
              {saving ? "Salvo…" : "Conferma"}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setPending(null);
                setReason("");
              }}
            >
              Annulla
            </Button>
          </div>
        </form>
      ) : null}
    </div>
  );
}

function NameList({ title, rows }: { title: string; rows: { name: string; count: number }[] }) {
  return (
    <div>
      <h2 className="text-sm font-bold">{title}</h2>
      {rows.length === 0 ? (
        <p className="mt-2 text-sm text-primary-black/45">Nessun dato.</p>
      ) : (
        <ol className="mt-2 space-y-1 text-sm">
          {rows.map((row) => (
            <li key={row.name} className="flex justify-between gap-3">
              <span>{row.name}</span>
              <span className="text-primary-black/45">{row.count}</span>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}
