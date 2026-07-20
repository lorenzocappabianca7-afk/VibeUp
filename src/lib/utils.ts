import type { Location } from "@/types/location";

export function cn(...classes: (string | undefined | false | null)[]): string {
  return classes.filter(Boolean).join(" ");
}

/** Shared responsive width for app shell, pages, and bottom navigation */
export const APP_SHELL_WIDTH_CLASS =
  "w-full max-w-full sm:max-w-lg md:max-w-2xl lg:max-w-6xl";

export const MODAL_SAFE_BOTTOM_STYLE = {
  paddingBottom: "calc(1.25rem + env(safe-area-inset-bottom, 0px))",
} as const;

export const DISCOUNT_POPOVER_CLASS =
  "fixed inset-x-4 top-24 z-50 max-h-[calc(100dvh-7rem-env(safe-area-inset-bottom,0px))] overflow-y-auto sm:absolute sm:inset-x-auto sm:right-0 sm:top-full sm:mt-3 sm:max-h-none sm:w-[min(100%,42rem)] sm:overflow-visible";

export function formatDate(date: string | Date, locale = "it-IT"): string {
  return new Intl.DateTimeFormat(locale, {
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(typeof date === "string" ? new Date(date) : date);
}

export function formatCurrency(amount: number, locale = "it-IT"): string {
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: 0,
  }).format(amount);
}

export function getLocationPricePresentation(
  location: Pick<
    Location,
    | "hourlyPrice"
    | "capacity"
    | "includedServices"
    | "priceModel"
    | "eventPrice"
    | "personPrice"
    | "priceBadge"
  >,
) {
  const hasAllInclusiveServices = location.includedServices.some((service) =>
    /menu|bar|catering|buffet|all.?inclusive/i.test(service),
  );
  const model = location.priceModel ?? (hasAllInclusiveServices ? "person" : "event");

  if (model === "person") {
    const estimatedPersonPrice =
      location.personPrice ??
      Math.max(
        18,
        Math.round((location.hourlyPrice * 4) / Math.max(20, location.capacity)),
      );

    return {
      eyebrow: "Da",
      price: formatCurrency(estimatedPersonPrice),
      unit: "/ Persona",
      badge: location.priceBadge ?? "Prezzo stimato a persona",
    };
  }

  return {
    eyebrow: "A partire da",
    price: formatCurrency(location.eventPrice ?? location.hourlyPrice * 4),
    unit: "/ Evento",
    badge: location.priceBadge ?? "Tariffa a serata",
  };
}
