"use client";

import { useEffect, useId, useRef, useState } from "react";
import type { AdminPlatformPulse } from "@/types/admin-platform-pulse";
import type {
  CopilotMessage,
  AdminAiCopilotResponse,
} from "@/types/admin-ai-copilot";
import { cn } from "@/lib/utils";

interface AdminJarvisHeaderProps {
  adminName?: string;
  pulse: AdminPlatformPulse | null;
  isPulseLoading?: boolean;
  onNavigateSection?: (sectionId: string) => void;
  onRefreshPulse?: () => void;
}

const STARTER_PROMPTS = [
  {
    label: "Pending applications",
    prompt: "What pending specialist applications do we have waiting for review?",
  },
  {
    label: "Traffic channels",
    prompt: "Where is our visitor traffic coming from and what devices are they using?",
  },
  {
    label: "Conversion drop-off",
    prompt: "Why are visitors dropping off before completing an inquiry, and how can we fix it?",
  },
  {
    label: "Revenue breakdown",
    prompt: "What is our current monthly revenue breakdown and subscription health?",
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

export function AdminJarvisHeader({
  pulse,
}: AdminJarvisHeaderProps) {
  const [messages, setMessages] = useState<CopilotMessage[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const inputRef = useRef<HTMLInputElement>(null);
  const streamEndRef = useRef<HTMLDivElement>(null);
  const inputId = useId();

  useEffect(() => {
    if (messages.length > 0) {
      streamEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, loading]);

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
          content: data.reply || data.error || "Unable to retrieve telemetry response. Please try again.",
          timestamp: "Just now",
          source: "telemetry_engine",
        };
        setMessages((prev) => [...prev, errorMsg]);
      }
    } catch {
      const errorMsg: CopilotMessage = {
        id: `jarvis-err-${Date.now()}`,
        role: "assistant",
        content: "A connection issue occurred while reaching telemetry. Please try again.",
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

  return (
    <section className="jarvis-header-minimal" aria-label="Jarvis Assistant">
      {/* Top Row: Crisp Title & Optional Clear */}
      <div className="jarvis-header-minimal__top">
        <h2 className="jarvis-header-minimal__title">Jarvis</h2>
        {messages.length > 0 ? (
          <button
            type="button"
            className="jarvis-header-minimal__clear-btn"
            onClick={handleResetChat}
            title="Clear conversation"
          >
            Clear
          </button>
        ) : null}
      </div>

      {/* Sleek Minimal Input Box */}
      <div className="jarvis-header-minimal__input-wrapper">
        <form
          className="jarvis-header-minimal__form"
          onSubmit={(e) => {
            e.preventDefault();
            void handleSendMessage(input);
          }}
        >
          <label htmlFor={inputId} className="sr-only">
            Ask Jarvis
          </label>
          <input
            id={inputId}
            ref={inputRef}
            type="text"
            className="jarvis-header-minimal__input"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask Jarvis anything about conversions, revenue, traffic, or specialists…"
            disabled={loading}
            autoComplete="off"
          />

          <button
            type="submit"
            className="jarvis-header-minimal__send-btn"
            disabled={!input.trim() || loading}
            aria-label="Send prompt to Jarvis"
          >
            {loading ? (
              <span className="jarvis-header-minimal__spinner" />
            ) : (
              <svg
                className="jarvis-header-minimal__send-icon"
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
      </div>

      {/* Minimal Starter Pills (when conversation is empty) */}
      {messages.length === 0 ? (
        <div className="jarvis-header-minimal__starters">
          {STARTER_PROMPTS.map((item, idx) => (
            <button
              key={idx}
              type="button"
              className="jarvis-starter-pill"
              onClick={() => handleSendMessage(item.prompt)}
              disabled={loading}
            >
              {item.label}
            </button>
          ))}
        </div>
      ) : null}

      {/* Lightweight Disappearing / Compact Conversation Stream */}
      {messages.length > 0 || loading ? (
        <div className="jarvis-header-minimal__stream">
          {messages.map((msg, index) => {
            const isLatest = index === messages.length - 1;
            const isLatestAi = isLatest && msg.role === "assistant";
            const isPreviousTurn = index < messages.length - 2;

            return (
              <div
                key={msg.id}
                className={cn(
                  "jarvis-stream-turn",
                  msg.role === "user" ? "jarvis-stream-turn--user" : "jarvis-stream-turn--ai",
                  isPreviousTurn && "jarvis-stream-turn--muted"
                )}
              >
                {msg.role === "user" ? (
                  <div className="jarvis-stream-user-line">
                    <span className="jarvis-stream-user-label">You</span>
                    <p className="jarvis-stream-user-text">{msg.content}</p>
                  </div>
                ) : (
                  <div className="jarvis-stream-ai-card">
                    <div className="jarvis-stream-ai-header">
                      <span className="jarvis-stream-ai-name">Jarvis</span>
                      <div className="jarvis-stream-ai-actions">
                        <button
                          type="button"
                          className="jarvis-stream-ai-copy"
                          onClick={() => handleCopy(msg.id, msg.content)}
                          title="Copy response"
                        >
                          {copiedId === msg.id ? "Copied" : "Copy"}
                        </button>
                      </div>
                    </div>

                    <div className="jarvis-stream-ai-body">
                      <JarvisMarkdownText content={msg.content} />
                    </div>

                    {/* Follow-up suggestions for the latest reply */}
                    {isLatestAi && msg.suggestedFollowUps && msg.suggestedFollowUps.length > 0 ? (
                      <div className="jarvis-stream-followups">
                        {msg.suggestedFollowUps.map((chip, chipIdx) => (
                          <button
                            key={chipIdx}
                            type="button"
                            className="jarvis-followup-pill"
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
            <div className="jarvis-stream-turn jarvis-stream-turn--ai jarvis-stream-turn--loading">
              <div className="jarvis-stream-ai-card">
                <div className="jarvis-stream-ai-header">
                  <span className="jarvis-stream-ai-name">Jarvis</span>
                </div>
                <div className="jarvis-stream-thinking">
                  <span className="jarvis-thinking-dot" />
                  <span className="jarvis-thinking-dot" />
                  <span className="jarvis-thinking-dot" />
                </div>
              </div>
            </div>
          ) : null}

          <div ref={streamEndRef} />
        </div>
      ) : null}
    </section>
  );
}
