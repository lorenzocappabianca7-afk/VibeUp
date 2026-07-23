"use client";

import {
  SettingsInfoCard,
  SettingsNavRow,
  SettingsSection,
} from "@/components/profile/settings/settings-section";
import { SettingsShell } from "@/components/profile/settings/settings-shell";
import { useAppState } from "@/context/app-state-context";
import {
  createSavedPaymentCard,
  formatCardNumber,
  formatExpiry,
  getCardBrand,
} from "@/lib/payments/card-vault";
import {
  Briefcase,
  CreditCard,
  History,
  LockKeyhole,
  Trash2,
} from "lucide-react";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";

interface PaymentsSettingsPanelProps {
  onBack: () => void;
}

type PaymentsSubview = "home" | "card" | "history";

const MOCK_HISTORY = [
  {
    id: "tx-1",
    label: "Caparra Loft San Salvario",
    amount: "€120,00",
    date: "12 giu 2026",
    status: "Completato",
  },
  {
    id: "tx-2",
    label: "Acconto DJ Luna",
    amount: "€80,00",
    date: "3 mag 2026",
    status: "Completato",
  },
  {
    id: "tx-3",
    label: "Rimborso catering",
    amount: "-€45,00",
    date: "28 apr 2026",
    status: "Rimborsato",
  },
];

export function PaymentsSettingsPanel({ onBack }: PaymentsSettingsPanelProps) {
  const { currentUser, isGuest, isBusinessUser, updateCurrentUser } =
    useAppState();
  const [view, setView] = useState<PaymentsSubview>("home");
  const [cardDraft, setCardDraft] = useState({
    cardholderName: currentUser.paymentCard?.cardholderName || currentUser.name,
    cardNumber: "",
    expiry: "",
    cvc: "",
  });
  const [cardError, setCardError] = useState<string | null>(null);
  const [cardSavedFlash, setCardSavedFlash] = useState(false);
  const flashTimerRef = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (flashTimerRef.current != null) {
        window.clearTimeout(flashTimerRef.current);
      }
    };
  }, []);

  function handleBack() {
    if (view !== "home") {
      setView("home");
      return;
    }
    onBack();
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
    if (flashTimerRef.current != null) {
      window.clearTimeout(flashTimerRef.current);
    }
    flashTimerRef.current = window.setTimeout(() => {
      setCardSavedFlash(false);
      flashTimerRef.current = null;
    }, 2500);
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

  if (view === "card") {
    return (
      <SettingsShell
        title="Metodo di pagamento"
        subtitle="Carta di debito o credito"
        onBack={handleBack}
      >
        <SettingsInfoCard>
          Salva la carta per pagare caparre e servizi più velocemente. Numero
          completo e CVC non vengono mai memorizzati.
        </SettingsInfoCard>

        {isGuest ? (
          <div className="rounded-2xl border border-dashed border-primary-black/15 bg-primary-black/[0.02] px-4 py-5 text-center">
            <LockKeyhole
              className="mx-auto h-5 w-5 text-primary-black/40"
              aria-hidden
            />
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
                      Carta salvata
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
              <SettingsInfoCard tone="pink">{cardError}</SettingsInfoCard>
            )}
            {cardSavedFlash && (
              <SettingsInfoCard tone="teal">
                Carta salvata. Conserviamo solo circuito, scadenza e ultime 4
                cifre.
              </SettingsInfoCard>
            )}

            <div className="flex items-start gap-2 rounded-2xl bg-primary-black/[0.03] px-3 py-2.5">
              <LockKeyhole
                className="mt-0.5 h-4 w-4 shrink-0 text-primary-black/45"
                aria-hidden
              />
              <p className="text-xs leading-relaxed text-primary-black/55">
                Per sicurezza il numero completo e il CVC restano solo in memoria
                durante l&apos;inserimento e vengono cancellati subito dopo il
                salvataggio.
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
      </SettingsShell>
    );
  }

  if (view === "history") {
    return (
      <SettingsShell
        title="Cronologia pagamenti"
        subtitle="Movimenti recenti su questo account"
        onBack={handleBack}
      >
        <SettingsSection>
          {MOCK_HISTORY.map((item) => (
            <div
              key={item.id}
              className="flex items-start justify-between gap-3 border-b border-primary-black/8 px-4 py-3.5 last:border-b-0"
            >
              <div className="min-w-0">
                <p className="text-sm font-semibold text-primary-black">
                  {item.label}
                </p>
                <p className="mt-0.5 text-xs text-primary-black/50">
                  {item.date} · {item.status}
                </p>
              </div>
              <p className="shrink-0 text-sm font-black text-primary-black">
                {item.amount}
              </p>
            </div>
          ))}
        </SettingsSection>
        <SettingsInfoCard>
          In produzione qui vedrai i movimenti reali collegati al tuo metodo di
          pagamento.
        </SettingsInfoCard>
      </SettingsShell>
    );
  }

  return (
    <SettingsShell
      title="Pagamenti e abbonamento"
      subtitle="Carte, business e movimenti"
      onBack={onBack}
    >
      <SettingsSection title="Metodi di pagamento">
        <SettingsNavRow
          icon={CreditCard}
          label="Carta di debito o credito"
          description={
            currentUser.paymentCard
              ? `${currentUser.paymentCard.brand} •••• ${currentUser.paymentCard.last4}`
              : "Nessuna carta salvata"
          }
          onClick={() => setView("card")}
        />
      </SettingsSection>

      <SettingsSection title="Business e storico">
        <Link
          href="/business/onboarding"
          className="flex w-full items-center gap-3 border-b border-primary-black/8 px-4 py-3.5 text-left transition-colors hover:bg-primary-black/[0.03]"
        >
          <Briefcase
            className="h-5 w-5 shrink-0 text-primary-black/45"
            aria-hidden
          />
          <span className="min-w-0 flex-1">
            <span className="block text-sm font-medium text-primary-black">
              {isBusinessUser ? "Modifica profilo Business" : "Passa a Business"}
            </span>
            <span className="mt-0.5 block text-xs leading-snug text-primary-black/50">
              {isBusinessUser
                ? "Aggiorna i dati del tuo account Pro"
                : "Per locali e fornitori: richieste, calendario e profilo"}
            </span>
          </span>
        </Link>
        <SettingsNavRow
          icon={History}
          label="Cronologia pagamenti"
          description="Caparre, acconti e rimborsi"
          onClick={() => setView("history")}
        />
      </SettingsSection>
    </SettingsShell>
  );
}
