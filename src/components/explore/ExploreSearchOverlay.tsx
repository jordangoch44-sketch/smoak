"use client";

import {
  useEffect,
  useId,
  useState,
  useSyncExternalStore,
  type ReactNode,
} from "react";
import { createPortal } from "react-dom";
import { LocationMarkIcon } from "@/components/ui/icons";
import {
  EXPLORE_RECENT_SEARCH_OVERLAY_LIMIT,
  EXPLORE_SEARCH_GOAL_PROMPTS,
  EXPLORE_SEARCH_SPECIALIST_PROMPTS,
} from "@/lib/explore-search-prompts";
import {
  getRecentSearchesServerSnapshot,
  getRecentSearchesSnapshot,
  subscribeRecentSearches,
} from "@/lib/recent-searches-store";
import { completeGeolocationAsync } from "@/lib/user-location-store";

interface ExploreSearchOverlayProps {
  open: boolean;
  /** Bottom edge of the in-place search row (viewport px) — prompts start below this */
  contentTop: number;
  onClose: () => void;
  onSubmit: (query: string) => void;
  showLocationPrompt: boolean;
}

/**
 * Nebula fill + prompts under the existing Search bar (bar stays in place).
 */
export function ExploreSearchOverlay({
  open,
  contentTop,
  onClose,
  onSubmit,
  showLocationPrompt,
}: ExploreSearchOverlayProps) {
  const titleId = useId();
  const [portalReady, setPortalReady] = useState(false);
  const [geoLoading, setGeoLoading] = useState(false);
  const [geoError, setGeoError] = useState<string | null>(null);

  const recent = useSyncExternalStore(
    subscribeRecentSearches,
    getRecentSearchesSnapshot,
    getRecentSearchesServerSnapshot
  ).slice(0, EXPLORE_RECENT_SEARCH_OVERLAY_LIMIT);

  useEffect(() => {
    setPortalReady(true);
  }, []);

  useEffect(() => {
    if (!open) return;
    document.body.classList.add("explore-search-open");
    return () => {
      document.body.classList.remove("explore-search-open");
    };
  }, [open]);

  useEffect(() => {
    if (!open) {
      setGeoError(null);
      setGeoLoading(false);
    }
  }, [open]);

  useEffect(() => {
    if (!open) return;
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        event.preventDefault();
        onClose();
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, onClose]);

  function handlePrompt(query: string) {
    onSubmit(query);
  }

  function handleUseCurrentLocation() {
    setGeoError(null);

    if (typeof navigator === "undefined" || !navigator.geolocation) {
      setGeoError("Location is unavailable on this device.");
      return;
    }

    setGeoLoading(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        void (async () => {
          try {
            const result = await completeGeolocationAsync(
              position.coords.latitude,
              position.coords.longitude
            );
            if (!result.ok) {
              setGeoError(result.message);
              return;
            }
            onClose();
          } catch {
            setGeoError("Couldn’t finish locating you. Try again.");
          } finally {
            setGeoLoading(false);
          }
        })();
      },
      (error) => {
        setGeoLoading(false);
        if (error.code === error.PERMISSION_DENIED) {
          setGeoError(
            "Location access was denied. Allow location in your browser settings, or set it from the header."
          );
          return;
        }
        if (error.code === error.TIMEOUT) {
          setGeoError("Location timed out. Try again.");
          return;
        }
        setGeoError("Couldn’t read your location. Try again.");
      },
      {
        enableHighAccuracy: true,
        timeout: 20_000,
        maximumAge: 0,
      }
    );
  }

  if (!portalReady || !open) return null;

  const top = Math.max(0, contentTop);

  return createPortal(
    <div
      className="explore-search-overlay"
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
    >
      <button
        type="button"
        className="explore-search-overlay__backdrop"
        aria-label="Dismiss search"
        onClick={onClose}
      />

      <div
        id="explore-search-overlay-panel"
        className="explore-search-overlay__panel"
        style={{ top: `${top}px` }}
      >
        <div className="explore-search-overlay__body">
          <h2 id={titleId} className="sr-only">
            Search specialists
          </h2>

          {showLocationPrompt ? (
            <div className="explore-search-overlay__location">
              <button
                type="button"
                className="smoac-control explore-search-overlay__location-btn"
                onClick={handleUseCurrentLocation}
                disabled={geoLoading}
              >
                <span
                  className="explore-search-overlay__location-icon"
                  aria-hidden
                >
                  <LocationMarkIcon className="h-4 w-4" />
                </span>
                <span className="explore-search-overlay__location-copy">
                  <span className="explore-search-overlay__location-label">
                    {geoLoading
                      ? "Finding your location…"
                      : "Use your current location"}
                  </span>
                  <span className="explore-search-overlay__location-hint">
                    Show specialists near you
                  </span>
                </span>
              </button>
              {geoError ? (
                <p
                  className="explore-search-overlay__location-error"
                  role="status"
                >
                  {geoError}
                </p>
              ) : null}
            </div>
          ) : null}

          {recent.length > 0 ? (
            <PromptRow title="Recent">
              {recent.map((entry) => (
                <button
                  key={entry.id}
                  type="button"
                  className="smoac-control explore-search-overlay__chip"
                  onClick={() => handlePrompt(entry.query)}
                >
                  {entry.query}
                </button>
              ))}
            </PromptRow>
          ) : null}

          <PromptRow title="Specialists">
            {EXPLORE_SEARCH_SPECIALIST_PROMPTS.map((prompt) => (
              <button
                key={prompt.id}
                type="button"
                className="smoac-control explore-search-overlay__chip"
                onClick={() => handlePrompt(prompt.searchQuery)}
              >
                {prompt.label}
              </button>
            ))}
          </PromptRow>

          <PromptRow title="Goals">
            {EXPLORE_SEARCH_GOAL_PROMPTS.map((prompt) => (
              <button
                key={prompt.id}
                type="button"
                className="smoac-control explore-search-overlay__chip explore-search-overlay__chip--goal"
                onClick={() => handlePrompt(prompt.searchQuery)}
              >
                {prompt.label}
              </button>
            ))}
          </PromptRow>
        </div>
      </div>
    </div>,
    document.body
  );
}

function PromptRow({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <section className="explore-search-overlay__section" aria-label={title}>
      <h3 className="explore-search-overlay__section-title">{title}</h3>
      <div className="explore-search-overlay__chips">{children}</div>
    </section>
  );
}
