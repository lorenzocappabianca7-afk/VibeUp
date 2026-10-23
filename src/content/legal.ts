/**
 * Versioned legal copy. Bump the matching version when the sentence changes,
 * so consent_log keeps who accepted which text.
 */
export const LEGAL_VERSIONS = {
  privacy: "privacy-v1",
  rules: "rules-v1",
  marketing: "marketing-v1",
} as const;

export const consentText = {
  summary: [
    "Raccogliamo solo i dati che inserisci nel modulo.",
    "Servono per la community, la gara inviti e per avvisarti al lancio dell’app.",
    "Puoi cancellarli in qualsiasi momento scrivendo a info@vibeupevents.com.",
  ],
  privacy:
    "Ho letto l’informativa privacy e acconsento al trattamento dei miei dati per partecipare alla community VibeUp",
  privacyLink: "informativa privacy",
  rules: "Accetto il regolamento della gara inviti",
  rulesLink: "regolamento",
  marketing: "Voglio ricevere novità e offerte da VibeUp via email, SMS o WhatsApp",
} as const;

export const privacyPage = {
  title: "Privacy",
  versionLabel: "Versione",
  manage: "Gestisci i tuoi dati",
  sections: [
    {
      heading: "Titolare del trattamento e contatti",
      body: "DA COMPLETARE. Nome del titolare, sede e recapiti. La casella del sito è info@vibeupevents.com.",
    },
    {
      heading: "Dati raccolti",
      body: "DA COMPLETARE. Solo i dati del modulo: nome, cognome, nome utente, email, telefono, anno di nascita, liceo, locale desiderato, codice amico e consensi.",
    },
    {
      heading: "Finalità e base giuridica",
      body: "DA COMPLETARE. Community, gara inviti e avviso al lancio dell’app. Le comunicazioni commerciali sono un consenso a parte, facoltativo.",
    },
    {
      heading: "Conservazione",
      body: "DA COMPLETARE. Le iscrizioni non verificate si cancellano dopo 7 giorni. I codici email si cancellano dopo l’uso o alla scadenza.",
    },
    {
      heading: "Destinatari",
      body: "DA COMPLETARE. Fornitori: Supabase (database), il provider email e l’hosting del sito.",
    },
    {
      heading: "Trasferimenti fuori UE",
      body: "DA COMPLETARE. Indicare se qualche fornitore tratta i dati fuori dallo Spazio economico europeo e con quali garanzie.",
    },
    {
      heading: "Diritti dell’utente",
      body: "DA COMPLETARE. Accesso, rettifica, cancellazione, limitazione, opposizione, portabilità e revoca del consenso.",
    },
    {
      heading: "Minori",
      body: "DA COMPLETARE. L’iscrizione è riservata a chi ha almeno 14 anni.",
    },
    {
      heading: "Reclamo al Garante privacy",
      body: "DA COMPLETARE. Diritto di reclamo al Garante per la protezione dei dati personali.",
    },
    {
      heading: "Data di aggiornamento",
      body: "DA COMPLETARE. Data dell’ultimo aggiornamento di questa informativa.",
    },
  ],
} as const;

export const privacyRequestCopy = {
  title: "Gestisci i tuoi dati",
  lead: "Inserisci l’email dell’iscrizione. Se è registrata, ti inviamo un codice di 6 cifre. Poi puoi scaricare i dati o cancellarli.",
  emailPlaceholder: "nome@email.com",
  send: "Invia il codice",
  sent: "Se l’email è registrata, ti abbiamo inviato un codice. Vale 10 minuti.",
  codePlaceholder: "Codice",
  download: "Scarica i miei dati",
  downloaded: "File scaricato.",
  delete: "Cancella i miei dati",
  deleteConfirm: "Conferma cancellazione",
  deleteHint: "Elimina l’iscrizione e i consensi. Gli inviti che avevi fatto restano solo come numero, senza il tuo nome.",
  deleted: "I tuoi dati sono stati cancellati.",
  resend: "Invia di nuovo",
  resendIn: "Invia di nuovo tra",
  backHome: "Torna al sito",
  unsubscribeTitle: "Novità e offerte",
  unsubscribeOk: "Non riceverai più novità e offerte da VibeUp.",
  unsubscribeInvalid: "Questo link non è valido.",
} as const;
