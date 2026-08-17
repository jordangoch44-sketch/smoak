"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { SearchIcon } from "@/components/ui/icons";
import {
  ExploreSearchOverlay,
  type ExploreSearchOverlayAnchor,
} from "@/components/explore/ExploreSearchOverlay";
import { useAuthSession } from "@/hooks/useAuthSession";
import { usePrefersReducedMotion } from "@/hooks/usePrefersReducedMotion";
import { useUserLocation } from "@/hooks/useUserLocation";
import {
  HOME_SEARCH_PROMPTS,
  buildHomeSearchHref,
} from "@/lib/home-browse-categories";
import { hasClientSearchLocation } from "@/lib/explore-location-filters";
import { prepareNavScrollReset } from "@/lib/mobile-chrome";
import { SITE_ROUTES } from "@/lib/navigation";
import { cn } from "@/lib/utils";

/** Overlay styles live in explore.css — load them on Marketplace too */
import "@/styles/explore.css";

const ROTATE_MS = 3200;

/**
 * Marketplace feeder for Search: same overlay (recent / specialists / goals /
 * location) as Explore, then navigates to `/explore?q=…`.
 */
export function HomeSearchBar() {
  const router = useRouter();
  const reduceMotion = usePrefersReducedMotion();
  const { session } = useAuthSession();
  const { hasLocation, pillLabel, isPlaceholder } = useUserLocation();
  const locationReady =
    hasLocation || hasClientSearchLocation(session) || !isPlaceholder;

  const [draft, setDraft] = useState("");
  const [promptIndex, setPromptIndex] = useState(0);
  const [promptVisible, setPromptVisible] = useState(true);
  const [overlayOpen, setOverlayOpen] = useState(false);
  const [anchor, setAnchor] = useState<ExploreSearchOverlayAnchor | null>(null);
  const openFromUserRef = useRef(false);
  const searchRowRef = useRef<HTMLDivElement | null>(null);

  const trimmed = draft.trim();
  const showPrompt = trimmed.length === 0 && !overlayOpen;
  const prompt = HOME_SEARCH_PROMPTS[promptIndex] ?? HOME_SEARCH_PROMPTS[0];

  useEffect(() => {
    if (reduceMotion || !showPrompt) return;

    let fadeId = 0;
    const id = window.setInterval(() => {
      setPromptVisible(false);
      fadeId = window.setTimeout(() => {
        setPromptIndex((current) => (current + 1) % HOME_SEARCH_PROMPTS.length);
        setPromptVisible(true);
      }, 220);
    }, ROTATE_MS);

    return () => {
      window.clearInterval(id);
      window.clearTimeout(fadeId);
    };
  }, [reduceMotion, showPrompt]);

  function measureAnchor() {
    const el = searchRowRef.current;
    if (!el) return null;
    const rect = el.getBoundingClientRect();
    return {
      top: Math.max(0, rect.top),
      insetInline: Math.max(0, rect.left),
    };
  }

  function openOverlay() {
    const next = measureAnchor();
    if (next) setAnchor(next);
    setOverlayOpen(true);
  }

  function closeOverlay() {
    setOverlayOpen(false);
    setAnchor(null);
    openFromUserRef.current = false;
  }

  function goToSearch(value: string) {
    prepareNavScrollReset(SITE_ROUTES.explore);
    /* scroll:false — we own top reset; Next’s default scroll races iOS restore */
    router.push(buildHomeSearchHref(value), { scroll: false });
  }

  function handleSubmitFromOverlay(query: string) {
    setDraft(query);
    setOverlayOpen(false);
    setAnchor(null);
    goToSearch(query);
  }

  function handlePointerDown() {
    openFromUserRef.current = true;
  }

  function handleFocus() {
    if (openFromUserRef.current || overlayOpen) {
      openOverlay();
    }
    openFromUserRef.current = false;
  }

  useLayoutEffect(() => {
    if (!overlayOpen) return;

    function sync() {
      const next = measureAnchor();
      if (!next) return;
      setAnchor((prev) => {
        if (
          prev &&
          Math.abs(prev.top - next.top) < 0.5 &&
          Math.abs(prev.insetInline - next.insetInline) < 0.5
        ) {
          return prev;
        }
        return next;
      });
    }

    sync();
    window.addEventListener("resize", sync);
    window.addEventListener("scroll", sync, true);
    const visualViewport = window.visualViewport;
    visualViewport?.addEventListener("resize", sync);
    visualViewport?.addEventListener("scroll", sync);

    return () => {
      window.removeEventListener("resize", sync);
      window.removeEventListener("scroll", sync, true);
      visualViewport?.removeEventListener("resize", sync);
      visualViewport?.removeEventListener("scroll", sync);
    };
  }, [overlayOpen]);

  useEffect(() => {
    if (!overlayOpen) return;
    function onVisibility() {
      if (document.visibilityState === "hidden") {
        closeOverlay();
      }
    }
    document.addEventListener("visibilitychange", onVisibility);
    return () => document.removeEventListener("visibilitychange", onVisibility);
  }, [overlayOpen]);

  return (
    <div
      className={cn(
        "home-hero-search",
        overlayOpen && "home-hero-search--ghost"
      )}
      role="search"
    >
      <label htmlFor="home-marketplace-search" className="sr-only">
        Search specialists
      </label>
      <div className="home-hero-search__field" ref={searchRowRef}>
        <SearchIcon className="home-hero-search__icon" />
        <div className="home-hero-search__input-wrap">
          {showPrompt ? (
            <span
              key={prompt}
              className={cn(
                "home-hero-search__prompt",
                !reduceMotion &&
                  (promptVisible
                    ? "home-hero-search__prompt--in"
                    : "home-hero-search__prompt--out")
              )}
              aria-hidden
            >
              {prompt}
            </span>
          ) : null}
          <input
            id="home-marketplace-search"
            className="home-hero-search__input"
            type="search"
            enterKeyHint="search"
            autoComplete="off"
            autoCorrect="off"
            spellCheck={false}
            readOnly
            value={draft}
            tabIndex={overlayOpen ? -1 : 0}
            onPointerDown={handlePointerDown}
            onFocus={handleFocus}
            onClick={openOverlay}
            aria-label="Search specialists"
            aria-expanded={overlayOpen}
            aria-controls="explore-search-overlay-panel"
            placeholder={
              locationReady && !isPlaceholder && !showPrompt
                ? `Search near ${pillLabel}…`
                : undefined
            }
          />
        </div>
        {trimmed && !overlayOpen ? (
          <button
            type="button"
            className="smoac-control home-hero-search__clear"
            aria-label="Clear search"
            onClick={(event) => {
              event.stopPropagation();
              setDraft("");
            }}
          >
            ×
          </button>
        ) : null}
      </div>

      <ExploreSearchOverlay
        open={overlayOpen}
        anchor={anchor}
        draft={draft}
        onDraftChange={setDraft}
        onClose={closeOverlay}
        onSubmit={handleSubmitFromOverlay}
        showLocationPrompt={!locationReady}
        locationLabel={
          locationReady && !isPlaceholder ? pillLabel : undefined
        }
      />
    </div>
  );
}
