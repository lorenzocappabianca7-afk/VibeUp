/** Placeholder organizer copy — will be replaced with curated content later. */

export const EVENT_TIPS_TITLE = "I nostri consigli";

export const EVENT_TIPS_INTRO =
  "Piccole cose che di solito fanno la differenza il giorno della festa.";

export const EVENT_TIPS = [
  "Conferma con il locale l’orario di fine e se la musica può andare avanti dopo mezzanotte.",
  "Se c’è una zona esterna, chiedi un piano B coperto in caso di pioggia o freddo.",
  "Arriva 20–30 minuti prima per il check-in, le consegne e le foto di gruppo.",
  "Indica un referente sul posto: chi accoglie gli invitati e chi parla con lo staff.",
  "Per menu o catering, conferma i numeri definitivi 3–4 giorni prima.",
  "Prepara una playlist di riserva e un caricabatterie: succede sempre.",
] as const;

export const EVENT_CHECKLIST_TITLE = "Cosa devi ricordarti di fare";

export const EVENT_CHECKLIST_INTRO =
  "Una lista pratica da spuntare prima del giorno X.";

export const EVENT_CHECKLIST = [
  {
    id: "pay-deposit",
    label: "Paga la caparra entro 36 ore per tenere bloccato il locale.",
  },
  {
    id: "siae",
    label:
      "Decidi come gestire il documento SIAE: fai da te (tariffa ufficiale ~148€), locale o VibeUp (+20€ di gestione).",
  },
  {
    id: "guest-count",
    label: "Rivedi il numero di invitati e avvisa il gestore se cambia.",
  },
  {
    id: "allergens",
    label: "Aggiorna allergie e intolleranze se qualcuno si aggiunge o rinuncia.",
  },
  {
    id: "travel",
    label: "Controlla parcheggio, mezzi e come si arriva al locale.",
  },
  {
    id: "setup-times",
    label: "Conferma orario di ingresso, allestimento e ritiro materiale.",
  },
  {
    id: "documents",
    label:
      "Salva il contatto del locale e porta un documento il giorno della festa.",
  },
] as const;

export type EventChecklistItemId = (typeof EVENT_CHECKLIST)[number]["id"];
