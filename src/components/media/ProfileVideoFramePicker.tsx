"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { SmoacSavingMark } from "@/components/brand/SmoacSavingMark";
import { useBlockingModalOpen } from "@/hooks/useBlockingModalOpen";
import {
  captureVideoFrameDataUrl,
  formatClipSecondsLabel,
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
  const [objectUrl] = useState(() => URL.createObjectURL(file));
  const [time, setTime] = useState(0);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const maxTime = Math.max(0, duration);

  useBlockingModalOpen(true);

  useEffect(() => {
    return () => {
      URL.revokeObjectURL(objectUrl);
    };
  }, [objectUrl]);

  async function seekTo(nextTime: number) {
    const video = videoRef.current;
    if (!video) return;
    const clamped = Math.min(maxTime, Math.max(0, nextTime));
    setTime(clamped);
    await new Promise<void>((resolve) => {
      const onSeeked = () => {
        video.removeEventListener("seeked", onSeeked);
        resolve();
      };
      video.addEventListener("seeked", onSeeked);
      video.currentTime = clamped;
    });
  }

  async function handleConfirm() {
    const video = videoRef.current;
    if (!video || saving) return;
    setSaving(true);
    setError(null);
    try {
      await seekTo(time);
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
        <video
          ref={videoRef}
          src={objectUrl}
          className="profile-photo-cropper__video"
          muted
          playsInline
          preload="metadata"
          onLoadedMetadata={() => {
            void seekTo(0);
          }}
        />
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
              value={time}
              disabled={saving || maxTime <= 0}
              onChange={(event) => {
                void seekTo(Number.parseFloat(event.target.value));
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
            disabled={saving}
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
