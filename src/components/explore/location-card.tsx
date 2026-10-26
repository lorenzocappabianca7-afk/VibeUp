"use client";

import { DistanceBadge } from "@/components/explore/distance-badge";
import { SoftNavLink } from "@/components/navigation/soft-nav-link";
import {
  ImageCarousel,
  uniqueImages,
} from "@/components/ui/image-carousel";
import { useDemoLanguage } from "@/context/demo-language-context";
import { usePartyCriteria } from "@/context/party-criteria-context";
import { getFilteredLocationPricePresentation } from "@/lib/location-preview-price";
import { cn } from "@/lib/utils";
import type { ContactPreview, Location } from "@/types/location";
import { Check, GitCompareArrows, Heart, MapPin } from "lucide-react";
import { memo, useMemo, useRef, useState, type KeyboardEvent, type PointerEvent } from "react";

interface LocationCardProps {
  location: Location;
  isFavorite: boolean;
  isCompareSelected: boolean;
  onToggleFavorite: (id: string) => void;
  onToggleCompare: (id: string) => void;
  href?: string;
  /** Hide compare control (e.g. Home suggestions carousel). */
  showCompare?: boolean;
  /** First above-the-fold card: eager LCP image. */
  priority?: boolean;
  /** Demo Esplora: one circle instead of the heart. */
  selectionStyle?: "heart" | "radio";
}

