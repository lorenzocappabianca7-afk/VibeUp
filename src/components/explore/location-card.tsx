"use client";

import { DistanceBadge } from "@/components/explore/distance-badge";
import { cn, getLocationPricePresentation } from "@/lib/utils";
import type { Location } from "@/types/location";
import { GitCompareArrows, Heart, MapPin } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { memo, useState } from "react";

interface LocationCardProps {
  location: Location;
  isFavorite: boolean;
  isCompareSelected: boolean;
  onToggleFavorite: (id: string) => void;
  onToggleCompare: (id: string) => void;
  href?: string;
}

export const LocationCard = memo(function LocationCard({
  location,
  isFavorite,
  isCompareSelected,
  onToggleFavorite,
  onToggleCompare,
  href = `/location/${location.id}`,
}: LocationCardProps) {
  const { contactsBeenHere } = location;
  const hasContacts = contactsBeenHere.count > 0;
  const price = getLocationPricePresentation(location);
  const [contactsOpen, setContactsOpen] = useState(false);

  return (
    <article className="h-full overflow-hidden rounded-2xl border border-primary-black/12 bg-background shadow-sm transition-colors duration-150 hover:border-primary-black">
      <div className="relative aspect-[16/10] w-full">
        <Link
          href={href}
          className="relative block h-full w-full"
        >
          <Image
            src={location.imageUrl}
            alt={location.name}
            fill
            className="object-cover"
            sizes="(max-width: 448px) 100vw, 448px"
          />
        </Link>

        {location.distanceBadge && (
          <div className="absolute left-3 top-3 z-10">
            <DistanceBadge label={location.distanceBadge} />
          </div>
        )}

        <div className="absolute right-3 top-3 z-10 flex gap-2">
          <button
            type="button"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onToggleCompare(location.id);
            }}
            aria-label={
              isCompareSelected
                ? `Rimuovi ${location.name} dal confronto`
                : `Aggiungi ${location.name} al confronto`
            }
            className={cn(
              "flex h-9 w-9 items-center justify-center rounded-full shadow-md backdrop-blur-md transition-colors duration-150",
              isCompareSelected
                ? "bg-brand-teal text-white"
                : "bg-white text-primary-black hover:bg-white/90",
            )}
          >
            <GitCompareArrows className="h-4 w-4" aria-hidden />
          </button>
          <button
            type="button"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onToggleFavorite(location.id);
            }}
            aria-label={
              isFavorite
                ? `Rimuovi ${location.name} dai preferiti`
                : `Aggiungi ${location.name} ai preferiti`
            }
            className={cn(
              "flex h-9 w-9 items-center justify-center rounded-full shadow-md backdrop-blur-md transition-colors duration-150",
              isFavorite
                ? "bg-brand-pink text-white"
                : "bg-white text-primary-black hover:bg-white/90",
            )}
          >
            <Heart
              className="h-4 w-4"
              fill={isFavorite ? "currentColor" : "none"}
              aria-hidden
            />
          </button>
        </div>
      </div>

      <Link href={href} className="block p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h3 className="truncate font-semibold text-primary-black">
              {location.name}
            </h3>
            <p className="mt-0.5 flex items-center gap-1 text-xs text-primary-black/50">
              <MapPin className="h-3 w-3 shrink-0" aria-hidden />
              {location.zoneLabel} · {location.comune} · fino a {location.capacity} ospiti
            </p>
          </div>
          <p className="shrink-0 text-right">
            <span className="rounded-full bg-primary-black px-3 py-1 text-xs font-bold text-white">
              {price.eyebrow} {price.price}
            </span>
            <span className="mt-1 block text-[10px] font-bold text-primary-black/50">
              {price.unit}
            </span>
            <span className="mt-1 block text-[10px] text-brand-teal">
              {price.badge}
            </span>
          </p>
        </div>

      </Link>

      {hasContacts && (
        <div className="px-4 pb-4">
          <button
            type="button"
            onClick={() => setContactsOpen((current) => !current)}
            className={cn(
              "w-full rounded-xl bg-brand-teal/8 px-3 py-2 text-left transition-all duration-150 hover:bg-brand-teal/12",
              contactsOpen && "rounded-2xl bg-brand-teal/12 py-3",
            )}
            aria-expanded={contactsOpen}
          >
            <span className="flex items-center gap-2">
              <span className="flex -space-x-2">
                {contactsBeenHere.contacts.slice(0, 3).map((contact) => (
                  <span
                    key={contact.id}
                    className="flex h-6 w-6 items-center justify-center rounded-full border-2 border-background text-[9px] font-bold text-white"
                    style={{ backgroundColor: contact.avatarColor }}
                    title={contact.name}
                  >
                    {contact.initials}
                  </span>
                ))}
              </span>
              <span className="text-[11px] leading-tight text-primary-black/70">
                <span className="font-semibold text-primary-black">
                  {contactsBeenHere.count}
                </span>{" "}
                {contactsBeenHere.count === 1
                  ? "tuo contatto è stato qui"
                  : "tuoi contatti sono stati qui"}
              </span>
            </span>

            {contactsOpen && (
              <span className="mt-3 block border-t border-brand-teal/20 pt-3">
                <span className="block text-[10px] font-black uppercase tracking-[0.14em] text-brand-teal">
                  Chi è stato qui
                </span>
                <span className="mt-2 flex flex-wrap gap-2">
                  {contactsBeenHere.contacts.map((contact) => (
                    <span
                      key={contact.id}
                      className="inline-flex items-center gap-1.5 rounded-full bg-background px-2.5 py-1 text-xs font-bold text-primary-black shadow-sm"
                    >
                      <span
                        className="h-2 w-2 rounded-full"
                        style={{ backgroundColor: contact.avatarColor }}
                      />
                      {contact.name}
                    </span>
                  ))}
                </span>
              </span>
            )}
          </button>
        </div>
      )}
    </article>
  );
});
