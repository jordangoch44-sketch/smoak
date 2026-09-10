"use client";

import { useState } from "react";
import type { Trainer } from "@/types";
import { GoogleMark } from "@/components/brand/GoogleMark";
import {
  DashboardButton,
  DashboardCollapsibleSection,
} from "@/components/dashboard/shared";
import {
  applyGooglePlaceSnapshotToSocial,
  readGooglePlaceSnapshotFromTrainer,
} from "@/lib/google-reviews-display";
import { formatReputationRating } from "@/lib/specialist-reputation";
import {
  getApprovedSpecialistProfileById,
  patchApprovedSpecialistProfileFields,
  refreshApprovedSpecialistProfilesFromRemote,
} from "@/lib/approved-specialist-profiles-store";
import type { GooglePlaceSnapshot } from "@/lib/google-places";
import { cn } from "@/lib/utils";

interface GoogleReviewsCardProps {
  trainer: Trainer | undefined;
  isPremium: boolean;
  onUpgrade?: () => void;
  defaultOpen?: boolean;
}

const CONNECT_STEPS = [
  "Open Google Maps",
  "Search your business",
  "Tap Share",
  "Copy the link",
  "Paste it here",
] as const;

async function postGoogleConnect(
  placeIdOrUrl: string
): Promise<{ ok: true; snapshot: GooglePlaceSnapshot } | { ok: false; message: string }> {
  try {
    const response = await fetch("/api/specialist/google-reviews/connect", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ placeIdOrUrl }),
    });
    const payload = (await response.json().catch(() => null)) as {
      ok?: boolean;
      message?: string;
      snapshot?: GooglePlaceSnapshot;
    } | null;
    if (!response.ok || !payload?.ok || !payload.snapshot) {
      return {
        ok: false,
        message: payload?.message || "Could not connect Google Reviews.",
      };
    }
    return { ok: true, snapshot: payload.snapshot };
  } catch {
    return { ok: false, message: "Network error. Try again." };
  }
}

export function GoogleReviewsCard({
  trainer,
  isPremium,
  onUpgrade,
  defaultOpen = false,
}: GoogleReviewsCardProps) {
  const [value, setValue] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [localSnapshot, setLocalSnapshot] = useState<GooglePlaceSnapshot | null>(
    null
  );

  const profileId = trainer?.id ?? "";
  const fromTrainer = readGooglePlaceSnapshotFromTrainer(trainer);
  const snapshot = localSnapshot ?? (fromTrainer.connected
    ? {
        placeId: fromTrainer.placeId,
        mapsUrl: fromTrainer.mapsUrl,
        rating: fromTrainer.rating,
        reviewCount: fromTrainer.reviewCount,
        fetchedAt: fromTrainer.fetchedAt,
      }
    : null);
  const connected = Boolean(snapshot?.placeId);

  function applySnapshot(next: GooglePlaceSnapshot) {
    setLocalSnapshot(next);
    if (profileId) {
      const current = getApprovedSpecialistProfileById(profileId);
      if (current) {
        patchApprovedSpecialistProfileFields(profileId, {
          social: applyGooglePlaceSnapshotToSocial(current.social, next),
        });
      }
    }
    refreshApprovedSpecialistProfilesFromRemote();
  }

  async function handleConnect() {
    const trimmed = value.trim();
    if (!trimmed || busy) return;
    setBusy(true);
    setError(null);
    const result = await postGoogleConnect(trimmed);
    setBusy(false);
    if (!result.ok) {
      setError(result.message);
      return;
    }
    setValue("");
    applySnapshot(result.snapshot);
  }

  async function handleRefresh() {
    const placeId = snapshot?.placeId?.trim() ?? "";
    if (!placeId || busy) return;
    setBusy(true);
    setError(null);
    const result = await postGoogleConnect(placeId);
    setBusy(false);
    if (!result.ok) {
      setError(result.message);
      return;
    }
    applySnapshot(result.snapshot);
  }

  const summary = connected
    ? snapshot?.rating != null
      ? `★ ${formatReputationRating(snapshot.rating)} · ${snapshot.reviewCount}`
      : "Connected"
    : isPremium
      ? "Connect"
      : "Pro";

  return (
    <DashboardCollapsibleSection
      title="Google Reviews"
      icon={<GoogleMark className="dashboard-accordion__brand-mark dashboard-accordion__brand-mark--google" />}
      description={
        connected
          ? "Live stars on your public profile. Refresh to pull new Google reviews."
          : "Show live Google stars on your public profile."
      }
      summary={summary}
      defaultOpen={defaultOpen}
      span="full"
      className={cn(
        "dashboard-google-reviews-card dashboard-glass-premium dashboard-glow-border"
      )}
    >
      {!isPremium ? (
        <div className="dashboard-google-reviews">
          <p className="dashboard-google-reviews__lead">
            Connecting Google Reviews is included with SMOAC Pro.
          </p>
          <DashboardButton type="button" onClick={() => onUpgrade?.()}>
            Unlock with Pro
          </DashboardButton>
        </div>
      ) : connected ? (
        <div className="dashboard-google-reviews">
          <div className="dashboard-google-reviews__connected">
            <div className="dashboard-google-reviews__stats">
              {snapshot?.rating != null ? (
                <p className="dashboard-google-reviews__rating">
                  ★ {formatReputationRating(snapshot.rating)}
                </p>
              ) : null}
              <p className="dashboard-google-reviews__count">
                {snapshot?.reviewCount ?? 0} Google review
                {(snapshot?.reviewCount ?? 0) === 1 ? "" : "s"}
              </p>
            </div>
            <DashboardButton
              type="button"
              variant="secondary"
              disabled={busy}
              onClick={() => void handleRefresh()}
            >
              {busy ? "Refreshing…" : "Refresh new reviews"}
            </DashboardButton>
          </div>
          {error ? (
            <p className="dashboard-connect-google-form__error" role="alert">
              {error}
            </p>
          ) : null}
        </div>
      ) : (
        <div className="dashboard-google-reviews">
          <ol className="dashboard-google-reviews__steps">
            {CONNECT_STEPS.map((step) => (
              <li key={step}>{step}</li>
            ))}
          </ol>
          <form
            className="dashboard-connect-google-form"
            onSubmit={(event) => {
              event.preventDefault();
              void handleConnect();
            }}
          >
            <label className="login-field">
              <span className="login-field__label">Maps share link</span>
              <input
                className="login-field__input"
                value={value}
                onChange={(event) => setValue(event.target.value)}
                placeholder="https://maps.app.goo.gl/…"
                autoComplete="off"
                disabled={busy}
              />
            </label>
            {error ? (
              <p className="dashboard-connect-google-form__error" role="alert">
                {error}
              </p>
            ) : null}
            <DashboardButton type="submit" disabled={busy || !value.trim()}>
              {busy ? "Connecting…" : "Connect Google Reviews"}
            </DashboardButton>
          </form>
        </div>
      )}
    </DashboardCollapsibleSection>
  );
}
