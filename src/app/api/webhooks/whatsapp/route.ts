import { NextResponse, type NextRequest } from "next/server";
import {
  findConversationForIncomingWhatsApp,
  getMessageByWhatsAppId,
  insertInboundWhatsAppMessage,
} from "@/server/chat/repository";
import type { IncomingWhatsAppMessage } from "@/server/chat/types";
import { rateLimit } from "@/server/http/rate-limit";
import {
  rejectLargeRequest,
  REQUEST_LIMITS,
} from "@/server/http/request-limits";
import { createHmac, timingSafeEqual } from "node:crypto";

export const runtime = "nodejs";

const VERIFY_TOKEN = process.env.WHATSAPP_WEBHOOK_VERIFY_TOKEN;
const APP_SECRET = process.env.WHATSAPP_APP_SECRET;

interface MetaWhatsAppWebhookBody {
  entry?: Array<{
    changes?: Array<{
      value?: {
        messages?: Array<{
          id: string;
          from: string;
          text?: { body?: string };
          context?: { id?: string };
          type?: string;
        }>;
      };
    }>;
  }>;
}

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const mode = searchParams.get("hub.mode");
  const token = searchParams.get("hub.verify_token");
  const challenge = searchParams.get("hub.challenge");

  if (mode === "subscribe" && token && token === VERIFY_TOKEN && challenge) {
    return new Response(challenge, { status: 200 });
  }

  return NextResponse.json({ error: "Webhook non autorizzato." }, { status: 403 });
}

export async function POST(request: NextRequest) {
  try {
    const limited = rateLimit(request, {
      scope: "whatsapp-webhook",
      limit: 300,
      windowMs: 60_000,
    });
    if (limited) return limited;

    const tooLarge = rejectLargeRequest(request, REQUEST_LIMITS.webhookBodyBytes);
    if (tooLarge) return tooLarge;

    const rawBody = await request.text();
    if (!verifyMetaSignature(rawBody, request.headers.get("x-hub-signature-256"))) {
      return NextResponse.json(
        { error: "Firma webhook non valida." },
        { status: 401 },
      );
    }

    const body = JSON.parse(rawBody) as MetaWhatsAppWebhookBody;
    const incomingMessages = extractIncomingMessages(body).slice(
      0,
      REQUEST_LIMITS.maxWebhookMessages,
    );

    const savedMessages = await Promise.all(
      incomingMessages.map(async (message) => {
        const existingMessage = await getMessageByWhatsAppId(
          message.whatsappMessageId,
        );
        if (existingMessage) return existingMessage;

        const match = await findConversationForIncomingWhatsApp(message);
        if (!match) return null;

        return insertInboundWhatsAppMessage({
          conversationId: match.conversation.id,
          senderParticipantId: match.provider.id,
          senderRole: match.provider.role,
          message,
        });
      }),
    );

    return NextResponse.json({
      data: {
        received: incomingMessages.length,
        saved: savedMessages.filter(Boolean).length,
      },
    });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Webhook WhatsApp non elaborato.",
      },
      { status: 400 },
    );
  }
}

function verifyMetaSignature(rawBody: string, signature: string | null) {
  if (!APP_SECRET || !signature?.startsWith("sha256=")) return false;

  const expected = createHmac("sha256", APP_SECRET)
    .update(rawBody)
    .digest("hex");
  const received = signature.slice("sha256=".length);
  const expectedBuffer = Buffer.from(expected, "hex");
  const receivedBuffer = Buffer.from(received, "hex");

  return (
    expectedBuffer.length === receivedBuffer.length &&
    timingSafeEqual(expectedBuffer, receivedBuffer)
  );
}

function extractIncomingMessages(
  body: MetaWhatsAppWebhookBody,
): IncomingWhatsAppMessage[] {
  return (body.entry ?? []).flatMap((entry) =>
    (entry.changes ?? []).flatMap((change) =>
      (change.value?.messages ?? []).flatMap((message) => {
        const text = message.text?.body?.trim();
        if (!text || message.type !== "text") return [];

        return {
          from: message.from,
          body: text,
          whatsappMessageId: message.id,
          replyToMessageId: message.context?.id,
          rawPayload: message,
        };
      }),
    ),
  );
}
