interface ExplorePageHeaderProps {
  resultCount: number;
  searchQuery: string;
}

export function ExplorePageHeader({
  resultCount,
  searchQuery,
}: ExplorePageHeaderProps) {
  const trimmed = searchQuery.trim();
  const specialistLabel = resultCount === 1 ? "specialist" : "specialists";

  return (
    <header className="explore-page__header">
      <p className="explore-page__eyebrow">Discover</p>
      <h1 className="explore-page__title">Explore Specialists</h1>
      <p className="explore-page__subtitle">
        {resultCount} vetted {specialistLabel} available
      </p>
      {trimmed ? (
        <p className="explore-page__search-hint">
          Showing results for &ldquo;{trimmed}&rdquo;
        </p>
      ) : null}
    </header>
  );
}
