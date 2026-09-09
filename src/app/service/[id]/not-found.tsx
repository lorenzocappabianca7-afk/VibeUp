import { pageMetadata, STATIC_PAGE_METADATA } from "@/lib/seo";
import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = pageMetadata({
  ...STATIC_PAGE_METADATA.serviceMissing,
  path: "/service",
  canonical: false,
});

export default function ServiceNotFound() {
  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-md flex-col items-center justify-center bg-background px-6 text-center">
      <h1 className="text-xl font-bold text-primary-black">
        Servizio non trovato
      </h1>
      <p className="mt-2 text-sm text-primary-black/60">
        Il servizio che cerchi non esiste o è stato rimosso.
      </p>
      <Link
        href="/"
        className="mt-6 rounded-2xl bg-brand-teal px-6 py-3 text-sm font-medium text-ink-inverse"
      >
        Torna a Esplora
      </Link>
    </div>
  );
}
