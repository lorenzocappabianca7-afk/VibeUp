import { getDepositCheckoutAmounts, roundCurrency } from "@/lib/booking-money";
import { getSiteUrl } from "@/lib/site";
import { getStripe, isStripeConfigured } from "@/lib/stripe/server";
import {
  createBookingFromRequest,
  extendSlotHoldForConfirmedRequest,
  getAvailabilityRequest,
  rowToAvailabilityRequest,
  updateAvailabilityRequestStatusAdmin,
} from "@/server/repositories/bookings";
import type {
  AvailabilityRequest,
  AvailabilityRequestStatus,
} from "@/types/availability-request";
import type { UserEvent } from "@/types/event";
import type Stripe from "stripe";

const PAYABLE_FROM: AvailabilityRequestStatus[] = [
  "pending_user_confirm",
  "pending_user_review_proposal",
  "pending_deposit_payment",
];

function depositTotalEuro(request: AvailabilityRequest): number {
  const selected =
    typeof request.userSelectedPrice === "number"
      ? request.userSelectedPrice
      : null;
  const totalCost =
    selected ??
    (typeof request.eventPayload.totalCost === "number"
      ? request.eventPayload.totalCost
      : 0);
  const depositBase =
    typeof request.eventPayload.depositAmount === "number" &&
    request.eventPayload.depositAmount > 0
      ? request.eventPayload.depositAmount
      : roundCurrency(totalCost * 0.3);
  return getDepositCheckoutAmounts(depositBase).total;
}

export async function startDepositCheckout(params: {
  requestId: string;
  organizerId: string;
  organizerEmail?: string | null;
  selectedDate?: string | null;
  selectedPrice?: number | null;
}): Promise<
  | {
      ok: true;
      checkoutUrl: string;
      sessionId: string;
      request: AvailabilityRequest;
    }
  | {
      ok: true;
      alreadyPaid: true;
      request: AvailabilityRequest;
      event?: UserEvent;
    }
  | { ok: false; error: string }
