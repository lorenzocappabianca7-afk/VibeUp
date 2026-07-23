"use client";

import {
  formatChatTime,
  formatPreviewTime,
  useChat,
  type ChatDeliveryStatus,
  type ChatMessage,
} from "@/context/chat-context";
import { cn } from "@/lib/utils";
import {
  ArrowLeft,
  MessageCircle,
  SendHorizontal,
  Sparkles,
} from "lucide-react";
import {
  memo,
  useEffect,
  useRef,
  useState,
  type FormEvent,
  type KeyboardEvent,
} from "react";

function MessageReceipt({ status }: { status: ChatDeliveryStatus }) {
  const read = status === "read";
  const count = status === "sent" ? 1 : 2;
  const label =
    status === "sent"
      ? "Inviato"
      : status === "delivered"
        ? "Consegnato"
        : "Letto";

  return (
    <span
      className="inline-flex items-center gap-[3px]"
      aria-label={label}
      title={label}
    >
      {Array.from({ length: count }, (_, index) => (
        <span
          key={index}
          className={cn(
            "h-[7px] w-[7px] rounded-full border transition-colors duration-300",
            read
              ? "border-brand-teal bg-brand-teal"
              : "border-[#B8B8BE] bg-white",
          )}
        />
      ))}
    </span>
  );
}

