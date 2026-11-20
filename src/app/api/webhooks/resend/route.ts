import { Resend } from "resend";
import { applyVerifyMailEvent, type VerifyMailStatus } from "@/server/repositories/waitlist";
import { type NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

const STATUSES: Record<string, VerifyMailStatus> = {
  "email.delivered": "delivered",
  "email.bounced": "bounced",
  "email.complained": "complained",
  "email.delivery_delayed": "delayed",
};

function header(request: NextRequest, names: string[]) {
  for (const name of names) {
    const value = request.headers.get(name);
    if (value) return value;
  }
  return "";
}

export async function POST(request: NextRequest) {
  const secret = process.env.RESEND_WEBHOOK_SECRET?.trim();
  if (!secret) return NextResponse.json({ ok: false }, { status: 503 });
  const payload = await request.text();
  const headers = {
    id: header(request, ["svix-id", "webhook-id"]),
    timestamp: header(request, ["svix-timestamp", "webhook-timestamp"]),
    signature: header(request, ["svix-signature", "webhook-signature"]),
  };
  try {
    const resend = new Resend(process.env.RESEND_API_KEY?.trim() || "re_webhook_verify_only");
    const event = resend.webhooks.verify({ payload, headers, webhookSecret: secret }) as {
      type?: string;
      data?: { email_id?: string; tags?: Record<string, string> };
    };
    const status = event.type ? STATUSES[event.type] : undefined;
    if (status) {
      await applyVerifyMailEvent({
        mailId: event.data?.email_id ?? "",
        signupId: event.data?.tags?.signup ?? null,
        status,
      }).catch(() => false);
    }
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ ok: false }, { status: 400 });
  }
}
