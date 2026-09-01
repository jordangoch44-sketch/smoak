"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import type { AdminPlatformPulse } from "@/types/admin-platform-pulse";
import type {
  CopilotMessage,
  AdminAiCopilotResponse,
} from "@/types/admin-ai-copilot";
import { cn } from "@/lib/utils";

interface AdminJarvisFloatingWidgetProps {
  pulse: AdminPlatformPulse | null;
  adminName?: string;
}

const STARTER_PROMPTS = [
  {
    label: "Pending applications",
    prompt: "What pending specialist applications do we have waiting for review?",
  },
  {
    label: "Monthly revenue",
    prompt: "What is our current monthly revenue breakdown and subscription health?",
  },
  {
    label: "Traffic sources",
    prompt: "Where is our visitor traffic coming from and what devices are they using?",
  },
  {
    label: "Conversion drop-off",
    prompt: "Why are visitors dropping off before completing an inquiry, and how can we fix it?",
  },
  {
    label: "Top specialists",
    prompt: "Who are our highest converting specialists and how are they performing?",
  },
  {
    label: "Growth strategy",
    prompt: "How can we scale client inquiries and drive more bookings for specialists?",
  },
] as const;

/**
 * Clean inline markdown parser for bullet points, bold text, and numbered items.
 */
function JarvisMarkdownText({ content }: { content: string }) {
  const lines = content.split("\n");
  const elements: React.ReactNode[] = [];

  let inList = false;
  let listItems: React.ReactNode[] = [];

  function flushList() {
    if (inList && listItems.length > 0) {
      elements.push(
        <ul key={`list-${elements.length}`} className="jarvis-clean-list">
          {listItems}
        </ul>
      );
      listItems = [];
      inList = false;
    }
  }

  function formatInline(text: string): React.ReactNode[] {
    const tokens = text.split(/(\*\*.*?\*\*|\*.*?\*|`.*?`)/g);
    return tokens.map((part, i) => {
      if (part.startsWith("**") && part.endsWith("**")) {
        return (
          <strong key={i} className="jarvis-clean-bold">
            {part.slice(2, -2)}
          </strong>
        );
      }
      if (part.startsWith("*") && part.endsWith("*") && part.length > 2) {
        return (
          <em key={i} className="jarvis-clean-italic">
            {part.slice(1, -1)}
          </em>
        );
      }
      if (part.startsWith("`") && part.endsWith("`")) {
        return (
          <code key={i} className="jarvis-clean-code">
            {part.slice(1, -1)}
          </code>
        );
      }
      return part;
    });
  }

  lines.forEach((line, index) => {
    const trimmed = line.trim();

    if (!trimmed) {
      flushList();
      return;
    }

    if (trimmed.startsWith("### ")) {
      flushList();
      elements.push(
        <h4 key={`h3-${index}`} className="jarvis-clean-h3">
          {formatInline(trimmed.slice(4))}
        </h4>
      );
      return;
    }

    if (trimmed.startsWith("#### ")) {
      flushList();
      elements.push(
        <h5 key={`h4-${index}`} className="jarvis-clean-h4">
          {formatInline(trimmed.slice(5))}
        </h5>
      );
      return;
    }

    if (trimmed.startsWith("- ") || trimmed.startsWith("* ")) {
      inList = true;
      listItems.push(
        <li key={`li-${index}`} className="jarvis-clean-list-item">
          {formatInline(trimmed.slice(2))}
        </li>
      );
      return;
    }

    const numberedMatch = trimmed.match(/^(\d+)\.\s+(.*)$/);
    if (numberedMatch) {
      flushList();
      elements.push(
        <div key={`num-${index}`} className="jarvis-clean-numbered-item">
          <span className="jarvis-clean-num-badge">{numberedMatch[1]}</span>
          <div className="jarvis-clean-num-text">
            {formatInline(numberedMatch[2])}
          </div>
        </div>
      );
      return;
    }

    flushList();
    elements.push(
      <p key={`p-${index}`} className="jarvis-clean-p">
        {formatInline(trimmed)}
      </p>
    );
  });

  flushList();

  return <div className="jarvis-clean-text-content">{elements}</div>;
}

