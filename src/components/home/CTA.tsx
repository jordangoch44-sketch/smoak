import { TapLink } from "@/components/ui/TapLink";

export function CTA() {
  return (
    <section className="home-section-aurora px-4 py-12 sm:px-6 sm:py-16 lg:py-20">
      <div className="home-cta-panel mx-auto max-w-3xl rounded-2xl border border-white/10 bg-graphite-800/80 px-6 py-10 text-center sm:rounded-3xl sm:px-12 sm:py-14">
        <h2 className="text-2xl font-light tracking-tight text-white sm:text-3xl">
          Ready to find your specialist?
        </h2>
        <p className="mx-auto mt-3 max-w-md text-sm leading-relaxed text-silver-400 sm:text-base">
          Browse vetted health, fitness, and wellness specialists. Compare
          reviews and rates, and book when you&apos;re ready.
        </p>
        <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-center">
          <TapLink
            href="/explore"
            className="inline-flex min-h-11 w-full items-center justify-center rounded-full bg-white px-8 py-3 text-sm font-medium tracking-wide text-black transition-all active:scale-[0.98] sm:w-auto"
          >
            Explore specialists
          </TapLink>
        </div>
      </div>
    </section>
  );
}
