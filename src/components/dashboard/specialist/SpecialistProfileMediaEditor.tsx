"use client";

import { useId, useState, type ChangeEvent } from "react";
import { ProfileMediaUploadField } from "@/components/dashboard/specialist/ProfileMediaUploadField";
import {
  ProfilePhotoCropper,
} from "@/components/media/ProfilePhotoCropper";
import { isMarketplaceSupabaseActive } from "@/lib/auth/marketplace-auth";
import { readFileAsDataUrl } from "@/lib/media/crop-image";
import {
  normalizeSlideshowImageKey,
  parseSlideshowFrameMap,
  pruneSlideshowFrameMap,
  resolveSlideshowFrame,
  serializeSlideshowFrameMap,
  type SlideshowFrameMap,
} from "@/lib/media/slideshow-frame";
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
import type { ProfilePhotoCropSettings } from "@/types/specialist-application";
import { SpecialistTransformationsEditor } from "@/components/dashboard/specialist/SpecialistTransformationsEditor";

interface SpecialistProfileMediaEditorProps {
  profilePhotoUrl: string;
  coverImageUrl: string;
  photoNotes: string;
  slideshowFramesJson: string;
  videoNotes: string;
  pinnedPhotos: string[];
  transformationNotes?: string;
  isPremium: boolean;
  isProPlus?: boolean;
  specialistId?: string | null;
  onChange: (patch: {
    profilePhotoUrl?: string;
    coverImageUrl?: string;
    photoNotes?: string;
    slideshowFramesJson?: string;
    videoNotes?: string;
    pinnedPhotos?: string[];
    transformationNotes?: string;
  }) => void;
}

interface CropQueueItem {
  file?: File;
  dataUrl: string;
  name: string;
  replaceIndex?: number;
  initialFrame?: ProfilePhotoCropSettings;
}

