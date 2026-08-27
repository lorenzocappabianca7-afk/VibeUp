import {
  SIAE_PERMIT_RECORDED_EUR,
  SIAE_VIBEUP_FEE_EUR,
  SIAE_VIBEUP_TOTAL_EUR,
  formatSiaePrice,
} from "@/lib/siae";
import { getSiteUrl } from "@/lib/site";
import { getStripe, isStripeConfigured } from "@/lib/stripe/server";
import {
  bookingRowToUserEvent,
  getBookingRow,
  updateBookingSiae,
} from "@/server/repositories/bookings";
import { notifyTeamSiaeManaged } from "@/lib/email/send-siae-managed-email";
import type { UserEvent } from "@/types/event";
import type Stripe from "stripe";

export async function startSiaeCheckout(params: {
  bookingId: string;
  organizerId: string;
  organizerEmail?: string | null;
}): Promise<
  | { ok: true; checkoutUrl: string; sessionId: string; event: UserEvent }
  | { ok: true; alreadyPaid: true; event: UserEvent }
  | { ok: false; error: string }
> {
  if (!isStripeConfigured()) {
    return {
      ok: false,
      error:
        "Pagamenti Stripe non configurati (STRIPE_SECRET_KEY). Imposta le chiavi su Vercel.",
    };
  }

  const row = await getBookingRow(params.bookingId);
  if (!row) return { ok: false, error: "Evento non trovato." };
  if (row.organizer_id !== params.organizerId) {
    return {
      ok: false,
      error: "Solo l’organizzatore può pagare il documento SIAE.",
    };
  }

  if (row.siae_status === "managed") {
    return { ok: true, alreadyPaid: true, event: bookingRowToUserEvent(row) };
  }

  if (row.siae_status === "pending_payment" && row.siae_stripe_checkout_session_id) {
    try {
      const stripe = getStripe();
      const existing = await stripe.checkout.sessions.retrieve(
        row.siae_stripe_checkout_session_id,
      );
      if (
        existing.status === "open" &&
        typeof existing.url === "string" &&
        existing.url
      ) {
        return {
          ok: true,
          checkoutUrl: existing.url,
          sessionId: existing.id,
          event: bookingRowToUserEvent(row),
        };
      }
      if (existing.payment_status === "paid") {
        const finalized = await finalizeSiaePayment({
          bookingId: params.bookingId,
          paymentIntentId:
            typeof existing.payment_intent === "string"
              ? existing.payment_intent
              : existing.payment_intent?.id ?? null,
          checkoutSessionId: existing.id,
        });
        if (!finalized.ok) return { ok: false, error: finalized.error };
        return { ok: true, alreadyPaid: true, event: finalized.event };
      }
    } catch {
      // create a fresh session below
    }
  }

  const amountCents = Math.round(SIAE_VIBEUP_TOTAL_EUR * 100);
  if (!(amountCents > 0)) {
    const finalized = await finalizeSiaePayment({
      bookingId: params.bookingId,
      paymentIntentId: null,
      checkoutSessionId: null,
    });
    if (!finalized.ok) return { ok: false, error: finalized.error };
    return { ok: true, alreadyPaid: true, event: finalized.event };
  }

  const pending = await updateBookingSiae({
    bookingId: params.bookingId,
    organizerId: params.organizerId,
    patch: {
      siae_choice: "vibeup",
      siae_status: "pending_payment",
    },
  });
  if (!pending.ok) return pending;

  const site = getSiteUrl().replace(/\/$/, "");
  const stripe = getStripe();
  const session = await stripe.checkout.sessions.create({
    mode: "payment",
    customer_email: params.organizerEmail?.trim() || undefined,
    line_items: [
      {
        quantity: 1,
        price_data: {
          currency: "eur",
          unit_amount: amountCents,
          product_data: {
            name: `Documento SIAE — ${row.title}`,
            description: `Permesso SIAE ${formatSiaePrice(SIAE_PERMIT_RECORDED_EUR)} + gestione VibeUp ${formatSiaePrice(SIAE_VIBEUP_FEE_EUR)}`,
          },
        },
      },
    ],
    metadata: {
      kind: "siae",
      booking_id: params.bookingId,
      organizer_id: params.organizerId,
    },
    payment_intent_data: {
      metadata: {
        kind: "siae",
        booking_id: params.bookingId,
        organizer_id: params.organizerId,
      },
    },
    success_url: `${site}/booking/payment-success?kind=siae&booking_id=${encodeURIComponent(params.bookingId)}&session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${site}/booking/payment-cancel?kind=siae&booking_id=${encodeURIComponent(params.bookingId)}`,
    expires_at: Math.floor(Date.now() / 1000) + 30 * 60,
  });

  if (!session.url) {
    await updateBookingSiae({
      bookingId: params.bookingId,
      patch: { siae_status: "unselected", siae_choice: null },
    });
    return { ok: false, error: "Impossibile creare la sessione Stripe." };
  }

  const saved = await updateBookingSiae({
    bookingId: params.bookingId,
    patch: {
      siae_choice: "vibeup",
      siae_status: "pending_payment",
      siae_stripe_checkout_session_id: session.id,
      siae_stripe_payment_intent_id:
        typeof session.payment_intent === "string"
          ? session.payment_intent
          : null,
    },
  });
  if (!saved.ok) return saved;

  return {
    ok: true,
    checkoutUrl: session.url,
    sessionId: session.id,
    event: saved.event,
  };
}