export const LocationCard = memo(function LocationCard({
  location,
  isFavorite,
  isCompareSelected,
  onToggleFavorite,
  onToggleCompare,
  href = `/location/${location.id}`,
  showCompare = true,
  priority = false,
  selectionStyle = "heart",
}: LocationCardProps) {
  const { lang } = useDemoLanguage();
  const { criteria } = usePartyCriteria();
  const { contactsBeenHere } = location;
  const hasContacts = contactsBeenHere.count > 0;
  const price = getFilteredLocationPricePresentation(location, criteria);
  const [contactsOpen, setContactsOpen] = useState(false);
  const pointerRef = useRef({ x: 0, y: 0, dragged: false });
  const picking = selectionStyle === "radio";
  const photos = useMemo(
    () => uniqueImages([location.imageUrl, ...(location.gallery ?? [])]),
    [location.gallery, location.imageUrl],
  );
  const placeLabel = [location.zoneLabel, location.comune]
    .map((part) => part.trim())
    .filter(Boolean)
    .join(" · ");
  const subtitle = [
    placeLabel,
    location.capacity > 0 ? `fino a ${location.capacity} ospiti` : "",
  ]
    .filter(Boolean)
    .join(" · ");

  function rememberPointer(event: PointerEvent<HTMLElement>) {
    pointerRef.current = { x: event.clientX, y: event.clientY, dragged: false };
  }

  function trackPointer(event: PointerEvent<HTMLElement>) {
    const dx = event.clientX - pointerRef.current.x;
    const dy = event.clientY - pointerRef.current.y;
    if (dx * dx + dy * dy > 100) pointerRef.current.dragged = true;
  }

  function selectFromTap() {
    if (pointerRef.current.dragged) return;
    onToggleFavorite(location.id);
  }

  function selectFromKeyboard(event: KeyboardEvent<HTMLElement>) {
    if (event.key !== "Enter" && event.key !== " ") return;
    event.preventDefault();
    onToggleFavorite(location.id);
  }

  const pickLabel = isFavorite
    ? lang === "en"
      ? `Selected: ${location.name}. Tap to clear.`
      : `Selezionata: ${location.name}. Tocca per togliere.`
    : lang === "en"
      ? `Choose ${location.name}`
      : `Scegli ${location.name}`;

  const card = (
    <article
      role={picking ? "button" : undefined}
      tabIndex={picking ? 0 : undefined}
      aria-pressed={picking ? isFavorite : undefined}
      aria-label={picking ? pickLabel : undefined}
      onPointerDown={picking ? rememberPointer : undefined}
      onPointerMove={picking ? trackPointer : undefined}
      onClick={picking ? selectFromTap : undefined}
      onKeyDown={picking ? selectFromKeyboard : undefined}
      className={cn(
        "render-contained h-full overflow-clip rounded-2xl bg-background shadow-sm transition-[border-color,box-shadow,transform] duration-150",
        picking &&
          "cursor-pointer outline-none active:scale-[0.98] motion-reduce:active:scale-100 focus-visible:ring-2 focus-visible:ring-brand-teal",
        picking
          ? isFavorite
            ? "border-2 border-brand-teal"
            : "border-2 border-primary-black/12 hover:border-primary-black"
          : "border border-primary-black/12 hover:border-primary-black",
      )}
    >
      <div className="relative">
        <ImageCarousel
          images={photos}
          alt={location.name}
          frameClassName="aspect-[16/10]"
          sizes="(max-width: 448px) 100vw, 448px"
          showDots={photos.length > 1}
          priority={priority}
          renderSlide={(_image, _index, imageNode) =>
            picking ? (
              imageNode
            ) : (
              <SoftNavLink
                href={href}
                className="absolute inset-0 block touch-pan-y"
                draggable={false}
              >
                {imageNode}
              </SoftNavLink>
            )
          }
        />

        {location.distanceBadge && (
          <div className="absolute left-3 top-3 z-10">
            <DistanceBadge label={location.distanceBadge} />
          </div>
        )}

        <div className="absolute right-3 top-3 z-10 flex gap-2">
          {showCompare && !picking ? (
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
                "touch-target touch-feedback flex items-center justify-center rounded-full shadow-md backdrop-blur-md transition-colors duration-150",
                isCompareSelected
                  ? "bg-brand-teal-strong text-ink-inverse"
                  : "bg-surface text-brand-teal-strong hover:bg-brand-teal/10",
              )}
            >
              <GitCompareArrows
                className="h-4 w-4"
                strokeWidth={2.75}
                aria-hidden
              />
            </button>
          ) : null}
          {picking ? (
            <span className="pointer-events-none flex h-11 w-11 items-center justify-center" aria-hidden>
              <span
                className={cn(
                  "flex h-7 w-7 items-center justify-center rounded-full border-2 shadow-md",
                  isFavorite
                    ? "border-brand-teal bg-brand-teal text-ink-inverse"
                    : "border-white/90 bg-black/35 text-transparent",
                )}
              >
                <Check className="h-4 w-4" strokeWidth={3} />
              </span>
            </span>
          ) : (
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
                "touch-target touch-feedback flex items-center justify-center rounded-full shadow-md backdrop-blur-md transition-colors duration-150",
                isFavorite
                  ? "bg-brand-pink text-white"
                  : "bg-surface text-primary-black hover:bg-surface/90",
              )}
            >
              <Heart
                className="h-4 w-4"
                strokeWidth={2.75}
                fill={isFavorite ? "currentColor" : "none"}
                aria-hidden
              />
            </button>
          )}
        </div>
      </div>

      {picking ? (
        <div className="block p-4">
          <CardSummary subtitle={subtitle} name={location.name} price={price.price} detail={price.detail} />
        </div>
      ) : (
        <SoftNavLink href={href} className="block p-4">
          <CardSummary subtitle={subtitle} name={location.name} price={price.price} detail={price.detail} />
        </SoftNavLink>
      )}

      {showCompare && !picking ? (
        <div className="px-4 pb-3">
          <button
            type="button"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onToggleCompare(location.id);
            }}
            className={cn(
              "flex w-full items-center justify-center gap-2 rounded-2xl border px-3 py-2 text-xs font-black transition-colors",
              isCompareSelected
                ? "border-brand-teal bg-brand-teal text-ink-inverse"
                : "border-brand-teal/35 bg-brand-teal/10 text-brand-teal hover:bg-brand-teal/20",
            )}
            aria-pressed={isCompareSelected}
          >
            <GitCompareArrows className="h-3.5 w-3.5" strokeWidth={2.75} aria-hidden />
            {isCompareSelected ? "Nel confronto" : "Confronta location"}
          </button>
        </div>
      ) : null}

      {hasContacts && !picking ? (
        <div className="px-4 pb-4">
          <button
            type="button"
            onClick={() => setContactsOpen((current) => !current)}
            className={cn(
              "w-full rounded-xl bg-brand-teal px-3 py-2.5 text-left transition-all duration-150 hover:bg-brand-teal-strong",
              contactsOpen && "rounded-2xl py-3",
            )}
            aria-expanded={contactsOpen}
          >
            <span className="flex items-center gap-2">
              <span className="flex -space-x-2">
                {contactsBeenHere.contacts.slice(0, 3).map((contact) => (
                  <ContactAvatar
                    key={contact.id}
                    contact={contact}
                    size="sm"
                    className="border-2 border-white/85"
                  />
                ))}
              </span>
              <span className="text-[11px] leading-tight text-ink-inverse/85">
                <span className="font-semibold text-ink-inverse">
                  {contactsBeenHere.count}
                </span>{" "}
                {contactsBeenHere.count === 1
                  ? "tuo contatto è stato qui"
                  : "tuoi contatti sono stati qui"}
              </span>
            </span>

            {contactsOpen && (
              <span className="mt-3 block border-t border-ink-inverse/20 pt-3">
                <span className="block text-[10px] font-black uppercase tracking-[0.14em] text-ink-inverse/80">
                  Chi è stato qui
                </span>
                <span className="mt-2 flex flex-wrap gap-2">
                  {contactsBeenHere.contacts.map((contact) => (
                    <span
                      key={contact.id}
                      className="inline-flex items-center gap-1.5 rounded-full bg-ink-inverse/10 px-2 py-1 text-xs font-bold text-ink-inverse"
                    >
                      <ContactAvatar contact={contact} size="xs" />
                      {contact.name}
                    </span>
                  ))}
                </span>
              </span>
            )}
          </button>
        </div>
      ) : null}
    </article>
  );

  if (!picking) return card;

  return (
    <div className="flex h-full flex-col">
      {card}
      <button
        type="button"
        onClick={() => onToggleCompare(location.id)}
        className={cn(
          "mt-2 flex w-full items-center justify-center gap-2 rounded-2xl border px-3 py-2 text-xs font-black transition-colors",
          isCompareSelected
            ? "border-brand-teal bg-brand-teal text-ink-inverse"
            : "border-brand-teal/35 bg-brand-teal/10 text-brand-teal hover:bg-brand-teal/20",
        )}
        aria-pressed={isCompareSelected}
      >
        <GitCompareArrows className="h-3.5 w-3.5" strokeWidth={2.75} aria-hidden />
        {isCompareSelected ? "Nel confronto" : "Confronta"}
      </button>
    </div>
  );
});

