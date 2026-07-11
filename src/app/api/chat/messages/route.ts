import { NextResponse, type NextRequest } from "next/server";
import {
  getConversationWithParticipants,
  insertOutboundWebMessage,
  markTemplateSent,
} from "@/server/chat/repository";
import type { SendChatMessageInput } from "@/server/chat/types";
import {
  sendWhatsAppTemplate,
  sendWhatsAppText,
} from "@/server/chat/whatsapp";
import { rateLimit } from "@/server/http/rate-limit";
import {
  limitText,
  rejectLargeRequest,
  REQUEST_LIMITS,
} from "@/server/http/request-limits";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  try {
    const limited = rateLimit(request, {
      scope: "chat-send",
      limit: 30,
      windowMs: 60_000,
    });
    if (limited) return limited;

    const tooLarge = rejectLargeRequest(request, REQUEST_LIMITS.quoteBodyBytes);
    if (tooLarge) return tooLarge;

    const input = (await request.json()) as SendChatMessageInput;
    const body = input.body
      ? limitText(input.body, REQUEST_LIMITS.chatMessageChars)
      : "";
    if (!input.conversationId || !input.senderParticipantId || !body) {
      return NextResponse.json(
        { error: "Messaggio chat non valido." },
        { status: 422 },
      );
    }

    const { conversation, user, provider } =
      await getConversationWithParticipants(input.conversationId);
    if (input.senderParticipantId !== user.id) {
      return NextResponse.json(
        { error: "Mittente chat non autorizzato." },
        { status: 403 },
      );
    }

    if (!provider.whatsapp_phone) {
      return NextResponse.json(
        { error: "Il fornitore non ha un numero WhatsApp associato." },
        { status: 422 },
      );
    }

    const whatsappMessageId = conversation.first_whatsapp_template_sent_at
      ? await sendWhatsAppText({
          to: provider.whatsapp_phone,
          body,
        })
      : await sendWhatsAppTemplate({
          to: provider.whatsapp_phone,
          userName: user.display_name,
          serviceName: provider.display_name,
          previewMessage: body,
        });

    const message = await insertOutboundWebMessage({
      conversationId: conversation.id,
      senderParticipantId: user.id,
      senderRole: "user",
      body,
      whatsappMessageId,
    });

    if (!conversation.first_whatsapp_template_sent_at) {
      await markTemplateSent(conversation.id);
    }

    return NextResponse.json({
      data: { ...message, whatsapp_message_id: whatsappMessageId },
    });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Impossibile inviare il messaggio.",
      },
      { status: 400 },
    );
  }
}
