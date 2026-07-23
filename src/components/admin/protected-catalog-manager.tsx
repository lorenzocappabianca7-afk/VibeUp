"use client";

import { Button } from "@/components/ui/button";
import { SafeImage } from "@/components/ui/safe-image";
import { useAppState } from "@/context/app-state-context";
import { canAccessAdminCatalog } from "@/lib/admin-access";
import { APP_SHELL_WIDTH_CLASS, cn, formatCurrency } from "@/lib/utils";
import type {
  ManagedListing,
  ManagedLocationListing,
  ManagedServiceListing,
} from "@/types/admin";
import type { ExploreCategory, Location } from "@/types/location";
import type { LucideIcon } from "lucide-react";
import {
  ArrowLeft,
  Building2,
  Camera,
  Disc3,
  Eye,
  EyeOff,
  Gift,
  Lock,
  Mail,
  Music,
  Plus,
  Trash2,
  UploadCloud,
  Wand2,
  X,
} from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";

const ADMIN_PASSWORD = "1234!";

const CATEGORIES: {
  id: ExploreCategory;
  label: string;
  icon: LucideIcon;
}[] = [
  { id: "locali", label: "Locali", icon: Building2 },
  { id: "dj", label: "DJ", icon: Disc3 },
  { id: "fotografo", label: "Fotografi", icon: Camera },
  { id: "decorazioni", label: "Decorazioni", icon: Gift },
  { id: "altri", label: "Altri servizi", icon: Music },
];

const EMPTY_LOCATION_FORM = {
  name: "",
  address: "",
  city: "Torino",
  capacity: "50",
  hourlyPrice: "100",
  menu: "",
  description: "",
  imageUrl: "",
  galleryImageUrls: [] as string[],
  includedServices: "Menu del locale, Open bar",
};

const EMPTY_SERVICE_FORM = {
  name: "",
  description: "",
  providerZone: "Torino",
  price: "250",
  priceSuffix: "servizio",
  imageUrl: "",
  uploadedImageUrl: "",
  galleryImageUrls: [] as string[],
};

function createLocationFromForm(form: typeof EMPTY_LOCATION_FORM): Location {
  const name = form.name.trim() || "Nuova location";
  const includedServices = form.includedServices
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
  const fallbackImage =
    "https://images.unsplash.com/photo-1511795409834-ef04bbd61622?w=800&q=80";
  const manualImage = form.imageUrl.trim();
  const gallery =
    form.galleryImageUrls.length > 0
      ? form.galleryImageUrls
      : [manualImage || fallbackImage];

  return {
    id: `managed-location-${Date.now()}`,
    name,
    city: form.city.trim() || "Torino",
    comune: form.city.trim() || "Torino",
    regione: "Piemonte",
    address: form.address.trim() || "Indirizzo da completare",
    geoArea: "torino_citta",
    zoneLabel: form.city.trim() || "Torino",
    latitude: 45.0703,
    longitude: 7.6869,
    imageUrl: gallery[0],
    gallery,
    description:
      form.description.trim() ||
      "Location gestita dal catalogo privato VibeUp.",
    technicalDetails: {
      surfaceSqm: 0,
      parkingSpots: 0,
      minHours: 3,
      maxGuests: Number(form.capacity) || 50,
      accessibility: true,
      airConditioning: true,
      outdoorArea: false,
    },
    hourlyPrice: Number(form.hourlyPrice) || 0,
    capacity: Number(form.capacity) || 50,
    partyTypes: ["compleanno", "laurea", "festa"],
    deposit: Math.round((Number(form.hourlyPrice) || 0) * 2),
    includedServices:
      includedServices.length > 0 ? includedServices : ["Dettagli da completare"],
    contactsBeenHere: { count: 0, contacts: [] },
  };
}

function listingName(listing: ManagedListing): string {
  return listing.category === "locali"
    ? listing.location.name
    : listing.name;
}

function parseEuroAmount(value: string): number | null {
  const match = value.match(/(?:€|euro)?\s*(\d{2,5})(?:[,.](\d{1,2}))?/i);
  if (!match) return null;

  const euros = Number(match[1]);
  const cents = match[2] ? Number(match[2].padEnd(2, "0")) / 100 : 0;
  return euros + cents;
}

