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
  markInquiryThreadRead,
  type ClientInquiryListItem,
} from "@/lib/inquiry/inquiry-inbox";
import { trackInquiryEvent } from "@/lib/inquiry/inquiry-analytics";
import {
  hideInquiryForViewer,
  persistInquiryMarkedUnread,
  subscribeInquiryInbox,
} from "@/lib/inquiry/inquiry-inbox-state";
import {
  unflagInquiryUnread,
  unflagInquiryUnreadIds,
} from "@/lib/inquiry/inquiry-unread-flag-store";
import { loadClientProfileFormState } from "@/lib/profiles/client-profile-service";
import type { ClientProfileFormState } from "@/types/client-profile";
import {
  DashboardEmptyState,
  DashboardLoadingState,
  DashboardPageShell,
} from "@/components/dashboard";
import { SavedSpecialistsOrganizer } from "@/components/saved/SavedSpecialistsOrganizer";
import { TrainerList } from "@/components/trainers";
import { ClientInquiriesList } from "@/components/dashboard/client/ClientInquiriesList";
import { ClientProfileEditModal, type ClientProfileEditorFocus } from "@/components/dashboard/client/ClientProfileEditModal";
import { ClientProfileHome } from "@/components/dashboard/client/ClientProfileHome";
import { ClientCoachingInvites } from "@/components/dashboard/client/coaching/ClientCoachingInvites";
import { ClientDashboardOverlay } from "@/components/dashboard/client/ClientDashboardOverlay";
import { PageWaitState } from "@/components/brand/PageWaitState";
import { getInitials } from "@/lib/utils";
import "@/styles/client-profile-sheet.css";

type ClientDashboardOverlayId = "saved" | "messages";

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
  const [profileFocus, setProfileFocus] = useState<ClientProfileEditorFocus | null>(null);
  const [overlay, setOverlay] = useState<ClientDashboardOverlayId | null>(null);
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
    const unsubscribe = subscribeInquiryInbox({
      column: "client_user_id",
      value: userId,
    });
    return () => {
      unsubscribe();
      window.removeEventListener("focus", loadMessages);
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener("smoac:inquiry-updated", loadMessages);
    };
  }, [session?.userId]);

  useEffect(() => {
    if (!isReady || !session) return;
    if (searchParams.get("editProfile") === "1") {
      setProfileFocus(null);
      setProfileOpen(true);
      setOverlay(null);
      router.replace("/client-dashboard", { scroll: false });
      return;
    }
    const tab = searchParams.get("tab");
    const conversationId = searchParams.get("c")?.trim() || "";
    if (conversationId || tab === "messages") {
      setOverlay("messages");
      setOpenConversationId(conversationId || null);
      return;
    }
    if (tab === "saved") {
      setOverlay("saved");
      return;
    }
    setOverlay(null);
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

  const form = profileForm;
  const displayName =
    form?.displayName.trim() ||
    [form?.firstName, form?.lastName].filter(Boolean).join(" ").trim() ||
    session.displayName?.trim() ||
    session.firstName?.trim() ||
    "";

  const avatarUrl = form?.avatarUrl || session.avatarUrl || "";
  const initials =
    getInitials(displayName) ||
    getInitials(session.email.split("@")[0] || "U") ||
    "U";

  async function handleSignOut() {
    await signOut();
    afterLogoutNavigation("/profile");
  }

  function openProfileEditor(focus: ClientProfileEditorFocus | null = null) {
    trackInquiryEvent("profile_completion_opened");
    setProfileFocus(focus);
    setProfileOpen(true);
  }

  function handleProfileModalClose() {
    setProfileOpen(false);
    setProfileFocus(null);
    void refreshSession();
    if (session?.userId) {
      void loadClientProfileFormState(session.userId, session.email).then(
        setProfileForm
      );
    }
  }

  async function handleHideClientInquiry(id: string) {
    if (!session?.userId || !id) return;
    unflagInquiryUnread(session.userId, id);
    setMessages((prev) => prev.filter((item) => item.id !== id));
    if (openConversationId === id) setOpenConversationId(null);
    await hideInquiryForViewer("client", session.userId, id);
  }

  async function handleMarkClientInquiriesRead(ids: string[]) {
    if (!session?.userId) return;
    const unique = [...new Set(ids.filter(Boolean))];
    if (unique.length === 0) return;
    unflagInquiryUnreadIds(session.userId, unique);
    await Promise.all(
      unique.map((id) => markInquiryThreadRead(id, "client"))
    );
    setMessages((prev) =>
      prev.map((item) =>
        unique.includes(item.id) ? { ...item, unread: false } : item
      )
    );
  }

  async function handleMarkClientInquiriesUnread(ids: string[]) {
    if (!session?.userId) return;
    const unique = [...new Set(ids.filter(Boolean))];
    if (unique.length === 0) return;
    await persistInquiryMarkedUnread("client", session.userId, unique);
    setMessages((prev) =>
      prev.map((item) =>
        unique.includes(item.id) ? { ...item, unread: true } : item
      )
    );
  }

  function openOverlay(next: ClientDashboardOverlayId) {
    setOverlay(next);
    const qs = new URLSearchParams();
    qs.set("tab", next);
    router.replace(`/client-dashboard?${qs.toString()}`, { scroll: false });
  }

  function closeOverlay() {
    setOverlay(null);
    setOpenConversationId(null);
    router.replace("/client-dashboard", { scroll: false });
  }

  const unreadCount = messages.filter((item) => item.unread).length;

  return (
    <>
      <DashboardPageShell variant="client" hideHeader>
        <ClientProfileHome
          userId={session.userId}
          displayName={displayName}
          avatarUrl={avatarUrl}
          initials={initials}
          postalCode={form?.postalCode ?? ""}
          city={form?.city ?? ""}
          goals={form?.goals ?? []}
          specialties={form?.preferredSpecialties ?? []}
          sessionFormat={form?.preferredSessionFormat ?? ""}
          unreadCount={unreadCount}
          savedCount={savedCount}
          notices={<ClientCoachingInvites userId={session.userId} />}
          onEditProfile={(focus) => openProfileEditor(focus ?? null)}
          onOpenMessages={() => openOverlay("messages")}
          onOpenSaved={() => openOverlay("saved")}
          onSignOut={() => void handleSignOut()}
        />
      </DashboardPageShell>

      {overlay === "saved" ? (
        <ClientDashboardOverlay
          title="Saved Specialists"
          padded
          onBack={closeOverlay}
        >
          {!isSavesReady && !loadTimedOut ? (
            <PageWaitState label="Loading your saved specialists" compact />
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
        </ClientDashboardOverlay>
      ) : null}

      {overlay === "messages" ? (
        <ClientInquiriesList
          inquiries={messages}
          userId={session.userId}
          initialConversationId={openConversationId}
          onBack={closeOverlay}
          onConversationOpened={(id) => {
            setOpenConversationId(id);
            unflagInquiryUnread(session.userId, id);
            setMessages((prev) =>
              prev.map((item) =>
                item.id === id ? { ...item, unread: false } : item
              )
            );
          }}
          onCloseThread={() => setOpenConversationId(null)}
          onHideConversation={handleHideClientInquiry}
          onMarkRead={(ids) => {
            void handleMarkClientInquiriesRead(ids);
          }}
          onMarkUnread={handleMarkClientInquiriesUnread}
        />
      ) : null}

      <ClientProfileEditModal
        open={profileOpen}
        userId={session.userId}
        authEmail={session.email}
        focus={profileFocus}
        onClose={handleProfileModalClose}
      />
    </>
  );
}
