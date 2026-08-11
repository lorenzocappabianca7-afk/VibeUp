import { DistanceBadge } from "@/components/explore/distance-badge";
import { PARTY_TYPE_LABELS, type Location } from "@/types/location";
import {
  Accessibility,
  AirVent,
  Car,
  Clock,
  MapPin,
  Ruler,
  Star,
  Sun,
  Users,
} from "lucide-react";

interface LocationInfoProps {
  location: Location;
}

export function getLocationReviews(_location: Location) {
  // Real verified reviews are not wired yet — do not invent social proof.
  return [] as Array<{
    id: string;
    author: string;
    rating: number;
    text: string;
  }>;
}

export function getLocationAverageRating(location: Location) {
  const reviews = getLocationReviews(location);
  if (reviews.length === 0) return 0;
  return (
    reviews.reduce((sum, review) => sum + review.rating, 0) / reviews.length
  );
}

function PinkStarRating({
  rating,
  size = "md",
  showValue = false,
}: {
  rating: number;
  size?: "sm" | "md";
  showValue?: boolean;
}) {
  const filled = Math.max(0, Math.min(5, Math.round(rating)));
  const starClass = size === "sm" ? "h-3 w-3" : "h-4 w-4";

  return (
    <span
      className="inline-flex shrink-0 items-center gap-1 text-brand-pink"
      aria-label={`Valutazione ${rating.toFixed(1)} su 5`}
    >
      <span className="inline-flex items-center gap-0.5">
        {Array.from({ length: 5 }, (_, index) => (
          <Star
            key={index}
            className={starClass}
            fill={index < filled ? "currentColor" : "none"}
            aria-hidden
          />
        ))}
      </span>
      {showValue && (
        <span className="text-sm font-bold tabular-nums">
          {rating.toFixed(1)}
        </span>
      )}
    </span>
  );
}

export function LocationInfo({ location }: LocationInfoProps) {
  const { technicalDetails: tech } = location;
  const reviews = getLocationReviews(location);
  const averageRating = getLocationAverageRating(location);

  const specs = [
    { icon: Ruler, label: "Superficie", value: `${tech.surfaceSqm} m²` },
    { icon: Users, label: "Capacità max", value: `${tech.maxGuests} ospiti` },
    { icon: Clock, label: "Durata minima", value: `${tech.minHours} ore` },
    { icon: Car, label: "Parcheggio", value: `${tech.parkingSpots} posti` },
    {
      icon: Accessibility,
      label: "Accessibilità",
      value: tech.accessibility ? "Sì" : "No",
    },
    {
      icon: AirVent,
      label: "Aria condizionata",
      value: tech.airConditioning ? "Sì" : "No",
    },
    {
      icon: Sun,
      label: "Area esterna",
      value: tech.outdoorArea ? "Sì" : "No",
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
          <h1 className="text-2xl font-bold text-primary-black">
            {location.name}
          </h1>
          {reviews.length > 0 ? (
            <PinkStarRating rating={averageRating} showValue />
          ) : null}
        </div>
        <p className="mt-1 flex min-w-0 items-start gap-1 text-sm text-primary-black/60">
          <MapPin className="h-4 w-4 shrink-0" aria-hidden />
          <span className="min-w-0 break-words">{location.address}</span>
        </p>
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <span className="rounded-full bg-primary-black/5 px-3 py-1 text-xs font-medium text-primary-black/70">
            {location.zoneLabel}
          </span>
          {location.distanceBadge && (
            <DistanceBadge label={location.distanceBadge} />
          )}
          {location.partyTypes.map((type) => (
            <span
              key={type}
              className="rounded-full bg-brand-pink/15 px-3 py-1 text-xs font-medium text-primary-black"
            >
              {PARTY_TYPE_LABELS[type]}
            </span>
          ))}
        </div>
      </div>

      <section>
        <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-primary-black/50">
          Descrizione
        </h2>
        <p className="text-sm leading-relaxed text-primary-black/80">
          {location.description}
        </p>
      </section>

      <section>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-primary-black/50">
          Dettagli tecnici
        </h2>
        <ul className="grid grid-cols-2 gap-3">
          {specs.map((spec) => (
            <li
              key={spec.label}
              className="flex items-start gap-2.5 rounded-xl border border-primary-black/8 bg-primary-black/[0.02] p-3"
            >
              <spec.icon
                className="mt-0.5 h-4 w-4 shrink-0 text-brand-teal"
                aria-hidden
              />
              <div>
                <p className="text-[10px] font-medium uppercase tracking-wide text-primary-black/45">
                  {spec.label}
                </p>
                <p className="text-sm font-semibold text-primary-black">
                  {spec.value}
                </p>
              </div>
            </li>
          ))}
        </ul>
      </section>

      <section>
        <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-primary-black/50">
          Servizi inclusi nel prezzo
        </h2>
        <ul className="flex flex-wrap gap-2">
          {location.includedServices.map((service) => (
            <li
              key={service}
              className="rounded-full bg-brand-teal/10 px-3 py-1.5 text-xs font-medium text-brand-teal"
            >
              {service}
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}

export function LocationReviewsSection({ location }: LocationInfoProps) {
  const reviews = getLocationReviews(location);
  const averageRating = getLocationAverageRating(location);

  if (reviews.length === 0) {
    return (
      <section className="rounded-3xl border border-dashed border-primary-black/15 bg-primary-black/[0.02] p-5">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-primary-black/50">
          Recensioni del luogo
        </h2>
        <p className="mt-2 text-sm text-primary-black/60">
          Ancora nessuna recensione verificata. Compariranno dopo eventi
          completati su VibeUp.
        </p>
      </section>
    );
  }

  return (
    <section className="rounded-3xl border border-white bg-primary-black/[0.02] p-5">
      <div className="mb-4 flex items-center justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold uppercase tracking-wide text-primary-black/50">
            Recensioni del luogo
          </h2>
          <p className="mt-1 text-sm text-primary-black/60">
            Feedback di chi ha già organizzato qui.
          </p>
        </div>
        <div className="rounded-2xl bg-brand-pink/10 px-3 py-2 text-right">
          <p className="text-lg font-black text-brand-pink">
            {averageRating.toFixed(1)}
          </p>
          <p className="text-[10px] font-bold uppercase tracking-wide text-primary-black/45">
            {reviews.length} recensioni
          </p>
        </div>
      </div>

      <ul className="space-y-3">
        {reviews.map((review) => (
          <li
            key={review.id}
            className="rounded-2xl border border-primary-black/8 bg-surface p-4"
          >
            <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
              <p className="min-w-0 text-sm font-bold text-primary-black">
                {review.author}
              </p>
              <PinkStarRating rating={review.rating} size="sm" />
            </div>
            <p className="text-xs leading-relaxed text-primary-black/65">
              {review.text}
            </p>
          </li>
        ))}
      </ul>
    </section>
  );
}
