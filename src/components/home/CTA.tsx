import { Button } from "@/components/ui/Button";

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
          <Button href="/explore" className="w-full sm:w-auto">
            Explore specialists
          </Button>
        </div>
      </div>
    </section>
  );
}
