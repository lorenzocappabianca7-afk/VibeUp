import { ServiceProfileView } from "@/components/services/service-profile-view";

interface ServicePageProps {
  params: Promise<{ id: string }>;
  searchParams: Promise<{
    eventId?: string;
    dateFrom?: string;
    dateTo?: string;
    eventAddress?: string;
    guestCount?: string;
    hours?: string;
  }>;
}

export default async function ServicePage({
  params,
  searchParams,
}: ServicePageProps) {
  const { id } = await params;
  const context = await searchParams;

  return <ServiceProfileView serviceId={id} initialContext={context} />;
}
