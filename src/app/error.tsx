"use client";

import { useEffect } from "react";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[VibeUp]", error);
  }, [error]);

  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-md flex-col items-center justify-center gap-4 bg-background px-6 text-center">
      <h1 className="text-xl font-bold text-primary-black">
        Qualcosa è andato storto
      </h1>
      <p className="text-sm text-primary-black/60">
        Controlla la connessione e riprova. Se il problema continua, ricarica
        l&apos;app.
      </p>
      <button
        type="button"
        onClick={reset}
        className="rounded-2xl bg-brand-teal px-5 py-3 text-sm font-semibold text-ink-inverse"
      >
        Riprova
      </button>
      <a
        href="/"
        className="text-sm font-medium text-brand-teal"
      >
        Torna alla home
      </a>
    </div>
  );
}
