/**
 * Welcome email copy. This is a service message: it goes to every verified
 * signup. Future promotional offers must be sent only to people who accepted
 * marketing. Launch and contest updates can still go to the others.
 */

export const welcomeEmailCopy = {
  subject: "Benvenuto in VibeUp, {nome}! Ecco il tuo VibeUpcode",
  preheader: "Il tuo codice personale per invitare gli amici e vincere i premi.",
  greeting: "Ciao {nome},",
  thanks:
    "grazie per esserti iscritto a VibeUp! Da oggi fai ufficialmente parte della nostra community pre-lancio.",
  codeLead: "Il tuo VibeUpcode personale è:",
  contest:
    "Condividilo con i tuoi amici: ogni amico che si iscrive con il tuo codice e conferma la sua email conta per la gara inviti. In palio buoni VibeUp da 300 €, 150 € e 50 € per chi invita più amici, riscattabili dal lancio dell'app, il 1° gennaio 2027.",
  shareButton: "Condividi il tuo codice",
  updates:
    "Nel frattempo ti terremo aggiornato su tutto: il lancio della piattaforma, le nuove location e i servizi disponibili, la gara inviti e le novità per organizzare il tuo 18 senza stress.",
  demoLead: "Se vuoi dare un'occhiata in anteprima, puoi già provare la nostra demo:",
  demoLink: "Prova la demo",
  signoff: "A presto,",
  team: "Il team VibeUp",
  reason:
    "Hai ricevuto questa email perché ti sei iscritto alla community VibeUp su vibeupevents.com.",
  privacyLabel: "Privacy",
  rulesLabel: "Regolamento",
  dataLabel: "Gestisci i tuoi dati",
  brandLine: "VibeUp · info@vibeupevents.com",
} as const;
