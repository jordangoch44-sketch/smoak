"use client";

import { TrainerThumbnail } from "@/components/ui/TrainerThumbnail";
import {
  BOOST_CAMPAIGN_PLACEMENTS,
  type BoostCampaignProduct,
} from "@/lib/boost-campaign";

interface BoostPlacementChoiceProps {
  photoUrl: string;
  name: string;
  selected: BoostCampaignProduct | null;
  onSelect: (key: BoostCampaignProduct) => void;
}

export function BoostPlacementChoice({
  photoUrl,
  name,
  selected,
  onSelect,
}: BoostPlacementChoiceProps) {
  return (
    <ul className="boost-place">
      {BOOST_CAMPAIGN_PLACEMENTS.map((place) => {
        const active = selected === place.key;
        return (
          <li key={place.key}>
            <button
              type="button"
              className={
                active
                  ? "boost-place__card boost-place__card--on"
                  : "boost-place__card"
              }
              aria-pressed={active}
              onClick={() => onSelect(place.key)}
            >
              <span className="boost-place__stage" aria-hidden>
                {place.key === "boosted_profile" ? (
                  <MarketplaceSketch photoUrl={photoUrl} name={name} chip={place.chip} />
                ) : null}
                {place.key === "category_spotlight" ? (
                  <SearchSketch photoUrl={photoUrl} name={name} chip={place.chip} />
                ) : null}
                {place.key === "homepage_spotlight" ? (
                  <FeaturedSketch photoUrl={photoUrl} name={name} chip={place.chip} />
                ) : null}
              </span>
              <span className="boost-place__caption">{place.caption}</span>
            </button>
          </li>
        );
      })}
    </ul>
  );
}

function Photo({
  photoUrl,
  name,
  className,
}: {
  photoUrl: string;
  name: string;
  className: string;
}) {
  return (
    <TrainerThumbnail
      src={photoUrl}
      name={name}
      size="compact"
      className={className}
    />
  );
}

function MarketplaceSketch({
  photoUrl,
  name,
  chip,
}: {
  photoUrl: string;
  name: string;
  chip: string;
}) {
  return (
    <span className="boost-sketch boost-sketch--rail">
      <span className="boost-sketch__kicker">Sponsored</span>
      <span className="boost-sketch__rail">
        <span className="boost-sketch__tile boost-sketch__tile--you">
          <Photo photoUrl={photoUrl} name={name} className="boost-sketch__photo" />
          <span className="boost-sketch__chip">{chip}</span>
        </span>
        <span className="boost-sketch__tile boost-sketch__tile--ghost" />
        <span className="boost-sketch__tile boost-sketch__tile--ghost" />
      </span>
    </span>
  );
}

function SearchSketch({
  photoUrl,
  name,
  chip,
}: {
  photoUrl: string;
  name: string;
  chip: string;
}) {
  return (
    <span className="boost-sketch boost-sketch--search">
      <span className="boost-sketch__kicker">Search</span>
      <span className="boost-sketch__row boost-sketch__row--you">
        <Photo photoUrl={photoUrl} name={name} className="boost-sketch__row-photo" />
        <span className="boost-sketch__row-copy">
          <span className="boost-sketch__chip">{chip}</span>
          <span className="boost-sketch__name">{name}</span>
        </span>
      </span>
      <span className="boost-sketch__row boost-sketch__row--ghost" />
      <span className="boost-sketch__row boost-sketch__row--ghost" />
    </span>
  );
}

function FeaturedSketch({
  photoUrl,
  name,
  chip,
}: {
  photoUrl: string;
  name: string;
  chip: string;
}) {
  return (
    <span className="boost-sketch boost-sketch--feature">
      <span className="boost-sketch__kicker">Featured</span>
      <span className="boost-sketch__hero">
        <Photo photoUrl={photoUrl} name={name} className="boost-sketch__hero-photo" />
        <span className="boost-sketch__chip">{chip}</span>
      </span>
    </span>
  );
}
