export type ChatParticipantRole =
  | "user"
  | "venue_manager"
  | "dj"
  | "photographer"
  | "decorator"
  | "catering"
  | "security"
  | "other_provider"
  | "system";

export interface ChatParticipant {
  id: string;
  app_user_id?: string | null;
  role: ChatParticipantRole;
  display_name: string;
  whatsapp_phone?: string | null;
  service_id?: string | null;
  location_id?: string | null;
}

export interface ChatConversation {
  id: string;
  user_participant_id: string;
  provider_participant_id: string;
  event_id?: string | null;
  service_id?: string | null;
  location_id?: string | null;
  subject?: string | null;
  first_whatsapp_template_sent_at?: string | null;
}

export interface ChatMessage {
  id: string;
  conversation_id: string;
  sender_participant_id?: string | null;
  sender_role: ChatParticipantRole;
  direction: "inbound" | "outbound";
  channel: "web_app" | "whatsapp";
  body: string;
  whatsapp_message_id?: string | null;
  whatsapp_reply_to_message_id?: string | null;
  provider_payload?: unknown;
  created_at?: string;
}

export interface SendChatMessageInput {
  conversationId: string;
  senderParticipantId: string;
  body: string;
}

export interface IncomingWhatsAppMessage {
  from: string;
  body: string;
  whatsappMessageId: string;
  replyToMessageId?: string;
  rawPayload: unknown;
}
