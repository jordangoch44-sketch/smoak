"use client";

import { useEffect } from "react";
import Link from "next/link";

export default function SiteError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[SMOAC site error]", error);
  }, [error]);

  return (
    <main
      style={{
        minHeight: "60vh",
        display: "grid",
        placeItems: "center",
        padding: "2rem 1.25rem",
        textAlign: "center",
        color: "#f5f5f7",
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
          This page hit an unexpected error. You can try again or head home.
        </p>
        <div
          style={{
            display: "flex",
            gap: "0.75rem",
            justifyContent: "center",
            flexWrap: "wrap",
          }}
        >
          <button
            type="button"
            onClick={() => reset()}
            style={{
              border: "1px solid rgba(245,245,247,0.35)",
              background: "transparent",
              color: "#f5f5f7",
              padding: "0.65rem 1.1rem",
              borderRadius: 999,
              cursor: "pointer",
            }}
          >
            Try again
          </button>
          <Link
            href="/"
            style={{
              border: "1px solid rgba(245,245,247,0.35)",
              background: "rgba(245,245,247,0.08)",
              color: "#f5f5f7",
              padding: "0.65rem 1.1rem",
              borderRadius: 999,
              textDecoration: "none",
            }}
          >
            Go home
          </Link>
        </div>
      </div>
    </main>
  );
}
