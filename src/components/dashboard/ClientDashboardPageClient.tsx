"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuthSession } from "@/hooks/useAuthSession";
import { useRequireAuth } from "@/hooks/useRequireAuth";
import { useSavedTrainers } from "@/hooks/useSavedTrainers";
import { afterLogoutNavigation } from "@/lib/logout-with-toast";
import { markSavedTrainersLoadTimedOut } from "@/lib/saved-trainers-store";
import {
  loadClientInquiryMessages,
  type ClientInquiryListItem,
} from "@/lib/inquiry/inquiry-inbox";
import { trackInquiryEvent } from "@/lib/inquiry/inquiry-analytics";
import {
  getClientProfileCompletionPercent,
  isClientProfileMinimumComplete,
  priceBoundsForPreset,
} from "@/lib/profiles/client-profile-form";
import { loadClientProfileFormState } from "@/lib/profiles/client-profile-service";
import { CLIENT_SEARCH_RADIUS_OPTIONS } from "@/constants/client-profile-options";
import type { ClientProfileFormState } from "@/types/client-profile";
import {
  DashboardEmptyState,
  DashboardLoadingState,
  DashboardPageShell,
} from "@/components/dashboard";
import { SavedSpecialistsOrganizer } from "@/components/saved/SavedSpecialistsOrganizer";
import { TrainerList } from "@/components/trainers";
import { ClientInquiriesList } from "@/components/dashboard/client/ClientInquiriesList";
import { ClientProfileEditModal } from "@/components/dashboard/client/ClientProfileEditModal";
import { ClientWorkoutsEntry } from "@/components/dashboard/client/workouts/ClientWorkoutsEntry";
import { PageWaitState } from "@/components/brand/PageWaitState";
import { FastActivateButton } from "@/components/ui/FastActivateButton";
import { CheckIcon } from "@/components/ui/icons";
import { cn, getInitials } from "@/lib/utils";
import "@/styles/client-profile-sheet.css";

type ClientDashboardTab = "profile" | "saved" | "messages";

const TABS: ReadonlyArray<{ id: ClientDashboardTab; label: string }> = [
  { id: "profile", label: "My Profile" },
  { id: "saved", label: "Saved Specialists" },
  { id: "messages", label: "Inquiries" },
];

function formatRadiusLabel(miles: number | null): string {
  const match = CLIENT_SEARCH_RADIUS_OPTIONS.find(
    (option) => option.value === miles
  );
  return match?.label ?? "Automatic";
}

function formatBudgetLabel(form: ClientProfileFormState): string {
  const bounds = priceBoundsForPreset(
    form.pricePreset,
    form.customPriceMin,
    form.customPriceMax
  );
  return bounds.label || "No preference";
}

function formatLocation(form: ClientProfileFormState): string {
  const parts = [form.city, form.state, form.postalCode]
    .map((part) => part.trim())
    .filter(Boolean);
  return parts.length > 0 ? parts.join(", ") : "Add your location";
}

