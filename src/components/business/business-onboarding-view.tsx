"use client";

import {
  categoryUsesLocaleFields,
  categoryUsesPerformerFields,
  categoryUsesShopFields,
  getEmptyLocaleForm,
  getEmptyPerformerForm,
  getEmptyShopForm,
  LocaleFields,
  PerformerFields,
  ShopFields,
  type LocaleFormData,
  type PerformerFormData,
  type ShopFormData,
} from "@/components/business/business-form-fields";
import { SelectField, TextField } from "@/components/ui/form-fields";
import { useAppState } from "@/context/app-state-context";
import {
  BUSINESS_CATEGORY_LABELS,
  isPerformerCategory,
  isShopCategory,
  type BusinessCategory,
  type BusinessProfile,
} from "@/types/business";
import { ArrowLeft, Briefcase, CheckCircle2 } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

const CATEGORIES = Object.entries(BUSINESS_CATEGORY_LABELS) as [
  BusinessCategory,
  string,
][];

interface OwnerFormData {
  ownerName: string;
  email: string;
  phoneNumber: string;
}

function getEmptyOwnerForm(
  defaults?: Partial<OwnerFormData>,
): OwnerFormData {
  return {
    ownerName: defaults?.ownerName ?? "",
    email: defaults?.email ?? "",
    phoneNumber: defaults?.phoneNumber ?? "",
  };
}

function buildProfile(
  category: BusinessCategory,
  locale: LocaleFormData,
  performer: PerformerFormData,
  shop: ShopFormData,
): BusinessProfile | null {
  if (categoryUsesLocaleFields(category)) {
    if (!locale.businessName.trim() || !locale.address.trim()) {
      return null;
    }
    return {
      category: "locale",
      businessName: locale.businessName.trim(),
      address: locale.address.trim(),
      ...(locale.maxCapacity
        ? { maxCapacity: Number(locale.maxCapacity) }
        : {}),
      ...(locale.hourlyPrice
        ? { hourlyPrice: Number(locale.hourlyPrice) }
        : {}),
    };
  }

  if (isPerformerCategory(category)) {
    if (!performer.businessName || !performer.rateAmount) return null;
    return {
      category,
      businessName: performer.businessName,
      rateType: performer.rateType,
      rateAmount: Number(performer.rateAmount),
      equipmentIncluded: performer.equipmentIncluded,
      portfolioLink: performer.portfolioLink,
    };
  }

  if (isShopCategory(category)) {
    if (!shop.businessName || shop.catalog.length === 0) return null;
    const validCatalog = shop.catalog.every(
      (item) => item.name.trim() && item.price > 0,
    );
    if (!validCatalog) return null;
    return {
      category,
      businessName: shop.businessName,
      catalog: shop.catalog,
    };
  }

  return null;
}

function profileToForms(profile: BusinessProfile) {
  if (profile.category === "locale") {
    return {
      category: "locale" as BusinessCategory,
      locale: {
        businessName: profile.businessName,
        maxCapacity:
          typeof profile.maxCapacity === "number"
            ? String(profile.maxCapacity)
            : "",
        hourlyPrice:
          typeof profile.hourlyPrice === "number"
            ? String(profile.hourlyPrice)
            : "",
        address: profile.address,
      },
      performer: getEmptyPerformerForm(),
      shop: getEmptyShopForm(),
    };
  }

  if (profile.category === "dj" || profile.category === "fotografo") {
    return {
      category: profile.category,
      locale: getEmptyLocaleForm(),
      performer: {
        businessName: profile.businessName,
        rateType: profile.rateType,
        rateAmount: String(profile.rateAmount),
        equipmentIncluded: profile.equipmentIncluded,
        portfolioLink: profile.portfolioLink,
      },
      shop: getEmptyShopForm(),
    };
  }

  if (profile.category === "pasticceria" || profile.category === "decorazioni") {
    return {
      category: profile.category,
      locale: getEmptyLocaleForm(),
      performer: getEmptyPerformerForm(),
      shop: {
        businessName: profile.businessName,
        catalog: profile.catalog,
      },
    };
  }

  return {
    category: "locale" as BusinessCategory,
    locale: getEmptyLocaleForm(),
    performer: getEmptyPerformerForm(),
    shop: getEmptyShopForm(),
  };
}

