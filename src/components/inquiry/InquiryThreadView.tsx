"use client";

import {
  useEffect,
  useId,
  useRef,
  useState,
  type FormEvent,
  type KeyboardEvent,
} from "react";
import type { InquiryThreadPayload } from "@/types/inquiry";
import { INQUIRY_MESSAGE_MAX_LENGTH } from "@/lib/inquiry-options";
import { ChevronLeftIcon, SendIcon } from "@/components/ui/icons";
import { InquiryAvatar } from "./InquiryAvatar";
import { cn } from "@/lib/utils";

interface InquiryThreadViewProps {
  viewer: "client" | "specialist";
  thread: InquiryThreadPayload;
  sending?: boolean;
  error?: string | null;
  layout?: "card" | "page";
  onBack: () => void;
  onSend: (message: string) => void;
}

function formatBubbleTime(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
}

export function InquiryThreadView({
  viewer,
  thread,
  sending = false,
  error,
  layout = "card",
  onBack,
  onSend,
}: InquiryThreadViewProps) {
  const titleId = useId();
  const scrollerRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [draft, setDraft] = useState("");
  const [keyboardInset, setKeyboardInset] = useState(0);

  const counterpartName =
    viewer === "client" ? thread.specialistName : thread.clientFirstName;
  const counterpartAvatar =
    viewer === "client" ? thread.specialistAvatarUrl : thread.clientAvatarUrl;

  useEffect(() => {
    const node = scrollerRef.current;
    if (!node) return;
    node.scrollTop = node.scrollHeight;
  }, [thread.messages.length, sending]);

  useEffect(() => {
    function syncKeyboardInset() {
      const viewport = window.visualViewport;
      if (!viewport) {
        setKeyboardInset(0);
        return;
      }
      const inset = Math.max(
        0,
        window.innerHeight - viewport.height - viewport.offsetTop
      );
      setKeyboardInset(inset > 80 ? inset : 0);
    }

    syncKeyboardInset();
    window.visualViewport?.addEventListener("resize", syncKeyboardInset);
    window.visualViewport?.addEventListener("scroll", syncKeyboardInset);
    return () => {
      window.visualViewport?.removeEventListener("resize", syncKeyboardInset);
      window.visualViewport?.removeEventListener("scroll", syncKeyboardInset);
    };
  }, []);

  function resizeTextarea() {
    const node = textareaRef.current;
    if (!node) return;
    node.style.height = "auto";
    node.style.height = `${Math.min(node.scrollHeight, 120)}px`;
  }

  function submitDraft() {
    const next = draft.trim();
    if (!next || sending || !thread.canReply) return;
    onSend(next);
    setDraft("");
    requestAnimationFrame(() => {
      if (textareaRef.current) {
        textareaRef.current.style.height = "auto";
      }
    });
  }

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    submitDraft();
  }

  function handleKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === "Enter" && (event.metaKey || event.ctrlKey)) {
      event.preventDefault();
      submitDraft();
    }
  }

  const topicLine = thread.topicLabels.join(" · ");

  return (
    <div
      className={cn(
        "inquiry-thread",
        layout === "page" && "inquiry-thread--page"
      )}
      aria-labelledby={titleId}
      style={
        keyboardInset > 0
          ? { paddingBottom: keyboardInset }
          : undefined
      }
    >
      <header className="inquiry-thread__header">
        <button
          type="button"
          className="smoac-control inquiry-thread__back"
          onClick={onBack}
          aria-label="Back to conversations"
        >
          <ChevronLeftIcon className="h-5 w-5" />
        </button>
        <InquiryAvatar
          name={counterpartName}
          src={counterpartAvatar}
          size="sm"
        />
        <div className="inquiry-thread__identity">
          <h3 id={titleId} className="inquiry-thread__name">
            {counterpartName}
          </h3>
          {thread.actionLabel || topicLine ? (
            <p className="inquiry-thread__meta">
              {[thread.actionLabel, topicLine].filter(Boolean).join(" · ")}
            </p>
          ) : null}
        </div>
      </header>

      <div className="inquiry-thread__scroller" ref={scrollerRef}>
        {thread.messages.length === 0 ? (
          <p className="inquiry-thread__empty">No messages yet.</p>
        ) : (
          <ol className="inquiry-thread__messages">
            {thread.messages.map((message) => {
              const mine = message.senderRole === viewer;
              return (
                <li
                  key={message.id}
                  className={cn(
                    "inquiry-thread__row",
                    mine
                      ? "inquiry-thread__row--mine"
                      : "inquiry-thread__row--theirs"
                  )}
                >
                  {mine ? null : (
                    <InquiryAvatar
                      name={counterpartName}
                      src={counterpartAvatar}
                      size="sm"
                    />
                  )}
                  <div className="inquiry-thread__bubble-wrap">
                    <p
                      className={cn(
                        "inquiry-thread__bubble",
                        mine
                          ? "inquiry-thread__bubble--mine"
                          : "inquiry-thread__bubble--theirs"
                      )}
                    >
                      {message.body}
                    </p>
                    <time
                      className="inquiry-thread__time"
                      dateTime={message.createdAt}
                    >
                      {formatBubbleTime(message.createdAt)}
                    </time>
                  </div>
                </li>
              );
            })}
          </ol>
        )}
      </div>

      {thread.canReply ? (
        <form className="inquiry-thread__composer" onSubmit={handleSubmit}>
          {error ? <p className="inquiry-thread__error">{error}</p> : null}
          <div className="inquiry-thread__composer-row">
            <textarea
              ref={textareaRef}
              className="inquiry-thread__input"
              rows={1}
              value={draft}
              maxLength={INQUIRY_MESSAGE_MAX_LENGTH}
              placeholder="Message"
              aria-label="Message"
              disabled={sending}
              onChange={(event) => {
                setDraft(event.target.value);
                resizeTextarea();
              }}
              onKeyDown={handleKeyDown}
            />
            <button
              type="submit"
              className="smoac-control inquiry-thread__send"
              disabled={sending || !draft.trim()}
              aria-label="Send"
            >
              <SendIcon className="h-4 w-4" />
            </button>
          </div>
        </form>
      ) : (
        <p className="inquiry-thread__readonly">Demo conversation — replies send on live accounts.</p>
      )}
    </div>
  );
}
