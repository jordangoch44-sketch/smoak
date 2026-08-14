"use client";

import { useEffect, useId, useRef, useState, type KeyboardEvent } from "react";
import type { AddressSuggestion } from "@/lib/geo/address-suggest";
import { cn } from "@/lib/utils";

export type SpecialistLocationPrecision = "zip" | "address";

export interface SpecialistPreciseLocationValue {
  workAddress: string;
  locationPrecision: SpecialistLocationPrecision;
  latitude: number | null;
  longitude: number | null;
  zipCode?: string;
  city?: string;
  state?: string;
}

interface SpecialistPreciseLocationFieldProps {
  workAddress: string;
  locationPrecision: SpecialistLocationPrecision;
  disabled?: boolean;
  className?: string;
  onResolved: (value: SpecialistPreciseLocationValue) => void;
  onCleared: () => void;
  onDraftChange?: (workAddress: string) => void;
}

/**
 * Optional street / studio address search with autocomplete.
 * Street text stays private — marketplace uses lat/lng only.
 */
export function SpecialistPreciseLocationField({
  workAddress,
  locationPrecision,
  disabled = false,
  className,
  onResolved,
  onCleared,
  onDraftChange,
}: SpecialistPreciseLocationFieldProps) {
  const listId = useId();
  const rootRef = useRef<HTMLDivElement | null>(null);
  const [draft, setDraft] = useState(workAddress);
  const [busy, setBusy] = useState(false);
  const [suggestBusy, setSuggestBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [suggestions, setSuggestions] = useState<AddressSuggestion[]>([]);
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const suggestSeq = useRef(0);

  const pinned = locationPrecision === "address" && Boolean(workAddress.trim());

  useEffect(() => {
    setDraft(workAddress);
  }, [workAddress]);

  useEffect(() => {
    function onDocPointer(event: MouseEvent) {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false);
        setActiveIndex(-1);
      }
    }
    document.addEventListener("mousedown", onDocPointer);
    return () => document.removeEventListener("mousedown", onDocPointer);
  }, []);

  useEffect(() => {
    const q = draft.trim();
    if (q.length < 3 || disabled) {
      setSuggestions([]);
      setSuggestBusy(false);
      return;
    }
    /* Don't re-suggest an already-pinned exact match while idle */
    if (pinned && q === workAddress.trim()) {
      setSuggestions([]);
      return;
    }

    const seq = ++suggestSeq.current;
    setSuggestBusy(true);
    const timer = window.setTimeout(() => {
      void fetch(`/api/geo/address-suggest?q=${encodeURIComponent(q)}`)
        .then((res) => res.json())
        .then((body: { suggestions?: AddressSuggestion[] }) => {
          if (seq !== suggestSeq.current) return;
          setSuggestions(body.suggestions ?? []);
          setOpen(true);
          setActiveIndex(-1);
        })
        .catch(() => {
          if (seq !== suggestSeq.current) return;
          setSuggestions([]);
        })
        .finally(() => {
          if (seq !== suggestSeq.current) return;
          setSuggestBusy(false);
        });
    }, 280);

    return () => window.clearTimeout(timer);
  }, [draft, disabled, pinned, workAddress]);

  function handleChange(value: string) {
    setDraft(value);
    setError(null);
    onDraftChange?.(value);
    setOpen(true);
  }

  async function resolveSuggestion(suggestion: AddressSuggestion) {
    setBusy(true);
    setError(null);
    setOpen(false);
    setSuggestions([]);

    try {
      const placeId = suggestion.id.startsWith("g:")
        ? suggestion.id.slice(2)
        : undefined;
      const response = await fetch("/api/geo/address-suggest", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          placeId,
          label: suggestion.label,
          latitude: suggestion.latitude,
          longitude: suggestion.longitude,
          zip: suggestion.zip,
          city: suggestion.city,
          state: suggestion.state,
          query: suggestion.label,
        }),
      });
      const body = (await response.json()) as {
        ok?: boolean;
        result?: {
          formattedAddress: string;
          latitude: number;
          longitude: number;
          zip: string | null;
          city: string | null;
          state: string | null;
        };
        error?: string;
      };
      if (!response.ok || !body.ok || !body.result) {
        setError(body.error || "We couldn't pin that address.");
        return;
      }

      const { result } = body;
      setDraft(result.formattedAddress);
      onResolved({
        workAddress: result.formattedAddress,
        locationPrecision: "address",
        latitude: result.latitude,
        longitude: result.longitude,
        zipCode: result.zip ?? undefined,
        city: result.city ?? undefined,
        state: result.state ?? undefined,
      });
    } catch {
      setError("We couldn't pin that address. Try again.");
    } finally {
      setBusy(false);
    }
  }

  async function handlePinTyped() {
    const query = draft.trim();
    if (query.length < 5) {
      setError("Start typing an address, then pick a suggestion.");
      return;
    }
    setBusy(true);
    setError(null);
    setOpen(false);
    try {
      const response = await fetch("/api/geo/address-suggest", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query }),
      });
      const body = (await response.json()) as {
        ok?: boolean;
        result?: {
          formattedAddress: string;
          latitude: number;
          longitude: number;
          zip: string | null;
          city: string | null;
          state: string | null;
        };
        error?: string;
      };
      if (!response.ok || !body.ok || !body.result) {
        setError(body.error || "We couldn't find that address.");
        return;
      }
      const { result } = body;
      setDraft(result.formattedAddress);
      onResolved({
        workAddress: result.formattedAddress,
        locationPrecision: "address",
        latitude: result.latitude,
        longitude: result.longitude,
        zipCode: result.zip ?? undefined,
        city: result.city ?? undefined,
        state: result.state ?? undefined,
      });
    } catch {
      setError("We couldn't find that address. Try again.");
    } finally {
      setBusy(false);
    }
  }

  function handleClear() {
    setDraft("");
    setError(null);
    setSuggestions([]);
    setOpen(false);
    onCleared();
  }

  function onKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (!open || suggestions.length === 0) {
      if (event.key === "Enter") {
        event.preventDefault();
        void handlePinTyped();
      }
      return;
    }
    if (event.key === "ArrowDown") {
      event.preventDefault();
      setActiveIndex((i) => Math.min(i + 1, suggestions.length - 1));
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      setActiveIndex((i) => Math.max(i - 1, 0));
    } else if (event.key === "Enter") {
      event.preventDefault();
      const pick =
        activeIndex >= 0 ? suggestions[activeIndex] : suggestions[0];
      if (pick) void resolveSuggestion(pick);
    } else if (event.key === "Escape") {
      setOpen(false);
      setActiveIndex(-1);
    }
  }

  return (
    <div
      ref={rootRef}
      className={cn("specialist-precise-location", className)}
    >
      <label className="login-field specialist-precise-location__field">
        <span className="login-field__label specialist-precise-location__label">
          Exact work / studio address
          <span className="specialist-precise-location__optional">Optional</span>
        </span>
        <span className="specialist-precise-location__hint">
          Search and pick an address for accurate distance. Street stays private
          — leave blank to use ZIP only.
        </span>
        <div className="specialist-precise-location__search">
          <span className="specialist-precise-location__search-icon" aria-hidden>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
              <circle
                cx="11"
                cy="11"
                r="6.5"
                stroke="currentColor"
                strokeWidth="1.75"
              />
              <path
                d="M16.5 16.5L20 20"
                stroke="currentColor"
                strokeWidth="1.75"
                strokeLinecap="round"
              />
            </svg>
          </span>
          <input
            className="login-field__input profile-edit-input specialist-precise-location__input"
            value={draft}
            onChange={(e) => handleChange(e.target.value)}
            onFocus={() => {
              if (suggestions.length > 0) setOpen(true);
            }}
            onKeyDown={onKeyDown}
            autoComplete="off"
            role="combobox"
            aria-expanded={open && suggestions.length > 0}
            aria-controls={listId}
            aria-autocomplete="list"
            aria-activedescendant={
              activeIndex >= 0 ? `${listId}-${activeIndex}` : undefined
            }
            placeholder="Search address — e.g. 9800 Mira Lee Way"
            disabled={disabled || busy}
          />
          {suggestBusy || busy ? (
            <span className="specialist-precise-location__spinner" aria-hidden />
          ) : null}
        </div>
      </label>

      {open && suggestions.length > 0 ? (
        <ul
          id={listId}
          className="specialist-precise-location__suggestions"
          role="listbox"
        >
          {suggestions.map((suggestion, index) => (
            <li key={suggestion.id} role="presentation">
              <button
                type="button"
                id={`${listId}-${index}`}
                role="option"
                aria-selected={index === activeIndex}
                className={cn(
                  "specialist-precise-location__suggestion",
                  index === activeIndex &&
                    "specialist-precise-location__suggestion--active"
                )}
                onMouseEnter={() => setActiveIndex(index)}
                onClick={() => void resolveSuggestion(suggestion)}
                disabled={disabled || busy}
              >
                {suggestion.label}
              </button>
            </li>
          ))}
        </ul>
      ) : null}

      <div className="specialist-precise-location__footer">
        {pinned ? (
          <p className="specialist-precise-location__status" role="status">
            Pinned — distance uses this exact location.
          </p>
        ) : (
          <p className="specialist-precise-location__status" role="status">
            Pick a suggestion to pin, or leave blank for ZIP only.
          </p>
        )}
        <div className="specialist-precise-location__actions">
          {!pinned && draft.trim().length >= 5 ? (
            <button
              type="button"
              className="smoac-control specialist-precise-location__pin"
              onClick={() => void handlePinTyped()}
              disabled={disabled || busy}
            >
              {busy ? "Pinning…" : "Pin this address"}
            </button>
          ) : null}
          {pinned || draft.trim() ? (
            <button
              type="button"
              className="smoac-control specialist-precise-location__clear"
              onClick={handleClear}
              disabled={disabled || busy}
            >
              Use ZIP only
            </button>
          ) : null}
        </div>
      </div>

      {error ? (
        <p className="wizard-field-error specialist-precise-location__error" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}
