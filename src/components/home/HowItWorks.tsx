const steps = [
  {
    number: "1",
    title: "Search your criteria",
    description:
      "Filter by specialty, city, price range, and coaching style—like shopping for the right home, but for your health.",
  },
  {
    number: "2",
    title: "Compare vetted pros",
    description:
      "Read credentials, client reviews, and per-session rates before you reach out.",
  },
  {
    number: "3",
    title: "Book with confidence",
    description:
      "Schedule a consultation with a specialist who fits your goals and your schedule.",
  },
];

export function HowItWorks() {
  return (
    <section
      id="how-it-works"
      className="home-section-aurora px-4 py-12 sm:px-6 sm:py-16 lg:py-20"
    >
      <div className="mx-auto max-w-7xl">
        <h2 className="text-xl font-medium tracking-tight text-white sm:text-2xl">
          How SMOAC works
        </h2>
        <p className="mt-1 text-sm text-silver-400">
          Three steps from search to your first session.
        </p>

        <div className="mt-8 grid gap-8 md:grid-cols-3 md:gap-10">
          {steps.map((step) => (
            <div key={step.number} className="border-t border-white/10 pt-6">
              <span className="text-sm font-medium text-silver-400">
                Step {step.number}
              </span>
              <h3 className="mt-2 text-lg font-medium text-white">
                {step.title}
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-silver-400">
                {step.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
