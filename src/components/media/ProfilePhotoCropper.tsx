"use client";

import { useCallback, useEffect, useState } from "react";
import Cropper, { type Area, type Point } from "react-easy-crop";
import { createPortal } from "react-dom";
import { SmoacSavingMark } from "@/components/brand/SmoacSavingMark";
import { getCroppedImageDataUrl } from "@/lib/media/crop-image";
import { useBlockingModalOpen } from "@/hooks/useBlockingModalOpen";
import type { ProfilePhotoCropSettings } from "@/types/specialist-application";
import { cn } from "@/lib/utils";
import "@/styles/profile-photo-cropper.css";

export interface AspectRatioPreset {
  id: string;
  label: string;
  value: number | undefined; // undefined for unconstrained / free crop
}

export const GALLERY_ASPECT_PRESETS: AspectRatioPreset[] = [
  { id: "4-5", label: "4:5 Portrait", value: 4 / 5 },
  { id: "1-1", label: "1:1 Square", value: 1 },
  { id: "16-9", label: "16:9 Wide", value: 16 / 9 },
  { id: "4-3", label: "4:3 Classic", value: 4 / 3 },
  { id: "free", label: "Free", value: undefined },
];

export interface ProfilePhotoCropperProps {
  imageSrc: string;
  initialCrop?: Point;
  initialZoom?: number;
  initialRotation?: number;
  aspect?: number;
  aspectPresets?: AspectRatioPreset[];
  showAspectPresets?: boolean;
  /** Circular mask for avatar preview (output file remains square). */
  cropShape?: "rect" | "round";
  title?: string;
  lead?: string;
  stepBadge?: string;
  confirmLabel?: string;
  confirmingLabel?: string;
  skipLabel?: string;
  onSkip?: () => void | Promise<void>;
  /** When `frame-preview`, saves the original image + pan/zoom settings (no file crop). */
  exportMode?: "crop" | "frame-preview";
  /** Hide rotate / reset controls (slideshow framing). */
  hideToolbarExtras?: boolean;
  onCancel: () => void;
  /**
   * Called after the crop is rendered.
   * May return a Promise — the modal stays open in a loading state until it settles.
   * Throw / reject to keep the crop open and show an error.
   */
  onSave: (
    croppedImageData: string,
    cropSettings: ProfilePhotoCropSettings,
    croppedAreaPixels: Area,
    rotation?: number
  ) => void | Promise<void>;
}

