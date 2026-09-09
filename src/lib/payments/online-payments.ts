/**
 * Master switch for in-app Stripe payments (location deposit + SIAE).
 *
 * Keep `false` while VibeUp does not charge users. Confirmation still creates
 * the event; SIAE stays limited to fai-da-te / locale.
 *
 * Flip to `true` to restore checkout, deposit UI, and the VibeUp SIAE option.
 * Do not delete payment code, types, or webhooks — they stay behind this flag.
 */
export const ONLINE_PAYMENTS_ENABLED = false;
