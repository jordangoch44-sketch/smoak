"use client";

import { useId, useState, type ChangeEvent } from "react";
import { ProfilePhotoCropper } from "@/components/media/ProfilePhotoCropper";
import { prepareImageDataUrlForUpload } from "@/lib/media/crop-image";
import {
  rejectUnsupportedPhonePhoto,
  uploadSpecialistDashboardMedia,
} from "@/lib/media/specialist-media-upload";
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
  pinAllowList,
  PINNED_PHOTOS_MAX,
  promoteMediaUrl,
  serializeMediaUrlList,
  specialistMediaLimitsForPlan,
} from "@/lib/specialist-media-limits";
import {
  parseVideoPosterMap,
  resolveVideoPoster,
} from "@/lib/media/video-poster";
import { formatClipSecondsLabel } from "@/lib/media/video-file";
import { SPECIALIST_STORAGE_ACCEPT } from "@/lib/supabase/constants";
import { LockIcon } from "@/components/ui/icons";
import { cn } from "@/lib/utils";
import type { ProfilePhotoCropSettings } from "@/types/specialist-application";

interface SpecialistProfileMediaEditorProps {
  coverImageUrl: string;
  photoNotes: string;
  slideshowFramesJson: string;
  videoNotes: string;
  videoPostersJson?: string;
  pinnedPhotos: string[];
  isPremium: boolean;
  isProPlus?: boolean;
  specialistId?: string | null;
  onUpgrade?: () => void;
  onChange: (patch: {
    coverImageUrl?: string;
    photoNotes?: string;
    slideshowFramesJson?: string;
    pinnedPhotos?: string[];
  }) => void;
}

interface CropQueueItem {
  dataUrl: string;
  replaceIndex?: number;
  initialFrame?: ProfilePhotoCropSettings;
}

interface CropQueueState {
  items: CropQueueItem[];
  currentIndex: number;
  uploadedUrls: string[];
  uploadedFrames: SlideshowFrameMap;
}

