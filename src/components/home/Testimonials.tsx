import { testimonials } from "@/data/testimonials";

export function Testimonials() {
  return (
    <section className="px-6 py-20 lg:py-28">
      <div className="mx-auto max-w-7xl">
        <p className="text-center text-xs font-medium uppercase tracking-[0.3em] text-silver-400">
          Client Stories
        </p>
        <h2 className="mt-2 text-center text-3xl font-light tracking-tight text-white sm:text-4xl">
          Trusted by Leaders
        </h2>

        <div className="mt-16 grid gap-8 md:grid-cols-3">
          {testimonials.map((t) => (
            <blockquote
              key={t.id}
              className="flex flex-col rounded-2xl border border-white/5 bg-graphite-900 p-8"
            >
              <p className="flex-1 text-base leading-relaxed text-silver-200">
                &ldquo;{t.quote}&rdquo;
              </p>
              <footer className="mt-8 border-t border-white/5 pt-6">
                <cite className="not-italic">
                  <span className="block font-medium text-white">
                    {t.author}
                  </span>
                  <span className="mt-1 block text-sm text-silver-400">
                    {t.role}
                  </span>
                </cite>
              </footer>
            </blockquote>
          ))}
        </div>
      </div>
    </section>
  );
}
