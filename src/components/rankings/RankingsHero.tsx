"use client";

import Image from "next/image";
import type { ReactNode } from "react";
import {
  rankingHeroSkyline,
  rankingHeroTitle,
} from "@/lib/ranking-hero";

interface RankingsHeroProps {
  city: string;
  children?: ReactNode;
}

export function RankingsHero({ city, children }: RankingsHeroProps) {
  const skyline = rankingHeroSkyline(city);
  const title = rankingHeroTitle(city);

  return (
    <section
      className="rankings-hero relative isolate overflow-hidden"
      aria-labelledby="rankings-hero-city"
    >
      <div
        className="rankings-hero__skyline pointer-events-none absolute inset-0 overflow-hidden"
        aria-hidden
      >
        <Image
          key={skyline.src}
          src={skyline.src}
          alt=""
          width={1920}
          height={1080}
          priority
          className="rankings-hero__img h-full w-full object-cover"
        />
      </div>
      <div className="rankings-hero__fade" aria-hidden />
      <div className="rankings-hero__copy relative z-[2]">
        <div className="rankings-hero__stack">
          <p className="rankings-hero__brand">SMOAC</p>
          <p className="rankings-hero__kicker">City Rankings</p>
          <h1 id="rankings-hero-city" className="rankings-hero__city">
            {title}
          </h1>
          <p className="rankings-hero__lede">
            Ranked by SMOAC client reviews — rating and review count. Paid
            ranking boosts never change organic ranks.
          </p>
        </div>
      </div>
      {children ? (
        <div className="rankings-hero__filters relative z-[3]">{children}</div>
      ) : null}
    </section>
  );
}
