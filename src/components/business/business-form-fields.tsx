"use client";

import {
  SelectField,
  TextAreaField,
  TextField,
} from "@/components/ui/form-fields";
import type { CatalogItem, RateType } from "@/types/business";
import {
  isLocaleCategory,
  isPerformerCategory,
  isShopCategory,
  RATE_TYPE_LABELS,
  type BusinessCategory,
} from "@/types/business";
import { Plus, Trash2 } from "lucide-react";

export interface LocaleFormData {
  businessName: string;
  maxCapacity: string;
  hourlyPrice: string;
  address: string;
}

export interface PerformerFormData {
  businessName: string;
  rateType: RateType;
  rateAmount: string;
  equipmentIncluded: string;
  portfolioLink: string;
}

export interface ShopFormData {
  businessName: string;
  catalog: CatalogItem[];
}

interface LocaleFieldsProps {
  data: LocaleFormData;
  onChange: (data: LocaleFormData) => void;
}

export function LocaleFields({ data, onChange }: LocaleFieldsProps) {
  function update<K extends keyof LocaleFormData>(
    key: K,
    value: LocaleFormData[K],
  ) {
    onChange({ ...data, [key]: value });
  }

  return (
    <div className="space-y-4">
      <TextField
        id="locale-name"
        label="Nome del locale"
        value={data.businessName}
        onChange={(v) => update("businessName", v)}
        placeholder="Es. Villa Aurora"
        required
      />
      <TextField
        id="locale-capacity"
        label="Capacità massima"
        hint="Numero massimo di ospiti"
        type="number"
        min={1}
        value={data.maxCapacity}
        onChange={(v) => update("maxCapacity", v)}
        placeholder="Es. 80"
        required
      />
      <TextField
        id="locale-price"
        label="Prezzo base evento"
        hint="Tariffa indicativa per serata o evento privato"
        type="number"
        min={0}
        step="1"
        value={data.hourlyPrice}
        onChange={(v) => update("hourlyPrice", v)}
        placeholder="Es. 120"
        required
      />
      <TextField
        id="locale-address"
        label="Indirizzo"
        value={data.address}
        onChange={(v) => update("address", v)}
        placeholder="Via, CAP, Città"
        required
      />
    </div>
  );
}

interface PerformerFieldsProps {
  data: PerformerFormData;
  onChange: (data: PerformerFormData) => void;
  categoryLabel: string;
}

export function PerformerFields({
  data,
  onChange,
  categoryLabel,
}: PerformerFieldsProps) {
  function update<K extends keyof PerformerFormData>(
    key: K,
    value: PerformerFormData[K],
  ) {
    onChange({ ...data, [key]: value });
  }

  return (
    <div className="space-y-4">
      <TextField
        id="performer-name"
        label={`Nome / Brand ${categoryLabel}`}
        value={data.businessName}
        onChange={(v) => update("businessName", v)}
        placeholder="Es. DJ Max Sound"
        required
      />

      <div className="grid grid-cols-2 gap-3">
        <SelectField
          id="performer-rate-type"
          label="Tipo tariffa"
          value={data.rateType}
          onChange={(v) => update("rateType", v as RateType)}
          options={Object.entries(RATE_TYPE_LABELS).map(([value, label]) => ({
            value,
            label,
          }))}
          required
        />
        <TextField
          id="performer-rate-amount"
          label="Importo (€)"
          type="number"
          min={0}
          step="1"
          value={data.rateAmount}
          onChange={(v) => update("rateAmount", v)}
          placeholder="Es. 450"
          required
        />
      </div>

      <TextAreaField
        id="performer-equipment"
        label="Attrezzatura inclusa"
        hint="Elenca l'attrezzatura fornita nel servizio"
        value={data.equipmentIncluded}
        onChange={(v) => update("equipmentIncluded", v)}
        placeholder="Es. Console DJ, casse, luci LED, microfono..."
        required
      />

      <TextField
        id="performer-portfolio"
        label="Link al portfolio"
        type="url"
        value={data.portfolioLink}
        onChange={(v) => update("portfolioLink", v)}
        placeholder="https://..."
        required
      />
    </div>
  );
}

interface ShopFieldsProps {
  data: ShopFormData;
  onChange: (data: ShopFormData) => void;
  categoryLabel: string;
}

