"use client";

import { useId, useState, type ChangeEvent } from "react";
import { ProfileVideoFramePicker } from "@/components/media/ProfileVideoFramePicker";
import {
  uploadSpecialistDashboardMedia,
  uploadSpecialistDashboardVideo,
} from "@/lib/media/specialist-media-upload";
import {
  parseVideoPosterMap,
  pruneVideoPosterMap,
  resolveVideoPoster,
  serializeVideoPosterMap,
  type VideoPosterMap,
} from "@/lib/media/video-poster";
import {
  formatClipSecondsLabel,
  readVideoDurationSeconds,
  rejectUnsupportedPhoneVideo,
  rejectVideoOverDuration,
} from "@/lib/media/video-file";
import {
  PINNED_PHOTOS_MAX,
  parseMediaUrlList,
  serializeMediaUrlList,
  specialistMediaLimitsForPlan,
} from "@/lib/specialist-media-limits";
import {
  SPECIALIST_STORAGE_ACCEPT,
  SPECIALIST_STORAGE_LIMITS,
} from "@/lib/supabase/constants";
import { LockIcon } from "@/components/ui/icons";
import { cn } from "@/lib/utils";

interface SpecialistVideosEditorProps {
  videoNotes: string;
  videoPostersJson: string;
  pinnedPhotos: string[];
  isPremium: boolean;
  isProPlus: boolean;
  specialistId?: string | null;
  onUpgrade?: () => void;
  onChange: (patch: {
    videoNotes?: string;
    videoPostersJson?: string;
    pinnedPhotos?: string[];
  }) => void;
}

interface FrameQueueItem {
  file: File;
  duration: number;
}

