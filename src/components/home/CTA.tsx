import { Button } from "@/components/ui/Button";

export function CTA() {
  return (
    <section className="px-6 py-20 lg:py-28">
      <div className="mx-auto max-w-4xl rounded-3xl border border-white/5 bg-gradient-to-br from-graphite-800 to-graphite-900 px-8 py-16 text-center sm:px-16 lg:py-20">
        <h2 className="text-3xl font-light tracking-tight text-white sm:text-4xl">
          Ready to elevate your training?
        </h2>
        <p className="mx-auto mt-4 max-w-md text-silver-400">
          Join thousands of discerning clients who trust SMOAK for their
          fitness journey.
        </p>
        <div className="mt-8">
          <Button href="/explore">Start Exploring</Button>
        </div>
      </div>
    </section>
  );
}
