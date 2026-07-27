/** Guest allergen restrictions and venue menu course catalog. */

export const MENU_ALLERGEN_OPTIONS = [
  "Glutine",
  "Latte",
  "Uova",
  "Frutta a guscio",
  "Arachidi",
  "Soia",
  "Pesce",
  "Crostacei",
  "Sedano",
  "Senape",
  "Sesamo",
  "Solfiti",
] as const;

export type MenuAllergen = (typeof MENU_ALLERGEN_OPTIONS)[number];

export interface MenuCourseItem {
  id: string;
  label: string;
  /** Allergens typically present in this dish. */
  allergens: readonly string[];
}

export interface MenuCourse {
  id: string;
  label: string;
  emoji: string;
  accentClass: string;
  items: readonly MenuCourseItem[];
}

export const MENU_COURSES: readonly MenuCourse[] = [
  {
    id: "antipasti",
    label: "Antipasti",
    emoji: "🧀",
    accentClass: "bg-amber-100 text-amber-800 ring-amber-200/80",
    items: [
      {
        id: "taglieri",
        label: "Taglieri misti",
        allergens: ["Latte", "Frutta a guscio"],
      },
      {
        id: "finger-food",
        label: "Finger food",
        allergens: ["Glutine", "Uova", "Latte"],
      },
      {
        id: "bruschette",
        label: "Bruschette gourmet",
        allergens: ["Glutine"],
      },
    ],
  },
  {
    id: "primi",
    label: "Primi",
    emoji: "🍝",
    accentClass: "bg-orange-100 text-orange-800 ring-orange-200/80",
    items: [
      { id: "pasta", label: "Pasta fresca", allergens: ["Glutine", "Uova"] },
      { id: "risotto", label: "Risotto", allergens: ["Latte"] },
      {
        id: "lasagne",
        label: "Lasagne vegetariane",
        allergens: ["Glutine", "Latte", "Uova", "Sedano"],
      },
    ],
  },
  {
    id: "secondi",
    label: "Secondi",
    emoji: "🥩",
    accentClass: "bg-rose-100 text-rose-800 ring-rose-200/80",
    items: [
      { id: "carne", label: "Secondo di carne", allergens: ["Sedano"] },
      { id: "pesce", label: "Secondo di pesce", allergens: ["Pesce"] },
      {
        id: "vegetariano",
        label: "Opzione vegetariana",
        allergens: ["Latte", "Uova"],
      },
    ],
  },
  {
    id: "dolci",
    label: "Dolci",
    emoji: "🍰",
    accentClass: "bg-pink-100 text-pink-800 ring-pink-200/80",
    items: [
      {
        id: "torta",
        label: "Torta evento",
        allergens: ["Glutine", "Latte", "Uova", "Frutta a guscio"],
      },
      {
        id: "mono-porzioni",
        label: "Monoporzioni",
        allergens: ["Glutine", "Latte", "Uova"],
      },
      { id: "frutta", label: "Frutta fresca", allergens: [] },
    ],
  },
  {
    id: "bevande",
    label: "Bevande",
    emoji: "🥂",
    accentClass: "bg-sky-100 text-sky-800 ring-sky-200/80",
    items: [
      { id: "soft-drink", label: "Soft drink", allergens: [] },
      { id: "vino", label: "Vino e prosecco", allergens: ["Solfiti"] },
      { id: "open-bar", label: "Open bar", allergens: [] },
    ],
  },
] as const;

export function itemMatchesAllergenRestrictions(
  itemAllergens: readonly string[],
  restricted: readonly string[],
) {
  if (restricted.length === 0) return true;
  const blocked = new Set(restricted.map((value) => value.toLowerCase()));
  return !itemAllergens.some((allergen) =>
    blocked.has(allergen.toLowerCase()),
  );
}

export function filterMenuCoursesByAllergens(
  restricted: readonly string[],
): MenuCourse[] {
  if (restricted.length === 0) {
    return MENU_COURSES.map((course) => ({
      ...course,
      items: [...course.items],
    }));
  }

  return MENU_COURSES.map((course) => ({
    ...course,
    items: course.items.filter((item) =>
      itemMatchesAllergenRestrictions(item.allergens, restricted),
    ),
  })).filter((course) => course.items.length > 0);
}

export function pruneMenuSelectionsForAllergens<
  T extends { courseId: string; itemId: string },
>(selections: T[], restricted: readonly string[]): T[] {
  if (restricted.length === 0) return selections;
  const allowed = new Set(
    filterMenuCoursesByAllergens(restricted).flatMap((course) =>
      course.items.map((item) => `${course.id}:${item.id}`),
    ),
  );
  return selections.filter((selection) =>
    allowed.has(`${selection.courseId}:${selection.itemId}`),
  );
}
