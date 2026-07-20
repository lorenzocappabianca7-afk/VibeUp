import { EventDashboardView } from "@/components/events/event-dashboard-view";
import { getEventById } from "@/lib/mock/events";
import { APP_SHELL_WIDTH_CLASS, cn } from "@/lib/utils";

interface EventPageProps {
  params: Promise<{ id: string }>;
}

export default async function EventPage({ params }: EventPageProps) {
  const { id } = await params;
  const event = getEventById(id) ?? null;

  return (
    <div
      className={cn(
        "mx-auto min-h-dvh overflow-x-hidden bg-background px-4 pt-6 shadow-none sm:shadow-[0_0_60px_-15px_rgba(15,15,17,0.12)] lg:px-8 lg:pt-8",
        APP_SHELL_WIDTH_CLASS,
      )}
    >
      <EventDashboardView eventId={id} initialEvent={event} />
    </div>
  );
}
