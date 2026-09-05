"use client";

import { TapLink } from "@/components/ui/TapLink";
import { AppleFruitIcon, ChartIcon } from "@/components/ui/icons";
import { HOME_CALORIE_CALCULATOR_HREF } from "@/lib/home-browse-categories";

export function HomeCalorieCalculatorCta() {
  return (
    <section
      className="home-calorie-cta home-section-aurora"
      aria-label="Calorie calculator"
    >
      <div className="home-section__inner mx-auto max-w-7xl px-4 sm:px-6">
        <TapLink
          href={HOME_CALORIE_CALCULATOR_HREF}
          className="home-specialty__rankings"
          aria-label="Open the calorie calculator"
        >
          <span className="home-specialty__rankings-copy">
            <span className="home-specialty__rankings-kicker">
              <AppleFruitIcon className="home-specialty__rankings-icon" />
              Calorie calculator
            </span>
            <span className="home-specialty__rankings-label">
              Find your daily calories
            </span>
            <span className="home-specialty__rankings-sub">
              Free TDEE, BMR, and a 12-week plan
              <span className="home-specialty__rankings-arrow" aria-hidden>
                →
              </span>
            </span>
          </span>
          <span className="home-specialty__rankings-cluster" aria-hidden>
            <span
              className="home-specialty__rankings-face"
              data-rank={1}
            >
              <ChartIcon className="home-specialty__rankings-face-mark" />
            </span>
            <span
              className="home-specialty__rankings-face"
              data-rank={2}
            >
              <AppleFruitIcon className="home-specialty__rankings-face-mark" />
            </span>
            <span
              className="home-specialty__rankings-face"
              data-rank={3}
            >
              kcal
            </span>
            <span className="home-specialty__rankings-face home-specialty__rankings-face--more">
              +
            </span>
          </span>
        </TapLink>
      </div>
    </section>
  );
}
