import { clampDrinksPerInvitee, type DrinkPackageMode } from "@/lib/drinks-quote";
import { getSiteUrl } from "@/lib/site";

export type QuoteShareChannel =
  | "whatsapp"
  | "instagram"
  | "tiktok"
  | "email"
  | "copy";

export interface QuoteShareContent {
  /** Path + query + hash, e.g. `/location/x?guestCount=10#ricapitoliamo` */
  href: string;
  title: string;
  details: string[];
}

export function absoluteQuoteShareUrl(href: string) {
  const origin =
    typeof window !== "undefined" ? window.location.origin : getSiteUrl();
  if (href.startsWith("http://") || href.startsWith("https://")) return href;
  return `${origin}${href.startsWith("/") ? href : `/${href}`}`;
}

export function buildQuoteShareMessage(content: QuoteShareContent) {
  const url = absoluteQuoteShareUrl(content.href);
  return [
    "Guarda l’anteprima della mia festa su VibeUp",
    "",
    content.title,
    ...content.details.filter(Boolean),
    "",
    url,
  ].join("\n");
}

export function parseSharedDrinkMode(
  value?: string | null,
): DrinkPackageMode | null {
  if (value === "none" || value === "per_invitee" || value === "open_bar") {
    return value;
  }
  return null;
}

export function parseSharedTime(value?: string | null) {
  if (!value || !/^\d{2}:\d{2}$/.test(value)) return null;
  return value;
}

export function parseSharedServiceIds(value?: string | null) {
  if (!value) return [];
  return value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

export function parseSharedDrinksPerInvitee(value?: string | null) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return null;
  return clampDrinksPerInvitee(parsed);
}

function copyQuoteShareMessageSync(message: string) {
  try {
    const textarea = document.createElement("textarea");
    textarea.value = message;
    textarea.setAttribute("readonly", "");
    textarea.setAttribute("aria-hidden", "true");
    textarea.style.position = "fixed";
    textarea.style.top = "0";
    textarea.style.left = "-9999px";
    document.body.appendChild(textarea);
    textarea.focus();
    textarea.select();
    textarea.setSelectionRange(0, message.length);
    const ok = document.execCommand("copy");
    document.body.removeChild(textarea);
    return ok;
  } catch {
    return false;
  }
}

export async function copyQuoteShareMessage(message: string) {
  if (typeof navigator !== "undefined" && navigator.clipboard?.writeText) {
    try {
      await navigator.clipboard.writeText(message);
      return true;
    } catch {
      /* fall through to the sync path */
    }
  }
  return copyQuoteShareMessageSync(message);
}

function copyThenMaybeOpen(message: string, url: string) {
  // Copy first, synchronously, so window.open does not steal focus mid-write.
  const copied = copyQuoteShareMessageSync(message);
  if (!copied) void copyQuoteShareMessage(message);
  window.open(url, "_blank", "noopener,noreferrer");
  return "copied" as const;
}

export function openQuoteShareChannel(
  channel: QuoteShareChannel,
  content: QuoteShareContent,
) {
  const message = buildQuoteShareMessage(content);
  const encoded = encodeURIComponent(message);

  if (channel === "whatsapp") {
    window.open(`https://wa.me/?text=${encoded}`, "_blank", "noopener,noreferrer");
    return "opened" as const;
  }

  if (channel === "email") {
    const subject = encodeURIComponent(content.title);
    window.location.href = `mailto:?subject=${subject}&body=${encoded}`;
    return "opened" as const;
  }

  if (channel === "instagram") {
    return copyThenMaybeOpen(message, "https://www.instagram.com/direct/inbox/");
  }

  if (channel === "tiktok") {
    return copyThenMaybeOpen(message, "https://www.tiktok.com/messages");
  }

  const copied = copyQuoteShareMessageSync(message);
  if (!copied) void copyQuoteShareMessage(message);
  return "copied" as const;
}
