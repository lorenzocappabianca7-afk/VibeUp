"use client";

import { EVENT_STATUS_LABELS, type UserEvent } from "@/types/event";
import { formatDate } from "@/lib/utils";
import { Calendar, ChevronRight, MapPin, Users } from "lucide-react";
import Link from "next/link";
import { memo, useMemo } from "react";

interface EventCardProps {
  event: UserEvent;
}

const statusColors: Record<UserEvent["status"], string> = {
  draft: "bg-primary-black/10 text-primary-black/60",
  organizing: "bg-brand-teal/15 text-brand-teal",
  confirmed: "bg-brand-pink/15 text-primary-black",
  completed: "bg-primary-black/10 text-primary-black/60",
};

export const EventCard = memo(function EventCard({ event }: EventCardProps) {
  const confirmedServices = useMemo(
    () => event.services.filter((s) => s.status === "confirmed").length,
    [event.services],
  );

  return (
    <Link
      href={`/event/${event.id}`}
      className="flex items-center gap-4 rounded-2xl border border-primary-black/10 bg-background p-4 transition-colors duration-150 hover:border-primary-black"
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
        <span
          className={`rounded-full px-2.5 py-1 text-xs font-medium ${statusColors[event.status]}`}
        >
          {EVENT_STATUS_LABELS[event.status]}
        </span>
        <span className="text-[10px] text-primary-black/40">
          {confirmedServices}/{event.services.length} servizi ok
        </span>
        <ChevronRight className="h-4 w-4 text-primary-black/30" aria-hidden />
      </div>
    </Link>
  );
});
