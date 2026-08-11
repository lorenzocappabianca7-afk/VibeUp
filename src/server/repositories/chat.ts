import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { isSupabaseConfigured } from "@/lib/supabase/env";

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

export interface ChatInboxItem {
  id: string;
  title: string;
  preview: string;
  updatedAt: string;
  unreadCount: number;
  locationId?: string;
  serviceId?: string;
  kind: "vendor";
}

export interface ChatThreadMessage {
  id: string;
  conversationId: string;
  sender: "me" | "them";
  body: string;
  createdAt: string;
  status?: "sent" | "delivered" | "read";
}

function roleForCategory(category?: string): ChatParticipantRole {
  if (category === "dj") return "dj";
  if (category === "fotografo") return "photographer";
  if (category === "decorazioni") return "decorator";
  if (category === "locali") return "venue_manager";
  return "other_provider";
}

export async function ensureUserParticipant(params: {
  userId: string;
  displayName: string;
}): Promise<string> {
  const supabase = getSupabaseAdmin();
  const { data: existing } = await supabase
    .from("chat_participants")
    .select("id")
    .eq("app_user_id", params.userId)
    .eq("role", "user")
    .maybeSingle();

  if (existing?.id) return existing.id as string;

  const { data, error } = await supabase
    .from("chat_participants")
    .insert({
      app_user_id: params.userId,
      role: "user",
      display_name: params.displayName || "Utente VibeUp",
    })
    .select("id")
    .single();

  if (error || !data) {
    throw new Error(error?.message ?? "Impossibile creare partecipante utente.");
  }
  return data.id as string;
}

export async function ensureProviderParticipant(params: {
  displayName: string;
  locationId?: string;
  serviceId?: string;
  category?: string;
}): Promise<string> {
  const supabase = getSupabaseAdmin();
  const locationId = params.locationId?.trim() || null;
  const serviceId = params.serviceId?.trim() || null;
  const role = roleForCategory(params.category);

  let query = supabase.from("chat_participants").select("id").eq("role", role);
  if (locationId) query = query.eq("location_id", locationId);
  if (serviceId) query = query.eq("service_id", serviceId);

  const { data: existing } = await query.maybeSingle();
  if (existing?.id) return existing.id as string;

  const { data, error } = await supabase
    .from("chat_participants")
    .insert({
      role,
      display_name: params.displayName,
      location_id: locationId,
      service_id: serviceId,
      whatsapp_phone: null,
    })
    .select("id")
    .single();

  if (error || !data) {
    throw new Error(error?.message ?? "Impossibile creare partecipante provider.");
  }
  return data.id as string;
}

export async function ensureConversation(params: {
  userParticipantId: string;
  providerParticipantId: string;
  locationId?: string;
  serviceId?: string;
  subject?: string;
}): Promise<{ id: string; created: boolean }> {
  const supabase = getSupabaseAdmin();
  const locationId = params.locationId?.trim() || "";
  const serviceId = params.serviceId?.trim() || "";

  const { data: existing } = await supabase
    .from("chat_conversations")
    .select("id")
    .eq("user_participant_id", params.userParticipantId)
    .eq("provider_participant_id", params.providerParticipantId)
    .eq("event_id", "")
    .eq("location_id", locationId)
    .eq("service_id", serviceId)
    .maybeSingle();

  if (existing?.id) {
    return { id: existing.id as string, created: false };
  }

  const { data, error } = await supabase
    .from("chat_conversations")
    .insert({
      user_participant_id: params.userParticipantId,
      provider_participant_id: params.providerParticipantId,
      event_id: "",
      location_id: locationId,
      service_id: serviceId,
      subject: params.subject ?? null,
    })
    .select("id")
    .single();

  if (error || !data) {
    throw new Error(error?.message ?? "Impossibile creare conversazione.");
  }
  return { id: data.id as string, created: true };
}

