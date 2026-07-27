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
import { useUserLocation } from "@/hooks/useUserLocation";
import { cn } from "@/lib/utils";

interface LocationSelectorPanelProps {
  onUpdated: () => void;
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

export function LocationSelectorPanel({ onUpdated }: LocationSelectorPanelProps) {
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
          const result = await completeGeolocationAsync(
            position.coords.latitude,
            position.coords.longitude
          );
          setGeoLoading(false);
          if (!result.ok) {
            setGeoError(result.message);
            return;
          }
          onUpdated();
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

  return (
    <div className="location-selector-panel__body">
      <header className="location-selector-panel__header">
        <p className="location-selector-panel__eyebrow">Your market</p>
        {activeSummary ? (
          <p className="location-selector-panel__active-location">
            {activeSummary}
          </p>
        ) : null}
        <h2 className="location-selector-panel__title">Set your location</h2>
        <p className="location-selector-panel__lede">
          Allow SMOAC to use your location for the most accurate specialists near
          you — or enter a ZIP.
        </p>
      </header>

      <button
        type="button"
        className="smoac-control location-selector-panel__btn location-selector-panel__btn--primary"
        onClick={handleUseLocation}
        disabled={geoLoading || zipSubmitting}
      >
        {geoLoading
          ? "Finding your location…"
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
          Or enter ZIP code
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
          disabled={
            !isValidZipCode(normalizeZipCode(zip)) || zipSubmitting || geoLoading
          }
        >
          {zipSubmitting ? "Updating…" : "Update location"}
        </button>
      </form>
    </div>
  );
}