export const MessagesScreen = memo(function MessagesScreen({
  isActive = true,
}: {
  /** False when another tab is showing — close open threads so unread/badges stay correct. */
  isActive?: boolean;
}) {
  const {
    conversations,
    getMessages,
    openConversationId,
    openConversation,
    closeConversation,
    sendMessage,
  } = useChat();

  useEffect(() => {
    if (!isActive && openConversationId) {
      closeConversation();
    }
  }, [isActive, openConversationId, closeConversation]);

  const active = conversations.find((item) => item.id === openConversationId);

  if (active) {
    return (
      <ConversationThread
        conversationId={active.id}
        title={active.title}
        kind={active.kind}
        messages={getMessages(active.id)}
        onBack={closeConversation}
        onSend={(body) => sendMessage(active.id, body)}
      />
    );
  }

  return (
    <div className="min-w-0 space-y-6">
      <header>
        <h1 className="text-2xl font-bold text-primary-black">Messaggi</h1>
        <p className="mt-1 text-sm text-primary-black/60">
          Apri una chat, scrivi e ricevi risposte in tempo reale
        </p>
      </header>

      {conversations.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-2 py-16 text-primary-black/40">
          <MessageCircle className="h-8 w-8" aria-hidden />
          <p className="text-sm">Nessuna conversazione ancora</p>
        </div>
      ) : (
        <ul className="space-y-2">
          {conversations.map((conversation) => (
            <li key={conversation.id}>
              <button
                type="button"
                onClick={() => openConversation(conversation.id)}
                className={cn(
                  "flex w-full gap-3 rounded-2xl border p-4 text-left transition-colors duration-300",
                  conversation.unreadCount > 0
                    ? "border-brand-teal/20 bg-brand-teal/[0.08] hover:bg-brand-teal/[0.12]"
                    : "border-primary-black/8 bg-background hover:bg-primary-black/[0.02]",
                )}
              >
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-primary-black/5 text-primary-black/55">
                  {conversation.kind === "ai" ? (
                    <Sparkles className="h-5 w-5" aria-hidden />
                  ) : (
                    <MessageCircle className="h-5 w-5" aria-hidden />
                  )}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-start justify-between gap-2">
                    <p className="min-w-0 truncate text-sm font-semibold text-primary-black">
                      {conversation.title}
                    </p>
                    <span className="shrink-0 text-[11px] text-primary-black/40">
                      {formatPreviewTime(conversation.updatedAt)}
                    </span>
                  </div>
                  <p
                    className={cn(
                      "mt-0.5 line-clamp-2 text-sm",
                      conversation.unreadCount > 0
                        ? "font-medium text-primary-black/75"
                        : "text-primary-black/55",
                    )}
                  >
                    {conversation.preview}
                  </p>
                </div>
                {conversation.unreadCount > 0 && (
                  <span className="mt-1 flex h-5 min-w-5 shrink-0 items-center justify-center rounded-full bg-brand-pink px-1.5 text-[10px] font-bold text-white">
                    {conversation.unreadCount}
                  </span>
                )}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
});

function ConversationThread({
  conversationId,
  title,
  kind,
  messages,
  onBack,
  onSend,
}: {
  conversationId: string;
  title: string;
  kind: "vendor" | "ai";
  messages: ChatMessage[];
  onBack: () => void;
  onSend: (body: string) => void;
}) {
  const [draft, setDraft] = useState("");
  const listRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    const el = listRef.current;
    if (!el) return;
    el.scrollTop = el.scrollHeight;
  }, [messages, conversationId]);

  useEffect(() => {
    inputRef.current?.focus();
  }, [conversationId]);

  function handleSubmit(event?: FormEvent) {
    event?.preventDefault();
    const body = draft.trim();
    if (!body) return;
    onSend(body);
    setDraft("");
  }

  function onKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      handleSubmit();
    }
  }

  return (
    <div className="flex min-h-[min(70dvh,640px)] flex-col">
      <header className="flex items-center gap-2 border-b border-primary-black/8 pb-3">
        <button
          type="button"
          onClick={onBack}
          className="flex h-10 w-10 items-center justify-center rounded-full text-primary-black/70 transition-colors hover:bg-primary-black/[0.05]"
          aria-label="Torna ai messaggi"
        >
          <ArrowLeft className="h-5 w-5" aria-hidden />
        </button>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary-black/5 text-primary-black/55">
              {kind === "ai" ? (
                <Sparkles className="h-4 w-4" aria-hidden />
              ) : (
                <MessageCircle className="h-4 w-4" aria-hidden />
              )}
            </span>
            <div className="min-w-0">
              <h1 className="truncate text-base font-bold text-primary-black">
                {title}
              </h1>
              <p className="text-[11px] text-primary-black/45">
                {kind === "ai" ? "Assistente VibeUp" : "Chat diretta"}
              </p>
            </div>
          </div>
        </div>
      </header>

      <div
        ref={listRef}
        className="min-h-0 flex-1 space-y-2.5 overflow-y-auto overscroll-contain py-4"
      >
        {messages.map((message) => {
          const mine = message.sender === "me";
          return (
            <div
              key={message.id}
              className={cn("flex", mine ? "justify-end" : "justify-start")}
            >
              <div
                className={cn(
                  "max-w-[82%] rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed",
                  mine
                    ? "rounded-br-md bg-primary-black text-white"
                    : "rounded-bl-md bg-primary-black/[0.05] text-primary-black",
                )}
              >
                <p className="whitespace-pre-wrap break-words">{message.body}</p>
                <div
                  className={cn(
                    "mt-1 flex items-center gap-1.5",
                    mine ? "justify-end" : "justify-start",
                  )}
                >
                  <span
                    className={cn(
                      "text-[10px]",
                      mine ? "text-white/55" : "text-primary-black/40",
                    )}
                  >
                    {formatChatTime(message.createdAt)}
                  </span>
                  {mine && (
                    <MessageReceipt status={message.status ?? "sent"} />
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <form
        onSubmit={handleSubmit}
        className="sticky bottom-0 border-t border-primary-black/8 bg-background pt-3"
      >
        <div className="flex items-end gap-2 rounded-2xl border border-primary-black/10 bg-white p-2 shadow-[0_2px_12px_rgba(15,15,17,0.06)]">
          <textarea
            ref={inputRef}
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            onKeyDown={onKeyDown}
            rows={1}
            placeholder="Scrivi un messaggio…"
            className="max-h-28 min-h-[40px] min-w-0 flex-1 resize-none bg-transparent px-2 py-2 text-base text-primary-black outline-none placeholder:text-primary-black/40"
          />
          <button
            type="submit"
            disabled={!draft.trim()}
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-teal text-primary-black transition-opacity disabled:opacity-40"
            aria-label="Invia messaggio"
          >
            <SendHorizontal className="h-4 w-4" aria-hidden />
          </button>
        </div>
        <p className="mt-2 px-1 text-[10px] text-primary-black/40">
          Invio per mandare · Maiusc+Invio per andare a capo
        </p>
      </form>
    </div>
  );
}
