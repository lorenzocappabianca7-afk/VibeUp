import { pageMetadata, STATIC_PAGE_METADATA } from "@/lib/seo";
import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = pageMetadata({
  ...STATIC_PAGE_METADATA.notFound,
  path: "/",
  canonical: false,
});

export default function NotFound() {
  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-md flex-col items-center justify-center bg-background px-6 text-center">
      <h1 className="text-xl font-bold text-primary-black">
        Pagina non trovata
      </h1>
      <p className="mt-2 text-sm text-primary-black/60">
        Il link che hai aperto non esiste o non è più disponibile.
      </p>
      <Link
        href="/"
        className="mt-6 rounded-2xl bg-brand-teal px-6 py-3 text-sm font-medium text-ink-inverse"
      >
        Torna alla home
      </Link>
    </div>
  );
}
