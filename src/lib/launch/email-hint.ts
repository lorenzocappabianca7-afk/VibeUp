import { normalizeEmail } from "@/lib/launch/fields";

/** Domains people usually mean. A close miss gets a suggestion, not a network call. */
const COMMON_DOMAINS = [
  "gmail.com",
  "googlemail.com",
  "hotmail.com",
  "hotmail.it",
  "outlook.com",
  "outlook.it",
  "live.com",
  "live.it",
  "libero.it",
  "icloud.com",
  "me.com",
  "yahoo.com",
  "yahoo.it",
  "virgilio.it",
] as const;

const KNOWN = new Set<string>(COMMON_DOMAINS);

function distance(left: string, right: string) {
  const rows = left.length + 1;
  const cols = right.length + 1;
  const grid = Array.from({ length: rows }, () => new Array<number>(cols).fill(0));
  for (let row = 0; row < rows; row += 1) grid[row][0] = row;
  for (let col = 0; col < cols; col += 1) grid[0][col] = col;
  for (let row = 1; row < rows; row += 1) {
    for (let col = 1; col < cols; col += 1) {
      const cost = left[row - 1] === right[col - 1] ? 0 : 1;
      grid[row][col] = Math.min(
        grid[row - 1][col] + 1,
        grid[row][col - 1] + 1,
        grid[row - 1][col - 1] + cost,
      );
    }
  }
  return grid[left.length][right.length];
}

/** A likely typo of a common domain, or null when the address already looks intentional. */
export function suggestEmail(value: string) {
  const email = normalizeEmail(value);
  const at = email.lastIndexOf("@");
  if (at <= 0 || at !== email.indexOf("@")) return null;
  const local = email.slice(0, at);
  const domain = email.slice(at + 1);
  if (!local || !domain.includes(".") || KNOWN.has(domain)) return null;
  let best: string | null = null;
  let bestDistance = 3;
  for (const candidate of COMMON_DOMAINS) {
    if (Math.abs(candidate.length - domain.length) > 2) continue;
    const score = distance(domain, candidate);
    if (score > 0 && score < bestDistance) {
      best = candidate;
      bestDistance = score;
    }
  }
  if (!best) return null;
  return `${local}@${best}`;
}
