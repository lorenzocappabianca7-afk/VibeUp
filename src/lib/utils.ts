import type { Location } from "@/types/location";

export function cn(...classes: (string | undefined | false | null)[]): string {
  return classes.filter(Boolean).join(" ");
}

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
