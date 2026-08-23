import {
  collectPayloadAllergens,
  formatAllergenRestrictionLabel,
  formatServiceRequestLine,
} from "@/lib/availability-request-details";
import { formatCurrency } from "@/lib/utils";
import type { AvailabilityEventPayload } from "@/types/availability-request";

export function AvailabilityRequestDetails({
  payload,
  compact = false,
}: {
  payload: AvailabilityEventPayload;
  compact?: boolean;
}) {
  const services = payload.services ?? [];
  const allergens = collectPayloadAllergens(payload);

  return (
    <div className={compact ? "space-y-1.5 text-xs" : "space-y-3 text-sm"}>
      <p className="font-semibold text-primary-black">
        {payload.guestCount} invitati
        {payload.city ? ` · ${payload.city}` : ""}
      </p>

      {services.length > 0 ? (
        <ul className="space-y-1 text-primary-black/70">
          {services.map((service) => (
            <li key={service.id}>
              {formatServiceRequestLine(service)}
            </li>
          ))}
        </ul>
      ) : null}

      <p className="text-primary-black/70">
        {allergens.length > 0
          ? `Allergeni: ${allergens.map(formatAllergenRestrictionLabel).join(", ")}`
          : "Nessun allergene segnalato"}
      </p>

      {typeof payload.depositAmount === "number" && payload.depositAmount > 0 ? (
        <p className="text-primary-black/70">
          Caparra stimata {formatCurrency(payload.depositAmount)}
        </p>
      ) : null}
    </div>
  );
}
