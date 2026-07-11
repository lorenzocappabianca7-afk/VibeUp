"use client";

import { CityAutocomplete } from "@/components/explore/city-autocomplete";
import { GuestCountStepper } from "@/components/explore/guest-count-stepper";
import { PriceRangeInputs } from "@/components/explore/price-range-inputs";
import { VibeUpCalendar } from "@/components/ui/vibeup-calendar";
import { DINTORNI_ZONES, TORINO_DISTRICTS } from "@/lib/mock/locations";
import { cn, formatDate } from "@/lib/utils";
import {
  DECORATION_FULFILLMENT_LABELS,
  DEFAULT_EXPLORE_FILTERS,
  DEFAULT_SERVICE_EXPLORE_FILTERS,
  EXPLORE_GUEST_MAX,
  GEO_AREA_LABELS,
  MUSIC_TYPE_LABELS,
  PARTY_TYPE_LABELS,
  type DecorationFulfillment,
  type ExploreCategory,
  type ExploreFilters,
  type GeoArea,
  type MusicType,
  type PartyType,
  type ServiceExploreFilters,
} from "@/types/location";
import { Calendar, ChevronDown, X } from "lucide-react";
import { useEffect, useState } from "react";

const PARTY_TYPES = Object.keys(PARTY_TYPE_LABELS) as PartyType[];
const MUSIC_TYPES = Object.keys(MUSIC_TYPE_LABELS) as MusicType[];
const DECORATION_FULFILLMENTS = Object.keys(
  DECORATION_FULFILLMENT_LABELS,
) as DecorationFulfillment[];
const filterDateFormatter = new Intl.DateTimeFormat("it-IT", {
  day: "numeric",
  month: "short",
});

function formatFilterDateLabel(dateFrom: string | null, dateTo?: string | null) {
  if (!dateFrom) return "Scegli data o fascia";

  const startLabel = filterDateFormatter.format(new Date(dateFrom));

  if (!dateTo || dateTo === dateFrom) return startLabel;
  return `${startLabel} - ${filterDateFormatter.format(new Date(dateTo))}`;
}

interface ExploreFiltersSheetProps {
  open: boolean;
  activeCategory: ExploreCategory;
  filters: ExploreFilters;
  serviceFilters: ServiceExploreFilters;
  eventContext?: {
    title: string;
    date: string;
    time: string;
    guestCount: number;
  } | null;
  onClose: () => void;
  onApply: (filters: ExploreFilters) => void;
  onApplyServiceFilters: (filters: ServiceExploreFilters) => void;
}

