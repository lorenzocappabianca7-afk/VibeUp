"use client";

import type { Location } from "@/types/location";
import { Check, X } from "lucide-react";
import { memo, useMemo } from "react";
import { SafeImage } from "@/components/ui/safe-image";

interface CompareFavoritesProps {
  locations: Location[];
  onRemove: (id: string) => void;
}

function getPriceBand(hourlyPrice: number): string {
  if (hourlyPrice <= 80) return "Bassa";
  if (hourlyPrice <= 150) return "Media";
  if (hourlyPrice <= 250) return "Alta";
  return "Molto alta";
}

export const CompareFavorites = memo(function CompareFavorites({
  locations,
  onRemove,
}: CompareFavoritesProps) {
  const allServices = useMemo(
    () =>
      Array.from(
        new Set(locations.flatMap((loc) => loc.includedServices)),
      ).sort((a, b) => a.localeCompare(b, "it")),
    [locations],
  );
  const tableMinWidth = useMemo(
    () => 128 + locations.length * 184,
    [locations.length],
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
        {locations.length > 1 && (
          <p className="mt-2 text-[11px] font-medium text-brand-teal sm:hidden">
            Scorri orizzontalmente per vedere tutte le colonne
          </p>
        )}
      </div>

      <div className="max-w-full overflow-x-auto overscroll-x-contain">
        <table
          className="w-full border-separate border-spacing-0 text-sm"
          style={{ minWidth: `${tableMinWidth}px` }}
        >
          <thead>
            <tr>
              <th
                className="sticky left-0 z-20 w-px border-b border-r border-primary-black/10 bg-background px-2 py-3"
                aria-label="Spazio vuoto"
              />
              {locations.map((location) => (
                <th
                  key={location.id}
                  className="w-[11.5rem] border-b border-r border-primary-black/10 bg-primary-black/[0.03] p-3 align-top last:border-r-0"
                >
                  <div className="relative overflow-hidden rounded-2xl border border-primary-black/10 bg-background text-left">
                    <div className="relative aspect-[16/10]">
                      <SafeImage
                        src={location.imageUrl}
                        alt={location.name}
                        fill
                        className="object-cover"
                        sizes="184px"
                      />
                      <button
                        type="button"
                        onClick={() => onRemove(location.id)}
                        className="absolute right-2 top-2 flex h-7 w-7 items-center justify-center rounded-full bg-background text-primary-black/50 shadow-sm transition-colors hover:text-brand-pink"
                        aria-label={`Rimuovi ${location.name} dal confronto`}
                      >
                        <X className="h-3.5 w-3.5" aria-hidden />
                      </button>
                    </div>
                    <div className="p-3">
                      <p className="truncate text-sm font-black text-primary-black">
                        {location.name}
                      </p>
                      <p className="mt-0.5 truncate text-[11px] font-medium text-primary-black/50">
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
                className="bg-brand-teal/8 px-3 py-2 text-left text-[11px] font-black uppercase tracking-[0.18em] text-brand-teal"
              >
                Dettagli principali
              </th>
            </tr>
            <CompareRow
              label="Fascia di prezzo"
              locations={locations}
              renderValue={(loc) => (
                <span className="font-bold text-brand-teal">
                  {getPriceBand(loc.hourlyPrice)}
                </span>
              )}
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
                <span className="text-primary-black/80">
                  {loc.capacity} ospiti
                </span>
              )}
            />
            <tr>
              <th
                colSpan={locations.length + 1}
                className="bg-brand-pink/10 px-3 py-2 text-left text-[11px] font-black uppercase tracking-[0.18em] text-primary-black"
              >
                Servizi inclusi
              </th>
            </tr>
            {allServices.map((service) => (
              <tr key={service} className="group">
                <th className="sticky left-0 z-10 w-px whitespace-nowrap border-b border-r border-primary-black/8 bg-background px-2 py-3 text-left text-[11px] font-bold text-primary-black/70 group-hover:bg-primary-black/[0.02]">
                  {service}
                </th>
                {locations.map((loc) => {
                  const isIncluded = loc.includedServices.includes(service);

                  return (
                    <td
                      key={loc.id}
                      className="border-b border-r border-primary-black/8 px-3 py-3 text-center last:border-r-0 group-hover:bg-primary-black/[0.02]"
                    >
                      {isIncluded ? (
                        <span className="inline-flex items-center justify-center gap-1.5 rounded-full bg-brand-teal/12 px-2.5 py-1 text-[11px] font-black text-brand-teal">
                          <Check className="h-3.5 w-3.5" aria-hidden />
                          Incluso
                        </span>
                      ) : (
                        <span className="inline-flex items-center justify-center rounded-full bg-primary-black/[0.04] px-2.5 py-1 text-[11px] font-bold text-primary-black/30">
                          Non incluso
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
      <th className="sticky left-0 z-10 w-px whitespace-nowrap border-b border-r border-primary-black/8 bg-background px-2 py-3 text-left text-[11px] font-bold text-primary-black/70 group-hover:bg-primary-black/[0.02]">
        {label}
      </th>
      {locations.map((loc) => (
        <td
          key={loc.id}
          className="border-b border-r border-primary-black/8 px-3 py-3 text-center text-xs last:border-r-0 group-hover:bg-primary-black/[0.02]"
        >
          {renderValue(loc)}
        </td>
      ))}
    </tr>
  );
});
