"use client";

import { useId, useRef, useState, type ChangeEvent } from "react";
import { ProfileMediaUploadField } from "@/components/dashboard/specialist/ProfileMediaUploadField";
import { isMarketplaceSupabaseActive } from "@/lib/auth/marketplace-auth";
import { readFileAsDataUrl } from "@/lib/media/crop-image";
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

async function uploadGalleryImage(
  specialistId: string,
  file: File
): Promise<string> {
  const dataUrl = await readFileAsDataUrl(file);
  if (!isMarketplaceSupabaseActive()) return dataUrl;

  const basePath = `${specialistId}/gallery/g-${Date.now().toString(36)}/image`;
  const response = await fetch("/api/media/specialist-application", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ path: basePath, dataUrl }),
  });
  const payload = (await response.json().catch(() => null)) as
    | { ok: boolean; publicUrl?: string; message?: string }
    | null;
  if (!response.ok || !payload?.ok || !payload.publicUrl) {
    throw new Error(payload?.message ?? "Could not upload image.");
  }
  return payload.publicUrl;
}

/**
 * Clear directions for display photo vs header slideshow, with free/Pro caps.
 */
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
  const fileRef = useRef<HTMLInputElement>(null);
  const inputId = useId();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const atImageLimit = headerImages.length >= limits.images;
  const atVideoLimit = headerVideos.length >= limits.videos;
  const atPinLimit = pins.length >= PINNED_PHOTOS_MAX;

  function setHeaderImages(next: string[], nextPins?: string[]) {
    const trimmed = next.map((url) => url.trim()).filter(Boolean);
    const nextCover =
      cover && trimmed.includes(cover) ? cover : trimmed[0] || "";
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
    if (!isPremium) return;
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
          : `Free includes ${limits.images} header images. Upgrade for more.`
      );
      return;
    }

    setBusy(true);
    setError(null);
    try {
      const url = specialistId?.trim()
        ? await uploadGalleryImage(specialistId.trim(), file)
        : await readFileAsDataUrl(file);
      setHeaderImages([...headerImages, url]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="specialist-media-editor">
      <div className="specialist-media-editor__guide" role="note">
        <p className="specialist-media-editor__guide-title">How your photos work</p>
        <ol className="specialist-media-editor__guide-list">
          <li>
            <strong>Display photo</strong> — your face on Explore cards, saves,
            and the top-right of your portal.
          </li>
          <li>
            <strong>Header images</strong> — the slideshow behind your name on
            your public profile. Tap one to make it play first.
          </li>
          <li>
            <strong>Pinned photos</strong> — Pro only. Up to three highlights
            clients see under your bio (hidden until you pin).
          </li>
        </ol>
      </div>

      <ProfileMediaUploadField
        label="1. Display photo"
        hint="Square headshot clients recognize"
        value={profilePhotoUrl}
        onChange={(value) => onChange({ profilePhotoUrl: value })}
        aspect="square"
        specialistId={specialistId}
        mediaKind="profile"
        onClear={() => onChange({ profilePhotoUrl: "" })}
      />

      <div className="specialist-media-editor__header-block">
        <div className="specialist-media-editor__header-top">
          <div>
            <p className="login-field__label">2. Header slideshow</p>
            <p className="specialist-media-editor__limit">
              {headerImages.length} / {limits.images} images
              {!isPremium ? " · Free plan" : " · Pro"}
            </p>
          </div>
        </div>
        <p className="specialist-media-editor__hint">
          These images rotate as the big header on your live profile. The one
          marked Cover shows first.
        </p>

        <div className="specialist-media-editor__thumbs">
          {headerImages.map((url) => {
            const isCover = url === cover;
            const isPinned = pins.includes(url);
            return (
              <div
                key={url}
                className={cn(
                  "specialist-media-editor__thumb",
                  isCover && "specialist-media-editor__thumb--cover",
                  isPinned && "specialist-media-editor__thumb--pinned"
                )}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={url} alt="" className="specialist-media-editor__thumb-img" />
                <div className="specialist-media-editor__thumb-actions">
                  <button
                    type="button"
                    className="smoac-control specialist-media-editor__thumb-btn"
                    onClick={() => makeCover(url)}
                    disabled={isCover}
                  >
                    {isCover ? "Cover" : "Make cover"}
                  </button>
                  {isPremium ? (
                    <button
                      type="button"
                      className={cn(
                        "smoac-control specialist-media-editor__thumb-btn",
                        isPinned && "specialist-media-editor__thumb-btn--pinned"
                      )}
                      onClick={() => togglePin(url)}
                      disabled={!isPinned && atPinLimit}
                    >
                      {isPinned ? "Pinned" : "Pin"}
                    </button>
                  ) : null}
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
              </div>
            );
          })}

          {!atImageLimit ? (
            <button
              type="button"
              className="smoac-control specialist-media-editor__add"
              onClick={() => fileRef.current?.click()}
              disabled={busy}
            >
              <span aria-hidden>+</span>
              <span>{busy ? "Uploading…" : "Add image"}</span>
            </button>
          ) : null}
        </div>

        <input
          ref={fileRef}
          id={inputId}
          type="file"
          accept={SPECIALIST_STORAGE_ACCEPT.galleryImage}
          className="dashboard-upload-zone__input"
          onChange={(event) => void handleAddHeaderImage(event)}
          tabIndex={-1}
        />

        {atImageLimit && !isPremium ? (
          <p className="specialist-media-editor__upsell">
            Free includes {limits.images} header images. Pro unlocks 8 images +
            2 videos.
          </p>
        ) : null}
      </div>

      <div className="specialist-media-editor__pins">
        <p className="login-field__label">3. Pinned photos</p>
        {isPremium ? (
          <>
            <p className="specialist-media-editor__hint">
              Instagram-style highlights under your bio (
              {pins.length} / {PINNED_PHOTOS_MAX}). Use Pin on a header image
              above. Empty pins stay hidden on your public profile.
            </p>
            {pins.length > 0 ? (
              <div className="specialist-media-editor__pin-row" aria-label="Pinned photos">
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
                    <span className="specialist-media-editor__pin-index">{index + 1}</span>
                  </button>
                ))}
              </div>
            ) : (
              <p className="specialist-media-editor__hint">
                No pins yet — clients won’t see this row until you pin at least
                one photo.
              </p>
            )}
          </>
        ) : (
          <div className="specialist-media-editor__video-lock">
            <p className="specialist-media-editor__video-lock-title">
              Pinned photos are a Pro feature
            </p>
            <p className="specialist-media-editor__hint">
              Pro and the 30-day trial unlock up to three pinned highlights under
              your bio.
            </p>
          </div>
        )}
      </div>

      <div className="specialist-media-editor__videos">
        <p className="login-field__label">4. Header videos</p>
        {isPremium ? (
          <>
            <p className="specialist-media-editor__hint">
              Up to {limits.videos} short clips on your public profile (
              {headerVideos.length} / {limits.videos}). Paste a direct video URL
              for now.
            </p>
            {headerVideos.map((url, index) => (
              <div key={`${url}-${index}`} className="specialist-media-editor__video-row">
                <input
                  className="login-field__input profile-edit-input"
                  value={url}
                  onChange={(event) => {
                    const next = [...headerVideos];
                    next[index] = event.target.value;
                    setHeaderVideos(next);
                  }}
                  placeholder="https://…/video.mp4"
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
          </>
        ) : (
          <div className="specialist-media-editor__video-lock">
            <p className="specialist-media-editor__video-lock-title">
              Videos are a Pro feature
            </p>
            <p className="specialist-media-editor__hint">
              Free profiles use photos only. Pro adds 2 header videos plus 8
              images total.
            </p>
          </div>
        )}
      </div>

      {error ? (
        <p className="dashboard-edit-hint" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}