export async function listInboxForUser(
  userId: string,
): Promise<ChatInboxItem[]> {
  if (!isSupabaseConfigured()) return [];
  const supabase = getSupabaseAdmin();

  const { data: userParts } = await supabase
    .from("chat_participants")
    .select("id")
    .eq("app_user_id", userId)
    .eq("role", "user");

  const userPartIds = (userParts ?? []).map((row) => row.id as string);
  if (userPartIds.length === 0) return [];

  const { data: conversations, error } = await supabase
    .from("chat_conversations")
    .select(
      "id, subject, location_id, service_id, last_message_at, updated_at, created_at, provider_participant_id",
    )
    .in("user_participant_id", userPartIds)
    .order("last_message_at", { ascending: false, nullsFirst: false })
    .limit(50);

  if (error || !conversations) {
    console.error("[chat] listInboxForUser", error?.message);
    return [];
  }

  const providerIds = conversations.map((c) => c.provider_participant_id);
  const { data: providers } = await supabase
    .from("chat_participants")
    .select("id, display_name")
    .in("id", providerIds);

  const providerName = new Map(
    (providers ?? []).map((p) => [p.id as string, p.display_name as string]),
  );

  const items: ChatInboxItem[] = [];
  for (const conversation of conversations) {
    const { data: lastMessages } = await supabase
      .from("chat_messages")
      .select("body, created_at")
      .eq("conversation_id", conversation.id)
      .order("created_at", { ascending: false })
      .limit(1);

    const last = lastMessages?.[0];
    items.push({
      id: conversation.id as string,
      title:
        (conversation.subject as string | null) ||
        providerName.get(conversation.provider_participant_id as string) ||
        "Conversazione",
      preview: (last?.body as string | undefined) || "Nessun messaggio ancora",
      updatedAt:
        (last?.created_at as string | undefined) ||
        (conversation.last_message_at as string | null) ||
        (conversation.updated_at as string) ||
        (conversation.created_at as string),
      unreadCount: 0,
      locationId: (conversation.location_id as string) || undefined,
      serviceId: (conversation.service_id as string) || undefined,
      kind: "vendor",
    });
  }

  return items;
}

export async function listMessagesForUser(params: {
  userId: string;
  conversationId: string;
}): Promise<ChatThreadMessage[]> {
  const supabase = getSupabaseAdmin();
  const { data: conversation } = await supabase
    .from("chat_conversations")
    .select("id, user_participant_id")
    .eq("id", params.conversationId)
    .maybeSingle();

  if (!conversation) return [];

  const { data: userPart } = await supabase
    .from("chat_participants")
    .select("id, app_user_id")
    .eq("id", conversation.user_participant_id)
    .maybeSingle();

  if (!userPart || userPart.app_user_id !== params.userId) {
    throw new Error("Conversazione non autorizzata.");
  }

  const { data: messages, error } = await supabase
    .from("chat_messages")
    .select(
      "id, conversation_id, sender_participant_id, direction, body, created_at, delivered_at, read_at",
    )
    .eq("conversation_id", params.conversationId)
    .order("created_at", { ascending: true })
    .limit(200);

  if (error || !messages) {
    console.error("[chat] listMessagesForUser", error?.message);
    return [];
  }

  return messages.map((message) => {
    const isMe =
      message.sender_participant_id === conversation.user_participant_id ||
      message.direction === "outbound";
    return {
      id: message.id as string,
      conversationId: message.conversation_id as string,
      sender: isMe ? ("me" as const) : ("them" as const),
      body: message.body as string,
      createdAt: message.created_at as string,
      status: message.read_at
        ? ("read" as const)
        : message.delivered_at
          ? ("delivered" as const)
          : ("sent" as const),
    };
  });
}

export async function sendInAppMessage(params: {
  userId: string;
  conversationId: string;
  body: string;
}): Promise<ChatThreadMessage> {
  const supabase = getSupabaseAdmin();
  const { data: conversation } = await supabase
    .from("chat_conversations")
    .select("id, user_participant_id")
    .eq("id", params.conversationId)
    .maybeSingle();

  if (!conversation) {
    throw new Error("Conversazione non trovata.");
  }

  const { data: userPart } = await supabase
    .from("chat_participants")
    .select("id, app_user_id")
    .eq("id", conversation.user_participant_id)
    .maybeSingle();

  if (!userPart || userPart.app_user_id !== params.userId) {
    throw new Error("Mittente non autorizzato.");
  }

  const now = new Date().toISOString();
  const { data: message, error } = await supabase
    .from("chat_messages")
    .insert({
      conversation_id: params.conversationId,
      sender_participant_id: userPart.id,
      sender_role: "user",
      direction: "outbound",
      channel: "web_app",
      body: params.body,
      delivered_at: now,
    })
    .select("id, conversation_id, body, created_at, delivered_at, read_at")
    .single();

  if (error || !message) {
    throw new Error(error?.message ?? "Invio messaggio fallito.");
  }

  await supabase
    .from("chat_conversations")
    .update({ last_message_at: now, updated_at: now })
    .eq("id", params.conversationId);

  return {
    id: message.id as string,
    conversationId: message.conversation_id as string,
    sender: "me",
    body: message.body as string,
    createdAt: message.created_at as string,
    status: "delivered",
  };
}
