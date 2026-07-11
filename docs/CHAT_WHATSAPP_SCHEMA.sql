-- Chat bidirezionale VibeUp: Supabase/Postgres schema.
-- Provider target: Meta WhatsApp Cloud API.

create extension if not exists pgcrypto;

create type chat_participant_role as enum (
  'user',
  'venue_manager',
  'dj',
  'photographer',
  'decorator',
  'catering',
  'security',
  'other_provider',
  'system'
);

create type chat_message_channel as enum (
  'web_app',
  'whatsapp'
);

create type chat_message_direction as enum (
  'inbound',
  'outbound'
);

create table chat_participants (
  id uuid primary key default gen_random_uuid(),
  app_user_id text,
  role chat_participant_role not null,
  display_name text not null,
  whatsapp_phone text,
  service_id text,
  location_id text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint chat_participants_provider_contact check (
    role = 'user' or whatsapp_phone is not null
  )
);

create table chat_conversations (
  id uuid primary key default gen_random_uuid(),
  user_participant_id uuid not null references chat_participants(id) on delete cascade,
  provider_participant_id uuid not null references chat_participants(id) on delete cascade,
  event_id text,
  service_id text,
  location_id text,
  subject text,
  last_message_at timestamptz,
  first_whatsapp_template_sent_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint chat_conversation_pair_unique unique (
    user_participant_id,
    provider_participant_id,
    event_id,
    service_id,
    location_id
  )
);

create table chat_messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references chat_conversations(id) on delete cascade,
  sender_participant_id uuid references chat_participants(id) on delete set null,
  sender_role chat_participant_role not null,
  direction chat_message_direction not null,
  channel chat_message_channel not null,
  body text not null,
  whatsapp_message_id text unique,
  whatsapp_reply_to_message_id text,
  provider_payload jsonb,
  delivered_at timestamptz,
  read_at timestamptz,
  created_at timestamptz not null default now()
);

create index chat_participants_whatsapp_phone_idx
  on chat_participants (whatsapp_phone)
  where whatsapp_phone is not null;

create index chat_conversations_provider_idx
  on chat_conversations (provider_participant_id, last_message_at desc);

create index chat_messages_conversation_idx
  on chat_messages (conversation_id, created_at asc);

create index chat_messages_whatsapp_reply_idx
  on chat_messages (whatsapp_reply_to_message_id)
  where whatsapp_reply_to_message_id is not null;
