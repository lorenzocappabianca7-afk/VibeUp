"use client";

import { Button } from "@/components/ui/button";
import { useAppState } from "@/context/app-state-context";
import { canAccessAdminCatalog } from "@/lib/admin-access";
import { fetchDemoResponses } from "@/lib/demo/admin";
import { APP_SHELL_WIDTH_CLASS, cn, formatDate } from "@/lib/utils";
import type { DemoResponseRow } from "@/types/demo";
import { ArrowLeft, Lock } from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

type SortKey = "date" | "rating" | "email";
type SortDir = "asc" | "desc";

function compareRows(a: DemoResponseRow, b: DemoResponseRow, key: SortKey, dir: SortDir) {
  const factor = dir === "asc" ? 1 : -1;
  if (key === "email") {
    return factor * a.email.localeCompare(b.email, "it");
  }
  if (key === "rating") {
    return factor * ((a.rating ?? -1) - (b.rating ?? -1));
  }
  const aDate = a.completedAt ?? a.sessionCreatedAt ?? a.createdAt;
  const bDate = b.completedAt ?? b.sessionCreatedAt ?? b.createdAt;
  return factor * aDate.localeCompare(bDate);
}

export function DemoResponsesPanel() {
  const { currentUser } = useAppState();
  const allowed = canAccessAdminCatalog(currentUser.email, currentUser.role);
  const [rows, setRows] = useState<DemoResponseRow[]>([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [sortKey, setSortKey] = useState<SortKey>("date");
  const [sortDir, setSortDir] = useState<SortDir>("desc");

  useEffect(() => {
    if (!allowed) {
      setLoading(false);
      return;
    }

    let cancelled = false;
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

  const sorted = useMemo(
    () => [...rows].sort((a, b) => compareRows(a, b, sortKey, sortDir)),
    [rows, sortDir, sortKey],
  );

  function toggleSort(key: SortKey) {
    if (sortKey === key) {
      setSortDir((current) => (current === "asc" ? "desc" : "asc"));
      return;
    }
    setSortKey(key);
    setSortDir(key === "email" ? "asc" : "desc");
  }

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
            Accedi con l&apos;account admin ufficiale per vedere le risposte demo.
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
      <Link
        href="/admin/catalog"
        className="inline-flex items-center gap-1.5 text-xs font-bold text-primary-black/45"
      >
        <ArrowLeft className="h-3.5 w-3.5" aria-hidden />
        Catalogo
      </Link>
      <h1 className="mt-4 text-2xl font-black text-primary-black">
        Risposte demo
      </h1>
      <p className="mt-1 text-sm text-primary-black/60">
        Dati isolati dalla tabella demo. Ordinabili per data, punteggio ed
        email.
      </p>

      <div className="mt-4 flex flex-wrap gap-2">
        <SortButton
          label="Data"
          active={sortKey === "date"}
          dir={sortDir}
          onClick={() => toggleSort("date")}
        />
        <SortButton
          label="Punteggio"
          active={sortKey === "rating"}
          dir={sortDir}
          onClick={() => toggleSort("rating")}
        />
        <SortButton
          label="Email"
          active={sortKey === "email"}
          dir={sortDir}
          onClick={() => toggleSort("email")}
        />
      </div>

      {loading ? (
        <p className="mt-8 text-sm text-primary-black/50">Caricamento…</p>
      ) : error ? (
        <p className="mt-8 text-sm font-medium text-brand-pink">{error}</p>
      ) : sorted.length === 0 ? (
        <p className="mt-8 text-sm text-primary-black/50">
          Nessuna risposta demo per ora.
        </p>
      ) : (
        <div className="mt-5 overflow-x-auto rounded-2xl border border-primary-black/10">
          <table className="min-w-full text-left text-xs">
            <thead className="bg-surface text-primary-black/55">
              <tr>
                <th className="px-3 py-2 font-semibold">Data</th>
                <th className="px-3 py-2 font-semibold">Nome</th>
                <th className="px-3 py-2 font-semibold">Email</th>
                <th className="px-3 py-2 font-semibold">Location</th>
                <th className="px-3 py-2 font-semibold">Prenotata</th>
                <th className="px-3 py-2 font-semibold">Voto</th>
                <th className="px-3 py-2 font-semibold">18esimo</th>
                <th className="px-3 py-2 font-semibold">Stato</th>
              </tr>
            </thead>
            <tbody>
              {sorted.map((row) => (
                <tr key={row.id} className="border-t border-primary-black/8">
                  <td className="whitespace-nowrap px-3 py-2 text-primary-black/70">
                    {formatDate(row.completedAt ?? row.sessionCreatedAt ?? row.createdAt)}
                  </td>
                  <td className="px-3 py-2 font-medium text-primary-black">
                    {row.firstName} {row.lastName}
                  </td>
                  <td className="px-3 py-2 text-primary-black/70">{row.email}</td>
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
                    {row.wouldUseForEighteenth == null
                      ? "—"
                      : row.wouldUseForEighteenth
                        ? "Sì"
                        : "No"}
                  </td>
                  <td className="px-3 py-2 text-primary-black/70">
                    {row.completed ? "Conclusa" : "Aperta"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function SortButton({
  label,
  active,
  dir,
  onClick,
}: {
  label: string;
  active: boolean;
  dir: SortDir;
  onClick: () => void;
}) {
  return (
    <Button
      type="button"
      variant={active ? "primary" : "outline"}
      className="px-3 py-2 text-xs"
      onClick={onClick}
    >
      {label}
      {active ? (dir === "asc" ? " ↑" : " ↓") : ""}
    </Button>
  );
}