export function ExploreFiltersSheet({
  open,
  activeCategory,
  filters,
  serviceFilters,
  eventContext,
  onClose,
  onApply,
  onApplyServiceFilters,
}: ExploreFiltersSheetProps) {
  const [nearMeLoading, setNearMeLoading] = useState(false);
  const [nearMeError, setNearMeError] = useState<string | null>(null);
  const [datePickerOpen, setDatePickerOpen] = useState(false);
  const [draftFilters, setDraftFilters] = useState(filters);
  const [draftServiceFilters, setDraftServiceFilters] = useState(serviceFilters);
  const metroTab = draftFilters.geoArea ?? "torino_citta";

  const torinoActive =
    !draftFilters.allPiemonte &&
    draftFilters.geoArea === "torino_citta" &&
    !draftFilters.selectedComune &&
    !draftFilters.nearMe;

  const showTorinoDistricts =
    !draftFilters.allPiemonte &&
    !draftFilters.selectedComune &&
    !draftFilters.nearMe &&
    !torinoActive &&
    metroTab === "torino_citta" &&
    draftFilters.geoArea === "torino_citta";

  useEffect(() => {
    if (open) {
      document.body.style.overflow = "hidden";
      queueMicrotask(() => {
        setDraftFilters(filters);
        setDraftServiceFilters(serviceFilters);
      });
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [filters, open, serviceFilters]);

  if (!open) return null;

  function updateFilter<K extends keyof ExploreFilters>(
    key: K,
    value: ExploreFilters[K],
  ) {
    setDraftFilters((current) => ({ ...current, [key]: value }));
  }

  function selectEventDate(value: string) {
    if (!draftFilters.dateFrom || (draftFilters.dateFrom && draftFilters.dateTo)) {
      setDraftFilters((current) => ({ ...current, dateFrom: value, dateTo: null }));
      return;
    }

    if (draftFilters.dateFrom === value) {
      setDraftFilters((current) => ({ ...current, dateFrom: value, dateTo: value }));
      return;
    }

    const [start, end] = [draftFilters.dateFrom, value].sort();
    setDraftFilters((current) => ({ ...current, dateFrom: start, dateTo: end }));
  }

  function updateServiceFilter<K extends keyof ServiceExploreFilters>(
    key: K,
    value: ServiceExploreFilters[K],
  ) {
    setDraftServiceFilters((current) => ({ ...current, [key]: value }));
  }

  function clearGeoFilters() {
    return {
      selectedComune: null,
      geoArea: null,
      district: null,
      zone: null,
      nearMe: false,
      userPosition: null,
    } as const;
  }

  function toggleAllPiemonte() {
    if (draftFilters.allPiemonte) {
      setDraftFilters((current) => ({ ...current, allPiemonte: false }));
    } else {
      setNearMeError(null);
      setDraftFilters((current) => ({
        ...current,
        allPiemonte: true,
        ...clearGeoFilters(),
      }));
    }
  }

  function toggleTorino() {
    if (torinoActive) {
      setDraftFilters((current) => ({
        ...current,
        geoArea: null,
        district: null,
      }));
    } else {
      setNearMeError(null);
      setDraftFilters((current) => ({
        ...current,
        allPiemonte: false,
        selectedComune: null,
        geoArea: "torino_citta",
        district: null,
        zone: null,
        nearMe: false,
        userPosition: null,
      }));
    }
  }

  function toggleNearMe() {
    if (draftFilters.nearMe) {
      setNearMeError(null);
      setDraftFilters((current) => ({
        ...current,
        nearMe: false,
        userPosition: null,
      }));
      return;
    }

    if (!navigator.geolocation) {
      setNearMeError("Geolocalizzazione non supportata dal dispositivo");
      return;
    }

    setNearMeLoading(true);
    setNearMeError(null);

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setNearMeLoading(false);
        setDraftFilters((current) => ({
          ...current,
          allPiemonte: false,
          selectedComune: null,
          geoArea: null,
          district: null,
          zone: null,
          nearMe: true,
          userPosition: {
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
          },
        }));
      },
      () => {
        setNearMeLoading(false);
        setNearMeError(
          "Impossibile ottenere la posizione. Controlla i permessi del browser.",
        );
      },
      { enableHighAccuracy: true, timeout: 10000 },
    );
  }

  const comuneSearchDisabled = torinoActive || draftFilters.nearMe;

  function selectComune(comune: string | null) {
    if (comune) {
      setNearMeError(null);
      setDraftFilters((current) => ({
        ...current,
        allPiemonte: false,
        selectedComune: comune,
        geoArea: null,
        district: null,
        zone: null,
        nearMe: false,
        userPosition: null,
      }));
    } else {
      setDraftFilters((current) => ({
        ...current,
        selectedComune: null,
      }));
    }
  }

  function selectMetroTab(area: GeoArea) {
    setNearMeError(null);
    setDraftFilters((current) => ({
      ...current,
      allPiemonte: false,
      selectedComune: null,
      geoArea: area,
      district: area === "torino_citta" ? current.district : null,
      zone: area === "dintorni" ? current.zone : null,
      nearMe: false,
      userPosition: null,
    }));
  }

  function toggleDistrict(district: ExploreFilters["district"]) {
    setDraftFilters((current) => ({
      ...current,
      allPiemonte: false,
      geoArea: "torino_citta",
      district: current.district === district ? null : district,
      zone: null,
      nearMe: false,
      userPosition: null,
    }));
  }

  function toggleZone(zone: ExploreFilters["zone"]) {
    setDraftFilters((current) => ({
      ...current,
      allPiemonte: false,
      geoArea: "dintorni",
      zone: current.zone === zone ? null : zone,
      district: null,
      nearMe: false,
      userPosition: null,
    }));
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-end justify-center lg:items-center">
      <button
        type="button"
        className="absolute inset-0 bg-primary-black/40"
        onClick={onClose}
        aria-label="Chiudi filtri"
      />

      <div
        className="smooth-scroll relative max-h-[90dvh] w-full max-w-md overflow-y-auto rounded-t-3xl bg-background px-5 pb-8 pt-4 shadow-xl lg:max-w-lg lg:rounded-3xl"
        style={{
          paddingBottom: "calc(2rem + env(safe-area-inset-bottom, 0px))",
        }}
      >
        <div className="mx-auto mb-4 h-1 w-10 rounded-full bg-primary-black/15" />

        <div className="mb-6 flex items-center justify-between">
          <h2 className="text-lg font-bold text-primary-black">Filtri</h2>
          <button
            type="button"
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-full bg-primary-black/5 text-primary-black/60"
            aria-label="Chiudi"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="space-y-6">
          {eventContext && activeCategory !== "locali" && (
            <div className="sticky top-0 z-10 rounded-2xl border border-brand-teal/20 bg-background/95 p-3 shadow-sm">
              <p className="text-[10px] font-black uppercase tracking-[0.18em] text-brand-teal">
                Data evento fissata
              </p>
              <p className="mt-1 text-sm font-bold text-primary-black">
                {eventContext.title}
              </p>
              <p className="mt-0.5 text-xs text-primary-black/55">
                {formatDate(eventContext.date)} · ore {eventContext.time} ·{" "}
                {eventContext.guestCount} ospiti
              </p>
              <p className="mt-2 rounded-xl bg-brand-pink/14 px-3 py-2.5 text-sm font-black leading-snug text-primary-black">
                Richiedendo servizi tramite VibeUp puoi ottenere uno sconto
                sulla location.
              </p>
            </div>
          )}

          {activeCategory !== "locali" ? (
            <>
              {activeCategory === "dj" && (
                <fieldset>
                  <legend className="mb-3 text-sm font-semibold text-primary-black">
                    Tipo di musica
                  </legend>
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => updateServiceFilter("musicType", null)}
                      className={cn(
                        "rounded-full px-3.5 py-2 text-xs font-medium transition-colors",
                        draftServiceFilters.musicType === null
                          ? "bg-brand-pink text-primary-black"
                          : "bg-primary-black/5 text-primary-black/70 hover:bg-primary-black/10",
                      )}
                    >
                      Tutti
                    </button>
                    {MUSIC_TYPES.map((type) => (
                      <button
                        key={type}
                        type="button"
                        onClick={() => updateServiceFilter("musicType", type)}
                        className={cn(
                          "rounded-full px-3.5 py-2 text-xs font-medium transition-colors",
                          draftServiceFilters.musicType === type
                            ? "bg-brand-pink text-primary-black"
                            : "bg-primary-black/5 text-primary-black/70 hover:bg-primary-black/10",
                        )}
                      >
                        {MUSIC_TYPE_LABELS[type]}
                      </button>
                    ))}
                  </div>
                </fieldset>
              )}

              {(activeCategory === "dj" || activeCategory === "fotografo") && (
                <fieldset>
                  <legend className="mb-3 text-sm font-semibold text-primary-black">
                    Ore di attività nella serata
                  </legend>
                  <input
                    type="number"
                    inputMode="numeric"
                    min={1}
                    max={12}
                    step={1}
                    value={draftServiceFilters.activityHours}
                    onChange={(event) =>
                      updateServiceFilter(
                        "activityHours",
                        Math.min(
                          12,
                          Math.max(1, Number(event.target.value) || 1),
                        ),
                      )
                    }
                    className="w-full rounded-2xl border border-primary-black/10 bg-background px-4 py-3 text-sm text-primary-black focus:border-brand-teal focus:outline-none focus:ring-2 focus:ring-brand-teal/20"
                    aria-label="Ore di attività nella serata"
                  />
                  <p className="mt-2 text-xs text-primary-black/50">
                    Indica per quante ore vuoi il servizio durante la festa.
                  </p>
                </fieldset>
              )}

              {activeCategory === "decorazioni" && (
                <>
                  <fieldset>
                    <legend className="mb-3 text-sm font-semibold text-primary-black">
                      Tipo di festa
                    </legend>
                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() => updateServiceFilter("partyType", null)}
                        className={cn(
                          "rounded-full px-3.5 py-2 text-xs font-medium transition-colors",
                          draftServiceFilters.partyType === null
                            ? "bg-brand-pink text-primary-black"
                            : "bg-primary-black/5 text-primary-black/70 hover:bg-primary-black/10",
                        )}
                      >
                        Tutti
                      </button>
                      {PARTY_TYPES.map((type) => (
                        <button
                          key={type}
                          type="button"
                          onClick={() =>
                            updateServiceFilter("partyType", type)
                          }
                          className={cn(
                            "rounded-full px-3.5 py-2 text-xs font-medium transition-colors",
                            draftServiceFilters.partyType === type
                              ? "bg-brand-pink text-primary-black"
                              : "bg-primary-black/5 text-primary-black/70 hover:bg-primary-black/10",
                          )}
                        >
                          {PARTY_TYPE_LABELS[type]}
                        </button>
                      ))}
                    </div>
                  </fieldset>

                  <fieldset className="space-y-3">
                    <legend className="text-sm font-semibold text-primary-black">
                      Come vuoi scegliere le decorazioni?
                    </legend>
                    <button
                      type="button"
                      onClick={() =>
                        updateServiceFilter(
                          "viewDecorationsInPerson",
                          !draftServiceFilters.viewDecorationsInPerson,
                        )
                      }
                      className={cn(
                        "flex w-full items-center justify-between gap-4 rounded-2xl border px-4 py-3 text-left text-sm transition-colors",
                        draftServiceFilters.viewDecorationsInPerson
                          ? "border-brand-teal bg-brand-teal/10 text-primary-black"
                          : "border-primary-black/10 text-primary-black/70",
                      )}
                      aria-pressed={draftServiceFilters.viewDecorationsInPerson}
                    >
                      <span>Voglio vedere le decorazioni di persona</span>
                      <span
                        className={cn(
                          "relative h-6 w-11 shrink-0 rounded-full transition-colors",
                          draftServiceFilters.viewDecorationsInPerson
                            ? "bg-brand-teal"
                            : "bg-primary-black/15",
                        )}
                        aria-hidden
                      >
                        <span
                          className={cn(
                            "absolute left-1 top-1 h-4 w-4 rounded-full bg-white shadow-sm transition-transform",
                          draftServiceFilters.viewDecorationsInPerson &&
                              "translate-x-5",
                          )}
                        />
                      </span>
                    </button>
                  </fieldset>

                  <fieldset>
                    <legend className="mb-3 text-sm font-semibold text-primary-black">
                      Consegna o ritiro
                    </legend>
                    <div className="grid grid-cols-2 gap-2">
                      {DECORATION_FULFILLMENTS.map((fulfillment) => (
                        <button
                          key={fulfillment}
                          type="button"
                          onClick={() =>
                            updateServiceFilter(
                              "decorationFulfillment",
                              draftServiceFilters.decorationFulfillment ===
                                fulfillment
                                ? null
                                : fulfillment,
                            )
                          }
                          className={cn(
                            "rounded-2xl px-3 py-3 text-xs font-semibold transition-colors",
                            draftServiceFilters.decorationFulfillment ===
                              fulfillment
                              ? "bg-brand-teal text-white"
                              : "bg-primary-black/5 text-primary-black/70",
                          )}
                        >
                          {DECORATION_FULFILLMENT_LABELS[fulfillment]}
                        </button>
                      ))}
                    </div>
                  </fieldset>
                </>
              )}

              {!eventContext && (
                <fieldset>
                  <legend className="mb-3 text-sm font-semibold text-primary-black">
                    Quando ti serve il servizio?
                  </legend>
                  <button
                    type="button"
                    onClick={() => setDatePickerOpen((current) => !current)}
                    className="flex w-full items-center justify-between gap-3 rounded-2xl border border-primary-black/10 bg-primary-black/[0.03] px-4 py-3 text-left transition-colors duration-150 hover:bg-brand-teal/8"
                  >
                    <span className="flex items-center gap-2">
                      <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-white text-brand-teal">
                        <Calendar className="h-4 w-4" aria-hidden />
                      </span>
                      <span>
                        <span className="block text-xs font-semibold text-primary-black/50">
                          Data
                        </span>
                        <span className="block text-sm font-black text-primary-black">
                          {formatFilterDateLabel(
                            draftFilters.dateFrom,
                            draftFilters.dateTo,
                          )}
                        </span>
                      </span>
                    </span>
                    <ChevronDown
                      className={cn(
                        "h-4 w-4 text-brand-teal transition-transform duration-150",
                        datePickerOpen && "rotate-180",
                      )}
                      aria-hidden
                    />
                  </button>
                  {datePickerOpen && (
                    <VibeUpCalendar
                      selectedStart={draftFilters.dateFrom}
                      selectedEnd={draftFilters.dateTo}
                      onSelectDate={selectEventDate}
                      className="mx-auto mt-3"
                    />
                  )}
                </fieldset>
              )}

              <fieldset>
                <legend className="mb-3 text-sm font-semibold text-primary-black">
                  Indirizzo della festa
                </legend>
                <textarea
                  value={draftServiceFilters.eventAddress}
                  onChange={(event) =>
                    updateServiceFilter("eventAddress", event.target.value)
                  }
                  rows={3}
                  placeholder="Inserisci via, città e dettagli utili per il fornitore..."
                  className="w-full resize-none rounded-2xl border border-primary-black/10 bg-background px-4 py-3 text-sm text-primary-black placeholder:text-primary-black/40 focus:border-brand-teal focus:outline-none focus:ring-2 focus:ring-brand-teal/20"
                />
              </fieldset>
            </>
          ) : (
            <>
          <fieldset>
            <legend className="mb-3 text-sm font-semibold text-primary-black">
              Quando vuoi festeggiare?
            </legend>
            <button
              type="button"
              onClick={() => setDatePickerOpen((current) => !current)}
              className="flex w-full items-center justify-between gap-3 rounded-2xl border border-primary-black/10 bg-primary-black/[0.03] px-4 py-3 text-left transition-colors duration-150 hover:bg-brand-teal/8"
            >
              <span className="flex items-center gap-2">
                <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-white text-brand-teal">
                  <Calendar className="h-4 w-4" aria-hidden />
                </span>
                <span>
                  <span className="block text-xs font-semibold text-primary-black/50">
                    Quando
                  </span>
                  <span className="block text-sm font-black text-primary-black">
                    {formatFilterDateLabel(
                      draftFilters.dateFrom,
                      draftFilters.dateTo,
                    )}
                  </span>
                </span>
              </span>
              <ChevronDown
                className={cn(
                  "h-4 w-4 text-brand-teal transition-transform duration-150",
                  datePickerOpen && "rotate-180",
                )}
                aria-hidden
              />
            </button>
            {datePickerOpen && (
              <VibeUpCalendar
                selectedStart={draftFilters.dateFrom}
                selectedEnd={draftFilters.dateTo}
                onSelectDate={selectEventDate}
                className="mx-auto mt-3"
              />
            )}
            {(draftFilters.dateFrom || draftFilters.dateTo) && (
              <button
                type="button"
                onClick={() => {
                  setDraftFilters((current) => ({
                    ...current,
                    dateFrom: null,
                    dateTo: null,
                  }));
                  setDatePickerOpen(false);
                }}
                className="mt-3 text-xs font-bold text-brand-pink"
              >
                Cancella date
              </button>
            )}
            <p className="mt-2 text-xs leading-relaxed text-primary-black/50">
              Clicca un giorno e poi un altro per selezionare una fascia. Clicca
              due volte lo stesso giorno per scegliere solo quella data.
            </p>
          </fieldset>

          <fieldset>
            <legend className="mb-3 text-sm font-semibold text-primary-black">
              Tipo di festa
            </legend>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => updateFilter("partyType", null)}
                className={cn(
                  "rounded-full px-3.5 py-2 text-xs font-medium transition-colors",
                  draftFilters.partyType === null
                    ? "bg-brand-pink text-primary-black"
                    : "bg-primary-black/5 text-primary-black/70 hover:bg-primary-black/10",
                )}
              >
                Tutti
              </button>
              {PARTY_TYPES.map((type) => (
                <button
                  key={type}
                  type="button"
                  onClick={() => updateFilter("partyType", type)}
                  className={cn(
                    "rounded-full px-3.5 py-2 text-xs font-medium transition-colors",
                    draftFilters.partyType === type
                      ? "bg-brand-pink text-primary-black"
                      : "bg-primary-black/5 text-primary-black/70 hover:bg-primary-black/10",
                  )}
                >
                  {PARTY_TYPE_LABELS[type]}
                </button>
              ))}
            </div>
          </fieldset>

          <fieldset className="space-y-4">
            <legend className="mb-1 text-sm font-semibold text-primary-black">
              Zona geografica
            </legend>

            {/* Opzione 1: Tutto il Piemonte + Torino + Vicino a me */}
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={toggleAllPiemonte}
                className={cn(
                  "rounded-full px-3 py-1.5 text-xs font-medium transition-colors",
                  draftFilters.allPiemonte
                    ? "bg-brand-teal text-white"
                    : "bg-primary-black/5 text-primary-black/70 hover:bg-primary-black/10",
                )}
              >
                Tutto il Piemonte
              </button>
              <button
                type="button"
                onClick={toggleTorino}
                className={cn(
                  "rounded-full px-3 py-1.5 text-xs font-medium transition-colors",
                  torinoActive
                    ? "bg-brand-teal text-white"
                    : "bg-primary-black/5 text-primary-black/70 hover:bg-primary-black/10",
                )}
              >
                Torino
              </button>
              <button
                type="button"
                onClick={toggleNearMe}
                disabled={nearMeLoading}
                className={cn(
                  "rounded-full px-3 py-1.5 text-xs font-medium transition-colors",
                  draftFilters.nearMe
                    ? "bg-brand-teal text-white"
                    : "bg-primary-black/5 text-primary-black/70 hover:bg-primary-black/10",
                  nearMeLoading && "opacity-60",
                )}
              >
                {nearMeLoading ? "Caricamento..." : "Vicino a me"}
              </button>
            </div>
            {nearMeError && (
              <p className="text-xs text-brand-pink">{nearMeError}</p>
            )}
            {draftFilters.nearMe && (
              <p className="text-xs text-brand-teal">
                Location entro 30 km dalla tua posizione
              </p>
            )}

            {/* Opzione 2: Ricerca città */}
            <div
              className={cn(
                "rounded-2xl border p-4 transition-colors duration-150",
                draftFilters.selectedComune
                  ? "border-brand-teal bg-brand-teal/5"
                  : "border-primary-black/10",
                comuneSearchDisabled && "opacity-60",
              )}
            >
              <p className="mb-3 text-sm font-semibold text-primary-black">
                Cerca per comune
              </p>
              <CityAutocomplete
                value={draftFilters.selectedComune}
                onChange={selectComune}
                disabled={comuneSearchDisabled}
              />
              {comuneSearchDisabled && (
                <p className="mt-2 text-xs text-primary-black/50">
                  {draftFilters.nearMe
                    ? "Non disponibile con il filtro Vicino a me attivo"
                    : "Disponibile solo senza il filtro Torino attivo"}
                </p>
              )}
              {draftFilters.selectedComune && (
                <p className="mt-2 text-xs text-brand-teal">
                  Filtro attivo: {draftFilters.selectedComune}
                </p>
              )}
            </div>

            {/* Opzione 3: Area metropolitana Torino */}
            {!draftFilters.allPiemonte &&
              !draftFilters.selectedComune &&
              !draftFilters.nearMe &&
              !torinoActive && (
              <div className="rounded-2xl border border-primary-black/10 p-4">
                <p className="mb-3 text-sm font-semibold text-primary-black">
                  Area metropolitana di Torino
                </p>

                <div className="mb-4 flex rounded-2xl bg-primary-black/[0.04] p-1">
                  {(["torino_citta", "dintorni"] as GeoArea[]).map((area) => (
                    <button
                      key={area}
                      type="button"
                      onClick={() => selectMetroTab(area)}
                      className={cn(
                        "flex-1 rounded-xl py-2.5 text-xs font-semibold transition-colors duration-150",
                        draftFilters.geoArea === area
                          ? "bg-background text-primary-black shadow-sm"
                          : "text-primary-black/50",
                      )}
                    >
                      {GEO_AREA_LABELS[area]}
                    </button>
                  ))}
                </div>

                {showTorinoDistricts && (
                  <div className="flex flex-wrap gap-2">
                    {TORINO_DISTRICTS.map((district) => (
                      <button
                        key={district.value}
                        type="button"
                        onClick={() => toggleDistrict(district.value)}
                        className={cn(
                          "rounded-full px-3.5 py-2 text-xs font-medium transition-colors",
                          draftFilters.district === district.value
                            ? "bg-brand-teal text-white"
                            : "bg-primary-black/5 text-primary-black/70 hover:bg-primary-black/10",
                        )}
                      >
                        {district.label}
                      </button>
                    ))}
                  </div>
                )}

                {metroTab === "dintorni" &&
                  draftFilters.geoArea === "dintorni" && (
                  <div className="flex flex-wrap gap-2">
                    {DINTORNI_ZONES.map((zone) => (
                      <button
                        key={zone.value}
                        type="button"
                        onClick={() => toggleZone(zone.value)}
                        className={cn(
                          "rounded-full px-3.5 py-2 text-xs font-medium transition-colors",
                          draftFilters.zone === zone.value
                            ? "bg-brand-teal text-white"
                            : "bg-primary-black/5 text-primary-black/70 hover:bg-primary-black/10",
                        )}
                      >
                        {zone.label}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </fieldset>

          <fieldset>
            <legend className="mb-3 text-sm font-semibold text-primary-black">
              Budget location
            </legend>
            <PriceRangeInputs
              value={[draftFilters.minHourlyPrice, draftFilters.maxHourlyPrice]}
              onChange={([minHourlyPrice, maxHourlyPrice]) =>
                setDraftFilters((current) => ({
                  ...current,
                  minHourlyPrice,
                  maxHourlyPrice,
                }))
              }
            />
          </fieldset>

          <fieldset>
            <legend className="mb-3 text-sm font-semibold text-primary-black">
              Numero persone
            </legend>
            <GuestCountStepper
              value={draftFilters.guestCount}
              onChange={(guestCount) =>
                updateFilter("guestCount", guestCount)
              }
            />
            <p className="mt-2 text-xs text-primary-black/50">
              Mostra location con capienza da{" "}
              {draftFilters.guestCount >= EXPLORE_GUEST_MAX
                ? `${EXPLORE_GUEST_MAX}+`
                : draftFilters.guestCount}{" "}
              ospiti
            </p>
          </fieldset>

          <fieldset>
            <legend className="mb-3 text-sm font-semibold text-primary-black">
              Dettagli e preferenze
            </legend>
            <textarea
              value={draftFilters.venuePreferences}
              onChange={(event) =>
                updateFilter("venuePreferences", event.target.value)
              }
              rows={4}
              placeholder="Es. spazio all'aperto, possibilità di musica fino a tardi, parcheggio vicino, stile elegante..."
              className="w-full resize-none rounded-2xl border border-primary-black/10 bg-background px-4 py-3 text-sm text-primary-black placeholder:text-primary-black/40 focus:border-brand-teal focus:outline-none focus:ring-2 focus:ring-brand-teal/20"
            />
            <p className="mt-2 text-xs text-primary-black/50">
              Queste note non restringono automaticamente i risultati: servono
              per ricordare le preferenze durante la scelta.
            </p>
          </fieldset>
            </>
          )}
        </div>

        <div className="mt-8 flex gap-3">
          <button
            type="button"
            onClick={() => {
              if (activeCategory === "locali") {
                setDraftFilters(DEFAULT_EXPLORE_FILTERS);
              } else {
                setDraftServiceFilters(DEFAULT_SERVICE_EXPLORE_FILTERS);
                setDraftFilters((current) => ({
                  ...current,
                  dateFrom: null,
                  dateTo: null,
                }));
              }
              setDatePickerOpen(false);
            }}
            className="flex-1 rounded-2xl border border-primary-black/10 py-3 text-sm font-medium text-primary-black/70"
          >
            Reset
          </button>
          <button
            type="button"
            onClick={() => {
              onApply(draftFilters);
              onApplyServiceFilters(draftServiceFilters);
              onClose();
            }}
            className="flex-1 rounded-2xl bg-brand-teal py-3 text-sm font-medium text-white"
          >
            Applica
          </button>
        </div>
      </div>
    </div>
  );
}
