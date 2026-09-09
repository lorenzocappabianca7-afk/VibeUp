import { ManagerResponseForm } from "@/components/availability/manager-response-form";
import {
  AlreadyAnsweredCard,
  ExpiredLinkCard,
  InvalidLinkCard,
  ManagerResponseShell,
} from "@/components/availability/manager-response-result";
import { pageMetadata, STATIC_PAGE_METADATA } from "@/lib/seo";
import { getAvailabilityRequestByToken } from "@/server/repositories/bookings";
import type { Metadata } from "next";

export const dynamic = "force-dynamic";

interface PageProps {
  params: Promise<{ token: string }>;
}

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { token } = await params;
  return pageMetadata({
    ...STATIC_PAGE_METADATA.managerRespond,
    path: `/r/${token}`,
  });
}

export default async function ManagerResponsePage({ params }: PageProps) {
  const { token: rawToken } = await params;
  const token = typeof rawToken === "string" ? rawToken.trim() : "";

  const access = token
    ? await getAvailabilityRequestByToken(token)
    : { status: "missing" as const };

  return (
    <ManagerResponseShell subtitle="Risposta disponibilità gestore">
      {access.status === "ok" ? (
        <ManagerResponseForm token={token} request={access.request} />
      ) : access.status === "used" ? (
        <AlreadyAnsweredCard request={access.request} />
      ) : access.status === "expired" ? (
        <ExpiredLinkCard />
      ) : (
        <InvalidLinkCard />
      )}
    </ManagerResponseShell>
  );
}
