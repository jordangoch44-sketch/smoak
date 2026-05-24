"use client";

import Link from "next/link";
import type { Trainer } from "@/types";
import { formatProviderLocation } from "@/lib/provider-location";
import { TrainerThumbnail } from "@/components/ui/TrainerThumbnail";
import { TrainerCardSaveSlot } from "@/components/trainers/TrainerCardSaveSlot";
import { cn } from "@/lib/utils";

interface Top50RankCardProps {
  rank: number;
  trainer: Trainer;
  showTopRatedBadge?: boolean;
  priority?: boolean;
}

export function Top50RankCard({
  rank,
  trainer,
  showTopRatedBadge = false,
  priority = false,
}: Top50RankCardProps) {
  const href = `/trainers/${trainer.id}`;
  const isPodium = rank <= 3;
  const tags = trainer.specialty.slice(0, 2);

  return (
    <div
      className={cn(
        "top50-card",
        isPodium && "top50-card--podium",
        rank === 1 && "top50-card--first"
      )}
      role="listitem"
    >
      <Link href={href} className="top50-card__link">
        <article className="top50-card__article">
          <div className="top50-card__rank" aria-hidden>
            <span className="top50-card__rank-hash">#</span>
            <span className="top50-card__rank-num">{rank}</span>
          </div>

          {showTopRatedBadge ? (
            <span className="top50-card__badge">Top Rated</span>
          ) : null}

          <div className="top50-card__media">
            <TrainerThumbnail
              src={trainer.image}
              name={trainer.name}
              size="card"
              priority={priority}
              className="top50-card__thumb"
              imageClassName="top50-card__thumb-img"
            />
            <div className="top50-card__media-scrim" aria-hidden />
          </div>

          <div className="top50-card__body">
            <h3 className="top50-card__name">{trainer.name}</h3>
            <p className="top50-card__profession">{trainer.profession}</p>
            <p className="top50-card__location">
              {formatProviderLocation(trainer)}
            </p>

            {tags.length > 0 ? (
              <ul className="top50-card__tags" aria-label="Specialties">
                {tags.map((tag) => (
                  <li key={tag}>
                    <span className="top50-card__tag">{tag}</span>
                  </li>
                ))}
              </ul>
            ) : null}

            <div className="top50-card__rating">
              <span className="top50-card__star" aria-hidden>
                ★
              </span>
              <span className="top50-card__rating-value">{trainer.rating}</span>
              <span className="top50-card__rating-count">
                ({trainer.reviewCount})
              </span>
            </div>
          </div>
        </article>
      </Link>
      <TrainerCardSaveSlot trainerId={trainer.id} />
    </div>
  );
}
