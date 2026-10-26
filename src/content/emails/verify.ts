/** Six-digit code sent while the signup is still incomplete. */

export const verifyEmailCopy = {
  subject: "Il tuo codice VibeUp",
  greeting: "Ciao {nome},",
  lead: "Il tuo codice VibeUp è",
  expires: "Scade tra 10 minuti. Se non hai chiesto tu l’iscrizione, ignora questa email.",
  textExpires: "Scade tra 10 minuti.",
  textIgnore: "Se non hai chiesto tu l’iscrizione, ignora questa email.",
} as const;

export const verifyEmailCopyEn = {
  subject: "Your VibeUp code",
  greeting: "Hi {nome},",
  lead: "Your VibeUp code is",
  expires: "It expires in 10 minutes. If you didn't ask to sign up, ignore this email.",
  textExpires: "It expires in 10 minutes.",
  textIgnore: "If you didn't ask to sign up, ignore this email.",
} as const;

export function verifyCopy(locale: "it" | "en") {
  return locale === "en" ? verifyEmailCopyEn : verifyEmailCopy;
}
