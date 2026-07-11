const steps = [
  {
    step: "01",
    title: "Crea l'evento",
    description: "Inserisci data, luogo e dettagli della tua festa.",
  },
  {
    step: "02",
    title: "Invita gli ospiti",
    description: "Aggiungi la lista invitati e monitora le conferme.",
  },
  {
    step: "03",
    title: "Goditi la festa",
    description: "Segui la checklist e vivi il momento senza pensieri.",
  },
];

export function HowItWorks() {
  return (
    <section id="come-funziona" className="px-6 py-24">
      <div className="mx-auto max-w-6xl">
        <h2 className="text-center text-3xl font-bold tracking-tight text-primary-black">
          Come funziona
        </h2>

        <ol className="mt-16 grid gap-8 sm:grid-cols-3">
          {steps.map((item) => (
            <li key={item.step} className="text-center">
              <span className="text-4xl font-bold text-brand-teal/40">
                {item.step}
              </span>
              <h3 className="mt-4 text-lg font-semibold text-primary-black">
                {item.title}
              </h3>
              <p className="mt-2 text-sm text-primary-black/70">
                {item.description}
              </p>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