function isValidEmail(value: string) {
  return value.includes("@") && value.includes(".");
}

export function BusinessOnboardingView() {
  const router = useRouter();
  const {
    accounts,
    businessProfile,
    currentUser,
    isBusinessUser,
    createBusinessAccount,
    saveBusinessProfile,
    updateCurrentUser,
  } = useAppState();

  const editingExisting = isBusinessUser && Boolean(businessProfile);

  const initial = editingExisting && businessProfile
    ? profileToForms(businessProfile)
    : {
        category: "locale" as BusinessCategory | "",
        locale: getEmptyLocaleForm(),
        performer: getEmptyPerformerForm(),
        shop: getEmptyShopForm(),
      };

  const [category, setCategory] = useState<BusinessCategory | "">(
    initial.category || "locale",
  );
  const [ownerData, setOwnerData] = useState<OwnerFormData>(() =>
    editingExisting
      ? getEmptyOwnerForm({
          ownerName: currentUser.name !== "Ospite" ? currentUser.name : "",
          email: currentUser.email,
          phoneNumber: currentUser.phoneNumber ?? "",
        })
      : getEmptyOwnerForm(),
  );
  const [localeData, setLocaleData] = useState<LocaleFormData>(initial.locale);
  const [performerData, setPerformerData] =
    useState<PerformerFormData>(initial.performer);
  const [shopData, setShopData] = useState<ShopFormData>(initial.shop);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isLocale = category === "locale";

  function handleCategoryChange(value: string) {
    const next = value as BusinessCategory;
    setCategory(next);
    setSuccess(false);
    setError(null);
  }

  function updateOwner<K extends keyof OwnerFormData>(
    key: K,
    value: OwnerFormData[K],
  ) {
    setOwnerData((current) => ({ ...current, [key]: value }));
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!category) return;

    const ownerName = ownerData.ownerName.trim();
    const email = ownerData.email.trim().toLowerCase();
    const phoneNumber = ownerData.phoneNumber.trim();

    if (!ownerName || !email) {
      setError("Inserisci nome proprietario ed email.");
      return;
    }
    if (!phoneNumber) {
      setError("Inserisci un contatto telefonico.");
      return;
    }
    if (!isValidEmail(email)) {
      setError("Inserisci un'email valida.");
      return;
    }

    const profile = buildProfile(
      category,
      localeData,
      performerData,
      shopData,
    );

    if (!profile) {
      setError(
        isLocale
          ? "Inserisci nome e indirizzo della location."
          : "Compila tutti i campi obbligatori della categoria.",
      );
      return;
    }

    if (editingExisting) {
      updateCurrentUser({
        name: ownerName,
        email,
        phoneNumber,
      });
      saveBusinessProfile(profile);
      setSuccess(true);
      setTimeout(() => {
        router.push("/?tab=notifications");
      }, 1400);
      return;
    }

    // Creating Pro must always make a NEW account — never convert the current one.
    const sameIdentity = accounts.some(
      (account) =>
        account.email.toLowerCase() === email &&
        account.name.trim().toLowerCase() === ownerName.toLowerCase(),
    );

    if (sameIdentity) {
      setError(
        "Non puoi trasformare un account normale in Business. Usa una email nuova oppure un nome diverso.",
      );
      return;
    }

    const result = createBusinessAccount({
      ownerName,
      email,
      phoneNumber,
      businessProfile: profile,
    });

    if (!result.ok) {
      setError(result.error);
      return;
    }

    setSuccess(true);
    setTimeout(() => {
      router.push("/?tab=notifications");
    }, 1400);
  }

  return (
    <div className="space-y-6 pb-8">
      <Link
        href="/?tab=profile"
        className="inline-flex items-center gap-1.5 text-sm font-medium text-primary-black/60 transition-colors hover:text-primary-black"
      >
        <ArrowLeft className="h-4 w-4" aria-hidden />
        Torna al Profilo
      </Link>

      <header>
        <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-400/25 px-3 py-1 text-xs font-semibold text-amber-700">
          <Briefcase className="h-3.5 w-3.5" aria-hidden />
          Account Pro
        </span>
        <h1 className="mt-3 text-2xl font-bold text-primary-black">
          {editingExisting ? "Modifica account Business" : "Passa a Business"}
        </h1>
        <p className="mt-2 text-sm text-primary-black/60">
          {editingExisting
            ? "Aggiorna i dati della tua attività Pro."
            : isLocale
              ? "Crea un account Pro separato per la location: email nuova oppure un nome diverso rispetto agli account già presenti."
              : "Crea un account Pro separato per la tua attività: email nuova oppure un nome diverso rispetto agli account già presenti."}
        </p>
      </header>

      {success ? (
        <div className="rounded-2xl border border-brand-teal/20 bg-brand-teal/5 p-8 text-center">
          <CheckCircle2
            className="mx-auto h-12 w-12 text-brand-teal"
            aria-hidden
          />
          <p className="mt-4 font-semibold text-primary-black">
            {editingExisting
              ? "Profilo Business aggiornato!"
              : "Account Pro creato!"}
          </p>
          <p className="mt-1 text-sm text-primary-black/60">
            Apertura dello spazio Business...
          </p>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-6">
          <SelectField
            id="business-category"
            label="Categoria"
            hint="Seleziona il tipo di attività"
            value={category}
            onChange={handleCategoryChange}
            options={[
              { value: "", label: "Seleziona una categoria..." },
              ...CATEGORIES.map(([value, label]) => ({ value, label })),
            ]}
            required
          />

          {category && (
            <section className="rounded-2xl border border-primary-black/10 bg-background p-5">
              <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-primary-black/50">
                Dati proprietario
              </h2>
              <div className="space-y-4">
                {!editingExisting && (
                  <p className="rounded-xl bg-amber-400/10 px-3 py-2 text-xs text-amber-900">
                    L&apos;account Pro è separato da quello normale: inserisci
                    una email nuova oppure un nome diverso.
                  </p>
                )}
                <TextField
                  id="owner-name"
                  label="Nome del proprietario"
                  value={ownerData.ownerName}
                  onChange={(v) => updateOwner("ownerName", v)}
                  placeholder="Es. Marco Rossi"
                  required
                />
                <TextField
                  id="owner-email"
                  label="Email"
                  type="email"
                  value={ownerData.email}
                  onChange={(v) => updateOwner("email", v)}
                  placeholder="es. location@email.com"
                  required
                />
                <TextField
                  id="owner-phone"
                  label="Contatto telefonico"
                  type="tel"
                  value={ownerData.phoneNumber}
                  onChange={(v) => updateOwner("phoneNumber", v)}
                  placeholder="Es. +39 333 1234567"
                  required
                />
              </div>
            </section>
          )}

          {category && categoryUsesLocaleFields(category) && (
            <section className="rounded-2xl border border-primary-black/10 bg-background p-5">
              <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-primary-black/50">
                Dettagli Location
              </h2>
              <LocaleFields
                data={localeData}
                onChange={setLocaleData}
                simplified
              />
            </section>
          )}

          {category && categoryUsesPerformerFields(category) && (
            <section className="rounded-2xl border border-primary-black/10 bg-background p-5">
              <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-primary-black/50">
                Dettagli {BUSINESS_CATEGORY_LABELS[category]}
              </h2>
              <PerformerFields
                data={performerData}
                onChange={setPerformerData}
                categoryLabel={BUSINESS_CATEGORY_LABELS[category]}
              />
            </section>
          )}

          {category && categoryUsesShopFields(category) && (
            <section className="rounded-2xl border border-primary-black/10 bg-background p-5">
              <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-primary-black/50">
                Dettagli {BUSINESS_CATEGORY_LABELS[category]}
              </h2>
              <ShopFields
                data={shopData}
                onChange={setShopData}
                categoryLabel={BUSINESS_CATEGORY_LABELS[category]}
              />
            </section>
          )}

          {error && (
            <p className="rounded-2xl border border-brand-pink/30 bg-brand-pink/10 px-4 py-3 text-sm text-primary-black">
              {error}
            </p>
          )}

          {category && (
            <button
              type="submit"
              className="w-full rounded-2xl bg-brand-teal py-4 text-sm font-semibold text-white transition-colors hover:bg-brand-teal/90"
            >
              {editingExisting ? "Salva profilo Business" : "Crea account Pro"}
            </button>
          )}
        </form>
      )}
    </div>
  );
}
