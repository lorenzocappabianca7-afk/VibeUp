import { EventDashboardView } from "@/components/events/event-dashboard-view";
import { getEventById } from "@/lib/mock/events";
import { pageMetadata, STATIC_PAGE_METADATA } from "@/lib/seo";
import { APP_SHELL_WIDTH_CLASS, cn } from "@/lib/utils";
import type { Metadata } from "next";

interface EventPageProps {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({
  params,
}: EventPageProps): Promise<Metadata> {
  const { id } = await params;
  const event = getEventById(id);
  const title = event?.title?.trim() || STATIC_PAGE_METADATA.eventFallback.title;
  const details = event
    ? `${event.title} a ${event.city}${event.locationName ? `, ${event.locationName}` : ""}.`
    : "";

  return pageMetadata({
    title,
    description: `${details} ${STATIC_PAGE_METADATA.eventFallback.description}`,
    path: `/event/${id}`,
    index: false,
  });
}

export default async function EventPage({ params }: EventPageProps) {
  const { id } = await params;
  const event = getEventById(id) ?? null;

  return (
    <div
      className={cn(
        "mx-auto min-h-dvh bg-background pt-6 shadow-none sm:shadow-[0_0_60px_-15px_rgba(15,15,17,0.12)] lg:pt-8",
        APP_SHELL_WIDTH_CLASS,
      )}
      style={{
        paddingLeft: "max(1rem, env(safe-area-inset-left, 0px))",
        paddingRight: "max(1rem, env(safe-area-inset-right, 0px))",
      }}
    >
      <EventDashboardView eventId={id} initialEvent={event} />
    </div>
  );
}