export function ProfilePhotoCropper({
  imageSrc,
  initialCrop = { x: 0, y: 0 },
  initialZoom = 1,
  initialRotation = 0,
  aspect = 1,
  aspectPresets,
  showAspectPresets = false,
  cropShape = "rect",
  title = "Adjust Photo",
  lead = "Drag to reposition. Pinch or use the slider to zoom.",
  stepBadge,
  confirmLabel = "Confirm Crop",
  confirmingLabel = "Processing…",
  skipLabel = "Skip Crop",
  onSkip,
  exportMode = "crop",
  hideToolbarExtras = false,
  onCancel,
  onSave,
}: ProfilePhotoCropperProps) {
  const [crop, setCrop] = useState<Point>(initialCrop);
  const [zoom, setZoom] = useState(initialZoom);
  const [rotation, setRotation] = useState(initialRotation);
  const [currentAspect, setCurrentAspect] = useState<number | undefined>(aspect);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null);
  const [croppedAreaPercent, setCroppedAreaPercent] = useState<Area | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const resolvedPresets =
    aspectPresets ?? (showAspectPresets ? GALLERY_ASPECT_PRESETS : undefined);

  useEffect(() => {
    setCrop(initialCrop);
    setZoom(initialZoom);
    setRotation(initialRotation);
    setCurrentAspect(aspect);
    setError(null);
  }, [imageSrc, initialCrop.x, initialCrop.y, initialZoom, initialRotation, aspect]);

  useBlockingModalOpen(true);

  const onCropComplete = useCallback((_area: Area, pixels: Area) => {
    setCroppedAreaPercent(_area);
    setCroppedAreaPixels(pixels);
  }, []);

  function handleRotate90() {
    setRotation((prev) => (prev + 90) % 360);
  }

  function handleReset() {
    setCrop({ x: 0, y: 0 });
    setZoom(1);
    setRotation(0);
    setCurrentAspect(aspect);
  }

  async function handleConfirm() {
    if (!croppedAreaPixels || saving) return;
    setSaving(true);
    setError(null);
    try {
      if (exportMode === "frame-preview") {
        await onSave(
          imageSrc,
          {
            x: crop.x,
            y: crop.y,
            zoom,
            ...(croppedAreaPercent
              ? {
                  areaX: croppedAreaPercent.x,
                  areaY: croppedAreaPercent.y,
                  areaWidth: croppedAreaPercent.width,
                  areaHeight: croppedAreaPercent.height,
                }
              : {}),
          },
          croppedAreaPixels,
          rotation
        );
        return;
      }

      const croppedImageData = await getCroppedImageDataUrl(
        imageSrc,
        croppedAreaPixels,
        "image/jpeg",
        0.92,
        rotation
      );
      await onSave(
        croppedImageData,
        { x: crop.x, y: crop.y, zoom },
        croppedAreaPixels,
        rotation
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

  async function handleSkip() {
    if (!onSkip || saving) return;
    setSaving(true);
    setError(null);
    try {
      await onSkip();
    } catch (skipError) {
      setError(
        skipError instanceof Error
          ? skipError.message
          : "Could not proceed with original photo."
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
          rotation={rotation}
          aspect={currentAspect}
          cropShape={cropShape}
          showGrid={true}
          restrictPosition={currentAspect !== undefined}
          onCropChange={setCrop}
          onZoomChange={setZoom}
          onRotationChange={setRotation}
          onCropComplete={onCropComplete}
        />
      </div>

      <div className="profile-photo-cropper__controls">
        {resolvedPresets && resolvedPresets.length > 0 ? (
          <div className="profile-photo-cropper__aspect-block">
            <span className="profile-photo-cropper__aspect-label">Aspect ratio</span>
            <div className="profile-photo-cropper__aspect-row" role="radiogroup" aria-label="Aspect ratio">
              {resolvedPresets.map((preset) => {
                const isActive =
                  currentAspect === preset.value ||
                  (currentAspect === undefined && preset.value === undefined);
                return (
                  <button
                    key={preset.id}
                    type="button"
                    role="radio"
                    aria-checked={isActive}
                    disabled={saving}
                    className={`profile-photo-cropper__aspect-btn ${
                      isActive ? "profile-photo-cropper__aspect-btn--active" : ""
                    }`}
                    onClick={() => setCurrentAspect(preset.value)}
                  >
                    {preset.label}
                  </button>
                );
              })}
            </div>
          </div>
        ) : null}

        <div className="profile-photo-cropper__toolbar">
          {!hideToolbarExtras ? (
            <div className="profile-photo-cropper__tool-actions">
              <button
                type="button"
                className="profile-photo-cropper__tool-btn"
                disabled={saving}
                onClick={handleRotate90}
                title="Rotate 90 degrees clockwise"
              >
                <span aria-hidden>↺</span>
                <span>Rotate 90°</span>
              </button>
              <button
                type="button"
                className="profile-photo-cropper__tool-btn"
                disabled={saving}
                onClick={handleReset}
                title="Reset position, rotation, and zoom"
              >
                <span>Reset</span>
              </button>
            </div>
          ) : null}

          <div className="profile-photo-cropper__zoom-wrap">
            <span className="profile-photo-cropper__zoom-label">Zoom</span>
            <button
              type="button"
              className="profile-photo-cropper__zoom-step-btn"
              disabled={saving || zoom <= 1}
              onClick={() => setZoom((z) => Math.max(1, +(z - 0.2).toFixed(2)))}
              aria-label="Zoom out"
            >
              −
            </button>
            <input
              type="range"
              min={1}
              max={3}
              step={0.05}
              value={zoom}
              disabled={saving}
              onChange={(e) => setZoom(Number.parseFloat(e.target.value))}
              className="profile-photo-cropper__zoom-input"
              aria-label="Zoom slider"
              aria-valuemin={1}
              aria-valuemax={3}
              aria-valuenow={zoom}
            />
            <button
              type="button"
              className="profile-photo-cropper__zoom-step-btn"
              disabled={saving || zoom >= 3}
              onClick={() => setZoom((z) => Math.min(3, +(z + 0.2).toFixed(2)))}
              aria-label="Zoom in"
            >
              +
            </button>
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
            !onSkip && "profile-photo-cropper__footer--simple"
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
          {onSkip ? (
            <button
              type="button"
              className="profile-photo-cropper__btn profile-photo-cropper__btn--skip"
              disabled={saving}
              onClick={() => void handleSkip()}
            >
              {skipLabel}
            </button>
          ) : null}
          <button
            type="button"
            className="profile-photo-cropper__btn profile-photo-cropper__btn--confirm"
            disabled={saving || !croppedAreaPixels}
            onClick={() => void handleConfirm()}
          >
            {saving ? confirmingLabel : confirmLabel}
          </button>
        </footer>
      </div>

      {saving ? (
        <div className="profile-photo-cropper__saving">
          <SmoacSavingMark label={confirmingLabel.replace("…", "")} />
        </div>
      ) : null}
    </div>
  );

  if (typeof document === "undefined") {
    return null;
  }

  return createPortal(modal, document.body);
}
