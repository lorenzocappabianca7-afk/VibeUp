import { EmailDecisionApply } from "@/components/availability/email-decision-apply";
import { ManagerResponseForm } from "@/components/availability/manager-response-form";
import {
  AlreadyAnsweredCard,
  ExpiredLinkCard,
  InvalidLinkCard,
  ManagerResponseShell,
} from "@/components/availability/manager-response-result";
import { getAvailabilityRequestByToken } from "@/server/repositories/bookings";
import type { Metadata } from "next";
import { notFound } from "next/navigation";

export const dynamic = "force-dynamic";

const ACTIONS = ["accept", "decline", "propose"] as const;
type EmailAction = (typeof ACTIONS)[number];

function isEmailAction(value: string): value is EmailAction {
  return ACTIONS.includes(value as EmailAction);
}

interface PageProps {
  params: Promise<{ token: string; action: string }>;
}

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { action } = await params;
  const title =
    action === "accept"
      ? "Accetta richiesta — VibeUp"
      : action === "decline"
        ? "Rifiuta richiesta — VibeUp"
        : "Proponi alternativa — VibeUp";
  return {
    title,
    robots: { index: false, follow: false },
  };
}

export default async function ManagerEmailActionPage({ params }: PageProps) {
  const { token: rawToken, action: rawAction } = await params;
  const token = typeof rawToken === "string" ? rawToken.trim() : "";
  const action = typeof rawAction === "string" ? rawAction.trim() : "";

  if (!isEmailAction(action)) {
    notFound();
  }

  const access = token
    ? await getAvailabilityRequestByToken(token)
    : { status: "missing" as const };

  const subtitle =
    action === "accept"
      ? "Accetta richiesta"
      : action === "decline"
        ? "Rifiuta richiesta"
        : "Proponi alternativa";

  return (
    <ManagerResponseShell subtitle={subtitle}>
      {access.status === "ok" ? (
        action === "propose" ? (
          <ManagerResponseForm
            token={token}
            request={access.request}
            initialMode="propose"
          />
        ) : (
          <EmailDecisionApply
            token={token}
            action={action}
            request={access.request}
          />
        )
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
