"use client";

import { BOOST_CAMPAIGN_PLACEMENTS } from "@/lib/boost-campaign";
import { getInitials } from "@/lib/utils";

interface BoostPlacementChoiceProps {
  photoUrl: string;
  name: string;
  profession: string;
}

export function BoostPlacementChoice({
  photoUrl,
  name,
  profession,
}: BoostPlacementChoiceProps) {
  return (
    <ul className="boost-place">
      {BOOST_CAMPAIGN_PLACEMENTS.map((place, index) => (
        <li key={place.key}>
          <div className="boost-phone">
            <span className="boost-phone__index" aria-hidden>
              {index + 1}
            </span>
            <span className="boost-phone__label">{place.caption}</span>
            <span className="boost-phone__screen" aria-hidden>
              {place.key === "boosted_profile" ? (
                <MarketplaceSketch photoUrl={photoUrl} name={name} />
              ) : null}
              {place.key === "category_spotlight" ? (
                <SearchSketch
                  photoUrl={photoUrl}
                  name={name}
                  profession={profession}
                />
              ) : null}
              {place.key === "homepage_spotlight" ? (
                <FeaturedSketch photoUrl={photoUrl} name={name} />
              ) : null}
            </span>
          </div>
        </li>
      ))}
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
  if (!photoUrl) {
    return (
      <span className={`boost-photo boost-photo--fallback ${className}`}>
        {getInitials(name)}
      </span>
    );
  }

  return (
    <span className={`boost-photo ${className}`}>
      {/* Native img so data/blob/Supabase URLs render in the tiny frames */}
      <img src={photoUrl} alt="" />
    </span>
  );
}

function Stars() {
  return (
    <span className="boost-stars">
      <span /><span /><span /><span /><span />
    </span>
  );
}

function MarketplaceSketch({
  photoUrl,
  name,
}: {
  photoUrl: string;
  name: string;
}) {
  return (
    <span className="boost-ui boost-ui--market">
      <span className="boost-ui__tabs">
        <span className="boost-ui__tab boost-ui__tab--on">Nearby</span>
        <span className="boost-ui__tab">Popular</span>
        <span className="boost-ui__tab">New</span>
      </span>
      <span className="boost-ui__card boost-ui__card--you">
        <Photo photoUrl={photoUrl} name={name} className="boost-ui__card-photo" />
        <span className="boost-ui__chip">Sponsored</span>
        <Stars />
      </span>
      <span className="boost-ui__card boost-ui__card--ghost" />
      <span className="boost-ui__card boost-ui__card--ghost" />
    </span>
  );
}

function SearchSketch({
  photoUrl,
  name,
  profession,
}: {
  photoUrl: string;
  name: string;
  profession: string;
}) {
  return (
    <span className="boost-ui boost-ui--search">
      <span className="boost-ui__query">{profession}</span>
      <span className="boost-ui__chips">
        <span>All</span>
        <span>Trainers</span>
        <span>Gyms</span>
      </span>
      <span className="boost-ui__hit boost-ui__hit--you">
        <Photo photoUrl={photoUrl} name={name} className="boost-ui__hit-photo" />
        <span className="boost-ui__hit-copy">
          <span className="boost-ui__hit-name">{name}</span>
          <Stars />
        </span>
      </span>
      <span className="boost-ui__hit boost-ui__hit--ghost" />
      <span className="boost-ui__hit boost-ui__hit--ghost" />
    </span>
  );
}

function FeaturedSketch({
  photoUrl,
  name,
}: {
  photoUrl: string;
  name: string;
}) {
  return (
    <span className="boost-ui boost-ui--feature">
      <span className="boost-ui__kicker">Featured</span>
      <span className="boost-ui__hero boost-ui__hero--you">
        <Photo photoUrl={photoUrl} name={name} className="boost-ui__hero-photo" />
        <Stars />
        <span className="boost-ui__dots">
          <span className="boost-ui__dot boost-ui__dot--on" />
          <span className="boost-ui__dot" />
          <span className="boost-ui__dot" />
        </span>
      </span>
      <span className="boost-ui__kicker">Top specialists</span>
      <span className="boost-ui__mini">
        <span className="boost-ui__mini-tile" />
        <span className="boost-ui__mini-tile" />
      </span>
    </span>
  );
}
