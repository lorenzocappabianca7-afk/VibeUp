"use client";

import {
  Camera,
  Bell,
  AtSign,
  ChevronRight,
  CreditCard,
  HelpCircle,
  LockKeyhole,
  LogOut,
  MapPin,
  Pencil,
  Plus,
  ShieldCheck,
  Settings,
  Trash2,
  User,
  Briefcase,
  Heart,
  Phone,
  X,
} from "lucide-react";
import Link from "next/link";
import { SafeImage } from "@/components/ui/safe-image";
import { GUEST_USER, useAppState } from "@/context/app-state-context";
import { canAccessAdminCatalog } from "@/lib/admin-access";
import { MOCK_LOCATIONS } from "@/lib/mock/locations";
import {
  SERVICE_PROVIDERS,
  type ServiceProvider,
} from "@/lib/mock/service-providers";
import type { ManagedLocationListing, ManagedServiceListing } from "@/types/admin";
import { BUSINESS_CATEGORY_LABELS } from "@/types/business";
import { formatCurrency, getLocationPricePresentation } from "@/lib/utils";
import {
  createSavedPaymentCard,
  formatCardNumber,
  formatExpiry,
  getCardBrand,
} from "@/lib/payments/card-vault";
import { useEffect, useMemo, useRef, useState } from "react";

const menuItems = [
  { id: "settings", icon: Settings, label: "Impostazioni account" },
  { id: "payments", icon: CreditCard, label: "Pagamenti e abbonamento" },
  { id: "help", icon: HelpCircle, label: "Aiuto e supporto" },
  {
    id: "privacy",
    icon: LockKeyhole,
    label: "Privacy e Visibilità",
    description:
      "Gestisci la visibilità delle tue feste, degli invitati e dei dati condivisi con i fornitori.",
  },
  {
    id: "notifications",
    icon: Bell,
    label: "Notifiche e Comunicazioni",
    description:
      "Scegli come ricevere gli aggiornamenti sui preventivi (Push, Email, WhatsApp).",
  },
  {
    id: "security",
    icon: ShieldCheck,
    label: "Sicurezza e Recensioni",
    description:
      "Modifica password, autenticazione a due fattori e storico dei feedback lasciati ai fornitori.",
  },
];