export function SpecialistVideosEditor({
  videoNotes,
  videoPostersJson,
  pinnedPhotos,
  isPremium,
  isProPlus,
  specialistId,
  onUpgrade,
  onChange,
}: SpecialistVideosEditorProps) {
  const inputId = useId();
  const limits = specialistMediaLimitsForPlan(isPremium, isProPlus);
  const videoCap = isProPlus ? limits.videos : 2;
  const urls = parseMediaUrlList(videoNotes);
  const posters = parseVideoPosterMap(videoPostersJson);
  const atLimit = urls.length >= videoCap;
  const atPinLimit = pinnedPhotos.length >= PINNED_PHOTOS_MAX;
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [frameQueue, setFrameQueue] = useState<FrameQueueItem[]>([]);
  const [frameIndex, setFrameIndex] = useState(0);

  const currentFrame = frameQueue[frameIndex] ?? null;

  function commitUrls(nextUrls: string[], nextPosters: VideoPosterMap) {
    const pruned = pruneVideoPosterMap(nextPosters, nextUrls);
    onChange({
      videoNotes: serializeMediaUrlList(nextUrls),
      videoPostersJson: serializeVideoPosterMap(pruned),
      pinnedPhotos: pinnedPhotos.filter(
        (url) => nextUrls.includes(url) || !urls.includes(url)
      ),
    });
  }

  function togglePin(url: string) {
    if (!isPremium) {
      onUpgrade?.();
      return;
    }
    if (pinnedPhotos.includes(url)) {
      onChange({
        pinnedPhotos: pinnedPhotos.filter((item) => item !== url),
      });
      return;
    }
    if (atPinLimit) {
      setError(`You can pin up to ${PINNED_PHOTOS_MAX} photos or videos.`);
      return;
    }
    setError(null);
    onChange({ pinnedPhotos: [...pinnedPhotos, url] });
  }

  async function handleAdd(event: ChangeEvent<HTMLInputElement>) {
    const selected = Array.from(event.target.files ?? []);
    event.target.value = "";
    if (selected.length === 0 || !isProPlus || atLimit || currentFrame) return;

    const remaining = videoCap - urls.length;
    const files = selected.slice(0, remaining);
    setBusy(true);
    setError(null);
    setProgress(null);
    try {
      const valid: FrameQueueItem[] = [];
      for (const file of files) {
        const typeReject = rejectUnsupportedPhoneVideo(file);
        if (typeReject) {
          setError(typeReject);
          continue;
        }
        if (file.size > SPECIALIST_STORAGE_LIMITS.galleryVideo) {
          setError("Video must be under 100MB.");
          continue;
        }
        const duration = await readVideoDurationSeconds(file);
        const durationReject = rejectVideoOverDuration(duration);
        if (durationReject) {
          setError(durationReject);
          continue;
        }
        valid.push({ file, duration });
      }
      if (valid.length === 0) return;
      if (selected.length > remaining) {
        setError(
          `Selected ${selected.length} videos; only ${remaining} more allowed.`
        );
      }
      setFrameQueue(valid);
      setFrameIndex(0);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not add video.");
    } finally {
      setBusy(false);
    }
  }

  async function handleFrameSave(posterDataUrl: string, time: number) {
    const item = currentFrame;
    if (!item) return;
    setBusy(true);
    setProgress("Uploading…");
    try {
      const posterUrl = await uploadSpecialistDashboardMedia(
        specialistId,
        posterDataUrl,
        "gallery"
      );
      const videoUrl = await uploadSpecialistDashboardVideo(
        specialistId,
        item.file
      );
      const nextUrls = [...urls, videoUrl];
      const nextPosters: VideoPosterMap = {
        ...posters,
        [videoUrl]: {
          posterUrl,
          duration: item.duration,
          time,
        },
      };
      commitUrls(nextUrls, nextPosters);
      if (frameIndex < frameQueue.length - 1) {
        setFrameIndex(frameIndex + 1);
      } else {
        setFrameQueue([]);
        setFrameIndex(0);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not upload video.");
      throw err;
    } finally {
      setBusy(false);
      setProgress(null);
    }
  }

  return (
    <div
      className={cn(
        "specialist-media-editor__videos",
        !isProPlus && "specialist-media-editor__feature--locked"
      )}
    >
      <div className="specialist-media-editor__label-row">
        <p className="login-field__label">
          Videos · {urls.length}/{videoCap}
        </p>
        {!isProPlus ? (
          <LockIcon className="specialist-media-editor__label-lock" />
        ) : null}
      </div>
      <p className="specialist-media-editor__hint">
        Add a clip from your phone, up to 45 seconds. Pick the thumbnail still,
        then pin it under your bio if you want.
      </p>
      <div className="specialist-media-editor__pin-row" aria-label="Profile videos">
        {urls.map((url, index) => {
          const poster = resolveVideoPoster(posters, url);
          const isPinned = pinnedPhotos.includes(url);
          return (
            <div
              key={`${url}-${index}`}
              className="specialist-media-editor__video-tile"
            >
              <div className="specialist-media-editor__pin-tile specialist-media-editor__pin-tile--video">
                {poster?.posterUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={poster.posterUrl} alt="" />
                ) : (
                  <video
                    src={url}
                    muted
                    playsInline
                    preload="metadata"
                    className="specialist-media-editor__pin-video"
                  />
                )}
                <span className="specialist-media-editor__clip-seconds">
                  {formatClipSecondsLabel(poster?.duration ?? 0)}
                </span>
              </div>
              <div className="specialist-media-editor__video-tile-actions">
                <button
                  type="button"
                  className={cn(
                    "smoac-control specialist-media-editor__thumb-btn",
                    isPinned && "specialist-media-editor__thumb-btn--pinned",
                    !isPremium && "specialist-media-editor__thumb-btn--locked"
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
                  onClick={() => {
                    if (!isProPlus) {
                      onUpgrade?.();
                      return;
                    }
                    commitUrls(
                      urls.filter((_, i) => i !== index),
                      posters
                    );
                  }}
                >
                  Remove
                </button>
              </div>
            </div>
          );
        })}
        {!atLimit ? (
          isProPlus ? (
            <label
              className={cn(
                "smoac-control specialist-media-editor__pin-tile specialist-media-editor__pin-tile--add",
                busy && "specialist-media-editor__pin-tile--busy"
              )}
            >
              <span aria-hidden>+</span>
              <span>{busy ? progress ?? "Reading…" : "Add"}</span>
              <input
                id={inputId}
                type="file"
                multiple
                accept={`video/*,${SPECIALIST_STORAGE_ACCEPT.galleryVideo}`}
                className="specialist-media-editor__pin-file"
                onChange={(event) => void handleAdd(event)}
                disabled={busy || Boolean(currentFrame)}
              />
            </label>
          ) : (
            <button
              type="button"
              className="smoac-control specialist-media-editor__pin-tile specialist-media-editor__pin-tile--add specialist-media-editor__pin-tile--locked"
              onClick={() => onUpgrade?.()}
              aria-label="Unlock videos with PRO+"
            >
              <LockIcon className="specialist-media-editor__add-lock" />
              <span>Add</span>
            </button>
          )
        ) : null}
      </div>
      {error ? (
        <p className="dashboard-upload-error" role="alert">
          {error}
        </p>
      ) : null}

      {currentFrame ? (
        <ProfileVideoFramePicker
          file={currentFrame.file}
          duration={currentFrame.duration}
          stepBadge={
            frameQueue.length > 1
              ? `Video ${frameIndex + 1} of ${frameQueue.length}`
              : undefined
          }
          onCancel={() => {
            setFrameQueue([]);
            setFrameIndex(0);
          }}
          onSave={handleFrameSave}
        />
      ) : null}
    </div>
  );
}
