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
import { SelectField } from "@/components/ui/form-fields";
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

function buildProfile(
  category: BusinessCategory,
  locale: LocaleFormData,
  performer: PerformerFormData,
  shop: ShopFormData,
): BusinessProfile | null {
  if (categoryUsesLocaleFields(category)) {
    if (!locale.businessName || !locale.maxCapacity || !locale.hourlyPrice) {
      return null;
    }
    return {
      category: "locale",
      businessName: locale.businessName,
      maxCapacity: Number(locale.maxCapacity),
      hourlyPrice: Number(locale.hourlyPrice),
      address: locale.address,
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
        maxCapacity: String(profile.maxCapacity),
        hourlyPrice: String(profile.hourlyPrice),
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
    category: "dj" as BusinessCategory,
    locale: getEmptyLocaleForm(),
    performer: getEmptyPerformerForm(),
    shop: getEmptyShopForm(),
  };
}

export function BusinessOnboardingView() {
  const router = useRouter();
  const { businessProfile, saveBusinessProfile } = useAppState();

  const initial = businessProfile
    ? profileToForms(businessProfile)
    : {
        category: "" as BusinessCategory | "",
        locale: getEmptyLocaleForm(),
        performer: getEmptyPerformerForm(),
        shop: getEmptyShopForm(),
      };

  const [category, setCategory] = useState<BusinessCategory | "">(
    initial.category,
  );
  const [localeData, setLocaleData] = useState<LocaleFormData>(initial.locale);
  const [performerData, setPerformerData] =
    useState<PerformerFormData>(initial.performer);
  const [shopData, setShopData] = useState<ShopFormData>(initial.shop);
  const [success, setSuccess] = useState(false);

  function handleCategoryChange(value: string) {
    const next = value as BusinessCategory;
    setCategory(next);
    setSuccess(false);
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!category) return;

    const profile = buildProfile(
      category,
      localeData,
      performerData,
      shopData,
    );

    if (!profile) return;

    saveBusinessProfile(profile);
    setSuccess(true);
    setTimeout(() => {
      router.push("/?tab=profile");
    }, 1800);
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
        <span className="inline-flex items-center gap-1.5 rounded-full bg-brand-teal/15 px-3 py-1 text-xs font-medium text-brand-teal">
          <Briefcase className="h-3.5 w-3.5" aria-hidden />
          Account Business
        </span>
        <h1 className="mt-3 text-2xl font-bold text-primary-black">
          Registrazione Business
        </h1>
        <p className="mt-2 text-sm text-primary-black/60">
          Scegli la tua categoria e compila i dettagli per comparire su VibeUp.
          I dati vengono salvati temporaneamente nell&apos;app.
        </p>
      </header>

      {success ? (
        <div className="rounded-2xl border border-brand-teal/20 bg-brand-teal/5 p-8 text-center">
          <CheckCircle2
            className="mx-auto h-12 w-12 text-brand-teal"
            aria-hidden
          />
          <p className="mt-4 font-semibold text-primary-black">
            Profilo Business salvato!
          </p>
          <p className="mt-1 text-sm text-primary-black/60">
            Reindirizzamento al profilo...
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

          {category && categoryUsesLocaleFields(category) && (
            <section className="rounded-2xl border border-primary-black/10 bg-background p-5">
              <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-primary-black/50">
                Dettagli Locale
              </h2>
              <LocaleFields data={localeData} onChange={setLocaleData} />
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

          {category && (
            <button
              type="submit"
              className="w-full rounded-2xl bg-brand-teal py-4 text-sm font-semibold text-white transition-colors hover:bg-brand-teal/90"
            >
              Salva profilo Business
            </button>
          )}
        </form>
      )}
    </div>
  );
}
