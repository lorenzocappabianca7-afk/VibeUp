export type ManagerNotificationChannel = "whatsapp" | "email";

export interface ManagerNotificationPrefs {
  /** Preferred channel for new availability-request alerts. */
  channel: ManagerNotificationChannel;
  /** E.164 WhatsApp number, e.g. +393331234567. */
  whatsappNumber: string | null;
  /** Destination email if different from login email. */
  email: string | null;
}

export const DEFAULT_MANAGER_NOTIFICATION_PREFS: ManagerNotificationPrefs = {
  channel: "email",
  whatsappNumber: null,
  email: null,
};

const E164_RE = /^\+[1-9]\d{7,14}$/;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function isValidE164Phone(value: string): boolean {
  return E164_RE.test(value.trim());
}

export function isValidNotificationEmail(value: string): boolean {
  return EMAIL_RE.test(value.trim().toLowerCase());
}

export function normalizeManagerNotificationPrefs(
  value?: Partial<ManagerNotificationPrefs> | null,
): ManagerNotificationPrefs {
  const channel =
    value?.channel === "whatsapp" || value?.channel === "email"
      ? value.channel
      : DEFAULT_MANAGER_NOTIFICATION_PREFS.channel;

  const whatsappRaw =
    typeof value?.whatsappNumber === "string" ? value.whatsappNumber.trim() : "";
  const emailRaw =
    typeof value?.email === "string" ? value.email.trim().toLowerCase() : "";

  return {
    channel,
    whatsappNumber: whatsappRaw.length > 0 ? whatsappRaw : null,
    email: emailRaw.length > 0 ? emailRaw : null,
  };
}

export type ManagerNotificationPrefsValidation =
  | { ok: true; prefs: ManagerNotificationPrefs }
  | { ok: false; error: string };

/** Validate before save. Empty optional fields are allowed. */
export function validateManagerNotificationPrefs(
  value: Partial<ManagerNotificationPrefs> | null | undefined,
): ManagerNotificationPrefsValidation {
  const prefs = normalizeManagerNotificationPrefs(value);

  if (prefs.channel === "whatsapp") {
    if (!prefs.whatsappNumber) {
      return {
        ok: false,
        error: "Inserisci un numero WhatsApp in formato internazionale (+39…).",
      };
    }
    if (!isValidE164Phone(prefs.whatsappNumber)) {
      return {
        ok: false,
        error:
          "Numero WhatsApp non valido. Usa il formato E.164, es. +393331234567.",
      };
    }
  }

  if (prefs.email && !isValidNotificationEmail(prefs.email)) {
    return {
      ok: false,
      error: "Email di notifica non valida.",
    };
  }

  if (prefs.channel === "email" && prefs.email === null) {
    // Login email will be used as fallback — allowed.
  }

  return { ok: true, prefs };
}
