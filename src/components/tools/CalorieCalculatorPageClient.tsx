"use client";

import Link from "next/link";
import { useEffect, useMemo, useState, type FormEvent, type MouseEvent } from "react";
import { HomePortraitSpecialistCard } from "@/components/home/HomePortraitSpecialistCard";
import { HorizontalCarousel } from "@/components/ui/HorizontalCarousel";
import {
  useMarketplacePersonalizationCity,
  useMarketplaceUserCoordinates,
  useMarketplaceUserCoordinatesKey,
} from "@/hooks/useMarketplaceGeo";
import { useHydrated } from "@/hooks/useHydrated";
import { forceDocumentScrollTop } from "@/lib/mobile-chrome";
import { SITE_ROUTES } from "@/lib/navigation";
import { skipLocationPrompt } from "@/lib/user-location-store";
import { primePublicCatalogFromSSR } from "@/lib/approved-specialist-profiles-store";
import { listPublicMarketplaceTrainers } from "@/lib/marketplace-public-catalog";
import type { PublicCatalogMode } from "@/lib/public-catalog-mode";
import {
  CALORIE_ACTIVITY_OPTIONS,
  CALORIE_GOAL_OPTIONS,
  buildProjectionForPace,
  calculateCaloriePlan,
  defaultPaceForGoal,
  goalIdForPace,
  resolvePaceRow,
  type CalorieActivityId,
  type CalorieCalculatorResult,
  type CalorieGoalId,
  type CaloriePaceId,
  type CalorieSex,
} from "@/lib/tools/calorie-calculator";
import { selectCalorieToolSpecialists } from "@/lib/tools/calorie-specialist-suggestions";
import { CalorieProjectionChart } from "@/components/tools/CalorieProjectionChart";
import type { Trainer } from "@/types/trainer";
import "@/styles/calorie-calculator.css";

interface CalorieCalculatorPageClientProps {
  initialCatalog?: Trainer[];
  catalogMode?: PublicCatalogMode;
}

