"use client";

import {
  Camera,
  Bell,
  Check,
  ChevronRight,
  HelpCircle,
  LockKeyhole,
  LogIn,
  LogOut,
  Pencil,
  Plus,
  ShieldCheck,
  Settings,
  Trash2,
  User,
  Bookmark,
  Briefcase,
  Heart,
  X,
} from "lucide-react";
import { BusinessPublicationsPanel } from "@/components/business/business-publications-panel";
import { AvatarCropModal } from "@/components/profile/avatar-crop-modal";
import { ProfileSettingsView } from "@/components/profile/settings/profile-settings-view";
import { HardNavLink } from "@/components/navigation/hard-nav-link";
import { useAccountGate } from "@/context/account-gate-context";
import { GUEST_USER, isProAccount, useAppState } from "@/context/app-state-context";
import { useProfileCommunications } from "@/context/profile-communications-context";
import { canAccessAdminCatalog } from "@/lib/admin-access";
import { BUSINESS_CATEGORY_LABELS } from "@/types/business";
import type { SettingsPanelId } from "@/types/user-settings";
import { formatCurrency } from "@/lib/utils";
import { useBodyScrollLock } from "@/lib/body-scroll-lock";
import { requestActivationEmail } from "@/lib/auth/request-activation-email";
import { useEffect, useRef, useState } from "react";

const primaryMenuItems: Array<{
  id: SettingsPanelId;
  icon: typeof Settings;
  label: string;
  description?: string;
}> = [
  {
    id: "savedQuotes",
    icon: Bookmark,
    label: "Preventivi salvati",
    description: "Confronta i preventivi generati dalle location.",
  },
  { id: "settings", icon: Settings, label: "Impostazioni account" },
  { id: "favorites", icon: Heart, label: "I tuoi preferiti" },
];

