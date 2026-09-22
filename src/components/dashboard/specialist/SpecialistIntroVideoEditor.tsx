"use client";

import { useId, useState, type ChangeEvent } from "react";
import { ProfileVideoFramePicker } from "@/components/media/ProfileVideoFramePicker";
import { LockIcon, PlayIcon, PlusIcon } from "@/components/ui/icons";
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
  inspectPhoneVideoFile,
} from "@/lib/media/video-file";
import { SPECIALIST_VIDEO_MAX_SECONDS } from "@/lib/specialist-media-limits";
import { SPECIALIST_STORAGE_ACCEPT } from "@/lib/supabase/constants";
import { cn } from "@/lib/utils";

const INTRO_PROMPTS = [
  { title: "Who you are", detail: "Name · specialty · location" },
  { title: "Who you help", detail: "Your ideal clients" },
  { title: "Your style", detail: "What training with you feels like" },
  { title: "Say hello", detail: "Invite them to connect" },
] as const;

interface SpecialistIntroVideoEditorProps {
  introVideoUrl: string;
  introVideoPosterJson: string;
  isPremium: boolean;
  specialistId?: string | null;
  /** Sheet already shows the title. Edit-profile embeds its own heading. */
  showHeading?: boolean;
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
  showHeading = true,
  onUpgrade,
  onChange,
}: SpecialistIntroVideoEditorProps) {
  const inputId = useId();
  const replaceId = useId();
  const url = introVideoUrl.trim();
  const posters = parseVideoPosterMap(introVideoPosterJson);
  const poster = url ? resolveVideoPoster(posters, url) : undefined;
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
      const { duration } = await inspectPhoneVideoFile(file);
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

  const fileAccept = `video/*,${SPECIALIST_STORAGE_ACCEPT.galleryVideo}`;
  const addLabel = busy ? progress ?? "Reading…" : "Add video";

  return (
    <div className="intro-video-guide">
      {showHeading ? (
        <div className="intro-video-guide__intro">
          <h3 className="intro-video-guide__title">Intro video</h3>
          <p className="intro-video-guide__lead">Show clients who you are.</p>
        </div>
      ) : null}

      <div className="intro-video-guide__badges">
        <span className="intro-video-guide__badge">
          {SPECIALIST_VIDEO_MAX_SECONDS} sec max
        </span>
        <span className="intro-video-guide__badge intro-video-guide__badge--pro">
          Pro feature
        </span>
      </div>

      {url ? (
        <div className="intro-video-guide__stage">
          <div className="intro-video-guide__preview">
            {poster?.posterUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={poster.posterUrl} alt="" />
            ) : (
              <video
                src={url}
                muted
                playsInline
                preload="metadata"
                className="intro-video-guide__preview-video"
              />
            )}
            <span className="intro-video-guide__play" aria-hidden>
              <span className="intro-video-guide__play-badge">
                <PlayIcon className="intro-video-guide__play-icon" />
              </span>
            </span>
            <span className="intro-video-guide__duration">
              {formatClipSecondsLabel(poster?.duration ?? 0)}
            </span>
          </div>
          <div className="intro-video-guide__preview-actions">
            {isPremium ? (
              <label
                className={cn(
                  "smoac-control intro-video-guide__add-btn",
                  busy && "intro-video-guide__add-btn--busy"
                )}
              >
                {busy ? progress ?? "Reading…" : "Replace video"}
                <input
                  id={replaceId}
                  type="file"
                  accept={fileAccept}
                  className="intro-video-guide__file"
                  onChange={(event) => void handleAdd(event)}
                  disabled={busy || Boolean(pendingFile)}
                />
              </label>
            ) : (
              <button
                type="button"
                className="smoac-control intro-video-guide__add-btn"
                onClick={() => onUpgrade?.()}
              >
                Replace video
                <LockIcon className="intro-video-guide__btn-lock" />
              </button>
            )}
            <button
              type="button"
              className="smoac-control intro-video-guide__remove"
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
          {!isPremium ? (
            <p className="intro-video-guide__saved-note">
              Saved on your profile. Clients see it again when you restore Pro.
            </p>
          ) : null}
        </div>
      ) : isPremium ? (
        <div className="intro-video-guide__drop">
          <span className="intro-video-guide__cam" aria-hidden>
            <VideoCamIcon />
          </span>
          <p className="intro-video-guide__drop-title">Add your intro video</p>
          <p className="intro-video-guide__drop-sub">
            Choose a video from your phone
          </p>
          <label
            className={cn(
              "smoac-control intro-video-guide__add-btn",
              busy && "intro-video-guide__add-btn--busy"
            )}
          >
            {busy ? null : <PlusIcon className="intro-video-guide__plus" />}
            {addLabel}
            <input
              id={inputId}
              type="file"
              accept={fileAccept}
              className="intro-video-guide__file"
              onChange={(event) => void handleAdd(event)}
              disabled={busy || Boolean(pendingFile)}
            />
          </label>
        </div>
      ) : (
        <div className="intro-video-guide__drop">
          <span className="intro-video-guide__cam" aria-hidden>
            <LockIcon className="intro-video-guide__cam-lock" />
          </span>
          <p className="intro-video-guide__drop-title">Add your intro video</p>
          <p className="intro-video-guide__drop-sub">
            A Pro feature — one clip, {SPECIALIST_VIDEO_MAX_SECONDS} seconds
            max
          </p>
          <button
            type="button"
            className="smoac-control intro-video-guide__add-btn"
            onClick={() => onUpgrade?.()}
          >
            Unlock with Pro
          </button>
        </div>
      )}

      {error ? (
        <p className="dashboard-upload-error" role="alert">
          {error}
        </p>
      ) : null}

      <section className="intro-video-guide__script" aria-label="What to say">
        <h3 className="intro-video-guide__script-title">
          Not sure what to say?
        </h3>
        <p className="intro-video-guide__script-lead">
          Keep it simple. Be yourself.
        </p>
        <ol className="intro-video-guide__prompts">
          {INTRO_PROMPTS.map((prompt, index) => (
            <li key={prompt.title} className="intro-video-guide__prompt">
              <span className="intro-video-guide__num" aria-hidden>
                {index + 1}
              </span>
              <span className="intro-video-guide__prompt-copy">
                <span className="intro-video-guide__prompt-title">
                  {prompt.title}
                </span>
                <span className="intro-video-guide__prompt-detail">
                  {prompt.detail}
                </span>
              </span>
            </li>
          ))}
        </ol>
        <p className="intro-video-guide__tip">
          <span className="intro-video-guide__tip-icon" aria-hidden>
            <BulbIcon />
          </span>
          <span>
            Good lighting
            <span className="intro-video-guide__dot" aria-hidden>
              ·
            </span>
            Quiet space
            <span className="intro-video-guide__dot" aria-hidden>
              ·
            </span>
            {SPECIALIST_VIDEO_MAX_SECONDS} sec max
          </span>
        </p>
      </section>

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

function VideoCamIcon() {
  return (
    <svg
      className="intro-video-guide__cam-icon"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M15.5 10.5 19 8.2a1 1 0 0 1 1.5.86v5.88a1 1 0 0 1-1.5.86l-3.5-2.3" />
      <rect x="3.25" y="7" width="12.25" height="10" rx="2.25" />
    </svg>
  );
}

function BulbIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M9 18h6M10 21h4" />
      <path d="M8.2 14.2A6 6 0 1 1 15.8 14.2c-.7.7-1.1 1.4-1.3 2.3H9.5c-.2-.9-.6-1.6-1.3-2.3Z" />
    </svg>
  );
}