/** Header slideshow and pins — short labels, multi-photo selection, in-browser crop. */
export function SpecialistProfileMediaEditor({
  coverImageUrl,
  photoNotes,
  slideshowFramesJson,
  videoNotes,
  videoPostersJson = "",
  pinnedPhotos,
  isPremium,
  isProPlus = false,
  specialistId,
  onUpgrade,
  onChange,
}: SpecialistProfileMediaEditorProps) {
  const limits = specialistMediaLimitsForPlan(isPremium, isProPlus);
  const headerImages = parseMediaUrlList(photoNotes);
  const headerVideos = parseMediaUrlList(videoNotes);
  const slideshowFrames = parseSlideshowFrameMap(slideshowFramesJson);
  const pins = normalizePinnedPhotos(
    pinnedPhotos,
    pinAllowList(headerImages, headerVideos)
  );
  const videoPosters = parseVideoPosterMap(videoPostersJson);
  const cover = coverImageUrl.trim() || headerImages[0] || "";
  const inputId = useId();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [brokenHeaderUrls, setBrokenHeaderUrls] = useState<string[]>([]);
  const [cropQueue, setCropQueue] = useState<CropQueueState | null>(null);

  const atImageLimit = headerImages.length >= limits.images;
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
      pinnedPhotos: normalizePinnedPhotos(
        nextPins ?? pins,
        pinAllowList(trimmed, headerVideos)
      ),
      slideshowFramesJson: serializeSlideshowFrameMap(
        pruneSlideshowFrameMap(frameBase, trimmed)
      ),
    });
  }

  function makeCover(url: string) {
    const promoted = promoteMediaUrl(headerImages, url);
    onChange({
      photoNotes: serializeMediaUrlList(promoted),
      coverImageUrl: url.trim(),
      pinnedPhotos: normalizePinnedPhotos(
        pins,
        pinAllowList(promoted, headerVideos)
      ),
    });
  }

  function togglePin(url: string) {
    if (!isPremium) {
      onUpgrade?.();
      return;
    }
    const trimmed = url.trim();
    if (!trimmed || !pinAllowList(headerImages, headerVideos).includes(trimmed))
      return;
    if (pins.includes(trimmed)) {
      onChange({
        pinnedPhotos: pins.filter((item) => item !== trimmed),
      });
      return;
    }
    if (atPinLimit) {
      setError(`You can pin up to ${PINNED_PHOTOS_MAX} photos or videos.`);
      return;
    }
    setError(null);
    onChange({ pinnedPhotos: [...pins, trimmed] });
  }

  async function handleAddHeaderImages(event: ChangeEvent<HTMLInputElement>) {
    /* Snapshot first — FileList is live and empties when value is cleared. */
    const selected = Array.from(event.target.files ?? []);
    event.target.value = "";
    if (selected.length === 0) return;

    if (atImageLimit) {
      setError(
        isPremium
          ? `Pro allows up to ${limits.images} header images.`
          : `Free includes ${limits.images} header images.`
      );
      return;
    }

    const remainingSlots = limits.images - headerImages.length;
    const selectedFiles = selected.slice(0, remainingSlots);

    if (selected.length > remainingSlots) {
      setError(
        `Selected ${selected.length} photos; only ${remainingSlots} more allowed on your plan.`
      );
    } else {
      setError(null);
    }

    setBusy(true);
    try {
      const validItems: CropQueueItem[] = [];
      for (const file of selectedFiles) {
        const phoneReject = rejectUnsupportedPhonePhoto(file);
        if (phoneReject) {
          setError(phoneReject);
          continue;
        }
        try {
          validItems.push({
            dataUrl: await prepareImageDataUrlForUpload(file, "gallery"),
          });
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
    } finally {
      setBusy(false);
    }
  }

  function handleAdjustExistingPhoto(index: number) {
    const url = headerImages[index];
    if (!url) return;
    setCropQueue({
      items: [
        {
          dataUrl: url,
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
      const uploadedUrl = await uploadSpecialistDashboardMedia(
        specialistId,
        imageData,
        "gallery"
      );

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
                            "specialist-media-editor__thumb-btn--pinned",
                          !isPremium &&
                            "specialist-media-editor__thumb-btn--locked"
                        )}
                        onClick={() => togglePin(url)}
                        disabled={isPremium ? !isPinned && atPinLimit : false}
                      >
                        {isPinned ? "Pinned" : "Pin"}
                        {!isPremium ? (
                          <LockIcon className="specialist-media-editor__btn-lock" />
                        ) : null}
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
          ) : !isPremium ? (
            <button
              type="button"
              className="smoac-control specialist-media-editor__add specialist-media-editor__add--locked"
              onClick={() => onUpgrade?.()}
            >
              <LockIcon className="specialist-media-editor__add-lock" />
              <span>More photos</span>
            </button>
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

      <div
        className={cn(
          "specialist-media-editor__pins",
          !isPremium && "specialist-media-editor__feature--locked"
        )}
      >
        <div className="specialist-media-editor__label-row">
          <p className="login-field__label">
            Pinned · {pins.length}/{PINNED_PHOTOS_MAX}
          </p>
          {!isPremium ? (
            <LockIcon className="specialist-media-editor__label-lock" />
          ) : null}
        </div>
        {pins.length > 0 ? (
          <div
            className="specialist-media-editor__pin-row"
            aria-label="Pinned photos and videos"
          >
            {pins.map((url, index) => {
              const videoPoster = resolveVideoPoster(videoPosters, url);
              const isVideo = headerVideos.includes(url);
              const preview = videoPoster?.posterUrl || url;
              return (
              <button
                key={url}
                type="button"
                className="specialist-media-editor__pin-tile"
                onClick={() => togglePin(url)}
                aria-label={`Unpin ${isVideo ? "video" : "photo"} ${index + 1}`}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={preview} alt="" />
                {isVideo ? (
                  <span className="specialist-media-editor__clip-seconds">
                    {formatClipSecondsLabel(videoPoster?.duration ?? 0)}
                  </span>
                ) : null}
                <span className="specialist-media-editor__pin-index">
                  {index + 1}
                </span>
              </button>
              );
            })}
          </div>
        ) : (
          <p className="specialist-media-editor__hint">
            Pin up to 3 photos or videos under your bio.
          </p>
        )}
        {!isPremium ? (
          <button
            type="button"
            className="smoac-control specialist-media-editor__lock-cta"
            onClick={() => onUpgrade?.()}
          >
            <LockIcon className="specialist-media-editor__lock-cta-icon" />
            Unlock with Pro
          </button>
        ) : null}
      </div>

      {error ? (
        <p className="dashboard-upload-error" role="alert">
          {error}
        </p>
      ) : null}

      {currentCropItem ? (
        <ProfilePhotoCropper
          imageSrc={currentCropItem.dataUrl}
          aspect={4 / 5}
          hideToolbarExtras
          cropShape="rect"
          initialCrop={{
            x: currentCropItem.initialFrame?.x ?? 0,
            y: currentCropItem.initialFrame?.y ?? 0,
          }}
          initialZoom={currentCropItem.initialFrame?.zoom ?? 1}
          title="Frame Slideshow Photo"
          lead="Drag and zoom to set how this photo appears in the header. The framed photo is what clients see."
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
          onCancel={() => {
            setCropQueue(null);
          }}
          onSave={async (imageData, frame) => {
            await handleFrameSave(imageData, frame);
          }}
        />
      ) : null}
    </div>
  );
}
