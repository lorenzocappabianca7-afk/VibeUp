import type { SavedPaymentCard } from "@/types/payment";

export type { SavedPaymentCard };

export interface CardDraftInput {
  cardholderName: string;
  cardNumber: string;
  expiry: string;
  cvc: string;
}

const PAN_KEYS = [
  "cardNumber",
  "number",
  "pan",
  "cvc",
  "cvv",
  "securityCode",
  "fullNumber",
] as const;

export function digitsOnly(value: string) {
  return value.replace(/\D/g, "");
}

export function getCardBrand(cardNumber: string) {
  const digits = digitsOnly(cardNumber);
  if (/^4/.test(digits)) return "Visa";
  if (/^(5[1-5]|2[2-7])/.test(digits)) return "Mastercard";
  if (/^3[47]/.test(digits)) return "American Express";
  if (/^6(?:011|5)/.test(digits)) return "Discover";
  return "Carta";
}

export function formatCardNumber(value: string) {
  return digitsOnly(value)
    .slice(0, 19)
    .replace(/(.{4})/g, "$1 ")
    .trim();
}

export function formatExpiry(value: string) {
  const digits = digitsOnly(value).slice(0, 4);
  if (digits.length <= 2) return digits;
  return `${digits.slice(0, 2)}/${digits.slice(2)}`;
}

/** Luhn check — validates format only; never proof of ownership. */
export function isValidCardNumber(value: string) {
  const digits = digitsOnly(value);
  if (digits.length < 13 || digits.length > 19) return false;

  let sum = 0;
  let shouldDouble = false;

  for (let index = digits.length - 1; index >= 0; index--) {
    let digit = Number(digits[index]);
    if (shouldDouble) {
      digit *= 2;
      if (digit > 9) digit -= 9;
    }
    sum += digit;
    shouldDouble = !shouldDouble;
  }

  return sum % 10 === 0;
}

export function isFutureExpiry(value: string) {
  const match = /^(0[1-9]|1[0-2])\/(\d{2})$/.exec(value);
  if (!match) return false;

  const month = Number(match[1]);
  const year = 2000 + Number(match[2]);
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth() + 1;

  return year > currentYear || (year === currentYear && month >= currentMonth);
}

export function isValidCvc(value: string, brand?: string) {
  const digits = digitsOnly(value);
  const expected = brand === "American Express" ? 4 : 3;
  if (brand === "American Express") return digits.length === 4;
  return digits.length === expected || digits.length === 3 || digits.length === 4;
}

function simpleFingerprint(parts: string[]) {
  const raw = parts.join("|");
  let hash = 2166136261;
  for (let i = 0; i < raw.length; i++) {
    hash ^= raw.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return `fp_${(hash >>> 0).toString(16)}`;
}

/**
 * Builds a PCI-safe saved card record.
 * Full PAN and CVC are used only in memory for validation, then discarded.
 */
export function createSavedPaymentCard(
  draft: CardDraftInput,
): { card: SavedPaymentCard } | { error: string } {
  const cardholderName = draft.cardholderName.trim();
  const pan = digitsOnly(draft.cardNumber);
  const cvc = digitsOnly(draft.cvc);
  const expiry = draft.expiry.trim();
  const brand = getCardBrand(pan);

  if (!cardholderName) {
    return { error: "Inserisci il nome dell'intestatario della carta." };
  }
  if (!isValidCardNumber(pan)) {
    return { error: "Inserisci un numero carta valido." };
  }
  if (!isFutureExpiry(expiry)) {
    return { error: "Inserisci una scadenza valida nel formato MM/AA." };
  }
  if (!isValidCvc(cvc, brand)) {
    return { error: "Inserisci un CVC valido." };
  }

  const last4 = pan.slice(-4);
  const card: SavedPaymentCard = {
    id: `card_${Date.now().toString(36)}_${last4}`,
    brand,
    last4,
    expiry,
    cardholderName,
    createdAt: new Date().toISOString(),
    fingerprint: simpleFingerprint([brand, last4, expiry, cardholderName.toLowerCase()]),
  };

  return { card };
}

/** Strips any accidental full-PAN / CVC fields before persistence. */
export function sanitizeSavedPaymentCard(
  input: unknown,
): SavedPaymentCard | undefined {
  if (!input || typeof input !== "object") return undefined;

  const raw = { ...(input as Record<string, unknown>) };

  for (const key of PAN_KEYS) {
    delete raw[key];
  }

  const last4 =
    typeof raw.last4 === "string" ? digitsOnly(raw.last4).slice(-4) : "";
  const expiry = typeof raw.expiry === "string" ? raw.expiry.trim() : "";
  const cardholderName =
    typeof raw.cardholderName === "string" ? raw.cardholderName.trim() : "";
  const brand =
    typeof raw.brand === "string" && raw.brand.trim()
      ? raw.brand.trim()
      : "Carta";

  if (!/^\d{4}$/.test(last4) || !cardholderName || !expiry) return undefined;
  if (!isFutureExpiry(expiry)) return undefined;

  return {
    id:
      typeof raw.id === "string" && raw.id.trim()
        ? raw.id.trim()
        : `card_${last4}`,
    brand,
    last4,
    expiry,
    cardholderName,
    createdAt:
      typeof raw.createdAt === "string" && raw.createdAt
        ? raw.createdAt
        : new Date().toISOString(),
    fingerprint:
      typeof raw.fingerprint === "string" && raw.fingerprint
        ? raw.fingerprint
        : simpleFingerprint([
            brand,
            last4,
            expiry,
            cardholderName.toLowerCase(),
          ]),
  };
}

export function sanitizeAccountPaymentCards<T extends { paymentCard?: unknown }>(
  accounts: T[],
): T[] {
  return accounts.map((account) => {
    const paymentCard = sanitizeSavedPaymentCard(account.paymentCard);
    if (paymentCard === account.paymentCard) return account;
    return { ...account, paymentCard };
  });
}
