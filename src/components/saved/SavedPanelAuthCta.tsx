"use client";

import Link from "next/link";
import "@/styles/saved-panel-auth.css";

export interface SavedPanelAuthCtaProps {
  loginHref: string;
  joinHref?: string;
  loginLabel?: string;
  onNavigate?: () => void;
}

/** Logged-out saved panel auth row — styles in saved-panel-auth.css */
export function SavedPanelAuthCta({
  loginHref,
  joinHref,
  loginLabel = "Log in",
  onNavigate,
}: SavedPanelAuthCtaProps) {
  return (
    <div className="saved-panel-auth">
      <div className="saved-panel-auth__cta">
        <Link
          href={loginHref}
          className="smoac-control saved-panel-auth__login"
          onClick={onNavigate}
        >
          {loginLabel}
        </Link>
        {joinHref ? (
          <Link
            href={joinHref}
            className="smoac-control saved-panel-auth__join"
            onClick={onNavigate}
          >
            Create account
          </Link>
        ) : null}
      </div>
    </div>
  );
}
