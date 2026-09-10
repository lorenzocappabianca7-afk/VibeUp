/**
 * Master switch for in-app Stripe payments (location deposit + SIAE).
 *
 * Keep `false` while VibeUp does not charge users. Confirmation still creates
 * the event; deposit UI and the SIAE document block stay hidden.
 *
 * Flip to `true` to restore checkout, deposit UI, and the SIAE document option.
 * Do not delete payment code, types, or webhooks — they stay behind this flag.
 */
export const ONLINE_PAYMENTS_ENABLED = false;
