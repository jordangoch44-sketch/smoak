"use client";

import {
  AnimatePresence,
  motion,
  useAnimate,
  useReducedMotion,
} from "framer-motion";
import Image from "next/image";
import {
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
} from "react";
import { createPortal } from "react-dom";
import { TrainerThumbnail } from "@/components/ui/TrainerThumbnail";
import { cn } from "@/lib/utils";
import type { ProfileAvatarFrameId } from "@/lib/specialist-profile-style";

interface ProfileImagePreviewModalProps {
  open: boolean;
  src: string;
  alt: string;
  onClose: () => void;
}

export function ProfileImagePreviewModal({
  open,
  src,
  alt,
  onClose,
}: ProfileImagePreviewModalProps) {
  const titleId = useId();
  const closeRef = useRef<HTMLButtonElement>(null);
  const reduceMotion = useReducedMotion();

  useEffect(() => {
    if (!open) return;
    const previous = document.activeElement as HTMLElement | null;
    closeRef.current?.focus();

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        event.preventDefault();
        event.stopPropagation();
        onClose();
      }
    }

    document.body.classList.add("profile-image-preview-open");
    window.addEventListener("keydown", onKeyDown, true);
    return () => {
      document.body.classList.remove("profile-image-preview-open");
      window.removeEventListener("keydown", onKeyDown, true);
      previous?.focus?.();
    };
  }, [open, onClose]);

  if (typeof document === "undefined") return null;

  return createPortal(
    <AnimatePresence>
      {open ? (
        <motion.div
          className="profile-image-preview"
          role="dialog"
          aria-modal="true"
          aria-labelledby={titleId}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: reduceMotion ? 0 : 0.2 }}
          onClick={onClose}
        >
          <div className="profile-image-preview__backdrop" aria-hidden />
          <h2 id={titleId} className="sr-only">
            {alt}
          </h2>
          <button
            ref={closeRef}
            type="button"
            className="profile-image-preview__close"
            aria-label="Close photo preview"
            onClick={(event) => {
              event.stopPropagation();
              onClose();
            }}
          >
            <span aria-hidden>×</span>
          </button>
          <motion.div
            className="profile-image-preview__frame"
            initial={reduceMotion ? false : { opacity: 0, scale: 0.92 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={reduceMotion ? undefined : { opacity: 0, scale: 0.94 }}
            transition={
              reduceMotion
                ? { duration: 0 }
                : { type: "spring", stiffness: 380, damping: 28, mass: 0.85 }
            }
            onClick={(event) => event.stopPropagation()}
          >
            <Image
              src={src}
              alt={alt}
              fill
              sizes="90vw"
              className="profile-image-preview__img"
              priority
            />
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>,
    document.body
  );
}

interface ProfileHeroAvatarProps {
  src?: string | null;
  name: string;
  rankBadge?: React.ReactNode;
  frame?: ProfileAvatarFrameId;
  /** Specialist Live tab — Edit chip over the profile photo */
  onEdit?: () => void;
}

function normalizeSrc(src: string | null | undefined): string | null {
  if (typeof src !== "string") return null;
  const trimmed = src.trim();
  return trimmed.length > 0 ? trimmed : null;
}

/** Tappable profile photo with press feedback + body-portaled lightbox. */
export function ProfileHeroAvatar({
  src,
  name,
  rankBadge,
  frame = "none",
  onEdit,
}: ProfileHeroAvatarProps) {
  const imageSrc = normalizeSrc(src);
  const canExpand = Boolean(imageSrc);
  const [previewOpen, setPreviewOpen] = useState(false);
  const reduceMotion = useReducedMotion();
  const [scope, animate] = useAnimate();
  const busyRef = useRef(false);

  const handleActivate = useCallback(async () => {
    if (!canExpand || !imageSrc || busyRef.current || previewOpen) return;
    busyRef.current = true;
    try {
      if (!reduceMotion && scope.current) {
        await animate(
          scope.current,
          { scale: 0.96 },
          { duration: 0.12, ease: [0.32, 0.72, 0, 1] }
        );
        await animate(
          scope.current,
          { scale: 1 },
          { type: "spring", stiffness: 420, damping: 26, mass: 0.8 }
        );
      }
      setPreviewOpen(true);
    } finally {
      busyRef.current = false;
    }
  }, [animate, canExpand, imageSrc, previewOpen, reduceMotion, scope]);

  const closePreview = useCallback(() => setPreviewOpen(false), []);

  const thumbClass = cn(
    "profile-hero__avatar",
    frame === "none" && "profile-hero__avatar--frame-none",
    frame === "ring" && "profile-hero__avatar--frame-ring",
    frame === "glow" && "profile-hero__avatar--frame-glow"
  );

  return (
    <>
      <div
        className={cn(
          "profile-hero__avatar-wrap",
          frame === "glow" && "profile-hero__avatar-wrap--glow",
          onEdit && "profile-hero__avatar-wrap--editable"
        )}
      >
        {rankBadge}
        {canExpand ? (
          <motion.button
            ref={scope}
            type="button"
            className="profile-hero__avatar-btn"
            aria-label="View larger profile photo"
            onClick={() => {
              void handleActivate();
            }}
          >
            <TrainerThumbnail
              src={imageSrc}
              name={name}
              size="square"
              priority
              className={thumbClass}
            />
          </motion.button>
        ) : (
          <div className="profile-hero__avatar-static" aria-hidden>
            <TrainerThumbnail
              src={null}
              name={name}
              size="square"
              className={thumbClass}
            />
          </div>
        )}
        {onEdit ? (
          <button
            type="button"
            className="smoac-control profile-hero__avatar-edit"
            aria-label="Edit profile photo"
            data-live-edit-ignore
            onClick={(event) => {
              event.preventDefault();
              event.stopPropagation();
              onEdit();
            }}
          >
            Edit
          </button>
        ) : null}
      </div>

      {imageSrc ? (
        <ProfileImagePreviewModal
          open={previewOpen}
          src={imageSrc}
          alt={`${name} profile photo`}
          onClose={closePreview}
        />
      ) : null}
    </>
  );
}
