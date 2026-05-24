"use client";

/** Trainer image with gradient + initials fallback on load error */
import Image from "next/image";
import { useState } from "react";
import { cn, getInitials } from "@/lib/utils";

const sizeClasses = {
  compact: "h-[104px] w-[88px] rounded-xl",
  square: "h-24 w-24 rounded-2xl sm:h-32 sm:w-32",
  card: "h-full w-full",
  hero: "h-full w-full",
} as const;

export type TrainerThumbnailSize = keyof typeof sizeClasses;

interface TrainerThumbnailProps {
  src: string;
  name: string;
  alt?: string;
  size?: TrainerThumbnailSize;
  priority?: boolean;
  className?: string;
  imageClassName?: string;
}

export function TrainerThumbnail({
  src,
  name,
  alt,
  size = "compact",
  priority = false,
  className,
  imageClassName,
}: TrainerThumbnailProps) {
  const [failed, setFailed] = useState(false);
  const initials = getInitials(name);

  if (failed) {
    return (
      <div
        className={cn(
          "relative shrink-0 overflow-hidden bg-gradient-to-br from-graphite-600 via-graphite-800 to-black",
          sizeClasses[size],
          className
        )}
        aria-hidden
      >
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(255,255,255,0.12),transparent_55%)]" />
        <span className="absolute inset-0 flex items-center justify-center text-lg font-medium tracking-wide text-white/85 sm:text-xl">
          {initials}
        </span>
      </div>
    );
  }

  return (
    <div
      className={cn(
        "relative shrink-0 overflow-hidden bg-graphite-800",
        sizeClasses[size],
        className
      )}
    >
      <Image
        src={src}
        alt={alt ?? name}
        fill
        priority={priority}
        sizes={
          size === "compact"
            ? "88px"
            : size === "square"
              ? "128px"
              : size === "hero"
                ? "100vw"
                : "(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
        }
        className={cn("object-cover", imageClassName)}
        onError={() => setFailed(true)}
      />
    </div>
  );
}
