"use client";

import type { Location } from "@/types/location";
import { Check, X } from "lucide-react";
import { memo, useMemo } from "react";
import { SafeImage } from "@/components/ui/safe-image";
import { usePartyCriteria } from "@/context/party-criteria-context";
import { getFilteredLocationPricePresentation } from "@/lib/location-preview-price";

interface CompareFavoritesProps {
  locations: Location[];
  onRemove: (id: string) => void;
}

export const CompareFavorites = memo(function CompareFavorites({
  locations,
  onRemove,
}: CompareFavoritesProps) {
  const { criteria } = usePartyCriteria();
  const allServices = useMemo(
    () =>
      Array.from(
        new Set(locations.flatMap((loc) => loc.includedServices)),
      ).sort((a, b) => a.localeCompare(b, "it")),
    [locations],
  );
  if (locations.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-primary-black/15 bg-primary-black/[0.02] px-6 py-12 text-center">
        <p className="text-sm font-medium text-primary-black">
          Nessuna location da confrontare
        </p>
        <p className="mt-2 text-xs text-primary-black/60">
          Tocca l&apos;icona compara sulle card per aggiungere location qui.
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-3xl border border-primary-black/10 bg-background shadow-sm">
      <div className="border-b border-primary-black/8 px-4 py-3">
        <h3 className="text-sm font-black text-primary-black">
          Tabella comparativa
        </h3>
        <p className="mt-1 text-xs text-primary-black/55">
          Ogni colonna rappresenta un locale; ogni riga mostra una caratteristica o un servizio incluso.
        </p>
      </div>

      <div className="min-w-0 w-full max-w-full overflow-x-clip">
        <table className="w-full table-fixed border-separate border-spacing-0 text-sm">
          <thead>
            <tr>
              <th
                className="w-[22%] min-w-0 border-b border-r border-primary-black/10 bg-background px-1 py-2 sm:px-2 sm:py-3"
                aria-label="Spazio vuoto"
              />
              {locations.map((location) => (
                <th
                  key={location.id}
                  className="min-w-0 border-b border-r border-primary-black/10 bg-primary-black/[0.03] p-1 align-top last:border-r-0 sm:p-2"
                >
                  <div className="relative overflow-clip rounded-xl border border-primary-black/10 bg-background text-left sm:rounded-2xl">
                    <div className="relative aspect-[16/10] overflow-clip">
                      <SafeImage
                        src={location.imageUrl}
                        alt={location.name}
                        fill
                        draggable={false}
                        className="pointer-events-none select-none object-cover"
                        sizes="(max-width: 640px) 30vw, 184px"
                      />
                      <button
                        type="button"
                        onClick={() => onRemove(location.id)}
                        className="absolute right-1 top-1 flex h-6 w-6 items-center justify-center rounded-full bg-background text-primary-black/50 shadow-sm transition-colors hover:text-brand-pink sm:right-2 sm:top-2 sm:h-7 sm:w-7"
                        aria-label={`Rimuovi ${location.name} dal confronto`}
                      >
                        <X className="h-3 w-3 sm:h-3.5 sm:w-3.5" aria-hidden />
                      </button>
                    </div>
                    <div className="px-1 py-1.5 sm:p-3">
                      <p className="break-words text-[10px] font-black leading-tight text-primary-black sm:text-sm">
                        {location.name}
                      </p>
                      <p className="mt-0.5 break-words text-[9px] font-medium leading-tight text-primary-black/50 sm:text-[11px]">
                        {location.city}
                      </p>
                    </div>
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            <tr>
              <th
                colSpan={locations.length + 1}
                className="bg-brand-teal/8 px-1.5 py-1.5 text-left text-[10px] font-black uppercase tracking-[0.12em] text-brand-teal sm:px-3 sm:py-2 sm:text-[11px] sm:tracking-[0.18em]"
              >
                Dettagli principali
              </th>
            </tr>
            <CompareRow
              label="Prezzo stimato"
              locations={locations}
              renderValue={(loc) => {
                const price = getFilteredLocationPricePresentation(
                  loc,
                  criteria,
                );
                return (
                  <span className="block font-bold leading-tight text-brand-teal">
                    {price.price}
                    <span className="mt-0.5 block text-[9px] font-semibold leading-tight text-primary-black/50 sm:text-[10px]">
                      {price.detail}
                    </span>
                  </span>
                );
              }}
            />
            <CompareRow
              label="Zona"
              locations={locations}
              renderValue={(loc) => (
                <span className="font-medium text-primary-black/70">
                  {loc.zoneLabel}
                </span>
              )}
            />
            <CompareRow
              label="Capacità"
              locations={locations}
              renderValue={(loc) => (
                <span className="block leading-tight text-primary-black/80">
                  {loc.capacity}
                  <span className="mt-0.5 block text-[9px] font-medium text-primary-black/50 sm:mt-0 sm:inline sm:text-[inherit] sm:font-inherit sm:text-primary-black/80">
                    {" "}
                    ospiti
                  </span>
                </span>
              )}
            />
            <tr>
              <th
                colSpan={locations.length + 1}
                className="bg-brand-pink/10 px-1.5 py-1.5 text-left text-[10px] font-black uppercase tracking-[0.12em] text-primary-black sm:px-3 sm:py-2 sm:text-[11px] sm:tracking-[0.18em]"
              >
                Servizi inclusi nel prezzo
              </th>
            </tr>
            {allServices.map((service) => (
              <tr key={service} className="group">
                <th className="min-w-0 break-words border-b border-r border-primary-black/8 bg-background px-1 py-2 text-left text-[10px] font-bold leading-tight text-primary-black/70 group-hover:bg-primary-black/[0.02] sm:px-2 sm:py-3 sm:text-[11px]">
                  {service}
                </th>
                {locations.map((loc) => {
                  const isIncluded = loc.includedServices.includes(service);

                  return (
                    <td
                      key={loc.id}
                      className="min-w-0 border-b border-r border-primary-black/8 px-1 py-2 text-center last:border-r-0 group-hover:bg-primary-black/[0.02] sm:px-3 sm:py-3"
                    >
                      {isIncluded ? (
                        <span className="inline-flex items-center justify-center gap-1 rounded-full bg-brand-teal/12 px-1.5 py-0.5 text-[10px] font-black text-brand-teal sm:gap-1.5 sm:px-2.5 sm:py-1 sm:text-[11px]">
                          <Check className="h-3 w-3 sm:h-3.5 sm:w-3.5" aria-hidden />
                          <span className="sr-only sm:not-sr-only">Incluso</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center justify-center rounded-full bg-primary-black/[0.04] px-1.5 py-0.5 text-[10px] font-bold text-primary-black/30 sm:px-2.5 sm:py-1 sm:text-[11px]">
                          <span className="sm:hidden" aria-hidden>
                            —
                          </span>
                          <span className="sr-only sm:not-sr-only">Non incluso</span>
                        </span>
                      )}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
});

interface CompareRowProps {
  label: string;
  locations: Location[];
  renderValue: (location: Location) => React.ReactNode;
}

const CompareRow = memo(function CompareRow({
  label,
  locations,
  renderValue,
}: CompareRowProps) {
  return (
    <tr className="group">
      <th className="min-w-0 break-words border-b border-r border-primary-black/8 bg-background px-1 py-2 text-left text-[10px] font-bold leading-tight text-primary-black/70 group-hover:bg-primary-black/[0.02] sm:px-2 sm:py-3 sm:text-[11px]">
        {label}
      </th>
      {locations.map((loc) => (
        <td
          key={loc.id}
          className="min-w-0 break-words border-b border-r border-primary-black/8 px-1 py-2 text-center text-[11px] last:border-r-0 group-hover:bg-primary-black/[0.02] sm:px-3 sm:py-3 sm:text-xs"
        >
          {renderValue(loc)}
        </td>
      ))}
    </tr>
  );
});
