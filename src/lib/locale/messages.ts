import { DEMO_EN_UI } from "@/lib/demo/en-ui";
import { EXTRA_EN } from "@/lib/locale/messages-extra";

export function localeKey(text: string) {
  return text.replace(/[’']/g, "'").replace(/\s+/g, " ").trim();
}

function buildMessages() {
  const en: Record<string, string> = { ...DEMO_EN_UI };
  const conflicts: string[] = [];
  for (const [italian, english] of Object.entries(EXTRA_EN)) {
    const existing = en[italian];
    if (existing !== undefined && existing !== english) {
      conflicts.push(`${italian}\n  dictionary: ${existing}\n  extra: ${english}`);
      continue;
    }
    en[italian] = english;
  }
  if (conflicts.length) {
    throw new Error(`Conflicting English copy:\n${conflicts.join("\n")}`);
  }
  const it: Record<string, string> = {};
  const normalized: Record<string, string> = {};
  for (const [key, value] of Object.entries(en)) {
    it[key] = key;
    normalized[localeKey(key)] = value;
  }
  return { it, en, normalized };
}

const messages = buildMessages();

export const itMessages = messages.it;
export const enMessages = messages.en;
export const enMessagesNormalized = messages.normalized;
