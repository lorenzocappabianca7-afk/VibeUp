-- VibeUp in-app chat (Sprint after domains)
-- Run in Supabase SQL Editor. Safe to re-run.
-- Relaxes WhatsApp-required provider constraint so web chat works first.

create extension if not exists pgcrypto;

do $$ begin
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
exception when duplicate_object then null;
end $$;

do $$ begin
  create type chat_message_channel as enum ('web_app', 'whatsapp');
exception when duplicate_object then null;
end $$;

do $$ begin
  create type chat_message_direction as enum ('inbound', 'outbound');
exception when duplicate_object then null;
end $$;

create table if not exists chat_participants (
  id uuid primary key default gen_random_uuid(),
  app_user_id text,
  role chat_participant_role not null,
  display_name text not null,
  whatsapp_phone text,
  service_id text,
  location_id text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Allow in-app providers without a WhatsApp number
alter table chat_participants
  drop constraint if exists chat_participants_provider_contact;

create table if not exists chat_conversations (
  id uuid primary key default gen_random_uuid(),
  user_participant_id uuid not null references chat_participants(id) on delete cascade,
  provider_participant_id uuid not null references chat_participants(id) on delete cascade,
  event_id text not null default '',
  service_id text not null default '',
  location_id text not null default '',
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

create table if not exists chat_messages (
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

create index if not exists chat_participants_app_user_idx
  on chat_participants (app_user_id)
  where app_user_id is not null;

create index if not exists chat_participants_location_idx
  on chat_participants (location_id)
  where location_id is not null;

create index if not exists chat_participants_service_idx
  on chat_participants (service_id)
  where service_id is not null;

create index if not exists chat_conversations_user_idx
  on chat_conversations (user_participant_id, last_message_at desc nulls last);

create index if not exists chat_messages_conversation_idx
  on chat_messages (conversation_id, created_at asc);

alter table chat_participants enable row level security;
alter table chat_conversations enable row level security;
alter table chat_messages enable row level security;

-- App uses service role for chat APIs; policies still allow authenticated read of own threads.
drop policy if exists "chat_participants_select_own" on chat_participants;
create policy "chat_participants_select_own"
  on chat_participants for select
  using (app_user_id = auth.uid()::text);

drop policy if exists "chat_conversations_select_own" on chat_conversations;
create policy "chat_conversations_select_own"
  on chat_conversations for select
  using (
    exists (
      select 1 from chat_participants p
      where p.id = chat_conversations.user_participant_id
        and p.app_user_id = auth.uid()::text
    )
  );

drop policy if exists "chat_messages_select_own" on chat_messages;
create policy "chat_messages_select_own"
  on chat_messages for select
  using (
    exists (
      select 1
      from chat_conversations c
      join chat_participants p on p.id = c.user_participant_id
      where c.id = chat_messages.conversation_id
        and p.app_user_id = auth.uid()::text
    )
  );
