/**
 * Referral contest rules. Change prizes, the end instant, and the fraud
 * thresholds here. The landing and the admin both read this file.
 *
 * An invite counts only when the friend verified their email with this
 * person's VibeUpcode, at or before `endsAt`, and is not excluded.
 * Ties: the person who reached that invite count earlier wins.
 */

export const contestConfig = {
  /** 31 December 2026, 23:59 Italian time (CET). The whole minute counts. */
  endsAt: "2026-12-31T23:59:59.999+01:00",
  launchAt: "2027-01-01T00:00:00+01:00",
  prizes: [
    { place: 1, label: "1°", amount: "300 €", rank: "first" },
    { place: 2, label: "2°", amount: "150 €", rank: "second" },
    { place: 3, label: "3°", amount: "50 €", rank: "third" },
  ],
  redeemNote: "Premi in buoni VibeUp, riscattabili dal lancio dell’app, il 1° gennaio 2027.",
  /** More than this many signups from one ip_hash inside the window is flagged. */
  ipBurstLimit: 5,
  ipBurstWindowMs: 60 * 60 * 1000,
  /** More than this many signups with the same friend code inside the window is flagged. */
  referralBurstLimit: 5,
  referralBurstWindowMs: 10 * 60 * 1000,
} as const;

export type ContestPrize = (typeof contestConfig.prizes)[number];

export function contestEndsAtMs() {
  return Date.parse(contestConfig.endsAt);
}

export function isContestOver(now = Date.now()) {
  return now > contestEndsAtMs();
}

export function inviteCountsForContest(verifiedAt: string | null, now = Date.now()) {
  if (!verifiedAt) return false;
  const at = Date.parse(verifiedAt);
  if (!Number.isFinite(at)) return false;
  return at <= contestEndsAtMs() && at <= now;
}

export function topPrizeAmount() {
  return contestConfig.prizes.find((prize) => prize.place === 1)?.amount ?? "";
}
