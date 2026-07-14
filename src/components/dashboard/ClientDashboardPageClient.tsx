"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { getFeaturedTrainers } from "@/data/trainers";
import { CLIENT_COMPARE_PLACEHOLDER } from "@/data/dashboard-mock";
import { useAuthSession } from "@/hooks/useAuthSession";
import { useRecentSearches } from "@/hooks/useRecentSearches";
import { useRequireAuth } from "@/hooks/useRequireAuth";
import { useSavedTrainers } from "@/hooks/useSavedTrainers";
import { afterLogoutNavigation } from "@/lib/logout-with-toast";
import { buildExploreSearchParams } from "@/lib/explore-url";
import { applySearchQueryToExploreState } from "@/lib/search-query-parser";
import { EMPTY_TRAINER_FILTERS } from "@/lib/explore";
import {
  loadClientInquiryMessages,
  type ClientInquiryListItem,
} from "@/lib/inquiry/inquiry-inbox";
import { trackInquiryEvent } from "@/lib/inquiry/inquiry-analytics";
import { TrainerList } from "@/components/trainers";
import {
  DashboardEmptyState,
  DashboardListItem,
  DashboardMetricCard,
  DashboardPageShell,
  DashboardSection,
} from "@/components/dashboard";

const DASHBOARD_RECOMMENDED_TRAINERS = getFeaturedTrainers().slice(0, 3);

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
  const { isSavesReady, isSavesLoading, savesError, savedCount, getSavedTrainers } = useSavedTrainers();
  const { entries: recentSearches } = useRecentSearches();
  const saved = useMemo(() => getSavedTrainers(), [getSavedTrainers]);
  const recommended = DASHBOARD_RECOMMENDED_TRAINERS;
  const [messages, setMessages] = useState<ClientInquiryListItem[]>([]);

  useEffect(() => {
    if (!session?.userId) return;
    void loadClientInquiryMessages(session.userId).then(setMessages);
  }, [session?.userId]);

  if (!isReady || !session || !isSavesReady) {
    return (
      <div className="dashboard-page dashboard-page--loading">
        <div className="dashboard-page__content">
          <p className="dashboard-page__subtitle">
            {isSavesLoading
              ? "Loading your saved specialists…"
              : savesError
                ? "Could not sync saved specialists — showing cached shortlist."
                : "Loading your dashboard…"}
          </p>
        </div>
      </div>
    );
  }

  // Greeting must reflect profiles.first_name (via session.firstName).
  const firstName = session.firstName?.trim() || "there";
  const showProfilePrompt =
    session.profileCompletionStatus === "incomplete" ||
    !session.clientZipCode?.trim();

  function handleSignOut() {
    signOut();
    afterLogoutNavigation(() => router.push("/profile"));
  }

  return (
    <DashboardPageShell
      variant="client"
      eyebrow="Client dashboard"
      title={`Welcome back, ${firstName}`}
      subtitle="Your saved specialists, searches, and inquiries in one place."
      utilityBar={
        <button
          type="button"
          className="dashboard-signout dashboard-signout--utility"
          onClick={handleSignOut}
        >
          Sign out
        </button>
      }
      introActions={
        <Link href="/" className="dashboard-intro-cta">
          Search more specialists
        </Link>
      }
    >
      <div className="dashboard-grid">
        {showProfilePrompt ? (
          <DashboardSection
            title="Complete your profile"
            description="Add your location, goals, and preferences to receive better specialist recommendations."
            className="dashboard-grid__span-2"
          >
            <Link
              href="/create-account?role=client"
              className="dashboard-inline-cta"
              onClick={() => trackInquiryEvent("profile_completion_opened")}
            >
              Complete your profile →
            </Link>
          </DashboardSection>
        ) : null}

        <DashboardSection
          title="Saved specialists"
          description={
            savesError
              ? `${saved.length} in your shortlist (offline cache)`
              : `${savedCount} in your shortlist`
          }
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
          {messages.length > 0 ? (
            <ul className="dashboard-list">
              {messages.map((message) => (
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
          ) : (
            <DashboardEmptyState
              message="Messages you send from a specialist profile will appear here."
              actionHref="/explore"
              actionLabel="Find a specialist"
            />
          )}
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
