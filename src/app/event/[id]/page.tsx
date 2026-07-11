import { EventDashboardView } from "@/components/events/event-dashboard-view";
import { getEventById } from "@/lib/mock/events";

interface EventPageProps {
  params: Promise<{ id: string }>;
}

export default async function EventPage({ params }: EventPageProps) {
  const { id } = await params;
  const event = getEventById(id) ?? null;

  return (
    <div className="mx-auto min-h-dvh w-full max-w-md bg-background px-4 pt-6 shadow-none sm:shadow-[0_0_60px_-15px_rgba(15,15,17,0.12)] lg:max-w-6xl lg:px-8 lg:pt-8">
      <EventDashboardView eventId={id} initialEvent={event} />
    </div>
  );
}