function CardSummary({
  name,
  subtitle,
  price,
  detail,
}: {
  name: string;
  subtitle: string;
  price: string;
  detail: string;
}) {
  return (
    <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between sm:gap-3">
      <div className="min-w-0">
        <h3 className="truncate font-semibold text-primary-black">{name}</h3>
        {subtitle ? (
          <p className="mt-0.5 flex min-w-0 items-center gap-1 text-xs text-primary-black/50">
            <MapPin className="h-3 w-3 shrink-0" aria-hidden />
            <span className="truncate">{subtitle}</span>
          </p>
        ) : null}
      </div>
      <p className="shrink-0 self-start sm:text-right">
        <span className="rounded-full bg-paper px-3 py-1 text-xs font-bold text-ink-inverse">
          {price}
        </span>
        <span className="mt-1 block text-[10px] font-bold text-brand-teal">
          {detail}
        </span>
      </p>
    </div>
  );
}

function ContactAvatar({
  contact,
  size = "sm",
  className,
}: {
  contact: ContactPreview;
  size?: "xs" | "sm";
  className?: string;
}) {
  const sizeClass = size === "xs" ? "h-5 w-5 text-[8px]" : "h-6 w-6 text-[9px]";

  if (contact.avatarUrl) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={contact.avatarUrl}
        alt={`Avatar di ${contact.name}`}
        title={contact.name}
        draggable={false}
        loading="lazy"
        decoding="async"
        className={cn(
          "shrink-0 rounded-full object-cover",
          sizeClass,
          className,
        )}
      />
    );
  }

  return (
    <span
      className={cn(
        "flex shrink-0 items-center justify-center rounded-full font-bold text-white",
        sizeClass,
        className,
      )}
      style={{ backgroundColor: contact.avatarColor }}
      title={contact.name}
    >
      {contact.initials}
    </span>
  );
}
