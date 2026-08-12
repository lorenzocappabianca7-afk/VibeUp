import { NextResponse, type NextRequest } from "next/server";
import { getStripe, getStripeWebhookSecret, isStripeConfigured } from "@/lib/stripe/server";
import { handleStripeCheckoutEvent } from "@/server/payments/deposit-checkout";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  if (!isStripeConfigured()) {
    return NextResponse.json(
      { error: "Stripe non configurato." },
      { status: 503 },
    );
  }

  const secret = getStripeWebhookSecret();
  if (!secret) {
    return NextResponse.json(
      { error: "STRIPE_WEBHOOK_SECRET mancante." },
      { status: 503 },
    );
  }

  const signature = request.headers.get("stripe-signature");
  if (!signature) {
    return NextResponse.json({ error: "Firma assente." }, { status: 400 });
  }

  const rawBody = await request.text();
  const stripe = getStripe();

  let event;
  try {
    event = stripe.webhooks.constructEvent(rawBody, signature, secret);
  } catch (err) {
    console.error(
      "[stripe webhook] signature",
      err instanceof Error ? err.message : err,
    );
    return NextResponse.json({ error: "Firma non valida." }, { status: 400 });
  }

  try {
    const result = await handleStripeCheckoutEvent(event);
    if (!result.ok) {
      console.error("[stripe webhook] handler", event.type, result.detail);
      return NextResponse.json(
        { error: result.detail ?? "Handler failed." },
        { status: 500 },
      );
    }
    return NextResponse.json({ ok: true, detail: result.detail });
  } catch (err) {
    console.error("[stripe webhook] exception", err);
    return NextResponse.json({ error: "Errore interno." }, { status: 500 });
  }
}
