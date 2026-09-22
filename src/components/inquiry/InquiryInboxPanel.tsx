"use client";

import { useCallback, useEffect, useId, useRef, useState } from "react";
import { createPortal } from "react-dom";
import type { InquiryThreadPayload } from "@/types/inquiry";
import type { SpecialistLead } from "@/types/specialist-dashboard";
import {
  loadInquiryThread,
  markInquiryThreadRead,
  threadFromDemoLead,
} from "@/lib/inquiry/inquiry-inbox";
import {
  fetchInquiryClientPreview,
  previewFromLead,
  type InquiryClientPreview,
} from "@/lib/inquiry/inquiry-client-preview";
import { isDemoInquiryConversationId } from "@/lib/inquiry/inquiry-paths";
import { submitInquiryReply } from "@/lib/inquiry/inquiry-submit";
import { lockOverlayDocumentScroll } from "@/lib/lock-overlay-scroll";
import { PageWaitState } from "@/components/brand/PageWaitState";
import { DashboardEmptyState } from "@/components/dashboard/shared";
import { FastActivateButton } from "@/components/ui/FastActivateButton";
import { ChevronLeftIcon } from "@/components/ui/icons";
import {
  InquiryConversationList,
  type InquiryInboxRow,
} from "./InquiryConversationList";
import {
  InquiryClientPreviewModal,
  InquiryDeleteConfirmModal,
} from "./InquiryClientPreviewModal";
import { InquiryThreadView } from "./InquiryThreadView";
import "@/styles/inquiry-thread.css";

const PAGE_LOCK_CLASS = "inquiry-inbox-open";

interface InquiryInboxPanelProps {
  viewer: "client" | "specialist";
  senderUserId: string;
  rows: InquiryInboxRow[];
  initialConversationId?: string | null;
  emptyMessage: string;
  emptyActionHref?: string;
  emptyActionLabel?: string;
  /** Used to seed demo threads that are not in the inquiry tables */
  demoLeads?: SpecialistLead[];
  /** All specialist leads — demo fallback for client preview / hide */
  previewLeads?: SpecialistLead[];
  onOpenConversation?: (id: string) => void;
  onCloseThread?: () => void;
  onHideConversation?: (id: string) => void | Promise<void>;
  onMarkConversationsRead?: (ids: string[]) => void | Promise<void>;
  onMarkConversationsUnread?: (ids: string[]) => void | Promise<void>;
  /** Leave the full-page inquiries overlay (back to live profile). */
  onExitPage?: () => void;
  /**
   * `page` — full-viewport overlay (specialist profile Inquiries).
   * `embedded` — same chrome/list/thread, inline under client dashboard tabs.
   */
  variant?: "card" | "page" | "embedded";
  listTitle?: string;
}

