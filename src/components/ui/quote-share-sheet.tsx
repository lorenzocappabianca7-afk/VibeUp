"use client";

import { useBodyScrollLock } from "@/lib/body-scroll-lock";
import {
  openQuoteShareChannel,
  type QuoteShareChannel,
  type QuoteShareContent,
} from "@/lib/quote-share";
import { cn } from "@/lib/utils";
import {
  Camera,
  Copy,
  Mail,
  MessageCircle,
  Music2,
  Send,
  X,
} from "lucide-react";
import { useState } from "react";
import { createPortal } from "react-dom";

const CHANNELS: {
  id: QuoteShareChannel;
  label: string;
  hint: string;
  icon: typeof Send;
}[] = [
  {
    id: "whatsapp",
    label: "WhatsApp",
    hint: "Invia l’anteprima in chat",
    icon: MessageCircle,
  },
  {
    id: "instagram",
    label: "Instagram",
    hint: "Copia e incolla nella chat",
    icon: Camera,
  },
  {
    id: "tiktok",
    label: "TikTok",
    hint: "Copia e incolla nei messaggi",
    icon: Music2,
  },
  {
    id: "email",
    label: "Email",
    hint: "Apri il tuo client di posta",
    icon: Mail,
  },
  {
    id: "copy",
    label: "Copia link",
    hint: "Testo e link negli appunti",
    icon: Copy,
  },
];

interface QuoteShareSheetProps {
  open: boolean;
  content: QuoteShareContent;
  onClose: () => void;
}

export function QuoteShareSheet({
  open,
  content,
  onClose,
}: QuoteShareSheetProps) {
  const [copied, setCopied] = useState(false);
  useBodyScrollLock(open);

  if (!open || typeof document === "undefined") return null;

  function share(channel: QuoteShareChannel) {
    const result = openQuoteShareChannel(channel, content);
    if (result === "copied") {
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2400);
    }
    if (channel === "whatsapp" || channel === "email") onClose();
  }

  return createPortal(
    <div
      className="vibe-overlay-enter fixed inset-0 z-[90] flex items-end justify-center lg:items-center"
      data-overlay-open="true"
    >
      <button
        type="button"
        className="absolute inset-0 bg-black/50"
        aria-label="Chiudi"
        onClick={onClose}
      />
      <div
        className="vibe-sheet-enter relative w-full max-w-md overflow-hidden rounded-t-3xl bg-surface p-5 shadow-xl lg:rounded-3xl"
        role="dialog"
        aria-modal="true"
        aria-labelledby="quote-share-title"
        onClick={(event) => event.stopPropagation()}
      >
        <button
          type="button"
          onClick={onClose}
          className="absolute right-4 top-4 flex h-8 w-8 items-center justify-center rounded-full bg-white/10 text-foreground/50"
          aria-label="Chiudi"
        >
          <X className="h-4 w-4" aria-hidden />
        </button>
        <div className="flex items-start gap-3 pr-10">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-brand-teal text-ink-inverse">
            <Send className="h-4 w-4" aria-hidden />
          </span>
          <div className="min-w-0">
            <h3
              id="quote-share-title"
              className="text-lg font-black text-foreground"
            >
              Condividi l’anteprima
            </h3>
            <p className="mt-1 text-sm leading-relaxed text-foreground/60">
              Invia prezzo e dettagli della festa. Chi apre il link vede la
              stessa scheda e lo stesso preventivo.
            </p>
          </div>
        </div>

        <div className="mt-4 grid gap-2">
          {CHANNELS.map((channel) => {
            const Icon = channel.icon;
            return (
              <button
                key={channel.id}
                type="button"
                onClick={() => share(channel.id)}
                className={cn(
                  "flex w-full items-center gap-3 rounded-2xl border border-primary-black/10 bg-background px-3 py-3 text-left transition-colors hover:border-brand-teal/40 hover:bg-brand-teal/8",
                )}
              >
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-brand-teal/15 text-brand-teal">
                  <Icon className="h-4 w-4" aria-hidden />
                </span>
                <span className="min-w-0">
                  <span className="block text-sm font-black text-primary-black">
                    {channel.label}
                  </span>
                  <span className="block text-[11px] font-semibold text-primary-black/50">
                    {channel.hint}
                  </span>
                </span>
              </button>
            );
          })}
        </div>

        {copied ? (
          <p className="mt-3 text-center text-xs font-bold text-brand-teal">
            Anteprima copiata. Incollala nella chat.
          </p>
        ) : null}
      </div>
    </div>,
    document.body,
  );
}

export function QuoteShareButton({
  content,
  className,
  compact = false,
  tone = "teal",
}: {
  content: QuoteShareContent;
  className?: string;
  compact?: boolean;
  tone?: "teal" | "paper";
}) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={cn(
          "inline-flex w-full items-center justify-center gap-1.5 rounded-xl px-3 py-2.5 text-xs font-black text-ink-inverse transition-colors",
          tone === "paper"
            ? "bg-paper hover:bg-paper-deep"
            : "bg-brand-teal hover:bg-brand-teal/90",
          className,
        )}
      >
        <Send className="h-3.5 w-3.5" aria-hidden />
        {compact ? "Condividi" : "Condividi anteprima"}
      </button>
      <QuoteShareSheet
        open={open}
        content={content}
        onClose={() => setOpen(false)}
      />
    </>
  );
}
