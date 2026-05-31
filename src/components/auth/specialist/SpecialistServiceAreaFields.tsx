"use client";

import { useEffect, useRef, useState } from "react";
import {
  SPECIALIST_SERVICE_TYPE_OPTIONS,
  SPECIALIST_TRAVEL_RADIUS_OPTIONS,
} from "@/types/specialist-service-area";
import { lookupZipPlace } from "@/lib/geo/zip-place-lookup";
import { serviceTypeToDeliveryFlags } from "@/lib/specialist-service-area";
import { isValidZipCode, normalizeZipCode } from "@/lib/zip-to-marketplace-city";
import type { SpecialistOnboardingState } from "@/types/specialist-application";
import type { SpecialistServiceType } from "@/types/specialist-service-area";
import { cn } from "@/lib/utils";

interface SpecialistServiceAreaFieldsProps {
  state: SpecialistOnboardingState;
  onPatch: (partial: Partial<SpecialistOnboardingState>) => void;
}

export function SpecialistServiceAreaFields({
  state,
  onPatch,
}: SpecialistServiceAreaFieldsProps) {
  const [zipLookupBusy, setZipLookupBusy] = useState(false);
  const [zipLookupError, setZipLookupError] = useState<string | null>(null);
  const lastResolvedZip = useRef("");

  const normalizedZip = normalizeZipCode(state.zipCode);
  const zipValid = isValidZipCode(normalizedZip);

  useEffect(() => {
    if (!zipValid || normalizedZip === lastResolvedZip.current) return;

    let cancelled = false;
    setZipLookupBusy(true);
    setZipLookupError(null);

    void lookupZipPlace(normalizedZip).then((result) => {
      if (cancelled) return;
      setZipLookupBusy(false);
      if (!result) {
        setZipLookupError(
          "We couldn't detect city for this ZIP. Double-check the code or try a nearby ZIP."
        );
        return;
      }
      lastResolvedZip.current = normalizedZip;
      onPatch({
        zipCode: result.zip,
        city: result.city,
        state: result.state,
        latitude: result.latitude ?? null,
        longitude: result.longitude ?? null,
      });
    });

    return () => {
      cancelled = true;
    };
  }, [normalizedZip, zipValid, onPatch]);

  function handleZipChange(raw: string) {
    const digits = raw.replace(/\D/g, "").slice(0, 5);
    setZipLookupError(null);
    if (digits.length < 5) {
      lastResolvedZip.current = "";
    }
    onPatch({ zipCode: digits });
  }

  function selectServiceType(serviceType: SpecialistServiceType) {
    const flags = serviceTypeToDeliveryFlags(serviceType);
    onPatch({ serviceType, ...flags });
  }

  return (
    <div className="login-fields specialist-service-area-fields">
      <fieldset className="login-field specialist-service-area-fields__section">
        <legend className="login-field__label">Primary ZIP code</legend>
        <input
          className="login-field__input"
          value={state.zipCode}
          onChange={(e) => handleZipChange(e.target.value)}
          inputMode="numeric"
          pattern="[0-9]*"
          autoComplete="postal-code"
          placeholder="92129"
          maxLength={5}
          aria-invalid={state.zipCode.length === 5 && !zipValid}
          aria-describedby="specialist-zip-hint"
        />
        <p id="specialist-zip-hint" className="wizard-field-hint">
          {zipLookupBusy
            ? "Looking up your city…"
            : zipValid && state.city
              ? `Detected: ${state.city}, ${state.state}`
              : "Enter your 5-digit US ZIP — we'll detect city and state."}
        </p>
        {zipLookupError ? (
          <p className="wizard-field-error" role="alert">
            {zipLookupError}
          </p>
        ) : null}
      </fieldset>

      <fieldset className="login-field specialist-service-area-fields__section">
        <legend className="login-field__label">Service type</legend>
        <div className="wizard-pill-grid wizard-pill-grid--wide" role="radiogroup">
          {SPECIALIST_SERVICE_TYPE_OPTIONS.map((option) => {
            const active = state.serviceType === option.value;
            return (
              <button
                key={option.value}
                type="button"
                role="radio"
                aria-checked={active}
                onClick={() => selectServiceType(option.value)}
                className={cn(
                  "wizard-pill wizard-pill--touch",
                  active && "wizard-pill--active"
                )}
              >
                {option.label}
              </button>
            );
          })}
        </div>
      </fieldset>

      <fieldset className="login-field specialist-service-area-fields__section">
        <legend className="login-field__label">
          Travel radius
          <span className="login-field__label-hint">
            How far are you willing to travel for clients?
          </span>
        </legend>
        <div className="wizard-pill-grid wizard-pill-grid--wide" role="radiogroup">
          {SPECIALIST_TRAVEL_RADIUS_OPTIONS.map((option) => {
            const active = state.travelRadius === option.value;
            return (
              <button
                key={option.value}
                type="button"
                role="radio"
                aria-checked={active}
                onClick={() => onPatch({ travelRadius: option.value })}
                className={cn(
                  "wizard-pill wizard-pill--touch",
                  active && "wizard-pill--active"
                )}
              >
                {option.label}
              </button>
            );
          })}
        </div>
      </fieldset>

      <label className="login-field">
        <span className="login-field__label">
          Service area description
          <span className="login-field__label-hint">Optional</span>
        </span>
        <textarea
          className="login-field__input login-field__textarea"
          rows={3}
          value={state.serviceAreaDescription}
          onChange={(e) => onPatch({ serviceAreaDescription: e.target.value })}
          placeholder="I primarily serve San Diego, La Jolla, Del Mar, Carmel Valley, and Mira Mesa."
        />
      </label>
    </div>
  );
}
