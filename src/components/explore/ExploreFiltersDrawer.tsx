"use client";

import {
  useCallback,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
} from "react";
import { createPortal } from "react-dom";
import {
  AnimatePresence,
  motion,
  useDragControls,
  useReducedMotion,
  type PanInfo,
} from "framer-motion";
import type { TrainerFilters } from "@/types";
import { countActiveFilters } from "@/lib/explore";
import { cn } from "@/lib/utils";
import { CloseIcon } from "@/components/ui/icons";
import { TrainerFilters as FiltersPanel } from "./TrainerFilters";

interface ExploreFiltersDrawerProps {
  open: boolean;
  onClose: () => void;
  filters: TrainerFilters;
  onApply: (filters: TrainerFilters) => void;
  getMatchCount: (filters: TrainerFilters) => number;
  onClearFilters: () => void;
}

const DISMISS_OFFSET_PX = 110;
const DISMISS_VELOCITY = 650;

function formatShowResultsLabel(count: number): string {
  if (count === 0) return "Show 0 results";
  if (count === 1) return "Show 1 result";
  return `Show ${count} results`;
}

function filtersSnapshot(filters: TrainerFilters): string {
  return JSON.stringify(filters);
}

export function ExploreFiltersDrawer({
  open,
  onClose,
  filters,
  onApply,
  getMatchCount,
  onClearFilters,
}: ExploreFiltersDrawerProps) {
  const titleId = useId();
  const sheetRef = useRef<HTMLDivElement>(null);
  const previouslyFocusedRef = useRef<HTMLElement | null>(null);
  const dragControls = useDragControls();
  const reduceMotion = useReducedMotion();
  const [draft, setDraft] = useState(filters);
  const [syncedKey, setSyncedKey] = useState("");

  const draftMatchCount = useMemo(
    () => getMatchCount(draft),
    [draft, getMatchCount]
  );
  const draftActiveFilterCount = useMemo(
    () => countActiveFilters(draft),
    [draft]
  );

  const filtersKey = filtersSnapshot(filters);
  if (open && syncedKey !== filtersKey) {
    setSyncedKey(filtersKey);
    setDraft(filters);
  } else if (!open && syncedKey) {
    setSyncedKey("");
  }

  useEffect(() => {
    document.body.classList.toggle("drawer-open", open);
    document.documentElement.classList.toggle("drawer-open", open);
    return () => {
      document.body.classList.remove("drawer-open");
      document.documentElement.classList.remove("drawer-open");
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;

    previouslyFocusedRef.current =
      document.activeElement instanceof HTMLElement
        ? document.activeElement
        : null;

    const sheet = sheetRef.current;
    const focusTarget =
      sheet?.querySelector<HTMLElement>("[data-sheet-initial-focus]") ??
      sheet?.querySelector<HTMLElement>(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      );
    focusTarget?.focus({ preventScroll: true });

    return () => {
      previouslyFocusedRef.current?.focus?.({ preventScroll: true });
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        event.preventDefault();
        onClose();
        return;
      }

      if (event.key !== "Tab" || !sheetRef.current) return;

      const focusable = sheetRef.current.querySelectorAll<HTMLElement>(
        'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
      );
      if (focusable.length === 0) return;

      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      const active = document.activeElement;

      if (event.shiftKey && active === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && active === last) {
        event.preventDefault();
        first.focus();
      }
    }

    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [open, onClose]);

  const handleApply = useCallback(() => {
    onApply(draft);
    onClose();
  }, [draft, onApply, onClose]);

  const handleClear = useCallback(() => {
    onClearFilters();
    setDraft({
      zipCode: "",
      city: "",
      neighborhood: "",
      profession: "",
      specialty: "",
      gender: "",
      priceMin: "",
      priceMax: "",
      serviceType: "",
    });
  }, [onClearFilters]);

  const handleDragEnd = useCallback(
    (_: unknown, info: PanInfo) => {
      if (
        info.offset.y > DISMISS_OFFSET_PX ||
        info.velocity.y > DISMISS_VELOCITY
      ) {
        onClose();
      }
    },
    [onClose]
  );

  if (typeof document === "undefined") return null;

  const sheetTransition = reduceMotion
    ? { duration: 0.16, ease: "easeOut" as const }
    : { type: "spring" as const, damping: 34, stiffness: 420, mass: 0.82 };

  const backdropTransition = reduceMotion
    ? { duration: 0.14 }
    : { duration: 0.22, ease: [0.22, 1, 0.36, 1] as const };

  return createPortal(
    <AnimatePresence>
      {open ? (
        <div
          className="explore-filters-drawer-root"
          role="presentation"
        >
          <motion.button
            type="button"
            aria-label="Close filters"
            className="smoac-control explore-filters-drawer__backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={backdropTransition}
            onClick={onClose}
          />

          <motion.div
            ref={sheetRef}
            className="explore-filters-drawer"
            role="dialog"
            aria-modal="true"
            aria-labelledby={titleId}
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={sheetTransition}
            drag="y"
            dragControls={dragControls}
            dragListener={false}
            dragConstraints={{ top: 0, bottom: 0 }}
            dragElastic={{ top: 0.04, bottom: 0.55 }}
            onDragEnd={handleDragEnd}
          >
            <div className="explore-filters-drawer__chrome">
              <button
                type="button"
                className="explore-filters-drawer__handle-hit"
                aria-label="Drag to close filters"
                onPointerDown={(event) => dragControls.start(event)}
              >
                <span className="explore-filters-drawer__handle" aria-hidden />
              </button>

              <div className="explore-filters-drawer__header">
                <h2 id={titleId} className="explore-filters-drawer__title">
                  Filters
                </h2>
                <button
                  type="button"
                  onClick={onClose}
                  className="smoac-control explore-filters-drawer__close"
                  aria-label="Close"
                  data-sheet-initial-focus
                >
                  <CloseIcon className="h-5 w-5" />
                </button>
              </div>
            </div>

            <div className="explore-filters-drawer__body">
              <FiltersPanel
                filters={draft}
                onChange={setDraft}
                compact
                hideHeader
              />
            </div>

            <div className="explore-filters-drawer__footer">
              <button
                type="button"
                onClick={handleClear}
                className={cn(
                  "smoac-control explore-filters-drawer__clear",
                  draftActiveFilterCount === 0 &&
                    "explore-filters-drawer__clear--muted"
                )}
                disabled={draftActiveFilterCount === 0}
              >
                Clear all
              </button>
              <button
                type="button"
                onClick={handleApply}
                className="smoac-control explore-filters-drawer__apply"
              >
                {formatShowResultsLabel(draftMatchCount)}
              </button>
            </div>
          </motion.div>
        </div>
      ) : null}
    </AnimatePresence>,
    document.body
  );
}
