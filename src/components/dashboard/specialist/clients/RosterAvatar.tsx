"use client";

import { useState } from "react";
import type { RosterActivity } from "@/lib/coaching/coach-workout";
import { cn, getInitials } from "@/lib/utils";

export function RosterAvatar({
  name,
  avatarUrl,
  activity,
  size = "md",
}: {
  name: string;
  avatarUrl: string;
  activity?: RosterActivity;
  size?: "md" | "sm";
}) {
  const [failedUrl, setFailedUrl] = useState<string | null>(null);
  const showPhoto = Boolean(avatarUrl) && failedUrl !== avatarUrl;

  return (
    <span className={cn("roster-avatar", size === "sm" && "roster-avatar--sm")} aria-hidden>
      <span className="roster-avatar__face">
        {showPhoto ? (
          // eslint-disable-next-line @next/next/no-img-element -- client avatar snapshots are data URLs or arbitrary hosts
          <img
            src={avatarUrl}
            alt=""
            className="roster-avatar__img"
            draggable={false}
            decoding="async"
            onError={() => setFailedUrl(avatarUrl)}
          />
        ) : (
          <span className="roster-avatar__initials">{getInitials(name) || "C"}</span>
        )}
      </span>
      {activity ? <span className={cn("roster-avatar__dot", `roster-avatar__dot--${activity}`)} /> : null}
    </span>
  );
}
