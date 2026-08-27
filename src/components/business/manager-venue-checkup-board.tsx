"use client";

import {
  ManagerEventCheckup,
  ManagerEventCheckupBadge,
} from "@/components/business/manager-event-checkup";
import { useAvailabilityRequests } from "@/context/availability-request-context";
import { checkupForManagerVenueEvent } from "@/lib/manager-event-checkup";
import { managerVenueEventsForDisplay } from "@/lib/manager-venue-events";
import { formatDate } from "@/lib/utils";
import { useMemo } from "react";

export function ManagerVenueCheckupBoard() {
  const { managedRequests } = useAvailabilityRequests();
  const events = useMemo(
    () => managerVenueEventsForDisplay(managedRequests),
    [managedRequests],
  );

  return (
    <section className="space-y-3">
      <div>
        <h2 className="text-sm font-black text-primary-black">
          Checkup eventi
        </h2>
        <p className="mt-0.5 text-xs text-primary-black/50">
          Tutti i dati già comunicati dall’organizzatore, e cosa manca ancora.
        </p>
      </div>
      {events.map((event) => {
        const checkup = checkupForManagerVenueEvent(event);
        return (
          <article
            key={event.id}
            className="space-y-3 rounded-2xl border border-primary-black/10 bg-surface p-4"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-sm font-semibold text-primary-black">
                  {event.title}
                </p>
                <p className="mt-0.5 text-xs text-primary-black/55">
                  {formatDate(event.date)} · {event.startTime}–{event.endTime}
                  {" · "}
                  {event.organizerName}
                </p>
              </div>
              <ManagerEventCheckupBadge checkup={checkup} />
            </div>
            <ManagerEventCheckup checkup={checkup} />
          </article>
        );
      })}
    </section>
  );
}
