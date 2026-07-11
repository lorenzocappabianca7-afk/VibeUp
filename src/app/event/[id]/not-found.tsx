import Link from "next/link";

export default function EventNotFound() {
  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-md flex-col items-center justify-center bg-background px-6 text-center">
      <h1 className="text-xl font-bold text-primary-black">
        Evento non trovato
      </h1>
      <p className="mt-2 text-sm text-primary-black/60">
        L&apos;evento che cerchi non esiste o è stato rimosso.
      </p>
      <Link
        href="/"
        className="mt-6 rounded-2xl bg-brand-teal px-6 py-3 text-sm font-medium text-white"
      >
        Torna ai Miei Eventi
      </Link>
    </div>
  );
}
