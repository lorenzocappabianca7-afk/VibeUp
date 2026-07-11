"use client";

import { cn } from "@/lib/utils";
import { BadgePercent, Megaphone } from "lucide-react";
import { memo } from "react";

interface DiscountInviteBannerProps {
  categoryLabel?: string;
  contact: string;
  sent: boolean;
  onContactChange: (value: string) => void;
  onSubmit: () => void;
  className?: string;
}

export const DiscountInviteBanner = memo(function DiscountInviteBanner({
  categoryLabel = "servizio",
  contact,
  sent,
  onContactChange,
  onSubmit,
  className,
}: DiscountInviteBannerProps) {
  const discountInviteText =
    categoryLabel === "DJ" || categoryLabel === "fotografo"
      ? "Se inviti tramite VibeUp un DJ o fotografo che vuoi tu e inizia a usare VibeUp, puoi ottenere sconti sulla location."
      : "Se inviti tramite VibeUp un servizio che vuoi tu e inizia a usare VibeUp, puoi ottenere sconti sulla location.";

  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-[2rem] border-2 border-brand-pink bg-gradient-to-br from-brand-pink/30 via-brand-pink/12 to-brand-teal/18 p-4 shadow-[0_18px_45px_-28px_rgba(236,72,153,0.65)]",
        className,
      )}
    >
      <div className="absolute -right-8 -top-8 h-28 w-28 rounded-full bg-brand-pink/25 blur-2xl" />
      <div className="relative">
        <div className="flex items-start gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-primary-black text-white shadow-sm">
            <Megaphone className="h-4 w-4" aria-hidden />
          </span>
          <div className="min-w-0">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-background px-3 py-1 text-[11px] font-black uppercase tracking-[0.16em] text-brand-pink">
              <BadgePercent className="h-3.5 w-3.5" aria-hidden />
              Sconto location
            </span>
            <h3 className="mt-1.5 text-xl font-black leading-tight text-primary-black">
              Non trovi il tuo {categoryLabel}{" "}
              <span className="text-primary-black">
                (es. DJ, fotografo, pasticceria ecc.)
              </span>
              ? Invitalo da VibeUp
            </h3>
            <p className="mt-1 text-sm font-semibold leading-snug text-primary-black/70">
              {discountInviteText}
            </p>
          </div>
        </div>

        <p className="mt-3 rounded-2xl bg-background px-4 py-2.5 text-sm font-bold leading-snug text-primary-black shadow-sm">
          Inserisci contatto TikTok, Instagram o numero: prepariamo noi il
          messaggio per invitarlo a entrare nella piattaforma e collegarlo al
          tuo evento.
        </p>
      </div>
      <div className="relative mt-3 flex flex-col gap-2 sm:flex-row">
        <input
          value={contact}
          onChange={(event) => onContactChange(event.target.value)}
          placeholder="@profilo, link social o numero"
          className="min-w-0 flex-1 rounded-2xl border-2 border-background bg-background px-4 py-2.5 text-sm font-semibold text-primary-black shadow-sm outline-none focus:border-brand-pink focus:ring-4 focus:ring-brand-pink/20"
        />
        <button
          type="button"
          onClick={onSubmit}
          disabled={!contact.trim()}
          className="rounded-2xl bg-primary-black px-5 py-2.5 text-sm font-black text-white shadow-sm transition-opacity hover:bg-primary-black/90 disabled:opacity-45"
        >
          Invita e sblocca sconto
        </button>
      </div>
      {sent && (
        <p className="relative mt-3 rounded-2xl bg-background px-4 py-2.5 text-sm font-black text-brand-teal shadow-sm">
          Richiesta preparata: il servizio riceverà l&apos;invito a entrare in
          VibeUp per questo evento.
        </p>
      )}
    </div>
  );
});
