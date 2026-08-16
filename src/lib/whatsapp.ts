/** Build WhatsApp click-to-chat links (wa.me). */

export function toWaMePhoneDigits(input: string): string | null {
  const digits = input.replace(/\D/g, "");
  if (digits.length < 8 || digits.length > 15) return null;
  return digits;
}

export function buildWaMeUrl(phone: string, message: string): string | null {
  const digits = toWaMePhoneDigits(phone);
  if (!digits) return null;
  const text = message.trim();
  const query = text ? `?text=${encodeURIComponent(text)}` : "";
  return `https://wa.me/${digits}${query}`;
}

export function buildConfirmedEventWhatsAppMessage(params: {
  userName: string;
  eventTitle: string;
  eventDateLabel: string;
  locationName: string;
}): string {
  const name = params.userName.trim() || "un organizzatore VibeUp";
  return `Ciao, sono ${name}, ho confermato l'evento ${params.eventTitle} del ${params.eventDateLabel} presso ${params.locationName}`;
}
