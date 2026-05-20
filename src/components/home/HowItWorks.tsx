const steps = [
  {
    number: "01",
    title: "Discover",
    description:
      "Browse our curated roster of elite trainers filtered by specialty, location, and expertise.",
  },
  {
    number: "02",
    title: "Connect",
    description:
      "Review profiles, certifications, and client reviews to find your ideal coach.",
  },
  {
    number: "03",
    title: "Transform",
    description:
      "Book a consultation and begin your journey toward exceptional results.",
  },
];

export function HowItWorks() {
  return (
    <section
      id="how-it-works"
      className="border-t border-white/5 px-6 py-20 lg:py-28"
    >
      <div className="mx-auto max-w-7xl">
        <p className="text-xs font-medium uppercase tracking-[0.3em] text-silver-400">
          Simple Process
        </p>
        <h2 className="mt-2 text-3xl font-light tracking-tight text-white sm:text-4xl">
          How SMOAK Works
        </h2>

        <div className="mt-16 grid gap-12 md:grid-cols-3">
          {steps.map((step) => (
            <div key={step.number} className="relative">
              <span className="text-5xl font-light text-white/10">
                {step.number}
              </span>
              <h3 className="mt-4 text-xl font-medium text-white">
                {step.title}
              </h3>
              <p className="mt-3 text-sm leading-relaxed text-silver-400">
                {step.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
