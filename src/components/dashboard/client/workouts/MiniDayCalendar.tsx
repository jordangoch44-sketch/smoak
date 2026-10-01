"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { CheckIcon, ChevronDownIcon, ChevronLeftIcon, ChevronRightIcon } from "@/components/ui/icons";
import { cn } from "@/lib/utils";
import {
  addMonths,
  formatWorkoutDayHeading,
  parseLocalDateKey,
  startOfMonth,
  toLocalDateKey,
} from "@/lib/workouts/client-workout";

const WEEKDAYS = ["S", "M", "T", "W", "T", "F", "S"] as const;

function blurTextField() {
  const active = document.activeElement;
  if (
    active instanceof HTMLInputElement ||
    active instanceof HTMLTextAreaElement ||
    (active instanceof HTMLElement && active.isContentEditable)
  ) {
    active.blur();
  }
}

/** iOS puts focus back on the field that was open when the calendar appeared. */
function keepKeyboardDown() {
  blurTextField();
  const timers = [40, 160, 360].map((delay) => window.setTimeout(blurTextField, delay));
  return () => {
    for (const timer of timers) window.clearTimeout(timer);
  };
}

function monthLabel(month: Date): string {
  return month.toLocaleDateString("en-US", { month: "long", year: "numeric" });
}

function daysInMonth(month: Date): number {
  return new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate();
}

/** Last day of the month is still before `min`, so the month has nothing to pick. */
function monthEndsBefore(month: Date, min: string | undefined): boolean {
  if (!min) return false;
  const last = toLocalDateKey(new Date(month.getFullYear(), month.getMonth() + 1, 0));
  return last < min;
}

function monthStartsAfter(month: Date, max: string | undefined): boolean {
  if (!max) return false;
  return toLocalDateKey(startOfMonth(month)) > max;
}

/**
 * Little calendar under a "Today" pill.
 * A day tap only highlights. The check mark collapses it, and the keyboard stays down.
 */
