"use client";

import {
  categoryUsesLocaleFields,
  categoryUsesPerformerFields,
  categoryUsesShopFields,
  getEmptyLocaleForm,
  getEmptyPerformerForm,
  getEmptyShopForm,
  PerformerFields,
  ShopFields,
  type LocaleFormData,
  type PerformerFormData,
  type ShopFormData,
} from "@/components/business/business-form-fields";
import { LocationPublishForm } from "@/components/location/location-publish-form";
import { SelectField, TextField } from "@/components/ui/form-fields";
import { useAppState } from "@/context/app-state-context";
import { requestActivationEmail } from "@/lib/auth/request-activation-email";
import {
  buildManagedLocationListing,
  EMPTY_LOCATION_PUBLISH_FORM,
  validateLocationPublishForm,
  type LocationPublishFormData,
} from "@/lib/location-publish-form";
import {
  BUSINESS_CATEGORY_LABELS,
  isPerformerCategory,
  isShopCategory,
  type BusinessCategory,
  type BusinessProfile,
} from "@/types/business";
import { HomeTabLink } from "@/components/navigation/home-tab-link";
import { assignHomeHref } from "@/lib/home-navigation";
import { ArrowLeft, Briefcase, CheckCircle2 } from "lucide-react";
import { useEffect, useRef, useState } from "react";

const CATEGORIES = Object.entries(BUSINESS_CATEGORY_LABELS) as [
  BusinessCategory,
  string,
][];

interface OwnerFormData {
  ownerName: string;
  email: string;
  phoneNumber: string;
  password: string;
  confirmPassword: string;
}

function getEmptyOwnerForm(
  defaults?: Partial<OwnerFormData>,
): OwnerFormData {
  return {
    ownerName: defaults?.ownerName ?? "",
    email: defaults?.email ?? "",
    phoneNumber: defaults?.phoneNumber ?? "",
    password: defaults?.password ?? "",
    confirmPassword: defaults?.confirmPassword ?? "",
  };
}

