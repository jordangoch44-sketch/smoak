"use client";

import { useEffect, useId, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useBlockingModalOpen } from "@/hooks/useBlockingModalOpen";
import type { AdminPlatformPulse } from "@/types/admin-platform-pulse";
import type { CopilotMessage, CopilotEngineSource, AdminAiCopilotResponse } from "@/types/admin-ai-copilot";
import { cn } from "@/lib/utils";

interface AdminAiCopilotModalProps {
  open: boolean;
  onClose: () => void;
  pulse: AdminPlatformPulse | null;
  initialPrompt?: string;
}

const STARTER_PROMPTS = [
  {
    label: "Why are visitors dropping off before inquiring?",
    category: "Conversion",
  },
  {
    label: "How can I scale specialist signups?",
    category: "Growth",
  },
  {
    label: "What is the current monthly revenue breakdown?",
    category: "Monetization",
  },
  {
    label: "Where is visitor traffic coming from?",
    category: "Audience",
  },
  {
    label: "Who are the highest-converting specialists?",
    category: "Roster",
  },
  {
    label: "What operational tasks should be prioritized?",
    category: "Operations",
  },
] as const;

function MarkdownText({ content }: { content: string }) {
  const lines = content.split("\n");
  const elements: React.ReactNode[] = [];

  let inList = false;
  let listItems: React.ReactNode[] = [];

  function flushList() {
    if (inList && listItems.length > 0) {
      elements.push(
        <ul key={`list-${elements.length}`} className="admin-copilot-msg__list">
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
        return <strong key={i} className="admin-copilot-msg__bold">{part.slice(2, -2)}</strong>;
      }
      if (part.startsWith("*") && part.endsWith("*") && part.length > 2) {
        return <em key={i} className="admin-copilot-msg__italic">{part.slice(1, -1)}</em>;
      }
      if (part.startsWith("`") && part.endsWith("`")) {
        return <code key={i} className="admin-copilot-msg__code">{part.slice(1, -1)}</code>;
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
        <h4 key={`h3-${index}`} className="admin-copilot-msg__h3">
          {formatInline(trimmed.slice(4))}
        </h4>
      );
      return;
    }

    if (trimmed.startsWith("#### ")) {
      flushList();
      elements.push(
        <h5 key={`h4-${index}`} className="admin-copilot-msg__h4">
          {formatInline(trimmed.slice(5))}
        </h5>
      );
      return;
    }

    if (trimmed.startsWith("- ") || trimmed.startsWith("* ")) {
      inList = true;
      listItems.push(
        <li key={`li-${index}`} className="admin-copilot-msg__list-item">
          {formatInline(trimmed.slice(2))}
        </li>
      );
      return;
    }

    const numberedMatch = trimmed.match(/^(\d+)\.\s+(.*)$/);
    if (numberedMatch) {
      flushList();
      elements.push(
        <div key={`num-${index}`} className="admin-copilot-msg__numbered-item">
          <span className="admin-copilot-msg__num-badge">{numberedMatch[1]}</span>
          <div className="admin-copilot-msg__num-content">
            {formatInline(numberedMatch[2])}
          </div>
        </div>
      );
      return;
    }

    flushList();
    elements.push(
      <p key={`p-${index}`} className="admin-copilot-msg__p">
        {formatInline(trimmed)}
      </p>
    );
  });

  flushList();

  return <div className="admin-copilot-msg__content">{elements}</div>;
}

