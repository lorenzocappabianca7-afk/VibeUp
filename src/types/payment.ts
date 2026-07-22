export interface SavedPaymentCard {
  id: string;
  brand: string;
  /** Only the last 4 digits — never the full PAN. */
  last4: string;
  expiry: string;
  cardholderName: string;
  createdAt: string;
  /** Opaque non-reversible reference for the saved method. */
  fingerprint: string;
}
