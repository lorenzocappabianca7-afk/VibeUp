export interface DemoDialCountry {
  iso2: string;
  name: string;
  dial: string;
}

export const DEMO_DEFAULT_DIAL_ISO = "IT";

function flagEmoji(iso2: string) {
  return [...iso2.toUpperCase()]
    .map((letter) => String.fromCodePoint(127397 + letter.charCodeAt(0)))
    .join("");
}

const DEMO_DIAL_COUNTRIES_UNSORTED: DemoDialCountry[] = [
  { iso2: "AL", name: "Albania", dial: "+355" },
  { iso2: "AD", name: "Andorra", dial: "+376" },
  { iso2: "AT", name: "Austria", dial: "+43" },
  { iso2: "BE", name: "Belgio", dial: "+32" },
  { iso2: "BA", name: "Bosnia ed Erzegovina", dial: "+387" },
  { iso2: "BR", name: "Brasile", dial: "+55" },
  { iso2: "BG", name: "Bulgaria", dial: "+359" },
  { iso2: "CN", name: "Cina", dial: "+86" },
  { iso2: "CY", name: "Cipro", dial: "+357" },
  { iso2: "HR", name: "Croazia", dial: "+385" },
  { iso2: "DK", name: "Danimarca", dial: "+45" },
  { iso2: "EG", name: "Egitto", dial: "+20" },
  { iso2: "AE", name: "Emirati Arabi Uniti", dial: "+971" },
  { iso2: "EE", name: "Estonia", dial: "+372" },
  { iso2: "FI", name: "Finlandia", dial: "+358" },
  { iso2: "FR", name: "Francia", dial: "+33" },
  { iso2: "DE", name: "Germania", dial: "+49" },
  { iso2: "GR", name: "Grecia", dial: "+30" },
  { iso2: "IE", name: "Irlanda", dial: "+353" },
  { iso2: "IS", name: "Islanda", dial: "+354" },
  { iso2: "IL", name: "Israele", dial: "+972" },
  { iso2: "IT", name: "Italia", dial: "+39" },
  { iso2: "LV", name: "Lettonia", dial: "+371" },
  { iso2: "LB", name: "Libano", dial: "+961" },
  { iso2: "LI", name: "Liechtenstein", dial: "+423" },
  { iso2: "LT", name: "Lituania", dial: "+370" },
  { iso2: "LU", name: "Lussemburgo", dial: "+352" },
  { iso2: "MK", name: "Macedonia del Nord", dial: "+389" },
  { iso2: "MT", name: "Malta", dial: "+356" },
  { iso2: "MA", name: "Marocco", dial: "+212" },
  { iso2: "MD", name: "Moldavia", dial: "+373" },
  { iso2: "MC", name: "Monaco", dial: "+377" },
  { iso2: "ME", name: "Montenegro", dial: "+382" },
  { iso2: "NO", name: "Norvegia", dial: "+47" },
  { iso2: "NL", name: "Paesi Bassi", dial: "+31" },
  { iso2: "PL", name: "Polonia", dial: "+48" },
  { iso2: "PT", name: "Portogallo", dial: "+351" },
  { iso2: "GB", name: "Regno Unito", dial: "+44" },
  { iso2: "CZ", name: "Repubblica Ceca", dial: "+420" },
  { iso2: "RO", name: "Romania", dial: "+40" },
  { iso2: "SM", name: "San Marino", dial: "+378" },
  { iso2: "RS", name: "Serbia", dial: "+381" },
  { iso2: "SK", name: "Slovacchia", dial: "+421" },
  { iso2: "SI", name: "Slovenia", dial: "+386" },
  { iso2: "ES", name: "Spagna", dial: "+34" },
  { iso2: "US", name: "Stati Uniti", dial: "+1" },
  { iso2: "SE", name: "Svezia", dial: "+46" },
  { iso2: "CH", name: "Svizzera", dial: "+41" },
  { iso2: "TN", name: "Tunisia", dial: "+216" },
  { iso2: "TR", name: "Turchia", dial: "+90" },
  { iso2: "UA", name: "Ucraina", dial: "+380" },
  { iso2: "HU", name: "Ungheria", dial: "+36" },
  { iso2: "VA", name: "Vaticano", dial: "+379" },
];

export const DEMO_DIAL_COUNTRIES: DemoDialCountry[] = [
  ...DEMO_DIAL_COUNTRIES_UNSORTED.filter(
    (country) => country.iso2 === DEMO_DEFAULT_DIAL_ISO,
  ),
  ...DEMO_DIAL_COUNTRIES_UNSORTED
    .filter((country) => country.iso2 !== DEMO_DEFAULT_DIAL_ISO)
    .sort((a, b) => a.name.localeCompare(b.name, "it")),
];

export function demoDialFlag(iso2: string) {
  return flagEmoji(iso2);
}

export function getDemoDialCountry(iso2: string): DemoDialCountry {
  return (
    DEMO_DIAL_COUNTRIES.find((country) => country.iso2 === iso2) ??
    DEMO_DIAL_COUNTRIES[0]
  );
}

export function normalizeDemoPhone(value: string) {
  return value.trim().replace(/\s+/g, " ");
}

export function composeDemoPhone(dial: string, national: string) {
  const dialDigits = dial.replace(/\D/g, "");
  let digits = national.replace(/\D/g, "");
  if (dialDigits && digits.startsWith(dialDigits)) {
    digits = digits.slice(dialDigits.length);
  }
  digits = digits.replace(/^0+/, "");
  return normalizeDemoPhone(`${dial} ${digits}`);
}

export function isValidDemoPhone(value: string) {
  const digits = value.replace(/\D/g, "");
  return digits.length >= 8 && digits.length <= 15;
}

export function isValidDemoPhoneParts(dial: string, national: string) {
  return isValidDemoPhone(composeDemoPhone(dial, national));
}
