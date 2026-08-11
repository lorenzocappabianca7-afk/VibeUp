import { ManagerResponseForm } from "@/components/availability/manager-response-form";
import { APP_SHELL_WIDTH_CLASS, cn } from "@/lib/utils";
import { getAvailabilityRequestByToken } from "@/server/repositories/bookings";
import type { Metadata } from "next";
import Link from "next/link";

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

function ErrorCard({ message }: { message: string }) {
  return (
    <div className="rounded-2xl border border-brand-pink/25 bg-brand-pink/10 p-6 text-center">
      <h1 className="text-lg font-bold text-primary-black">Link non disponibile</h1>
      <p className="mt-2 text-sm leading-relaxed text-primary-black/65">{message}</p>
      <Link
        href="/"
        className="mt-5 inline-flex rounded-2xl bg-paper px-5 py-3 text-sm font-semibold text-ink-inverse"
      >
        Vai a VibeUp
      </Link>
    </div>
  );
}

export default async function ManagerResponsePage({ params }: PageProps) {
  const { token: rawToken } = await params;
  const token = typeof rawToken === "string" ? rawToken.trim() : "";

  const access = token
    ? await getAvailabilityRequestByToken(token)
    : { status: "missing" as const };

  return (
    <div
      className={cn(
        "mx-auto box-border min-h-dvh px-4 py-10",
        APP_SHELL_WIDTH_CLASS,
      )}
    >
      <div className="mb-6 text-center">
        <p className="text-[11px] font-black uppercase tracking-[0.18em] text-primary-black/40">
          VibeUp
        </p>
        <p className="mt-1 text-sm text-primary-black/55">
          Risposta disponibilità gestore
        </p>
      </div>

      {access.status === "ok" ? (
        <ManagerResponseForm token={token} request={access.request} />
      ) : (
        <ErrorCard message="Link scaduto o già utilizzato. Contatta VibeUp se pensi sia un errore." />
      )}
    </div>
  );
}
