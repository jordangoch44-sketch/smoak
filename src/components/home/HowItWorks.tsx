"use client";

import {
  CalendarIcon,
  SearchIcon,
  ShieldCheckIcon,
} from "@/components/ui/icons";
import { useEffect, useRef, useState, type CSSProperties } from "react";

const steps = [
  {
    number: "1",
    title: "Search your criteria",
    description:
      "Find specialists by location, specialty, and price.",
    Icon: SearchIcon,
  },
  {
    number: "2",
    title: "Compare vetted specialists",
    description:
      "Review credentials, ratings, and experience.",
    Icon: ShieldCheckIcon,
  },
  {
    number: "3",
    title: "Book with confidence",
    description: "Contact and schedule your first session.",
    Icon: CalendarIcon,
  },
] as const;

export function HowItWorks() {
  const sectionRef = useRef<HTMLElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = sectionRef.current;
    if (!el) return;

    const rect = el.getBoundingClientRect();
    if (rect.top < window.innerHeight * 0.92) {
      setVisible(true);
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting) {
          setVisible(true);
          observer.disconnect();
        }
      },
      { rootMargin: "0px 0px -4% 0px", threshold: 0.05 }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <section
      ref={sectionRef}
      id="how-it-works"
      className="home-section-aurora hiw px-4 py-14 sm:px-6 sm:py-16 lg:py-20"
      aria-labelledby="how-it-works-heading"
    >
      <div className="hiw__inner mx-auto max-w-md">
        <header className="hiw__header">
          <h2
            id="how-it-works-heading"
            className="text-xl font-medium tracking-tight text-white sm:text-2xl"
          >
            How SMOAC works
          </h2>
          <p className="hiw__lede mt-2 text-sm text-silver-400/90">
            Search, compare, book — in three steps.
          </p>
        </header>

        <ol
          className={`hiw__timeline${visible ? " hiw__timeline--visible" : ""}`}
        >
          {steps.map((step, index) => (
            <li
              key={step.number}
              className="hiw__step"
              style={{ "--hiw-step-index": index } as CSSProperties}
            >
              <div className="hiw__marker">
                <div className="hiw__icon-glass">
                  <step.Icon className="hiw__icon" />
                </div>
              </div>

              <div className="hiw__copy">
                <span className="hiw__index">Step {step.number}</span>
                <h3 className="hiw__title">{step.title}</h3>
                <p className="hiw__desc">{step.description}</p>
              </div>

              {index < steps.length - 1 ? (
                <div className="hiw__bridge" aria-hidden>
                  <span className="hiw__bridge-line" />
                  <svg
                    className="hiw__chevron"
                    viewBox="0 0 24 24"
                    fill="none"
                  >
                    <path
                      d="M6 9l6 6 6-6"
                      stroke="currentColor"
                      strokeWidth="1.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </div>
              ) : null}
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
