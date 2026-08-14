"use client";

import { useId, useState, type ChangeEvent } from "react";
import { ProfileMediaUploadField } from "@/components/dashboard/specialist/ProfileMediaUploadField";
import { isMarketplaceSupabaseActive } from "@/lib/auth/marketplace-auth";
import { prepareImageDataUrlForUpload } from "@/lib/media/crop-image";
import {
  normalizePinnedPhotos,
  parseMediaUrlList,
  PINNED_PHOTOS_MAX,
  promoteMediaUrl,
  serializeMediaUrlList,
  specialistMediaLimitsForPlan,
} from "@/lib/specialist-media-limits";
import { SPECIALIST_STORAGE_ACCEPT } from "@/lib/supabase/constants";
import { cn } from "@/lib/utils";

interface SpecialistProfileMediaEditorProps {
  profilePhotoUrl: string;
  coverImageUrl: string;
  photoNotes: string;
  videoNotes: string;
  pinnedPhotos: string[];
  isPremium: boolean;
  specialistId?: string | null;
  onChange: (patch: {
    profilePhotoUrl?: string;
    coverImageUrl?: string;
    photoNotes?: string;
    videoNotes?: string;
    pinnedPhotos?: string[];
  }) => void;
}

function rejectUnsupportedPhonePhoto(file: File): string | null {
  const type = (file.type || "").toLowerCase();
  const name = file.name.toLowerCase();
  if (
    type.includes("heic") ||
    type.includes("heif") ||
    name.endsWith(".heic") ||
    name.endsWith(".heif")
  ) {
    return "Use JPEG or PNG (on iPhone: Format → Most Compatible).";
  }
  return null;
}

async function uploadGalleryImage(
  specialistId: string | null | undefined,
  file: File
): Promise<string> {
  const phoneReject = rejectUnsupportedPhonePhoto(file);
  if (phoneReject) throw new Error(phoneReject);

  const dataUrl = await prepareImageDataUrlForUpload(file, "gallery");
  const id = specialistId?.trim();
  if (!id || !isMarketplaceSupabaseActive()) return dataUrl;

  const stamp = Date.now().toString(36);
  const basePath = `${id}/gallery/g-${stamp}/image`;
  const response = await fetch("/api/media/specialist-application", {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ path: basePath, dataUrl }),
  });
  const payload = (await response.json().catch(() => null)) as
    | { ok: boolean; publicUrl?: string; message?: string }
    | null;
  if (!response.ok || !payload?.ok || !payload.publicUrl) {
    throw new Error(
      payload?.message ??
        (response.status === 413
          ? "Photo is too large to upload."
          : "Could not upload image.")
    );
  }
  const publicUrl = payload.publicUrl.includes("?")
    ? `${payload.publicUrl}&v=${stamp}`
    : `${payload.publicUrl}?v=${stamp}`;
  return publicUrl;
}

