/** Rail shimmer only — used under Hero while catalog streams */
export function HomeRailsLoading() {
  return (
    <div className="home-route-loading" aria-busy="true">
      <div className="home-route-loading__rail">
        <div className="home-route-loading__bar home-route-loading__bar--title" />
        <div className="home-route-loading__cards">
          <div className="home-route-loading__card" />
          <div className="home-route-loading__card" />
          <div className="home-route-loading__card" />
        </div>
      </div>
      <div className="home-route-loading__rail home-route-loading__rail--spaced">
        <div className="home-route-loading__bar home-route-loading__bar--title" />
        <div className="home-route-loading__cards">
          <div className="home-route-loading__card" />
          <div className="home-route-loading__card" />
          <div className="home-route-loading__card" />
        </div>
      </div>
    </div>
  );
}

/** Full shell for soft-nav to `/` before the page segment streams */
export function HomeRouteLoading() {
  return (
    <div
      className="home-page home-page--discovery home-page--loading"
      aria-busy="true"
    >
      <div className="home-page__sky" aria-hidden />
      <div className="home-route-loading">
        <div className="home-route-loading__hero" />
        <div className="home-route-loading__rail">
          <div className="home-route-loading__bar home-route-loading__bar--title" />
          <div className="home-route-loading__cards">
            <div className="home-route-loading__card" />
            <div className="home-route-loading__card" />
            <div className="home-route-loading__card" />
          </div>
        </div>
      </div>
    </div>
  );
}
