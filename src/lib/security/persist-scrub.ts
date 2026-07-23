/**
 * Strip prototype-pollution vectors and oversized / unexpected shapes
 * from persisted JSON before it enters app state.
 */

const DANGEROUS_KEYS = new Set(["__proto__", "prototype", "constructor"]);

export function scrubPersistedJson<T>(value: T, depth = 0): T {
  if (depth > 10 || value === null || typeof value !== "object") {
    return value;
  }

  if (Array.isArray(value)) {
    return value.map((item) => scrubPersistedJson(item, depth + 1)) as T;
  }

  const input = value as Record<string, unknown>;
  const output: Record<string, unknown> = {};
  for (const [key, nested] of Object.entries(input)) {
    if (DANGEROUS_KEYS.has(key)) continue;
    output[key] = scrubPersistedJson(nested, depth + 1);
  }
  return output as T;
}
