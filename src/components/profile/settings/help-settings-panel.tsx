"use client";

import {
  SettingsInfoCard,
  SettingsNavRow,
  SettingsSection,
} from "@/components/profile/settings/settings-section";
import { SettingsShell } from "@/components/profile/settings/settings-shell";
import {
  BookOpenText,
  ChevronDown,
  LifeBuoy,
  Mail,
  MessageCircle,
} from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";

interface HelpSettingsPanelProps {
  onBack: () => void;
}

type HelpSubview = "home" | "contact" | "report";

const FAQS = [
  {
    id: "faq-1",
    question: "Come funziona la caparra?",
    answer:
      "Quando prenoti un locale o un servizio paghi solo la caparra. Il saldo resta da saldare secondo le condizioni del fornitore, di solito prima dell'evento.",
  },
  {
    id: "faq-2",
    question: "Posso confrontare più location?",
    answer:
      "Sì: usa l'icona compara sulle card (fino a 3 locali) e apri il tab Compara in Esplora per vedere fascia di prezzo, zona, capacità e servizi inclusi.",
  },
  {
    id: "faq-3",
    question: "I miei preferiti restano salvati?",
    answer:
      "Sì, location e servizi preferiti sono legati all'account con cui li hai salvati. Cambiando account vedi solo i preferiti di quell'account.",
  },
  {
    id: "faq-4",
    question: "Come passo a un account Pro?",
    answer:
      "Da Profilo puoi avviare l'onboarding business. Viene creato un account Pro dedicato, senza convertire il tuo account consumer.",
  },
];

export function HelpSettingsPanel({ onBack }: HelpSettingsPanelProps) {
  const [view, setView] = useState<HelpSubview>("home");
  const [openFaqId, setOpenFaqId] = useState<string | null>(FAQS[0]?.id ?? null);
  const [reportDraft, setReportDraft] = useState({
    topic: "Problema tecnico",
    message: "",
  });
  const [reportSent, setReportSent] = useState(false);

  function handleBack() {
    if (view !== "home") {
      setView("home");
      return;
    }
    onBack();
  }

  function sendReport() {
    if (!reportDraft.message.trim()) return;
    setReportSent(true);
    setReportDraft((current) => ({ ...current, message: "" }));
  }

  if (view === "contact") {
    return (
      <SettingsShell
        title="Contatta il supporto"
        subtitle="Ti rispondiamo entro un giorno lavorativo"
        onBack={handleBack}
      >
        <SettingsSection>
          <SettingsNavRow
            icon={Mail}
            label="Email"
            description="support@vibeup.app"
            onClick={() => {
              window.location.href = "mailto:support@vibeup.app";
            }}
          />
          <SettingsNavRow
            icon={MessageCircle}
            label="Chat in-app"
            description="Scrivici dalla tab Messaggi"
            onClick={() => {
              window.location.href = "/?tab=messages";
            }}
          />
        </SettingsSection>
        <SettingsInfoCard>
          Per urgenze su eventi nelle 48 ore, indica data e nome del locale
          nell&apos;oggetto della mail.
        </SettingsInfoCard>
      </SettingsShell>
    );
  }

  if (view === "report") {
    return (
      <SettingsShell
        title="Segnala un problema"
        subtitle="Ci aiuti a migliorare VibeUp"
        onBack={handleBack}
      >
        <SettingsSection>
          <label className="block border-b border-primary-black/8 px-4 py-3">
            <span className="text-xs font-bold text-primary-black/55">
              Argomento
            </span>
            <select
              value={reportDraft.topic}
              onChange={(event) =>
                setReportDraft((current) => ({
                  ...current,
                  topic: event.target.value,
                }))
              }
              className="mt-1.5 w-full bg-transparent text-sm font-semibold outline-none"
            >
              <option>Problema tecnico</option>
              <option>Pagamento</option>
              <option>Prenotazione</option>
              <option>Account e privacy</option>
              <option>Altro</option>
            </select>
          </label>
          <label className="block px-4 py-3">
            <span className="text-xs font-bold text-primary-black/55">
              Descrizione
            </span>
            <textarea
              rows={5}
              value={reportDraft.message}
              onChange={(event) =>
                setReportDraft((current) => ({
                  ...current,
                  message: event.target.value,
                }))
              }
              placeholder="Raccontaci cosa non ha funzionato..."
              className="mt-1.5 w-full resize-none bg-transparent text-sm font-medium leading-relaxed outline-none placeholder:text-primary-black/35"
            />
          </label>
        </SettingsSection>

        {reportSent && (
          <SettingsInfoCard tone="teal">
            Segnalazione inviata. Grazie, il team la prenderà in carico.
          </SettingsInfoCard>
        )}

        <button
          type="button"
          onClick={sendReport}
          disabled={!reportDraft.message.trim()}
          className="w-full rounded-2xl bg-primary-black px-4 py-3 text-sm font-black text-white transition-colors hover:bg-primary-black/90 disabled:opacity-50"
        >
          Invia segnalazione
        </button>
      </SettingsShell>
    );
  }

  return (
    <SettingsShell
      title="Aiuto e supporto"
      subtitle="FAQ, contatti e segnalazioni"
      onBack={onBack}
    >
      <SettingsSection title="Assistenza">
        <SettingsNavRow
          icon={LifeBuoy}
          label="Contatta il supporto"
          description="Email o chat con il team VibeUp"
          onClick={() => setView("contact")}
        />
        <SettingsNavRow
          icon={MessageCircle}
          label="Segnala un problema"
          description="Bug, pagamenti o dubbi sull'account"
          onClick={() => setView("report")}
        />
      </SettingsSection>

      <SettingsSection
        title="Domande frequenti"
        description="Risposte rapide alle cose che chiedono di più."
      >
        <div className="divide-y divide-primary-black/8">
          {FAQS.map((faq) => {
            const open = openFaqId === faq.id;
            return (
              <div key={faq.id}>
                <button
                  type="button"
                  onClick={() => setOpenFaqId(open ? null : faq.id)}
                  className="flex w-full items-start gap-3 px-4 py-3.5 text-left transition-colors hover:bg-primary-black/[0.03]"
                  aria-expanded={open}
                >
                  <BookOpenText
                    className="mt-0.5 h-4 w-4 shrink-0 text-brand-teal"
                    aria-hidden
                  />
                  <span className="min-w-0 flex-1 text-sm font-semibold text-primary-black">
                    {faq.question}
                  </span>
                  <ChevronDown
                    className={cn(
                      "mt-0.5 h-4 w-4 shrink-0 text-primary-black/35 transition-transform",
                      open && "rotate-180",
                    )}
                    aria-hidden
                  />
                </button>
                {open && (
                  <p className="px-4 pb-3.5 pl-11 text-xs leading-relaxed text-primary-black/60">
                    {faq.answer}
                  </p>
                )}
              </div>
            );
          })}
        </div>
      </SettingsSection>
    </SettingsShell>
  );
}
