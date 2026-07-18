"use client";

import { useCallback, useEffect, useState } from "react";
import Cropper, { type Area, type Point } from "react-easy-crop";
import { createPortal } from "react-dom";
import { getCroppedImageDataUrl } from "@/lib/media/crop-image";
import { useBlockingModalOpen } from "@/hooks/useBlockingModalOpen";
import type { ProfilePhotoCropSettings } from "@/types/specialist-application";

export interface ProfilePhotoCropperProps {
  imageSrc: string;
  initialCrop?: Point;
  initialZoom?: number;
  aspect?: number;
  /** Circular mask for avatar preview (output file remains square). */
  cropShape?: "rect" | "round";
  title?: string;
  lead?: string;
  confirmLabel?: string;
  confirmingLabel?: string;
  onCancel: () => void;
  /**
   * Called after the crop is rendered.
   * May return a Promise — the modal stays open in a loading state until it settles.
   * Throw / reject to keep the crop open and show an error.
   */
  onSave: (
    croppedImageData: string,
    cropSettings: ProfilePhotoCropSettings,
    croppedAreaPixels: Area
  ) => void | Promise<void>;
}

export function ProfilePhotoCropper({
  imageSrc,
  initialCrop = { x: 0, y: 0 },
  initialZoom = 1,
  aspect = 1,
  cropShape = "rect",
  title = "Crop Profile Photo",
  lead = "Drag to reposition. Pinch or use slider to zoom.",
  confirmLabel = "Confirm Crop",
  confirmingLabel = "Saving…",
  onCancel,
  onSave,
}: ProfilePhotoCropperProps) {
  const [crop, setCrop] = useState<Point>(initialCrop);
  const [zoom, setZoom] = useState(initialZoom);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setCrop(initialCrop);
    setZoom(initialZoom);
    setError(null);
  }, [imageSrc, initialCrop.x, initialCrop.y, initialZoom]);

  useBlockingModalOpen(true);

  const onCropComplete = useCallback((_area: Area, pixels: Area) => {
    setCroppedAreaPixels(pixels);
  }, []);

  async function handleConfirm() {
    if (!croppedAreaPixels || saving) return;
    setSaving(true);
    setError(null);
    try {
      const croppedImageData = await getCroppedImageDataUrl(
        imageSrc,
        croppedAreaPixels
      );
      await onSave(
        croppedImageData,
        { x: crop.x, y: crop.y, zoom },
        croppedAreaPixels
      );
    } catch (saveError) {
      setError(
        saveError instanceof Error
          ? saveError.message
          : "Could not save crop. Please try again."
      );
    } finally {
      setSaving(false);
    }
  }

  const modal = (
    <div
      className="profile-photo-cropper"
      role="dialog"
      aria-modal="true"
      aria-labelledby="profile-photo-crop-title"
    >
      <header className="profile-photo-cropper__header">
        <h2 id="profile-photo-crop-title" className="profile-photo-cropper__title">
          {title}
        </h2>
        <p className="profile-photo-cropper__lead">{lead}</p>
      </header>

      <div className="profile-photo-cropper__stage">
        <Cropper
          image={imageSrc}
          crop={crop}
          zoom={zoom}
          aspect={aspect}
          cropShape={cropShape}
          showGrid={false}
          restrictPosition
          onCropChange={setCrop}
          onZoomChange={setZoom}
          onCropComplete={onCropComplete}
        />
      </div>

      <div className="profile-photo-cropper__controls">
        <label className="profile-photo-cropper__zoom">
          <span className="profile-photo-cropper__zoom-label">Zoom</span>
          <input
            type="range"
            min={1}
            max={3}
            step={0.05}
            value={zoom}
            disabled={saving}
            onChange={(e) => setZoom(Number.parseFloat(e.target.value))}
            className="profile-photo-cropper__zoom-input"
            aria-valuemin={1}
            aria-valuemax={3}
            aria-valuenow={zoom}
          />
        </label>

        {error ? (
          <p className="profile-photo-cropper__error" role="alert">
            {error}
          </p>
        ) : null}

        <footer className="profile-photo-cropper__footer">
          <button
            type="button"
            className="wizard-nav__back profile-photo-cropper__btn"
            disabled={saving}
            onClick={onCancel}
          >
            Cancel
          </button>
          <button
            type="button"
            className="login-submit wizard-nav__continue profile-photo-cropper__btn"
            disabled={saving || !croppedAreaPixels}
            onClick={() => void handleConfirm()}
          >
            {saving ? confirmingLabel : confirmLabel}
          </button>
        </footer>
      </div>
    </div>
  );

  if (typeof document === "undefined") {
    return null;
  }

  return createPortal(modal, document.body);
}
