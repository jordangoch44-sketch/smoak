"use client";

import { useId, useState } from "react";

interface ProfileHeroBioProps {
  bio: string;
}

const COLLAPSE_CHAR_THRESHOLD = 120;

export function ProfileHeroBio({ bio }: ProfileHeroBioProps) {
  const [expanded, setExpanded] = useState(false);
  const textId = useId();
  const canCollapse = bio.length > COLLAPSE_CHAR_THRESHOLD;
  const isClamped = canCollapse && !expanded;

  return (
    <div className="profile-hero__bio">
      <p
        id={textId}
        className={
          isClamped
            ? "profile-hero-bio__text profile-hero-bio__text--clamped"
            : "profile-hero-bio__text"
        }
      >
        {bio}
      </p>

      {canCollapse && (
        <button
          type="button"
          className="profile-hero-bio__toggle"
          aria-expanded={expanded}
          aria-controls={textId}
          onClick={() => setExpanded((open) => !open)}
        >
          <span>{expanded ? "Show less" : "Read more"}</span>
          <span
            className={
              expanded
                ? "profile-hero-bio__chevron profile-hero-bio__chevron--open"
                : "profile-hero-bio__chevron"
            }
            aria-hidden
          >
            ›
          </span>
        </button>
      )}
    </div>
  );
}
