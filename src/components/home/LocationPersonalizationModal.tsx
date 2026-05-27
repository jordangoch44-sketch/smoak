"use client";

import { useCallback, useEffect, useId, useState } from "react";
import { createPortal } from "react-dom";
import { cn } from "@/lib/utils";
import { isValidZipCode, normalizeZipCode } from "@/lib/zip-to-marketplace-city";
import {
  completeGeolocation,
  completeZipEntry,
  skipLocationPrompt,
} from "@/lib/user-location-store";

type ModalView = "prompt" | "zip";

interface LocationPersonalizationModalProps {
  open: boolean;
  onClose: () => void;
}

export function LocationPersonalizationModal({
  open,
  onClose,
}: LocationPersonalizationModalProps) {
  const zipFieldId = useId();
  const zipErrorId = useId();
  const [view, setView] = useState<ModalView>("prompt");
  const [zip, setZip] = useState("");
  const [zipTouched, setZipTouched] = useState(false);
  const [geoLoading, setGeoLoading] = useState(false);
  const [geoError, setGeoError] = useState<string | null>(null);

  const resetState = useCallback(() => {
    setView("prompt");
    setZip("");
    setZipTouched(false);
    setGeoLoading(false);
    setGeoError(null);
  }, []);

  const handleSkip = useCallback(() => {
    skipLocationPrompt();
    onClose();
  }, [onClose]);

  useEffect(() => {
    if (!open) resetState();
  }, [open, resetState]);

  useEffect(() => {
    if (!open) return;

    document.body.classList.add("location-personalization-open");
    document.documentElement.classList.add("location-personalization-open");

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") handleSkip();
    }

    window.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.classList.remove("location-personalization-open");
      document.documentElement.classList.remove(
        "location-personalization-open"
      );
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [open, handleSkip]);

  const handleUseLocation = useCallback(() => {
    setGeoError(null);

    if (typeof navigator === "undefined" || !navigator.geolocation) {
      setView("zip");
      setGeoError("Location is unavailable on this device. Enter your ZIP code.");
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
        onClose();
      },
      () => {
        setGeoLoading(false);
        setView("zip");
        setGeoError("Location access was denied. Enter your ZIP code instead.");
      },
      {
        enableHighAccuracy: false,
        timeout: 12_000,
        maximumAge: 300_000,
      }
    );
  }, [onClose]);

  const handleZipSubmit = useCallback(
    (event: React.FormEvent) => {
      event.preventDefault();
      setZipTouched(true);
      const normalized = normalizeZipCode(zip);
      if (!isValidZipCode(normalized)) return;
      completeZipEntry(normalized);
      onClose();
    },
    [onClose, zip]
  );

  const zipInvalid = zipTouched && !isValidZipCode(normalizeZipCode(zip));

  if (!open || typeof document === "undefined") return null;

  return createPortal(
    <div
      className="location-personalization"
      role="presentation"
      onClick={handleSkip}
    >
      <div
        className={cn("location-personalization__dialog")}
        role="dialog"
        aria-modal="true"
        aria-labelledby="location-personalization-title"
        aria-describedby="location-personalization-desc"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="location-personalization__glow" aria-hidden />

        <div className="location-personalization__content">
          <h2
            id="location-personalization-title"
            className="location-personalization__title"
          >
            Find specialists near you
          </h2>
          <p
            id="location-personalization-desc"
            className="location-personalization__body"
          >
            Use your location to personalize search results and show top-rated
            specialists nearby.
          </p>

          {view === "prompt" ? (
            <div className="location-personalization__actions">
              <button
                type="button"
                className="smoac-control location-personalization__btn location-personalization__btn--primary"
                onClick={handleUseLocation}
                disabled={geoLoading}
              >
                {geoLoading ? "Getting location…" : "Use my location"}
              </button>
              <button
                type="button"
                className="smoac-control location-personalization__btn location-personalization__btn--secondary"
                onClick={() => {
                  setGeoError(null);
                  setView("zip");
                }}
                disabled={geoLoading}
              >
                Enter ZIP code instead
              </button>
              <button
                type="button"
                className="smoac-control location-personalization__btn location-personalization__btn--ghost"
                onClick={handleSkip}
                disabled={geoLoading}
              >
                Skip for now
              </button>
            </div>
          ) : (
            <form
              className="location-personalization__zip-form"
              onSubmit={handleZipSubmit}
              noValidate
            >
              <label
                className="location-personalization__zip-label"
                htmlFor={zipFieldId}
              >
                ZIP code
              </label>
              <input
                id={zipFieldId}
                className={cn(
                  "location-personalization__zip-input",
                  zipInvalid && "location-personalization__zip-input--invalid"
                )}
                type="text"
                inputMode="numeric"
                autoComplete="postal-code"
                placeholder="92101"
                maxLength={5}
                value={zip}
                onChange={(event) =>
                  setZip(normalizeZipCode(event.target.value))
                }
                onBlur={() => setZipTouched(true)}
                aria-invalid={zipInvalid}
                aria-describedby={zipInvalid ? zipErrorId : undefined}
              />
              {zipInvalid ? (
                <p
                  id={zipErrorId}
                  className="location-personalization__zip-error"
                  role="alert"
                >
                  Enter a valid 5-digit US ZIP code.
                </p>
              ) : null}
              {geoError ? (
                <p className="location-personalization__geo-hint" role="status">
                  {geoError}
                </p>
              ) : null}
              <button
                type="submit"
                className="smoac-control location-personalization__btn location-personalization__btn--primary"
                disabled={!isValidZipCode(normalizeZipCode(zip))}
              >
                Save ZIP code
              </button>
              <button
                type="button"
                className="smoac-control location-personalization__btn location-personalization__btn--ghost"
                onClick={() => {
                  setView("prompt");
                  setZipTouched(false);
                }}
              >
                Back
              </button>
            </form>
          )}
        </div>
      </div>
    </div>,
    document.body
  );
}
