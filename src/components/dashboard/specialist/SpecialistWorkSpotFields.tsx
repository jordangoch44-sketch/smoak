"use client";

import { SpecialistPreciseLocationField } from "@/components/auth/specialist/SpecialistPreciseLocationField";
import { lookupZipPlace } from "@/lib/geo/zip-place-lookup";
import { isValidZipCode, normalizeZipCode } from "@/lib/zip-to-marketplace-city";
import { cn } from "@/lib/utils";
import type { SpecialistWorkSpot } from "@/types/specialist-service-area";

interface SpecialistWorkSpotFieldsProps {
  value: SpecialistWorkSpot;
  onChange: (next: SpecialistWorkSpot) => void;
  showAddress: boolean;
  heading?: string;
  headingHint?: string;
  addressLabel?: string;
  addressHint?: string;
  virtualHint?: string;
  onRemove?: () => void;
  className?: string;
}

export function SpecialistWorkSpotFields({
  value,
  onChange,
  showAddress,
  heading,
  headingHint,
  addressLabel,
  addressHint,
  virtualHint = "Virtual coaches don’t need a street address. Switch session format below if you also train in person.",
  onRemove,
  className,
}: SpecialistWorkSpotFieldsProps) {
  function patch(partial: Partial<SpecialistWorkSpot>) {
    onChange({ ...value, ...partial });
  }

  async function clearPinnedAddress() {
    const zip = normalizeZipCode(value.zipCode);
    const result = isValidZipCode(zip) ? await lookupZipPlace(zip) : null;
    onChange({
      ...value,
      workAddress: "",
      locationPrecision: "zip",
      latitude: result?.latitude ?? null,
      longitude: result?.longitude ?? null,
      ...(result?.city ? { city: result.city } : {}),
    });
  }

  return (
    <div className={cn("specialist-work-spot", className)}>
      {heading || headingHint || onRemove ? (
        <div className="specialist-work-spot__head">
          <div className="specialist-work-spot__head-copy">
            {heading ? (
              <p className="specialist-work-spot__heading">{heading}</p>
            ) : null}
            {headingHint ? (
              <p className="specialist-work-spot__heading-hint">{headingHint}</p>
            ) : null}
          </div>
          {onRemove ? (
            <button
              type="button"
              className="smoac-control specialist-work-spot__remove"
              onClick={onRemove}
            >
              Remove
            </button>
          ) : null}
        </div>
      ) : null}

      {showAddress ? (
        <SpecialistPreciseLocationField
          workAddress={value.workAddress}
          locationPrecision={value.locationPrecision}
          label={addressLabel}
          hint={addressHint}
          onDraftChange={(workAddress) => patch({ workAddress })}
          onResolved={(resolved) =>
            onChange({
              ...value,
              workAddress: resolved.workAddress,
              locationPrecision: "address",
              latitude: resolved.latitude,
              longitude: resolved.longitude,
              ...(resolved.zipCode ? { zipCode: resolved.zipCode } : {}),
              ...(resolved.city ? { city: resolved.city } : {}),
            })
          }
          onCleared={() => {
            void clearPinnedAddress();
          }}
        />
      ) : (
        <p className="wizard-field-hint">{virtualHint}</p>
      )}

      <div className="specialist-work-spot__meta">
        <label className="login-field">
          <span className="login-field__label">City</span>
          <input
            className="login-field__input profile-edit-input"
            value={value.city}
            onChange={(e) => patch({ city: e.target.value })}
          />
        </label>
        <label className="login-field">
          <span className="login-field__label">Neighborhood</span>
          <input
            className="login-field__input profile-edit-input"
            value={value.neighborhood}
            onChange={(e) => patch({ neighborhood: e.target.value })}
          />
        </label>
        <label className="login-field specialist-work-spot__zip">
          <span className="login-field__label">ZIP code</span>
          <input
            className="login-field__input profile-edit-input"
            inputMode="numeric"
            autoComplete="postal-code"
            value={value.zipCode}
            onChange={(e) => patch({ zipCode: e.target.value })}
          />
        </label>
      </div>
    </div>
  );
}
