"use client";

import { useCallback, useEffect, useId, useMemo, useState } from "react";
import {
  lookupLocalZipPlace,
  UNKNOWN_ZIP_AREA_LABEL,
} from "@/lib/geo/zip-place-names";
import {
  completeGeolocationAsync,
  completeZipEntryAsync,
} from "@/lib/user-location-store";
import { loadSavedZipCode } from "@/lib/user-location-storage";
import { isValidZipCode, normalizeZipCode } from "@/lib/zip-to-marketplace-city";
import { SmoacSavingOverlay } from "@/components/brand/SmoacSavingMark";
import { LocationMarkIcon } from "@/components/ui/icons";
import { useUserLocation } from "@/hooks/useUserLocation";
import { cn } from "@/lib/utils";

interface LocationSelectorPanelProps {
  onUpdated: () => void;
  /** Search-page popup — ZIP / GPS opt-in, skip uses IP. */
  mode?: "dropdown" | "gate";
  onSkip?: () => void;
}

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
  onSkip,
}: LocationSelectorPanelProps) {
  const isGate = mode === "gate";
  const {
    city: savedPlace,
    zip: savedZip,
    isUnknownArea,
  } = useUserLocation();
  const activeSummary = formatPanelLocationSummary(
    savedPlace,
    savedZip,
    isUnknownArea
  );

  const zipFieldId = useId();
  const titleId = useId();
  const [zip, setZip] = useState("");
  const [zipTouched, setZipTouched] = useState(false);
  const [geoLoading, setGeoLoading] = useState(false);
  const [zipSubmitting, setZipSubmitting] = useState(false);
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

  const busy = geoLoading || zipSubmitting;

  return (
    <div
      className={cn(
        "location-selector-panel__body",
        isGate && "location-selector-panel__body--gate"
      )}
    >
      <header className="location-selector-panel__header">
        <div className="location-selector-panel__pin" aria-hidden>
          <LocationMarkIcon className="location-selector-panel__pin-icon" />
        </div>
        <h2 id={titleId} className="location-selector-panel__title">
          {isGate ? "Search near you" : "Search your area"}
        </h2>
        <p className="location-selector-panel__lede">
          {isGate
            ? "Share your location or enter a ZIP — or skip for now."
            : "For more accurate search results."}
        </p>
      </header>

      {!isGate ? (
        <div className="location-selector-panel__current">
          <span className="location-selector-panel__current-icon" aria-hidden>
            <LocationMarkIcon className="location-selector-panel__current-mark" />
          </span>
          <span className="location-selector-panel__current-text">
            {activeSummary ?? "No location set"}
          </span>
          <button
            type="button"
            className="smoac-control location-selector-panel__use-chip"
            onClick={handleUseLocation}
            disabled={busy}
          >
            {geoLoading ? "Finding…" : "Use my location"}
          </button>
        </div>
      ) : (
        <button
          type="button"
          className="smoac-control location-selector-panel__btn location-selector-panel__btn--gps"
          onClick={handleUseLocation}
          disabled={busy}
        >
          {geoLoading ? "Finding your location…" : "Use my location"}
        </button>
      )}

      {geoError ? (
        <p className="location-selector-panel__error" role="status">
          {geoError}
        </p>
      ) : null}

      <div className="location-selector-panel__or" aria-hidden>
        <span className="location-selector-panel__or-line" />
        <span className="location-selector-panel__or-label">OR</span>
        <span className="location-selector-panel__or-line" />
      </div>

      <form
        className="location-selector-panel__form"
        onSubmit={handleUpdateZip}
      >
        <label
          className="location-selector-panel__label"
          htmlFor={zipFieldId}
        >
          Enter ZIP code
        </label>
        <div
          className={cn(
            "location-selector-panel__input-shell",
            zipInvalid && "location-selector-panel__input-shell--invalid"
          )}
        >
          <LocationMarkIcon className="location-selector-panel__input-icon" />
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
              zipInvalid || zipResolveError
                ? `${zipFieldId}-feedback`
                : undefined
            }
          />
        </div>
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
          className="smoac-control location-selector-panel__btn location-selector-panel__btn--primary"
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

      {isGate && onSkip ? (
        <button
          type="button"
          className="smoac-control location-selector-panel__btn location-selector-panel__btn--skip"
          onClick={onSkip}
          disabled={busy}
        >
          Not now
        </button>
      ) : (
        <p className="location-selector-panel__privacy">
          <svg
            className="location-selector-panel__privacy-icon"
            viewBox="0 0 24 24"
            fill="none"
            aria-hidden
          >
            <path
              d="M12 3.5c-2.4 1.35-4.9 2-7.5 2v6.4c0 4.35 3.05 7.95 7.5 9.1 4.45-1.15 7.5-4.75 7.5-9.1V5.5c-2.6 0-5.1-.65-7.5-2z"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinejoin="round"
            />
          </svg>
          We never share your exact location
        </p>
      )}

      {geoLoading ? (
        <SmoacSavingOverlay label="Finding your location" />
      ) : null}
    </div>
  );
}
