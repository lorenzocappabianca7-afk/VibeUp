import { coerceAllergenRestrictions } from "@/lib/menu-allergens";
import { formatCurrency } from "@/lib/utils";
import type { AvailabilityEventPayload } from "@/types/availability-request";
import type { BookedService, MenuAllergenRestriction } from "@/types/event";

export function formatAllergenRestrictionLabel(
  item: MenuAllergenRestriction,
): string {
  if (item.guestCount <= 1) return item.name;
  return `${item.name} (${item.guestCount} invitati)`;
}

export function collectPayloadAllergens(
  payload: Pick<AvailabilityEventPayload, "services">,
): MenuAllergenRestriction[] {
  const byName = new Map<string, number>();
  for (const service of payload.services ?? []) {
    for (const item of coerceAllergenRestrictions(service.allergens)) {
      byName.set(
        item.name,
        Math.max(byName.get(item.name) ?? 0, item.guestCount),
      );
    }
  }
  return Array.from(byName.entries()).map(([name, guestCount]) => ({
    name,
    guestCount,
  }));
}

export function formatServiceRequestLine(service: BookedService): string {
  const price =
    typeof service.amountPaid === "number"
      ? formatCurrency(service.amountPaid)
      : "";
  return price ? `${service.name} — ${price}` : service.name;
}

/** Extra lines for the manager message: services, allergens, deposit. */
export function buildAvailabilityRequestDetailsBlock(
  payload: AvailabilityEventPayload,
): string {
  const lines: string[] = [];
  const services = payload.services ?? [];

  if (services.length > 0) {
    lines.push("🧾 Dettaglio richiesto:");
    for (const service of services) {
      lines.push(`• ${formatServiceRequestLine(service)}`);
      const allergens = coerceAllergenRestrictions(service.allergens);
      if (allergens.length > 0) {
        lines.push(
          `  Allergeni: ${allergens.map(formatAllergenRestrictionLabel).join(", ")}`,
        );
      }
    }
  }

  const allergens = collectPayloadAllergens(payload);
  if (allergens.length === 0) {
    lines.push("🌿 Nessun allergene segnalato.");
  } else if (services.length === 0) {
    lines.push(
      `🌿 Allergeni: ${allergens.map(formatAllergenRestrictionLabel).join(", ")}`,
    );
  }

  if (typeof payload.depositAmount === "number" && payload.depositAmount > 0) {
    lines.push(`💳 Caparra stimata: ${formatCurrency(payload.depositAmount)}`);
  }

  if (payload.city?.trim()) {
    lines.push(`📌 Città: ${payload.city.trim()}`);
  }

  return lines.join("\n");
}
