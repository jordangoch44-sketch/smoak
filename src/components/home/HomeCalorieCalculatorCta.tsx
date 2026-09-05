"use client";

import Image from "next/image";
import { TapLink } from "@/components/ui/TapLink";
import { HOME_CALORIE_CALCULATOR_HREF } from "@/lib/home-browse-categories";

function PulseIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.75}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M3 12h3.2l1.6-4.2 2.4 8.4L13.4 8l1.8 4H21" />
    </svg>
  );
}

function FlameIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.75}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M12 3c1.4 3.2-.2 5.1-1.6 6.4C8.8 10.8 8 12.2 8 14.1A4 4 0 0012 18c2.2 0 4-1.7 4-4 0-2.8-1.6-4.6-2.4-6.3C12.8 6.2 12.4 4.6 12 3z" />
      <path d="M10.6 16.2c.4.6 1 1 1.8 1 1.3 0 2.2-.9 2.2-2.1" />
    </svg>
  );
}

export function HomeCalorieCalculatorCta() {
  return (
    <section
      className="home-calorie-cta home-section-aurora"
      aria-label="Calorie calculator"
    >
      <div className="home-section__inner mx-auto max-w-7xl px-4 sm:px-6">
        <TapLink
          href={HOME_CALORIE_CALCULATOR_HREF}
          className="home-calorie-card"
          aria-label="Open the calorie calculator"
        >
          <span className="home-calorie-card__copy">
            <span className="home-calorie-card__kicker">
              <PulseIcon className="home-calorie-card__kicker-icon" />
              Calorie calculator
            </span>
            <span className="home-calorie-card__title">
              Find your{" "}
              <span className="home-calorie-card__accent">daily calories</span>
            </span>
            <span className="home-calorie-card__sub">
              Get your TDEE, BMR, and a personalized 12-week plan in seconds.
            </span>
            <span className="home-calorie-card__cta">
              Calculate Now
              <span className="home-calorie-card__cta-arrows" aria-hidden>
                →→
              </span>
            </span>
            <span className="home-calorie-card__meta">
              Free · No sign up · Takes 30 seconds
            </span>
          </span>
          <span className="home-calorie-card__visual" aria-hidden>
            <Image
              src="/home/calorie-calculator-plate.jpg"
              alt=""
              fill
              sizes="(max-width: 640px) 46vw, 320px"
              className="home-calorie-card__photo"
            />
            <span className="home-calorie-card__preview">
              <span className="home-calorie-card__kcal">
                <FlameIcon className="home-calorie-card__flame" />
                <span className="home-calorie-card__kcal-num">2,450</span>
                <span className="home-calorie-card__kcal-unit">Calories / day</span>
              </span>
              <span className="home-calorie-card__macros">
                <span className="home-calorie-card__macro" data-macro="protein">
                  <span className="home-calorie-card__macro-label">Protein</span>
                  <span className="home-calorie-card__macro-value">180g</span>
                </span>
                <span className="home-calorie-card__macro" data-macro="carbs">
                  <span className="home-calorie-card__macro-label">Carbs</span>
                  <span className="home-calorie-card__macro-value">275g</span>
                </span>
                <span className="home-calorie-card__macro" data-macro="fats">
                  <span className="home-calorie-card__macro-label">Fats</span>
                  <span className="home-calorie-card__macro-value">80g</span>
                </span>
              </span>
            </span>
          </span>
        </TapLink>
      </div>
    </section>
  );
}
