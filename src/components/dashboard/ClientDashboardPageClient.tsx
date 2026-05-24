"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { getFeaturedTrainers } from "@/data/trainers";
import {
  CLIENT_COMPARE_PLACEHOLDER,
  CLIENT_MESSAGES_PLACEHOLDER,
} from "@/data/dashboard-mock";
import { useAuthSession } from "@/hooks/useAuthSession";
import { useRecentSearches } from "@/hooks/useRecentSearches";
import { useRequireAuth } from "@/hooks/useRequireAuth";
import { useSavedTrainers } from "@/hooks/useSavedTrainers";
import { afterLogoutNavigation } from "@/lib/logout-with-toast";
import { buildExploreSearchParams } from "@/lib/explore-url";
import { applySearchQueryToExploreState } from "@/lib/search-query-parser";
import { EMPTY_TRAINER_FILTERS } from "@/lib/explore";
import { TrainerList } from "@/components/trainers";
import {
  DashboardEmptyState,
  DashboardListItem,
  DashboardMetricCard,
  DashboardPageShell,
  DashboardSection,
} from "@/components/dashboard";

function exploreHrefForQuery(query: string): string {
  const applied = applySearchQueryToExploreState(query, EMPTY_TRAINER_FILTERS);
  const params = buildExploreSearchParams(
    applied.filters,
    applied.displayQuery
  );
  return `/explore?${params}`;
}

export function ClientDashboardPageClient() {
  const router = useRouter();
  const { isReady, session } = useRequireAuth("client");
  const { signOut } = useAuthSession();
  const { getSavedTrainers } = useSavedTrainers();
  const { entries: recentSearches } = useRecentSearches();
  const saved = getSavedTrainers();
  const recommended = getFeaturedTrainers().slice(0, 3);

  if (!isReady || !session) {
    return (
      <div className="dashboard-page dashboard-page--loading">
        <div className="dashboard-page__content">
          <p className="dashboard-page__subtitle">Loading your dashboard…</p>
        </div>
      </div>
    );
  }

  const firstName = session.email.split("@")[0] || "there";

  return (
    <DashboardPageShell
      eyebrow="Client dashboard"
      title={`Welcome back, ${firstName}`}
      subtitle="Your saved specialists, searches, and inquiries in one place."
      roleLabel="Client"
      actions={
        <button
          type="button"
          className="dashboard-signout"
          onClick={() => {
            signOut();
            afterLogoutNavigation(() => router.push("/login"));
          }}
        >
          Sign out
        </button>
      }
    >
      <div className="dashboard-grid">
        <DashboardSection
          title="Saved specialists"
          description={`${saved.length} saved on this device`}
          href="/saved"
          linkLabel="Open saved"
          className="dashboard-grid__span-2"
        >
          {saved.length > 0 ? (
            <TrainerList trainers={saved.slice(0, 2)} variant="explore" />
          ) : (
            <DashboardEmptyState
              message="Save specialists from Explore or a profile to build your shortlist."
              actionHref="/explore"
              actionLabel="Explore specialists"
            />
          )}
        </DashboardSection>

        <DashboardSection
          title="Recent searches"
          description="Pick up where you left off"
          href="/explore"
        >
          {recentSearches.length > 0 ? (
            <ul className="dashboard-list">
              {recentSearches.slice(0, 4).map((entry) => (
                <li key={entry.id}>
                  <DashboardListItem
                    title={entry.query}
                    meta={new Date(entry.searchedAt).toLocaleDateString()}
                    href={exploreHrefForQuery(entry.query)}
                  />
                </li>
              ))}
            </ul>
          ) : (
            <DashboardEmptyState
              message="Your recent Explore searches will appear here."
              actionHref="/explore"
              actionLabel="Search specialists"
            />
          )}
        </DashboardSection>

        <DashboardSection title="Compare specialists">
          <div className="dashboard-compare">
            <DashboardMetricCard
              label="Ready to compare"
              value={String(CLIENT_COMPARE_PLACEHOLDER.count)}
              detail={CLIENT_COMPARE_PLACEHOLDER.label}
            />
            <Link href="/saved" className="dashboard-inline-cta">
              Review saved specialists →
            </Link>
          </div>
        </DashboardSection>

        <DashboardSection
          title="Messages / inquiries"
          description="Conversations with specialists"
        >
          <ul className="dashboard-list">
            {CLIENT_MESSAGES_PLACEHOLDER.map((message) => (
              <li key={message.id}>
                <DashboardListItem
                  title={message.specialist}
                  subtitle={message.preview}
                  meta={message.time}
                  badge={
                    message.unread ? (
                      <span className="dashboard-badge">New</span>
                    ) : undefined
                  }
                />
              </li>
            ))}
          </ul>
        </DashboardSection>

        <DashboardSection
          title="Recommended specialists"
          description="Curated for your goals"
          href="/explore"
          className="dashboard-grid__span-2"
        >
          <TrainerList trainers={recommended} variant="explore" />
        </DashboardSection>
      </div>
    </DashboardPageShell>
  );
}
