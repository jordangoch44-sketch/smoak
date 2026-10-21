"use client";

import { useState } from "react";
import "@/styles/smoac-loader.css";

import {
  SMOAC_LOADER_LOWER_LENGTH,
  SMOAC_LOADER_LOWER_LINE,
  SMOAC_LOADER_LOWER_OUTLINE,
  SMOAC_LOADER_STAR,
  SMOAC_LOADER_STAR_HEIGHT,
  SMOAC_LOADER_STAR_SRC,
  SMOAC_LOADER_STAR_WIDTH,
  SMOAC_LOADER_STAR_X,
  SMOAC_LOADER_STAR_Y,
  SMOAC_LOADER_STROKE_WIDTH,
  SMOAC_LOADER_UPPER_LENGTH,
  SMOAC_LOADER_UPPER_LINE,
  SMOAC_LOADER_UPPER_OUTLINE,
  SMOAC_LOADER_VIEWBOX,
} from "./smoac-loader-mark";
import { AppBootSplashController } from "./AppBootSplashController";

/**
 * First paint of a cold start in the iPhone app. A blocking head script
 * adds `html.native-app` before the body, so this cover is up before
 * Marketplace. The S draws twice, then stays until the page is ready and
 * zooms off. The website never shows it.
 */
export function AppBootSplash() {
  const [phase, setPhase] = useState<"hold" | "zoom" | "done">("hold");
  if (phase === "done") return null;

  return (
    <div
      id="app-boot-splash"
      className={phase === "zoom" ? "is-zoom" : undefined}
      role="status"
      aria-label="Loading"
      aria-busy={phase === "hold"}
    >
      <div className="app-boot-splash__mark smoac-loader smoac-loader--boot">
        <svg
          className="smoac-loader__svg"
          viewBox={SMOAC_LOADER_VIEWBOX}
          aria-hidden="true"
          focusable="false"
        >
          <defs>
            <clipPath id="app-boot-upper">
              <path d={SMOAC_LOADER_UPPER_OUTLINE} />
            </clipPath>
            <clipPath id="app-boot-lower">
              <path d={SMOAC_LOADER_LOWER_OUTLINE} />
            </clipPath>
            <clipPath id="app-boot-star">
              <path d={SMOAC_LOADER_STAR} />
            </clipPath>
          </defs>
          <g className="smoac-loader__cycle">
            <path className="smoac-loader__ghost" d={SMOAC_LOADER_UPPER_OUTLINE} />
            <path className="smoac-loader__ghost" d={SMOAC_LOADER_LOWER_OUTLINE} />
            <g clipPath="url(#app-boot-upper)">
              <path
                className="smoac-loader__draw smoac-loader__draw--upper"
                d={SMOAC_LOADER_UPPER_LINE}
                pathLength={SMOAC_LOADER_UPPER_LENGTH}
                strokeWidth={SMOAC_LOADER_STROKE_WIDTH}
              />
              <path
                className="smoac-loader__streak smoac-loader__streak--upper"
                d={SMOAC_LOADER_UPPER_LINE}
                pathLength={SMOAC_LOADER_UPPER_LENGTH}
                strokeWidth={SMOAC_LOADER_STROKE_WIDTH}
              />
            </g>
            <g clipPath="url(#app-boot-lower)">
              <path
                className="smoac-loader__draw smoac-loader__draw--lower"
                d={SMOAC_LOADER_LOWER_LINE}
                pathLength={SMOAC_LOADER_LOWER_LENGTH}
                strokeWidth={SMOAC_LOADER_STROKE_WIDTH}
              />
              <path
                className="smoac-loader__streak smoac-loader__streak--lower"
                d={SMOAC_LOADER_LOWER_LINE}
                pathLength={SMOAC_LOADER_LOWER_LENGTH}
                strokeWidth={SMOAC_LOADER_STROKE_WIDTH}
              />
            </g>
            <g className="smoac-loader__star">
              <image
                href={SMOAC_LOADER_STAR_SRC}
                x={SMOAC_LOADER_STAR_X}
                y={SMOAC_LOADER_STAR_Y}
                width={SMOAC_LOADER_STAR_WIDTH}
                height={SMOAC_LOADER_STAR_HEIGHT}
                clipPath="url(#app-boot-star)"
              />
            </g>
          </g>
        </svg>
      </div>
      <AppBootSplashController
        onZoom={() => setPhase("zoom")}
        onDone={() => setPhase("done")}
      />
    </div>
  );
}
