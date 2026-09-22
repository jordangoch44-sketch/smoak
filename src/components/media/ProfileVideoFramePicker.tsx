"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { SmoacSavingMark } from "@/components/brand/SmoacSavingMark";
import { useBlockingModalOpen } from "@/hooks/useBlockingModalOpen";
import {
  captureVideoFrameDataUrl,
  formatClipSecondsLabel,
  primeVideoPreviewFrame,
  seekVideoToTime,
} from "@/lib/media/video-file";
import { cn } from "@/lib/utils";
import "@/styles/profile-photo-cropper.css";

interface ProfileVideoFramePickerProps {
  file: File;
  duration: number;
  stepBadge?: string;
  onCancel: () => void;
  onSave: (posterDataUrl: string, time: number) => void | Promise<void>;
}

export function ProfileVideoFramePicker({
  file,
  duration,
  stepBadge,
  onCancel,
  onSave,
}: ProfileVideoFramePickerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [objectUrl, setObjectUrl] = useState<string | null>(null);
  const [time, setTime] = useState(0);
  const [previewReady, setPreviewReady] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const maxTime = Math.max(0, duration);

  useBlockingModalOpen(true);

  useEffect(() => {
    const url = URL.createObjectURL(file);
    setObjectUrl(url);
    return () => {
      URL.revokeObjectURL(url);
    };
  }, [file]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video || !objectUrl) return;
    let cancelled = false;
    setPreviewReady(false);
    void (async () => {
      try {
        const start = await primeVideoPreviewFrame(video);
        if (cancelled) return;
        setTime(start);
        setPreviewReady(true);
      } catch (previewError) {
        if (cancelled) return;
        setError(
          previewError instanceof Error
            ? previewError.message
            : "Could not play this video. Try another clip."
        );
      }
    })();
    return () => {
      cancelled = true;
      video.pause();
    };
  }, [objectUrl]);

  async function handleConfirm() {
    const video = videoRef.current;
    if (!video || saving || !previewReady) return;
    setSaving(true);
    setError(null);
    try {
      await seekVideoToTime(video, time);
      const posterDataUrl = await captureVideoFrameDataUrl(video);
      await onSave(posterDataUrl, time);
    } catch (saveError) {
      setError(
        saveError instanceof Error
          ? saveError.message
          : "Could not save that thumbnail."
      );
    } finally {
      setSaving(false);
    }
  }

  const modal = (
    <div
      className="profile-photo-cropper profile-video-frame-picker"
      role="dialog"
      aria-modal="true"
      aria-labelledby="profile-video-frame-title"
    >
      <header className="profile-photo-cropper__header">
        <button
          type="button"
          className="profile-photo-cropper__close-btn"
          onClick={onCancel}
          disabled={saving}
          aria-label="Cancel and close"
        >
          ×
        </button>
        {stepBadge ? (
          <div className="profile-photo-cropper__badge-wrap">
            <span className="profile-photo-cropper__badge">{stepBadge}</span>
          </div>
        ) : null}
        <h2
          id="profile-video-frame-title"
          className="profile-photo-cropper__title"
        >
          Choose thumbnail
        </h2>
        <p className="profile-photo-cropper__lead">
          Drag to pick the still people see on your profile. The clip is{" "}
          {formatClipSecondsLabel(duration)}.
        </p>
      </header>

      <div className="profile-photo-cropper__stage">
        {objectUrl ? (
          <video
            key={objectUrl}
            ref={videoRef}
            src={objectUrl}
            className="profile-photo-cropper__video"
            muted
            playsInline
            preload="auto"
            onError={() => {
              const video = videoRef.current;
              if (!video || video.getAttribute("src") !== objectUrl) return;
              setPreviewReady(false);
              setError("Could not play this video. Try another clip.");
            }}
          />
        ) : null}
        {!previewReady && !error ? (
          <p className="profile-video-frame-picker__loading">Loading preview…</p>
        ) : null}
      </div>

      <div className="profile-photo-cropper__controls">
        <div className="profile-photo-cropper__toolbar">
          <div className="profile-photo-cropper__zoom-wrap">
            <span className="profile-photo-cropper__zoom-label">Frame</span>
            <input
              type="range"
              min={0}
              max={maxTime || 0}
              step={0.05}
              value={Math.min(time, maxTime || 0)}
              disabled={saving || !previewReady || maxTime <= 0}
              onChange={(event) => {
                const next = Number.parseFloat(event.target.value);
                const video = videoRef.current;
                setTime(next);
                if (video) void seekVideoToTime(video, next);
              }}
              className="profile-photo-cropper__zoom-input"
              aria-label="Thumbnail frame"
            />
            <span className="profile-photo-cropper__zoom-label">
              {formatClipSecondsLabel(time)}
            </span>
          </div>
        </div>

        {error ? (
          <p className="profile-photo-cropper__error" role="alert">
            {error}
          </p>
        ) : null}

        <footer
          className={cn(
            "profile-photo-cropper__footer",
            "profile-photo-cropper__footer--simple"
          )}
        >
          <button
            type="button"
            className="profile-photo-cropper__btn profile-photo-cropper__btn--cancel"
            disabled={saving}
            onClick={onCancel}
          >
            Cancel
          </button>
          <button
            type="button"
            className="profile-photo-cropper__btn profile-photo-cropper__btn--confirm"
            disabled={saving || !previewReady}
            onClick={() => void handleConfirm()}
          >
            {saving ? "Uploading…" : "Use this frame"}
          </button>
        </footer>
      </div>

      {saving ? (
        <div className="profile-photo-cropper__saving">
          <SmoacSavingMark label="Uploading" />
        </div>
      ) : null}
    </div>
  );

  if (typeof document === "undefined") return null;
  return createPortal(modal, document.body);
}
