"use client";

import { useCallback, useEffect, useId, useMemo, useState } from "react";
import {
  lookupLocalZipPlace,
  UNKNOWN_ZIP_AREA_LABEL,
} from "@/lib/geo/zip-place-names";
import {
  clearUserLocationAsync,
  completeGeolocationAsync,
  completeZipEntryAsync,
} from "@/lib/user-location-store";
import { loadSavedZipCode } from "@/lib/user-location-storage";
import { isValidZipCode, normalizeZipCode } from "@/lib/zip-to-marketplace-city";
import { useUserLocation } from "@/hooks/useUserLocation";
import { cn } from "@/lib/utils";

interface LocationSelectorPanelProps {
  onUpdated: () => void;
  /** Full-screen first-visit gate — required location, no clear. */
  mode?: "dropdown" | "gate";
}

const GATE_CATEGORY_CHIPS = [
  { id: "trainer", label: "Trainer", tone: "blue" },
  { id: "pt", label: "Physical Therapy", tone: "mint" },
  { id: "boxing", label: "Boxing Coach", tone: "amber" },
  { id: "dance", label: "Dance Instructor", tone: "magenta" },
  { id: "nutrition", label: "Nutritionist", tone: "green" },
  { id: "yoga", label: "Yoga", tone: "lavender" },
  { id: "strength", label: "Strength Coach", tone: "violet" },
  { id: "massage", label: "Massage", tone: "cyan" },
] as const;

function formatPanelLocationSummary(
  placeName: string | null,
  zip: string | null,
  isUnknownArea: boolean
): string | null {
  if (zip && placeName) return `${placeName} · ${zip}`;
  if (zip && isUnknownArea) return `${UNKNOWN_ZIP_AREA_LABEL} · ${zip}`;
  if (zip) return zip;
  return placeName;
}

