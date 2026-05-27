"use client";

import { HeartIcon } from "@/components/ui/icons";
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

/** Premium logged-out saved state — glass card with auth CTAs */
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
          <HeartIcon className="saved-auth-glass__icon" />
        </div>

        <h2 className="saved-auth-glass__title">
          Save your favorite specialists
        </h2>
        <p className="saved-auth-glass__lede">
          Create a shortlist, compare profiles, and return to your top picks
          anytime.
        </p>

        <SavedPanelAuthCta
          loginHref={loginHref}
          joinHref={joinHref}
          loginLabel="Log in to view saved specialists"
          onNavigate={onNavigate}
        />

        <p className="saved-auth-glass__trust">
          Your saved specialists stay private to your account.
        </p>
      </div>
    </div>
  );
}
