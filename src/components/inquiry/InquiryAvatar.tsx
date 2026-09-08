"use client";

import { useState } from "react";
import { cn, getInitials } from "@/lib/utils";

interface InquiryAvatarProps {
  name: string;
  src?: string | null;
  size?: "sm" | "md" | "lg";
}

export function InquiryAvatar({
  name,
  src,
  size = "md",
}: InquiryAvatarProps) {
  const [failed, setFailed] = useState(false);
  const initials = getInitials(name.trim() || "U") || "U";
  const url = src?.trim() ?? "";
  const showImg = Boolean(url) && !failed;

  return (
    <span
      className={cn("inquiry-avatar", `inquiry-avatar--${size}`)}
      aria-hidden
    >
      {showImg ? (
        // eslint-disable-next-line @next/next/no-img-element -- remote / storage avatars
        <img src={url} alt="" onError={() => setFailed(true)} />
      ) : (
        <span className="inquiry-avatar__initials">{initials}</span>
      )}
    </span>
  );
}
