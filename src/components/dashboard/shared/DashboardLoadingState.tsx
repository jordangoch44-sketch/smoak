interface DashboardLoadingStateProps {
  message?: string;
}

export function DashboardLoadingState({
  message = "Loading your dashboard…",
}: DashboardLoadingStateProps) {
  return (
    <div className="dashboard-page dashboard-page--loading">
      <div className="dashboard-page__content">
        <p className="dashboard-page__subtitle">{message}</p>
      </div>
    </div>
  );
}
