"use client";

import {
  INBOX_MESSAGE_PREVIEW,
  useInboxBadge,
} from "@/context/inbox-badge-context";
import { MessageCircle, Sparkles } from "lucide-react";
import { memo, useEffect } from "react";

export const MessagesScreen = memo(function MessagesScreen() {
  const { markMessagesSeen } = useInboxBadge();

  useEffect(() => {
    markMessagesSeen();
  }, [markMessagesSeen]);

  return (
    <div className="min-w-0 space-y-6">
      <header>
        <h1 className="text-2xl font-bold text-primary-black">Messaggi</h1>
        <p className="mt-1 text-sm text-primary-black/60">
          Chat con location, fornitori e assistente IA
        </p>
      </header>

      <ul className="space-y-2">
        {INBOX_MESSAGE_PREVIEW.map((message) => (
          <li
            key={message.id}
            className="flex gap-3 rounded-2xl border border-primary-black/8 bg-background p-4 transition-colors"
          >
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary-black/5 text-primary-black/50">
              {message.sender.includes("IA") ? (
                <Sparkles className="h-5 w-5" aria-hidden />
              ) : (
                <MessageCircle className="h-5 w-5" aria-hidden />
              )}
            </span>
            <div className="min-w-0 flex-1">
              <div className="flex items-start justify-between gap-2">
                <p className="min-w-0 truncate text-sm font-semibold text-primary-black">
                  {message.sender}
                </p>
              </div>
              <p className="mt-0.5 line-clamp-2 text-sm text-primary-black/60">
                {message.message}
              </p>
              <p className="mt-1 text-xs text-primary-black/40">
                {message.time}
              </p>
            </div>
          </li>
        ))}
      </ul>

      <div className="flex items-center justify-center gap-2 py-4 text-primary-black/40">
        <MessageCircle className="h-4 w-4" aria-hidden />
        <p className="text-xs">Le tue conversazioni appariranno qui</p>
      </div>
    </div>
  );
});
