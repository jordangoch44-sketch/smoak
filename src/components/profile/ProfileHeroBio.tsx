"use client";

import { useEffect, useId, useRef, useState } from "react";
import { cn } from "@/lib/utils";

interface ProfileHeroBioProps {
  bio: string;
}

/** Full specialist bio under the hero — clamps with a fade + caret to expand. */
export function ProfileHeroBio({ bio }: ProfileHeroBioProps) {
  const text = bio.trim();
  const textId = useId();
  const textRef = useRef<HTMLParagraphElement>(null);
  const [expanded, setExpanded] = useState(false);
  const [needsToggle, setNeedsToggle] = useState(false);

  useEffect(() => {
    setExpanded(false);
  }, [text]);

  useEffect(() => {
    const node = textRef.current;
    if (!node) return;

    function measure() {
      if (!textRef.current) return;
      if (expanded) {
        /* Keep toggle visible once we know the bio was long enough to clamp. */
        return;
      }
      const el = textRef.current;
      setNeedsToggle(el.scrollHeight > el.clientHeight + 2);
    }

    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(node);
    return () => ro.disconnect();
  }, [text, expanded]);

  if (!text) return null;

  return (
    <div className="profile-hero__bio">
      <p
        id={textId}
        ref={textRef}
        className={cn(
          "profile-hero-bio__text",
          !expanded && "profile-hero-bio__text--clamped"
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
