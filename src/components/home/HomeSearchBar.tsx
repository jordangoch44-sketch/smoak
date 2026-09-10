"use client";

import { useLayoutEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { SearchIcon } from "@/components/ui/icons";
import {
  ExploreSearchOverlay,
  type ExploreSearchOverlayAnchor,
} from "@/components/explore/ExploreSearchOverlay";
import { useAuthSession } from "@/hooks/useAuthSession";
import { useFastActivate } from "@/hooks/useFastActivate";
import { useUserLocation } from "@/hooks/useUserLocation";
import { buildHomeSearchHref } from "@/lib/home-browse-categories";
import { EXPLORE_SEARCH_PLACEHOLDER } from "@/lib/explore-search-prompts";
import { hasClientSearchLocation } from "@/lib/explore-location-filters";
import { prepareNavScrollReset } from "@/lib/mobile-chrome";
import { SITE_ROUTES } from "@/lib/navigation";
import { cn } from "@/lib/utils";

/** Overlay styles — shared with Explore (not full explore.css) */
import "@/styles/explore-search-overlay.css";

/**
 * Marketplace feeder for Search: same overlay (recent / profession / specialty /
 * gender / price / location) as Explore, then navigates to `/explore?q=…`.
 */
export function HomeSearchBar() {
  const router = useRouter();
  const { session } = useAuthSession();
  const { hasLocation } = useUserLocation();
  const optedInLocation = hasLocation || hasClientSearchLocation(session);

  const [draft, setDraft] = useState("");
  const [overlayOpen, setOverlayOpen] = useState(false);
  const [anchor, setAnchor] = useState<ExploreSearchOverlayAnchor | null>(null);
  const openFromUserRef = useRef(false);
  const searchRowRef = useRef<HTMLDivElement | null>(null);

  const trimmed = draft.trim();

  function measureAnchor(): ExploreSearchOverlayAnchor {
    const el = searchRowRef.current;
    const insetInline = el
      ? Math.max(0, el.getBoundingClientRect().left)
      : 16;

    /*
     * Pin under the site header like the Search-page overlay — do not use the
     * hero field’s mid-page Y or the chrome/chips sit too low on Marketplace.
     */
    const header = document.getElementById("site-header");
    const headerBottom = header?.getBoundingClientRect().bottom ?? 0;
    const top = Math.max(0, headerBottom + 10);

    return { top, insetInline };
  }

  function openOverlay() {
    setAnchor(measureAnchor());
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
    openFromUserRef.current = false;
    /* Drop the overlay scroll-lock before Search mounts — otherwise Leaflet
     * initializes against a 0-height map under body.explore-search-open. */
    document.body.classList.remove("explore-search-open");
    window.requestAnimationFrame(() => {
      goToSearch(query);
    });
  }

  function handlePointerDown() {
    openFromUserRef.current = true;
  }

  const overlayActivate = useFastActivate(openOverlay);
  const clearActivate = useFastActivate(() => setDraft(""));

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
            onPointerUp={overlayActivate.onPointerUp}
            onFocus={handleFocus}
            onClick={overlayActivate.onClick}
            aria-label="Search specialists"
            aria-expanded={overlayOpen}
            aria-controls="explore-search-overlay-panel"
            placeholder={EXPLORE_SEARCH_PLACEHOLDER}
          />
        </div>
        {trimmed && !overlayOpen ? (
          <button
            type="button"
            className="smoac-control home-hero-search__clear"
            aria-label="Clear search"
            onPointerUp={(event) => {
              event.stopPropagation();
              clearActivate.onPointerUp(event);
            }}
            onClick={(event) => {
              event.stopPropagation();
              clearActivate.onClick(event);
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
        showLocationPrompt={!optedInLocation}
      />
    </div>
  );
}
