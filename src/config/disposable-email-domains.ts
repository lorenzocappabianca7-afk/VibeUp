/**
 * Domains that do not count as a valid contest invite.
 * Add a line to extend the list. Subdomains are included.
 */
export const DISPOSABLE_EMAIL_DOMAINS = [
  "10minutemail.com",
  "10minutemail.net",
  "burnermail.io",
  "discard.email",
  "discardmail.com",
  "dispostable.com",
  "emailondeck.com",
  "fakeinbox.com",
  "getairmail.com",
  "getnada.com",
  "grr.la",
  "guerrillamail.biz",
  "guerrillamail.com",
  "guerrillamail.de",
  "guerrillamail.info",
  "guerrillamail.net",
  "guerrillamail.org",
  "guerrillamailblock.com",
  "inboxkitten.com",
  "mailcatch.com",
  "maildrop.cc",
  "mailinator.com",
  "mailnesia.com",
  "mailnull.com",
  "mintemail.com",
  "moakt.com",
  "mohmal.com",
  "mytemp.email",
  "sharklasers.com",
  "spam4.me",
  "spamgourmet.com",
  "temp-mail.org",
  "tempinbox.com",
  "tempmail.com",
  "throwawaymail.com",
  "tmpmail.net",
  "tmpmail.org",
  "trash-mail.com",
  "trashmail.com",
  "yopmail.com",
] as const;

const DISPOSABLE = new Set<string>(DISPOSABLE_EMAIL_DOMAINS);

export function isDisposableEmail(email: string) {
  const domain = email.trim().toLowerCase().split("@")[1] ?? "";
  if (!domain || domain.includes(" ")) return false;
  if (DISPOSABLE.has(domain)) return true;
  const parts = domain.split(".");
  for (let index = 1; index < parts.length - 1; index += 1) {
    if (DISPOSABLE.has(parts.slice(index).join("."))) return true;
  }
  return false;
}
