import type { DemoLanguage } from "@/lib/demo/language";
import { enMessages, enMessagesNormalized, localeKey } from "@/lib/locale/messages";

/** Italian source stays Italian. English comes from the shared dictionary. */
export function translate(locale: DemoLanguage, text: string) {
  if (locale !== "en" || !text) return text;
  return enMessages[text] ?? enMessagesNormalized[localeKey(text)] ?? text;
}

export function fill(template: string, values: Record<string, string | number>) {
  return Object.entries(values).reduce(
    (text, [key, value]) => text.replaceAll(`{${key}}`, String(value)),
    template,
  );
}

/** Walk copy objects. Italian is returned as-is so the same reference stays stable. */
export function localize<T>(locale: DemoLanguage, value: T): T {
  if (locale !== "en") return value;
  return walk(value) as T;
}

function walk(value: unknown): unknown {
  if (typeof value === "string") return enMessages[value] ?? enMessagesNormalized[localeKey(value)] ?? value;
  if (Array.isArray(value)) return value.map((item) => walk(item));
  if (!value || typeof value !== "object") return value;
  const output: Record<string, unknown> = {};
  for (const [key, item] of Object.entries(value)) output[key] = walk(item);
  return output;
}
