export function normalizeDemoPhone(value: string) {
  return value.trim().replace(/\s+/g, " ");
}

export function isValidDemoPhone(value: string) {
  const digits = value.replace(/\D/g, "");
  return digits.length >= 8 && digits.length <= 15;
}
