const features = [
  {
    title: "Lista invitati",
    description:
      "Tieni traccia di chi partecipa, gestisci RSVP e invia promemoria automatici.",
    accent: "bg-brand-teal",
  },
  {
    title: "Checklist attività",
    description:
      "Organizza catering, decorazioni e musica con una lista di cose da fare condivisa.",
    accent: "bg-brand-pink",
  },
  {
    title: "Timeline evento",
    description:
      "Pianifica ogni momento della festa con una timeline chiara e aggiornabile.",
    accent: "bg-brand-teal",
  },
];

export function Features() {
  return (
    <section id="funzionalita" className="bg-primary-black/[0.02] px-6 py-24">
      <div className="mx-auto max-w-6xl">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-3xl font-bold tracking-tight text-primary-black">
            Tutto ciò che ti serve
          </h2>
          <p className="mt-4 text-primary-black/70">
            Strumenti pensati per rendere l&apos;organizzazione semplice e
            divertente.
          </p>
        </div>

        <div className="mt-16 grid gap-8 sm:grid-cols-3">
          {features.map((feature) => (
            <article
              key={feature.title}
              className="rounded-2xl border border-primary-black/10 bg-background p-8 shadow-sm"
            >
              <div
                className={`mb-4 h-1 w-12 rounded-full ${feature.accent}`}
                aria-hidden
              />
              <h3 className="text-lg font-semibold text-primary-black">
                {feature.title}
              </h3>
              <p className="mt-2 text-sm leading-6 text-primary-black/70">
                {feature.description}
              </p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
