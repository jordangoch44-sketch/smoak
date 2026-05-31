"use client";

import { useCallback, useEffect, useId, useMemo, useState } from "react";
import { MARKETPLACE_CITIES } from "@/data/locations";
import { getDefaultZipForMarketplaceCity } from "@/lib/marketplace-city-default-zip";
import { getRecentZipCodes } from "@/lib/recent-zip-storage";
import {
  lookupLocalZipPlace,
  UNKNOWN_ZIP_AREA_LABEL,
} from "@/lib/geo/zip-place-names";
import {
  completeGeolocation,
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
  const cityFieldId = useId();
  const [zip, setZip] = useState("");
  const [zipTouched, setZipTouched] = useState(false);
  const [cityQuery, setCityQuery] = useState("");
  const [geoLoading, setGeoLoading] = useState(false);
  const [zipSubmitting, setZipSubmitting] = useState(false);
  const [geoError, setGeoError] = useState<string | null>(null);
  const [zipResolveError, setZipResolveError] = useState<string | null>(null);
  const [recentZips, setRecentZips] = useState<string[]>([]);

  useEffect(() => {
    queueMicrotask(() => {
      setZip(loadSavedZipCode() ?? "");
      setZipTouched(false);
      setCityQuery("");
      setGeoError(null);
      setZipResolveError(null);
      setRecentZips(getRecentZipCodes());
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

  const cityMatches = useMemo(() => {
    const q = cityQuery.trim().toLowerCase();
    if (!q) return [];
    return MARKETPLACE_CITIES.filter((city) =>
      city.toLowerCase().includes(q)
    ).slice(0, 6);
  }, [cityQuery]);

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
        completeGeolocation(
          position.coords.latitude,
          position.coords.longitude
        );
        setGeoLoading(false);
        onUpdated();
      },
      () => {
        setGeoLoading(false);
        setGeoError("Location access was denied. Enter your ZIP code instead.");
      },
      {
        enableHighAccuracy: false,
        timeout: 12_000,
        maximumAge: 300_000,
      }
    );
  }, [onUpdated]);

  const applyZip = useCallback(
    (value: string) => {
      setZip(normalizeZipCode(value));
      void submitZip(value);
    },
    [submitZip]
  );

  const handleCityPick = useCallback(
    (city: string) => {
      const defaultZip = getDefaultZipForMarketplaceCity(city);
      if (!defaultZip) return;
      setZip(defaultZip);
      void submitZip(defaultZip);
    },
    [submitZip]
  );

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
          Personalize rankings, search, and saved specialists near you.
        </p>
      </header>

      <form className="location-selector-panel__form" onSubmit={handleUpdateZip}>
        <label className="location-selector-panel__label" htmlFor={zipFieldId}>
          ZIP code
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
          className="smoac-control location-selector-panel__btn location-selector-panel__btn--primary"
          disabled={
            !isValidZipCode(normalizeZipCode(zip)) || zipSubmitting || geoLoading
          }
        >
          {zipSubmitting ? "Updating…" : "Update location"}
        </button>
      </form>

      <div className="location-selector-panel__divider" aria-hidden />

      <label className="location-selector-panel__label" htmlFor={cityFieldId}>
        Search by city
      </label>
      <input
        id={cityFieldId}
        className="location-selector-panel__input"
        type="search"
        placeholder="San Diego, Los Angeles…"
        value={cityQuery}
        onChange={(event) => setCityQuery(event.target.value)}
        autoComplete="off"
      />
      {cityMatches.length > 0 ? (
        <ul className="location-selector-panel__city-list">
          {cityMatches.map((city) => (
            <li key={city}>
              <button
                type="button"
                className="smoac-control location-selector-panel__city-option"
                onClick={() => handleCityPick(city)}
              >
                {city}
              </button>
            </li>
          ))}
        </ul>
      ) : null}

      <button
        type="button"
        className="smoac-control location-selector-panel__btn location-selector-panel__btn--secondary"
        onClick={handleUseLocation}
        disabled={geoLoading}
      >
        {geoLoading ? "Getting location…" : "Use current location"}
      </button>
      {geoError ? (
        <p className="location-selector-panel__error" role="status">
          {geoError}
        </p>
      ) : null}

      {recentZips.length > 0 ? (
        <div className="location-selector-panel__recents">
          <p className="location-selector-panel__recents-label">Recent</p>
          <div className="location-selector-panel__recents-row">
            {recentZips.map((item) => (
              <button
                key={item}
                type="button"
                className="smoac-control location-selector-panel__recent-chip"
                onClick={() => applyZip(item)}
              >
                {item}
              </button>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}
