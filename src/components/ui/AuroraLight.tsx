"use client";

import { useEffect, useId, useState } from "react";
import { cn } from "@/lib/utils";

export interface AuroraLightProps {
  className?: string;
}

/**
 * One soft wave, sampled through a full turn. The last shape matches the
 * first, so the crest keeps traveling and never snaps back.
 */
const RIBBON_PHASES = [
  "M0 140 L42 166 L83 190 L125 208 L167 218 L208 222 L250 218 L292 209 L333 197 L375 183 L417 168 L458 154 L500 140 L542 126 L583 112 L625 97 L667 83 L708 71 L750 62 L792 58 L833 62 L875 72 L917 90 L958 114 L1000 140",
  "M0 206 L42 220 L83 226 L125 224 L167 215 L208 201 L250 184 L292 167 L333 149 L375 134 L417 120 L458 107 L500 96 L542 85 L583 75 L625 68 L667 64 L708 66 L750 74 L792 89 L833 109 L875 134 L917 160 L958 185 L1000 206",
  "M0 229 L42 221 L83 207 L125 189 L167 168 L208 148 L250 129 L292 114 L333 101 L375 91 L417 83 L458 77 L500 73 L542 71 L583 72 L625 78 L667 90 L708 107 L750 129 L792 154 L833 179 L875 202 L917 219 L958 228 L1000 229",
  "M0 195 L42 172 L83 149 L125 128 L167 109 L208 95 L250 85 L292 79 L333 76 L375 74 L417 75 L458 78 L500 84 L542 94 L583 109 L625 128 L667 150 L708 173 L750 196 L792 214 L833 226 L875 230 L917 226 L958 213 L1000 195",
  "M0 129 L42 107 L83 91 L125 79 L167 73 L208 71 L250 73 L292 77 L333 83 L375 91 L417 100 L458 113 L500 129 L542 148 L583 169 L625 189 L667 208 L708 222 L750 229 L792 228 L833 218 L875 201 L917 178 L958 153 L1000 129",
  "M0 74 L42 67 L83 65 L125 69 L167 76 L208 85 L250 95 L292 107 L333 119 L375 133 L417 149 L458 167 L500 185 L542 202 L583 216 L625 225 L667 227 L708 220 L750 206 L792 185 L833 159 L875 133 L917 109 L958 89 L1000 74",
  "M0 63 L42 72 L83 84 L125 97 L167 111 L208 125 L250 139 L292 153 L333 168 L375 183 L417 197 L458 210 L500 219 L542 222 L583 219 L625 208 L667 189 L708 166 L750 139 L792 113 L833 90 L875 72 L917 62 L958 59 L1000 63",
  "M0 96 L42 113 L83 130 L125 145 L167 159 L208 172 L250 184 L292 195 L333 205 L375 213 L417 216 L458 215 L500 206 L542 191 L583 170 L625 145 L667 119 L708 94 L750 74 L792 60 L833 54 L875 57 L917 66 L958 80 L1000 96",
  "M0 140 L42 166 L83 190 L125 208 L167 218 L208 222 L250 218 L292 209 L333 197 L375 183 L417 168 L458 154 L500 140 L542 126 L583 112 L625 97 L667 83 L708 71 L750 62 L792 58 L833 62 L875 72 L917 90 L958 114 L1000 140",
];

/**
 * A faint ribbon behind the headline. The curve itself changes, so the light
 * flows along the type instead of sliding past as a fixed band.
 */
export function AuroraLight({ className }: AuroraLightProps) {
  const id = useId().replace(/:/g, "");
  const gradientId = `aurora-light-grad-${id}`;
  const blurId = `aurora-light-blur-${id}`;
  const [reduceMotion, setReduceMotion] = useState(false);

  useEffect(() => {
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setReduceMotion(media.matches);
    update();
    media.addEventListener("change", update);
    return () => media.removeEventListener("change", update);
  }, []);

  return (
    <div className={cn("aurora-light", className)} aria-hidden>
      <svg
        className="aurora-light__svg"
        viewBox="0 0 1000 280"
        preserveAspectRatio="none"
      >
        <defs>
          <linearGradient
            id={gradientId}
            gradientUnits="userSpaceOnUse"
            x1="0"
            y1="0"
            x2="1000"
            y2="0"
          >
            <stop offset="0%" stopColor="#4c1d95" stopOpacity="0" />
            <stop offset="16%" stopColor="#5b21b6" stopOpacity="0.7" />
            <stop offset="38%" stopColor="#67e8f9" stopOpacity="0.55" />
            <stop offset="58%" stopColor="#93c5fd" stopOpacity="0.5" />
            <stop offset="80%" stopColor="#c084fc" stopOpacity="0.65" />
            <stop offset="100%" stopColor="#4c1d95" stopOpacity="0" />
          </linearGradient>
          <filter id={blurId} x="-50%" y="-140%" width="200%" height="380%">
            <feGaussianBlur stdDeviation="34" />
          </filter>
        </defs>
        <path
          className="aurora-light__ribbon"
          d={RIBBON_PHASES[0]}
          stroke={`url(#${gradientId})`}
          filter={`url(#${blurId})`}
        >
          {reduceMotion ? null : (
            <animate
              attributeName="d"
              dur="12s"
              repeatCount="indefinite"
              calcMode="linear"
              values={RIBBON_PHASES.join(";")}
            />
          )}
        </path>
      </svg>
    </div>
  );
}
