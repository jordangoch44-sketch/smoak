"use client";

import { usePathname, useRouter } from "next/navigation";
import {
  useCallback,
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
  useSyncExternalStore,
  type CSSProperties,
} from "react";
import { HeroSearchSuggestionsLayer } from "@/components/home/HeroSearchSuggestionsLayer";
import { TapLink } from "@/components/ui/TapLink";
import { CloseIcon, SearchIcon } from "@/components/ui/icons";
import { trainingGoals } from "@/data/goals";
import { EMPTY_TRAINER_FILTERS } from "@/lib/explore";
import { buildExploreSearchParams } from "@/lib/explore-url";
import {
  getHeroSearchSuggestions,
  type HeroSearchSuggestion,
} from "@/lib/hero-search-suggestions";
import { HOME_HERO_TRUST_STATS } from "@/lib/home-marketplace-stats";
import { recordRecentSearch } from "@/lib/recent-searches-store";
import { applySearchQueryToExploreState } from "@/lib/search-query-parser";
import {
  getMobileMaxWidthSnapshot,
  subscribeMobileMaxWidth,
} from "@/lib/viewport";
import { cn } from "@/lib/utils";

interface SearchBarProps {
  showFilterChips?: boolean;
  showTrustIndicators?: boolean;
  enableSuggestions?: boolean;
  variant?: "default" | "hero";
}