export function ClientDashboardPageClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { isReady, session } = useRequireAuth("client");
  const { signOut, refreshSession } = useAuthSession();
  const {
    isSavesReady,
    isSavesLoading,
    savesError,
    savedCount,
    getSavedTrainers,
  } = useSavedTrainers();
  const saved = useMemo(() => getSavedTrainers(), [getSavedTrainers]);
  const [messages, setMessages] = useState<ClientInquiryListItem[]>([]);
  const [profileOpen, setProfileOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<ClientDashboardTab>("profile");
  const [openConversationId, setOpenConversationId] = useState<string | null>(
    null
  );
  const [profileForm, setProfileForm] = useState<ClientProfileFormState | null>(
    null
  );
  const [loadTimedOut, setLoadTimedOut] = useState(false);

  useEffect(() => {
    const userId = session?.userId;
    if (!userId) return;
    function loadMessages() {
      void loadClientInquiryMessages(userId).then(setMessages);
    }
    loadMessages();
    function onVisible() {
      if (document.visibilityState === "visible") loadMessages();
    }
    window.addEventListener("focus", loadMessages);
    document.addEventListener("visibilitychange", onVisible);
    window.addEventListener("smoac:inquiry-updated", loadMessages);
    return () => {
      window.removeEventListener("focus", loadMessages);
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener("smoac:inquiry-updated", loadMessages);
    };
  }, [session?.userId]);

  useEffect(() => {
    if (!isReady || !session) return;
    if (searchParams.get("editProfile") === "1") {
      setProfileOpen(true);
      setActiveTab("profile");
      router.replace("/client-dashboard", { scroll: false });
      return;
    }
    const tab = searchParams.get("tab");
    const conversationId = searchParams.get("c")?.trim() || "";
    if (conversationId) {
      setActiveTab("messages");
      setOpenConversationId(conversationId);
      return;
    }
    if (tab === "messages" || tab === "saved" || tab === "profile") {
      setActiveTab(tab);
      router.replace("/client-dashboard", { scroll: false });
    }
  }, [isReady, session, searchParams, router]);

  useEffect(() => {
    if (!session?.userId) return;
    let cancelled = false;
    void loadClientProfileFormState(session.userId, session.email).then(
      (form) => {
        if (!cancelled) setProfileForm(form);
      }
    );
    return () => {
      cancelled = true;
    };
  }, [session?.userId, session?.email, profileOpen, session?.avatarUrl, session?.profileCompletionStatus]);

  useEffect(() => {
    if (!isSavesLoading) {
      setLoadTimedOut(false);
      return;
    }
    const timer = window.setTimeout(() => {
      markSavedTrainersLoadTimedOut();
      setLoadTimedOut(true);
    }, 12_000);
    return () => window.clearTimeout(timer);
  }, [isSavesLoading]);

  if (!isReady || !session) {
    return <DashboardLoadingState />;
  }

  const firstName = session.firstName?.trim() || "there";
  const form = profileForm;
  const profileComplete =
    session.profileCompletionStatus === "complete" ||
    (form
      ? isClientProfileMinimumComplete({
          firstName: form.firstName,
          postalCode: form.postalCode,
          city: form.city,
          goals: form.goals,
        })
      : false);

  const completionPercent = form
    ? getClientProfileCompletionPercent({
        firstName: form.firstName,
        postalCode: form.postalCode,
        city: form.city,
        goals: form.goals,
        hasAvatar: Boolean(form.avatarUrl || session.avatarUrl),
        hasBudget: form.pricePreset !== "none",
        hasRadiusPreference: form.preferredRadiusMiles != null,
      })
    : profileComplete
      ? 100
      : 35;

  const displayName =
    form?.displayName.trim() ||
    [form?.firstName, form?.lastName].filter(Boolean).join(" ").trim() ||
    session.displayName?.trim() ||
    firstName;

  const avatarUrl = form?.avatarUrl || session.avatarUrl || "";
  const initials =
    getInitials(displayName) ||
    getInitials(session.email.split("@")[0] || "U") ||
    "U";

  async function handleSignOut() {
    await signOut();
    afterLogoutNavigation("/profile");
  }

  function openProfileEditor() {
    trackInquiryEvent("profile_completion_opened");
    setProfileOpen(true);
  }

  function handleProfileModalClose() {
    setProfileOpen(false);
    void refreshSession();
    if (session?.userId) {
      void loadClientProfileFormState(session.userId, session.email).then(
        setProfileForm
      );
    }
  }

  return (
    <>
      <DashboardPageShell
        variant="client"
        eyebrow="Client dashboard"
        title={`Welcome back, ${firstName}`}
        subtitle="Your profile, saved specialists, and messages."
        utilityBar={
          <FastActivateButton
            className="dashboard-signout dashboard-signout--utility"
            onActivate={() => void handleSignOut()}
          >
            Sign out
          </FastActivateButton>
        }
      >
        {!profileComplete ? (
          <FastActivateButton
            className="client-dash-progress"
            onActivate={openProfileEditor}
          >
            <div className="client-dash-progress__row">
              <span className="client-dash-progress__title">
                Complete your profile
              </span>
              <span className="client-dash-progress__pct">
                {completionPercent}%
              </span>
            </div>
            <div
              className="client-dash-progress__track"
              role="progressbar"
              aria-valuenow={completionPercent}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-label="Profile completion"
            >
              <span
                className="client-dash-progress__fill"
                style={{ width: `${completionPercent}%` }}
              />
            </div>
            <p className="client-dash-progress__hint">
              Add a few details for better specialist matches.
            </p>
          </FastActivateButton>
        ) : null}

        <div
          className="client-dash-tabs"
          role="tablist"
          aria-label="Client dashboard sections"
        >
          {TABS.map((tab) => (
            <FastActivateButton
              key={tab.id}
              role="tab"
              id={`client-dash-tab-${tab.id}`}
              aria-selected={activeTab === tab.id}
              aria-controls={`client-dash-panel-${tab.id}`}
              className={cn(
                "client-dash-tabs__btn",
                activeTab === tab.id && "client-dash-tabs__btn--active"
              )}
              onActivate={() => setActiveTab(tab.id)}
            >
              {tab.label}
              {tab.id === "saved" && savedCount > 0 ? (
                <span className="client-dash-tabs__count">{savedCount}</span>
              ) : null}
              {tab.id === "messages" && messages.some((m) => m.unread) ? (
                <span className="client-dash-tabs__dot" aria-hidden />
              ) : null}
            </FastActivateButton>
          ))}
        </div>

        <div className="client-dash-panels">
          {activeTab === "profile" ? (
            <section
              id="client-dash-panel-profile"
              role="tabpanel"
              aria-labelledby="client-dash-tab-profile"
              className="client-dash-panel client-dash-panel--profile"
            >
              <div className="client-dash-summary">
                <div className="client-dash-summary__identity">
                  <div className="client-dash-summary__avatar-wrap">
                    <div className="client-dash-summary__avatar">
                      {avatarUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element -- auth avatar URLs
                        <img src={avatarUrl} alt="" />
                      ) : (
                        <span aria-hidden>{initials}</span>
                      )}
                    </div>
                    {profileComplete ? (
                      <span
                        className="client-dash-summary__avatar-badge"
                        title="Profile complete"
                        aria-label="Profile complete"
                      >
                        <CheckIcon className="client-dash-summary__avatar-badge-icon" />
                      </span>
                    ) : null}
                  </div>
                  <div className="client-dash-summary__copy">
                    <h2 className="client-dash-summary__name">{displayName}</h2>
                    <p className="client-dash-summary__location">
                      <span className="client-dash-summary__location-chip">
                        <span>{form ? formatLocation(form) : "—"}</span>
                      </span>
                    </p>
                  </div>
                </div>

                <dl className="client-dash-summary__meta">
                  <div>
                    <dt>Goals</dt>
                    <dd>
                      {form?.goals.length
                        ? form.goals.slice(0, 4).join(" · ")
                        : "Not set yet"}
                    </dd>
                  </div>
                  <div>
                    <dt>Travel distance</dt>
                    <dd>
                      {form
                        ? formatRadiusLabel(form.preferredRadiusMiles)
                        : "Automatic"}
                    </dd>
                  </div>
                  <div>
                    <dt>Budget</dt>
                    <dd>{form ? formatBudgetLabel(form) : "No preference"}</dd>
                  </div>
                </dl>

                <FastActivateButton
                  className="client-dash-summary__edit"
                  onActivate={openProfileEditor}
                >
                  Edit profile
                </FastActivateButton>
              </div>

              <ClientWorkoutsEntry userId={session.userId} />
            </section>
          ) : null}

          {activeTab === "saved" ? (
            <section
              id="client-dash-panel-saved"
              role="tabpanel"
              aria-labelledby="client-dash-tab-saved"
              className="client-dash-panel"
            >
              {!isSavesReady && !loadTimedOut ? (
                <PageWaitState
                  label="Loading your saved specialists"
                  compact
                />
              ) : saved.length >= 2 ? (
                <SavedSpecialistsOrganizer
                  trainers={saved}
                  impressionSurface="client_dashboard"
                />
              ) : saved.length > 0 ? (
                <TrainerList
                  trainers={saved}
                  variant="explore"
                  priorityCount={4}
                  impressionSurface="client_dashboard"
                />
              ) : (
                <DashboardEmptyState
                  message={
                    savesError || loadTimedOut
                      ? savesError ||
                        "Saved specialists took too long to load. Try refreshing."
                      : "Save specialists from Search to build your shortlist."
                  }
                  actionHref="/explore"
                  actionLabel="Browse specialists"
                />
              )}
            </section>
          ) : null}

          {activeTab === "messages" ? (
            <section
              id="client-dash-panel-messages"
              role="tabpanel"
              aria-labelledby="client-dash-tab-messages"
              className="client-dash-panel"
            >
              <ClientInquiriesList
                inquiries={messages}
                userId={session.userId}
                initialConversationId={openConversationId}
                onConversationOpened={(id) => {
                  setOpenConversationId(id);
                  setMessages((prev) =>
                    prev.map((item) =>
                      item.id === id ? { ...item, unread: false } : item
                    )
                  );
                }}
                onCloseThread={() => setOpenConversationId(null)}
              />
            </section>
          ) : null}
        </div>
      </DashboardPageShell>

      <ClientProfileEditModal
        open={profileOpen}
        userId={session.userId}
        authEmail={session.email}
        onClose={handleProfileModalClose}
      />
    </>
  );
}