export async function revertSiaeCheckout(params: {
  bookingId: string;
}): Promise<{ ok: true; event: UserEvent } | { ok: false; error: string }> {
  const row = await getBookingRow(params.bookingId);
  if (!row) return { ok: false, error: "Evento non trovato." };
  if (row.siae_status === "managed") {
    return { ok: true, event: bookingRowToUserEvent(row) };
  }
  if (row.siae_status !== "pending_payment") {
    return { ok: true, event: bookingRowToUserEvent(row) };
  }

  return updateBookingSiae({
    bookingId: params.bookingId,
    patch: {
      siae_choice: null,
      siae_status: "unselected",
      siae_stripe_checkout_session_id: null,
    },
  });
}

export async function finalizeSiaePayment(params: {
  bookingId: string;
  paymentIntentId: string | null;
  checkoutSessionId: string | null;
}): Promise<{ ok: true; event: UserEvent } | { ok: false; error: string }> {
  const row = await getBookingRow(params.bookingId);
  if (!row) return { ok: false, error: "Evento non trovato." };

  if (row.siae_status === "managed") {
    return { ok: true, event: bookingRowToUserEvent(row) };
  }

  const paidAt = new Date().toISOString();
  const saved = await updateBookingSiae({
    bookingId: params.bookingId,
    patch: {
      siae_choice: "vibeup",
      siae_status: "managed",
      siae_paid_at: paidAt,
      siae_stripe_checkout_session_id:
        params.checkoutSessionId ?? row.siae_stripe_checkout_session_id,
      siae_stripe_payment_intent_id:
        params.paymentIntentId ?? row.siae_stripe_payment_intent_id,
    },
  });
  if (!saved.ok) return saved;

  if (!row.siae_notified_at) {
    const notified = await notifyTeamSiaeManaged({
      eventTitle: row.title,
      eventDate: row.event_date,
      eventTime: row.start_time,
      locationName: row.location_name,
      city: row.city,
      guestCount: Number(row.guest_count) || 0,
      bookingId: row.id,
      organizerId: row.organizer_id,
    });
    if (notified.ok) {
      await updateBookingSiae({
        bookingId: params.bookingId,
        patch: { siae_notified_at: new Date().toISOString() },
      });
    }
  }

  return saved;
}

export async function handleSiaeStripeEvent(
  event: Stripe.Event,
): Promise<{ ok: boolean; detail?: string } | null> {
  if (event.type === "checkout.session.completed") {
    const session = event.data.object as Stripe.Checkout.Session;
    if (session.metadata?.kind !== "siae") return null;
    const bookingId = session.metadata.booking_id;
    if (!bookingId) return { ok: false, detail: "booking_id mancante" };
    if (session.payment_status !== "paid") {
      return { ok: true, detail: "siae session not paid yet" };
    }
    const paymentIntentId =
      typeof session.payment_intent === "string"
        ? session.payment_intent
        : session.payment_intent?.id ?? null;
    const result = await finalizeSiaePayment({
      bookingId,
      paymentIntentId,
      checkoutSessionId: session.id,
    });
    return result.ok
      ? { ok: true, detail: "siae managed" }
      : { ok: false, detail: result.error };
  }

  if (event.type === "checkout.session.expired") {
    const session = event.data.object as Stripe.Checkout.Session;
    if (session.metadata?.kind !== "siae") return null;
    const bookingId = session.metadata.booking_id;
    if (!bookingId) return { ok: false, detail: "booking_id mancante" };
    const result = await revertSiaeCheckout({ bookingId });
    return result.ok
      ? { ok: true, detail: "siae reverted expired" }
      : { ok: false, detail: result.error };
  }

  if (event.type === "payment_intent.payment_failed") {
    const intent = event.data.object as Stripe.PaymentIntent;
    if (intent.metadata?.kind !== "siae") return null;
    const bookingId = intent.metadata.booking_id;
    if (!bookingId) return { ok: true, detail: "siae no booking metadata" };
    const result = await revertSiaeCheckout({ bookingId });
    return result.ok
      ? { ok: true, detail: "siae reverted failed" }
      : { ok: false, detail: result.error };
  }

  return null;
}