export function SearchBar({
  showFilterChips = false,
  showTrustIndicators = false,
  enableSuggestions = false,
  variant = "default",
}: SearchBarProps) {
  const router = useRouter();
  const pathname = usePathname();
  const listboxId = useId();
  const searchContainerRef = useRef<HTMLDivElement>(null);
  const anchorRef = useRef<HTMLFormElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const resultsPanelRef = useRef<HTMLUListElement>(null);
  const layerRef = useRef<HTMLDivElement>(null);
  const panelInteractingRef = useRef(false);
  const [query, setQuery] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [focused, setFocused] = useState(false);
  const [suggestionsOpen, setSuggestionsOpen] = useState(false);
  const [pinnedStyle, setPinnedStyle] = useState<CSSProperties | undefined>();
  const isHero = variant === "hero";
  const isMobile = useSyncExternalStore(
    subscribeMobileMaxWidth,
    getMobileMaxWidthSnapshot,
    () => true
  );
  const searchInputId = isHero ? "hero-search-input" : "site-search-input";
  const suggestions = isHero && enableSuggestions && (focused || suggestionsOpen)
    ? getHeroSearchSuggestions(query)
    : [];
  const showResultsPanel =
    isHero && enableSuggestions && suggestionsOpen && suggestions.length > 0;

  useEffect(() => {
    setSubmitting(false);
  }, [pathname]);

  const navigateExplore = useCallback(
    (trimmed: string) => {
      setSubmitting(true);
      if (!trimmed) {
        router.push("/explore");
        return;
      }
      const applied = applySearchQueryToExploreState(
        trimmed,
        EMPTY_TRAINER_FILTERS
      );
      recordRecentSearch(applied.displayQuery);
      const params = buildExploreSearchParams(
        applied.filters,
        applied.displayQuery
      );
      router.push(`/explore?${params}`);
    },
    [router]
  );

  const closeResultsPanel = useCallback(() => {
    setSuggestionsOpen(false);
  }, []);

  const keepInputFocus = useCallback(() => {
    const input = inputRef.current;
    if (!input) return;
    if (document.activeElement === input) return;
    input.focus({ preventScroll: true });
  }, []);

  const handlePanelInteract = useCallback(() => {
    panelInteractingRef.current = true;
    keepInputFocus();
    window.setTimeout(() => {
      panelInteractingRef.current = false;
    }, 350);
  }, [keepInputFocus]);

  function isInsideSearchOverlay(target: Node) {
    if (searchContainerRef.current?.contains(target)) return true;
    if (resultsPanelRef.current?.contains(target)) return true;
    return false;
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    closeResultsPanel();
    navigateExplore(query.trim());
  }

  function handleSuggestionSelect(item: HeroSearchSuggestion) {
    setQuery(item.query);
    closeResultsPanel();
    if (item.kind === "specialist") {
      setSubmitting(true);
      inputRef.current?.blur();
      router.push(item.href);
      return;
    }
    navigateExplore(item.query);
  }

  function handleClearQuery() {
    setQuery("");
    setSuggestionsOpen(true);
    inputRef.current?.focus({ preventScroll: true });
  }

  useLayoutEffect(() => {
    if (!isHero || !showResultsPanel || !isMobile || !anchorRef.current) {
      setPinnedStyle(undefined);
      return;
    }

    function measurePinned() {
      const rect = anchorRef.current!.getBoundingClientRect();
      setPinnedStyle({
        position: "fixed",
        top: rect.top,
        left: rect.left,
        width: rect.width,
        zIndex: 9010,
      });
    }

    measurePinned();

    const viewport = window.visualViewport;
    viewport?.addEventListener("resize", measurePinned);
    viewport?.addEventListener("scroll", measurePinned);
    window.addEventListener("resize", measurePinned);
    window.addEventListener("scroll", measurePinned, true);

    return () => {
      viewport?.removeEventListener("resize", measurePinned);
      viewport?.removeEventListener("scroll", measurePinned);
      window.removeEventListener("resize", measurePinned);
      window.removeEventListener("scroll", measurePinned, true);
    };
  }, [isHero, showResultsPanel, isMobile]);

  useEffect(() => {
    if (!showResultsPanel) return;

    function onPointerDown(e: PointerEvent) {
      if (isInsideSearchOverlay(e.target as Node)) return;
      closeResultsPanel();
    }

    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, [showResultsPanel, closeResultsPanel]);

  useEffect(() => {
    document.body.classList.toggle(
      "hero-search-suggestions-open",
      showResultsPanel
    );
    return () => document.body.classList.remove("hero-search-suggestions-open");
  }, [showResultsPanel]);

  const formClass = cn(
    "hero-search__glass",
    isHero && "glass-panel",
    isHero && focused && "hero-search__glass--focused",
    !isHero && "smoked-glass overflow-hidden rounded-full md:rounded-3xl"
  );

  const chipClass = cn(
    "smoac-control smoac-tap inline-flex min-h-11 items-center rounded-full px-4 py-2 text-[13px] font-normal text-silver-200 md:px-4 md:text-sm md:hover:text-white",
    isHero ? "glass-chip hero-search__chip" : "smoked-glass-chip"
  );

  return (
    <div className={cn("w-full", isHero && "hero-search")}>
      <div className={cn(isHero && "hero-search__overlay-root")}>
        <div
          ref={searchContainerRef}
          style={pinnedStyle}
          className={cn(
            isHero && "hero-search__composer",
            isHero &&
              showResultsPanel &&
              (isMobile
                ? "hero-search__composer--pinned"
                : "hero-search__composer--elevated")
          )}
        >
          <form
            ref={anchorRef}
            onSubmit={handleSubmit}
            className={formClass}
          >
            <div className="hero-search__field-row relative z-[2] flex items-center">
              {isHero ? (
                <span className="hero-search__icon" aria-hidden>
                  <SearchIcon className="h-5 w-5" />
                </span>
              ) : null}
              <label className="sr-only" htmlFor={searchInputId}>
                Search specialists
              </label>
              <input
                ref={inputRef}
                id={searchInputId}
                type="search"
                enterKeyHint="search"
                autoComplete="off"
                value={query}
                onChange={(e) => {
                  setQuery(e.target.value);
                  setSuggestionsOpen(true);
                }}
                onFocus={() => {
                  setFocused(true);
                  setSuggestionsOpen(true);
                }}
                onBlur={() => {
                  window.setTimeout(() => {
                    if (panelInteractingRef.current) {
                      keepInputFocus();
                      return;
                    }
                    const active = document.activeElement;
                    if (searchContainerRef.current?.contains(active)) return;
                    if (resultsPanelRef.current?.contains(active)) {
                      keepInputFocus();
                      return;
                    }
                    setFocused(false);
                  }, 20);
                }}
                placeholder="Search name, specialty, or city"
                role="combobox"
                aria-expanded={showResultsPanel}
                aria-controls={listboxId}
                aria-autocomplete="list"
                className={cn(
                  "smoac-control min-w-0 flex-1 touch-manipulation bg-transparent text-white outline-none placeholder:text-silver-400/90",
                  isHero
                    ? "hero-search__input"
                    : "min-h-[52px] py-3 pl-5 pr-2 text-base md:min-h-[60px] md:py-3.5 md:pl-6 md:pr-3 md:text-lg"
                )}
                style={{ touchAction: "manipulation" }}
              />
              {isHero && query.length > 0 ? (
                <button
                  type="button"
                  className="smoac-control smoac-tap hero-search__clear"
                  aria-label="Clear search"
                  onMouseDown={(e) => e.preventDefault()}
                  onTouchStart={(e) => e.preventDefault()}
                  onClick={handleClearQuery}
                >
                  <CloseIcon className="h-4 w-4" />
                </button>
              ) : null}
              <button
                type="submit"
                disabled={submitting}
                className={cn(
                  "smoac-control smoac-tap hero-search__submit inline-flex shrink-0 items-center justify-center rounded-full",
                  !isHero &&
                    "mr-1.5 min-h-11 bg-white px-5 py-2.5 text-sm font-semibold tracking-wide text-black shadow-[0_4px_24px_rgba(0,0,0,0.35)] md:mr-2 md:min-h-[48px] md:min-w-[140px] md:px-8 md:py-3 md:text-base"
                )}
              >
                Search
              </button>
            </div>
          </form>
        </div>

        {isHero && enableSuggestions ? (
          <HeroSearchSuggestionsLayer
            open={showResultsPanel}
            listboxId={listboxId}
            anchorRef={anchorRef}
            resultsPanelRef={resultsPanelRef}
            layerRef={layerRef}
            suggestions={suggestions}
            onSelect={handleSuggestionSelect}
            onDismiss={closeResultsPanel}
            onPanelInteract={handlePanelInteract}
          />
        ) : null}
      </div>

      <div className={cn(isHero && "hero-search__below")}>
        {isHero && showTrustIndicators ? (
          <p className="hero-search__trust" aria-label="Marketplace highlights">
            {HOME_HERO_TRUST_STATS.map((stat, index) => (
              <span key={stat} className="hero-search__trust-item">
                {index > 0 ? (
                  <span className="hero-search__trust-sep" aria-hidden>
                    ·
                  </span>
                ) : null}
                {stat}
              </span>
            ))}
          </p>
        ) : null}

        {showFilterChips ? (
          <div
            className={cn(
              "flex flex-wrap gap-2",
              isHero ? "hero-search__chips" : "mt-4 md:mt-5 md:justify-center"
            )}
          >
            {trainingGoals.map((goal) => (
              <TapLink key={goal.id} href={goal.href} className={chipClass}>
                {goal.label}
              </TapLink>
            ))}
          </div>
        ) : null}
      </div>
    </div>
  );
}
