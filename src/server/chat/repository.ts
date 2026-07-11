import type {
  ChatConversation,
  ChatMessage,
  ChatParticipant,
  IncomingWhatsAppMessage,
} from "@/server/chat/types";

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

function assertSupabaseConfigured() {
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error(
      "Supabase non configurato: imposta SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY.",
    );
  }
}

async function supabaseFetch<T>(
  path: string,
  init: RequestInit & { prefer?: string } = {},
): Promise<T> {
  assertSupabaseConfigured();

  const response = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    ...init,
    headers: {
      apikey: SUPABASE_SERVICE_ROLE_KEY!,
      authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
      "content-type": "application/json",
      ...(init.prefer ? { prefer: init.prefer } : {}),
      ...init.headers,
    },
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error(`Errore database chat: ${await response.text()}`);
  }

  if (response.status === 204) {
    return null as T;
  }

  return (await response.json()) as T;
}

function single<T>(items: T[]): T {
  const item = items[0];
  if (!item) throw new Error("Record chat non trovato.");
  return item;
}

export async function getConversationWithParticipants(conversationId: string) {
  const conversations = await supabaseFetch<ChatConversation[]>(
    `chat_conversations?id=eq.${encodeURIComponent(conversationId)}&select=*`,
  );
  const conversation = single(conversations);
  const participantIds = [
    conversation.user_participant_id,
    conversation.provider_participant_id,
  ].join(",");
  const participants = await supabaseFetch<ChatParticipant[]>(
    `chat_participants?id=in.(${participantIds})&select=*`,
  );
  const user = participants.find(
    (participant) => participant.id === conversation.user_participant_id,
  );
  const provider = participants.find(
    (participant) => participant.id === conversation.provider_participant_id,
  );

  if (!user || !provider) {
    throw new Error("Partecipanti chat mancanti.");
  }

  return { conversation, user, provider };
}

export async function insertOutboundWebMessage(input: {
  conversationId: string;
  senderParticipantId: string;
  senderRole: ChatParticipant["role"];
  body: string;
  whatsappMessageId?: string;
}) {
  const messages = await supabaseFetch<ChatMessage[]>("chat_messages", {
    method: "POST",
    prefer: "return=representation",
    body: JSON.stringify({
      conversation_id: input.conversationId,
      sender_participant_id: input.senderParticipantId,
      sender_role: input.senderRole,
      direction: "outbound",
      channel: "web_app",
      body: input.body,
      whatsapp_message_id: input.whatsappMessageId,
    }),
  });

  await touchConversation(input.conversationId);
  return single(messages);
}

export async function attachWhatsAppMessageId(
  messageId: string,
  whatsappMessageId: string,
) {
  await supabaseFetch<null>(
    `chat_messages?id=eq.${encodeURIComponent(messageId)}`,
    {
      method: "PATCH",
      prefer: "return=minimal",
      body: JSON.stringify({ whatsapp_message_id: whatsappMessageId }),
    },
  );
}

export async function markTemplateSent(conversationId: string) {
  await supabaseFetch<null>(
    `chat_conversations?id=eq.${encodeURIComponent(conversationId)}`,
    {
      method: "PATCH",
      prefer: "return=minimal",
      body: JSON.stringify({
        first_whatsapp_template_sent_at: new Date().toISOString(),
      }),
    },
  );
}

export async function findConversationForIncomingWhatsApp(
  message: IncomingWhatsAppMessage,
) {
  if (message.replyToMessageId) {
    const repliedMessages = await supabaseFetch<ChatMessage[]>(
      `chat_messages?whatsapp_message_id=eq.${encodeURIComponent(
        message.replyToMessageId,
      )}&select=*`,
    );
    const repliedMessage = repliedMessages[0];
    if (repliedMessage) {
      return getConversationWithParticipants(repliedMessage.conversation_id);
    }
  }

  const participants = await supabaseFetch<ChatParticipant[]>(
    `chat_participants?whatsapp_phone=eq.${encodeURIComponent(
      message.from,
    )}&select=*`,
  );
  const provider = participants[0];
  if (!provider) return null;

  const conversations = await supabaseFetch<ChatConversation[]>(
    `chat_conversations?provider_participant_id=eq.${provider.id}&select=*&order=last_message_at.desc&limit=1`,
  );
  const conversation = conversations[0];
  if (!conversation) return null;

  return getConversationWithParticipants(conversation.id);
}

export async function getMessageByWhatsAppId(whatsappMessageId: string) {
  const messages = await supabaseFetch<ChatMessage[]>(
    `chat_messages?whatsapp_message_id=eq.${encodeURIComponent(
      whatsappMessageId,
    )}&select=*&limit=1`,
  );

  return messages[0] ?? null;
}

export async function insertInboundWhatsAppMessage(input: {
  conversationId: string;
  senderParticipantId: string;
  senderRole: ChatParticipant["role"];
  message: IncomingWhatsAppMessage;
}) {
  const messages = await supabaseFetch<ChatMessage[]>("chat_messages", {
    method: "POST",
    prefer: "return=representation",
    body: JSON.stringify({
      conversation_id: input.conversationId,
      sender_participant_id: input.senderParticipantId,
      sender_role: input.senderRole,
      direction: "inbound",
      channel: "whatsapp",
      body: input.message.body,
      whatsapp_message_id: input.message.whatsappMessageId,
      whatsapp_reply_to_message_id: input.message.replyToMessageId,
      provider_payload: input.message.rawPayload,
    }),
  });

  await touchConversation(input.conversationId);
  return single(messages);
}

async function touchConversation(conversationId: string) {
  await supabaseFetch<null>(
    `chat_conversations?id=eq.${encodeURIComponent(conversationId)}`,
    {
      method: "PATCH",
      prefer: "return=minimal",
      body: JSON.stringify({
        last_message_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }),
    },
  );
}
