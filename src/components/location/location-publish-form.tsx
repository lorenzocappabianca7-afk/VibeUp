"use client";

import { SafeImage } from "@/components/ui/safe-image";
import {
  EMPTY_AVAILABLE_SERVICE_ROW,
  type LocationPublishFormData,
} from "@/lib/location-publish-form";
import { uploadListingPhotos } from "@/lib/storage/upload-client";
import {
  DISTRICT_LABELS,
  GEO_AREA_LABELS,
  PARTY_TYPE_LABELS,
  ZONE_LABELS,
  type DintorniZone,
  type GeoArea,
  type PartyType,
  type TorinoDistrict,
} from "@/types/location";
import { Plus, Trash2, UploadCloud, X } from "lucide-react";
import { useState } from "react";

function FieldLabel({
  children,
  hint,
}: {
  children: React.ReactNode;
  hint?: string;
}) {
  return (
    <div className="mb-1.5">
      <p className="text-xs font-bold uppercase tracking-wide text-primary-black/50">
        {children}
      </p>
      {hint ? (
        <p className="mt-0.5 text-[11px] text-primary-black/45">{hint}</p>
      ) : null}
    </div>
  );
}

function TextInput({
  label,
  hint,
  value,
  onChange,
  type = "text",
  placeholder,
  min,
  step,
}: {
  label: string;
  hint?: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
  placeholder?: string;
  min?: number;
  step?: string;
}) {
  return (
    <label className="block min-w-0">
      <FieldLabel hint={hint}>{label}</FieldLabel>
      <input
        type={type}
        value={value}
        min={min}
        step={step}
        placeholder={placeholder}
        onChange={(event) => onChange(event.target.value)}
        className="w-full min-w-0 rounded-2xl border border-primary-black/10 bg-background px-4 py-3 text-sm outline-none focus:border-brand-teal"
      />
    </label>
  );
}

