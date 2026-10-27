"use client";

import { useId, useState, type ChangeEvent } from "react";
import { ProfilePhotoCropper } from "@/components/media/ProfilePhotoCropper";
import { usePhotoGridDrag } from "@/hooks/usePhotoGridDrag";
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
  pruneVideoPosterMap,
  resolveVideoPoster,
  serializeVideoPosterMap,
} from "@/lib/media/video-poster";
import { formatClipSecondsLabel } from "@/lib/media/video-file";
import { SPECIALIST_STORAGE_ACCEPT } from "@/lib/supabase/constants";
import { CloseIcon, LockIcon, PlayIcon } from "@/components/ui/icons";
import { cn } from "@/lib/utils";
import type { ProfilePhotoCropSettings } from "@/types/specialist-application";

interface SpecialistProfileMediaEditorProps {
  coverImageUrl: string;
  photoNotes: string;
  slideshowFramesJson: string;
  headerMediaOrder?: string;
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
    headerMediaOrder?: string;
    pinnedPhotos?: string[];
    videoNotes?: string;
    videoPostersJson?: string;
  }) => void;
}

interface CropQueueItem {
  dataUrl: string;
  replaceIndex?: number;
  /** Existing slideshow photo this crop replaces. */
  sourceUrl?: string;
  initialFrame?: ProfilePhotoCropSettings;
}

interface CropQueueState {
  items: CropQueueItem[];
  currentIndex: number;
  uploadedUrls: string[];
  uploadedFrames: SlideshowFrameMap;
}

function buildSlideshowOrder(
  stored: string,
  photos: readonly string[],
  videos: readonly string[]
): string[] {
  const allowed = new Set([...photos, ...videos]);
  const order = parseMediaUrlList(stored).filter((url) => allowed.has(url));
  const seen = new Set(order);
  for (const url of photos) {
    if (!seen.has(url)) {
      order.push(url);
      seen.add(url);
    }
  }
  for (const url of videos) {
    if (!seen.has(url)) {
      order.push(url);
      seen.add(url);
    }
  }
  return order;
}