/** Profile photo, header slideshow, and pins — short labels, clear actions. */
export function SpecialistProfileMediaEditor({
  profilePhotoUrl,
  coverImageUrl,
  photoNotes,
  videoNotes,
  pinnedPhotos,
  isPremium,
  specialistId,
  onChange,
}: SpecialistProfileMediaEditorProps) {
  const limits = specialistMediaLimitsForPlan(isPremium);
  const headerImages = parseMediaUrlList(photoNotes);
  const headerVideos = parseMediaUrlList(videoNotes);
  const pins = normalizePinnedPhotos(pinnedPhotos, headerImages);
  const cover = coverImageUrl.trim() || headerImages[0] || "";
  const inputId = useId();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [brokenHeaderUrls, setBrokenHeaderUrls] = useState<string[]>([]);

  const atImageLimit = headerImages.length >= limits.images;
  const atVideoLimit = headerVideos.length >= limits.videos;
  const atPinLimit = pins.length >= PINNED_PHOTOS_MAX;

  function markHeaderBroken(url: string) {
    setBrokenHeaderUrls((prev) =>
      prev.includes(url) ? prev : [...prev, url]
    );
  }

  function setHeaderImages(next: string[], nextPins?: string[]) {
    const trimmed = next.map((url) => url.trim()).filter(Boolean);
    const nextCover =
      cover && trimmed.includes(cover) ? cover : trimmed[0] || "";
    setBrokenHeaderUrls((prev) => prev.filter((url) => trimmed.includes(url)));
    onChange({
      photoNotes: serializeMediaUrlList(trimmed),
      coverImageUrl: nextCover,
      pinnedPhotos: normalizePinnedPhotos(nextPins ?? pins, trimmed),
    });
  }

  function setHeaderVideos(next: string[]) {
    onChange({ videoNotes: serializeMediaUrlList(next) });
  }

  function makeCover(url: string) {
    const promoted = promoteMediaUrl(headerImages, url);
    onChange({
      photoNotes: serializeMediaUrlList(promoted),
      coverImageUrl: url.trim(),
      pinnedPhotos: normalizePinnedPhotos(pins, promoted),
    });
  }

  function togglePin(url: string) {
    if (!isPremium) {
      setError("Pinned photos unlock with Pro.");
      return;
    }
    const trimmed = url.trim();
    if (!trimmed || !headerImages.includes(trimmed)) return;
    if (pins.includes(trimmed)) {
      onChange({
        pinnedPhotos: pins.filter((item) => item !== trimmed),
      });
      return;
    }
    if (atPinLimit) {
      setError(`You can pin up to ${PINNED_PHOTOS_MAX} photos.`);
      return;
    }
    setError(null);
    onChange({ pinnedPhotos: [...pins, trimmed] });
  }

  async function handleAddHeaderImage(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    if (atImageLimit) {
      setError(
        isPremium
          ? `Pro allows up to ${limits.images} header images.`
          : `Free includes ${limits.images} header images.`
      );
      return;
    }

    setBusy(true);
    setError(null);
    try {
      const url = await uploadGalleryImage(specialistId, file);
      setHeaderImages([...headerImages, url]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="specialist-media-editor">
      <ProfileMediaUploadField
        label="Profile photo"
        value={profilePhotoUrl}
        onChange={(value) => {
          setError(null);
          onChange({ profilePhotoUrl: value });
        }}
        aspect="square"
        specialistId={specialistId}
        mediaKind="profile"
        onClear={() => onChange({ profilePhotoUrl: "" })}
      />

      <div className="specialist-media-editor__header-block">
        <div className="specialist-media-editor__header-top">
          <p className="login-field__label">Header slideshow</p>
          <p className="specialist-media-editor__limit">
            {headerImages.length}/{limits.images}
            {!isPremium ? " · Free" : ""}
          </p>
        </div>

        <div className="specialist-media-editor__thumbs">
          {headerImages.map((url) => {
            const isCover = url === cover;
            const isPinned = pins.includes(url);
            const isBroken = brokenHeaderUrls.includes(url);
            return (
              <div
                key={url}
                className={cn(
                  "specialist-media-editor__thumb",
                  isCover && "specialist-media-editor__thumb--cover",
                  isPinned && "specialist-media-editor__thumb--pinned",
                  isBroken && "specialist-media-editor__thumb--broken"
                )}
              >
                {isBroken ? (
                  <label
                    htmlFor={inputId}
                    className="smoac-control specialist-media-editor__thumb-empty"
                  >
                    <span aria-hidden>+</span>
                    <span>Replace</span>
                  </label>
                ) : (
                  <>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={url}
                      alt=""
                      className="specialist-media-editor__thumb-img"
                      onError={() => markHeaderBroken(url)}
                    />
                    <div className="specialist-media-editor__thumb-actions">
                      <button
                        type="button"
                        className="smoac-control specialist-media-editor__thumb-btn"
                        onClick={() => makeCover(url)}
                        disabled={isCover}
                      >
                        {isCover ? "Cover" : "Set cover"}
                      </button>
                      <button
                        type="button"
                        className={cn(
                          "smoac-control specialist-media-editor__thumb-btn",
                          isPinned &&
                            "specialist-media-editor__thumb-btn--pinned"
                        )}
                        onClick={() => togglePin(url)}
                        disabled={isPremium ? !isPinned && atPinLimit : false}
                      >
                        {isPinned ? "Pinned" : "Pin"}
                      </button>
                      <button
                        type="button"
                        className="smoac-control specialist-media-editor__thumb-btn specialist-media-editor__thumb-btn--danger"
                        onClick={() =>
                          setHeaderImages(
                            headerImages.filter((item) => item !== url),
                            pins.filter((item) => item !== url)
                          )
                        }
                      >
                        Remove
                      </button>
                    </div>
                  </>
                )}
              </div>
            );
          })}

          {!atImageLimit ? (
            <label
              htmlFor={inputId}
              className={cn(
                "smoac-control specialist-media-editor__add",
                busy && "specialist-media-editor__add--busy"
              )}
            >
              <span aria-hidden>+</span>
              <span>{busy ? "Uploading…" : "Add photo"}</span>
            </label>
          ) : null}
        </div>

        <input
          id={inputId}
          type="file"
          accept={`${SPECIALIST_STORAGE_ACCEPT.galleryImage},.jpg,.jpeg,.png,.webp`}
          className="dashboard-upload-zone__input"
          onChange={(event) => void handleAddHeaderImage(event)}
          disabled={busy || atImageLimit}
        />
      </div>

      <div className="specialist-media-editor__pins">
        <p className="login-field__label">
          Pinned photos
          {isPremium ? ` · ${pins.length}/${PINNED_PHOTOS_MAX}` : " · Pro"}
        </p>
        {isPremium ? (
          pins.length > 0 ? (
            <div
              className="specialist-media-editor__pin-row"
              aria-label="Pinned photos"
            >
              {pins.map((url, index) => (
                <button
                  key={url}
                  type="button"
                  className="specialist-media-editor__pin-tile"
                  onClick={() => togglePin(url)}
                  aria-label={`Unpin photo ${index + 1}`}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={url} alt="" />
                  <span className="specialist-media-editor__pin-index">
                    {index + 1}
                  </span>
                </button>
              ))}
            </div>
          ) : (
            <p className="specialist-media-editor__hint">
              Tap Pin on a header photo.
            </p>
          )
        ) : (
          <p className="specialist-media-editor__hint">
            Unlock with Pro — pin up to 3 under your bio.
          </p>
        )}
      </div>

      {isPremium ? (
        <div className="specialist-media-editor__videos">
          <p className="login-field__label">
            Videos · {headerVideos.length}/{limits.videos}
          </p>
          {headerVideos.map((url, index) => (
            <div
              key={`${url}-${index}`}
              className="specialist-media-editor__video-row"
            >
              <input
                className="login-field__input profile-edit-input"
                value={url}
                onChange={(event) => {
                  const next = [...headerVideos];
                  next[index] = event.target.value;
                  setHeaderVideos(next);
                }}
                placeholder="Video URL"
              />
              <button
                type="button"
                className="dashboard-edit-remove"
                onClick={() =>
                  setHeaderVideos(headerVideos.filter((_, i) => i !== index))
                }
              >
                Remove
              </button>
            </div>
          ))}
          {!atVideoLimit ? (
            <button
              type="button"
              className="dashboard-edit-add"
              onClick={() => setHeaderVideos([...headerVideos, ""])}
            >
              + Add video URL
            </button>
          ) : null}
        </div>
      ) : null}

      {error ? (
        <p className="dashboard-upload-error" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}
