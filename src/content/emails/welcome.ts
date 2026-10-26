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

export const welcomeEmailCopyEn = {
  subject: "Welcome to VibeUp, {nome}! Here's your VibeUpcode",
  preheader: "Your personal code to invite friends and win prizes.",
  greeting: "Hi {nome},",
  thanks:
    "thanks for signing up to VibeUp! You're now officially part of our pre-launch community.",
  codeLead: "Your personal VibeUpcode is:",
  contest:
    "Share it with your friends: every friend who signs up with your code and confirms their email counts towards the invite contest. Up for grabs: VibeUp vouchers worth €300, €150 and €50 for whoever invites the most friends, redeemable from the app launch on 1 January 2027.",
  shareButton: "Share your code",
  updates:
    "In the meantime, we'll keep you posted on everything: the platform launch, new venues and services, the invite contest and tips to plan your 18th without stress.",
  demoLead: "Want a sneak peek? You can already try our demo:",
  demoLink: "Try the demo",
  signoff: "See you soon,",
  team: "The VibeUp team",
  reason:
    "You're receiving this email because you joined the VibeUp community on vibeupevents.com.",
  privacyLabel: "Privacy",
  rulesLabel: "Rules",
  dataLabel: "Manage your data",
  brandLine: "VibeUp · info@vibeupevents.com",
} as const;

export function welcomeCopy(locale: "it" | "en") {
  return locale === "en" ? welcomeEmailCopyEn : welcomeEmailCopy;
}