> {
  if (!isStripeConfigured()) {
    return {
      ok: false,
      error:
        "Pagamenti Stripe non configurati (STRIPE_SECRET_KEY). Imposta le chiavi su Vercel.",
    };
  }

  const row = await getAvailabilityRequest(params.requestId);
  if (!row) return { ok: false, error: "Richiesta non trovata." };
  let request = rowToAvailabilityRequest(row);

  if (request.requesterUserId !== params.organizerId) {
    return { ok: false, error: "Solo il richiedente può pagare la caparra." };
  }

  if (request.status === "confirmed") {
    return { ok: true, alreadyPaid: true, request };
  }

  if (
    request.status === "pending_deposit_payment" &&
    request.stripeCheckoutSessionId
  ) {
    try {
      const stripe = getStripe();
      const existing = await stripe.checkout.sessions.retrieve(
        request.stripeCheckoutSessionId,
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
          request,
        };
      }
      if (existing.payment_status === "paid") {
        const finalized = await finalizeDepositPayment({
          requestId: params.requestId,
          organizerId: params.organizerId,
          paymentIntentId:
            typeof existing.payment_intent === "string"
              ? existing.payment_intent
              : existing.payment_intent?.id ?? null,
          checkoutSessionId: existing.id,
        });
        if (!finalized.ok) return { ok: false, error: finalized.error };
        return {
          ok: true,
          alreadyPaid: true,
          request: finalized.request,
          event: finalized.event,
        };
      }
    } catch {
      // create a fresh session below
    }
  }

  if (!PAYABLE_FROM.includes(request.status)) {
    return {
      ok: false,
      error: "La richiesta non è pronta per il pagamento della caparra.",
    };
  }

  if (
    request.status === "pending_user_review_proposal" &&
    !params.selectedDate?.trim() &&
    !request.userSelectedDate
  ) {
    return { ok: false, error: "Seleziona una data proposta prima di pagare." };
  }

  const previousStatus: AvailabilityRequestStatus =
    request.status === "pending_deposit_payment"
      ? (request.statusBeforePayment ?? "pending_user_confirm")
      : request.status;

  const selectedDate =
    params.selectedDate?.trim() || request.userSelectedDate || null;
  const selectedPrice =
    typeof params.selectedPrice === "number"
      ? params.selectedPrice
      : request.userSelectedPrice;

  const moved = await updateAvailabilityRequestStatusAdmin({
    requestId: params.requestId,
    nextStatus: "pending_deposit_payment",
    patch: {
      status_before_payment: previousStatus,
      deposit_payment_status: "pending",
      user_selected_date: selectedDate,
      user_selected_price: selectedPrice,
    },
  });
  if (!moved.ok) return { ok: false, error: moved.error };
  request = moved.request;

  const amountEuro = depositTotalEuro(request);
  if (!(amountEuro > 0)) {
    const finalized = await finalizeDepositPayment({
      requestId: params.requestId,
      organizerId: params.organizerId,
      paymentIntentId: null,
      checkoutSessionId: null,
    });
    if (!finalized.ok) return { ok: false, error: finalized.error };
    return {
      ok: true,
      alreadyPaid: true,
      request: finalized.request,
      event: finalized.event,
    };
  }

  const amountCents = Math.round(amountEuro * 100);
  const site = getSiteUrl().replace(/\/$/, "");
  const stripe = getStripe();

  const session = await stripe.checkout.sessions.create({
    mode: "payment",
    customer_email:
      params.organizerEmail?.trim() || request.requesterEmail || undefined,
    line_items: [
      {
        quantity: 1,
        price_data: {
          currency: "eur",
          unit_amount: amountCents,
          product_data: {
            name: `Caparra VibeUp — ${request.eventPayload.title}`,
            description: `${request.locationName} · deposito di conferma (30% + fee)`,
          },
        },
      },
    ],
    metadata: {
      availability_request_id: params.requestId,
      organizer_id: params.organizerId,
      previous_status: previousStatus,
    },
    payment_intent_data: {
      metadata: {
        availability_request_id: params.requestId,
        organizer_id: params.organizerId,
      },
    },
    success_url: `${site}/booking/payment-success?request_id=${encodeURIComponent(params.requestId)}&session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${site}/booking/payment-cancel?request_id=${encodeURIComponent(params.requestId)}`,
    expires_at: Math.floor(Date.now() / 1000) + 30 * 60,
  });

  if (!session.url) {
    await revertDepositPayment({
      requestId: params.requestId,
      reason: "abandoned",
    });
    return { ok: false, error: "Impossibile creare la sessione Stripe." };
  }

  const saved = await updateAvailabilityRequestStatusAdmin({
    requestId: params.requestId,
    nextStatus: "pending_deposit_payment",
    patch: {
      stripe_checkout_session_id: session.id,
      stripe_payment_intent_id:
        typeof session.payment_intent === "string"
          ? session.payment_intent
          : null,
      deposit_payment_status: "pending",
    },
  });
  if (!saved.ok) {
    return { ok: false, error: saved.error };
  }

  return {
    ok: true,
    checkoutUrl: session.url,
    sessionId: session.id,
    request: saved.request,
  };
}

export async function revertDepositPayment(params: {
  requestId: string;
  reason: "abandoned" | "failed";
}): Promise<
  { ok: true; request: AvailabilityRequest } | { ok: false; error: string }
> {
  const row = await getAvailabilityRequest(params.requestId);
  if (!row) return { ok: false, error: "Richiesta non trovata." };
  const request = rowToAvailabilityRequest(row);

  if (request.status !== "pending_deposit_payment") {
    return { ok: true, request };
  }

  const previous = request.statusBeforePayment ?? "pending_user_confirm";
  const restoreTo: AvailabilityRequestStatus =
    previous === "pending_user_review_proposal"
      ? "pending_user_review_proposal"
      : "pending_user_confirm";

  return updateAvailabilityRequestStatusAdmin({
    requestId: params.requestId,
    nextStatus: restoreTo,
    patch: {
      deposit_payment_status: params.reason,
      stripe_checkout_session_id: null,
    },
  });
}