export function InquiryInboxPanel({
  viewer,
  senderUserId,
  rows,
  initialConversationId,
  emptyMessage,
  emptyActionHref,
  emptyActionLabel,
  demoLeads = [],
  previewLeads = demoLeads,
  onOpenConversation,
  onCloseThread,
  onHideConversation,
  onMarkConversationsRead,
  onMarkConversationsUnread,
  onExitPage,
  variant = "card",
  listTitle,
}: InquiryInboxPanelProps) {
  const titleId = useId();
  const isPage = variant === "page";
  const isEmbedded = variant === "embedded";
  const usesPageChrome = isPage || isEmbedded;
  const [mounted, setMounted] = useState(false);
  const [openId, setOpenId] = useState<string | null>(
    initialConversationId?.trim() || null
  );
  const [thread, setThread] = useState<InquiryThreadPayload | null>(null);
  const [loadingThread, setLoadingThread] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pendingDeleteIds, setPendingDeleteIds] = useState<string[]>([]);
  const [deleteBusy, setDeleteBusy] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [clientPreview, setClientPreview] = useState<InquiryClientPreview | null>(
    null
  );
  const [selecting, setSelecting] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const previewRequestId = useRef(0);

  const swipeActions =
    viewer === "specialist" && Boolean(onHideConversation) && !selecting;
  const canSelect = Boolean(
    onHideConversation || onMarkConversationsRead || onMarkConversationsUnread
  );

  const leadFor = useCallback(
    (id: string) => previewLeads.find((lead) => lead.id === id),
    [previewLeads]
  );

  const openConversation = useCallback(
    async (id: string) => {
      setOpenId(id);
      setError(null);
      onOpenConversation?.(id);

      const demo = demoLeads.find((lead) => lead.id === id);
      if (demo || isDemoInquiryConversationId(id)) {
        setThread(
          threadFromDemoLead(
            demo ?? {
              id,
              name: "Client",
              intent: "",
              receivedAt: "",
              unread: false,
              clientEmail: "",
              actionLabel: "",
              topicLabels: [],
              messagePreview: "",
              messageBody: "",
              avatarUrl: "",
              clientUserId: "",
            }
          )
        );
        return;
      }

      setLoadingThread(true);
      const next = await loadInquiryThread(id);
      setThread(next);
      setLoadingThread(false);
      if (next) {
        await markInquiryThreadRead(id, viewer);
      }
    },
    [demoLeads, onOpenConversation, viewer]
  );

  const openConversationRef = useRef(openConversation);
  openConversationRef.current = openConversation;

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!isPage) return;
    document.body.classList.add(PAGE_LOCK_CLASS);
    document.documentElement.classList.add(PAGE_LOCK_CLASS);
    const unlock = lockOverlayDocumentScroll();
    return () => {
      unlock();
      document.body.classList.remove(PAGE_LOCK_CLASS);
      document.documentElement.classList.remove(PAGE_LOCK_CLASS);
    };
  }, [isPage]);

  useEffect(() => {
    const id = initialConversationId?.trim() || "";
    if (!id) return;
    void openConversationRef.current(id);
  }, [initialConversationId]);

  function handleBack() {
    setOpenId(null);
    setThread(null);
    setError(null);
    onCloseThread?.();
  }

  function exitSelectMode() {
    setSelecting(false);
    setSelectedIds([]);
  }

  function handleExitPage() {
    exitSelectMode();
    setOpenId(null);
    setThread(null);
    setError(null);
    onExitPage?.();
  }

  function toggleSelect(id: string) {
    setSelectedIds((current) =>
      current.includes(id)
        ? current.filter((item) => item !== id)
        : [...current, id]
    );
  }

  useEffect(() => {
    if (openId && !rows.some((row) => row.id === openId)) {
      setOpenId(null);
      setThread(null);
      setError(null);
      onCloseThread?.();
    }
  }, [openId, onCloseThread, rows]);

  useEffect(() => {
    const ids = new Set(rows.map((row) => row.id));
    setSelectedIds((current) => {
      const next = current.filter((id) => ids.has(id));
      return next.length === current.length ? current : next;
    });
  }, [rows]);

  useEffect(() => {
    if (!usesPageChrome) return;

    function onKeyDown(event: KeyboardEvent) {
      if (event.key !== "Escape") return;
      if (openId) {
        handleBack();
        return;
      }
      if (selecting) {
        exitSelectMode();
        return;
      }
      if (isPage) handleExitPage();
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [usesPageChrome, isPage, openId, selecting]);

  async function handleViewProfile(id: string) {
    const lead = leadFor(id);
    const requestId = ++previewRequestId.current;
    setPreviewOpen(true);
    setPreviewLoading(true);
    setClientPreview(lead ? previewFromLead(lead) : null);
    const fromApi = await fetchInquiryClientPreview(id);
    if (previewRequestId.current !== requestId) return;
    setClientPreview(fromApi ?? (lead ? previewFromLead(lead) : null));
    setPreviewLoading(false);
  }

  async function handleConfirmDelete() {
    if (pendingDeleteIds.length === 0 || !onHideConversation) return;
    const ids = pendingDeleteIds;
    setDeleteBusy(true);
    for (const id of ids) {
      await onHideConversation(id);
      if (clientPreview?.conversationId === id) {
        setPreviewOpen(false);
        setClientPreview(null);
      }
    }
    setDeleteBusy(false);
    setPendingDeleteIds([]);
    exitSelectMode();
  }

  async function handleMarkSelected(kind: "read" | "unread") {
    if (selectedIds.length === 0) return;
    const ids = [...selectedIds];
    if (kind === "read") {
      await onMarkConversationsRead?.(ids);
    } else {
      await onMarkConversationsUnread?.(ids);
    }
    exitSelectMode();
  }

  async function handleSend(message: string) {
    if (!openId || !thread?.canReply) return;
    setSending(true);
    setError(null);
    const optimistic: InquiryThreadPayload = {
      ...thread,
      messages: [
        ...thread.messages,
        {
          id: `local-${Date.now()}`,
          senderRole: viewer,
          body: message,
          createdAt: new Date().toISOString(),
        },
      ],
    };
    setThread(optimistic);

    const result = await submitInquiryReply({
      conversationId: openId,
      message,
      senderUserId,
      senderRole: viewer,
      specialistId: thread.specialistId,
      clientFirstName: thread.clientFirstName,
    });

    setSending(false);
    if (!result.ok) {
      setError(result.message);
      setThread(thread);
      return;
    }

    const refreshed = await loadInquiryThread(openId);
    if (refreshed) setThread(refreshed);
  }

  const list = (
    <InquiryConversationList
      rows={rows}
      selecting={selecting}
      selectedIds={selectedIds}
      swipeActions={swipeActions}
      onSelect={(id) => {
        if (selecting) {
          toggleSelect(id);
          return;
        }
        void openConversation(id);
      }}
      onViewProfile={(id) => {
        void handleViewProfile(id);
      }}
      onDelete={(id) => setPendingDeleteIds([id])}
    />
  );

  const modals = (
    <>
      <InquiryDeleteConfirmModal
        open={pendingDeleteIds.length > 0}
        name={
          pendingDeleteIds.length === 1
            ? rows.find((row) => row.id === pendingDeleteIds[0])?.name ??
              leadFor(pendingDeleteIds[0])?.name ??
              (viewer === "client" ? "this specialist" : "this client")
            : ""
        }
        counterpart={viewer === "client" ? "specialist" : "client"}
        count={pendingDeleteIds.length}
        busy={deleteBusy}
        onCancel={() => {
          if (!deleteBusy) setPendingDeleteIds([]);
        }}
        onConfirm={() => {
          void handleConfirmDelete();
        }}
      />
      <InquiryClientPreviewModal
        open={previewOpen}
        preview={clientPreview}
        loading={previewLoading}
        onClose={() => {
          previewRequestId.current += 1;
          setPreviewOpen(false);
          setPreviewLoading(false);
          setClientPreview(null);
        }}
      />
    </>
  );

  const threadLayer = openId ? (
    <div className="inquiry-thread-overlay" role="dialog" aria-modal="true">
      {loadingThread && !thread ? (
        <PageWaitState label="Opening conversation" compact />
      ) : thread ? (
        <InquiryThreadView
          viewer={viewer}
          thread={thread}
          sending={sending}
          error={error}
          layout="page"
          onBack={handleBack}
          onSend={(message) => {
            void handleSend(message);
          }}
        />
      ) : (
        <div className="inquiry-inbox__missing">
          <p className="inquiry-inbox__status">Conversation not found.</p>
          <button
            type="button"
            className="smoac-control inquiry-thread__back-text"
            onClick={handleBack}
          >
            Back to inquiries
          </button>
        </div>
      )}
    </div>
  ) : null;

  if (usesPageChrome) {
    const page = (
      <div
        className={
          isEmbedded
            ? "inquiry-inbox-page inquiry-inbox-page--embedded"
            : "inquiry-inbox-page"
        }
        role={isPage ? "dialog" : "region"}
        aria-modal={isPage ? true : undefined}
        aria-labelledby={titleId}
      >
        <header className="inquiry-inbox-page__chrome">
          {onExitPage ? (
            <FastActivateButton
              className="smoac-control inquiry-inbox-page__back"
              aria-label={
                viewer === "specialist" ? "Back to live profile" : "Back to profile"
              }
              onActivate={handleExitPage}
            >
              <ChevronLeftIcon className="inquiry-inbox-page__back-icon" />
            </FastActivateButton>
          ) : (
            <span className="inquiry-inbox-page__select-spacer" aria-hidden />
          )}
          <h1 id={titleId} className="inquiry-inbox-page__title">
            {listTitle || "Inquiries"}
          </h1>
          {canSelect ? (
            <FastActivateButton
              className="smoac-control inquiry-inbox-page__select"
              disabled={rows.length === 0 && !selecting}
              aria-pressed={selecting}
              onActivate={() => {
                if (selecting) {
                  exitSelectMode();
                  return;
                }
                setSelecting(true);
              }}
            >
              {selecting ? "Cancel" : "Select"}
            </FastActivateButton>
          ) : (
            <span className="inquiry-inbox-page__select-spacer" aria-hidden />
          )}
        </header>

        <div className="inquiry-inbox-page__body">
          {rows.length === 0 ? (
            <DashboardEmptyState
              message={emptyMessage}
              actionHref={emptyActionHref}
              actionLabel={emptyActionLabel}
            />
          ) : (
            list
          )}
        </div>

        {selecting ? (
          <div className="inquiry-inbox-page__footer">
            <div className="inquiry-inbox-page__footer-read">
              {onMarkConversationsRead ? (
                <FastActivateButton
                  className="smoac-control inquiry-inbox-page__mark"
                  disabled={
                    selectedIds.length === 0 ||
                    !rows.some(
                      (row) => selectedIds.includes(row.id) && row.unread
                    )
                  }
                  aria-label="Mark as read"
                  onActivate={() => {
                    void handleMarkSelected("read");
                  }}
                >
                  Mark read
                </FastActivateButton>
              ) : null}
              {onMarkConversationsUnread ? (
                <FastActivateButton
                  className="smoac-control inquiry-inbox-page__mark"
                  disabled={
                    selectedIds.length === 0 ||
                    !rows.some(
                      (row) => selectedIds.includes(row.id) && !row.unread
                    )
                  }
                  aria-label="Mark as unread"
                  onActivate={() => {
                    void handleMarkSelected("unread");
                  }}
                >
                  Mark unread
                </FastActivateButton>
              ) : null}
            </div>
            {onHideConversation ? (
              <FastActivateButton
                className="smoac-control inquiry-inbox-page__delete"
                disabled={selectedIds.length === 0}
                onActivate={() => setPendingDeleteIds([...selectedIds])}
              >
                {selectedIds.length > 1
                  ? `Delete (${selectedIds.length})`
                  : "Delete"}
              </FastActivateButton>
            ) : null}
          </div>
        ) : null}

        {threadLayer}
        {modals}
      </div>
    );

    if (isEmbedded) return page;
    if (!mounted || typeof document === "undefined") return null;
    return createPortal(page, document.body);
  }

  if (openId) {
    if (loadingThread && !thread) {
      return (
        <PageWaitState label="Opening conversation" compact />
      );
    }
    if (!thread) {
      return (
        <div className="inquiry-inbox__missing">
          <p className="inquiry-inbox__status">Conversation not found.</p>
          <button
            type="button"
            className="smoac-control inquiry-thread__back-text"
            onClick={handleBack}
          >
            Back to inquiries
          </button>
        </div>
      );
    }
    return (
      <InquiryThreadView
        viewer={viewer}
        thread={thread}
        sending={sending}
        error={error}
        layout={variant}
        onBack={handleBack}
        onSend={(message) => {
          void handleSend(message);
        }}
      />
    );
  }

  if (rows.length === 0) {
    return (
      <DashboardEmptyState
        message={emptyMessage}
        actionHref={emptyActionHref}
        actionLabel={emptyActionLabel}
      />
    );
  }

  return (
    <div className="inquiry-inbox">
      {listTitle ? <h2 className="inquiry-inbox__title">{listTitle}</h2> : null}
      {list}
      {modals}
    </div>
  );
}