async function readImportText(files?: FileList | null): Promise<string> {
  const fileTexts = await Promise.all(
    Array.from(files ?? []).map(async (file) => {
      if (
        file.type.startsWith("text/") ||
        file.name.endsWith(".txt") ||
        file.name.endsWith(".csv") ||
        file.name.endsWith(".md")
      ) {
        return file.text();
      }
      return `File caricato: ${file.name}`;
    }),
  );

  return fileTexts.join("\n");
}

async function readImageFiles(files?: FileList | null): Promise<string[]> {
  const imageFiles = Array.from(files ?? []).filter((file) =>
    file.type.startsWith("image/"),
  );

  return Promise.all(
    imageFiles.map(
      (file) =>
        new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => {
            if (typeof reader.result === "string") {
              resolve(reader.result);
              return;
            }
            reject(new Error("Formato immagine non valido"));
          };
          reader.onerror = () => reject(reader.error);
          reader.readAsDataURL(file);
        }),
    ),
  );
}

export function ProtectedCatalogManager() {
  const {
    currentUser,
    managedListings,
    upsertManagedListing,
    removeManagedListing,
    toggleManagedListingPublication,
  } = useAppState();
  const [password, setPassword] = useState("");
  const [isUnlocked, setIsUnlocked] = useState(false);
  const [passwordError, setPasswordError] = useState("");
  const [activeCategory, setActiveCategory] = useState<ExploreCategory>("locali");
  const [locationForm, setLocationForm] = useState(EMPTY_LOCATION_FORM);
  const [serviceForm, setServiceForm] = useState(EMPTY_SERVICE_FORM);
  const [aiText, setAiText] = useState("");
  const [aiLoading, setAiLoading] = useState(false);
  const [aiMessage, setAiMessage] = useState<string | null>(null);

  const categoryListings = useMemo(
    () => managedListings.filter((listing) => listing.category === activeCategory),
    [managedListings, activeCategory],
  );

  if (!canAccessAdminCatalog(currentUser.email)) {
    return (
      <div
        className={cn(
          "mx-auto box-border min-h-dvh min-w-0 overflow-x-clip bg-background px-4 pt-8",
          APP_SHELL_WIDTH_CLASS,
        )}
      >
        <div className="rounded-[2rem] border border-primary-black/10 bg-primary-black/[0.02] p-6">
          <Link
            href="/"
            className="mb-5 inline-flex items-center gap-1.5 rounded-full bg-background px-3 py-2 text-xs font-bold text-primary-black/55 transition-colors hover:text-primary-black"
          >
            <ArrowLeft className="h-3.5 w-3.5" aria-hidden />
            Torna alla home
          </Link>
          <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary-black text-white">
            <Lock className="h-5 w-5" aria-hidden />
          </span>
          <h1 className="mt-4 text-2xl font-black text-primary-black">
            Accesso non autorizzato
          </h1>
          <p className="mt-2 text-sm leading-relaxed text-primary-black/60">
            L&apos;area gestione pubblicazioni e&apos; disponibile solo per
            l&apos;account vibeup.planner@gmail.com.
          </p>
        </div>
      </div>
    );
  }

  function unlock() {
    if (password === ADMIN_PASSWORD) {
      setIsUnlocked(true);
      setPasswordError("");
      return;
    }
    setPasswordError("Password non corretta.");
  }

  function saveLocation(published = false) {
    const location = createLocationFromForm(locationForm);
    const listing: ManagedLocationListing = {
      id: location.id,
      category: "locali",
      location,
      menu: locationForm.menu,
      published,
      updatedAt: new Date().toISOString(),
    };

    upsertManagedListing(listing);
    setLocationForm(EMPTY_LOCATION_FORM);
    setAiText("");
    setAiMessage("Locale salvato. Puoi pubblicarlo quando sei pronto.");
  }

  function saveService(published = false) {
    const listing: ManagedServiceListing = {
      id: `managed-${activeCategory}-${Date.now()}`,
      category: activeCategory === "locali" ? "altri" : activeCategory,
      name: serviceForm.name.trim() || "Nuovo servizio",
      description:
        serviceForm.description.trim() ||
        "Servizio gestito dal catalogo privato VibeUp.",
      providerZone: serviceForm.providerZone.trim() || "Torino",
      price: Number(serviceForm.price) || 0,
      priceSuffix: serviceForm.priceSuffix.trim() || "servizio",
      imageUrl:
        serviceForm.uploadedImageUrl || serviceForm.imageUrl.trim() || undefined,
      galleryImageUrls:
        serviceForm.galleryImageUrls.length > 0
          ? serviceForm.galleryImageUrls
          : serviceForm.uploadedImageUrl
            ? [serviceForm.uploadedImageUrl]
            : serviceForm.imageUrl.trim()
              ? [serviceForm.imageUrl.trim()]
              : undefined,
      published,
      updatedAt: new Date().toISOString(),
    };

    upsertManagedListing(listing);
    setServiceForm(EMPTY_SERVICE_FORM);
    setAiMessage("Servizio salvato. Puoi pubblicarlo quando sei pronto.");
  }

  async function addLocationPhotos(files?: FileList | null) {
    const images = await readImageFiles(files);
    if (images.length === 0) return;

    setLocationForm((prev) => ({
      ...prev,
      galleryImageUrls: [...prev.galleryImageUrls, ...images],
    }));
    setAiMessage(`${images.length} foto aggiunte alla pubblicazione.`);
  }

  function removeLocationPhoto(index: number) {
    setLocationForm((prev) => ({
      ...prev,
      galleryImageUrls: prev.galleryImageUrls.filter((_, itemIndex) =>
        itemIndex !== index
      ),
    }));
  }

  async function addServicePhoto(files?: FileList | null) {
    const images = await readImageFiles(files);
    if (images.length === 0) return;

    setServiceForm((prev) => ({
      ...prev,
      uploadedImageUrl:
        activeCategory === "decorazioni"
          ? prev.uploadedImageUrl || images[0]
          : images[0],
      galleryImageUrls:
        activeCategory === "decorazioni"
          ? [...prev.galleryImageUrls, ...images]
          : images.slice(0, 1),
    }));
    setAiMessage(
      activeCategory === "decorazioni"
        ? `${images.length} foto negozio aggiunte alla pubblicazione.`
        : "Foto profilo aggiunta alla pubblicazione.",
    );
  }

  function removeServicePhoto(index: number) {
    setServiceForm((prev) => {
      const galleryImageUrls = prev.galleryImageUrls.filter(
        (_, itemIndex) => itemIndex !== index,
      );
      return {
        ...prev,
        galleryImageUrls,
        uploadedImageUrl: galleryImageUrls[0] ?? "",
      };
    });
  }

  async function importLocationWithAi(files?: FileList | null) {
    if (activeCategory !== "locali") return;

    setAiLoading(true);
    setAiMessage(null);

    try {
      const formData = new FormData();
      if (aiText.trim()) {
        formData.append("text", aiText);
      }
      Array.from(files ?? []).forEach((file) => {
        formData.append(file.type.startsWith("image/") ? "photos" : "files", file);
      });

      const response = await fetch("/api/ai/location-extract", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) throw new Error("Import non riuscito");

      const body = (await response.json()) as {
        data?: {
          location?: Location;
          extraction?: { priceList?: Array<{ name: string; price: number }> };
        };
      };
      const location = body.data?.location;
      if (!location) throw new Error("Nessun dato location estratto");

      setLocationForm({
        name: location.name,
        address: location.address,
        city: location.city,
        capacity: String(location.capacity),
        hourlyPrice: String(location.hourlyPrice),
        menu:
          body.data?.extraction?.priceList
            ?.map((item) => `${item.name}: ${formatCurrency(item.price)}`)
            .join("\n") ?? "",
        description: location.description,
        imageUrl: location.imageUrl,
        galleryImageUrls: location.gallery,
        includedServices: location.includedServices.join(", "),
      });
      setAiMessage("Informazioni importate: controllale e poi salva o pubblica.");
    } catch {
      setAiMessage(
        "Non sono riuscito a importare automaticamente. Puoi incollare piu' testo o completare i campi a mano.",
      );
    } finally {
      setAiLoading(false);
    }
  }

  async function importServiceDetails(files?: FileList | null) {
    if (activeCategory === "locali") return;

    setAiLoading(true);
    setAiMessage(null);

    try {
      const importedText = await readImportText(files);
      const sourceText = [aiText, importedText].filter(Boolean).join("\n");
      const lines = sourceText
        .split(/\r?\n/)
        .map((line) => line.trim())
        .filter(Boolean);
      const inferredName =
        lines.find((line) => !parseEuroAmount(line) && line.length <= 60) ??
        serviceForm.name;
      const inferredPrice =
        parseEuroAmount(sourceText) ?? Number(serviceForm.price) ?? 0;
      const zoneLine = lines.find((line) =>
        /torino|piemonte|provincia|zona|cintura/i.test(line),
      );

      setServiceForm((prev) => ({
        ...prev,
        name: inferredName || prev.name,
        description: sourceText || prev.description,
        providerZone: zoneLine ?? prev.providerZone,
        price: inferredPrice ? String(Math.round(inferredPrice)) : prev.price,
      }));
      setAiMessage(
        "Dettagli servizio importati. Controllali e poi salva o pubblica.",
      );
    } catch {
      setAiMessage(
        "Non sono riuscito a leggere il materiale. Puoi incollare il testo o completare i campi a mano.",
      );
    } finally {
      setAiLoading(false);
    }
  }

  if (!isUnlocked) {
    return (
      <div
        className={cn(
          "mx-auto box-border min-h-dvh min-w-0 overflow-x-clip bg-background px-4 pt-8",
          APP_SHELL_WIDTH_CLASS,
        )}
      >
        <div className="rounded-[2rem] border border-primary-black/10 bg-primary-black/[0.02] p-6">
          <Link
            href="/"
            className="mb-5 inline-flex items-center gap-1.5 rounded-full bg-background px-3 py-2 text-xs font-bold text-primary-black/55 transition-colors hover:text-primary-black"
          >
            <ArrowLeft className="h-3.5 w-3.5" aria-hidden />
            Torna alla home
          </Link>
          <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary-black text-white">
            <Lock className="h-5 w-5" aria-hidden />
          </span>
          <h1 className="mt-4 text-2xl font-black text-primary-black">
            Area gestione VibeUp
          </h1>
          <p className="mt-2 text-sm leading-relaxed text-primary-black/60">
            Inserisci la password per gestire location, DJ, fotografi,
            decorazioni e altri servizi.
          </p>
          <div className="mt-5 space-y-3">
            <input
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") unlock();
              }}
              placeholder="Password"
              className="w-full min-w-0 rounded-2xl border border-primary-black/10 bg-background px-4 py-3 text-base outline-none focus:border-brand-teal"
            />
            {passwordError && (
              <p className="text-xs font-semibold text-brand-pink">
                {passwordError}
              </p>
            )}
            <Button className="w-full rounded-2xl" onClick={unlock}>
              Entra
            </Button>
          </div>
        </div>
      </div>
    );
  }

  const isLocationCategory = activeCategory === "locali";

  return (
    <div
      className={cn(
        "mx-auto box-border min-h-dvh min-w-0 overflow-x-clip bg-background px-4 py-6 pb-8 sm:px-5 lg:px-8",
        APP_SHELL_WIDTH_CLASS,
      )}
    >
      <header className="flex min-w-0 flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0">
          <Link
            href="/"
            className="mb-3 inline-flex items-center gap-1.5 text-xs font-bold text-primary-black/45 transition-colors hover:text-primary-black"
          >
            <ArrowLeft className="h-3.5 w-3.5" aria-hidden />
            Torna alla home
          </Link>
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-brand-teal">
            Catalogo privato
          </p>
          <h1 className="mt-1 break-words text-2xl font-black text-primary-black sm:text-3xl">
            Gestione pubblicazioni VibeUp
          </h1>
          <p className="mt-1 text-sm text-primary-black/60">
            Salva bozze, modifica dettagli e pubblica solo quando le informazioni sono pronte.
          </p>
        </div>
        <Button
          variant="outline"
          className="w-full shrink-0 sm:w-auto"
          onClick={() => setIsUnlocked(false)}
        >
          Blocca area
        </Button>
      </header>

      <div className="mt-6 min-w-0 max-w-full overflow-x-auto overscroll-x-contain rounded-3xl bg-primary-black/[0.04] p-2 [-webkit-overflow-scrolling:touch]">
        <div className="flex w-max max-w-none gap-2">
          {CATEGORIES.map((category) => {
            const Icon = category.icon;
            return (
              <button
                key={category.id}
                type="button"
                onClick={() => setActiveCategory(category.id)}
                className={cn(
                  "flex shrink-0 items-center gap-2 rounded-2xl px-3.5 py-2.5 text-sm font-bold transition-colors sm:px-4",
                  activeCategory === category.id
                    ? "bg-brand-teal text-white"
                    : "bg-background text-primary-black/65",
                )}
              >
                <Icon className="h-4 w-4" aria-hidden />
                {category.label}
              </button>
            );
          })}
        </div>
      </div>

      <div className="mt-6 grid min-w-0 gap-5 lg:grid-cols-[1.1fr_0.9fr]">
        <section className="min-w-0 rounded-[1.75rem] border border-primary-black/10 bg-background p-4 shadow-sm sm:rounded-[2rem] sm:p-5">
          <div className="flex min-w-0 items-center gap-2">
            <Plus className="h-5 w-5 shrink-0 text-brand-teal" aria-hidden />
            <h2 className="min-w-0 text-base font-black text-primary-black sm:text-lg">
              {isLocationCategory ? "Aggiungi o modifica locale" : "Aggiungi servizio"}
            </h2>
          </div>

          {isLocationCategory ? (
            <div className="mt-4 space-y-4">
              <div className="rounded-3xl border border-dashed border-brand-teal/35 bg-brand-teal/5 p-4">
                <div className="flex items-start gap-3">
                  <UploadCloud className="mt-0.5 h-5 w-5 text-brand-teal" aria-hidden />
                  <div>
                    <p className="text-sm font-bold text-primary-black">
                      Importa con IA da screen, testo o mail
                    </p>
                    <p className="mt-1 text-xs text-primary-black/60">
                      Incolla una mail o carica screenshot/listini: VibeUp riempie i campi del locale.
                    </p>
                  </div>
                </div>
                <textarea
                  value={aiText}
                  onChange={(event) => setAiText(event.target.value)}
                  rows={4}
                  placeholder="Incolla qui testo, mail o dettagli del locale..."
                  className="mt-3 w-full min-w-0 rounded-2xl border border-primary-black/10 bg-background px-4 py-3 text-base outline-none focus:border-brand-teal"
                />
                <div className="mt-3 flex flex-col gap-2 sm:flex-row">
                  <label className="flex flex-1 cursor-pointer items-center justify-center gap-2 rounded-2xl border border-primary-black/10 bg-background px-4 py-3 text-sm font-bold text-primary-black/70">
                    <Mail className="h-4 w-4" aria-hidden />
                    Carica screen/documento
                    <input
                      type="file"
                      multiple
                      accept="image/*,.pdf,.txt,.csv,.md"
                      className="sr-only"
                      onChange={(event) => void importLocationWithAi(event.target.files)}
                    />
                  </label>
                  <Button
                    className="flex-1 rounded-2xl"
                    disabled={aiLoading}
                    onClick={() => void importLocationWithAi()}
                  >
                    <Wand2 className="mr-2 h-4 w-4" aria-hidden />
                    {aiLoading ? "Analisi IA..." : "Apprendi dettagli"}
                  </Button>
                </div>
                {aiMessage && (
                  <p className="mt-3 text-xs font-semibold text-primary-black/60">
                    {aiMessage}
                  </p>
                )}
              </div>

              <FormInput label="Nome locale" value={locationForm.name} onChange={(value) => setLocationForm((prev) => ({ ...prev, name: value }))} />
              <FormInput label="Indirizzo" value={locationForm.address} onChange={(value) => setLocationForm((prev) => ({ ...prev, address: value }))} />
              <div className="grid gap-3 sm:grid-cols-3">
                <FormInput label="Citta" value={locationForm.city} onChange={(value) => setLocationForm((prev) => ({ ...prev, city: value }))} />
                <FormInput label="Capienza" type="number" value={locationForm.capacity} onChange={(value) => setLocationForm((prev) => ({ ...prev, capacity: value }))} />
                <FormInput label="Prezzo base evento" type="number" value={locationForm.hourlyPrice} onChange={(value) => setLocationForm((prev) => ({ ...prev, hourlyPrice: value }))} />
              </div>
              <FormInput label="URL foto principale" value={locationForm.imageUrl} onChange={(value) => setLocationForm((prev) => ({ ...prev, imageUrl: value }))} />
              <PhotoUploadField
                label="Allega foto del locale"
                description="Carica una o più immagini: la prima sarà la copertina, le altre entreranno nella gallery."
                images={locationForm.galleryImageUrls}
                multiple
                onAddPhotos={(files) => void addLocationPhotos(files)}
                onRemovePhoto={removeLocationPhoto}
              />
              <FormInput label="Servizi interni inclusi (separati da virgola)" value={locationForm.includedServices} onChange={(value) => setLocationForm((prev) => ({ ...prev, includedServices: value }))} />
              <FormTextarea label="Menu / listino" value={locationForm.menu} onChange={(value) => setLocationForm((prev) => ({ ...prev, menu: value }))} />
              <FormTextarea label="Descrizione" value={locationForm.description} onChange={(value) => setLocationForm((prev) => ({ ...prev, description: value }))} />
              <div className="grid gap-2 sm:grid-cols-2">
                <Button variant="outline" className="rounded-2xl" onClick={() => saveLocation(false)}>
                  Salva bozza
                </Button>
                <Button className="rounded-2xl" onClick={() => saveLocation(true)}>
                  Salva e pubblica
                </Button>
              </div>
            </div>
          ) : (
            <div className="mt-4 space-y-4">
              <div className="rounded-3xl border border-dashed border-brand-teal/35 bg-brand-teal/5 p-4">
                <div className="flex items-start gap-3">
                  <UploadCloud className="mt-0.5 h-5 w-5 text-brand-teal" aria-hidden />
                  <div>
                    <p className="text-sm font-bold text-primary-black">
                      Importa dettagli servizio con IA
                    </p>
                    <p className="mt-1 text-xs text-primary-black/60">
                      Incolla una mail, un testo o carica uno screen/listino per precompilare nome, descrizione, zona e prezzo.
                    </p>
                  </div>
                </div>
                <textarea
                  value={aiText}
                  onChange={(event) => setAiText(event.target.value)}
                  rows={4}
                  placeholder="Incolla qui testo, mail o dettagli del servizio..."
                  className="mt-3 w-full min-w-0 rounded-2xl border border-primary-black/10 bg-background px-4 py-3 text-base outline-none focus:border-brand-teal"
                />
                <div className="mt-3 flex flex-col gap-2 sm:flex-row">
                  <label className="flex flex-1 cursor-pointer items-center justify-center gap-2 rounded-2xl border border-primary-black/10 bg-background px-4 py-3 text-sm font-bold text-primary-black/70">
                    <Mail className="h-4 w-4" aria-hidden />
                    Carica screen/documento
                    <input
                      type="file"
                      multiple
                      accept="image/*,.pdf,.txt,.csv,.md"
                      className="sr-only"
                      onChange={(event) => void importServiceDetails(event.target.files)}
                    />
                  </label>
                  <Button
                    className="flex-1 rounded-2xl"
                    disabled={aiLoading}
                    onClick={() => void importServiceDetails()}
                  >
                    <Wand2 className="mr-2 h-4 w-4" aria-hidden />
                    {aiLoading ? "Analisi IA..." : "Apprendi dettagli"}
                  </Button>
                </div>
                {aiMessage && (
                  <p className="mt-3 text-xs font-semibold text-primary-black/60">
                    {aiMessage}
                  </p>
                )}
              </div>

              <FormInput label="Nome" value={serviceForm.name} onChange={(value) => setServiceForm((prev) => ({ ...prev, name: value }))} />
              <FormTextarea label="Descrizione" value={serviceForm.description} onChange={(value) => setServiceForm((prev) => ({ ...prev, description: value }))} />
              <div className="grid gap-3 sm:grid-cols-3">
                <FormInput label="Zona" value={serviceForm.providerZone} onChange={(value) => setServiceForm((prev) => ({ ...prev, providerZone: value }))} />
                <FormInput label="Prezzo" type="number" value={serviceForm.price} onChange={(value) => setServiceForm((prev) => ({ ...prev, price: value }))} />
                <FormInput label="Unita prezzo" value={serviceForm.priceSuffix} onChange={(value) => setServiceForm((prev) => ({ ...prev, priceSuffix: value }))} />
              </div>
              <FormInput
                label={
                  activeCategory === "decorazioni"
                    ? "URL foto negozio"
                    : activeCategory === "dj" || activeCategory === "fotografo"
                      ? "URL foto profilo"
                      : "URL foto/portfolio"
                }
                value={serviceForm.imageUrl}
                onChange={(value) => setServiceForm((prev) => ({ ...prev, imageUrl: value }))}
              />
              <PhotoUploadField
                label={
                  activeCategory === "decorazioni"
                    ? "Allega foto del negozio"
                    : activeCategory === "dj" || activeCategory === "fotografo"
                      ? "Allega foto profilo"
                      : "Allega foto/portfolio"
                }
                description={
                  activeCategory === "decorazioni"
                    ? "Carica una o più foto del punto vendita, come per le location."
                    : activeCategory === "dj" || activeCategory === "fotografo"
                      ? "Carica una foto profilo che comparirà nelle card e nel profilo servizio."
                      : "Carica una foto: verrà usata come immagine della pubblicazione."
                }
                images={
                  serviceForm.galleryImageUrls.length > 0
                    ? serviceForm.galleryImageUrls
                    : serviceForm.uploadedImageUrl
                      ? [serviceForm.uploadedImageUrl]
                      : []
                }
                multiple={activeCategory === "decorazioni"}
                onAddPhotos={(files) => void addServicePhoto(files)}
                onRemovePhoto={removeServicePhoto}
              />
              <div className="grid gap-2 sm:grid-cols-2">
                <Button variant="outline" className="rounded-2xl" onClick={() => saveService(false)}>
                  Salva bozza
                </Button>
                <Button className="rounded-2xl" onClick={() => saveService(true)}>
                  Salva e pubblica
                </Button>
              </div>
            </div>
          )}
        </section>

        <section className="min-w-0 rounded-[1.75rem] border border-primary-black/10 bg-primary-black/[0.02] p-4 sm:rounded-[2rem] sm:p-5">
          <div className="flex min-w-0 items-center justify-between gap-3">
            <h2 className="min-w-0 text-base font-black text-primary-black sm:text-lg">
              Pubblicazioni {CATEGORIES.find((item) => item.id === activeCategory)?.label}
            </h2>
            <span className="shrink-0 rounded-full bg-background px-3 py-1 text-xs font-bold text-primary-black/55">
              {categoryListings.length}
            </span>
          </div>
          <ul className="mt-4 space-y-3">
            {categoryListings.length === 0 && (
              <li className="rounded-2xl border border-dashed border-primary-black/15 bg-background p-6 text-center text-sm text-primary-black/55">
                Nessuna pubblicazione in questa categoria.
              </li>
            )}
            {categoryListings.map((listing) => (
              <li
                key={listing.id}
                className="min-w-0 rounded-2xl border border-primary-black/10 bg-background p-4"
              >
                <div className="flex min-w-0 items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="break-words font-bold text-primary-black">
                      {listingName(listing)}
                    </p>
                    <p className="mt-1 text-xs text-primary-black/55">
                      {listing.published ? "Pubblicato in Esplora" : "Bozza privata"} · Aggiornato{" "}
                      {new Date(listing.updatedAt).toLocaleDateString("it-IT")}
                    </p>
                  </div>
                  <span
                    className={cn(
                      "shrink-0 rounded-full px-3 py-1 text-xs font-bold",
                      listing.published
                        ? "bg-brand-teal/10 text-brand-teal"
                        : "bg-primary-black/5 text-primary-black/45",
                    )}
                  >
                    {listing.published ? "Live" : "Bozza"}
                  </span>
                </div>
                <div className="mt-3 grid gap-2 sm:grid-cols-2">
                  <button
                    type="button"
                    onClick={() => toggleManagedListingPublication(listing.id)}
                    className="flex min-w-0 items-center justify-center gap-2 rounded-xl border border-primary-black/10 px-3 py-2.5 text-xs font-bold text-primary-black/70"
                  >
                    {listing.published ? (
                      <EyeOff className="h-3.5 w-3.5 shrink-0" aria-hidden />
                    ) : (
                      <Eye className="h-3.5 w-3.5 shrink-0" aria-hidden />
                    )}
                    <span className="truncate">
                      {listing.published ? "Togli pubblicazione" : "Pubblica"}
                    </span>
                  </button>
                  <button
                    type="button"
                    onClick={() => removeManagedListing(listing.id)}
                    className="flex min-w-0 items-center justify-center gap-2 rounded-xl border border-brand-pink/25 px-3 py-2.5 text-xs font-bold text-brand-pink"
                  >
                    <Trash2 className="h-3.5 w-3.5 shrink-0" aria-hidden />
                    Rimuovi
                  </button>
                </div>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </div>
  );
}

function PhotoUploadField({
  label,
  description,
  images,
  multiple = false,
  onAddPhotos,
  onRemovePhoto,
}: {
  label: string;
  description: string;
  images: string[];
  multiple?: boolean;
  onAddPhotos: (files: FileList | null) => void;
  onRemovePhoto: (index: number) => void;
}) {
  return (
    <div className="min-w-0 rounded-3xl border border-primary-black/10 bg-primary-black/[0.02] p-4">
      <div className="flex min-w-0 items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm font-black text-primary-black">{label}</p>
          <p className="mt-1 text-xs leading-relaxed text-primary-black/55">
            {description}
          </p>
        </div>
        <label className="flex shrink-0 cursor-pointer items-center gap-1.5 rounded-2xl bg-brand-teal px-3 py-2 text-xs font-black text-white transition-colors hover:bg-brand-teal/90">
          <UploadCloud className="h-4 w-4" aria-hidden />
          Carica
          <input
            type="file"
            accept="image/*"
            multiple={multiple}
            className="sr-only"
            onChange={(event) => {
              onAddPhotos(event.target.files);
              event.target.value = "";
            }}
          />
        </label>
      </div>

      {images.length > 0 ? (
        <ul className="mt-3 grid min-w-0 grid-cols-2 gap-2 sm:grid-cols-3 sm:gap-3">
          {images.map((image, index) => (
            <li
              key={`${image.slice(0, 32)}-${index}`}
              className="relative min-w-0 overflow-hidden rounded-2xl border border-primary-black/10 bg-background"
            >
              <div className="relative aspect-[4/3]">
                <SafeImage
                  src={image}
                  alt={`${label} ${index + 1}`}
                  fill
                  className="object-cover"
                  sizes="160px"
                />
              </div>
              <button
                type="button"
                onClick={() => onRemovePhoto(index)}
                className="absolute right-2 top-2 flex h-7 w-7 items-center justify-center rounded-full bg-background text-primary-black/55 shadow-sm transition-colors hover:text-brand-pink"
                aria-label={`Rimuovi foto ${index + 1}`}
              >
                <X className="h-3.5 w-3.5" aria-hidden />
              </button>
              {index === 0 && (
                <span className="absolute bottom-2 left-2 rounded-full bg-primary-black px-2 py-1 text-[10px] font-black text-white">
                  Copertina
                </span>
              )}
            </li>
          ))}
        </ul>
      ) : (
        <div className="mt-3 rounded-2xl border border-dashed border-primary-black/15 bg-background px-4 py-5 text-center">
          <Camera className="mx-auto h-5 w-5 text-primary-black/35" aria-hidden />
          <p className="mt-2 text-xs font-semibold text-primary-black/45">
            Nessuna foto allegata.
          </p>
        </div>
      )}
    </div>
  );
}

function FormInput({
  label,
  value,
  onChange,
  type = "text",
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
}) {
  return (
    <label className="block min-w-0">
      <span className="mb-1.5 block text-xs font-bold text-primary-black/55">
        {label}
      </span>
      <input
        type={type}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="w-full min-w-0 max-w-full rounded-2xl border border-primary-black/10 bg-background px-4 py-3 text-base outline-none focus:border-brand-teal"
      />
    </label>
  );
}

function FormTextarea({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <label className="block min-w-0">
      <span className="mb-1.5 block text-xs font-bold text-primary-black/55">
        {label}
      </span>
      <textarea
        value={value}
        onChange={(event) => onChange(event.target.value)}
        rows={4}
        className="w-full min-w-0 max-w-full resize-y rounded-2xl border border-primary-black/10 bg-background px-4 py-3 text-base outline-none focus:border-brand-teal"
      />
    </label>
  );
}
