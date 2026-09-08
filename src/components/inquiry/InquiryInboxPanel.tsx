"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { InquiryThreadPayload } from "@/types/inquiry";
import type { SpecialistLead } from "@/types/specialist-dashboard";
import {
  loadInquiryThread,
  markInquiryThreadRead,
  threadFromDemoLead,
} from "@/lib/inquiry/inquiry-inbox";
import { isDemoInquiryConversationId } from "@/lib/inquiry/inquiry-paths";
import { submitInquiryReply } from "@/lib/inquiry/inquiry-submit";
import { DashboardEmptyState } from "@/components/dashboard/shared";
import {
  InquiryConversationList,
  type InquiryInboxRow,
} from "./InquiryConversationList";
import { InquiryThreadView } from "./InquiryThreadView";
import "@/styles/inquiry-thread.css";

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
  onOpenConversation?: (id: string) => void;
  onCloseThread?: () => void;
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
  onOpenConversation,
  onCloseThread,
}: InquiryInboxPanelProps) {
  const [openId, setOpenId] = useState<string | null>(
    initialConversationId?.trim() || null
  );
  const [thread, setThread] = useState<InquiryThreadPayload | null>(null);
  const [loadingThread, setLoadingThread] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const openConversation = useCallback(
    async (id: string) => {
      setOpenId(id);
      setError(null);
      onOpenConversation?.(id);

      const demo = demoLeads.find((lead) => lead.id === id);
      if (demo || isDemoInquiryConversationId(id)) {
        setThread(threadFromDemoLead(demo ?? {
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
        }));
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

  if (openId) {
    if (loadingThread && !thread) {
      return (
        <p className="inquiry-inbox__status" role="status">
          Opening conversation…
        </p>
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

  return <InquiryConversationList rows={rows} onSelect={(id) => void openConversation(id)} />;
}
