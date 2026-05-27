/* eslint-disable react-hooks/set-state-in-effect, @next/next/no-html-link-for-pages -- isolated LAN/hydration diagnostic page */
"use client";

import { useCallback, useEffect, useState } from "react";
import type { CSSProperties } from "react";

type TapLog = {
  id: number;
  at: string;
  label: string;
};

export default function TapTestPage() {
  const [count, setCount] = useState(0);
  const [hydrated, setHydrated] = useState(false);
  const [swStatus, setSwStatus] = useState("checking…");
  const [errorLog, setErrorLog] = useState<string[]>([]);
  const [tapLogs, setTapLogs] = useState<TapLog[]>([]);
  const [lastTap, setLastTap] = useState("No taps yet");

  const logTap = useCallback((label: string) => {
    const at = new Date().toLocaleTimeString();
    setCount((c) => c + 1);
    setLastTap(`${label} @ ${at}`);
    setTapLogs((logs) => [
      { id: logs.length + 1, at, label },
      ...logs.slice(0, 14),
    ]);
  }, []);

  useEffect(() => {
    setHydrated(true);

    if (!("serviceWorker" in navigator)) {
      setSwStatus("No service worker API");
      return;
    }

    navigator.serviceWorker.getRegistrations().then((regs) => {
      if (regs.length === 0) {
        setSwStatus("No service workers registered");
        return;
      }
      Promise.all(regs.map((r) => r.unregister())).then(() => {
        setSwStatus(`Unregistered ${regs.length} service worker(s) for this test session`);
      });
    });
  }, []);

  useEffect(() => {
    function onError(message: string) {
      setErrorLog((e) => [message, ...e.slice(0, 9)]);
    }

    const onWindowError = (event: ErrorEvent) => {
      onError(`error: ${event.message}`);
    };
    const onRejection = (event: PromiseRejectionEvent) => {
      const reason =
        event.reason instanceof Error
          ? event.reason.message
          : String(event.reason);
      onError(`unhandledrejection: ${reason}`);
    };

    window.addEventListener("error", onWindowError);
    window.addEventListener("unhandledrejection", onRejection);
    return () => {
      window.removeEventListener("error", onWindowError);
      window.removeEventListener("unhandledrejection", onRejection);
    };
  }, []);

  return (
    <main
      style={{
        fontFamily:
          '-apple-system, BlinkMacSystemFont, "Segoe UI", Helvetica, Arial, sans-serif',
        padding: "20px",
        maxWidth: "480px",
        margin: "0 auto",
        color: "#111",
        background: "#f5f5f5",
        minHeight: "100dvh",
      }}
    >
      <h1 style={{ fontSize: "22px", margin: "0 0 8px" }}>iPhone tap test</h1>
      <p style={{ margin: "0 0 16px", fontSize: "14px", lineHeight: 1.5 }}>
        Plain React buttons only. No app layout, globals.css, toast, motion, or
        glass. Results appear as text below.
      </p>

      <p
        id="boot-inline"
        style={{
          margin: "0 0 8px",
          padding: "10px",
          background: "#e8e8e8",
          border: "1px solid #999",
          borderRadius: "6px",
          fontSize: "14px",
        }}
      >
        <strong>Inline script:</strong> waiting…
      </p>

      <p
        id="chunk-probe"
        style={{
          margin: "0 0 8px",
          padding: "10px",
          background: "#e8e8e8",
          border: "1px solid #999",
          borderRadius: "6px",
          fontSize: "12px",
          whiteSpace: "pre-wrap",
          wordBreak: "break-word",
        }}
      >
        <strong>Chunk load:</strong> probing…
      </p>

      <p
        style={{
          margin: "0 0 12px",
          padding: "10px",
          background: hydrated ? "#d4edda" : "#fff3cd",
          border: `1px solid ${hydrated ? "#28a745" : "#ffc107"}`,
          borderRadius: "6px",
          fontSize: "14px",
        }}
      >
        <strong>React hydration:</strong>{" "}
        {hydrated ? "YES — client JS is running" : "NO — still server HTML"}
      </p>

      <p style={{ margin: "0 0 12px", fontSize: "13px", color: "#444" }}>
        <strong>Service worker:</strong> {swStatus}
      </p>

      <p
        style={{
          margin: "0 0 16px",
          fontSize: "28px",
          fontWeight: 700,
        }}
      >
        Tap count: {count}
      </p>

      <p
        style={{
          margin: "0 0 20px",
          padding: "12px",
          background: "#fff",
          border: "2px solid #007aff",
          borderRadius: "8px",
          fontSize: "16px",
        }}
      >
        <strong>Last tap:</strong> {lastTap}
      </p>

      <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
        <button
          type="button"
          onClick={() => {
            setCount(count + 1);
            const at = new Date().toLocaleTimeString();
            setLastTap(`Tap Test @ ${at}`);
            setTapLogs((logs) => [
              { id: logs.length + 1, at, label: "Tap Test" },
              ...logs.slice(0, 14),
            ]);
          }}
          style={{
            minHeight: "48px",
            fontSize: "18px",
            fontWeight: 600,
            border: "none",
            borderRadius: "8px",
            background: "#007aff",
            color: "#fff",
            cursor: "pointer",
          }}
        >
          Tap Test
        </button>

        <button
          type="button"
          onClick={() => logTap("Button A")}
          style={buttonStyle("#34c759")}
        >
          Button A
        </button>

        <button
          type="button"
          onClick={() => logTap("Button B")}
          style={buttonStyle("#ff9500")}
        >
          Button B
        </button>

        <a
          href="/"
          onClick={() => logTap("Link to home")}
          style={{
            display: "block",
            minHeight: "44px",
            lineHeight: "44px",
            textAlign: "center",
            color: "#007aff",
            fontSize: "16px",
          }}
        >
          Link → homepage
        </a>
      </div>

      <h2 style={{ fontSize: "16px", margin: "24px 0 8px" }}>Tap log</h2>
      <ul style={{ margin: 0, paddingLeft: "20px", fontSize: "14px" }}>
        {tapLogs.length === 0 ? (
          <li>No events logged yet</li>
        ) : (
          tapLogs.map((entry) => (
            <li key={entry.id}>
              #{entry.id} {entry.label} ({entry.at})
            </li>
          ))
        )}
      </ul>

      <h2 style={{ fontSize: "16px", margin: "24px 0 8px" }}>JS errors</h2>
      <pre
        style={{
          margin: 0,
          padding: "10px",
          background: "#fff",
          border: "1px solid #ccc",
          borderRadius: "6px",
          fontSize: "12px",
          whiteSpace: "pre-wrap",
          wordBreak: "break-word",
        }}
      >
        {errorLog.length === 0 ? "None captured on this page" : errorLog.join("\n")}
      </pre>

      <p style={{ marginTop: "24px", fontSize: "12px", color: "#666" }}>
        If Inline script = YES but React hydration = NO, Next.js blocked /_next
        chunks (403). Restart with npm run dev:lan after next.config
        allowedDevOrigins. Open http://&lt;mac-lan-ip&gt;:3000/tap-test — not
        localhost on the phone.
      </p>
    </main>
  );
}

function buttonStyle(bg: string): CSSProperties {
  return {
    minHeight: "48px",
    fontSize: "17px",
    fontWeight: 600,
    border: "none",
    borderRadius: "8px",
    background: bg,
    color: "#fff",
    cursor: "pointer",
  };
}
