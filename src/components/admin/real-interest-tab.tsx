"use client";

import { Button } from "@/components/ui/button";
import { useEffect, useState } from "react";

type Status = "nuova" | "contattato" | "chiusa";

type InterestRow = {
  id: string;
  createdAt: string;
  name: string;
  contact: string;
  channel: "whatsapp" | "email";
  location: string;
  partyDate: string;
  guestCount: number;
  status: Status;
};

const STATUS_LABEL: Record<Status, string> = {
  nuova: "Nuova",
  contattato: "Contattato",
  chiusa: "Chiusa",
};

function formatWhen(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("it-IT", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

export function RealInterestTab() {
  const [status, setStatus] = useState<Status | "all">("all");
  const [rows, setRows] = useState<InterestRow[]>([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    const query = status === "all" ? "" : `&status=${status}`;
    void fetch(`/api/admin/community?view=real-interest${query}`, { cache: "no-store" })
      .then(async (response) => {
        const body = (await response.json()) as { rows?: InterestRow[]; error?: string };
        if (!response.ok) throw new Error(body.error || "Caricamento non riuscito.");
        if (!cancelled) setRows(body.rows ?? []);
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
  }, [status]);

  async function changeStatus(id: string, next: Status) {
    const previous = rows;
    setRows((current) => current.map((row) => (row.id === id ? { ...row, status: next } : row)));
    const response = await fetch("/api/admin/community", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, status: next }),
    });
    if (!response.ok) setRows(previous);
  }

  async function downloadCsv() {
    const query = status === "all" ? "" : `&status=${status}`;
    const response = await fetch(`/api/admin/community?view=real-interest&format=csv${query}`, { cache: "no-store" });
    if (!response.ok) return;
    const blob = await response.blob();
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "vibeup-richieste-reali.csv";
    link.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="mt-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <label className="flex items-center gap-2 text-sm">
          Stato
          <select
            value={status}
            onChange={(event) => setStatus(event.target.value as Status | "all")}
            className="min-h-11 rounded-[14px] border border-white/10 bg-background px-3 text-sm"
          >
            <option value="all">Tutte</option>
            <option value="nuova">Nuove</option>
            <option value="contattato">Contattate</option>
            <option value="chiusa">Chiuse</option>
          </select>
        </label>
        <Button type="button" variant="outline" className="min-h-11" onClick={() => void downloadCsv()}>
          Scarica CSV
        </Button>
      </div>
      {error ? <p className="mt-4 text-sm text-brand-pink">{error}</p> : null}
      {loading ? <p className="mt-4 text-sm text-primary-black/50">Caricamento…</p> : null}
      {!loading && rows.length === 0 ? <p className="mt-4 text-sm text-primary-black/50">Nessuna richiesta.</p> : null}
      <div className="mt-4 overflow-x-auto">
        <table className="w-full min-w-[760px] text-left text-sm">
          <thead className="text-xs uppercase tracking-wide text-primary-black/45">
            <tr>
              <th className="py-2 pr-3 font-semibold">Data</th>
              <th className="py-2 pr-3 font-semibold">Nome</th>
              <th className="py-2 pr-3 font-semibold">Contatto</th>
              <th className="py-2 pr-3 font-semibold">Location</th>
              <th className="py-2 pr-3 font-semibold">Festa</th>
              <th className="py-2 pr-3 font-semibold">Invitati</th>
              <th className="py-2 font-semibold">Stato</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.id} className="border-t border-white/10">
                <td className="py-3 pr-3">{formatWhen(row.createdAt)}</td>
                <td className="py-3 pr-3">{row.name || "—"}</td>
                <td className="py-3 pr-3">{row.contact}</td>
                <td className="py-3 pr-3">{row.location}</td>
                <td className="py-3 pr-3">{row.partyDate}</td>
                <td className="py-3 pr-3">{row.guestCount}</td>
                <td className="py-3">
                  <select
                    value={row.status}
                    aria-label={`Stato di ${row.name || "richiesta"}`}
                    onChange={(event) => void changeStatus(row.id, event.target.value as Status)}
                    className="min-h-11 rounded-[14px] border border-white/10 bg-background px-2 text-sm"
                  >
                    {(Object.keys(STATUS_LABEL) as Status[]).map((item) => (
                      <option key={item} value={item}>{STATUS_LABEL[item]}</option>
                    ))}
                  </select>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
