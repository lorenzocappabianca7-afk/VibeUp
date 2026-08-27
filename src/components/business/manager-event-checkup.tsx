"use client";

import type { EventCheckup } from "@/lib/manager-event-checkup";
import { cn } from "@/lib/utils";
import { Check, CircleDashed } from "lucide-react";

export function checkupBadgeClass(checkup: EventCheckup): string {
  return checkup.complete
    ? "bg-brand-teal/15 text-brand-teal"
    : "bg-amber-400/15 text-amber-200";
}

export function checkupBadgeLabel(checkup: EventCheckup): string {
  return checkup.complete
    ? "Info complete"
    : `Info mancanti · ${checkup.percent}%`;
}

export function checkupBadgeTitle(checkup: EventCheckup): string {
  if (checkup.complete) return "Tutte le informazioni sono arrivate";
  const count = checkup.missing.length;
  return count === 1
    ? "1 informazione ancora da ricevere"
    : `${count} informazioni ancora da ricevere`;
}

export function ManagerEventCheckupBadge({
  checkup,
}: {
  checkup: EventCheckup;
}) {
  return (
    <span
      title={checkupBadgeTitle(checkup)}
      className={cn(
        "inline-flex whitespace-nowrap rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide",
        checkupBadgeClass(checkup),
      )}
    >
      {checkupBadgeLabel(checkup)}
    </span>
  );
}

export function ManagerEventCheckup({ checkup }: { checkup: EventCheckup }) {
  return (
    <div className="space-y-3">
      <div>
        <p className="text-[11px] font-black uppercase tracking-wide text-primary-black/45">
          Checkup evento
        </p>
        <p className="mt-0.5 text-sm font-semibold text-primary-black">
          Riepilogo informazioni evento
        </p>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <CheckupList
          title="Informazioni già ricevute"
          empty="Nessun dato registrato."
          items={checkup.received}
          tone="received"
        />
        <CheckupList
          title="Informazioni ancora da ricevere"
          empty="Niente in sospeso: il dossier è completo."
          items={checkup.missing}
          tone="missing"
        />
      </div>
    </div>
  );
}

function CheckupList({
  title,
  empty,
  items,
  tone,
}: {
  title: string;
  empty: string;
  items: EventCheckup["received"];
  tone: "received" | "missing";
}) {
  const received = tone === "received";
  return (
    <section
      className={cn(
        "rounded-2xl border p-3.5",
        received
          ? "border-brand-teal/20 bg-brand-teal/8"
          : "border-amber-400/20 bg-amber-400/8",
      )}
    >
      <p
        className={cn(
          "text-[11px] font-black uppercase tracking-wide",
          received ? "text-brand-teal" : "text-amber-200",
        )}
      >
        {title}
      </p>
      {items.length === 0 ? (
        <p className="mt-2 text-xs text-primary-black/55">{empty}</p>
      ) : (
        <ul className="mt-2 space-y-2">
          {items.map((item) => (
            <li key={item.id} className="flex gap-2">
              {received ? (
                <Check
                  className="mt-0.5 h-3.5 w-3.5 shrink-0 text-brand-teal"
                  aria-hidden
                />
              ) : (
                <CircleDashed
                  className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-200"
                  aria-hidden
                />
              )}
              <div className="min-w-0">
                <p className="text-xs font-bold text-primary-black">
                  {item.label}
                </p>
                {item.detail ? (
                  <p className="mt-0.5 text-[11px] leading-relaxed text-primary-black/60">
                    {item.detail}
                  </p>
                ) : null}
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
