import { cn } from "@/lib/utils";

/** Instant shell while explore RSC / catalog streams in */
export function ExploreRouteLoading({
  mapShell = false,
}: {
  mapShell?: boolean;
} = {}) {
  return (
    <div
      className={cn(
        "explore-page",
        "explore-page--loading",
        mapShell && "explore-page--map-shell explore-page--map-hero"
      )}
      aria-busy="true"
    >
      <div className="explore-page__content">
        <div className="explore-loading">
          <div className="explore-loading__bar explore-loading__bar--title" />
          <div className="explore-loading__bar explore-loading__bar--search" />
          <div className="explore-loading__cards">
            <div className="explore-loading__card" />
            <div className="explore-loading__card" />
            <div className="explore-loading__card" />
          </div>
        </div>
      </div>
    </div>
  );
}
