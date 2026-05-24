const trustPillars = [
  {
    title: "Vetted specialists",
    description:
      "Every specialist is reviewed for credentials, experience, and professional standards before listing.",
  },
  {
    title: "Real client reviews",
    description:
      "See ratings and written feedback from real sessions—not marketing fluff.",
  },
  {
    title: "Pricing upfront",
    description:
      "Per-session rates displayed on every profile so you know the cost before you book.",
  },
];

export function Trust() {
  return (
    <section className="home-section-aurora border-t border-white/5 bg-graphite-900 px-4 py-12 sm:px-6 sm:py-16 lg:py-20">
      <div className="mx-auto max-w-7xl">
        <h2 className="text-xl font-medium tracking-tight text-white sm:text-2xl">
          Why clients trust SMOAC
        </h2>
        <p className="mt-1 text-sm text-silver-400">
          A marketplace built for clarity—not guesswork.
        </p>

        <div className="mt-8 grid gap-6 md:grid-cols-3 md:gap-8">
          {trustPillars.map((pillar) => (
            <div
              key={pillar.title}
              className="rounded-2xl border border-white/5 bg-black/50 p-5 sm:p-6"
            >
              <h3 className="text-base font-medium text-white">
                {pillar.title}
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-silver-400">
                {pillar.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
