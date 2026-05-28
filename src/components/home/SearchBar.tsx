"use client";

import { usePathname, useRouter } from "next/navigation";
import {
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
  type ReactNode,
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
import { HeroTrustStats } from "@/components/home/HeroTrustStats";
import { recordRecentSearch } from "@/lib/recent-searches-store";
import { applySearchQueryToExploreState } from "@/lib/search-query-parser";
import { cn } from "@/lib/utils";

interface SearchBarProps {
  showFilterChips?: boolean;
  showTrustIndicators?: boolean;
  enableSuggestions?: boolean;
  variant?: "default" | "hero";
  /** Aurora mesh / glow confined to the search composer (hero only). */
  composerBackdrop?: ReactNode;
}

export function SearchBar({
  showFilterChips = false,
  showTrustIndicators = false,
  enableSuggestions = false,
  variant = "default",
  composerBackdrop = null,
}: SearchBarProps) {
  const router = useRouter();
  const pathname = usePathname();
  const listboxId = useId();
  const heroSearchRootRef = useRef<HTMLDivElement>(null);
  const anchorRef = useRef<HTMLFormElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const resultsPanelRef = useRef<HTMLUListElement>(null);
  const layerRef = useRef<HTMLDivElement>(null);
  const panelInteractingRef = useRef(false);
  const scrollLockYRef = useRef(0);
  const [query, setQuery] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [suggestionsOpen, setSuggestionsOpen] = useState(false);
  const isHero = variant === "hero";
  const searchInputId = isHero ? "hero-search-input" : "site-search-input";
  const suggestions =
    isHero && enableSuggestions && suggestionsOpen
      ? getHeroSearchSuggestions(query)
      : [];
  const showResultsPanel =
    isHero && enableSuggestions && suggestionsOpen && suggestions.length > 0;

  useEffect(() => {
    queueMicrotask(() => setSubmitting(false));
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

  const dismissSearchOverlay = useCallback(() => {
    panelInteractingRef.current = false;
    setSuggestionsOpen(false);
    inputRef.current?.blur();
  }, []);

  const isInsideSearchOverlay = useCallback((target: Node) => {
    if (anchorRef.current?.contains(target)) return true;
    if (resultsPanelRef.current?.contains(target)) return true;
    return false;
  }, []);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    dismissSearchOverlay();
    navigateExplore(query.trim());
  }

  function handleSuggestionSelect(item: HeroSearchSuggestion) {
    setQuery(item.query);
    dismissSearchOverlay();
    if (item.kind === "specialist") {
      setSubmitting(true);
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

  const handlePanelInteract = useCallback(() => {
    panelInteractingRef.current = true;
    window.setTimeout(() => {
      panelInteractingRef.current = false;
    }, 350);
  }, []);

  useEffect(() => {
    if (!isHero || !showResultsPanel) return;

    scrollLockYRef.current = window.scrollY;
    const { style: bodyStyle } = document.body;
    const { style: htmlStyle } = document.documentElement;
    const previous = {
      bodyPosition: bodyStyle.position,
      bodyTop: bodyStyle.top,
      bodyLeft: bodyStyle.left,
      bodyRight: bodyStyle.right,
      bodyWidth: bodyStyle.width,
      bodyOverflow: bodyStyle.overflow,
      htmlOverflow: htmlStyle.overflow,
    };

    htmlStyle.overflow = "hidden";
    bodyStyle.position = "fixed";
    bodyStyle.top = `-${scrollLockYRef.current}px`;
    bodyStyle.left = "0";
    bodyStyle.right = "0";
    bodyStyle.width = "100%";
    bodyStyle.overflow = "hidden";
    document.body.classList.add("hero-search-suggestions-open");
    document.documentElement.classList.add("hero-search-suggestions-open");

    return () => {
      bodyStyle.position = previous.bodyPosition;
      bodyStyle.top = previous.bodyTop;
      bodyStyle.left = previous.bodyLeft;
      bodyStyle.right = previous.bodyRight;
      bodyStyle.width = previous.bodyWidth;
      bodyStyle.overflow = previous.bodyOverflow;
      htmlStyle.overflow = previous.htmlOverflow;
      document.body.classList.remove("hero-search-suggestions-open");
      document.documentElement.classList.remove("hero-search-suggestions-open");
      window.scrollTo(0, scrollLockYRef.current);
    };
  }, [isHero, showResultsPanel]);

  useEffect(() => {
    if (!isHero || !enableSuggestions || !suggestionsOpen) return;

    function onOutsidePointerDown(event: PointerEvent) {
      const target = event.target;
      if (!(target instanceof Node)) return;
      if (isInsideSearchOverlay(target)) return;
      event.preventDefault();
      event.stopImmediatePropagation();
      dismissSearchOverlay();
    }

    document.addEventListener("pointerdown", onOutsidePointerDown, true);

    return () => {
      document.removeEventListener("pointerdown", onOutsidePointerDown, true);
    };
  }, [
    isHero,
    enableSuggestions,
    suggestionsOpen,
    dismissSearchOverlay,
    isInsideSearchOverlay,
  ]);

  const formClass = cn(
    "hero-search__glass",
    isHero && "glass-panel",
    !isHero && "smoked-glass overflow-hidden rounded-full md:rounded-3xl"
  );

  const chipClass = cn(
    "smoac-control smoac-tap inline-flex min-h-11 items-center rounded-full px-4 py-2 text-[13px] font-normal text-silver-200 md:px-4 md:text-sm md:hover:text-white",
    isHero ? "glass-chip hero-search__chip" : "smoked-glass-chip"
  );

  return (
    <div className={cn("w-full", isHero && "hero-search")}>
      <div
        ref={heroSearchRootRef}
        className={cn(isHero && "hero-search__overlay-root")}
      >
        <div
          className={cn(
            isHero && "hero-search__composer-shell",
            !isHero && "hero-search__composer"
          )}
        >
          {isHero ? composerBackdrop : null}
          <div className={cn(isHero && "hero-search__composer")}>
          <form ref={anchorRef} onSubmit={handleSubmit} className={formClass}>
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
                  setSuggestionsOpen(true);
                }}
                onBlur={() => {
                  window.setTimeout(() => {
                    if (panelInteractingRef.current) return;
                    const active = document.activeElement;
                    if (anchorRef.current?.contains(active)) return;
                    if (resultsPanelRef.current?.contains(active)) return;
                    setSuggestionsOpen(false);
                  }, 20);
                }}
                placeholder="Search name, specialty, or city"
                role="combobox"
                aria-expanded={showResultsPanel}
                aria-controls={listboxId}
                aria-autocomplete="list"
                className={cn(
                  "smoac-control min-w-0 flex-1 touch-manipulation bg-transparent text-white outline-none",
                  isHero
                    ? "hero-search__input"
                    : "min-h-[52px] py-3 pl-5 pr-2 text-base placeholder:text-silver-400/90 md:min-h-[60px] md:py-3.5 md:pl-6 md:pr-3 md:text-lg"
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
            onDismiss={dismissSearchOverlay}
            onPanelInteract={handlePanelInteract}
          />
        ) : null}
      </div>

      <div className={cn(isHero && "hero-search__below")}>
        {isHero && showTrustIndicators ? (
          <HeroTrustStats />
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
