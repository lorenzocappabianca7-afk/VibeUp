import type { AvailabilityRequest } from "@/types/availability-request";
import type { ReactNode } from "react";
import Link from "next/link";

function ResultCard({
  title,
  message,
  tone,
}: {
  title: string;
  message: string;
  tone: "pink" | "teal";
}) {
  const box =
    tone === "teal"
      ? "border-brand-teal/30 bg-brand-teal/10"
      : "border-brand-pink/25 bg-brand-pink/10";

  return (
    <div className={`rounded-2xl border p-6 text-center ${box}`}>
      <h1 className="text-lg font-bold text-primary-black">{title}</h1>
      <p className="mt-2 text-sm leading-relaxed text-primary-black/65">
        {message}
      </p>
      <Link
        href="/"
        className="mt-5 inline-flex rounded-2xl bg-paper px-5 py-3 text-sm font-semibold text-ink-inverse"
      >
        Vai a VibeUp
      </Link>
    </div>
  );
}

export function alreadyAnsweredMessage(request?: AvailabilityRequest): string {
  if (
    request?.managerDecision === "accept" ||
    request?.status === "pending_user_confirm"
  ) {
    return "Questa richiesta è già stata accettata. Non è possibile cambiarla da questa email.";
  }
  if (
    request?.managerDecision === "decline" ||
    request?.status === "declined"
  ) {
    return "Questa richiesta è già stata rifiutata. Non è possibile cambiarla da questa email.";
  }
  if (request?.managerDecision === "propose") {
    return "È già stata inviata una proposta alternativa. Non è possibile cambiarla da questa email.";
  }
  return "Questa richiesta ha già ricevuto una risposta. Non è possibile modificarla da questa email.";
}

export function AlreadyAnsweredCard({
  request,
}: {
  request?: AvailabilityRequest;
}) {
  return (
    <ResultCard
      title="Richiesta già risposta"
      message={alreadyAnsweredMessage(request)}
      tone="pink"
    />
  );
}

export function ExpiredLinkCard() {
  return (
    <ResultCard
      title="Link scaduto"
      message="Questo link non è più valido. Accedi a VibeUp dalle notifiche del gestore se la richiesta è ancora in attesa."
      tone="pink"
    />
  );
}

export function InvalidLinkCard() {
  return (
    <ResultCard
      title="Link non valido"
      message="Questo link non corrisponde a una richiesta di disponibilità."
      tone="pink"
    />
  );
}

export function ManagerResponseSuccessCard({ message }: { message: string }) {
  return <ResultCard title="Risposta inviata" message={message} tone="teal" />;
}

export function ManagerResponseShell({
  subtitle,
  children,
}: {
  subtitle: string;
  children: ReactNode;
}) {
  return (
    <>
      <div className="mb-6 text-center">
        <p className="text-[11px] font-black uppercase tracking-[0.18em] text-primary-black/40">
          VibeUp
        </p>
        <p className="mt-1 text-sm text-primary-black/55">{subtitle}</p>
      </div>
      {children}
    </>
  );
}
