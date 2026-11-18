import { readFileSync } from "node:fs";
import { enMessages, itMessages } from "../src/lib/locale/messages.ts";
import { resolveLocale } from "../src/lib/locale/resolve.ts";
import { DEMO_SUPPLIERS } from "../src/lib/demo/demo-suppliers.ts";

const itKeys = Object.keys(itMessages);
const enKeys = Object.keys(enMessages);
const missingInEn = itKeys.filter((key) => !Object.prototype.hasOwnProperty.call(enMessages, key));
const missingInIt = enKeys.filter((key) => !Object.prototype.hasOwnProperty.call(itMessages, key));
if (missingInEn.length || missingInIt.length) {
  console.error("Locale dictionaries are out of step.");
  for (const key of missingInEn) console.error(`missing in English: ${key}`);
  for (const key of missingInIt) console.error(`missing in Italian: ${key}`);
  process.exit(1);
}

const sources = [
  "src/content/landing.ts",
  "src/content/signup.ts",
  "src/content/legal.ts",
];
const missingCopy: string[] = [];
for (const file of sources) {
  const text = readFileSync(new URL(`../${file}`, import.meta.url), "utf8");
  for (const match of text.matchAll(/"((?:[^"\\]|\\.)*)"/g)) {
    const value = match[1].replace(/\\"/g, '"');
    if (value.length < 2 || value.includes("@") || value.startsWith("http") || value.startsWith("privacy-")) continue;
    if (!value.includes(" ") && !/[àèéìòù]/i.test(value)) continue;
    if (/-v\d+$/.test(value)) continue;
    if (!Object.prototype.hasOwnProperty.call(enMessages, value)) missingCopy.push(`${file}: ${value}`);
  }
}
if (missingCopy.length) {
  console.error("Copy is missing from the English dictionary:");
  for (const line of missingCopy) console.error(line);
  process.exit(1);
}

for (const supplier of DEMO_SUPPLIERS) {
  if (!supplier.description.it || !supplier.description.en || !supplier.price.it || !supplier.price.en) {
    console.error(`Demo supplier ${supplier.id} is missing a language.`);
    process.exit(1);
  }
}

const cases: Array<[Parameters<typeof resolveLocale>[0], "it" | "en"]> = [
  [{ explicit: "1", chosen: "en", signupLocale: "it", acceptLanguage: "it" }, "en"],
  [{ explicit: "1", chosen: "it", signupLocale: "en", acceptLanguage: "en" }, "it"],
  [{ explicit: null, chosen: "en", signupLocale: "it", acceptLanguage: "en-US" }, "it"],
  [{ explicit: null, chosen: null, signupLocale: "en", acceptLanguage: "it" }, "en"],
  [{ explicit: null, chosen: null, signupLocale: null, acceptLanguage: "en-GB,en;q=0.8" }, "en"],
  [{ explicit: null, chosen: null, signupLocale: null, acceptLanguage: "fr-FR,it;q=0.8" }, "it"],
  [{ explicit: "1", chosen: "xx", signupLocale: null, acceptLanguage: "en" }, "en"],
];
for (const [input, expected] of cases) {
  const actual = resolveLocale(input);
  if (actual !== expected) {
    console.error("resolveLocale failed", input, actual, expected);
    process.exit(1);
  }
}

console.log(`Locale dictionaries match (${itKeys.length} keys).`);
