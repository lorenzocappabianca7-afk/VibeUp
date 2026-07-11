"use client";

import {
  getRefundDisabledReason,
  isRefundEligible,
} from "@/lib/event";
import { cn, formatCurrency } from "@/lib/utils";
import {
  SERVICE_STATUS_LABELS,
  type BookedService,
  type UserEvent,
} from "@/types/event";
import {
  Cake,
  Camera,
  Lightbulb,
  MapPin,
  Music,
  ShieldCheck,
  ShieldAlert,
  Sparkles,
  UtensilsCrossed,
} from "lucide-react";
import type { BookedServiceCategory, ServiceStatus } from "@/types/event";
import type { LucideIcon } from "lucide-react";
import { memo } from "react";

const SERVICE_ICONS: Record<BookedServiceCategory, LucideIcon> = {
  location: MapPin,
  menu: UtensilsCrossed,
  dj: Music,
  photographer: Camera,
  decorations: Sparkles,
  bakery: Cake,
  catering: UtensilsCrossed,
  audio_lights: Lightbulb,
  security: ShieldCheck,
};

const STATUS_STYLES: Record<ServiceStatus, string> = {
  confirmed: "bg-brand-teal/15 text-brand-teal",
  pending: "bg-amber-100 text-amber-700",
  cancelled: "bg-brand-pink/15 text-brand-pink",
};

interface ServiceStatusListProps {
  event: UserEvent;
  onRequestRefund: (service: BookedService) => void;
}

export const ServiceStatusList = memo(function ServiceStatusList({
  event,
  onRequestRefund,
}: ServiceStatusListProps) {
  return (
    <section className="space-y-4">
      <div>
        <h2 className="text-base font-bold text-primary-black">
          Servizi prenotati
        </h2>
        <p className="mt-1 text-sm text-primary-black/60">
          Stato di ogni fornitore e protezione rimborso
        </p>
      </div>

      <ul className="space-y-3">
        {event.services.map((service) => {
          const Icon = SERVICE_ICONS[service.category];
          const eligible = isRefundEligible(event, service);
          const disabledReason = getRefundDisabledReason(event, service);

          return (
            <li
              key={service.id}
              className="rounded-2xl border border-primary-black/10 bg-background p-4"
            >
              <div className="flex items-start gap-3">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary-black/5 text-primary-black/50">
                  <Icon className="h-5 w-5" aria-hidden />
                </span>

                <div className="min-w-0 flex-1">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="font-semibold text-primary-black">
                        {service.name}:{" "}
                        <span
                          className={cn(
                            "inline-block rounded-full px-2 py-0.5 text-xs font-medium",
                            STATUS_STYLES[service.status],
                          )}
                        >
                          {SERVICE_STATUS_LABELS[service.status]}
                        </span>
                      </p>
                      <p className="mt-0.5 text-xs text-primary-black/50">
                        {service.providerName} ·{" "}
                        {formatCurrency(service.amountPaid)}
                      </p>
                    </div>
                  </div>

                  <div className="mt-3 flex items-center justify-between gap-2">
                    <button
                      type="button"
                      onClick={() => eligible && onRequestRefund(service)}
                      disabled={!eligible}
                      title={disabledReason}
                      className={cn(
                        "inline-flex items-center gap-1.5 rounded-xl px-3 py-2 text-xs font-medium transition-colors",
                        eligible
                          ? "bg-brand-pink/15 text-primary-black hover:bg-brand-pink/25"
                          : "cursor-not-allowed bg-primary-black/5 text-primary-black/35",
                      )}
                    >
                      <ShieldAlert className="h-3.5 w-3.5" aria-hidden />
                      Richiedi Rimborso
                    </button>

                    {!eligible && disabledReason && (
                      <p className="text-right text-[10px] leading-tight text-primary-black/40">
                        {disabledReason}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
});
