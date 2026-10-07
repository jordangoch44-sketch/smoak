"use client";

import { useEffect, useId, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { FastActivateButton } from "@/components/ui/FastActivateButton";
import { CloseIcon } from "@/components/ui/icons";
import { lockOverlayDocumentScroll } from "@/lib/lock-overlay-scroll";
import type { ClientWorkoutDay } from "@/types/client-workout";
import {
  buildWorkoutStickerCard,
  canvasToPngBlob,
  renderWorkoutSticker,
  shareWorkoutSticker,
  workoutShareSummary,
  WORKOUT_STICKER_OPTIONS,
  type WorkoutStickerId,
} from "@/lib/workouts/workout-share-sticker";

const LOCK_CLASS = "client-workouts-open";

interface StickerAsset {
  url: string;
  blob: Blob;
}

/** Slide-up share sheet after Nice. Two sticker previews, each sharing a transparent PNG. */
export function WorkoutShareSheet({
  workout,
  streakWeeks,
  onClose,
}: {
  workout: ClientWorkoutDay;
  streakWeeks: number;
  onClose: () => void;
}) {
  const titleId = useId();
  const card = useMemo(
    () => buildWorkoutStickerCard(workout, streakWeeks),
    [workout, streakWeeks]
  );
  const summary = workoutShareSummary(card);
  const [assets, setAssets] = useState<Partial<Record<WorkoutStickerId, StickerAsset>>>({});
  const [pendingId, setPendingId] = useState<WorkoutStickerId | null>(null);
  const [note, setNote] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    const alreadyLocked = document.body.classList.contains(LOCK_CLASS);
    if (!alreadyLocked) {
      document.body.classList.add(LOCK_CLASS);
      document.documentElement.classList.add(LOCK_CLASS);
    }
    const unlock = alreadyLocked ? null : lockOverlayDocumentScroll();
    return () => {
      unlock?.();
      if (!alreadyLocked) {
        document.body.classList.remove(LOCK_CLASS);
        document.documentElement.classList.remove(LOCK_CLASS);
      }
    };
  }, []);

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key !== "Escape") return;
      event.preventDefault();
      onClose();
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onClose]);

  useEffect(() => {
    let cancelled = false;
    const urls: string[] = [];
    void (async () => {
      try {
        await document.fonts.ready;
        if (cancelled) return;
        const next: Partial<Record<WorkoutStickerId, StickerAsset>> = {};
        for (const option of WORKOUT_STICKER_OPTIONS) {
          const canvas = await renderWorkoutSticker(option.id, card);
          const blob = await canvasToPngBlob(canvas);
          if (cancelled) return;
          const url = URL.createObjectURL(blob);
          urls.push(url);
          next[option.id] = { url, blob };
          setAssets({ ...next });
        }
      } catch {
        if (!cancelled) setFailed(true);
      }
    })();
    return () => {
      cancelled = true;
      for (const url of urls) URL.revokeObjectURL(url);
    };
  }, [card]);

  async function share(id: WorkoutStickerId) {
    const asset = assets[id];
    if (!asset || pendingId) return;
    setPendingId(id);
    setNote(null);
    try {
      const result = await shareWorkoutSticker(asset.blob);
      setNote(result === "shared" ? "Shared." : "Saved to your downloads.");
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") return;
      setNote("Couldn’t share this sticker.");
    } finally {
      setPendingId(null);
    }
  }

  if (typeof document === "undefined") return null;

  return createPortal(
    <div className="workout-share" role="presentation">
      <button type="button" className="workout-share__backdrop" aria-label="Close" onClick={onClose} />
      <div
        className="workout-share__sheet"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
      >
        <div className="workout-share__grab" aria-hidden />
        <div className="workout-share__top">
          <h2 id={titleId} className="workout-share__title">
            Share your workout
          </h2>
          <FastActivateButton className="workout-share__close" aria-label="Close" onActivate={onClose}>
            <CloseIcon className="h-4 w-4" />
          </FastActivateButton>
        </div>
        <p className="workout-share__summary">{summary}</p>
        {card.censored ? (
          <p className="workout-share__note">That name can’t be shared.</p>
        ) : null}
        <div className="workout-share__body">
          {failed ? <p className="workout-share__note">Couldn’t prepare the stickers.</p> : null}
          {WORKOUT_STICKER_OPTIONS.map((option) => {
            const asset = assets[option.id];
            const busy = pendingId === option.id;
            return (
              <section key={option.id} className="workout-share__option">
                <p className="workout-share__label">{option.label}</p>
                <div className="workout-share__preview">
                  {asset ? (
                    <img src={asset.url} alt={`${option.label}, ${card.title}`} />
                  ) : (
                    <span className="workout-share__preview-wait">Preparing sticker…</span>
                  )}
                </div>
                <FastActivateButton
                  className="client-workouts-btn client-workouts-btn--primary workout-share__share"
                  disabled={!asset || pendingId !== null}
                  onActivate={() => void share(option.id)}
                >
                  {busy ? "Sharing…" : "Share"}
                </FastActivateButton>
              </section>
            );
          })}
          {note ? (
            <p className="workout-share__note" role="status">
              {note}
            </p>
          ) : null}
          <FastActivateButton className="client-workouts-btn client-workouts-btn--ghost" onActivate={onClose}>
            Not now
          </FastActivateButton>
        </div>
      </div>
    </div>,
    document.body
  );
}