export function CalorieCalculatorPageClient({
  initialCatalog,
  catalogMode = "live",
}: CalorieCalculatorPageClientProps) {
  const hydrated = useHydrated();
  const personalizationCity = useMarketplacePersonalizationCity();
  const userCoords = useMarketplaceUserCoordinates();
  const coordsKey = useMarketplaceUserCoordinatesKey();

  const [sex, setSex] = useState<CalorieSex>("female");
  const [age, setAge] = useState("28");
  const [heightFt, setHeightFt] = useState("5");
  const [heightIn, setHeightIn] = useState("6");
  const [weight, setWeight] = useState("150");
  const [activityId, setActivityId] = useState<CalorieActivityId>("moderate");
  const [goalId, setGoalId] = useState<CalorieGoalId>("lose");
  const [result, setResult] = useState<CalorieCalculatorResult | null>(null);
  const [selectedPaceId, setSelectedPaceId] =
    useState<CaloriePaceId>("mild_loss");
  const [showGainPaces, setShowGainPaces] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    primePublicCatalogFromSSR(initialCatalog, catalogMode);
  }, [initialCatalog, catalogMode]);

  useEffect(() => {
    if (!result) return;
    forceDocumentScrollTop();
    const frame = window.requestAnimationFrame(() => forceDocumentScrollTop());
    return () => window.cancelAnimationFrame(frame);
  }, [result]);

  const catalog = useMemo(
    () =>
      listPublicMarketplaceTrainers({
        includeBrowserState: hydrated,
        remoteApproved: catalogMode === "live" ? initialCatalog : undefined,
        catalogMode,
      }),
    [hydrated, initialCatalog, catalogMode]
  );

  const selectedPace = useMemo(
    () => (result ? resolvePaceRow(result, selectedPaceId) : null),
    [result, selectedPaceId]
  );

  const projectionBundle = useMemo(() => {
    if (!result || !selectedPace) return null;
    return buildProjectionForPace({
      startingWeightLb: result.startingWeightLb,
      weeklyChangeLb: selectedPace.weeklyChangeLb,
      weeks: result.projectionWeeks,
    });
  }, [result, selectedPace]);

  const suggestions = useMemo(() => {
    if (!result || !selectedPace) return [];
    return selectCalorieToolSpecialists(catalog, {
      goalId: goalIdForPace(selectedPace.id),
      personalizationCity: hydrated ? personalizationCity : null,
      userCoords: hydrated ? userCoords : null,
      limit: 6,
    });
  }, [
    result,
    selectedPace,
    catalog,
    hydrated,
    personalizationCity,
    userCoords,
    coordsKey,
  ]);

  function handleCalculate(event: FormEvent) {
    event.preventDefault();
    const feet = Number(heightFt) || 0;
    const inches = Number(heightIn) || 0;
    const plan = calculateCaloriePlan({
      sex,
      ageYears: Number(age),
      heightInches: feet * 12 + inches,
      weightLb: Number(weight),
      activityId,
      goalId,
    });
    if (!plan) {
      setResult(null);
      setError("Enter a realistic age, height, and weight to continue.");
      return;
    }
    const pace = defaultPaceForGoal(goalId);
    setError(null);
    setSelectedPaceId(pace);
    setShowGainPaces(goalId === "gain");
    setResult(plan);
  }

  function handleEditInputs() {
    setResult(null);
    setError(null);
    forceDocumentScrollTop();
  }

  function handleContinueToExplore(event: MouseEvent<HTMLAnchorElement>) {
    /* Avoid Search location gate from this acquisition funnel — map still works via IP. */
    event.preventDefault();
    skipLocationPrompt();
    window.location.assign(SITE_ROUTES.explore);
  }

  return (
    <div className="calorie-tool">
      <div className="calorie-tool__sky" aria-hidden />
      <div className="calorie-tool__inner">
        <header className="calorie-tool__header">
          <Link href={SITE_ROUTES.home} className="calorie-tool__back">
            ← Back to Marketplace
          </Link>
          <p className="calorie-tool__eyebrow">smoac.com</p>
          <h1 className="calorie-tool__title">
            {result ? "Your calorie plan" : "Calorie calculator"}
          </h1>
          {!result ? (
            <p className="calorie-tool__lede">
              Free daily calorie, TDEE, and BMR estimate from your activity
              level — then compare weight-loss paces and a 12-week projection.
              When you’re ready, meet trainers and nutritionists on SMOAC.
            </p>
          ) : (
            <p className="calorie-tool__lede">
              Your daily calorie targets by pace — then trainers who can help
              you stay on this path.
            </p>
          )}
        </header>

        {!result ? (
          <form className="calorie-tool__form" onSubmit={handleCalculate}>
            <fieldset className="calorie-tool__fieldset">
              <legend className="calorie-tool__legend">You</legend>
              <div className="calorie-tool__segment" role="group" aria-label="Sex">
                {(["female", "male"] as const).map((value) => (
                  <button
                    key={value}
                    type="button"
                    className={
                      sex === value
                        ? "calorie-tool__chip calorie-tool__chip--active smoac-control"
                        : "calorie-tool__chip smoac-control"
                    }
                    onClick={() => setSex(value)}
                  >
                    {value === "female" ? "Female" : "Male"}
                  </button>
                ))}
              </div>
              <div className="calorie-tool__grid">
                <label className="calorie-tool__field">
                  <span>Age</span>
                  <input
                    className="calorie-tool__input"
                    inputMode="numeric"
                    value={age}
                    onChange={(e) => setAge(e.target.value)}
                    required
                  />
                </label>
                <label className="calorie-tool__field">
                  <span>Weight (lb)</span>
                  <input
                    className="calorie-tool__input"
                    inputMode="numeric"
                    value={weight}
                    onChange={(e) => setWeight(e.target.value)}
                    required
                  />
                </label>
                <label className="calorie-tool__field">
                  <span>Height (ft)</span>
                  <input
                    className="calorie-tool__input"
                    inputMode="numeric"
                    value={heightFt}
                    onChange={(e) => setHeightFt(e.target.value)}
                    required
                  />
                </label>
                <label className="calorie-tool__field">
                  <span>Height (in)</span>
                  <input
                    className="calorie-tool__input"
                    inputMode="numeric"
                    value={heightIn}
                    onChange={(e) => setHeightIn(e.target.value)}
                    required
                  />
                </label>
              </div>
            </fieldset>

            <fieldset className="calorie-tool__fieldset">
              <legend className="calorie-tool__legend">Activity</legend>
              <div className="calorie-tool__options">
                {CALORIE_ACTIVITY_OPTIONS.map((option) => (
                  <button
                    key={option.id}
                    type="button"
                    className={
                      activityId === option.id
                        ? "calorie-tool__option calorie-tool__option--active smoac-control"
                        : "calorie-tool__option smoac-control"
                    }
                    onClick={() => setActivityId(option.id)}
                  >
                    <span className="calorie-tool__option-label">
                      {option.label}
                    </span>
                    <span className="calorie-tool__option-detail">
                      {option.detail}
                    </span>
                  </button>
                ))}
              </div>
            </fieldset>

            <fieldset className="calorie-tool__fieldset">
              <legend className="calorie-tool__legend">Goal</legend>
              <div className="calorie-tool__segment calorie-tool__segment--wrap">
                {CALORIE_GOAL_OPTIONS.map((option) => (
                  <button
                    key={option.id}
                    type="button"
                    className={
                      goalId === option.id
                        ? "calorie-tool__chip calorie-tool__chip--active smoac-control"
                        : "calorie-tool__chip smoac-control"
                    }
                    onClick={() => setGoalId(option.id)}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </fieldset>

            {error ? <p className="calorie-tool__error">{error}</p> : null}

            <button
              type="submit"
              className="calorie-tool__submit smoac-control"
            >
              See my path
            </button>
            <p className="calorie-tool__disclaimer">
              Estimates only — not medical advice. Talk with a qualified
              professional before changing how you eat or train.
            </p>
          </form>
        ) : result && selectedPace && projectionBundle ? (
          <div className="calorie-tool__results">
            <div className="calorie-tool__edit-bar">
              <button
                type="button"
                className="calorie-tool__edit smoac-control"
                onClick={handleEditInputs}
              >
                <svg
                  width="14"
                  height="14"
                  viewBox="0 0 24 24"
                  fill="none"
                  aria-hidden="true"
                >
                  <path
                    d="M15 18l-6-6 6-6"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
                Adjust calculator
              </button>
            </div>

            <section
              className="calorie-tool__paces"
              aria-labelledby="calorie-paces-heading"
            >
              <div className="calorie-tool__paces-head">
                <h2
                  id="calorie-paces-heading"
                  className="calorie-tool__section-title"
                >
                  Daily calorie targets
                </h2>
                <p className="calorie-tool__section-copy">
                  Maintenance is {result.tdee.toLocaleString()} kcal/day (
                  {result.activityLabel.toLowerCase()}). Tap a pace to update
                  your path. Protein focus ~{result.proteinGrams}g/day.
                </p>
              </div>

              <div className="calorie-tool__pace-table" role="list">
                {(showGainPaces ? result.gainPaces : result.lossPaces).map(
                  (pace) => {
                    const active = pace.id === selectedPace.id;
                    return (
                      <button
                        key={pace.id}
                        type="button"
                        role="listitem"
                        className={
                          active
                            ? "calorie-tool__pace calorie-tool__pace--active smoac-control"
                            : "calorie-tool__pace smoac-control"
                        }
                        onClick={() => setSelectedPaceId(pace.id)}
                        aria-pressed={active}
                      >
                        <span className="calorie-tool__pace-copy">
                          <span className="calorie-tool__pace-label">
                            {pace.label}
                          </span>
                          <span className="calorie-tool__pace-detail">
                            {pace.detail}
                            {pace.floored ? " · floored for safety" : ""}
                          </span>
                        </span>
                        <span className="calorie-tool__pace-value">
                          <strong>{pace.calories.toLocaleString()}</strong>
                          <span>kcal/day · {pace.percentOfTdee}%</span>
                        </span>
                      </button>
                    );
                  }
                )}
              </div>

              <button
                type="button"
                className="calorie-tool__pace-toggle smoac-control"
                onClick={() => {
                  const next = !showGainPaces;
                  setShowGainPaces(next);
                  setSelectedPaceId(next ? "mild_gain" : "mild_loss");
                }}
              >
                {showGainPaces
                  ? "Show weight loss paces"
                  : "Show weight gain paces"}
              </button>
            </section>

            <section
              className="calorie-tool__projection"
              aria-labelledby="calorie-projection-heading"
            >
              <h2
                id="calorie-projection-heading"
                className="calorie-tool__section-title"
              >
                If you stay on this path
              </h2>
              <p className="calorie-tool__section-copy">
                {selectedPace.weeklyChangeLb === 0
                  ? `Holding near your current weight over the next ${projectionBundle.projectionWeeks} weeks at ~${selectedPace.calories.toLocaleString()} kcal/day.`
                  : `${selectedPace.label} at ~${selectedPace.calories.toLocaleString()} kcal/day — about ${Math.abs(selectedPace.weeklyChangeLb).toFixed(1)} lb/${selectedPace.weeklyChangeLb < 0 ? "week down" : "week up"}, around ${projectionBundle.projectedWeightLb} lb in ${projectionBundle.projectionWeeks} weeks.`}
              </p>
              <CalorieProjectionChart
                points={projectionBundle.projection}
                weeklyChangeLb={selectedPace.weeklyChangeLb}
              />
              <ol className="calorie-tool__sr-list">
                {projectionBundle.projection
                  .filter((_, index) => index % 2 === 0)
                  .map((point) => (
                    <li key={point.week}>
                      Week {point.week}: {point.weightLb} lb
                    </li>
                  ))}
              </ol>
            </section>

            {suggestions.length > 0 ? (
              <section
                className="calorie-tool__specialists"
                aria-labelledby="calorie-specialists-heading"
              >
                <h2
                  id="calorie-specialists-heading"
                  className="calorie-tool__section-title"
                >
                  Want a trainer?
                </h2>
                <p className="calorie-tool__section-copy">
                  Trainers in your area suggested for this goal. Sponsored
                  profiles are paid boosts.
                </p>
                <HorizontalCarousel
                  className="calorie-tool__carousel"
                  ariaLabel="Suggested specialists"
                >
                  {suggestions.map((row, index) => (
                    <HomePortraitSpecialistCard
                      key={row.trainer.id}
                      trainer={row.trainer}
                      priority={index < 2}
                      impressionSurface="tools_calories"
                      badgeLabel={
                        row.kind === "sponsored" ? "Sponsored" : "Suggested"
                      }
                    />
                  ))}
                </HorizontalCarousel>
              </section>
            ) : null}

            <div className="calorie-tool__actions">
              <Link
                href={SITE_ROUTES.home}
                className="calorie-tool__primary smoac-control"
              >
                Continue on SMOAC
              </Link>
              <Link
                href={SITE_ROUTES.explore}
                className="calorie-tool__secondary smoac-control"
                onClick={handleContinueToExplore}
              >
                Search map
              </Link>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
