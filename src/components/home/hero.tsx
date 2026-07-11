import { Button } from "@/components/ui/button";

export function Hero() {
  return (
    <section
      id="inizia"
      className="relative overflow-hidden px-6 py-24 sm:py-32"
    >
      <div
        className="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full bg-brand-teal/20 blur-3xl"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute -bottom-24 -left-24 h-72 w-72 rounded-full bg-brand-pink/20 blur-3xl"
        aria-hidden
      />

      <div className="relative mx-auto max-w-3xl text-center">
        <p className="mb-4 inline-flex rounded-full bg-primary-black px-4 py-2 text-xs font-black uppercase tracking-widest text-white">
          Organizzazione feste
        </p>
        <h1 className="text-4xl font-bold tracking-tight text-primary-black sm:text-5xl">
          Pianifica la festa perfetta,{" "}
          <span className="text-brand-pink">senza stress</span>
        </h1>
        <p className="mt-6 text-lg leading-8 text-primary-black/70">
          Gestisci invitati, attività e dettagli in un unico posto. VibeUp ti
          aiuta a coordinare ogni aspetto della tua festa, dal save-the-date al
          giorno dell&apos;evento.
        </p>
        <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
          <Button>Crea la tua festa</Button>
          <Button variant="outline">Scopri di più</Button>
        </div>
      </div>
    </section>
  );
}
