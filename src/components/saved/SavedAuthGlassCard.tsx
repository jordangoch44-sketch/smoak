"use client";

import { HeartIcon } from "@/components/ui/icons";
import { Logo } from "@/components/ui/Logo";
import { SavedPanelAuthCta } from "@/components/saved/SavedPanelAuthCta";
import { cn } from "@/lib/utils";
import "@/styles/saved-auth-glass.css";

export interface SavedAuthGlassCardProps {
  loginHref: string;
  joinHref?: string;
  onNavigate?: () => void;
  /** Tighter layout for header saved dropdown */
  compact?: boolean;
}

/** Logged-out favorites — location-popup aesthetic with SMOAC Color */
export function SavedAuthGlassCard({
  loginHref,
  joinHref,
  onNavigate,
  compact = false,
}: SavedAuthGlassCardProps) {
  return (
    <div
      className={cn(
        "saved-auth-glass",
        compact && "saved-auth-glass--compact"
      )}
    >
      <div className="saved-auth-glass__halo" aria-hidden />

      <div className="saved-auth-glass__card">
        <div className="saved-auth-glass__aurora" aria-hidden />
        <div className="saved-auth-glass__sheen" aria-hidden />

        <div className="saved-auth-glass__icon-mark" aria-hidden>
          <span className="saved-auth-glass__icon-ring" />
          <HeartIcon className="saved-auth-glass__icon" />
        </div>

        <h2 className="saved-auth-glass__title">
          Save your{" "}
          <span className="saved-auth-glass__title-accent">favorites</span>
        </h2>
        <p className="saved-auth-glass__lede">
          Shortlist specialists and come back anytime for more accurate picks.
        </p>

        <SavedPanelAuthCta
          loginHref={loginHref}
          joinHref={joinHref}
          loginLabel="Log in to view saved"
          onNavigate={onNavigate}
        />

        <p className="saved-auth-glass__trust">
          <svg
            className="saved-auth-glass__trust-icon"
            viewBox="0 0 24 24"
            fill="none"
            aria-hidden
          >
            <path
              d="M12 3.5c-2.4 1.35-4.9 2-7.5 2v6.4c0 4.35 3.05 7.95 7.5 9.1 4.45-1.15 7.5-4.75 7.5-9.1V5.5c-2.6 0-5.1-.65-7.5-2z"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinejoin="round"
            />
          </svg>
          Your saved specialists stay private to your account
        </p>
      </div>

      <div className="saved-auth-glass__footer-brand">
        <Logo href={null} size="sm" className="saved-auth-glass__footer-logo" />
        <p className="saved-auth-glass__footer-tagline">
          Connecting people with trusted fitness specialists.
        </p>
      </div>
    </div>
  );
}
