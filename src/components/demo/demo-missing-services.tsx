"use client";

import { useAppState } from "@/context/app-state-context";
import { useDemoLanguage } from "@/context/demo-language-context";
import { useDemoMode } from "@/context/demo-mode-context";
import {
  readDemoAddedService,
  writeDemoAddedService,
  type DemoAddedService,
} from "@/lib/demo/added-service";
import { demoSuppliersFor, type DemoSupplier } from "@/lib/demo/demo-suppliers";
import { partyServiceLabel } from "@/lib/included-party-services";
import { demoMissingServiceIds } from "@/lib/demo/missing-services";
import { cn } from "@/lib/utils";
import type { PartyServicePick } from "@/types/party-criteria";
import {
  Cake,
  Camera,
  Check,
  Disc3,
  Gift,
  Loader2,
  ShieldCheck,
  UtensilsCrossed,
} from "lucide-react";
import { useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from "react";
import { createPortal } from "react-dom";

const ICONS = {
  dj: Disc3,
  photographer: Camera,
  bakery: Cake,
  security: ShieldCheck,
  catering: UtensilsCrossed,
  decorations: Gift,
} as const;

export function DemoMissingServices({
  locationId,
  active,
}: {
  locationId: string | null;
  active: boolean;
}) {
  const { lang } = useDemoLanguage();
  const { session } = useDemoMode();
  const { managedListings } = useAppState();
  const [added, setAdded] = useState<DemoAddedService | null>(null);
  const [openKind, setOpenKind] = useState<PartyServicePick | null>(null);
  const boxRef = useRef<HTMLElement>(null);
  const rowRef = useRef<HTMLDivElement>(null);
  const rowDrag = useRef({ x: 0, y: 0, left: 0, moved: false });

  useEffect(() => {
    if (!session) return;
    setAdded(readDemoAddedService(session.id));
  }, [session]);

  const missing = demoMissingServiceIds({
    locationId,
    listings: managedListings,
    addedServiceId: added?.serviceId ?? null,
  });
  const highlight = !added && missing.length > 0;

  useEffect(() => {
    if (!active || !highlight) return;
    const place = () => {
      const box = boxRef.current;
      const scroller = document.scrollingElement;
      if (!box || !scroller) return;
      const rect = box.getBoundingClientRect();
      if (rect.height < 8) return;
      // Confy sits on the lower part of the screen during this step.
      const limit = window.innerHeight - 252;
      if (rect.bottom <= limit && rect.top >= 72) return;
      scroller.scrollTop += rect.bottom - limit;
    };
    const timers = [50, 400].map((delay) => window.setTimeout(place, delay));
    return () => {
      for (const timer of timers) window.clearTimeout(timer);
    };
  }, [active, highlight, missing.length]);

  function armRow(event: ReactPointerEvent<HTMLDivElement>) {
    const row = rowRef.current;
    rowDrag.current = {
      x: event.clientX,
      y: event.clientY,
      left: row?.scrollLeft ?? 0,
      moved: false,
    };
  }

  function trackRow(event: ReactPointerEvent<HTMLDivElement>) {
    const dx = event.clientX - rowDrag.current.x;
    const dy = event.clientY - rowDrag.current.y;
    if (dx * dx + dy * dy > 36) rowDrag.current.moved = true;
  }

  function noteRowScroll() {
    const row = rowRef.current;
    if (!row) return;
    if (Math.abs(row.scrollLeft - rowDrag.current.left) > 6) {
      rowDrag.current.moved = true;
    }
  }

  function openService(id: PartyServicePick) {
    if (rowDrag.current.moved) return;
    setOpenKind(id);
  }

  if (!session) return null;
  if (!added && missing.length === 0) return null;

  return (
    <>
      {added ? (
        <section className="event-postit-section min-w-0 border-t px-3 sm:px-4">
          <p className="flex min-w-0 items-center gap-2 text-sm font-bold text-[color:var(--postit-ink)]">
            <Check className="h-4 w-4 shrink-0 text-brand-teal" strokeWidth={3} aria-hidden />
            <span className="min-w-0 truncate">
              {partyServiceLabel(added.serviceId, lang)} · {added.supplierName}
            </span>
          </p>
        </section>
      ) : null}
      {missing.length > 0 ? (
        <section
          ref={boxRef}
          className={cn(
            "event-postit-section min-w-0 scroll-mb-40 overflow-hidden border-t px-3 sm:px-4",
            highlight && "rounded-[0.85rem] ring-2 ring-brand-pink/55",
          )}
        >
          <div className="event-postit-dark p-3.5">
            <p className="text-sm font-bold text-white">
              {lang === "en" ? "You might still need" : "Potrebbe mancare"}
            </p>
            <p className="event-postit-dark-muted mt-0.5 text-xs font-semibold">
              {lang === "en" ? "Add another service to the party" : "Aggiungi altri servizi alla festa"}
            </p>
            <div
              ref={rowRef}
              onPointerDown={armRow}
              onPointerMove={trackRow}
              onScroll={noteRowScroll}
              className="scrollbar-hidden mt-3 flex w-full min-w-0 snap-x snap-mandatory gap-2 overflow-x-auto overscroll-x-contain pb-1"
              style={{ touchAction: "pan-x pan-y", overscrollBehaviorX: "contain" }}
            >
              {missing.map((id) => {
                const Icon = ICONS[id];
                return (
                  <button
                    key={id}
                    type="button"
                    onClick={() => openService(id)}
                    className="inline-flex shrink-0 snap-start items-center gap-2 rounded-full bg-brand-pink px-3.5 py-2 text-sm font-bold text-ink-inverse"
                  >
                    <Icon className="h-4 w-4 shrink-0" aria-hidden />
                    {partyServiceLabel(id, lang)}
                  </button>
                );
              })}
            </div>
          </div>
        </section>
      ) : null}
      {openKind ? (
        <DemoSupplierSheet
          kind={openKind}
          onClose={() => setOpenKind(null)}
          onAdded={(row) => {
            setAdded(row);
            setOpenKind(null);
          }}
        />
      ) : null}
    </>
  );
}

function DemoSupplierSheet({
  kind,
  onClose,
  onAdded,
}: {
  kind: PartyServicePick;
  onClose: () => void;
  onAdded: (row: DemoAddedService) => void;
}) {
  const { lang } = useDemoLanguage();
  const { session } = useDemoMode();
  const suppliers = demoSuppliersFor(kind);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [phase, setPhase] = useState<"pick" | "saving" | "saved">("pick");
  const [savedName, setSavedName] = useState("");
  const sending = useRef(false);
  const Icon = ICONS[kind];
  const selected = suppliers.find((item) => item.id === selectedId) ?? null;

  function send(supplier: DemoSupplier) {
    if (!session || sending.current) return;
    sending.current = true;
    setPhase("saving");
    window.setTimeout(() => {
      const row: DemoAddedService = {
        sessionId: session.id,
        serviceId: kind,
        supplierId: supplier.id,
        supplierName: supplier.name,
        addedAt: new Date().toISOString(),
      };
      writeDemoAddedService(row);
      setSavedName(supplier.name);
      setPhase("saved");
    }, 1000);
  }

  if (typeof document === "undefined") return null;

  return createPortal(
    <div className="fixed inset-0 z-[80] flex items-end justify-center" data-overlay-open="true">
      <button type="button" className="absolute inset-0 bg-black/50" aria-label={lang === "en" ? "Close" : "Chiudi"} onClick={phase === "saving" ? undefined : onClose} />
      <div
        className="relative max-h-[92dvh] w-full max-w-md overflow-y-auto overflow-x-hidden rounded-t-3xl border-t border-[#2A2C33] bg-[#1A1C21] px-5 pt-2.5 text-[#F5F5F7]"
        style={{ paddingBottom: "calc(1.75rem + env(safe-area-inset-bottom, 0px))" }}
        role="dialog"
        aria-modal="true"
        aria-labelledby="demo-supplier-title"
      >
        <div className="mx-auto mb-4 h-[5px] w-9 rounded-full bg-[#3A3C44]" />
        {phase === "saved" ? (
          <div>
            <div className="vu-demo-check-pop mx-auto flex h-11 w-11 items-center justify-center rounded-full bg-[#3ECFCF] text-[#0F1115]">
              <Check className="h-6 w-6" strokeWidth={3} aria-hidden />
            </div>
            <h2 id="demo-supplier-title" className="mt-3 text-center font-[family-name:var(--font-brand)] text-xl font-extrabold leading-snug">
              {lang === "en"
                ? `Request accepted! ${savedName} will be at your party.`
                : `Richiesta accettata! ${savedName} sarà alla tua festa.`}
            </h2>
            <p className="mt-2 text-center text-[13px] text-[#6B6E76]">
              {lang === "en"
                ? "This is a demo: no request was sent."
                : "Questa è una demo: nessuna richiesta è stata inviata."}
            </p>
            <button
              type="button"
              onClick={() => {
                const row = session ? readDemoAddedService(session.id) : null;
                if (row) onAdded(row);
                else onClose();
              }}
              className="mt-5 flex h-[50px] w-full items-center justify-center rounded-[14px] bg-[#F091B2] px-3 text-center text-[15px] font-bold text-[#0F1115]"
            >
              {lang === "en" ? "Back to your event" : "Torna al tuo evento"}
            </button>
          </div>
        ) : (
          <>
            <h2 id="demo-supplier-title" className="font-[family-name:var(--font-brand)] text-xl font-extrabold">
              {partyServiceLabel(kind, lang)}
            </h2>
            <p className="mt-1 text-[13px] text-[#A1A3AB]">
              {lang === "en" ? "Pick one sample supplier." : "Scegli un fornitore di esempio."}
            </p>
            <ul className="mt-4 space-y-2">
              {suppliers.map((supplier) => {
                const active = supplier.id === selectedId;
                return (
                  <li key={supplier.id}>
                    <button
                      type="button"
                      aria-pressed={active}
                      onClick={() => setSelectedId(supplier.id)}
                      className={cn(
                        "flex w-full min-w-0 items-center gap-3 rounded-2xl border-2 px-3 py-3 text-left",
                        active
                          ? "border-brand-teal bg-[#12262A]"
                          : "border-[#2A2C33] bg-transparent",
                      )}
                    >
                      <span
                        className={cn(
                          "flex h-11 w-11 shrink-0 items-center justify-center rounded-full",
                          active ? "bg-brand-teal text-[#0F1115]" : "bg-[#2A2C33] text-[#F5F5F7]",
                        )}
                        aria-hidden
                      >
                        <Icon className="h-5 w-5" />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="flex flex-wrap items-center gap-2">
                          <span className="font-bold">{supplier.name}</span>
                          <span className="rounded-full bg-white/10 px-2 py-0.5 text-[10px] font-semibold text-[#A1A3AB]">
                            {lang === "en" ? "Demo example" : "Esempio demo"}
                          </span>
                        </span>
                        <span className="mt-1 block text-[13px] leading-snug text-[#A1A3AB]">
                          {supplier.description[lang]}
                        </span>
                        <span className="mt-1 block text-xs font-bold text-[#F5F5F7]">
                          {supplier.price[lang]}
                        </span>
                      </span>
                      <span
                        className={cn(
                          "flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2",
                          active
                            ? "border-brand-teal bg-brand-teal text-[#0F1115]"
                            : "border-white/40 text-transparent",
                        )}
                        aria-hidden
                      >
                        <Check className="h-3.5 w-3.5" strokeWidth={3} />
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
            {selected ? (
              <button
                type="button"
                disabled={phase === "saving"}
                onClick={() => send(selected)}
                className="mt-4 flex min-h-[50px] w-full items-center justify-center gap-2 rounded-[14px] bg-[#F091B2] px-3 py-2.5 text-center text-[15px] font-bold leading-tight text-[#0F1115] disabled:opacity-70"
              >
                {phase === "saving" ? (
                  <Loader2 className="vu-demo-spin h-5 w-5 animate-spin motion-reduce:animate-none" aria-hidden />
                ) : lang === "en" ? (
                  "Send request for your event"
                ) : (
                  "Invia richiesta per il tuo evento"
                )}
              </button>
            ) : null}
          </>
        )}
      </div>
    </div>,
    document.body,
  );
}
