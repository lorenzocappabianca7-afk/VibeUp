"use client";

import { HardNavLink } from "@/components/navigation/hard-nav-link";
import { useAppState } from "@/context/app-state-context";
import { listingsForBusiness } from "@/lib/manager-listings";
import { cn } from "@/lib/utils";
import type { ManagedLocationListing } from "@/types/admin";
import { FilePenLine, Plus, Sparkles } from "lucide-react";

function listingStatusLabel(listing: ManagedLocationListing) {
  if (listing.status === "published" || listing.published) {
    return { label: "Pubblicata", tone: "bg-brand-teal/15 text-brand-teal" };
  }
  if (listing.status === "pending_review") {
    return { label: "In revisione", tone: "bg-amber-400/15 text-amber-200" };
  }
  return { label: "Bozza", tone: "bg-white/8 text-primary-black/60" };
}

export function BusinessPublicationsPanel() {
  const { currentUser, businessProfile, managedListings } = useAppState();
  const email = currentUser.email.trim().toLowerCase();
  const businessName = businessProfile?.businessName?.trim().toLowerCase();

  const listings = listingsForBusiness(managedListings, {
    email,
    businessName,
  });

  return (
    <section className="space-y-3 rounded-[1.35rem] border border-primary-black/10 bg-surface p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-sm font-black text-primary-black">
            Gestione pubblicazioni
          </h2>
          <p className="mt-0.5 text-xs text-primary-black/50">
            Schede locale visibili in Esplora e usate per il preventivo.
          </p>
        </div>
        <HardNavLink
          href="/business/onboarding?new=1"
          className="inline-flex items-center gap-1 rounded-full bg-brand-teal px-3 py-1.5 text-[11px] font-black text-ink-inverse"
        >
          <Plus className="h-3.5 w-3.5" aria-hidden />
          Nuova
        </HardNavLink>
      </div>

      {listings.length > 0 ? (
        <ul className="space-y-2">
          {listings.map((listing) => {
            const status = listingStatusLabel(listing);
            const traits = listing.location.characteristics ?? [];
            return (
              <li
                key={listing.id}
                className="rounded-2xl border border-white/8 bg-background/50 px-3 py-3"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-bold text-primary-black">
                      {listing.location.name}
                    </p>
                    <p className="mt-0.5 text-xs text-primary-black/50">
                      {listing.location.zoneLabel} ·{" "}
                      {listing.location.capacity} ospiti
                    </p>
                  </div>
                  <span
                    className={cn(
                      "shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide",
                      status.tone,
                    )}
                  >
                    {status.label}
                  </span>
                </div>
                {traits.length > 0 ? (
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {traits.map((trait) => (
                      <span
                        key={trait}
                        className="rounded-full bg-brand-teal/12 px-2 py-0.5 text-[10px] font-semibold text-brand-teal"
                      >
                        {trait}
                      </span>
                    ))}
                  </div>
                ) : (
                  <p className="mt-2 text-[11px] text-primary-black/45">
                    Aggiungi 3 caratteristiche chiave per comparire prima nelle
                    ricerche.
                  </p>
                )}
                <HardNavLink
                  href={`/business/onboarding?listingId=${listing.id}`}
                  className="mt-3 inline-flex items-center gap-1.5 text-xs font-bold text-brand-teal"
                >
                  <FilePenLine className="h-3.5 w-3.5" aria-hidden />
                  Modifica scheda
                </HardNavLink>
              </li>
            );
          })}
        </ul>
      ) : (
        <div className="rounded-2xl border border-dashed border-white/10 px-3 py-6 text-center">
          <Sparkles className="mx-auto h-6 w-6 text-primary-black/30" aria-hidden />
          <p className="mt-2 text-sm font-semibold text-primary-black">
            Nessuna pubblicazione
          </p>
          <p className="mt-1 text-xs text-primary-black/50">
            Crea la scheda del tuo locale per ricevere richieste e preventivi.
          </p>
        </div>
      )}
    </section>
  );
}