export function ProfileScreen() {
  const {
    accounts,
    businessProfile,
    createAccount,
    currentUser,
    deleteAccount,
    favoriteLocationIds,
    favoriteServiceIds,
    isBusinessUser,
    isGuest,
    managedListings,
    removeFavoriteLocation,
    removeFavoriteService,
    switchAccount,
    updateCurrentUser,
    isStorageHydrated,
  } = useAppState();
  const [newAccountName, setNewAccountName] = useState("");
  const [newAccountEmail, setNewAccountEmail] = useState("");
  const [addAccountOpen, setAddAccountOpen] = useState(false);
  const [accountPendingDelete, setAccountPendingDelete] = useState<{
    id: string;
    name: string;
    email: string;
  } | null>(null);
  const longPressTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const longPressTriggeredRef = useRef(false);
  const [profileEditOpen, setProfileEditOpen] = useState(false);
  const [paymentsOpen, setPaymentsOpen] = useState(false);
  const [cardDraft, setCardDraft] = useState({
    cardholderName: currentUser.name,
    cardNumber: "",
    expiry: "",
    cvc: "",
  });
  const [cardError, setCardError] = useState<string | null>(null);
  const [cardSavedFlash, setCardSavedFlash] = useState(false);
  const [profileDraft, setProfileDraft] = useState({
    name: currentUser.name,
    email: currentUser.email,
    instagramHandle: currentUser.instagramHandle ?? "",
    phoneNumber: currentUser.phoneNumber ?? "",
  });
  const lastSyncedUserId = useRef(currentUser.id);
  const hasHydratedProfileDraft = useRef(false);
  const canManagePublications = canAccessAdminCatalog(currentUser.email);

  useEffect(() => {
    if (!isStorageHydrated) return;

    if (lastSyncedUserId.current !== currentUser.id) {
      lastSyncedUserId.current = currentUser.id;
      hasHydratedProfileDraft.current = true;

      queueMicrotask(() => {
        setProfileDraft({
          name: currentUser.name,
          email: currentUser.email,
          instagramHandle: currentUser.instagramHandle ?? "",
          phoneNumber: currentUser.phoneNumber ?? "",
        });
        setCardDraft((current) => ({
          ...current,
          cardholderName: currentUser.name,
          cardNumber: "",
          expiry: "",
          cvc: "",
        }));
        setCardError(null);
      });
      return;
    }

    if (hasHydratedProfileDraft.current) return;
    hasHydratedProfileDraft.current = true;

    queueMicrotask(() => {
      setProfileDraft({
        name: currentUser.name,
        email: currentUser.email,
        instagramHandle: currentUser.instagramHandle ?? "",
        phoneNumber: currentUser.phoneNumber ?? "",
      });
      setCardDraft((current) => ({
        ...current,
        cardholderName: currentUser.name,
      }));
    });
  }, [
    currentUser.email,
    currentUser.id,
    currentUser.instagramHandle,
    currentUser.name,
    currentUser.phoneNumber,
    isStorageHydrated,
  ]);
  const favoriteLocations = useMemo(() => {
    const managedLocations = managedListings
      .filter(
        (listing): listing is ManagedLocationListing =>
          listing.category === "locali" && listing.published,
      )
      .map((listing) => listing.location);
    const allLocations = Array.from(
      new Map(
        [...managedLocations, ...MOCK_LOCATIONS].map((location) => [
          location.id,
          location,
        ]),
      ).values(),
    );

    return favoriteLocationIds
      .map((id) => allLocations.find((location) => location.id === id))
      .filter((location): location is NonNullable<typeof location> =>
        Boolean(location),
      );
  }, [favoriteLocationIds, managedListings]);
  const favoriteServices = useMemo(() => {
    const managedServices: ServiceProvider[] = managedListings
      .filter(
        (listing): listing is ManagedServiceListing =>
          listing.category !== "locali" && listing.published,
      )
      .map((listing) => ({
        id: listing.id,
        category: listing.category,
        name: listing.name,
        description: listing.description,
        providerZone: listing.providerZone,
        price: listing.price,
        priceSuffix: listing.priceSuffix,
        imageUrl: listing.imageUrl,
        galleryImageUrls: listing.galleryImageUrls,
      }));
    const allServices = Array.from(
      new Map(
        [...managedServices, ...SERVICE_PROVIDERS].map((service) => [
          service.id,
          service,
        ]),
      ).values(),
    );

    return favoriteServiceIds
      .map((id) => allServices.find((service) => service.id === id))
      .filter((service): service is ServiceProvider => Boolean(service));
  }, [favoriteServiceIds, managedListings]);

  function handleAvatarUpload(file: File | undefined) {
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") {
        updateCurrentUser({ avatarUrl: reader.result });
      }
    };
    reader.readAsDataURL(file);
  }

  function updateProfileDraft<K extends keyof typeof profileDraft>(
    key: K,
    value: (typeof profileDraft)[K],
  ) {
    setProfileDraft((current) => ({ ...current, [key]: value }));
  }

  function commitProfileDraft() {
    updateCurrentUser({
      name: profileDraft.name,
      email: profileDraft.email,
      instagramHandle: profileDraft.instagramHandle.replace(/^@+/, ""),
      phoneNumber: profileDraft.phoneNumber,
    });
  }

  function handleCreateAccount() {
    if (!newAccountEmail.trim()) return;

    createAccount({
      name: newAccountName,
      email: newAccountEmail,
    });
    setNewAccountName("");
    setNewAccountEmail("");
    setAddAccountOpen(false);
  }

  function clearLongPressTimer() {
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
  }

  function startAccountLongPress(account: {
    id: string;
    name: string;
    email: string;
  }) {
    longPressTriggeredRef.current = false;
    clearLongPressTimer();
    longPressTimerRef.current = setTimeout(() => {
      longPressTriggeredRef.current = true;
      setAccountPendingDelete(account);
    }, 550);
  }

  function handleAccountClick(accountId: string) {
    if (longPressTriggeredRef.current) {
      longPressTriggeredRef.current = false;
      return;
    }
    switchAccount(accountId);
  }

  function confirmDeleteAccount() {
    if (!accountPendingDelete) return;
    deleteAccount(accountPendingDelete.id);
    setAccountPendingDelete(null);
  }

  function handleSaveCard() {
    if (isGuest) {
      setCardError("Crea un account per salvare in modo sicuro la tua carta.");
      return;
    }

    const result = createSavedPaymentCard(cardDraft);
    if ("error" in result) {
      setCardError(result.error);
      return;
    }

    updateCurrentUser({ paymentCard: result.card });
    setCardDraft({
      cardholderName: result.card.cardholderName,
      cardNumber: "",
      expiry: "",
      cvc: "",
    });
    setCardError(null);
    setCardSavedFlash(true);
    window.setTimeout(() => setCardSavedFlash(false), 2500);
  }

  function handleRemoveCard() {
    updateCurrentUser({ paymentCard: undefined });
    setCardDraft((current) => ({
      ...current,
      cardNumber: "",
      expiry: "",
      cvc: "",
    }));
    setCardError(null);
  }

  return (
    <div className="min-w-0 space-y-6">
      <header>
        <h1 className="text-2xl font-bold text-primary-black">Profilo</h1>
        <p className="mt-1 text-sm text-primary-black/60">
          Impostazioni e gestione account
        </p>
      </header>

      <div className="rounded-2xl border border-primary-black/10 bg-primary-black/[0.02] p-5">
        <div className="flex min-w-0 items-center gap-4">
          <label className="group relative flex h-16 w-16 shrink-0 cursor-pointer items-center justify-center overflow-hidden rounded-full bg-brand-pink/20 text-brand-pink">
            {currentUser.avatarUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={currentUser.avatarUrl}
                alt={`Foto profilo di ${currentUser.name}`}
                className="h-full w-full object-cover"
              />
            ) : (
              <User className="h-8 w-8" aria-hidden />
            )}
            <span className="absolute inset-0 flex items-center justify-center bg-primary-black/45 text-white opacity-0 transition-opacity group-hover:opacity-100">
              <Camera className="h-5 w-5" aria-hidden />
            </span>
            <input
              type="file"
              accept="image/*"
              className="sr-only"
              onChange={(event) => handleAvatarUpload(event.target.files?.[0])}
            />
          </label>
          <div className="min-w-0 flex-1">
            <p className="truncate font-semibold text-primary-black">{currentUser.name}</p>
            <p className="truncate text-sm text-primary-black/60">
              {isGuest ? "Nessun account creato" : currentUser.email}
            </p>
            <span className="mt-1 inline-block rounded-full bg-brand-teal/15 px-2.5 py-0.5 text-xs font-medium text-brand-teal">
              {isGuest
                ? "Ospite"
                : isBusinessUser
                  ? "Account Business"
                  : "Piano gratuito"}
            </span>
          </div>
          <button
            type="button"
            onClick={() => setProfileEditOpen((current) => !current)}
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-primary-black/10 bg-background text-primary-black/65 transition-colors hover:border-primary-black/25 hover:text-primary-black"
            aria-label="Modifica profilo"
            aria-expanded={profileEditOpen}
          >
            <Pencil className="h-4 w-4" aria-hidden />
          </button>
        </div>

        {profileEditOpen && (
          <div className="mt-4 rounded-2xl border border-primary-black/8 bg-background p-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h2 className="text-sm font-bold text-primary-black">
                  Modifica profilo
                </h2>
                <p className="mt-0.5 text-xs text-primary-black/55">
                  Aggiorna foto, nome utente e contatti principali.
                </p>
              </div>
              <label className="flex shrink-0 cursor-pointer items-center gap-2 rounded-full bg-primary-black px-3 py-2 text-xs font-black text-white">
                <Camera className="h-3.5 w-3.5" aria-hidden />
                Foto
                <input
                  type="file"
                  accept="image/*"
                  className="sr-only"
                  onChange={(event) => handleAvatarUpload(event.target.files?.[0])}
                />
              </label>
            </div>

            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <label className="block">
                <span className="text-xs font-bold text-primary-black/55">
                  Nome utente
                </span>
                <input
                  value={profileDraft.name}
                  onChange={(event) =>
                    updateProfileDraft("name", event.target.value)
                  }
                  onBlur={commitProfileDraft}
                  className="mt-1 w-full rounded-2xl border border-primary-black/10 bg-background px-3 py-2.5 text-sm font-semibold text-primary-black outline-none focus:border-brand-teal"
                />
              </label>

              <label className="block">
                <span className="text-xs font-bold text-primary-black/55">
                  Email
                </span>
                <input
                  type="email"
                  value={profileDraft.email}
                  onChange={(event) =>
                    updateProfileDraft("email", event.target.value)
                  }
                  onBlur={commitProfileDraft}
                  className="mt-1 w-full rounded-2xl border border-primary-black/10 bg-background px-3 py-2.5 text-sm font-semibold text-primary-black outline-none focus:border-brand-teal"
                />
              </label>

              <label className="block">
                <span className="text-xs font-bold text-primary-black/55">
                  Instagram
                </span>
                <input
                  value={profileDraft.instagramHandle}
                  onChange={(event) =>
                    updateProfileDraft("instagramHandle", event.target.value)
                  }
                  onBlur={commitProfileDraft}
                  placeholder="@profilo"
                  className="mt-1 w-full rounded-2xl border border-primary-black/10 bg-background px-3 py-2.5 text-sm font-semibold text-primary-black outline-none placeholder:text-primary-black/35 focus:border-brand-teal"
                />
              </label>

              <label className="block">
                <span className="text-xs font-bold text-primary-black/55">
                  Numero di telefono
                </span>
                <input
                  type="tel"
                  value={profileDraft.phoneNumber}
                  onChange={(event) =>
                    updateProfileDraft("phoneNumber", event.target.value)
                  }
                  onBlur={commitProfileDraft}
                  placeholder="+39 333 000 0000"
                  className="mt-1 w-full rounded-2xl border border-primary-black/10 bg-background px-3 py-2.5 text-sm font-semibold text-primary-black outline-none placeholder:text-primary-black/35 focus:border-brand-teal"
                />
              </label>
            </div>
          </div>
        )}
      </div>

      <section className="space-y-3 rounded-2xl border border-primary-black/10 bg-background p-4">
        <div>
          <h2 className="text-sm font-bold text-primary-black">
            Contatti collegati
          </h2>
          <p className="mt-1 text-xs text-primary-black/55">
            Collega Instagram e numero di telefono per essere riconosciuto e
            ricevere comunicazioni importanti.
          </p>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <label className="block rounded-2xl border border-primary-black/8 bg-primary-black/[0.02] p-3">
            <span className="flex items-center justify-between gap-3">
              <span className="flex items-center gap-2 text-xs font-bold text-primary-black/55">
                <AtSign className="h-4 w-4 text-brand-pink" aria-hidden />
                Instagram
              </span>
              <span className="rounded-full bg-brand-pink/12 px-2 py-0.5 text-[10px] font-black uppercase tracking-[0.12em] text-brand-pink">
                {profileDraft.instagramHandle ? "Collegato" : "Da collegare"}
              </span>
            </span>
            <input
              value={profileDraft.instagramHandle}
              onChange={(event) =>
                updateProfileDraft("instagramHandle", event.target.value)
              }
              onBlur={commitProfileDraft}
              placeholder="@profilo"
              className="mt-2 w-full bg-transparent text-sm font-semibold text-primary-black outline-none placeholder:text-primary-black/35"
            />
          </label>

          <label className="block rounded-2xl border border-primary-black/8 bg-primary-black/[0.02] p-3">
            <span className="flex items-center justify-between gap-3">
              <span className="flex items-center gap-2 text-xs font-bold text-primary-black/55">
                <Phone className="h-4 w-4 text-brand-teal" aria-hidden />
                Numero di telefono
              </span>
              <span className="rounded-full bg-brand-teal/12 px-2 py-0.5 text-[10px] font-black uppercase tracking-[0.12em] text-brand-teal">
                {profileDraft.phoneNumber ? "Collegato" : "Da collegare"}
              </span>
            </span>
            <input
              type="tel"
              value={profileDraft.phoneNumber}
              onChange={(event) =>
                updateProfileDraft("phoneNumber", event.target.value)
              }
              onBlur={commitProfileDraft}
              placeholder="+39 333 000 0000"
              className="mt-2 w-full bg-transparent text-sm font-semibold text-primary-black outline-none placeholder:text-primary-black/35"
            />
          </label>
        </div>
      </section>

      <nav>
        <ul className="divide-y divide-primary-black/8 overflow-hidden rounded-2xl border border-primary-black/10">
          {menuItems.map((item) => (
            <li key={item.label}>
              <button
                type="button"
                onClick={() => {
                  if (item.id === "payments") {
                    setPaymentsOpen((current) => !current);
                  }
                }}
                className="flex w-full items-center gap-3 px-4 py-3.5 text-left transition-colors hover:bg-primary-black/[0.03]"
                aria-expanded={item.id === "payments" ? paymentsOpen : undefined}
              >
                <item.icon
                  className="h-5 w-5 text-primary-black/50"
                  aria-hidden
                />
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-medium text-primary-black">
                    {item.label}
                  </span>
                  {"description" in item && item.description && (
                    <span className="mt-0.5 block text-xs leading-snug text-primary-black/50">
                      {item.description}
                    </span>
                  )}
                </span>
                <ChevronRight
                  className="h-4 w-4 text-primary-black/30"
                  aria-hidden
                />
              </button>
            </li>
          ))}
        </ul>
      </nav>

      {paymentsOpen && (
        <section className="space-y-4 rounded-2xl border border-primary-black/10 bg-background p-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h2 className="flex items-center gap-2 text-sm font-bold text-primary-black">
                <CreditCard className="h-4 w-4 text-brand-teal" aria-hidden />
                Carta di debito o credito
              </h2>
              <p className="mt-1 text-xs leading-relaxed text-primary-black/55">
                Salva la carta per pagare caparre e servizi più velocemente.
                Numero completo e CVC non vengono mai memorizzati.
              </p>
            </div>
            {currentUser.paymentCard && (
              <span className="rounded-full bg-brand-teal/12 px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.12em] text-brand-teal">
                Salvata
              </span>
            )}
          </div>

          {isGuest ? (
            <div className="rounded-2xl border border-dashed border-primary-black/15 bg-primary-black/[0.02] px-4 py-5 text-center">
              <LockKeyhole className="mx-auto h-5 w-5 text-primary-black/40" aria-hidden />
              <p className="mt-2 text-sm font-semibold text-primary-black">
                Accedi per salvare una carta
              </p>
              <p className="mt-1 text-xs text-primary-black/55">
                Serve un account VibeUp per registrare in sicurezza il metodo di
                pagamento.
              </p>
            </div>
          ) : (
            <>
              {currentUser.paymentCard && (
                <div className="rounded-2xl border border-brand-teal/20 bg-brand-teal/8 p-4">
                  <div className="flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-xs font-black uppercase tracking-[0.16em] text-brand-teal">
                        Carta salvata in modo sicuro
                      </p>
                      <p className="mt-1 text-lg font-black text-primary-black">
                        {currentUser.paymentCard.brand} ••••{" "}
                        {currentUser.paymentCard.last4}
                      </p>
                      <p className="mt-1 text-xs text-primary-black/55">
                        {currentUser.paymentCard.cardholderName} · scade{" "}
                        {currentUser.paymentCard.expiry}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={handleRemoveCard}
                      className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-background text-primary-black/45 shadow-sm transition-colors hover:text-brand-pink"
                      aria-label="Rimuovi carta salvata"
                    >
                      <Trash2 className="h-4 w-4" aria-hidden />
                    </button>
                  </div>
                </div>
              )}

              <div className="grid gap-3 sm:grid-cols-2">
                <label className="block sm:col-span-2">
                  <span className="text-xs font-bold text-primary-black/55">
                    Intestatario
                  </span>
                  <input
                    autoComplete="cc-name"
                    value={cardDraft.cardholderName}
                    onChange={(event) =>
                      setCardDraft((current) => ({
                        ...current,
                        cardholderName: event.target.value,
                      }))
                    }
                    placeholder="Nome e cognome"
                    className="mt-1 w-full rounded-2xl border border-primary-black/10 bg-background px-3 py-2.5 text-sm font-semibold text-primary-black outline-none placeholder:text-primary-black/35 focus:border-brand-teal"
                  />
                </label>

                <label className="block sm:col-span-2">
                  <span className="text-xs font-bold text-primary-black/55">
                    Numero carta
                  </span>
                  <input
                    inputMode="numeric"
                    autoComplete="cc-number"
                    name="cardnumber"
                    value={cardDraft.cardNumber}
                    onChange={(event) =>
                      setCardDraft((current) => ({
                        ...current,
                        cardNumber: formatCardNumber(event.target.value),
                      }))
                    }
                    placeholder="1234 5678 9012 3456"
                    className="mt-1 w-full rounded-2xl border border-primary-black/10 bg-background px-3 py-2.5 text-sm font-semibold text-primary-black outline-none placeholder:text-primary-black/35 focus:border-brand-teal"
                  />
                  {cardDraft.cardNumber.replace(/\D/g, "").length >= 4 && (
                    <span className="mt-1 block text-[11px] text-primary-black/45">
                      Circuito rilevato: {getCardBrand(cardDraft.cardNumber)}
                    </span>
                  )}
                </label>

                <label className="block">
                  <span className="text-xs font-bold text-primary-black/55">
                    Scadenza
                  </span>
                  <input
                    inputMode="numeric"
                    autoComplete="cc-exp"
                    value={cardDraft.expiry}
                    onChange={(event) =>
                      setCardDraft((current) => ({
                        ...current,
                        expiry: formatExpiry(event.target.value),
                      }))
                    }
                    placeholder="MM/AA"
                    className="mt-1 w-full rounded-2xl border border-primary-black/10 bg-background px-3 py-2.5 text-sm font-semibold text-primary-black outline-none placeholder:text-primary-black/35 focus:border-brand-teal"
                  />
                </label>

                <label className="block">
                  <span className="text-xs font-bold text-primary-black/55">
                    CVC
                  </span>
                  <input
                    inputMode="numeric"
                    autoComplete="cc-csc"
                    type="password"
                    name="cvc"
                    value={cardDraft.cvc}
                    onChange={(event) =>
                      setCardDraft((current) => ({
                        ...current,
                        cvc: event.target.value.replace(/\D/g, "").slice(0, 4),
                      }))
                    }
                    placeholder="•••"
                    className="mt-1 w-full rounded-2xl border border-primary-black/10 bg-background px-3 py-2.5 text-sm font-semibold text-primary-black outline-none placeholder:text-primary-black/35 focus:border-brand-teal"
                  />
                </label>
              </div>

              {cardError && (
                <p className="rounded-2xl bg-brand-pink/10 px-3 py-2 text-xs font-semibold text-brand-pink">
                  {cardError}
                </p>
              )}

              {cardSavedFlash && (
                <p className="rounded-2xl bg-brand-teal/12 px-3 py-2 text-xs font-semibold text-brand-teal">
                  Carta salvata. Conserviamo solo circuito, scadenza e ultime 4
                  cifre.
                </p>
              )}

              <div className="flex items-start gap-2 rounded-2xl bg-primary-black/[0.03] px-3 py-2.5">
                <LockKeyhole
                  className="mt-0.5 h-4 w-4 shrink-0 text-primary-black/45"
                  aria-hidden
                />
                <p className="text-xs leading-relaxed text-primary-black/55">
                  Per sicurezza il numero completo e il CVC restano solo in
                  memoria durante l&apos;inserimento e vengono cancellati subito
                  dopo il salvataggio. Su VibeUp restano solo i dati mascherati
                  della carta.
                </p>
              </div>

              <button
                type="button"
                onClick={handleSaveCard}
                className="w-full rounded-2xl bg-primary-black px-4 py-3 text-sm font-black text-white transition-colors hover:bg-primary-black/90"
              >
                {currentUser.paymentCard
                  ? "Aggiorna carta salvata"
                  : "Salva carta in modo sicuro"}
              </button>
            </>
          )}
        </section>
      )}

      <section className="space-y-3 rounded-2xl border border-primary-black/10 bg-background p-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="flex items-center gap-2 text-sm font-bold text-primary-black">
              <Heart className="h-4 w-4 text-brand-pink" aria-hidden />
              Location preferite
            </h2>
            <p className="mt-1 text-xs text-primary-black/55">
              Le location salvate con il cuore compariranno qui.
            </p>
          </div>
          {favoriteLocations.length > 0 && (
            <span className="rounded-full bg-brand-pink/15 px-2.5 py-1 text-xs font-bold text-brand-pink">
              {favoriteLocations.length}
            </span>
          )}
        </div>

        {favoriteLocations.length > 0 ? (
          <ul className="space-y-2">
            {favoriteLocations.map((location) => (
              <li
                key={location.id}
                className="relative overflow-hidden rounded-2xl border border-primary-black/8 bg-primary-black/[0.02]"
              >
                {(() => {
                  const price = getLocationPricePresentation(location);
                  return (
                <Link
                  href={`/location/${location.id}`}
                  className="flex gap-3 p-2 pr-11"
                >
                  <div className="relative h-20 w-24 shrink-0 overflow-hidden rounded-xl">
                    <SafeImage
                      src={location.imageUrl}
                      alt={location.name}
                      fill
                      className="object-cover"
                      sizes="96px"
                    />
                  </div>
                  <div className="min-w-0 py-1">
                    <p className="truncate text-sm font-semibold text-primary-black">
                      {location.name}
                    </p>
                    <p className="mt-1 flex items-center gap-1 text-xs text-primary-black/50">
                      <MapPin className="h-3 w-3 shrink-0" aria-hidden />
                      <span className="truncate">
                        {location.zoneLabel} · {location.comune}
                      </span>
                    </p>
                    <p className="mt-2 text-xs font-bold text-brand-teal">
                      {price.eyebrow} {price.price} {price.unit}
                    </p>
                    <p className="mt-0.5 text-[10px] font-semibold text-primary-black/45">
                      {price.badge}
                    </p>
                  </div>
                </Link>
                  );
                })()}
                <button
                  type="button"
                  onClick={() => removeFavoriteLocation(location.id)}
                  className="absolute right-2 top-2 flex h-7 w-7 items-center justify-center rounded-full bg-background text-primary-black/45 shadow-sm transition-colors hover:text-brand-pink"
                  aria-label={`Rimuovi ${location.name} dai preferiti`}
                >
                  <X className="h-3.5 w-3.5" aria-hidden />
                </button>
              </li>
            ))}
          </ul>
        ) : (
          <div className="rounded-2xl border border-dashed border-primary-black/12 bg-primary-black/[0.02] px-4 py-5 text-center">
            <p className="text-sm font-medium text-primary-black">
              Nessuna location preferita
            </p>
            <p className="mt-1 text-xs text-primary-black/55">
              Tocca il cuore su una location per salvarla nel profilo.
            </p>
          </div>
        )}
      </section>

      <section className="space-y-3 rounded-2xl border border-primary-black/10 bg-background p-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="flex items-center gap-2 text-sm font-bold text-primary-black">
              <Heart className="h-4 w-4 text-brand-pink" aria-hidden />
              Servizi preferiti
            </h2>
            <p className="mt-1 text-xs text-primary-black/55">
              DJ, fotografi, decorazioni e altri servizi salvati con il cuore.
            </p>
          </div>
          {favoriteServices.length > 0 && (
            <span className="rounded-full bg-brand-pink/15 px-2.5 py-1 text-xs font-bold text-brand-pink">
              {favoriteServices.length}
            </span>
          )}
        </div>

        {favoriteServices.length > 0 ? (
          <ul className="space-y-2">
            {favoriteServices.map((service) => (
              <li
                key={service.id}
                className="relative overflow-hidden rounded-2xl border border-primary-black/8 bg-primary-black/[0.02]"
              >
                <Link
                  href={`/service/${service.id}?category=${service.category}`}
                  className="flex gap-3 p-2 pr-11"
                >
                  <div className="relative flex h-20 w-24 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-brand-teal/10 text-brand-teal">
                    {service.imageUrl ? (
                      <SafeImage
                        src={service.imageUrl}
                        alt={service.name}
                        fill
                        className="object-cover"
                        sizes="96px"
                      />
                    ) : (
                      <Briefcase className="h-6 w-6" aria-hidden />
                    )}
                  </div>
                  <div className="min-w-0 py-1">
                    <p className="truncate text-sm font-semibold text-primary-black">
                      {service.name}
                    </p>
                    <p className="mt-1 flex items-center gap-1 text-xs text-primary-black/50">
                      <MapPin className="h-3 w-3 shrink-0" aria-hidden />
                      <span className="truncate">{service.providerZone}</span>
                    </p>
                    <p className="mt-2 text-xs font-bold text-brand-teal">
                      {formatCurrency(service.price)}/{service.priceSuffix}
                    </p>
                  </div>
                </Link>
                <button
                  type="button"
                  onClick={() => removeFavoriteService(service.id)}
                  className="absolute right-2 top-2 flex h-7 w-7 items-center justify-center rounded-full bg-background text-primary-black/45 shadow-sm transition-colors hover:text-brand-pink"
                  aria-label={`Rimuovi ${service.name} dai preferiti`}
                >
                  <X className="h-3.5 w-3.5" aria-hidden />
                </button>
              </li>
            ))}
          </ul>
        ) : (
          <div className="rounded-2xl border border-dashed border-primary-black/12 bg-primary-black/[0.02] px-4 py-5 text-center">
            <p className="text-sm font-medium text-primary-black">
              Nessun servizio preferito
            </p>
            <p className="mt-1 text-xs text-primary-black/55">
              Tocca il cuore su DJ, fotografi, decorazioni o altri servizi per
              salvarli qui.
            </p>
          </div>
        )}
      </section>

      <section className="space-y-3 rounded-2xl border border-primary-black/10 bg-background p-4">
        <div className="flex min-w-0 items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <h2 className="text-sm font-bold text-primary-black">
              {isGuest ? "Crea il tuo account" : "Account disponibili"}
            </h2>
            <p className="mt-1 text-xs text-primary-black/55">
              {isGuest
                ? "Crea un account per salvare preferiti, confrontare locali e generare preventivi."
                : "Tocca per cambiare account. Tieni premuto per eliminarlo."}
            </p>
          </div>
          <button
            type="button"
            onClick={() => {
              setAddAccountOpen((current) => !current);
              setAccountPendingDelete(null);
            }}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary-black text-white transition-colors hover:bg-primary-black/85"
            aria-label={addAccountOpen ? "Chiudi form nuovo account" : "Aggiungi account"}
            aria-expanded={addAccountOpen}
          >
            {addAccountOpen ? (
              <X className="h-4 w-4" aria-hidden />
            ) : (
              <Plus className="h-4 w-4" aria-hidden />
            )}
          </button>
        </div>

        <div className="space-y-2">
          {accounts.map((account) => (
            <button
              key={account.id}
              type="button"
              onClick={() => handleAccountClick(account.id)}
              onPointerDown={() =>
                startAccountLongPress({
                  id: account.id,
                  name: account.name,
                  email: account.email,
                })
              }
              onPointerUp={clearLongPressTimer}
              onPointerLeave={clearLongPressTimer}
              onPointerCancel={clearLongPressTimer}
              onContextMenu={(event) => {
                event.preventDefault();
                clearLongPressTimer();
                setAccountPendingDelete({
                  id: account.id,
                  name: account.name,
                  email: account.email,
                });
              }}
              className={`flex w-full touch-manipulation items-center gap-3 rounded-2xl border px-3 py-2.5 text-left transition-colors select-none ${
                account.id === currentUser.id
                  ? "border-brand-teal bg-brand-teal/8"
                  : "border-primary-black/8 bg-primary-black/[0.02]"
              }`}
            >
              <span className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-full bg-brand-pink/20 text-brand-pink">
                {account.avatarUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={account.avatarUrl}
                    alt=""
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <User className="h-4 w-4" aria-hidden />
                )}
              </span>
              <span className="min-w-0">
                <span className="block truncate text-sm font-semibold text-primary-black">
                  {account.name}
                </span>
                <span className="block truncate text-xs text-primary-black/55">
                  {account.email}
                </span>
              </span>
            </button>
          ))}
        </div>

        {addAccountOpen && (
          <div className="space-y-2 rounded-2xl border border-primary-black/10 bg-primary-black/[0.02] p-3">
            <div className="grid gap-2 sm:grid-cols-2">
              <input
                type="text"
                value={newAccountName}
                onChange={(event) => setNewAccountName(event.target.value)}
                placeholder="Nome account"
                className="rounded-2xl border border-primary-black/10 bg-background px-3 py-2.5 text-sm outline-none focus:border-brand-teal"
              />
              <input
                type="email"
                value={newAccountEmail}
                onChange={(event) => setNewAccountEmail(event.target.value)}
                placeholder="Email"
                className="rounded-2xl border border-primary-black/10 bg-background px-3 py-2.5 text-sm outline-none focus:border-brand-teal"
              />
            </div>
            <button
              type="button"
              onClick={handleCreateAccount}
              className="w-full rounded-2xl bg-primary-black px-4 py-3 text-sm font-semibold text-white"
            >
              {isGuest ? "Crea account" : "Aggiungi account"}
            </button>
          </div>
        )}
      </section>

      {accountPendingDelete && (
        <div
          className="vibe-overlay-enter fixed inset-0 z-[70] flex items-center justify-center p-6"
          data-overlay-open="true"
        >
          <button
            type="button"
            className="absolute inset-0 bg-primary-black/45"
            onClick={() => setAccountPendingDelete(null)}
            aria-label="Annulla eliminazione"
          />
          <div
            className="vibe-sheet-enter relative max-h-[min(90dvh,calc(100dvh-2rem))] w-full max-w-sm overflow-y-auto rounded-3xl bg-background p-5 shadow-xl"
            role="dialog"
            aria-modal="true"
            aria-labelledby="delete-account-title"
          >
            <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-brand-pink/15 text-brand-pink">
              <Trash2 className="h-5 w-5" aria-hidden />
            </div>
            <h3
              id="delete-account-title"
              className="text-center text-lg font-bold text-primary-black"
            >
              Eliminare questo account?
            </h3>
            <p className="mt-2 text-center text-sm text-primary-black/60">
              Stai per rimuovere{" "}
              <span className="font-semibold text-primary-black">
                {accountPendingDelete.name}
              </span>{" "}
              ({accountPendingDelete.email}). L’azione non si può annullare.
            </p>
            <div className="mt-5 grid gap-2 sm:grid-cols-2">
              <button
                type="button"
                onClick={() => setAccountPendingDelete(null)}
                className="rounded-2xl border border-primary-black/10 px-4 py-3 text-sm font-semibold text-primary-black"
              >
                Annulla
              </button>
              <button
                type="button"
                onClick={confirmDeleteAccount}
                className="rounded-2xl bg-brand-pink px-4 py-3 text-sm font-semibold text-primary-black"
              >
                Elimina
              </button>
            </div>
          </div>
        </div>
      )}

      {isBusinessUser && businessProfile && (
        <section className="rounded-2xl border border-brand-teal/20 bg-brand-teal/5 p-4">
          <div className="flex items-center gap-2">
            <Briefcase className="h-4 w-4 text-brand-teal" aria-hidden />
            <p className="text-sm font-semibold text-primary-black">
              {businessProfile.businessName}
            </p>
          </div>
          <p className="mt-1 text-xs text-primary-black/60">
            {BUSINESS_CATEGORY_LABELS[businessProfile.category]}
          </p>
          {businessProfile.category === "locale" && (
            <p className="mt-2 text-xs text-primary-black/50">
              {businessProfile.maxCapacity} ospiti ·{" "}
              A partire da {formatCurrency(businessProfile.hourlyPrice * 4)} / Evento
            </p>
          )}
          {(businessProfile.category === "dj" ||
            businessProfile.category === "fotografo") && (
            <p className="mt-2 text-xs text-primary-black/50">
              {formatCurrency(businessProfile.rateAmount)}{" "}
              {businessProfile.rateType === "hourly" ? "/ora" : "fisso"}
            </p>
          )}
          {(businessProfile.category === "pasticceria" ||
            businessProfile.category === "decorazioni") && (
            <p className="mt-2 text-xs text-primary-black/50">
              {businessProfile.catalog.length} prodotti nel catalogo
            </p>
          )}
        </section>
      )}

      <Link
        href="/business/onboarding"
        className="flex w-full items-center justify-center gap-2 rounded-2xl bg-brand-pink py-3.5 text-sm font-semibold text-primary-black transition-colors hover:bg-brand-pink/90"
      >
        <Briefcase className="h-4 w-4" aria-hidden />
        {isBusinessUser ? "Modifica profilo Business" : "Passa a Business"}
      </Link>

      <button
        type="button"
        onClick={() => switchAccount(GUEST_USER.id)}
        className="flex w-full items-center justify-center gap-2 rounded-2xl border border-primary-black/10 py-3.5 text-sm font-medium text-primary-black/70 transition-colors hover:bg-primary-black/[0.03]"
      >
        <LogOut className="h-4 w-4" aria-hidden />
        Esci dall&apos;account
      </button>

      {canManagePublications && (
        <Link
          href="/admin/catalog"
          className="block text-center text-xs font-medium text-primary-black/35 underline-offset-4 transition-colors hover:text-primary-black/55 hover:underline"
        >
          Area gestione pubblicazioni
        </Link>
      )}
    </div>
  );
}
