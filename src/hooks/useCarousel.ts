"use client";

import { useCallback, useState } from "react";

/** Shared index state for profile image carousels */
export function useCarousel(itemCount: number) {
  const [index, setIndex] = useState(0);
  const count = Math.max(itemCount, 0);

  const goTo = useCallback(
    (next: number) => {
      if (count === 0) return;
      setIndex((next + count) % count);
    },
    [count]
  );

  return { index, goTo, count };
}
