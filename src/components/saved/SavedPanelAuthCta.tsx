"use client";

import { HeaderChromeLink } from "@/components/layout/HeaderChromeLink";
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
        <HeaderChromeLink
          href={loginHref}
          className="smoac-control saved-panel-auth__login"
          onActivate={onNavigate}
        >
          {loginLabel}
        </HeaderChromeLink>
        {joinHref ? (
          <HeaderChromeLink
            href={joinHref}
            className="smoac-control saved-panel-auth__join"
            onActivate={onNavigate}
          >
            Create account
          </HeaderChromeLink>
        ) : null}
      </div>
    </div>
  );
}