function buildProfile(
  category: BusinessCategory,
  locale: LocaleFormData,
  performer: PerformerFormData,
  shop: ShopFormData,
  locationListing?: LocationPublishFormData,
): BusinessProfile | null {
  if (categoryUsesLocaleFields(category)) {
    const name =
      locationListing?.name.trim() || locale.businessName.trim();
    const address =
      locationListing?.address.trim() || locale.address.trim();
    if (!name || !address) {
      return null;
    }
    const capacity = Number(locationListing?.capacity || locale.maxCapacity);
    const listPrice = Number(locationListing?.listPrice || locale.hourlyPrice);
    return {
      category: "locale",
      businessName: name,
      address,
      ...(Number.isFinite(capacity) && capacity > 0
        ? { maxCapacity: capacity }
        : {}),
      ...(Number.isFinite(listPrice) && listPrice >= 0
        ? { hourlyPrice: listPrice }
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
  const navigateTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const {
    accounts,
    businessProfile,
    currentUser,
    isBusinessUser,
    createBusinessAccount,
    saveBusinessProfile,
    updateCurrentUser,
    upsertManagedListing,
  } = useAppState();

  useEffect(() => {
    return () => {
      if (navigateTimerRef.current != null) {
        clearTimeout(navigateTimerRef.current);
      }
    };
  }, []);

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
  const [locationListing, setLocationListing] = useState<LocationPublishFormData>(
    () => {
      const empty = EMPTY_LOCATION_PUBLISH_FORM();
      if (initial.locale.businessName || initial.locale.address) {
        return {
          ...empty,
          name: initial.locale.businessName,
          address: initial.locale.address,
          capacity: initial.locale.maxCapacity || empty.capacity,
          listPrice: initial.locale.hourlyPrice || empty.listPrice,
        };
      }
      return empty;
    },
  );
  const [performerData, setPerformerData] =
    useState<PerformerFormData>(initial.performer);
  const [shopData, setShopData] = useState<ShopFormData>(initial.shop);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

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
    if (submitting || success) return;
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

    if (!editingExisting) {
      if (ownerData.password.length < 8) {
        setError("La password deve avere almeno 8 caratteri.");
        return;
      }
      if (
        !/[A-Za-z]/.test(ownerData.password) ||
        !/[0-9]/.test(ownerData.password)
      ) {
        setError("La password deve contenere almeno una lettera e un numero.");
        return;
      }
      if (ownerData.password !== ownerData.confirmPassword) {
        setError("Le password non coincidono.");
        return;
      }
    }

    if (isLocale) {
      const listingError = validateLocationPublishForm(locationListing);
      if (listingError) {
        setError(listingError);
        return;
      }
    }

    const profile = buildProfile(
      category,
      localeData,
      performerData,
      shopData,
      isLocale ? locationListing : undefined,
    );

    if (!profile) {
      setError(
        isLocale
          ? "Completa la configurazione della location."
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
      if (isLocale) {
        upsertManagedListing(
          buildManagedLocationListing({
            form: locationListing,
            status: "pending_review",
            source: "business",
            submitterEmail: email,
          }),
        );
      }
      setSuccess(true);
      if (navigateTimerRef.current != null) {
        clearTimeout(navigateTimerRef.current);
      }
      navigateTimerRef.current = setTimeout(() => {
        navigateTimerRef.current = null;
        assignHomeHref("/?tab=notifications");
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

    const emailTaken = accounts.some(
      (account) => account.email.toLowerCase() === email,
    );
    if (emailTaken) {
      setError(
        "Esiste già un account con questa email. Per Pro usa un’email diversa.",
      );
      return;
    }

    setSubmitting(true);
    void (async () => {
      const result = await createBusinessAccount({
        ownerName,
        email,
        phoneNumber,
        password: ownerData.password,
        businessProfile: profile,
      });

      if (!result.ok) {
        setError(result.error);
        setSubmitting(false);
        return;
      }

      if (isLocale) {
        upsertManagedListing(
          buildManagedLocationListing({
            form: locationListing,
            status: "pending_review",
            source: "business",
            submitterEmail: email,
          }),
        );
      }

      if (
        result.needsEmailActivation &&
        result.activationToken &&
        result.email
      ) {
        await requestActivationEmail({
          email: result.email,
          name: result.name ?? ownerName,
          token: result.activationToken,
        });
      }

    setSuccess(true);
      if (navigateTimerRef.current != null) {
        clearTimeout(navigateTimerRef.current);
      }
      navigateTimerRef.current = setTimeout(() => {
        navigateTimerRef.current = null;
        assignHomeHref("/?tab=notifications");
      }, 1400);
    })();
  }

  return (
    <div className="space-y-6 pb-8">
      <HomeTabLink
        tab="profile"
        className="inline-flex items-center gap-1.5 text-sm font-medium text-primary-black/60 transition-colors hover:text-primary-black"
      >
        <ArrowLeft className="h-4 w-4" aria-hidden />
        Torna al Profilo
      </HomeTabLink>

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
              ? "Crea l’account Pro e l’annuncio location: lo controlleremo in Gestione pubblicazioni prima di metterlo online."
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
              : isLocale
                ? "Account Pro creato! Annuncio inviato in revisione."
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
            <section className="rounded-2xl border border-primary-black/10 bg-surface p-5">
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
                {!editingExisting && (
                  <>
                    <TextField
                      id="owner-password"
                      label="Password"
                      type="password"
                      value={ownerData.password}
                      onChange={(v) => updateOwner("password", v)}
                      placeholder="Lettera + numero, min. 8"
                      required
                    />
                    <TextField
                      id="owner-password-confirm"
                      label="Conferma password"
                      type="password"
                      value={ownerData.confirmPassword}
                      onChange={(v) => updateOwner("confirmPassword", v)}
                      placeholder="Ripeti la password"
                      required
                    />
                    <p className="text-[11px] leading-relaxed text-primary-black/45">
                      Ti servirà per accedere se non usi VibeUp da un po&apos;.
                    </p>
                  </>
                )}
              </div>
            </section>
          )}

          {category && categoryUsesLocaleFields(category) && (
            <section className="rounded-2xl border border-primary-black/10 bg-surface p-5">
              <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-primary-black/50">
                Annuncio location
              </h2>
              <p className="mb-4 text-xs text-primary-black/55">
                Stessa configurazione della scheda location. Dopo l’invio resta in
                revisione finché non lo approviamo.
              </p>
              <LocationPublishForm
                value={locationListing}
                onChange={(next) => {
                  setLocationListing(next);
                  setLocaleData({
                    businessName: next.name,
                    address: next.address,
                    maxCapacity: next.capacity,
                    hourlyPrice: next.listPrice,
                  });
                }}
                idPrefix="business-locale"
              />
            </section>
          )}

          {category && categoryUsesPerformerFields(category) && (
            <section className="rounded-2xl border border-primary-black/10 bg-surface p-5">
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
            <section className="rounded-2xl border border-primary-black/10 bg-surface p-5">
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
              disabled={submitting || success}
              className="w-full rounded-2xl bg-brand-teal py-4 text-sm font-semibold text-ink-inverse transition-colors hover:bg-brand-teal/90 disabled:opacity-60"
            >
              {submitting
                ? "Creo account…"
                : editingExisting
                  ? "Salva profilo Business"
                  : "Crea account Pro"}
            </button>
          )}
        </form>
      )}
    </div>
  );
}
