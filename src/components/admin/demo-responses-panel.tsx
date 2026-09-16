"use client";

import { Button } from "@/components/ui/button";
import { useAppState } from "@/context/app-state-context";
import { canAccessAdminCatalog } from "@/lib/admin-access";
import { fetchDemoResponses } from "@/lib/demo/admin";
import {
  computeDemoStats,
  demoEntryTimestamp,
  filterDemoRowsByDateRange,
  formatDemoAverage,
  formatDemoPercent,
} from "@/lib/demo/stats";
import { APP_SHELL_WIDTH_CLASS, cn } from "@/lib/utils";
import type { DemoResponseRow } from "@/types/demo";
import { ArrowLeft, Lock } from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

type SortDir = "asc" | "desc";

function formatDateTime(value: string | null): string {
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

function formatPrivacy(row: DemoResponseRow): string {
  if (!row.privacyConsentAt) return "No";
  return `Sì · ${formatDateTime(row.privacyConsentAt)}`;
}

function formatEighteenth(value: boolean | null): string {
  if (value == null) return "—";
  return value ? "Sì" : "No";
}

function compareByDate(a: DemoResponseRow, b: DemoResponseRow, dir: SortDir) {
  const factor = dir === "asc" ? 1 : -1;
  return factor * demoEntryTimestamp(a).localeCompare(demoEntryTimestamp(b));
}

export function DemoResponsesPanel() {
  const { currentUser } = useAppState();
  const allowed = canAccessAdminCatalog(currentUser.email, currentUser.role);
  const [rows, setRows] = useState<DemoResponseRow[]>([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [sortDir, setSortDir] = useState<SortDir>("desc");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");

  useEffect(() => {
    if (!allowed) {
      setLoading(false);
      return;
    }

    let cancelled = false;
    setLoading(true);
    setError("");
    void fetchDemoResponses()
      .then((data) => {
        if (!cancelled) setRows(data);
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Caricamento non riuscito.");
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [allowed]);

  const filtered = useMemo(
    () => filterDemoRowsByDateRange(rows, fromDate, toDate),
    [fromDate, rows, toDate],
  );

  const sorted = useMemo(
    () => [...filtered].sort((a, b) => compareByDate(a, b, sortDir)),
    [filtered, sortDir],
  );

  const stats = useMemo(() => computeDemoStats(filtered), [filtered]);
  const dateFilterActive = Boolean(fromDate || toDate);

  if (!allowed) {
    return (
      <div
        className={cn(
          "mx-auto box-border min-h-dvh min-w-0 bg-background px-4 pt-8",
          APP_SHELL_WIDTH_CLASS,
        )}
      >
        <div className="rounded-[2rem] border border-primary-black/10 bg-primary-black/[0.02] p-6">
          <Link
            href="/"
            className="mb-5 inline-flex items-center gap-1.5 rounded-full bg-background px-3 py-2 text-xs font-bold text-primary-black/55"
          >
            <ArrowLeft className="h-3.5 w-3.5" aria-hidden />
            Torna alla home
          </Link>
          <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/12 text-primary-black">
            <Lock className="h-5 w-5" aria-hidden />
          </span>
          <h1 className="mt-4 text-2xl font-black text-primary-black">
            Accesso non autorizzato
          </h1>
          <p className="mt-2 text-sm text-primary-black/60">
            Accedi con l&apos;account admin ufficiale per continuare.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div
      className={cn(
        "mx-auto box-border min-h-dvh min-w-0 bg-background px-4 py-6",
        APP_SHELL_WIDTH_CLASS,
      )}
    >
      <h1 className="text-2xl font-black text-primary-black">
        Statistiche demo
      </h1>
      <p className="mt-1 text-sm text-primary-black/60">
        Ingressi dalla tabella demo, isolati dalla piattaforma reale.
        {dateFilterActive
          ? " I numeri si riferiscono all'intervallo selezionato."
          : null}
      </p>

      <div className="mt-5 flex flex-wrap items-end gap-3">
        <label className="block space-y-1">
          <span className="text-xs font-semibold text-primary-black/50">Da</span>
          <input
            type="date"
            value={fromDate}
            max={toDate || undefined}
            onChange={(event) => setFromDate(event.target.value)}
            className="rounded-xl border border-primary-black/12 bg-surface px-3 py-2 text-sm outline-none focus:border-brand-teal"
          />
        </label>
        <label className="block space-y-1">
          <span className="text-xs font-semibold text-primary-black/50">A</span>
          <input
            type="date"
            value={toDate}
            min={fromDate || undefined}
            onChange={(event) => setToDate(event.target.value)}
            className="rounded-xl border border-primary-black/12 bg-surface px-3 py-2 text-sm outline-none focus:border-brand-teal"
          />
        </label>
        {dateFilterActive ? (
          <Button
            type="button"
            variant="outline"
            className="px-3 py-2 text-xs"
            onClick={() => {
              setFromDate("");
              setToDate("");
            }}
          >
            Azzera date
          </Button>
        ) : null}
        <Button
          type="button"
          variant="outline"
          className="ml-auto px-3 py-2 text-xs"
          onClick={() =>
            setSortDir((current) => (current === "asc" ? "desc" : "asc"))
          }
        >
          Data {sortDir === "asc" ? "↑" : "↓"}
        </Button>
      </div>

      {loading ? (
        <p className="mt-8 text-sm text-primary-black/50">Caricamento…</p>
      ) : error ? (
        <p className="mt-8 text-sm font-medium text-brand-pink">{error}</p>
      ) : (
        <>
          <div className="mt-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
            <StatCard
              label="Persone entrate"
              value={String(stats.started)}
              hint="Hanno inviato il form di ingresso"
            />
            <StatCard
              label="Completamento"
              value={formatDemoPercent(stats.completionRate)}
              hint={`${stats.completed} su ${stats.started} fino al voto`}
            />
            <StatCard
              label="Media voti"
              value={
                stats.averageRating == null
                  ? "—"
                  : `${formatDemoAverage(stats.averageRating)} / 5`
              }
              hint={
                stats.ratedCount === 0
                  ? "Nessun voto nel periodo"
                  : `${stats.ratedCount} ${stats.ratedCount === 1 ? "voto" : "voti"}`
              }
            />
            <StatCard
              label="Uso per il 18esimo"
              value={
                stats.eighteenthAnswered === 0
                  ? "—"
                  : `${formatDemoPercent(stats.eighteenthYesRate)} sì`
              }
              hint={
                stats.eighteenthAnswered === 0
                  ? "Nessuna risposta nel periodo"
                  : `${formatDemoPercent(stats.eighteenthNoRate)} no · ${stats.eighteenthAnswered} risposte`
              }
            />
          </div>

          <section className="mt-5 rounded-2xl border border-primary-black/10 bg-primary-black/[0.02] p-4">
            <h2 className="text-sm font-black text-primary-black">
              Location più selezionate
            </h2>
            <p className="mt-0.5 text-xs text-primary-black/50">
              Tra le tre location scelte nel form, nel periodo filtrato.
            </p>
            {stats.locationRanking.length === 0 ? (
              <p className="mt-3 text-sm text-primary-black/50">
                Nessuna location selezionata nel periodo.
              </p>
            ) : (
              <ol className="mt-3 space-y-1.5">
                {stats.locationRanking.map((location, index) => (
                  <li
                    key={location.id || location.name}
                    className="flex items-baseline justify-between gap-3 text-sm"
                  >
                    <span className="min-w-0 truncate text-primary-black">
                      <span className="mr-2 font-bold text-primary-black/40">
                        {index + 1}.
                      </span>
                      {location.name}
                    </span>
                    <span className="shrink-0 font-bold text-primary-black">
                      {location.count}
                    </span>
                  </li>
                ))}
              </ol>
            )}
          </section>

          {sorted.length === 0 ? (
            <p className="mt-8 text-sm text-primary-black/50">
              {rows.length === 0
                ? "Nessuna risposta demo per ora."
                : "Nessuna entrata nel periodo selezionato."}
            </p>
          ) : (
            <div className="mt-5 overflow-x-auto rounded-2xl border border-primary-black/10">
              <table className="min-w-full text-left text-xs">
                <thead className="bg-surface text-primary-black/55">
                  <tr>
                    <th className="px-3 py-2 font-semibold">Data</th>
                    <th className="px-3 py-2 font-semibold">Nome</th>
                    <th className="px-3 py-2 font-semibold">Cognome</th>
                    <th className="px-3 py-2 font-semibold">Email</th>
                    <th className="px-3 py-2 font-semibold">Privacy</th>
                    <th className="px-3 py-2 font-semibold">Location selezionate</th>
                    <th className="px-3 py-2 font-semibold">
                      Location disponibilità
                    </th>
                    <th className="px-3 py-2 font-semibold">Voto</th>
                    <th className="px-3 py-2 font-semibold">18esimo</th>
                  </tr>
                </thead>
                <tbody>
                  {sorted.map((row) => (
                    <tr key={row.id} className="border-t border-primary-black/8">
                      <td className="whitespace-nowrap px-3 py-2 text-primary-black/70">
                        {formatDateTime(demoEntryTimestamp(row))}
                      </td>
                      <td className="px-3 py-2 font-medium text-primary-black">
                        {row.firstName || "—"}
                      </td>
                      <td className="px-3 py-2 font-medium text-primary-black">
                        {row.lastName || "—"}
                      </td>
                      <td className="px-3 py-2 text-primary-black/70">
                        {row.email || "—"}
                      </td>
                      <td className="whitespace-nowrap px-3 py-2 text-primary-black/70">
                        {formatPrivacy(row)}
                      </td>
                      <td className="px-3 py-2 text-primary-black/70">
                        {row.selectedLocations.length > 0
                          ? row.selectedLocations.map((item) => item.name).join(", ")
                          : "—"}
                      </td>
                      <td className="px-3 py-2 text-primary-black/70">
                        {row.bookedLocation?.name ?? "—"}
                      </td>
                      <td className="px-3 py-2 font-bold text-primary-black">
                        {row.rating ?? "—"}
                      </td>
                      <td className="px-3 py-2 text-primary-black/70">
                        {formatEighteenth(row.wouldUseForEighteenth)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
    </div>
  );
}

function StatCard({
  label,
  value,
  hint,
}: {
  label: string;
  value: string;
  hint: string;
}) {
  return (
    <div className="rounded-2xl border border-primary-black/10 bg-surface p-4">
      <p className="text-[11px] font-semibold uppercase tracking-wide text-primary-black/45">
        {label}
      </p>
      <p className="mt-1 text-xl font-black text-primary-black">{value}</p>
      <p className="mt-1 text-xs text-primary-black/50">{hint}</p>
    </div>
  );
}