export async function finalizeDepositPayment(params: {
  requestId: string;
  organizerId: string;
  paymentIntentId: string | null;
  checkoutSessionId: string | null;
}): Promise<
  | { ok: true; request: AvailabilityRequest; event?: UserEvent }
  | { ok: false; error: string }
> {
  const row = await getAvailabilityRequest(params.requestId);
  if (!row) return { ok: false, error: "Richiesta non trovata." };
  let request = rowToAvailabilityRequest(row);

  if (request.status === "confirmed") {
    return { ok: true, request };
  }

  if (
    request.status !== "pending_deposit_payment" &&
    request.status !== "pending_user_confirm" &&
    request.status !== "pending_user_review_proposal"
  ) {
    return { ok: false, error: "Stato richiesta non pagabile." };
  }

  const confirmed = await updateAvailabilityRequestStatusAdmin({
    requestId: params.requestId,
    nextStatus: "confirmed",
    patch: {
      deposit_payment_status: "paid",
      stripe_checkout_session_id:
        params.checkoutSessionId ?? request.stripeCheckoutSessionId,
      stripe_payment_intent_id:
        params.paymentIntentId ?? request.stripePaymentIntentId,
    },
  });
  if (!confirmed.ok) return { ok: false, error: confirmed.error };
  request = confirmed.request;

  await extendSlotHoldForConfirmedRequest(request);

  if (request.eventPayload.requestKind === "service") {
    return { ok: true, request };
  }

  const overrideDate = request.userSelectedDate ?? request.eventPayload.date;
  const proposed =
    request.managerProposedDates?.find((slot) => slot.date === overrideDate) ??
    null;
  const booking = await createBookingFromRequest({
    request,
    organizerId: params.organizerId,
    override: {
      date: overrideDate,
      time: proposed?.time,
      endTime: proposed?.endTime,
      totalCost:
        typeof request.userSelectedPrice === "number"
          ? request.userSelectedPrice
          : undefined,
    },
    markDepositPaid: true,
    stripePaymentIntentId: params.paymentIntentId,
  });

  if (!booking.ok) {
    return { ok: false, error: booking.error };
  }

  return { ok: true, request, event: booking.event };
}

export async function handleStripeCheckoutEvent(
  event: Stripe.Event,
): Promise<{ ok: boolean; detail?: string }> {
  if (event.type === "checkout.session.completed") {
    const session = event.data.object as Stripe.Checkout.Session;
    const requestId = session.metadata?.availability_request_id;
    const organizerId = session.metadata?.organizer_id;
    if (!requestId || !organizerId) {
      return { ok: false, detail: "metadata mancanti" };
    }
    if (session.payment_status !== "paid") {
      return { ok: true, detail: "session not paid yet" };
    }
    const paymentIntentId =
      typeof session.payment_intent === "string"
        ? session.payment_intent
        : session.payment_intent?.id ?? null;

    const result = await finalizeDepositPayment({
      requestId,
      organizerId,
      paymentIntentId,
      checkoutSessionId: session.id,
    });
    return result.ok
      ? { ok: true, detail: "confirmed" }
      : { ok: false, detail: result.error };
  }

  if (event.type === "checkout.session.expired") {
    const session = event.data.object as Stripe.Checkout.Session;
    const requestId = session.metadata?.availability_request_id;
    if (!requestId) return { ok: false, detail: "metadata mancanti" };
    const result = await revertDepositPayment({
      requestId,
      reason: "abandoned",
    });
    return result.ok
      ? { ok: true, detail: "reverted abandoned" }
      : { ok: false, detail: result.error };
  }

  if (event.type === "payment_intent.payment_failed") {
    const intent = event.data.object as Stripe.PaymentIntent;
    const requestId = intent.metadata?.availability_request_id;
    if (!requestId) return { ok: true, detail: "no request metadata" };
    const result = await revertDepositPayment({
      requestId,
      reason: "failed",
    });
    return result.ok
      ? { ok: true, detail: "reverted failed" }
      : { ok: false, detail: result.error };
  }

  return { ok: true, detail: `ignored ${event.type}` };
}
