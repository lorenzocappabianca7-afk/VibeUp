"use client";

import { RequestStatusBadge } from "@/components/availability/request-status-badge";
import { HardNavLink } from "@/components/navigation/hard-nav-link";
import type { UserEvent } from "@/types/event";
import { formatDate } from "@/lib/utils";
import { Calendar, ChevronRight, MapPin, Users } from "lucide-react";
import { memo, useMemo } from "react";

interface EventCardProps {
  event: UserEvent;
}

export const EventCard = memo(function EventCard({ event }: EventCardProps) {
  const confirmedServices = useMemo(
    () => event.services.filter((s) => s.status === "confirmed").length,
    [event.services],
  );

  return (
    <HardNavLink
      href={`/event/${event.id}`}
      className="flex items-center gap-4 rounded-2xl border border-primary-black/10 bg-surface p-4 transition-colors duration-150 hover:border-primary-black"
    >
      <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-brand-pink/15 text-brand-pink">
        <Calendar className="h-6 w-6" aria-hidden />
      </span>

      <div className="min-w-0 flex-1">
        <p className="truncate font-semibold text-primary-black">
          {event.title}
        </p>
        <p className="mt-0.5 text-sm text-primary-black/60">
          {formatDate(event.date)}
        </p>
        <div className="mt-1.5 flex flex-wrap items-center gap-3 text-xs text-primary-black/50">
          <span className="flex items-center gap-1">
            <MapPin className="h-3 w-3" aria-hidden />
            {event.locationName}
          </span>
          <span className="flex items-center gap-1">
            <Users className="h-3 w-3" aria-hidden />
            {event.guestCount} ospiti
          </span>
        </div>
      </div>

      <div className="flex shrink-0 flex-col items-end gap-1.5">
        <RequestStatusBadge kind="event" status={event.status} />
        <span className="text-[10px] text-primary-black/40">
          {confirmedServices}/{event.services.length} servizi ok
        </span>
        <ChevronRight className="h-4 w-4 text-primary-black/30" aria-hidden />
      </div>
    </HardNavLink>
  );
});