export function AdminAiCopilotModal({
  open,
  onClose,
  pulse,
  initialPrompt,
}: AdminAiCopilotModalProps) {
  useBlockingModalOpen(open);
  const titleId = useId();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const [messages, setMessages] = useState<CopilotMessage[]>(() => [
    {
      id: "welcome-1",
      role: "assistant",
      content: `I am Jarvis, your executive operating assistant with live access to platform telemetry, specialist conversions, traffic channels, and Stripe billing.\n\nAsk any question regarding performance, conversions, or growth strategy.`,
      timestamp: "Just now",
      source: "telemetry_engine",
      suggestedFollowUps: [
        "Why are visitors dropping off before inquiring?",
        "How can I scale specialist signups?",
        "What is the current monthly revenue breakdown?",
      ],
    },
  ]);

  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [activeEngine, setActiveEngine] = useState<CopilotEngineSource>("telemetry_engine");
  const [copiedId, setCopiedId] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    const timer = window.setTimeout(() => {
      inputRef.current?.focus();
      if (initialPrompt) {
        void handleSendMessage(initialPrompt);
      }
    }, 150);
    return () => window.clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, initialPrompt]);

  useEffect(() => {
    if (!open) return;
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, onClose]);

  useEffect(() => {
    if (!open) return;
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading, open]);

  async function handleSendMessage(promptText: string) {
    const text = promptText.trim();
    if (!text || loading) return;

    const userMsg: CopilotMessage = {
      id: `user-${Date.now()}`,
      role: "user",
      content: text,
      timestamp: new Date().toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" }),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setLoading(true);

    try {
      const history = messages
        .filter((m) => m.role === "user" || m.role === "assistant")
        .slice(-4)
        .map((m) => ({ role: m.role as "user" | "assistant", content: m.content }));

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
        setActiveEngine(data.source);
        const assistantMsg: CopilotMessage = {
          id: `ai-${Date.now()}`,
          role: "assistant",
          content: data.reply,
          timestamp: new Date().toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" }),
          source: data.source,
          model: data.model,
          suggestedFollowUps: data.suggestedFollowUps,
        };
        setMessages((prev) => [...prev, assistantMsg]);
      } else {
        const errorMsg: CopilotMessage = {
          id: `ai-err-${Date.now()}`,
          role: "assistant",
          content: data.reply || data.error || "Unable to retrieve analysis. Please try again.",
          timestamp: "Just now",
          source: "telemetry_engine",
        };
        setMessages((prev) => [...prev, errorMsg]);
      }
    } catch {
      const errorMsg: CopilotMessage = {
        id: `ai-err-${Date.now()}`,
        role: "assistant",
        content: "A network error occurred while communicating with telemetry. Please check connection.",
        timestamp: "Just now",
        source: "telemetry_engine",
      };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setLoading(false);
      window.setTimeout(() => inputRef.current?.focus(), 100);
    }
  }

  function handleCopy(id: string, text: string) {
    if (typeof navigator !== "undefined" && navigator.clipboard) {
      void navigator.clipboard.writeText(text);
      setCopiedId(id);
      window.setTimeout(() => setCopiedId(null), 2000);
    }
  }

  function handleClearChat() {
    setMessages([
      {
        id: "welcome-reset",
        role: "assistant",
        content: "Conversation cleared. What would you like to analyze?",
        timestamp: "Just now",
        source: activeEngine,
        suggestedFollowUps: [
          "Why are visitors dropping off before inquiring?",
          "How can I scale specialist signups?",
          "Where is visitor traffic coming from?",
        ],
      },
    ]);
  }

  if (!open || typeof document === "undefined") return null;

  const modalContent = (
    <div
      className="admin-copilot-modal"
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
    >
      <button
        type="button"
        className="admin-copilot-modal__backdrop"
        aria-label="Close Jarvis modal"
        onClick={onClose}
      />

      <div className="admin-copilot-modal__panel">
        <header className="admin-copilot-modal__header">
          <div className="admin-copilot-modal__brand">
            <div>
              <h3 id={titleId} className="admin-copilot-modal__title">
                Jarvis
              </h3>
              <p className="admin-copilot-modal__subtitle">
                Executive intelligence grounded in live platform telemetry
              </p>
            </div>
          </div>

          <div className="admin-copilot-modal__header-actions">
            <button
              type="button"
              className="admin-copilot-modal__btn-subtle"
              onClick={handleClearChat}
              title="Clear conversation"
            >
              Clear
            </button>
            <button
              type="button"
              className="admin-copilot-modal__close-btn"
              onClick={onClose}
              aria-label="Close Jarvis"
            >
              ✕
            </button>
          </div>
        </header>

        {/* Chat Feed */}
        <div className="admin-copilot-modal__feed">
          {/* Starter Topics */}
          {messages.length <= 1 ? (
            <div className="admin-copilot-modal__quick-prompts">
              <div className="admin-copilot-modal__quick-grid">
                {STARTER_PROMPTS.map((item, idx) => (
                  <button
                    key={idx}
                    type="button"
                    className="admin-copilot-modal__quick-card"
                    onClick={() => handleSendMessage(item.label)}
                    disabled={loading}
                  >
                    <span className="admin-copilot-modal__quick-label">{item.label}</span>
                  </button>
                ))}
              </div>
            </div>
          ) : null}

          {/* Messages */}
          <div className="admin-copilot-modal__messages">
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={cn(
                  "admin-copilot-msg",
                  msg.role === "user" ? "admin-copilot-msg--user" : "admin-copilot-msg--ai"
                )}
              >
                <div className="admin-copilot-msg__bubble">
                  <div className="admin-copilot-msg__header">
                    <span className="admin-copilot-msg__author">
                      {msg.role === "user" ? "You" : "Jarvis"}
                    </span>
                    <span className="admin-copilot-msg__time">{msg.timestamp}</span>
                    {msg.role === "assistant" ? (
                      <button
                        type="button"
                        className="admin-copilot-msg__copy-btn"
                        onClick={() => handleCopy(msg.id, msg.content)}
                        title="Copy answer"
                      >
                        {copiedId === msg.id ? "Copied" : "Copy"}
                      </button>
                    ) : null}
                  </div>

                  <MarkdownText content={msg.content} />

                  {/* Follow-up Chips */}
                  {msg.suggestedFollowUps && msg.suggestedFollowUps.length > 0 ? (
                    <div className="admin-copilot-msg__followups">
                      <div className="admin-copilot-msg__chips">
                        {msg.suggestedFollowUps.map((chip, chipIdx) => (
                          <button
                            key={chipIdx}
                            type="button"
                            className="admin-copilot-msg__chip"
                            onClick={() => handleSendMessage(chip)}
                            disabled={loading}
                          >
                            {chip}
                          </button>
                        ))}
                      </div>
                    </div>
                  ) : null}
                </div>
              </div>
            ))}

            {loading ? (
              <div className="admin-copilot-msg admin-copilot-msg--ai admin-copilot-msg--thinking">
                <div className="admin-copilot-msg__bubble">
                  <div className="admin-copilot-msg__thinking-dots">
                    <span className="admin-copilot-msg__dot" />
                    <span className="admin-copilot-msg__dot" />
                    <span className="admin-copilot-msg__dot" />
                  </div>
                </div>
              </div>
            ) : null}
            <div ref={messagesEndRef} />
          </div>
        </div>

        {/* Input Bar */}
        <footer className="admin-copilot-modal__footer">
          <form
            className="admin-copilot-modal__input-form"
            onSubmit={(e) => {
              e.preventDefault();
              void handleSendMessage(input);
            }}
          >
            <input
              ref={inputRef}
              type="text"
              className="admin-copilot-modal__input"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask Jarvis anything about conversions, revenue, traffic, or specialists…"
              disabled={loading}
            />
            <button
              type="submit"
              className="admin-copilot-modal__send-btn"
              disabled={!input.trim() || loading}
            >
              {loading ? (
                <span className="admin-copilot-modal__spinner" />
              ) : (
                <span>Send</span>
              )}
            </button>
          </form>
        </footer>
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
}
