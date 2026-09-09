import { ServiceProfileView } from "@/components/services/service-profile-view";
import type { ServiceProvider } from "@/lib/mock/service-providers";
import {
  pageMetadata,
  SERVICE_CATEGORY_SEO_LABEL,
} from "@/lib/seo";
import { resolvePublicService } from "@/lib/resolve-public-listing";
import type { Metadata } from "next";
import { notFound } from "next/navigation";

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

function servicePageMetadata(service: ServiceProvider): Metadata {
  const categoryLabel = SERVICE_CATEGORY_SEO_LABEL[service.category];
  return pageMetadata({
    title: `${service.name} · ${categoryLabel}`,
    description: `${service.name} (${categoryLabel}) a ${service.providerZone}: ${service.description}`,
    path: `/service/${service.id}`,
    image: service.imageUrl
      ? {
          url: service.imageUrl,
          alt: `Foto di ${service.name}`,
        }
      : undefined,
  });
}

export async function generateMetadata({
  params,
}: ServicePageProps): Promise<Metadata> {
  const { id } = await params;
  const service = await resolvePublicService(id);
  if (!service) notFound();
  return servicePageMetadata(service);
}

export default async function ServicePage({
  params,
  searchParams,
}: ServicePageProps) {
  const { id } = await params;
  const service = await resolvePublicService(id);
  if (!service) notFound();

  const context = await searchParams;
  return (
    <ServiceProfileView
      serviceId={id}
      initialService={service}
      initialContext={context}
    />
  );
}