export function MiniDayCalendar({
  value,
  todayKey,
  min,
  max,
  onChange,
  triggerClassName,
  block = false,
}: {
  value: string;
  todayKey: string;
  min?: string;
  max?: string;
  onChange: (dateKey: string) => void;
  triggerClassName?: string;
  block?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState(value);
  const [visible, setVisible] = useState(() => startOfMonth(new Date()));
  const commitRef = useRef<(next: string) => void>(() => {});
  const pendingRef = useRef(pending);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const [anchor, setAnchor] = useState<{ top: number; left: number; width: number } | null>(null);
  pendingRef.current = pending;

  useEffect(() => {
    if (!open) return;
    function place() {
      const node = triggerRef.current;
      if (!node) return;
      const rect = node.getBoundingClientRect();
      const margin = 12;
      const width = Math.min(300, window.innerWidth - margin * 2);
      const left = Math.min(Math.max(margin, rect.left), window.innerWidth - margin - width);
      const estimated = 340;
      const below = rect.bottom + 8;
      const top =
        below + estimated > window.innerHeight - margin
          ? Math.max(margin, rect.top - estimated - 8)
          : below;
      setAnchor({ top, left, width });
    }
    place();
    window.addEventListener("resize", place);
    window.visualViewport?.addEventListener("resize", place);
    window.visualViewport?.addEventListener("scroll", place);
    return () => {
      window.removeEventListener("resize", place);
      window.visualViewport?.removeEventListener("resize", place);
      window.visualViewport?.removeEventListener("scroll", place);
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const release = keepKeyboardDown();
    function blockFocus(event: FocusEvent) {
      const target = event.target;
      if (!(target instanceof HTMLElement)) return;
      if (target.closest("[data-mini-day]")) return;
      if (
        target instanceof HTMLInputElement ||
        target instanceof HTMLTextAreaElement ||
        target.isContentEditable
      ) {
        target.blur();
        event.stopImmediatePropagation();
      }
    }
    function onKeyDown(event: KeyboardEvent) {
      if (event.key !== "Escape") return;
      event.preventDefault();
      event.stopPropagation();
      commitRef.current(pendingRef.current);
    }
    document.addEventListener("focusin", blockFocus, true);
    window.addEventListener("keydown", onKeyDown, true);
    return () => {
      document.removeEventListener("focusin", blockFocus, true);
      window.removeEventListener("keydown", onKeyDown, true);
      release();
      keepKeyboardDown();
    };
  }, [open]);

  const shown = open ? pending : value;
  const label = shown === todayKey ? "Today" : formatWorkoutDayHeading(shown);

  function commit(next: string) {
    if (next !== value) onChange(next);
    setOpen(false);
  }
  commitRef.current = commit;

  function toggle() {
    if (open) {
      commit(pending);
      return;
    }
    blurTextField();
    setPending(value);
    setVisible(startOfMonth(parseLocalDateKey(value)));
    setOpen(true);
  }
  const lead = startOfMonth(visible).getDay();
  const count = daysInMonth(visible);
  const prevMonth = addMonths(visible, -1);
  const nextMonth = addMonths(visible, 1);
  const prevDisabled = monthEndsBefore(prevMonth, min);
  const nextDisabled = monthStartsAfter(nextMonth, max);

  function pick(dateKey: string) {
    if ((min && dateKey < min) || (max && dateKey > max)) return;
    setPending(dateKey);
  }

  return (
    <div className={cn("mini-day", block && "mini-day--block")} data-mini-day="">
      <button
        ref={triggerRef}
        type="button"
        className={cn("mini-day__trigger", triggerClassName)}
        aria-expanded={open}
        aria-label={open ? `${label}. Calendar open` : `${label}. Choose a day`}
        onPointerDown={() => blurTextField()}
        onClick={toggle}
      >
        <span>{label}</span>
        <ChevronDownIcon className={cn("mini-day__chevron", open && "mini-day__chevron--open")} />
      </button>

      {open && anchor
        ? createPortal(
            <>
            <div
              className="mini-day__shield"
              aria-hidden
              onPointerDown={(event) => {
                event.preventDefault();
                event.stopPropagation();
              }}
              onClick={(event) => {
                event.preventDefault();
                event.stopPropagation();
              }}
            />
            <div
              className="mini-day__panel"
              style={{ top: anchor.top, left: anchor.left, width: anchor.width }}
              role="dialog"
              aria-modal="true"
              aria-label="Choose a day"
              data-mini-day=""
            >
          <div className="mini-day__bar">
            <button
              type="button"
              className="mini-day__nav"
              aria-label="Previous month"
              disabled={prevDisabled}
              onClick={() => setVisible(prevMonth)}
            >
              <ChevronLeftIcon className="h-4 w-4" />
            </button>
            <p className="mini-day__month">{monthLabel(visible)}</p>
            <button
              type="button"
              className="mini-day__nav"
              aria-label="Next month"
              disabled={nextDisabled}
              onClick={() => setVisible(nextMonth)}
            >
              <ChevronRightIcon className="h-4 w-4" />
            </button>
            <button type="button" className="mini-day__done" aria-label="Done" onClick={() => commit(pending)}>
              <CheckIcon className="h-4 w-4" />
            </button>
          </div>
          <div className="mini-day__week" aria-hidden>
            {WEEKDAYS.map((day, index) => (
              <span key={`${day}-${index}`}>{day}</span>
            ))}
          </div>
          <div className="mini-day__grid" role="grid">
            {Array.from({ length: lead }, (_, index) => (
              <span key={`lead-${index}`} />
            ))}
            {Array.from({ length: count }, (_, index) => {
              const day = index + 1;
              const dateKey = toLocalDateKey(
                new Date(visible.getFullYear(), visible.getMonth(), day)
              );
              const disabled = Boolean((min && dateKey < min) || (max && dateKey > max));
              const selected = dateKey === pending;
              return (
                <button
                  key={dateKey}
                  type="button"
                  role="gridcell"
                  className={cn(
                    "mini-day__cell",
                    selected && "mini-day__cell--selected",
                    dateKey === todayKey && "mini-day__cell--today"
                  )}
                  aria-pressed={selected}
                  aria-label={formatWorkoutDayHeading(dateKey)}
                  disabled={disabled}
                  onClick={() => pick(dateKey)}
                >
                  {day}
                </button>
              );
            })}
          </div>
            </div>
            </>,
            document.body
          )
        : null}
    </div>
  );
}