function ToggleChip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-full px-3 py-1.5 text-xs font-bold transition-colors ${
        active
          ? "bg-brand-teal text-ink-inverse"
          : "bg-primary-black/5 text-primary-black/65 hover:bg-primary-black/10"
      }`}
    >
      {children}
    </button>
  );
}

interface LocationPublishFormProps {
  value: LocationPublishFormData;
  onChange: (next: LocationPublishFormData) => void;
  idPrefix?: string;
}

export function LocationPublishForm({
  value,
  onChange,
  idPrefix = "location-publish",
}: LocationPublishFormProps) {
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);

  function patch(partial: Partial<LocationPublishFormData>) {
    onChange({ ...value, ...partial });
  }

  function togglePartyType(type: PartyType) {
    const next = value.partyTypes.includes(type)
      ? value.partyTypes.filter((item) => item !== type)
      : [...value.partyTypes, type];
    patch({ partyTypes: next });
  }

  async function addPhotos(files?: FileList | null) {
    setUploadError(null);
    setUploading(true);
    const result = await uploadListingPhotos(files, {
      folder: `drafts/${idPrefix}`,
    });
    setUploading(false);
    if (!result.ok) {
      setUploadError(result.error);
      return;
    }
    patch({
      galleryImageUrls: [...value.galleryImageUrls, ...result.urls],
      imageUrl: value.imageUrl || result.urls[0] || "",
    });
  }

  function removePhoto(index: number) {
    patch({
      galleryImageUrls: value.galleryImageUrls.filter(
        (_, itemIndex) => itemIndex !== index,
      ),
    });
  }

  function updateService(
    index: number,
    partial: Partial<LocationPublishFormData["availableServices"][number]>,
  ) {
    patch({
      availableServices: value.availableServices.map((row, rowIndex) =>
        rowIndex === index ? { ...row, ...partial } : row,
      ),
    });
  }

  return (
    <div className="space-y-5">
      <section className="space-y-3">
        <h3 className="text-sm font-black text-primary-black">Identità</h3>
        <TextInput
          label="Nome"
          value={value.name}
          onChange={(name) => patch({ name })}
          placeholder="Es. Villa Aurora"
        />
        <TextInput
          label="Indirizzo"
          value={value.address}
          onChange={(address) => patch({ address })}
          placeholder="Via, CAP, Città"
        />
        <TextInput
          label="Città"
          value={value.city}
          onChange={(city) => patch({ city })}
          placeholder="Torino"
        />

        <div>
          <FieldLabel>Area geografica</FieldLabel>
          <div className="flex flex-wrap gap-2">
            {(Object.keys(GEO_AREA_LABELS) as GeoArea[]).map((area) => (
              <ToggleChip
                key={area}
                active={value.geoArea === area}
                onClick={() =>
                  patch({
                    geoArea: area,
                    district: area === "torino_citta" ? value.district || "centro" : "",
                    zone: area === "dintorni" ? value.zone || "moncalieri" : "",
                  })
                }
              >
                {GEO_AREA_LABELS[area]}
              </ToggleChip>
            ))}
          </div>
        </div>

        {value.geoArea === "torino_citta" ? (
          <div>
            <FieldLabel>Zona Torino</FieldLabel>
            <div className="flex flex-wrap gap-2">
              {(Object.keys(DISTRICT_LABELS) as TorinoDistrict[]).map(
                (district) => (
                  <ToggleChip
                    key={district}
                    active={value.district === district}
                    onClick={() => patch({ district })}
                  >
                    {DISTRICT_LABELS[district]}
                  </ToggleChip>
                ),
              )}
            </div>
          </div>
        ) : (
          <div>
            <FieldLabel>Zona dintorni</FieldLabel>
            <div className="flex flex-wrap gap-2">
              {(Object.keys(ZONE_LABELS) as DintorniZone[]).map((zone) => (
                <ToggleChip
                  key={zone}
                  active={value.zone === zone}
                  onClick={() => patch({ zone })}
                >
                  {ZONE_LABELS[zone]}
                </ToggleChip>
              ))}
            </div>
          </div>
        )}

        <div>
          <FieldLabel hint="Come nella scheda location: chip tipi festa">
            Tipo di festa ospitata
          </FieldLabel>
          <div className="flex flex-wrap gap-2">
            {(Object.keys(PARTY_TYPE_LABELS) as PartyType[]).map((type) => (
              <ToggleChip
                key={type}
                active={value.partyTypes.includes(type)}
                onClick={() => togglePartyType(type)}
              >
                {PARTY_TYPE_LABELS[type]}
              </ToggleChip>
            ))}
          </div>
        </div>

        <label className="block min-w-0">
          <FieldLabel>Descrizione</FieldLabel>
          <textarea
            value={value.description}
            onChange={(event) => patch({ description: event.target.value })}
            rows={4}
            placeholder="Descrivi atmosfera, spazi e cosa rende speciale il locale..."
            className="w-full min-w-0 rounded-2xl border border-primary-black/10 bg-background px-4 py-3 text-sm outline-none focus:border-brand-teal"
          />
        </label>
      </section>

      <section className="space-y-3 rounded-3xl border border-primary-black/10 bg-primary-black/[0.02] p-4">
        <div>
          <h3 className="text-sm font-black text-primary-black">
            Dettagli tecnici
          </h3>
          <p className="mt-1 text-xs text-primary-black/55">
            Compariranno nella scheda sotto «Dettagli tecnici».
          </p>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <TextInput
            label="Capienza max"
            type="number"
            min={1}
            value={value.capacity}
            onChange={(capacity) => patch({ capacity })}
          />
          <TextInput
            label="Superficie (m²)"
            type="number"
            min={0}
            value={value.surfaceSqm}
            onChange={(surfaceSqm) => patch({ surfaceSqm })}
          />
          <TextInput
            label="Posti parcheggio"
            type="number"
            min={0}
            value={value.parkingSpots}
            onChange={(parkingSpots) => patch({ parkingSpots })}
          />
          <TextInput
            label="Durata minima (ore)"
            type="number"
            min={1}
            value={value.minHours}
            onChange={(minHours) => patch({ minHours })}
          />
        </div>
        <div className="flex flex-wrap gap-2">
          <ToggleChip
            active={value.accessibility}
            onClick={() => patch({ accessibility: !value.accessibility })}
          >
            Accessibilità
          </ToggleChip>
          <ToggleChip
            active={value.airConditioning}
            onClick={() => patch({ airConditioning: !value.airConditioning })}
          >
            Aria condizionata
          </ToggleChip>
          <ToggleChip
            active={value.outdoorArea}
            onClick={() => patch({ outdoorArea: !value.outdoorArea })}
          >
            Area esterna
          </ToggleChip>
        </div>
      </section>

      <section className="space-y-3">
        <h3 className="text-sm font-black text-primary-black">Servizi</h3>
        <TextInput
          label="Servizi inclusi nel prezzo"
          hint="Separati da virgola"
          value={value.includedServices}
          onChange={(includedServices) => patch({ includedServices })}
          placeholder="Wi-Fi, Aria condizionata, Personale di sala"
        />

        <div className="space-y-3 rounded-3xl border border-primary-black/10 bg-primary-black/[0.02] p-4">
          <div className="flex items-center justify-between gap-2">
            <div>
              <h4 className="text-sm font-bold text-primary-black">
                Servizi disponibili
              </h4>
              <p className="mt-0.5 text-[11px] text-primary-black/50">
                Menu, bar e add-on selezionabili nel preventivo.
              </p>
            </div>
            <button
              type="button"
              onClick={() =>
                patch({
                  availableServices: [
                    ...value.availableServices,
                    EMPTY_AVAILABLE_SERVICE_ROW(),
                  ],
                })
              }
              className="inline-flex items-center gap-1 rounded-full bg-brand-teal/15 px-3 py-1.5 text-xs font-bold text-brand-teal"
            >
              <Plus className="h-3.5 w-3.5" aria-hidden />
              Aggiungi
            </button>
          </div>

          {value.availableServices.map((row, index) => (
            <div
              key={`${idPrefix}-service-${index}`}
              className="space-y-2 rounded-2xl border border-primary-black/10 bg-background p-3"
            >
              <div className="flex items-start gap-2">
                <input
                  value={row.name}
                  onChange={(event) =>
                    updateService(index, { name: event.target.value })
                  }
                  placeholder="Nome servizio"
                  className="min-w-0 flex-1 rounded-xl border border-primary-black/10 bg-background px-3 py-2 text-sm outline-none focus:border-brand-teal"
                />
                <button
                  type="button"
                  onClick={() =>
                    patch({
                      availableServices: value.availableServices.filter(
                        (_, rowIndex) => rowIndex !== index,
                      ),
                    })
                  }
                  className="rounded-xl p-2 text-primary-black/45 hover:bg-primary-black/5 hover:text-brand-pink"
                  aria-label="Rimuovi servizio"
                >
                  <Trash2 className="h-4 w-4" aria-hidden />
                </button>
              </div>
              <div className="grid gap-2 sm:grid-cols-2">
                <select
                  value={row.pricingType}
                  onChange={(event) =>
                    updateService(index, {
                      pricingType: event.target.value as
                        | "included"
                        | "fixed"
                        | "per_person",
                    })
                  }
                  className="rounded-xl border border-primary-black/10 bg-background px-3 py-2 text-sm outline-none focus:border-brand-teal"
                >
                  <option value="included">Incluso</option>
                  <option value="fixed">Prezzo fisso</option>
                  <option value="per_person">A persona</option>
                </select>
                <input
                  type="number"
                  min={0}
                  value={row.price}
                  disabled={row.pricingType === "included"}
                  onChange={(event) =>
                    updateService(index, { price: event.target.value })
                  }
                  placeholder="Importo €"
                  className="rounded-xl border border-primary-black/10 bg-background px-3 py-2 text-sm outline-none focus:border-brand-teal disabled:opacity-40"
                />
              </div>
              <input
                value={row.description}
                onChange={(event) =>
                  updateService(index, { description: event.target.value })
                }
                placeholder="Descrizione opzionale"
                className="w-full rounded-xl border border-primary-black/10 bg-background px-3 py-2 text-sm outline-none focus:border-brand-teal"
              />
            </div>
          ))}
        </div>
      </section>

      <section className="space-y-3 rounded-3xl border border-primary-black/10 bg-primary-black/[0.02] p-4">
        <div>
          <h3 className="text-sm font-black text-primary-black">
            Costo bevande e open bar
          </h3>
          <p className="mt-1 text-xs text-primary-black/55">
            Usati nel preventivo istantaneo (drink a invitato / open bar).
          </p>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <TextInput
            label="Prezzo per drink (€)"
            type="number"
            min={0}
            step="1"
            value={value.drinkUnitPrice}
            onChange={(drinkUnitPrice) => patch({ drinkUnitPrice })}
          />
          <TextInput
            label="Open bar a persona (€)"
            type="number"
            min={0}
            step="1"
            value={value.openBarPerInvitee}
            onChange={(openBarPerInvitee) => patch({ openBarPerInvitee })}
          />
        </div>
      </section>

      <section className="space-y-3 rounded-3xl border border-brand-teal/25 bg-brand-teal/5 p-4">
        <div>
          <h3 className="text-sm font-black text-primary-black">
            Prezzo per preventivo e anteprima
          </h3>
          <p className="mt-1 text-xs text-primary-black/55">
            Scegli tariffa a serata o a persona: sarà quella mostrata in Esplora
            e usata nel calcolo del preventivo.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <ToggleChip
            active={value.priceModel === "event"}
            onClick={() => patch({ priceModel: "event" })}
          >
            Prezzo a serata
          </ToggleChip>
          <ToggleChip
            active={value.priceModel === "person"}
            onClick={() => patch({ priceModel: "person" })}
          >
            Prezzo a persona
          </ToggleChip>
        </div>
        <TextInput
          label={
            value.priceModel === "person"
              ? "Prezzo a persona (€)"
              : "Prezzo a serata (€)"
          }
          type="number"
          min={0}
          step="1"
          value={value.listPrice}
          onChange={(listPrice) => patch({ listPrice })}
          placeholder={value.priceModel === "person" ? "Es. 35" : "Es. 450"}
        />
      </section>

      <section className="space-y-3">
        <div>
          <h3 className="text-sm font-black text-primary-black">Foto</h3>
          <p className="mt-1 text-xs text-primary-black/55">
            La prima immagine è la copertina; le altre vanno in gallery.
          </p>
        </div>
        <TextInput
          label="URL foto (opzionale)"
          value={value.imageUrl}
          onChange={(imageUrl) => patch({ imageUrl })}
          placeholder="https://..."
        />
        <label className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-3xl border border-dashed border-primary-black/15 bg-primary-black/[0.02] px-4 py-6 text-center">
          <UploadCloud className="h-5 w-5 text-brand-teal" aria-hidden />
          <span className="text-sm font-bold text-primary-black">
            {uploading ? "Caricamento su cloud…" : "Carica foto"}
          </span>
          <span className="text-xs text-primary-black/50">
            JPG, PNG, WebP — max 5 MB — salvate su Supabase Storage
          </span>
          <input
            type="file"
            accept="image/jpeg,image/png,image/webp,image/gif"
            multiple
            disabled={uploading}
            className="sr-only"
            onChange={(event) => {
              void addPhotos(event.target.files);
              event.target.value = "";
            }}
          />
        </label>
        {uploadError && (
          <p className="text-xs font-semibold text-brand-pink">{uploadError}</p>
        )}
        {value.galleryImageUrls.length > 0 && (
          <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
            {value.galleryImageUrls.map((src, index) => (
              <div
                key={`${idPrefix}-photo-${index}`}
                className="relative aspect-square overflow-hidden rounded-2xl bg-primary-black/5"
              >
                <SafeImage
                  src={src}
                  alt={`Foto ${index + 1}`}
                  fill
                  className="object-cover"
                />
                <button
                  type="button"
                  onClick={() => removePhoto(index)}
                  className="absolute right-1.5 top-1.5 rounded-full bg-black/70 p-1 text-white"
                  aria-label="Rimuovi foto"
                >
                  <X className="h-3.5 w-3.5" aria-hidden />
                </button>
                {index === 0 && (
                  <span className="absolute bottom-1.5 left-1.5 rounded-full bg-brand-teal px-2 py-0.5 text-[10px] font-bold text-ink-inverse">
                    Copertina
                  </span>
                )}
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
