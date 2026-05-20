import Link from "next/link";
import { categories } from "@/data/categories";

export function Categories() {
  return (
    <section id="categories" className="border-y border-white/5 bg-graphite-900 px-6 py-20 lg:py-28">
      <div className="mx-auto max-w-7xl">
        <p className="text-xs font-medium uppercase tracking-[0.3em] text-silver-400">
          Disciplines
        </p>
        <h2 className="mt-2 text-3xl font-light tracking-tight text-white sm:text-4xl">
          Explore by Category
        </h2>

        <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {categories.map((category) => (
            <Link
              key={category.id}
              href={`/explore?specialty=${encodeURIComponent(category.name)}`}
              className="group flex items-start gap-5 rounded-2xl border border-white/5 bg-black p-6 transition-all hover:border-white/10 hover:bg-graphite-800"
            >
              <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full border border-white/10 text-lg text-silver-300 transition-colors group-hover:border-white/20 group-hover:text-white">
                {category.icon}
              </span>
              <div>
                <h3 className="text-lg font-medium text-white group-hover:text-accent">
                  {category.name}
                </h3>
                <p className="mt-1 text-sm leading-relaxed text-silver-400">
                  {category.description}
                </p>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
