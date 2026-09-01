"use client";

import { useEffect, useRef, useState } from "react";
import {
  SPECIALIST_SERVICE_TYPE_OPTIONS,
} from "@/types/specialist-service-area";
import { SpecialistPreciseLocationField } from "@/components/auth/specialist/SpecialistPreciseLocationField";
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
  const wantsPreciseLocation =
    state.serviceType === "in-person" || state.serviceType === "both";
  const pinnedAddress =
    state.locationPrecision === "address" &&
    Boolean(state.facilityAddress.trim());

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
      /* Keep pinned street coords — ZIP only fills city/state (+ coords when not pinned). */
      onPatch({
        zipCode: result.zip,
        city: result.city,
        state: result.state,
        ...(pinnedAddress
          ? {}
          : {
              latitude: result.latitude ?? null,
              longitude: result.longitude ?? null,
              locationPrecision: "zip" as const,
            }),
      });
    });

    return () => {
      cancelled = true;
    };
  }, [normalizedZip, zipValid, onPatch, pinnedAddress]);

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
    if (serviceType === "virtual") {
      onPatch({
        serviceType,
        ...flags,
        facilityAddress: "",
        locationPrecision: "zip",
      });
      /* Re-resolve ZIP coords on next zip effect if needed */
      lastResolvedZip.current = "";
      return;
    }
    onPatch({ serviceType, ...flags });
  }

  async function clearPreciseLocation() {
    onPatch({
      facilityAddress: "",
      locationPrecision: "zip",
    });
    if (!zipValid) {
      onPatch({ latitude: null, longitude: null });
      return;
    }
    lastResolvedZip.current = "";
    const result = await lookupZipPlace(normalizedZip);
    if (!result) return;
    lastResolvedZip.current = normalizedZip;
    onPatch({
      facilityAddress: "",
      locationPrecision: "zip",
      city: result.city || state.city,
      state: result.state || state.state,
      latitude: result.latitude ?? null,
      longitude: result.longitude ?? null,
    });
  }

  return (
    <div className="login-fields specialist-service-area-fields">
      <fieldset className="login-field specialist-service-area-fields__section">
        <legend className="login-field__label">
          Primary ZIP code
          {state.serviceType !== "virtual" ? (
            <span className="login-field__label-required" aria-hidden="true">
              *
            </span>
          ) : null}
        </legend>
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
          aria-required={state.serviceType !== "virtual"}
          required={state.serviceType !== "virtual"}
        />
        <p id="specialist-zip-hint" className="wizard-field-hint">
          {zipLookupBusy
            ? "Looking up your city…"
            : zipValid && state.city
              ? `Detected: ${state.city}, ${state.state}`
              : "5-digit US ZIP — we'll detect city and state."}
        </p>
        {zipLookupError ? (
          <p className="wizard-field-error" role="alert">
            {zipLookupError}
          </p>
        ) : null}
      </fieldset>

      <fieldset className="login-field specialist-service-area-fields__section">
        <legend className="login-field__label">
          Service type
          <span className="login-field__label-required" aria-hidden="true">
            *
          </span>
        </legend>
        <div
          className="wizard-pill-grid wizard-pill-grid--wide"
          role="radiogroup"
          aria-label="Service type"
          aria-required="true"
        >
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

      {wantsPreciseLocation ? (
        <SpecialistPreciseLocationField
          workAddress={state.facilityAddress}
          locationPrecision={state.locationPrecision === "address" ? "address" : "zip"}
          onDraftChange={(workAddress) => onPatch({ facilityAddress: workAddress })}
          onResolved={(value) =>
            onPatch({
              facilityAddress: value.workAddress,
              locationPrecision: "address",
              latitude: value.latitude,
              longitude: value.longitude,
              ...(value.zipCode ? { zipCode: value.zipCode } : {}),
              ...(value.city ? { city: value.city } : {}),
              ...(value.state ? { state: value.state } : {}),
            })
          }
          onCleared={() => {
            void clearPreciseLocation();
          }}
        />
      ) : state.serviceType === "virtual" ? (
        <p className="wizard-field-hint">
          Virtual coaches don&apos;t need a street address.
        </p>
      ) : null}

      <label className="login-field">
        <span className="login-field__label">Service area description</span>
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
