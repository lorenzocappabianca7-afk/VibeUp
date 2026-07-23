"use client";

import { getExtraServicePrice } from "@/lib/location";
import {
  getInternalLocationServicePrice,
  type InternalLocationService,
  type InternalLocationServiceType,
} from "@/lib/location-services";
import { EXTRA_SERVICES } from "@/lib/mock/extra-services";
import { cn, formatCurrency } from "@/lib/utils";
import type { ExtraService, ExtraServiceId, PartyType } from "@/types/location";
import {
  Camera,
  Cake,
  Check,
  ChefHat,
  Lightbulb,
  MapPin,
  Music,
  Search,
  Sparkles,
  UtensilsCrossed,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

const SERVICE_ICONS: Record<ExtraServiceId, LucideIcon> = {
  menu: UtensilsCrossed,
  dj: Music,
  photographer: Camera,
  decorations: Sparkles,
  bakery: Cake,
  catering: UtensilsCrossed,
  audio_lights: Lightbulb,
};

const INTERNAL_SERVICE_ICONS: Record<InternalLocationServiceType, LucideIcon> = {
  menu: UtensilsCrossed,
  dj: Music,
  photographer: Camera,
  decorations: Sparkles,
  audio_lights: Lightbulb,
  bar: ChefHat,
  other: Check,
};

interface ExternalServiceSuggestionView {
  serviceId: ExtraServiceId;
  name: string;
  reason: string;
  estimatedCost: number;
}

function formatServicePrice(service: ExtraService): string {
  if (service.pricing.type === "fixed") {
    return formatCurrency(service.pricing.price);
  }
  if (service.pricing.type === "per_kg") {
    return `${formatCurrency(service.pricing.pricePerKg)}/kg`;
  }
  return `da ${formatCurrency(service.pricing.pricePerPerson)}/invitato`;
}

function formatInternalServicePrice(
  service: InternalLocationService,
  guestCount: number,
): string {
  if (service.pricing.type === "included") return "Incluso";
  if (service.pricing.type === "per_person") {
    return `${formatCurrency(service.pricing.pricePerPerson)}/invitato`;
  }
  return formatCurrency(getInternalLocationServicePrice(service, guestCount));
}

interface ExtraServicesSectionProps {
  partyType: PartyType;
  guestCount: number;
  internalServices: InternalLocationService[];
  selectedInternalServices: string[];
  selectedExtras: ExtraServiceId[];
  cakeKg: number;
  isAiPromptOpen: boolean;
  aiMissingPrompt: string;
  aiLoading: boolean;
  aiSuggestions: ExternalServiceSuggestionView[];
  aiError: string | null;
  onToggleInternalService: (id: string) => void;
  onToggleExtra: (id: ExtraServiceId) => void;
  onCakeKgChange: (kg: number) => void;
  onOpenAiPrompt: () => void;
  onAiMissingPromptChange: (value: string) => void;
  onAskAiForSuggestions: () => void;
}

export function ExtraServicesSection({
  partyType,
  guestCount,
  internalServices,
  selectedInternalServices,
  selectedExtras,
  cakeKg,
  isAiPromptOpen,
  aiMissingPrompt,
  aiLoading,
  aiSuggestions,
  aiError,
  onToggleInternalService,
  onToggleExtra,
  onCakeKgChange,
  onOpenAiPrompt,
  onAiMissingPromptChange,
  onAskAiForSuggestions,
}: ExtraServicesSectionProps) {
  return (
    <section className="space-y-6">
      <div>
        <h2 className="text-base font-bold text-primary-black">
          Servizi della festa
        </h2>
        <p className="mt-1 text-sm text-primary-black/60">
          Scegli prima i servizi interni del locale, poi aggiungi alternative esterne se manca qualcosa.
        </p>
      </div>

      <div className="space-y-3">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h3 className="text-sm font-bold text-primary-black">
              Servizi interni del locale
            </h3>
            <p className="text-xs text-primary-black/55">
              Menu, bar, audio e allestimenti gestiti dalla location.
            </p>
          </div>
          <button
            type="button"
            onClick={onOpenAiPrompt}
            className="rounded-full border border-brand-pink/30 bg-brand-pink/10 px-3 py-1.5 text-xs font-semibold text-brand-pink transition-colors hover:bg-brand-pink/15"
          >
            Non mi basta
          </button>
        </div>

        {internalServices.length > 0 ? (
          <ul className="space-y-3">
            {internalServices.map((service) => {
              const isSelected = selectedInternalServices.includes(service.id);
              const Icon = INTERNAL_SERVICE_ICONS[service.type];
              const price = formatInternalServicePrice(service, guestCount);

              return (
                <li key={service.id}>
                  <button
                    type="button"
                    disabled={!service.available}
                    onClick={() => onToggleInternalService(service.id)}
                    className={cn(
                      "flex w-full items-start gap-3 rounded-2xl border p-4 text-left transition-colors duration-150",
                      isSelected
                        ? "border-brand-teal bg-brand-teal/5"
                        : "border-primary-black/10 bg-background hover:border-primary-black/20",
                      !service.available && "cursor-not-allowed opacity-50",
                    )}
                  >
                    <span
                      className={cn(
                        "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl",
                        isSelected
                          ? "bg-brand-teal text-white"
                          : "bg-primary-black/5 text-primary-black/50",
                      )}
                    >
                      <Icon className="h-5 w-5" aria-hidden />
                    </span>

                    <div className="min-w-0 flex-1">
                      <div className="flex items-start justify-between gap-2">
                        <p className="font-semibold text-primary-black">
                          {service.name}
                        </p>
                        <span
                          className={cn(
                            "shrink-0 text-sm font-bold",
                            isSelected
                              ? "text-brand-teal"
                              : "text-primary-black/70",
                          )}
                        >
                          {price}
                        </span>
                      </div>
                      <p className="mt-0.5 text-xs text-primary-black/60">
                        {service.description}
                      </p>
                    </div>

                    <span
                      className={cn(
                        "flex h-5 w-5 shrink-0 items-center justify-center rounded-md border-2 transition-colors",
                        isSelected
                          ? "border-brand-teal bg-brand-teal text-white"
                          : "border-primary-black/20",
                      )}
                      aria-hidden
                    >
                      {isSelected && <Check className="h-3 w-3" />}
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        ) : (
          <div className="rounded-2xl border border-brand-pink/20 bg-brand-pink/8 p-4">
            <p className="text-sm font-semibold text-primary-black">
              Nessun servizio interno disponibile.
            </p>
            <p className="mt-1 text-xs text-primary-black/60">
              L&apos;IA puo&apos; proporti fornitori esterni adatti alla festa.
            </p>
          </div>
        )}
      </div>

      {(isAiPromptOpen || internalServices.length === 0) && (
        <div className="space-y-3 rounded-2xl border border-brand-pink/20 bg-brand-pink/8 p-4">
          <div className="flex items-start gap-2.5">
            <Search className="mt-0.5 h-4 w-4 shrink-0 text-brand-pink" aria-hidden />
            <div>
              <h3 className="text-sm font-bold text-primary-black">
                Assistente IA servizi esterni
              </h3>
              <p className="text-xs leading-relaxed text-primary-black/60">
                Dimmi cosa manca per la tua festa ({partyType}) e VibeUp cerca alternative personalizzate.
              </p>
            </div>
          </div>

          <textarea
            value={aiMissingPrompt}
            onChange={(event) => onAiMissingPromptChange(event.target.value)}
            rows={3}
            placeholder="Es. mi serve un DJ reggaeton, un menu vegetariano e un allestimento per laurea..."
            className="w-full rounded-xl border border-primary-black/10 bg-background px-4 py-3 text-sm text-primary-black outline-none transition-colors focus:border-brand-pink focus:ring-2 focus:ring-brand-pink/15"
          />

          <button
            type="button"
            onClick={onAskAiForSuggestions}
            disabled={aiLoading}
            className="w-full rounded-xl bg-brand-pink px-4 py-3 text-sm font-bold text-white transition-opacity disabled:opacity-60"
          >
            {aiLoading ? "Sto cercando alternative..." : "Chiedi suggerimenti all'IA"}
          </button>

          {aiError && <p className="text-xs text-brand-pink">{aiError}</p>}

          {aiSuggestions.length > 0 && (
            <ul className="space-y-2">
              {aiSuggestions.map((suggestion) => (
                <li
                  key={`${suggestion.serviceId}-${suggestion.name}`}
                  className="rounded-xl border border-primary-black/10 bg-background p-3"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold text-primary-black">
                        {suggestion.name}
                      </p>
                      <p className="mt-0.5 text-xs leading-relaxed text-primary-black/60">
                        {suggestion.reason}
                      </p>
                    </div>
                    <span className="shrink-0 text-sm font-bold text-brand-pink">
                      {formatCurrency(suggestion.estimatedCost)}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => onToggleExtra(suggestion.serviceId)}
                    className="mt-2 text-xs font-bold text-brand-teal"
                  >
                    {selectedExtras.includes(suggestion.serviceId)
                      ? "Rimuovi dagli extra"
                      : "Aggiungi agli extra"}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      <div>
        <h3 className="text-sm font-bold text-primary-black">
          Servizi esterni disponibili
        </h3>
        <p className="mt-0.5 text-xs text-primary-black/55">
          Fornitori attivi su Torino e provincia.
        </p>
      </div>

      <ul className="space-y-3">
        {EXTRA_SERVICES.map((service) => {
          const isSelected = selectedExtras.includes(service.id);
          const Icon = SERVICE_ICONS[service.id];
          const isBakery = service.id === "bakery";
          const perKgPricing =
            service.pricing.type === "per_kg" ? service.pricing : null;
          const price = formatServicePrice(service);

          return (
            <li key={service.id}>
              <button
                type="button"
                onClick={() => onToggleExtra(service.id)}
                className={cn(
                  "flex w-full items-start gap-3 rounded-2xl border p-4 text-left transition-colors duration-150",
                  isSelected
                    ? "border-brand-teal bg-brand-teal/5"
                    : "border-primary-black/10 bg-background hover:border-primary-black/20",
                )}
              >
                <span
                  className={cn(
                    "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl",
                    isSelected
                      ? "bg-brand-teal text-white"
                      : "bg-primary-black/5 text-primary-black/50",
                  )}
                >
                  <Icon className="h-5 w-5" aria-hidden />
                </span>

                <div className="min-w-0 flex-1">
                  <div className="flex items-start justify-between gap-2">
                    <p className="font-semibold text-primary-black">
                      {service.name}
                    </p>
                    <span
                      className={cn(
                        "shrink-0 text-sm font-bold",
                        isSelected ? "text-brand-teal" : "text-primary-black/70",
                      )}
                    >
                      {price}
                    </span>
                  </div>

                  {service.providerName && (
                    <p className="mt-0.5 flex items-center gap-1 text-xs font-medium text-brand-pink">
                      <MapPin className="h-3 w-3" aria-hidden />
                      {service.providerName}
                      {service.providerZone && ` · ${service.providerZone}`}
                    </p>
                  )}

                  <p className="mt-0.5 text-xs text-primary-black/60">
                    {service.description}
                  </p>

                  {isBakery && isSelected && perKgPricing && (
                    <div
                      className="mt-3 flex items-center gap-3"
                      onClick={(e) => e.stopPropagation()}
                      onKeyDown={(e) => e.stopPropagation()}
                      role="presentation"
                    >
                      <label className="text-xs font-medium text-primary-black/60">
                        Peso torta
                      </label>
                      <select
                        value={cakeKg}
                        onChange={(e) => onCakeKgChange(Number(e.target.value))}
                        className="rounded-lg border border-primary-black/10 bg-background px-3 py-1.5 text-sm text-primary-black focus:border-brand-teal focus:outline-none"
                      >
                        {Array.from(
                          {
                            length:
                              perKgPricing.maxKg - perKgPricing.minKg + 1,
                          },
                          (_, i) => perKgPricing.minKg + i,
                        ).map((kg) => (
                          <option key={kg} value={kg}>
                            {kg} kg —{" "}
                            {formatCurrency(
                              getExtraServicePrice(service, { cakeKg: kg }),
                            )}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}
                </div>

                <span
                  className={cn(
                    "flex h-5 w-5 shrink-0 items-center justify-center rounded-md border-2 transition-colors",
                    isSelected
                      ? "border-brand-teal bg-brand-teal text-white"
                      : "border-primary-black/20",
                  )}
                  aria-hidden
                >
                  {isSelected && <Check className="h-3 w-3" />}
                </span>
              </button>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
