import type { Location } from "@/types/location";
import {
  PARTY_SERVICE_OPTIONS,
  type PartyServicePick,
} from "@/types/party-criteria";

/**
 * A venue includes a service in the price only when the catalog says so:
 * a name in `includedServices`, or an `availableServices` row priced `included`.
 * Paid add-ons stay out of this list.
 */
export function partyServicePickForName(name: string): PartyServicePick | null {
  const text = name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");

  if (/\bdj\b/.test(text)) return "dj";
  if (/fotografo|photographer/.test(text)) return "photographer";
  if (/(^|[^a-z])torta([^a-z]|$)|pasticcer/.test(text)) return "bakery";
  if (/sicurezz|security|vigilanz/.test(text)) return "security";
  if (/allestiment|decorazion/.test(text)) return "decorations";
  if (isCateringIncludedName(text)) return "catering";
  return null;
}

function isCateringIncludedName(text: string) {
  if (/cucina per/.test(text) && /catering/.test(text)) return false;
  if (/tavol/.test(text) && /buffet/.test(text)) return false;
  return /(^|[^a-z])catering([^a-z]|$)|\bbuffet\b|aperitivo|(^|[^a-z])cena([^a-z]|$)|(^|[^a-z])menu([^a-z]|$)/.test(
    text,
  );
}

export function includedPartyServices(
  location: Pick<Location, "includedServices" | "availableServices">,
  wanted?: readonly PartyServicePick[],
): PartyServicePick[] {
  const found = new Set<PartyServicePick>();
  for (const name of location.includedServices) {
    const pick = partyServicePickForName(name);
    if (pick) found.add(pick);
  }
  for (const service of location.availableServices ?? []) {
    if (service.pricing.type !== "included") continue;
    const pick = partyServicePickForName(service.name);
    if (pick) found.add(pick);
  }
  const order = wanted ?? PARTY_SERVICE_OPTIONS.map((option) => option.id);
  return order.filter((id) => found.has(id));
}

const SERVICE_LABEL_EN: Record<PartyServicePick, string> = {
  dj: "DJ",
  photographer: "Photographer",
  bakery: "Cake",
  security: "Security",
  catering: "Catering",
  decorations: "Decorations",
};

export function partyServiceLabel(id: PartyServicePick, lang: "it" | "en") {
  if (lang === "en") return SERVICE_LABEL_EN[id];
  return PARTY_SERVICE_OPTIONS.find((option) => option.id === id)?.label ?? id;
}

export function joinServiceLabels(labels: string[]) {
  if (labels.length <= 1) return labels[0] ?? "";
  if (labels.length === 2) return `${labels[0]} e ${labels[1]}`;
  return `${labels.slice(0, -1).join(", ")} e ${labels[labels.length - 1]}`;
}

export function joinServiceLabelsEn(labels: string[]) {
  if (labels.length <= 1) return labels[0] ?? "";
  if (labels.length === 2) return `${labels[0]} and ${labels[1]}`;
  return `${labels.slice(0, -1).join(", ")} and ${labels[labels.length - 1]}`;
}
