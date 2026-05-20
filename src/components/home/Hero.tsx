import { SearchBar } from "./SearchBar";
import { Button } from "@/components/ui/Button";

export function Hero() {
  return (
    <section className="relative flex min-h-[90vh] flex-col items-center justify-center overflow-hidden px-6 pt-24 pb-20 lg:min-h-screen lg:pt-32">
      <div className="absolute inset-0 bg-gradient-to-b from-graphite-800/50 via-black to-black" />
      <div
        className="absolute inset-0 opacity-30"
        style={{
          backgroundImage: `radial-gradient(circle at 50% 0%, rgba(255,255,255,0.08) 0%, transparent 50%)`,
        }}
      />

      <div className="relative z-10 mx-auto w-full max-w-4xl text-center">
        <p className="mb-6 text-xs font-medium uppercase tracking-[0.3em] text-silver-400">
          Luxury Personal Training
        </p>
        <h1 className="text-4xl font-light leading-[1.1] tracking-tight text-white sm:text-5xl md:text-6xl lg:text-7xl">
          Train with the
          <br />
          <span className="font-medium">world&apos;s finest</span>
        </h1>
        <p className="mx-auto mt-6 max-w-xl text-base leading-relaxed text-silver-400 sm:text-lg">
          A curated marketplace of elite personal trainers. Discover your
          perfect coach and elevate your performance.
        </p>

        <div className="mt-10 flex justify-center">
          <SearchBar />
        </div>

        <div className="mt-8 flex flex-col items-center justify-center gap-4 sm:flex-row">
          <Button href="/explore">Explore Trainers</Button>
          <Button href="/explore" variant="outline">
            View Categories
          </Button>
        </div>
      </div>

      <div className="absolute bottom-8 left-1/2 -translate-x-1/2 animate-bounce">
        <div className="h-8 w-px bg-gradient-to-b from-silver-400 to-transparent" />
      </div>
    </section>
  );
}