interface CropQueueState {
  items: CropQueueItem[];
  currentIndex: number;
  uploadedUrls: string[];
  uploadedFrames: SlideshowFrameMap;
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

async function uploadCroppedDataUrl(
  specialistId: string | null | undefined,
  dataUrl: string
): Promise<string> {
  const id = specialistId?.trim();
  if (!id || !isMarketplaceSupabaseActive()) return dataUrl;

  const stamp = Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
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

/** Profile photo, header slideshow, and pins — short labels, multi-photo selection, in-browser crop. */
export function SpecialistProfileMediaEditor({
  profilePhotoUrl,
  coverImageUrl,
  photoNotes,
  slideshowFramesJson,
  videoNotes,
  pinnedPhotos,
  transformationNotes = "",
  isPremium,
  isProPlus = false,
  specialistId,
  onChange,
}: SpecialistProfileMediaEditorProps) {
  const limits = specialistMediaLimitsForPlan(isPremium);
  const headerImages = parseMediaUrlList(photoNotes);
  const slideshowFrames = parseSlideshowFrameMap(slideshowFramesJson);
  const headerVideos = parseMediaUrlList(videoNotes);
  const pins = normalizePinnedPhotos(pinnedPhotos, headerImages);
  const cover = coverImageUrl.trim() || headerImages[0] || "";
  const inputId = useId();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [brokenHeaderUrls, setBrokenHeaderUrls] = useState<string[]>([]);
  const [cropQueue, setCropQueue] = useState<CropQueueState | null>(null);

  const atImageLimit = headerImages.length >= limits.images;
  const atVideoLimit = headerVideos.length >= limits.videos;
  const atPinLimit = pins.length >= PINNED_PHOTOS_MAX;

  function markHeaderBroken(url: string) {
    setBrokenHeaderUrls((prev) =>
      prev.includes(url) ? prev : [...prev, url]
    );
  }

  function setHeaderImages(next: string[], nextPins?: string[], nextFrames?: SlideshowFrameMap) {
    const trimmed = next.map((url) => url.trim()).filter(Boolean);
    const nextCover =
      cover && trimmed.includes(cover) ? cover : trimmed[0] || "";
    const frameBase = nextFrames ?? slideshowFrames;
    setBrokenHeaderUrls((prev) => prev.filter((url) => trimmed.includes(url)));
    onChange({
      photoNotes: serializeMediaUrlList(trimmed),
      coverImageUrl: nextCover,
      pinnedPhotos: normalizePinnedPhotos(nextPins ?? pins, trimmed),
      slideshowFramesJson: serializeSlideshowFrameMap(
        pruneSlideshowFrameMap(frameBase, trimmed)
      ),
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

  async function handleAddHeaderImages(event: ChangeEvent<HTMLInputElement>) {
    const fileList = event.target.files;
    event.target.value = "";
    if (!fileList || fileList.length === 0) return;

    if (atImageLimit) {
      setError(
        isPremium
          ? `Pro allows up to ${limits.images} header images.`
          : `Free includes ${limits.images} header images.`
      );
      return;
    }

    const remainingSlots = limits.images - headerImages.length;
    const selectedFiles = Array.from(fileList).slice(0, remainingSlots);

    if (fileList.length > remainingSlots) {
      setError(
        `Selected ${fileList.length} photos; only ${remainingSlots} more allowed on your plan.`
      );
    } else {
      setError(null);
    }

    // Filter invalid files
    const validItems: CropQueueItem[] = [];
    for (const file of selectedFiles) {
      const phoneReject = rejectUnsupportedPhonePhoto(file);
      if (phoneReject) {
        setError(phoneReject);
        continue;
      }
      try {
        const dataUrl = await readFileAsDataUrl(file);
        validItems.push({ file, dataUrl, name: file.name });
      } catch {
        setError("Could not read one of the selected photos.");
      }
    }

    if (validItems.length === 0) return;

    setCropQueue({
      items: validItems,
      currentIndex: 0,
      uploadedUrls: [],
      uploadedFrames: {},
    });
  }

  function handleAdjustExistingPhoto(index: number) {
    const url = headerImages[index];
    if (!url) return;
    setCropQueue({
      items: [
        {
          dataUrl: url,
          name: `Slideshow photo ${index + 1}`,
          replaceIndex: index,
          initialFrame: resolveSlideshowFrame(slideshowFrames, url),
        },
      ],
      currentIndex: 0,
      uploadedUrls: [],
      uploadedFrames: {},
    });
  }

  async function handleFrameSave(
    imageData: string,
    frame: ProfilePhotoCropSettings
  ) {
    if (!cropQueue) return;
    const currentItem = cropQueue.items[cropQueue.currentIndex];
    if (!currentItem) return;

    setBusy(true);
    try {
      const isRemote = /^https?:\/\//i.test(imageData.trim());
      const uploadedUrl = isRemote
        ? imageData.trim()
        : await uploadCroppedDataUrl(specialistId, imageData);

      const frameKey = normalizeSlideshowImageKey(uploadedUrl);
      const nextFrames: SlideshowFrameMap = { ...slideshowFrames };

      if (currentItem.replaceIndex !== undefined) {
        const previousUrl = headerImages[currentItem.replaceIndex];
        if (previousUrl) {
          delete nextFrames[normalizeSlideshowImageKey(previousUrl)];
        }
        const next = [...headerImages];
        next[currentItem.replaceIndex] = uploadedUrl;
        nextFrames[frameKey] = frame;
        setHeaderImages(next, pins, nextFrames);
        setCropQueue(null);
        return;
      }

      const queuedFrames = {
        ...cropQueue.uploadedFrames,
        [frameKey]: frame,
      };
      const nextUploaded = [...cropQueue.uploadedUrls, uploadedUrl];
      if (cropQueue.currentIndex < cropQueue.items.length - 1) {
        setCropQueue({
          ...cropQueue,
          currentIndex: cropQueue.currentIndex + 1,
          uploadedUrls: nextUploaded,
          uploadedFrames: queuedFrames,
        });
      } else {
        setHeaderImages([...headerImages, ...nextUploaded], pins, {
          ...nextFrames,
          ...queuedFrames,
        });
        setCropQueue(null);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed.");
      throw err;
    } finally {
      setBusy(false);
    }
  }

  const currentCropItem =
    cropQueue && cropQueue.items[cropQueue.currentIndex]
      ? cropQueue.items[cropQueue.currentIndex]
      : null;

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
          {headerImages.map((url, index) => {
            const isCover = url === cover;
            const isPinned = pins.includes(url);
            const isBroken = brokenHeaderUrls.includes(url);
            return (
              <div
                key={`${url}-${index}`}
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
                        onClick={() => handleAdjustExistingPhoto(index)}
                        title="Adjust slideshow framing"
                      >
                        Adjust
                      </button>
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
                            headerImages.filter((_, i) => i !== index),
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
              <span>{busy ? "Uploading…" : "Add photos"}</span>
            </label>
          ) : null}
        </div>

        <input
          id={inputId}
          type="file"
          multiple
          accept={`${SPECIALIST_STORAGE_ACCEPT.galleryImage},.jpg,.jpeg,.png,.webp`}
          className="dashboard-upload-zone__input"
          onChange={(event) => void handleAddHeaderImages(event)}
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

      <SpecialistTransformationsEditor
        transformationNotes={transformationNotes}
        isProPlus={isProPlus}
        specialistId={specialistId}
        onChange={(next) => onChange({ transformationNotes: next })}
      />

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

      {currentCropItem ? (
        <ProfilePhotoCropper
          imageSrc={currentCropItem.dataUrl}
          aspect={16 / 9}
          exportMode="frame-preview"
          hideToolbarExtras
          showAspectPresets={false}
          cropShape="rect"
          initialCrop={{
            x: currentCropItem.initialFrame?.x ?? 0,
            y: currentCropItem.initialFrame?.y ?? 0,
          }}
          initialZoom={currentCropItem.initialFrame?.zoom ?? 1}
          title="Frame Slideshow Photo"
          lead="Drag and zoom to set how this photo appears in the header slideshow. Your full photo is kept for gallery view."
          stepBadge={
            cropQueue && cropQueue.items.length > 1
              ? `Photo ${cropQueue.currentIndex + 1} of ${cropQueue.items.length}`
              : undefined
          }
          confirmLabel={
            cropQueue && cropQueue.currentIndex < cropQueue.items.length - 1
              ? "Save & Next →"
              : "Save"
          }
          confirmingLabel="Saving…"
          onCancel={() => setCropQueue(null)}
          onSave={async (imageData, frame) => {
            await handleFrameSave(imageData, frame);
          }}
        />
      ) : null}
    </div>
  );
}