/** Header slideshow and pins — short labels, multi-photo selection, in-browser crop. */
export function SpecialistProfileMediaEditor({
  coverImageUrl,
  photoNotes,
  slideshowFramesJson,
  headerMediaOrder = "",
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
  const slideshowUrls = buildSlideshowOrder(
    headerMediaOrder,
    headerImages,
    headerVideos
  );
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
  const extraPhotoCount = Math.max(0, headerImages.length - limits.images);
  const livePhotoCount = Math.min(headerImages.length, limits.images);
  const atPinLimit = pins.length >= PINNED_PHOTOS_MAX;

  function markHeaderBroken(url: string) {
    setBrokenHeaderUrls((prev) =>
      prev.includes(url) ? prev : [...prev, url]
    );
  }

  function setHeaderImages(
    next: string[],
    nextPins?: string[],
    nextFrames?: SlideshowFrameMap,
    coverOverride?: string,
    nextOrder?: string[]
  ) {
    const trimmed = next.map((url) => url.trim()).filter(Boolean);
    const nextCover =
      coverOverride && trimmed.includes(coverOverride)
        ? coverOverride
        : cover && trimmed.includes(cover)
          ? cover
          : trimmed[0] || "";
    const frameBase = nextFrames ?? slideshowFrames;
    const order =
      nextOrder ??
      buildSlideshowOrder(headerMediaOrder, trimmed, headerVideos);
    setBrokenHeaderUrls((prev) => prev.filter((url) => trimmed.includes(url)));
    onChange({
      photoNotes: serializeMediaUrlList(trimmed),
      coverImageUrl: nextCover,
      headerMediaOrder: serializeMediaUrlList(order),
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
      headerMediaOrder: serializeMediaUrlList(
        promoteMediaUrl(slideshowUrls, url)
      ),
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
          sourceUrl: url,
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
    frame: ProfilePhotoCropSettings,
    reportProgress?: (percent: number) => void
  ) {
    if (!cropQueue) return;
    const currentItem = cropQueue.items[cropQueue.currentIndex];
    if (!currentItem) return;

    setBusy(true);
    try {
      const uploadedUrl = await uploadSpecialistDashboardMedia(
        specialistId,
        imageData,
        "gallery",
        reportProgress
      );

      const frameKey = normalizeSlideshowImageKey(uploadedUrl);
      const nextFrames: SlideshowFrameMap = { ...slideshowFrames };

      const previousUrl =
        currentItem.sourceUrl ??
        (currentItem.replaceIndex !== undefined
          ? headerImages[currentItem.replaceIndex]
          : undefined);
      if (previousUrl) {
        delete nextFrames[normalizeSlideshowImageKey(previousUrl)];
        const index = headerImages.indexOf(previousUrl);
        if (index < 0) {
          setCropQueue(null);
          return;
        }
        const next = [...headerImages];
        next[index] = uploadedUrl;
        nextFrames[frameKey] = frame;
        const nextPins = pins.map((item) =>
          item === previousUrl ? uploadedUrl : item
        );
        setHeaderImages(
          next,
          nextPins,
          nextFrames,
          cover === previousUrl ? uploadedUrl : undefined,
          slideshowUrls.map((item) =>
            item === previousUrl ? uploadedUrl : item
          )
        );
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

  function reorderSlideshow(next: string[]) {
    const photoSet = new Set(headerImages);
    const videoSet = new Set(headerVideos);
    const photos = next.filter((url) => photoSet.has(url));
    const videos = next.filter((url) => videoSet.has(url));
    onChange({
      photoNotes: serializeMediaUrlList(photos),
      videoNotes: serializeMediaUrlList(videos),
      headerMediaOrder: serializeMediaUrlList(next),
      pinnedPhotos: normalizePinnedPhotos(pins, pinAllowList(photos, videos)),
    });
  }

  function reorderPins(next: string[]) {
    onChange({
      pinnedPhotos: normalizePinnedPhotos(
        next,
        pinAllowList(headerImages, headerVideos)
      ),
    });
  }

  const headerDrag = usePhotoGridDrag(
    slideshowUrls,
    slideshowUrls.length > 1,
    reorderSlideshow,
    (url) =>
      headerVideos.includes(url)
        ? resolveVideoPoster(videoPosters, url)?.posterUrl || url
        : url
  );
  const pinDrag = usePhotoGridDrag(
    pins,
    pins.length > 1,
    reorderPins,
    (url) => resolveVideoPoster(videoPosters, url)?.posterUrl || url
  );

  function openPhoto(url: string) {
    const index = headerImages.indexOf(url);
    if (index < 0) return;
    handleAdjustExistingPhoto(index);
  }

  function removeHeaderPhoto(url: string) {
    setHeaderImages(
      headerImages.filter((item) => item !== url),
      pins.filter((item) => item !== url)
    );
  }

  function removeHeaderVideo(url: string) {
    const nextUrls = headerVideos.filter((item) => item !== url);
    onChange({
      videoNotes: serializeMediaUrlList(nextUrls),
      videoPostersJson: serializeVideoPosterMap(
        pruneVideoPosterMap(parseVideoPosterMap(videoPostersJson), nextUrls)
      ),
      headerMediaOrder: serializeMediaUrlList(
        slideshowUrls.filter((item) => item !== url)
      ),
      pinnedPhotos: pins.filter((item) => item !== url),
    });
  }

  function unpin(url: string) {
    if (!isPremium) {
      onUpgrade?.();
      return;
    }
    onChange({ pinnedPhotos: pins.filter((item) => item !== url) });
  }

  const editingUrl = currentCropItem?.sourceUrl ?? "";
  const editingIsCover = Boolean(editingUrl) && editingUrl === cover;
  const editingIsPinned = Boolean(editingUrl) && pins.includes(editingUrl);

  return (
    <div className="specialist-media-editor">
      <div className="specialist-media-editor__pins">
        <div className="specialist-media-editor__label-row">
          <p className="login-field__label">
            Header slideshow · {livePhotoCount}/{limits.images}
            {!isPremium ? " · Free live" : ""}
            {extraPhotoCount > 0
              ? ` · ${extraPhotoCount} saved`
              : ""}
          </p>
        </div>
        <p className="specialist-media-editor__hint">
          {headerImages.length === 0 && headerVideos.length === 0
            ? "No slideshow photos. Clients see your profile photo in the header."
            : "Drag to reorder. Tap a photo to crop, set the cover, or pin."}
        </p>
        <div
          ref={headerDrag.rowRef}
          className="specialist-media-editor__pin-row"
          aria-label="Header slideshow photos"
        >
          {slideshowUrls.map((url, index) => {
            const isVideo = headerVideos.includes(url);
            const isBroken = !isVideo && brokenHeaderUrls.includes(url);
            const photoIndex = headerImages.indexOf(url);
            const notLive =
              !isVideo && !isPremium && photoIndex >= limits.images;
            const poster = isVideo
              ? resolveVideoPoster(videoPosters, url)?.posterUrl || url
              : url;
            return (
              <div
                key={`${isVideo ? "video" : "photo"}:${url}`}
                className={cn(
                  "specialist-transforms-editor__tile",
                  slideshowUrls.length > 1 &&
                    "specialist-transforms-editor__tile--sortable",
                  headerDrag.draggingUrl === url &&
                    "specialist-transforms-editor__tile--dragging"
                )}
                data-result-index={index}
              >
                {isBroken ? (
                  <label
                    htmlFor={inputId}
                    className="smoac-control specialist-media-editor__pin-tile specialist-media-editor__pin-tile--add"
                  >
                    <span aria-hidden>+</span>
                    <span>Replace</span>
                  </label>
                ) : (
                  <button
                    type="button"
                    className={cn(
                      "smoac-control specialist-media-editor__pin-tile",
                      isVideo && "specialist-media-editor__pin-tile--video"
                    )}
                    onPointerDown={(event) => headerDrag.onPointerDown(event, url)}
                    onPointerMove={headerDrag.onPointerMove}
                    onPointerUp={headerDrag.endDrag}
                    onPointerCancel={headerDrag.endDrag}
                    onContextMenu={(event) => event.preventDefault()}
                    onDragStart={(event) => event.preventDefault()}
                    onClick={() => {
                      if (headerDrag.consumeSuppressedClick()) return;
                      if (isVideo) return;
                      openPhoto(url);
                    }}
                    aria-label={
                      isVideo
                        ? `Slideshow video ${index + 1}. Drag to reorder.`
                        : `Edit slideshow photo ${index + 1}. Drag to reorder.`
                    }
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={poster}
                      alt=""
                      draggable={false}
                      onError={() => {
                        if (!isVideo) markHeaderBroken(url);
                      }}
                    />
                    {isVideo ? (
                      <span className="specialist-media-editor__pin-play" aria-hidden>
                        <span className="specialist-media-editor__pin-play-badge">
                          <PlayIcon className="specialist-media-editor__pin-play-icon" />
                        </span>
                      </span>
                    ) : null}
                    {notLive ? (
                      <span className="specialist-media-editor__pin-not-live">
                        Not live
                      </span>
                    ) : null}
                    <span className="specialist-media-editor__pin-index">
                      {index + 1}
                    </span>
                  </button>
                )}
                <button
                  type="button"
                  className="smoac-control specialist-transforms-editor__remove"
                  aria-label={
                    isVideo
                      ? `Remove slideshow video ${index + 1}`
                      : `Remove slideshow photo ${index + 1}`
                  }
                  onClick={() =>
                    isVideo ? removeHeaderVideo(url) : removeHeaderPhoto(url)
                  }
                >
                  <CloseIcon className="specialist-transforms-editor__remove-icon" />
                </button>
              </div>
            );
          })}

          {!atImageLimit ? (
            <label
              className={cn(
                "smoac-control specialist-media-editor__pin-tile specialist-media-editor__pin-tile--add",
                busy && "specialist-media-editor__pin-tile--busy"
              )}
            >
              <span aria-hidden>+</span>
              <span>{busy ? "Preparing…" : "Add"}</span>
              <input
                id={inputId}
                type="file"
                multiple
                accept={`${SPECIALIST_STORAGE_ACCEPT.galleryImage},.jpg,.jpeg,.png,.webp`}
                className="specialist-media-editor__pin-file"
                onChange={(event) => void handleAddHeaderImages(event)}
                disabled={busy}
              />
            </label>
          ) : !isPremium ? (
            <button
              type="button"
              className="smoac-control specialist-media-editor__pin-tile specialist-media-editor__pin-tile--add specialist-media-editor__pin-tile--locked"
              onClick={() => onUpgrade?.()}
              aria-label="Unlock more slideshow photos with Pro"
            >
              <LockIcon className="specialist-media-editor__add-lock" />
              <span>Add</span>
            </button>
          ) : null}
        </div>
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
        <p className="specialist-media-editor__hint">
          {!isPremium && pins.length > 0
            ? "Saved from Pro. Clients cannot see pins until you restore Pro."
            : pins.length === 0
              ? "Pin up to 3 photos or videos under your bio."
              : "Drag to reorder. Tap a photo to crop, set the cover, or pin."}
        </p>
        {pins.length > 0 ? (
          <div
            ref={pinDrag.rowRef}
            className="specialist-media-editor__pin-row"
            aria-label="Pinned photos and videos"
          >
            {pins.map((url, index) => {
              const videoPoster = resolveVideoPoster(videoPosters, url);
              const isVideo = headerVideos.includes(url);
              const preview = videoPoster?.posterUrl || url;
              return (
                <div
                  key={url}
                  className={cn(
                    "specialist-transforms-editor__tile",
                    pins.length > 1 && "specialist-transforms-editor__tile--sortable",
                    pinDrag.draggingUrl === url &&
                      "specialist-transforms-editor__tile--dragging"
                  )}
                  data-result-index={index}
                >
                  <button
                    type="button"
                    className="smoac-control specialist-media-editor__pin-tile"
                    onPointerDown={(event) => pinDrag.onPointerDown(event, url)}
                    onPointerMove={pinDrag.onPointerMove}
                    onPointerUp={pinDrag.endDrag}
                    onPointerCancel={pinDrag.endDrag}
                    onContextMenu={(event) => event.preventDefault()}
                    onDragStart={(event) => event.preventDefault()}
                    onClick={() => {
                      if (pinDrag.consumeSuppressedClick()) return;
                      if (isVideo) return;
                      openPhoto(url);
                    }}
                    aria-label={
                      isVideo
                        ? `Pinned video ${index + 1}. Drag to reorder.`
                        : `Edit pinned photo ${index + 1}. Drag to reorder.`
                    }
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={preview} alt="" draggable={false} />
                    {isVideo ? (
                      <span className="specialist-media-editor__clip-seconds">
                        {formatClipSecondsLabel(videoPoster?.duration ?? 0)}
                      </span>
                    ) : null}
                    <span className="specialist-media-editor__pin-index">
                      {index + 1}
                    </span>
                  </button>
                  <button
                    type="button"
                    className="smoac-control specialist-transforms-editor__remove"
                    aria-label={`Unpin ${isVideo ? "video" : "photo"} ${index + 1}`}
                    onClick={() => unpin(url)}
                  >
                    <CloseIcon className="specialist-transforms-editor__remove-icon" />
                  </button>
                </div>
              );
            })}
          </div>
        ) : null}
        {!isPremium ? (
          <button
            type="button"
            className="smoac-control specialist-media-editor__lock-cta"
            onClick={() => onUpgrade?.()}
          >
            <LockIcon className="specialist-media-editor__lock-cta-icon" />
            {extraPhotoCount > 0 || pins.length > 0
              ? "Restore with Pro"
              : "Unlock with Pro"}
          </button>
        ) : null}
      </div>

      {headerDrag.ghost}
      {pinDrag.ghost}

      {error ? (
        <p className="dashboard-upload-error" role="alert">
          {error}
        </p>
      ) : null}

      {currentCropItem ? (
        <ProfilePhotoCropper
          imageSrc={currentCropItem.dataUrl}
          aspect={4 / 5}
          cropShape="rect"
          initialCrop={{
            x: currentCropItem.initialFrame?.x ?? 0,
            y: currentCropItem.initialFrame?.y ?? 0,
          }}
          initialZoom={currentCropItem.initialFrame?.zoom ?? 1}
          title="Crop photo"
          lead="Drag and zoom so this photo fits the header. Set the cover or pin it from here."
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
          actions={
            editingUrl ? (
              <>
                <button
                  type="button"
                  className={cn(
                    "smoac-control profile-photo-cropper__photo-action",
                    editingIsCover && "profile-photo-cropper__photo-action--on"
                  )}
                  onClick={() => makeCover(editingUrl)}
                  disabled={editingIsCover}
                  aria-pressed={editingIsCover}
                >
                  {editingIsCover ? "Cover photo" : "Set as cover photo"}
                </button>
                <button
                  type="button"
                  className={cn(
                    "smoac-control profile-photo-cropper__photo-action",
                    editingIsPinned && "profile-photo-cropper__photo-action--on"
                  )}
                  onClick={() => togglePin(editingUrl)}
                  disabled={isPremium ? !editingIsPinned && atPinLimit : false}
                  aria-pressed={editingIsPinned}
                >
                  {editingIsPinned ? "PINNED" : "PIN"}
                  {!isPremium ? (
                    <LockIcon className="specialist-media-editor__btn-lock" />
                  ) : null}
                </button>
              </>
            ) : null
          }
          onCancel={() => {
            setCropQueue(null);
          }}
          onSave={async (imageData, frame, _area, _rotation, reportProgress) => {
            await handleFrameSave(imageData, frame, reportProgress);
          }}
        />
      ) : null}
    </div>
  );
}