export function LocationSelectorPanel({
  onUpdated,
  mode = "dropdown",
}: LocationSelectorPanelProps) {
  const isGate = mode === "gate";
  const {
    city: savedPlace,
    zip: savedZip,
    isUnknownArea,
    hasLocation,
  } = useUserLocation();
  const activeSummary = formatPanelLocationSummary(
    savedPlace,
    savedZip,
    isUnknownArea
  );

  const zipFieldId = useId();
  const [zip, setZip] = useState("");
  const [zipTouched, setZipTouched] = useState(false);
  const [geoLoading, setGeoLoading] = useState(false);
  const [zipSubmitting, setZipSubmitting] = useState(false);
  const [clearing, setClearing] = useState(false);
  const [geoError, setGeoError] = useState<string | null>(null);
  const [zipResolveError, setZipResolveError] = useState<string | null>(null);

  useEffect(() => {
    queueMicrotask(() => {
      setZip(loadSavedZipCode() ?? "");
      setZipTouched(false);
      setGeoError(null);
      setZipResolveError(null);
    });
  }, []);

  const submitZip = useCallback(
    async (value: string) => {
      const normalized = normalizeZipCode(value);
      if (!isValidZipCode(normalized)) return;

      setZipTouched(true);
      setZipResolveError(null);
      setZipSubmitting(true);

      const result = await completeZipEntryAsync(normalized);
      setZipSubmitting(false);

      if (!result.ok) {
        setZipResolveError(result.message);
        return;
      }

      onUpdated();
    },
    [onUpdated]
  );

  const zipPreviewPlace = useMemo(() => {
    const normalized = normalizeZipCode(zip);
    if (!isValidZipCode(normalized)) return null;
    return lookupLocalZipPlace(normalized)?.placeName ?? null;
  }, [zip]);

  const zipInvalid = zipTouched && !isValidZipCode(normalizeZipCode(zip));

  const handleUpdateZip = useCallback(
    (event: React.FormEvent) => {
      event.preventDefault();
      void submitZip(zip);
    },
    [submitZip, zip]
  );

  const handleClearLocation = useCallback(async () => {
    setGeoError(null);
    setZipResolveError(null);
    setClearing(true);
    const result = await clearUserLocationAsync();
    setClearing(false);
    if (!result.ok) {
      setGeoError(result.message || "Couldn’t clear location. Try again.");
      return;
    }
    setZip("");
    setZipTouched(false);
    onUpdated();
  }, [onUpdated]);

  const handleUseLocation = useCallback(() => {
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
            onUpdated();
          } catch {
            setGeoError(
              "Couldn’t finish locating you. Enter your ZIP code instead."
            );
          } finally {
            setGeoLoading(false);
          }
        })();
      },
      (error) => {
        setGeoLoading(false);
        if (error.code === error.PERMISSION_DENIED) {
          setGeoError(
            "Location access was denied. Allow location for SMOAC in Safari settings, or enter your ZIP."
          );
          return;
        }
        if (error.code === error.TIMEOUT) {
          setGeoError("Location timed out. Try again or enter your ZIP.");
          return;
        }
        setGeoError("Couldn’t read your location. Enter your ZIP code instead.");
      },
      {
        enableHighAccuracy: true,
        timeout: 20_000,
        maximumAge: 0,
      }
    );
  }, [onUpdated]);

  const busy = geoLoading || zipSubmitting || clearing;

  return (
    <div
      className={cn(
        "location-selector-panel__body",
        isGate && "location-selector-panel__body--gate"
      )}
    >
      <header className="location-selector-panel__header">
        <p className="location-selector-panel__eyebrow">
          {isGate ? "Welcome to SMOAC" : "Your market"}
        </p>
        {!isGate && activeSummary ? (
          <p className="location-selector-panel__active-location">
            {activeSummary}
          </p>
        ) : null}
        <h2 className="location-selector-panel__title">
          {isGate ? "Find specialists near you" : "Set your location"}
        </h2>
        {isGate ? (
          <ul
            className="site-location-gate__categories"
            aria-label="Specialists you can find on SMOAC"
          >
            {GATE_CATEGORY_CHIPS.map((chip) => (
              <li
                key={chip.id}
                className={`site-location-gate__chip site-location-gate__chip--${chip.tone}`}
              >
                <span className="site-location-gate__chip-dot" aria-hidden />
                {chip.label}
              </li>
            ))}
          </ul>
        ) : (
          <p className="location-selector-panel__lede">
            Search ranks specialists by how close they are to you. Use your
            current location or enter a ZIP to continue.
          </p>
        )}
      </header>

      <button
        type="button"
        className="smoac-control location-selector-panel__btn location-selector-panel__btn--primary"
        onClick={handleUseLocation}
        disabled={busy}
      >
        {geoLoading
          ? "Finding your location…"
          : isGate
            ? "Use my location"
            : "Allow SMOAC to use your location"}
      </button>
      {geoError ? (
        <p className="location-selector-panel__error" role="status">
          {geoError}
        </p>
      ) : null}

      <div className="location-selector-panel__divider" aria-hidden />

      <form className="location-selector-panel__form" onSubmit={handleUpdateZip}>
        <label className="location-selector-panel__label" htmlFor={zipFieldId}>
          {isGate ? "Enter ZIP code" : "Or enter ZIP code"}
        </label>
        <input
          id={zipFieldId}
          className={cn(
            "location-selector-panel__input",
            zipInvalid && "location-selector-panel__input--invalid"
          )}
          type="text"
          inputMode="numeric"
          autoComplete="postal-code"
          placeholder="92101"
          maxLength={5}
          value={zip}
          onChange={(event) => {
            setZip(normalizeZipCode(event.target.value));
            setZipResolveError(null);
          }}
          onBlur={() => setZipTouched(true)}
          enterKeyHint="done"
          autoCorrect="off"
          autoCapitalize="off"
          spellCheck={false}
          aria-invalid={zipInvalid || Boolean(zipResolveError)}
          aria-describedby={
            zipInvalid || zipResolveError ? `${zipFieldId}-feedback` : undefined
          }
        />
        {zipPreviewPlace ? (
          <p className="location-selector-panel__hint">
            Resolves to <span>{zipPreviewPlace}</span>
          </p>
        ) : null}
        {zipInvalid ? (
          <p
            id={`${zipFieldId}-feedback`}
            className="location-selector-panel__error"
            role="alert"
          >
            Enter a valid 5-digit US ZIP code.
          </p>
        ) : null}
        {!zipInvalid && zipResolveError ? (
          <p
            id={`${zipFieldId}-feedback`}
            className="location-selector-panel__error"
            role="alert"
          >
            {zipResolveError}
          </p>
        ) : null}

        <button
          type="submit"
          className="smoac-control location-selector-panel__btn location-selector-panel__btn--secondary"
          disabled={!isValidZipCode(normalizeZipCode(zip)) || busy}
        >
          {zipSubmitting
            ? isGate
              ? "Continuing…"
              : "Updating…"
            : isGate
              ? "Continue with ZIP"
              : "Update location"}
        </button>
      </form>

      {!isGate && (hasLocation || activeSummary) ? (
        <>
          <div className="location-selector-panel__divider" aria-hidden />
          <button
            type="button"
            className="smoac-control location-selector-panel__btn location-selector-panel__btn--clear"
            onClick={() => void handleClearLocation()}
            disabled={busy}
          >
            {clearing ? "Clearing…" : "Clear location"}
          </button>
          <p className="location-selector-panel__clear-hint">
            Removes your saved ZIP so Search isn’t ranked from that area.
          </p>
        </>
      ) : null}
    </div>
  );
}
