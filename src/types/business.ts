export type BusinessCategory =
  | "dj"
  | "locale"
  | "fotografo"
  | "pasticceria"
  | "decorazioni";

export type RateType = "fixed" | "hourly";

export interface CatalogItem {
  id: string;
  name: string;
  price: number;
  description?: string;
}

export interface LocaleBusinessProfile {
  category: "locale";
  businessName: string;
  address: string;
  /** Optional until the venue completes its full listing */
  maxCapacity?: number;
  hourlyPrice?: number;
}

export interface PerformerBusinessProfile {
  category: "dj" | "fotografo";
  businessName: string;
  rateType: RateType;
  rateAmount: number;
  equipmentIncluded: string;
  portfolioLink: string;
}

export interface ShopBusinessProfile {
  category: "pasticceria" | "decorazioni";
  businessName: string;
  catalog: CatalogItem[];
}

export type BusinessProfile =
  | LocaleBusinessProfile
  | PerformerBusinessProfile
  | ShopBusinessProfile;

export const BUSINESS_CATEGORY_LABELS: Record<BusinessCategory, string> = {
  dj: "DJ",
  locale: "Locale",
  fotografo: "Fotografo",
  pasticceria: "Pasticceria",
  decorazioni: "Negozio di Decorazioni",
};

export const RATE_TYPE_LABELS: Record<RateType, string> = {
  fixed: "Tariffa fissa",
  hourly: "Tariffa oraria",
};

export function isPerformerCategory(
  category: BusinessCategory,
): category is "dj" | "fotografo" {
  return category === "dj" || category === "fotografo";
}

export function isShopCategory(
  category: BusinessCategory,
): category is "pasticceria" | "decorazioni" {
  return category === "pasticceria" || category === "decorazioni";
}

export function isLocaleCategory(
  category: BusinessCategory,
): category is "locale" {
  return category === "locale";
}
