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
import { meetCtaLabel } from "@/lib/specialist-intro-video";
import {
  SPECIALIST_STORAGE_ACCEPT,
  SPECIALIST_STORAGE_LIMITS,
} from "@/lib/supabase/constants";
import { LockIcon } from "@/components/ui/icons";
import { cn } from "@/lib/utils";

interface SpecialistIntroVideoEditorProps {
  introVideoUrl: string;
  introVideoPosterJson: string;
  isPremium: boolean;
  specialistId?: string | null;
  specialistName?: string;
  specialistFirstName?: string;
  onUpgrade?: () => void;
  onChange: (patch: {
    introVideoUrl?: string;
    introVideoPosterJson?: string;
  }) => void;
}

export function SpecialistIntroVideoEditor({
  introVideoUrl,
  introVideoPosterJson,
  isPremium,
  specialistId,
  specialistName = "",
  specialistFirstName,
  onUpgrade,
  onChange,
}: SpecialistIntroVideoEditorProps) {
  const inputId = useId();
  const url = introVideoUrl.trim();
  const posters = parseVideoPosterMap(introVideoPosterJson);
  const poster = url ? resolveVideoPoster(posters, url) : undefined;
  const meetLabel = meetCtaLabel({
    name: specialistName,
    specialistFirstName,
  });
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pendingFile, setPendingFile] = useState<{
    file: File;
    duration: number;
  } | null>(null);

  function commit(nextUrl: string, nextPosters: VideoPosterMap) {
    const trimmed = nextUrl.trim();
    onChange({
      introVideoUrl: trimmed,
      introVideoPosterJson: serializeVideoPosterMap(
        pruneVideoPosterMap(nextPosters, trimmed ? [trimmed] : [])
      ),
    });
  }

  async function handleAdd(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file || !isPremium || pendingFile) return;

    setBusy(true);
    setError(null);
    setProgress(null);
    try {
      const typeReject = rejectUnsupportedPhoneVideo(file);
      if (typeReject) {
        setError(typeReject);
        return;
      }
      if (file.size > SPECIALIST_STORAGE_LIMITS.galleryVideo) {
        setError("Video must be under 100MB.");
        return;
      }
      const duration = await readVideoDurationSeconds(file);
      const durationReject = rejectVideoOverDuration(duration);
      if (durationReject) {
        setError(durationReject);
        return;
      }
      setPendingFile({ file, duration });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not add video.");
    } finally {
      setBusy(false);
    }
  }

  async function handleFrameSave(posterDataUrl: string, time: number) {
    const item = pendingFile;
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
      commit(videoUrl, {
        [videoUrl]: {
          posterUrl,
          duration: item.duration,
          time,
        },
      });
      setPendingFile(null);
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
        !isPremium && "specialist-media-editor__feature--locked"
      )}
    >
      <div className="specialist-media-editor__label-row">
        <p className="login-field__label">Intro video</p>
        {!isPremium ? (
          <LockIcon className="specialist-media-editor__label-lock" />
        ) : null}
      </div>
      <p className="specialist-media-editor__hint">
        {isPremium
          ? `One clip from your phone, 45 seconds max. Clients see a play button — “${meetLabel}” — above your bio.`
          : url
            ? `Your intro is saved. “${meetLabel}” stays off Marketplace until you restore Pro.`
            : `One clip from your phone, 45 seconds max. Clients see a play button — “${meetLabel}” — above your bio.`}
      </p>
      <div
        className="specialist-media-editor__pin-row"
        aria-label="Intro video"
      >
        {url ? (
          <div className="specialist-media-editor__video-tile">
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
              {isPremium ? (
                <label
                  className={cn(
                    "smoac-control specialist-media-editor__thumb-btn",
                    busy && "specialist-media-editor__thumb-btn--busy"
                  )}
                >
                  {busy ? progress ?? "Reading…" : "Replace"}
                  <input
                    id={inputId}
                    type="file"
                    accept={`video/*,${SPECIALIST_STORAGE_ACCEPT.galleryVideo}`}
                    className="specialist-media-editor__pin-file"
                    onChange={(event) => void handleAdd(event)}
                    disabled={busy || Boolean(pendingFile)}
                  />
                </label>
              ) : (
                <button
                  type="button"
                  className="smoac-control specialist-media-editor__thumb-btn specialist-media-editor__thumb-btn--locked"
                  onClick={() => onUpgrade?.()}
                >
                  Replace
                  <LockIcon className="specialist-media-editor__btn-lock" />
                </button>
              )}
              <button
                type="button"
                className="smoac-control specialist-media-editor__thumb-btn specialist-media-editor__thumb-btn--danger"
                onClick={() => {
                  if (!isPremium) {
                    onUpgrade?.();
                    return;
                  }
                  commit("", posters);
                }}
              >
                Remove
              </button>
            </div>
          </div>
        ) : isPremium ? (
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
              accept={`video/*,${SPECIALIST_STORAGE_ACCEPT.galleryVideo}`}
              className="specialist-media-editor__pin-file"
              onChange={(event) => void handleAdd(event)}
              disabled={busy || Boolean(pendingFile)}
            />
          </label>
        ) : (
          <button
            type="button"
            className="smoac-control specialist-media-editor__pin-tile specialist-media-editor__pin-tile--add specialist-media-editor__pin-tile--locked"
            onClick={() => onUpgrade?.()}
            aria-label="Unlock intro video with Pro"
          >
            <LockIcon className="specialist-media-editor__add-lock" />
            <span>Add</span>
          </button>
        )}
      </div>
      {error ? (
        <p className="dashboard-upload-error" role="alert">
          {error}
        </p>
      ) : null}

      {pendingFile ? (
        <ProfileVideoFramePicker
          file={pendingFile.file}
          duration={pendingFile.duration}
          onCancel={() => setPendingFile(null)}
          onSave={handleFrameSave}
        />
      ) : null}
    </div>
  );
}