function createCatalogItem(): CatalogItem {
  return {
    id: crypto.randomUUID(),
    name: "",
    price: 0,
    description: "",
  };
}

export function ShopFields({ data, onChange, categoryLabel }: ShopFieldsProps) {
  function updateCatalog(catalog: CatalogItem[]) {
    onChange({ ...data, catalog });
  }

  function updateItem(id: string, patch: Partial<CatalogItem>) {
    updateCatalog(
      data.catalog.map((item) =>
        item.id === id ? { ...item, ...patch } : item,
      ),
    );
  }

  function removeItem(id: string) {
    updateCatalog(data.catalog.filter((item) => item.id !== id));
  }

  function addItem() {
    updateCatalog([...data.catalog, createCatalogItem()]);
  }

  return (
    <div className="space-y-4">
      <TextField
        id="shop-name"
        label={`Nome ${categoryLabel}`}
        value={data.businessName}
        onChange={(v) => onChange({ ...data, businessName: v })}
        placeholder="Es. Pasticceria Dolce Vita"
        required
      />

      <div>
        <div className="mb-3 flex items-center justify-between">
          <div>
            <p className="text-sm font-semibold text-primary-black">
              Catalogo prodotti / servizi
            </p>
            <p className="text-xs text-primary-black/50">
              Aggiungi le offerte standard del tuo negozio
            </p>
          </div>
          <button
            type="button"
            onClick={addItem}
            className="flex items-center gap-1 rounded-xl bg-brand-teal/15 px-3 py-2 text-xs font-medium text-brand-teal"
          >
            <Plus className="h-3.5 w-3.5" aria-hidden />
            Aggiungi
          </button>
        </div>

        {data.catalog.length === 0 ? (
          <div className="rounded-xl border border-dashed border-primary-black/15 p-6 text-center text-sm text-primary-black/50">
            Nessun prodotto nel catalogo. Clicca &quot;Aggiungi&quot; per
            iniziare.
          </div>
        ) : (
          <ul className="space-y-3">
            {data.catalog.map((item, index) => (
              <li
                key={item.id}
                className="rounded-xl border border-primary-black/10 bg-primary-black/[0.02] p-4"
              >
                <div className="mb-3 flex items-center justify-between">
                  <span className="text-xs font-semibold uppercase tracking-wide text-primary-black/40">
                    Prodotto {index + 1}
                  </span>
                  <button
                    type="button"
                    onClick={() => removeItem(item.id)}
                    className="flex h-7 w-7 items-center justify-center rounded-lg text-primary-black/40 hover:bg-brand-pink/10 hover:text-brand-pink"
                    aria-label="Rimuovi prodotto"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
                <div className="space-y-3">
                  <TextField
                    id={`catalog-name-${item.id}`}
                    label="Nome"
                    value={item.name}
                    onChange={(v) => updateItem(item.id, { name: v })}
                    placeholder="Es. Torta personalizzata"
                    required
                  />
                  <TextField
                    id={`catalog-price-${item.id}`}
                    label="Prezzo (€)"
                    type="number"
                    min={0}
                    step="0.01"
                    value={item.price === 0 ? "" : String(item.price)}
                    onChange={(v) =>
                      updateItem(item.id, { price: Number(v) || 0 })
                    }
                    placeholder="Es. 35"
                    required
                  />
                  <TextAreaField
                    id={`catalog-desc-${item.id}`}
                    label="Descrizione (opzionale)"
                    value={item.description ?? ""}
                    onChange={(v) => updateItem(item.id, { description: v })}
                    placeholder="Breve descrizione del prodotto o servizio"
                    rows={2}
                  />
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

export function getEmptyLocaleForm(): LocaleFormData {
  return { businessName: "", maxCapacity: "", hourlyPrice: "", address: "" };
}

export function getEmptyPerformerForm(): PerformerFormData {
  return {
    businessName: "",
    rateType: "fixed",
    rateAmount: "",
    equipmentIncluded: "",
    portfolioLink: "",
  };
}

export function getEmptyShopForm(): ShopFormData {
  return { businessName: "", catalog: [] };
}

export function categoryUsesPerformerFields(
  category: BusinessCategory,
): boolean {
  return isPerformerCategory(category);
}

export function categoryUsesShopFields(category: BusinessCategory): boolean {
  return isShopCategory(category);
}

export function categoryUsesLocaleFields(category: BusinessCategory): boolean {
  return isLocaleCategory(category);
}
