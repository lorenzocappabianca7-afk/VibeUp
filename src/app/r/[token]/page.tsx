import { ManagerResponseForm } from "@/components/availability/manager-response-form";
import {
  AlreadyAnsweredCard,
  ExpiredLinkCard,
  InvalidLinkCard,
  ManagerResponseShell,
} from "@/components/availability/manager-response-result";
import { getAvailabilityRequestByToken } from "@/server/repositories/bookings";
import type { Metadata } from "next";

export const dynamic = "force-dynamic";

interface PageProps {
  params: Promise<{ token: string }>;
}

export async function generateMetadata(): Promise<Metadata> {
  return {
    title: "Rispondi alla richiesta — VibeUp",
    robots: { index: false, follow: false },
  };
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
