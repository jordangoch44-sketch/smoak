"use client";

import { useEffect } from "react";

/**
 * Last-resort UI when the root layout itself errors.
 * Must define its own <html> / <body>.
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[SMOAC global error]", error);
  }, [error]);

  return (
    <html lang="en">
      <body
        style={{
          margin: 0,
          minHeight: "100vh",
          display: "grid",
          placeItems: "center",
          background: "#020203",
          color: "#f5f5f7",
          fontFamily:
            "ui-sans-serif, system-ui, -apple-system, Segoe UI, sans-serif",
          padding: "2rem 1.25rem",
          textAlign: "center",
        }}
      >
        <div style={{ maxWidth: 28 * 16 }}>
          <p
            style={{
              margin: 0,
              letterSpacing: "0.28em",
              textTransform: "uppercase",
              fontSize: 12,
              opacity: 0.7,
            }}
          >
            SMOAC
          </p>
          <h1
            style={{
              margin: "0.75rem 0 0.5rem",
              fontSize: "1.75rem",
              fontWeight: 500,
            }}
          >
            Something went wrong
          </h1>
          <p style={{ margin: "0 0 1.5rem", opacity: 0.75, lineHeight: 1.5 }}>
            The app hit an unexpected error. Try again, or reload the page.
          </p>
          <button
            type="button"
            onClick={() => reset()}
            style={{
              border: "1px solid rgba(245,245,247,0.35)",
              background: "rgba(245,245,247,0.08)",
              color: "#f5f5f7",
              padding: "0.65rem 1.1rem",
              borderRadius: 999,
              cursor: "pointer",
            }}
          >
            Try again
          </button>
        </div>
      </body>
    </html>
  );
}