const secondaryMenuItems: Array<{
  id: SettingsPanelId;
  icon: typeof Settings;
  label: string;
  description?: string;
}> = [
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

export function ProfileScreen({
  isActive = true,
}: {
  /** When Profile tab is hidden, tear down overlays so scroll stays unlocked. */
  isActive?: boolean;
}) {
  const {
    accounts,
    businessProfile,
    createAccount,
    currentUser,
    deleteAccount,
    isBusinessUser,
    isGuest,
    switchAccount,
    updateCurrentUser,
    isStorageHydrated,
  } = useAppState();
  const { openAuth } = useAccountGate();
  const {
    communications,
    hasUnread: hasUnreadProfileComms,
    markAllSeen: markProfileCommsSeen,
  } = useProfileCommunications();
  const [commsOpen, setCommsOpen] = useState(false);
  const [newAccountName, setNewAccountName] = useState("");
  const [newAccountEmail, setNewAccountEmail] = useState("");
  const [newAccountPhone, setNewAccountPhone] = useState("");
  const [newAccountPassword, setNewAccountPassword] = useState("");
  const [newAccountPasswordConfirm, setNewAccountPasswordConfirm] =
    useState("");
  const [newAccountError, setNewAccountError] = useState<string | null>(null);
  const [creatingAccount, setCreatingAccount] = useState(false);
  const [addAccountOpen, setAddAccountOpen] = useState(false);
  const [accountPendingDelete, setAccountPendingDelete] = useState<{
    id: string;
    name: string;
    email: string;
  } | null>(null);
  useBodyScrollLock(Boolean(accountPendingDelete) || commsOpen);
  const longPressTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const longPressTriggeredRef = useRef(false);

  useEffect(() => {
    return () => {
      if (longPressTimerRef.current) {
        clearTimeout(longPressTimerRef.current);
        longPressTimerRef.current = null;
      }
    };
  }, []);
  const [profileEditOpen, setProfileEditOpen] = useState(false);
  const [avatarCropFile, setAvatarCropFile] = useState<File | null>(null);
  const [settingsPanel, setSettingsPanel] = useState<SettingsPanelId | null>(
    null,
  );
  const [settingsPanelUserId, setSettingsPanelUserId] = useState(currentUser.id);
  const [profileDraft, setProfileDraft] = useState({
    name: currentUser.name,
    email: currentUser.email,
    instagramHandle: currentUser.instagramHandle ?? "",
    phoneNumber: currentUser.phoneNumber ?? "",
  });
  const lastSyncedUserId = useRef(currentUser.id);
  const hasHydratedProfileDraft = useRef(false);
  const canManagePublications = canAccessAdminCatalog(
    currentUser.email,
    currentUser.role,
  );

  // Render-phase clear (same pattern as Events payment modal) so scroll unlocks
  // in the same commit as the tab hide — no one-frame freeze window.
  if (!isActive) {
    if (accountPendingDelete) setAccountPendingDelete(null);
    if (avatarCropFile) setAvatarCropFile(null);
    if (addAccountOpen) setAddAccountOpen(false);
    if (profileEditOpen) setProfileEditOpen(false);
    if (settingsPanel) setSettingsPanel(null);
    if (commsOpen) setCommsOpen(false);
  }

  if (settingsPanelUserId !== currentUser.id) {
    setSettingsPanelUserId(currentUser.id);
    setSettingsPanel(null);
  }

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
    });
  }, [
    currentUser.email,
    currentUser.id,
    currentUser.instagramHandle,
    currentUser.name,
    currentUser.phoneNumber,
    isStorageHydrated,
  ]);

  function handleAvatarFilePick(file: File | undefined) {
    if (!file || !file.type.startsWith("image/")) return;
    setAvatarCropFile(file);
  }

  function handleAvatarCropConfirm(dataUrl: string) {
    updateCurrentUser({ avatarUrl: dataUrl });
    setAvatarCropFile(null);
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

  function confirmProfileEdit() {
    commitProfileDraft();
    setProfileEditOpen(false);
  }

  async function handleCreateAccount() {
    if (creatingAccount) return;
    if (!newAccountEmail.trim()) {
      setNewAccountError("Inserisci un’email valida.");
      return;
    }
    if (newAccountPhone.replace(/\D/g, "").length < 8) {
      setNewAccountError("Inserisci un numero di telefono valido.");
      return;
    }
    if (newAccountPassword.length < 8) {
      setNewAccountError("La password deve avere almeno 8 caratteri.");
      return;
    }
    if (
      !/[A-Za-z]/.test(newAccountPassword) ||
      !/[0-9]/.test(newAccountPassword)
    ) {
      setNewAccountError(
        "La password deve contenere almeno una lettera e un numero.",
      );
      return;
    }
    if (newAccountPassword !== newAccountPasswordConfirm) {
      setNewAccountError("Le password non coincidono.");
      return;
    }

    setCreatingAccount(true);
    setNewAccountError(null);
    const result = await createAccount({
      name: newAccountName,
      email: newAccountEmail,
      phoneNumber: newAccountPhone.trim(),
      password: newAccountPassword,
      requireNew: true,
      mode: "register",
    });
    setCreatingAccount(false);

    if (!result.ok) {
      setNewAccountError(result.error);
      return;
    }

    if (
      result.needsEmailActivation &&
      result.activationToken &&
      result.email
    ) {
      const emailResult = await requestActivationEmail({
        email: result.email,
        name: result.name ?? newAccountName,
        token: result.activationToken,
      });
      if (!emailResult.ok) {
        setNewAccountError(
          `Account creato, ma l’email di attivazione non è partita: ${emailResult.error}`,
        );
      }
    }

    setNewAccountName("");
    setNewAccountEmail("");
    setNewAccountPhone("");
    setNewAccountPassword("");
    setNewAccountPasswordConfirm("");
    if (
      !(
        result.needsEmailActivation &&
        result.activationToken &&
        result.email
      )
    ) {
      setNewAccountError(null);
    }
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
    const account = accounts.find((item) => item.id === accountId);
    if (!account) return;

    // Guest or another Supabase identity → real login (never silent switch).
    if (isGuest || (account.authProvider === "supabase" && account.id !== currentUser.id)) {
      openAuth({
        mode: "login",
        email: account.email,
        reason: `Accedi con ${account.email}`,
      });
      return;
    }

    switchAccount(accountId);
  }

  function confirmDeleteAccount() {
    if (!accountPendingDelete) return;
    deleteAccount(accountPendingDelete.id)
      .then((result) => {
        if (!result.ok) {
          window.alert(result.error);
          return;
        }
        setAccountPendingDelete(null);
      })
      .catch(() => {
        window.alert("Eliminazione non riuscita.");
      });
  }

  if (settingsPanel) {
    return (
      <>
        <ProfileSettingsView
          panel={settingsPanel}
          onClose={() => setSettingsPanel(null)}
        />
        {accountPendingDelete && (
          <div
            className="vibe-overlay-enter fixed inset-0 z-[70] flex items-center justify-center p-6"
            data-overlay-open="true"
          >
            <button
              type="button"
              className="absolute inset-0 bg-black/50"
              onClick={() => setAccountPendingDelete(null)}
              aria-label="Annulla eliminazione"
            />
            <div
              className="vibe-sheet-enter relative max-h-[min(90dvh,calc(100dvh-2rem))] w-full max-w-sm overflow-y-auto rounded-3xl bg-surface p-5 shadow-xl"
              role="dialog"
              aria-modal="true"
              aria-labelledby="delete-account-title-settings"
            >
              <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-brand-pink/15 text-brand-pink">
                <Trash2 className="h-5 w-5" aria-hidden />
              </div>
              <h3
                id="delete-account-title-settings"
                className="text-center text-lg font-bold text-primary-black"
              >
                Eliminare questo account?
              </h3>
              <p className="mt-2 text-center text-sm text-primary-black/60">
                Stai per rimuovere{" "}
                <span className="font-semibold text-primary-black">
                  {accountPendingDelete.name}
                </span>
                . Preferiti, eventi e impostazioni di questo account verranno
                cancellati da questo dispositivo.
              </p>
              <div className="mt-5 grid gap-2">
                <button
                  type="button"
                  onClick={confirmDeleteAccount}
                  className="w-full rounded-2xl bg-brand-pink px-4 py-3 text-sm font-black text-primary-black"
                >
                  Elimina account
                </button>
                <button
                  type="button"
                  onClick={() => setAccountPendingDelete(null)}
                  className="w-full rounded-2xl border border-primary-black/10 px-4 py-3 text-sm font-bold text-primary-black"
                >
                  Annulla
                </button>
              </div>
            </div>
          </div>
        )}
      </>
    );
  }

  return (
    <div className="min-w-0 space-y-6">
      <header className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-[1.75rem] font-extrabold tracking-tight text-primary-black">
            Profilo
          </h1>
          <p className="mt-1 text-sm text-primary-black/60">
            Impostazioni e gestione account
          </p>
        </div>
        {!isBusinessUser && (
          <button
            type="button"
            onClick={() => {
              setCommsOpen(true);
              markProfileCommsSeen();
            }}
            className="relative mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-primary-black/10 bg-background text-primary-black/70 transition-colors hover:border-primary-black/25 hover:text-primary-black"
            aria-label={
              hasUnreadProfileComms
                ? "Comunicazioni VibeUp, nuove notifiche"
                : "Comunicazioni VibeUp"
            }
            aria-expanded={commsOpen}
          >
            <Bell className="h-5 w-5" aria-hidden />
            {hasUnreadProfileComms && (
              <span
                className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-[#FF3B30] ring-2 ring-background"
                aria-hidden
              />
            )}
          </button>
        )}
      </header>

      {commsOpen && !isBusinessUser && (
        <div
          className="vibe-overlay-enter fixed inset-0 z-[85] flex items-end justify-center p-4 sm:items-center"
          data-overlay-open="true"
        >
          <button
            type="button"
            className="absolute inset-0 bg-black/60"
            aria-label="Chiudi comunicazioni"
            onClick={() => setCommsOpen(false)}
          />
          <div
            className="vibe-sheet-enter relative flex max-h-[80vh] w-full max-w-md flex-col rounded-3xl bg-background shadow-xl"
            role="dialog"
            aria-modal="true"
            aria-labelledby="profile-comms-title"
          >
            <div className="flex items-center justify-between gap-3 border-b border-primary-black/8 px-5 py-4">
              <div className="min-w-0">
                <h2
                  id="profile-comms-title"
                  className="text-lg font-bold text-primary-black"
                >
                  Comunicazioni VibeUp
                </h2>
                <p className="mt-0.5 text-xs text-primary-black/50">
                  Avvisi importanti sul tuo account e sugli eventi
                </p>
              </div>
              <button
                type="button"
                onClick={() => setCommsOpen(false)}
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-primary-black/10 text-primary-black/55"
                aria-label="Chiudi"
              >
                <X className="h-4 w-4" aria-hidden />
              </button>
            </div>

            <ul className="min-h-0 flex-1 space-y-3 overflow-y-auto px-5 py-4">
              {communications.length === 0 ? (
                <li className="rounded-2xl border border-dashed border-primary-black/12 px-4 py-6 text-center text-sm text-primary-black/55">
                  Nessuna comunicazione al momento.
                </li>
              ) : (
                communications.map((item) => (
                  <li
                    key={item.id}
                    className="rounded-2xl border border-primary-black/8 bg-primary-black/[0.02] p-4"
                  >
                    <div className="flex items-start gap-2">
                      <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-brand-pink/15 text-brand-pink">
                        <Bell className="h-4 w-4" aria-hidden />
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-bold text-primary-black">
                          {item.title}
                        </p>
                        <p className="mt-1 text-sm leading-relaxed text-primary-black/65">
                          {item.body}
                        </p>
                      </div>
                    </div>
                  </li>
                ))
              )}
            </ul>
          </div>
        </div>
      )}

      <div className="rounded-2xl border border-primary-black/10 bg-primary-black/[0.02] p-5">
        <div className="flex min-w-0 items-center gap-4">
          <div className="relative flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-full bg-brand-pink/20 text-brand-pink">
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
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate font-semibold text-primary-black">{currentUser.name}</p>
            <p className="truncate text-sm text-primary-black/60">
              {isGuest ? "Nessun account creato" : currentUser.email}
            </p>
            <span
              className={`mt-1 inline-block rounded-full px-2.5 py-0.5 text-xs font-medium ${
                isGuest
                  ? "bg-primary-black/8 text-primary-black/60"
                  : isBusinessUser
                    ? "bg-amber-400/25 font-semibold text-amber-700"
                    : "bg-brand-teal/15 text-brand-teal"
              }`}
            >
              {isGuest ? "Ospite" : isBusinessUser ? "Pro" : "Piano gratuito"}
            </span>
          </div>
          {profileEditOpen ? (
            <button
              type="button"
              onClick={confirmProfileEdit}
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-brand-teal/30 bg-brand-teal/15 text-brand-teal transition-colors hover:bg-brand-teal/25"
              aria-label="Conferma modifiche profilo"
            >
              <Check className="h-4 w-4" aria-hidden />
            </button>
          ) : (
            <button
              type="button"
              onClick={() => setProfileEditOpen(true)}
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-primary-black/10 bg-background text-primary-black/65 transition-colors hover:border-primary-black/25 hover:text-primary-black"
              aria-label="Modifica profilo"
              aria-expanded={false}
            >
              <Pencil className="h-4 w-4" aria-hidden />
            </button>
          )}
        </div>

        {profileEditOpen && (
          <div className="mt-4 rounded-2xl border border-primary-black/8 bg-surface p-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h2 className="text-sm font-bold text-primary-black">
                  Modifica profilo
                </h2>
                <p className="mt-0.5 text-xs text-primary-black/55">
                  Aggiorna foto, nome utente e contatti principali.
                </p>
              </div>
              <label className="flex shrink-0 cursor-pointer items-center gap-2 rounded-full bg-paper px-3 py-2 text-xs font-black text-ink-inverse">
                <Camera className="h-3.5 w-3.5" aria-hidden />
                Foto
                <input
                  type="file"
                  accept="image/*"
                  className="sr-only"
                  onChange={(event) => {
                    handleAvatarFilePick(event.target.files?.[0]);
                    event.target.value = "";
                  }}
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
                  placeholder="+39 333 000 0000"
                  className="mt-1 w-full rounded-2xl border border-primary-black/10 bg-background px-3 py-2.5 text-sm font-semibold text-primary-black outline-none placeholder:text-primary-black/35 focus:border-brand-teal"
                />
              </label>
            </div>
          </div>
        )}
      </div>

      <nav>
        <ul className="divide-y divide-primary-black/8 overflow-hidden rounded-2xl border border-primary-black/10">
          {primaryMenuItems.map((item) => (
            <li key={item.label}>
              <button
                type="button"
                onClick={() => {
                  window.scrollTo({ top: 0, left: 0, behavior: "auto" });
                  setSettingsPanel(item.id);
                }}
                className="flex w-full items-center gap-3 px-4 py-3.5 text-left transition-colors hover:bg-primary-black/[0.03]"
              >
                <item.icon
                  className="h-5 w-5 text-primary-black/50"
                  aria-hidden
                />
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-medium text-primary-black">
                    {item.label}
                  </span>
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

      <nav>
        <ul className="divide-y divide-primary-black/8 overflow-hidden rounded-2xl border border-primary-black/10">
          {secondaryMenuItems.map((item) => (
            <li key={item.label}>
              <button
                type="button"
                onClick={() => {
                  window.scrollTo({ top: 0, left: 0, behavior: "auto" });
                  setSettingsPanel(item.id);
                }}
                className="flex w-full items-center gap-3 px-4 py-3.5 text-left transition-colors hover:bg-primary-black/[0.03]"
              >
                <item.icon
                  className="h-5 w-5 text-primary-black/50"
                  aria-hidden
                />
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-medium text-primary-black">
                    {item.label}
                  </span>
                  {item.description && (
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

      <section className="space-y-3 rounded-2xl border border-primary-black/10 bg-surface p-4">
        <div className="flex min-w-0 items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <h2 className="text-sm font-bold text-primary-black">
              {isGuest ? "Il tuo account" : "Account disponibili"}
            </h2>
            <p className="mt-1 text-xs text-primary-black/55">
              {isGuest
                ? "Hai già un account? Accedi. Altrimenti registrati in pochi secondi."
                : "Tocca per cambiare account. Tieni premuto per eliminarlo."}
            </p>
          </div>
          {!isGuest && (
            <button
              type="button"
              onClick={() => {
                setAddAccountOpen((current) => !current);
                setAccountPendingDelete(null);
              }}
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white/12 text-primary-black transition-colors hover:bg-surface/85"
              aria-label={
                addAccountOpen ? "Chiudi form nuovo account" : "Aggiungi account"
              }
              aria-expanded={addAccountOpen}
            >
              {addAccountOpen ? (
                <X className="h-4 w-4" aria-hidden />
              ) : (
                <Plus className="h-4 w-4" aria-hidden />
              )}
            </button>
          )}
        </div>

        {isGuest && (
          <div className="grid gap-2 sm:grid-cols-2">
            <button
              type="button"
              onClick={() =>
                openAuth({
                  mode: "login",
                  reason: "Accedi al tuo account VibeUp.",
                })
              }
              className="inline-flex items-center justify-center gap-2 rounded-2xl bg-brand-teal px-4 py-3 text-sm font-bold text-ink-inverse transition-colors hover:bg-brand-teal/90"
            >
              <LogIn className="h-4 w-4" aria-hidden />
              Accedi
            </button>
            <button
              type="button"
              onClick={() =>
                openAuth({
                  mode: "register",
                  reason: "Crea un account per salvare preferiti e preventivi.",
                })
              }
              className="inline-flex items-center justify-center gap-2 rounded-2xl border border-primary-black/15 bg-background px-4 py-3 text-sm font-bold text-primary-black transition-colors hover:bg-primary-black/[0.04]"
            >
              <User className="h-4 w-4" aria-hidden />
              Registrati
            </button>
          </div>
        )}

        <div className="space-y-2">
          {accounts.map((account) => {
            const isSelected = account.id === currentUser.id;

            return (
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
                  isSelected
                    ? "border-brand-teal bg-paper"
                    : "border-primary-black/10 bg-background"
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
                <span className="min-w-0 flex-1">
                  <span
                    className={`block truncate text-sm font-semibold ${
                      isSelected ? "text-ink-inverse" : "text-primary-black"
                    }`}
                  >
                    {account.name}
                  </span>
                  <span
                    className={`block truncate text-xs ${
                      isSelected
                        ? "text-ink-inverse/55"
                        : "text-primary-black/55"
                    }`}
                  >
                    {account.email}
                  </span>
                </span>
                {isProAccount(account) && (
                  <span
                    className={`shrink-0 rounded-md px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide ${
                      isSelected
                        ? "bg-amber-400/25 text-amber-700"
                        : "bg-amber-400/20 text-amber-300"
                    }`}
                  >
                    Pro
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {addAccountOpen && (
          <div className="space-y-2 rounded-2xl border border-primary-black/10 bg-primary-black/[0.02] p-3">
            <div className="grid gap-2 sm:grid-cols-2">
              <input
                type="text"
                value={newAccountName}
                onChange={(event) => setNewAccountName(event.target.value)}
                placeholder="Nome account"
                className="rounded-2xl border border-primary-black/10 bg-background px-3 py-2.5 text-base text-primary-black outline-none placeholder:text-primary-black/40 focus:border-brand-teal"
              />
              <input
                type="email"
                value={newAccountEmail}
                onChange={(event) => {
                  setNewAccountEmail(event.target.value);
                  setNewAccountError(null);
                }}
                placeholder="Email"
                className="rounded-2xl border border-primary-black/10 bg-background px-3 py-2.5 text-base text-primary-black outline-none placeholder:text-primary-black/40 focus:border-brand-teal"
              />
              <input
                type="tel"
                value={newAccountPhone}
                onChange={(event) => {
                  setNewAccountPhone(event.target.value);
                  setNewAccountError(null);
                }}
                placeholder="Numero di telefono"
                autoComplete="tel"
                inputMode="tel"
                className="rounded-2xl border border-primary-black/10 bg-background px-3 py-2.5 text-base text-primary-black outline-none placeholder:text-primary-black/40 focus:border-brand-teal"
              />
              <input
                type="password"
                value={newAccountPassword}
                onChange={(event) => {
                  setNewAccountPassword(event.target.value);
                  setNewAccountError(null);
                }}
                placeholder="Password"
                autoComplete="new-password"
                className="rounded-2xl border border-primary-black/10 bg-background px-3 py-2.5 text-base text-primary-black outline-none placeholder:text-primary-black/40 focus:border-brand-teal"
              />
              <input
                type="password"
                value={newAccountPasswordConfirm}
                onChange={(event) => {
                  setNewAccountPasswordConfirm(event.target.value);
                  setNewAccountError(null);
                }}
                placeholder="Conferma password"
                autoComplete="new-password"
                className="rounded-2xl border border-primary-black/10 bg-background px-3 py-2.5 text-base text-primary-black outline-none placeholder:text-primary-black/40 focus:border-brand-teal sm:col-span-2"
              />
            </div>
            {newAccountError && (
              <p className="text-xs font-semibold text-brand-pink">
                {newAccountError}
              </p>
            )}
            <button
              type="button"
              disabled={creatingAccount}
              onClick={() => void handleCreateAccount()}
              className="w-full rounded-2xl bg-paper px-4 py-3 text-sm font-semibold text-ink-inverse disabled:opacity-60"
            >
              {creatingAccount
                ? "Creo account…"
                : isGuest
                  ? "Crea account"
                  : "Aggiungi account"}
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
            className="absolute inset-0 bg-black/50"
            onClick={() => setAccountPendingDelete(null)}
            aria-label="Annulla eliminazione"
          />
          <div
            className="vibe-sheet-enter relative max-h-[min(90dvh,calc(100dvh-2rem))] w-full max-w-sm overflow-y-auto rounded-3xl bg-surface p-5 shadow-xl"
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
        <section className="rounded-2xl border border-amber-400/35 bg-amber-400/10 p-4">
          <div className="flex items-center gap-2">
            <Briefcase className="h-4 w-4 text-amber-700" aria-hidden />
            <p className="text-sm font-semibold text-primary-black">
              {businessProfile.businessName}
            </p>
            <span className="ml-auto rounded-md bg-amber-400/40 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-amber-800">
              Pro
            </span>
          </div>
          <p className="mt-1 text-xs text-primary-black/60">
            {BUSINESS_CATEGORY_LABELS[businessProfile.category]}
          </p>
          {businessProfile.category === "locale" && (
            <p className="mt-2 text-xs text-primary-black/50">
              {businessProfile.address}
              {typeof businessProfile.maxCapacity === "number" &&
                businessProfile.maxCapacity > 0 && (
                  <> · {businessProfile.maxCapacity} ospiti</>
                )}
              {typeof businessProfile.hourlyPrice === "number" &&
                businessProfile.hourlyPrice > 0 && (
                  <>
                    {" "}
                    · A partire da{" "}
                    {formatCurrency(businessProfile.hourlyPrice * 4)} / Evento
                  </>
                )}
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

      {isBusinessUser ? <BusinessPublicationsPanel /> : null}

      {!isBusinessUser && (
        <HardNavLink
          href="/business/onboarding"
          className="flex w-full items-center justify-center gap-2 rounded-2xl bg-brand-pink py-3.5 text-sm font-semibold text-primary-black transition-colors hover:bg-brand-pink/90"
        >
          <Briefcase className="h-4 w-4" aria-hidden />
          Passa a Business
        </HardNavLink>
      )}

      {isBusinessUser && (
        <HardNavLink
          href="/business/onboarding"
          className="flex w-full items-center justify-center gap-2 rounded-2xl border border-amber-400/40 bg-amber-400/15 py-3.5 text-sm font-semibold text-amber-900 transition-colors hover:bg-amber-400/25"
        >
          <Briefcase className="h-4 w-4" aria-hidden />
          Modifica profilo Business
        </HardNavLink>
      )}

      <button
        type="button"
        onClick={() => switchAccount(GUEST_USER.id)}
        className="flex w-full items-center justify-center gap-2 rounded-2xl border border-primary-black/10 py-3.5 text-sm font-medium text-primary-black/70 transition-colors hover:bg-primary-black/[0.03]"
      >
        <LogOut className="h-4 w-4" aria-hidden />
        Esci dall&apos;account
      </button>

      {canManagePublications && (
        <HardNavLink
          href="/admin/catalog"
          className="block text-center text-xs font-medium text-primary-black/35 underline-offset-4 transition-colors hover:text-primary-black/55 hover:underline"
        >
          Area gestione pubblicazioni
        </HardNavLink>
      )}

      {avatarCropFile && (
        <AvatarCropModal
          file={avatarCropFile}
          onCancel={() => setAvatarCropFile(null)}
          onConfirm={handleAvatarCropConfirm}
        />
      )}
    </div>
  );
}
