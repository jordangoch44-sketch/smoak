"use client";

import { useId, useLayoutEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

const BIO_CLAMP_LINES = 3;
const BIO_OVERFLOW_SLACK_PX = 2;

interface ProfileHeroBioProps {
  bio: string;
}

/** Full specialist bio under the hero — clamps with a fade + caret to expand. */
export function ProfileHeroBio({ bio }: ProfileHeroBioProps) {
  const text = bio.trim();
  const textId = useId();
  const measureRef = useRef<HTMLParagraphElement>(null);
  const [expanded, setExpanded] = useState(false);
  const [needsToggle, setNeedsToggle] = useState(false);

  useLayoutEffect(() => {
    setExpanded(false);
  }, [text]);

  useLayoutEffect(() => {
    const node = measureRef.current;
    if (!node) return;

    function measure() {
      const el = measureRef.current;
      if (!el) return;
      const lineHeight = Number.parseFloat(getComputedStyle(el).lineHeight);
      const maxHeight =
        (Number.isFinite(lineHeight) && lineHeight > 0 ? lineHeight : 25) *
        BIO_CLAMP_LINES;
      setNeedsToggle(el.scrollHeight > maxHeight + BIO_OVERFLOW_SLACK_PX);
    }

    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(node);
    if (node.parentElement) ro.observe(node.parentElement);
    return () => ro.disconnect();
  }, [text]);

  if (!text) return null;

  const clamp = !expanded && needsToggle;

  return (
    <div className="profile-hero__bio">
      <p
        ref={measureRef}
        className="profile-hero-bio__text profile-hero-bio__measure"
        aria-hidden
      >
        {text}
      </p>
      <p
        id={textId}
        className={cn(
          "profile-hero-bio__text",
          clamp && "profile-hero-bio__text--clamped",
          clamp && "profile-hero-bio__text--faded"
        )}
      >
        {text}
      </p>
      {needsToggle ? (
        <button
          type="button"
          className="smoac-control profile-hero-bio__toggle"
          aria-expanded={expanded}
          aria-controls={textId}
          onClick={() => setExpanded((value) => !value)}
        >
          {expanded ? "Show less" : "View more"}
          <span
            className={cn(
              "profile-hero-bio__chevron",
              expanded && "profile-hero-bio__chevron--open"
            )}
            aria-hidden
          >
            ›
          </span>
        </button>
      ) : null}
    </div>
  );
}
