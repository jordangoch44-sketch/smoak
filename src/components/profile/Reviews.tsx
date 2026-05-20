import type { Trainer } from "@/types/trainer";

interface ReviewsProps {
  reviews: Trainer["reviews"];
  rating: number;
  reviewCount: number;
}

export function Reviews({ reviews, rating, reviewCount }: ReviewsProps) {
  return (
    <section>
      <div className="flex items-baseline justify-between">
        <h2 className="text-xs font-medium uppercase tracking-[0.3em] text-silver-400">
          Reviews
        </h2>
        <div className="flex items-center gap-1.5 text-sm">
          <span className="text-white">★</span>
          <span className="font-medium text-white">{rating}</span>
          <span className="text-silver-400">({reviewCount})</span>
        </div>
      </div>

      <ul className="mt-6 space-y-6">
        {reviews.map((review) => (
          <li
            key={review.id}
            className="rounded-2xl border border-white/5 bg-graphite-900 p-6"
          >
            <div className="flex items-center justify-between">
              <span className="font-medium text-white">{review.author}</span>
              <div className="flex gap-0.5">
                {[...Array(5)].map((_, i) => (
                  <span
                    key={i}
                    className={
                      i < review.rating ? "text-white" : "text-white/20"
                    }
                  >
                    ★
                  </span>
                ))}
              </div>
            </div>
            <p className="mt-3 text-sm leading-relaxed text-silver-300">
              {review.text}
            </p>
            <time className="mt-3 block text-xs text-silver-400">
              {new Date(review.date).toLocaleDateString("en-US", {
                month: "long",
                day: "numeric",
                year: "numeric",
              })}
            </time>
          </li>
        ))}
      </ul>
    </section>
  );
}
