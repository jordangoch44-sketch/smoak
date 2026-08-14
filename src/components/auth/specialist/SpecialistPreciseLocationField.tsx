"use client";

import { useEffect, useState } from "react";
import { geocodeUsAddress } from "@/lib/geo/forward-geocode";
import { cn } from "@/lib/utils";

export type SpecialistLocationPrecision = "zip" | "address";

export interface SpecialistPreciseLocationValue {
  workAddress: string;
  locationPrecision: SpecialistLocationPrecision;
  latitude: number | null;
  longitude: number | null;
  /** Optional ZIP / city / state when geocode returns them */
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
 * Optional street / studio address for in-person distance accuracy.
 * Street text is for specialist account use — public marketplace uses lat/lng only.
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
  const [draft, setDraft] = useState(workAddress);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setDraft(workAddress);
  }, [workAddress]);

  function handleChange(value: string) {
    setDraft(value);
    setError(null);
    onDraftChange?.(value);
  }

  async function handlePin() {
    const query = draft.trim();
    if (query.length < 5) {
      setError("Enter a street address, then pin it.");
      return;
    }

    setBusy(true);
    setError(null);
    const result = await geocodeUsAddress(query);
    setBusy(false);

    if (!result) {
      setError(
        "We couldn't find that address. Check the street and ZIP, or use ZIP only."
      );
      return;
    }

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
  }

  function handleClear() {
    setDraft("");
    setError(null);
    onCleared();
  }

  const pinned = locationPrecision === "address" && Boolean(workAddress.trim());

  return (
    <div className={cn("login-field specialist-precise-location", className)}>
      <span className="login-field__label">
        Exact work / studio address
        <span className="login-field__label-hint">Optional</span>
      </span>
      <p className="wizard-field-hint specialist-precise-location__hint">
        Improves distance for nearby clients. Your street address stays private —
        leave blank to use ZIP only.
      </p>
      <input
        className="login-field__input"
        value={draft}
        onChange={(e) => handleChange(e.target.value)}
        autoComplete="street-address"
        placeholder="123 Main St, San Diego, CA 92101"
        disabled={disabled || busy}
        aria-describedby="specialist-precise-location-hint"
      />
      <div className="specialist-precise-location__actions">
        <button
          type="button"
          className="smoac-control login-submit specialist-precise-location__pin"
          onClick={() => void handlePin()}
          disabled={disabled || busy || draft.trim().length < 5}
        >
          {busy ? "Pinning…" : pinned ? "Update pin" : "Pin location"}
        </button>
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
      <p
        id="specialist-precise-location-hint"
        className="wizard-field-hint"
        role="status"
      >
        {pinned
          ? "Pinned — distance uses this exact location."
          : "ZIP is enough if you prefer not to share a street address."}
      </p>
      {error ? (
        <p className="wizard-field-error" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}
