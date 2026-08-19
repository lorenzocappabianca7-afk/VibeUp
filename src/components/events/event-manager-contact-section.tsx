"use client";

import { useAppState } from "@/context/app-state-context";
import { useAvailabilityRequests } from "@/context/availability-request-context";
import { useChat } from "@/context/chat-context";
import { useTabNavigation } from "@/context/tab-navigation-context";
import type { UserEvent } from "@/types/event";
import { MessageCircle } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

type WhatsAppIconProps = { className?: string };

function WhatsAppIcon({ className }: WhatsAppIconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={className}
      aria-hidden
      fill="currentColor"
    >
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-1.99.522.531-1.94-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.435 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
    </svg>
  );
}

export function EventManagerContactSection({ event }: { event: UserEvent }) {
  const { currentUser } = useAppState();
  const { requests } = useAvailabilityRequests();
  const { startVendorConversation } = useChat();
  const { setTab } = useTabNavigation();
  const [waMeUrl, setWaMeUrl] = useState<string | null>(null);
  const [apiConfirmed, setApiConfirmed] = useState(false);
  const [loadingContact, setLoadingContact] = useState(false);
  const [chatBusy, setChatBusy] = useState(false);
  const [chatError, setChatError] = useState<string | null>(null);

  const localConfirmed = useMemo(() => {
    if (!event.locationId) return false;
    return requests.some(
      (item) =>
        item.requesterUserId === currentUser.id &&
        item.locationId === event.locationId &&
        item.status === "confirmed" &&
        (item.userSelectedDate === event.date ||
          item.eventPayload.date === event.date ||
          item.eventPayload.title === event.title),
    );
  }, [currentUser.id, event.date, event.locationId, event.title, requests]);

  const isConfirmed = apiConfirmed || localConfirmed;

  useEffect(() => {
    if (!event.locationId) {
      queueMicrotask(() => {
        setWaMeUrl(null);
        setApiConfirmed(false);
      });
      return;
    }

    let cancelled = false;
    queueMicrotask(() => setLoadingContact(true));

    const params = new URLSearchParams({
      locationId: event.locationId,
      title: event.title,
      date: event.date,
      locationName: event.locationName,
    });

    void fetch(
      `/api/events/${encodeURIComponent(event.id)}/manager-contact?${params}`,
      { credentials: "same-origin" },
    )
      .then(async (response) => {
        const payload = (await response.json().catch(() => null)) as {
          confirmed?: boolean;
          waMeUrl?: string | null;
        } | null;
        if (cancelled) return;
        setApiConfirmed(Boolean(payload?.confirmed));
        setWaMeUrl(
          typeof payload?.waMeUrl === "string" && payload.waMeUrl
            ? payload.waMeUrl
            : null,
        );
      })
      .catch(() => {
        if (!cancelled) {
          setApiConfirmed(false);
          setWaMeUrl(null);
        }
      })
      .finally(() => {
        if (!cancelled) setLoadingContact(false);
      });

    return () => {
      cancelled = true;
    };
  }, [
    event.date,
    event.id,
    event.locationId,
    event.locationName,
    event.title,
  ]);

  const whatsappEnabled = isConfirmed && Boolean(waMeUrl);
  const whatsappDisabledReason = !isConfirmed
    ? "Disponibile dopo la conferma della caparra"
    : loadingContact
      ? "Carico il contatto…"
      : "Numero WhatsApp del gestore non disponibile";

  function openInAppChat() {
    if (!event.locationId || chatBusy) return;
    setChatBusy(true);
    setChatError(null);
    void startVendorConversation({
      displayName: event.locationName,
      locationId: event.locationId,
      category: "locali",
    })
      .then((result) => {
        if (!result.ok) {
          setChatError(result.error);
          return;
        }
        setTab("messages");
      })
      .finally(() => setChatBusy(false));
  }

  if (!event.locationId) return null;

  return (
    <section className="rounded-2xl border border-primary-black/10 bg-primary-black/[0.02] p-5">
      <h2 className="text-base font-bold text-primary-black">
        Contatta il gestore
      </h2>
      <p className="mt-1 text-sm text-primary-black/60">
        WhatsApp dopo la conferma della caparra. La chat VibeUp resta sempre
        disponibile.
      </p>

      <div className="mt-4 flex flex-col gap-2 sm:flex-row">
        {whatsappEnabled ? (
          <a
            href={waMeUrl!}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex flex-1 items-center justify-center gap-2 rounded-2xl bg-[#25D366] px-4 py-3 text-sm font-bold text-white"
          >
            <WhatsAppIcon className="h-4 w-4" />
            Contatta su WhatsApp
          </a>
        ) : (
          <button
            type="button"
            disabled
            title={whatsappDisabledReason}
            className="inline-flex flex-1 cursor-not-allowed items-center justify-center gap-2 rounded-2xl bg-[#25D366]/40 px-4 py-3 text-sm font-bold text-white/80"
          >
            <WhatsAppIcon className="h-4 w-4" />
            Contatta su WhatsApp
          </button>
        )}

        <button
          type="button"
          onClick={openInAppChat}
          disabled={chatBusy}
          className="inline-flex flex-1 items-center justify-center gap-2 rounded-2xl border border-brand-teal/40 bg-brand-teal/10 px-4 py-3 text-sm font-bold text-primary-black disabled:opacity-60"
        >
          <MessageCircle className="h-4 w-4 text-brand-teal" aria-hidden />
          {chatBusy ? "Apertura chat…" : "Chat in app"}
        </button>
      </div>

      {!whatsappEnabled ? (
        <p className="mt-2 text-center text-xs text-primary-black/45">
          {whatsappDisabledReason}
        </p>
      ) : null}
      {chatError ? (
        <p className="mt-2 text-center text-xs text-brand-pink">{chatError}</p>
      ) : null}
    </section>
  );
}