export function AdminJarvisFloatingWidget({
  pulse,
}: AdminJarvisFloatingWidgetProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<CopilotMessage[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const inputRef = useRef<HTMLInputElement>(null);
  const streamEndRef = useRef<HTMLDivElement>(null);
  const widgetPanelRef = useRef<HTMLDivElement>(null);
  const inputId = useId();

  // Scroll stream on new messages or loading state changes
  useEffect(() => {
    if (isOpen) {
      streamEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, loading, isOpen]);

  // Focus input when opened
  useEffect(() => {
    if (isOpen) {
      const timer = window.setTimeout(() => {
        inputRef.current?.focus();
      }, 120);
      return () => window.clearTimeout(timer);
    }
  }, [isOpen]);

  // Escape key handler
  useEffect(() => {
    if (!isOpen) return;
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        setIsOpen(false);
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen]);

  async function handleSendMessage(promptText: string) {
    const text = promptText.trim();
    if (!text || loading) return;

    const userMsg: CopilotMessage = {
      id: `user-${Date.now()}`,
      role: "user",
      content: text,
      timestamp: new Date().toLocaleTimeString("en-US", {
        hour: "numeric",
        minute: "2-digit",
      }),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setLoading(true);

    try {
      const history = messages
        .filter((m) => m.role === "user" || m.role === "assistant")
        .slice(-6)
        .map((m) => ({
          role: m.role as "user" | "assistant",
          content: m.content,
        }));

      const res = await fetch("/api/admin/ai-copilot", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          prompt: text,
          context: pulse,
          conversationHistory: history,
        }),
      });

      const data = (await res.json()) as AdminAiCopilotResponse;

      if (data.ok && data.reply) {
        const assistantMsg: CopilotMessage = {
          id: `jarvis-${Date.now()}`,
          role: "assistant",
          content: data.reply,
          timestamp: new Date().toLocaleTimeString("en-US", {
            hour: "numeric",
            minute: "2-digit",
          }),
          source: data.source,
          model: data.model,
          suggestedFollowUps: data.suggestedFollowUps,
        };
        setMessages((prev) => [...prev, assistantMsg]);
      } else {
        const errorMsg: CopilotMessage = {
          id: `jarvis-err-${Date.now()}`,
          role: "assistant",
          content:
            data.reply ||
            data.error ||
            "Unable to retrieve telemetry response. Please try again.",
          timestamp: "Just now",
          source: "telemetry_engine",
        };
        setMessages((prev) => [...prev, errorMsg]);
      }
    } catch {
      const errorMsg: CopilotMessage = {
        id: `jarvis-err-${Date.now()}`,
        role: "assistant",
        content:
          "A connection issue occurred while reaching telemetry. Please try again.",
        timestamp: "Just now",
        source: "telemetry_engine",
      };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setLoading(false);
      window.setTimeout(() => inputRef.current?.focus(), 80);
    }
  }

  function handleCopy(id: string, text: string) {
    if (typeof navigator !== "undefined" && navigator.clipboard) {
      void navigator.clipboard.writeText(text);
      setCopiedId(id);
      window.setTimeout(() => setCopiedId(null), 2000);
    }
  }

  function handleResetChat() {
    setMessages([]);
    setInput("");
    inputRef.current?.focus();
  }

  const isClient = typeof document !== "undefined";

  const modalContent = isOpen ? (
    <div className="jarvis-floating-drawer-root" role="dialog" aria-modal="true">
      {/* Mobile Backdrop */}
      <button
        type="button"
        className="jarvis-floating-backdrop"
        onClick={() => setIsOpen(false)}
        aria-label="Close Jarvis assistant"
      />

      {/* Floating ChatGPT Window / Drawer */}
      <div
        ref={widgetPanelRef}
        className="jarvis-floating-panel"
        aria-labelledby="jarvis-floating-title"
      >
        {/* Header */}
        <header className="jarvis-floating-header">
          <div className="jarvis-floating-header__title-group">
            <div className="jarvis-floating-header__indicator">
              <span className="jarvis-floating-header__dot" />
            </div>
            <div>
              <h3 id="jarvis-floating-title" className="jarvis-floating-header__title">
                Jarvis
              </h3>
              <p className="jarvis-floating-header__status">Live Telemetry</p>
            </div>
          </div>

          <div className="jarvis-floating-header__actions">
            {messages.length > 0 ? (
              <button
                type="button"
                className="jarvis-floating-header__btn"
                onClick={handleResetChat}
                title="Clear conversation"
              >
                Clear
              </button>
            ) : null}
            <button
              type="button"
              className="jarvis-floating-header__close-btn"
              onClick={() => setIsOpen(false)}
              aria-label="Close Jarvis"
            >
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="jarvis-floating-header__close-icon"
              >
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="6" />
              </svg>
            </button>
          </div>
        </header>

        {/* Conversation Stream */}
        <div className="jarvis-floating-stream">
          {messages.length === 0 ? (
            <div className="jarvis-floating-welcome">
              <div className="jarvis-floating-welcome__badge">
                <span>Executive Assistant</span>
              </div>
              <p className="jarvis-floating-welcome__intro">
                Grounded in live SMOAC telemetry. Ask any question regarding
                platform performance, conversions, user stats, revenue, or operations.
              </p>

              <div className="jarvis-floating-starters">
                <span className="jarvis-floating-starters__label">Suggested questions</span>
                <div className="jarvis-floating-starters__grid">
                  {STARTER_PROMPTS.map((item, idx) => (
                    <button
                      key={idx}
                      type="button"
                      className="jarvis-floating-starter-chip"
                      onClick={() => handleSendMessage(item.prompt)}
                      disabled={loading}
                    >
                      {item.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          ) : null}

          {messages.map((msg, index) => {
            const isLatestAi =
              index === messages.length - 1 && msg.role === "assistant";

            return (
              <div
                key={msg.id}
                className={cn(
                  "jarvis-msg-row",
                  msg.role === "user"
                    ? "jarvis-msg-row--user"
                    : "jarvis-msg-row--ai"
                )}
              >
                {msg.role === "user" ? (
                  <div className="jarvis-msg-user-bubble">
                    <p className="jarvis-msg-user-text">{msg.content}</p>
                  </div>
                ) : (
                  <div className="jarvis-msg-ai-card">
                    <div className="jarvis-msg-ai-meta">
                      <span className="jarvis-msg-ai-author">Jarvis</span>
                      <button
                        type="button"
                        className="jarvis-msg-ai-copy-btn"
                        onClick={() => handleCopy(msg.id, msg.content)}
                        title="Copy answer"
                      >
                        {copiedId === msg.id ? "Copied" : "Copy"}
                      </button>
                    </div>

                    <div className="jarvis-msg-ai-body">
                      <JarvisMarkdownText content={msg.content} />
                    </div>

                    {/* Follow-up chips */}
                    {isLatestAi &&
                    msg.suggestedFollowUps &&
                    msg.suggestedFollowUps.length > 0 ? (
                      <div className="jarvis-msg-ai-followups">
                        {msg.suggestedFollowUps.map((chip, chipIdx) => (
                          <button
                            key={chipIdx}
                            type="button"
                            className="jarvis-floating-followup-pill"
                            onClick={() => handleSendMessage(chip)}
                            disabled={loading}
                          >
                            {chip}
                          </button>
                        ))}
                      </div>
                    ) : null}
                  </div>
                )}
              </div>
            );
          })}

          {loading ? (
            <div className="jarvis-msg-row jarvis-msg-row--ai">
              <div className="jarvis-msg-ai-card jarvis-msg-ai-card--loading">
                <div className="jarvis-msg-ai-meta">
                  <span className="jarvis-msg-ai-author">Jarvis</span>
                </div>
                <div className="jarvis-thinking-dots">
                  <span className="jarvis-thinking-dot" />
                  <span className="jarvis-thinking-dot" />
                  <span className="jarvis-thinking-dot" />
                </div>
              </div>
            </div>
          ) : null}

          <div ref={streamEndRef} />
        </div>

        {/* Input Footer */}
        <footer className="jarvis-floating-footer">
          <form
            className="jarvis-floating-form"
            onSubmit={(e) => {
              e.preventDefault();
              void handleSendMessage(input);
            }}
          >
            <label htmlFor={inputId} className="sr-only">
              Ask Jarvis anything about SMOAC...
            </label>
            <input
              id={inputId}
              ref={inputRef}
              type="text"
              className="jarvis-floating-input"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask Jarvis anything about SMOAC..."
              disabled={loading}
              autoComplete="off"
            />

            <button
              type="submit"
              className="jarvis-floating-send-btn"
              disabled={!input.trim() || loading}
              aria-label="Send message to Jarvis"
            >
              {loading ? (
                <span className="jarvis-floating-spinner" />
              ) : (
                <svg
                  className="jarvis-floating-send-icon"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                >
                  <line x1="12" y1="19" x2="12" y2="5" />
                  <polyline points="5 12 12 5 19 12" />
                </svg>
              )}
            </button>
          </form>
        </footer>
      </div>
    </div>
  ) : null;

  return (
    <>
      {/* Sleek Floating Right-Hand Corner Button */}
      <button
        type="button"
        className={cn(
          "jarvis-fab-trigger",
          isOpen && "jarvis-fab-trigger--active"
        )}
        onClick={() => setIsOpen((prev) => !prev)}
        aria-label={isOpen ? "Close Jarvis assistant" : "Open Jarvis assistant"}
        aria-expanded={isOpen}
      >
        <span className="jarvis-fab-label">Jarvis</span>
        <span className="jarvis-fab-pulse-dot" />
      </button>

      {/* Render Modal / Drawer into Portal */}
      {isClient && modalContent ? createPortal(modalContent, document.body) : null}
    </>
  );
}
