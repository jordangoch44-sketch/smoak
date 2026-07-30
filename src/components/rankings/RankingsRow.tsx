import Link from "next/link";
import type { SmoacRankedSpecialist } from "@/lib/smoac-rankings";
import { formatProviderLocation } from "@/lib/provider-location";
import { TrainerThumbnail } from "@/components/ui/TrainerThumbnail";
import { SessionPrice } from "@/components/ui/SessionPrice";
import { cn } from "@/lib/utils";

interface RankingsRowProps {
  row: SmoacRankedSpecialist;
  priority?: boolean;
}

export function RankingsRow({ row, priority = false }: RankingsRowProps) {
  const { trainer, displayRank, avgRating, reviewCount } = row;
  const profileHref = `/trainers/${trainer.id}`;
  const isPodium = displayRank <= 3;

  return (
    <article
      className={cn("rankings-row", isPodium && "rankings-row--podium")}
      aria-label={`Rank ${displayRank}: ${trainer.name}`}
    >
      <div className="rankings-row__lead">
        <div className="rankings-row__rank" aria-hidden>
          <span className="rankings-row__rank-num">{displayRank}</span>
        </div>

        <div className="rankings-row__avatar">
          <TrainerThumbnail
            src={trainer.image}
            name={trainer.name}
            size="compact"
            priority={priority}
            className="rankings-row__thumb"
            imageClassName="rankings-row__thumb-img"
          />
        </div>

        <div className="rankings-row__identity">
          <h3 className="rankings-row__name">{trainer.name}</h3>
          <p className="rankings-row__profession">{trainer.profession}</p>
          <p className="rankings-row__location">
            {formatProviderLocation(trainer)}
          </p>
        </div>
      </div>

      <div className="rankings-row__trail">
        <div className="rankings-row__stats" role="list">
          <div className="rankings-row__stat" role="listitem">
            <span className="rankings-row__stat-label">SMOAC ★</span>
            <span className="rankings-row__stat-value">
              {avgRating > 0 ? avgRating.toFixed(1) : "—"}
            </span>
          </div>
          <div className="rankings-row__stat" role="listitem">
            <span className="rankings-row__stat-label">Reviews</span>
            <span className="rankings-row__stat-value">{reviewCount}</span>
          </div>
          <div className="rankings-row__stat" role="listitem">
            <span className="rankings-row__stat-label">Price</span>
            <SessionPrice
              amount={trainer.pricePerSession}
              variant="stat"
              className="rankings-row__stat-value"
            />
          </div>
        </div>

        <div className="rankings-row__action">
          <Link href={profileHref} className="rankings-row__profile-btn">
            View Profile
          </Link>
        </div>
      </div>
    </article>
  );
}
